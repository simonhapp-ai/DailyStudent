// Fachgruppen-Farben (Version C, 31.08.2026) — vier Gruppen statt sieben, alle Werte
// aus Apples Systempalette. Sie sind die einzigen Farben der App außer den zwei
// Signaturfarben Purple/Mint. Die Zuordnung ist bewusst grob: Farbe sagt nur, WELCHE
// ART Fach das ist — die genaue Unterscheidung leistet das Icon, nicht der Ton.
//
// Wichtig zur Doppelbelegung: Blau, Grün und Gelb sind gleichzeitig Signalfarben.
// Unterschieden wird über die FORM, nicht über den Ton — Fachfarbe erscheint nur auf
// dem quadratischen Fachzeichen (<SubjectIcon>) und als 4-px-Kante am Kalendereintrag,
// Signalfarbe nur auf Pillen mit Zahl oder Wort. Siehe Konzept C, Abschnitt Farbsystem.
export type SubjectGroupKey = 'spr' | 'nat' | 'ges' | 'kre' | 'cst'

// Hellmodus-Hexwerte. Für theme-abhängige Flächen die CSS-Variablen aus index.css
// benutzen (--subj-spr … --subj-cst); diese Hexe sind für Kanten und Alpha-Tönungen
// gedacht, die in beiden Erscheinungen funktionieren.
export const SUBJECT_GROUP_COLOR: Record<SubjectGroupKey, string> = {
  spr: '#5CB8FF', // Sprachen · Apple Blau, Pastellstufe
  nat: '#34C759', // Naturwissenschaft · Apple Grün
  ges: '#FFA056', // Gesellschaft · Apple Orange, Pastellstufe
  kre: '#FF8AC4', // Kreativ & Sport · Apple Pink, Pastellstufe
  cst: '#000000', // Eigenes Fach
}

const G = SUBJECT_GROUP_COLOR

// Fach -> Farbgruppe. Getrennt von SUBJECT_GROUPS (weiter unten), das die sieben
// Anzeige-Gruppen für die Fächerauswahl definiert: sieben Rubriken zum Durchsehen,
// vier Farben zum Wiedererkennen.
export const SUBJECT_COLOR_GROUP: Record<string, SubjectGroupKey> = {
  deutsch: 'spr', englisch: 'spr', franzoesisch: 'spr', latein: 'spr', spanisch: 'spr',
  russisch: 'spr', italienisch: 'spr', griechisch: 'spr', japanisch: 'spr',
  mathematik: 'nat', biologie: 'nat', chemie: 'nat', physik: 'nat', informatik: 'nat',
  geschichte: 'ges', politik: 'ges', geographie: 'ges', wirtschaft: 'ges',
  philosophie: 'ges', ethik: 'ges', werteUndNormen: 'ges', religion: 'ges', seminarfach: 'ges',
  kunst: 'kre', musik: 'kre', sport: 'kre',
}

export function getSubjectGroup(id: string): SubjectGroupKey {
  return SUBJECT_COLOR_GROUP[id] ?? 'cst'
}

// Reihenfolge der Fachgruppen in Listen. Fächer derselben Farbe stehen dadurch
// beieinander, statt sich über die Liste zu verteilen — eine Liste aus vier
// zusammenhängenden Farbblöcken liest sich ruhiger als eine gesprenkelte.
const GROUP_ORDER: SubjectGroupKey[] = ['spr', 'nat', 'ges', 'kre', 'cst']

export function sortSubjectsByGroup(ids: string[]): string[] {
  return [...ids].sort((a, b) => {
    const ga = GROUP_ORDER.indexOf(getSubjectGroup(a))
    const gb = GROUP_ORDER.indexOf(getSubjectGroup(b))
    if (ga !== gb) return ga - gb
    return (SUBJECT_INFO[a]?.name ?? a).localeCompare(SUBJECT_INFO[b]?.name ?? b, 'de')
  })
}

// Schrift auf einer gefüllten Fachfarbe. Version-C-Füllregel: Fläche voll, Text weiß
// oder schwarz nach Kontrast — nie die Farbe selbst als Schrift auf getönter Fläche.
// TEXT auf einer Fachfarbe — nicht zu verwechseln mit dem SYMBOL auf dem
// Fachzeichen, das immer weiß ist (--subj-*-on in index.css).
// Pastellflächen tragen durchgehend schwarze Schrift; alle vier liegen damit
// zwischen 9,46 : 1 und 10,41 : 1 und funktionieren in beiden Erscheinungen gleich.
const GROUP_ON: Record<SubjectGroupKey, string> = {
  spr: '#000000', nat: '#000000', ges: '#000000', kre: '#000000', cst: '#FFFFFF',
}

export function getSubjectOnColor(id: string): string {
  return GROUP_ON[getSubjectGroup(id)]
}

export const SUBJECT_INFO: Record<string, { name: string; icon: string; color: string }> = {
  deutsch:        { name: 'Deutsch',           icon: '📖', color: G.spr },
  mathematik:     { name: 'Mathematik',        icon: '📐', color: G.nat },
  englisch:       { name: 'Englisch',          icon: '🌍', color: G.spr },
  franzoesisch:   { name: 'Französisch',       icon: '🗼', color: G.spr },
  latein:         { name: 'Latein',            icon: '🏺', color: G.spr },
  spanisch:       { name: 'Spanisch',          icon: '🌶️', color: G.spr },
  russisch:       { name: 'Russisch',          icon: '🪆', color: G.spr },
  italienisch:    { name: 'Italienisch',       icon: '🍕', color: G.spr },
  griechisch:     { name: 'Griechisch',        icon: '🦉', color: G.spr },
  japanisch:      { name: 'Japanisch',         icon: '⛩️', color: G.spr },
  biologie:       { name: 'Biologie',          icon: '🧬', color: G.nat },
  chemie:         { name: 'Chemie',            icon: '🧪', color: G.nat },
  physik:         { name: 'Physik',            icon: '⚛️', color: G.nat },
  informatik:     { name: 'Informatik',        icon: '💻', color: G.nat },
  geschichte:     { name: 'Geschichte',        icon: '🏛️', color: G.ges },
  politik:        { name: 'Politik / Soz.',    icon: '⚖️', color: G.ges },
  geographie:     { name: 'Geographie',        icon: '🗺️', color: G.ges },
  wirtschaft:     { name: 'Wirtschaft',        icon: '📊', color: G.ges },
  philosophie:    { name: 'Philosophie',       icon: '💭', color: G.ges },
  ethik:          { name: 'Ethik',             icon: '🕊️', color: G.ges },
  werteUndNormen: { name: 'Werte und Normen',  icon: '🌿', color: G.ges },
  religion:       { name: 'Religion',          icon: '🙏', color: G.ges },
  kunst:          { name: 'Kunst',             icon: '🎨', color: G.kre },
  musik:          { name: 'Musik',             icon: '🎵', color: G.kre },
  sport:          { name: 'Sport',             icon: '🏃', color: G.kre },
  seminarfach:    { name: 'Seminarfach',       icon: '📋', color: G.ges },
}

// Resolves subject display info for both standard and user-created custom subjects.
// Falls back to icon 📚 and accent color for custom IDs not in SUBJECT_INFO.
export function resolveSubjectInfo(
  id: string,
  customFaecher?: Array<{ id: string; name: string; icon?: string }>,
): { name: string; icon: string; color: string } {
  if (SUBJECT_INFO[id]) return SUBJECT_INFO[id]
  const custom = customFaecher?.find((cf) => cf.id === id)
  if (custom) return { name: custom.name, icon: custom.icon ?? '📚', color: G.cst }
  return { name: id, icon: '📚', color: G.cst }
}

export const SUBJECT_TOPIC_EXAMPLES: Record<string, [string, string]> = {
  deutsch:        ['Effi Briest', 'Faust – Gretchentragödie'],
  mathematik:     ['Integralrechnung', 'Stochastik – Hypothesentest'],
  englisch:       ['The Great Gatsby', 'Climate Change Essay'],
  franzoesisch:   ['Le Petit Prince', 'Subjonctif présent'],
  latein:         ['Caesar – De Bello Gallico', 'Cicero – Pro Archia'],
  spanisch:       ['Don Quijote', 'Konjunktiv Imperfecto'],
  russisch:       ['Gogol – Der Mantel', 'Perfektive Verben'],
  italienisch:    ['Dante – Divina Commedia', 'Passato prossimo'],
  griechisch:     ['Homer – Odyssee', 'Optativ Aorist'],
  japanisch:      ['Hiragana & Katakana', 'Te-Form der Verben'],
  biologie:       ['Photosynthese', 'Genetik – Mendel'],
  chemie:         ['Redoxreaktionen', 'Organische Chemie – Alkane'],
  physik:         ['Elektrodynamik', 'Quantenmechanik – Photoeffekt'],
  geschichte:     ['Weimarer Republik', 'Kalter Krieg'],
  politik:        ['Gewaltenteilung', 'EU-Institutionen'],
  geographie:     ['Plattentektonik', 'Klimazonen Afrikas'],
  philosophie:    ['Kants Kategorischer Imperativ', 'Platons Höhlengleichnis'],
  ethik:          ['Utilitarismus', 'Tierethik'],
  werteUndNormen: ['Menschenwürde', 'Soziale Gerechtigkeit'],
  kunst:          ['Impressionismus', 'Bildanalyse – Picasso'],
  musik:          ['Harmonielehre', 'Beethoven – Sonate op. 13'],
  sport:          ['Biomechanik', 'Trainingslehre'],
  religion:       ['Theodizee', 'Bergpredigt'],
  informatik:     ['Sortieralgorithmen', 'OOP – Vererbung'],
  wirtschaft:     ['Marktgleichgewicht', 'Wirtschaftskreislauf'],
  seminarfach:    ['Facharbeit – Gliederung', 'Quellenkritik & Zitierweise'],
}

export function getTopicPlaceholder(subjectId?: string | null): string {
  const ex = subjectId ? SUBJECT_TOPIC_EXAMPLES[subjectId] : undefined
  if (!ex) return 'z.B. Thema eingeben…'
  return `z.B. ${ex[0]}`
}

export function getTopicsPlaceholder(subjectId?: string | null): string {
  const ex = subjectId ? SUBJECT_TOPIC_EXAMPLES[subjectId] : undefined
  if (!ex) return 'z.B. Themen kommagetrennt eingeben…'
  return `z.B. ${ex[0]}, ${ex[1]} (kommagetrennt)`
}

export const SUBJECT_GROUPS = [
  { label: 'Kernfächer',            ids: ['deutsch', 'mathematik', 'englisch'] },
  { label: 'Sprachen',              ids: ['franzoesisch', 'latein', 'spanisch', 'russisch', 'italienisch', 'griechisch', 'japanisch'] },
  { label: 'MINT',                  ids: ['biologie', 'chemie', 'physik', 'informatik'] },
  { label: 'Gesellschaftswiss.',    ids: ['geschichte', 'politik', 'geographie', 'wirtschaft'] },
  { label: 'Philosophie & Ethik',   ids: ['philosophie', 'ethik', 'werteUndNormen', 'religion'] },
  { label: 'Kunst & Sport',         ids: ['kunst', 'musik', 'sport'] },
  { label: 'Sonstiges',             ids: ['seminarfach'] },
]
