import type { TagTone } from '../components/ui/Tag'

// Notenpunkte -> Stufe der fünfteiligen Skala (Version C).
// Genau fünf Stufen, keine Zwischentöne, keine Mischfarben.
//
// Liegt bewusst NICHT in Tag.tsx: Eine Datei, die Komponenten UND Funktionen
// exportiert, bricht Fast Refresh (react-refresh/only-export-components) — dieselbe
// Regel, wegen der renderMathSegments in lib/mathSegments.tsx ausgelagert ist.
export function gradeTone(notenpunkte: number): TagTone {
  if (notenpunkte >= 13) return 'grade-5' // saftiges Grün
  if (notenpunkte >= 10) return 'grade-4' // Hellgrün
  if (notenpunkte >= 7) return 'grade-3'  // Gelb
  if (notenpunkte >= 4) return 'grade-2'  // Orange
  return 'grade-1'                        // Rot
}

// Gleiche Skala für Prozentwerte in den Statistiken.
export function gradeToneFromPercent(pct: number): TagTone {
  return gradeTone(Math.round((Math.max(0, Math.min(1, pct))) * 15))
}
