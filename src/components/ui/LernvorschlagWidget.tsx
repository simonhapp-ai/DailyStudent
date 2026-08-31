import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../../context/UserContext'
import { SUBJECT_INFO } from '../../data/subjectInfo'
import { endnoteForEntry } from '../../screens/AbiRechnerScreen'

interface Suggestion {
  icon: React.ReactNode
  gradient: string
  title: string
  subtitle: string
  actionPath: string
  actionLabel: string
  urgency: 'critical' | 'normal' | 'low'
}

function daysAgo(dateStr: string | null): number {
  if (!dateStr) return 999
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(dateStr)
  return Math.floor((today.getTime() - d.getTime()) / 86400000)
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / 86400000)
}

function BookIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
}
function BoltIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
}
function StarIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
}
function CardIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
}
function ClipboardIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
}
function CameraIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
}
function CalendarIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
}
function TrophyIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-1a2 2 0 012-2h16a2 2 0 012 2v1a2 2 0 01-2 2h-2"/><rect x="6" y="18" width="12" height="4"/></svg>
}
function AlertIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="3"/></svg>
}

function computeSuggestion(
  profile: ReturnType<typeof useUser>['profile'],
  appStats: ReturnType<typeof useUser>['appStats'],
  userNotes: ReturnType<typeof useUser>['userNotes'],
  flashCards: ReturnType<typeof useUser>['generatedFlashCards'],
  lernzettel: ReturnType<typeof useUser>['lernzettel'],
  savedProbeklausuren: ReturnType<typeof useUser>['savedProbeklausuren'],
  lernplaene: ReturnType<typeof useUser>['lernplaene'],
): Suggestion | null {
  if (!profile) return null

  const today = new Date().toISOString().slice(0, 10)
  const { streak, lastStudyDate, examScores } = appStats

  // ── Pre-compute helpers ──────────────────────────────────────────────────────

  const klausurtermine = profile.klausurtermine ?? []
  const faecher = profile.faecher ?? []

  // Next upcoming exam
  const upcomingExams = klausurtermine
    .map((k) => ({ ...k, days: daysUntil(k.date) }))
    .filter((k) => k.days >= 0)
    .sort((a, b) => a.days - b.days)
  const nextExam = upcomingExams[0] ?? null
  const nextExamInfo = nextExam ? SUBJECT_INFO[nextExam.subjectId] : null
  const nextExamName = nextExamInfo?.name ?? nextExam?.subjectId ?? null

  // Subject material counts
  const notesFor = (sid: string) => userNotes.filter((n) => n.subjectId === sid).length
  const flashFor = (sid: string) => flashCards.filter((f) => f.noteId && userNotes.some((n) => n.id === f.noteId && n.subjectId === sid)).length
  const lernzettelFor = (sid: string) => lernzettel.filter((l) => l.subjectId === sid).length
  const probeklausurenFor = (sid: string) => savedProbeklausuren.filter((p) => p.subjectId === sid)
  const totalNotes = userNotes.length

  // Weakest subject (latest quarter/halbjahr)
  const halbjahre = profile.abiHalbjahre ?? []
  let weakest: { subjectId: string; name: string; np: number } | null = null
  for (const subjectId of faecher) {
    const info = SUBJECT_INFO[subjectId]
    if (!info) continue
    for (const q of ['Q4', 'Q3', 'Q2', 'Q1', '2. Halbjahr', '1. Halbjahr']) {
      const hj = halbjahre.find((h) => h.label === q)
      if (!hj) continue
      const entry = hj.entries.find((e) => e.subjectId === subjectId)
      if (!entry) continue
      const np = endnoteForEntry(entry)
      if (np !== null && (weakest === null || np < weakest.np)) {
        weakest = { subjectId, name: info.name, np }
      }
      break
    }
  }

  // Subjects with NP < 8
  const weakSubjects = faecher.filter((sid) => {
    for (const q of ['Q4', 'Q3', 'Q2', 'Q1', '2. Halbjahr', '1. Halbjahr']) {
      const hj = halbjahre.find((h) => h.label === q)
      if (!hj) continue
      const entry = hj.entries.find((e) => e.subjectId === sid)
      if (!entry) continue
      const np = endnoteForEntry(entry)
      return np !== null && np < 8
    }
    return false
  })

  const daysSinceStudy = daysAgo(lastStudyDate)
  const studiedToday = lastStudyDate === today

  // Active lernplan
  const activePlan = lernplaene.find((p) => p.isActive)
  const hasTodaySession = activePlan?.days.some((d) => d.date === today && d.sessions.length > 0) ?? false

  // Last 2 exam scores trend
  const lastTwo = [...examScores].slice(-2)
  const trendDown = lastTwo.length === 2 && lastTwo[1].totalNP < lastTwo[0].totalNP

  // Abi note comparison
  const gesamtnote = profile.abiGesamtnote ? parseFloat(profile.abiGesamtnote.replace(',', '.')) : null
  const zielnote = profile.zielnote ? parseFloat(profile.zielnote.replace(',', '.')) : null

  // ── 30 Scenarios (priority order — first match wins) ────────────────────────

  // 1. Klausur critical ≤ 3 days — no Probeklausur for that subject yet
  if (nextExam && nextExam.days <= 3 && probeklausurenFor(nextExam.subjectId).length === 0) {
    return { icon: <AlertIcon />, gradient: 'linear-gradient(145deg, #FF3B30, #C0392B)', urgency: 'critical',
      title: `Probeklausur ${nextExamName}`,
      subtitle: `Klausur in ${nextExam.days === 0 ? 'heute' : `${nextExam.days} Tag${nextExam.days === 1 ? '' : 'en'}`} — noch keine Übungsklausur!`,
      actionPath: '/klausurmodus/probeklausur', actionLabel: 'Jetzt starten' }
  }

  // 2. Klausur ≤ 3 days — last Probeklausur < 8 NP
  if (nextExam && nextExam.days <= 3) {
    const lastPk = probeklausurenFor(nextExam.subjectId).slice(-1)[0]
    if (lastPk && lastPk.totalNP < 8) {
      return { icon: <AlertIcon />, gradient: 'linear-gradient(145deg, #FF9500, #E07008)', urgency: 'critical',
        title: `Nochmal ${nextExamName}`,
        subtitle: `Du warst bei ${lastPk.totalNP} NP — eine weitere Probeklausur lohnt sich.`,
        actionPath: '/klausurmodus/probeklausur', actionLabel: 'Probeklausur' }
    }
  }

  // 3. Klausur ≤ 3 days — has Lernzettel for subject
  if (nextExam && nextExam.days <= 3 && lernzettelFor(nextExam.subjectId) > 0) {
    return { icon: <BookIcon />, gradient: 'linear-gradient(145deg, #5AC8FA, #007BB8)', urgency: 'critical',
      title: `Lernzettel ${nextExamName} wiederholen`,
      subtitle: `${lernzettelFor(nextExam.subjectId)} Lernzettel verfügbar — letzter Check vor der Klausur.`,
      actionPath: '/klausurmodus/lernzettel', actionLabel: 'Lernzettel öffnen' }
  }

  // 4. Klausur ≤ 3 days — has flashcards for subject
  if (nextExam && nextExam.days <= 3 && flashFor(nextExam.subjectId) > 0) {
    return { icon: <CardIcon />, gradient: 'linear-gradient(145deg, #7C3AED, #4C1D95)', urgency: 'critical',
      title: `Karteikarten-Sprint: ${nextExamName}`,
      subtitle: `${flashFor(nextExam.subjectId)} Karten — perfekt für die letzten Stunden.`,
      actionPath: '/klausurmodus/lernen', actionLabel: 'Lernen starten' }
  }

  // 5. Klausur ≤ 3 days — no materials at all
  if (nextExam && nextExam.days <= 3) {
    return { icon: <CameraIcon />, gradient: 'linear-gradient(145deg, #FF3B30, #C0392B)', urgency: 'critical',
      title: `Smart Note zu ${nextExamName} erfassen`,
      subtitle: `Klausur in ${nextExam.days} Tag${nextExam.days === 1 ? '' : 'en'} — scanne deine Unterlagen.`,
      actionPath: '/unterricht', actionLabel: 'Unterricht öffnen' }
  }

  // 6. Active Lernplan with session today
  if (hasTodaySession) {
    return { icon: <CalendarIcon />, gradient: 'linear-gradient(145deg, #FFD060, #C07700)', urgency: 'normal',
      title: 'Heutiger Lernplan wartet',
      subtitle: 'Du hast heute eine geplante Lernsession — starte jetzt.',
      actionPath: '/klausurmodus/lernplan', actionLabel: 'Lernplan öffnen' }
  }

  // 7. Klausur 4-7 days — no Lernzettel for subject
  if (nextExam && nextExam.days <= 7 && lernzettelFor(nextExam.subjectId) === 0 && notesFor(nextExam.subjectId) > 0) {
    return { icon: <BookIcon />, gradient: 'linear-gradient(145deg, #5AC8FA, #007BB8)', urgency: 'normal',
      title: `Lernzettel ${nextExamName} erstellen`,
      subtitle: `Klausur in ${nextExam.days} Tagen — du hast ${notesFor(nextExam.subjectId)} Notizen als Basis.`,
      actionPath: '/klausurmodus/lernzettel/neu', actionLabel: 'Lernzettel erstellen' }
  }

  // 8. Klausur 4-7 days — has notes, no flashcards
  if (nextExam && nextExam.days <= 7 && flashFor(nextExam.subjectId) === 0 && notesFor(nextExam.subjectId) > 0) {
    return { icon: <CardIcon />, gradient: 'linear-gradient(145deg, #7C3AED, #4C1D95)', urgency: 'normal',
      title: `Karteikarten aus ${notesFor(nextExam.subjectId)} Notizen`,
      subtitle: `${nextExamName} in ${nextExam.days} Tagen — Karteikarten helfen bei der Wiederholung.`,
      actionPath: '/klausurmodus/karteikarten/neu', actionLabel: 'Karteikarten erstellen' }
  }

  // 9. Klausur 4-7 days — no Lernplan yet
  if (nextExam && nextExam.days <= 7 && !activePlan) {
    return { icon: <CalendarIcon />, gradient: 'linear-gradient(145deg, #FFD060, #C07700)', urgency: 'normal',
      title: `Lernplan für ${nextExam.days} Tage`,
      subtitle: `Klausur ${nextExamName} — strukturiere deine Vorbereitung mit einem Lernplan.`,
      actionPath: '/klausurmodus/lernplan/neu', actionLabel: 'Lernplan erstellen' }
  }

  // 10. Klausur 4-7 days — good streak, suggest Probeklausur
  if (nextExam && nextExam.days <= 7 && streak >= 3) {
    return { icon: <BoltIcon />, gradient: 'linear-gradient(145deg, #0891B2, #065666)', urgency: 'normal',
      title: `Weiter so! Probeklausur ${nextExamName}`,
      subtitle: `${streak} Tage Streak — du bist in der Spur. Teste dein Wissen.`,
      actionPath: '/klausurmodus/probeklausur', actionLabel: 'Probeklausur starten' }
  }

  // 11. Weakest subject < 5 NP — no Smart Notes
  if (weakest && weakest.np < 5 && notesFor(weakest.subjectId) === 0) {
    return { icon: <CameraIcon />, gradient: 'linear-gradient(145deg, #FF3B30, #C0392B)', urgency: 'normal',
      title: `${weakest.name} stärken — 0 Notizen`,
      subtitle: `Note ${weakest.np} NP — scanne deine Hefte für KI-Hilfe.`,
      actionPath: '/unterricht', actionLabel: 'Unterricht öffnen' }
  }

  // 12. Weakest subject < 5 NP — has Smart Notes, do AFB
  if (weakest && weakest.np < 5) {
    return { icon: <AlertIcon />, gradient: 'linear-gradient(145deg, #FF9500, #E07008)', urgency: 'normal',
      title: `AFB-Training: ${weakest.name}`,
      subtitle: `Note ${weakest.np} NP — gezieltes AFB I/II/III Training gegen deine Lücken.`,
      actionPath: '/klausurmodus/probeklausur/afb-trainer', actionLabel: 'AFB-Trainer starten' }
  }

  // 13. Weakest subject 5-7 NP — no Lernzettel
  if (weakest && weakest.np < 8 && lernzettelFor(weakest.subjectId) === 0) {
    return { icon: <BookIcon />, gradient: 'linear-gradient(145deg, #5AC8FA, #007BB8)', urgency: 'normal',
      title: `Lernzettel ${weakest.name} erstellen`,
      subtitle: `Note ${weakest.np} NP — ein guter Lernzettel hilft dir, die Lücken zu schließen.`,
      actionPath: '/klausurmodus/lernzettel/neu', actionLabel: 'Lernzettel erstellen' }
  }

  // 14. Two or more weak subjects (< 8 NP)
  if (weakSubjects.length >= 2) {
    const names = weakSubjects.slice(0, 2).map((sid) => SUBJECT_INFO[sid]?.name ?? sid)
    return { icon: <AlertIcon />, gradient: 'linear-gradient(145deg, #FF9500, #E07008)', urgency: 'normal',
      title: `${names[0]} oder ${names[1]} stärken?`,
      subtitle: `Du hast ${weakSubjects.length} Fächer unter 8 Punkten — wo willst du anfangen?`,
      actionPath: '/klausurmodus', actionLabel: 'Lernmethoden wählen' }
  }

  // 15. Studied today — positive reinforcement
  if (studiedToday && nextExam) {
    return { icon: <TrophyIcon />, gradient: 'linear-gradient(145deg, #34C759, #1A7A32)', urgency: 'low',
      title: 'Gut gemacht heute!',
      subtitle: `Noch ${nextExam.days} Tag${nextExam.days === 1 ? '' : 'en'} bis ${nextExamName} — du bist auf Kurs.`,
      actionPath: '/insights', actionLabel: 'Fortschritt ansehen' }
  }

  // 16. 7+ day streak
  if (streak >= 7) {
    return { icon: <TrophyIcon />, gradient: 'linear-gradient(145deg, #FFD060, #C07700)', urgency: 'low',
      title: `${streak} Tage Streak!`,
      subtitle: 'Bemerkenswerte Kontinuität — bleib am Ball.',
      actionPath: '/insights', actionLabel: 'Statistiken ansehen' }
  }

  // 17. 2 days since last study
  if (daysSinceStudy === 2) {
    return { icon: <BoltIcon />, gradient: 'linear-gradient(145deg, #FF9500, #E07008)', urgency: 'normal',
      title: '2 Tage Pause',
      subtitle: '15 Minuten reichen heute — Probeklausur oder Karteikarten.',
      actionPath: '/klausurmodus', actionLabel: 'Jetzt lernen' }
  }

  // 18. 3+ days gap — streak broken
  if (daysSinceStudy >= 3 && appStats.streak > 0) {
    return { icon: <BoltIcon />, gradient: 'linear-gradient(145deg, #FF3B30, #C0392B)', urgency: 'normal',
      title: 'Streak unterbrochen',
      subtitle: `${daysSinceStudy} Tage Pause — starte neu mit einer kurzen Probeklausur.`,
      actionPath: '/klausurmodus/probeklausur', actionLabel: 'Streak wiederbeleben' }
  }

  // 19. Flashcards available — not studied in 3 days
  const totalFlash = flashCards.length
  if (totalFlash >= 5 && daysSinceStudy >= 3) {
    return { icon: <CardIcon />, gradient: 'linear-gradient(145deg, #7C3AED, #4C1D95)', urgency: 'normal',
      title: `${totalFlash} Karteikarten warten`,
      subtitle: 'Deine Karteikarten wurden zuletzt vor einigen Tagen gelernt.',
      actionPath: '/klausurmodus/lernen', actionLabel: 'Jetzt lernen' }
  }

  // 20. Trend down — last 2 exams declining
  if (trendDown && lastTwo.length === 2) {
    const lastSubj = SUBJECT_INFO[lastTwo[1].subjectId]?.name ?? lastTwo[1].subjectId
    return { icon: <AlertIcon />, gradient: 'linear-gradient(145deg, #FF9500, #E07008)', urgency: 'normal',
      title: `Grundlagen ${lastSubj} wiederholen`,
      subtitle: `Deine letzten 2 Probeklausuren zeigen einen Abwärtstrend — fokussiere AFB I.`,
      actionPath: '/klausurmodus/probeklausur/afb-trainer', actionLabel: 'AFB I Trainer' }
  }

  // 21. Last Probeklausur very low (< 6 NP)
  const lastPk = [...savedProbeklausuren].slice(-1)[0]
  if (lastPk && lastPk.totalNP < 6) {
    const lastSubj = SUBJECT_INFO[lastPk.subjectId]?.name ?? lastPk.subjectId
    return { icon: <BookIcon />, gradient: 'linear-gradient(145deg, #FF9500, #E07008)', urgency: 'normal',
      title: `Lücken in ${lastSubj}`,
      subtitle: `Letzte Probeklausur: ${lastPk.totalNP} NP — Lernzettel erstellen und Grundlagen wiederholen.`,
      actionPath: '/klausurmodus/lernzettel/neu', actionLabel: 'Lernzettel erstellen' }
  }

  // 22. Subject with > 10 Smart Notes — suggest Probeklausur
  const richSubject = faecher.find((sid) => notesFor(sid) > 10)
  if (richSubject) {
    const subj = SUBJECT_INFO[richSubject]?.name ?? richSubject
    return { icon: <ClipboardIcon />, gradient: 'linear-gradient(145deg, #0891B2, #065666)', urgency: 'low',
      title: `Probeklausur ${subj}`,
      subtitle: `Du hast ${notesFor(richSubject)} Smart Notes — teste dein Wissen mit einer Probeklausur.`,
      actionPath: '/klausurmodus/probeklausur', actionLabel: 'Probeklausur starten' }
  }

  // 23. No Klausur in next 14 days — productive suggestion
  if (!nextExam || nextExam.days > 14) {
    if (weakest) {
      return { icon: <BookIcon />, gradient: 'linear-gradient(145deg, #5AC8FA, #007BB8)', urgency: 'low',
        title: `Nutze die Zeit: ${weakest.name}`,
        subtitle: `Keine Klausur in Sicht — perfekt um Schwächen aufzuholen.`,
        actionPath: '/klausurmodus/lernzettel/neu', actionLabel: 'Lernzettel erstellen' }
    }
  }

  // 24. Above Zielnote — positive
  if (gesamtnote !== null && zielnote !== null && gesamtnote <= zielnote - 0.4) {
    return { icon: <TrophyIcon />, gradient: 'linear-gradient(145deg, #34C759, #1A7A32)', urgency: 'low',
      title: 'Du liegst über deiner Zielnote!',
      subtitle: `Schnitt ${profile.abiGesamtnote} · Ziel ${profile.zielnote} — weiter so.`,
      actionPath: '/abi-rechner', actionLabel: 'Noten ansehen' }
  }

  // 25. Below Zielnote
  if (gesamtnote !== null && zielnote !== null && gesamtnote >= zielnote + 0.4) {
    return { icon: <StarIcon />, gradient: 'linear-gradient(145deg, #7C3AED, #4C1D95)', urgency: 'low',
      title: `Zielnote ${profile.zielnote} ist erreichbar`,
      subtitle: `Aktueller Schnitt: ${profile.abiGesamtnote} — noch ${(gesamtnote - zielnote).toFixed(1)} Notenpunkte aufholen.`,
      actionPath: '/abi-rechner', actionLabel: 'Rechner öffnen' }
  }

  // 26. Has Lernzettel — suggest reviewing them
  if (lernzettel.length > 0) {
    return { icon: <BookIcon />, gradient: 'linear-gradient(145deg, #5AC8FA, #007BB8)', urgency: 'low',
      title: `Lernzettel wiederholen`,
      subtitle: `${lernzettel.length} Lernzettel verfügbar — kurze Wiederholung festigt das Wissen.`,
      actionPath: '/klausurmodus/lernzettel', actionLabel: 'Lernzettel öffnen' }
  }

  // 27. No Klausurtermin set
  if (klausurtermine.length === 0) {
    return { icon: <CalendarIcon />, gradient: 'linear-gradient(145deg, #5AC8FA, #007BB8)', urgency: 'low',
      title: 'Klausurtermin eintragen',
      subtitle: 'Trage deine nächste Klausur ein — dann bekommst du gezielte Lernvorschläge.',
      actionPath: '/klausurmodus', actionLabel: 'Klausurmodus öffnen' }
  }

  // 28. Yesterday — keep streak
  if (daysSinceStudy === 1 && nextExam) {
    return { icon: <BoltIcon />, gradient: 'linear-gradient(145deg, #FF9F0A, #E07008)', urgency: 'low',
      title: `Streak halten: ${streak} Tag${streak === 1 ? '' : 'e'}`,
      subtitle: `${nextExamName} in ${nextExam.days} Tagen — heute weiterlernen.`,
      actionPath: '/klausurmodus', actionLabel: 'Lernen starten' }
  }

  // 29. 0 Smart Notes total
  if (totalNotes === 0) {
    return { icon: <CameraIcon />, gradient: 'linear-gradient(145deg, #7C3AED, #4C1D95)', urgency: 'low',
      title: 'Erste Smart Note erfassen',
      subtitle: 'Scanne deine Unterlagen — die KI erstellt daraus Lernmaterial.',
      actionPath: '/unterricht', actionLabel: 'Unterricht öffnen' }
  }

  // 30. Fallback — suggest Probeklausur for next subject
  if (nextExam) {
    return { icon: <ClipboardIcon />, gradient: 'linear-gradient(145deg, #0891B2, #065666)', urgency: 'low',
      title: `Probeklausur ${nextExamName}`,
      subtitle: `${nextExam.days} Tag${nextExam.days === 1 ? '' : 'e'} bis zur Klausur — Wissen testen.`,
      actionPath: '/klausurmodus/probeklausur', actionLabel: 'Probeklausur starten' }
  }

  return null
}

export function LernvorschlagWidget() {
  const navigate = useNavigate()
  const { profile, appStats, userNotes, generatedFlashCards, lernzettel, savedProbeklausuren, lernplaene } = useUser()

  const suggestion = useMemo(
    () => computeSuggestion(profile, appStats, userNotes, generatedFlashCards, lernzettel, savedProbeklausuren, lernplaene),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile, appStats.streak, appStats.lastStudyDate, appStats.examScores.length, userNotes.length, generatedFlashCards.length, lernzettel.length, savedProbeklausuren.length, lernplaene.length]
  )

  if (!suggestion) return null

  const urgencyBorder = suggestion.urgency === 'critical' ? 'border-danger/25' : suggestion.urgency === 'normal' ? 'border-border/60' : 'border-border/60'

  return (
    <button
      onClick={() => navigate(suggestion.actionPath)}
      className={`w-full bg-surface rounded-card shadow-card-adaptive border ${urgencyBorder} p-4 text-left press flex items-start gap-3.5`}
    >
      <div
        className="w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0"
        style={{ background: suggestion.gradient }}
      >
        {suggestion.icon}
      </div>
      <div className="flex-1 min-w-0 py-0.5">
        <p className="font-bold text-[15px] text-text-primary leading-snug">{suggestion.title}</p>
        <p className="text-text-secondary text-[12px] mt-1 leading-snug">{suggestion.subtitle}</p>
        <div className="mt-2.5 inline-flex items-center gap-1">
          <span
            className="text-[12px] font-semibold px-3 py-1 rounded-pill"
            style={{ background: suggestion.gradient, color: 'white' }}
          >
            {suggestion.actionLabel}
          </span>
        </div>
      </div>
    </button>
  )
}
