import { useNavigate, useLocation } from 'react-router-dom'
import { useUser } from '../../context/UserContext'
import { getActiveStreak } from '../../lib/streak'

// inline=true: no fixed positioning — use inside a FixedBadges container
export function StreakBadge({ inline = false }: { inline?: boolean }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { appStats } = useUser()

  const segments = location.pathname.split('/').filter(Boolean)
  // Hide on /profil, /landing, /auth, and everywhere under /unterricht except the home screen
  // itself (note creation + folder/lesson/smart-notes views all have their own top-right buttons)
  if (
    location.pathname.startsWith('/profil') ||
    location.pathname === '/landing' ||
    location.pathname.startsWith('/auth') ||
    (segments[0] === 'unterricht' && segments.length > 1)
  ) return null

  const streak = getActiveStreak(appStats.streak ?? 0, appStats.lastStudyDate ?? null)

  const pillStyle: React.CSSProperties = {
    padding: '5px 10px 5px 8px',
    borderRadius: '20px',
    background: 'rgba(10,10,10,0.88)',
    border: '1px solid rgba(255,255,255,0.10)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    ...(!inline && {
      position: 'fixed',
      top: 'max(14px, calc(env(safe-area-inset-top, 0px) + 10px))',
      right: '16px',
      zIndex: 40,
      transition: 'right 0.18s ease',
    }),
  }

  return (
    <button
      onClick={() => navigate('/profil')}
      aria-label={`Streak: ${streak} Tage`}
      className={`${inline ? '' : 'fixed z-40 '}flex items-center gap-1.5 select-none press-sm`}
      style={pillStyle}
    >
      <span className="text-[14px] leading-none" aria-hidden>🔥</span>
      <span
        className="font-bold tabular-nums leading-none"
        style={{ color: '#FFFFFF', fontSize: '13px' }}
      >
        {streak}
      </span>
    </button>
  )
}
