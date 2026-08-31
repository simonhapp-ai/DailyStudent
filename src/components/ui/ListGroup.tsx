import { type ReactNode } from 'react'

// Zusammenhängende Liste (Version C) — ersetzt Stapel einzelner Karten.
// Eine Fläche, Haarlinien dazwischen, Radius 20. Ruhiger als einzelne Karten und
// spart pro Zeile Platz.
export function ListGroup({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-surface rounded-card overflow-hidden ${className}`}>
      {children}
    </div>
  )
}

interface ListRowProps {
  /** Fachzeichen, Symbolfeld oder Kästchen — steht links. */
  leading?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  /** Wert rechts vor dem Chevron, z.B. eine Anzahl oder eine Marke. */
  value?: ReactNode
  /** Chevron zeigen. Bei navigierenden Zeilen immer, sonst nie. */
  chevron?: boolean
  onClick?: () => void
  className?: string
}

// Navigationszeile — Höhe mindestens 52, Innenabstand 16, Trennlinie 0,5 px.
// Jede navigierende Zeile trägt ein Chevron; Zeilen ohne Ziel bekommen keins.
export function ListRow({
  leading, title, subtitle, value, chevron, onClick, className = '',
}: ListRowProps) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      className={`w-full text-left flex items-center gap-3 px-4 py-3 min-h-[52px] border-b border-border/40 last:border-b-0 ${
        onClick ? 'press-sm hover:bg-surface-hover transition-colors' : ''
      } ${className}`}
    >
      {leading}
      <span className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span className="text-[16px] font-semibold tracking-[-0.015em] text-text-primary truncate">{title}</span>
        {subtitle && <span className="text-[13px] text-text-secondary truncate">{subtitle}</span>}
      </span>
      {value && <span className="shrink-0 text-[13px] text-text-secondary">{value}</span>}
      {chevron && (
        <svg className="shrink-0 text-text-muted" width="8" height="14" viewBox="0 0 8 14" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M1 1l6 6-6 6" />
        </svg>
      )}
    </Tag>
  )
}
