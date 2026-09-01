import { type HTMLAttributes } from 'react'

export type TagTone =
  | 'neutral' | 'accent' | 'red' | 'orange' | 'green' | 'blue' | 'yellow' | 'gold'
  | 'grade-1' | 'grade-2' | 'grade-3' | 'grade-4' | 'grade-5'

interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: TagTone
  size?: 'sm' | 'md'
}

// Gefüllte Marke (Version C) — ersetzt das alte Muster „blasse Tönung + gleichfarbige
// Schrift", das auf getönten Flächen schlecht lesbar war.
//
// Füllregel: hell die kontraststarke Apple-Variante mit weißer Schrift, dunkel die
// Standard-Dunkelvariante mit schwarzer. Beide Richtungen liegen über 4,5:1 — außer
// Rot (3,89:1), das deshalb nie unter 13 px halbfett gesetzt wird und immer ein
// zweites Signal trägt (Wort, Position oder Symbol).
const tones: Record<TagTone, string> = {
  neutral:   'bg-[rgb(120,120,128)]/[0.12] dark:bg-[rgb(120,120,128)]/[0.24] text-text-primary',
  accent:    'bg-accent text-on-accent',
  red:       'bg-fill-red text-fill-red-on',
  orange:    'bg-fill-orange text-fill-orange-on',
  green:     'bg-fill-green text-fill-green-on',
  blue:      'bg-fill-blue text-fill-blue-on',
  yellow:    'bg-fill-yellow text-fill-yellow-on',
  gold:      'badge-pro-gold',
  'grade-1': 'bg-grade-1 text-grade-1-on',
  'grade-2': 'bg-grade-2 text-grade-2-on',
  'grade-3': 'bg-grade-3 text-grade-3-on',
  'grade-4': 'bg-grade-4 text-grade-4-on',
  'grade-5': 'bg-grade-5 text-grade-5-on',
}

const sizes = {
  sm: 'text-[11px] px-2.5 py-0.5',
  md: 'text-[13px] px-3 py-1',
}

export function Tag({ tone = 'neutral', size = 'md', className = '', children, ...props }: TagProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-pill font-semibold ${tones[tone]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </span>
  )
}

