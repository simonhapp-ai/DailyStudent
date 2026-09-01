import { type ReactNode } from 'react'

type BannerTone = 'info' | 'warning' | 'danger'

// Banner (Version C) — für Zustände, die anhalten.
// Läuft im Inhalt mit, verdeckt nichts, nennt immer den nächsten Schritt und
// verschwindet mit dem Zustand. Farbe trägt nur die 4-px-Kante links, die Fläche
// bleibt neutral — so bleibt der Text in beiden Erscheinungen lesbar.
const edge: Record<BannerTone, string> = {
  info:    'border-l-accent',
  warning: 'border-l-fill-orange',
  danger:  'border-l-fill-red',
}

export function Banner({
  tone = 'info', children, action, className = '',
}: { tone?: BannerTone; children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={`bg-surface rounded-card border-l-4 ${edge[tone]} px-3.5 py-3 flex items-start gap-3 ${className}`}>
      <span className="flex-1 text-[13px] leading-snug text-text-primary">{children}</span>
      {action && <span className="shrink-0">{action}</span>}
    </div>
  )
}
