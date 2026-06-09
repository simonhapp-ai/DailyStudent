import type { Subject, HalfYear, Topic } from '../types'

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
  { id: 'seminarfach',  name: 'Seminarfach',         color: '#E879F9', lessonCount: 0, nextExam: null, icon: '📋' },
]

