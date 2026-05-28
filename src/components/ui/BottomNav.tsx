import { useLocation, useNavigate } from 'react-router-dom'

const navItems = [
  {
    label: 'Unterricht',
    path: '/unterricht',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.7}>
        <path
          d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
          fill="currentColor" fillOpacity={active ? 0.12 : 0}
          strokeLinecap="round" strokeLinejoin="round"
        />
        <path d="M14 2v6h6" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="16" y1="13" x2="8" y2="13" strokeLinecap="round" />
        <line x1="16" y1="17" x2="8" y2="17" strokeLinecap="round" />
        <line x1="10" y1="9" x2="8" y2="9" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: 'Klausur',
    path: '/klausurmodus',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.7}>
        <path
          d="M2 10l10-5 10 5-10 5z"
          fill="currentColor" fillOpacity={active ? 0.12 : 0}
          strokeLinecap="round" strokeLinejoin="round"
        />
        <path d="M22 10v6M6 12v5c3 3 9 3 12 0v-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: 'Kalender',
    path: '/kalender',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.7}>
        <rect
          x="3" y="4" width="18" height="18" rx="3" ry="3"
          fill="currentColor" fillOpacity={active ? 0.10 : 0}
          strokeLinecap="round" strokeLinejoin="round"
        />
        <line x1="16" y1="2" x2="16" y2="6" strokeLinecap="round" />
        <line x1="8" y1="2" x2="8" y2="6" strokeLinecap="round" />
        <line x1="3" y1="10" x2="21" y2="10" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: 'Profil',
    path: '/profil',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.7}>
        <path
          d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"
          fill="currentColor" fillOpacity={active ? 0.10 : 0}
          strokeLinecap="round" strokeLinejoin="round"
        />
        <circle cx="12" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
]

export function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = (path: string) => location.pathname.startsWith(path)

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        backdropFilter: 'saturate(180%) blur(28px)',
        WebkitBackdropFilter: 'saturate(180%) blur(28px)',
        backgroundColor: 'rgba(var(--color-surface), 0.82)',
        borderTop: '0.5px solid rgba(var(--color-border), 0.4)',
      }}
    >
      <div
        className="flex items-center justify-around px-2 max-w-lg mx-auto"
        style={{ paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom, 0px))', paddingTop: '6px' }}
      >
        {navItems.map((item) => {
          const active = isActive(item.path)
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center gap-[3px] min-w-[68px] py-1 press-sm"
              style={{ color: active ? 'rgb(var(--color-accent))' : 'rgb(var(--color-text-muted))' }}
            >
              {/* Icon with glow pill */}
              <div
                className="relative px-3 py-1.5 rounded-[12px] transition-all duration-300"
                style={active ? {
                  backgroundColor: 'rgba(var(--color-accent), 0.10)',
                  boxShadow: '0 0 18px rgba(124,58,237,0.22), 0 0 6px rgba(124,58,237,0.12)',
                } : undefined}
              >
                {item.icon(active)}
              </div>
              <span
                className="text-[10px] leading-none tracking-tight"
                style={{ fontWeight: active ? 600 : 400 }}
              >
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
