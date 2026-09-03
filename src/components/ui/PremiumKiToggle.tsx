// Pro-Schalter „Premium-KI" (Claude). Steht global im Profil und zusätzlich in den
// jeweiligen Generatoren (Lernzettel, Probeklausur-Material). Der Verlauf der An-
// Stellung nimmt automatisch die Modusfarbe (--grad-mode) des jeweiligen Screens.
export function PremiumKiToggle({
  checked,
  onChange,
  subtitle = 'Lernzettel & Klausur-Material von der stärkeren KI — etwas langsamer, dafür klarere Diagramme und Erklärungen.',
  className = '',
}: {
  checked: boolean
  onChange: (v: boolean) => void
  subtitle?: string
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-full bg-surface border border-border/60 rounded-card p-4 text-left press flex items-center gap-3 ${className}`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-text-primary">Premium-KI verwenden</p>
        <p className="text-[12px] text-text-muted mt-0.5 leading-snug">{subtitle}</p>
      </div>
      <div
        className="w-11 h-6 rounded-full flex items-center px-0.5 shrink-0 transition-colors"
        style={{ background: checked ? 'var(--grad-mode)' : 'rgb(var(--color-border))' }}
      >
        <div
          className="w-5 h-5 rounded-full bg-white shadow transition-transform"
          style={{ transform: checked ? 'translateX(20px)' : 'translateX(0)' }}
        />
      </div>
    </button>
  )
}
