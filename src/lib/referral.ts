import { supabase } from './supabase'

export async function callHandleReferral(referralCode: string): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await supabase.functions.invoke('handle-referral', {
      body: { referralCode },
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
  } catch { /* non-fatal */ }
}
