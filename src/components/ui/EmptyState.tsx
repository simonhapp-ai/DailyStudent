import { type ReactNode } from 'react'

// Zustandsblock (Version C) — vier feste Formen: leer, lädt, arbeitet, fehlgeschlagen.
// Ein leerer Screen sagt immer, was fehlt UND was man dagegen tun kann.
export function EmptyState({
  title, note, action, className = '',
}: { title: string; note?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={`bg-surface rounded-card p-6 flex flex-col items-center text-center gap-2 ${className}`}>
      <span className="text-[16px] font-semibold text-text-primary">{title}</span>
      {note && <span className="text-[13px] text-text-secondary max-w-[34ch]">{note}</span>}
      {action && <div className="pt-2 w-full">{action}</div>}
    </div>
  )
}

// „Arbeitet" — für KI-Vorgänge. Der Balken läuft dort, wo später das Ergebnis steht,
// damit beim Erscheinen nichts springt.
export function WorkingState({
  title, note, className = '',
}: { title: string; note?: string; className?: string }) {
  return (
    <div className={`bg-surface rounded-card p-5 flex flex-col items-center text-center gap-3 ${className}`}>
      <span className="text-[16px] font-semibold text-text-primary">{title}</span>
      <div className="w-full h-2 rounded-pill bg-[rgb(120,120,128)]/[0.12] dark:bg-[rgb(120,120,128)]/[0.24] overflow-hidden">
        <div className="h-full w-1/3 rounded-pill bg-accent animate-[working_1.4s_ease-in-out_infinite] motion-reduce:animate-none motion-reduce:w-1/2" />
      </div>
      {note && <span className="text-[13px] text-text-secondary">{note}</span>}
    </div>
  )
}
