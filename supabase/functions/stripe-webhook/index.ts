import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MONTHLY_PRICE_ID = 'price_1TfgfTBf3QpDemCCftZe0RlX'
const YEARLY_PRICE_ID = 'price_1TfgfTBf3QpDemCCPG43QAyJ'

const STRIPE_TIMESTAMP_TOLERANCE_SEC = 300 // 5 minutes

async function verifyStripeSignature(payload: string, sigHeader: string, secret: string): Promise<boolean> {
  const parts = sigHeader.split(',')
  const timestamp = parts.find(p => p.startsWith('t='))?.slice(2)
  const v1Sig = parts.find(p => p.startsWith('v1='))?.slice(3)
  if (!timestamp || !v1Sig) return false

  // Replay attack: reject if timestamp is older than tolerance
  const age = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10)
  if (age > STRIPE_TIMESTAMP_TOLERANCE_SEC) return false

  const signedPayload = `${timestamp}.${payload}`
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  )

  // Decode expected signature from hex for constant-time comparison via subtle.verify
  const expectedBytes = new Uint8Array(v1Sig.match(/.{2}/g)!.map(b => parseInt(b, 16)))
  return await crypto.subtle.verify('HMAC', key, expectedBytes, new TextEncoder().encode(signedPayload))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
  }

  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
  if (!webhookSecret || !stripeKey) {
    return new Response('Serverkonfigurationsfehler', { status: 500 })
  }

  const sigHeader = req.headers.get('stripe-signature')
  if (!sigHeader) return new Response('Fehlende Signatur', { status: 400 })

  const payload = await req.text()
  const valid = await verifyStripeSignature(payload, sigHeader, webhookSecret)
  if (!valid) return new Response('Ungültige Signatur', { status: 400 })

  const event = JSON.parse(payload)

  // Service role bypasses RLS — webhook is the only writer to subscriptions
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const userId = session.client_reference_id as string
        const stripeCustomerId = session.customer as string
        const stripeSubId = session.subscription as string
        if (!userId || !stripeSubId) break

        const subRes = await fetch(`https://api.stripe.com/v1/subscriptions/${stripeSubId}`, {
          headers: { 'Authorization': `Bearer ${stripeKey}` },
        })
        const sub = await subRes.json()
        const priceId = sub.items?.data?.[0]?.price?.id as string
        const plan = priceId === YEARLY_PRICE_ID ? 'yearly' : 'monthly'
        const periodEnd = new Date(sub.current_period_end * 1000).toISOString()

        await supabase.from('subscriptions').upsert({
          user_id: userId,
          stripe_customer_id: stripeCustomerId,
          stripe_subscription_id: stripeSubId,
          status: 'active',
          plan,
          current_period_end: periodEnd,
        }, { onConflict: 'stripe_subscription_id' })

        await supabase.from('profiles').update({ is_pro: true }).eq('id', userId)
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object
        const status = sub.status as string
        const periodEnd = new Date(sub.current_period_end * 1000).toISOString()
        const priceId = sub.items?.data?.[0]?.price?.id as string
        const plan = priceId === YEARLY_PRICE_ID ? 'yearly' : 'monthly'
        const isPro = status === 'active' || status === 'trialing'

        const { data: existing } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', sub.id)
          .single()

        if (existing) {
          await supabase.from('subscriptions')
            .update({ status, plan, current_period_end: periodEnd })
            .eq('stripe_subscription_id', sub.id)
          await supabase.from('profiles').update({ is_pro: isPro }).eq('id', existing.user_id)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object
        const { data: existing } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', sub.id)
          .single()

        if (existing) {
          await supabase.from('subscriptions')
            .update({ status: 'canceled' })
            .eq('stripe_subscription_id', sub.id)
          await supabase.from('profiles').update({ is_pro: false }).eq('id', existing.user_id)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        if (invoice.subscription) {
          await supabase.from('subscriptions')
            .update({ status: 'past_due' })
            .eq('stripe_subscription_id', invoice.subscription)
        }
        break
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Webhook-Fehler:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
