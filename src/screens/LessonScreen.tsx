import { useNavigate, useParams } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { Header } from '../components/ui/Header'
import { useUser } from '../context/UserContext'
import { SubjectIcon } from '../components/ui/SubjectIcon'
import { resolveSubjectInfo } from '../data/subjectInfo'
import { subjects } from '../data/mockData'

export function LessonScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { userNotes, profile } = useUser()

  const standardSubject = subjects.find((s) => s.id === id)
  const subjectDisplay = id
    ? (standardSubject
        ? { name: standardSubject.name, color: standardSubject.color }
        : { name: resolveSubjectInfo(id, profile?.customFaecher).name, color: '#7C3AED' })
    : null

  const subjectUserNotes = userNotes.filter((n) => n.subjectId === id)

  if (!subjectDisplay) return <div className="p-4 text-text-secondary">Fach nicht gefunden.</div>

  const totalCount = subjectUserNotes.length
  const customColorIdx = profile?.customFaecher?.findIndex((cf) => cf.id === id) ?? -1

  return (
    <div className="flex flex-col min-h-screen bg-background pb-28">
      <Header
        title={subjectDisplay.name}
        subtitle={`${totalCount} ${totalCount === 1 ? 'Notiz' : 'Notizen'}`}
        showBack
        right={
          <SubjectIcon
            subjectId={id ?? ''}
            size="md"
            customColorIndex={customColorIdx >= 0 ? customColorIdx : undefined}
          />
        }
      />

      <div className="px-5 space-y-2.5 mt-2">
        {subjectUserNotes.map((note) => (
          <button
            key={note.id}
            onClick={() => navigate(`/unterricht/${id}/${note.id}`)}
            className="w-full bg-surface rounded-card shadow-card-adaptive border border-border/60 p-4 text-left press transition-all duration-150 flex items-start gap-4"
          >
            <div className="flex flex-col items-center gap-1.5 shrink-0 text-center min-w-[42px] pt-0.5">
              <span className="text-[11px] text-text-muted font-medium">
                {new Date(note.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}
              </span>
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: subjectDisplay.color }} />
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
                <p className="text-text-muted text-[13px] mt-1 truncate leading-snug">{note.content}</p>
              ) : (
                <p className="text-text-muted text-[13px] mt-1">Eigene Notiz</p>
              )}
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted shrink-0 mt-1">
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ))}

        {totalCount === 0 && (
          <div className="text-center py-16 text-text-muted">
            <p className="text-[40px] mb-4">📄</p>
            <p className="text-[16px] font-semibold text-text-secondary mb-1">Noch keine Notizen</p>
            <p className="text-[13px]">Tippe auf „+" um die erste zu erstellen.</p>
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate(`/unterricht/${id}/neue-notiz`)}
        className="fixed bottom-28 right-5 grad-accent text-white rounded-pill px-5 py-3.5 font-semibold text-[15px] shadow-float press transition-all flex items-center gap-2"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
        Neue Notiz
      </button>
    </div>
  )
}
