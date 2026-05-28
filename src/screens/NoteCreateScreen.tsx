import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { answerQuestion, extractTextFromImage, generateSmartNote, suggestNoteSubject } from '../lib/groq'
import { pdfToImages } from '../lib/pdf'
import { useUser } from '../context/UserContext'
import { subjects, halfYears } from '../data/mockData'
import type { GeneratedSmartNote, UserNote } from '../types'

type AiStatus = 'idle' | 'analyzing' | 'done' | 'error'

export function NoteCreateScreen() {
  const { id, folderId } = useParams<{ id?: string; folderId?: string }>()
  const navigate = useNavigate()
  const { profile, saveNote, userFolders, userNotes, saveToOhneFachFolder } = useUser()

  const [noteId] = useState(() => `note-${crypto.randomUUID()}`)

  const subjectFromUrl = id ? subjects.find((s) => s.id === id) : null
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(id ?? '')
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [selectedFolderId, setSelectedFolderId] = useState<string>(folderId ?? '')
  const subject = subjects.find((s) => s.id === selectedSubjectId) ?? null

  const [title, setTitle] = useState(subjectFromUrl ? `${subjectFromUrl.name}: ` : '')
  const [content, setContent] = useState('')
  const [attachments, setAttachments] = useState<string[]>([])
  const [pdfLoading, setPdfLoading] = useState(false)
  const [aiStatus, setAiStatus] = useState<AiStatus>('idle')
  const [aiError, setAiError] = useState('')
  const [generatedNote, setGeneratedNote] = useState<GeneratedSmartNote | null>(null)

  // Quick Ask
  const [showAskBar, setShowAskBar] = useState(false)
  const [askInput, setAskInput] = useState('')
  const [askLoading, setAskLoading] = useState(false)
  const [qaItems, setQaItems] = useState<{ q: string; a: string; open: boolean }[]>([])

  // No-subject save modal
  const [showNoSubjectModal, setShowNoSubjectModal] = useState(false)
  const [suggestionStatus, setSuggestionStatus] = useState<'loading' | 'done' | 'none'>('loading')
  const [suggestion, setSuggestion] = useState<{ subjectId: string; subjectName: string; reason: string } | null>(null)

  const cameraRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const profileSubjects = (profile?.faecher ?? [])
    .map((sid) => subjects.find((s) => s.id === sid))
    .filter((s): s is NonNullable<typeof s> => s !== undefined)

  // ── File handling ────────────────────────────────────────────────────────

  const handleFile = (file: File | undefined) => {
    if (!file) return
    if (file.type === 'application/pdf') {
      setPdfLoading(true)
      pdfToImages(file)
        .then((pages) => setAttachments((prev) => [...prev, ...pages]))
        .catch(() => {})
        .finally(() => {
          setPdfLoading(false)
          if (fileRef.current) fileRef.current.value = ''
        })
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      setAttachments((prev) => [...prev, e.target?.result as string])
      if (cameraRef.current) cameraRef.current.value = ''
      if (fileRef.current) fileRef.current.value = ''
    }
    reader.readAsDataURL(file)
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  // ── KI Analysis ──────────────────────────────────────────────────────────

  const analyze = async () => {
    const subjectName = subject?.name ?? 'Allgemein'
    setAiStatus('analyzing')
    setAiError('')
    try {
      let rawText = content.trim()
      for (const img of attachments) {
        const ocrText = await extractTextFromImage(img)
        rawText = rawText ? `${rawText}\n\n${ocrText}` : ocrText
      }
      if (!rawText) throw new Error('Kein Text zum Analysieren gefunden.')
      const note = await generateSmartNote(rawText, subjectName, noteId)
      setGeneratedNote(note)
      setAiStatus('done')
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Unbekannter Fehler')
      setAiStatus('error')
    }
  }

  const canAnalyze = (attachments.length > 0 || content.trim().length > 10) && aiStatus !== 'analyzing' && !pdfLoading

  // ── Save ─────────────────────────────────────────────────────────────────

  const submitAsk = async () => {
    const q = askInput.trim()
    if (!q || askLoading) return
    setAskInput('')
    setShowAskBar(false)
    setAskLoading(true)
    setQaItems((prev) => [...prev, { q, a: '', open: true }])
    try {
      const a = await answerQuestion(q, subject?.name ?? 'Allgemein', content.trim() || undefined)
      setQaItems((prev) => prev.map((item, i) => i === prev.length - 1 ? { ...item, a } : item))
    } catch {
      setQaItems((prev) => prev.map((item, i) => i === prev.length - 1 ? { ...item, a: 'Antwort konnte nicht geladen werden.' } : item))
    } finally {
      setAskLoading(false)
    }
  }

  const toggleQA = (index: number) => {
    setQaItems((prev) => prev.map((item, i) => i === index ? { ...item, open: !item.open } : item))
  }

  const buildNote = (subjectId: string | undefined, finalFolderId: string | undefined): UserNote => ({
    id: noteId,
    subjectId: subjectId || undefined,
    folderId: finalFolderId || undefined,
    title: title.trim() || 'Neue Notiz',
    content: content.trim(),
    attachments: attachments.length > 0 ? attachments : undefined,
    qa: qaItems.length > 0 ? qaItems.map(({ q, a }) => ({ q, a })) : undefined,
    createdAt: new Date().toISOString(),
  })

  const confirmSave = (finalFolderId: string) => {
    saveNote(buildNote(selectedSubjectId, finalFolderId), generatedNote ?? undefined)
    setShowSaveModal(false)
    if (finalFolderId && selectedSubjectId) navigate(`/unterricht/${selectedSubjectId}/ordner/${finalFolderId}`)
    else if (selectedSubjectId) navigate(`/unterricht/${selectedSubjectId}`)
    else navigate('/unterricht')
  }

  const openNoSubjectModal = async () => {
    setShowNoSubjectModal(true)
    setSuggestion(null)
    setSuggestionStatus('loading')
    const text = generatedNote?.rawText ?? content.trim()
    if (!text || profileSubjects.length === 0) { setSuggestionStatus('none'); return }
    const result = await suggestNoteSubject(text, profileSubjects)
    setSuggestion(result)
    setSuggestionStatus(result ? 'done' : 'none')
  }

  const acceptSuggestion = () => {
    if (!suggestion) return
    saveNote(buildNote(suggestion.subjectId, undefined), generatedNote ?? undefined)
    setShowNoSubjectModal(false)
    navigate(`/unterricht/${suggestion.subjectId}`)
  }

  const saveToOhneFach = () => {
    const note = buildNote(undefined, 'folder-no-subject')
    saveToOhneFachFolder(note, generatedNote ?? undefined)
    setShowNoSubjectModal(false)
    navigate('/unterricht/ohne-fach/ordner/folder-no-subject')
  }

  const handleSavePress = () => {
    if (!title.trim() && !content.trim() && attachments.length === 0) { navigate(-1); return }
    if (folderId) { confirmSave(folderId); return }
    if (!selectedSubjectId) { void openNoSubjectModal(); return }
    setShowSaveModal(true)
  }

  const ohneFachNoteCount = userNotes.filter((n) => n.folderId === 'folder-no-subject').length

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen bg-background">

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-12 pb-3 border-b border-border shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="text-text-muted text-sm hover:text-text-secondary transition-colors px-1 py-1"
        >
          Abbrechen
        </button>
        <div className="flex items-center gap-2">
          {subject && (
            <div className="w-6 h-6 rounded flex items-center justify-center text-sm"
              style={{ backgroundColor: `${subject.color}22` }}>
              {subject.icon}
            </div>
          )}
          <span className="text-text-primary font-semibold text-sm">Neue Notiz</span>
        </div>
        <button
          onClick={handleSavePress}
          className="text-accent text-sm font-semibold hover:opacity-80 transition-opacity px-1 py-1"
        >
          Speichern
        </button>
      </div>

      {/* Subject picker */}
      {!id && (
        <div className="px-4 py-2 border-b border-border shrink-0 bg-background">
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedSubjectId('')}
              className={`px-3 py-1 rounded-pill text-xs font-medium border transition-all ${
                selectedSubjectId === ''
                  ? 'bg-surface-hover border-border text-text-secondary'
                  : 'border-border text-text-muted hover:bg-surface-hover'
              }`}
            >
              Kein Fach
            </button>
            {profileSubjects.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setSelectedSubjectId(s.id)
                  if (!title.trim() || title === `${subject?.name}: `) setTitle(`${s.name}: `)
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-pill text-xs font-medium border transition-all ${
                  selectedSubjectId === s.id ? 'text-white border-transparent' : 'border-border text-text-muted hover:bg-surface-hover'
                }`}
                style={selectedSubjectId === s.id ? { backgroundColor: s.color } : undefined}
              >
                {s.icon} {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── ZONE 1 — PHOTO STRIP (never scrolls away) ──────────────────── */}
      <div className="shrink-0 border-b border-border bg-background px-4 py-2">
        <div className="flex gap-2 overflow-x-auto py-1" style={{ scrollbarWidth: 'none' }}>

          {/* Add buttons — always at the start, always visible */}
          <button
            onClick={() => cameraRef.current?.click()}
            className="w-16 h-16 shrink-0 rounded-card border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 hover:border-accent hover:bg-accent/5 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-text-muted">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <span className="text-[9px] text-text-muted font-medium leading-none">Foto</span>
          </button>

          <button
            onClick={() => fileRef.current?.click()}
            className="w-16 h-16 shrink-0 rounded-card border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 hover:border-accent hover:bg-accent/5 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-text-muted">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" />
            </svg>
            <span className="text-[9px] text-text-muted font-medium leading-none">Upload</span>
          </button>

          {/* Divider when photos exist */}
          {(attachments.length > 0 || pdfLoading) && (
            <div className="w-px h-16 bg-border shrink-0 self-center" />
          )}

          {/* Thumbnails */}
          {attachments.map((src, i) => (
            <div key={i} className="relative shrink-0">
              <img src={src} alt={`Seite ${i + 1}`} className="w-16 h-16 object-cover rounded-card border border-border" />
              <button
                onClick={() => removeAttachment(i)}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-background border border-border flex items-center justify-center shadow-sm"
              >
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
              <div className="absolute bottom-0.5 left-0.5 bg-black/50 rounded px-1">
                <span className="text-[9px] text-white font-medium">{i + 1}</span>
              </div>
            </div>
          ))}

          {/* PDF loading placeholder */}
          {pdfLoading && (
            <div className="w-16 h-16 shrink-0 rounded-card border border-border bg-surface flex flex-col items-center justify-center gap-1">
              <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <span className="text-[9px] text-text-muted">PDF…</span>
            </div>
          )}
        </div>
      </div>

      {/* ── ZONE 2 — SCROLLABLE CONTENT ────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">

        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titel"
          autoFocus={!!id}
          className="w-full bg-transparent px-4 pt-4 pb-2 text-text-primary text-lg font-semibold placeholder-text-muted focus:outline-none border-b border-border"
        />

        {/* Content textarea */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Schreib deine Mitschrift, Stichpunkte, Formeln oder ganze Sätze…"
          className="w-full bg-transparent px-4 py-4 text-text-secondary text-sm placeholder-text-muted focus:outline-none resize-none leading-relaxed"
          style={{ minHeight: '200px' }}
        />

        {/* Q&A section */}
        {(qaItems.length > 0 || askLoading) && (
          <div className="mx-4 mb-4 space-y-2">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider px-1">Fragen & Antworten</p>
            {qaItems.map((item, i) => (
              <div key={i} className="bg-surface border border-border rounded-card overflow-hidden">
                <button
                  onClick={() => toggleQA(i)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-surface-hover transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7C6FFF" strokeWidth="2.5" className="shrink-0">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="text-text-primary text-sm font-medium truncate">{item.q}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {!item.a && <div className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-text-muted transition-transform ${item.open ? '' : '-rotate-90'}`}>
                      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </button>
                {item.open && item.a && (
                  <div className="px-4 pb-3 border-t border-border bg-accent/5">
                    <p className="text-text-secondary text-sm leading-relaxed pt-2">{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* KI result */}
        {aiStatus === 'analyzing' && (
          <div className="mx-4 mb-4 px-4 py-4 bg-surface border border-border rounded-card flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin shrink-0" />
            <p className="text-text-secondary text-sm">
              KI analysiert{attachments.length > 1 ? ` ${attachments.length} Bilder` : ''}…
            </p>
          </div>
        )}

        {aiStatus === 'error' && (
          <div className="mx-4 mb-4 px-4 py-3 rounded-card" style={{ backgroundColor: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
            <p className="text-sm font-medium mb-0.5" style={{ color: '#F87171' }}>Analyse fehlgeschlagen</p>
            <p className="text-xs" style={{ color: '#F87171', opacity: 0.8 }}>{aiError}</p>
          </div>
        )}

        {aiStatus === 'done' && generatedNote && (
          <div className="mx-4 mb-4 space-y-2">
            <div className="flex items-center gap-2 px-1">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-xs text-success font-semibold">KI-Analyse abgeschlossen</span>
            </div>

            <div className="bg-surface border border-border rounded-card px-4 py-3">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Zusammenfassung</p>
              <p className="text-text-secondary text-sm leading-relaxed">{generatedNote.summary}</p>
            </div>

            {generatedNote.keywords.length > 0 && (
              <div className="bg-surface border border-border rounded-card px-4 py-3">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Schlüsselbegriffe</p>
                <div className="flex flex-wrap gap-1.5">
                  {generatedNote.keywords.map((kw) => (
                    <span key={kw} className="px-2.5 py-1 rounded-pill text-xs font-medium bg-surface-hover border border-border text-text-secondary">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {generatedNote.examTopics.length > 0 && (
              <div className="bg-surface border border-border rounded-card px-4 py-3">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Mögliche Klausurthemen</p>
                <ul className="space-y-1.5">
                  {generatedNote.examTopics.map((t, i) => (
                    <li key={i} className="flex gap-2 items-start text-sm text-text-secondary">
                      <span className="text-accent font-bold shrink-0">{i + 1}.</span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Bottom padding so content isn't hidden behind toolbar */}
        <div className="h-4" />
      </div>

      {/* ── ZONE 3 — STICKY BOTTOM TOOLBAR ─────────────────────────────── */}
      <div className="shrink-0 border-t border-border px-3 py-3 bg-surface">
        {showAskBar ? (
          /* Ask mode */
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowAskBar(false); setAskInput('') }}
              className="w-8 h-8 rounded-btn flex items-center justify-center hover:bg-surface-hover transition-colors shrink-0"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-text-muted">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
            <input
              autoFocus
              type="text"
              value={askInput}
              onChange={(e) => setAskInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void submitAsk()}
              placeholder="Begriff oder Frage eingeben…"
              className="flex-1 bg-background border border-border rounded-card px-3 py-2 text-text-primary text-sm placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
            />
            <button
              onClick={() => void submitAsk()}
              disabled={!askInput.trim()}
              className={`w-8 h-8 rounded-btn flex items-center justify-center shrink-0 transition-all ${
                askInput.trim() ? 'bg-accent text-white hover:opacity-90 active:scale-95' : 'bg-surface-hover text-text-muted cursor-not-allowed'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        ) : (
          /* Normal mode */
          <div className="flex items-center gap-2">
            {/* Status */}
            <div className="flex-1 min-w-0">
              {attachments.length > 0 || wordCount > 0 ? (
                <p className="text-xs text-text-muted truncate">
                  {[
                    attachments.length > 0 && `${attachments.length} ${attachments.length === 1 ? 'Foto' : 'Fotos'}`,
                    wordCount > 0 && `${wordCount} ${wordCount === 1 ? 'Wort' : 'Wörter'}`,
                    qaItems.length > 0 && `${qaItems.length} ${qaItems.length === 1 ? 'Frage' : 'Fragen'}`,
                  ].filter(Boolean).join(' · ')}
                </p>
              ) : (
                <p className="text-xs text-text-muted">Fotos oder Text hinzufügen</p>
              )}
            </div>

            {/* Fragen button */}
            <button
              onClick={() => setShowAskBar(true)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-card text-sm font-semibold border border-accent/40 text-accent hover:bg-accent/5 active:scale-95 transition-all duration-150"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Fragen
            </button>

            {/* KI Button */}
            <button
              onClick={() => void analyze()}
              disabled={!canAnalyze}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-card text-sm font-semibold transition-all duration-150 ${
                !canAnalyze
                  ? 'bg-surface-hover text-text-muted cursor-not-allowed'
                  : aiStatus === 'done'
                  ? 'bg-success/10 text-success border border-success/30 hover:bg-success/15'
                  : 'bg-accent text-white hover:opacity-90 active:scale-95'
              }`}
            >
              {aiStatus === 'analyzing' ? (
                <>
                  <div className="w-3 h-3 border-2 border-current/40 border-t-current rounded-full animate-spin" />
                  Läuft…
                </>
              ) : aiStatus === 'done' ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M1 4v6h6M23 20v-6h-6" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Erneut
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Analysieren
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])} />
      <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])} />

      {/* ── NO-SUBJECT SAVE MODAL ───────────────────────────────────────── */}
      {showNoSubjectModal && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowNoSubjectModal(false)} />
          <div className="relative max-w-lg mx-auto w-full bg-surface border-t border-border rounded-t-2xl z-10 max-h-[85vh] flex flex-col">
            <div className="px-5 pt-5 pb-4 border-b border-border shrink-0">
              <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-base font-bold text-text-primary">Wo speichern?</h2>
                  <p className="text-text-muted text-xs mt-0.5">Kein Fach ausgewählt — wähle eine Option</p>
                </div>
                <button
                  onClick={() => navigate(-1)}
                  className="p-1.5 rounded-btn hover:bg-danger/5 transition-colors -mt-0.5 -mr-1"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-danger">
                    <polyline points="3 6 5 6 21 6" strokeLinecap="round" />
                    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M10 11v6M14 11v6" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 px-4 py-4 space-y-2.5 pb-10">

              {/* KI-Vorschlag */}
              {suggestionStatus === 'loading' && (
                <div className="flex items-center gap-3 px-4 py-3.5 bg-surface border border-border rounded-card">
                  <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin shrink-0" />
                  <p className="text-text-secondary text-sm">KI analysiert Notizinhalt…</p>
                </div>
              )}
              {suggestionStatus === 'done' && suggestion && (
                <button
                  onClick={acceptSuggestion}
                  className="w-full flex items-center gap-3 px-4 py-3.5 bg-accent/5 border border-accent/20 rounded-card text-left hover:bg-accent/10 active:scale-95 transition-all"
                >
                  <div className="w-9 h-9 rounded-btn bg-accent/10 flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7C6FFF" strokeWidth="2">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[10px] font-bold text-accent uppercase tracking-wider">KI-Vorschlag</span>
                    </div>
                    <p className="text-text-primary text-sm font-semibold">{suggestion.subjectName}</p>
                    <p className="text-text-muted text-xs mt-0.5 line-clamp-1">{suggestion.reason}</p>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7C6FFF" strokeWidth="2.5">
                    <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}

              {/* Manuell wählen */}
              <button
                onClick={() => setShowNoSubjectModal(false)}
                className="w-full flex items-center gap-3 px-4 py-3.5 bg-surface border border-border rounded-card text-left hover:bg-surface-hover active:scale-95 transition-all"
              >
                <div className="w-9 h-9 rounded-btn bg-surface-hover flex items-center justify-center shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-text-secondary">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <p className="text-text-primary text-sm font-medium">Manuell wählen</p>
                  <p className="text-text-muted text-xs mt-0.5">Fach oben auswählen, dann erneut speichern</p>
                </div>
              </button>

              {/* Schnellnotizen */}
              <button
                onClick={saveToOhneFach}
                className="w-full flex items-center gap-3 px-4 py-3.5 bg-surface border border-border rounded-card text-left hover:bg-surface-hover active:scale-95 transition-all"
              >
                <div className="w-9 h-9 rounded-btn bg-surface-hover flex items-center justify-center shrink-0 text-base">
                  📁
                </div>
                <div>
                  <p className="text-text-primary text-sm font-medium">Schnellnotizen</p>
                  <p className="text-text-muted text-xs mt-0.5">
                    {ohneFachNoteCount > 0
                      ? `${ohneFachNoteCount} ${ohneFachNoteCount === 1 ? 'Notiz' : 'Notizen'} bereits dort`
                      : 'Separater Ordner für nicht zugeordnete Notizen'}
                  </p>
                </div>
              </button>
            </div>
          </div>

        </div>
      )}

      {/* ── SAVE MODAL ──────────────────────────────────────────────────── */}
      {showSaveModal && (() => {
        const subjectFolders = userFolders.filter((f) => f.subjectId === selectedSubjectId)
        const grouped = halfYears
          .map((hy) => ({ halfYear: hy, folders: subjectFolders.filter((f) => f.halfYearId === hy.id) }))
          .filter((g) => g.folders.length > 0)
        const ungrouped = subjectFolders.filter((f) => !f.halfYearId)
        return (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            <div className="absolute inset-0 bg-black/60" onClick={() => setShowSaveModal(false)} />
            <div className="relative max-w-lg mx-auto w-full bg-surface border-t border-border rounded-t-2xl z-10 max-h-[80vh] flex flex-col">
              <div className="px-5 pt-5 pb-3 border-b border-border shrink-0">
                <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-base font-bold text-text-primary">Wo speichern?</h2>
                    <p className="text-text-muted text-xs mt-0.5">
                      {subject ? `${subject.icon} ${subject.name}` : 'Kein Fach'}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate(-1)}
                    className="p-1.5 rounded-btn hover:bg-danger/5 transition-colors -mt-0.5 -mr-1"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-danger">
                      <polyline points="3 6 5 6 21 6" strokeLinecap="round" />
                      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M10 11v6M14 11v6" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto flex-1">
                <button
                  onClick={() => { setSelectedFolderId(''); confirmSave('') }}
                  className={`w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-surface-hover transition-colors border-b border-border ${selectedFolderId === '' ? 'bg-accent/5' : ''}`}
                >
                  <div className="w-8 h-8 rounded-btn bg-surface-hover flex items-center justify-center shrink-0">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">Direkt im Fach</p>
                    <p className="text-text-muted text-xs">Ohne Unterordner speichern</p>
                  </div>
                </button>
                {grouped.map(({ halfYear, folders }) => (
                  <div key={halfYear.id}>
                    <div className="px-5 py-2 bg-background/40">
                      <span className="text-xs font-semibold text-text-muted">{halfYear.name}</span>
                      {halfYear.isCurrent && <span className="ml-2 text-xs text-accent font-medium">Aktuell</span>}
                    </div>
                    {folders.map((folder) => (
                      <button
                        key={folder.id}
                        onClick={() => { setSelectedFolderId(folder.id); confirmSave(folder.id) }}
                        className={`w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-surface-hover transition-colors border-b border-border ${selectedFolderId === folder.id ? 'bg-accent/5' : ''}`}
                      >
                        <div className="w-8 h-8 rounded-btn flex items-center justify-center shrink-0" style={{ backgroundColor: `${subject?.color ?? '#7C6FFF'}22` }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={subject?.color ?? '#7C6FFF'} strokeWidth="1.8">
                            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                        <p className="text-sm font-medium text-text-primary flex-1 truncate">{folder.name}</p>
                        {selectedFolderId === folder.id && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7C6FFF" strokeWidth="2.5">
                            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                ))}
                {ungrouped.map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => { setSelectedFolderId(folder.id); confirmSave(folder.id) }}
                    className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-surface-hover transition-colors border-b border-border"
                  >
                    <div className="w-8 h-8 rounded-btn flex items-center justify-center shrink-0" style={{ backgroundColor: `${subject?.color ?? '#7C6FFF'}22` }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={subject?.color ?? '#7C6FFF'} strokeWidth="1.8">
                        <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-text-primary flex-1 truncate">{folder.name}</p>
                  </button>
                ))}
                {subjectFolders.length === 0 && (
                  <div className="px-5 py-6 text-center text-text-muted text-sm">
                    Noch keine Ordner für dieses Fach.
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
