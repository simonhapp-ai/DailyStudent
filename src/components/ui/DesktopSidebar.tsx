import { useLocation, useNavigate } from 'react-router-dom'
import { useUser } from '../../context/UserContext'
import { CoinIcon } from './CoinIcon'

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
        <div className="w-9 h-9 rounded-[12px] overflow-hidden shrink-0">
          <img src="/logo.png" alt="DailyStudent" className="w-full h-full object-cover" style={{ transform: 'scale(1.38)', transformOrigin: 'center' }} />
        </div>
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
              className={`w-full flex flex-col items-center gap-1 py-2.5 px-1 rounded-[12px] press-sm nav-btn ${active ? 'nav-active' : ''}`}
              style={{
                color: active ? 'rgb(var(--color-text-primary))' : 'rgb(var(--color-text-muted))',
                fontWeight: active ? 700 : 500,
              }}
            >
              {item.icon(active)}
              <span className="text-[9px] tracking-tight leading-none">
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
          className={`w-full flex flex-col items-center gap-1 py-2.5 px-1 rounded-[12px] press-sm nav-btn ${isProfilActive ? 'nav-active' : ''}`}
          style={{
            color: isProfilActive ? 'rgb(var(--color-text-primary))' : 'rgb(var(--color-text-muted))',
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

        {isPro && (
          <div className="mt-1 flex justify-center">
            <span className="badge-pro-gold px-2 py-0.5">✦ Pro</span>
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
  const { profile, isPro, appStats } = useUser()

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
        <div className="w-9 h-9 rounded-[12px] overflow-hidden shrink-0">
          <img src="/logo.png" alt="DailyStudent" className="w-full h-full object-cover" style={{ transform: 'scale(1.38)', transformOrigin: 'center' }} />
        </div>
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
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-[12px] press-sm nav-btn text-left ${active ? 'nav-active' : ''}`}
              style={{
                color: active ? 'rgb(var(--color-text-primary))' : 'rgb(var(--color-text-secondary))',
                fontWeight: active ? 700 : 500,
              }}
            >
              <span className="shrink-0">{item.icon(active)}</span>
              <span className="text-[14px] leading-none">{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Divider */}
      <div className="mx-4 border-t border-border/30 mb-3" />

      {/* Coins Counter */}
      <div className="px-3 mb-2">
        <button
          onClick={() => navigate('/profil')}
          className="w-full flex items-center justify-between px-3 py-2 rounded-[12px] press-sm transition-opacity hover:opacity-80"
          style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.22)' }}
        >
          <div className="flex items-center gap-2">
            <CoinIcon coins={appStats.coins ?? 0} size={22} tilt={false}/>
            <span className="text-[13px] font-semibold" style={{ color: '#F59E0B' }}>Coins</span>
          </div>
          <span className="text-[15px] font-bold tabular-nums" style={{ color: '#F59E0B' }}>
            {appStats.coins ?? 0}
          </span>
        </button>
      </div>

      {/* Profil */}
      <div className="px-3 pb-6">
        <button
          onClick={() => navigate('/profil')}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-[12px] press-sm nav-btn ${isProfilActive ? 'nav-active' : ''}`}
          style={{
            color: isProfilActive ? 'rgb(var(--color-text-primary))' : 'rgb(var(--color-text-secondary))',
          }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[14px] font-bold shrink-0"
            style={{ background: profile?.avatarBg ?? 'linear-gradient(145deg, #A78BFA, #7C3AED)' }}
          >
            {profile?.avatarEmoji ?? initial}
          </div>
          <div className="flex-1 overflow-hidden text-left">
            <div className="flex items-center gap-1.5">
              <p className="text-[13px] font-semibold text-text-primary leading-tight truncate">
                {profile?.name ?? 'Profil'}
              </p>
              {isPro && <span className="badge-pro-gold px-1.5 py-0.5 shrink-0">✦ Pro</span>}
            </div>
          </div>
        </button>
      </div>
    </aside>
  )
}
