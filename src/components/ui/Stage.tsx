import { type ReactNode } from 'react'

interface StageProps {
  /** Kleine Zeile über dem Titel — Kontext, z.B. „Mathematik · in 12 Tagen". */
  eyebrow?: string
  title: ReactNode
  /** Ein Satz unter dem Titel. */
  note?: string
  /** Fortschritt 0–1. Nur setzen, wenn es echten Fortschritt gibt. */
  progress?: number
  /** Die eine Handlung. Trägt immer ein Verb, das die Arbeit benennt. */
  action?: ReactNode
  /** Modus, dessen Farbe die Bühne trägt. Klausur leuchtet mint, Unterricht lila. */
  tone?: 'unterricht' | 'klausur'
  className?: string
}

// Bühne (Version C) — die eine hervorgehobene Fläche eines Screens.
//
// Regel 1 aus dem Konzept: Eine Bühne bekommt nur, wer genau EINE zeitkritische
// Handlung hat, und sie trägt immer ein Arbeits-Verb (Weiterlernen, Starten,
// Fortsetzen) — nie „Ansehen" oder „Öffnen". Wenn die Bedingung nicht erfüllt ist,
// gehört auf den Screen ein Kennzahlkopf oder nur der Titel, keine Bühne.
//
// Hell ist sie die dunkelste Fläche des Screens, dunkel die hellste — sie bleibt in
// beiden Erscheinungen die, die heraussticht.
export function Stage({ eyebrow, title, note, progress, action, tone = 'unterricht', className = '' }: StageProps) {
  const klausur = tone === 'klausur'
  return (
    <div
      className={`relative overflow-hidden rounded-sheet p-5 flex flex-col gap-2 text-white ${className}`}
      style={{ background: klausur ? 'var(--stage-bg-klausur)' : 'var(--stage-bg)' }}
    >
      {/* Glow in der Modusfarbe — reine Fläche, nie Schrift */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-[70px] w-[200px] h-[200px] rounded-full opacity-50"
        style={{ background: `radial-gradient(circle, ${klausur ? '#34D399' : 'rgb(var(--color-accent))'}, transparent 70%)` }}
      />
      {eyebrow && <span className="relative text-[13px] text-white/70">{eyebrow}</span>}
      <span className="relative text-[22px] font-bold tracking-[-0.03em] leading-tight">{title}</span>
      {typeof progress === 'number' && (
        <div className="relative h-2 rounded-pill bg-white/25 overflow-hidden">
          <div
            className="h-full rounded-pill bg-white transition-[width] duration-[220ms] ease-[cubic-bezier(.23,1,.32,1)]"
            style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }}
          />
        </div>
      )}
      {note && <span className="relative text-[13px] text-white/70">{note}</span>}
      {action && <div className="relative pt-1">{action}</div>}
    </div>
  )
}
