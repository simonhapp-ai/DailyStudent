import { supabase } from './supabase'

export const PRICE_IDS = {
  monthly: 'price_1TfgfTBf3QpDemCCftZe0RlX',
  yearly: 'price_1TfgfTBf3QpDemCCPG43QAyJ',
} as const

export async function createCheckoutSession(plan: 'monthly' | 'yearly'): Promise<string> {
  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: {
      priceId: PRICE_IDS[plan],
      successUrl: `${window.location.origin}/profil?payment=success`,
      cancelUrl: `${window.location.origin}/profil`,
    },
  })

  if (error) throw new Error(error.message)
  if (!data?.url) throw new Error('Kein Checkout-Link erhalten')
  return data.url
}

export async function fetchIsProFromSupabase(): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('is_pro')
    .single()
  return data?.is_pro ?? false
}
