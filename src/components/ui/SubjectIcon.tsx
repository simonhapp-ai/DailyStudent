import type { ReactNode } from 'react'

type Level = 'a' | 'b' | 'c'
type Size = 'sm' | 'md' | 'lg'

interface SubjectIconProps {
  subjectId: string
  size?: Size
  className?: string
  customColorIndex?: number
}

// 10 gradients cycling green → orange → yellow → dark pink
const CUSTOM_GRADIENTS = [
  { from: '#3DD68C', to: '#10A05A' }, // 1  mint green
  { from: '#FF9F0A', to: '#C96700' }, // 2  orange
  { from: '#FFD60A', to: '#C8A300' }, // 3  yellow
  { from: '#FF2D88', to: '#B50060' }, // 4  deep pink
  { from: '#34C759', to: '#1A7E31' }, // 5  forest green
  { from: '#FF6B35', to: '#C03500' }, // 6  burnt orange
  { from: '#F5BC00', to: '#A07A00' }, // 7  amber
  { from: '#FF375F', to: '#8C0025' }, // 8  raspberry
  { from: '#00C7BE', to: '#007A76' }, // 9  teal
  { from: '#FFAB40', to: '#D46400' }, // 10 golden orange
]

const customPlusIcon = (
  <>
    <circle cx="12" cy="12" r="7.5" />
    <path d="M12 8.5v7M8.5 12h7" />
  </>
)

const gradientLevel: Record<string, Level> = {
  deutsch: 'a', physik: 'a', chemie: 'a', kunst: 'a', musik: 'a', sport: 'a',
  mathematik: 'b', biologie: 'b', geographie: 'b', latein: 'b', politik: 'b', religion: 'b',
  englisch: 'c', geschichte: 'c', informatik: 'c', wirtschaft: 'c', franzoesisch: 'c', spanisch: 'c',
}

const customGradients: Record<string, { from: string; to: string }> = {
  seminarfach: { from: '#E879F9', to: '#A21CAF' },
}

const sizeConfig: Record<Size, { cls: string; px: number }> = {
  sm: { cls: 'w-8 h-8', px: 14 },
  md: { cls: 'w-10 h-10', px: 18 },
  lg: { cls: 'w-14 h-14', px: 24 },
}

const icons: Record<string, ReactNode> = {
  deutsch: (
    <>
      <path d="M11 4H4a2 2 0 00-2 2v14c0 1.1.9 2 2 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </>
  ),
  mathematik: (
    <path d="M18 4H6l6 8-6 8h12" />
  ),
  englisch: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a14.5 14.5 0 000 18M12 3a14.5 14.5 0 010 18" />
      <line x1="3.5" y1="9" x2="20.5" y2="9" />
      <line x1="3.5" y1="15" x2="20.5" y2="15" />
    </>
  ),
  geschichte: (
    <>
      <path d="M5 22h14M5 2h14" />
      <path d="M17 22v-4.172a2 2 0 00-.586-1.414L12 12 7.586 16.414A2 2 0 007 17.828V22" />
      <path d="M7 2v4.172a2 2 0 00.586 1.414L12 12l4.414-4.414A2 2 0 0017 6.172V2" />
    </>
  ),
  biologie: (
    <>
      <path d="M8 3c0 4 4 5 4 9s-4 5-4 9" />
      <path d="M16 3c0 4-4 5-4 9s4 5 4 9" />
      <line x1="8.5" y1="8" x2="15.5" y2="8" />
      <line x1="8.5" y1="16" x2="15.5" y2="16" />
    </>
  ),
  physik: (
    <>
      <circle cx="12" cy="12" r="2" />
      <ellipse cx="12" cy="12" rx="10" ry="4" />
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-60 12 12)" />
    </>
  ),
  chemie: (
    <>
      <path d="M9 3h6" />
      <path d="M10 3v5l-4 9a2 2 0 001.8 2.8h8.4A2 2 0 0018 17l-4-9V3" />
      <line x1="7.5" y1="13" x2="16.5" y2="13" />
    </>
  ),
  informatik: (
    <>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </>
  ),
  geographie: (
    <>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </>
  ),
  wirtschaft: (
    <>
      <rect x="3" y="10" width="4" height="11" rx="0.5" fill="white" stroke="none" />
      <rect x="10" y="6" width="4" height="15" rx="0.5" fill="white" stroke="none" />
      <rect x="17" y="2" width="4" height="19" rx="0.5" fill="white" stroke="none" />
      <line x1="1" y1="22" x2="23" y2="22" />
    </>
  ),
  latein: (
    <>
      <rect x="4" y="3" width="16" height="2" rx="1" fill="white" stroke="none" />
      <rect x="4" y="19" width="16" height="2" rx="1" fill="white" stroke="none" />
      <rect x="6.5" y="5" width="2.5" height="14" fill="white" stroke="none" />
      <rect x="10.75" y="5" width="2.5" height="14" fill="white" stroke="none" />
      <rect x="15" y="5" width="2.5" height="14" fill="white" stroke="none" />
    </>
  ),
  franzoesisch: (
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  ),
  spanisch: (
    <>
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="2" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="4.93" x2="7.05" y2="7.05" />
      <line x1="16.95" y1="16.95" x2="19.07" y2="19.07" />
      <line x1="19.07" y1="4.93" x2="16.95" y2="7.05" />
      <line x1="7.05" y1="16.95" x2="4.93" y2="19.07" />
    </>
  ),
  politik: (
    <>
      <line x1="12" y1="3" x2="12" y2="20" />
      <path d="M5 21h14" />
      <path d="M3 9h6l-3 6z" />
      <path d="M15 9h6l-3 6z" />
      <line x1="6" y1="9" x2="12" y2="3" />
      <line x1="18" y1="9" x2="12" y2="3" />
    </>
  ),
  kunst: (
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  ),
  musik: (
    <>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </>
  ),
  sport: (
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  ),
  religion: (
    <>
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="1" x2="12" y2="4" />
      <line x1="12" y1="20" x2="12" y2="23" />
      <line x1="1" y1="12" x2="4" y2="12" />
      <line x1="20" y1="12" x2="23" y2="12" />
      <line x1="3.87" y1="3.87" x2="6.04" y2="6.04" />
      <line x1="17.96" y1="17.96" x2="20.13" y2="20.13" />
      <line x1="20.13" y1="3.87" x2="17.96" y2="6.04" />
      <line x1="6.04" y1="17.96" x2="3.87" y2="20.13" />
    </>
  ),
  seminarfach: (
    <>
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <line x1="9" y1="12" x2="15" y2="12" />
      <line x1="9" y1="16" x2="13" y2="16" />
    </>
  ),
}

const fallbackIcon = (
  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
)

export function SubjectIcon({ subjectId, size = 'md', className = '', customColorIndex }: SubjectIconProps) {
  const { cls, px } = sizeConfig[size]

  if (subjectId.startsWith('custom_')) {
    const idx = ((customColorIndex ?? 0) % CUSTOM_GRADIENTS.length + CUSTOM_GRADIENTS.length) % CUSTOM_GRADIENTS.length
    const { from, to } = CUSTOM_GRADIENTS[idx]
    return (
      <div
        className={`${cls} rounded-full flex items-center justify-center shrink-0 ${className}`}
        style={{ background: `radial-gradient(circle at 35% 35%, ${from}, ${to})` }}
      >
        <svg
          width={px}
          height={px}
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {customPlusIcon}
        </svg>
      </div>
    )
  }

  const lvl = gradientLevel[subjectId] ?? 'a'
  const custom = customGradients[subjectId]
  const from = custom ? custom.from : `rgb(var(--si-${lvl}-from))`
  const to   = custom ? custom.to   : `rgb(var(--si-${lvl}-to))`

  return (
    <div
      className={`${cls} rounded-full flex items-center justify-center shrink-0 ${className}`}
      style={{ background: `radial-gradient(circle at 35% 35%, ${from}, ${to})` }}
    >
      <svg
        width={px}
        height={px}
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {icons[subjectId] ?? fallbackIcon}
      </svg>
    </div>
  )
}
