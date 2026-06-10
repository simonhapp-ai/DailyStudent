import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) throw new Error('STRIPE_SECRET_KEY nicht konfiguriert')

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Nicht authentifiziert' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Ungültiger Auth-Token' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const { priceId, successUrl, cancelUrl } = await req.json()

    const ALLOWED_PRICE_IDS = [
      'price_1TgpJMPbROOB2TaONDo2xdrg', // monthly €7,99
      'price_1TgpJvPbROOB2TaOOWXjtNbS', // yearly €59,99
    ]
    if (!ALLOWED_PRICE_IDS.includes(priceId)) {
      return new Response(JSON.stringify({ error: 'Ungültige Preis-ID' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const params = new URLSearchParams()
    params.set('mode', 'subscription')
    params.set('line_items[0][price]', priceId)
    params.set('line_items[0][quantity]', '1')
    params.set('success_url', successUrl)
    params.set('cancel_url', cancelUrl)
    params.set('client_reference_id', user.id)
    params.set('customer_email', user.email ?? '')
    params.set('metadata[supabase_user_id]', user.id)

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    const session = await stripeRes.json()
    if (!stripeRes.ok) throw new Error(session.error?.message ?? 'Stripe Checkout-Fehler')

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
})
