import { supabase } from './supabase'

/** Bearer-Header mit dem aktuellen Supabase-Access-Token für die /api/*-Proxies. */
export async function getAuthHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
}
