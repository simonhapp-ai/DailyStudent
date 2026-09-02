import { type ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
}

export function Button({ variant = 'primary', size = 'md', fullWidth, className = '', children, ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-btn transition-all duration-150 disabled:opacity-40 press'

  const variants = {
    primary:   'btn-mode hover:opacity-90',
    secondary: 'bg-surface border border-border text-text-primary hover:bg-surface-hover',
    ghost:     'text-text-secondary hover:text-text-primary hover:bg-surface-hover',
    danger:    'bg-[rgb(120,120,128)]/[0.12] dark:bg-[rgb(120,120,128)]/[0.24] text-[rgb(var(--fill-red))] hover:opacity-90',
  }

  const sizes = {
    sm: 'px-3.5 py-2 text-[13px]',
    md: 'px-5 py-3 text-[15px]',
    lg: 'px-6 py-3.5 text-[15px]',
  }

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
