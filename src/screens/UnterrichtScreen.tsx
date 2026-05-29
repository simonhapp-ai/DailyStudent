import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { BottomSheet } from '../components/ui/BottomSheet'
import { analyzeFileToSmartNote, suggestImportDestination, GEMINI_BATCH_DELAY_MS, type ImportDestination } from '../lib/gemini'
import type { UserFolder, UserNote } from '../types'
import { subjects, halfYears } from '../data/mockData'
import type { HalfYear } from '../types'
import type { Subject } from '../types'
import { SubjectIcon } from '../components/ui/SubjectIcon'

export function UnterrichtScreen() {
  const navigate = useNavigate()
  const { profile, userNotes, userFolders, addFolder, saveNote, saveToOhneFachFolder } = useUser()
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set())
  const [addFolderFor, setAddFolderFor] = useState<string | null>(null)
  const [newFolderName, setNewFolderName] = useState('')

  // ── File import (with KI suggestion + folder navigation) ────────────────
  type ImportPhase =
    | 'idle'
    | 'suggesting'      // single file: KI is analyzing to suggest destination
    | 'suggested'       // KI returned a suggestion, user decides
    | 'manual-subjects' // user browses subjects manually
    | 'manual-folders'  // user browses folders of a chosen subject
    | 'processing'      // batch processing running
    | 'done'

  const importRef = useRef<HTMLInputElement>(null)
  const cancelRef = useRef(false)
  const suggestionAbortRef = useRef<AbortController | null>(null)
  const processingAbortRef = useRef<AbortController | null>(null)
  // Ref so startProcessing always sees current files, not a stale React state value
  const importFilesRef = useRef<File[]>([])

  const [importFiles, setImportFiles] = useState<File[]>([])
  const [importPhase, setImportPhase] = useState<ImportPhase>('idle')
  const [importSuggestion, setImportSuggestion] = useState<ImportDestination | null>(null)
  const [manualSubject, setManualSubject] = useState<Subject | null>(null)
  const [importCurrent, setImportCurrent] = useState(0)
  const [importSucceeded, setImportSucceeded] = useState(0)
  const [importFailed, setImportFailed] = useState(0)
  const [importDestSubjectId, setImportDestSubjectId] = useState('')
  const [importDestFolderId, setImportDestFolderId] = useState<string | undefined>(undefined)

  const resetImport = () => {
    setImportPhase('idle')
    setImportFiles([])
    importFilesRef.current = []
    setImportSuggestion(null)
    setManualSubject(null)
    setImportDestFolderId(undefined)
  }

  const closeImport = () => {
    if (importPhase === 'processing') {
      cancelRef.current = true
      processingAbortRef.current?.abort()
      return // stay open — loop will finish current file then show 'done'
    }
    if (importPhase === 'suggesting') suggestionAbortRef.current?.abort()
    resetImport()
  }

  const handleImportFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files
    if (!list || list.length === 0) return
    const files = Array.from(list)  // copy File objects before clearing input
    e.target.value = ''
    importFilesRef.current = files  // ref is synchronous — always current in startProcessing
    setImportFiles(files)

    if (files.length === 1) {
      // Single file → auto-start KI suggestion
      setImportPhase('suggesting')
      const controller = new AbortController()
      suggestionAbortRef.current = controller
      const subjectFolders = userFolders.filter((f) => f.subjectId !== 'ohne-fach' && !f.parentFolderId)
      void suggestImportDestination(files[0], profileSubjects, subjectFolders, controller.signal)
        .then((result) => {
          if (controller.signal.aborted) return

          let suggestion = result
          if (suggestion && !suggestion.folderId) {
            // AI matched the subject but couldn't pick a folder from generic names (e.g. "Halbjahr 1").
            // Fall back: current half-year folder → most recent folder → any folder for this subject.
            const candidateFolders = userFolders.filter(
              (f) => f.subjectId === suggestion!.subjectId && !f.parentFolderId,
            )
            const currentHyId = halfYears.find((hy) => hy.isCurrent)?.id
            const picked =
              candidateFolders.find((f) => f.halfYearId === currentHyId) ??
              candidateFolders.at(-1) ??
              candidateFolders[0]
            if (picked) {
              suggestion = { ...suggestion, folderId: picked.id, folderName: picked.name }
            }
          }

          setImportSuggestion(suggestion)
          setImportPhase('suggested')
        })
        .catch(() => {
          if (!controller.signal.aborted) setImportPhase('manual-subjects')
        })
    } else {
      // Multiple files → skip suggestion, go straight to subject picker
      setImportPhase('manual-subjects')
    }
  }

  const goManual = () => {
    if (importPhase === 'suggesting') suggestionAbortRef.current?.abort()
    setImportPhase('manual-subjects')
  }

  const selectManualSubject = (s: Subject) => {
    const subs = userFolders.filter((f) => f.subjectId === s.id && !f.parentFolderId)
    if (subs.length === 0) {
      void startProcessing(s.id, s.name, undefined)
    } else {
      setManualSubject(s)
      setImportPhase('manual-folders')
    }
  }

  const startProcessing = async (subjectId: string, subjectName: string, folderId: string | undefined) => {
    // Always read from ref — guaranteed to be current even if React state hasn't re-rendered yet
    const files = importFilesRef.current
    if (files.length === 0) return
    cancelRef.current = false
    const controller = new AbortController()
    processingAbortRef.current = controller

    // Resolve target folder: use explicit folderId if provided, otherwise auto-create import folder
    let targetFolderId = folderId
    if (!targetFolderId && subjectId) {
      const importFolderId = `folder-import-${subjectId}`
      if (!userFolders.some((f) => f.id === importFolderId)) {
        addFolder({
          id: importFolderId,
          subjectId,
          name: 'Importiert',
          createdAt: new Date().toISOString(),
          isAutoGenerated: false,
        })
      }
      targetFolderId = importFolderId
    }

    setImportDestSubjectId(subjectId)
    setImportDestFolderId(targetFolderId)
    setImportPhase('processing')
    setImportCurrent(0)
    setImportSucceeded(0)
    setImportFailed(0)

    let succeeded = 0
    let failed = 0
    for (let i = 0; i < files.length; i++) {
      if (cancelRef.current) break
      setImportCurrent(i)
      try {
        const noteId = `import-${Date.now()}-${i}`
        const { generated, noteTitle } = await analyzeFileToSmartNote(
          files[i], noteId, subjectName, controller.signal,
        )
        const note: UserNote = {
          id: noteId,
          subjectId: subjectId || undefined,
          folderId: targetFolderId ?? (subjectId ? undefined : 'folder-no-subject'),
          title: noteTitle,
          content: generated.summary,
          createdAt: new Date().toISOString(),
        }
        if (subjectId) saveNote(note, generated)
        else saveToOhneFachFolder(note, generated)
        succeeded++
        setImportSucceeded(succeeded)
      } catch {
        if (cancelRef.current) break // aborted — don't count as failure
        failed++
        setImportFailed(failed)
      }
      if (i < files.length - 1 && !cancelRef.current) {
        await new Promise<void>((r) => setTimeout(r, GEMINI_BATCH_DELAY_MS))
      }
    }
    setImportPhase('done')
  }

  const finishImport = () => {
    const dest = importDestSubjectId
    const destFolder = importDestFolderId  // capture before resetImport clears state
    resetImport()
    if (importSucceeded > 0) {
      if (dest && destFolder) navigate(`/unterricht/${dest}/ordner/${destFolder}`)
      else if (dest) navigate(`/unterricht/${dest}`)
      else navigate('/unterricht/ohne-fach/ordner/folder-no-subject')
    }
  }

  const profileSubjects: Subject[] = (profile?.faecher ?? [])
    .map((id) => subjects.find((s) => s.id === id))
    .filter((s): s is Subject => s !== undefined)

  const toggleSubject = (id: string) => {
    setExpandedSubjects((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const openAddFolder = (subjectId: string) => {
    setAddFolderFor(subjectId)
    setNewFolderName('')
  }

  const confirmAddFolder = () => {
    if (!addFolderFor || !newFolderName.trim()) return
    const folder: UserFolder = {
      id: `folder-custom-${crypto.randomUUID()}`,
      subjectId: addFolderFor,
      halfYearId: halfYears.find((h) => h.isCurrent)?.id ?? 'hj2',
      name: newFolderName.trim(),
      createdAt: new Date().toISOString(),
    }
    addFolder(folder)
    setAddFolderFor(null)
    setNewFolderName('')
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-28">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="px-5" style={{ paddingTop: 'max(58px, calc(env(safe-area-inset-top, 0px) + 18px))' }}>
        <h1 className="text-[28px] font-bold text-text-primary">Unterricht</h1>
        <p className="text-[13px] text-text-muted mt-0.5">
          {profile?.schulform ?? 'Gymnasium'}{profile?.bundesland ? ` · ${profile.bundesland}` : ''}
        </p>
      </div>

      {profileSubjects.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center py-16">
          <div className="text-5xl mb-5">📚</div>
          <p className="text-text-primary font-semibold text-[17px] mb-2">Keine Fächer</p>
          <p className="text-text-muted text-[14px]">Gehe zu Profil → Onboarding zurücksetzen.</p>
        </div>
      ) : (
        <div className="px-5 mt-5 space-y-3">

          {/* ── Schnellaktionen ──────────────────────────────────── */}
          <div className="flex gap-3">
            {/* Neue Notiz */}
            <button
              onClick={() => navigate('/unterricht/neue-notiz')}
              className="flex-1 bg-surface rounded-card shadow-card-adaptive border border-border/60 p-4 flex flex-col gap-3 hover-lift text-left"
            >
              <div
                className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0"
                style={{ background: 'linear-gradient(145deg, #F8CE45, #C9891A)' }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.8">
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <p className="text-text-primary font-semibold text-[14px]">Neue Notiz</p>
                <p className="text-text-muted text-[11px] mt-0.5">Schnell erfassen</p>
              </div>
            </button>

            {/* Datei importieren */}
            <button
              onClick={() => importRef.current?.click()}
              className="flex-1 bg-surface rounded-card shadow-card-adaptive border border-border/60 p-4 flex flex-col gap-3 hover-lift text-left"
            >
              <div
                className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0"
                style={{ background: 'linear-gradient(145deg, #5B8AF5, #3461D1)' }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <p className="text-text-primary font-semibold text-[14px]">Importieren</p>
                <p className="text-text-muted text-[11px] mt-0.5">PDF oder Foto</p>
              </div>
            </button>
          </div>

          {/* Hidden file input — multiple, no count cap */}
          <input
            ref={importRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.webp,image/*,application/pdf"
            className="hidden"
            onChange={handleImportFilePick}
          />

          {/* ── Schnellnotizen ───────────────────────────────────── */}
          {(() => {
            const ohneFolder = userFolders.find((f) => f.id === 'folder-no-subject')
            if (!ohneFolder) return null
            const ohneCount = userNotes.filter((n) => n.folderId === 'folder-no-subject').length
            return (
              <button
                onClick={() => navigate('/unterricht/ohne-fach/ordner/folder-no-subject')}
                className="w-full flex items-center gap-4 bg-surface rounded-card shadow-card-adaptive border border-border/60 px-4 py-4 press transition-all duration-150"
              >
                <div className="w-10 h-10 rounded-[12px] bg-surface-hover flex items-center justify-center shrink-0 text-[18px]">
                  📁
                </div>
                <div className="flex-1 text-left">
                  <p className="text-text-primary font-semibold text-[15px]">Schnellnotizen</p>
                  <p className="text-text-muted text-[12px] mt-0.5">
                    {ohneCount === 0 ? 'Keine Notizen' : `${ohneCount} ${ohneCount === 1 ? 'Notiz' : 'Notizen'}`}
                  </p>
                </div>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted shrink-0">
                  <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )
          })()}

          {/* ── Fächer ───────────────────────────────────────────── */}
          {profileSubjects.map((subject) => {
            const subjectFolders = userFolders.filter((f) => f.subjectId === subject.id && !f.parentFolderId)
            const totalNotes = userNotes.filter((n) => n.subjectId === subject.id).length
            const isExpanded = expandedSubjects.has(subject.id)

            const foldersByHalfYear = halfYears.map((hy) => ({
              halfYear: hy,
              folders: subjectFolders.filter((f) => f.halfYearId === hy.id),
            })).filter((g) => g.folders.length > 0)

            const ungroupedFolders = subjectFolders.filter((f) => !f.halfYearId)

            return (
              <div key={subject.id} className="bg-surface rounded-card shadow-card-adaptive border border-border/60 overflow-hidden">
                <button
                  onClick={() => toggleSubject(subject.id)}
                  className="w-full flex items-center gap-4 px-4 py-4 hover:bg-surface-hover transition-colors press-sm"
                >
                  <SubjectIcon subjectId={subject.id} size="md" />
                  <div className="flex-1 text-left">
                    <p className="text-text-primary font-semibold text-[15px]">{subject.name}</p>
                    <p className="text-text-muted text-[12px] mt-0.5">
                      {subjectFolders.length} {subjectFolders.length === 1 ? 'Ordner' : 'Ordner'}
                      {totalNotes > 0 && ` · ${totalNotes} ${totalNotes === 1 ? 'Notiz' : 'Notizen'}`}
                    </p>
                  </div>
                  <svg
                    width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    className={`text-text-muted transition-transform duration-200 shrink-0 ${isExpanded ? '' : '-rotate-90'}`}
                  >
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {isExpanded && (
                  <div className="border-t border-border/60">
                    {foldersByHalfYear.map(({ halfYear, folders }) => (
                      <div key={halfYear.id}>
                        <div className="flex items-center gap-2 px-4 py-2 bg-background/50">
                          <span className="text-[11px] font-semibold text-text-muted">{halfYear.name}</span>
                          <span className="text-[11px] text-text-muted/60">{halfYear.period}</span>
                          {halfYear.isCurrent && (
                            <span className="ml-auto text-[11px] px-2 py-0.5 rounded-pill font-semibold bg-accent/10 text-accent">
                              Aktuell
                            </span>
                          )}
                        </div>
                        {folders.map((folder) => (
                          <FolderRow
                            key={folder.id}
                            folder={folder}
                            noteCount={userNotes.filter((n) => n.folderId === folder.id).length}
                            onClick={() => navigate(`/unterricht/${subject.id}/ordner/${folder.id}`)}
                          />
                        ))}
                      </div>
                    ))}

                    {ungroupedFolders.map((folder) => (
                      <FolderRow
                        key={folder.id}
                        folder={folder}
                        noteCount={userNotes.filter((n) => n.folderId === folder.id).length}
                        onClick={() => navigate(`/unterricht/${subject.id}/ordner/${folder.id}`)}
                      />
                    ))}

                    {subjectFolders.length === 0 && (
                      <div className="px-5 py-4 border-b border-border/60">
                        <p className="text-text-muted text-[12px]">Noch keine Ordner</p>
                      </div>
                    )}

                    <button
                      onClick={() => openAddFolder(subject.id)}
                      className="w-full flex items-center gap-3 pl-5 pr-4 py-3 hover:bg-surface-hover transition-colors border-t border-border/60 press-sm"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-accent">
                        <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M12 11v6M9 14h6" strokeLinecap="round" />
                      </svg>
                      <span className="text-accent text-[13px] font-medium">Ordner hinzufügen</span>
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Add folder modal ────────────────────────────────────── */}
      <BottomSheet isOpen={!!addFolderFor} onClose={() => setAddFolderFor(null)}>
        <div className="px-5 pb-2">
          <h2 className="text-[20px] font-bold text-text-primary mb-4">Neuen Ordner erstellen</h2>
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && confirmAddFolder()}
            placeholder="z.B. Klausurthemen, Hausaufgaben…"
            className="w-full bg-background border border-border rounded-card px-4 py-3 text-text-primary placeholder-text-muted mb-4 focus:outline-none focus:border-accent transition-colors"
          />
          <button
            onClick={confirmAddFolder}
            disabled={!newFolderName.trim()}
            className={`w-full py-3.5 rounded-card text-[15px] font-semibold transition-all press ${
              newFolderName.trim() ? 'bg-accent text-white hover:opacity-90' : 'bg-surface-hover text-text-muted cursor-not-allowed'
            }`}
          >
            Ordner erstellen
          </button>
        </div>
      </BottomSheet>

      {/* ── Datei-Import BottomSheet ────────────────────────────── */}
      <BottomSheet isOpen={importPhase !== 'idle'} onClose={closeImport}>

        {/* ── KI analysiert (suggesting) ─────────────────────── */}
        {importPhase === 'suggesting' && (
          <div className="px-5 pb-5">
            <p className="text-[17px] font-bold text-text-primary mb-1">KI analysiert Inhalt…</p>
            <p className="text-text-muted text-[12px] mb-5 truncate">{importFiles[0]?.name}</p>
            <div className="flex items-center gap-3 bg-background border border-border rounded-card px-4 py-4 mb-5">
              <div className="w-8 h-8 border-[3px] border-accent/25 border-t-accent rounded-full animate-spin shrink-0" />
              <div>
                <p className="text-text-primary text-[14px] font-medium">Fach wird ermittelt</p>
                <p className="text-text-muted text-[12px] mt-0.5">Dokument wird überflogen…</p>
              </div>
            </div>
            <button
              onClick={goManual}
              className="w-full py-3 rounded-card border border-border text-text-secondary text-[14px] font-medium press hover:bg-surface-hover"
            >
              Manuell wählen
            </button>
          </div>
        )}

        {/* ── KI-Vorschlag zeigen (suggested) ────────────────── */}
        {importPhase === 'suggested' && (
          <div className="px-5 pb-5">
            <p className="text-[17px] font-bold text-text-primary mb-4">
              {importSuggestion ? 'KI-Vorschlag' : 'Kein Vorschlag gefunden'}
            </p>
            {importSuggestion ? (
              <>
                <div className="bg-accent/5 border border-accent/20 rounded-card px-4 py-4 mb-5">
                  <div className="flex items-center gap-3 mb-2">
                    <SubjectIcon subjectId={importSuggestion.subjectId} size="sm" />
                    <div>
                      <p className="text-text-primary font-bold text-[15px]">{importSuggestion.subjectName}</p>
                      {importSuggestion.folderName && (
                        <p className="text-text-muted text-[12px] mt-0.5 flex items-center gap-1">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          {importSuggestion.folderName}
                        </p>
                      )}
                    </div>
                  </div>
                  {importSuggestion.reason && (
                    <p className="text-text-muted text-[12px] italic leading-relaxed">{importSuggestion.reason}</p>
                  )}
                </div>
                <button
                  onClick={() => void startProcessing(
                    importSuggestion.subjectId,
                    importSuggestion.subjectName,
                    importSuggestion.folderId,
                  )}
                  className="w-full py-3.5 rounded-card bg-accent text-white text-[15px] font-semibold press hover:opacity-90 mb-2.5"
                >
                  Vorschlag annehmen
                </button>
              </>
            ) : (
              <p className="text-text-muted text-[14px] mb-5">
                Die KI konnte das Dokument keinem Fach zuordnen.
              </p>
            )}
            <button
              onClick={goManual}
              className="w-full py-3 rounded-card border border-border text-text-secondary text-[14px] font-medium press hover:bg-surface-hover"
            >
              Manuell wählen
            </button>
          </div>
        )}

        {/* ── Fach-Auswahl (manual-subjects) ─────────────────── */}
        {importPhase === 'manual-subjects' && (
          <div className="px-5 pb-2">
            <p className="text-[17px] font-bold text-text-primary mb-1">In welches Fach?</p>
            <p className="text-text-muted text-[12px] mb-4">
              {importFiles.length === 1 ? importFiles[0].name : `${importFiles.length} Dateien`}
            </p>
            <div className="space-y-1.5 max-h-[55vh] overflow-y-auto">
              {profileSubjects.map((s) => {
                const folderCount = userFolders.filter((f) => f.subjectId === s.id && !f.parentFolderId).length
                return (
                  <button
                    key={s.id}
                    onClick={() => selectManualSubject(s)}
                    className="w-full flex items-center gap-3 bg-background border border-border rounded-card px-4 py-3.5 text-left press hover:bg-surface-hover transition-colors"
                  >
                    <SubjectIcon subjectId={s.id} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-text-primary font-medium text-[15px]">{s.name}</p>
                      {folderCount > 0 && (
                        <p className="text-text-muted text-[11px] mt-0.5">{folderCount} Ordner</p>
                      )}
                    </div>
                    {folderCount > 0 && (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted shrink-0">
                        <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                )
              })}
              <button
                onClick={() => void startProcessing('', 'Allgemein', 'folder-no-subject')}
                className="w-full flex items-center gap-3 bg-background border border-border rounded-card px-4 py-3.5 text-left press hover:bg-surface-hover transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-surface-hover flex items-center justify-center shrink-0 text-[16px]">📁</div>
                <span className="text-text-primary font-medium text-[15px]">Schnellnotizen</span>
              </button>
            </div>
          </div>
        )}

        {/* ── Ordner-Auswahl (manual-folders) ────────────────── */}
        {importPhase === 'manual-folders' && manualSubject && (() => {
          const subjectFolders = userFolders.filter((f) => f.subjectId === manualSubject.id && !f.parentFolderId)
          const grouped = halfYears
            .map((hy) => ({ hy, folders: subjectFolders.filter((f) => f.halfYearId === hy.id) }))
            .filter((g) => g.folders.length > 0)
          const ungrouped = subjectFolders.filter((f) => !f.halfYearId)
          return (
            <div className="px-5 pb-2">
              {/* Back + subject header */}
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={() => setImportPhase('manual-subjects')}
                  className="w-8 h-8 rounded-btn flex items-center justify-center hover:bg-surface-hover transition-colors shrink-0 press-sm"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <SubjectIcon subjectId={manualSubject.id} size="sm" />
                <p className="text-text-primary font-bold text-[16px]">{manualSubject.name}</p>
              </div>

              <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
                {/* Direkt im Fach */}
                <button
                  onClick={() => void startProcessing(manualSubject.id, manualSubject.name, undefined)}
                  className="w-full flex items-center gap-3 bg-accent/5 border border-accent/20 rounded-card px-4 py-3.5 text-left press hover:bg-accent/8 transition-colors"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent shrink-0">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M14 2v6h6" strokeLinecap="round" />
                  </svg>
                  <span className="text-accent font-medium text-[14px]">Direkt in {manualSubject.name}</span>
                </button>

                {/* Folders by half year */}
                {grouped.map(({ hy, folders }: { hy: HalfYear; folders: typeof subjectFolders }) => (
                  <div key={hy.id}>
                    <div className="flex items-center gap-2 px-2 py-1.5">
                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{hy.name}</span>
                      {hy.isCurrent && <span className="text-[10px] px-1.5 py-0.5 rounded-pill bg-accent/10 text-accent font-semibold">Aktuell</span>}
                    </div>
                    {folders.map((folder) => (
                      <button
                        key={folder.id}
                        onClick={() => void startProcessing(manualSubject.id, manualSubject.name, folder.id)}
                        className="w-full flex items-center gap-3 bg-background border border-border rounded-card px-4 py-3.5 text-left press hover:bg-surface-hover transition-colors mb-1.5"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-accent shrink-0">
                          <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="text-text-primary font-medium text-[14px]">{folder.name}</span>
                      </button>
                    ))}
                  </div>
                ))}
                {ungrouped.map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => void startProcessing(manualSubject.id, manualSubject.name, folder.id)}
                    className="w-full flex items-center gap-3 bg-background border border-border rounded-card px-4 py-3.5 text-left press hover:bg-surface-hover transition-colors"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-accent shrink-0">
                      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="text-text-primary font-medium text-[14px]">{folder.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )
        })()}

        {/* ── Verarbeitung läuft (processing) ────────────────── */}
        {importPhase === 'processing' && (
          <div className="px-5 pb-5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[17px] font-bold text-text-primary">
                {importFiles.length === 1 ? 'KI verarbeitet Datei' : 'KI verarbeitet Dateien'}
              </p>
              <p className="text-text-muted text-[13px]">
                {importSucceeded + importFailed + 1} / {importFiles.length}
              </p>
            </div>
            <p className="text-text-muted text-[12px] mb-4 truncate">{importFiles[importCurrent]?.name}</p>
            <div className="h-2 bg-border/40 rounded-pill overflow-hidden mb-4">
              <div
                className="h-full bg-accent rounded-pill transition-all duration-500"
                style={{ width: `${importFiles.length > 0 ? ((importSucceeded + importFailed) / importFiles.length) * 100 : 0}%` }}
              />
            </div>
            <div className="flex gap-3 mb-5">
              <div className="flex-1 rounded-card px-3 py-2 text-center" style={{ background: 'rgba(var(--color-success),0.08)', border: '1px solid rgba(var(--color-success),0.2)' }}>
                <p className="text-success font-bold text-[18px]">{importSucceeded}</p>
                <p className="text-text-muted text-[11px]">Erstellt</p>
              </div>
              <div className="flex-1 bg-background border border-border rounded-card px-3 py-2 text-center">
                <p className="text-text-secondary font-bold text-[18px]">
                  {Math.max(0, importFiles.length - importSucceeded - importFailed - 1)}
                </p>
                <p className="text-text-muted text-[11px]">Ausstehend</p>
              </div>
              {importFailed > 0 && (
                <div className="flex-1 rounded-card px-3 py-2 text-center" style={{ background: 'rgba(var(--color-danger),0.08)', border: '1px solid rgba(var(--color-danger),0.2)' }}>
                  <p className="text-danger font-bold text-[18px]">{importFailed}</p>
                  <p className="text-text-muted text-[11px]">Fehler</p>
                </div>
              )}
            </div>
            <p className="text-text-muted text-[11px] text-center mb-4">App offen lassen · KI verarbeitet Datei für Datei</p>
            <button onClick={closeImport} className="w-full py-3 rounded-card border border-border text-text-secondary text-[14px] font-medium press hover:bg-surface-hover">
              Abbrechen
            </button>
          </div>
        )}

        {/* ── Fertig (done) ───────────────────────────────────── */}
        {importPhase === 'done' && (
          <div className="px-5 pb-5">
            <div className="flex flex-col items-center py-4 mb-5">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
                style={{ background: importSucceeded > 0 ? 'rgba(var(--color-success),0.12)' : 'rgba(var(--color-border),0.3)' }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={importSucceeded > 0 ? 'text-success' : 'text-text-muted'}>
                  <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-text-primary font-bold text-[18px] text-center">
                {importSucceeded} {importSucceeded === 1 ? 'Smart Note' : 'Smart Notes'} erstellt
              </p>
              {importFailed > 0 && (
                <p className="text-text-muted text-[13px] mt-1">{importFailed} {importFailed === 1 ? 'Datei' : 'Dateien'} fehlgeschlagen</p>
              )}
            </div>
            <button onClick={finishImport} className="w-full py-3.5 rounded-card bg-accent text-white text-[15px] font-semibold press hover:opacity-90">
              {importSucceeded > 0 ? 'Zum Fach' : 'Schließen'}
            </button>
          </div>
        )}

      </BottomSheet>
    </div>
  )
}

function FolderRow({
  folder, noteCount, onClick,
}: {
  folder: UserFolder; noteCount: number; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 pl-5 pr-4 py-3.5 text-left hover:bg-surface-hover transition-colors border-b border-border/60 press-sm"
    >
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-px h-5 bg-border/60" />
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-accent shrink-0">
          <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium text-text-primary truncate">{folder.name}</p>
        <p className="text-text-muted text-[12px] mt-0.5">
          {noteCount === 0 ? 'Noch keine Notizen' : `${noteCount} ${noteCount === 1 ? 'Notiz' : 'Notizen'}`}
        </p>
      </div>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted shrink-0">
        <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}
