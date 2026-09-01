import { useState } from 'react'
import { useUser } from '../context/UserContext'
import { resolveSubjectInfo, getTopicPlaceholder } from '../data/subjectInfo'
import { SubjectIcon } from '../components/ui/SubjectIcon'
import { topics } from '../data/mockData'
import { PlanenBar } from '../components/ui/PlanenBar'
import { ListGroup, ListRow } from '../components/ui/ListGroup'
import { EmptyState } from '../components/ui/EmptyState'
import { Tag, type TagTone } from '../components/ui/Tag'
import { Icon } from '../components/ui/Icon'

// ── Klausurtermine (Planen, Rubrik 4) ─────────────────────────────────────
//
// Familie 1: ein Bestand mit einer Erfassung. Auf dem Telefon liegt das
// Formular über der Liste und wird aufgeklappt; auf dem Schreibtisch steht es
// dauerhaft als rechte Spalte daneben — dort ist Platz, und ein Klick weniger
// ist ein Termin mehr, der wirklich eingetragen wird.
//
// Keine Bühne (Regel 1): Ein Termin ist ein Eintrag, keine Handlung, die jetzt
// gleich passieren muss. Die Dringlichkeit steht als Marke an der Zeile.

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Wie nah der Termin ist — als Stufe des bestehenden Tonvorrats, nicht als eigener Hexwert. */
function fristTon(days: number): TagTone {
  if (days <= 7) return 'red'
  if (days <= 14) return 'orange'
  return 'neutral'
}

function fristText(days: number): string {
  if (days === 0) return 'Heute'
  if (days === 1) return 'Morgen'
  return `in ${days} Tagen`
}

export function KlausurplanScreen() {
  const { profile, addKlausurtermin, removeKlausurtermin } = useUser()

  const [addOpen, setAddOpen] = useState(false)
  const [subjectId, setSubjectId] = useState('')
  const [date, setDate] = useState('')
  const [topic, setTopic] = useState('')

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const todayStr = toDateStr(today)

  const upcoming = (profile?.klausurtermine ?? [])
    .filter((k) => k.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))

  const past = (profile?.klausurtermine ?? [])
    .filter((k) => k.date < todayStr)
    .sort((a, b) => b.date.localeCompare(a.date))

  const daysLeft = (dateStr: string) =>
    Math.round((new Date(dateStr + 'T00:00:00').getTime() - today.getTime()) / 86400000)

  const handleAdd = () => {
    if (!subjectId || !date) return
    addKlausurtermin({ subjectId, date, topic: topic.trim() || undefined })
    setSubjectId(''); setDate(''); setTopic('')
    setAddOpen(false)
  }

  const faecher = profile?.faecher ?? []
  const subjectTopics = subjectId ? topics.filter((t) => t.subjectId === subjectId).map((t) => t.name) : []

  // Das Formular ist auf dem Schreibtisch immer sichtbar, auf dem Telefon nur
  // nach Tippen — dort kostet es sonst die halbe Liste.
  const formular = (
    <div className="bg-surface rounded-card border border-border/60 shadow-card-adaptive p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[16px] font-semibold text-text-primary">Neue Klausur</p>
        <button
          onClick={() => { setAddOpen(false); setSubjectId(''); setDate(''); setTopic('') }}
          className="w-8 h-8 rounded-full bg-[rgb(120,120,128)]/[0.12] dark:bg-[rgb(120,120,128)]/[0.24] flex items-center justify-center text-text-secondary press-sm lg:hidden"
          aria-label="Abbrechen"
        >
          <Icon name="close" size={14} />
        </button>
      </div>

      <div>
        <p className="section-label mb-2">Fach</p>
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-1.5">
          {faecher.map((id) => {
            const subj = resolveSubjectInfo(id, profile?.customFaecher)
            const active = subjectId === id
            return (
              <button
                key={id}
                onClick={() => setSubjectId(id)}
                className="flex items-center gap-2 px-2.5 h-11 rounded-btn border text-left press-sm transition-colors"
                style={active
                  ? { background: `${subj.color}1F`, borderColor: subj.color }
                  : { borderColor: 'rgb(var(--color-border) / 0.6)' }}
              >
                <SubjectIcon subjectId={id} size="sm" className="!w-5 !h-5" />
                <span className={`text-[12px] font-medium truncate leading-tight ${active ? 'text-text-primary' : 'text-text-secondary'}`}>
                  {subj.name}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <p className="section-label mb-1.5">Datum</p>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          min={todayStr}
          className="w-full h-11 bg-background border border-border rounded-btn px-3 text-[14px] text-text-primary focus:outline-none focus:border-accent transition-colors"
        />
      </div>

      <div>
        <p className="section-label mb-1.5">Thema — optional</p>
        {subjectTopics.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {subjectTopics.slice(0, 5).map((t) => (
              <button
                key={t}
                onClick={() => setTopic(topic === t ? '' : t)}
                className="px-2.5 py-1.5 rounded-pill text-[12px] font-medium press-sm transition-colors"
                style={topic === t
                  ? { background: 'var(--grad-mode)', color: '#FFFFFF' }
                  : { background: 'rgb(120 120 128 / 0.12)', color: 'rgb(var(--color-text-secondary))' }}
              >
                {t.length > 25 ? t.slice(0, 25) + '…' : t}
              </button>
            ))}
          </div>
        )}
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder={getTopicPlaceholder(subjectId)}
          className="w-full h-11 bg-background border border-border rounded-btn px-3 text-[14px] text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
        />
      </div>

      <button
        onClick={handleAdd}
        disabled={!subjectId || !date}
        className="w-full h-12 rounded-pill text-[15px] font-semibold press disabled:opacity-40 transition-opacity"
        style={{ background: 'var(--grad-mode)', color: '#FFFFFF' }}
      >
        Klausur eintragen
      </button>
    </div>
  )

  return (
    <div className="flex flex-col min-h-dvh bg-background pb-28">

      <div className="px-4 lg:px-6" style={{ paddingTop: 'max(58px, calc(env(safe-area-inset-top, 0px) + 18px))' }}>
        <h1 className="text-[30px] font-extrabold tracking-[-0.035em] text-text-primary">Planen</h1>
        <p className="text-[13px] text-text-secondary mt-0.5">
          {upcoming.length > 0
            ? `${upcoming.length} ${upcoming.length === 1 ? 'Klausur steht an' : 'Klausuren stehen an'}`
            : 'Deine Klausurtermine — sie speisen Countdown und Lernplan.'}
        </p>
        <PlanenBar className="mt-4" />
      </div>

      <div className="px-4 mt-5 lg:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6 lg:items-start lg:max-w-[1120px]">

        {/* ── Bestand ─────────────────────────────────────────── */}
        <div className="space-y-4 lg:order-1">

          {/* Auf dem Telefon führt ein Knopf ins Formular. Auf dem Schreibtisch
              steht es rechts und dieser Knopf wäre eine Dopplung. */}
          {!addOpen && (
            <button
              onClick={() => setAddOpen(true)}
              className="w-full h-12 rounded-pill flex items-center justify-center gap-2 text-[15px] font-semibold press lg:hidden"
              style={{ background: 'var(--grad-mode)', color: '#FFFFFF' }}
            >
              <Icon name="plus" size={17} />
              Klausur eintragen
            </button>
          )}

          {addOpen && <div className="lg:hidden">{formular}</div>}

          {upcoming.length === 0 ? (
            <EmptyState
              title="Noch keine Klausur eingetragen"
              note="Trag den nächsten Termin ein — daraus entstehen der Countdown auf der Übersicht und die Tage, auf die der Lernplan den Stoff verteilt."
            />
          ) : (
            <div>
              <p className="section-label px-1 mb-2">Anstehend</p>
              <ListGroup>
                {upcoming.map((k) => {
                  const subj = resolveSubjectInfo(k.subjectId, profile?.customFaecher)
                  const days = daysLeft(k.date)
                  return (
                    <ListRow
                      key={`${k.subjectId}-${k.date}`}
                      leading={<SubjectIcon subjectId={k.subjectId} size="sm" className="!w-9 !h-9" />}
                      title={
                        <span className="flex items-center gap-2">
                          <span className="truncate">{subj?.name ?? k.subjectId}</span>
                          <Tag tone={fristTon(days)} size="sm">{fristText(days)}</Tag>
                        </span>
                      }
                      subtitle={
                        <span>
                          {new Date(k.date + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'long' })}
                          {k.topic ? ` · ${k.topic}` : ''}
                        </span>
                      }
                      value={
                        <button
                          onClick={() => removeKlausurtermin(k.subjectId, k.date)}
                          className="w-9 h-9 -mr-1.5 flex items-center justify-center rounded-full text-text-muted hover:text-text-primary transition-colors press-sm"
                          aria-label="Termin löschen"
                        >
                          <Icon name="trash" size={16} />
                        </button>
                      }
                    />
                  )
                })}
              </ListGroup>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <p className="section-label px-1 mb-2">Vergangen</p>
              <ListGroup>
                {past.map((k) => {
                  const subj = resolveSubjectInfo(k.subjectId, profile?.customFaecher)
                  return (
                    <ListRow
                      key={`past-${k.subjectId}-${k.date}`}
                      className="opacity-60"
                      leading={<SubjectIcon subjectId={k.subjectId} size="sm" className="!w-9 !h-9" />}
                      title={subj?.name ?? k.subjectId}
                      subtitle={
                        <span>
                          {new Date(k.date + 'T00:00:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}
                          {k.topic ? ` · ${k.topic}` : ''}
                        </span>
                      }
                      value={
                        <button
                          onClick={() => removeKlausurtermin(k.subjectId, k.date)}
                          className="w-9 h-9 -mr-1.5 flex items-center justify-center rounded-full text-text-muted hover:text-text-primary transition-colors press-sm"
                          aria-label="Termin löschen"
                        >
                          <Icon name="trash" size={16} />
                        </button>
                      }
                    />
                  )
                })}
              </ListGroup>
            </div>
          )}
        </div>

        {/* ── Erfassung, rechte Spalte am Schreibtisch ─────────── */}
        <div className="hidden lg:block lg:order-2 lg:sticky lg:top-6">
          {formular}
        </div>
      </div>
    </div>
  )
}
