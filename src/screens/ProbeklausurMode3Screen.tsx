import { useState, useRef, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { Icon, type IconName } from '../components/ui/Icon'
import { ProModal } from '../components/ui/ProModal'
import { subjects, topics } from '../data/mockData'
import { getTopicPlaceholder } from '../data/subjectInfo'
import { generateMode3Exam, correctExam } from '../lib/gemini'
import { BottomSheet } from '../components/ui/BottomSheet'
import { BetaPausedScreen } from '../components/ui/BetaPausedScreen'
import type { GeneratedExam, ExamCorrection, SavedProbeklausur, InProgressProbeklausur } from '../types'

const AFB_COLORS: Record<string, string> = {
  I:   'bg-blue-500/15 text-blue-400',
  II:  'bg-amber-500/15 text-amber-400',
  III: 'bg-purple-500/15 text-purple-400',
}
const ACCENT = '#34D399'

function npColor(np: number): string {
  if (np >= 13) return '#34D399'
  if (np >= 10) return '#60A5FA'
  if (np >= 7)  return '#FACC15'
  if (np >= 4)  return '#FB923C'
  return '#F87171'
}

function MaterialCard({ m }: { m: GeneratedExam['materials'][0] }) {
  const typeLabel: Record<string, string> = {
    tabelle: 'Tabelle', diagramm: 'Diagramm', text: 'Text',
    versuchsaufbau: 'Versuchsaufbau', sequenz: 'Sequenz',
  }
  return (
    <div className="bg-background rounded-icon border border-border/60 p-4 mb-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-accent/15 text-text-primary">{m.id}</span>
        <span className="text-text-muted text-[11px] font-semibold uppercase">{typeLabel[m.type] ?? m.type}</span>
        <p className="text-text-secondary text-[12px] font-semibold truncate">{m.title}</p>
      </div>
      <p className="text-text-primary text-[13px] whitespace-pre-wrap leading-relaxed font-mono">{m.content}</p>
    </div>
  )
}

function TaskAnswerCard({
  task, answer, onChange,
}: { task: GeneratedExam['tasks'][0]; answer: string; onChange: (v: string) => void }) {
  return (
    <div className="bg-background rounded-icon border border-border/60 p-4 mb-3">
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-text-muted text-[11px] font-semibold uppercase tracking-wide">Aufgabe {task.label}</span>
        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${AFB_COLORS[task.afb]}`}>AFB {task.afb}</span>
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
        rows={task.afb === 'I' ? 5 : 7}
        className="w-full bg-surface rounded-btn border border-border p-3 text-[13px] text-text-primary placeholder-text-muted resize-none focus:outline-none focus:border-accent"
      />
    </div>
  )
}

function CorrectionCard({
  task, correction,
}: { task: GeneratedExam['tasks'][0]; correction: ExamCorrection['taskCorrections'][0] }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="bg-background rounded-icon border border-border/60 mb-3 overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between px-4 py-3 press-sm">
        <div className="flex items-center gap-2">
          <span className="text-text-muted text-[11px] font-semibold">Aufgabe {task.label}</span>
          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${AFB_COLORS[task.afb]}`}>AFB {task.afb}</span>
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
              <p className="text-[11px] font-bold text-text-primary mb-1.5 uppercase tracking-wide">Fehler</p>
              {correction.errors.map((e, i) => <p key={i} className="text-[13px] text-text-secondary mb-1">· {e}</p>)}
            </div>
          )}
          {correction.gaps.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-text-secondary mb-1.5 uppercase tracking-wide">Lücken</p>
              {correction.gaps.map((g, i) => <p key={i} className="text-[13px] text-text-secondary mb-1">· {g}</p>)}
            </div>
          )}
          {correction.formulationHelp.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-text-primary mb-1.5 uppercase tracking-wide">Formulierungshilfen</p>
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

type Phase = 'setup' | 'loading' | 'exam' | 'correcting' | 'result'

export function ProbeklausurMode3Screen() {
  const navigate = useNavigate()
  const location = useLocation()
  const resume = (location.state as { resume?: InProgressProbeklausur } | null)?.resume ?? null
  const { profile, getKc, saveProbeklausur, saveInProgressProbeklausur, deleteInProgressProbeklausur, isPro, appConfig } = useUser()
  const inProgressIdRef = useRef<string | null>(resume?.id ?? null)
  const resumeStartedAt = useMemo(() => resume?.startedAt ?? new Date().toISOString(), [])

  const userSubjects = subjects.filter((s) => profile?.faecher?.includes(s.id))
  const displaySubjects = userSubjects.length > 0 ? userSubjects : subjects.slice(0, 6)

  const [phase, setPhase] = useState<Phase>(resume ? 'exam' : 'setup')
  const [subjectId, setSubjectId] = useState(resume?.subjectId ?? displaySubjects[0]?.id ?? '')
  const [topic, setTopic] = useState(resume?.topic ?? '')
  const [exam, setExam] = useState<GeneratedExam | null>(resume?.exam ?? null)
  const [answers, setAnswers] = useState<Record<string, string>>(resume?.userAnswers ?? {})
  const [correction, setCorrection] = useState<ExamCorrection | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showExitWarning, setShowExitWarning] = useState(false)
  const [showProModal, setShowProModal] = useState(false)

  const selectedSubject = subjects.find((s) => s.id === subjectId)
  const subjectTopics = topics.filter((t) => t.subjectId === subjectId).slice(0, 6)

  async function handleGenerate() {
    if (!subjectId || !topic.trim()) return
    setError(null)
    setPhase('loading')
    try {
      const generated = await generateMode3Exam(selectedSubject?.name ?? subjectId, subjectId, topic.trim(), getKc(subjectId) ?? undefined)
      setExam(generated)
      setAnswers({})
      inProgressIdRef.current = `ip-3-${subjectId}-${Date.now()}`
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

  // Beta launch (migration 017_beta_mode_config.sql) — catches direct URL access
  // and the menu's "Fortfahren" resume button too, not just its click-gate.
  if (!appConfig.probeklausurMode3Enabled) {
    return <BetaPausedScreen title="Materialklausur" />
  }

  return (
    <div className="flex flex-col min-h-dvh bg-background">
      {/* Header */}
      <div className="px-4 pb-4 border-b border-border/60 bg-surface/80" style={{ paddingTop: 'max(58px, calc(env(safe-area-inset-top, 0px) + 18px))' }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (phase === 'setup' || phase === 'loading') { navigate(-1); return }
              if (phase === 'exam') { setShowExitWarning(true); return }
              navigate(-1)
            }}
            className="flex items-center gap-1 text-text-primary text-[14px] font-medium press-sm shrink-0 -ml-1"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Zurück
          </button>
          <div className="flex-1">
            <p className="text-text-primary font-bold text-[17px]">Materialklausur</p>
            <p className="text-text-muted text-[12px]">
              {phase === 'setup' && '1–3 Materialien · AFB I + II + III'}
              {phase === 'loading' && 'KI generiert Materialcluster…'}
              {phase === 'exam' && `${exam?.materials.length} Material${exam?.materials.length !== 1 ? 'ien' : ''} · 3 Aufgaben`}
              {phase === 'correcting' && 'KI korrigiert…'}
              {phase === 'result' && `Ergebnis · ${correction?.gradeLabel}`}
            </p>
          </div>
          {phase === 'result' && correction && (
            <div className="px-3 py-1 rounded-pill text-white text-[13px] font-bold"
              style={{ backgroundColor: npColor(correction.totalNP) }}>
              {correction.totalNP}/15 NP
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-5 overflow-y-auto">

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
                className="w-full bg-surface border border-border rounded-icon px-4 py-3 text-[14px] text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
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

            {/* How it works */}
            <div className="bg-surface rounded-icon border border-border/60 p-4 space-y-3">
              <p className="text-text-secondary text-[12px] font-bold">Wie der Modus funktioniert:</p>
              {[
                { label: 'M1 + M2', desc: 'Zusammenhängende Materialien zu einem Kontext' },
                { label: 'Aufgabe 1 · AFB I', desc: 'Fachwissen das du zum Lesen der Materialien brauchst' },
                { label: 'Aufgabe 2 · AFB II', desc: 'Materialien direkt auswerten + Fachwissen verknüpfen' },
                { label: 'Aufgabe 3 · AFB III', desc: 'Über die Materialien hinaus: Hypothese, Bewertung, Stellung' },
              ].map(({ label, desc }) => (
                <div key={label} className="flex items-start gap-3">
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/15 text-emerald-400 shrink-0 mt-0.5">{label}</span>
                  <p className="text-text-secondary text-[12px]">{desc}</p>
                </div>
              ))}
            </div>

            {error && (
              <div className="bg-danger/10 border border-danger/30 rounded-icon p-4">
                <p className="text-text-primary text-[13px] font-semibold mb-1">Fehler</p>
                <p className="text-text-primary/80 text-[12px]">{error}</p>
              </div>
            )}
          </div>
        )}

        {(phase === 'loading' || phase === 'correcting') && (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="w-10 h-10 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
            <p className="text-text-muted text-[14px]">
              {phase === 'loading' ? 'KI generiert Materialcluster…' : 'KI korrigiert alle Aufgaben…'}
            </p>
          </div>
        )}

        {phase === 'exam' && exam && (
          <div>
            <div className="bg-surface rounded-icon border border-border/60 px-4 py-2.5 mb-4 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-primary">
                <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
              </svg>
              <p className="text-text-secondary text-[12px] font-semibold">
                {exam.materials.length} Materialie{exam.materials.length !== 1 ? 'n' : ''} · Lies sie sorgfältig
              </p>
            </div>
            {exam.materials.map((m) => <MaterialCard key={m.id} m={m} />)}

            <div className="bg-surface rounded-icon border border-border/60 px-4 py-2.5 mb-4 mt-2 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-primary">
                <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              <p className="text-text-secondary text-[12px] font-semibold">
                {exam.tasks.length} Aufgaben · {exam.totalBE} BE gesamt
              </p>
            </div>
            {exam.tasks.map((t) => (
              <TaskAnswerCard
                key={t.id}
                task={t}
                answer={answers[t.id] ?? ''}
                onChange={(v) => setAnswers((prev) => ({ ...prev, [t.id]: v }))}
              />
            ))}

            {error && (
              <div className="bg-danger/10 border border-danger/30 rounded-icon p-4 mb-3">
                <p className="text-text-primary text-[13px]">{error}</p>
              </div>
            )}
          </div>
        )}

        {phase === 'result' && exam && correction && (
          <div>
            <div className="rounded-card p-5 mb-4 text-center" style={{ background: ACCENT }}>
              <p className="text-white/70 text-[12px] font-semibold uppercase tracking-wide mb-1">Ergebnis</p>
              <p className="text-white text-[48px] font-black leading-none">{correction.totalNP}</p>
              <p className="text-white/80 text-[13px] mt-1">von 15 Notenpunkten · {correction.gradeLabel}</p>
            </div>
            {isPro ? (
              <>
                {correction.overallJustification && (
                  <div className="bg-surface rounded-icon border border-border/60 p-4 mb-4">
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
              <div className="mt-2 rounded-card border border-accent/20 overflow-hidden" style={{ background: 'rgba(124,58,237,0.04)' }}>
                <div className="p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-icon flex items-center justify-center shrink-0" style={{ background: 'rgba(124,58,237,0.15)' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
                      { icon: 'warning'   as IconName, label: 'Fehleranalyse', desc: 'Konkrete Fehler in deiner Antwort' },
                      { icon: 'target'    as IconName, label: 'Lücken', desc: 'Welche Inhalte noch gefehlt haben' },
                      { icon: 'speech'    as IconName, label: 'Formulierungshilfen', desc: 'Bessere Formulierungen für die Klausur' },
                      { icon: 'chart'     as IconName, label: 'Gesamtbewertung', desc: 'Detailliertes Fazit der KI pro Aufgabe' },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-3 px-3 py-2.5 rounded-btn" style={{ background: 'var(--color-surface)' }}>
                        <span className="text-text-secondary shrink-0"><Icon name={item.icon} size={16} /></span>
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
                    className="w-full py-3 rounded-icon on-mint text-[14px] font-bold press-sm"
                    style={{ background: '#34D399' }}
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
            className="w-full py-4 rounded-card text-white text-[15px] font-bold press disabled:opacity-40"
            style={{ background: ACCENT }}
          >
            Materialklausur generieren
          </button>
        )}
        {phase === 'exam' && (
          <button
            onClick={handleSubmit}
            className="w-full py-4 rounded-card text-white text-[15px] font-bold press"
            style={{ background: ACCENT }}
          >
            Abgeben & korrigieren lassen
          </button>
        )}
        {phase === 'result' && (
          <div className="flex gap-3">
            <button
              onClick={() => { setPhase('setup'); setExam(null); setCorrection(null) }}
              className="flex-1 py-4 rounded-card text-text-primary text-[15px] font-bold bg-surface border border-border press"
            >
              Neue Klausur
            </button>
            <button
              onClick={() => navigate(-1)}
              className="flex-1 py-4 rounded-card text-white text-[15px] font-bold press"
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
            <div className="w-12 h-12 rounded-card flex items-center justify-center" style={{ background: 'rgb(var(--fill-red))' }}>
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
              saveInProgressProbeklausur({ id: inProgressIdRef.current, mode: 3, subjectId: exam.subjectId, subjectName: exam.subject, topic: exam.topic, exam, userAnswers: answers, startedAt: resumeStartedAt })
              setShowExitWarning(false)
              navigate(-1)
            }}
            className="w-full py-3.5 rounded-card font-semibold text-[15px] bg-surface border border-border/60 text-text-primary press"
          >
            Klausur pausieren — Fortschritt gespeichert
          </button>
          <button onClick={() => { setShowExitWarning(false); if (inProgressIdRef.current) deleteInProgressProbeklausur(inProgressIdRef.current); navigate(-1) }} className="w-full py-3.5 rounded-card font-semibold text-[15px] text-white press mb-2" style={{ background: 'rgb(var(--fill-red))' }}>
            Klausur beenden (Fortschritt gelöscht)
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}
