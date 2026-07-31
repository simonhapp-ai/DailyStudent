import { useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { createCheckoutSession } from '../../lib/stripe'
import { purchasePlan } from '../../lib/revenuecat'
import { supabase } from '../../lib/supabase'
import { useUser } from '../../context/UserContext'

const isNative = Capacitor.isNativePlatform()

type ProFeature = 'ki-zusammenfassung' | 'ki-korrektur' | 'lernplan' | 'karteikarten' | 'lernzettel' | 'probeklausur' | 'rabatt' | 'allgemein'

const featureContent: Record<ProFeature, { headline: string; bullets: string[] }> = {
  'ki-zusammenfassung': {
    headline: 'KI-Zusammenfassung freischalten',
    bullets: [
      'Aufnahmen werden automatisch zu strukturierten Notizen',
      'Schlüsselbegriffe und Klausurthemen werden erkannt',
      'Spare bis zu 2 Stunden Nachbereitung pro Woche',
    ],
  },
  'ki-korrektur': {
    headline: 'KI-Analyse freischalten',
    bullets: [
      'Detailliertes Feedback zu Stärken und Schwächen',
      'Konkrete Tipps für die echte Klausur',
      'Abitur-gerechte Bewertung nach Erwartungshorizont',
    ],
  },
  'lernplan': {
    headline: 'KI-Lernplan freischalten',
    bullets: [
      'Rückwärts-Lernplan aus dem Klausurdatum berechnen',
      'Tägliche Ziele passend zu deinem Stundenplan',
      'Automatische Anpassung bei Änderungen',
    ],
  },
  'karteikarten': {
    headline: 'Unbegrenzte Karteikarten',
    bullets: [
      'Alle Karteikarten für alle Fächer ohne Limit',
      'KI-generierte Karten aus deinen Smart Notes',
      'Spaced-Repetition für effizientes Lernen',
    ],
  },
  'lernzettel': {
    headline: 'Unbegrenzte Lernzettel',
    bullets: [
      'Free-Nutzer: 1 Lernzettel pro Tag',
      'Pro: Unbegrenzt für alle Fächer',
      'KI nutzt dein Kerncurriculum für optimale Vorbereitung',
    ],
  },
  'probeklausur': {
    headline: 'Unbegrenzte Probeklausuren',
    bullets: [
      'Free-Nutzer: 1 vollständige Klausur pro Tag',
      'Pro: Unbegrenzt üben für alle Fächer',
      'Inkl. vollständiger KI-Korrektur mit Fehlern & Lücken',
    ],
  },
  'rabatt': {
    headline: 'Dein Rabatt ist bereit!',
    bullets: [
      'Alle KI-Features. Kein Limit.',
      'Rabatt wird automatisch im Checkout angewendet',
      'Einmalig gültig auf Monat oder Jahr',
    ],
  },
  'allgemein': {
    headline: 'Pro freischalten',
    bullets: [
      'KI-Zusammenfassungen aus Foto-Scans',
      'Unbegrenzte Karteikarten (FSRS)',
      'KI-Rotstift-Korrektur',
      'Persönlicher Lernplan',
    ],
  },
}

interface ProModalProps {
  feature: ProFeature
  isOpen: boolean
  onClose: () => void
  couponId?: string
  discountPercent?: number
}

export function ProModal({ feature, isOpen, onClose, couponId, discountPercent }: ProModalProps) {
  const { appConfig, authUser } = useUser()
  const [plan, setPlan] = useState<'annual' | 'monthly'>('annual')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [waitlistLoading, setWaitlistLoading] = useState(false)
  const [waitlistDone, setWaitlistDone] = useState(false)

  if (!isOpen) return null

  const content = featureContent[feature]

  const handleWaitlist = async () => {
    if (!authUser) return
    setWaitlistLoading(true)
    await supabase.from('profiles').update({ pro_waitlist_interested: true }).eq('id', authUser.id)
    setWaitlistLoading(false)
    setWaitlistDone(true)
  }

  // Pro purchases are paused for the beta launch (see migration
  // 017_beta_mode_config.sql) — every ProModal trigger in the app funnels
  // through here, so gating this one component covers all of them at once.
  // Nothing below this is removed, just skipped: flipping
  // app_config.pro_purchases_enabled back to true (Supabase dashboard, no
  // deploy needed) restores the normal checkout flow immediately.
  if (!appConfig.proPurchasesEnabled) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col justify-end">
        <div className="absolute inset-0 bg-black/60" onClick={onClose} />
        <div className="relative max-w-lg mx-auto w-full bg-surface border-t border-border rounded-t-2xl px-5 pt-5 pb-10 z-10">
          <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />

          <div className="w-12 h-12 rounded-btn icon-accent flex items-center justify-center mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <h2 className="text-xl font-bold text-text-primary mb-1">Pro startet nach der Beta</h2>
          <p className="text-text-secondary text-sm mb-5">
            Wir pausieren Pro-Käufe während unseres Beta-Launches, damit wir uns voll auf ein stabiles Erlebnis konzentrieren können, bevor echtes Geld fließt.
          </p>

          <ul className="space-y-3 mb-6">
            {[
              'Deine Notizen, Karteikarten & Fortschritte bleiben gespeichert — nichts geht verloren',
              'Pro schaltet unsere KI-intensivsten Features frei — darauf sind wir richtig stolz',
              'Trag dich jetzt ein und sichere dir einen exklusiven Rabatt zum Start',
            ].map((b, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-text-secondary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2.5" className="shrink-0 mt-0.5">
                  <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {b}
              </li>
            ))}
          </ul>

          {waitlistDone ? (
            <div
              className="w-full py-3.5 rounded-card text-center text-[15px] font-semibold mb-3"
              style={{ background: 'rgba(52,211,153,0.12)', color: '#34D399' }}
            >
              Danke! Du bekommst als Erstes Bescheid 🎉
            </div>
          ) : (
            <button
              onClick={handleWaitlist}
              disabled={waitlistLoading}
              className="w-full py-3.5 rounded-card grad-accent text-white text-[15px] font-semibold press transition-all disabled:opacity-60 mb-3"
            >
              {waitlistLoading ? 'Wird gespeichert…' : 'Für Rabatt vormerken'}
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full text-center text-sm text-text-muted hover:text-text-secondary transition-colors py-2"
          >
            Schließen
          </button>
        </div>
      </div>
    )
  }

  const handleCheckout = async () => {
    setError(null)
    if (isNative) {
      setLoading(true)
      const result = await purchasePlan(plan === 'annual' ? 'yearly' : 'monthly')
      setLoading(false)
      if (result.success) {
        onClose()
      } else if (!result.cancelled) {
        setError(result.error ?? 'Kauf fehlgeschlagen. Bitte versuche es erneut.')
      }
      return
    }
    try {
      setLoading(true)
      const url = await createCheckoutSession(plan === 'annual' ? 'yearly' : 'monthly', couponId)
      window.location.href = url
    } catch {
      setLoading(false)
      setError('Checkout konnte nicht gestartet werden. Bitte versuche es erneut.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Sheet */}
      <div className="relative max-w-lg mx-auto w-full bg-surface border-t border-border rounded-t-2xl px-5 pt-5 pb-10 z-10">
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />

        <div className="w-12 h-12 rounded-btn icon-accent flex items-center justify-center mb-4">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h2 className="text-xl font-bold text-text-primary mb-1">{content.headline}</h2>
        <p className="text-text-secondary text-sm mb-5">Weniger als eine Nachhilfestunde im Monat.</p>

        {couponId && discountPercent && (
          <div className="rounded-card px-3 py-2 mb-4 border text-center"
            style={{ background: 'rgba(52,211,153,0.08)', borderColor: 'rgba(52,211,153,0.25)' }}>
            <p className="text-[13px] font-semibold" style={{ color: '#34D399' }}>
              🎉 {discountPercent}% Rabatt aktiv — wird beim Checkout angewendet
            </p>
          </div>
        )}

        <ul className="space-y-3 mb-6">
          {content.bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-text-secondary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2.5" className="shrink-0 mt-0.5">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {b}
            </li>
          ))}
        </ul>

        {/* Price toggle */}
        <div className="bg-background border border-border rounded-card p-1 flex mb-4">
          <button
            onClick={() => setPlan('annual')}
            className={`flex-1 py-2.5 rounded-btn text-sm font-medium transition-all duration-150 ${
              plan === 'annual' ? 'grad-accent text-white' : 'text-text-secondary'
            }`}
          >
            Jährlich · €5/Mo
            {plan === 'annual' && <span className="ml-1.5 text-xs opacity-75">2 Monate gratis</span>}
          </button>
          <button
            onClick={() => setPlan('monthly')}
            className={`flex-1 py-2.5 rounded-btn text-sm font-medium transition-all duration-150 ${
              plan === 'monthly' ? 'grad-accent text-white' : 'text-text-secondary'
            }`}
          >
            Monatlich · €7,99
          </button>
        </div>

        {error && (
          <p className="text-[13px] text-red-500 text-center mb-3">{error}</p>
        )}

        <button
          onClick={handleCheckout}
          disabled={loading}
          className="w-full py-3.5 rounded-card grad-accent text-white text-[15px] font-semibold press transition-all disabled:opacity-60 mb-3"
        >
          {loading ? 'Wird geladen…' : `Pro freischalten · ${plan === 'annual' ? '€59,99/Jahr' : '€7,99/Monat'}`}
        </button>

        <button
          onClick={onClose}
          className="w-full text-center text-sm text-text-muted hover:text-text-secondary transition-colors py-2"
        >
          Später
        </button>

        <p className="text-center text-xs text-text-muted mt-3">
          Abi-Schnitt unserer Pro-Nutzer: Ø 1.7
        </p>
      </div>
    </div>
  )
}
