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

// Planen ist kein dritter Modus, sondern ein Bereich INNERHALB des
// Klausurenmodus: Man steigt aus der Lernwerkzeug-Liste dorthin ab und wieder
// heraus. Die Farbe bleibt dabei Mint, nur die Werkzeuge wechseln.
const PLANEN_PREFIXES = [
  '/kalender', '/stundenplan', '/insights', '/abi-rechner', '/hausaufgaben', '/klausuren',
]

export function isPlanenPath(pathname: string): boolean {
  return PLANEN_PREFIXES.some((p) => pathname.startsWith(p))
}

export const PLANEN_HOME = '/kalender'

export function modeForPath(pathname: string): AppMode {
  return KLAUSUR_PREFIXES.some((p) => pathname.startsWith(p)) ? 'klausur' : 'unterricht'
}

// Startziel je Modus.
export const MODE_HOME: Record<AppMode, string> = {
  unterricht: '/unterricht',
  klausur: '/klausurmodus',
}

import type { StundenplanSlot } from '../types'

const toMin = (t: string): number => {
  const [h, m] = (t ?? '').split(':').map(Number)
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : NaN
}

// Wochentag als Stundenplan-Index: 0 = Montag … 4 = Freitag, -1 am Wochenende.
function planDayIndex(now: Date): number {
  const js = now.getDay() // 0 = Sonntag
  return js === 0 || js === 6 ? -1 : js - 1
}

/** Alle Stunden von heute, nach Startzeit sortiert. Freistunden bleiben drin — sie
 *  gehören zum Schultag, auch wenn sie kein Fach tragen. */
export function todaysSlots(slots: StundenplanSlot[] | undefined, now = new Date()): StundenplanSlot[] {
  const day = planDayIndex(now)
  if (day < 0 || !slots) return []
  return slots.filter((s) => s.day === day).sort((a, b) => a.startTime.localeCompare(b.startTime))
}

/** Die Stunde, die gerade läuft — oder null. Freistunden zählen mit, damit die
 *  Oberfläche „Freistunde" anzeigen kann statt einfach nichts. */
export function currentSlot(slots: StundenplanSlot[] | undefined, now = new Date()): StundenplanSlot | null {
  const minutes = now.getHours() * 60 + now.getMinutes()
  for (const s of todaysSlots(slots, now)) {
    const from = toMin(s.startTime)
    const to = toMin(s.endTime)
    if (!Number.isNaN(from) && !Number.isNaN(to) && minutes >= from && minutes < to) return s
  }
  return null
}

/** Die nächste Stunde von heute, die noch kommt. */
export function nextSlot(slots: StundenplanSlot[] | undefined, now = new Date()): StundenplanSlot | null {
  const minutes = now.getHours() * 60 + now.getMinutes()
  return todaysSlots(slots, now).find((s) => toMin(s.startTime) > minutes) ?? null
}

// Läuft laut Stundenplan gerade Unterricht? Grundlage für die Modus-Vorwahl beim
// App-Start. Nach Regel 4 ist das nur ein Vorschlag: Der Wechsel bleibt immer einen
// Tipp entfernt, und ohne hinterlegten Stundenplan startet die App im Unterrichtsmodus.
export function isSchoolTimeNow(slots: StundenplanSlot[] | undefined, now = new Date()): boolean {
  const today = todaysSlots(slots, now)
  if (today.length === 0) return false
  const minutes = now.getHours() * 60 + now.getMinutes()
  const starts = today.map((s) => toMin(s.startTime)).filter((n) => !Number.isNaN(n))
  const ends = today.map((s) => toMin(s.endTime)).filter((n) => !Number.isNaN(n))
  if (starts.length === 0 || ends.length === 0) return false
  return minutes >= Math.min(...starts) && minutes <= Math.max(...ends)
}


// ── Zurueck als Weg, nicht als Verlauf ────────────────────────────────────
//
// „Zurueck" bedeutet in dieser App: eine Stelle den Weg hinauf — nicht zum
// zuletzt gesehenen Screen. Der Unterschied faellt auf, sobald man im Kreis
// laeuft: Wer aus dem Konto ins Profil zurueckgeht und dort noch einmal
// zurueck tippt, landete mit einem Verlaufs-Zurueck wieder im Konto und kam
// nie heraus.
//
// Der Weg hat genau zwei Wurzeln, Unterricht und Klausur. Alles haengt an
// einer von beiden — auch das Profil, das man ueber den Avatar im Unterricht
// betritt, und Planen, das im Klausurenmodus liegt.
const ZURUECK_AUSNAHMEN: Record<string, string> = {
  // Der Karteikarten-Generator liegt unter „karteikarten/neu", die Liste dazu
  // aber unter „lernen" — eine Ebene hoch waere hier eine tote Adresse.
  '/klausurmodus/karteikarten/neu': '/klausurmodus/lernen',
  '/schreibblock': '/unterricht',
}

export function elternPfad(pfad: string): string {
  const rein = pfad.split('?')[0].replace(/\/+$/, '')
  if (ZURUECK_AUSNAHMEN[rein]) return ZURUECK_AUSNAHMEN[rein]

  const teile = rein.split('/').filter(Boolean)
  if (teile.length === 0) return MODE_HOME.unterricht

  // Profil ist ein eigenes Menue. Betreten wird es ueber den Avatar im
  // Unterricht — dorthin fuehrt es also auch zurueck.
  if (teile[0] === 'profil') return teile.length === 1 ? MODE_HOME.unterricht : '/profil'

  // Die sechs Planen-Rubriken haengen am Klausurenmodus.
  if (isPlanenPath(rein)) return MODE_HOME.klausur

  if (teile[0] === 'unterricht') {
    if (teile.length <= 1) return MODE_HOME.unterricht
    if (teile.length === 2) return '/unterricht'
    // Notiz, neue Notiz, Ordner — alle haengen am Fach.
    return `/unterricht/${teile[1]}`
  }

  if (teile.length > 1) return '/' + teile.slice(0, -1).join('/')
  return teile[0] === 'klausurmodus' ? MODE_HOME.klausur : MODE_HOME.unterricht
}

/** Das Ziel eines Zurueck-Tipps von der gerade offenen Adresse aus. */
export function zurueckZiel(): string {
  return elternPfad(window.location.pathname)
}
