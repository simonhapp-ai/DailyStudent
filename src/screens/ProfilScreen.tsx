import { useUser } from '../context/UserContext'
import { Tag } from '../components/ui/Tag'
import { Metric, MetricRow } from '../components/ui/Metric'
import type { AppTheme } from '../context/UserContext'
import { ListGroup, ListRow } from '../components/ui/ListGroup'
import { Icon, type IconName } from '../components/ui/Icon'
import { rangFuer, rangFortschritt } from '../lib/xp'
import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { createCheckoutSession, fetchIsProFromSupabase } from '../lib/stripe'
import { purchasePlan } from '../lib/revenuecat'
import { ProModal, WELCOME_COUPON_ID } from '../components/ui/ProModal'
import { getActiveStreak } from '../lib/streak'
import { bundeslandName } from '../data/bundeslaender'
import { ZurueckZeile } from '../components/ui/ZurueckZeile'

const AVATAR_BG_OPTIONS = [
  { id: 'purple', gradient: '#A78BFA' },
  { id: 'blue',   gradient: '#60A5FA' },
  { id: 'teal',   gradient: 'var(--grad-mode)' },
  { id: 'green',  gradient: '#34D399' },
  { id: 'orange', gradient: '#FBBF24' },
  { id: 'pink',   gradient: '#F472B6' },
  { id: 'red',    gradient: '#F87171' },
  { id: 'indigo', gradient: '#818CF8' },
  { id: 'cyan',   gradient: '#67E8F9' },
  { id: 'rose',   gradient: '#FDA4AF' },
]

const AVATAR_EMOJI_OPTIONS = ['🎓', '📚', '✏️', '🔬', '🧮', '📐', '🧪', '🔭', '💡', '📝']

// Emails die die Dev-Tools sehen dürfen
const PRO_TOGGLE_ALLOWLIST = [
  'simon.happ@gmx.de',
  // 'weitere@email.de',
]


function NavRow({ label, sublabel, onClick }: {
  label: string; sublabel?: string; onClick: () => void
}) {
  return (
    <ListRow
      title={<span className="text-[15px] font-normal">{label}</span>}
      value={sublabel}
      chevron
      onClick={onClick}
    />
  )
}

// Erscheinungsbild steht direkt hier statt hinter einer eigenen Seite: Drei
// Moeglichkeiten, eine Zeile — dafuer lohnt kein Screenwechsel. (Die frühere
// Unterseite war beim Umbau entfallen, die Zeile zeigte danach ins Leere.)
function ThemeRow({ theme, onPick }: { theme: AppTheme; onPick: (t: AppTheme) => void }) {
  const options: { value: AppTheme; label: string }[] = [
    { value: 'light', label: 'Hell' },
    { value: 'dark', label: 'Dunkel' },
    { value: 'system', label: 'System' },
  ]
  return (
    <div className="flex items-center gap-3 px-4 py-3 min-h-[52px] border-b border-border/40 last:border-b-0">
      <span className="text-[15px] text-text-primary flex-1">Erscheinungsbild</span>
      <div className="flex p-0.5 rounded-pill bg-[rgb(120,120,128)]/[0.12] dark:bg-[rgb(120,120,128)]/[0.24] shrink-0">
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => onPick(o.value)}
            aria-pressed={theme === o.value}
            className="h-8 px-3 rounded-pill text-[13px] font-semibold press-sm transition-colors"
            style={
              theme === o.value
                ? { background: 'rgb(var(--color-surface))', color: 'rgb(var(--color-text-primary))' }
                : { color: 'rgb(var(--color-text-secondary))' }
            }
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Fortschrittsring zum naechsten Rang — dieselbe Sprache wie die Kennzahlen,
 *  nur rund. Ersetzt das gezeichnete Muenzbild. */
function RangRing({ xp }: { xp: number }) {
  const anteil = rangFortschritt(xp)
  const umfang = 2 * Math.PI * 15
  return (
    <span className="relative w-9 h-9 shrink-0 flex items-center justify-center">
      <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden>
        <circle cx="18" cy="18" r="15" fill="none" strokeWidth="3"
          stroke="rgb(var(--color-border))" />
        <circle cx="18" cy="18" r="15" fill="none" strokeWidth="3" strokeLinecap="round"
          stroke="rgb(var(--color-accent))"
          strokeDasharray={`${umfang * anteil} ${umfang}`}
          transform="rotate(-90 18 18)" />
      </svg>
      <span className="absolute text-[12px] font-bold tabular-nums text-text-primary">
        {rangFuer(xp).stufe}
      </span>
    </span>
  )
}

export function ProfilScreen() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { profile, theme, setTheme, isPro, setIsPro, appStats, userNotes, authUser, updateProfile, referralCode, referralCount, trialEndsAt, appConfig } = useUser()
  const [checkoutLoading, setCheckoutLoading] = useState<'monthly' | 'yearly' | null>(null)
  const [paymentToast, setPaymentToast] = useState<'success' | 'error' | null>(null)
  const [paymentErrorMessage, setPaymentErrorMessage] = useState<string | null>(null)
  const [showProComingSoon, setShowProComingSoon] = useState(false)
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false)
  const [copyToast, setCopyToast] = useState(false)

  const referralLink = referralCode
    ? `${window.location.origin}/?ref=${referralCode}`
    : null

  const handleCopyReferral = () => {
    if (!referralLink) return
    void navigator.clipboard.writeText(referralLink).then(() => {
      setCopyToast(true)
      setTimeout(() => setCopyToast(false), 2200)
    })
  }

  const trialActive = trialEndsAt ? new Date(trialEndsAt) > new Date() : false

  const avatarBg = profile?.avatarBg ?? '#A78BFA'
  const avatarEmoji = profile?.avatarEmoji ?? '🎓'

  useEffect(() => {
    if (searchParams.get('payment') !== 'success') return
    setSearchParams({}, { replace: true })
    setPaymentToast('success')
    // Webhook is async — poll once after 2s to confirm isPro
    setTimeout(async () => {
      const isNowPro = await fetchIsProFromSupabase()
      if (isNowPro) setIsPro(true)
    }, 2000)
    setTimeout(() => setPaymentToast(null), 6000)
  }, [])

  const handleUpgrade = async (plan: 'monthly' | 'yearly') => {
    // Beta launch: Pro purchases paused (migration 017_beta_mode_config.sql).
    // Existing native/Stripe logic below is untouched and resumes automatically
    // once app_config.pro_purchases_enabled flips back — this only short-circuits.
    if (!appConfig.proPurchasesEnabled) {
      setShowProComingSoon(true)
      return
    }
    if (Capacitor.isNativePlatform()) {
      setCheckoutLoading(plan)
      const result = await purchasePlan(plan)
      setCheckoutLoading(null)
      if (result.success) {
        setPaymentToast('success')
        setTimeout(() => setPaymentToast(null), 6000)
      } else if (!result.cancelled) {
        setPaymentErrorMessage(result.error ?? null)
        setPaymentToast('error')
        setTimeout(() => setPaymentToast(null), 4000)
      }
      return
    }
    try {
      setCheckoutLoading(plan)
      // Same universal web welcome discount ProModal applies — this button
      // bypasses ProModal entirely, so it needs its own copy of the same
      // default (bug found 30.08.2026: this path shipped with no couponId at
      // all, so the discount banner text was showing but never actually
      // reaching Stripe from here).
      const url = await createCheckoutSession(plan, WELCOME_COUPON_ID)
      window.location.href = url
    } catch {
      setCheckoutLoading(null)
      setPaymentErrorMessage(null)
      setPaymentToast('error')
      setTimeout(() => setPaymentToast(null), 4000)
    }
  }

  const activeStreak = getActiveStreak(appStats.streak, appStats.lastStudyDate)

  const stats: { label: string; value: string; unit?: string; icon: IconName }[] = [
    { label: 'Streak',    value: activeStreak.toString(), unit: 'Tage', icon: 'flame' as IconName },
    { label: 'Notizen',   value: userNotes.length.toString(),            icon: 'note' as IconName },
    { label: 'Klausuren', value: appStats.examCount.toString(),          icon: 'clipboard' as IconName },
    { label: 'Ø Note',    value: profile?.abiGesamtnote ?? '—',          icon: 'star' },
  ]

  const subtitle = profile
    ? `${profile.schulform.charAt(0).toUpperCase()}${profile.schulform.slice(1)} · ${profile.klasse}. Klasse · ${bundeslandName(profile.bundesland)}`
    : 'Gymnasium · 12. Klasse'

  const isDevAllowlisted = PRO_TOGGLE_ALLOWLIST.includes(authUser?.email ?? '')

  return (
    <div className="flex flex-col min-h-dvh bg-background pb-28">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="px-4" style={{ paddingTop: 'max(58px, calc(env(safe-area-inset-top, 0px) + 18px))' }}>
        <ZurueckZeile />
        <h1 className="text-[28px] font-bold text-text-primary">Profil</h1>
      </div>

      <div className="px-4 lg:px-6 mt-5 lg:max-w-[1180px] lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start">

        {/* Linke Spalte — wer du bist und wo du stehst */}
        <div className="space-y-5">

        {/* ── User card ──────────────────────────────────────────── */}
        <div className="bg-surface rounded-card shadow-card-adaptive border border-border/60 overflow-hidden">
          <div className="p-5 flex items-center gap-4">
            {/* Avatar with edit overlay */}
            <button
              onClick={() => setAvatarPickerOpen(v => !v)}
              className="relative shrink-0 group"
              title="Profilbild bearbeiten"
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-[28px]"
                style={{ background: avatarBg }}
              >
                {avatarEmoji}
              </div>
              {/* Pencil overlay on hover/tap */}
              <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                   style={{ background: 'rgba(0,0,0,0.35)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </div>
              {/* Small edit badge */}
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center border-2 border-surface"
                   style={{ background: 'var(--grad-mode)' }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </div>
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-text-primary font-bold text-[18px] truncate">{profile?.name ?? 'Max Müller'}</p>
                {isPro && (
                  <span className="badge-pro-gold px-2.5 py-0.5 shrink-0">✦ Pro</span>
                )}
              </div>
              <p className="text-text-muted text-[13px] mt-0.5 truncate">{subtitle}</p>
            </div>
          </div>

          {/* ── Avatar picker (inline, toggled by avatar tap) ────── */}
          {avatarPickerOpen && (
            <div className="px-5 pb-5 border-t border-border/40 pt-4">
              <p className="section-label mb-3">Hintergrund</p>
              <div className="flex gap-2 flex-wrap mb-4">
                {AVATAR_BG_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => updateProfile({ avatarBg: opt.gradient })}
                    className="w-8 h-8 rounded-full press-sm shrink-0 transition-transform"
                    style={{
                      background: opt.gradient,
                      outline: avatarBg === opt.gradient ? '2.5px solid rgb(var(--color-accent))' : '2.5px solid transparent',
                      outlineOffset: '2px',
                    }}
                  />
                ))}
              </div>

              <p className="section-label mb-3">Symbol</p>
              <div className="flex gap-2 flex-wrap">
                {AVATAR_EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => updateProfile({ avatarEmoji: emoji })}
                    className="w-10 h-10 rounded-btn flex items-center justify-center text-[22px] press-sm transition-all"
                    style={{
                      background: avatarEmoji === emoji
                        ? 'rgb(var(--color-accent) / 0.15)'
                        : 'rgb(var(--color-border) / 0.4)',
                      outline: avatarEmoji === emoji ? '2px solid rgb(var(--color-accent))' : '2px solid transparent',
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Pro upgrade (nur sichtbar wenn nicht Pro) ──────────── */}
        {/* Beta launch (migration 017_beta_mode_config.sql): while purchases are
            paused, this card + the Referral Widget move to the very bottom of
            the page instead (see that section, right above the footer) — Simon's
            explicit placement call, 31.07.2026. This normal-state version is
            unchanged and simply doesn't render during beta; no code removed. */}
        {/* Karte auf der eigenen Fläche statt auf einem blassen Blau, das sonst
            nirgends in der App vorkommt. Die Modusfarbe steht im Knopf, nicht als
            Tönung über der ganzen Karte. */}
        {!isPro && appConfig.proPurchasesEnabled && (
          <div className="card-pro rounded-card p-5 shadow-card-adaptive">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="pro-title font-bold text-[17px]">Pro freischalten</p>
                <p className="pro-sub text-[13px] mt-0.5">Alle KI-Features. Kein Limit.</p>
              </div>
              <div className="text-right">
                <p className="pro-title font-bold text-[20px]">€7,99<span className="pro-sub text-[13px] font-normal">/Mo</span></p>
                <p className="pro-sub text-[11px]">jährlich</p>
              </div>
            </div>
            <ul className="space-y-2.5 mb-5">
              {[
                'KI-Zusammenfassungen aus Foto-Scans',
                'Unbegrenzte Karteikarten (FSRS)',
                'KI-Rotstift-Korrektur',
                'Persönlicher Lernplan',
              ].map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-[14px] pro-feature">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="pro-check shrink-0">
                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            {/* Platform-aware teaser — the authoritative check (RevenueCat
                trial eligibility on iOS) happens once ProModal opens; this is
                just marketing copy pointing at whichever offer applies. */}
            {/* Das Angebot ist eine Marke, keine farbige Schrift. */}
            <div className="mb-3">
              <Tag tone="gold" size="sm">
                {Capacitor.isNativePlatform() ? '1 Woche kostenlos beim Monatsabo' : '20% Rabatt auf deinen ersten Kauf'}
              </Tag>
            </div>
            <button
              onClick={() => handleUpgrade('yearly')}
              disabled={checkoutLoading !== null}
              className="w-full h-12 rounded-pill btn-mode text-[15px] font-bold hover:opacity-90 press transition-all disabled:opacity-60"
            >
              {checkoutLoading === 'yearly' ? 'Wird geladen…' : 'Pro freischalten · €59,99/Jahr'}
            </button>
            <button
              onClick={() => handleUpgrade('monthly')}
              disabled={checkoutLoading !== null}
              className="w-full py-2 text-[13px] pro-sub hover:opacity-80 transition-opacity disabled:opacity-60"
            >
              {checkoutLoading === 'monthly' ? 'Wird geladen…' : 'Oder monatlich: €7,99/Monat'}
            </button>
          </div>
        )}

        {/* ── Referral Widget ────────────────────────────────────── */}
        {/* Beta launch: same relocation as the card above — beta framing of this
            widget now lives at the bottom of the page, this normal-state version
            just doesn't render while paused. */}
        {!isPro && !trialActive && appConfig.proPurchasesEnabled && (
          <div className="card-invite rounded-card shadow-card-adaptive overflow-hidden">
            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-10 h-10 rounded-btn flex items-center justify-center shrink-0 btn-premium"
                  >
                    <Icon name="gift" size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="inv-title font-bold text-[15px]">14 Tage Pro gratis</p>
                      <Tag tone="gold" size="sm">Nur kurze Zeit</Tag>
                    </div>
                    <p className="inv-sub text-[12px] mt-0.5">Lade 5 Freunde ein — erhalte 14 Tage Pro</p>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="inv-sub text-[12px]">Fortschritt</span>
                  <span className="inv-title font-bold text-[13px] tabular-nums">{referralCount}/5</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(128,128,128,0.15)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, (referralCount / 5) * 100)}%`,
                      background: 'linear-gradient(90deg, #C8860A, #F5C842, #FFD700)',
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span
                      key={n}
                      className="text-[11px] font-medium"
                      style={{ color: referralCount >= n ? '#D4AF37' : 'rgb(var(--color-text-muted))' }}
                    >
                      {n === 5 ? <Icon name="gift" size={13} /> : `${n}`}
                    </span>
                  ))}
                </div>
              </div>

              {/* QR + share */}
              {referralCode && (
                <div className="flex items-center gap-3">
                  <div
                    className="shrink-0 rounded-btn overflow-hidden"
                    style={{ width: 64, height: 64, background: '#fff' }}
                  >
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(referralLink ?? '')}&size=128x128&margin=4`}
                      alt="QR Code"
                      width={64}
                      height={64}
                      className="w-full h-full"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="inv-sub text-[11px] mb-1.5">Dein Einladungslink</p>
                    <p className="inv-mono font-mono text-[12px] truncate mb-2">{referralLink}</p>
                    {copyToast ? (
                      <div className="w-full py-2 rounded-btn text-[13px] font-semibold text-center bg-[rgb(120,120,128)]/[0.12] dark:bg-[rgb(120,120,128)]/[0.24] text-[rgb(var(--fill-green))]">
                        Kopiert
                      </div>
                    ) : (
                      <button
                        onClick={handleCopyReferral}
                        className="btn-copy-shimmer w-full py-2 rounded-btn text-[13px] font-semibold press-sm"
                      >
                        Link kopieren
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Trial active success card */}
        {trialActive && trialEndsAt && (
          <div
            className="rounded-card border p-5 flex items-center gap-4"
            style={{ borderColor: 'rgba(48,209,88,0.25)', background: 'linear-gradient(140deg, rgba(48,209,88,0.07) 0%, rgba(48,209,88,0.02) 100%)' }}
          >
            <div
              className="w-11 h-11 rounded-btn flex items-center justify-center text-[22px] shrink-0"
              style={{ background: 'var(--grad-mode)' }}
            >
              <Icon name="gift" size={26} />
            </div>
            <div>
              <p className="text-text-primary font-bold text-[15px]">14 Tage Pro aktiv!</p>
              <p className="text-text-muted text-[12px] mt-0.5">
                Endet am {new Date(trialEndsAt).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
        )}

        {/* ── Stand ──────────────────────────────────────────────
            Drei Kennzahlen ueber denselben Baustein wie im Klausurenmodus,
            darunter die Wege zu den Zahlen dahinter. Vorher war das eine
            handgebaute Karte mit eigener Zeilenhoehe und einem indigofarbenen
            Zeichen, das sonst nirgends in der App vorkommt. */}
        <MetricRow>
          {stats.slice(0, 3).map((stat) => (
            <Metric
              key={stat.label}
              value={<span className="tabular-nums">{stat.value}{stat.unit && <span className="text-[13px] font-normal text-text-secondary ml-0.5">{stat.unit}</span>}</span>}
              label={stat.label}
            />
          ))}
        </MetricRow>

        <ListGroup>
          <ListRow
            leading={
              <span className="w-9 h-9 rounded-icon bg-[rgb(120,120,128)]/[0.12] dark:bg-[rgb(120,120,128)]/[0.24] flex items-center justify-center text-text-primary shrink-0">
                <Icon name="chart" size={17} />
              </span>
            }
            title={<span className="text-[15px] font-normal">Statistiken</span>}
            subtitle="Notenverlauf, Aktivität, Klausuren"
            chevron
            onClick={() => navigate('/insights')}
          />
          {/* Rang statt Muenze: eine Zahl und ein Ring, kein Bild. Der Rang
              sagt etwas ueber den Umfang, die Streak ueber die Regelmaessigkeit —
              zwei Dinge, deshalb zwei Anzeigen. */}
          <ListRow
            leading={<RangRing xp={appStats.coins ?? 0} />}
            title={<span className="text-[15px] font-normal">Rang</span>}
            subtitle={`Stufe ${rangFuer(appStats.coins ?? 0).stufe} · ${rangFuer(appStats.coins ?? 0).label}`}
            value={<span className="tabular-nums font-semibold text-text-primary">{appStats.coins ?? 0} XP</span>}
            chevron
            onClick={() => navigate('/profil/coins')}
          />
        </ListGroup>

        </div>

        {/* Rechte Spalte — die Wege zu den Einstellungen */}
        <div className="space-y-5 mt-5 lg:mt-0">

        {/* ── Anpassen ────────────────────────────────────────────
            Zweiter Weg in den Planen-Bereich. Kalender und Stundenplan sind
            die beiden Dinge, die man einmal einrichtet und danach selten
            anfasst — sie gehoeren deshalb auch hierher, nicht nur hinter den
            Planen-Knopf im Klausurenmodus. */}
        <div>
          <h2 className="section-label mb-2">Anpassen</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/kalender')}
              className="bg-surface rounded-card border border-border/60 shadow-card-adaptive p-4 flex items-center gap-3 text-left press-sm hover:bg-surface-hover transition-colors"
            >
              <span className="w-10 h-10 rounded-icon flex items-center justify-center shrink-0 text-white" style={{ background: 'var(--grad-mode)' }}>
                <Icon name="calendar" size={19} />
              </span>
              <span className="min-w-0">
                <span className="block text-[15px] font-semibold text-text-primary">Kalender</span>
                <span className="block text-[13px] text-text-secondary truncate">Termine</span>
              </span>
            </button>
            <button
              onClick={() => navigate('/stundenplan')}
              className="bg-surface rounded-card border border-border/60 shadow-card-adaptive p-4 flex items-center gap-3 text-left press-sm hover:bg-surface-hover transition-colors"
            >
              <span className="w-10 h-10 rounded-icon flex items-center justify-center shrink-0 text-white" style={{ background: 'var(--grad-mode)' }}>
                <Icon name="clock" size={19} />
              </span>
              <span className="min-w-0">
                <span className="block text-[15px] font-semibold text-text-primary">Stundenplan</span>
                <span className="block text-[13px] text-text-secondary truncate">Deine Woche</span>
              </span>
            </button>
          </div>
        </div>

        {/* ── Allgemein ──────────────────────────────────────────── */}
        <div>
          <h2 className="section-label mb-2">Allgemein</h2>
          <ListGroup>
            <ThemeRow theme={theme} onPick={setTheme} />
            {authUser && <NavRow label="Account" onClick={() => navigate('/profil/account')} />}
          </ListGroup>
        </div>

        {/* ── Einstellungen ──────────────────────────────────────── */}
        <div>
          <h2 className="section-label mb-2">Einstellungen</h2>
          <ListGroup>
            <NavRow label="Fach hinzufügen" onClick={() => navigate('/profil/faecher')} />
            <NavRow label="Benachrichtigungen" onClick={() => navigate('/profil/benachrichtigungen')} />
            <NavRow label="Bundesland & Lehrplan" onClick={() => navigate('/profil/bundesland')} />
          </ListGroup>
        </div>

        {/* ── Rechtliches ────────────────────────────────────────── */}
        <div>
          <h2 className="section-label mb-2">Rechtliches</h2>
          <ListGroup>
            <NavRow label="Impressum" onClick={() => navigate('/profil/impressum')} />
            <NavRow label="Datenschutzerklärung" onClick={() => navigate('/profil/datenschutz')} />
            <NavRow label="Nutzungsbedingungen (AGB)" onClick={() => navigate('/profil/agb')} />
          </ListGroup>
        </div>

        {/* ── Support ────────────────────────────────────────────── */}
        <div>
          <h2 className="section-label mb-2">Support</h2>
          <ListGroup>
            <NavRow label="Hilfe & Feedback" onClick={() => navigate('/profil/support')} />
          </ListGroup>
        </div>

        {/* ── Dev-Tools (nur allowlisted) ─────────────────────────── */}
        {isDevAllowlisted && (
          <div>
            <h2 className="section-label mb-2">Entwickler</h2>
            <ListGroup>
              <NavRow label="Dev-Tools" sublabel={isPro ? 'Pro aktiv' : undefined} onClick={() => navigate('/profil/dev-tools')} />
            </ListGroup>
          </div>
        )}

        {/* ── Beta: Pro-Banner + Freunde einladen, ganz unten ─────── */}
        {/* Simon (31.07.2026): während der Beta sollen diese zwei Karten nicht
            oben im Profil stehen, sondern ganz unten, Pro-Banner direkt über dem
            Einladen-Button. Reine Positionierung — die Normal-Zustand-Versionen
            oben ("Pro upgrade"/"Referral Widget"-Sektionen) übernehmen automatisch
            wieder ihren angestammten Platz, sobald appConfig.proPurchasesEnabled
            wieder true ist. */}
        {!isPro && !appConfig.proPurchasesEnabled && (
          <>
            <div className="rounded-card p-5 border border-border/60 bg-surface">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-1 rounded-pill text-[11px] font-bold" style={{ background: 'rgba(52,211,153,0.15)', color: '#34D399' }}>
                  Beta
                </span>
                <p className="text-text-primary font-bold text-[16px]">Pro startet nach der Beta</p>
              </div>
              <p className="text-text-secondary text-[13px] leading-relaxed mb-4">
                Wir pausieren Pro-Käufe während des Beta-Launches. Deine Notizen, Karteikarten & Fortschritte bleiben gespeichert.
              </p>
              <button
                onClick={() => setShowProComingSoon(true)}
                className="relative w-full h-12 rounded-pill text-[14px] font-semibold press transition-all overflow-hidden"
                style={{ background: '#FFFFFF', color: '#1B1B1F' }}
              >
                <span className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.22) 50%, transparent 65%)', backgroundSize: '200% 100%', animation: 'shimmer 2.2s infinite linear' }} />
                <span className="relative">Für Rabatt vormerken</span>
              </button>
            </div>

            {!trialActive && (
              <div className="bg-surface rounded-card shadow-card-adaptive border border-border/60 overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start gap-2.5 mb-4">
                    <div
                      className="w-10 h-10 rounded-btn flex items-center justify-center text-[20px] shrink-0"
                      style={{ background: 'var(--grad-mode)' }}
                    >
                      <Icon name="gift" size={19} />
                    </div>
                    <div>
                      <p className="text-text-primary font-bold text-[15px]">Freunde einladen</p>
                      <p className="text-text-muted text-[12px] mt-0.5">Teile deinen Link — dein Pro-Bonus wartet auf dich, sobald Pro startet</p>
                    </div>
                  </div>

                  {referralCode && (
                    <div className="flex items-center gap-3">
                      <div
                        className="shrink-0 rounded-btn overflow-hidden"
                        style={{ width: 64, height: 64, background: '#fff' }}
                      >
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(referralLink ?? '')}&size=128x128&margin=4`}
                          alt="QR Code"
                          width={64}
                          height={64}
                          className="w-full h-full"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="inv-sub text-[11px] mb-1.5">Dein Einladungslink</p>
                        <p className="inv-mono font-mono text-[12px] truncate mb-2">{referralLink}</p>
                        {copyToast ? (
                          <div className="w-full py-2 rounded-btn text-[13px] font-semibold text-center"
                            style={{ background: 'rgba(48,209,88,0.12)', color: '#30D158', border: '1px solid rgba(48,209,88,0.25)' }}>
                            Kopiert
                          </div>
                        ) : (
                          <button
                            onClick={handleCopyReferral}
                            className="btn-copy-shimmer w-full py-2 rounded-btn text-[13px] font-semibold press-sm"
                          >
                            Link kopieren
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Footer — quiet beta marker, not a badge/callout ─────── */}
        <p className="text-center text-[11px] text-text-muted/50 tracking-wide pt-1">
          DailyStudent <span className="text-text-muted/30">·</span> Beta
        </p>

        </div>
      </div>

      {/* Same shiny-mint keyframes as the Landing Page's Early Access button —
          duplicated locally rather than shared, matching the existing pattern
          (LandingScreen.tsx/DemoScreen.tsx/ProModal.tsx each keep their own copy). */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes ea-glow {
          0%, 100% { box-shadow: 0 2px 10px rgba(52,211,153,0.35), 0 0 0 0 rgba(52,211,153,0); }
          50% { box-shadow: 0 4px 20px rgba(52,211,153,0.6), 0 0 18px 2px rgba(52,211,153,0.2); }
        }
      `}</style>

      {/* Toast */}
      {paymentToast === 'success' && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-pill bg-success/10 border border-success/30 shadow-float animate-fade-in">
          <p className="text-text-primary text-[13px] font-semibold whitespace-nowrap">Zahlung erfolgreich! Pro wird aktiviert…</p>
        </div>
      )}
      {paymentToast === 'error' && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 max-w-[85%] px-4 py-2.5 rounded-card bg-destructive/10 border border-destructive/30 shadow-float animate-fade-in">
          <p className="text-destructive text-[13px] font-semibold text-center">
            {paymentErrorMessage ?? 'Fehler beim Checkout. Bitte erneut versuchen.'}
          </p>
        </div>
      )}

      <ProModal feature="allgemein" isOpen={showProComingSoon} onClose={() => setShowProComingSoon(false)} />
    </div>
  )
}
