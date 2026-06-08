import { useState, useRef, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { subjects, topics } from '../data/mockData'
import { getTopicPlaceholder } from '../data/subjectInfo'
import { generateMode1Exam, correctExam } from '../lib/gemini'
import { BottomSheet } from '../components/ui/BottomSheet'
import type { GeneratedExam, ExamCorrection, SavedProbeklausur, InProgressProbeklausur } from '../types'

interface ProbeklausurPrefill {
  subjectId: string
  subjectName: string
  topics: string[]
  sourceNoteIds: string[]
}

// ── Shared helpers ─────────────────────────────────────────────────────────

const AFB_COLORS: Record<string, string> = {
  I:   'bg-blue-500/15 text-blue-400',
  II:  'bg-amber-500/15 text-amber-400',
  III: 'bg-purple-500/15 text-purple-400',
}

function npColor(np: number): string {
  if (np >= 13) return '#34D399'
  if (np >= 10) return '#60A5FA'
  if (np >= 7)  return '#FACC15'
  if (np >= 4)  return '#FB923C'
  return '#F87171'
}

function MaterialCard({ m }: { m: GeneratedExam['materials'][0] }) {
  return (
    <div className="bg-background rounded-[14px] border border-border/60 p-4 mb-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-accent/15 text-accent">{m.id}</span>
        <p className="text-text-secondary text-[12px] font-semibold">{m.title}</p>
      </div>
      <p className="text-text-primary text-[13px] whitespace-pre-wrap leading-relaxed font-mono">{m.content}</p>
    </div>
  )
}

function TaskAnswerCard({
  task, answer, onChange,
}: { task: GeneratedExam['tasks'][0]; answer: string; onChange: (v: string) => void }) {
  return (
    <div className="bg-background rounded-[14px] border border-border/60 p-4 mb-3">
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-text-muted text-[11px] font-semibold uppercase tracking-wide">Aufgabe {task.label}</span>
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${AFB_COLORS[task.afb]}`}>AFB {task.afb}</span>
        {task.materialRefs.length > 0 && (
          <span className="text-text-muted text-[11px]">· {task.materialRefs.join(', ')}</span>
        )}
        <span className="ml-auto text-text-muted text-[11px] font-semibold">{task.be} BE</span>
      </div>
      <p className="text-text-primary text-[14px] font-medium leading-relaxed mb-3">{task.text}</p>
      <textarea
        value={answer}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Schreibe deine Antwort hier…"
        rows={6}
        className="w-full bg-surface rounded-[12px] border border-border p-3 text-[13px] text-text-primary placeholder-text-muted resize-none focus:outline-none focus:border-accent transition-colors"
      />
    </div>
  )
}

function CorrectionCard({
  task, correction,
}: { task: GeneratedExam['tasks'][0]; correction: ExamCorrection['taskCorrections'][0] }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="bg-background rounded-[14px] border border-border/60 mb-3 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 press-sm"
      >
        <div className="flex items-center gap-2">
          <span className="text-text-muted text-[11px] font-semibold uppercase tracking-wide">Aufgabe {task.label}</span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${AFB_COLORS[task.afb]}`}>AFB {task.afb}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-bold" style={{ color: npColor(correction.scoreNP) }}>
            {correction.scoreNP}/15 NP
          </span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className={`text-text-muted transition-transform ${open ? 'rotate-180' : ''}`}>
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/40 pt-3">
          {correction.errors.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-danger mb-1.5 uppercase tracking-wide">Fehler</p>
              {correction.errors.map((e, i) => (
                <p key={i} className="text-[13px] text-text-secondary mb-1">· {e}</p>
              ))}
            </div>
          )}
          {correction.gaps.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-warning mb-1.5 uppercase tracking-wide">Lücken</p>
              {correction.gaps.map((g, i) => (
                <p key={i} className="text-[13px] text-text-secondary mb-1">· {g}</p>
              ))}
            </div>
          )}
          {correction.formulationHelp.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-accent mb-1.5 uppercase tracking-wide">Formulierungshilfen</p>
              {correction.formulationHelp.map((f, i) => (
                <p key={i} className="text-[13px] text-text-secondary mb-1">· {f}</p>
              ))}
            </div>
          )}
          {correction.justification && (
            <p className="text-[12px] text-text-muted leading-relaxed border-t border-border/40 pt-2">
              {correction.justification}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main screen ────────────────────────────────────────────────────────────

type Phase = 'setup' | 'loading' | 'exam' | 'correcting' | 'result'

export function ProbeklausurMode1Screen() {
  const navigate = useNavigate()
  const location = useLocation()
  const prefill = (location.state as { prefill?: ProbeklausurPrefill; resume?: InProgressProbeklausur } | null)?.prefill ?? null
  const resume = (location.state as { prefill?: ProbeklausurPrefill; resume?: InProgressProbeklausur } | null)?.resume ?? null
  const { profile, getKc, saveProbeklausur, saveInProgressProbeklausur, deleteInProgressProbeklausur } = useUser()
  const inProgressIdRef = useRef<string | null>(resume?.id ?? null)
  const resumeStartedAt = useMemo(() => resume?.startedAt ?? new Date().toISOString(), [])

  const userSubjects = subjects.filter((s) => profile?.faecher?.includes(s.id))
  const displaySubjects = userSubjects.length > 0 ? userSubjects : subjects.slice(0, 6)

  const [phase, setPhase] = useState<Phase>(resume ? 'exam' : 'setup')
  const [subjectId, setSubjectId] = useState(resume?.subjectId ?? prefill?.subjectId ?? displaySubjects[0]?.id ?? '')
  const [topic, setTopic] = useState(resume?.topic ?? prefill?.topics[0] ?? '')
  const [afb, setAfb] = useState<'I' | 'II' | 'III'>('II')
  const [exam, setExam] = useState<GeneratedExam | null>(resume?.exam ?? null)
  const [answers, setAnswers] = useState<Record<string, string>>(resume?.userAnswers ?? {})
  const [correction, setCorrection] = useState<ExamCorrection | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showExitWarning, setShowExitWarning] = useState(false)

  const selectedSubject = subjects.find((s) => s.id === subjectId)
  const subjectTopics = topics.filter((t) => t.subjectId === subjectId).slice(0, 6)

  async function handleGenerate() {
    if (!subjectId || !topic.trim()) return
    setError(null)
    setPhase('loading')
    try {
      const generated = await generateMode1Exam(
        selectedSubject?.name ?? subjectId,
        subjectId,
        topic.trim(),
        afb,
        getKc(subjectId) ?? undefined,
      )
      setExam(generated)
      setAnswers({})
      inProgressIdRef.current = `ip-1-${subjectId}-${Date.now()}`
      setPhase('exam')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler')
      setPhase('setup')
    }
  }

  async function handleSubmit() {
    if (!exam) return
    setPhase('correcting')
    try {
      const result = await correctExam(exam, answers)
      setCorrection(result)
      setPhase('result')
      const pk: SavedProbeklausur = {
        id: `pk-${exam.mode}-${exam.subjectId}-${Date.now()}`,
        mode: exam.mode,
        subjectId: exam.subjectId,
        subjectName: exam.subject,
        topic: exam.topic,
        totalNP: result.totalNP,
        gradeLabel: result.gradeLabel,
        taskResults: exam.tasks.map((t) => {
          const c = result.taskCorrections.find((tc) => tc.taskId === t.id)
          return { taskId: t.id, label: t.label, taskText: t.text, userAnswer: answers[t.id] ?? '', afb: t.afb, be: t.be, scoreNP: c?.scoreNP ?? 0, errors: c?.errors ?? [], gaps: c?.gaps ?? [], justification: c?.justification ?? '' }
        }),
        overallJustification: result.overallJustification,
        completedAt: new Date().toISOString(),
      }
      saveProbeklausur(pk)
      if (inProgressIdRef.current) deleteInProgressProbeklausur(inProgressIdRef.current)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler')
      setPhase('exam')
    }
  }

  const ACCENT = 'linear-gradient(145deg, #7C3AED, #4C1D95)'

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="px-4 pt-12 pb-4 border-b border-border/60 bg-surface/80">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (phase === 'setup' || phase === 'loading') { navigate(-1); return }
              if (phase === 'exam') { setShowExitWarning(true); return }
              navigate(-1)
            }}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-background press-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div>
            <p className="text-text-primary font-bold text-[17px]">AFB-Aufgabentrainer</p>
            <p className="text-text-muted text-[12px]">
              {phase === 'setup' && 'Fach & Thema wählen'}
              {phase === 'loading' && 'KI generiert…'}
              {phase === 'exam' && `${exam?.subject} · ${exam?.topic}`}
              {phase === 'correcting' && 'KI korrigiert…'}
              {phase === 'result' && `Ergebnis · ${correction?.gradeLabel}`}
            </p>
          </div>
          {phase === 'result' && correction && (
            <div className="ml-auto px-3 py-1 rounded-pill text-white text-[13px] font-bold"
              style={{ background: npColor(correction.totalNP) }}>
              {correction.totalNP}/15 NP
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-5 overflow-y-auto">

        {/* SETUP */}
        {phase === 'setup' && (
          <div className="space-y-5">
            {/* Subject */}
            <div>
              <p className="text-text-muted text-[11px] font-semibold uppercase tracking-wide mb-2.5">Fach</p>
              <div className="flex flex-wrap gap-2">
                {displaySubjects.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setSubjectId(s.id); setTopic('') }}
                    className={`px-4 py-2 rounded-pill text-[13px] font-semibold press-sm transition-colors ${
                      subjectId === s.id ? 'text-white' : 'bg-surface border border-border text-text-secondary'
                    }`}
                    style={subjectId === s.id ? { background: ACCENT } : undefined}
                  >
                    {s.icon} {s.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Topic */}
            <div>
              <p className="text-text-muted text-[11px] font-semibold uppercase tracking-wide mb-2.5">Thema</p>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={getTopicPlaceholder(subjectId)}
                className="w-full bg-surface border border-border rounded-[14px] px-4 py-3 text-[14px] text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
              />
              {subjectTopics.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {subjectTopics.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTopic(t.name)}
                      className="px-3 py-1.5 rounded-pill text-[11px] font-medium bg-surface border border-border text-text-secondary press-sm"
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* AFB Level */}
            <div>
              <p className="text-text-muted text-[11px] font-semibold uppercase tracking-wide mb-2.5">AFB-Level</p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { level: 'I' as const,   label: 'AFB I',   desc: 'Reproduktion', color: '#60A5FA' },
                  { level: 'II' as const,  label: 'AFB II',  desc: 'Transfer',     color: '#FACC15' },
                  { level: 'III' as const, label: 'AFB III', desc: 'Bewertung',    color: '#C084FC' },
                ] as const).map(({ level, label, desc, color }) => (
                  <button
                    key={level}
                    onClick={() => setAfb(level)}
                    className={`p-3 rounded-[14px] border text-center press-sm transition-colors ${
                      afb === level ? 'border-transparent text-white' : 'bg-surface border-border'
                    }`}
                    style={afb === level ? { background: ACCENT } : undefined}
                  >
                    <p className="text-[13px] font-bold" style={afb !== level ? { color } : undefined}>{label}</p>
                    <p className={`text-[11px] mt-0.5 ${afb === level ? 'text-white/70' : 'text-text-muted'}`}>{desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* AFB explanation */}
            <div className="bg-surface rounded-[14px] border border-border/60 p-4">
              {afb === 'I' && (
                <p className="text-text-secondary text-[13px] leading-relaxed">
                  <strong>AFB I — Reproduktion:</strong> Du gibst Fachwissen aus dem Gedächtnis wieder. Kein Material nötig. Operatoren: nennen, beschreiben, skizzieren. (4–8 BE)
                </p>
              )}
              {afb === 'II' && (
                <p className="text-text-secondary text-[13px] leading-relaxed">
                  <strong>AFB II — Transfer:</strong> Du wendest Wissen auf neue Daten oder Situationen an. Ein Material wird generiert. Operatoren: erläutern, auswerten, vergleichen. (8–12 BE)
                </p>
              )}
              {afb === 'III' && (
                <p className="text-text-secondary text-[13px] leading-relaxed">
                  <strong>AFB III — Bewertung:</strong> Du bildest ein eigenständiges Urteil oder Hypothese. Material optional. Operatoren: beurteilen, erörtern, Stellung nehmen. (8–12 BE)
                </p>
              )}
            </div>

            {error && (
              <div className="bg-danger/10 border border-danger/30 rounded-[14px] p-4">
                <p className="text-danger text-[13px] font-semibold mb-1">Fehler beim Generieren</p>
                <p className="text-danger/80 text-[12px]">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* LOADING */}
        {(phase === 'loading' || phase === 'correcting') && (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="w-10 h-10 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
            <p className="text-text-muted text-[14px]">
              {phase === 'loading' ? 'KI generiert deine Aufgabe…' : 'KI korrigiert deine Antwort…'}
            </p>
            <p className="text-text-muted text-[12px]">Einen Moment Geduld</p>
          </div>
        )}

        {/* EXAM */}
        {phase === 'exam' && exam && (
          <div>
            {exam.materials.map((m) => <MaterialCard key={m.id} m={m} />)}
            {exam.tasks.map((t) => (
              <TaskAnswerCard
                key={t.id}
                task={t}
                answer={answers[t.id] ?? ''}
                onChange={(v) => setAnswers((prev) => ({ ...prev, [t.id]: v }))}
              />
            ))}
            {error && (
              <div className="bg-danger/10 border border-danger/30 rounded-[14px] p-4 mb-3">
                <p className="text-danger text-[13px]">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* RESULT */}
        {phase === 'result' && exam && correction && (
          <div>
            {/* Grade banner */}
            <div className="rounded-[18px] p-5 mb-4 text-center" style={{ background: ACCENT }}>
              <p className="text-white/70 text-[12px] font-semibold uppercase tracking-wide mb-1">Ergebnis</p>
              <p className="text-white text-[48px] font-black leading-none">{correction.totalNP}</p>
              <p className="text-white/80 text-[13px] mt-1">von 15 Notenpunkten · {correction.gradeLabel}</p>
            </div>

            {/* Overall justification */}
            {correction.overallJustification && (
              <div className="bg-surface rounded-[14px] border border-border/60 p-4 mb-4">
                <p className="text-text-muted text-[11px] font-semibold uppercase tracking-wide mb-1.5">Gesamtbewertung</p>
                <p className="text-text-secondary text-[13px] leading-relaxed">{correction.overallJustification}</p>
              </div>
            )}

            {/* Per-task corrections */}
            <p className="text-text-muted text-[11px] font-semibold uppercase tracking-wide mb-2.5">Details pro Aufgabe</p>
            {exam.tasks.map((t) => {
              const c = correction.taskCorrections.find((tc) => tc.taskId === t.id)
              if (!c) return null
              return <CorrectionCard key={t.id} task={t} correction={c} />
            })}
          </div>
        )}
      </div>

      {/* Footer action */}
      <div className="px-4 pb-8 pt-3 border-t border-border/60 bg-surface/80">
        {phase === 'setup' && (
          <button
            onClick={handleGenerate}
            disabled={!subjectId || !topic.trim()}
            className="w-full py-4 rounded-[16px] text-white text-[15px] font-bold press disabled:opacity-40 transition-opacity"
            style={{ background: ACCENT }}
          >
            Aufgabe generieren
          </button>
        )}
        {phase === 'exam' && (
          <button
            onClick={handleSubmit}
            className="w-full py-4 rounded-[16px] text-white text-[15px] font-bold press"
            style={{ background: ACCENT }}
          >
            Abgeben & korrigieren
          </button>
        )}
        {phase === 'result' && (
          <div className="flex gap-3">
            <button
              onClick={() => { setPhase('setup'); setExam(null); setCorrection(null) }}
              className="flex-1 py-4 rounded-[16px] text-text-primary text-[15px] font-bold bg-surface border border-border press"
            >
              Neue Aufgabe
            </button>
            <button
              onClick={() => navigate(-1)}
              className="flex-1 py-4 rounded-[16px] text-white text-[15px] font-bold press"
              style={{ background: ACCENT }}
            >
              Menü
            </button>
          </div>
        )}
      </div>

      <BottomSheet isOpen={showExitWarning} onClose={() => setShowExitWarning(false)}>
        <div className="px-5 pb-2 space-y-3">
          <div className="flex flex-col items-center text-center gap-2 pt-2 pb-1">
            <div className="w-12 h-12 rounded-[16px] flex items-center justify-center" style={{ background: 'linear-gradient(145deg, #FF453A, #C0392B)' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <p className="text-[18px] font-bold text-text-primary">Klausur verlassen?</p>
            <p className="text-[13px] text-text-secondary leading-snug">Du verlässt gerade eine laufende Klausur.<br />Deine Antworten gehen verloren.</p>
          </div>
          <button
            onClick={() => {
              if (!exam || !inProgressIdRef.current) { navigate(-1); return }
              saveInProgressProbeklausur({ id: inProgressIdRef.current, mode: 1, subjectId: exam.subjectId, subjectName: exam.subject, topic: exam.topic, exam, userAnswers: answers, startedAt: resumeStartedAt })
              setShowExitWarning(false)
              navigate(-1)
            }}
            className="w-full py-3.5 rounded-[16px] font-semibold text-[15px] bg-surface border border-border/60 text-text-primary press"
          >
            Klausur pausieren — Fortschritt gespeichert
          </button>
          <button onClick={() => { setShowExitWarning(false); if (inProgressIdRef.current) deleteInProgressProbeklausur(inProgressIdRef.current); navigate(-1) }} className="w-full py-3.5 rounded-[16px] font-semibold text-[15px] text-white press mb-2" style={{ background: 'linear-gradient(145deg, #FF453A, #C0392B)' }}>
            Klausur beenden (Fortschritt gelöscht)
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}
