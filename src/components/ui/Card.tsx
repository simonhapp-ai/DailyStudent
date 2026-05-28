import { type HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean
  elevated?: boolean
}

export function Card({ hoverable, elevated, className = '', children, ...props }: CardProps) {
  return (
    <div
      className={`bg-surface rounded-card p-4 shadow-card-adaptive border border-border/60 ${
        hoverable ? 'hover:bg-surface-hover cursor-pointer transition-all duration-150 press-sm' : ''
      } ${elevated ? 'shadow-card-md' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
