import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { evaluateBlurting } from '../lib/groq'
import { subjects, topics } from '../data/mockData'
import { SubjectIcon } from '../components/ui/SubjectIcon'
import type { Subject, GeneratedSmartNote } from '../types'
import type { UserNote } from '../types'

// ── Types ──────────────────────────────────────────────────────────────────

interface SelectedTopic {
  title: string
  referenceContent: string
}

interface BlurtingResult {
  correct: string[]
  forgotten: string[]
  corrections: string[]
}

interface NotePickItem {
  id: string
  title: string
  preview: string
  date: string
  referenceContent: string
  isGenerated: boolean
}

// ── Constants ──────────────────────────────────────────────────────────────

const BLURTING_GRADIENT = 'linear-gradient(145deg, #DB2777, #9D174D)'

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' }) }
  catch { return '' }
}

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const exam = new Date(dateStr); exam.setHours(0, 0, 0, 0)
  return Math.round((exam.getTime() - today.getTime()) / 86400000)
}

function buildNoteRef(note: GeneratedSmartNote): string {
  return [
    note.summary,
    note.keywords.length > 0 ? `Schlüsselbegriffe: ${note.keywords.join(', ')}` : '',
    note.examTopics.length > 0 ? `Klausurthemen: ${note.examTopics.join(', ')}` : '',
    note.rawText ? `Text:\n${note.rawText}` : '',
  ].filter(Boolean).join('\n\n')
}

// ── Main Component ─────────────────────────────────────────────────────────

export function BlurtingScreen() {
  const navigate = useNavigate()
  const { generatedNotes, userNotes, profile, getKc } = useUser()

  const [phase, setPhase] = useState<'select' | 'notepick' | 'write' | 'loading' | 'feedback'>('select')
  const [selected, setSelected] = useState<SelectedTopic | null>(null)
  const [notePickSubject, setNotePickSubject] = useState<Subject | null>(null)
  const [text, setText] = useState('')
  const [result, setResult] = useState<BlurtingResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // ── Data ─────────────────────────────────────────────────────────────────

  const profileSubjects: Subject[] = (profile?.faecher ?? [])
    .map((id) => subjects.find((s) => s.id === id))
    .filter((s): s is Subject => s !== undefined)

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const upcomingExams = (profile?.klausurtermine ?? [])
    .filter((k) => new Date(k.date) >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4)

  function getNoteCount(subjectId: string): number {
    const subj = subjects.find((s) => s.id === subjectId)
    const genCount = subj
      ? Object.values(generatedNotes).filter((n) => n.subjectName.toLowerCase() === subj.name.toLowerCase()).length
      : 0
    const userCount = userNotes.filter((n) => n.subjectId === subjectId && n.content.trim().length > 20).length
    return genCount + userCount
  }

  function getNotesForSubject(subjectId: string): NotePickItem[] {
    const subj = subjects.find((s) => s.id === subjectId)
    const items: NotePickItem[] = []
    if (subj) {
      Object.entries(generatedNotes)
        .filter(([, n]) => n.subjectName.toLowerCase() === subj.name.toLowerCase())
        .forEach(([key, n]) => {
          items.push({
            id: key,
            title: n.examTopics[0] ?? n.subjectName,
            preview: n.summary.slice(0, 80),
            date: n.generatedAt,
            referenceContent: buildNoteRef(n),
            isGenerated: true,
          })
        })
    }
    userNotes
      .filter((n): n is UserNote => n.subjectId === subjectId && n.content.trim().length > 20)
      .forEach((n) => {
        items.push({
          id: n.id,
          title: n.title,
          preview: n.content.slice(0, 80),
          date: n.createdAt,
          referenceContent: n.content,
          isGenerated: false,
        })
      })
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  function buildAllRefsForSubject(subjectId: string): string {
    return getNotesForSubject(subjectId).map((n) => n.referenceContent).join('\n\n---\n\n')
  }

  function getTopicsForSubject(subjectId: string): string[] {
    return topics.filter((t) => t.subjectId === subjectId).map((t) => t.name)
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleSubjectTap(subj: Subject) {
    const count = getNoteCount(subj.id)
    if (count > 0) {
      setNotePickSubject(subj)
      setPhase('notepick')
    } else {
      startWriting({ title: subj.name, referenceContent: '' })
    }
  }

  function handleExamTap(subjectId: string, subjectName: string) {
    const count = getNoteCount(subjectId)
    if (count > 0) {
      const subj = subjects.find((s) => s.id === subjectId) ?? null
      setNotePickSubject(subj)
      setPhase('notepick')
    } else {
      startWriting({ title: subjectName, referenceContent: '' })
    }
  }

  function handleNoteSelect(item: NotePickItem) {
    startWriting({ title: item.title, referenceContent: item.referenceContent })
  }

  function handleAllNotes() {
    if (!notePickSubject) return
    startWriting({ title: notePickSubject.name, referenceContent: buildAllRefsForSubject(notePickSubject.id) })
  }

  function handleNoRef() {
    if (!notePickSubject) return
    startWriting({ title: notePickSubject.name, referenceContent: '' })
  }

  function startWriting(topic: SelectedTopic) {
    setSelected(topic)
    setText('')
    setResult(null)
    setError(null)
    setPhase('write')
  }

  async function handleAuswerten() {
    if (!text.trim() || !selected) return
    setPhase('loading')
    setError(null)
    try {
      const res = await evaluateBlurting(text, selected.referenceContent, getKc(notePickSubject?.id ?? '') ?? undefined)
      setResult(res)
      setPhase('feedback')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler')
      setPhase('write')
    }
  }

  function handleReset() {
    setText('')
    setResult(null)
    setError(null)
    setPhase('write')
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-screen bg-background">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div
        className="flex items-center px-4 border-b border-border shrink-0"
        style={{ paddingTop: 'max(54px, calc(env(safe-area-inset-top, 0px) + 16px))', paddingBottom: '12px' }}
      >
        <button
          onClick={() => {
            if (phase === 'select') navigate(-1)
            else if (phase === 'notepick') setPhase('select')
            else setPhase('select')
          }}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-surface border border-border press-sm shrink-0"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-text-primary">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <p className="flex-1 text-center text-[16px] font-bold text-text-primary mx-3 truncate">
          {phase === 'select' ? 'Blurting' : phase === 'notepick' ? (notePickSubject?.name ?? 'Notiz wählen') : (selected?.title ?? 'Blurting')}
        </p>
        <div className="w-9 shrink-0" />
      </div>

      {/* ── Phase 0: Fach auswählen ─────────────────────────────────────── */}
      {phase === 'select' && (
        <div className="flex-1 overflow-y-auto pb-10">
          <div className="px-4 pt-5">
            <p className="section-label px-1 mb-3">Fach wählen</p>
            {profileSubjects.length === 0 ? (
              <p className="text-text-muted text-[13px] px-1">Keine Fächer im Profil gefunden.</p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {profileSubjects.map((subj) => (
                  <SubjectSquare
                    key={subj.id}
                    subject={subj}
                    noteCount={getNoteCount(subj.id)}
                    onTap={() => handleSubjectTap(subj)}
                  />
                ))}
              </div>
            )}
          </div>

          {upcomingExams.length > 0 && (
            <div className="px-4 mt-6">
              <p className="section-label px-1 mb-3">Klausuren bald</p>
              <div className="space-y-2.5">
                {upcomingExams.map((exam) => {
                  const days = daysUntil(exam.date)
                  const subj = subjects.find((s) => s.id === exam.subjectId)
                  const suggTopics = getNoteCount(exam.subjectId) === 0 ? getTopicsForSubject(exam.subjectId) : []
                  return (
                    <ExamSuggestionCard
                      key={`${exam.subjectId}-${exam.date}`}
                      subjectId={exam.subjectId}
                      subjectName={subj?.name ?? exam.subjectId}
                      examTopic={exam.topic}
                      daysLeft={days}
                      noteCount={getNoteCount(exam.subjectId)}
                      suggestedTopics={suggTopics}
                      onTap={() => handleExamTap(exam.subjectId, subj?.name ?? exam.subjectId)}
                    />
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Phase 0.5: Note-Picker ──────────────────────────────────────── */}
      {phase === 'notepick' && notePickSubject && (
        <div className="flex-1 overflow-y-auto pb-10">
          <div className="px-4 pt-5 space-y-2.5">
            <p className="section-label px-1 mb-3">Mit welcher Notiz vergleichen?</p>

            {getNotesForSubject(notePickSubject.id).map((item) => (
              <button
                key={item.id}
                onClick={() => handleNoteSelect(item)}
                className="w-full bg-surface rounded-[16px] border border-border/60 shadow-card-adaptive p-4 text-left press flex items-start gap-3"
              >
                <div className="w-1 shrink-0 rounded-full self-stretch" style={{ background: notePickSubject.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-pill" style={{ background: `${notePickSubject.color}18`, color: notePickSubject.color }}>
                      {item.isGenerated ? 'Smart Note' : 'Eigene Notiz'}
                    </span>
                    <span className="text-text-muted text-[11px] shrink-0">{formatDate(item.date)}</span>
                  </div>
                  <p className="text-text-primary text-[14px] font-bold leading-snug">{item.title}</p>
                  {item.preview && <p className="text-text-muted text-[12px] mt-1 leading-snug line-clamp-2">{item.preview}</p>}
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted shrink-0 mt-1">
                  <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ))}

            {getNotesForSubject(notePickSubject.id).length > 1 && (
              <button
                onClick={handleAllNotes}
                className="w-full bg-surface rounded-[16px] border border-border/60 p-4 text-left press flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: `${notePickSubject.color}15` }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: notePickSubject.color }}>
                    <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-text-primary font-bold text-[13px]">Alle Notizen kombinieren</p>
                  <p className="text-text-muted text-[11px] mt-0.5">{getNotesForSubject(notePickSubject.id).length} Notizen als Referenz</p>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted shrink-0">
                  <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}

            <button
              onClick={handleNoRef}
              className="w-full bg-surface rounded-[16px] border border-border/60 p-4 text-left press flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-[10px] bg-surface-hover flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted">
                  <circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" strokeLinecap="round" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-text-primary font-bold text-[13px]">Ohne Referenz üben</p>
                <p className="text-text-muted text-[11px] mt-0.5">KI bewertet allgemein</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ── Phase 1: Schreiben ──────────────────────────────────────────── */}
      {phase === 'write' && (
        <>
          <div className="flex-1 px-5 pt-4 pb-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Schreib alles auf, was du weißt..."
              autoFocus
              className="w-full h-full min-h-[calc(100dvh-200px)] bg-transparent text-text-primary text-[16px] leading-relaxed placeholder-text-muted resize-none focus:outline-none"
            />
          </div>
          {error && <p className="px-4 pb-2 text-[13px] text-center" style={{ color: '#F87171' }}>{error}</p>}
          <div className="px-4 pb-10 shrink-0">
            <button
              onClick={handleAuswerten}
              disabled={!text.trim()}
              className="w-full py-4 rounded-card text-white text-[15px] font-semibold press disabled:opacity-40 transition-opacity"
              style={{ background: BLURTING_GRADIENT }}
            >
              Auswerten
            </button>
          </div>
        </>
      )}

      {/* ── Phase 2a: Loading ───────────────────────────────────────────── */}
      {phase === 'loading' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8">
          <div className="w-14 h-14 rounded-[16px] flex items-center justify-center" style={{ background: BLURTING_GRADIENT }}>
            <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
              <path d="M21 12a9 9 0 11-6.219-8.56" />
            </svg>
          </div>
          <p className="text-text-secondary text-[15px] text-center">KI analysiert dein Blurting...</p>
        </div>
      )}

      {/* ── Phase 2b: Feedback ──────────────────────────────────────────── */}
      {phase === 'feedback' && result && (
        <>
          <div className="flex-1 overflow-y-auto px-4 pt-5 pb-4 space-y-3">
            {result.correct.length > 0 && (
              <FeedbackSection icon="✅" title="Das hattest du drin" items={result.correct}
                color="#22C55E" borderColor="rgba(34,197,94,0.2)" bg="rgba(34,197,94,0.07)" />
            )}
            {result.forgotten.length > 0 && (
              <FeedbackSection icon="❓" title="Das hast du vergessen" items={result.forgotten}
                color="#F59E0B" borderColor="rgba(245,158,11,0.2)" bg="rgba(245,158,11,0.07)" />
            )}
            {result.corrections.length > 0 && (
              <FeedbackSection icon="💡" title="Kleine Korrekturen" items={result.corrections}
                color="#60A5FA" borderColor="rgba(96,165,250,0.2)" bg="rgba(96,165,250,0.07)" />
            )}
          </div>
          <div className="px-4 pb-10 shrink-0">
            <button onClick={handleReset} className="w-full py-4 rounded-card text-white text-[15px] font-semibold press" style={{ background: BLURTING_GRADIENT }}>
              Nochmal versuchen
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SubjectSquare({ subject, noteCount, onTap }: { subject: Subject; noteCount: number; onTap: () => void }) {
  return (
    <button
      onClick={onTap}
      className="aspect-square bg-surface rounded-[16px] border border-border/60 shadow-card-adaptive flex flex-col items-center justify-center gap-1.5 p-2 press relative overflow-hidden"
    >
      <SubjectIcon subjectId={subject.id} size="sm" />
      <p className="text-text-secondary text-[10px] font-semibold text-center leading-tight w-full px-0.5" style={{ wordBreak: 'break-word', hyphens: 'auto' }}>
        {subject.name}
      </p>
      {noteCount > 0 && (
        <div className="absolute top-1.5 right-1.5 w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: subject.color }}>
          {noteCount > 9 ? '9+' : noteCount}
        </div>
      )}
    </button>
  )
}

function ExamSuggestionCard({
  subjectId, subjectName, examTopic, daysLeft, noteCount, suggestedTopics, onTap,
}: {
  subjectId: string
  subjectName: string
  examTopic?: string
  daysLeft: number
  noteCount: number
  suggestedTopics: string[]
  onTap: () => void
}) {
  const badgeStyle = daysLeft <= 7
    ? { bg: 'rgba(248,113,113,0.15)', color: '#F87171' }
    : daysLeft <= 14
    ? { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B' }
    : { bg: 'rgba(148,163,184,0.12)', color: '#94A3B8' }

  return (
    <button onClick={onTap} className="w-full bg-surface rounded-[18px] border border-border/60 shadow-card-adaptive p-4 flex flex-col gap-2.5 text-left press">
      <div className="flex items-center gap-3">
        <SubjectIcon subjectId={subjectId} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <p className="text-text-primary font-bold text-[14px]">{subjectName}</p>
            <span className="px-2 py-0.5 rounded-pill text-[10px] font-semibold shrink-0" style={{ background: badgeStyle.bg, color: badgeStyle.color }}>
              {daysLeft === 0 ? 'Heute' : daysLeft === 1 ? 'Morgen' : `in ${daysLeft} Tagen`}
            </span>
          </div>
          <p className="text-text-muted text-[12px]">
            {noteCount > 0
              ? `${noteCount} ${noteCount === 1 ? 'Notiz' : 'Notizen'} als Referenz`
              : examTopic
              ? examTopic
              : 'Ohne Referenz üben'}
          </p>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted shrink-0">
          <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {noteCount === 0 && suggestedTopics.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/30">
          <span className="text-[10px] text-text-muted font-medium w-full mb-0.5">Mögliche Themen:</span>
          {suggestedTopics.slice(0, 6).map((t) => (
            <span key={t} className="text-[10px] px-2 py-0.5 rounded-pill bg-surface-hover text-text-muted border border-border/40">
              {t.length > 30 ? t.slice(0, 30) + '…' : t}
            </span>
          ))}
        </div>
      )}
    </button>
  )
}

function FeedbackSection({ icon, title, items, color, borderColor, bg }: { icon: string; title: string; items: string[]; color: string; borderColor: string; bg: string }) {
  return (
    <div className="rounded-[18px] overflow-hidden" style={{ background: bg, border: `1px solid ${borderColor}` }}>
      <div className="px-4 pt-4 pb-2.5 flex items-center gap-2.5">
        <span className="text-[18px] leading-none">{icon}</span>
        <p className="text-[14px] font-bold" style={{ color }}>{title}</p>
      </div>
      <div className="px-4 pb-4 space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2.5">
            <span className="text-[13px] mt-0.5 shrink-0 font-bold" style={{ color }}>·</span>
            <p className="text-text-secondary text-[13px] leading-snug">{item}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
