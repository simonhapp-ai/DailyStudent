import { useRef, useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { classifyContent, solveTasksFromText, analyzeTextBlock, answerQuestion, explainKeyword, extractTextFromImage, suggestNoteSubject } from '../lib/groq'
import type { HomeworkItem } from '../types'
import { analyzeFileToSmartNote } from '../lib/gemini'
import { MathRenderer } from '../components/ui/MathRenderer'
import { DrawingCanvas } from '../components/ui/DrawingCanvas'
import { useUser } from '../context/UserContext'
import { subjects, halfYears } from '../data/mockData'
import type { GeneratedSmartNote, UserNote } from '../types'

// ── Local block types ────────────────────────────────────────────────────────

interface TextBlockAIResult {
  additionalKeywords: string[]
  suggestExplain: string[]
  summary: string
}

interface PhotoBlockAIResult {
  transcription: string
  contentType: 'info' | 'aufgabe' | 'beides'
  summary: string
  keywords: string[]
  examTopics: string[]
  tasks: Array<{ question: string; steps: string[]; answer: string; proof?: string }>
}

type BlockAIStatus = 'idle' | 'analyzing' | 'done' | 'error'

interface TextBlock {
  id: string
  type: 'text'
  content: string
  aiStatus: BlockAIStatus
  aiError: string
  aiResult: TextBlockAIResult | null
  explainLoading: string | null
  explanations: Record<string, string>
  selectedTerm: string | null
}

interface PhotoBlock {
  id: string
  type: 'photo'
  attachments: string[]
  pdfFile: File | null
  pdfLoading: boolean
  aiStatus: BlockAIStatus
  aiError: string
  aiResult: PhotoBlockAIResult | null
  transcriptionOpen: boolean
  aiMessage: string
}

interface DrawingBlock {
  id: string
  type: 'drawing'
  dataUrl: string | null
}

interface HomeworkBlock {
  id: string
  type: 'homework'
  subjectId: string
  description: string
  dueDate: string
  aiHelp: string | null
  aiLoading: boolean
}

type NoteBlock = TextBlock | PhotoBlock | DrawingBlock | HomeworkBlock

function makeTextBlock(id: string): TextBlock {
  return { id, type: 'text', content: '', aiStatus: 'idle', aiError: '', aiResult: null, explainLoading: null, explanations: {}, selectedTerm: null }
}
function makePhotoBlock(id: string): PhotoBlock {
  return { id, type: 'photo', attachments: [], pdfFile: null, pdfLoading: false, aiStatus: 'idle', aiError: '', aiResult: null, transcriptionOpen: false, aiMessage: '' }
}
function makeDrawingBlock(id: string): DrawingBlock {
  return { id, type: 'drawing', dataUrl: null }
}
function makeHomeworkBlock(id: string): HomeworkBlock {
  return { id, type: 'homework', subjectId: '', description: '', dueDate: '', aiHelp: null, aiLoading: false }
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getNextLessonDate(subjectId: string, stundenplan: { slots: { day: number; subjectId: string }[] } | undefined): string | null {
  if (!stundenplan || !subjectId) return null
  const slotsForSubject = stundenplan.slots.filter((s) => s.subjectId === subjectId)
  if (slotsForSubject.length === 0) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const todayDow = today.getDay()
  const todayMon0 = todayDow === 0 ? 6 : todayDow - 1
  const lessonDays = new Set(slotsForSubject.map((s) => s.day))
  for (let offset = 1; offset <= 7; offset++) {
    const nextMon0 = (todayMon0 + offset) % 7
    if (nextMon0 <= 4 && lessonDays.has(nextMon0)) {
      const d = new Date(today); d.setDate(today.getDate() + offset)
      return toDateStr(d)
    }
  }
  return null
}

// ── Component ────────────────────────────────────────────────────────────────

export function NoteCreateScreen() {
  const { id, folderId } = useParams<{ id?: string; folderId?: string }>()
  const navigate = useNavigate()
  const { profile, saveNote, userFolders, userNotes, saveToOhneFachFolder, addFolder } = useUser()

  const [noteId] = useState(() => {
    const uid = typeof crypto?.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
    return `note-${uid}`
  })
  const subjectFromUrl = id ? subjects.find((s) => s.id === id) : null
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(id ?? '')
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [selectedFolderId, setSelectedFolderId] = useState<string>(folderId ?? '')
  const subject = subjects.find((s) => s.id === selectedSubjectId) ?? null

  const [title, setTitle] = useState(subjectFromUrl ? `${subjectFromUrl.name}: ` : '')

  const [blocks, setBlocks] = useState<NoteBlock[]>(() => [
    makeTextBlock('text-0'),
    makePhotoBlock('photo-0'),
    makeDrawingBlock('drawing-0'),
  ])

  // Quick Ask
  const [showAskBar, setShowAskBar] = useState(false)
  const [askInput, setAskInput] = useState('')
  const [askLoading, setAskLoading] = useState(false)
  const [qaItems, setQaItems] = useState<{ q: string; a: string; open: boolean }[]>([])

  // Cancel confirm
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  // Lightbox
  const [lightbox, setLightbox] = useState<string | null>(null)

  // No-subject save modal
  const [showNoSubjectModal, setShowNoSubjectModal] = useState(false)
  const [suggestionStatus, setSuggestionStatus] = useState<'loading' | 'done' | 'none'>('loading')
  const [suggestion, setSuggestion] = useState<{ subjectId: string; subjectName: string; reason: string } | null>(null)

  // Per-photo-block file refs (keyed by block id)
  const photoRefs = useRef<Record<string, { camera: HTMLInputElement | null; file: HTMLInputElement | null }>>({})

  // Fullscreen block state for DrawingBlock
  const [fullscreenBlockId, setFullscreenBlockId] = useState<string | null>(null)
  const [isLandscape, setIsLandscape] = useState(window.innerWidth > window.innerHeight)

  useEffect(() => {
    const handleResize = () => {
      setIsLandscape(window.innerWidth > window.innerHeight)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const handleFsChange = () => {
      if (!document.fullscreenElement) {
        setFullscreenBlockId(null)
      }
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  const profileSubjects = (profile?.faecher ?? [])
    .map((sid) => subjects.find((s) => s.id === sid))
    .filter((s): s is NonNullable<typeof s> => s !== undefined)

  // ── Block helpers ────────────────────────────────────────────────────────

  function updateBlock(blockId: string, patch: Partial<NoteBlock>) {
    setBlocks((prev) => prev.map((b) => b.id === blockId ? { ...b, ...patch } as NoteBlock : b))
  }

  function removeBlock(blockId: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId))
  }

  function addTextBlock() {
    setBlocks((prev) => [...prev, makeTextBlock(`text-${Date.now()}`)])
  }

  function addPhotoBlock() {
    setBlocks((prev) => [...prev, makePhotoBlock(`photo-${Date.now()}`)])
  }

  function addDrawingBlock() {
    setBlocks((prev) => [...prev, makeDrawingBlock(`drawing-${Date.now()}`)])
  }

  function addHomeworkBlock() {
    setBlocks((prev) => [...prev, makeHomeworkBlock(`homework-${Date.now()}`)])
  }

  // ── Text block KI ────────────────────────────────────────────────────────

  const analyzeText = async (block: TextBlock) => {
    if (!block.content.trim()) return
    updateBlock(block.id, { aiStatus: 'analyzing', aiError: '' })
    try {
      const result = await analyzeTextBlock(block.content, subject?.name ?? 'Allgemein')
      updateBlock(block.id, { aiStatus: 'done', aiResult: result })
    } catch (e) {
      updateBlock(block.id, { aiStatus: 'error', aiError: e instanceof Error ? e.message : 'Fehler' })
    }
  }

  const handleTermClick = async (block: TextBlock, term: string) => {
    if (block.selectedTerm === term) { updateBlock(block.id, { selectedTerm: null }); return }
    updateBlock(block.id, { selectedTerm: term })
    if (block.explanations[term] !== undefined) return
    updateBlock(block.id, { explainLoading: term })
    try {
      const text = await explainKeyword(term, subject?.name ?? 'Allgemein', block.content.slice(0, 300))
      setBlocks((prev) => prev.map((b) => {
        if (b.id !== block.id || b.type !== 'text') return b
        return { ...b, explanations: { ...b.explanations, [term]: text }, explainLoading: null }
      }))
    } catch {
      setBlocks((prev) => prev.map((b) => {
        if (b.id !== block.id || b.type !== 'text') return b
        return { ...b, explanations: { ...b.explanations, [term]: 'Erklärung konnte nicht geladen werden.' }, explainLoading: null }
      }))
    }
  }

  // ── Photo block KI ───────────────────────────────────────────────────────

  const analyzePhoto = async (block: PhotoBlock) => {
    // PDF → Gemini
    if (block.pdfFile) {
      updateBlock(block.id, { aiStatus: 'analyzing', aiError: '', aiMessage: 'PDF wird analysiert…' })
      try {
        const noteId = typeof crypto?.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}`
        const { generated } = await analyzeFileToSmartNote(block.pdfFile, noteId, subject?.name ?? 'Allgemein')
        const result: PhotoBlockAIResult = {
          transcription: generated.rawText,
          contentType: 'info',
          summary: generated.summary,
          keywords: generated.keywords,
          examTopics: generated.examTopics,
          tasks: [],
        }
        updateBlock(block.id, { aiStatus: 'done', aiResult: result, aiMessage: '' })
      } catch (e) {
        updateBlock(block.id, { aiStatus: 'error', aiError: e instanceof Error ? e.message : 'Fehler', aiMessage: '' })
      }
      return
    }

    // Fotos → Groq
    if (block.attachments.length === 0) return
    updateBlock(block.id, { aiStatus: 'analyzing', aiError: '', aiMessage: 'Fotos werden transkribiert…' })
    try {
      let transcription = ''
      for (const img of block.attachments) {
        const ocrText = await extractTextFromImage(img)
        transcription = transcription ? `${transcription}\n\n${ocrText}` : ocrText
      }
      if (!transcription.trim()) throw new Error('Kein Text erkannt.')

      updateBlock(block.id, { aiMessage: 'Inhalt wird analysiert…' })
      const classification = await classifyContent(transcription, subject?.name ?? 'Allgemein')

      let tasks: PhotoBlockAIResult['tasks'] = []
      if (classification.contentType !== 'info') {
        updateBlock(block.id, { aiMessage: 'Aufgaben werden gelöst…' })
        tasks = await solveTasksFromText(transcription, subject?.name ?? 'Allgemein')
      }

      const result: PhotoBlockAIResult = {
        transcription,
        contentType: classification.contentType,
        summary: classification.summary,
        keywords: classification.keywords,
        examTopics: [],
        tasks,
      }
      updateBlock(block.id, { aiStatus: 'done', aiResult: result, aiMessage: '' })
    } catch (e) {
      updateBlock(block.id, { aiStatus: 'error', aiError: e instanceof Error ? e.message : 'Fehler', aiMessage: '' })
    }
  }

  const PHOTO_LIMIT = 2

  const handlePhotoFile = (blockId: string, file: File | undefined) => {
    if (!file) return
    const block = blocks.find((b) => b.id === blockId) as PhotoBlock | undefined
    if (!block) return
    if (file.type === 'application/pdf') {
      // PDF direkt für Gemini speichern — kein Umweg über pdfToImages
      updateBlock(blockId, { pdfFile: file, attachments: [], aiStatus: 'idle', aiResult: null, aiError: '' } as Partial<PhotoBlock>)
      return
    }
    if (block.attachments.length >= PHOTO_LIMIT) return
    const reader = new FileReader()
    reader.onload = (e) => {
      setBlocks((prev) => prev.map((b) => {
        if (b.id !== blockId || b.type !== 'photo') return b
        if (b.attachments.length >= PHOTO_LIMIT) return b
        return { ...b, pdfFile: null, attachments: [...b.attachments, e.target?.result as string] }
      }))
    }
    reader.readAsDataURL(file)
  }

  const removePhotoFromBlock = (blockId: string, index: number) => {
    setBlocks((prev) => prev.map((b) => {
      if (b.id !== blockId || b.type !== 'photo') return b
      return { ...b, attachments: b.attachments.filter((_, i) => i !== index) }
    }))
  }

  // ── Quick Ask ────────────────────────────────────────────────────────────

  const submitAsk = async () => {
    const q = askInput.trim()
    if (!q || askLoading) return
    setAskInput('')
    setShowAskBar(false)
    setAskLoading(true)
    const allText = blocks.filter((b): b is TextBlock => b.type === 'text').map(b => b.content.trim()).filter(Boolean).join('\n')
    setQaItems((prev) => [...prev, { q, a: '', open: true }])
    try {
      const a = await answerQuestion(q, subject?.name ?? 'Allgemein', allText.slice(0, 400) || undefined)
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

  // ── Save ─────────────────────────────────────────────────────────────────

  const buildNote = (subjectId: string | undefined, finalFolderId: string | undefined): UserNote => {
    const textContent = blocks
      .filter((b): b is TextBlock => b.type === 'text')
      .map(b => b.content.trim()).filter(Boolean).join('\n\n')
    const photoAttachments = blocks
      .filter((b): b is PhotoBlock => b.type === 'photo')
      .flatMap(b => b.attachments)
    const drawingAttachments = blocks
      .filter((b): b is DrawingBlock => b.type === 'drawing')
      .flatMap(b => b.dataUrl ? [b.dataUrl] : [])
    const allAttachments = [...photoAttachments, ...drawingAttachments]
    const pdfNames = blocks
      .filter((b): b is PhotoBlock => b.type === 'photo')
      .filter(b => b.pdfFile !== null)
      .map(b => ({ name: b.pdfFile!.name }))
    const homeworkBlocks = blocks
      .filter((b): b is HomeworkBlock => b.type === 'homework')
      .filter(b => b.description.trim())
      .map<HomeworkItem>((b, idx) => ({
        id: `hw-${noteId}-${idx}-${Date.now()}`,
        subjectId: (subjectId || b.subjectId) || undefined,
        description: b.description.trim(),
        dueDate: b.dueDate || undefined,
        aiHelp: b.aiHelp || undefined,
      }))
    return {
      id: noteId,
      subjectId: subjectId || undefined,
      folderId: finalFolderId || undefined,
      title: title.trim() || 'Neue Notiz',
      content: textContent,
      attachments: allAttachments.length > 0 ? allAttachments : undefined,
      pdfAttachments: pdfNames.length > 0 ? pdfNames : undefined,
      homeworkItems: homeworkBlocks.length > 0 ? homeworkBlocks : undefined,
      qa: qaItems.length > 0 ? qaItems.map(({ q, a }) => ({ q, a })) : undefined,
      createdAt: new Date().toISOString(),
    }
  }

  const buildGeneratedNote = (): GeneratedSmartNote | undefined => {
    const photoBlock = blocks.find((b): b is PhotoBlock => b.type === 'photo' && b.aiResult !== null) as PhotoBlock | undefined
    if (!photoBlock?.aiResult) return undefined
    const r = photoBlock.aiResult
    return {
      lessonId: noteId,
      rawText: r.transcription,
      contentType: r.contentType,
      summary: r.summary,
      keywords: r.keywords,
      examTopics: r.examTopics ?? [],
      solution: r.tasks[0] ? { steps: r.tasks[0].steps, answer: r.tasks[0].answer, proof: r.tasks[0].proof } : undefined,
      tasks: r.tasks.length > 0 ? r.tasks : undefined,
      generatedAt: new Date().toISOString(),
      subjectName: subject?.name ?? 'Allgemein',
    }
  }

  const confirmSave = (finalFolderId: string) => {
    let resolvedFolderId = finalFolderId
    // Empty folderId + subject → auto-create "Notizen" default folder
    if (!resolvedFolderId && selectedSubjectId) {
      const notizenId = `folder-notizen-${selectedSubjectId}`
      if (!userFolders.some((f) => f.id === notizenId)) {
        addFolder({
          id: notizenId,
          subjectId: selectedSubjectId,
          name: 'Notizen',
          createdAt: new Date().toISOString(),
          isAutoGenerated: false,
        })
      }
      resolvedFolderId = notizenId
    }
    saveNote(buildNote(selectedSubjectId, resolvedFolderId), buildGeneratedNote())
    setShowSaveModal(false)
    if (resolvedFolderId && selectedSubjectId) navigate(`/unterricht/${selectedSubjectId}/ordner/${resolvedFolderId}`, { replace: true })
    else if (selectedSubjectId) navigate(`/unterricht/${selectedSubjectId}`, { replace: true })
    else navigate('/unterricht', { replace: true })
  }

  const openNoSubjectModal = async () => {
    setShowNoSubjectModal(true)
    setSuggestion(null)
    setSuggestionStatus('loading')
    const textContent = blocks.filter((b): b is TextBlock => b.type === 'text').map(b => b.content.trim()).filter(Boolean).join('\n')
    if (!textContent || profileSubjects.length === 0) { setSuggestionStatus('none'); return }
    const result = await suggestNoteSubject(textContent, profileSubjects)
    setSuggestion(result)
    setSuggestionStatus(result ? 'done' : 'none')
  }

  const acceptSuggestion = () => {
    if (!suggestion) return
    saveNote(buildNote(suggestion.subjectId, undefined), buildGeneratedNote())
    setShowNoSubjectModal(false)
    navigate(`/unterricht/${suggestion.subjectId}`, { replace: true })
  }

  const saveToOhneFach = () => {
    const note = buildNote(undefined, 'folder-no-subject')
    saveToOhneFachFolder(note, buildGeneratedNote())
    setShowNoSubjectModal(false)
    navigate('/unterricht/ohne-fach/ordner/folder-no-subject', { replace: true })
  }

  const hasUserContent = blocks.some((b) =>
    b.type === 'text' ? b.content.trim().length > 0
    : b.type === 'photo' ? (b.attachments.length > 0 || !!b.pdfFile)
    : b.type === 'drawing' ? b.dataUrl !== null
    : b.type === 'homework' ? b.description.trim().length > 0
    : false
  ) || qaItems.length > 0

  const currentFolder = folderId ? userFolders.find((f) => f.id === folderId) : null

  const handleCancelPress = () => {
    if (!hasUserContent) { navigate(-1); return }
    setShowCancelConfirm(true)
  }

  const hasContent = hasUserContent || title.trim().length > 0

  const handleSavePress = () => {
    if (!hasContent) { navigate(-1); return }
    if (folderId) { confirmSave(folderId); return }
    if (!selectedSubjectId) { void openNoSubjectModal(); return }
    setShowSaveModal(true)
  }

  const ohneFachNoteCount = userNotes.filter((n) => n.folderId === 'folder-no-subject').length

  const totalWords = blocks.filter((b): b is TextBlock => b.type === 'text').reduce((n, b) => n + (b.content.trim() ? b.content.trim().split(/\s+/).length : 0), 0)
  const totalPhotos = blocks.filter((b): b is PhotoBlock => b.type === 'photo').reduce((n, b) => n + b.attachments.length, 0)
    + blocks.filter((b): b is DrawingBlock => b.type === 'drawing' && b.dataUrl !== null).length

  // ── Render helpers ───────────────────────────────────────────────────────

  // Collect unique keywords from all analyzed photo blocks — used for text suggestions
  const photoKeywordSuggestions = [
    ...new Set(
      blocks
        .filter((b): b is PhotoBlock => b.type === 'photo' && b.aiResult !== null)
        .flatMap((b) => b.aiResult!.keywords)
    ),
  ]

  const renderTextBlock = (block: TextBlock, index: number, isDefault: boolean) => {
    const canAnalyze = block.content.trim().length > 5 && block.aiStatus !== 'analyzing'
    return (
      <div key={block.id} className="mx-4 mb-3 bg-surface rounded-card shadow-card-adaptive border border-border/60 overflow-hidden">
        {/* Block header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <span className="section-label">
            {isDefault ? '📝 Mitschrift' : `📝 Textnotiz ${index + 1}`}
          </span>
          {!isDefault && (
            <button onClick={() => removeBlock(block.id)} className="p-1 rounded-btn hover:bg-danger/10 transition-colors press-sm">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-danger">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>

        {/* Textarea */}
        <textarea
          value={block.content}
          onChange={(e) => {
            e.target.style.height = 'auto'
            e.target.style.height = `${e.target.scrollHeight}px`
            updateBlock(block.id, { content: e.target.value })
          }}
          placeholder="Stichpunkte, Begriffe, Formeln…"
          className="w-full bg-transparent px-4 py-2 text-text-secondary text-sm placeholder-text-muted focus:outline-none resize-none leading-relaxed"
          style={{ minHeight: '120px', overflow: 'hidden' }}
        />

        {/* KI row */}
        <div className="border-t border-border px-4 py-2 flex items-center justify-between">
          <span className="text-xs text-text-muted">
            {block.aiStatus === 'done' ? (
              <span className="text-success font-medium flex items-center gap-1">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Analysiert
              </span>
            ) : block.aiStatus === 'error' ? (
              <span className="text-danger text-xs truncate max-w-[140px]">{block.aiError}</span>
            ) : null}
          </span>
          <button
            onClick={() => void analyzeText(block)}
            disabled={!canAnalyze}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-btn text-xs font-semibold transition-all press-sm ${
              !canAnalyze ? 'bg-surface-hover text-text-muted cursor-not-allowed'
              : block.aiStatus === 'done' ? 'bg-success/10 text-success border border-success/20 hover:bg-success/15'
              : 'grad-accent text-white hover:opacity-90'
            }`}
          >
            {block.aiStatus === 'analyzing' ? (
              <><div className="w-3 h-3 border-2 border-current/40 border-t-current rounded-full animate-spin" />Läuft…</>
            ) : block.aiStatus === 'done' ? (
              <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 4v6h6M23 20v-6h-6" strokeLinecap="round" strokeLinejoin="round" /><path d="M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15" strokeLinecap="round" strokeLinejoin="round" /></svg>Erneut</>
            ) : (
              <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" /></svg>Begriffe & Kontext</>
            )}
          </button>
        </div>

        {/* Text KI result */}
        {block.aiResult && (
          <div className="border-t border-border px-4 py-3 space-y-3 bg-accent/3">

            {block.aiResult.additionalKeywords.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Weitere Begriffe</p>
                <div className="flex flex-wrap gap-1.5">
                  {block.aiResult.additionalKeywords.map((kw) => (
                    <span key={kw} className="px-2.5 py-1 rounded-pill text-xs font-medium bg-surface border border-border text-text-secondary">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {block.aiResult.suggestExplain.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Erklärungen anbieten</p>
                <div className="flex flex-wrap gap-1.5">
                  {block.aiResult.suggestExplain.map((term) => {
                    const isSelected = block.selectedTerm === term
                    const isLoading = block.explainLoading === term
                    return (
                      <button
                        key={term}
                        onClick={() => void handleTermClick(block, term)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-xs font-medium border transition-all active:scale-95 ${
                          isSelected ? 'grad-accent text-white border-transparent' : 'bg-surface border-border text-text-secondary hover:border-accent/50'
                        }`}
                      >
                        {isLoading && <div className="w-2.5 h-2.5 border-2 border-current/40 border-t-current rounded-full animate-spin" />}
                        {term}
                      </button>
                    )
                  })}
                </div>
                {block.selectedTerm && (
                  <div className="mt-2 px-3 py-2 bg-accent/5 border border-accent/15 rounded-card">
                    <p className="text-[10px] font-bold text-accent uppercase tracking-wider mb-1">{block.selectedTerm}</p>
                    {block.explainLoading === block.selectedTerm ? (
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                        <p className="text-text-muted text-xs">KI erklärt…</p>
                      </div>
                    ) : (
                      <p className="text-text-secondary text-sm leading-relaxed">{block.explanations[block.selectedTerm]}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {block.aiResult.summary && (
              <div>
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Kontext</p>
                <p className="text-text-secondary text-sm leading-relaxed">{block.aiResult.summary}</p>
              </div>
            )}
          </div>
        )}

        {/* Photo→Text keyword suggestions (shown when a photo block has been analyzed) */}
        {photoKeywordSuggestions.length > 0 && (
          <div className="border-t border-border/60 px-4 py-2.5">
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-accent">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Vorschläge aus Fotoblock
            </p>
            <div className="flex flex-wrap gap-1.5">
              {photoKeywordSuggestions.slice(0, 8).map((kw) => (
                <button
                  key={kw}
                  onClick={() => updateBlock(block.id, { content: block.content ? `${block.content}\n${kw}` : kw })}
                  className="px-2.5 py-1 rounded-pill text-xs font-medium border border-accent/25 text-accent hover:bg-accent/10 active:scale-95 transition-all"
                  style={{ backgroundColor: 'rgba(var(--color-accent),0.06)' }}
                >
                  + {kw}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderPhotoBlock = (block: PhotoBlock, index: number, isDefault: boolean) => {
    const canAnalyze = (block.attachments.length > 0 || !!block.pdfFile) && block.aiStatus !== 'analyzing' && !block.pdfLoading
    if (!photoRefs.current[block.id]) photoRefs.current[block.id] = { camera: null, file: null }
    const refs = photoRefs.current[block.id]

    return (
      <div key={block.id} className="mx-4 mb-3 bg-surface rounded-card shadow-card-adaptive border border-border/60 overflow-hidden">
        {/* Block header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <span className="section-label">
            {isDefault ? '📸 Fotoblock' : `📸 Fotonotiz ${index + 1}`}
          </span>
          {!isDefault && (
            <button onClick={() => removeBlock(block.id)} className="p-1 rounded-btn hover:bg-danger/10 transition-colors press-sm">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-danger">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>

        {/* Photo area */}
        <div className="px-4 pb-2" style={{ minHeight: '120px' }}>
          {block.pdfFile ? (
            <div className="py-2">
              <div className="flex items-center gap-3 p-3 rounded-card border border-border bg-background">
                <div className="w-10 h-10 rounded-btn bg-accent/10 flex items-center justify-center shrink-0 text-xl">
                  📄
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary text-sm font-medium truncate">{block.pdfFile.name}</p>
                  <p className="text-text-muted text-xs mt-0.5 flex items-center gap-1">
                    <span className="text-accent font-medium">Gemini</span> analysiert das PDF
                  </p>
                </div>
                <button
                  onClick={() => updateBlock(block.id, { pdfFile: null, aiStatus: 'idle', aiResult: null } as Partial<PhotoBlock>)}
                  className="w-6 h-6 rounded-full bg-background border border-border flex items-center justify-center hover:bg-danger/10 transition-colors shrink-0"
                >
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>
          ) : block.attachments.length === 0 && !block.pdfLoading ? (
            <div className="flex gap-3 py-4 justify-center">
              <button
                onClick={() => refs.camera?.click()}
                className="flex flex-col items-center gap-1.5 px-5 py-3 rounded-card border-2 border-dashed border-border hover:border-accent hover:bg-accent/5 transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-text-muted">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <span className="text-xs text-text-muted font-medium">Foto</span>
              </button>
              <button
                onClick={() => refs.file?.click()}
                className="flex flex-col items-center gap-1.5 px-5 py-3 rounded-card border-2 border-dashed border-border hover:border-accent hover:bg-accent/5 transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-text-muted">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" />
                </svg>
                <span className="text-xs text-text-muted font-medium">Datei / PDF</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 py-2">
              {block.attachments.map((src, i) => (
                <div key={i} className="relative aspect-square">
                  <img
                    src={src} alt={`Seite ${i + 1}`}
                    onClick={() => setLightbox(src)}
                    className="w-full h-full object-cover rounded-card border border-border cursor-pointer hover:opacity-90 transition-opacity"
                  />
                  <button
                    onClick={() => removePhotoFromBlock(block.id, i)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-background/90 border border-border flex items-center justify-center shadow-sm"
                  >
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" /></svg>
                  </button>
                  <div className="absolute bottom-0.5 left-0.5 bg-black/50 rounded px-1">
                    <span className="text-[9px] text-white font-medium">{i + 1}</span>
                  </div>
                </div>
              ))}
              {block.pdfLoading && (
                <div className="aspect-square rounded-card border border-border bg-background flex flex-col items-center justify-center gap-1">
                  <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  <span className="text-[9px] text-text-muted">PDF…</span>
                </div>
              )}
              {/* Add more — only when below limit */}
              {block.attachments.length < PHOTO_LIMIT && (
                <button
                  onClick={() => refs.camera?.click()}
                  className="aspect-square rounded-card border-2 border-dashed border-border flex items-center justify-center hover:border-accent hover:bg-accent/5 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted">
                    <line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round" />
                    <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>
          )}
          {/* Limit hint */}
          {block.attachments.length >= PHOTO_LIMIT && (
            <p className="text-[10px] text-text-muted pb-2 px-1">Max. {PHOTO_LIMIT} Fotos pro Block · mehr mit Pro</p>
          )}
        </div>

        {/* KI row */}
        <div className="border-t border-border px-4 py-2 flex items-center justify-between">
          <span className="text-xs text-text-muted">
            {block.aiStatus === 'done' ? (
              <span className="text-success font-medium flex items-center gap-1">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Analysiert
              </span>
            ) : block.aiStatus === 'error' ? (
              <span className="text-danger text-xs truncate max-w-[140px]">{block.aiError}</span>
            ) : null}
          </span>
          <button
            onClick={() => void analyzePhoto(block)}
            disabled={!canAnalyze}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-btn text-xs font-semibold transition-all press-sm ${
              !canAnalyze ? 'bg-surface-hover text-text-muted cursor-not-allowed'
              : block.aiStatus === 'done' ? 'bg-success/10 text-success border border-success/20 hover:bg-success/15'
              : 'grad-accent text-white hover:opacity-90'
            }`}
          >
            {block.aiStatus === 'analyzing' ? (
              <><div className="w-3 h-3 border-2 border-current/40 border-t-current rounded-full animate-spin" />{block.aiMessage || 'Läuft…'}</>
            ) : block.aiStatus === 'done' ? (
              <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 4v6h6M23 20v-6h-6" strokeLinecap="round" strokeLinejoin="round" /><path d="M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15" strokeLinecap="round" strokeLinejoin="round" /></svg>Erneut</>
            ) : (
              <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" strokeLinecap="round" strokeLinejoin="round" /></svg>{block.pdfFile ? 'PDF analysieren' : 'Analysieren'}</>
            )}
          </button>
        </div>

        {/* Photo KI result */}
        {block.aiResult && (
          <div className="border-t border-border px-4 py-3 space-y-3 bg-accent/3">
            {/* Transcription collapsible */}
            <div>
              <button
                onClick={() => updateBlock(block.id, { transcriptionOpen: !block.transcriptionOpen } as Partial<PhotoBlock>)}
                className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-wider hover:text-text-secondary transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${block.transcriptionOpen ? '' : '-rotate-90'}`}>
                  <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Transkription
              </button>
              {block.transcriptionOpen && (
                <p className="mt-2 text-text-muted text-xs leading-relaxed whitespace-pre-wrap font-mono bg-background rounded-card px-3 py-2 border border-border">
                  {block.aiResult.transcription}
                </p>
              )}
            </div>

            {/* Tasks — one card per solved problem */}
            {block.aiResult.tasks.length > 0 && (
              <div className="space-y-4">
                {block.aiResult.tasks.length > 1 && (
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{block.aiResult.tasks.length} Aufgaben gelöst</p>
                )}
                {block.aiResult.tasks.map((task, ti) => (
                  <div key={ti} className={`${ti > 0 ? 'pt-4 border-t border-border' : ''}`}>
                    {block.aiResult!.tasks.length > 1 && (
                      <p className="text-[10px] font-bold text-accent uppercase tracking-wider mb-1.5">Aufgabe {ti + 1}</p>
                    )}
                    {task.question && (
                      <p className="text-xs text-text-muted italic mb-2"><MathRenderer text={task.question} /></p>
                    )}
                    <ol className="space-y-1.5 mb-2">
                      {task.steps.map((step, i) => (
                        <li key={i} className="flex gap-2 items-start text-sm text-text-secondary">
                          <span className="w-5 h-5 rounded-full bg-accent/10 text-accent text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
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
            )}

            {/* Summary */}
            {block.aiResult.summary && (
              <div>
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Zusammenfassung</p>
                <p className="text-text-secondary text-sm leading-relaxed"><MathRenderer text={block.aiResult.summary} /></p>
              </div>
            )}
          </div>
        )}

        {/* Hidden file inputs */}
        <input
          ref={(el) => { if (photoRefs.current[block.id]) photoRefs.current[block.id].camera = el }}
          type="file" accept="image/*" capture="environment" className="hidden"
          onChange={(e) => handlePhotoFile(block.id, e.target.files?.[0])}
        />
        <input
          ref={(el) => { if (photoRefs.current[block.id]) photoRefs.current[block.id].file = el }}
          type="file" accept="image/*,.pdf" className="hidden"
          onChange={(e) => handlePhotoFile(block.id, e.target.files?.[0])}
        />
      </div>
    )
  }

  const toggleDrawingFullscreen = (blockId: string) => {
    if (fullscreenBlockId === blockId) {
      setFullscreenBlockId(null)
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
        if (screen.orientation && screen.orientation.unlock) {
          screen.orientation.unlock();
        }
      } catch {}
    } else {
      setFullscreenBlockId(blockId)
      const element = document.getElementById(`drawing-container-${blockId}`)
      if (element && element.requestFullscreen) {
        element.requestFullscreen().then(() => {
          if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').catch(() => {});
          }
        }).catch(() => {});
      }
    }
  }

  const renderDrawingBlock = (block: DrawingBlock, isDefault: boolean) => {
    const isFullscreen = fullscreenBlockId === block.id

    // Style configuration to handle vertical screens when rotated landscape is forced
    const fsContainerStyle: React.CSSProperties = isFullscreen && !isLandscape
      ? {
          position: 'fixed',
          top: '50%',
          left: '50%',
          width: '100vh',
          height: '100vw',
          transform: 'translate(-50%, -50%) rotate(90deg)',
          transformOrigin: 'center',
          zIndex: 9999,
        }
      : {}

    const containerClass = isFullscreen
      ? isLandscape
        ? "fixed inset-0 z-[60] bg-[#0D0D0F] flex flex-col w-full h-full"
        : "fixed z-[60] bg-[#0D0D0F] flex flex-col"
      : "mx-4 mb-3 bg-surface rounded-card shadow-card-adaptive border border-border/60 overflow-hidden"

    return (
      <div
        key={block.id}
        id={`drawing-container-${block.id}`}
        className={containerClass}
        style={fsContainerStyle}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-border bg-surface shrink-0">
          <div className="flex items-center gap-2">
            <span className="section-label">✏️ Schreibblock {isFullscreen && '(Vollbild)'}</span>
            {isFullscreen && !isLandscape && (
              <span className="text-[9px] bg-accent/15 text-accent px-1.5 py-0.5 rounded font-semibold whitespace-nowrap">Querformat erzwungen</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isFullscreen ? (
              <button
                onClick={() => toggleDrawingFullscreen(block.id)}
                className="p-1 rounded-btn hover:bg-surface-hover transition-colors press-sm"
                title="Vollbild beenden"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="text-text-secondary">
                  <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ) : (
              <>
                <button
                  onClick={() => toggleDrawingFullscreen(block.id)}
                  className="p-1 rounded-btn hover:bg-surface-hover transition-colors press-sm"
                  title="Vollbild"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="text-text-secondary">
                    <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {!isDefault && (
                  <button onClick={() => removeBlock(block.id)} className="p-1 rounded-btn hover:bg-danger/10 transition-colors press-sm">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-danger">
                      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                    </svg>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
        <DrawingCanvas
          isFullscreen={isFullscreen}
          onChange={(dataUrl) => updateBlock(block.id, { dataUrl } as Partial<NoteBlock>)}
        />
      </div>
    )
  }

  const renderHomeworkBlock = (block: HomeworkBlock) => {
    const effectiveSubjectId = selectedSubjectId || block.subjectId
    const nextLesson = effectiveSubjectId ? getNextLessonDate(effectiveSubjectId, profile?.stundenplan) : null

    return (
    <div key={block.id} className="mx-4 mb-3 bg-surface rounded-card shadow-card-adaptive border border-border/60 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <span className="section-label">📚 Hausaufgaben</span>
        <button onClick={() => removeBlock(block.id)} className="p-1 rounded-btn hover:bg-danger/10 transition-colors press-sm">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-danger">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Subject pills — only when no note-level subject */}
      {!selectedSubjectId && (
        <div className="px-4 pb-2">
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Fach</p>
          <div className="flex flex-wrap gap-1.5">
            {profileSubjects.map((s) => (
              <button
                key={s.id}
                onClick={() => updateBlock(block.id, { subjectId: s.id === block.subjectId ? '' : s.id } as Partial<HomeworkBlock>)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-[11px] font-semibold border transition-all press-sm"
                style={block.subjectId === s.id
                  ? { backgroundColor: s.color, borderColor: 'transparent', color: 'white' }
                  : { borderColor: 'rgba(var(--color-border),0.6)', color: 'rgb(var(--color-text-secondary))' }}
              >
                {s.icon} {s.name}
              </button>
            ))}
          </div>
          {!block.subjectId && (
            <p className="text-[10px] text-warning mt-1.5">Wähle ein Fach, damit die HA im Hausaufgabenheft erscheint</p>
          )}
        </div>
      )}

      <div className="px-4 pb-3 space-y-3">
        {/* Description */}
        <textarea
          value={block.description}
          onChange={(e) => {
            e.target.style.height = 'auto'
            e.target.style.height = `${e.target.scrollHeight}px`
            updateBlock(block.id, { description: e.target.value })
          }}
          placeholder="Was ist zu tun? z.B. Seite 23, Nr. 4–7 …"
          className="w-full bg-background border border-border rounded-card px-3 py-2.5 text-text-secondary text-sm placeholder-text-muted focus:outline-none focus:border-accent transition-colors resize-none leading-relaxed"
          style={{ minHeight: '72px', overflow: 'hidden' }}
        />

        {/* Due date + next lesson button */}
        <div>
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider shrink-0 w-16">Abgabe</label>
            <input
              type="date"
              value={block.dueDate}
              onChange={(e) => updateBlock(block.id, { dueDate: e.target.value })}
              min={new Date().toISOString().slice(0, 10)}
              className="flex-1 bg-background border border-border rounded-card px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent transition-colors"
            />
            {nextLesson && (
              <button
                onClick={() => updateBlock(block.id, { dueDate: nextLesson })}
                className="flex items-center gap-1 px-2.5 py-2 rounded-card text-[11px] font-semibold border transition-all press-sm whitespace-nowrap shrink-0"
                style={block.dueDate === nextLesson
                  ? { background: 'rgb(var(--color-accent))', borderColor: 'transparent', color: 'white' }
                  : { borderColor: 'rgba(var(--color-accent),0.4)', color: 'rgb(var(--color-accent))' }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
                </svg>
                Nächste Std.
              </button>
            )}
          </div>
          {nextLesson && block.dueDate === nextLesson && (
            <p className="text-[10px] text-accent mt-1 pl-[72px]">
              → {new Date(nextLesson + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'short' })}
            </p>
          )}
        </div>

        {/* Separator */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-border/60" />
          <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">KI-Hilfe · optional</span>
          <div className="flex-1 h-px bg-border/60" />
        </div>

        {/* AI Help button */}
        {!block.aiHelp && (
          <button
            onClick={async () => {
              if (!block.description.trim() || block.aiLoading) return
              updateBlock(block.id, { aiLoading: true })
              try {
                const help = await answerQuestion(block.description, subject?.name ?? 'Allgemein')
                updateBlock(block.id, { aiHelp: help, aiLoading: false })
              } catch {
                updateBlock(block.id, { aiLoading: false })
              }
            }}
            disabled={!block.description.trim() || block.aiLoading}
            className={`flex items-center gap-2 px-3 py-2 rounded-card text-xs font-semibold transition-all press-sm ${
              !block.description.trim()
                ? 'bg-surface-hover text-text-muted cursor-not-allowed'
                : 'grad-accent text-white hover:opacity-90'
            }`}
          >
            {block.aiLoading ? (
              <><div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />Wird geladen…</>
            ) : (
              <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" /></svg>Erklären lassen</>
            )}
          </button>
        )}

        {/* AI Help result */}
        {block.aiHelp && (
          <div className="bg-accent/5 border border-accent/15 rounded-card px-3 py-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-bold text-accent uppercase tracking-wider">KI-Hilfe</p>
              <button
                onClick={() => updateBlock(block.id, { aiHelp: null })}
                className="text-text-muted hover:text-danger text-[10px] transition-colors"
              >
                Löschen
              </button>
            </div>
            <p className="text-text-secondary text-sm leading-relaxed">{block.aiHelp}</p>
          </div>
        )}
      </div>
    </div>
  )
  }

  // ── Main render ──────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col bg-background" style={{ height: '100dvh' }}>

      {/* HEADER */}
      <div
        className="flex items-center justify-between px-4 pb-3 border-b border-border shrink-0"
        style={{ paddingTop: 'max(48px, calc(env(safe-area-inset-top, 0px) + 12px))' }}
      >
        <button onClick={handleCancelPress} className="text-text-muted text-sm hover:text-text-secondary transition-colors px-1 py-1">
          Abbrechen
        </button>
        <div className="flex items-center gap-2">
          {subject && (
            <div className="w-6 h-6 rounded flex items-center justify-center text-sm" style={{ backgroundColor: `${subject.color}22` }}>
              {subject.icon}
            </div>
          )}
          <span className="text-text-primary font-semibold text-sm">Neue Notiz</span>
        </div>
        <button onClick={handleSavePress} className="text-accent text-sm font-semibold hover:opacity-80 transition-opacity px-1 py-1">
          Speichern
        </button>
      </div>

      {/* Subject picker */}
      {!id && (
        <div className="px-4 py-2 border-b border-border shrink-0 bg-background">
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedSubjectId('')}
              className={`px-3 py-1 rounded-pill text-xs font-medium border transition-all ${selectedSubjectId === '' ? 'bg-surface-hover border-border text-text-secondary' : 'border-border text-text-muted hover:bg-surface-hover'}`}
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
                className={`flex items-center gap-1.5 px-3 py-1 rounded-pill text-xs font-medium border transition-all ${selectedSubjectId === s.id ? 'text-white border-transparent' : 'border-border text-text-muted hover:bg-surface-hover'}`}
                style={selectedSubjectId === s.id ? { backgroundColor: s.color } : undefined}
              >
                {s.icon} {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* SCROLLABLE ZONE */}
      <div className="flex-1 overflow-y-auto">

        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titel"
          autoFocus={!!id}
          className="w-full bg-transparent px-4 pt-4 pb-3 text-text-primary text-lg font-semibold placeholder-text-muted focus:outline-none border-b border-border mb-3"
        />

        {/* Blocks */}
        {blocks.map((block, i) => {
          if (block.type === 'text') return renderTextBlock(block, i, i === 0)
          if (block.type === 'photo') return renderPhotoBlock(block, i, i === 1)
          if (block.type === 'drawing') return renderDrawingBlock(block, i === 2)
          if (block.type === 'homework') return renderHomeworkBlock(block)
          return null
        })}

        {/* Add more blocks */}
        <div className="mx-4 mb-4">
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">Weitere Felder</p>
          <div className="flex gap-2">
            <button
              onClick={addTextBlock}
              className="flex items-center gap-1.5 px-3 py-2 rounded-card border border-dashed border-border text-text-muted text-xs font-medium hover:border-accent hover:text-accent hover:bg-accent/5 transition-all active:scale-95"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round" /><line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" /></svg>
              Textnotiz
            </button>
            <button
              onClick={addPhotoBlock}
              className="flex items-center gap-1.5 px-3 py-2 rounded-card border border-dashed border-border text-text-muted text-xs font-medium hover:border-accent hover:text-accent hover:bg-accent/5 transition-all active:scale-95"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round" /><line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" /></svg>
              Fotonotiz
            </button>
            <button
              onClick={addDrawingBlock}
              className="flex items-center gap-1.5 px-3 py-2 rounded-card border border-dashed border-border text-text-muted text-xs font-medium hover:border-accent hover:text-accent hover:bg-accent/5 transition-all active:scale-95"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Schreibnotiz
            </button>
            <button
              onClick={addHomeworkBlock}
              className="flex items-center gap-1.5 px-3 py-2 rounded-card border border-dashed border-border text-text-muted text-xs font-medium hover:border-accent hover:text-accent hover:bg-accent/5 transition-all active:scale-95"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" strokeLinecap="round" strokeLinejoin="round" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
              Hausaufgaben
            </button>
          </div>
        </div>

        {/* Q&A */}
        {(qaItems.length > 0 || askLoading) && (
          <div className="mx-4 mb-4 space-y-2">
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider px-1">Fragen &amp; Antworten</p>
            {qaItems.map((item, i) => (
              <div key={i} className="bg-surface border border-border rounded-card overflow-hidden">
                <button
                  onClick={() => toggleQA(i)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-surface-hover transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-accent shrink-0" strokeWidth="2.5">
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

        <div className="h-4" />
      </div>

      {/* TOOLBAR */}
      <div className="shrink-0 border-t border-border px-3 py-3 bg-surface">
        {showAskBar ? (
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
              className={`w-8 h-8 rounded-btn flex items-center justify-center shrink-0 transition-all ${askInput.trim() ? 'grad-accent text-white hover:opacity-90 active:scale-95' : 'bg-surface-hover text-text-muted cursor-not-allowed'}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              {totalWords > 0 || totalPhotos > 0 || qaItems.length > 0 ? (
                <p className="text-xs text-text-muted truncate">
                  {[
                    totalWords > 0 && `${totalWords} ${totalWords === 1 ? 'Wort' : 'Wörter'}`,
                    totalPhotos > 0 && `${totalPhotos} ${totalPhotos === 1 ? 'Foto' : 'Fotos'}`,
                    qaItems.length > 0 && `${qaItems.length} ${qaItems.length === 1 ? 'Frage' : 'Fragen'}`,
                  ].filter(Boolean).join(' · ')}
                </p>
              ) : (
                <p className="text-xs text-text-muted">Text eingeben oder Foto hochladen</p>
              )}
            </div>
            <button
              onClick={() => setShowAskBar(true)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-card text-sm font-semibold border border-accent/40 text-accent hover:bg-accent/5 active:scale-95 transition-all duration-150"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Fragen
            </button>
          </div>
        )}
      </div>

      {/* LIGHTBOX */}
      {lightbox && (
        <div className="fixed inset-0 z-[70] bg-black/95 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
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

      {/* CANCEL CONFIRM MODAL */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCancelConfirm(false)} />
          <div className="relative max-w-lg mx-auto w-full bg-surface border-t border-border rounded-t-sheet z-10">
            <div className="px-5 pt-5 pb-2">
              <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />
              <h2 className="text-base font-bold text-text-primary mb-1">Notiz verwerfen?</h2>
              <p className="text-text-muted text-sm">
                {folderId && currentFolder
                  ? `Dein Inhalt geht verloren — oder du kannst ihn direkt in „${currentFolder.name}" speichern.`
                  : 'Dein Inhalt wird gelöscht wenn du abbrichst.'}
              </p>
            </div>
            <div className="px-4 py-4 space-y-2.5" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))' }}>
              {folderId && (
                <button
                  onClick={() => { setShowCancelConfirm(false); confirmSave(folderId) }}
                  className="w-full py-3 rounded-card grad-accent text-white text-sm font-semibold hover:opacity-90 active:scale-95 transition-all"
                >
                  {currentFolder ? `In „${currentFolder.name}" speichern` : 'Im Ordner speichern'}
                </button>
              )}
              <button
                onClick={() => { setShowCancelConfirm(false); navigate('/unterricht', { replace: true }) }}
                className="w-full py-3 rounded-card border text-sm font-semibold transition-all hover:bg-danger/5 active:scale-95"
                style={{ borderColor: 'rgba(248,113,113,0.3)', color: '#F87171' }}
              >
                Trotzdem verlassen
              </button>
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="w-full py-3 rounded-card bg-surface-hover text-text-secondary text-sm font-semibold hover:bg-border transition-all active:scale-95"
              >
                Zurück
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NO-SUBJECT SAVE MODAL */}
      {showNoSubjectModal && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowNoSubjectModal(false)} />
          <div className="relative max-w-lg mx-auto w-full bg-surface border-t border-border rounded-t-sheet z-10 max-h-[85vh] flex flex-col">
            <div className="px-5 pt-5 pb-4 border-b border-border shrink-0">
              <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-base font-bold text-text-primary">Wo speichern?</h2>
                  <p className="text-text-muted text-xs mt-0.5">Kein Fach ausgewählt — wähle eine Option</p>
                </div>
                <button onClick={() => navigate(-1)} className="p-1.5 rounded-btn hover:bg-danger/5 transition-colors -mt-0.5 -mr-1">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-danger">
                    <polyline points="3 6 5 6 21 6" strokeLinecap="round" />
                    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M10 11v6M14 11v6" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 px-4 py-4 space-y-2.5" style={{ paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom, 0px))' }}>
              {suggestionStatus === 'loading' && (
                <div className="flex items-center gap-3 px-4 py-3.5 bg-surface border border-border rounded-card">
                  <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin shrink-0" />
                  <p className="text-text-secondary text-sm">KI analysiert Notizinhalt…</p>
                </div>
              )}
              {suggestionStatus === 'done' && suggestion && (
                <button onClick={acceptSuggestion} className="w-full flex items-center gap-3 px-4 py-3.5 bg-accent/5 border border-accent/20 rounded-card text-left hover:bg-accent/10 active:scale-95 transition-all">
                  <div className="w-9 h-9 rounded-btn bg-accent/10 flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-accent" strokeWidth="2">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold text-accent uppercase tracking-wider">KI-Vorschlag</span>
                    <p className="text-text-primary text-sm font-semibold">{suggestion.subjectName}</p>
                    <p className="text-text-muted text-xs mt-0.5 line-clamp-1">{suggestion.reason}</p>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-accent" strokeWidth="2.5"><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              )}
              <button onClick={() => setShowNoSubjectModal(false)} className="w-full flex items-center gap-3 px-4 py-3.5 bg-surface border border-border rounded-card text-left hover:bg-surface-hover active:scale-95 transition-all">
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
              <button onClick={saveToOhneFach} className="w-full flex items-center gap-3 px-4 py-3.5 bg-surface border border-border rounded-card text-left hover:bg-surface-hover active:scale-95 transition-all">
                <div className="w-9 h-9 rounded-btn bg-surface-hover flex items-center justify-center shrink-0 text-base">📁</div>
                <div>
                  <p className="text-text-primary text-sm font-medium">Schnellnotizen</p>
                  <p className="text-text-muted text-xs mt-0.5">
                    {ohneFachNoteCount > 0 ? `${ohneFachNoteCount} ${ohneFachNoteCount === 1 ? 'Notiz' : 'Notizen'} bereits dort` : 'Separater Ordner für nicht zugeordnete Notizen'}
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SAVE MODAL */}
      {showSaveModal && (() => {
        const subjectFolders = userFolders.filter((f) => f.subjectId === selectedSubjectId)
        const grouped = halfYears
          .map((hy) => ({ halfYear: hy, folders: subjectFolders.filter((f) => f.halfYearId === hy.id) }))
          .filter((g) => g.folders.length > 0)
        const ungrouped = subjectFolders.filter((f) => !f.halfYearId)
        return (
          <div className="fixed inset-0 z-[60] flex flex-col justify-end">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowSaveModal(false)} />
            <div className="relative max-w-lg mx-auto w-full bg-surface border-t border-border rounded-t-sheet z-10 max-h-[80vh] flex flex-col">
              <div className="px-5 pt-5 pb-3 border-b border-border shrink-0">
                <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-base font-bold text-text-primary">Wo speichern?</h2>
                    <p className="text-text-muted text-xs mt-0.5">{subject ? `${subject.icon} ${subject.name}` : 'Kein Fach'}</p>
                  </div>
                  <button onClick={() => navigate(-1)} className="p-1.5 rounded-btn hover:bg-danger/5 transition-colors -mt-0.5 -mr-1">
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
                  <div className="w-8 h-8 rounded-btn flex items-center justify-center shrink-0 icon-accent">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-accent"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">Notizen</p>
                    <p className="text-text-muted text-xs">Standard-Ordner · wird automatisch angelegt</p>
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
                        <div className="w-8 h-8 rounded-btn flex items-center justify-center shrink-0" style={{ backgroundColor: `${subject?.color ?? '#007AFF'}22` }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={subject?.color ?? '#007AFF'} strokeWidth="1.8">
                            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                        <p className="text-sm font-medium text-text-primary flex-1 truncate">{folder.name}</p>
                        {selectedFolderId === folder.id && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-accent" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
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
                    <div className="w-8 h-8 rounded-btn flex items-center justify-center shrink-0" style={{ backgroundColor: `${subject?.color ?? '#007AFF'}22` }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={subject?.color ?? '#007AFF'} strokeWidth="1.8">
                        <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-text-primary flex-1 truncate">{folder.name}</p>
                  </button>
                ))}
                {subjectFolders.length === 0 && (
                  <div className="px-5 py-6 text-center text-text-muted text-sm">Noch keine Ordner für dieses Fach.</div>
                )}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
