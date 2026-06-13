import { useUser, type AppTheme } from '../context/UserContext'
import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { createCheckoutSession, fetchIsProFromSupabase } from '../lib/stripe'
import { supabase } from '../lib/supabase'
import { BugReportWidget } from '../components/ui/BugReportWidget'

const AVATAR_BG_OPTIONS = [
  { id: 'purple', gradient: 'linear-gradient(145deg, #A78BFA, #7C3AED)' },
  { id: 'blue',   gradient: 'linear-gradient(145deg, #60A5FA, #2563EB)' },
  { id: 'teal',   gradient: 'linear-gradient(145deg, #5AC8FA, #0891B2)' },
  { id: 'green',  gradient: 'linear-gradient(145deg, #34D399, #059669)' },
  { id: 'orange', gradient: 'linear-gradient(145deg, #FBBF24, #D97706)' },
  { id: 'pink',   gradient: 'linear-gradient(145deg, #F472B6, #DB2777)' },
  { id: 'red',    gradient: 'linear-gradient(145deg, #F87171, #DC2626)' },
  { id: 'indigo', gradient: 'linear-gradient(145deg, #818CF8, #4338CA)' },
  { id: 'cyan',   gradient: 'linear-gradient(145deg, #67E8F9, #0E7490)' },
  { id: 'rose',   gradient: 'linear-gradient(145deg, #FDA4AF, #E11D48)' },
]

const AVATAR_EMOJI_OPTIONS = ['🎓', '📚', '✏️', '🔬', '🧮', '📐', '🧪', '🔭', '💡', '📝']

// Emails die den Pro-Toggle in den Dev-Tools sehen
const PRO_TOGGLE_ALLOWLIST = [
  'simon.happ@gmx.de',
  // 'weitere@email.de',
]

const THEME_OPTIONS: { value: AppTheme; label: string }[] = [
  { value: 'light', label: 'Hell' },
  { value: 'dark', label: 'Dunkel' },
  { value: 'system', label: 'System' },
]

function getCurrentStreak(streak: number, lastStudyDate: string | null): number {
  if (!lastStudyDate) return 0
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return lastStudyDate === today || lastStudyDate === yesterday.toISOString().slice(0, 10) ? streak : 0
}

export function ProfilScreen() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { profile, theme, setTheme, isPro, setIsPro, appStats, userNotes, signOut, authUser, updateProfile } = useUser()
  const [proToast, setProToast] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState<'monthly' | 'yearly' | null>(null)
  const [paymentToast, setPaymentToast] = useState<'success' | 'error' | null>(null)
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteInput, setDeleteInput] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const avatarBg = profile?.avatarBg ?? 'linear-gradient(145deg, #A78BFA, #7C3AED)'
  const avatarEmoji = profile?.avatarEmoji ?? '🎓'

  const handleDeleteAccount = async () => {
    if (deleteInput.toLowerCase() !== 'löschen') return
    setDeleting(true)
    setDeleteError(null)
    try {
      const { error } = await supabase.functions.invoke('delete-account')
      if (error) throw new Error(error.message)
    } catch {
      setDeleteError('Serverfehler. Lokale Daten werden trotzdem entfernt.')
    }
    localStorage.removeItem('lernapp_v1')
    await signOut()
    window.location.href = '/'
  }

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
    try {
      setCheckoutLoading(plan)
      const url = await createCheckoutSession(plan)
      window.location.href = url
    } catch {
      setCheckoutLoading(null)
      setPaymentToast('error')
      setTimeout(() => setPaymentToast(null), 4000)
    }
  }

  const handleProToggle = () => {
    const next = !isPro
    setIsPro(next)
    setProToast(true)
    setTimeout(() => setProToast(false), 2000)
  }

  const activeStreak = getCurrentStreak(appStats.streak, appStats.lastStudyDate)

  const stats = [
    { label: 'Streak',    value: activeStreak.toString(),              unit: 'Tage', icon: '🔥' },
    { label: 'Notizen',   value: userNotes.length.toString(),          unit: '',     icon: '📝' },
    { label: 'Klausuren', value: appStats.examCount.toString(),        unit: '',     icon: '📋' },
    { label: 'Ø Note',    value: profile?.abiGesamtnote ?? '—',        unit: '',     icon: '⭐' },
  ]

  const subtitle = profile
    ? `${profile.schulform} · ${profile.klasse}. Klasse · ${profile.bundesland}`
    : 'Gymnasium · 12. Klasse'

  return (
    <div className="flex flex-col min-h-screen bg-background pb-28">

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
                   style={{ background: 'linear-gradient(145deg, #A78BFA, #7C3AED)' }}>
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
        {!isPro && (
          <div
            className="rounded-card p-5 border border-accent/20"
            style={{ background: 'linear-gradient(140deg, rgba(0,122,255,0.08) 0%, rgba(0,122,255,0.02) 100%)' }}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-accent font-bold text-[17px]">Pro freischalten</p>
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
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-success shrink-0">
                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleUpgrade('yearly')}
              disabled={checkoutLoading !== null}
              className="w-full py-3.5 rounded-card grad-accent text-white text-[15px] font-semibold hover:opacity-90 press transition-all disabled:opacity-60"
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

        {/* ── Stats ──────────────────────────────────────────────── */}
        <div>
          <h2 className="section-label mb-3">Statistiken</h2>
          <div className="grid grid-cols-2 gap-3">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-surface rounded-card shadow-card-adaptive border border-border/60 p-4 text-center">
                <p className="text-[24px] mb-2">{stat.icon}</p>
                <p className="text-text-primary font-bold text-[22px] leading-none">
                  {stat.value}
                  {stat.unit && <span className="text-[13px] font-normal text-text-muted ml-1">{stat.unit}</span>}
                </p>
                <p className="text-text-muted text-[12px] mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Statistiken & Insights Button ──────────────────────── */}
        <button
          onClick={() => navigate('/insights')}
          className="w-full bg-surface rounded-card shadow-card-adaptive border border-border/60 px-4 py-4 flex items-center gap-3 press"
        >
          <div className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0 glow-indigo"
            style={{ background: 'linear-gradient(145deg, #6366F1, #4C1D95)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          </div>
          <div className="flex-1 text-left">
            <p className="text-text-primary font-semibold text-[15px]">Statistiken & Insights</p>
            <p className="text-text-muted text-[12px] mt-0.5">Notenverlauf, Fächer & Lerntipps</p>
          </div>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted">
            <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* ── Erscheinungsbild ───────────────────────────────────── */}
        <div>
          <h2 className="section-label mb-2">Erscheinungsbild</h2>
          <div className="bg-surface rounded-card shadow-card-adaptive border border-border/60 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5">
              <span className="text-text-primary text-[15px]">Darstellung</span>
              <div className="flex items-center gap-0.5 bg-background rounded-[10px] p-0.5">
                {THEME_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setTheme(opt.value)}
                    className={`px-3 py-1.5 rounded-btn text-[12px] font-medium transition-all duration-150 press-sm ${
                      theme === opt.value
                        ? 'bg-surface text-text-primary shadow-sm'
                        : 'text-text-muted hover:text-text-secondary'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Dev: Pro Toggle (nur im Dev-Modus sichtbar) ─────────── */}
        {PRO_TOGGLE_ALLOWLIST.includes(authUser?.email ?? '') && (
          <div>
            <h2 className="section-label mb-2">Dev-Tools</h2>
            <div className="bg-surface rounded-card shadow-card-adaptive border border-border/60 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-btn flex items-center justify-center shrink-0 text-[16px]">
                    {isPro ? '⭐' : '🔒'}
                  </div>
                  <div>
                    <p className="text-text-primary text-[15px] font-medium">Pro-Status</p>
                    <p className="text-text-muted text-[12px] mt-0.5">{isPro ? 'Aktiv — alle Features entsperrt' : 'Inaktiv — Paywall sichtbar'}</p>
                  </div>
                </div>
                <button
                  onClick={handleProToggle}
                  className={`relative w-12 h-6 rounded-full transition-all duration-200 press-sm shrink-0 ${isPro ? 'grad-accent' : 'bg-border'}`}
                >
                  <span
                    className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200"
                    style={{ left: isPro ? '26px' : '2px' }}
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Account ────────────────────────────────────────────── */}
        {authUser && (
          <div>
            <h2 className="section-label mb-2">Account</h2>
            <div className="bg-surface rounded-card shadow-card-adaptive border border-border/60 overflow-hidden">
              <div className="px-4 py-3.5 flex items-center justify-between border-b border-border/50">
                <span className="text-text-muted text-[13px]">E-Mail</span>
                <span className="text-text-primary text-[13px] font-medium truncate max-w-[200px]">{authUser.email}</span>
              </div>
              <div className="px-4 py-3.5 flex items-center justify-between border-b border-border/50">
                <span className="text-text-muted text-[13px]">Anmeldemethode</span>
                <span className="text-text-primary text-[13px] font-medium">
                  {authUser.app_metadata?.provider === 'google' ? 'Google' : 'E-Mail'}
                </span>
              </div>
              {authUser.app_metadata?.provider !== 'google' && (
                <button
                  onClick={() => navigate('/profil/2fa')}
                  className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-surface-hover transition-colors press-sm border-b border-border/50"
                >
                  <span className="text-text-primary text-[15px]">Zwei-Faktor-Authentifizierung</span>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted">
                    <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
              <button
                onClick={() => void signOut()}
                className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-surface-hover transition-colors press-sm border-b border-border/50"
              >
                <span className="text-danger text-[15px]">Abmelden</span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-danger">
                  <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                onClick={() => { setDeleteInput(''); setDeleteError(null); setDeleteOpen(true) }}
                className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-surface-hover transition-colors press-sm"
              >
                <span className="text-[15px]" style={{ color: 'rgb(var(--color-danger))', opacity: 0.75 }}>Account löschen</span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'rgb(var(--color-danger))', opacity: 0.75 }}>
                  <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* ── Einstellungen ──────────────────────────────────────── */}
        <div>
          <h2 className="section-label mb-2">Einstellungen</h2>
          <div className="bg-surface rounded-card shadow-card-adaptive border border-border/60 overflow-hidden">
            <button
              onClick={() => navigate('/profil/faecher')}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-surface-hover transition-colors press-sm border-b border-border/50"
            >
              <span className="text-text-primary text-[15px]">Fach hinzufügen</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted">
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              onClick={() => navigate('/profil/benachrichtigungen')}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-surface-hover transition-colors press-sm border-b border-border/50"
            >
              <span className="text-text-primary text-[15px]">Benachrichtigungen</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted">
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('lernapp_v1')
                window.location.href = '/'
              }}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-surface-hover transition-colors press-sm border-b border-border/50"
            >
              <span className="text-danger text-[15px]">Onboarding zurücksetzen</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-danger">
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              onClick={() => navigate('/profil/bundesland')}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-surface-hover transition-colors press-sm"
            >
              <span className="text-text-primary text-[15px]">Bundesland & Lehrplan</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted">
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Rechtliches ────────────────────────────────────────── */}
        <div>
          <h2 className="section-label mb-2">Rechtliches</h2>
          <div className="bg-surface rounded-card shadow-card-adaptive border border-border/60 overflow-hidden">
            <button
              onClick={() => navigate('/profil/impressum')}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-surface-hover transition-colors press-sm border-b border-border/50"
            >
              <span className="text-text-primary text-[15px]">Impressum</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted">
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              onClick={() => navigate('/profil/datenschutz')}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-surface-hover transition-colors press-sm border-b border-border/50"
            >
              <span className="text-text-primary text-[15px]">Datenschutzerklärung</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted">
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              onClick={() => navigate('/profil/agb')}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-surface-hover transition-colors press-sm"
            >
              <span className="text-text-primary text-[15px]">Nutzungsbedingungen (AGB)</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted">
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Feedback ───────────────────────────────────────────── */}
        <div>
          <h2 className="section-label mb-2">Feedback</h2>
          <div className="space-y-2">
            <div className="bg-surface rounded-card shadow-card-adaptive border border-border/60 overflow-hidden">
              <button
                onClick={() => navigate('/landing')}
                className="w-full flex items-center justify-between px-4 py-3.5 text-left press-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-btn flex items-center justify-center shrink-0"
                    style={{ background: 'linear-gradient(135deg, #5AC8FA, #0891B2)' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
                    </svg>
                  </div>
                  <span className="text-text-primary text-[15px]">App Übersicht</span>
                </div>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted">
                  <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
            <BugReportWidget />
          </div>
        </div>

      </div>

      {/* ── Account löschen Modal ──────────────────────────── */}
      {deleteOpen && (
        <>
          <div className="fixed inset-0 z-[50] bg-black/50" onClick={() => { if (!deleting) { setDeleteOpen(false) } }} />
          <div
            className="fixed inset-x-4 z-[51] bg-surface rounded-2xl shadow-float overflow-hidden"
            style={{ top: '12%' }}
          >
            <div className="px-5 pt-6 pb-5">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(var(--color-danger), 0.1)' }}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-danger))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>

              <h2 className="text-[18px] font-bold text-text-primary text-center mb-2">Account unwiderruflich löschen?</h2>
              <p className="text-text-secondary text-[13px] text-center leading-relaxed mb-4">
                Alle Notizen, Karteikarten, Lernpläne, Statistiken und Zugangsdaten werden dauerhaft gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
              </p>

              {deleteError && (
                <div className="rounded-[10px] px-3 py-2.5 mb-4 border" style={{ background: 'rgba(var(--color-danger),0.08)', borderColor: 'rgba(var(--color-danger),0.2)' }}>
                  <p className="text-[12px] leading-snug" style={{ color: 'rgb(var(--color-danger))' }}>{deleteError}</p>
                </div>
              )}

              <p className="text-text-muted text-[12px] mb-2">
                Tippe <span className="font-bold text-text-primary">löschen</span> um fortzufahren:
              </p>
              <input
                type="text"
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                placeholder="löschen"
                autoFocus
                className="w-full bg-background border rounded-[12px] px-4 py-3 text-[14px] text-text-primary placeholder-text-muted focus:outline-none mb-4"
                style={{ borderColor: deleteInput.toLowerCase() === 'löschen' ? 'rgba(var(--color-danger),0.6)' : 'rgba(var(--color-border),0.8)' }}
              />

              <div className="flex gap-2">
                <button
                  onClick={() => setDeleteOpen(false)}
                  disabled={deleting}
                  className="flex-1 py-3 rounded-[14px] bg-surface-hover text-text-secondary text-[14px] font-semibold press-sm disabled:opacity-50"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteInput.toLowerCase() !== 'löschen' || deleting}
                  className="flex-1 py-3 rounded-[14px] text-white text-[14px] font-bold press-sm disabled:opacity-40 transition-all"
                  style={{
                    background: deleteInput.toLowerCase() === 'löschen'
                      ? 'linear-gradient(135deg, rgb(var(--color-danger)), rgba(var(--color-danger),0.85))'
                      : 'rgba(var(--color-danger),0.25)',
                    boxShadow: deleteInput.toLowerCase() === 'löschen' ? '0 4px 16px rgba(var(--color-danger),0.35)' : 'none',
                  }}
                >
                  {deleting ? 'Wird gelöscht…' : 'Endgültig löschen'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Toast */}
      {proToast && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-pill bg-surface border border-border shadow-float animate-fade-in">
          <p className="text-text-primary text-[13px] font-semibold whitespace-nowrap">
            {isPro ? '⭐ Pro aktiviert' : '🔒 Pro deaktiviert'}
          </p>
        </div>
      )}
      {paymentToast === 'success' && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-pill bg-success/10 border border-success/30 shadow-float animate-fade-in">
          <p className="text-success text-[13px] font-semibold whitespace-nowrap">Zahlung erfolgreich! Pro wird aktiviert…</p>
        </div>
      )}
      {paymentToast === 'error' && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-pill bg-destructive/10 border border-destructive/30 shadow-float animate-fade-in">
          <p className="text-destructive text-[13px] font-semibold whitespace-nowrap">Fehler beim Checkout. Bitte erneut versuchen.</p>
        </div>
      )}
    </div>
  )
}
