import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { createCheckoutSession } from '../../lib/stripe'
import { purchasePlan, checkMonthlyTrialEligibility } from '../../lib/revenuecat'
import { useUser } from '../../context/UserContext'

const isNative = Capacitor.isNativePlatform()

// Web-only "first purchase" welcome offer — the native-app equivalent is the
// App Store intro trial (showTrialCopy below), which Apple doesn't allow
// stacking with a percentage coupon anyway. Self-limiting via Stripe's
// `duration: once` on the coupon itself, no purchase-history check needed.
// Requires a coupon named exactly this in the Stripe Dashboard (20% off,
// duration: once) — see CLAUDE.md/PRO_LAUNCH_MASTER_PROMPT.md.
export const WELCOME_COUPON_ID = 'DS20'
export const WELCOME_DISCOUNT_PERCENT = 20

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
    headline: 'KI-Korrektur freischalten',
    bullets: [
      'Vollständige Bewertung nach Abitur-Erwartungshorizont',
      'Konkretes Feedback zu Fehlern, Lücken und Formulierung',
      'Für alle Probeklausur-Arten, unbegrenzt',
    ],
  },
  'lernplan': {
    headline: 'Alle Lernplan-Arten freischalten',
    bullets: [
      'Vollständiger Plan & Abitur-Plan über alle Fächer',
      'Rückwärts aus dem Klausurdatum, passend zum Stundenplan',
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
    headline: 'Premium-KI für Lernzettel',
    bullets: [
      'Lernzettel von Claude — gründlicher, mit echten Diagrammen',
      'Unbegrenzt statt 1 pro Tag, für alle Fächer',
      'Nutzt Kerncurriculum + deine Smart Notes als Basis',
    ],
  },
  'probeklausur': {
    headline: 'Alle Probeklausur-Arten + Premium-KI',
    bullets: [
      'AFB-Trainer, Materialklausur & Ohne-Material freischalten',
      'Premium-KI zeichnet echtes Klausurmaterial (Schaltpläne, Diagramme)',
      'Vollständige KI-Korrektur mit Fehlern, Lücken & Formulierungshilfe',
    ],
  },
  'rabatt': {
    headline: 'Dein Rabatt ist bereit!',
    bullets: [
      'Alle KI-Features. Premium-KI-Modelle. Kein Limit.',
      'Rabatt wird automatisch im Checkout angewendet',
      'Einmalig gültig auf Monat oder Jahr',
    ],
  },
  'allgemein': {
    headline: 'Zugriff auf die Premium-KI-Modelle',
    bullets: [
      'Lernzettel & Klausurmaterial von Claude statt der Standard-KI',
      'Alle Probeklausur-Arten inkl. vollständiger KI-Korrektur',
      'Alle Lernplan-Arten, unbegrenzte Lernzettel & Karteikarten',
      'KI-Zusammenfassungen aus Foto-Scans',
    ],
  },
}

// Steht bewusst weit unten im Modal (nach Preis + Buttons): die Premium-KI hat
// ein großzügiges Monatskontingent, danach läuft es nahtlos über die Standard-KI
// weiter — nichts bricht ab.
const PREMIUM_KI_NOTE = 'Premium-KI: 50 Lernzettel und 25 Klausur-Materialien pro Monat über Claude — danach automatisch weiter mit der Standard-KI.'

interface ProModalProps {
  feature: ProFeature
  isOpen: boolean
  onClose: () => void
  couponId?: string
  discountPercent?: number
}

export function ProModal({ feature, isOpen, onClose, couponId, discountPercent }: ProModalProps) {
  const { isPro } = useUser()
  const [plan, setPlan] = useState<'annual' | 'monthly'>('annual')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [trialEligible, setTrialEligible] = useState(false)

  // Only relevant on iOS (App Store intro offer) — the Stripe/web checkout
  // has no trial. Checked on every open since eligibility can change if the
  // user already burned their trial on another device in the meantime.
  useEffect(() => {
    if (!isOpen || !isNative) return
    let cancelled = false
    void checkMonthlyTrialEligibility().then((eligible) => {
      if (!cancelled) setTrialEligible(eligible)
    })
    return () => {
      cancelled = true
    }
  }, [isOpen])

  if (!isOpen) return null
  // Wer bereits Pro hat, darf nie einen Checkout sehen — egal über welchen der
  // ProModal-Trigger er hier landet (Beta-Allowlist, versehentlicher Aufruf, …).
  if (isPro) return null

  const content = featureContent[feature]
  const showTrialCopy = isNative && trialEligible && plan === 'monthly'
  // Explicit couponId prop (e.g. a future reactivated redemption flow) always
  // wins; otherwise every web checkout gets the universal welcome discount.
  const effectiveCouponId = couponId ?? (!isNative ? WELCOME_COUPON_ID : undefined)
  const effectiveDiscountPercent = discountPercent ?? (!isNative ? WELCOME_DISCOUNT_PERCENT : undefined)

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
      const url = await createCheckoutSession(plan === 'annual' ? 'yearly' : 'monthly', effectiveCouponId)
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
      <div className="relative max-w-lg mx-auto w-full bg-surface border-t border-border rounded-t-2xl px-5 pt-5 z-10" style={{ paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom, 0px))' }}>
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />

        <div className="w-12 h-12 rounded-btn icon-accent flex items-center justify-center mb-4">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-primary">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h2 className="text-xl font-bold text-text-primary mb-1">{content.headline}</h2>
        <p className="text-text-secondary text-sm mb-5">Weniger als eine Nachhilfestunde im Monat.</p>

        {effectiveCouponId && effectiveDiscountPercent && (
          <div className="rounded-card px-3 py-2 mb-4 border text-center"
            style={{ background: 'rgba(52,211,153,0.08)', borderColor: 'rgba(52,211,153,0.25)' }}>
            <p className="text-[13px] font-semibold" style={{ color: '#34D399' }}>
              Release Rabatt · Jetzt {effectiveDiscountPercent}% sichern!
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
              plan === 'annual' ? 'btn-mode' : 'text-text-secondary'
            }`}
          >
            Jährlich · €5/Mo
            {plan === 'annual' && <span className="ml-1.5 text-xs opacity-75">2 Monate gratis</span>}
          </button>
          <button
            onClick={() => setPlan('monthly')}
            className={`flex-1 py-2.5 rounded-btn text-sm font-medium transition-all duration-150 ${
              plan === 'monthly' ? 'btn-mode' : 'text-text-secondary'
            }`}
          >
            Monatlich · €7,99
            {plan === 'monthly' && showTrialCopy && <span className="ml-1.5 text-xs opacity-75">1 Woche gratis</span>}
          </button>
        </div>

        {/* Apple Guideline 3.1.2: subscription length, price, and a link to
            the terms must be visible directly at the purchase point, not
            just buried in the AGB screen. */}
        {showTrialCopy && (
          <p className="text-center text-[12px] mb-3" style={{ color: '#34D399' }}>
            1 Woche kostenlos, danach €7,99/Monat — jederzeit kündbar
          </p>
        )}

        {error && (
          <p className="text-[13px] text-red-500 text-center mb-3">{error}</p>
        )}

        <button
          onClick={handleCheckout}
          disabled={loading}
          className="w-full h-12 rounded-pill btn-mode text-[15px] font-semibold press transition-all disabled:opacity-60 mb-3"
        >
          {loading
            ? 'Wird geladen…'
            : showTrialCopy
              ? '1 Woche kostenlos testen'
              : `Pro freischalten · ${plan === 'annual' ? '€59,99/Jahr' : '€7,99/Monat'}`}
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

        <p className="text-center text-[11px] text-text-muted mt-3 leading-relaxed">
          {PREMIUM_KI_NOTE}
        </p>

        <p className="text-center text-[11px] text-text-muted mt-3 leading-relaxed">
          {plan === 'annual' ? 'Jährliches Abo, automatische Verlängerung.' : 'Monatliches Abo, automatische Verlängerung.'}{' '}
          Mit dem Kauf akzeptierst du unsere{' '}
          <Link to="/agb" onClick={onClose} className="underline">Nutzungsbedingungen</Link>
          {' '}und{' '}
          <Link to="/datenschutz" onClick={onClose} className="underline">Datenschutzerklärung</Link>.
        </p>
      </div>
    </div>
  )
}
