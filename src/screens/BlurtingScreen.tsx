import { useEffect, useRef, useState } from 'react'
import { WorkingState } from '../components/ui/EmptyState'
import { ListGroup, ListRow } from '../components/ui/ListGroup'
import { Icon, type IconName } from '../components/ui/Icon'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { evaluateBlurting } from '../lib/groq'
import { subjects, topics } from '../data/mockData'
import { SubjectIcon } from '../components/ui/SubjectIcon'
import { Dialog } from '../components/ui/Dialog'
import type { GeneratedSmartNote } from '../types'
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

type NoteSelection =
  | { kind: 'none' }
  | { kind: 'all' }
  | { kind: 'note'; item: NotePickItem }

interface SubjectChip {
  id: string
  name: string
  color: string
  icon: string
}

// ── Web Speech API (feature-detected, no `any`) ─────────────────────────────

interface SpeechRecognitionResultLike {
  isFinal: boolean
  0: { transcript: string }
}

interface SpeechRecognitionEventLike {
  resultIndex: number
  results: ArrayLike<SpeechRecognitionResultLike>
}

interface MinimalSpeechRecognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

function getSpeechRecognitionCtor(): (new () => MinimalSpeechRecognition) | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => MinimalSpeechRecognition
    webkitSpeechRecognition?: new () => MinimalSpeechRecognition
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

// ── Constants ──────────────────────────────────────────────────────────────

const MIN_WORDS = 20

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

// Recommended blurting duration: longer when there's more reference material to recall.
function estimateMinutes(referenceContent: string): number {
  const words = referenceContent.trim() ? referenceContent.trim().split(/\s+/).length : 0
  return Math.max(3, Math.min(8, 3 + Math.round(words / 80)))
}

// ── Main Component ─────────────────────────────────────────────────────────

export function BlurtingScreen() {
  const navigate = useNavigate()
  const { generatedNotes, userNotes, profile, getKc, recordStudyDay, addCoins, showCoinToast } = useUser()

  const [phase, setPhase] = useState<'setup' | 'write' | 'loading' | 'feedback'>('setup')
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)
  const [noteSelection, setNoteSelection] = useState<NoteSelection>({ kind: 'none' })
  const [selected, setSelected] = useState<SelectedTopic | null>(null)
  const [text, setText] = useState('')
  const [result, setResult] = useState<BlurtingResult | null>(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Voice dictation ──────────────────────────────────────────────────────
  const recognitionRef = useRef<MinimalSpeechRecognition | null>(null)
  const [listening, setListening] = useState(false)
  const [micError, setMicError] = useState<string | null>(null)
  const [speechSupported] = useState(() => getSpeechRecognitionCtor() !== null)

  useEffect(() => {
    if (phase !== 'write' && recognitionRef.current) {
      recognitionRef.current.stop()
    }
  }, [phase])

  useEffect(() => () => { recognitionRef.current?.stop() }, [])

  function toggleListening() {
    if (listening) {
      recognitionRef.current?.stop()
      return
    }
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) return
    const recognition = new Ctor()
    recognition.lang = 'de-DE'
    recognition.continuous = true
    recognition.interimResults = false
    recognition.onresult = (event) => {
      let finalChunk = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i]
        if (res.isFinal) finalChunk += res[0].transcript
      }
      if (finalChunk.trim()) {
        setText((prev) => (prev.trim() ? `${prev.trim()} ${finalChunk.trim()}` : finalChunk.trim()))
      }
    }
    recognition.onerror = () => {
      setListening(false)
      setMicError('Diktat nicht möglich — Mikrofonzugriff prüfen.')
    }
    recognition.onend = () => setListening(false)
    recognitionRef.current = recognition
    setMicError(null)
    setListening(true)
    recognition.start()
  }

  // ── Data ─────────────────────────────────────────────────────────────────

  const profileSubjects: SubjectChip[] = (profile?.faecher ?? [])
    .map((id) => subjects.find((s) => s.id === id))
    .filter((s): s is (typeof subjects)[number] => s !== undefined)
    .map((s) => ({ id: s.id, name: s.name, color: s.color, icon: s.icon }))

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId) ?? null

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

  const notesForSelected = selectedSubjectId ? getNotesForSubject(selectedSubjectId) : []

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleSelectSubject(subjectId: string) {
    setSelectedSubjectId(subjectId)
    setNoteSelection({ kind: 'none' })
  }

  function handleOpenWrite() {
    if (!selectedSubjectId || !selectedSubject) return
    let title = selectedSubject.name
    let referenceContent = ''
    if (noteSelection.kind === 'note') {
      title = noteSelection.item.title
      referenceContent = noteSelection.item.referenceContent
    } else if (noteSelection.kind === 'all') {
      referenceContent = buildAllRefsForSubject(selectedSubjectId)
    }
    setSelected({ title, referenceContent })
    setText('')
    setResult(null)
    setError(null)
    setMicError(null)
    setPhase('write')
  }

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0
  const progress = Math.min(100, Math.round((wordCount / MIN_WORDS) * 100))
  const estimatedMinutes = selected ? estimateMinutes(selected.referenceContent) : 4

  async function handleAuswerten() {
    if (!text.trim() || wordCount < MIN_WORDS || !selected) return
    if (listening) recognitionRef.current?.stop()
    setPhase('loading')
    setError(null)
    try {
      const res = await evaluateBlurting(text, selected.referenceContent, getKc(selectedSubjectId ?? '') ?? undefined)
      setResult(res)
      setPhase('feedback')
      recordStudyDay()
      const gain = await addCoins('BLURTING')
      if (gain > 0) showCoinToast(gain)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler')
      setPhase('write')
    }
  }

  function handleCancelWrite() {
    if (text.trim()) { setConfirmDiscard(true); return }
    setPhase('setup')
  }

  function handleRetry() {
    setText('')
    setResult(null)
    setError(null)
    setMicError(null)
    setPhase('write')
  }

  function handleNewTopic() {
    setPhase('setup')
    setSelectedSubjectId(null)
    setNoteSelection({ kind: 'none' })
    setSelected(null)
    setText('')
    setResult(null)
    setError(null)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-dvh bg-background">

      {/* ── Phase: Setup (Fach + Smart Note in einem Screen) ─────────────── */}
      {phase === 'setup' && (
        <>
          <div
            className="flex items-center px-4 border-b border-border shrink-0"
            style={{ paddingTop: 'max(54px, calc(env(safe-area-inset-top, 0px) + 16px))', paddingBottom: '12px' }}
          >
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1 text-text-primary text-[14px] font-medium press-sm shrink-0 -ml-1"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              Zurück
            </button>
            <p className="flex-1 text-center text-[16px] font-bold text-text-primary mx-3 truncate">Blurting</p>
            <div className="w-9 shrink-0" />
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="px-5 pt-5">
              <h1 className="text-[26px] font-extrabold text-text-primary leading-tight">Woraus schöpfst du heute?</h1>
              <p className="text-text-muted text-[14px] leading-relaxed mt-1.5">
                Du schreibst danach frei — die Notiz bleibt zu, bis du fertig bist.
              </p>
            </div>

            <div className="px-4 pt-6">
              <p className="section-label px-1 mb-3">Schritt 1 · Fach</p>
              {profileSubjects.length === 0 ? (
                <p className="text-text-muted text-[13px] px-1">Keine Fächer im Profil gefunden.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2">
                  {profileSubjects.map((subj) => (
                    <SubjectSquare
                      key={subj.id}
                      subject={subj}
                      noteCount={getNoteCount(subj.id)}
                      selected={subj.id === selectedSubjectId}
                      onTap={() => handleSelectSubject(subj.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {selectedSubjectId && selectedSubject && (
              <div key={selectedSubjectId} className="px-4 pt-6 animate-fade-in">
                <p className="section-label px-1 mb-3">Schritt 2 · Smart Note</p>
                <div className="space-y-2">
                  {notesForSelected.length === 0 && (
                    <p className="text-text-muted text-[12px] px-1 pb-1">
                      Noch keine Notizen für {selectedSubject.name} — kein Problem, du kannst trotzdem frei schreiben.
                    </p>
                  )}

                  <ListGroup>
                    {notesForSelected.map((item) => {
                      const isActive = noteSelection.kind === 'note' && noteSelection.item.id === item.id
                      return (
                        <ListRow
                          key={item.id}
                          leading={<SubjectIcon subjectId={selectedSubjectId} size="md" />}
                          title={item.title}
                          subtitle={
                            item.preview
                              ? `${item.isGenerated ? 'Smart Note' : 'Eigene Notiz'} · ${item.preview}`
                              : `${item.isGenerated ? 'Smart Note' : 'Eigene Notiz'} · ${formatDate(item.date)}`
                          }
                          value={
                            isActive ? (
                              <span
                                className="w-6 h-6 rounded-full flex items-center justify-center"
                                style={{ background: 'var(--grad-mode)', color: '#FFFFFF' }}
                              >
                                <Icon name="check" size={14} />
                              </span>
                            ) : (
                              <span className="text-[13px] text-text-secondary">{formatDate(item.date)}</span>
                            )
                          }
                          onClick={() => setNoteSelection({ kind: 'note', item })}
                        />
                      )
                    })}
                  </ListGroup>

                  {notesForSelected.length > 1 && (
                    <button
                      onClick={() => setNoteSelection({ kind: 'all' })}
                      className="w-full bg-surface rounded-card border p-4 text-left press flex items-center gap-3 transition-colors"
                      style={{ borderColor: noteSelection.kind === 'all' ? selectedSubject.color : 'rgb(var(--color-border) / 0.6)' }}
                    >
                      <div className="w-9 h-9 rounded-btn flex items-center justify-center shrink-0" style={{ background: `${selectedSubject.color}15` }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: selectedSubject.color }}>
                          <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-text-primary font-bold text-[13px]">Alle {notesForSelected.length} Notizen · {selectedSubject.name}</p>
                        <p className="text-text-muted text-[11px] mt-0.5">Breiteste Auswertung</p>
                      </div>
                      {noteSelection.kind === 'all' && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={selectedSubject.color} strokeWidth="2.5" className="shrink-0">
                          <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  )}

                  <button
                    onClick={() => setNoteSelection({ kind: 'none' })}
                    className="w-full bg-surface rounded-card border p-4 text-left press flex items-center gap-3 transition-colors"
                    style={{ borderColor: noteSelection.kind === 'none' ? 'rgb(var(--color-text-muted))' : 'rgb(var(--color-border) / 0.6)', borderStyle: 'dashed' }}
                  >
                    <div className="w-9 h-9 rounded-btn bg-surface-hover flex items-center justify-center shrink-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted">
                        <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-text-primary font-bold text-[13px]">Ohne Vorlage</p>
                      <p className="text-text-muted text-[11px] mt-0.5">KI bewertet allgemein</p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {upcomingExams.length > 0 && (
              <div className="px-4 pt-6 pb-4">
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
                        active={exam.subjectId === selectedSubjectId}
                        onTap={() => handleSelectSubject(exam.subjectId)}
                      />
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="px-4 pb-10 pt-3 shrink-0 border-t border-border/50">
            <button
              onClick={handleOpenWrite}
              disabled={!selectedSubjectId}
              className="w-full h-12 rounded-pill text-[15px] font-semibold press disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
              style={{ background: 'var(--grad-mode)', color: '#FFFFFF' }}
            >
              <Icon name="pencil" size={16} />
              Leere Seite öffnen
            </button>
          </div>
        </>
      )}

      {/* ── Phase: Write ──────────────────────────────────────────────────── */}
      {phase === 'write' && selected && (
        <>
          <div
            className="flex items-center justify-between px-4 shrink-0"
            style={{ paddingTop: 'max(54px, calc(env(safe-area-inset-top, 0px) + 16px))', paddingBottom: '12px' }}
          >
            <button onClick={handleCancelWrite} className="text-text-muted text-[14px] font-medium press-sm">
              Abbrechen
            </button>
            {selectedSubject && <TopicPill label={selected.title} color={selectedSubject.color} />}
          </div>

          <div className="px-5 pt-2">
            <h1 className="text-[27px] font-extrabold text-text-primary leading-tight">
              Was weißt du über {selected.title}?
            </h1>
            <p className="text-text-muted text-[13px] leading-relaxed mt-2">
              Alles, was dir einfällt. Keine Reihenfolge, keine ganzen Sätze, kein Nachschlagen.
            </p>
          </div>

          <div className="flex-1 px-5 pt-5 pb-2 min-h-0">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Beginne hier"
              autoFocus
              className="blurting-ruled w-full h-full min-h-[220px] bg-transparent text-text-primary text-[16px] placeholder-text-muted resize-none focus:outline-none"
            />
          </div>

          {error && <p className="px-4 pb-2 text-[13px] text-center" style={{ color: '#F87171' }}>{error}</p>}
          {micError && <p className="px-4 pb-2 text-[12px] text-center text-text-muted">{micError}</p>}

          <div className="px-5 pb-10 pt-1 shrink-0 space-y-3">
            <div className="flex items-center justify-between text-[12px]">
              <span style={{ color: wordCount >= MIN_WORDS ? '#34D399' : 'rgb(var(--color-text-muted))' }}>
                {wordCount} von {MIN_WORDS} Wörtern
              </span>
              <span className="text-text-muted">ca. {estimatedMinutes} Min</span>
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgb(var(--color-border) / 0.4)' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${progress}%`,
                  background: selectedSubject?.color ?? '#DB2777',
                  transition: 'width 200ms cubic-bezier(0.23, 1, 0.32, 1)',
                }}
              />
            </div>

            <div className="flex items-center gap-3">
              {speechSupported && (
                <button
                  onClick={toggleListening}
                  aria-label={listening ? 'Diktat stoppen' : 'Diktat starten'}
                  className="relative w-14 h-14 rounded-full flex items-center justify-center shrink-0 border press"
                  style={{
                    borderColor: listening ? '#DB2777' : 'rgb(var(--color-border))',
                    background: listening ? 'rgba(219,39,119,0.1)' : 'rgb(var(--color-surface))',
                  }}
                >
                  {listening && (
                    <span
                      className="mic-pulse-ring absolute inset-0 rounded-full border-2"
                      style={{ borderColor: '#DB2777' }}
                      aria-hidden="true"
                    />
                  )}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={listening ? '#DB2777' : 'currentColor'} strokeWidth="2" className="text-text-secondary relative">
                    <rect x="9" y="2" width="6" height="12" rx="3" />
                    <path d="M5 10a7 7 0 0014 0M12 19v3" strokeLinecap="round" />
                  </svg>
                </button>
              )}
              <button
                onClick={handleAuswerten}
                disabled={!text.trim() || wordCount < MIN_WORDS}
                className="flex-1 h-12 rounded-pill text-[15px] font-semibold press disabled:opacity-40 transition-opacity"
                style={{ background: 'var(--grad-mode)', color: '#FFFFFF' }}
              >
                Auswerten
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Phase: Loading ──────────────────────────────────────────────── */}
      {phase === 'loading' && (
        <div className="flex-1 flex flex-col justify-center px-5">
          <WorkingState
            tone="klausur"
            title="KI vergleicht mit deiner Notiz"
            note="Gleich siehst du, was drin war und was gefehlt hat."
          />
        </div>
      )}

      {/* ── Phase: Feedback ─────────────────────────────────────────────── */}
      {phase === 'feedback' && result && (
        <>
          <div
            className="flex items-center justify-between px-4 shrink-0"
            style={{ paddingTop: 'max(54px, calc(env(safe-area-inset-top, 0px) + 16px))', paddingBottom: '12px' }}
          >
            <button onClick={handleNewTopic} className="text-text-primary text-[14px] font-medium press-sm">
              Neues Thema
            </button>
            {selectedSubject && selected && <TopicPill label={selected.title} color={selectedSubject.color} />}
          </div>

          <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4 space-y-3">
            {result.correct.length > 0 && (
              <div className="animate-fade-in" style={{ animationDelay: '0ms' }}>
                <FeedbackSection icon="check" title="Das hattest du drin" items={result.correct} tone="green" />
              </div>
            )}
            {result.forgotten.length > 0 && (
              <div className="animate-fade-in" style={{ animationDelay: '60ms' }}>
                <FeedbackSection icon="target" title="Das hast du vergessen" items={result.forgotten} tone="orange" />
              </div>
            )}
            {result.corrections.length > 0 && (
              <div className="animate-fade-in" style={{ animationDelay: '120ms' }}>
                <FeedbackSection icon="bulb" title="Kleine Korrekturen" items={result.corrections} tone="blue" />
              </div>
            )}
          </div>
          <div className="px-4 pb-10 shrink-0">
            <button onClick={handleRetry} className="w-full h-12 rounded-pill text-[15px] font-semibold press" style={{ background: 'var(--grad-mode)', color: '#FFFFFF' }}>
              Nochmal versuchen
            </button>
          </div>
        </>
      )}

      <Dialog
        open={confirmDiscard}
        title="Text verwerfen?"
        message="Was du bisher geschrieben hast, geht dabei verloren."
        confirmLabel="Verwerfen"
        cancelLabel="Weiterschreiben"
        destructive
        onConfirm={() => { setConfirmDiscard(false); setText(''); setPhase('setup') }}
        onCancel={() => setConfirmDiscard(false)}
      />
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function TopicPill({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-[13px] font-bold max-w-[55%] truncate"
      style={{ background: `${color}18`, color }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
      <span className="truncate">{label}</span>
    </span>
  )
}

// Fachauswahl als Zeile mit fester Hoehe, nicht als Quadrat.
//
// aspect-square hat auf dem Telefon funktioniert und auf dem Schreibtisch alles
// zerrissen: In einem vierspaltigen Raster ueber 1600 px wurde jede Kachel rund
// 380 px hoch, und acht Faecher fuellten zwei Bildschirme. Eine feste Hoehe
// haelt die Auswahl auf jeder Breite gleich kompakt; nur die Anzahl der Spalten
// waechst mit dem Platz.
function SubjectSquare({
  subject, noteCount, selected, onTap,
}: {
  subject: { id: string; name: string; color: string }
  noteCount: number
  selected: boolean
  onTap: () => void
}) {
  return (
    <button
      onClick={onTap}
      aria-pressed={selected}
      className="relative h-[60px] bg-surface rounded-card border flex items-center gap-2.5 px-3 text-left press-sm transition-colors"
      style={{
        borderColor: selected ? 'rgb(var(--color-accent))' : 'rgb(var(--color-border) / 0.6)',
        borderWidth: selected ? '2px' : '1px',
        background: selected ? 'var(--color-accent-soft)' : undefined,
      }}
    >
      <SubjectIcon subjectId={subject.id} size="sm" />
      <span className="flex-1 min-w-0 text-[13px] font-semibold text-text-primary leading-tight line-clamp-2">
        {subject.name}
      </span>
      {noteCount > 0 && (
        <span
          className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-pill flex items-center justify-center text-[11px] font-bold tabular-nums"
          style={{ background: 'var(--grad-mode)', color: '#FFFFFF' }}
        >
          {noteCount > 9 ? '9+' : noteCount}
        </span>
      )}
    </button>
  )
}

function ExamSuggestionCard({
  subjectId, subjectName, examTopic, daysLeft, noteCount, suggestedTopics, active, onTap,
}: {
  subjectId: string
  subjectName: string
  examTopic?: string
  daysLeft: number
  noteCount: number
  suggestedTopics: string[]
  active: boolean
  onTap: () => void
}) {
  const badgeStyle = daysLeft <= 7
    ? { bg: 'rgba(248,113,113,0.15)', color: '#F87171' }
    : daysLeft <= 14
    ? { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B' }
    : { bg: 'rgba(148,163,184,0.12)', color: '#94A3B8' }

  return (
    <button
      onClick={onTap}
      className="w-full bg-surface rounded-card border shadow-card-adaptive p-4 flex flex-col gap-2.5 text-left press transition-colors"
      style={{ borderColor: active ? 'rgb(var(--color-accent))' : 'rgb(var(--color-border) / 0.6)' }}
    >
      <div className="flex items-center gap-3">
        <SubjectIcon subjectId={subjectId} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <p className="text-text-primary font-bold text-[14px]">{subjectName}</p>
            <span className="px-2 py-0.5 rounded-pill text-[11px] font-semibold shrink-0" style={{ background: badgeStyle.bg, color: badgeStyle.color }}>
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
          <span className="text-[11px] text-text-muted font-medium w-full mb-0.5">Mögliche Themen:</span>
          {suggestedTopics.slice(0, 6).map((t) => (
            <span key={t} className="text-[11px] px-2 py-0.5 rounded-pill bg-surface-hover text-text-muted border border-border/40">
              {t.length > 30 ? t.slice(0, 30) + '…' : t}
            </span>
          ))}
        </div>
      )}
    </button>
  )
}

// Die drei Rückmeldungen trugen ihre Bedeutung bisher als Schriftfarbe auf
// gleichfarbig getöntem Grund — grüner Text auf Grün, roter auf Rot. Jetzt
// steht die Farbe im gefüllten Zeichen, die Karte bleibt neutral und die
// Schrift behält ihren vollen Kontrast.
const TONE_FILL: Record<'green' | 'orange' | 'blue', string> = {
  green:  'bg-[rgb(120,120,128)]/[0.12] dark:bg-[rgb(120,120,128)]/[0.24] text-[rgb(var(--fill-green))]',
  orange: 'bg-[rgb(120,120,128)]/[0.12] dark:bg-[rgb(120,120,128)]/[0.24] text-[rgb(var(--fill-orange))]',
  blue:   'bg-[rgb(120,120,128)]/[0.12] dark:bg-[rgb(120,120,128)]/[0.24] text-[rgb(var(--fill-blue))]',
}

function FeedbackSection({ icon, title, items, tone }: { icon: IconName; title: string; items: string[]; tone: 'green' | 'orange' | 'blue' }) {
  return (
    <div className="rounded-card overflow-hidden bg-surface border border-border/60">
      <div className="px-4 pt-4 pb-2.5 flex items-center gap-2.5">
        <span className={`w-7 h-7 rounded-chip flex items-center justify-center shrink-0 ${TONE_FILL[tone]}`}>
          <Icon name={icon} size={15} />
        </span>
        <p className="text-[14px] font-bold text-text-primary">{title}</p>
        <span className="ml-auto text-[12px] font-semibold text-text-secondary tabular-nums">{items.length}</span>
      </div>
      <div className="px-4 pb-4 space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2.5">
            <span className="text-[13px] mt-0.5 shrink-0 font-bold text-text-muted">·</span>
            <p className="text-text-secondary text-[13px] leading-snug">{item}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
