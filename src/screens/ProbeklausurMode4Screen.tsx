import { useState, useRef, useMemo } from 'react'
import { SubjectIcon } from '../components/ui/SubjectIcon'
import { WorkingState } from '../components/ui/EmptyState'
import { Banner } from '../components/ui/Banner'
import { useNavigate, useLocation } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { Icon, type IconName } from '../components/ui/Icon'
import { ProModal } from '../components/ui/ProModal'
import { subjects, topics } from '../data/mockData'
import { getTopicPlaceholder } from '../data/subjectInfo'
import { generateMode4Exam, correctExam } from '../lib/gemini';
import { BottomSheet } from '../components/ui/BottomSheet'
import { ProModeGate } from '../components/ui/ProModeGate'
import type { GeneratedExam, ExamCorrection, SavedProbeklausur, InProgressProbeklausur, ProbeklausurPrefill } from '../types'
import { AFB_PILL, npMarke } from '../lib/afb'
import { zurueckZiel } from '../lib/appMode'

const ACCENT = 'var(--grad-mode)'


function TaskAnswerCard({
  task, answer, onChange,
}: { task: GeneratedExam['tasks'][0]; answer: string; onChange: (v: string) => void }) {
  const afbDesc: Record<string, string> = {
    I: 'Reproduziere dein Fachwissen',
    II: 'Wende dein Wissen auf den Kontext der Aufgabe an',
    III: 'Bilde ein eigenständiges Urteil / Erörterung',
  }
  return (
    <div className="bg-background rounded-icon border border-border/60 p-4 mb-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-text-muted text-[11px] font-semibold uppercase tracking-wide">Aufgabe {task.label}</span>
        <span className={`px-2 py-0.5 rounded-chip text-[11px] font-bold ${AFB_PILL}`}>AFB {task.afb}</span>
        <span className="ml-auto text-text-muted text-[11px] font-semibold">{task.be} BE</span>
      </div>
      {afbDesc[task.afb] && (
        <p className="text-text-muted text-[11px] italic mb-2">{afbDesc[task.afb]}</p>
      )}
      <p className="text-text-primary text-[14px] font-medium leading-relaxed mb-3">{task.text}</p>
      <textarea
        value={answer}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Schreibe deine Antwort hier — ganz ohne Hilfsmittel…"
        rows={task.afb === 'III' ? 8 : 6}
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
          <span className={`px-2 py-0.5 rounded-chip text-[11px] font-bold ${AFB_PILL}`}>AFB {task.afb}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-[12px] font-semibold px-2 py-0.5 rounded-pill tabular-nums"
            style={npMarke(correction.scoreNP)}
          >
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

export function ProbeklausurMode4Screen() {
  const navigate = useNavigate()
  const location = useLocation()
  const resume = (location.state as { resume?: InProgressProbeklausur } | null)?.resume ?? null
  const prefill = (location.state as { prefill?: ProbeklausurPrefill } | null)?.prefill ?? null
  const { profile, getKc, saveProbeklausur, saveInProgressProbeklausur, deleteInProgressProbeklausur, isPro } = useUser()
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
  const [showExitWarning, setShowExitWarning] = useState(false)
  const [showProModal, setShowProModal] = useState(false)

  const selectedSubject = subjects.find((s) => s.id === subjectId)
  const subjectTopics = topics.filter((t) => t.subjectId === subjectId).slice(0, 6)

  async function handleGenerate() {
    if (!subjectId || !topic.trim()) return
    setError(null)
    setPhase('loading')
    try {
      const generated = await generateMode4Exam(selectedSubject?.name ?? subjectId, subjectId, topic.trim(), getKc(subjectId) ?? undefined, prefill?.contextText)
      setExam(generated)
      setAnswers({})
      inProgressIdRef.current = `ip-4-${subjectId}-${Date.now()}`
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

  // "Ohne Material" ist Pro (siehe Paywall) — fängt auch Direkt-URL / Resume.
  if (!isPro && phase === 'setup') return <ProModeGate title="Ohne Material" />

  return (
    <div className="flex flex-col min-h-dvh bg-background">
      {/* Header */}
      <div className="px-4 pb-4 border-b border-border/60 bg-surface/80" style={{ paddingTop: 'max(58px, calc(env(safe-area-inset-top, 0px) + 18px))' }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (phase === 'setup' || phase === 'loading') { navigate(zurueckZiel()); return }
              if (phase === 'exam') { setShowExitWarning(true); return }
              navigate(zurueckZiel())
            }}
            className="flex items-center gap-1 text-text-primary text-[14px] font-medium press-sm shrink-0 -ml-1"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Zurück
          </button>
          <div className="flex-1">
            <p className="text-text-primary font-bold text-[17px]">Ohne Material</p>
            <p className="text-text-muted text-[12px]">
              {phase === 'setup' && 'Alles aus dem Kopf · Kein Hilfsmittel'}
              {phase === 'loading' && 'KI generiert Aufgaben…'}
              {phase === 'exam' && `3 Aufgaben · ${exam?.totalBE} BE gesamt`}
              {phase === 'correcting' && 'KI korrigiert…'}
              {phase === 'result' && `Ergebnis · ${correction?.gradeLabel}`}
            </p>
          </div>
          {phase === 'result' && correction && (
            <div className="px-3 py-1 rounded-pill text-[13px] font-bold tabular-nums"
              style={npMarke(correction.totalNP)}>
              {correction.totalNP}/15 NP
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-5 overflow-y-auto lg:px-6 lg:max-w-[880px] lg:w-full">

        {phase === 'setup' && (
          <div className="space-y-5">
            {prefill && (
              <Banner tone="info">
                <span className="font-semibold">Aus deinem Lernzettel</span>
                <span className="block text-text-secondary mt-0.5">
                  Fach und Thema sind gesetzt, die KI baut die Aufgaben auf dem Lernzettel-Inhalt auf. Du kannst unten noch anpassen.
                </span>
              </Banner>
            )}
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
                    <SubjectIcon subjectId={s.id} size="sm" className="!w-4 !h-4" />
                    {s.name}
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
              <p className="text-text-secondary text-[12px] font-bold">3 Aufgaben — alles aus dem Kopf:</p>
              {[
                { afb: 'AFB I', desc: 'Reproduktion: Du gibst Fachwissen aus dem Gedächtnis wieder.' },
                { afb: 'AFB II', desc: 'Transfer: Du wendest Wissen auf ein Szenario oder einen Vergleich an.' },
                { afb: 'AFB III', desc: 'Bewertung: Du bildest ein eigenes Urteil oder Erörterung — rein argumentativ.' },
              ].map(({ afb, desc }) => (
                <div key={afb} className="flex items-start gap-3">
                  <span className={`px-2 py-0.5 rounded-chip text-[11px] font-bold shrink-0 mt-0.5 ${AFB_PILL}`}>
                    {afb}
                  </span>
                  <p className="text-text-secondary text-[12px]">{desc}</p>
                </div>
              ))}
            </div>

            {error && (
              <Banner tone="danger">
                <span className="font-semibold">Fehler</span>
                <span className="block text-text-secondary mt-0.5">{error}</span>
              </Banner>
            )}
          </div>
        )}

        {(phase === 'loading' || phase === 'correcting') && (
          <WorkingState tone="klausur" title={phase === 'loading' ? 'KI generiert die Aufgaben…' : 'KI korrigiert deine Antworten…'} note="Einen Moment Geduld" />
        )}

        {phase === 'exam' && exam && (
          <div>
            {/* "no material" badge */}
            <div className="bg-surface rounded-icon border border-border/60 px-4 py-2.5 mb-4 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-primary">
                <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
              <p className="text-text-secondary text-[12px] font-semibold">Kein Material — alles aus dem Gedächtnis</p>
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
              <Banner tone="danger" className="mb-3">{error}</Banner>
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
              <div className="mt-2 rounded-card border border-accent/20 overflow-hidden" style={{ background: 'var(--color-accent-soft)' }}>
                <div className="p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-icon flex items-center justify-center shrink-0" style={{ background: 'rgb(var(--color-accent) / 0.16)' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-accent))" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
                    className="w-full py-3 rounded-icon text-on-accent text-[14px] font-bold press-sm"
                    style={{ background: 'var(--grad-mode)' }}
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
            className="w-full h-12 rounded-pill text-white text-[15px] font-bold press disabled:opacity-40"
            style={{ background: ACCENT }}
          >
            Aufgaben generieren
          </button>
        )}
        {phase === 'exam' && (
          <button
            onClick={handleSubmit}
            className="w-full h-12 rounded-pill text-white text-[15px] font-bold press"
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
              Neue Aufgaben
            </button>
            <button
              onClick={() => navigate(zurueckZiel())}
              className="flex-1 py-4 rounded-card text-white text-[15px] font-bold press"
              style={{ background: ACCENT }}
            >
              Zurück
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
              if (!exam || !inProgressIdRef.current) { navigate(zurueckZiel()); return }
              saveInProgressProbeklausur({ id: inProgressIdRef.current, mode: 4, subjectId: exam.subjectId, subjectName: exam.subject, topic: exam.topic, exam, userAnswers: answers, startedAt: resumeStartedAt })
              setShowExitWarning(false)
              navigate(zurueckZiel())
            }}
            className="w-full h-12 rounded-pill font-semibold text-[15px] bg-surface border border-border/60 text-text-primary press"
          >
            Klausur pausieren — Fortschritt gespeichert
          </button>
          <button onClick={() => { setShowExitWarning(false); if (inProgressIdRef.current) deleteInProgressProbeklausur(inProgressIdRef.current); navigate(zurueckZiel()) }} className="w-full h-12 rounded-pill font-semibold text-[15px] text-white press mb-2" style={{ background: 'rgb(var(--fill-red))' }}>
            Klausur beenden (Fortschritt gelöscht)
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}
