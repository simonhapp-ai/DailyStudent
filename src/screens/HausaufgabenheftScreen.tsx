import { useState } from 'react'
import { SubjectIcon } from '../components/ui/SubjectIcon'
import { Icon } from '../components/ui/Icon'
import { useUser } from '../context/UserContext'
import { resolveSubjectInfo } from '../data/subjectInfo'
import { PlanenBar } from '../components/ui/PlanenBar'
import { ListGroup } from '../components/ui/ListGroup'
import { EmptyState } from '../components/ui/EmptyState'
import { Tag, type TagTone } from '../components/ui/Tag'
import { ZurueckZeile } from '../components/ui/ZurueckZeile'

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

interface PendingItem {
  id: string
  subjectId?: string
  description: string
  dueDate?: string
  noteTitle?: string
  noteId?: string
  isStandalone: boolean
}

/** Wie dringend die Abgabe ist — Stufe aus dem bestehenden Tonvorrat. */
function fristTon(days: number): TagTone {
  if (days <= 0) return 'red'
  if (days <= 2) return 'orange'
  return 'neutral'
}

export function HausaufgabenheftScreen() {
  const { profile, userNotes, completedHomeworkIds, standaloneHomework, completeHomework, addStandaloneHomework } = useUser()

  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [addSubjectId, setAddSubjectId] = useState('')
  const [addDescription, setAddDescription] = useState('')
  const [addDueDate, setAddDueDate] = useState('')

  const profileSubjects = (profile?.faecher ?? [])
    .map((sid) => ({ id: sid, ...resolveSubjectInfo(sid, profile?.customFaecher) }))

  // Collect all pending items
  const pending: PendingItem[] = []
  for (const note of userNotes) {
    for (let idx = 0; idx < (note.homeworkItems ?? []).length; idx++) {
      const item = note.homeworkItems![idx]
      const id = item.id ?? `${note.id}-hw-${idx}`
      if (!completedHomeworkIds.includes(id)) {
        pending.push({
          id,
          subjectId: item.subjectId ?? note.subjectId,
          description: item.description,
          dueDate: item.dueDate,
          noteTitle: note.title,
          noteId: note.id,
          isStandalone: false,
        })
      }
    }
  }
  for (const s of standaloneHomework) {
    if (!completedHomeworkIds.includes(s.id)) {
      pending.push({ id: s.id, subjectId: s.subjectId, description: s.description, dueDate: s.dueDate, isStandalone: true })
    }
  }

  const handleComplete = (id: string) => {
    if (confirmingId === id) {
      completeHomework(id)
      setConfirmingId(null)
    } else {
      setConfirmingId(id)
    }
  }

  const handleAdd = () => {
    if (!addDescription.trim() || !addSubjectId) return
    addStandaloneHomework({ subjectId: addSubjectId, description: addDescription.trim(), dueDate: addDueDate || undefined })
    setAddDescription('')
    setAddDueDate('')
    setAddSubjectId('')
    setShowAddForm(false)
  }

  const nextLessonDate = addSubjectId ? getNextLessonDate(addSubjectId, profile?.stundenplan) : null

  const formatDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short' })

  const today = toDateStr(new Date())
  const daysUntil = (d: string) => Math.round((new Date(d + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) / 86400000)

  // Was zuerst fällig ist, steht oben. Aufgaben ohne Datum ans Ende — sie
  // drängen nicht, sollen aber nicht verschwinden.
  const sortiert = [...pending].sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0
    if (!a.dueDate) return 1
    if (!b.dueDate) return -1
    return a.dueDate.localeCompare(b.dueDate)
  })

  // Auf dem Schreibtisch steht das Formular dauerhaft rechts, auf dem Telefon
  // nur nach Tippen — dort kostet es sonst die halbe Liste.
  const formular = (
    <div className="bg-surface rounded-card border border-border/60 shadow-card-adaptive p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[16px] font-semibold text-text-primary">Neue Hausaufgabe</p>
        <button
          onClick={() => setShowAddForm(false)}
          className="w-8 h-8 rounded-full bg-[rgb(120,120,128)]/[0.12] dark:bg-[rgb(120,120,128)]/[0.24] flex items-center justify-center text-text-secondary press-sm lg:hidden"
          aria-label="Abbrechen"
        >
          <Icon name="close" size={14} />
        </button>
      </div>

      <div>
        <p className="section-label mb-2">Fach</p>
        <div className="flex flex-wrap gap-1.5">
          {profileSubjects.map((s) => {
            const active = addSubjectId === s.id
            return (
              <button
                key={s.id}
                onClick={() => setAddSubjectId(s.id === addSubjectId ? '' : s.id)}
                className="flex items-center gap-1.5 px-3 h-9 rounded-pill text-[12px] font-medium border press-sm transition-colors"
                style={active
                  ? { background: `${s.color}1F`, borderColor: s.color, color: 'rgb(var(--color-text-primary))' }
                  : { borderColor: 'rgb(var(--color-border) / 0.6)', color: 'rgb(var(--color-text-secondary))' }}
              >
                <SubjectIcon subjectId={s.id} size="sm" className="!w-4 !h-4" />
                {s.name}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <p className="section-label mb-1.5">Aufgabe</p>
        <textarea
          value={addDescription}
          onChange={(e) => {
            e.target.style.height = 'auto'
            e.target.style.height = `${e.target.scrollHeight}px`
            setAddDescription(e.target.value)
          }}
          placeholder="Was ist zu tun? z.B. Seite 23, Nr. 4–7…"
          className="w-full bg-background border border-border rounded-btn px-3 py-2.5 text-[14px] text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors resize-none leading-relaxed"
          style={{ minHeight: '76px', overflow: 'hidden' }}
        />
      </div>

      <div>
        <p className="section-label mb-1.5">Abgabe</p>
        <div className="flex gap-2">
          <input
            type="date"
            value={addDueDate}
            onChange={(e) => setAddDueDate(e.target.value)}
            min={toDateStr(new Date())}
            className="flex-1 h-11 bg-background border border-border rounded-btn px-3 text-[14px] text-text-primary focus:outline-none focus:border-accent transition-colors"
          />
          {nextLessonDate && (
            <button
              onClick={() => setAddDueDate(nextLessonDate)}
              className="flex items-center gap-1.5 px-3 h-11 rounded-btn text-[12px] font-medium border press-sm whitespace-nowrap transition-colors"
              style={addDueDate === nextLessonDate
                ? { background: 'var(--grad-mode)', borderColor: 'transparent', color: '#FFFFFF' }
                : { borderColor: 'rgb(var(--color-border) / 0.6)', color: 'rgb(var(--color-text-secondary))' }}
            >
              <Icon name="calendar" size={13} />
              Nächste Stunde
            </button>
          )}
        </div>
        {nextLessonDate && addDueDate === nextLessonDate && (
          <p className="text-[12px] text-text-secondary mt-1.5">→ {formatDate(nextLessonDate)}</p>
        )}
      </div>

      <button
        onClick={handleAdd}
        disabled={!addDescription.trim() || !addSubjectId}
        className="w-full h-12 rounded-pill text-[15px] font-semibold press disabled:opacity-40 transition-opacity"
        style={{ background: 'var(--grad-mode)', color: '#FFFFFF' }}
      >
        Hinzufügen
      </button>
      {!addSubjectId && addDescription.trim().length > 0 && (
        <p className="text-[12px] text-text-secondary text-center">Bitte zuerst ein Fach auswählen</p>
      )}
    </div>
  )

  return (
    <div className="flex flex-col bg-background min-h-dvh pb-28">

      <div className="px-4 lg:px-6" style={{ paddingTop: 'max(58px, calc(env(safe-area-inset-top, 0px) + 18px))' }}>
        <ZurueckZeile label="Klausurenmodus" ziel="/klausurmodus" />
        <h1 className="text-[30px] font-extrabold tracking-[-0.035em] text-text-primary">Planen</h1>
        <p className="text-[13px] text-text-secondary mt-0.5">
          {pending.length > 0
            ? `${pending.length} ${pending.length === 1 ? 'Hausaufgabe offen' : 'Hausaufgaben offen'}`
            : 'Hausaufgaben — erfasst im Unterricht, abgehakt hier.'}
        </p>
        <PlanenBar className="mt-4" />
      </div>

      <div className="px-4 mt-5 lg:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6 lg:items-start lg:max-w-[1120px]">

        <div className="space-y-4 lg:order-1">

          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full h-12 rounded-pill flex items-center justify-center gap-2 text-[15px] font-semibold press lg:hidden"
              style={{ background: 'var(--grad-mode)', color: '#FFFFFF' }}
            >
              <Icon name="plus" size={17} />
              Hausaufgabe hinzufügen
            </button>
          )}

          {showAddForm && <div className="lg:hidden">{formular}</div>}

          {sortiert.length === 0 ? (
            <EmptyState
              title="Nichts offen"
              note="Hausaufgaben, die du im Unterricht in einer Notiz festhältst, landen automatisch hier. Einzelne kannst du auch direkt eintragen."
            />
          ) : (
            <ListGroup>
              {sortiert.map((item) => {
                const subj = item.subjectId ? resolveSubjectInfo(item.subjectId, profile?.customFaecher) : null
                const isConfirming = confirmingId === item.id
                const days = item.dueDate ? daysUntil(item.dueDate) : null

                return (
                  <div key={item.id} className="flex items-start gap-3 px-4 py-3.5 border-b border-border/40 last:border-b-0">

                    {/* Kästchen — der einzige Weg zum Erledigen, deshalb 44 pt groß. */}
                    <button
                      onClick={() => handleComplete(item.id)}
                      className="tap-44 -ml-1.5 -mt-1.5 flex items-center justify-center shrink-0 press-sm"
                      aria-label={isConfirming ? 'Erledigen bestätigen' : 'Als erledigt markieren'}
                    >
                      <span
                        className="w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center transition-colors"
                        style={isConfirming
                          ? { borderColor: 'rgb(var(--fill-green))', color: 'rgb(var(--fill-green))' }
                          : { borderColor: 'rgb(var(--color-border))', color: 'transparent' }}
                      >
                        <Icon name="check" size={13} />
                      </span>
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {subj && <SubjectIcon subjectId={item.subjectId!} size="sm" className="!w-4 !h-4" />}
                        <span className="text-[12px] font-medium text-text-secondary">{subj?.name ?? 'Kein Fach'}</span>
                        {item.dueDate && days !== null && (
                          <Tag tone={fristTon(days)} size="sm">
                            {days === 0 ? 'Heute' : days < 0 ? 'Überfällig' : days === 1 ? 'Morgen' : formatDate(item.dueDate)}
                          </Tag>
                        )}
                      </div>

                      <p className="text-[15px] text-text-primary leading-relaxed mt-1">
                        {item.description?.trim() || item.noteTitle || 'Ohne Beschreibung'}
                      </p>

                      {item.noteTitle && item.description?.trim() && (
                        <p className="text-[12px] text-text-muted mt-0.5 truncate">aus: {item.noteTitle}</p>
                      )}

                      {isConfirming && (
                        <div className="flex items-center gap-2 mt-2.5">
                          <span className="text-[13px] text-text-secondary flex-1">Wirklich fertig?</span>
                          <button
                            onClick={() => setConfirmingId(null)}
                            className="px-3 h-9 rounded-pill text-[13px] font-medium text-text-primary bg-[rgb(120,120,128)]/[0.12] dark:bg-[rgb(120,120,128)]/[0.24] press-sm"
                          >
                            Zurück
                          </button>
                          <button
                            onClick={() => handleComplete(item.id)}
                            className="px-3 h-9 rounded-pill text-[13px] font-semibold text-[rgb(var(--fill-green))] bg-[rgb(120,120,128)]/[0.12] dark:bg-[rgb(120,120,128)]/[0.24] press-sm"
                          >
                            Ja, erledigt
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </ListGroup>
          )}
        </div>

        <div className="hidden lg:block lg:order-2 lg:sticky lg:top-6">
          {formular}
        </div>
      </div>
    </div>
  )
}
