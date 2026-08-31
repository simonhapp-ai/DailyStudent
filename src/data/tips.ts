// Kurze Hinweise, wie DailyStudent im Alltag am meisten bringt.
//
// Sie stehen in der Seitenleiste dort, wo im Querformat ohnehin Platz frei ist,
// und beschreiben jeweils eine konkrete Gewohnheit — nicht ein Feature. Der
// Unterschied ist wichtig: „Es gibt Smart Notes" hilft niemandem, „halte sie im
// Unterricht offen und tippe jeden Begriff mit" schon.
export interface Tip {
  title: string
  body: string
}

export const UNTERRICHT_TIPS: Tip[] = [
  {
    title: 'Im Unterricht',
    body: 'Halte die Smart Note offen und tippe jeden Begriff mit, den du nicht sofort greifst — antippen erklärt ihn dir direkt, ohne die Notiz zu verlassen.',
  },
  {
    title: 'Tafelbild',
    body: 'Lieber einmal zu viel fotografieren. Die KI erkennt Fach und Thema selbst und schlägt den Ordner vor.',
  },
  {
    title: 'Hausaufgaben',
    body: 'Erfasse sie direkt in der Notiz der Stunde. Sie erscheinen dann von allein im Kalender am Abgabetag.',
  },
  {
    title: 'Nach der Stunde',
    body: 'Eine analysierte Notiz wird im Klausurenmodus in zwei Tipps zu Karteikarten — je früher, desto weniger Aufholen vor der Klausur.',
  },
  {
    title: 'Freistunden',
    body: 'Der Stundenplan kennt deine Lücken. Der Lernplan legt seine Einheiten automatisch dort hinein, wo du wirklich Zeit hast.',
  },
]

export const KLAUSUR_TIPS: Tip[] = [
  {
    title: 'Vor der Klausur',
    body: 'Drei Tage vorher eine vollständige Probeklausur — danach bleibt noch Zeit, die Lücken zu schließen, die sie zeigt.',
  },
  {
    title: 'Blurting',
    body: 'Erst alles aus dem Kopf aufschreiben, dann vergleichen lassen. Was dabei fehlt, ist genau das, was du wiederholen musst.',
  },
  {
    title: 'Lernzettel',
    body: 'Vier Erklärarten. „Von Grund auf", wenn du ein Thema noch nicht verstehst — „Stichpunkte" am Abend vorher.',
  },
  {
    title: 'Lernplan',
    body: 'Einmal erstellt, reicht danach ein Tipp am Tag. Der Plan verteilt den Stoff um deinen Stundenplan herum.',
  },
]

// Ein Hinweis pro Tag, gleich bleibend über den Tag — sonst springt der Text bei
// jedem Rendern und wird zum Flackern statt zum Hinweis.
export function tipOfTheDay(tips: Tip[], now = new Date()): Tip {
  const start = new Date(now.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000)
  return tips[dayOfYear % tips.length]
}
