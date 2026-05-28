import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Header } from '../components/ui/Header'
import { Badge } from '../components/ui/Badge'
import { useUser } from '../context/UserContext'
import { subjects } from '../data/mockData'
import { SubjectIcon } from '../components/ui/SubjectIcon'
import type { UserFolder } from '../types'

const NO_SUBJECT_FOLDER_ID = 'folder-no-subject'

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
    setFabOpen(false)
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
                  <div className="w-9 h-9 rounded-[11px] flex items-center justify-center shrink-0 bg-accent/10">
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

      {/* Speed-dial backdrop */}
      {!isNoSubject && fabOpen && (
        <div className="fixed inset-0 z-30 bg-black/25" onClick={() => setFabOpen(false)} />
      )}

      {/* Speed-dial options */}
      {!isNoSubject && (
        <div
          className={`fixed bottom-40 right-5 flex flex-col items-end gap-2.5 z-40 transition-all duration-200 ${
            fabOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-3 pointer-events-none'
          }`}
        >
          <button
            onClick={openNewFolder}
            className="flex items-center gap-2.5 bg-surface rounded-pill pl-4 pr-5 py-2.5 shadow-float border border-border/60 text-[14px] font-medium text-text-primary hover:bg-surface-hover press transition-all"
          >
            <div className="w-7 h-7 rounded-btn flex items-center justify-center shrink-0 bg-accent/10">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent">
                <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 11v6M9 14h6" strokeLinecap="round" />
              </svg>
            </div>
            Neuer Ordner
          </button>
          <button
            onClick={() => { setFabOpen(false); navigate(newNoteUrl) }}
            className="flex items-center gap-2.5 bg-surface rounded-pill pl-4 pr-5 py-2.5 shadow-float border border-border/60 text-[14px] font-medium text-text-primary hover:bg-surface-hover press transition-all"
          >
            <div className="w-7 h-7 rounded-btn bg-accent/10 flex items-center justify-center shrink-0">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-accent">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M14 2v6h6M12 11v6M9 14h6" strokeLinecap="round" />
              </svg>
            </div>
            Neue Notiz
          </button>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => isNoSubject ? navigate(newNoteUrl) : setFabOpen((o) => !o)}
        className={`fixed bottom-28 right-5 w-14 h-14 rounded-full flex items-center justify-center shadow-float z-40 press transition-all duration-200 ${
          !isNoSubject && fabOpen ? 'bg-surface border-2 border-border rotate-45' : 'bg-accent'
        }`}
      >
        <svg
          width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke={!isNoSubject && fabOpen ? 'currentColor' : 'white'}
          strokeWidth="2.5"
          className={!isNoSubject && fabOpen ? 'text-text-secondary' : ''}
        >
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
      </button>

      {/* New folder modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowNewFolderModal(false)} />
          <div
            className="relative max-w-lg mx-auto w-full bg-surface rounded-t-sheet px-5 pt-5 z-10 animate-sheet-up"
            style={{ paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom, 0px))' }}
          >
            <div className="w-10 h-1 bg-border/60 rounded-full mx-auto mb-5" />
            <h2 className="text-[20px] font-bold text-text-primary mb-1">Neuer Unterordner</h2>
            <p className="text-text-muted text-[13px] mb-4">in: {folderName}</p>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createFolder()}
              placeholder="z.B. Integralrechnung, Vektoren…"
              autoFocus
              className="w-full bg-background border border-border rounded-card px-4 py-3 text-text-primary text-[15px] placeholder-text-muted mb-4 focus:outline-none focus:border-accent transition-colors"
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
        </div>
      )}

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeleteConfirm(false)} />
          <div
            className="relative max-w-lg mx-auto w-full bg-surface rounded-t-sheet px-5 pt-5 z-10 animate-sheet-up"
            style={{ paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom, 0px))' }}
          >
            <div className="w-10 h-1 bg-border/60 rounded-full mx-auto mb-5" />
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
        </div>
      )}
    </div>
  )
}
