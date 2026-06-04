import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { subjects, topics } from '../data/mockData'
import { generateMode2Exam, correctExam } from '../lib/gemini'
import type { GeneratedExam, ExamCorrection } from '../types'

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
  const prefill = (location.state as { prefill?: ProbeklausurPrefill } | null)?.prefill ?? null
  const { profile, getKc } = useUser()

  const userSubjects = subjects.filter((s) => profile?.faecher?.includes(s.id))
  const displaySubjects = userSubjects.length > 0 ? userSubjects : subjects.slice(0, 6)

  const [phase, setPhase] = useState<Phase>('setup')
  const [subjectId, setSubjectId] = useState(prefill?.subjectId ?? displaySubjects[0]?.id ?? '')
  const [topic, setTopic] = useState(prefill?.topics[0] ?? '')
  const [exam, setExam] = useState<GeneratedExam | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [correction, setCorrection] = useState<ExamCorrection | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showTimerExpiredBanner, setShowTimerExpiredBanner] = useState(false)

  const selectedSubject = subjects.find((s) => s.id === subjectId)
  const subjectTopics = topics.filter((t) => t.subjectId === subjectId).slice(0, 6)

  const timer = useTimer(90 * 60)

  useEffect(() => {
    if (timer.isExpired && phase === 'exam') setShowTimerExpiredBanner(true)
  }, [timer.isExpired, phase])

  async function handleGenerate() {
    if (!subjectId || !topic.trim()) return
    setError(null)
    setPhase('loading')
    try {
      const generated = await generateMode2Exam(selectedSubject?.name ?? subjectId, subjectId, topic.trim(), getKc(subjectId) ?? undefined)
      setExam(generated)
      setAnswers({})
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler')
      setPhase('exam')
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="px-4 pt-12 pb-4 border-b border-border/60 bg-surface/80">
        <div className="flex items-center gap-3">
          <button
            onClick={() => phase === 'setup' || phase === 'loading'
              ? navigate('/klausurmodus/probeklausur')
              : setPhase('setup')}
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
                placeholder="z.B. Neurobiologie, Kondensator…"
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
              onClick={() => navigate('/klausurmodus/probeklausur')}
              className="flex-1 py-4 rounded-[16px] text-white text-[15px] font-bold press"
              style={{ background: ACCENT }}
            >
              Menü
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
