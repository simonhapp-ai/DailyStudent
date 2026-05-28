import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import type { UserFolder } from '../types'
import { subjects, halfYears } from '../data/mockData'
import type { Subject } from '../types'
import { SubjectIcon } from '../components/ui/SubjectIcon'

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

          {/* ── Neue Notiz ───────────────────────────────────────── */}
          <button
            onClick={() => navigate('/unterricht/neue-notiz')}
            className="w-full flex items-center gap-4 bg-surface rounded-card shadow-card-adaptive border border-border/60 px-4 py-4 hover-lift"
          >
            <div
              className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(145deg, #F8CE45, #C9891A)' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.8">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
            </div>
            <div className="text-left flex-1">
              <p className="text-text-primary font-semibold text-[15px]">Neue Notiz</p>
              <p className="text-text-muted text-[12px] mt-0.5">Schnell erfassen, später zuordnen</p>
            </div>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted shrink-0">
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

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
      {addFolderFor && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setAddFolderFor(null)} />
          <div
            className="relative max-w-lg mx-auto w-full bg-surface rounded-t-sheet px-5 pt-5 z-10 animate-sheet-up"
            style={{ paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom, 0px))' }}
          >
            <div className="w-10 h-1 bg-border/60 rounded-full mx-auto mb-5" />
            <h2 className="text-[20px] font-bold text-text-primary mb-4">Neuen Ordner erstellen</h2>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirmAddFolder()}
              placeholder="z.B. Klausurthemen, Hausaufgaben…"
              autoFocus
              className="w-full bg-background border border-border rounded-card px-4 py-3 text-text-primary text-[15px] placeholder-text-muted mb-4 focus:outline-none focus:border-accent transition-colors"
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
        </div>
      )}
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
