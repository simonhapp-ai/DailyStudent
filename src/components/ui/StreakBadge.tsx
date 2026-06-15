import { useNavigate, useLocation } from 'react-router-dom'
import { useUser } from '../../context/UserContext'
import { getActiveStreak } from '../../lib/streak'

export function StreakBadge() {
  const navigate = useNavigate()
  const location = useLocation()
  const { appStats } = useUser()

  // Hide where streak is already prominently displayed or irrelevant
  if (
    location.pathname.startsWith('/profil') ||
    location.pathname === '/landing' ||
    location.pathname.startsWith('/auth')
  ) return null

  const streak = getActiveStreak(appStats.streak ?? 0, appStats.lastStudyDate ?? null)

  // SmartNotes detail screens have action buttons at top-right — shift badge left to avoid overlap
  const segments = location.pathname.split('/').filter(Boolean)
  const isSmartNotes =
    segments[0] === 'unterricht' && segments.length >= 3 && !segments.includes('neue-notiz')

  return (
    <button
      onClick={() => navigate('/profil')}
      aria-label={`Streak: ${streak} Tage`}
      className="fixed z-40 flex items-center gap-1.5 select-none press-sm"
      style={{
        top: 'max(14px, calc(env(safe-area-inset-top, 0px) + 10px))',
        right: isSmartNotes ? '136px' : '16px',
        padding: '5px 10px 5px 8px',
        borderRadius: '20px',
        background: 'rgba(10,10,10,0.88)',
        border: '1px solid rgba(255,255,255,0.10)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        transition: 'right 0.18s ease',
      }}
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
