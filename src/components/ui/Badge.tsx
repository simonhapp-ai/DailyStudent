import { type HTMLAttributes } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  color?: 'accent' | 'success' | 'warning' | 'danger' | 'muted'
}

export function Badge({ color = 'accent', className = '', children, ...props }: BadgeProps) {
  const colors = {
    accent:  'bg-accent/10 text-accent',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger:  'bg-danger/10 text-danger',
    muted:   'bg-surface-hover text-text-muted',
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
