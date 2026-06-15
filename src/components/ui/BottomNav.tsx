import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

const navItems = [
  {
    label: 'Unterricht',
    path: '/unterricht',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={active ? 2.2 : 1.7} strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
          fill="currentColor" fillOpacity={active ? 0.18 : 0} />
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
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={active ? 2.2 : 1.7} strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 10l10-5 10 5-10 5z"
          fill="currentColor" fillOpacity={active ? 0.18 : 0} />
        <path d="M22 10v6" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
      </svg>
    ),
  },
  {
    label: 'Kalender',
    path: '/kalender',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={active ? 2.2 : 1.7} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="3" ry="3"
          fill="currentColor" fillOpacity={active ? 0.18 : 0} />
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
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={active ? 2.2 : 1.7} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="7" r="4"
          fill="currentColor" fillOpacity={active ? 0.18 : 0} />
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
      className="fixed left-4 right-4 z-50"
      style={{
        bottom: 'max(4px, calc(env(safe-area-inset-bottom, 0px) - 12px))',
      }}
    >
      <div
        className="flex items-center rounded-full px-2 py-[5px]"
        style={{
          backdropFilter: 'saturate(180%) blur(36px)',
          WebkitBackdropFilter: 'saturate(180%) blur(36px)',
          backgroundColor: 'var(--nav-pill-bg)',
          border: '1px solid var(--nav-pill-border)',
          boxShadow: '0 6px 40px rgba(0,0,0,0.22), 0 1px 8px rgba(0,0,0,0.10)',
        }}
      >
        {navItems.map((item) => {
          const active = isActive(item.path)
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex-1 relative flex flex-col items-center justify-center gap-[3px] rounded-full py-[9px] px-2"
            >
              {/* Sliding active bubble */}
              {active && (
                <motion.div
                  layoutId="nav-bubble"
                  className="absolute inset-0 rounded-full"
                  style={{ backgroundColor: 'rgb(var(--color-accent) / 0.13)' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30, mass: 0.8 }}
                />
              )}

              {/* Icon */}
              <span
                className="relative z-10 flex shrink-0"
                style={{
                  color: active
                    ? 'rgb(var(--color-accent))'
                    : 'rgb(var(--color-text-primary) / 0.5)',
                  transition: 'color 180ms ease',
                }}
              >
                {item.icon(active)}
              </span>

              {/* Label — centered below icon */}
              <span
                className="relative z-10 whitespace-nowrap"
                style={{
                  color: active
                    ? 'rgb(var(--color-accent))'
                    : 'rgb(var(--color-text-primary) / 0.5)',
                  fontSize: '10px',
                  fontWeight: active ? 600 : 400,
                  lineHeight: 1,
                  letterSpacing: '-0.01em',
                  transition: 'color 180ms ease',
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
