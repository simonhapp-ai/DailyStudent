import { useNavigate, useParams } from 'react-router-dom'
import { Header } from '../components/ui/Header'
import { useUser } from '../context/UserContext'
import { SubjectIcon } from '../components/ui/SubjectIcon'
import { Icon } from '../components/ui/Icon'
import { Tag } from '../components/ui/Tag'
import { ListGroup, ListRow } from '../components/ui/ListGroup'
import { EmptyState } from '../components/ui/EmptyState'
import { resolveSubjectInfo } from '../data/subjectInfo'
import { subjects } from '../data/mockData'

// Fach-Detail (Version C).
//
// Kopfform: Kennzahlkopf, keine Bühne — der Screen zeigt einen Bestand, es gibt
// hier keine einzelne zeitkritische Handlung (Regel 1). Der Klausurbezug steht
// als Marke daneben, weil er der Grund ist, warum man ein Fach überhaupt öffnet.
export function LessonScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { userNotes, profile } = useUser()

  const standardSubject = subjects.find((s) => s.id === id)
  const subjectDisplay = id
    ? (standardSubject
        ? { name: standardSubject.name }
        : { name: resolveSubjectInfo(id, profile?.customFaecher).name })
    : null

  const subjectUserNotes = userNotes
    .filter((n) => n.subjectId === id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  if (!subjectDisplay) return <div className="p-4 text-text-secondary">Fach nicht gefunden.</div>

  const totalCount = subjectUserNotes.length
  const customColorIdx = profile?.customFaecher?.findIndex((cf) => cf.id === id) ?? -1

  // Nächste Klausur in diesem Fach — der häufigste Grund, das Fach zu öffnen.
  const heute = new Date().toISOString().slice(0, 10)
  const naechsteKlausur = (profile?.klausurtermine ?? [])
    .filter((k) => k.subjectId === id && k.date >= heute)
    .sort((a, b) => a.date.localeCompare(b.date))[0]
  const tageBisKlausur = naechsteKlausur
    ? Math.ceil((new Date(naechsteKlausur.date + 'T00:00:00').getTime() - new Date(heute + 'T00:00:00').getTime()) / 86400000)
    : null

  return (
    <div className="flex flex-col min-h-dvh bg-background pb-28">
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

      <div className="px-5 mt-2 space-y-3">
        {tageBisKlausur !== null && (
          <div className="flex items-center gap-2">
            <Tag tone={tageBisKlausur <= 3 ? 'red' : tageBisKlausur <= 7 ? 'orange' : 'neutral'}>
              Klausur in {tageBisKlausur} {tageBisKlausur === 1 ? 'Tag' : 'Tagen'}
            </Tag>
            {naechsteKlausur?.topic && (
              <span className="text-[13px] text-text-secondary truncate">{naechsteKlausur.topic}</span>
            )}
          </div>
        )}

        {totalCount > 0 ? (
          <ListGroup>
            {subjectUserNotes.map((note) => (
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
                title={note.title}
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
                onClick={() => navigate(`/unterricht/${id}/${note.id}`)}
              />
            ))}
          </ListGroup>
        ) : (
          <EmptyState
            title="Noch keine Notizen"
            note="Fotografiere dein Tafelbild oder schreib mit — die KI erkennt Thema und Klausurstoff daraus."
            action={
              <button
                onClick={() => navigate(`/unterricht/${id}/neue-notiz`)}
                className="w-full h-12 rounded-pill bg-accent text-white dark:text-[#160E28] text-[16px] font-semibold press"
              >
                Erste Notiz erstellen
              </button>
            }
          />
        )}
      </div>

      {/* Runder Knopf — flach in der Modusfarbe statt Verlauf, ohne farbigen Glow */}
      {totalCount > 0 && (
        <button
          onClick={() => navigate(`/unterricht/${id}/neue-notiz`)}
          aria-label="Neue Notiz"
          className="fixed bottom-28 right-5 w-14 h-14 rounded-full bg-accent text-white dark:text-[#160E28] flex items-center justify-center press"
          style={{ boxShadow: '0 6px 16px rgba(0,0,0,.18)' }}
        >
          <Icon name="plus" size={24} />
        </button>
      )}
    </div>
  )
}
