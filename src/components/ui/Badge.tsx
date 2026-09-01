import { type HTMLAttributes } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  color?: 'accent' | 'success' | 'warning' | 'danger' | 'muted'
}

export function Badge({ color = 'accent', className = '', children, ...props }: BadgeProps) {
  // Gefüllte Fläche, Schrift in der zugehörigen Gegenfarbe (Regel 3):
  // matte Tönung PLUS gleichfarbige Schrift ergibt eine Marke, die weder
  // richtig leuchtet noch richtig lesbar ist.
  const colors = {
    accent:  'btn-mode',
    success: 'bg-[rgb(120,120,128)]/[0.12] dark:bg-[rgb(120,120,128)]/[0.24] text-[rgb(var(--fill-green))]',
    warning: 'bg-[rgb(120,120,128)]/[0.12] dark:bg-[rgb(120,120,128)]/[0.24] text-[rgb(var(--fill-orange))]',
    danger:  'bg-[rgb(120,120,128)]/[0.12] dark:bg-[rgb(120,120,128)]/[0.24] text-[rgb(var(--fill-red))]',
    muted:   'bg-surface-hover text-text-primary',
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-[11px] font-semibold tracking-wide ${colors[color]} ${className}`}
      {...props}
    >
      {children}
    </span>
  )
}
