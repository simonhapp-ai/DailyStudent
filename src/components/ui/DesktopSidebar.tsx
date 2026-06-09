import { useLocation, useNavigate } from 'react-router-dom'
import { useUser } from '../../context/UserContext'

const NAV_ITEMS = [
  {
    label: 'Übersicht',
    path: '/dashboard',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="8" height="8" rx="2" fill="currentColor" fillOpacity={active ? 0.15 : 0} />
        <rect x="13" y="3" width="8" height="8" rx="2" fill="currentColor" fillOpacity={active ? 0.15 : 0} />
        <rect x="3" y="13" width="8" height="8" rx="2" fill="currentColor" fillOpacity={active ? 0.15 : 0} />
        <rect x="13" y="13" width="8" height="8" rx="2" fill="currentColor" fillOpacity={active ? 0.15 : 0} />
      </svg>
    ),
  },
  {
    label: 'Unterricht',
    path: '/unterricht',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
          fill="currentColor" fillOpacity={active ? 0.12 : 0} />
        <path d="M14 2v6h6" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <line x1="10" y1="9" x2="8" y2="9" />
      </svg>
    ),
  },
  {
    label: 'Klausurmodus',
    path: '/klausurmodus',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 10l10-5 10 5-10 5z" fill="currentColor" fillOpacity={active ? 0.12 : 0} />
        <path d="M22 10v6M6 12v5c3 3 9 3 12 0v-5" />
      </svg>
    ),
  },
  {
    label: 'Kalender',
    path: '/kalender',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="3" fill="currentColor" fillOpacity={active ? 0.10 : 0} />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
]

export function DesktopSidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { profile, isPro } = useUser()

  function isActive(path: string) {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  const initial = (profile?.name?.[0] ?? 'S').toUpperCase()
  const isProfilActive = location.pathname.startsWith('/profil') || location.pathname.startsWith('/insights')

  return (
    <aside
      className="flex flex-col h-screen shrink-0 border-r border-border/40 lg:hidden"
      style={{
        width: '72px',
        backdropFilter: 'saturate(180%) blur(24px)',
        WebkitBackdropFilter: 'saturate(180%) blur(24px)',
        backgroundColor: 'rgba(var(--color-surface), 0.96)',
        // CSS custom property override for lg breakpoint
      }}
    >
      {/* Logo */}
      <div className="flex justify-center pt-7 pb-5 px-2">
        <img src="/logo.png" alt="DailyStudent" className="w-9 h-9 rounded-[12px] object-cover shrink-0" />
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-1 px-2">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.path)
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              title={item.label}
              className="w-full flex flex-col items-center gap-1 py-2.5 px-1 rounded-[12px] press-sm transition-colors"
              style={{
                color: active ? 'rgb(var(--color-accent))' : 'rgb(var(--color-text-muted))',
                background: active
                  ? 'linear-gradient(145deg, rgba(196,181,253,0.35), rgba(109,40,217,0.15))'
                  : undefined,
                boxShadow: active ? '0 0 16px rgba(124,58,237,0.18)' : undefined,
              }}
            >
              {item.icon(active)}
              <span className="text-[9px] font-semibold tracking-tight leading-none" style={{ fontWeight: active ? 700 : 500 }}>
                {item.label === 'Klausurmodus' ? 'Klausur' : item.label}
              </span>
            </button>
          )
        })}
      </nav>

      {/* Divider */}
      <div className="mx-3 border-t border-border/30 mb-3" />

      {/* Profil */}
      <div className="px-2 pb-6">
        <button
          onClick={() => navigate('/profil')}
          title="Profil"
          className="w-full flex flex-col items-center gap-1 py-2.5 px-1 rounded-[12px] press-sm transition-colors"
          style={{
            color: isProfilActive ? 'rgb(var(--color-accent))' : 'rgb(var(--color-text-muted))',
            background: isProfilActive
              ? 'linear-gradient(145deg, rgba(196,181,253,0.35), rgba(109,40,217,0.15))'
              : undefined,
          }}
        >
          {/* Avatar circle */}
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
            style={{ background: profile?.avatarBg ?? 'linear-gradient(145deg, #A78BFA, #7C3AED)' }}
          >
            {profile?.avatarEmoji ?? initial}
          </div>
          <span className="text-[9px] font-semibold leading-none" style={{ fontWeight: isProfilActive ? 700 : 500 }}>
            Profil
          </span>
        </button>

        {/* Pro badge */}
        {isPro && (
          <div className="mt-1.5 mx-1 px-1.5 py-0.5 rounded-full text-center"
               style={{ background: 'linear-gradient(135deg, rgba(255,208,96,0.2), rgba(192,119,0,0.15))' }}>
            <span className="text-[8px] font-bold tracking-wide" style={{ color: '#C07700' }}>PRO</span>
          </div>
        )}
      </div>
    </aside>
  )
}

// Wide variant shown at lg: breakpoint (1024px+) — inject via CSS
// We use a style tag approach since Tailwind can't do pseudo-breakpoints on custom properties easily
export function DesktopSidebarWide() {
  const location = useLocation()
  const navigate = useNavigate()
  const { profile, isPro } = useUser()

  function isActive(path: string) {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  const initial = (profile?.name?.[0] ?? 'S').toUpperCase()
  const isProfilActive = location.pathname.startsWith('/profil') || location.pathname.startsWith('/insights')

  return (
    <aside
      className="hidden lg:flex flex-col h-screen shrink-0 border-r border-border/40"
      style={{
        width: '220px',
        backdropFilter: 'saturate(180%) blur(24px)',
        WebkitBackdropFilter: 'saturate(180%) blur(24px)',
        backgroundColor: 'rgba(var(--color-surface), 0.96)',
      }}
    >
      {/* Logo + wordmark */}
      <div className="flex items-center gap-3 px-5 pt-7 pb-5">
        <img src="/logo.png" alt="DailyStudent" className="w-9 h-9 rounded-[12px] object-cover shrink-0" />
        <div>
          <p className="text-[14px] font-bold text-text-primary leading-tight">DailyStudent</p>
          <p className="text-[10px] text-text-muted leading-tight">Lernökosystem</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-0.5 px-3">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.path)
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-[12px] press-sm transition-colors text-left"
              style={{
                color: active ? 'rgb(var(--color-accent))' : 'rgb(var(--color-text-secondary))',
                background: active
                  ? 'linear-gradient(145deg, rgba(196,181,253,0.35), rgba(109,40,217,0.15))'
                  : undefined,
                boxShadow: active ? '0 0 16px rgba(124,58,237,0.15)' : undefined,
              }}
            >
              <span className="shrink-0">{item.icon(active)}</span>
              <span className="text-[14px] leading-none" style={{ fontWeight: active ? 700 : 500 }}>
                {item.label}
              </span>
            </button>
          )
        })}
      </nav>

      {/* Divider */}
      <div className="mx-4 border-t border-border/30 mb-3" />

      {/* Profil */}
      <div className="px-3 pb-6">
        <button
          onClick={() => navigate('/profil')}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-[12px] press-sm transition-colors"
          style={{
            color: isProfilActive ? 'rgb(var(--color-accent))' : 'rgb(var(--color-text-secondary))',
            background: isProfilActive
              ? 'linear-gradient(145deg, rgba(196,181,253,0.35), rgba(109,40,217,0.15))'
              : undefined,
          }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[14px] font-bold shrink-0"
            style={{ background: profile?.avatarBg ?? 'linear-gradient(145deg, #A78BFA, #7C3AED)' }}
          >
            {profile?.avatarEmoji ?? initial}
          </div>
          <div className="flex-1 overflow-hidden text-left">
            <p className="text-[13px] font-semibold text-text-primary leading-tight truncate">
              {profile?.name ?? 'Profil'}
            </p>
            <p className="text-[10px] text-text-muted mt-0.5">
              {isPro ? '✦ Pro · aktiv' : 'Free'}
            </p>
          </div>
        </button>
      </div>
    </aside>
  )
}
