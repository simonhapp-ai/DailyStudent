import type { ReactNode } from 'react'
import { getSubjectGroup, type SubjectGroupKey } from '../../data/subjectInfo'

type Size = 'sm' | 'md' | 'lg'

// Fachzeichen (Version C, 31.08.2026) — quadratische Fläche in einer der vier
// Fachgruppen-Farben, darüber eine weiche Aufhellung. Die Farben kommen als CSS-
// Variablen aus index.css und sind dadurch theme-abhängig: hell die kontraststarke
// Apple-Variante mit weißer Schrift, dunkel die Standard-Dunkelvariante mit schwarzer.
// Der Verlauf (--subj-fade) führt KEINE neue Farbe ein, er hellt nur oben links auf.
const GROUP_VAR: Record<SubjectGroupKey, { bg: string; fg: string }> = {
  spr: { bg: 'rgb(var(--subj-spr))', fg: 'rgb(var(--subj-spr-on))' },
  nat: { bg: 'rgb(var(--subj-nat))', fg: 'rgb(var(--subj-nat-on))' },
  ges: { bg: 'rgb(var(--subj-ges))', fg: 'rgb(var(--subj-ges-on))' },
  kre: { bg: 'rgb(var(--subj-kre))', fg: 'rgb(var(--subj-kre-on))' },
  cst: { bg: 'rgb(var(--subj-cst))', fg: 'rgb(var(--subj-cst-on))' },
}

interface SubjectIconProps {
  subjectId: string
  size?: Size
  className?: string
  /** @deprecated Version C: eigene Fächer tragen jetzt eine feste Fläche (--subj-cst).
   *  Prop bleibt, damit die drei aufrufenden Screens nicht brechen; wird ignoriert. */
  customColorIndex?: number
}

const customPlusIcon = (
  <>
    <circle cx="12" cy="12" r="7.5" />
    <path d="M12 8.5v7M8.5 12h7" />
  </>
)

const sizeConfig: Record<Size, { cls: string; px: number; radius: number }> = {
  sm: { cls: 'w-8 h-8', px: 14, radius: 10 },
  md: { cls: 'w-10 h-10', px: 18, radius: 13 },
  lg: { cls: 'w-14 h-14', px: 24, radius: 18 },
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
      <rect x="3" y="10" width="4" height="11" rx="0.5" fill="currentColor" stroke="none" />
      <rect x="10" y="6" width="4" height="15" rx="0.5" fill="currentColor" stroke="none" />
      <rect x="17" y="2" width="4" height="19" rx="0.5" fill="currentColor" stroke="none" />
      <line x1="1" y1="22" x2="23" y2="22" />
    </>
  ),
  latein: (
    <>
      <rect x="4" y="3" width="16" height="2" rx="1" fill="currentColor" stroke="none" />
      <rect x="4" y="19" width="16" height="2" rx="1" fill="currentColor" stroke="none" />
      <rect x="6.5" y="5" width="2.5" height="14" fill="currentColor" stroke="none" />
      <rect x="10.75" y="5" width="2.5" height="14" fill="currentColor" stroke="none" />
      <rect x="15" y="5" width="2.5" height="14" fill="currentColor" stroke="none" />
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
  // ── Added 31.08.2026 — previously missing, fell back to the generic fallbackIcon ──
  russisch: (
    <path d="M12 2c-2 0-3.3 1.8-3.3 4 0 .9.25 1.7.7 2.35C7.7 9.6 6.3 11.8 6.3 14.5 6.3 18.5 8.7 21 12 21s5.7-2.5 5.7-6.5c0-2.7-1.4-4.9-3.1-6.15.45-.65.7-1.45.7-2.35C15.3 3.8 14 2 12 2z" />
  ),
  italienisch: (
    <>
      <path d="M12 3L4 20h16L12 3z" />
      <line x1="9" y1="14" x2="9.01" y2="14" strokeWidth="3" />
      <line x1="12" y1="16.5" x2="12.01" y2="16.5" strokeWidth="3" />
      <line x1="15" y1="13" x2="15.01" y2="13" strokeWidth="3" />
    </>
  ),
  griechisch: (
    <>
      <circle cx="9" cy="11" r="1.6" />
      <circle cx="15" cy="11" r="1.6" />
      <path d="M12 4c-4.4 0-7 3-7 7.5C5 16 7.5 19.5 12 21c4.5-1.5 7-5 7-9.5C19 7 16.4 4 12 4z" />
      <path d="M9 15.5l1.2 2M15 15.5l-1.2 2" />
    </>
  ),
  japanisch: (
    <>
      <line x1="2" y1="6" x2="22" y2="6" />
      <line x1="3.5" y1="9.2" x2="20.5" y2="9.2" />
      <line x1="6.5" y1="9.2" x2="6.5" y2="21" />
      <line x1="17.5" y1="9.2" x2="17.5" y2="21" />
    </>
  ),
  philosophie: (
    <>
      <path d="M9 18h6M10 21h4" />
      <path d="M12 2a6 6 0 00-6 6c0 2.5 1.5 4 2.5 5s1.5 1.5 1.5 3h4c0-1.5.5-2 1.5-3s2.5-2.5 2.5-5a6 6 0 00-6-6z" />
    </>
  ),
  ethik: (
    <>
      <path d="M12 5c2 3 6 3 9 1-2 3.5-5 4.5-9 3.5-4 1-7 0-9-3.5 3 2 7 2 9-1z" />
      <line x1="12" y1="9.5" x2="12" y2="21" />
    </>
  ),
  werteUndNormen: (
    <>
      <path d="M11 20A7 7 0 019.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10z" />
      <path d="M2 21c0-6 4-10 9-10" />
    </>
  ),
}

const fallbackIcon = (
  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
)

export function SubjectIcon({ subjectId, size = 'md', className = '' }: SubjectIconProps) {
  const { cls, px, radius } = sizeConfig[size]
  const isCustom = subjectId.startsWith('custom_')
  const { bg, fg } = GROUP_VAR[isCustom ? 'cst' : getSubjectGroup(subjectId)]

  return (
    <div
      className={`${cls} flex items-center justify-center shrink-0 ${className}`}
      style={{
        borderRadius: `${radius}px`,
        backgroundColor: bg,
        backgroundImage: 'var(--subj-fade)',
      }}
    >
      <svg
        width={px}
        height={px}
        viewBox="0 0 24 24"
        fill="none"
        stroke={fg}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {isCustom ? customPlusIcon : (icons[subjectId] ?? fallbackIcon)}
      </svg>
    </div>
  )
}

// Schnellnotizen-Zeichen — dieselbe quadratische Form wie ein Fachzeichen,
// aber bewusst KEINE der vier Fachgruppen-Farben. Schnellnotizen sind kein
// Fach, sondern der Eingang des Unterrichtsmodus für alles, was noch keinem
// Fach zugeordnet ist. Deshalb trägt die Fläche die Modusfarbe.
//
// Der Ton ist in beiden Erscheinungen derselbe (#7C3AED, nicht die
// aufgehellte Dunkelvariante), genau wie bei den Fachzeichen: Ein Zeichen,
// das seine Farbe je nach Erscheinung wechselt, verliert seinen Wiedererkennungswert.
// Weiß darauf liegt bei rund 5:1 und bleibt in beiden Fällen lesbar.
export function QuickNotesIcon({ size = 'md', className = '' }: { size?: Size; className?: string }) {
  const cfg = sizeConfig[size]
  return (
    <span
      className={`${cfg.cls} inline-flex items-center justify-center shrink-0 ${className}`}
      style={{
        borderRadius: cfg.radius,
        backgroundColor: '#7C3AED',
        backgroundImage: 'var(--subj-fade)',
      }}
      aria-hidden
    >
      <svg
        width={cfg.px} height={cfg.px} viewBox="0 0 24 24" fill="none"
        stroke="#FFFFFF" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"
      >
        <path d="M6 3.5h8.5L19 8v12.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-16a1 1 0 011-1z" />
        <path d="M14 3.5V8h4.5" />
        <path d="M8.5 13h7M8.5 16.5h4.5" />
      </svg>
    </span>
  )
}
