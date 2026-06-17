import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TRIAL_DAYS = 14
const REFERRALS_NEEDED = 5

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Nicht authentifiziert' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // Verify the calling user (the new signup)
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Ungültige Session' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const body = await req.json().catch(() => ({}))
  const referralCode = (body.referralCode ?? '').trim().toUpperCase()
  if (!referralCode) {
    return new Response(JSON.stringify({ error: 'referralCode fehlt' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Find the referrer by code
  const { data: referrerRow } = await admin
    .from('profiles')
    .select('id')
    .eq('referral_code', referralCode)
    .maybeSingle()

  if (!referrerRow) {
    return new Response(JSON.stringify({ error: 'Ungültiger Code' }), {
      status: 404,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  // Self-referral guard
  if (referrerRow.id === user.id) {
    return new Response(JSON.stringify({ error: 'Eigener Code nicht erlaubt' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  // Insert referral — UNIQUE on referee_id prevents double-counting
  const { error: insertError } = await admin
    .from('referrals')
    .insert({ referrer_id: referrerRow.id, referee_id: user.id })

  // 23505 = unique_violation → already counted, not an error
  if (insertError && insertError.code !== '23505') {
    return new Response(JSON.stringify({ error: 'Datenbankfehler' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  // Count valid referrals for the referrer
  const { count } = await admin
    .from('referrals')
    .select('*', { count: 'exact', head: true })
    .eq('referrer_id', referrerRow.id)

  const referralCount = count ?? 0

  // At 5 referrals → grant 14-day Pro trial (only if not already set)
  if (referralCount >= REFERRALS_NEEDED) {
    const trialEnd = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString()
    await admin
      .from('profiles')
      .update({ trial_ends_at: trialEnd })
      .eq('id', referrerRow.id)
      .is('trial_ends_at', null)
  }

  return new Response(JSON.stringify({ success: true, referralCount }), {
    status: 200,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
})
