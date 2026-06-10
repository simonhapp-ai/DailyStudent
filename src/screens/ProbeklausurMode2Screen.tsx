import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { subjects, topics } from '../data/mockData'
import { getTopicPlaceholder } from '../data/subjectInfo'
import { generateMode2Exam, correctExam } from '../lib/gemini'
import { BottomSheet } from '../components/ui/BottomSheet'
import { ProModal } from '../components/ui/ProModal'
import type { GeneratedExam, ExamCorrection, SavedProbeklausur, InProgressProbeklausur } from '../types'

interface ProbeklausurPrefill {
  subjectId: string
  subjectName: string
  topics: string[]
  sourceNoteIds: string[]
}

// ── Shared helpers (same as Mode 1, duplicated to keep screens self-contained)

const AFB_COLORS: Record<string, string> = {
  I:   'bg-blue-500/15 text-blue-400',
  II:  'bg-amber-500/15 text-amber-400',
  III: 'bg-purple-500/15 text-purple-400',
}
const ACCENT = 'linear-gradient(145deg, #0891B2, #065666)'
const ACCENT_SOLID = '#0891B2'

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
  task, answer, onChange, index,
}: { task: GeneratedExam['tasks'][0]; answer: string; onChange: (v: string) => void; index: number }) {
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
        placeholder={`Antwort zu Aufgabe ${task.label}…`}
        rows={index === 0 ? 8 : 6}
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
          <span className="text-text-muted text-[11px] font-semibold uppercase tracking-wide">Aufg. {task.label}</span>
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
              {correction.errors.map((e, i) => <p key={i} className="text-[13px] text-text-secondary mb-1">· {e}</p>)}
            </div>
          )}
          {correction.gaps.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-warning mb-1.5 uppercase tracking-wide">Lücken</p>
              {correction.gaps.map((g, i) => <p key={i} className="text-[13px] text-text-secondary mb-1">· {g}</p>)}
            </div>
          )}
          {correction.formulationHelp.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-accent mb-1.5 uppercase tracking-wide">Formulierungshilfen</p>
              {correction.formulationHelp.map((f, i) => <p key={i} className="text-[13px] text-text-secondary mb-1">· {f}</p>)}
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

// ── Timer hook ─────────────────────────────────────────────────────────────

function useTimer(totalSeconds: number) {
  const [remaining, setRemaining] = useState(totalSeconds)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function start() { setRunning(true) }
  function pause() { setRunning(false) }
  function reset() { setRemaining(totalSeconds); setRunning(false) }

  useEffect(() => {
    if (!running) { if (intervalRef.current) clearInterval(intervalRef.current); return }
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) { clearInterval(intervalRef.current!); setRunning(false); return 0 }
        return r - 1
      })
    }, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running])

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')
  const display = `${mm}:${ss}`
  const isWarning = remaining <= 600 && remaining > 0  // under 10 min
  const isExpired = remaining === 0

  return { display, remaining, running, isWarning, isExpired, start, pause, reset }
}

// ── Main screen ────────────────────────────────────────────────────────────

type Phase = 'setup' | 'loading' | 'exam' | 'correcting' | 'result'

export function ProbeklausurMode2Screen() {
  const navigate = useNavigate()
  const location = useLocation()
  const prefill = (location.state as { prefill?: ProbeklausurPrefill; resume?: InProgressProbeklausur } | null)?.prefill ?? null
  const resume = (location.state as { prefill?: ProbeklausurPrefill; resume?: InProgressProbeklausur } | null)?.resume ?? null
  const { profile, getKc, saveProbeklausur, saveInProgressProbeklausur, deleteInProgressProbeklausur, savedProbeklausuren, isPro } = useUser()
  const inProgressIdRef = useRef<string | null>(resume?.id ?? null)
  const resumeStartedAt = useMemo(() => resume?.startedAt ?? new Date().toISOString(), [])

  const userSubjects = subjects.filter((s) => profile?.faecher?.includes(s.id))
  const displaySubjects = userSubjects.length > 0 ? userSubjects : subjects.slice(0, 6)

  const [phase, setPhase] = useState<Phase>(resume ? 'exam' : 'setup')
  const [subjectId, setSubjectId] = useState(resume?.subjectId ?? prefill?.subjectId ?? displaySubjects[0]?.id ?? '')
  const [topic, setTopic] = useState(resume?.topic ?? prefill?.topics[0] ?? '')
  const [exam, setExam] = useState<GeneratedExam | null>(resume?.exam ?? null)
  const [answers, setAnswers] = useState<Record<string, string>>(resume?.userAnswers ?? {})
  const [correction, setCorrection] = useState<ExamCorrection | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showTimerExpiredBanner, setShowTimerExpiredBanner] = useState(false)
  const [showExitWarning, setShowExitWarning] = useState(false)
  const [showProModal, setShowProModal] = useState(false)

  const today = new Date().toISOString().slice(0, 10)
  const todayMode2Count = savedProbeklausuren.filter(pk => pk.mode === 2 && pk.completedAt?.slice(0, 10) === today).length

  const selectedSubject = subjects.find((s) => s.id === subjectId)
  const subjectTopics = topics.filter((t) => t.subjectId === subjectId).slice(0, 6)

  const timer = useTimer(90 * 60)

  useEffect(() => {
    if (timer.isExpired && phase === 'exam') setShowTimerExpiredBanner(true)
  }, [timer.isExpired, phase])

  async function handleGenerate() {
    if (!subjectId || !topic.trim()) return
    if (!isPro && todayMode2Count >= 1) { setShowProModal(true); return }
    setError(null)
    setPhase('loading')
    try {
      const generated = await generateMode2Exam(selectedSubject?.name ?? subjectId, subjectId, topic.trim(), getKc(subjectId) ?? undefined)
      setExam(generated)
      setAnswers({})
      inProgressIdRef.current = `ip-2-${subjectId}-${Date.now()}`
      timer.reset()
      setPhase('exam')
      timer.start()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler')
      setPhase('setup')
    }
  }

  async function handleSubmit() {
    if (!exam) return
    timer.pause()
    setShowTimerExpiredBanner(false)
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

  function handlePause() {
    if (!exam || !inProgressIdRef.current) { navigate(-1); return }
    saveInProgressProbeklausur({
      id: inProgressIdRef.current,
      mode: 2,
      subjectId: exam.subjectId,
      subjectName: exam.subject,
      topic: exam.topic,
      exam,
      userAnswers: answers,
      startedAt: resumeStartedAt,
    })
    setShowExitWarning(false)
    navigate(-1)
  }

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
          <div className="flex-1">
            <p className="text-text-primary font-bold text-[17px]">Vollständige Klausur</p>
            <p className="text-text-muted text-[12px]">
              {phase === 'setup' && '90 Minuten · Fachspezifische Struktur'}
              {phase === 'loading' && 'KI generiert die Klausur…'}
              {phase === 'exam' && `${exam?.subject} · ${exam?.totalBE} BE gesamt`}
              {phase === 'correcting' && 'KI korrigiert…'}
              {phase === 'result' && `Ergebnis · ${correction?.gradeLabel}`}
            </p>
          </div>

          {/* Timer (only during exam) */}
          {phase === 'exam' && (
            <button
              onClick={() => timer.running ? timer.pause() : timer.start()}
              className="flex items-center gap-2 bg-surface border border-border rounded-[12px] px-3 py-2 press-sm"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                style={{ color: timer.isWarning ? '#F87171' : ACCENT_SOLID }}>
                <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" strokeLinecap="round" />
              </svg>
              <span
                className="text-[14px] font-mono font-bold"
                style={{ color: timer.isWarning ? '#F87171' : 'inherit' }}
              >
                {timer.display}
              </span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
                className="text-text-muted">
                {timer.running
                  ? <><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></>
                  : <polygon points="5 3 19 12 5 21 5 3" />}
              </svg>
            </button>
          )}

          {phase === 'result' && correction && (
            <div className="px-3 py-1 rounded-pill text-white text-[13px] font-bold"
              style={{ backgroundColor: npColor(correction.totalNP) }}>
              {correction.totalNP}/15 NP
            </div>
          )}
        </div>
      </div>

      {/* Timer expired banner */}
      {showTimerExpiredBanner && (
        <div className="mx-4 mt-3 bg-danger/15 border border-danger/40 rounded-[14px] px-4 py-3 flex items-center justify-between">
          <p className="text-danger text-[13px] font-semibold">Zeit abgelaufen! Jetzt abgeben.</p>
          <button onClick={handleSubmit} className="text-danger text-[13px] font-bold underline press-sm">
            Abgeben
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 px-4 py-5 overflow-y-auto">

        {/* SETUP */}
        {phase === 'setup' && (
          <div className="space-y-5">
            <div>
              <p className="text-text-muted text-[11px] font-semibold uppercase tracking-wide mb-2.5">Fach</p>
              <div className="flex flex-wrap gap-2">
                {displaySubjects.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setSubjectId(s.id); setTopic('') }}
                    className={`px-4 py-2 rounded-pill text-[13px] font-semibold press-sm ${
                      subjectId === s.id ? 'text-white' : 'bg-surface border border-border text-text-secondary'
                    }`}
                    style={subjectId === s.id ? { background: ACCENT } : undefined}
                  >
                    {s.icon} {s.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-text-muted text-[11px] font-semibold uppercase tracking-wide mb-2.5">Thema</p>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={getTopicPlaceholder(subjectId)}
                className="w-full bg-surface border border-border rounded-[14px] px-4 py-3 text-[14px] text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
              />
              {subjectTopics.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {subjectTopics.map((t) => (
                    <button key={t.id} onClick={() => setTopic(t.name)}
                      className="px-3 py-1.5 rounded-pill text-[11px] font-medium bg-surface border border-border text-text-secondary press-sm">
                      {t.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* What to expect */}
            <div className="bg-surface rounded-[14px] border border-border/60 p-4 space-y-2.5">
              <p className="text-text-secondary text-[12px] font-bold">Was erwartet dich:</p>
              {[
                { icon: '⏱', text: '90-Minuten-Countdown startet automatisch' },
                { icon: '📋', text: '3–5 Teilaufgaben mit AFB I→II→III Progression' },
                { icon: '📊', text: '2–3 Materialien (Tabellen, Diagramme, Texte)' },
                { icon: '🤖', text: 'KI-Korrektur mit Fehlern, Lücken & Note' },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-start gap-2.5">
                  <span className="text-[14px]">{icon}</span>
                  <p className="text-text-secondary text-[12px]">{text}</p>
                </div>
              ))}
            </div>

            {error && (
              <div className="bg-danger/10 border border-danger/30 rounded-[14px] p-4">
                <p className="text-danger text-[13px] font-semibold mb-1">Fehler</p>
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
              {phase === 'loading' ? 'KI generiert die Klausur…' : 'KI korrigiert alle Aufgaben…'}
            </p>
            <p className="text-text-muted text-[12px]">Das kann 10–20 Sekunden dauern</p>
          </div>
        )}

        {/* EXAM */}
        {phase === 'exam' && exam && (
          <div>
            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-text-muted text-[11px] font-semibold">{exam.tasks.length} Aufgaben · {exam.totalBE} BE</p>
                <p className="text-text-muted text-[11px]">
                  {Object.values(answers).filter((a) => a.trim()).length}/{exam.tasks.length} beantwortet
                </p>
              </div>
              <div className="h-1.5 bg-border/40 rounded-pill overflow-hidden">
                <div
                  className="h-full rounded-pill transition-all"
                  style={{
                    width: `${(Object.values(answers).filter((a) => a.trim()).length / Math.max(1, exam.tasks.length)) * 100}%`,
                    background: ACCENT,
                  }}
                />
              </div>
            </div>

            {exam.materials.map((m) => <MaterialCard key={m.id} m={m} />)}
            {exam.tasks.map((t, i) => (
              <TaskAnswerCard
                key={t.id}
                task={t}
                index={i}
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
            <div className="rounded-[18px] p-5 mb-4 text-center" style={{ background: ACCENT }}>
              <p className="text-white/70 text-[12px] font-semibold uppercase tracking-wide mb-1">Ergebnis</p>
              <p className="text-white text-[48px] font-black leading-none">{correction.totalNP}</p>
              <p className="text-white/80 text-[13px] mt-1">von 15 Notenpunkten · {correction.gradeLabel}</p>
            </div>

            {isPro ? (
              <>
                {correction.overallJustification && (
                  <div className="bg-surface rounded-[14px] border border-border/60 p-4 mb-4">
                    <p className="text-text-muted text-[11px] font-semibold uppercase tracking-wide mb-1.5">Gesamtbewertung</p>
                    <p className="text-text-secondary text-[13px] leading-relaxed">{correction.overallJustification}</p>
                  </div>
                )}
                <p className="text-text-muted text-[11px] font-semibold uppercase tracking-wide mb-2.5">Details pro Aufgabe</p>
                {exam.tasks.map((t) => {
                  const c = correction.taskCorrections.find((tc) => tc.taskId === t.id)
                  if (!c) return null
                  return <CorrectionCard key={t.id} task={t} correction={c} />
                })}
              </>
            ) : (
              <div className="mt-2 rounded-[18px] border border-accent/20 overflow-hidden" style={{ background: 'rgba(124,58,237,0.04)' }}>
                <div className="p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0" style={{ background: 'rgba(124,58,237,0.15)' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[15px] font-bold text-text-primary">KI-Korrektur freischalten</p>
                      <p className="text-[12px] text-text-muted">Pro-Feature · Sieh genau was gefehlt hat</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {[
                      { icon: '🔴', label: 'Fehleranalyse', desc: 'Konkrete Fehler in deiner Antwort' },
                      { icon: '🟡', label: 'Lücken', desc: 'Welche Inhalte noch gefehlt haben' },
                      { icon: '💬', label: 'Formulierungshilfen', desc: 'Bessere Formulierungen für die Klausur' },
                      { icon: '📊', label: 'Gesamtbewertung', desc: 'Detailliertes Fazit der KI pro Aufgabe' },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-3 px-3 py-2.5 rounded-[12px]" style={{ background: 'var(--color-surface)' }}>
                        <span className="text-[15px]">{item.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-text-primary">{item.label}</p>
                          <p className="text-[11px] text-text-muted">{item.desc}</p>
                        </div>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted shrink-0">
                          <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setShowProModal(true)}
                    className="w-full py-3 rounded-[14px] text-white text-[14px] font-bold press-sm"
                    style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)' }}
                  >
                    Pro freischalten · €5/Mo
                  </button>
                </div>
              </div>
            )}
            <ProModal feature="ki-korrektur" isOpen={showProModal} onClose={() => setShowProModal(false)} />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 pb-8 pt-3 border-t border-border/60 bg-surface/80">
        {phase === 'setup' && (
          <button
            onClick={handleGenerate}
            disabled={!subjectId || !topic.trim()}
            className="w-full py-4 rounded-[16px] text-white text-[15px] font-bold press disabled:opacity-40"
            style={{ background: ACCENT }}
          >
            Klausur starten
          </button>
        )}
        {phase === 'exam' && (
          <button
            onClick={handleSubmit}
            className="w-full py-4 rounded-[16px] text-white text-[15px] font-bold press"
            style={{ background: ACCENT }}
          >
            Abgeben & korrigieren lassen
          </button>
        )}
        {phase === 'result' && (
          <div className="flex gap-3">
            <button
              onClick={() => { setPhase('setup'); setExam(null); setCorrection(null); timer.reset() }}
              className="flex-1 py-4 rounded-[16px] text-text-primary text-[15px] font-bold bg-surface border border-border press"
            >
              Neue Klausur
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
          <button onClick={handlePause} className="w-full py-3.5 rounded-[16px] font-semibold text-[15px] bg-surface border border-border/60 text-text-primary press">
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
