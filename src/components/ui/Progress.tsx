// Fortschritt (Version C) — ein Balken, Höhe 8, Radius 999.
// Farbe ist die Modusfarbe. Ausnahme: Noten, die tragen die Stufenfarbe der
// fünfteiligen Skala und werden über `tone` gesetzt.
export function Progress({
  value, tone, className = '',
}: { value: number; tone?: string; className?: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  return (
    <div className={`h-2 rounded-pill bg-fill-3 overflow-hidden ${className}`}>
      <div
        className="h-full rounded-pill transition-[width] duration-[220ms] ease-[cubic-bezier(.23,1,.32,1)] motion-reduce:transition-none"
        style={{ width: `${pct}%`, background: tone ?? 'rgb(var(--color-accent))' }}
      />
    </div>
  )
}
