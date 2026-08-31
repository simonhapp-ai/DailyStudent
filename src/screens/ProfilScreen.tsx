import { useUser } from '../context/UserContext'
import { Icon, type IconName } from '../components/ui/Icon'
import { CoinIcon, getCoinTier, COIN_TIERS } from '../components/ui/CoinIcon'
import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { createCheckoutSession, fetchIsProFromSupabase } from '../lib/stripe'
import { purchasePlan } from '../lib/revenuecat'
import { ProModal, WELCOME_COUPON_ID } from '../components/ui/ProModal'
import { getActiveStreak } from '../lib/streak'

const AVATAR_BG_OPTIONS = [
  { id: 'purple', gradient: '#A78BFA' },
  { id: 'blue',   gradient: '#60A5FA' },
  { id: 'teal',   gradient: '#5AC8FA' },
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

const THEME_LABELS = { light: 'Hell', dark: 'Dunkel', system: 'System' } as const

function NavRow({ label, sublabel, onClick, danger = false }: {
  label: string; sublabel?: string; onClick: () => void; danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-surface-hover transition-colors press-sm"
    >
      <span className={`text-[15px] ${danger ? 'text-text-primary' : 'text-text-primary'}`}>{label}</span>
      <div className="flex items-center gap-1.5 shrink-0">
        {sublabel && <span className="text-text-muted text-[13px]">{sublabel}</span>}
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={danger ? 'text-text-primary' : 'text-text-muted'}>
          <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </button>
  )
}

export function ProfilScreen() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { profile, theme, isPro, setIsPro, appStats, userNotes, authUser, updateProfile, referralCode, referralCount, trialEndsAt, appConfig } = useUser()
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
    ? `${profile.schulform} · ${profile.klasse}. Klasse · ${profile.bundesland}`
    : 'Gymnasium · 12. Klasse'

  const isDevAllowlisted = PRO_TOGGLE_ALLOWLIST.includes(authUser?.email ?? '')

  return (
    <div className="flex flex-col min-h-dvh bg-background pb-28">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="px-4" style={{ paddingTop: 'max(58px, calc(env(safe-area-inset-top, 0px) + 18px))' }}>
        <h1 className="text-[28px] font-bold text-text-primary">Profil</h1>
      </div>

      <div className="px-4 mt-5 space-y-5">

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
                   style={{ background: '#A78BFA' }}>
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
                    className="w-10 h-10 rounded-[12px] flex items-center justify-center text-[22px] press-sm transition-all"
                    style={{
                      background: avatarEmoji === emoji
                        ? 'rgba(var(--color-accent), 0.15)'
                        : 'rgba(var(--color-border), 0.4)',
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
        {!isPro && appConfig.proPurchasesEnabled && (
          <div
            className="rounded-card p-5 border border-accent/20"
            style={{ background: 'linear-gradient(140deg, rgba(0,122,255,0.08) 0%, rgba(0,122,255,0.02) 100%)' }}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-text-primary font-bold text-[17px]">Pro freischalten</p>
                <p className="text-text-secondary text-[13px] mt-0.5">Alle KI-Features. Kein Limit.</p>
              </div>
              <div className="text-right">
                <p className="text-text-primary font-bold text-[20px]">€7,99<span className="text-text-muted text-[13px] font-normal">/Mo</span></p>
                <p className="text-text-muted text-[11px]">jährlich</p>
              </div>
            </div>
            <ul className="space-y-2.5 mb-5">
              {[
                'KI-Zusammenfassungen aus Foto-Scans',
                'Unbegrenzte Karteikarten (FSRS)',
                'KI-Rotstift-Korrektur',
                'Persönlicher Lernplan',
              ].map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-[14px] text-text-secondary">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-text-primary shrink-0">
                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            {/* Platform-aware teaser — the authoritative check (RevenueCat
                trial eligibility on iOS) happens once ProModal opens; this is
                just marketing copy pointing at whichever offer applies. */}
            <p className="text-[12px] font-semibold mb-3" style={{ color: '#34D399' }}>
              {Capacitor.isNativePlatform() ? '1 Woche kostenlos beim Monatsabo' : '20% Rabatt auf deinen ersten Kauf'}
            </p>
            <button
              onClick={() => handleUpgrade('yearly')}
              disabled={checkoutLoading !== null}
              className="w-full py-3.5 rounded-card bg-accent text-white dark:text-[#160E28] text-[15px] font-semibold hover:opacity-90 press transition-all disabled:opacity-60"
            >
              {checkoutLoading === 'yearly' ? 'Wird geladen…' : 'Pro freischalten · €59,99/Jahr'}
            </button>
            <button
              onClick={() => handleUpgrade('monthly')}
              disabled={checkoutLoading !== null}
              className="w-full py-2 text-[13px] text-text-muted hover:text-text-secondary transition-colors disabled:opacity-60"
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
          <div className="bg-surface rounded-card shadow-card-adaptive border border-border/60 overflow-hidden">
            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-10 h-10 rounded-[12px] flex items-center justify-center text-[20px] shrink-0"
                    style={{ background: '#FFD700' }}
                  >
                    <Icon name="gift" size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-text-primary font-bold text-[15px]">14 Tage Pro gratis</p>
                      <span className="badge-pro-gold px-2.5 py-0.5">Nur kurze Zeit</span>
                    </div>
                    <p className="text-text-muted text-[12px] mt-0.5">Lade 5 Freunde ein — erhalte 14 Tage Pro</p>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-text-muted text-[12px]">Fortschritt</span>
                  <span className="text-text-primary font-bold text-[13px] tabular-nums">{referralCount}/5</span>
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
                      className="text-[10px] font-medium"
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
                    className="shrink-0 rounded-[10px] overflow-hidden"
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
                    <p className="text-text-muted text-[11px] mb-1.5">Dein Einladungslink</p>
                    <p className="text-text-primary font-mono text-[12px] truncate mb-2">{referralLink}</p>
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

        {/* Trial active success card */}
        {trialActive && trialEndsAt && (
          <div
            className="rounded-card border p-5 flex items-center gap-4"
            style={{ borderColor: 'rgba(48,209,88,0.25)', background: 'linear-gradient(140deg, rgba(48,209,88,0.07) 0%, rgba(48,209,88,0.02) 100%)' }}
          >
            <div
              className="w-11 h-11 rounded-[12px] flex items-center justify-center text-[22px] shrink-0"
              style={{ background: '#34D399' }}
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

        {/* ── Stats — compact single row + insights link ──────────── */}
        <div className="bg-surface rounded-card shadow-card-adaptive border border-border/60 overflow-hidden">
          <div className="flex items-stretch divide-x divide-border/40">
            {stats.map((stat) => (
              <div key={stat.label} className="flex-1 flex flex-col items-center justify-center py-4 px-2 gap-0.5">
                <span className="text-text-secondary"><Icon name={stat.icon} size={16} /></span>
                <p className="text-text-primary font-bold text-[19px] leading-none tabular-nums mt-1.5">
                  {stat.value}
                  {stat.unit && <span className="text-[11px] font-normal text-text-muted ml-0.5">{stat.unit}</span>}
                </p>
                <p className="text-text-muted text-[10px] font-medium uppercase tracking-wide mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
          <button
            onClick={() => navigate('/insights')}
            className="w-full border-t border-border/40 flex items-center justify-between px-4 py-2.5 press-sm"
          >
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-[6px] flex items-center justify-center shrink-0"
                style={{ background: '#6366F1' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
                </svg>
              </div>
              <span className="text-text-secondary text-[13px] font-medium">Statistiken & Insights</span>
            </div>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted">
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* ── Coins preview row ──────────────────────────────────── */}
        <button
          onClick={() => navigate('/profil/coins')}
          className="w-full bg-surface rounded-card shadow-card-adaptive border border-border/60 overflow-hidden flex items-center gap-3 px-4 py-3.5 press-sm text-left"
        >
          <CoinIcon coins={appStats.coins ?? 0} size={34} tilt={false} noAnimation/>
          <div className="flex-1 min-w-0">
            <p className="text-text-primary font-bold text-[15px] leading-none">Coins</p>
            <p className="text-text-muted text-[12px] mt-0.5">
              <span className="font-semibold tabular-nums" style={{ color: '#F59E0B' }}>{appStats.coins ?? 0}</span>
              {' '}· {COIN_TIERS[getCoinTier(appStats.coins ?? 0)].label}
            </p>
          </div>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted shrink-0">
            <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* ── Allgemein ──────────────────────────────────────────── */}
        <div>
          <h2 className="section-label mb-2">Allgemein</h2>
          <div className="bg-surface rounded-card shadow-card-adaptive border border-border/60 overflow-hidden divide-y divide-border/50">
            <NavRow label="Erscheinungsbild" sublabel={THEME_LABELS[theme]} onClick={() => navigate('/profil/erscheinungsbild')} />
            {authUser && <NavRow label="Account" onClick={() => navigate('/profil/account')} />}
          </div>
        </div>

        {/* ── Einstellungen ──────────────────────────────────────── */}
        <div>
          <h2 className="section-label mb-2">Einstellungen</h2>
          <div className="bg-surface rounded-card shadow-card-adaptive border border-border/60 overflow-hidden divide-y divide-border/50">
            <NavRow label="Fach hinzufügen" onClick={() => navigate('/profil/faecher')} />
            <NavRow label="Benachrichtigungen" onClick={() => navigate('/profil/benachrichtigungen')} />
            <NavRow label="Bundesland & Lehrplan" onClick={() => navigate('/profil/bundesland')} />
          </div>
        </div>

        {/* ── Rechtliches ────────────────────────────────────────── */}
        <div>
          <h2 className="section-label mb-2">Rechtliches</h2>
          <div className="bg-surface rounded-card shadow-card-adaptive border border-border/60 overflow-hidden divide-y divide-border/50">
            <NavRow label="Impressum" onClick={() => navigate('/profil/impressum')} />
            <NavRow label="Datenschutzerklärung" onClick={() => navigate('/profil/datenschutz')} />
            <NavRow label="Nutzungsbedingungen (AGB)" onClick={() => navigate('/profil/agb')} />
          </div>
        </div>

        {/* ── Support ────────────────────────────────────────────── */}
        <div>
          <h2 className="section-label mb-2">Support</h2>
          <div className="bg-surface rounded-card shadow-card-adaptive border border-border/60 overflow-hidden">
            <NavRow label="Hilfe & Feedback" onClick={() => navigate('/profil/support')} />
          </div>
        </div>

        {/* ── Dev-Tools (nur allowlisted) ─────────────────────────── */}
        {isDevAllowlisted && (
          <div>
            <h2 className="section-label mb-2">Entwickler</h2>
            <div className="bg-surface rounded-card shadow-card-adaptive border border-border/60 overflow-hidden">
              <NavRow label="Dev-Tools" sublabel={isPro ? 'Pro aktiv' : undefined} onClick={() => navigate('/profil/dev-tools')} />
            </div>
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
                className="relative w-full py-3 rounded-card text-white text-[14px] font-semibold press transition-all overflow-hidden"
                style={{ background: '#34D399', animation: 'ea-glow 2.4s ease-in-out infinite' }}
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
                      className="w-10 h-10 rounded-[12px] flex items-center justify-center text-[20px] shrink-0"
                      style={{ background: '#34D399' }}
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
                        className="shrink-0 rounded-[10px] overflow-hidden"
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
                        <p className="text-text-muted text-[11px] mb-1.5">Dein Einladungslink</p>
                        <p className="text-text-primary font-mono text-[12px] truncate mb-2">{referralLink}</p>
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
