import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

async function callHandleReferral(referralCode: string) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await supabase.functions.invoke('handle-referral', {
      body: { referralCode },
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
  } catch { /* non-fatal */ }
}

type Mode = 'login' | 'signup' | 'forgot' | 'reset'

function translateError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'E-Mail oder Passwort falsch.'
  if (msg.includes('Email not confirmed')) return 'E-Mail noch nicht bestätigt. Bitte prüfe dein Postfach.'
  if (msg.includes('User already registered')) return 'Diese E-Mail ist bereits registriert.'
  if (msg.includes('Password should be') || msg.includes('password')) return 'Passwort muss mindestens 6 Zeichen lang sein.'
  if (msg.includes('Unable to validate email')) return 'Ungültige E-Mail-Adresse.'
  if (msg.includes('rate limit')) return 'Zu viele Versuche. Bitte warte kurz.'
  return msg
}

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [appleLoading, setAppleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('reset')
        setError(null)
        setSuccessMsg(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)
    setLoading(true)
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        // Fire referral tracking after signup (non-blocking)
        const pendingRef = sessionStorage.getItem('referral_code')
        if (pendingRef) {
          sessionStorage.removeItem('referral_code')
          void callHandleReferral(pendingRef)
        }
        setSuccessMsg('Bestätigungs-E-Mail gesendet. Bitte prüfe dein Postfach.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (err: unknown) {
      setError(translateError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten'))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    })
    if (error) {
      setError(translateError(error.message))
      setGoogleLoading(false)
    }
  }

  const handleApple = async () => {
    setAppleLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: `${window.location.origin}/` },
    })
    if (error) {
      setError(translateError(error.message))
      setAppleLoading(false)
    }
  }

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      })
      if (error) throw error
      setSuccessMsg('Link gesendet! Bitte prüfe dein Postfach und klicke auf den Link.')
    } catch (err: unknown) {
      setError(translateError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten'))
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setMode('login')
      setNewPassword('')
      setSuccessMsg('Passwort erfolgreich geändert! Du kannst dich jetzt anmelden.')
    } catch (err: unknown) {
      setError(translateError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten'))
    } finally {
      setLoading(false)
    }
  }

  const switchMode = () => {
    setMode(m => m === 'login' ? 'signup' : 'login')
    setError(null)
    setSuccessMsg(null)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">

      {/* Logo */}
      <div className="mb-8 text-center">
        <img
          src="/logo.png"
          alt="DailyStudent"
          className="w-16 h-16 rounded-[22px] mx-auto mb-4 shadow-lg object-cover"
        />
        <h1 className="text-2xl font-bold text-foreground">DailyStudent</h1>
        <p className="text-sm text-muted mt-1">Dein KI-Lernassistent</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-surface rounded-2xl shadow-card-adaptive border border-border/60 p-6">
        <h2 className="text-xl font-bold text-foreground mb-5 text-left">
          {mode === 'login' ? 'Willkommen zurück'
            : mode === 'signup' ? 'Konto erstellen'
            : mode === 'forgot' ? 'Passwort zurücksetzen'
            : 'Neues Passwort'}
        </h2>

        {/* ── Forgot password form ── */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgot} className="space-y-3">
            <p className="text-xs text-muted text-left -mt-2 mb-1">
              Gib deine E-Mail ein. Wir schicken dir einen Link zum Zurücksetzen.
            </p>
            <input
              type="email"
              placeholder="E-Mail-Adresse"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
            />
            {error && <p className="text-xs text-red-500 bg-red-500/10 rounded-xl px-3 py-2 text-left">{error}</p>}
            {successMsg && <p className="text-xs text-green-500 bg-green-500/10 rounded-xl px-3 py-2 text-left">{successMsg}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-white active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' }}
            >
              {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" /> : 'Link senden'}
            </button>
            <button type="button" onClick={() => { setMode('login'); setError(null); setSuccessMsg(null) }}
              className="w-full text-xs text-muted text-center mt-1 hover:text-foreground transition-colors">
              ← Zurück zur Anmeldung
            </button>
          </form>
        )}

        {/* ── Reset password form ── */}
        {mode === 'reset' && (
          <form onSubmit={handleReset} className="space-y-3">
            <p className="text-xs text-muted text-left -mt-2 mb-1">
              Wähle ein neues Passwort (mindestens 6 Zeichen).
            </p>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                placeholder="Neues Passwort"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full bg-background border border-border rounded-xl px-4 py-3 pr-10 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
              />
              <button type="button" onClick={() => setShowNewPassword(v => !v)} tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors">
                {showNewPassword ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {error && <p className="text-xs text-red-500 bg-red-500/10 rounded-xl px-3 py-2 text-left">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-white active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' }}
            >
              {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" /> : 'Passwort speichern'}
            </button>
          </form>
        )}

        {/* OAuth buttons + form — nur bei login/signup */}
        {(mode === 'login' || mode === 'signup') && <>
        <div className="flex gap-2 mb-4">
          <button
            onClick={handleGoogle}
            disabled={googleLoading || appleLoading || loading}
            className="flex-1 flex items-center justify-center gap-2 bg-background border border-border rounded-xl px-4 py-3 text-sm font-semibold text-foreground active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            {googleLoading ? (
              <span className="w-5 h-5 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin inline-block" />
            ) : (
              <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            <span>Google</span>
          </button>

          <button
            onClick={handleApple}
            disabled={appleLoading || googleLoading || loading}
            className="flex-1 flex items-center justify-center gap-2 bg-background border border-border rounded-xl px-4 py-3 text-sm font-semibold text-foreground active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            {appleLoading ? (
              <span className="w-5 h-5 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin inline-block" />
            ) : (
              <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0 fill-current" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.42c1.32.07 2.23.74 3.01.8.93-.19 1.83-.89 3.01-.95 1.37-.08 2.57.4 3.46 1.42-3.07 1.91-2.48 5.72.6 6.9-.62 1.54-1.32 3.09-2.08 4.69zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
            )}
            <span>Apple</span>
          </button>
        </div>
        <p className="text-[11px] text-red-500 text-center -mt-2 mb-1">Apple Login wird bald hinzugefügt</p>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted">oder</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Email / password form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            placeholder="E-Mail-Adresse"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
          />
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Passwort"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 pr-10 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
            >
              {showPassword ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>

          {mode === 'login' && (
            <div className="flex justify-end -mt-1">
              <button
                type="button"
                onClick={() => { setMode('forgot'); setError(null); setSuccessMsg(null) }}
                className="text-xs text-accent hover:underline"
              >
                Passwort vergessen?
              </button>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-500 bg-red-500/10 rounded-xl px-3 py-2 text-left">{error}</p>
          )}
          {successMsg && (
            <p className="text-xs text-green-500 bg-green-500/10 rounded-xl px-3 py-2 text-left">{successMsg}</p>
          )}

          <button
            type="submit"
            disabled={loading || googleLoading || appleLoading}
            className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-white active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' }}
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
            ) : (
              mode === 'login' ? 'Anmelden' : 'Registrieren'
            )}
          </button>
        </form>

        {/* Toggle login / signup */}
        <p className="text-xs text-muted text-center mt-4">
          {mode === 'login' ? 'Noch kein Konto? ' : 'Bereits ein Konto? '}
          <button onClick={switchMode} className="text-accent font-semibold">
            {mode === 'login' ? 'Registrieren' : 'Anmelden'}
          </button>
        </p>
        </>}
      </div>

      <p className="text-xs text-muted mt-6 text-center max-w-xs leading-relaxed">
        Mit der Anmeldung stimmst du unseren Nutzungsbedingungen und der Datenschutzerklärung zu.
      </p>
    </div>
  )
}
