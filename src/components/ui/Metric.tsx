import { type ReactNode } from 'react'

// Kennzahlfeld (Version C) — große Zahl über kleinem Etikett.
// Erscheint immer in Zweier- oder Dreiergruppen, nie einzeln: Eine Zahl ohne
// Vergleich sagt nichts.
export function Metric({ value, label, className = '' }: { value: ReactNode; label: string; className?: string }) {
  return (
    <div className={`bg-surface rounded-[16px] px-3.5 py-3 flex flex-col gap-1 ${className}`}>
      <span className="text-[28px] font-extrabold tracking-[-0.04em] leading-none text-text-primary tabular-nums">{value}</span>
      <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-text-secondary">{label}</span>
    </div>
  )
}

export function MetricRow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`grid grid-cols-3 gap-2.5 ${className}`}>{children}</div>
}
