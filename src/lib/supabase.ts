import { createClient } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'
import { capacitorPreferencesStorage } from './capacitorStorage'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

const isNative = Capacitor.isNativePlatform()

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'pkce',
    // detectSessionInUrl parses window.location — meaningless in a WKWebView
    // pointed at a custom URL scheme redirect, so it's native-off. The
    // native OAuth callback is handled explicitly in useDeepLinkAuth.ts.
    detectSessionInUrl: !isNative,
    persistSession: true,
    storageKey: 'dailystudent-auth',
    storage: isNative ? capacitorPreferencesStorage : undefined,
  },
})
