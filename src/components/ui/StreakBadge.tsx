import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useUser } from '../../context/UserContext'
import { getActiveStreak } from '../../lib/streak'
import { StreakInfoSheet } from './StreakInfoSheet'
import { Icon } from './Icon'

// inline=true: no fixed positioning — use inside a FixedBadges container
export function StreakBadge({ inline = false }: { inline?: boolean }) {
  const location = useLocation()
  const { appStats } = useUser()
  const [infoOpen, setInfoOpen] = useState(false)

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
    background: 'rgb(var(--color-surface) / 0.92)',
    border: '1px solid rgb(var(--color-border) / 0.7)',
    backdropFilter: 'blur(var(--material-blur-thin))',
    WebkitBackdropFilter: 'blur(var(--material-blur-thin))',
    ...(!inline && {
      position: 'fixed',
      top: 'max(14px, calc(env(safe-area-inset-top, 0px) + 10px))',
      right: '16px',
      zIndex: 40,
      transition: 'right 0.18s ease',
    }),
  }

  return (
    <>
      <button
        onClick={() => setInfoOpen(true)}
        aria-label={`Streak: ${streak} Tage — Erklärung anzeigen`}
        className={`${inline ? '' : 'fixed z-40 '}flex items-center gap-1.5 select-none press-sm`}
        style={pillStyle}
      >
        <Icon name="flame" size={15} filled />
        <span
          className="font-bold tabular-nums leading-none"
          style={{ color: 'rgb(var(--color-text-primary))', fontSize: '13px' }}
        >
          {streak}
        </span>
      </button>
      <StreakInfoSheet isOpen={infoOpen} onClose={() => setInfoOpen(false)} />
    </>
  )
}
