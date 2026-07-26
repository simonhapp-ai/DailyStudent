import { useEffect } from 'react'
import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { supabase } from '../lib/supabase'

// Completes the native OAuth flow: AuthScreen opens the system browser at
// Supabase's authorize URL with redirectTo set to `dailystudent://auth/callback`.
// iOS hands the resulting URL back to the app via `appUrlOpen`; PKCE requires
// us to explicitly exchange the `code` param for a session (detectSessionInUrl
// is off on native, see supabase.ts).
export function useDeepLinkAuth() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    console.log('[OAuth] deep link listener registered')
    const listener = App.addListener('appUrlOpen', async ({ url }) => {
      console.log('[OAuth] appUrlOpen fired:', url)
      if (!url.startsWith('dailystudent://auth/callback')) return

      const code = new URL(url).searchParams.get('code')
      console.log('[OAuth] extracted code:', code ? 'present' : 'MISSING')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        console.log('[OAuth] exchangeCodeForSession error:', error?.message ?? 'none')
      }
      await Browser.close()
    })

    return () => {
      void listener.then((l) => l.remove())
    }
  }, [])
}
