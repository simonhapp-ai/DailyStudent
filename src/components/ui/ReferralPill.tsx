import { useLocation, useNavigate } from 'react-router-dom'
import { useUser } from '../../context/UserContext'

export function ReferralPill() {
  const navigate = useNavigate()
  const location = useLocation()
  const { referralCount, trialEndsAt } = useUser()

  const segments = location.pathname.split('/').filter(Boolean)
  if (
    location.pathname.startsWith('/profil') ||
    location.pathname === '/landing' ||
    location.pathname.startsWith('/auth') ||
    (segments[0] === 'unterricht' && segments.length > 1)
  ) return null

  // Mission complete — hide pill once trial is active
  if (trialEndsAt && new Date(trialEndsAt) > new Date()) return null
  if (referralCount >= 5) return null

  return (
    <button
      onClick={() => navigate('/profil')}
      aria-label={`Freunde einladen: ${referralCount} von 5`}
      className="flex items-center gap-1.5 select-none press-sm"
      style={{
        padding: '5px 10px 5px 8px',
        borderRadius: '20px',
        background: 'rgba(10,10,10,0.88)',
        border: '1px solid rgba(255,255,255,0.10)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
      }}
    >
      <span className="text-[14px] leading-none" aria-hidden>🎁</span>
      <span
        className="font-bold tabular-nums leading-none"
        style={{ color: '#FFFFFF', fontSize: '13px' }}
      >
        {referralCount}/5
      </span>
    </button>
  )
}
