import { useLocation, useNavigate } from 'react-router-dom'

const navItems = [
  {
    label: 'Unterricht',
    path: '/unterricht',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={active ? 2.1 : 1.7} strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
          fill="currentColor" fillOpacity={active ? 0.2 : 0} />
        <path d="M14 2v6h6" />
        <line x1="8" y1="13" x2="16" y2="13" />
        <line x1="8" y1="17" x2="16" y2="17" />
        <line x1="8" y1="9" x2="10" y2="9" />
      </svg>
    ),
  },
  {
    label: 'Klausur',
    path: '/klausurmodus',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={active ? 2.1 : 1.7} strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 10l10-5 10 5-10 5z"
          fill="currentColor" fillOpacity={active ? 0.2 : 0} />
        <path d="M22 10v6" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
      </svg>
    ),
  },
  {
    label: 'Kalender',
    path: '/kalender',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={active ? 2.1 : 1.7} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="3" ry="3"
          fill="currentColor" fillOpacity={active ? 0.2 : 0} />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    label: 'Profil',
    path: '/profil',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={active ? 2.1 : 1.7} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="7" r="4"
          fill="currentColor" fillOpacity={active ? 0.2 : 0} />
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"
          fill="currentColor" fillOpacity={active ? 0.15 : 0} />
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
        backdropFilter: 'saturate(200%) blur(28px)',
        WebkitBackdropFilter: 'saturate(200%) blur(28px)',
        backgroundColor: 'rgba(var(--color-surface), 0.9)',
        borderTop: '0.5px solid rgba(var(--color-border), 0.3)',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.07)',
      }}
    >
      <div
        className="flex items-center justify-around max-w-lg mx-auto px-2"
        style={{
          paddingTop: '8px',
          paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
        }}
      >
        {navItems.map((item) => {
          const active = isActive(item.path)
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center gap-[3px] press-sm"
              style={{ flex: 1, minWidth: 0 }}
            >
              {/* Pill capsule indicator behind icon */}
              <div
                className="flex items-center justify-center rounded-full"
                style={{
                  paddingLeft: active ? '18px' : '12px',
                  paddingRight: active ? '18px' : '12px',
                  paddingTop: '5px',
                  paddingBottom: '5px',
                  backgroundColor: active ? 'rgba(var(--color-accent), 0.13)' : 'transparent',
                  color: active ? 'rgb(var(--color-accent))' : 'rgb(var(--color-text-muted))',
                  transition: 'background-color 180ms cubic-bezier(0.23,1,0.32,1), padding 180ms cubic-bezier(0.23,1,0.32,1), color 140ms ease',
                }}
              >
                {item.icon(active)}
              </div>
              <span
                className="text-[10.5px] leading-none"
                style={{
                  color: active ? 'rgb(var(--color-accent))' : 'rgb(var(--color-text-muted))',
                  fontWeight: active ? 600 : 400,
                  letterSpacing: '-0.01em',
                  transition: 'color 140ms ease',
                }}
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
