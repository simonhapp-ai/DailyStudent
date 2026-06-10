import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type Step = 'loading' | 'status' | 'qr' | 'confirm' | 'done' | 'disabling'

export function TwoFactorSetupScreen() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('loading')
  const [hasMfa, setHasMfa] = useState(false)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [qrSvg, setQrSvg] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [enrollFactorId, setEnrollFactorId] = useState<string | null>(null)
  const [showSecret, setShowSecret] = useState(false)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void checkStatus()
  }, [])

  const checkStatus = async () => {
    const { data } = await supabase.auth.mfa.listFactors()
    const verified = (data?.totp ?? []).filter(f => f.status === 'verified')
    if (verified.length > 0) {
      setHasMfa(true)
      setFactorId(verified[0].id)
    } else {
      setHasMfa(false)
      setFactorId(null)
    }
    setStep('status')
  }

  const handleEnable = async () => {
    setLoading(true)
    setError(null)
    // Clean up any unverified factors first
    const { data: existing } = await supabase.auth.mfa.listFactors()
    const unverified = (existing?.totp ?? []).filter(f => (f.status as string) === 'unverified')
    for (const f of unverified) {
      await supabase.auth.mfa.unenroll({ factorId: f.id })
    }
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      issuer: 'DailyStudent',
    })
    setLoading(false)
    if (enrollError || !data) {
      setError('Fehler beim Aktivieren. Bitte erneut versuchen.')
      return
    }
    setQrSvg(data.totp.qr_code)
    setSecret(data.totp.secret)
    setEnrollFactorId(data.id)
    setStep('qr')
  }

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!enrollFactorId || code.length < 6) return
    setLoading(true)
    setError(null)
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: enrollFactorId })
    if (challengeError || !challenge) {
      setLoading(false)
      setError('Fehler. Bitte erneut versuchen.')
      return
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: enrollFactorId,
      challengeId: challenge.id,
      code: code.trim(),
    })
    setLoading(false)
    if (verifyError) {
      setError('Falscher Code. Bitte erneut versuchen.')
      setCode('')
    } else {
      setHasMfa(true)
      setFactorId(enrollFactorId)
      setStep('done')
    }
  }

  const handleDisable = async () => {
    if (!factorId) return
    setStep('disabling')
    setLoading(true)
    const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId })
    setLoading(false)
    if (unenrollError) {
      setError('Fehler beim Deaktivieren. Bitte erneut versuchen.')
      setStep('status')
    } else {
      setHasMfa(false)
      setFactorId(null)
      setStep('status')
    }
  }

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 6)
    setCode(digits)
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-28">

      {/* Header */}
      <div className="px-4 flex items-center gap-3" style={{ paddingTop: 'max(58px, calc(env(safe-area-inset-top, 0px) + 18px))' }}>
        <button
          onClick={() => navigate('/profil')}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-surface border border-border/60 shrink-0 press-sm"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-primary">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-[22px] font-bold text-text-primary">Zwei-Faktor-Auth</h1>
      </div>

      <div className="px-4 mt-5 space-y-4">

        {/* Loading */}
        {step === 'loading' && (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        )}

        {/* Status */}
        {(step === 'status' || step === 'disabling') && (
          <>
            {/* Info card */}
            <div className="bg-surface rounded-card shadow-card-adaptive border border-border/60 p-5">
              <div className="flex items-start gap-4">
                <div
                  className="w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0"
                  style={{
                    background: hasMfa
                      ? 'linear-gradient(135deg, #30d158, #1a7a36)'
                      : 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {hasMfa ? (
                      <>
                        <rect x="5" y="11" width="14" height="10" rx="2" />
                        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                        <line x1="12" y1="15" x2="12" y2="17" />
                      </>
                    ) : (
                      <>
                        <rect x="5" y="11" width="14" height="10" rx="2" />
                        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                      </>
                    )}
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-text-primary font-bold text-[16px]">
                    {hasMfa ? '2FA ist aktiviert' : '2FA nicht aktiv'}
                  </p>
                  <p className="text-text-muted text-[13px] mt-1 leading-relaxed">
                    {hasMfa
                      ? 'Dein Konto ist durch einen zweiten Faktor geschützt. Bei jeder Anmeldung wird dein Authenticator-Code abgefragt.'
                      : 'Schütze dein Konto mit einer Authenticator-App wie Google Authenticator oder Authy.'}
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-500 bg-red-500/10 rounded-xl px-3 py-2 text-center">{error}</p>
            )}

            {hasMfa ? (
              <button
                onClick={handleDisable}
                disabled={loading || step === 'disabling'}
                className="w-full bg-surface rounded-card shadow-card-adaptive border border-border/60 px-4 py-4 flex items-center justify-between press-sm disabled:opacity-50"
              >
                <span className="text-danger text-[15px] font-medium">2FA deaktivieren</span>
                {loading ? (
                  <span className="w-4 h-4 border-2 border-danger/30 border-t-danger rounded-full animate-spin" />
                ) : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-danger">
                    <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            ) : (
              <button
                onClick={handleEnable}
                disabled={loading}
                className="w-full rounded-xl px-4 py-3.5 text-sm font-semibold text-white active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' }}
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : '2FA aktivieren'}
              </button>
            )}

            <div className="bg-surface rounded-card border border-border/60 px-4 py-3.5">
              <p className="text-text-muted text-[12px] leading-relaxed">
                <span className="font-semibold text-text-secondary">Empfohlene Apps:</span>{' '}
                Google Authenticator, Authy, 1Password oder Apple Passwords.
              </p>
            </div>
          </>
        )}

        {/* QR Code step */}
        {step === 'qr' && qrSvg && (
          <>
            <div className="bg-surface rounded-card shadow-card-adaptive border border-border/60 p-5">
              <p className="text-text-primary font-bold text-[16px] mb-1">QR-Code scannen</p>
              <p className="text-text-muted text-[13px] mb-4 leading-relaxed">
                Öffne deine Authenticator-App, tippe auf "+" und scanne den QR-Code.
              </p>

              {/* QR Code display */}
              <div className="flex justify-center mb-4">
                <div
                  className="p-3 rounded-xl bg-white"
                  style={{ lineHeight: 0 }}
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
              </div>

              {/* Manual secret toggle */}
              <button
                onClick={() => setShowSecret(v => !v)}
                className="w-full text-center text-[12px] text-accent font-medium py-1"
              >
                {showSecret ? 'Secret ausblenden' : 'Code manuell eingeben'}
              </button>
              {showSecret && secret && (
                <div className="mt-2 bg-background rounded-xl px-3 py-2.5 text-center">
                  <p className="text-[11px] text-text-muted mb-1">Manueller Einrichtungsschlüssel</p>
                  <p className="text-[13px] font-mono font-bold text-text-primary tracking-widest break-all select-all">
                    {secret.match(/.{1,4}/g)?.join(' ')}
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={() => setStep('confirm')}
              className="w-full rounded-xl px-4 py-3.5 text-sm font-semibold text-white active:scale-[0.98] transition-transform"
              style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' }}
            >
              Weiter — Code bestätigen
            </button>
          </>
        )}

        {/* Confirm code step */}
        {step === 'confirm' && (
          <>
            <div className="bg-surface rounded-card shadow-card-adaptive border border-border/60 p-5">
              <p className="text-text-primary font-bold text-[16px] mb-1">Einrichtung bestätigen</p>
              <p className="text-text-muted text-[13px] mb-4 leading-relaxed">
                Gib den 6-stelligen Code aus deiner Authenticator-App ein, um die Einrichtung abzuschließen.
              </p>

              <form onSubmit={handleConfirm} className="space-y-3">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={handleCodeChange}
                  autoFocus
                  autoComplete="one-time-code"
                  className="w-full bg-background border border-border rounded-xl px-4 py-4 text-center text-3xl font-bold tracking-[0.5em] text-foreground placeholder:text-muted/30 focus:outline-none focus:border-accent transition-colors"
                />

                {error && (
                  <p className="text-xs text-red-500 bg-red-500/10 rounded-xl px-3 py-2 text-center">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading || code.length < 6}
                  className="w-full rounded-xl px-4 py-3.5 text-sm font-semibold text-white active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' }}
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : '2FA aktivieren'}
                </button>
              </form>
            </div>

            <button
              onClick={() => { setStep('qr'); setCode(''); setError(null) }}
              className="w-full text-center text-[13px] text-text-muted py-2 hover:text-text-primary transition-colors"
            >
              Zurück zum QR-Code
            </button>
          </>
        )}

        {/* Done step */}
        {step === 'done' && (
          <>
            <div className="bg-surface rounded-card shadow-card-adaptive border border-border/60 p-6 text-center">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: 'linear-gradient(135deg, #30d158, #1a7a36)' }}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <p className="text-text-primary font-bold text-[18px] mb-2">2FA aktiviert!</p>
              <p className="text-text-muted text-[13px] leading-relaxed">
                Dein Konto ist jetzt durch einen zweiten Faktor geschützt. Bei jeder Anmeldung wirst du nach deinem Authenticator-Code gefragt.
              </p>
            </div>

            <button
              onClick={() => navigate('/profil')}
              className="w-full rounded-xl px-4 py-3.5 text-sm font-semibold text-white active:scale-[0.98] transition-transform"
              style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' }}
            >
              Fertig
            </button>
          </>
        )}

      </div>
    </div>
  )
}
