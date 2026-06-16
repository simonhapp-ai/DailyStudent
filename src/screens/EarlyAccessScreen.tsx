import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'

const E = [0.23, 1, 0.32, 1] as const

export function EarlyAccessScreen() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'duplicate' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || status === 'loading') return
    setStatus('loading')

    const { error } = await supabase
      .from('early_access_emails')
      .insert({ email: email.trim().toLowerCase() })

    if (!error) {
      setStatus('success')
    } else if (error.code === '23505') {
      // unique violation — already signed up
      setStatus('duplicate')
    } else {
      setStatus('error')
    }
  }

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center px-6 relative overflow-hidden"
      style={{
        background: '#FAFAFD',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
      }}
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: [
            'radial-gradient(ellipse 60% 50% at 50% -10%, rgba(52,211,153,0.12) 0%, transparent 65%)',
            'radial-gradient(ellipse 40% 35% at 80% 100%, rgba(124,58,237,0.07) 0%, transparent 60%)',
          ].join(', '),
        }}
      />

      {/* Back button */}
      <button
        onClick={() => navigate('/landing')}
        className="absolute top-6 left-6 flex items-center gap-1.5 text-[13px] font-medium transition-colors duration-150"
        style={{ color: '#988CAF' }}
        onMouseEnter={e => (e.currentTarget.style.color = '#160E28')}
        onMouseLeave={e => (e.currentTarget.style.color = '#988CAF')}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
        Zurück
      </button>

      <div className="relative w-full max-w-sm mx-auto">
        {status !== 'success' ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: E }}
          >
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div
                className="w-16 h-16 rounded-[20px] flex items-center justify-center shadow-lg"
                style={{ background: 'linear-gradient(135deg, #34D399, #059669)', boxShadow: '0 8px 24px rgba(52,211,153,0.3)' }}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
            </div>

            {/* Headline */}
            <h1
              className="text-center font-black mb-3"
              style={{ fontSize: 'clamp(28px, 6vw, 38px)', color: '#160E28', letterSpacing: '-0.03em', lineHeight: 1.1 }}
            >
              Early Access sichern
            </h1>
            <p className="text-center text-[15px] leading-relaxed mb-8" style={{ color: '#988CAF' }}>
              Trag deine Email ein — du bekommst als Erster Bescheid, wenn DailyStudent offiziell startet.
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="deine@email.de"
                className="w-full px-4 py-3.5 rounded-2xl text-[15px] outline-none transition-all duration-200"
                style={{
                  background: 'white',
                  border: '1.5px solid rgba(209,209,214,0.7)',
                  color: '#160E28',
                  boxShadow: '0 1px 4px rgba(22,14,40,0.05)',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = '#34D399')}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(209,209,214,0.7)')}
              />

              {status === 'duplicate' && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[13px] text-center"
                  style={{ color: '#988CAF' }}
                >
                  Diese Email ist bereits eingetragen.
                </motion.p>
              )}
              {status === 'error' && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[13px] text-center"
                  style={{ color: '#FF453A' }}
                >
                  Fehler beim Eintragen. Bitte nochmal versuchen.
                </motion.p>
              )}

              <button
                type="submit"
                disabled={status === 'loading' || !email.trim()}
                className="w-full py-3.5 rounded-2xl text-[15px] font-bold text-white transition-opacity duration-150"
                style={{
                  background: 'linear-gradient(135deg, #34D399, #059669)',
                  boxShadow: '0 4px 16px rgba(52,211,153,0.35)',
                  opacity: status === 'loading' || !email.trim() ? 0.6 : 1,
                }}
              >
                {status === 'loading' ? 'Wird eingetragen…' : 'Early Access sichern'}
              </button>
            </form>

            <p className="text-center text-[12px] mt-5" style={{ color: '#C7C7CC' }}>
              Kein Spam. Nur eine Email zum Launch.
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.55, ease: E }}
            className="text-center"
          >
            {/* Success icon */}
            <div className="flex justify-center mb-6">
              <div
                className="w-20 h-20 rounded-[24px] flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #34D399, #059669)', boxShadow: '0 12px 32px rgba(52,211,153,0.35)' }}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
            </div>

            <h2
              className="font-black mb-3"
              style={{ fontSize: 'clamp(26px, 5vw, 34px)', color: '#160E28', letterSpacing: '-0.025em' }}
            >
              Du bist dabei!
            </h2>
            <p className="text-[15px] leading-relaxed mb-8" style={{ color: '#988CAF' }}>
              Wir schicken dir eine Email, sobald DailyStudent offiziell startet. Versprochen.
            </p>

            <button
              onClick={() => navigate('/landing')}
              className="px-6 py-3 rounded-full text-[14px] font-semibold text-[#160E28] border transition-colors duration-150"
              style={{ borderColor: 'rgba(0,0,0,0.12)', background: 'white' }}
            >
              Zurück zur Website
            </button>
          </motion.div>
        )}
      </div>
    </div>
  )
}
