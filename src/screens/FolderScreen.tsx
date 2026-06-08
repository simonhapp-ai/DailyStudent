import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Header } from '../components/ui/Header'
import { Badge } from '../components/ui/Badge'
import { useUser } from '../context/UserContext'
import { BottomSheet } from '../components/ui/BottomSheet'
import { subjects } from '../data/mockData'
import { getTopicPlaceholder } from '../data/subjectInfo'
import { SubjectIcon } from '../components/ui/SubjectIcon'
import type { UserFolder } from '../types'

const NO_SUBJECT_FOLDER_ID = 'folder-no-subject'

function buildFolderPath(currentFolder: UserFolder, allFolders: UserFolder[], subjectName: string): string {
  const parts: string[] = [currentFolder.name]
  let f = currentFolder
  while (f.parentFolderId) {
    const parent = allFolders.find((x) => x.id === f.parentFolderId)
    if (!parent) break
    parts.unshift(parent.name)
    f = parent
  }
  parts.unshift(subjectName)
  return parts.join(' › ')
}

export function FolderScreen() {
  const { id, folderId } = useParams<{ id: string; folderId: string }>()
  const navigate = useNavigate()
  const { userFolders, userNotes, addFolder, deleteFolder } = useUser()

  const [fabOpen, setFabOpen] = useState(false)
  const [showNewFolderModal, setShowNewFolderModal] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const folder = userFolders.find((f) => f.id === folderId)
  const isNoSubject = folder?.subjectId === 'ohne-fach'
  const subject = isNoSubject ? null : subjects.find((s) => s.id === id)
  const subFolders = isNoSubject ? [] : userFolders.filter((f) => f.parentFolderId === folderId)
  const folderNotes = userNotes.filter((n) => n.folderId === folderId)

  if (!folder || (!isNoSubject && !subject)) {
    return <div className="p-4 text-text-secondary">Ordner nicht gefunden.</div>
  }

  const folderName = isNoSubject ? 'Schnellnotizen' : folder.name
  const isDeletable = isNoSubject && folderId === NO_SUBJECT_FOLDER_ID

  const openNewFolder = () => {
    setNewFolderName('')
    setShowNewFolderModal(true)
  }

  const createFolder = () => {
    if (!newFolderName.trim() || !folderId) return
    const newFolder: UserFolder = {
      id: `folder-user-${crypto.randomUUID()}`,
      subjectId: subject?.id ?? 'ohne-fach',
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

  return (
    <div className="flex flex-col min-h-screen bg-background pb-32">
      <Header
        title={folderName}
        subtitle={isNoSubject ? 'Schnelle Notizen ohne Fach' : subject!.name}
        showBack
        right={
          isDeletable ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-9 h-9 rounded-btn flex items-center justify-center hover:bg-surface-hover transition-colors press-sm"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted">
                <circle cx="12" cy="5" r="1" fill="currentColor" />
                <circle cx="12" cy="12" r="1" fill="currentColor" />
                <circle cx="12" cy="19" r="1" fill="currentColor" />
              </svg>
            </button>
          ) : (
            <SubjectIcon subjectId={id ?? ''} size="md" />
          )
        }
      />

      <div className="px-5 mt-2 space-y-2.5">
        {/* Subfolders */}
        {subFolders.length > 0 && (
          <div className="space-y-2">
            <p className="section-label pt-1">Unterordner</p>
            {subFolders.map((sub) => {
              const subNoteCount = userNotes.filter((n) => n.folderId === sub.id).length
              return (
                <button
                  key={sub.id}
                  onClick={() => navigate(subFolderUrl(sub.id))}
                  className="w-full bg-surface rounded-card shadow-card-adaptive border border-border/60 px-4 py-3.5 text-left press transition-all duration-150 flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded-[11px] flex items-center justify-center shrink-0 icon-accent">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-accent">
                      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-text-primary truncate">{sub.name}</p>
                    <p className="text-text-muted text-[12px] mt-0.5">
                      {subNoteCount === 0 ? 'Noch keine Notizen' : `${subNoteCount} ${subNoteCount === 1 ? 'Notiz' : 'Notizen'}`}
                    </p>
                  </div>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted shrink-0">
                    <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )
            })}
          </div>
        )}

        {subFolders.length > 0 && folderNotes.length > 0 && (
          <p className="section-label pt-1">Notizen</p>
        )}

        {/* Notes */}
        {folderNotes.map((note) => (
          <button
            key={note.id}
            onClick={() => navigate(noteDetailUrl(note.id))}
            className="w-full bg-surface rounded-card shadow-card-adaptive border border-border/60 p-4 text-left press transition-all duration-150 flex items-start gap-4"
          >
            <div className="flex flex-col items-center gap-1.5 shrink-0 text-center min-w-[42px] pt-0.5">
              <span className="text-[11px] text-text-muted font-medium">
                {new Date(note.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}
              </span>
              <div className="w-2 h-2 rounded-full bg-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-text-primary font-semibold text-[15px]">{note.title}</p>
                {(note.attachments?.length ?? 0) > 0 && (
                  <Badge color="muted">{note.attachments!.length === 1 ? 'Foto' : `${note.attachments!.length} Fotos`}</Badge>
                )}
                {note.content && <Badge color="accent">Notiz</Badge>}
                {(note.homeworkItems?.length ?? 0) > 0 && (
                  <Badge color="warning">{note.homeworkItems!.length === 1 ? 'Hausaufgabe' : `${note.homeworkItems!.length} Hausaufgaben`}</Badge>
                )}
              </div>
              {note.content ? (
                <p className="text-text-muted text-[13px] mt-1 truncate">{note.content}</p>
              ) : (
                <p className="text-text-muted text-[13px] mt-1">Eigene Notiz</p>
              )}
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted shrink-0 mt-1">
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ))}

        {isEmpty && (
          <div className="text-center py-16">
            <p className="text-[40px] mb-4">📂</p>
            <p className="text-[16px] font-semibold text-text-secondary mb-1">Noch leer</p>
            <p className="text-[13px] text-text-muted">Tippe auf „+" um zu beginnen.</p>
          </div>
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
          className={`flex items-center gap-2.5 grad-accent rounded-full pl-4 pr-5 py-3
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
          className={`w-14 h-14 rounded-full grad-accent shadow-float
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
          <h2 className="text-[20px] font-bold text-text-primary mb-1">Neuer Unterordner</h2>
          <p className="text-text-muted text-[13px] mb-4">{buildFolderPath(folder, userFolders, isNoSubject ? 'Schnellnotizen' : (subject?.name ?? ''))}</p>
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createFolder()}
            placeholder={getTopicPlaceholder(subject?.id)}
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
            {folderNotes.length > 0
              ? `${folderNotes.length} ${folderNotes.length === 1 ? 'Notiz wird' : 'Notizen werden'} dauerhaft gelöscht.`
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
