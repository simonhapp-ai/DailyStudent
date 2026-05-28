import { useLocation, useNavigate } from 'react-router-dom'

const navItems = [
  {
    label: 'Unterricht',
    path: '/unterricht',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" fill={active ? 'currentColor' : 'none'} strokeLinecap="round" strokeLinejoin="round" />
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
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: 'Kalender',
    path: '/kalender',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
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
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
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
    <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border z-50">
      <div className="flex items-center justify-around px-2 py-2 pb-safe max-w-lg mx-auto">
        {navItems.map((item) => {
          const active = isActive(item.path)
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-btn transition-all duration-150 ${
                active ? 'text-accent' : 'text-text-muted hover:text-text-secondary'
              }`}
              style={active ? { filter: 'drop-shadow(0 0 8px rgba(124,111,255,0.5))' } : undefined}
            >
              {item.icon(active)}
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
