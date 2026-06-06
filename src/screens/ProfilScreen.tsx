import { useUser, type AppTheme } from '../context/UserContext'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'

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
  const { profile, theme, setTheme, isPro, setIsPro, appStats, userNotes, signOut, authUser } = useUser()
  const [proToast, setProToast] = useState(false)

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
        <div className="bg-surface rounded-card shadow-card-adaptive border border-border/60 p-5 flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-[28px] shrink-0"
            style={{ background: 'linear-gradient(145deg, rgba(196,181,253,0.5) 0%, rgba(109,40,217,0.18) 100%)' }}
          >
            🎓
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-text-primary font-bold text-[18px] truncate">{profile?.name ?? 'Max Müller'}</p>
            <p className="text-text-muted text-[13px] mt-0.5 truncate">{subtitle}</p>
          </div>
          <Badge color={isPro ? 'success' : 'muted'}>{isPro ? 'Pro' : 'Free'}</Badge>
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
            <button className="w-full py-3.5 rounded-card grad-accent text-white text-[15px] font-semibold hover:opacity-90 press transition-all">
              Pro freischalten · €59,99/Jahr
            </button>
            <p className="text-center text-[12px] text-text-muted mt-2.5">Abi-Schnitt unserer Pro-Nutzer: Ø 1.7</p>
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
          <div className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0"
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
              <button
                onClick={() => void signOut()}
                className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-surface-hover transition-colors press-sm"
              >
                <span className="text-danger text-[15px]">Abmelden</span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-danger">
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
            {['Bundesland & Lehrplan', 'Benachrichtigungen', 'Datenschutz', 'Account'].map((item, i, arr) => (
              <button
                key={item}
                className={`w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-surface-hover transition-colors press-sm ${
                  i < arr.length - 1 ? 'border-b border-border/50' : ''
                }`}
              >
                <span className="text-text-primary text-[15px]">{item}</span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted">
                  <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ))}
            <button
              onClick={() => {
                localStorage.removeItem('lernapp_v1')
                window.location.reload()
              }}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-surface-hover transition-colors press-sm border-t border-border/50"
            >
              <span className="text-danger text-[15px]">Onboarding zurücksetzen</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-danger">
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>

      </div>

      {/* Toast */}
      {proToast && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-pill bg-surface border border-border shadow-float animate-fade-in">
          <p className="text-text-primary text-[13px] font-semibold whitespace-nowrap">
            {isPro ? '⭐ Pro aktiviert' : '🔒 Pro deaktiviert'}
          </p>
        </div>
      )}
    </div>
  )
}
