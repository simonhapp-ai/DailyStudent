export const SUBJECT_INFO: Record<string, { name: string; icon: string; color: string }> = {
  deutsch:        { name: 'Deutsch',           icon: '📖', color: '#4ADE80' },
  mathematik:     { name: 'Mathematik',        icon: '📐', color: '#6366F1' },
  englisch:       { name: 'Englisch',          icon: '🌍', color: '#38BDF8' },
  franzoesisch:   { name: 'Französisch',       icon: '🗼', color: '#2DD4BF' },
  latein:         { name: 'Latein',            icon: '🏺', color: '#C084FC' },
  spanisch:       { name: 'Spanisch',          icon: '🌶️', color: '#059669' },
  russisch:       { name: 'Russisch',          icon: '🪆', color: '#EF4444' },
  italienisch:    { name: 'Italienisch',       icon: '🍕', color: '#F59E0B' },
  griechisch:     { name: 'Griechisch',        icon: '🦉', color: '#9CA3AF' },
  japanisch:      { name: 'Japanisch',         icon: '⛩️', color: '#F97316' },
  biologie:       { name: 'Biologie',          icon: '🧬', color: '#FACC15' },
  chemie:         { name: 'Chemie',            icon: '🧪', color: '#34D399' },
  physik:         { name: 'Physik',            icon: '⚛️', color: '#818CF8' },
  geschichte:     { name: 'Geschichte',        icon: '🏛️', color: '#F87171' },
  politik:        { name: 'Politik / Soz.',    icon: '⚖️', color: '#6366F1' },
  geographie:     { name: 'Geographie',        icon: '🗺️', color: '#A78BFA' },
  philosophie:    { name: 'Philosophie',       icon: '💭', color: '#7C3AED' },
  ethik:          { name: 'Ethik',             icon: '🕊️', color: '#10B981' },
  werteUndNormen: { name: 'Werte und Normen',  icon: '🌿', color: '#6EE7B7' },
  kunst:          { name: 'Kunst',             icon: '🎨', color: '#E879F9' },
  musik:          { name: 'Musik',             icon: '🎵', color: '#EC4899' },
  sport:          { name: 'Sport',             icon: '🏃', color: '#F472B6' },
  religion:       { name: 'Religion',          icon: '🙏', color: '#D97706' },
  informatik:     { name: 'Informatik',        icon: '💻', color: '#60A5FA' },
  wirtschaft:     { name: 'Wirtschaft',        icon: '📊', color: '#FB923C' },
  seminarfach:    { name: 'Seminarfach',       icon: '📋', color: '#E879F9' },
}

// Resolves subject display info for both standard and user-created custom subjects.
// Falls back to icon 📚 and accent color for custom IDs not in SUBJECT_INFO.
export function resolveSubjectInfo(
  id: string,
  customFaecher?: Array<{ id: string; name: string; icon?: string }>,
): { name: string; icon: string; color: string } {
  if (SUBJECT_INFO[id]) return SUBJECT_INFO[id]
  const custom = customFaecher?.find((cf) => cf.id === id)
  if (custom) return { name: custom.name, icon: custom.icon ?? '📚', color: '#7C3AED' }
  return { name: id, icon: '📚', color: '#7C3AED' }
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
