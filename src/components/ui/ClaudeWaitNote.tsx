// Hinweis während einer Claude-Generierung: die Premium-KI arbeitet gründlich
// statt schnell. `compact` für kürzere Vorgänge (Klausur-Material ~30–45 s),
// sonst die volle "hol dir einen Kaffee"-Variante (Lernzettel ~1–2 Min).
export function ClaudeWaitNote({ compact = false, className = '' }: { compact?: boolean; className?: string }) {
  return (
    <div
      className={`bg-surface border border-border/60 rounded-card p-4 flex items-start gap-3 max-w-md ${className}`}
    >
      <div className="w-9 h-9 rounded-full bg-[rgb(120,120,128)]/[0.12] dark:bg-[rgb(120,120,128)]/[0.24] flex items-center justify-center shrink-0">
        <svg
          width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
          className="text-text-muted"
        >
          <path d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8z" />
          <path d="M17 9h2.5a2.5 2.5 0 0 1 0 5H17" />
          <path d="M7 2c0 1-1 1.5-1 2.5S7 6 7 7M11 2c0 1-1 1.5-1 2.5S11 6 11 7" />
        </svg>
      </div>
      {compact ? (
        <p className="text-[13px] text-text-secondary leading-relaxed">
          <span className="font-semibold text-text-primary">Premium-KI zeichnet die Materialien.</span>{' '}
          Das dauert etwas länger als sonst — einen Moment noch.
        </p>
      ) : (
        <p className="text-[13px] text-text-secondary leading-relaxed">
          <span className="font-semibold text-text-primary">Das dauert 1–2 Minuten.</span>{' '}
          Die Premium-KI nimmt sich für so eine komplexe Aufgabe Zeit — gründlich statt
          schnell. Lass die App offen; gute Gelegenheit, kurz einen Kaffee zu holen.
        </p>
      )}
    </div>
  )
}
