// ── XP und Ränge ──────────────────────────────────────────────────────────
//
// Warum XP und nicht mehr Coins: Eine Münze verspricht Kaufkraft. Seit die
// Käufe über Apple laufen, gibt es aber nichts mehr zu kaufen — der Rabatt ist
// tot, der Streak-Freeze wird jetzt verdient. Was bleibt, ist ein Maß für
// geleistete Arbeit, und dafür ist XP das ehrlichere Wort.
//
// XP und Streak messen zwei verschiedene Dinge und dürfen deshalb nebeneinander
// stehen, ohne sich zu doppeln:
//
//   Streak = Regelmäßigkeit. Bist du drangeblieben? Fällt über Nacht auf null.
//   Rang   = Umfang.         Wie weit bist du gekommen? Fällt nie.
//
// Deshalb auch die Formulierung in der Oberfläche: „14 Tage am Stück" ist eine
// Zeitangabe, „Stufe 3 · Konstant" ist ein Zustand.

export interface Rang {
  stufe: 1 | 2 | 3 | 4 | 5
  label: string
  /** Ab wie vielen XP dieser Rang gilt. */
  ab: number
  /** Ein Satz, der sagt, was der Rang über das Lernverhalten aussagt. */
  bedeutung: string
}

// Fünf Stufen, damit sie zur Notenskala passen. Sachliche Namen statt
// „King Learner" — die Zielgruppe ist Oberstufe, nicht Grundschule. Die Namen
// beschreiben Lernverhalten, nicht Heldentum.
export const RAENGE: Rang[] = [
  { stufe: 1, label: 'Anfang',   ab: 0,    bedeutung: 'Die ersten Notizen sind da.' },
  { stufe: 2, label: 'Routine',  ab: 250,  bedeutung: 'Du erfasst regelmäßig, was im Unterricht läuft.' },
  { stufe: 3, label: 'Konstant', ab: 750,  bedeutung: 'Erfassen und Lernen greifen ineinander.' },
  { stufe: 4, label: 'Sicher',   ab: 1800, bedeutung: 'Du gehst vorbereitet in Klausuren, nicht auf Verdacht.' },
  { stufe: 5, label: 'Souverän', ab: 4000, bedeutung: 'Der Stoff läuft mit, statt vor der Klausur zu drängen.' },
]

export function rangFuer(xp: number): Rang {
  let treffer = RAENGE[0]
  for (const r of RAENGE) if (xp >= r.ab) treffer = r
  return treffer
}

export function naechsterRang(xp: number): Rang | null {
  return RAENGE.find((r) => r.ab > xp) ?? null
}

/** Anteil bis zum nächsten Rang, 0 bis 1. Auf der höchsten Stufe immer 1. */
export function rangFortschritt(xp: number): number {
  const jetzt = rangFuer(xp)
  const naechster = naechsterRang(xp)
  if (!naechster) return 1
  const spanne = naechster.ab - jetzt.ab
  return spanne > 0 ? Math.min(1, Math.max(0, (xp - jetzt.ab) / spanne)) : 0
}

/** Wie viele XP noch bis zum nächsten Rang fehlen. Null auf der höchsten Stufe. */
export function xpBisNaechster(xp: number): number | null {
  const naechster = naechsterRang(xp)
  return naechster ? naechster.ab - xp : null
}

// ── Streak-Schutz ─────────────────────────────────────────────────────────
// Der Freeze war käuflich, solange es eine Währung gab. Jetzt wird er durch
// genau das verdient, was er schützt: Wer sieben Tage am Stück lernt, bekommt
// einen. Wer nicht, hat keinen. Höchstens zwei auf Vorrat, sonst wird die
// Streak bedeutungslos.
export const FREEZE_PRO_TAGE = 7
export const FREEZE_MAX = 2

/** Wie viele Freezes eine Streak dieser Länge insgesamt verdient hat. */
export function verdienteFreezes(streak: number): number {
  return Math.min(FREEZE_MAX, Math.floor(streak / FREEZE_PRO_TAGE))
}
