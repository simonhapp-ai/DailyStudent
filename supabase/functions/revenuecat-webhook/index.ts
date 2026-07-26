import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Placeholders — replace with the real App Store Connect product identifiers
// once Simon creates the IAP products (see CLAUDE.md Track A plan, Phase 5).
const YEARLY_PRODUCT_IDS = ['dailystudent_pro_yearly']

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type SubStatus = 'active' | 'inactive' | 'canceled' | 'past_due' | 'trialing'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  // RevenueCat sends a shared secret in the Authorization header (configured
  // in the RevenueCat dashboard's webhook settings) — not HMAC-signed like
  // Stripe, so a simple constant-time-ish string compare is RevenueCat's own
  // documented scheme.
  const expectedAuth = Deno.env.get('REVENUECAT_WEBHOOK_AUTH_HEADER')
  const gotAuth = req.headers.get('Authorization')
  if (!expectedAuth || gotAuth !== expectedAuth) {
    return new Response('Unauthorized', { status: 401, headers: CORS_HEADERS })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const body = await req.json()
    const event = body.event

    const userId = event.app_user_id as string
    if (!userId) {
      return new Response(JSON.stringify({ received: true, skipped: 'no app_user_id' }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const plan = YEARLY_PRODUCT_IDS.includes(event.product_id) ? 'yearly' : 'monthly'
    const periodEnd = event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null

    let status: SubStatus | null = null
    switch (event.type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'UNCANCELLATION':
      case 'PRODUCT_CHANGE':
      case 'SUBSCRIPTION_EXTENDED':
      case 'TRANSFER':
        status = event.period_type === 'TRIAL' ? 'trialing' : 'active'
        break
      case 'EXPIRATION':
        status = 'inactive'
        break
      case 'BILLING_ISSUE':
        status = 'past_due'
        break
      case 'CANCELLATION':
        // Auto-renew turned off, but the user keeps access until expiration —
        // don't downgrade status here, EXPIRATION will fire later.
        break
      default:
        // NON_RENEWING_PURCHASE, SUBSCRIPTION_PAUSED, TEST, etc. — no-op.
        break
    }

    if (status) {
      await supabase.from('subscriptions').upsert({
        user_id: userId,
        rc_app_user_id: userId,
        source: 'apple',
        status,
        plan,
        current_period_end: periodEnd,
      }, { onConflict: 'user_id' })

      await supabase.from('profiles').update({ is_pro: status === 'active' || status === 'trialing' }).eq('id', userId)
    } else if (periodEnd) {
      await supabase.from('subscriptions').update({ current_period_end: periodEnd }).eq('user_id', userId)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('RevenueCat webhook error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
})
