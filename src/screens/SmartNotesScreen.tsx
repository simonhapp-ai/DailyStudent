import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Header } from '../components/ui/Header'
import { MathRenderer } from '../components/ui/MathRenderer'
import { useUser } from '../context/UserContext'
import { explainKeyword, extractTextFromImage, generateFlashcards, generateSmartNote } from '../lib/groq'
import { pdfToImages } from '../lib/pdf'
import { getAttachment, useResolvedAttachments, hasLocalOnlyAttachments, transferNoteAttachmentsToCloud } from '../lib/noteStorage'
import { SUBJECT_INFO } from '../data/subjectInfo'
import type { FlashCard, GeneratedSmartNote, UserNote } from '../types'

function CollapsibleSection({
  title, children, badge, defaultOpen = true,
}: {
  title: string; children: React.ReactNode; badge?: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-surface rounded-card shadow-card-adaptive border border-border/60 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-surface-hover transition-colors press-sm"
      >
        <div className="flex items-center gap-2">
          <span className="text-text-primary font-semibold text-sm">{title}</span>
          {badge}
        </div>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className={`text-text-muted transition-transform ${open ? '' : '-rotate-90'}`}
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}

type AnalysisStatus = 'idle' | 'analyzing' | 'done' | 'error'

export function SmartNotesScreen() {
  const { id, lessonId } = useParams<{ id: string; lessonId: string }>()
  const navigate = useNavigate()
  const { generatedNotes, userNotes, completedHomeworkIds, saveGeneratedNote, updateUserNote, deleteUserNote, saveFlashCards, getKc, authUser } = useUser()

  const subject = SUBJECT_INFO[id ?? '']
  const userNote = userNotes.find((n) => n.id === lessonId)

  const lessonTitle = userNote?.title ?? 'Notiz'
  const generatedNote = generatedNotes[lessonId ?? '']

  const note = {
    summary: generatedNote?.summary ?? null,
    keywords: generatedNote?.keywords ?? [],
    examTopics: generatedNote?.examTopics ?? [],
    solution: generatedNote?.solution,
    tasks: generatedNote?.tasks,
  }

  // ── Delete confirmation state ─────────────────────────────────────────────
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // ── Edit mode state ──────────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editAttachments, setEditAttachments] = useState<string[]>([])
  const [pdfLoading, setPdfLoading] = useState(false)
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>('idle')
  const [analysisError, setAnalysisError] = useState('')
  const [editGeneratedNote, setEditGeneratedNote] = useState<GeneratedSmartNote | null>(null)
  const [fcStatus, setFcStatus] = useState<'idle' | 'generating' | 'done' | 'error'>('idle')
  const [fcCount, setFcCount] = useState(0)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null)
  const [explanations, setExplanations] = useState<Record<string, string>>({})
  const [loadingKeyword, setLoadingKeyword] = useState<string | null>(null)
  const [transferStatus, setTransferStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const cameraRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const transferToCloud = async () => {
    if (!userNote || !authUser) return
    setTransferStatus('uploading')
    try {
      const updated = await transferNoteAttachmentsToCloud(authUser.id, userNote)
      if (updated) updateUserNote(updated)
      setTransferStatus('done')
    } catch {
      setTransferStatus('error')
    }
  }

  const startEdit = () => {
    setEditTitle(userNote?.title ?? '')
    setEditContent(userNote?.content ?? '')
    setEditAttachments(userNote?.attachments ?? [])
    setEditGeneratedNote(null)
    setAnalysisStatus('idle')
    setAnalysisError('')
    setIsEditing(true)
  }

  const cancelEdit = () => {
    setIsEditing(false)
    setEditGeneratedNote(null)
    setAnalysisStatus('idle')
  }

  const handleKeywordClick = async (kw: string) => {
    if (selectedKeyword === kw) { setSelectedKeyword(null); return }
    setSelectedKeyword(kw)
    if (explanations[kw] !== undefined) return
    setLoadingKeyword(kw)
    try {
      const text = await explainKeyword(kw, subject?.name ?? 'Allgemein', note.summary ?? undefined, getKc(id ?? '') ?? undefined)
      setExplanations((prev) => ({ ...prev, [kw]: text }))
    } catch {
      setExplanations((prev) => ({ ...prev, [kw]: 'Erklärung konnte nicht geladen werden.' }))
    } finally {
      setLoadingKeyword(null)
    }
  }

  const saveEdit = () => {
    if (!userNote) return
    const updated: UserNote = {
      ...userNote,
      title: editTitle.trim() || userNote.title,
      content: editContent,
      attachments: editAttachments.length > 0 ? editAttachments : undefined,
    }
    updateUserNote(updated)
    if (editGeneratedNote && lessonId) saveGeneratedNote(lessonId, editGeneratedNote)
    navigate('/unterricht')
  }

  const handleAddFile = (file: File | undefined) => {
    if (!file) return
    if (file.type === 'application/pdf') {
      setPdfLoading(true)
      pdfToImages(file)
        .then((pages) => setEditAttachments((prev) => [...prev, ...pages]))
        .catch(() => {})
        .finally(() => {
          setPdfLoading(false)
          if (fileRef.current) fileRef.current.value = ''
        })
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      setEditAttachments((prev) => [...prev, e.target?.result as string])
      if (cameraRef.current) cameraRef.current.value = ''
      if (fileRef.current) fileRef.current.value = ''
    }
    reader.readAsDataURL(file)
  }

  const removeEditAttachment = (i: number) => {
    setEditAttachments((prev) => prev.filter((_, idx) => idx !== i))
  }

  const reanalyze = async () => {
    const subjectName = subject?.name ?? 'Allgemein'
    setAnalysisStatus('analyzing')
    setAnalysisError('')
    try {
      let rawText = editContent.trim()
      const allRefs = [...editAttachments, ...(userNote?.drawingAttachments ?? [])]
      const allImages = await Promise.all(allRefs.map((ref) => getAttachment(ref)))
      for (const img of allImages) {
        if (!img) continue
        const ocrText = await extractTextFromImage(img)
        if (ocrText.trim()) rawText = rawText ? `${rawText}\n\n${ocrText}` : ocrText
      }
      if (!rawText) throw new Error('Kein Text zum Analysieren gefunden.')
      const newNote = await generateSmartNote(rawText, subjectName, lessonId ?? '', getKc(id ?? '') ?? undefined)
      setEditGeneratedNote(newNote)
      setAnalysisStatus('done')
    } catch (e) {
      setAnalysisError(e instanceof Error ? e.message : 'Analyse fehlgeschlagen')
      setAnalysisStatus('error')
    }
  }

  const canReanalyze = (editAttachments.length > 0 || editContent.trim().length > 10) && analysisStatus !== 'analyzing' && !pdfLoading

  const handleCreateFlashCards = async () => {
    const sourceNote = generatedNote
    if (!sourceNote) return
    setFcStatus('generating')
    try {
      const subjectId = userNote?.subjectId ?? id ?? 'unknown'
      const pairs = await generateFlashcards(sourceNote, 7, getKc(subjectId) ?? undefined)
      const cards: FlashCard[] = pairs.map((p, i) => ({
        id: `fc-${lessonId}-${i}-${Date.now()}`,
        subjectId,
        noteId: lessonId ?? '',
        front: p.front,
        back: p.back,
        keywords: p.keywords ?? [],
        createdAt: new Date().toISOString(),
      }))
      saveFlashCards(cards)
      setFcCount(cards.length)
      setFcStatus('done')
    } catch {
      setFcStatus('error')
    }
  }

  const drawingSet = new Set(userNote?.drawingAttachments ?? [])
  const photos = isEditing ? editAttachments : (userNote?.attachments ?? []).filter(url => !drawingSet.has(url))
  const drawings = userNote?.drawingAttachments ?? []
  const resolvedPhotos = useResolvedAttachments(photos)
  const resolvedDrawings = useResolvedAttachments(drawings)
  const resolvedEditAttachments = useResolvedAttachments(editAttachments)

  // ── Guard ────────────────────────────────────────────────────────────────
  if (!userNote) {
    return <div className="p-4 text-text-secondary">Notiz nicht gefunden.</div>
  }

  // ── Edit mode ────────────────────────────────────────────────────────────
  if (isEditing && userNote) {
    const displayNote = editGeneratedNote
      ? { summary: editGeneratedNote.summary, keywords: editGeneratedNote.keywords, examTopics: editGeneratedNote.examTopics }
      : { summary: note.summary, keywords: note.keywords, examTopics: note.examTopics }

    return (
      <div className="flex flex-col min-h-screen bg-background pb-24">
        {/* Edit header */}
        <div className="flex items-center justify-between px-4 pt-12 pb-4 border-b border-border">
          <button
            onClick={cancelEdit}
            className="text-text-muted text-sm hover:text-text-secondary transition-colors px-1 py-1"
          >
            Abbrechen
          </button>
          <span className="text-text-primary font-semibold text-sm">Bearbeiten</span>
          <button
            onClick={saveEdit}
            className="text-accent text-sm font-semibold hover:opacity-80 transition-opacity px-1 py-1"
          >
            Speichern
          </button>
        </div>

        <div className="px-4 pt-4 space-y-4">
          {/* Title */}
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Titel"
            className="w-full bg-surface border border-border rounded-card px-4 py-3 text-text-primary text-base font-semibold placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
          />

          {/* Photos */}
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Fotos / Arbeitsblätter</p>
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {resolvedEditAttachments.map((src, i) => (
                <div key={i} className="relative shrink-0">
                  <img src={src} alt={`Seite ${i + 1}`} className="w-24 h-24 object-cover rounded-card border border-border" />
                  <button
                    onClick={() => removeEditAttachment(i)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-background/90 border border-border flex items-center justify-center"
                  >
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                    </svg>
                  </button>
                  <div className="absolute bottom-1 left-1 bg-background/80 rounded px-1">
                    <span className="text-[10px] text-text-muted font-medium">{i + 1}</span>
                  </div>
                </div>
              ))}
              {pdfLoading && (
                <div className="w-24 h-24 shrink-0 rounded-card border border-border bg-surface flex flex-col items-center justify-center gap-1.5">
                  <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  <span className="text-text-muted text-[10px]">PDF…</span>
                </div>
              )}
              {/* Add buttons */}
              <button
                onClick={() => cameraRef.current?.click()}
                className="w-24 h-24 shrink-0 rounded-card border-2 border-dashed border-border bg-background flex flex-col items-center justify-center gap-1 hover:bg-surface-hover hover:border-accent transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-text-muted">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <span className="text-[10px] text-text-muted">Foto</span>
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                className="w-24 h-24 shrink-0 rounded-card border-2 border-dashed border-border bg-background flex flex-col items-center justify-center gap-1 hover:bg-surface-hover hover:border-accent transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-text-muted">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" />
                </svg>
                <span className="text-[10px] text-text-muted">Hochladen</span>
              </button>
            </div>
          </div>

          {/* Mitschrift */}
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Meine Mitschrift</p>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="Eigene Notizen, Stichpunkte, Kommentare…"
              className="w-full bg-surface border border-border rounded-card px-4 py-3 text-text-secondary text-sm placeholder-text-muted focus:outline-none focus:border-accent transition-colors resize-none leading-relaxed"
              style={{ minHeight: '140px' }}
            />
          </div>

          {/* KI-Analyse section */}
          <div className="bg-surface border border-border rounded-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <span className="text-text-primary font-semibold text-sm">📝 KI-Analyse</span>
              <button
                onClick={() => void reanalyze()}
                disabled={!canReanalyze}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-btn text-xs font-semibold transition-all ${
                  canReanalyze
                    ? 'grad-accent text-white hover:opacity-90'
                    : 'bg-surface-hover text-text-muted cursor-not-allowed'
                }`}
              >
                {analysisStatus === 'analyzing' ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Läuft…
                  </>
                ) : (
                  <>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Neu analysieren
                  </>
                )}
              </button>
            </div>
            <div className="px-4 py-3">
              {analysisStatus === 'error' && (
                <p className="text-sm mb-3" style={{ color: '#F87171' }}>{analysisError}</p>
              )}
              {analysisStatus === 'done' && editGeneratedNote && (
                <p className="text-xs text-success font-medium mb-2">✓ Neue Analyse bereit — wird beim Speichern übernommen</p>
              )}
              {displayNote.summary ? (
                <p className="text-text-secondary text-sm leading-relaxed">{displayNote.summary}</p>
              ) : (
                <p className="text-text-muted text-sm">Noch keine KI-Zusammenfassung vorhanden.</p>
              )}
            </div>
          </div>
        </div>

        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
          onChange={(e) => handleAddFile(e.target.files?.[0])} />
        <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden"
          onChange={(e) => handleAddFile(e.target.files?.[0])} />
      </div>
    )
  }

  // ── View mode ────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      <Header
        title="Smart Notes"
        subtitle={lessonTitle}
        showBack
        right={
          userNote ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-8 h-8 flex items-center justify-center rounded-btn bg-surface border border-border text-text-muted hover:text-danger hover:bg-danger/5 hover:border-danger/30 transition-colors"
                title="Notiz löschen"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                </svg>
              </button>
              <button
                onClick={startEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-btn bg-surface border border-border text-text-secondary text-xs font-medium hover:bg-surface-hover transition-colors"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Bearbeiten
              </button>
            </div>
          ) : undefined
        }
      />

      <div className="px-4 space-y-3 mt-1">

        {/* Fotos */}
        {photos.length > 0 && (
          <CollapsibleSection
            title="📸 Fotos"
            badge={<span className="text-xs px-1.5 py-0.5 rounded bg-surface-hover text-text-muted font-medium">{photos.length}</span>}
          >
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {resolvedPhotos.map((src, i) => (
                <button key={i} onClick={() => setLightbox(src)} className="relative shrink-0 focus:outline-none">
                  <img
                    src={src}
                    alt={`Seite ${i + 1}`}
                    className="w-28 h-28 object-cover rounded-card border border-border hover:opacity-90 transition-opacity"
                  />
                  <div className="absolute bottom-1 left-1 bg-background/80 rounded px-1.5 py-0.5">
                    <span className="text-[10px] text-text-muted font-medium">{i + 1}</span>
                  </div>
                </button>
              ))}
            </div>
            <p className="text-xs text-text-muted mt-2">Antippen zum Vergrößern</p>
          </CollapsibleSection>
        )}

        {/* Schreibnotizen (canvas drawing thumbnails) */}
        {drawings.length > 0 && (
          <CollapsibleSection
            title="✏️ Schreibnotizen"
            badge={<span className="text-xs px-1.5 py-0.5 rounded bg-surface-hover text-text-muted font-medium">{drawings.length}</span>}
          >
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {resolvedDrawings.map((src, i) => (
                <button key={i} onClick={() => setLightbox(src)} className="relative shrink-0 focus:outline-none">
                  <img
                    src={src}
                    alt={`Seite ${i + 1}`}
                    className="w-28 h-36 object-cover rounded-card border border-border hover:opacity-90 transition-opacity"
                  />
                  <div className="absolute bottom-1 left-1 bg-background/80 rounded px-1.5 py-0.5">
                    <span className="text-[10px] text-text-muted font-medium">{i + 1}</span>
                  </div>
                </button>
              ))}
            </div>
            <p className="text-xs text-text-muted mt-2">Antippen zum Vergrößern</p>
          </CollapsibleSection>
        )}

        {/* Cross-device transfer — attachments are local-only by default */}
        {authUser && (photos.length > 0 || drawings.length > 0) && hasLocalOnlyAttachments(userNote) && (
          <div className="flex items-center gap-3 px-4 py-3 bg-surface rounded-card shadow-card-adaptive border border-border/60">
            <div className="w-9 h-9 rounded-btn bg-accent/10 flex items-center justify-center shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
                <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-text-primary text-sm font-medium">Fotos sind nur auf diesem Gerät gespeichert</p>
              <p className="text-text-muted text-xs mt-0.5">
                {transferStatus === 'done' ? 'Übertragen — auf anderen Geräten verfügbar'
                  : transferStatus === 'error' ? 'Übertragung fehlgeschlagen — nochmal versuchen'
                  : 'Zum Abrufen auf anderen Geräten übertragen'}
              </p>
            </div>
            <button
              onClick={() => void transferToCloud()}
              disabled={transferStatus === 'uploading' || transferStatus === 'done'}
              className={`shrink-0 px-3 py-1.5 rounded-btn text-xs font-semibold transition-all press-sm ${
                transferStatus === 'done' ? 'bg-success/10 text-success border border-success/20'
                : 'grad-accent text-white hover:opacity-90'
              }`}
            >
              {transferStatus === 'uploading' ? 'Läuft…' : transferStatus === 'done' ? 'Übertragen ✓' : 'Übertragen'}
            </button>
          </div>
        )}

        {/* PDFs */}
        {(userNote?.pdfAttachments?.length ?? 0) > 0 && (
          <CollapsibleSection title="📄 PDF-Quelle">
            <div className="space-y-2">
              {userNote!.pdfAttachments!.map((pdf, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 bg-background border border-border rounded-card">
                  <div className="w-8 h-8 rounded-btn bg-accent/10 flex items-center justify-center shrink-0 text-base">📄</div>
                  <p className="text-sm text-text-secondary truncate flex-1">{pdf.name}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-text-muted mt-2">PDF kann nicht erneut geöffnet werden — nur Name gespeichert</p>
          </CollapsibleSection>
        )}

        {/* Mitschrift */}
        {userNote?.content ? (
          <CollapsibleSection title="✏️ Meine Mitschrift">
            <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-wrap">{userNote.content}</p>
          </CollapsibleSection>
        ) : userNote && (
          <button
            onClick={startEdit}
            className="w-full bg-surface border border-dashed border-border rounded-card px-4 py-3 text-left hover:border-accent hover:bg-surface-hover transition-colors"
          >
            <p className="text-text-muted text-sm">+ Mitschrift hinzufügen</p>
          </button>
        )}

        {/* Hausaufgaben */}
        {userNote?.homeworkItems && userNote.homeworkItems.length > 0 && (
          <CollapsibleSection
            title="📚 Hausaufgaben"
            badge={
              <span className="text-xs px-1.5 py-0.5 rounded bg-surface-hover text-text-muted font-medium">
                {userNote.homeworkItems.length}
              </span>
            }
          >
            <div className="space-y-2">
              {userNote.homeworkItems.map((hw, idx) => {
                const hwId = hw.id ?? `${userNote.id}-hw-${idx}`
                const isDone = completedHomeworkIds.includes(hwId)
                return (
                  <div key={hwId} className="bg-background border border-border rounded-card px-3 py-2.5 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm leading-snug flex-1 ${isDone ? 'line-through text-text-muted' : 'text-text-primary'}`}>
                        {hw.description}
                      </p>
                      {isDone && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0" style={{ backgroundColor: 'rgba(48,209,88,0.12)', color: '#30D158' }}>
                          ✓ Erledigt
                        </span>
                      )}
                    </div>
                    {hw.dueDate && (
                      <p className="text-xs text-text-muted">
                        Fällig: {new Date(hw.dueDate + 'T00:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </p>
                    )}
                    {hw.aiHelp && (
                      <div className="mt-1.5 px-3 py-2 rounded-btn" style={{ backgroundColor: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)' }}>
                        <p className="text-xs font-semibold text-accent mb-0.5">KI-Hilfe</p>
                        <p className="text-xs text-text-secondary leading-relaxed">{hw.aiHelp}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CollapsibleSection>
        )}

        {/* KI-Zusammenfassung */}
        <CollapsibleSection
          title="📝 KI-Zusammenfassung"
          badge={generatedNote ? (
            <span className="text-xs px-1.5 py-0.5 rounded bg-success/10 text-success font-medium">KI</span>
          ) : undefined}
        >
          {note.summary ? (
            <p className="text-text-secondary text-sm leading-relaxed"><MathRenderer text={note.summary} /></p>
          ) : (
            <p className="text-text-muted text-sm">Noch nicht analysiert — tippe auf „Bearbeiten" um die KI-Analyse zu starten.</p>
          )}
        </CollapsibleSection>

        {/* Lösung(en) */}
        {(note.tasks && note.tasks.length > 0) ? (
          <CollapsibleSection title={`📐 ${note.tasks.length > 1 ? `${note.tasks.length} Aufgaben` : 'Lösung'}`}>
            <div className="space-y-4">
              {note.tasks.map((task, ti) => (
                <div key={ti} className={ti > 0 ? 'pt-4 border-t border-border' : ''}>
                  {note.tasks!.length > 1 && (
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: subject?.color ?? '#007AFF' }}>Aufgabe {ti + 1}</p>
                  )}
                  {task.question && (
                    <p className="text-xs text-text-muted italic mb-2"><MathRenderer text={task.question} /></p>
                  )}
                  <ol className="space-y-2 mb-2">
                    {task.steps.map((step, i) => (
                      <li key={i} className="flex gap-2 items-start text-sm text-text-secondary">
                        <span
                          className="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center shrink-0 mt-0.5"
                          style={{ backgroundColor: `${subject?.color ?? '#007AFF'}22`, color: subject?.color ?? '#007AFF' }}
                        >
                          {i + 1}
                        </span>
                        <span className="leading-relaxed"><MathRenderer text={step} /></span>
                      </li>
                    ))}
                  </ol>
                  <div className="px-3 py-2 rounded-btn mb-2" style={{ backgroundColor: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' }}>
                    <p className="text-xs font-bold text-success mb-0.5">Ergebnis</p>
                    <p className="text-sm text-text-primary font-medium"><MathRenderer text={task.answer} /></p>
                  </div>
                  {task.proof && (
                    <div className="px-3 py-2 rounded-btn bg-surface-hover border border-border">
                      <p className="text-xs font-bold text-text-muted mb-0.5">Probe</p>
                      <p className="text-sm text-text-secondary"><MathRenderer text={task.proof} /></p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CollapsibleSection>
        ) : note.solution ? (
          <CollapsibleSection title="📐 Lösung">
            <ol className="space-y-2 mb-3">
              {note.solution.steps.map((step, i) => (
                <li key={i} className="flex gap-2 items-start text-sm text-text-secondary">
                  <span
                    className="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center shrink-0 mt-0.5"
                    style={{ backgroundColor: `${subject?.color ?? '#007AFF'}22`, color: subject?.color ?? '#007AFF' }}
                  >
                    {i + 1}
                  </span>
                  <span className="leading-relaxed"><MathRenderer text={step} /></span>
                </li>
              ))}
            </ol>
            <div className="px-3 py-2 rounded-btn mb-2" style={{ backgroundColor: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' }}>
              <p className="text-xs font-bold text-success mb-0.5">Ergebnis</p>
              <p className="text-sm text-text-primary font-medium"><MathRenderer text={note.solution.answer} /></p>
            </div>
            {note.solution.proof && (
              <div className="px-3 py-2 rounded-btn bg-surface-hover border border-border">
                <p className="text-xs font-bold text-text-muted mb-0.5">Probe</p>
                <p className="text-sm text-text-secondary"><MathRenderer text={note.solution.proof} /></p>
              </div>
            )}
          </CollapsibleSection>
        ) : null}

        {/* Schlüsselbegriffe */}
        <CollapsibleSection title="🔑 Schlüsselbegriffe">
          {note.keywords.length > 0 ? (
            <div>
              <div className="flex flex-wrap gap-2">
                {note.keywords.map((kw) => {
                  const isSelected = selectedKeyword === kw
                  const isLoading = loadingKeyword === kw
                  return (
                    <button
                      key={kw}
                      onClick={() => void handleKeywordClick(kw)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-xs font-medium border transition-all active:scale-95 ${
                        isSelected
                          ? 'grad-accent text-white border-transparent'
                          : 'bg-surface-hover border-border text-text-secondary hover:border-accent/50 hover:text-text-primary'
                      }`}
                    >
                      {isLoading && (
                        <div className="w-2.5 h-2.5 border-2 border-current/40 border-t-current rounded-full animate-spin shrink-0" />
                      )}
                      {kw}
                    </button>
                  )
                })}
              </div>
              {selectedKeyword && (
                <div className="mt-3 px-3 py-2.5 bg-accent/5 border border-accent/15 rounded-card">
                  <p className="text-[10px] font-bold text-accent uppercase tracking-wider mb-1.5">{selectedKeyword}</p>
                  {loadingKeyword === selectedKeyword ? (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin shrink-0" />
                      <p className="text-text-muted text-xs">KI erklärt…</p>
                    </div>
                  ) : (
                    <p className="text-text-secondary text-sm leading-relaxed"><MathRenderer text={explanations[selectedKeyword]} /></p>
                  )}
                </div>
              )}
              <p className="text-[10px] text-text-muted mt-2">Antippen für KI-Erklärung</p>
            </div>
          ) : (
            <p className="text-text-muted text-sm">Werden nach der KI-Analyse generiert.</p>
          )}
        </CollapsibleSection>

        {/* Fragen aus dem Unterricht */}
        {userNote?.qa && userNote.qa.length > 0 && (
          <CollapsibleSection title="⚡ Fragen aus dem Unterricht">
            <div className="space-y-3">
              {userNote.qa.map((item, i) => (
                <div key={i} className={i < userNote.qa!.length - 1 ? 'pb-3 border-b border-border' : ''}>
                  <p className="text-sm font-semibold text-text-primary mb-1">{item.q}</p>
                  <p className="text-sm text-text-secondary leading-relaxed"><MathRenderer text={item.a} /></p>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Klausurthemen */}
        <CollapsibleSection title="🎯 Mögliche Klausurthemen">
          {note.examTopics.length > 0 ? (
            <ul className="space-y-2">
              {note.examTopics.map((topic, i) => (
                <li key={i} className="flex gap-3 items-start">
                  <span
                    className="w-5 h-5 rounded-pill text-xs font-bold flex items-center justify-center shrink-0 mt-0.5"
                    style={{ backgroundColor: `${subject?.color ?? '#007AFF'}22`, color: subject?.color ?? '#007AFF' }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-text-secondary text-sm">{topic}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-text-muted text-sm">Werden nach der KI-Analyse generiert.</p>
          )}
        </CollapsibleSection>

        {/* Karteikarten erstellen — nur wenn KI-Analyse vorhanden */}
        {generatedNote && (
          <div>
            {fcStatus === 'done' ? (
              <div className="bg-surface border border-success/30 rounded-card px-4 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ background: 'linear-gradient(145deg, #34D399, #059669)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-text-primary text-sm font-semibold">{fcCount} Karten erstellt</p>
                    <p className="text-text-muted text-xs">Bereit zum Lernen</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/klausurmodus/lernen')}
                  className="px-3.5 py-2 rounded-pill text-white text-sm font-semibold press-sm"
                  style={{ background: 'linear-gradient(145deg, #34D399, #059669)' }}
                >
                  Jetzt lernen →
                </button>
              </div>
            ) : (
              <button
                onClick={handleCreateFlashCards}
                disabled={fcStatus === 'generating'}
                className="w-full bg-surface border border-border rounded-card px-4 py-4 flex items-center gap-4 press disabled:opacity-60"
              >
                <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(145deg, #34D399, #059669)' }}>
                  {fcStatus === 'generating' ? (
                    <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                      <path d="M21 12a9 9 0 11-6.219-8.56" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="7" y="7" width="13" height="12" rx="2.5" strokeOpacity="0.5" />
                      <rect x="4" y="9" width="13" height="12" rx="2.5" />
                      <line x1="7" y1="14" x2="14" y2="14" />
                      <line x1="7" y1="16.5" x2="14" y2="16.5" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-text-primary text-sm font-semibold">
                    {fcStatus === 'generating' ? 'Karteikarten werden erstellt…' : 'Karteikarten erstellen'}
                  </p>
                  <p className="text-text-muted text-xs mt-0.5">
                    {fcStatus === 'error' ? 'Fehler — erneut versuchen' : 'KI generiert 6–8 Fragen aus dieser Notiz'}
                  </p>
                </div>
                {fcStatus === 'idle' && (
                  <span className="text-text-muted">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                )}
              </button>
            )}
          </div>
        )}

      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="Vollansicht" className="max-w-full max-h-full object-contain rounded-card" />
          <button
            className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"
            onClick={() => setLightbox(null)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}

      {/* ── Delete Confirmation Modal ─────────────────────────────────────── */}
      {showDeleteConfirm && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/50" onClick={() => setShowDeleteConfirm(false)} />
          <div
            className="fixed inset-x-5 z-[61] bg-surface rounded-2xl shadow-float overflow-hidden"
            style={{ top: '30%', maxWidth: 380, margin: '0 auto' }}
          >
            <div className="px-5 pt-5 pb-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-[14px] mx-auto mb-4"
                style={{ background: 'rgba(var(--color-danger), 0.12)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" style={{ color: 'rgb(var(--color-danger))' }}>
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                </svg>
              </div>
              <h2 className="text-[17px] font-bold text-text-primary text-center">Notiz löschen?</h2>
              <p className="text-[13px] text-text-muted text-center mt-2 leading-relaxed">
                Diese Notiz wird unwiderruflich gelöscht. Smart Notes, Fotos und alle zugehörigen Daten gehen verloren.
              </p>
            </div>
            <div className="px-5 pb-5 flex gap-2.5">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 rounded-[12px] bg-surface-hover border border-border text-text-secondary text-[14px] font-semibold press-sm"
              >
                Abbrechen
              </button>
              <button
                onClick={() => {
                  if (lessonId) {
                    deleteUserNote(lessonId)
                    navigate(-1)
                  }
                }}
                className="flex-1 py-3 rounded-[12px] text-white text-[14px] font-bold press-sm"
                style={{ background: 'linear-gradient(135deg, #FF453A, #CC2E28)', boxShadow: '0 4px 12px rgba(255,69,58,0.35)' }}
              >
                Löschen
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
