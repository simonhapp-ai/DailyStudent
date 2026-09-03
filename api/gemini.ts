// Deliberately NOT Edge runtime: Lernplan (32768 output tokens) and Lernzettel (8192, plus
// optional image generation) generations can run long, and adding `maxDuration` to the Edge
// config did not fix the resulting timeouts (2026-07-25) — Vercel's Edge runtime's execution
// window is either not actually extended by that config or was already being exceeded well
// under 60s. Node.js (Vercel) Functions have reliably documented, plan-tied maxDuration support
// (Hobby up to 60s, Pro up to 300s), so this trades Edge's faster cold start for a timeout that
// actually holds. If this still times out, the real number needs to come from Vercel's function
// logs — reasoning from the client-side symptom alone can only get so far.
export const config = { maxDuration: 60 }

// Keep in sync with the identical map in src/lib/gemini.ts (dev-direct-call path) — see that
// file for why these specific replacements were chosen (2.5 family deprecated, shuts down Oct 2026).
const GEMINI_URLS: Record<string, string> = {
  flash: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent',
  'flash-lite': 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent',
  'flash-image': 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent',
}

// Flat per-user, per-day ceiling for each AI feature bucket — same limit for every account,
// no free/pro distinction (see supabase/migrations/012_ai_rate_limits.sql for the enforcement
// mechanism: a repeat-offender who goes over any bucket's ceiling on 2 separate days gets
// ai_blocked permanently). Keep in sync with the AiBucket union in src/lib/aiRateLimit.ts.
const BUCKET_LIMITS: Record<string, number> = {
  smart_notes: 150,
  flashcards: 60,
  blurting: 40,
  keyword_qa: 200,
  lernzettel: 20,
  // Per-user daily ceiling, same enforcement mechanism as every other bucket — kept low
  // because gemini-2.5-flash-image also has to stay within Google's own free-tier quota,
  // which is shared across ALL users on this API key/project (~500 images/day per Google
  // AI Studio, not per user). This bucket does not track that shared quota itself.
  lernzettel_visuals: 8,
  probeklausur_full: 10,
  probeklausur_other: 15,
  lernplan: 10,
}

async function getSupabaseUser(token: string): Promise<{ id: string; email: string } | null> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) return null
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: supabaseAnonKey,
      },
    })
    if (!res.ok) return null
    const data = await res.json() as { id?: string; email?: string }
    return data.id ? { id: data.id, email: (data.email ?? '').toLowerCase().trim() } : null
  } catch {
    return null
  }
}

// Fail OPEN, not closed: if the rate-limit check itself is unreachable or errors (missing
// migration, transient Supabase issue, network blip), let the request through unlimited
// rather than block it. A rate limiter that's temporarily not enforcing a ceiling is a much
// smaller problem than a broken rate limiter taking down every AI feature in the app — which
// is exactly what happened on 2026-07-24 when migrations 011/012 hadn't been applied yet.
async function checkRateLimit(token: string, userId: string, bucket: string): Promise<{ allowed: boolean; blocked: boolean }> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
  const limit = BUCKET_LIMITS[bucket]
  if (!supabaseUrl || !supabaseAnonKey || !limit) return { allowed: true, blocked: false }
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/check_ai_rate_limit`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: supabaseAnonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_user_id: userId, p_bucket: bucket, p_limit: limit }),
    })
    if (!res.ok) return { allowed: true, blocked: false }
    const rows = await res.json() as { allowed: boolean; blocked: boolean }[]
    return rows[0] ?? { allowed: true, blocked: false }
  } catch {
    return { allowed: true, blocked: false }
  }
}

// Named as a plain function, not the default export: Vercel's Node.js builder only grants a
// real Fetch Request/Response to modules that export named HTTP-method functions or a `fetch`
// property on the default export (see @vercel/node's isWebHandler check). A bare
// `export default async function handler(request: Request)` matches neither, so Vercel silently
// falls back to the legacy (req, res) Node calling convention instead — the first
// `request.headers.get(...)` then throws, the invocation crashes before ever reaching Gemini,
// and the client sees an instant non-JSON platform error page. This broke in commit 6ee3336
// when `runtime: 'edge'` was removed (Edge Functions always get a real Request regardless of
// export shape, so the bug was invisible until the runtime switched to Node.js).
async function handler(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204 })
  }
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  const user = token ? await getSupabaseUser(token) : null
  if (!token || !user) {
    return new Response(JSON.stringify({ geminiStatus: 401, geminiData: { error: { message: 'Unauthorized' } } }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ geminiStatus: 500, geminiData: { error: { message: 'GEMINI_API_KEY not configured' } } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const { model, body, bucket } = await request.json() as { model: string; body: unknown; bucket?: string }
    if (!bucket || !BUCKET_LIMITS[bucket]) {
      return new Response(JSON.stringify({ geminiStatus: 400, geminiData: { error: { message: 'Invalid bucket' } } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Distinct from Gemini's own transient 429 (which analyzeFileToSmartNote retries after
    // 8s) — this is our own hard ceiling/block, so it must not be mistaken for that.
    const { allowed, blocked } = await checkRateLimit(token, user.id, bucket)
    if (!allowed) {
      return new Response(JSON.stringify({
        geminiStatus: 403,
        geminiData: { error: { message: blocked
          ? 'Konto wegen wiederholter Limit-Überschreitung gesperrt.'
          : 'Tageslimit erreicht. Bitte versuche es morgen wieder.' } },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const url = GEMINI_URLS[model] ?? GEMINI_URLS['flash']
    const geminiRes = await fetch(`${url}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const geminiData = await geminiRes.json()
    return new Response(JSON.stringify({ geminiStatus: geminiRes.status, geminiData }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ geminiStatus: 500, geminiData: { error: { message: String(err) } } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export default { fetch: handler }
