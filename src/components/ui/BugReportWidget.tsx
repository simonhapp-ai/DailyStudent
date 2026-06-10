import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useUser } from '../../context/UserContext'
import emailjs from '@emailjs/browser'

const ROUTE_NAMES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/unterricht': 'Unterricht',
  '/kalender': 'Kalender',
  '/hausaufgaben': 'Hausaufgabenheft',
  '/klausuren': 'Klausurplan',
  '/abi-rechner': 'Abi-Rechner',
  '/klausurmodus': 'Klausurmodus Hub',
  '/klausurmodus/lernen': 'Karteikarten Lernmodus',
  '/klausurmodus/karteikarten/neu': 'Karteikarten Generator',
  '/klausurmodus/probeklausur': 'Probeklausur Menü',
  '/klausurmodus/probeklausur/afb-trainer': 'Probeklausur AFB-Trainer',
  '/klausurmodus/probeklausur/vollstaendige-klausur': 'Probeklausur vollständig',
  '/klausurmodus/probeklausur/materialklausur': 'Probeklausur Materialklausur',
  '/klausurmodus/probeklausur/ohne-material': 'Probeklausur ohne Material',
  '/klausurmodus/probeklausur/retrospektive': 'Probeklausur Auswertung',
  '/klausurmodus/blurting': 'Blurting',
  '/klausurmodus/lernzettel': 'Lernzettel Bibliothek',
  '/klausurmodus/lernzettel/neu': 'Lernzettel Generator',
  '/klausurmodus/lernplan': 'Lernplan Übersicht',
  '/klausurmodus/lernplan/neu': 'Lernplan Konfigurator',
  '/profil': 'Profil & Einstellungen',
  '/profil/faecher': 'Fächer bearbeiten',
  '/profil/bundesland': 'Bundesland & Schulform',
  '/profil/benachrichtigungen': 'Benachrichtigungen',
  '/profil/datenschutz': 'Datenschutz',
  '/profil/impressum': 'Impressum',
  '/schreibblock': 'Schreibblock',
  '/insights': 'Statistiken & Insights',
}

function getScreenName(pathname: string): string {
  if (ROUTE_NAMES[pathname]) return ROUTE_NAMES[pathname]
  if (pathname.startsWith('/klausurmodus/lernplan/')) return 'Lernplan Detail'
  if (pathname.match(/\/unterricht\/[^/]+\/ordner\/[^/]+\/neue-notiz/)) return 'Neue Notiz (Ordner)'
  if (pathname.match(/\/unterricht\/[^/]+\/ordner\//)) return 'Ordner'
  if (pathname.match(/\/unterricht\/[^/]+\/neue-notiz/)) return 'Neue Notiz'
  if (pathname.match(/\/unterricht\/[^/]+\/[^/]+/)) return 'Smart Notes'
  if (pathname.match(/\/unterricht\/[^/]+/)) return 'Fach-Ansicht'
  return pathname
}

export function BugReportWidget() {
  const location = useLocation()
  const { authUser, profile } = useUser()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  const screenName = getScreenName(location.pathname)

  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID as string | undefined
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string | undefined
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string | undefined
  const configured = !!(serviceId && templateId && publicKey)

  async function handleSend() {
    if (!message.trim()) return
    setStatus('sending')

    if (!configured) {
      console.warn('[BugReport] EmailJS nicht konfiguriert — Keys fehlen in .env')
      setStatus('error')
      return
    }

    try {
      await emailjs.send(
        serviceId!,
        templateId!,
        {
          screen: screenName,
          route: location.pathname,
          bug_description: message.trim(),
          user_email: authUser?.email ?? 'unbekannt',
          user_name: profile?.name ?? 'unbekannt',
          timestamp: new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }),
          user_agent: navigator.userAgent,
        },
        { publicKey: publicKey! }
      )
      setStatus('sent')
      setMessage('')
      setTimeout(() => {
        setOpen(false)
        setStatus('idle')
      }, 2000)
    } catch (err) {
      console.error('[BugReport] Fehler beim Senden:', err)
      setStatus('error')
    }
  }

  function handleClose() {
    setOpen(false)
    setMessage('')
    setStatus('idle')
  }

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(true)}
        title="Bug melden"
        className="fixed top-4 right-4 z-50 w-8 h-8 rounded-full flex items-center justify-center text-white text-[13px] font-black shadow-lg press-sm select-none"
        style={{ background: 'linear-gradient(135deg, #FF453A, #FF6B5B)' }}
        aria-label="Bug melden"
      >
        !
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
          onClick={handleClose}
        >
          <div
            className="w-full sm:max-w-sm mx-4 mb-6 sm:mb-0 rounded-[20px] overflow-hidden shadow-2xl"
            style={{ background: 'var(--color-surface)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 pt-5 pb-4 border-b border-border/40">
              <div className="flex items-center gap-3 mb-1">
                <div
                  className="w-9 h-9 rounded-[11px] flex items-center justify-center text-white font-black text-base shrink-0"
                  style={{ background: 'linear-gradient(135deg, #FF453A, #FF6B5B)' }}
                >
                  !
                </div>
                <div>
                  <p className="text-[16px] font-bold text-text">Bug melden</p>
                  <p className="text-[12px] text-text-muted">Wird direkt an Simon gesendet</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-3">
              {/* Auto-detected screen */}
              <div
                className="flex items-center justify-between px-3 py-2 rounded-[10px]"
                style={{ background: 'var(--color-surface-2)' }}
              >
                <span className="text-[12px] font-semibold text-text-muted uppercase tracking-wide">Screen</span>
                <span className="text-[13px] font-semibold text-text">{screenName}</span>
              </div>

              {/* Description textarea */}
              <div>
                <label className="block text-[12px] font-semibold text-text-muted uppercase tracking-wide mb-1.5">
                  Was ist passiert?
                </label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Beschreib kurz was nicht funktioniert..."
                  rows={4}
                  className="w-full text-[14px] text-text placeholder:text-text-muted/50 bg-transparent border border-border/60 rounded-[12px] px-3 py-2.5 resize-none focus:outline-none focus:border-accent/60 transition-colors"
                  autoFocus
                  disabled={status === 'sending' || status === 'sent'}
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
            </div>

            {/* Actions */}
            <div className="px-5 pb-5 flex gap-2.5">
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
                {status === 'sending' ? 'Sende...' : 'Senden'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
