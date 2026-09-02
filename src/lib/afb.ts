// Gemeinsame Bausteine der vier Probeklausur-Modi.
//
// Lagen vorher viermal wortgleich in den vier Screens — inklusive der Farben,
// die dort blaue, bernsteinfarbene und lila Schrift trugen. Farbige Schrift
// widerspricht dem System, und Lila ist die Farbe des Unterrichtsmodus; in
// einem Klausur-Screen hat sie nichts verloren.

/** Marke der Anforderungsstufe. Neutral — die römische Ziffer sagt die Stufe. */
export const AFB_PILL =
  'bg-[rgb(120,120,128)]/[0.12] dark:bg-[rgb(120,120,128)]/[0.24] text-text-primary'

/**
 * Notenpunkte auf die fünfteilige Skala des Systems. Jede Stufe bringt über
 * `--grade-N` und `--grade-N-on` ihre eigene Gegenfarbe mit — anders als die
 * fünf freien Hexwerte vorher, die als Schrift kaum lesbar waren.
 */
export function npStufe(np: number): number {
  if (np >= 13) return 5
  if (np >= 10) return 4
  if (np >= 7) return 3
  if (np >= 4) return 2
  return 1
}

/** Fläche und Schrift der Notenpunkt-Marke, passend zur Stufe. */
export function npMarke(np: number): { background: string; color: string } {
  const stufe = npStufe(np)
  return {
    background: `rgb(var(--grade-${stufe}))`,
    color: `rgb(var(--grade-${stufe}-on))`,
  }
}
