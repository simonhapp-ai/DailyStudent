import { useState } from 'react'
import { motion } from 'framer-motion'

const BETA_PASSWORD = 'DailyStudentB1017'
export const BETA_KEY = 'ds_beta_unlocked'

const E = [0.23, 1, 0.32, 1] as const

export function BetaGateScreen({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password || loading || success) return
    setError(null)
    setLoading(true)

    await new Promise(r => setTimeout(r, 500))

    if (password === BETA_PASSWORD) {
      setSuccess(true)
      localStorage.setItem(BETA_KEY, '1')
      await new Promise(r => setTimeout(r, 900))
      onUnlock()
    } else {
      setError('Falsches Beta-Passwort. Wende dich an deinen Beta-Kontakt.')
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#0b0b10',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Purple radial glow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: [
            'radial-gradient(ellipse 70% 55% at 50% -5%, rgba(124,58,237,0.28) 0%, transparent 65%)',
            'radial-gradient(ellipse 40% 30% at 80% 100%, rgba(99,102,241,0.08) 0%, transparent 60%)',
          ].join(', '),
        }}
      />

      {/* Subtle grid */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: 0.025,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: E }}
        style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            overflow: 'hidden',
            flexShrink: 0,
            boxShadow: '0 2px 10px rgba(124,58,237,0.3)',
          }}
        >
          <img
            src="/logo.png"
            alt="DailyStudent"
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.38)', transformOrigin: 'center' }}
          />
        </div>
        <span style={{ fontWeight: 700, fontSize: 17, color: 'white', letterSpacing: '-0.015em' }}>DailyStudent</span>
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: E, delay: 0.08 }}
        style={{
          background: '#13131c',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 24,
          padding: '36px 32px 28px',
          width: '100%',
          maxWidth: 420,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)',
        }}
      >
        {/* Top border glow line */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '70%',
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.7), transparent)',
          }}
        />

        {/* Lock icon */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 18,
            background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
            boxShadow: '0 10px 28px rgba(124,58,237,0.4)',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
        </div>

        {/* Beta badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(124,58,237,0.14)',
            border: '1px solid rgba(124,58,237,0.28)',
            borderRadius: 100,
            padding: '4px 11px',
            marginBottom: 14,
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              background: '#7C3AED',
              animation: 'ds-pulse 2s ease-in-out infinite',
            }}
          />
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: '#A78BFA',
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
            }}
          >
            Geschlossene Beta
          </span>
        </div>

        <h1
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: 'white',
            marginBottom: 8,
            letterSpacing: '-0.025em',
            lineHeight: 1.2,
          }}
        >
          Beta-Zugang erforderlich
        </h1>
        <p
          style={{
            fontSize: 13,
            color: 'rgba(255,255,255,0.42)',
            marginBottom: 28,
            lineHeight: 1.55,
          }}
        >
          DailyStudent befindet sich in der geschlossenen Beta. Gib deinen Zugangscode ein, um die App zu nutzen.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Password field */}
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Beta-Passwort"
              value={password}
              onChange={e => {
                setPassword(e.target.value)
                if (error) setError(null)
              }}
              autoComplete="off"
              autoFocus
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.04)',
                border: `1.5px solid ${error ? 'rgba(255,69,58,0.45)' : 'rgba(255,255,255,0.09)'}`,
                borderRadius: 14,
                padding: '13px 48px 13px 16px',
                fontSize: 15,
                color: 'white',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => {
                if (!error) e.currentTarget.style.borderColor = 'rgba(124,58,237,0.55)'
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = error ? 'rgba(255,69,58,0.45)' : 'rgba(255,255,255,0.09)'
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(p => !p)}
              style={{
                position: 'absolute',
                right: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 4,
                color: 'rgba(255,255,255,0.3)',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {showPassword ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>

          {/* Error message */}
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              style={{ fontSize: 12, color: '#FF453A', padding: '0 2px', margin: 0 }}
            >
              {error}
            </motion.p>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading || !password || success}
            style={{
              width: '100%',
              background: success
                ? 'linear-gradient(135deg, #30D158, #059669)'
                : 'linear-gradient(135deg, #7C3AED, #5B21B6)',
              border: 'none',
              borderRadius: 14,
              padding: '14px 24px',
              fontSize: 15,
              fontWeight: 700,
              color: 'white',
              cursor: loading || !password || success ? 'not-allowed' : 'pointer',
              opacity: !password && !loading && !success ? 0.45 : 1,
              transition: 'all 0.25s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontFamily: 'inherit',
              marginTop: 4,
              boxShadow: success
                ? '0 6px 22px rgba(48,209,88,0.3)'
                : '0 6px 22px rgba(124,58,237,0.35)',
            }}
          >
            {loading ? (
              <div
                style={{
                  width: 18,
                  height: 18,
                  border: '2px solid rgba(255,255,255,0.25)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'ds-spin 0.75s linear infinite',
                }}
              />
            ) : success ? (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Zugang gewährt
              </>
            ) : (
              <>
                Weiter
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>
        </form>

        <p
          style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.18)',
            textAlign: 'center',
            marginTop: 22,
          }}
        >
          Kein Zugangscode? Werde Beta-Tester auf unserem Discord.
        </p>
      </motion.div>

      {/* Footer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45, duration: 0.5 }}
        style={{ marginTop: 32, fontSize: 11, color: 'rgba(255,255,255,0.15)', textAlign: 'center' }}
      >
        © 2026 DailyStudent — Alle Rechte vorbehalten
      </motion.p>

      <style>{`
        @keyframes ds-spin { to { transform: rotate(360deg) } }
        @keyframes ds-pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.35 } }
      `}</style>
    </div>
  )
}
