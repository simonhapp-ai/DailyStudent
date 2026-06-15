import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

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
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        backdropFilter: 'saturate(200%) blur(28px)',
        WebkitBackdropFilter: 'saturate(200%) blur(28px)',
        backgroundColor: 'rgba(var(--color-surface), 0.92)',
        borderTop: '0.5px solid rgba(var(--color-border), 0.3)',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.07)',
      }}
    >
      <div
        className="flex items-center max-w-lg mx-auto px-2"
        style={{
          paddingTop: '8px',
          paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))',
        }}
      >
        {navItems.map((item) => {
          const active = isActive(item.path)
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex-1 flex justify-center items-center"
              style={{ minHeight: 44 }}
            >
              {/* Pill container — auto-sizes to content */}
              <div className="relative inline-flex items-center gap-[5px] px-3 py-[6px]">
                {/* Sliding bubble via layoutId — Emil Kowalski technique */}
                {active && (
                  <motion.div
                    layoutId="nav-bubble"
                    className="absolute inset-0 rounded-full"
                    style={{ backgroundColor: 'rgba(var(--color-accent), 0.13)' }}
                    transition={{
                      type: 'spring',
                      stiffness: 400,
                      damping: 30,
                      mass: 0.8,
                    }}
                  />
                )}

                {/* Icon — always visible, color transitions */}
                <span
                  className="relative z-10 flex shrink-0"
                  style={{
                    color: active
                      ? 'rgb(var(--color-accent))'
                      : 'rgb(var(--color-text-muted))',
                    transition: 'color 180ms ease',
                  }}
                >
                  {item.icon(active)}
                </span>

                {/* Label — slides in beside icon when active */}
                <AnimatePresence>
                  {active && (
                    <motion.span
                      key={`label-${item.path}`}
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{
                        opacity: { duration: 0.18, ease: 'easeOut' },
                        width: { duration: 0.22, ease: [0.23, 1, 0.32, 1] },
                      }}
                      className="relative z-10 overflow-hidden whitespace-nowrap"
                      style={{
                        color: 'rgb(var(--color-accent))',
                        fontSize: '11px',
                        fontWeight: 600,
                        lineHeight: 1,
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
