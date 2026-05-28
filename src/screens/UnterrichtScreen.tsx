import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import type { UserFolder } from '../types'
import { subjects, halfYears } from '../data/mockData'
import type { Subject } from '../types'

export function UnterrichtScreen() {
  const navigate = useNavigate()
  const { profile, userNotes, userFolders, addFolder } = useUser()
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set())
  const [addFolderFor, setAddFolderFor] = useState<string | null>(null)
  const [newFolderName, setNewFolderName] = useState('')

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
    <div className="flex flex-col min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="px-4 pt-14 pb-4">
        <h1 className="text-2xl font-bold text-text-primary">Unterricht</h1>
        <p className="text-text-muted text-sm mt-1">
          {profile?.schulform ?? 'Gymnasium'} · {profile?.bundesland ?? ''}
        </p>
      </div>

      {profileSubjects.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div className="text-4xl mb-4">📚</div>
          <p className="text-text-primary font-semibold mb-1">Keine Fächer ausgewählt</p>
          <p className="text-text-muted text-sm">Gehe zu Profil → Onboarding zurücksetzen um Fächer hinzuzufügen.</p>
        </div>
      ) : (
        <>
          {/* Quick note button */}
          <div className="px-4 mb-3">
            <button
              onClick={() => navigate('/unterricht/neue-notiz')}
              className="w-full flex items-center gap-3 bg-accent/10 border border-accent/25 rounded-card px-4 py-3.5 hover:bg-accent/15 active:scale-95 transition-all duration-150"
            >
              <div className="w-9 h-9 rounded-btn bg-accent flex items-center justify-center shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                </svg>
              </div>
              <div className="text-left">
                <p className="text-accent font-semibold text-sm">Neue Notiz</p>
                <p className="text-text-muted text-xs mt-0.5">Schnell erfassen, später zuordnen</p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent ml-auto shrink-0">
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {/* Ohne Fach section */}
          {(() => {
            const ohneFolder = userFolders.find((f) => f.id === 'folder-no-subject')
            if (!ohneFolder) return null
            const ohneCount = userNotes.filter((n) => n.folderId === 'folder-no-subject').length
            return (
              <div className="px-4 mb-3">
                <button
                  onClick={() => navigate('/unterricht/ohne-fach/ordner/folder-no-subject')}
                  className="w-full flex items-center gap-3 bg-surface border border-border rounded-card px-4 py-3.5 hover:bg-surface-hover active:scale-95 transition-all duration-150"
                >
                  <div className="w-9 h-9 rounded-btn bg-surface-hover flex items-center justify-center shrink-0 text-base">
                    📁
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-text-primary font-semibold text-sm">Schnellnotizen</p>
                    <p className="text-text-muted text-xs mt-0.5">
                      {ohneCount === 0 ? 'Keine Notizen' : `${ohneCount} ${ohneCount === 1 ? 'Notiz' : 'Notizen'}`}
                    </p>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted shrink-0">
                    <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            )
          })()}

          <div className="px-4 space-y-3">
            {profileSubjects.map((subject) => {
              const subjectFolders = userFolders.filter((f) => f.subjectId === subject.id && !f.parentFolderId)
              const totalNotes = userNotes.filter((n) => n.subjectId === subject.id).length
              const isExpanded = expandedSubjects.has(subject.id)

              // Group folders by halfYear
              const foldersByHalfYear = halfYears.map((hy) => ({
                halfYear: hy,
                folders: subjectFolders.filter((f) => f.halfYearId === hy.id),
              })).filter((g) => g.folders.length > 0)

              // Folders with no halfYearId
              const ungroupedFolders = subjectFolders.filter((f) => !f.halfYearId)

              return (
                <div key={subject.id} className="bg-surface border border-border rounded-card overflow-hidden">
                  {/* Subject header */}
                  <button
                    onClick={() => toggleSubject(subject.id)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-surface-hover transition-colors"
                  >
                    <div
                      className="w-9 h-9 rounded-btn flex items-center justify-center text-base shrink-0"
                      style={{ backgroundColor: `${subject.color}22` }}
                    >
                      {subject.icon}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-text-primary font-semibold text-sm">{subject.name}</p>
                      <p className="text-text-muted text-xs mt-0.5">
                        {subjectFolders.length} {subjectFolders.length === 1 ? 'Ordner' : 'Ordner'}
                        {totalNotes > 0 && ` · ${totalNotes} ${totalNotes === 1 ? 'Notiz' : 'Notizen'}`}
                      </p>
                    </div>
                    <svg
                      width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      className={`text-text-muted transition-transform duration-200 shrink-0 ${isExpanded ? '' : '-rotate-90'}`}
                    >
                      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                  {/* Expanded folder list */}
                  {isExpanded && (
                    <div className="border-t border-border">
                      {/* Folders grouped by halfYear */}
                      {foldersByHalfYear.map(({ halfYear, folders }) => (
                        <div key={halfYear.id}>
                          {/* HalfYear separator */}
                          <div className="flex items-center gap-2 px-4 py-2 bg-background/40">
                            <span className="text-xs font-semibold text-text-muted">{halfYear.name}</span>
                            <span className="text-xs text-text-muted opacity-60">{halfYear.period}</span>
                            {halfYear.isCurrent && (
                              <span className="ml-auto text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: `${subject.color}22`, color: subject.color }}>
                                Aktuell
                              </span>
                            )}
                          </div>
                          {folders.map((folder) => (
                            <FolderRow
                              key={folder.id}
                              folder={folder}
                              noteCount={userNotes.filter((n) => n.folderId === folder.id).length}
                              subjectColor={subject.color}
                              onClick={() => navigate(`/unterricht/${subject.id}/ordner/${folder.id}`)}
                            />
                          ))}
                        </div>
                      ))}

                      {/* Ungrouped folders */}
                      {ungroupedFolders.map((folder) => (
                        <FolderRow
                          key={folder.id}
                          folder={folder}
                          noteCount={userNotes.filter((n) => n.folderId === folder.id).length}
                          subjectColor={subject.color}
                          onClick={() => navigate(`/unterricht/${subject.id}/ordner/${folder.id}`)}
                        />
                      ))}

                      {/* Empty state */}
                      {subjectFolders.length === 0 && (
                        <div className="px-5 py-4 border-b border-border">
                          <p className="text-text-muted text-xs">Noch keine Ordner · Tippe auf + um einen zu erstellen</p>
                        </div>
                      )}

                      {/* Add folder button */}
                      <button
                        onClick={() => openAddFolder(subject.id)}
                        className="w-full flex items-center gap-3 pl-5 pr-4 py-2.5 hover:bg-surface-hover transition-colors border-t border-border"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7C6FFF" strokeWidth="1.8">
                          <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M12 11v6M9 14h6" strokeLinecap="round" />
                        </svg>
                        <span className="text-accent text-xs font-medium">Ordner hinzufügen</span>
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Add folder modal */}
      {addFolderFor && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => setAddFolderFor(null)} />
          <div className="relative max-w-lg mx-auto w-full bg-surface border-t border-border rounded-t-2xl px-5 pt-5 pb-safe z-10" style={{ paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom, 0px))' }}>
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />
            <h2 className="text-base font-bold text-text-primary mb-4">Neuen Ordner erstellen</h2>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirmAddFolder()}
              placeholder="z.B. Klausurthemen, Hausaufgaben…"
              autoFocus
              className="w-full bg-background border border-border rounded-card px-4 py-3 text-text-primary text-sm placeholder-text-muted mb-4 focus:outline-none focus:border-accent transition-colors"
            />
            <button
              onClick={confirmAddFolder}
              disabled={!newFolderName.trim()}
              className={`w-full py-3 rounded-card text-sm font-semibold transition-all ${
                newFolderName.trim() ? 'bg-accent text-white hover:opacity-90' : 'bg-surface-hover text-text-muted cursor-not-allowed'
              }`}
            >
              Ordner erstellen
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function FolderRow({
  folder, noteCount, subjectColor, onClick,
}: {
  folder: UserFolder; noteCount: number; subjectColor: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 pl-5 pr-4 py-3 text-left hover:bg-surface-hover transition-colors border-b border-border"
    >
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-px h-5 bg-border" />
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={subjectColor} strokeWidth="1.8" className="shrink-0">
          <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{folder.name}</p>
        <p className="text-text-muted text-xs mt-0.5">
          {noteCount === 0 ? 'Noch keine Notizen' : `${noteCount} ${noteCount === 1 ? 'Notiz' : 'Notizen'}`}
        </p>
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted shrink-0">
        <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}
