// Zwei Modi (Version C) — die App kennt nur noch zwei Orte, weil es im Alltag der
// Nutzer zwei gibt: in der Schule und zuhause. Alles andere hängt an genau einem
// davon; nichts existiert an zwei Stellen gleichzeitig.
export type AppMode = 'unterricht' | 'klausur'

// Klausurenmodus: alles, womit man zuhause lernt und plant.
// Der Planen-Bereich (Kalender, Statistiken, Stundenplan, Notenrechner,
// Hausaufgaben, Klausurtermine) liegt bewusst hier und nicht im Unterrichtsmodus —
// geplant wird zuhause, erfasst wird in der Schule.
const KLAUSUR_PREFIXES = [
  '/klausurmodus',
  '/kalender',
  '/stundenplan',
  '/klausuren',
  '/abi-rechner',
  '/insights',
  // Hausaufgaben sind der eine Bestand mit zwei Wegen hinein: erfasst werden sie im
  // Unterrichtsmodus, geplant unter Planen. Der Screen selbst zählt zum
  // Klausurenmodus, weil er dort in der Planen-Leiste sitzt — der Unterrichtsmodus
  // zeigt nur die Anzahl und verlinkt hierher.
  '/hausaufgaben',
]

export function modeForPath(pathname: string): AppMode {
  return KLAUSUR_PREFIXES.some((p) => pathname.startsWith(p)) ? 'klausur' : 'unterricht'
}

// Startziel je Modus.
export const MODE_HOME: Record<AppMode, string> = {
  unterricht: '/unterricht',
  klausur: '/klausurmodus',
}

// Läuft laut Stundenplan gerade Unterricht? Grundlage für die Modus-Vorwahl beim
// App-Start. Nach Regel 4 ist das nur ein Vorschlag: Der Wechsel bleibt immer einen
// Tipp entfernt, und ohne hinterlegten Stundenplan startet die App im Unterrichtsmodus.
export function isSchoolTimeNow(
  stundenplan: Array<{ day: string; time: string; isFreistunde?: boolean }> | undefined,
  now = new Date(),
): boolean {
  if (!stundenplan || stundenplan.length === 0) return false
  const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
  const today = days[now.getDay()]
  const slots = stundenplan.filter((s) => s.day === today && !s.isFreistunde)
  if (slots.length === 0) return false

  const minutes = now.getHours() * 60 + now.getMinutes()
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : NaN
  }
  const starts = slots.map((s) => toMin(s.time)).filter((n) => !Number.isNaN(n))
  if (starts.length === 0) return false

  // Ein Schultag gilt vom Beginn der ersten bis 45 Minuten nach Beginn der
  // letzten Stunde als laufend — genauer geht es nicht, weil im Stundenplan
  // nur Startzeiten stehen.
  return minutes >= Math.min(...starts) && minutes <= Math.max(...starts) + 45
}
