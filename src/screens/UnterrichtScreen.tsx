import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { BottomSheet } from '../components/ui/BottomSheet'
import { analyzeFileToSmartNote, suggestImportDestination, GEMINI_BATCH_DELAY_MS, type ImportDestination } from '../lib/gemini'
import type { UserFolder, UserNote } from '../types'
import { subjects, halfYears } from '../data/mockData'
import type { HalfYear } from '../types'
import { SubjectIcon, QuickNotesIcon } from '../components/ui/SubjectIcon'
import { Icon } from '../components/ui/Icon'
import { Stage } from '../components/ui/Stage'
import { ListGroup, ListRow } from '../components/ui/ListGroup'
import { EmptyState } from '../components/ui/EmptyState'
import { currentSlot, nextSlot, todaysSlots } from '../lib/appMode'
import { resolveSubjectInfo, sortSubjectsByGroup } from '../data/subjectInfo'
import { countNotesInFolderTree } from '../lib/folders'

export function UnterrichtScreen() {
  const navigate = useNavigate()
  const { profile, userNotes, userFolders, addFolder, renameFolder, deleteFolder, saveNote, saveToOhneFachFolder, completedHomeworkIds, standaloneHomework } = useUser()
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set())

  // Laufende und nächste Stunde aus dem Stundenplan — Grundlage der Bühne.
  const laufendeStunde = currentSlot(profile?.stundenplan?.slots)
  const naechsteStunde = nextSlot(profile?.stundenplan?.slots)
  const heuteSlots = todaysSlots(profile?.stundenplan?.slots)

  // Offene Hausaufgaben — gleiche Aggregation wie im Hausaufgabenheft: Aufgaben
  // aus Notizen plus eigenständig erfasste, abzüglich der erledigten.
  const offeneAufgaben = [
    ...userNotes.flatMap((n) =>
      (n.homeworkItems ?? []).map((item, idx) => ({
        id: item.id ?? `${n.id}-hw-${idx}`,
        subjectId: item.subjectId ?? n.subjectId,
        dueDate: item.dueDate,
      })),
    ),
    ...standaloneHomework.map((h) => ({ id: h.id, subjectId: h.subjectId, dueDate: h.dueDate })),
  ].filter((h) => !completedHomeworkIds.includes(h.id))

  const offeneHausaufgaben = offeneAufgaben.length
  const naechsteHausaufgabe = (() => {
    const mitDatum = offeneAufgaben.filter((h) => h.dueDate).sort((a, b) => a.dueDate!.localeCompare(b.dueDate!))
    const naechste = mitDatum[0]
    if (!naechste) return offeneHausaufgaben > 0 ? 'Ohne Abgabedatum' : null
    const fach = naechste.subjectId ? resolveSubjectInfo(naechste.subjectId, profile?.customFaecher).name : 'Aufgabe'
    const d = new Date(naechste.dueDate + 'T00:00:00')
    const heute = new Date(); heute.setHours(0, 0, 0, 0)
    const tage = Math.round((d.getTime() - heute.getTime()) / 86400000)
    const wann = tage < 0 ? 'überfällig' : tage === 0 ? 'heute' : tage === 1 ? 'bis morgen' : `in ${tage} Tagen`
    return `Nächste: ${fach} ${wann}`
  })()
  const [addFolderFor, setAddFolderFor] = useState<string | null>(null)
  const [newFolderName, setNewFolderName] = useState('')

  // ── Folder long-press actions (rename / delete) ──────────────────────────
  const [folderActionsFor, setFolderActionsFor] = useState<UserFolder | null>(null)
  const [renameTarget, setRenameTarget] = useState<UserFolder | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<UserFolder | null>(null)

  const openRename = (folder: UserFolder) => {
    setFolderActionsFor(null)
    setRenameValue(folder.name)
    setRenameTarget(folder)
  }
  const confirmRename = () => {
    if (!renameTarget || !renameValue.trim()) return
    renameFolder(renameTarget.id, renameValue)
    setRenameTarget(null)
  }
  const openDeleteConfirm = (folder: UserFolder) => {
    setFolderActionsFor(null)
    setDeleteTarget(folder)
  }
  const confirmDeleteFolder = () => {
    if (!deleteTarget) return
    deleteFolder(deleteTarget.id)
    setDeleteTarget(null)
  }
  const deleteTargetNoteCount = deleteTarget ? countNotesInFolderTree(deleteTarget.id, userFolders, userNotes) : 0

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
  const [manualSubject, setManualSubject] = useState<{ id: string; name: string } | null>(null)
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

  const selectManualSubject = (s: { id: string; name: string }) => {
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
        const file = files[i]
        const { generated, noteTitle } = await analyzeFileToSmartNote(
          file, noteId, subjectName, controller.signal,
        )

        // Store source: image as base64 (≤2 MB), PDF as filename only
        let sourceAttachments: string[] | undefined
        let sourcePdfAttachments: { name: string }[] | undefined
        if (file.type === 'application/pdf') {
          sourcePdfAttachments = [{ name: file.name }]
        } else if (file.size <= 2 * 1024 * 1024) {
          try {
            const base64 = await new Promise<string>((res, rej) => {
              const reader = new FileReader()
              reader.onload = (e) => res(e.target?.result as string)
              reader.onerror = rej
              reader.readAsDataURL(file)
            })
            sourceAttachments = [base64]
          } catch { /* ignore read errors — original just won't be shown */ }
        }

        const note: UserNote = {
          id: noteId,
          subjectId: subjectId || undefined,
          folderId: targetFolderId ?? (subjectId ? undefined : 'folder-no-subject'),
          title: noteTitle,
          content: generated.summary,
          attachments: sourceAttachments,
          pdfAttachments: sourcePdfAttachments,
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

  // Nach Fachgruppe sortiert: Fächer derselben Farbe stehen beieinander, statt
  // sich über die Liste zu verteilen. Vier zusammenhängende Farbblöcke lesen
  // sich ruhiger als eine gesprenkelte Liste.
  const profileSubjects: { id: string; name: string }[] = sortSubjectsByGroup(profile?.faecher ?? [])
    .map((id) => {
      const std = subjects.find((s) => s.id === id)
      if (std) return { id: std.id, name: std.name }
      const custom = profile?.customFaecher?.find((cf) => cf.id === id)
      if (custom) return { id: custom.id, name: custom.name }
      return null
    })
    .filter((s): s is { id: string; name: string } => s !== null)

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
    <div className="flex flex-col min-h-dvh bg-background pb-28">

      {/* ── Header ─────────────────────────────────────────────── */}
      {/* Kopfzeile mit Avatar (Version C) — seit die Navigationsleiste nur noch zwei
          Modi kennt, ist der Avatar oben rechts der Weg ins Profil und zu allem
          Persönlichen. Personalisierung richtet man einmal ein und fasst sie selten
          an; sie gehört nicht in die Hauptnavigation, muss aber von überall in einem
          Griff erreichbar sein. */}
      <div
        className="px-4 flex items-start justify-between gap-3"
        style={{ paddingTop: 'max(58px, calc(env(safe-area-inset-top, 0px) + 18px))' }}
      >
        <div className="min-w-0">
          <h1 className="text-[28px] font-bold text-text-primary">Unterricht</h1>
          <p className="text-[13px] text-text-muted mt-0.5">
            {profile?.schulform ?? 'Gymnasium'}{profile?.bundesland ? ` · ${profile.bundesland}` : ''}
          </p>
        </div>
        <button
          onClick={() => navigate('/profil')}
          aria-label="Profil und Einstellungen"
          className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-white text-[15px] font-bold press mt-1"
          style={{ background: 'var(--stage-bg)' }}
        >
          {(profile?.name ?? '')
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map((w) => w[0]?.toUpperCase() ?? '')
            .join('') || '·'}
        </button>
      </div>

      {profileSubjects.length === 0 ? (
        <div className="flex-1 flex flex-col justify-center px-5 py-16">
          <EmptyState
            title="Noch keine Fächer"
            note="Ohne Fächer kann die App weder Notizen zuordnen noch Lehrplanthemen vorschlagen."
            action={
              <button
                onClick={() => navigate('/profil/faecher')}
                className="w-full h-12 rounded-pill bg-accent text-on-accent text-[16px] font-semibold press"
              >
                Fächer auswählen
              </button>
            }
          />
        </div>
      ) : (
        <div className="px-4 mt-5 space-y-3">

          {/* ── Bühne: die laufende Stunde ─────────────────────────
              Nach Regel 1 erscheint sie nur, wenn es gerade etwas Zeitkritisches
              gibt. Läuft kein Unterricht, entfällt sie ersatzlos — derselbe
              Screen, zwei Zustände, kein zweites Layout. */}
          <Stage
            eyebrow={
              laufendeStunde
                ? `Jetzt · ${laufendeStunde.startTime} – ${laufendeStunde.endTime}`
                : new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
            }
            title={
              laufendeStunde
                ? (laufendeStunde.isFreistunde
                    ? 'Freistunde'
                    : resolveSubjectInfo(laufendeStunde.subjectId, profile?.customFaecher).name
                      + (laufendeStunde.room ? ` · ${laufendeStunde.room}` : ''))
                : naechsteStunde
                  ? `Nächste Stunde um ${naechsteStunde.startTime}`
                  : heuteSlots.length > 0
                    ? 'Schulschluss für heute'
                    : 'Heute schulfrei'
            }
            note={
              laufendeStunde
                ? (naechsteStunde
                    ? `Danach ${naechsteStunde.isFreistunde ? 'frei' : resolveSubjectInfo(naechsteStunde.subjectId, profile?.customFaecher).name} um ${naechsteStunde.startTime}`
                    : 'Danach Schulschluss')
                : undefined
            }
            action={
              /* Die Bühne ist in der Mitte geteilt und trägt immer zwei Wege in
                 eine Notiz. Was sich mit dem Stundenplan ändert, ist die linke
                 Pille: Läuft Unterricht, heißt sie nach dem Fach und legt es
                 direkt vor — sonst ist es die neutrale Schnellnotiz. Der Import
                 bleibt in beiden Fällen an derselben Stelle. */
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() =>
                    navigate(
                      laufendeStunde && !laufendeStunde.isFreistunde && laufendeStunde.subjectId
                        ? `/unterricht/${laufendeStunde.subjectId}/neue-notiz`
                        : '/unterricht/neue-notiz',
                    )
                  }
                  className="h-12 rounded-pill bg-white text-[#160E28] text-[15px] font-semibold press flex items-center justify-center gap-2 px-3"
                >
                  <Icon name="note" size={17} />
                  <span className="truncate">
                    {laufendeStunde && !laufendeStunde.isFreistunde && laufendeStunde.subjectId
                      ? resolveSubjectInfo(laufendeStunde.subjectId, profile?.customFaecher).name
                      : 'Schnellnotiz'}
                  </span>
                </button>
                <button
                  onClick={() => importRef.current?.click()}
                  className="h-12 rounded-pill bg-white/15 text-white text-[15px] font-semibold press flex items-center justify-center gap-2 border border-white/25 px-3"
                >
                  <Icon name="image" size={17} />
                  <span className="truncate">Importieren</span>
                </button>
              </div>
            }
          />

          {/* Hidden file input — multiple, no count cap.
              Die beiden Schnellaktionen sind in die Bühne gewandert; die
              separaten Kacheln darunter waren danach eine Dopplung. */}
          <input
            ref={importRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.webp,image/*,application/pdf"
            className="hidden"
            onChange={handleImportFilePick}
          />

          {/* Zwei Spalten, sobald Platz da ist: links der Bestand, rechts der
              Tag. Im Hochformat bleibt die Reihenfolge wie bisher — erst was
              heute ansteht, dann die Fächer. */}
          <div className="grid gap-3 xl:grid-cols-2 xl:items-start xl:gap-5">

            <div className="order-2 xl:order-1 space-y-3">
          {/* ── Fächer ─────────────────────────────────────────────
              Eine zusammenhängende Liste statt eines Stapels einzelner Karten:
              ruhiger, und pro Zeile bleibt mehr Platz für den Inhalt. Das
              Aufklappen mit dem Ordner-Raster bleibt unverändert erhalten. */}
          <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-text-secondary px-1 pt-2">
            Deine Fächer
          </p>
          <ListGroup>
          {profileSubjects.map((subject) => {
            const subjectFolders = userFolders.filter((f) => f.subjectId === subject.id && !f.parentFolderId)
            const totalNotes = userNotes.filter((n) => n.subjectId === subject.id).length
            const isExpanded = expandedSubjects.has(subject.id)
            const customColorIdx = profile?.customFaecher?.findIndex((cf) => cf.id === subject.id) ?? -1

            return (
              <div key={subject.id} className="border-b border-border/40 last:border-b-0">
                <button
                  onClick={() => toggleSubject(subject.id)}
                  aria-expanded={isExpanded}
                  className="w-full flex items-center gap-3 px-4 py-3 min-h-[52px] hover:bg-surface-hover transition-colors press-sm"
                >
                  <SubjectIcon
                    subjectId={subject.id}
                    size="md"
                    customColorIndex={customColorIdx >= 0 ? customColorIdx : undefined}
                  />
                  <span className="flex-1 min-w-0 flex flex-col gap-0.5 text-left">
                    <span className="text-[16px] font-semibold tracking-[-0.015em] text-text-primary truncate">{subject.name}</span>
                    <span className="text-[13px] text-text-secondary truncate">
                      {subjectFolders.length} {subjectFolders.length === 1 ? 'Ordner' : 'Ordner'}
                      {totalNotes > 0 && ` · ${totalNotes} ${totalNotes === 1 ? 'Notiz' : 'Notizen'}`}
                    </span>
                  </span>
                  <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    className={`text-text-muted transition-transform duration-200 motion-reduce:transition-none shrink-0 ${isExpanded ? '' : '-rotate-90'}`}
                  >
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {isExpanded && (
                  <div className="border-t border-border/40 px-4 pt-4 pb-4">
                    <div className="grid grid-cols-3 gap-x-3 gap-y-2">
                      {subjectFolders.map((folder) => (
                        <FolderGridItem
                          key={folder.id}
                          name={folder.name}
                          noteCount={userNotes.filter((n) => n.folderId === folder.id).length}
                          onClick={() => navigate(`/unterricht/${subject.id}/ordner/${folder.id}`)}
                          onLongPress={() => setFolderActionsFor(folder)}
                        />
                      ))}
                      <AddFolderGridItem onClick={() => openAddFolder(subject.id)} />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          </ListGroup>
            </div>

            <div className="order-1 xl:order-2 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-text-secondary px-1 hidden xl:block">
            Heute offen
          </p>
          {/* ── Schnellnotizen ───────────────────────────────────── */}
          {(() => {
            const ohneFolder = userFolders.find((f) => f.id === 'folder-no-subject')
            if (!ohneFolder) return null
            const ohneCount = userNotes.filter((n) => n.folderId === 'folder-no-subject').length
            return (
              <ListGroup>
                <ListRow
                  leading={
                    <QuickNotesIcon size="md" />
                  }
                  title="Schnellnotizen"
                  subtitle={ohneCount === 0 ? 'Keine Notizen' : `${ohneCount} ${ohneCount === 1 ? 'Notiz' : 'Notizen'}`}
                  chevron
                  onClick={() => navigate('/unterricht/ohne-fach/ordner/folder-no-subject')}
                />
              </ListGroup>
            )
          })()}

          {/* ── Hausaufgaben ───────────────────────────────────────
              Erfasst werden sie hier, geplant unter Planen — ein Bestand,
              zwei Wege. Die Anzahl steht dort, wo man sie in der Schule
              braucht; offene Aufgaben tragen Rot wie jede Gefahrenmeldung. */}
          <button
            onClick={() => navigate('/hausaufgaben')}
            className="w-full bg-surface rounded-card p-4 flex items-center gap-3 text-left press-sm hover:bg-surface-hover transition-colors"
          >
            <span className="flex-1 min-w-0">
              <span className="flex items-center gap-2">
                <span className="text-[16px] font-semibold text-text-primary">Hausaufgaben</span>
                {offeneHausaufgaben > 0 && (
                  <span className="text-[13px] font-semibold px-2.5 py-0.5 rounded-pill bg-fill-red text-fill-red-on">
                    {offeneHausaufgaben} offen
                  </span>
                )}
              </span>
              <span className="block text-[13px] text-text-secondary mt-0.5 truncate">
                {naechsteHausaufgabe ?? 'Alles erledigt'}
              </span>
            </span>
            <svg width="8" height="14" viewBox="0 0 8 14" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" className="text-text-muted shrink-0" aria-hidden>
              <path d="M1 1l6 6-6 6" />
            </svg>
          </button>

          {/* Der Tag als eine Zeile. Im Hochformat steht er unter den Aufgaben,
              im Querformat füllt er die rechte Spalte, die sonst leer bliebe. */}
          {heuteSlots.length > 0 && (
            <div className="bg-surface rounded-card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-text-secondary">
                Stundenplan heute
              </p>
              <p className="text-[16px] font-semibold text-text-primary mt-1.5 leading-snug">
                {heuteSlots
                  .map((sl) => sl.isFreistunde ? 'frei' : resolveSubjectInfo(sl.subjectId, profile?.customFaecher).name)
                  .join(' · ')}
              </p>
              <p className="text-[13px] text-text-secondary mt-0.5">
                Schulschluss {heuteSlots[heuteSlots.length - 1].endTime}
              </p>
            </div>
          )}
            </div>

          </div>
        </div>
      )}

      {/* ── Add folder modal ────────────────────────────────────── */}
      <BottomSheet isOpen={!!addFolderFor} onClose={() => setAddFolderFor(null)}>
        <div className="px-5 pb-2">
          <h2 className="text-[20px] font-bold text-text-primary mb-2">Neuen Ordner erstellen</h2>
          {addFolderFor && (
            <div className="flex items-center gap-1.5 flex-wrap mb-4">
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-accent text-on-accent">
                {subjects.find((s) => s.id === addFolderFor)?.name
                  ?? profile?.customFaecher?.find((cf) => cf.id === addFolderFor)?.name
                  ?? addFolderFor}
              </span>
            </div>
          )}
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
            className={`w-full h-12 rounded-pill text-[15px] font-semibold transition-all press ${
              newFolderName.trim() ? 'bg-accent text-on-accent hover:opacity-90' : 'bg-surface-hover text-text-muted cursor-not-allowed'
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
              className="w-full h-12 rounded-pill border border-border text-text-secondary text-[14px] font-medium press hover:bg-surface-hover"
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
                  className="w-full h-12 rounded-pill bg-accent text-on-accent text-[15px] font-semibold press hover:opacity-90 mb-2.5"
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
              className="w-full h-12 rounded-pill border border-border text-text-secondary text-[14px] font-medium press hover:bg-surface-hover"
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
                <QuickNotesIcon size="sm" />
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
                  className="flex items-center gap-1 text-text-primary text-[14px] font-medium press-sm shrink-0 -ml-1"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Zurück
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
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-primary shrink-0">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M14 2v6h6" strokeLinecap="round" />
                  </svg>
                  <span className="text-text-primary font-medium text-[14px]">Direkt in {manualSubject.name}</span>
                </button>

                {/* Folders by half year */}
                {grouped.map(({ hy, folders }: { hy: HalfYear; folders: typeof subjectFolders }) => (
                  <div key={hy.id}>
                    <div className="flex items-center gap-2 px-2 py-1.5">
                      <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">{hy.name}</span>
                      {hy.isCurrent && <span className="text-[11px] px-1.5 py-0.5 rounded-pill bg-accent text-on-accent font-semibold">Aktuell</span>}
                    </div>
                    {folders.map((folder) => (
                      <button
                        key={folder.id}
                        onClick={() => void startProcessing(manualSubject.id, manualSubject.name, folder.id)}
                        className="w-full flex items-center gap-3 bg-background border border-border rounded-card px-4 py-3.5 text-left press hover:bg-surface-hover transition-colors mb-1.5"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-text-primary shrink-0">
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
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-text-primary shrink-0">
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
                <p className="text-text-primary font-bold text-[18px]">{importSucceeded}</p>
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
                  <p className="text-text-primary font-bold text-[18px]">{importFailed}</p>
                  <p className="text-text-muted text-[11px]">Fehler</p>
                </div>
              )}
            </div>
            <p className="text-text-muted text-[11px] text-center mb-4">App offen lassen · KI verarbeitet Datei für Datei</p>
            <button onClick={closeImport} className="w-full h-12 rounded-pill border border-border text-text-secondary text-[14px] font-medium press hover:bg-surface-hover">
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
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={importSucceeded > 0 ? 'text-text-primary' : 'text-text-muted'}>
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
            <button onClick={finishImport} className="w-full h-12 rounded-pill bg-accent text-on-accent text-[15px] font-semibold press hover:opacity-90">
              {importSucceeded > 0 ? 'Zum Fach' : 'Schließen'}
            </button>
          </div>
        )}

      </BottomSheet>

      {/* ── Folder actions (long-press) ─────────────────────────── */}
      <BottomSheet isOpen={!!folderActionsFor} onClose={() => setFolderActionsFor(null)}>
        <div className="px-5 pb-2">
          <h2 className="text-[20px] font-bold text-text-primary mb-4 truncate">{folderActionsFor?.name}</h2>
          <div className="space-y-2">
            <button
              onClick={() => folderActionsFor && openRename(folderActionsFor)}
              className="w-full flex items-center gap-3 bg-surface border border-border rounded-card px-4 py-3.5 text-left press hover:bg-surface-hover transition-colors"
            >
              <div className="w-9 h-9 rounded-btn bg-accent/10 flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-primary">
                  <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </div>
              <span className="text-text-primary font-medium text-[15px]">Umbenennen</span>
            </button>
            <button
              onClick={() => folderActionsFor && openDeleteConfirm(folderActionsFor)}
              className="w-full flex items-center gap-3 bg-surface border border-border rounded-card px-4 py-3.5 text-left press hover:bg-surface-hover transition-colors"
            >
              <div className="w-9 h-9 rounded-btn flex items-center justify-center shrink-0" style={{ background: 'rgba(var(--color-danger),0.1)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'rgb(var(--color-danger))' }}>
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
              </div>
              <span className="font-medium text-[15px]" style={{ color: 'rgb(var(--color-danger))' }}>Löschen</span>
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* ── Rename folder ────────────────────────────────────────── */}
      <BottomSheet isOpen={!!renameTarget} onClose={() => setRenameTarget(null)}>
        <div className="px-5 pb-2">
          <h2 className="text-[20px] font-bold text-text-primary mb-4">Ordner umbenennen</h2>
          <input
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && confirmRename()}
            autoFocus
            className="w-full bg-background border border-border rounded-card px-4 py-3 text-text-primary placeholder-text-muted mb-4 focus:outline-none focus:border-accent transition-colors"
          />
          <button
            onClick={confirmRename}
            disabled={!renameValue.trim()}
            className={`w-full h-12 rounded-pill text-[15px] font-semibold transition-all press ${
              renameValue.trim() ? 'bg-accent text-on-accent hover:opacity-90' : 'bg-surface-hover text-text-muted cursor-not-allowed'
            }`}
          >
            Speichern
          </button>
        </div>
      </BottomSheet>

      {/* ── Delete folder confirm ───────────────────────────────── */}
      <BottomSheet isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <div className="px-5 pb-2">
          <h2 className="text-[20px] font-bold text-text-primary mb-2">Ordner löschen</h2>
          <p className="text-text-secondary text-[14px] mb-6">
            {deleteTargetNoteCount > 0
              ? `${deleteTargetNoteCount} ${deleteTargetNoteCount === 1 ? 'Notiz wird' : 'Notizen werden'} dauerhaft gelöscht — auch der Inhalt aller Unterordner.`
              : 'Der Ordner wird dauerhaft gelöscht.'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setDeleteTarget(null)}
              className="flex-1 py-3.5 rounded-card text-[15px] font-semibold bg-surface-hover text-text-secondary hover:bg-border transition-colors press"
            >
              Abbrechen
            </button>
            <button
              onClick={confirmDeleteFolder}
              className="flex-1 py-3.5 rounded-card text-[15px] font-semibold bg-fill-red text-fill-red-on hover:opacity-90 transition-colors press"
            >
              Löschen
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  )
}

function FolderGridItem({
  name, noteCount, onClick, onLongPress,
}: {
  name: string; noteCount: number; onClick: () => void; onLongPress?: () => void
}) {
  // Long-press (550ms hold, matching DrawingCanvas's paste-menu convention)
  // opens the rename/delete action sheet; moving more than 8px cancels it —
  // same as a scroll/drag gesture, not a hold.
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pressStart = useRef<{ x: number; y: number } | null>(null)
  const firedLongPress = useRef(false)

  const clearPressTimer = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!onLongPress) return
    firedLongPress.current = false
    pressStart.current = { x: e.clientX, y: e.clientY }
    pressTimer.current = setTimeout(() => {
      firedLongPress.current = true
      onLongPress()
    }, 550)
  }
  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!pressStart.current) return
    if (Math.hypot(e.clientX - pressStart.current.x, e.clientY - pressStart.current.y) > 8) {
      clearPressTimer()
    }
  }

  return (
    <button
      onClick={() => {
        if (firedLongPress.current) { firedLongPress.current = false; return }
        onClick()
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={clearPressTimer}
      onPointerLeave={clearPressTimer}
      onPointerCancel={clearPressTimer}
      onContextMenu={(e) => { if (onLongPress) e.preventDefault() }}
      className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-2xl active:bg-surface-hover press-sm transition-colors"
    >
      <svg width="62" height="52" viewBox="0 0 62 52" fill="none">
        {/* folder tab — darker blue as shadow/back */}
        <path d="M0 17 L0 9.5 Q0 6.5 3 6.5 L21 6.5 Q23.5 6.5 25 9.5 L28 16 Z" fill="#2F6EC4"/>
        {/* folder body — GoodNotes-style bright blue */}
        <rect x="0" y="15" width="62" height="37" rx="7" fill="#5B9FEB"/>
        {/* glossy top highlight */}
        <rect x="0" y="15" width="62" height="7" rx="7" fill="white" fillOpacity="0.28"/>
      </svg>
      <p className="text-[11px] font-semibold text-text-primary text-center line-clamp-2 leading-tight w-full">
        {name}
      </p>
      <p className="text-[11px] text-text-muted">
        {noteCount === 0 ? 'Leer' : `${noteCount} ${noteCount === 1 ? 'Notiz' : 'Notizen'}`}
      </p>
    </button>
  )
}

function AddFolderGridItem({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-2xl active:bg-surface-hover press-sm transition-colors"
    >
      <div className="relative" style={{ width: 62, height: 52 }}>
        <svg width="62" height="52" viewBox="0 0 62 52" fill="none" className="absolute inset-0 text-text-primary">
          {/* ghost tab */}
          <path d="M0 17 L0 9.5 Q0 6.5 3 6.5 L21 6.5 Q23.5 6.5 25 9.5 L28 16 Z"
            fill="currentColor" fillOpacity="0.1"/>
          {/* ghost body */}
          <rect x="0" y="15" width="62" height="37" rx="7" fill="currentColor" fillOpacity="0.07"/>
          {/* dashed border on body */}
          <rect x="1" y="16" width="60" height="35" rx="6.5"
            stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.5" strokeDasharray="4 3"/>
        </svg>
        {/* + icon centered in body area */}
        <div className="absolute inset-0 flex items-center justify-center" style={{ paddingTop: 12 }}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.4" className="text-text-primary">
            <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
          </svg>
        </div>
      </div>
      <p className="text-[11px] font-semibold text-text-primary text-center">Neuer Ordner</p>
      <p className="text-[11px] text-transparent select-none">·</p>
    </button>
  )
}
