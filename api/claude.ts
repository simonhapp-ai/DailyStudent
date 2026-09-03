// Claude Sonnet 5 proxy — Pro-Engine für Lernzettel + Probeklausur-Material.
// Node runtime wie api/gemini.ts (lange Generierungen, verlässliches maxDuration).
//
// Reihenfolge jeder Anfrage (alle Schranken serverseitig, Client kann keine umgehen —
// der ANTHROPIC_API_KEY liegt nur hier):
//   1. Supabase-JWT verifizieren                                  -> 401
//   2. Pro-Status serverseitig prüfen (subscriptions/profiles)    -> nicht-Pro: fallback
//      Ausnahme: 1x lebenslange Gratis-Kostprobe (claude_trial_used), Sub-Budget 5 €
//   3. Per-User-Tageslimit je Bucket (check_claude_limit)         -> fail-CLOSED: fallback
//   4. Monats-Ausgabendeckel 20 €                                 -> fail-CLOSED: fallback
//   5. Proxy zu api.anthropic.com; danach echte Kosten aus usage -> add_claude_spend
//
// "fallback" heißt: { status: 200, fallback: true } — der Client (src/lib/claude.ts wirft
// ClaudeFallbackError, examFetch fängt es) generiert dann still über Gemini weiter.
// Fluid Compute erlaubt auf Hobby bis 300 s. Sonnet 5 braucht für Lernzettel /
// Korrektur bei großem Output 60–150 s — das passt hier rein, ein 60-s-Limit nicht.
export const config = { maxDuration: 300 }

// Muss mit CLAUDE_BUCKET_LIMITS in src/lib/claude.ts übereinstimmen. Bewusst eng
// (siehe Plan WS4.5): ein einzelner Extremnutzer soll die Marge nicht auffressen.
const BUCKET_LIMITS: Record<string, number> = {
  claude_lernzettel: 5,     // /Tag
  claude_probeklausur: 2,   // /Tag (Generierung + Korrektur eines Versuchs)
}

// USD/1M Tokens, EUR ≈ USD (1:1-Puffer). Modell-abhängig: Generierung läuft auf
// Haiku 4.5 ($1/$5), Korrektur auf Sonnet 5 ($2/$10).
const PRICE_BY_MODEL: Record<string, { input: number; output: number; cacheRead: number; cacheWrite: number }> = {
  haiku: { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 },
  sonnet: { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
}

const MONTHLY_CAP_EUR = 20
const TRIAL_STOP_EUR = 15   // ab hier keine neuen Gratis-Kostproben mehr (Pro hat Vorrang)

// Selbst-Abbruch vor Vercels maxDuration (300 s), damit wir sauber auf Gemini
// zurückfallen statt in den Plattform-Kill zu laufen. Puffer für die Supabase-
// Roundtrips + das Kosten-Logging danach.
const ANTHROPIC_TIMEOUT_MS = 240_000

// Gleiche Liste wie PRO_TEST_ALLOWLIST in src/context/UserContext.tsx.
const PRO_TEST_ALLOWLIST = ['simon.happ@gmx.de', 'simonhapp161@gmail.com']

const SUPA_URL = process.env.VITE_SUPABASE_URL
const SUPA_KEY = process.env.VITE_SUPABASE_ANON_KEY

async function getSupabaseUser(token: string): Promise<{ id: string; email: string } | null> {
  if (!SUPA_URL || !SUPA_KEY) return null
  try {
    const res = await fetch(`${SUPA_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SUPA_KEY },
    })
    if (!res.ok) return null
    const d = await res.json() as { id?: string; email?: string }
    return d.id ? { id: d.id, email: (d.email ?? '').toLowerCase().trim() } : null
  } catch {
    return null
  }
}

// Pro-Status + Trial-Flag mit dem JWT des Nutzers lesen (RLS erlaubt eigene Zeilen).
async function getProStatus(token: string, userId: string, email: string): Promise<{ isPro: boolean; trialUsed: boolean }> {
  const allowlisted = PRO_TEST_ALLOWLIST.includes(email)
  if (!SUPA_URL || !SUPA_KEY) return { isPro: allowlisted, trialUsed: false }
  const headers = { Authorization: `Bearer ${token}`, apikey: SUPA_KEY }
  try {
    const [pRes, sRes] = await Promise.all([
      fetch(`${SUPA_URL}/rest/v1/profiles?id=eq.${userId}&select=is_pro,claude_trial_used`, { headers }),
      fetch(`${SUPA_URL}/rest/v1/subscriptions?user_id=eq.${userId}&select=status`, { headers }),
    ])
    const pRows = pRes.ok ? (await pRes.json() as { is_pro?: boolean; claude_trial_used?: boolean }[]) : []
    const sRows = sRes.ok ? (await sRes.json() as { status?: string }[]) : []
    const isPro = allowlisted
      || pRows[0]?.is_pro === true
      || sRows.some((r) => r.status === 'active' || r.status === 'trialing')
    return { isPro, trialUsed: pRows[0]?.claude_trial_used === true }
  } catch {
    return { isPro: allowlisted, trialUsed: false }
  }
}

async function rpc<T>(token: string, name: string, args: Record<string, unknown>): Promise<T | null> {
  if (!SUPA_URL || !SUPA_KEY) return null
  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, apikey: SUPA_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    })
    if (!res.ok) return null
    return await res.json() as T
  } catch {
    return null
  }
}

// HTTP immer 200; der echte Status steckt im Body (wie api/gemini.ts), damit der Client
// ihn zuverlässig lesen kann statt an einer Plattform-Fehlerseite zu scheitern.
const J = (obj: unknown) => new Response(JSON.stringify(obj), { status: 200, headers: { 'Content-Type': 'application/json' } })
const fallback = (reason: string) => {
  console.log('[claude] fallback:', reason)
  return J({ status: 200, fallback: true })
}
const errBody = (status: number, message: string) => J({ status, data: { error: { message } } })

async function handler(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 })
  if (request.method !== 'POST') return errBody(405, 'Method not allowed')

  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  const user = token ? await getSupabaseUser(token) : null
  if (!token || !user) return errBody(401, 'Unauthorized')

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    // Diagnose: welche relevanten Env-Schlüssel-NAMEN sieht die Function? (keine Werte)
    const relevant = Object.keys(process.env).filter((k) => /ANTHROPIC|GEMINI|GROQ|SUPABASE/i.test(k))
    return fallback(`no ANTHROPIC_API_KEY in env; visible keys: [${relevant.join(', ')}]`)
  }

  let payload: { bucket?: string; body?: Record<string, unknown>; trial?: boolean }
  try {
    payload = await request.json()
  } catch {
    return errBody(400, 'Invalid JSON body')
  }
  const bucket = payload.bucket ?? ''
  const limit = BUCKET_LIMITS[bucket]
  if (!limit || !payload.body) return errBody(400, 'Invalid bucket')

  const month = new Date().toISOString().slice(0, 7) // YYYY-MM

  // ── Zugriffs-Schranke: Pro ODER Gratis-Kostprobe ──────────────────────────
  const { isPro, trialUsed } = await getProStatus(token, user.id, user.email)
  const wantsTrial = payload.trial === true && !isPro
  if (!isPro && !wantsTrial) return fallback(`not pro (email=${user.email || '?'}, bucket=${bucket})`)
  if (wantsTrial && trialUsed) return fallback('trial already used')

  // ── Tageslimit + Monats-Deckel (fail-CLOSED: bei Zweifel Gemini) ──────────
  const limitRes = await rpc<{ allowed: boolean; month_spend: number }[]>(token, 'check_claude_limit', {
    p_user_id: user.id, p_bucket: bucket, p_limit: limit, p_month: month,
  })
  if (!limitRes || !limitRes[0]) return fallback('check_claude_limit RPC null (migration 019 not applied?)')
  const { allowed, month_spend } = limitRes[0]
  if (!allowed) return fallback('daily bucket limit reached')
  if (Number(month_spend) >= MONTHLY_CAP_EUR) return fallback(`monthly cap: spent ${month_spend} EUR`)
  if (wantsTrial && Number(month_spend) >= TRIAL_STOP_EUR) return fallback(`trial stopped: spent ${month_spend} EUR`)

  // ── Anthropic-Call ───────────────────────────────────────────────────────
  console.log('[claude] calling anthropic', { bucket, isPro, wantsTrial, month_spend })
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), ANTHROPIC_TIMEOUT_MS)
  let anthRes: Response
  try {
    anthRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload.body),
      signal: ac.signal,
    })
  } catch (e) {
    clearTimeout(timer)
    if ((e as { name?: string })?.name === 'AbortError') return fallback('self-timeout (>240s) — Sonnet zu langsam')
    return errBody(502, `Claude nicht erreichbar: ${String(e)}`)
  }
  clearTimeout(timer)
  const data = await anthRes.json() as {
    content?: { type: string; text?: string }[]
    usage?: { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number }
    stop_reason?: string
  }
  if (!anthRes.ok) {
    const msg = (data as { error?: { message?: string } })?.error?.message ?? `Claude Fehler ${anthRes.status}`
    console.log('[claude] anthropic error', anthRes.status, msg)
    return errBody(anthRes.status, msg)
  }
  if (data.stop_reason === 'refusal') return fallback('anthropic refusal')

  // ── Kosten verbuchen ────────────────────────────────────────────────────
  const modelStr = String((payload.body as { model?: string })?.model ?? '')
  const price = modelStr.includes('haiku') ? PRICE_BY_MODEL.haiku : PRICE_BY_MODEL.sonnet
  const u = data.usage ?? {}
  const eur = (
    (u.input_tokens ?? 0) * price.input +
    (u.output_tokens ?? 0) * price.output +
    (u.cache_read_input_tokens ?? 0) * price.cacheRead +
    (u.cache_creation_input_tokens ?? 0) * price.cacheWrite
  ) / 1_000_000
  console.log('[claude tokens]', bucket, modelStr || '?', u, `~${eur.toFixed(4)} EUR`)
  void rpc(token, 'add_claude_spend', { p_month: month, p_eur: eur })
  if (wantsTrial) void rpc(token, 'mark_claude_trial_used', { p_user_id: user.id })

  return J({ status: 200, data })
}

export default { fetch: handler }
