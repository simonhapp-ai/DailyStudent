import { type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

interface HeaderProps {
  title: string
  subtitle?: string
  showBack?: boolean
  right?: ReactNode
}

export function Header({ title, subtitle, showBack, right }: HeaderProps) {
  const navigate = useNavigate()

  return (
    <div
      className="flex items-center justify-between px-4 pb-3"
      style={{
        paddingTop: 'max(52px, calc(env(safe-area-inset-top, 0px) + 12px))',
      }}
    >
      <div className="flex items-center gap-1 flex-1 min-w-0">
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-0.5 press-sm shrink-0 -ml-2 mr-1 px-2 py-1.5 rounded-btn"
            style={{ color: 'rgb(var(--color-accent))' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[15px] font-normal">Zurück</span>
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-[17px] font-semibold leading-snug truncate" style={{ color: 'rgb(var(--color-text-primary))' }}>
            {title}
          </h1>
          {subtitle && (
            <p className="text-[13px] mt-0.5 truncate" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {right && <div className="shrink-0 ml-3">{right}</div>}
    </div>
  )
}
