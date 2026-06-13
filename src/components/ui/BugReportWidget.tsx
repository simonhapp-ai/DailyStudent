import { useState } from 'react'
import { useUser } from '../../context/UserContext'
import emailjs from '@emailjs/browser'

export function BugReportWidget() {
  const { authUser, profile } = useUser()
  const [open, setOpen] = useState(false)
  const [screen, setScreen] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID as string | undefined
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string | undefined
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string | undefined

  function handleClose() {
    setOpen(false)
    setScreen('')
    setMessage('')
    setStatus('idle')
  }

  async function handleSend() {
    if (!message.trim()) return
    setStatus('sending')

    if (!(serviceId && templateId && publicKey)) {
      console.warn('[BugReport] EmailJS nicht konfiguriert — Keys fehlen in .env')
      setStatus('error')
      return
    }

    try {
      await emailjs.send(
        serviceId,
        templateId,
        {
          screen: screen.trim() || 'nicht angegeben',
          route: screen.trim() || 'nicht angegeben',
          bug_description: message.trim(),
          user_email: authUser?.email ?? 'unbekannt',
          user_name: profile?.name ?? 'unbekannt',
          timestamp: new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }),
          user_agent: navigator.userAgent,
        },
        { publicKey }
      )
      setStatus('sent')
      setScreen('')
      setMessage('')
      setTimeout(() => {
        setOpen(false)
        setStatus('idle')
      }, 2500)
    } catch (err) {
      console.error('[BugReport] Fehler beim Senden:', err)
      setStatus('error')
    }
  }

  return (
    <div className="bg-surface rounded-card shadow-card-adaptive border border-border/60 overflow-hidden">
      {/* Trigger row */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left press-sm"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-btn flex items-center justify-center shrink-0 text-white text-[14px] font-black"
            style={{ background: 'linear-gradient(135deg, #FF453A, #FF6B5B)' }}
          >
            !
          </div>
          <span className="text-text-primary text-[15px]">Bug melden</span>
        </div>
        <svg
          width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="text-text-muted transition-transform duration-200"
          style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>

      {/* Accordion body */}
      {open && (
        <div className="px-4 pb-4 border-t border-border/40 pt-4 space-y-3">
          {/* Screen field */}
          <div>
            <label className="block text-[12px] font-semibold text-text-muted uppercase tracking-wide mb-1.5">
              Welcher Screen?
            </label>
            <input
              type="text"
              value={screen}
              onChange={e => setScreen(e.target.value)}
              placeholder="z.B. Karteikarten, Lernplan, Unterricht…"
              disabled={status === 'sending' || status === 'sent'}
              className="w-full text-[14px] text-text placeholder:text-text-muted/50 bg-transparent border border-border/60 rounded-[12px] px-3 py-2.5 focus:outline-none focus:border-accent/60 transition-colors"
            />
          </div>

          {/* Description textarea */}
          <div>
            <label className="block text-[12px] font-semibold text-text-muted uppercase tracking-wide mb-1.5">
              Was ist passiert?
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Beschreib kurz was nicht funktioniert…"
              rows={4}
              disabled={status === 'sending' || status === 'sent'}
              className="w-full text-[14px] text-text placeholder:text-text-muted/50 bg-transparent border border-border/60 rounded-[12px] px-3 py-2.5 resize-none focus:outline-none focus:border-accent/60 transition-colors"
            />
          </div>

          {/* Status messages */}
          {status === 'sent' && (
            <p className="text-[13px] font-semibold text-center" style={{ color: '#30D158' }}>
              Danke! Report wurde gesendet ✓
            </p>
          )}
          {status === 'error' && (
            <p className="text-[13px] text-center" style={{ color: '#FF453A' }}>
              Fehler beim Senden. Bitte nochmal versuchen.
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2.5">
            <button
              onClick={handleClose}
              className="flex-1 py-3 rounded-[12px] text-[14px] font-semibold text-text-muted press-sm"
              style={{ background: 'var(--color-surface-2)' }}
            >
              Abbrechen
            </button>
            <button
              onClick={handleSend}
              disabled={!message.trim() || status === 'sending' || status === 'sent'}
              className="flex-1 py-3 rounded-[12px] text-[14px] font-bold text-white press-sm disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #FF453A, #FF6B5B)' }}
            >
              {status === 'sending' ? 'Sende…' : 'Senden'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
