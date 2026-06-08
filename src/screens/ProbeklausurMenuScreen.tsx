import { useNavigate, useLocation } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { SUBJECT_INFO } from '../data/subjectInfo'

interface ProbeklausurPrefill {
  subjectId: string
  subjectName: string
  topics: string[]
  sourceNoteIds: string[]
}

const MODES_FULL = [
  {
    id: 2,
    route: '/klausurmodus/probeklausur/vollstaendige-klausur',
    gradient: 'linear-gradient(145deg, #0891B2, #065666)',
    title: 'Vollständige Klausur',
    subtitle: 'Realistische Klausur-Simulation',
    description: 'Eine komplette 90-Minuten-Klausur mit AFB I–III, 2–3 Materialien und echter Zeitgrenzen — genau wie im echten Abitur.',
    badges: ['90 Minuten', '3–5 Aufgaben', 'KI-Korrektur'],
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
      </svg>
    ),
  },
  {
    id: 1,
    route: '/klausurmodus/probeklausur/afb-trainer',
    gradient: 'linear-gradient(145deg, #7C3AED, #4C1D95)',
    title: 'AFB-Aufgabentrainer',
    subtitle: 'Einzelne Aufgabe gezielt üben',
    description: 'Du wählst das AFB-Level (I, II oder III) und bekommst genau eine präzise Abituraufgabe auf diesem Niveau — mit passenden Materialien wenn nötig.',
    badges: ['1 Aufgabe', 'AFB I / II / III', 'KI-Korrektur'],
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
  },
]

const MODES_HALF = [
  {
    id: 3,
    route: '/klausurmodus/probeklausur/materialklausur',
    gradient: 'linear-gradient(145deg, #059669, #064E3B)',
    title: 'Materialklausur',
    subtitle: 'Alle drei AFB zu einem Material',
    badges: ['1–3 Materialien', 'AFB I + II + III', 'KI-Korrektur'],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
      </svg>
    ),
  },
  {
    id: 4,
    route: '/klausurmodus/probeklausur/ohne-material',
    gradient: 'linear-gradient(145deg, #DB2777, #9D174D)',
    title: 'Ohne Material',
    subtitle: 'Alles aus dem Kopf',
    badges: ['Kein Material', 'AFB I + II + III', 'KI-Korrektur'],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" /><circle cx="12" cy="17" r="0.5" fill="white" />
        <circle cx="12" cy="12" r="10" />
      </svg>
    ),
  },
]

const MODE_ROUTE: Record<number, string> = {
  1: '/klausurmodus/probeklausur/afb-trainer',
  2: '/klausurmodus/probeklausur/vollstaendige-klausur',
  3: '/klausurmodus/probeklausur/materialklausur',
  4: '/klausurmodus/probeklausur/ohne-material',
}

const MODE_LABEL: Record<number, string> = {
  1: 'AFB-Trainer',
  2: 'Vollständige Klausur',
  3: 'Materialklausur',
  4: 'Ohne Material',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: '2-digit' })
}

function npColor(np: number): string {
  if (np >= 13) return '#34D399'
  if (np >= 10) return '#60A5FA'
  if (np >= 7) return '#FACC15'
  if (np >= 4) return '#FB923C'
  return '#F87171'
}

export function ProbeklausurMenuScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const prefill = (location.state as { prefill?: ProbeklausurPrefill } | null)?.prefill ?? null
  const { inProgressProbeklausuren, deleteInProgressProbeklausur, savedProbeklausuren, deleteSavedProbeklausur } = useUser()

  return (
    <div className="flex flex-col min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="px-5" style={{ paddingTop: 'max(58px, calc(env(safe-area-inset-top, 0px) + 18px))' }}>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-accent text-[14px] font-semibold mb-4 press-sm"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Zurück
        </button>
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-[28px] font-bold text-text-primary">Probeklausur</h1>
            <p className="text-[13px] text-text-muted mt-0.5">
              KI-generiert · AFB I–III · Abitur-konform
            </p>
          </div>
          <button
            onClick={() => navigate('/klausurmodus/probeklausur/retrospektive')}
            className="flex items-center gap-1.5 text-text-muted text-[13px] font-medium press-sm pb-0.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 8v4l3 3" /><circle cx="12" cy="12" r="10" />
            </svg>
            Verlauf
          </button>
        </div>
      </div>

      <div className="px-5 mt-5 space-y-3">

        {/* Lernzettel context banner */}
        {prefill && (
          <div className="bg-[#5AC8FA]/10 border border-[#5AC8FA]/30 rounded-[16px] p-3.5 flex items-start gap-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5AC8FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6M9 13h6M9 17h4" />
            </svg>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-[#5AC8FA]">Basierend auf Lernzettel</p>
              <p className="text-[12px] text-text-secondary mt-0.5">
                <span className="font-medium">{prefill.subjectName}</span>
                {prefill.topics.length > 0 && ` · ${prefill.topics.slice(0, 2).join(', ')}${prefill.topics.length > 2 ? ' …' : ''}`}
              </p>
            </div>
          </div>
        )}

        {/* Full-width cards: Vollständige Klausur + AFB-Aufgabentrainer */}
        {MODES_FULL.map((mode) => (
          <button
            key={mode.id}
            onClick={() => navigate(mode.route, { state: prefill ? { prefill } : undefined })}
            className="w-full bg-surface rounded-[20px] shadow-card-adaptive border border-border/60 p-5 text-left press"
          >
            {/* Top row */}
            <div className="flex items-start gap-4 mb-3.5">
              <div
                className="w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0"
                style={{ background: mode.gradient }}
              >
                {mode.icon}
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-text-primary font-bold text-[16px] leading-tight">{mode.title}</p>
                <p className="text-text-muted text-[12px] mt-0.5">{mode.subtitle}</p>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" className="text-text-muted shrink-0 mt-1">
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            {/* Description */}
            <p className="text-text-secondary text-[13px] leading-relaxed mb-3.5">
              {mode.description}
            </p>

            {/* Badges */}
            <div className="flex flex-wrap gap-1.5">
              {mode.badges.map((badge) => (
                <span
                  key={badge}
                  className="px-2.5 py-1 rounded-pill text-[11px] font-semibold bg-background text-text-secondary"
                >
                  {badge}
                </span>
              ))}
            </div>
          </button>
        ))}

        {/* Half-width cards side by side: Materialklausur + Ohne Material */}
        <div className="flex gap-3">
          {MODES_HALF.map((mode) => (
            <button
              key={mode.id}
              onClick={() => navigate(mode.route, { state: prefill ? { prefill } : undefined })}
              className="flex-1 bg-surface rounded-[20px] shadow-card-adaptive border border-border/60 p-4 flex flex-col text-left press"
            >
              <div
                className="w-10 h-10 rounded-[12px] flex items-center justify-center mb-3 shrink-0"
                style={{ background: mode.gradient }}
              >
                {mode.icon}
              </div>
              <p className="text-text-primary font-bold text-[15px] leading-tight">{mode.title}</p>
              <p className="text-text-muted text-[12px] mt-1 leading-snug flex-1">{mode.subtitle}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {mode.badges.map((badge) => (
                  <span
                    key={badge}
                    className="px-2 py-0.5 rounded-pill text-[10px] font-semibold bg-background text-text-secondary"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>

        {/* Info footer */}
        <div className="bg-surface rounded-[16px] border border-border/60 p-4 flex items-start gap-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" className="text-accent shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="3" />
          </svg>
          <p className="text-text-muted text-[12px] leading-relaxed">
            Alle Modi folgen den Niedersächsischen Abitur-Regeln: Operatoren, BE-Angaben, AFB-Progression und fachspezifische Aufgabentypen.
          </p>
        </div>

        {/* ── Angefangene Klausuren ─────────────────────────────────────── */}
        {inProgressProbeklausuren.length > 0 && (
          <div>
            <p className="section-label px-1 mb-2.5">Angefangene Klausuren</p>
            <div className="bg-surface border border-border/60 rounded-[20px] shadow-card-adaptive overflow-hidden">
              {inProgressProbeklausuren.map((pk, i) => {
                const info = SUBJECT_INFO[pk.subjectId]
                const answerCount = Object.values(pk.userAnswers).filter(Boolean).length
                const totalTasks = pk.exam.tasks.length
                return (
                  <div
                    key={pk.id}
                    className={`flex items-center gap-3 px-4 py-3.5 ${i < inProgressProbeklausuren.length - 1 ? 'border-b border-border/40' : ''}`}
                  >
                    <div
                      className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0 text-[19px]"
                      style={{ background: (info?.color ?? '#7C3AED') + '20' }}
                    >
                      {info?.icon ?? '📋'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-text-primary font-semibold text-[14px] truncate">{pk.subjectName}</p>
                      <p className="text-text-muted text-[11px] mt-0.5">
                        {MODE_LABEL[pk.mode]} · {answerCount}/{totalTasks} bearbeitet · {fmtDate(pk.startedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => deleteInProgressProbeklausur(pk.id)}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted press-sm"
                        style={{ background: 'rgba(239,68,68,0.1)' }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" />
                        </svg>
                      </button>
                      <button
                        onClick={() => navigate(MODE_ROUTE[pk.mode], { state: { resume: pk } })}
                        className="px-3 py-1.5 rounded-pill text-white text-[12px] font-semibold press-sm"
                        style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)' }}
                      >
                        Fortfahren →
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Erledigte Klausuren ───────────────────────────────────────── */}
        {savedProbeklausuren.length > 0 && (
          <div>
            <p className="section-label px-1 mb-2.5">Erledigte Klausuren</p>
            <div className="bg-surface border border-border/60 rounded-[20px] shadow-card-adaptive overflow-hidden">
              {[...savedProbeklausuren]
                .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
                .map((pk, i, arr) => {
                  const info = SUBJECT_INFO[pk.subjectId]
                  return (
                    <div
                      key={pk.id}
                      className={`flex items-center gap-3 px-4 py-3.5 ${i < arr.length - 1 ? 'border-b border-border/40' : ''}`}
                    >
                      <div
                        className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0 text-[19px]"
                        style={{ background: (info?.color ?? '#7C3AED') + '20' }}
                      >
                        {info?.icon ?? '📋'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-text-primary font-semibold text-[13px] truncate">{pk.topic}</p>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold text-emerald-400 bg-emerald-400/10 shrink-0">
                            Erledigt
                          </span>
                        </div>
                        <p className="text-text-muted text-[11px] mt-0.5">
                          {pk.subjectName} · {MODE_LABEL[pk.mode]} · {fmtDate(pk.completedAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="px-2.5 py-1 rounded-full text-white text-[11px] font-bold" style={{ background: npColor(pk.totalNP) }}>
                          {pk.totalNP}/15
                        </div>
                        <button
                          onClick={() => deleteSavedProbeklausur(pk.id)}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-text-muted press-sm"
                          style={{ background: 'rgba(239,68,68,0.1)' }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
