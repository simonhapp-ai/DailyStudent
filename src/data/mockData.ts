import type { Subject, Lesson, SmartNote, FlashCard, ExamQuestion, ExamResult, HalfYear, Topic } from '../types'

export const halfYears: HalfYear[] = [
  { id: 'kl10-hj1', name: 'Klasse 10 — 1. HJ', period: 'Sep 2022 – Feb 2023', isCurrent: false },
  { id: 'kl10-hj2', name: 'Klasse 10 — 2. HJ', period: 'Feb 2023 – Jul 2023', isCurrent: false },
  { id: 'kl11-hj1', name: 'Klasse 11 — 1. HJ', period: 'Sep 2023 – Feb 2024', isCurrent: false },
  { id: 'kl11-hj2', name: 'Klasse 11 — 2. HJ', period: 'Feb 2024 – Jul 2024', isCurrent: false },
  { id: 'kl12-hj1', name: 'Klasse 12 — 1. HJ', period: 'Sep 2024 – Feb 2025', isCurrent: false },
  { id: 'kl12-hj2', name: 'Klasse 12 — 2. HJ', period: 'Feb 2025 – Jul 2025', isCurrent: false },
  { id: 'kl13-hj1', name: 'Klasse 13 — 1. HJ', period: 'Sep 2025 – Feb 2026', isCurrent: false },
  { id: 'kl13-hj2', name: 'Klasse 13 — 2. HJ', period: 'Feb 2026 – Jul 2026', isCurrent: true },
]

export const topics: Topic[] = [
  // Geschichte — Klasse 13
  { id: 't-ges-h1-1', subjectId: 'geschichte', halfYearId: 'kl13-hj1', name: 'Imperialismus & Erster Weltkrieg', kcAligned: true, lessonIds: [] },
  { id: 't-ges-h1-2', subjectId: 'geschichte', halfYearId: 'kl13-hj1', name: 'Russische Revolution & Bolschewismus', kcAligned: true, lessonIds: [] },
  { id: 't-ges-1',    subjectId: 'geschichte', halfYearId: 'kl13-hj2', name: 'Weimarer Republik', kcAligned: true, lessonIds: ['l1', 'l2', 'l3'] },
  { id: 't-ges-2',    subjectId: 'geschichte', halfYearId: 'kl13-hj2', name: 'Nationalsozialismus', kcAligned: true, lessonIds: ['l4', 'l5'] },
  { id: 't-ges-3',    subjectId: 'geschichte', halfYearId: 'kl13-hj2', name: 'Zweiter Weltkrieg', kcAligned: true, lessonIds: [] },
  { id: 't-ges-4',    subjectId: 'geschichte', halfYearId: 'kl13-hj2', name: 'Kalter Krieg & Deutschlandpolitik', kcAligned: true, lessonIds: [] },

  // Mathematik — Klasse 12
  { id: 't-mat-k12-1', subjectId: 'mathematik', halfYearId: 'kl12-hj1', name: 'Differentialrechnung: Ableitungsregeln & Anwendungen', kcAligned: true, lessonIds: [] },
  { id: 't-mat-k12-2', subjectId: 'mathematik', halfYearId: 'kl12-hj1', name: 'Kurvendiskussion & Extremwertaufgaben', kcAligned: true, lessonIds: [] },
  { id: 't-mat-k12-3', subjectId: 'mathematik', halfYearId: 'kl12-hj2', name: 'Analytische Geometrie: Vektoren & Geraden', kcAligned: true, lessonIds: [] },
  { id: 't-mat-k12-4', subjectId: 'mathematik', halfYearId: 'kl12-hj2', name: 'Ebenen, Abstände & Schnittprobleme', kcAligned: true, lessonIds: [] },
  // Mathematik — Klasse 13
  { id: 't-mat-1',     subjectId: 'mathematik', halfYearId: 'kl13-hj1', name: 'Integralrechnung: Grundbegriffe & Stammfunktionen', kcAligned: true, lessonIds: [] },
  { id: 't-mat-2',     subjectId: 'mathematik', halfYearId: 'kl13-hj2', name: 'Integralrechnung: Substitution & Partielle Integration', kcAligned: true, lessonIds: ['l6', 'l7'] },
  { id: 't-mat-3',     subjectId: 'mathematik', halfYearId: 'kl13-hj2', name: 'Stochastik: Wahrscheinlichkeitsrechnung', kcAligned: true, lessonIds: [] },
  { id: 't-mat-4',     subjectId: 'mathematik', halfYearId: 'kl13-hj2', name: 'Matrizen & Lineare Abbildungen', kcAligned: true, lessonIds: [] },

  // Englisch — Klasse 12
  { id: 't-eng-k12-1', subjectId: 'englisch', halfYearId: 'kl12-hj1', name: 'British & American Multiculturalism', kcAligned: true, lessonIds: [] },
  { id: 't-eng-k12-2', subjectId: 'englisch', halfYearId: 'kl12-hj1', name: 'Short Stories & Textanalyse', kcAligned: true, lessonIds: [] },
  { id: 't-eng-k12-3', subjectId: 'englisch', halfYearId: 'kl12-hj2', name: 'Language in Use: Sprachreflexion & Grammatik', kcAligned: true, lessonIds: [] },
  { id: 't-eng-k12-4', subjectId: 'englisch', halfYearId: 'kl12-hj2', name: 'Literature: Novel & Drama', kcAligned: true, lessonIds: [] },
  // Englisch — Klasse 13
  { id: 't-eng-1',     subjectId: 'englisch', halfYearId: 'kl13-hj1', name: 'Global Issues & Globalization', kcAligned: true, lessonIds: [] },
  { id: 't-eng-2',     subjectId: 'englisch', halfYearId: 'kl13-hj2', name: 'Media, Communication & Language', kcAligned: true, lessonIds: [] },
  { id: 't-eng-3',     subjectId: 'englisch', halfYearId: 'kl13-hj2', name: 'Political Systems: UK & USA', kcAligned: true, lessonIds: [] },

  // Biologie — Klasse 12
  { id: 't-bio-k12-1', subjectId: 'biologie', halfYearId: 'kl12-hj1', name: 'Zellbiologie: Membranen & Transportprozesse', kcAligned: true, lessonIds: [] },
  { id: 't-bio-k12-2', subjectId: 'biologie', halfYearId: 'kl12-hj1', name: 'Immunbiologie: Immunsystem & Impfung', kcAligned: true, lessonIds: [] },
  { id: 't-bio-k12-3', subjectId: 'biologie', halfYearId: 'kl12-hj2', name: 'Ökologie: Stoffkreisläufe & Energiefluss', kcAligned: true, lessonIds: [] },
  { id: 't-bio-k12-4', subjectId: 'biologie', halfYearId: 'kl12-hj2', name: 'Enzymatik & Stoffwechsel', kcAligned: true, lessonIds: [] },
  // Biologie — Klasse 13
  { id: 't-bio-1',     subjectId: 'biologie', halfYearId: 'kl13-hj1', name: 'Genetik: DNA, Replikation & Proteinbiosynthese', kcAligned: true, lessonIds: [] },
  { id: 't-bio-2',     subjectId: 'biologie', halfYearId: 'kl13-hj1', name: 'Gentechnik & Bioethik', kcAligned: true, lessonIds: [] },
  { id: 't-bio-3',     subjectId: 'biologie', halfYearId: 'kl13-hj2', name: 'Evolution: Selektion, Mutation & Artbildung', kcAligned: true, lessonIds: [] },
  { id: 't-bio-4',     subjectId: 'biologie', halfYearId: 'kl13-hj2', name: 'Neurobiologie & Sinnesphysiologie', kcAligned: true, lessonIds: [] },

  // Physik — Klasse 12
  { id: 't-phy-k12-1', subjectId: 'physik', halfYearId: 'kl12-hj1', name: 'Mechanik: Kinematik & Newtonschen Gesetze', kcAligned: true, lessonIds: [] },
  { id: 't-phy-k12-2', subjectId: 'physik', halfYearId: 'kl12-hj1', name: 'Impuls, Energie & Arbeit', kcAligned: true, lessonIds: [] },
  { id: 't-phy-k12-3', subjectId: 'physik', halfYearId: 'kl12-hj2', name: 'Elektrisches & magnetisches Feld', kcAligned: true, lessonIds: [] },
  { id: 't-phy-k12-4', subjectId: 'physik', halfYearId: 'kl12-hj2', name: 'Wellen & Schwingungen', kcAligned: true, lessonIds: [] },
  // Physik — Klasse 13
  { id: 't-phy-1',     subjectId: 'physik', halfYearId: 'kl13-hj1', name: 'Elektromagnetische Induktion & Wechselstrom', kcAligned: true, lessonIds: [] },
  { id: 't-phy-2',     subjectId: 'physik', halfYearId: 'kl13-hj1', name: 'Quantenmechanik: Welle-Teilchen-Dualismus', kcAligned: true, lessonIds: [] },
  { id: 't-phy-3',     subjectId: 'physik', halfYearId: 'kl13-hj2', name: 'Atommodelle & Spektralanalyse', kcAligned: true, lessonIds: [] },
  { id: 't-phy-4',     subjectId: 'physik', halfYearId: 'kl13-hj2', name: 'Kernphysik: Radioaktivität & Kernspaltung', kcAligned: true, lessonIds: [] },

  // Religion/Ethik — Klasse 12
  { id: 't-rel-k12-1', subjectId: 'religion', halfYearId: 'kl12-hj1', name: 'Weltreligionen: Judentum, Islam & Christentum', kcAligned: true, lessonIds: [] },
  { id: 't-rel-k12-2', subjectId: 'religion', halfYearId: 'kl12-hj1', name: 'Anthropologie: Menschenwürde & Freiheit', kcAligned: true, lessonIds: [] },
  { id: 't-rel-k12-3', subjectId: 'religion', halfYearId: 'kl12-hj2', name: 'Ethische Grundmodelle: Deontologie & Utilitarismus', kcAligned: true, lessonIds: [] },
  { id: 't-rel-k12-4', subjectId: 'religion', halfYearId: 'kl12-hj2', name: 'Religionsphilosophie: Gottesbeweise & Religionskritik', kcAligned: true, lessonIds: [] },
  // Religion/Ethik — Klasse 13
  { id: 't-rel-1',     subjectId: 'religion', halfYearId: 'kl13-hj1', name: 'Bioethik: Gentechnik, Sterbehilfe & Lebensschutz', kcAligned: true, lessonIds: [] },
  { id: 't-rel-2',     subjectId: 'religion', halfYearId: 'kl13-hj2', name: 'Politische Ethik: Gerechtigkeit & Menschenrechte', kcAligned: true, lessonIds: [] },
  { id: 't-rel-3',     subjectId: 'religion', halfYearId: 'kl13-hj2', name: 'Theodizee-Problem & Leid in der Welt', kcAligned: true, lessonIds: [] },

  // Deutsch — Klasse 13
  { id: 't-deu-1', subjectId: 'deutsch', halfYearId: 'kl13-hj1', name: 'Epik: Gegenwartsliteratur', kcAligned: true, lessonIds: [] },
  { id: 't-deu-2', subjectId: 'deutsch', halfYearId: 'kl13-hj2', name: 'Lyrik: Expressionismus & Moderne', kcAligned: true, lessonIds: [] },
  { id: 't-deu-3', subjectId: 'deutsch', halfYearId: 'kl13-hj2', name: 'Sprachreflexion & Sprachgeschichte', kcAligned: true, lessonIds: [] },
]

export const subjects: Subject[] = [
  { id: 'deutsch',      name: 'Deutsch',            color: '#4ADE80', lessonCount: 0, nextExam: null, icon: '📖' },
  { id: 'mathematik',   name: 'Mathematik',         color: '#6366F1', lessonCount: 0, nextExam: null, icon: '📐' },
  { id: 'englisch',     name: 'Englisch',           color: '#38BDF8', lessonCount: 0, nextExam: null, icon: '🌍' },
  { id: 'geschichte',   name: 'Geschichte',         color: '#F87171', lessonCount: 0, nextExam: null, icon: '🏛️' },
  { id: 'biologie',     name: 'Biologie',           color: '#FACC15', lessonCount: 0, nextExam: null, icon: '🧬' },
  { id: 'physik',       name: 'Physik',             color: '#818CF8', lessonCount: 0, nextExam: null, icon: '⚛️' },
  { id: 'chemie',       name: 'Chemie',             color: '#34D399', lessonCount: 0, nextExam: null, icon: '🧪' },
  { id: 'informatik',   name: 'Informatik',         color: '#60A5FA', lessonCount: 0, nextExam: null, icon: '💻' },
  { id: 'geographie',   name: 'Geographie',         color: '#A78BFA', lessonCount: 0, nextExam: null, icon: '🗺️' },
  { id: 'wirtschaft',   name: 'Wirtschaft',         color: '#FB923C', lessonCount: 0, nextExam: null, icon: '📊' },
  { id: 'latein',       name: 'Latein',             color: '#C084FC', lessonCount: 0, nextExam: null, icon: '🏺' },
  { id: 'franzoesisch', name: 'Französisch',        color: '#2DD4BF', lessonCount: 0, nextExam: null, icon: '🗼' },
  { id: 'spanisch',     name: 'Spanisch',           color: '#059669', lessonCount: 0, nextExam: null, icon: '🌶️' },
  { id: 'politik',      name: 'Politik / Soz.',     color: '#6366F1', lessonCount: 0, nextExam: null, icon: '⚖️' },
  { id: 'kunst',        name: 'Kunst',              color: '#E879F9', lessonCount: 0, nextExam: null, icon: '🎨' },
  { id: 'musik',        name: 'Musik',              color: '#EC4899', lessonCount: 0, nextExam: null, icon: '🎵' },
  { id: 'sport',        name: 'Sport',              color: '#F472B6', lessonCount: 0, nextExam: null, icon: '🏃' },
  { id: 'religion',     name: 'Religion / Ethik',   color: '#5AC8FA', lessonCount: 0, nextExam: null, icon: '🙏' },
]

export const lessons: Lesson[] = [
  { id: 'l1', subjectId: 'geschichte', topicId: 't-ges-1', date: '2026-05-27', topic: 'Weimarer Republik: Entstehung und erste Krisen', duration: 90, hasNotes: true },
  { id: 'l2', subjectId: 'geschichte', topicId: 't-ges-1', date: '2026-05-20', topic: 'Die Hyperinflation von 1923', duration: 90, hasNotes: true },
  { id: 'l3', subjectId: 'geschichte', topicId: 't-ges-1', date: '2026-05-13', topic: 'Goldene Zwanziger: Stabilisierung und Kultur', duration: 90, hasNotes: true },
  { id: 'l4', subjectId: 'geschichte', topicId: 't-ges-2', date: '2026-05-06', topic: 'Weltwirtschaftskrise und ihre Folgen', duration: 90, hasNotes: false },
  { id: 'l5', subjectId: 'geschichte', topicId: 't-ges-2', date: '2026-04-29', topic: 'Aufstieg der NSDAP: Ursachen und Mechanismen', duration: 90, hasNotes: true },
  { id: 'l6', subjectId: 'mathematik', topicId: 't-mat-1', date: '2026-05-26', topic: 'Integralrechnung: Substitutionsregel', duration: 90, hasNotes: true },
  { id: 'l7', subjectId: 'mathematik', topicId: 't-mat-1', date: '2026-05-19', topic: 'Partielle Integration', duration: 90, hasNotes: false },
]

export const smartNotes: SmartNote[] = [
  {
    id: 'n1',
    lessonId: 'l1',
    summary: `Die Weimarer Republik entstand nach der Novemberrevolution 1918 als erste parlamentarische Demokratie Deutschlands. Kaiser Wilhelm II. dankte ab, und Philipp Scheidemann rief am 9. November 1918 die Republik aus. Die neue Verfassung trat am 11. August 1919 in Kraft und gilt als eine der fortschrittlichsten ihrer Zeit – mit Verhältniswahlrecht, Grundrechten und erstmals aktivem Frauenwahlrecht. Gleichzeitig enthielt Artikel 48 eine gefährliche Notstandsklausel, die dem Reichspräsidenten weitreichende Sondervollmachten einräumte. Die Republik stand von Beginn an unter dem Schatten der Kriegsniederlage und des "Dolchstoß"-Mythos.`,
    keywords: [
      'Novemberrevolution 1918',
      'Philipp Scheidemann',
      'Weimarer Verfassung',
      'Artikel 48',
      'Verhältniswahlrecht',
      'Dolchstoßlegende',
      'Frauenwahlrecht',
      'Reichspräsident',
    ],
    examTopics: [
      'Stärken und Schwächen der Weimarer Verfassung',
      'Bedeutung von Artikel 48 für den späteren Aufstieg der NSDAP',
      'Vergleich: Weimarer Republik vs. Kaiserreich',
      'Rolle der Novemberrevolution für die Demokratisierung',
    ],
  },
]

export const flashCards: FlashCard[] = [
  {
    id: 'fc1',
    subjectId: 'geschichte',
    front: 'Was war die Dolchstoßlegende?',
    back: 'Eine Verschwörungstheorie nach dem Ersten Weltkrieg. Sie behauptete, die deutsche Armee sei im Feld unbesiegt gewesen und habe den Krieg nur verloren, weil sie von Sozialdemokraten, Juden und Kommunisten „von hinten erdolcht" wurde. Historisch falsch, aber politisch enorm wirksam – sie delegitimierte die Weimarer Republik von Beginn an.',
  },
  {
    id: 'fc2',
    subjectId: 'geschichte',
    front: 'Was regelte Artikel 48 der Weimarer Verfassung?',
    back: 'Der sogenannte Notstandsartikel ermächtigte den Reichspräsidenten, bei Störung der öffentlichen Ordnung mit Notverordnungen zu regieren – ohne Zustimmung des Reichstags. Ab 1930 wurde er von Hindenburg regelmäßig genutzt, was die parlamentarische Demokratie aushöhlte.',
  },
  {
    id: 'fc3',
    subjectId: 'geschichte',
    front: 'Welche wirtschaftlichen Krisen erschütterten die Weimarer Republik?',
    back: '1) Hyperinflation 1923: Der Wert der Mark kollabierte (1 USD = 4,2 Billionen Mark). Ursachen: Kriegsschulden, passive Resistenz im Ruhrkampf. 2) Weltwirtschaftskrise 1929–1933: Massenarbeitslosigkeit (bis 6 Mio.), sozialer Absturz der Mittelschicht, Radikalisierung des Wahlverhaltens.',
  },
  {
    id: 'fc4',
    subjectId: 'geschichte',
    front: 'Nenne drei strukturelle Schwächen der Weimarer Republik',
    back: '1) Verhältniswahlrecht ohne Sperrklausel → extreme Parteienzersplitterung, instabile Koalitionen. 2) Artikel 48 → Umgehung des Parlaments möglich. 3) Mangelnde demokratische Tradition in Bevölkerung und Eliten (Militär, Justiz, Bürokratie blieben weitgehend monarchistisch gesinnt).',
  },
  {
    id: 'fc5',
    subjectId: 'geschichte',
    front: 'Was versteht man unter den „Goldenen Zwanzigern"?',
    back: 'Die Phase relativer Stabilität 1924–1929 nach der Rentenmark-Reform. Merkmale: wirtschaftlicher Aufschwung (Dawes-Plan, US-Kredite), kulturelle Blüte (Bauhaus, Expressionismus, Kabarett), außenpolitische Entspannung (Locarno-Verträge, Völkerbundbeitritt 1926). Endete abrupt mit dem Schwarzen Freitag 1929.',
  },
]

export const examQuestions: ExamQuestion[] = [
  {
    id: 'eq1',
    subjectId: 'geschichte',
    text: 'Analysieren Sie die Ursachen für den Aufstieg der NSDAP in der Weimarer Republik. Beziehen Sie sich dabei auf wirtschaftliche, politische und gesellschaftliche Faktoren. (15 Punkte)',
    points: 15,
    operator: 'Analysieren',
  },
  {
    id: 'eq2',
    subjectId: 'geschichte',
    text: 'Beurteilen Sie, inwiefern die Weimarer Verfassung die Voraussetzungen für ihr eigenes Scheitern enthielt. (12 Punkte)',
    points: 12,
    operator: 'Beurteilen',
  },
  {
    id: 'eq3',
    subjectId: 'geschichte',
    text: 'Beschreiben Sie die wirtschaftlichen Auswirkungen der Hyperinflation von 1923 auf verschiedene gesellschaftliche Gruppen. (8 Punkte)',
    points: 8,
    operator: 'Beschreiben',
  },
]

export const mockExamResult: ExamResult = {
  questionId: 'eq1',
  userAnswer: '',
  score: 13,
  maxScore: 15,
  grade: '1+',
  strengths: [
    'Strukturierter Aufbau mit klarer Trennung der drei Analysedimensionen (wirtschaftlich, politisch, gesellschaftlich)',
    'Kompetente Einbindung konkreter Fakten: Weltwirtschaftskrise, Arbeitslosenzahlen, Artikel 48',
    'Abschlussurteil mit überzeugender Synthese der Faktoren',
  ],
  weaknesses: [
    'Die Rolle der SA und paramilitärischen Strukturen der NSDAP bleibt unerwähnt',
    'Propaganda und Medienstrategie Hitlers nur angedeutet, nicht ausgeführt',
  ],
  suggestion:
    'Ergänzen Sie die Analyse um die Bedeutung von Hitlers Rhetorik und der gezielten Nutzung neuer Medien (Radio, Massenkundgebungen). Dieser Aspekt wird in Klausuren häufig als eigenständiger Punkt bewertet und kann den Unterschied zwischen 13 und 15 Punkten ausmachen.',
}
