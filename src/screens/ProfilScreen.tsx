import { useUser, type AppTheme } from '../context/UserContext'
import { Badge } from '../components/ui/Badge'

const STATS_ICONS = ['🔥', '📸', '📝', '⭐']

const THEME_OPTIONS: { value: AppTheme; label: string }[] = [
  { value: 'light', label: 'Hell' },
  { value: 'dark', label: 'Dunkel' },
  { value: 'system', label: 'System' },
]

export function ProfilScreen() {
  const { profile, theme, setTheme } = useUser()

  const stats = [
    { label: 'Streak',    value: '12',  unit: 'Tage', icon: STATS_ICONS[0] },
    { label: 'Scans',     value: '0',   unit: '',     icon: STATS_ICONS[1] },
    { label: 'Klausuren', value: '0',   unit: '',     icon: STATS_ICONS[2] },
    { label: 'Ø Note',    value: '—',   unit: '',     icon: STATS_ICONS[3] },
  ]

  const subtitle = profile
    ? `${profile.schulform} · ${profile.klasse}. Klasse · ${profile.bundesland}`
    : 'Gymnasium · 12. Klasse'

  return (
    <div className="flex flex-col min-h-screen bg-background pb-28">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="px-5" style={{ paddingTop: 'max(58px, calc(env(safe-area-inset-top, 0px) + 18px))' }}>
        <h1 className="text-[28px] font-bold text-text-primary">Profil</h1>
      </div>

      <div className="px-5 mt-5 space-y-5">

        {/* ── User card ──────────────────────────────────────────── */}
        <div className="bg-surface rounded-card shadow-card-adaptive border border-border/60 p-5 flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-[28px] shrink-0"
            style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(124,58,237,0.06) 100%)' }}
          >
            🎓
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-text-primary font-bold text-[18px] truncate">{profile?.name ?? 'Max Müller'}</p>
            <p className="text-text-muted text-[13px] mt-0.5 truncate">{subtitle}</p>
          </div>
          <Badge color="muted">Free</Badge>
        </div>

        {/* ── Pro upgrade ────────────────────────────────────────── */}
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
              <p className="text-text-primary font-bold text-[20px]">€5<span className="text-text-muted text-[13px] font-normal">/Mo</span></p>
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
          <button className="w-full py-3.5 rounded-card bg-accent text-white text-[15px] font-semibold hover:opacity-90 press transition-all">
            Pro freischalten · €59,99/Jahr
          </button>
          <p className="text-center text-[12px] text-text-muted mt-2.5">Abi-Schnitt unserer Pro-Nutzer: Ø 1.7</p>
        </div>

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

        {/* ── Einstellungen ──────────────────────────────────────── */}
        <div>
          <h2 className="section-label mb-2">Einstellungen</h2>
          <div className="bg-surface rounded-card shadow-card-adaptive border border-border/60 overflow-hidden">
            {['Fach hinzufügen', 'Bundesland & Lehrplan', 'Benachrichtigungen', 'Datenschutz', 'Account'].map((item, i, arr) => (
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
    </div>
  )
}
