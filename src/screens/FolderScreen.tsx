import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Header } from '../components/ui/Header'
import { Icon } from '../components/ui/Icon'
import { Tag } from '../components/ui/Tag'
import { ListGroup, ListRow } from '../components/ui/ListGroup'
import { EmptyState } from '../components/ui/EmptyState'
import { useUser } from '../context/UserContext'
import { BottomSheet } from '../components/ui/BottomSheet'
import { subjects } from '../data/mockData'
import { getTopicPlaceholder, resolveSubjectInfo } from '../data/subjectInfo'
import { SubjectIcon } from '../components/ui/SubjectIcon'
import type { UserFolder } from '../types'
import { countNotesInFolderTree } from '../lib/folders'

function buildFolderPathParts(currentFolder: UserFolder, allFolders: UserFolder[], subjectName: string): string[] {
  const parts: string[] = [currentFolder.name]
  let f = currentFolder
  while (f.parentFolderId) {
    const parent = allFolders.find((x) => x.id === f.parentFolderId)
    if (!parent) break
    parts.unshift(parent.name)
    f = parent
  }
  parts.unshift(subjectName)
  return parts
}

function FolderBreadcrumb({ parts, className = 'mb-4' }: { parts: string[]; className?: string }) {
  return (
    <div className={`flex items-center gap-1.5 flex-wrap ${className}`}>
      {parts.map((part, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
            i === parts.length - 1
              ? 'bg-accent/10 text-accent'
              : 'bg-surface-hover border border-border/60 text-text-muted'
          }`}>
            {part}
          </span>
          {i < parts.length - 1 && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-text-muted/40 shrink-0">
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      ))}
    </div>
  )
}

export function FolderScreen() {
  const { id, folderId } = useParams<{ id: string; folderId: string }>()
  const navigate = useNavigate()
  const { userFolders, userNotes, addFolder, deleteFolder, profile } = useUser()

  const [fabOpen, setFabOpen] = useState(false)
  const [showNewFolderModal, setShowNewFolderModal] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const folder = userFolders.find((f) => f.id === folderId)
  const isNoSubject = folder?.subjectId === 'ohne-fach'

  // Resolve subject name for both standard and custom subjects
  const subjectName: string = isNoSubject
    ? ''
    : (subjects.find((s) => s.id === id)?.name
        ?? (id ? resolveSubjectInfo(id, profile?.customFaecher).name : ''))

  const subFolders = isNoSubject ? [] : userFolders.filter((f) => f.parentFolderId === folderId)
  const folderNotes = userNotes.filter((n) => n.folderId === folderId)

  if (!folder) {
    return <div className="p-4 text-text-secondary">Ordner nicht gefunden.</div>
  }

  const folderName = isNoSubject ? 'Schnellnotizen' : folder.name
  const customColorIdx = profile?.customFaecher?.findIndex((cf) => cf.id === id) ?? -1
  const totalNoteCount = folderId ? countNotesInFolderTree(folderId, userFolders, userNotes) : 0

  const openNewFolder = () => {
    setNewFolderName('')
    setShowNewFolderModal(true)
  }

  const createFolder = () => {
    if (!newFolderName.trim() || !folderId) return
    const newFolder: UserFolder = {
      id: `folder-user-${crypto.randomUUID()}`,
      subjectId: id ?? 'ohne-fach',
      halfYearId: folder?.halfYearId,
      parentFolderId: folderId,
      name: newFolderName.trim(),
      createdAt: new Date().toISOString(),
    }
    addFolder(newFolder)
    setShowNewFolderModal(false)
    setNewFolderName('')
    navigate(`/unterricht/${id}/ordner/${newFolder.id}`)
  }

  const confirmDelete = () => {
    if (!folderId) return
    deleteFolder(folderId)
    navigate('/unterricht', { replace: true })
  }

  const newNoteUrl = isNoSubject
    ? `/unterricht/ohne-fach/ordner/${folderId}/neue-notiz`
    : `/unterricht/${id}/ordner/${folderId}/neue-notiz`

  const noteDetailUrl = (noteId: string) =>
    isNoSubject ? `/unterricht/ohne-fach/${noteId}` : `/unterricht/${id}/${noteId}`

  const subFolderUrl = (subId: string) =>
    isNoSubject ? `/unterricht/ohne-fach/ordner/${subId}` : `/unterricht/${id}/ordner/${subId}`

  const isEmpty = subFolders.length === 0 && folderNotes.length === 0
  const pathParts = isNoSubject && !folder.parentFolderId
    ? []
    : buildFolderPathParts(folder, userFolders, isNoSubject ? 'Schnellnotizen' : subjectName)

  return (
    <div className="flex flex-col min-h-dvh bg-background pb-32">
      <Header
        title={folderName}
        subtitle={isNoSubject ? 'Schnelle Notizen ohne Fach' : subjectName}
        showBack
        right={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-9 h-9 rounded-btn flex items-center justify-center hover:bg-surface-hover transition-colors press-sm"
              aria-label="Ordner löschen"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </button>
            {!isNoSubject && (
              <SubjectIcon
                subjectId={id ?? ''}
                size="md"
                customColorIndex={customColorIdx >= 0 ? customColorIdx : undefined}
              />
            )}
          </div>
        }
      />

      {/* Path breadcrumb */}
      {pathParts.length > 0 && (
        <div className="px-5 pt-3 pb-0">
          <FolderBreadcrumb parts={pathParts} className="" />
        </div>
      )}

      <div className="px-5 mt-2 space-y-2.5">
        {/* Subfolders */}
        {subFolders.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-text-secondary px-1 pt-1">Unterordner</p>
            <ListGroup>
              {subFolders.map((sub) => {
                const subNoteCount = userNotes.filter((n) => n.folderId === sub.id).length
                return (
                  <ListRow
                    key={sub.id}
                    leading={
                      <span className="w-11 h-11 rounded-icon bg-[rgb(120,120,128)]/[0.12] dark:bg-[rgb(120,120,128)]/[0.24] flex items-center justify-center shrink-0 text-text-secondary">
                        <Icon name="folder" size={19} />
                      </span>
                    }
                    title={sub.name}
                    subtitle={subNoteCount === 0 ? 'Noch keine Notizen' : `${subNoteCount} ${subNoteCount === 1 ? 'Notiz' : 'Notizen'}`}
                    chevron
                    onClick={() => navigate(subFolderUrl(sub.id))}
                  />
                )
              })}
            </ListGroup>
          </div>
        )}

        {subFolders.length > 0 && folderNotes.length > 0 && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-text-secondary px-1 pt-1">Notizen</p>
        )}

        {/* Notes */}
        {folderNotes.length > 0 && (
          <ListGroup>
            {folderNotes.map((note) => (
              <ListRow
                key={note.id}
                leading={
                  <span className="w-11 h-11 rounded-icon bg-[rgb(120,120,128)]/[0.12] dark:bg-[rgb(120,120,128)]/[0.24] flex flex-col items-center justify-center shrink-0 leading-none">
                    <span className="text-[15px] font-bold text-text-primary tabular-nums">
                      {new Date(note.createdAt).getDate()}
                    </span>
                    <span className="text-[10px] font-semibold uppercase text-text-secondary mt-0.5">
                      {new Date(note.createdAt).toLocaleDateString('de-DE', { month: 'short' })}
                    </span>
                  </span>
                }
                title={
                  <span className="flex items-center gap-2 flex-wrap">
                    <span className="truncate">{note.title}</span>
                    {(note.homeworkItems?.length ?? 0) > 0 && (
                      <Tag tone="orange" size="sm">
                        {note.homeworkItems!.length === 1 ? 'Hausaufgabe' : `${note.homeworkItems!.length} Hausaufgaben`}
                      </Tag>
                    )}
                  </span>
                }
                subtitle={
                  note.content
                    ? note.content
                    : (note.attachments?.length ?? 0) > 0
                      ? `${note.attachments!.length} ${note.attachments!.length === 1 ? 'Foto' : 'Fotos'}`
                      : 'Eigene Notiz'
                }
                value={
                  (note.attachments?.length ?? 0) > 0 ? (
                    <span className="text-text-secondary flex items-center gap-1">
                      <Icon name="image" size={15} />
                      {note.attachments!.length}
                    </span>
                  ) : undefined
                }
                chevron
                onClick={() => navigate(noteDetailUrl(note.id))}
              />
            ))}
          </ListGroup>
        )}

        {isEmpty && (
          <EmptyState
            title="Noch leer"
            note="Leg hier deine erste Notiz an oder teile den Ordner weiter in Unterordner auf."
          />
        )}
      </div>

      {/* Tap-to-dismiss backdrop */}
      {fabOpen && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setFabOpen(false)}
        />
      )}

      {/* FAB + pills — stacked column, anchored bottom-right */}
      <div className="fixed bottom-28 right-5 flex flex-col items-end gap-3 z-40">

        {/* Neuer Ordner pill — appears second (80 ms delay) */}
        {!isNoSubject && (
          <button
            onClick={() => { setFabOpen(false); openNewFolder() }}
            style={{ transitionDelay: fabOpen ? '80ms' : '0ms' }}
            className={`flex items-center gap-2.5 bg-surface rounded-full pl-4 pr-5 py-3
              shadow-float border border-border/60 whitespace-nowrap press
              transition-all duration-300 ease-out
              ${fabOpen
                ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
                : 'opacity-0 translate-y-4 scale-90 pointer-events-none'
              }`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent shrink-0">
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 11v6M9 14h6" strokeLinecap="round" />
            </svg>
            <span className="text-text-primary font-semibold text-[14px]">Neuer Ordner</span>
          </button>
        )}

        {/* Neue Notiz pill — appears first (40 ms delay) */}
        <button
          onClick={() => { setFabOpen(false); navigate(newNoteUrl) }}
          style={{ transitionDelay: fabOpen ? '40ms' : '0ms' }}
          className={`flex items-center gap-2.5 bg-accent text-white dark:text-[#160E28] rounded-full pl-4 pr-5 py-3
            shadow-float whitespace-nowrap press
            transition-all duration-300 ease-out
            ${fabOpen
              ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
              : 'opacity-0 translate-y-4 scale-90 pointer-events-none'
            }`}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="shrink-0">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          <span className="text-white font-semibold text-[14px]">Neue Notiz</span>
        </button>

        {/* The + bubble — shrinks to nothing when open */}
        <button
          onClick={() => isNoSubject ? navigate(newNoteUrl) : setFabOpen((o) => !o)}
          className={`w-14 h-14 rounded-full bg-accent text-white dark:text-[#160E28]
            flex items-center justify-center press
            transition-all duration-200 ease-in-out
            ${fabOpen ? 'opacity-0 scale-50 pointer-events-none' : 'opacity-100 scale-100'}`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
        </button>

      </div>

      {/* New folder modal */}
      <BottomSheet isOpen={showNewFolderModal} onClose={() => setShowNewFolderModal(false)}>
        <div className="px-5 pb-2">
          <h2 className="text-[20px] font-bold text-text-primary mb-2">Neuer Unterordner</h2>
          <FolderBreadcrumb parts={buildFolderPathParts(folder, userFolders, isNoSubject ? 'Schnellnotizen' : subjectName)} />
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createFolder()}
            placeholder={getTopicPlaceholder(id)}
            className="w-full bg-background border border-border rounded-card px-4 py-3 text-text-primary placeholder-text-muted mb-4 focus:outline-none focus:border-accent transition-colors"
          />
          <button
            onClick={createFolder}
            disabled={!newFolderName.trim()}
            className={`w-full py-3.5 rounded-card text-[15px] font-semibold transition-all press ${
              newFolderName.trim() ? 'bg-accent text-white hover:opacity-90' : 'bg-surface-hover text-text-muted cursor-not-allowed'
            }`}
          >
            Ordner erstellen
          </button>
        </div>
      </BottomSheet>

      {/* Delete confirmation */}
      <BottomSheet isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)}>
        <div className="px-5 pb-2">
          <h2 className="text-[20px] font-bold text-text-primary mb-2">Ordner löschen</h2>
          <p className="text-text-secondary text-[14px] mb-6">
            {totalNoteCount > 0
              ? `${totalNoteCount} ${totalNoteCount === 1 ? 'Notiz wird' : 'Notizen werden'} dauerhaft gelöscht — auch der Inhalt aller Unterordner.`
              : 'Der Ordner wird dauerhaft gelöscht.'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 py-3.5 rounded-card text-[15px] font-semibold bg-surface-hover text-text-secondary hover:bg-border transition-colors press"
            >
              Abbrechen
            </button>
            <button
              onClick={confirmDelete}
              className="flex-1 py-3.5 rounded-card text-[15px] font-semibold bg-danger/10 text-danger border border-danger/20 hover:bg-danger/15 transition-colors press"
            >
              Löschen
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  )
}
