export const config = { runtime: 'edge' }

const GEMINI_URLS: Record<string, string> = {
  flash: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
  'flash-lite': 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',
}

async function verifySupabaseToken(token: string): Promise<boolean> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) return false
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: supabaseAnonKey,
      },
    })
    return res.ok
  } catch {
    return false
  }
}

export default async function handler(request: Request): Promise<Response> {
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
  if (!token || !(await verifySupabaseToken(token))) {
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
    const { model, body } = await request.json() as { model: string; body: unknown }
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
