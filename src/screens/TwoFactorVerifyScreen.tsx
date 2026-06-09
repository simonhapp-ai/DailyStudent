import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

interface Props {
  onVerified: () => void
}

export function TwoFactorVerifyScreen({ onVerified }: Props) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [challengeId, setChallengeId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void initChallenge()
  }, [])

  useEffect(() => {
    inputRef.current?.focus()
  }, [challengeId])

  const initChallenge = async () => {
    setError(null)
    const { data: factors, error: listError } = await supabase.auth.mfa.listFactors()
    if (listError || !factors?.totp?.length) {
      onVerified()
      return
    }
    const id = factors.totp[0].id
    setFactorId(id)
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: id })
    if (challengeError || !challenge) {
      setError('Fehler beim Laden. Bitte Seite neu laden.')
      return
    }
    setChallengeId(challenge.id)
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!factorId || !challengeId || code.length < 6) return
    setLoading(true)
    setError(null)
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code: code.trim(),
    })
    setLoading(false)
    if (verifyError) {
      setError('Falscher Code. Bitte erneut versuchen.')
      setCode('')
      void initChallenge()
    } else {
      onVerified()
    }
  }

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 6)
    setCode(digits)
    if (digits.length === 6) {
      setTimeout(() => {
        const form = e.target.closest('form')
        form?.requestSubmit()
      }, 100)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">

      <div className="mb-8 text-center">
        <img
          src="/logo.png"
          alt="DailyStudent"
          className="w-16 h-16 rounded-[22px] mx-auto mb-4 shadow-lg object-cover"
        />
        <h1 className="text-2xl font-bold text-foreground">DailyStudent</h1>
        <p className="text-sm text-muted mt-1">Zwei-Faktor-Authentifizierung</p>
      </div>

      <div className="w-full max-w-sm bg-surface rounded-2xl shadow-card-adaptive border border-border/60 p-6">

        <div
          className="w-12 h-12 rounded-[14px] flex items-center justify-center mb-4 mx-auto"
          style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
        </div>

        <h2 className="text-xl font-bold text-foreground mb-1.5 text-center">Code eingeben</h2>
        <p className="text-sm text-muted text-center mb-5 leading-relaxed">
          Öffne deine Authenticator-App und gib den 6-stelligen Code ein.
        </p>

        <form onSubmit={handleVerify} className="space-y-3">
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={handleCodeChange}
            autoComplete="one-time-code"
            className="w-full bg-background border border-border rounded-xl px-4 py-4 text-center text-3xl font-bold tracking-[0.5em] text-foreground placeholder:text-muted/30 focus:outline-none focus:border-accent transition-colors"
          />

          {error && (
            <p className="text-xs text-red-500 bg-red-500/10 rounded-xl px-3 py-2 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || code.length < 6 || !challengeId}
            className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-white active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' }}
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
            ) : 'Verifizieren'}
          </button>
        </form>

        <button
          onClick={() => void supabase.auth.signOut()}
          className="w-full mt-4 text-xs text-muted text-center py-2 hover:text-foreground transition-colors"
        >
          Anderes Konto verwenden
        </button>
      </div>
    </div>
  )
}
