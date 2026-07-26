import { Preferences } from '@capacitor/preferences'
import type { SupportedStorage } from '@supabase/supabase-js'

// supabase-js's default storage (localStorage) isn't reliably persistent in
// a WKWebView. Used only on native (see supabase.ts) — web keeps localStorage.
export const capacitorPreferencesStorage: SupportedStorage = {
  getItem: async (key) => {
    const { value } = await Preferences.get({ key })
    return value
  },
  setItem: async (key, value) => {
    await Preferences.set({ key, value })
  },
  removeItem: async (key) => {
    await Preferences.remove({ key })
  },
}
