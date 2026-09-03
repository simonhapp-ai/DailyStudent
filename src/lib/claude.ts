import { getAuthHeader } from './authHeader'

// Client-Seite der Claude-Schiene. Ruft ausschließlich den serverseitigen Proxy
// /api/claude — der Anthropic-Key liegt nie im Client (wie bei Gemini/Groq).
//
// Wirft ClaudeFallbackError, wenn der Server signalisiert „nutze Gemini" (kein Pro,
// Kostprobe verbraucht, Tageslimit, Monats-Deckel, Key fehlt). examFetch fängt das
// und generiert still über Gemini weiter — für den Nutzer bricht nichts.

export class ClaudeFallbackError extends Error {
  constructor() {
    super('Claude nicht verfügbar — Gemini-Fallback')
    this.name = 'ClaudeFallbackError'
  }
}

export type Engine = 'gemini' | 'claude'
/** { engine, trial } — trial nur relevant wenn engine='claude' und Nutzer nicht Pro. */
export interface EngineOpts { engine?: Engine; trial?: boolean }

export type ClaudeBucket = 'claude_lernzettel' | 'claude_probeklausur'

// Muss mit BUCKET_LIMITS in api/claude.ts übereinstimmen (nur zur Doku — die echte
// Durchsetzung ist serverseitig).
export const CLAUDE_BUCKET_LIMITS: Record<ClaudeBucket, number> = {
  claude_lernzettel: 5,
  claude_probeklausur: 2,
}

interface ClaudeOpts {
  maxTokens?: number
  effort?: 'low' | 'medium'
  temperature?: number
  trial?: boolean
}

/**
 * Ein JSON-Generierungs-Call über Claude Sonnet 5. Gibt das geparste JSON zurück
 * (Antwort-Text wird von ```json-Fences befreit + JSON.parse).
 */
export async function claudeFetch(
  systemPrompt: string,
  userPrompt: string,
  bucket: ClaudeBucket,
  opts: ClaudeOpts = {},
): Promise<unknown> {
  // In DEV gibt es keinen /api/claude-Server (wie api/gemini.ts, das in DEV direkt
  // Gemini ruft). Claude-Rail wird gegen die Vercel-Preview/-Prod getestet.
  if (import.meta.env.DEV) throw new ClaudeFallbackError()

  const body = {
    model: 'claude-sonnet-5',
    max_tokens: opts.maxTokens ?? 8000,
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userPrompt }],
    thinking: { type: 'adaptive' },
    output_config: { effort: opts.effort ?? 'low' },
  }

  let res: Response
  try {
    res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...await getAuthHeader() },
      body: JSON.stringify({ bucket, body, trial: opts.trial === true }),
    })
  } catch {
    throw new ClaudeFallbackError()
  }

  let env: { status?: number; fallback?: boolean; data?: unknown }
  try {
    env = await res.json()
  } catch {
    throw new ClaudeFallbackError()
  }

  if (env.fallback) throw new ClaudeFallbackError()
  if ((env.status ?? 500) !== 200) {
    const msg = (env.data as { error?: { message?: string } })?.error?.message ?? `Claude Fehler ${env.status}`
    throw new Error(msg)
  }

  const data = env.data as { content?: { type: string; text?: string }[]; stop_reason?: string }
  if (data.stop_reason === 'max_tokens') {
    throw new Error('Die Antwort wurde abgeschnitten — bitte erneut versuchen.')
  }
  const text = (data.content ?? []).find((b) => b.type === 'text')?.text ?? ''
  const cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```\s*$/, '').trim()
  if (!cleaned) throw new ClaudeFallbackError()
  return JSON.parse(cleaned)
}
