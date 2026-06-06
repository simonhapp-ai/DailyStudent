import { useState } from 'react'
import { supabase } from '../lib/supabase'

type Mode = 'login' | 'signup'

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
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)
    setLoading(true)
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
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
      options: { redirectTo: window.location.origin },
    })
    if (error) {
      setError(translateError(error.message))
      setGoogleLoading(false)
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
        <div
          className="w-16 h-16 rounded-[22px] flex items-center justify-center mx-auto mb-4 shadow-lg"
          style={{ background: 'linear-gradient(145deg, #8b5cf6 0%, #6d28d9 100%)' }}
        >
          <span className="text-3xl">📚</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">DailyStudent</h1>
        <p className="text-sm text-muted mt-1">Dein KI-Lernassistent</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-surface rounded-2xl shadow-card-adaptive border border-border/60 p-6">
        <h2 className="text-xl font-bold text-foreground mb-5 text-left">
          {mode === 'login' ? 'Willkommen zurück' : 'Konto erstellen'}
        </h2>

        {/* Google button */}
        <button
          onClick={handleGoogle}
          disabled={googleLoading || loading}
          className="w-full flex items-center justify-center gap-3 bg-background border border-border rounded-xl px-4 py-3 text-sm font-semibold text-foreground active:scale-[0.98] transition-transform mb-4 disabled:opacity-50"
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
          <span>Mit Google {mode === 'login' ? 'anmelden' : 'registrieren'}</span>
        </button>

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
          <input
            type="password"
            placeholder="Passwort"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
          />

          {error && (
            <p className="text-xs text-red-500 bg-red-500/10 rounded-xl px-3 py-2 text-left">{error}</p>
          )}
          {successMsg && (
            <p className="text-xs text-green-500 bg-green-500/10 rounded-xl px-3 py-2 text-left">{successMsg}</p>
          )}

          <button
            type="submit"
            disabled={loading || googleLoading}
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
      </div>

      <p className="text-xs text-muted mt-6 text-center max-w-xs leading-relaxed">
        Mit der Anmeldung stimmst du unseren Nutzungsbedingungen und der Datenschutzerklärung zu.
      </p>
    </div>
  )
}
