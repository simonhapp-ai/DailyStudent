import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { SUBJECT_INFO } from '../data/subjectInfo'
import type { StandaloneHomeworkItem } from '../context/UserContext'

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

export function HausaufgabenheftScreen() {
  const navigate = useNavigate()
  const { profile, userNotes, completedHomeworkIds, standaloneHomework, completeHomework, addStandaloneHomework } = useUser()

  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [addSubjectId, setAddSubjectId] = useState('')
  const [addDescription, setAddDescription] = useState('')
  const [addDueDate, setAddDueDate] = useState('')

  const profileSubjects = (profile?.faecher ?? [])
    .map((sid) => SUBJECT_INFO[sid] ? { id: sid, ...SUBJECT_INFO[sid] } : null)
    .filter((s): s is NonNullable<typeof s> => s !== null)

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

  return (
    <div className="flex flex-col bg-background min-h-screen pb-24">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 border-b border-border/40 shrink-0"
        style={{ paddingTop: 'max(58px, calc(env(safe-area-inset-top, 0px) + 18px))', paddingBottom: 14 }}
      >
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-surface-hover flex items-center justify-center text-text-muted press-sm shrink-0"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-[20px] font-bold text-text-primary">Hausaufgabenheft</h1>
          {pending.length > 0 && (
            <p className="text-[12px] text-text-muted">{pending.length} offen</p>
          )}
        </div>
        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="w-9 h-9 rounded-full flex items-center justify-center press-sm shrink-0"
          style={{ background: 'linear-gradient(135deg, rgb(var(--color-accent)), rgba(var(--color-accent),0.8))' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            {showAddForm
              ? <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              : <><path d="M12 5v14M5 12h14" strokeLinecap="round" /></>}
          </svg>
        </button>
      </div>

      <div className="px-4 pt-4 space-y-3">

        {/* ── Add form (inline, no popup) ─────────────────────── */}
        {showAddForm && (
          <div className="bg-surface border border-accent/30 rounded-2xl overflow-hidden">
            <div className="px-4 pt-4 pb-1">
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">Neue Hausaufgabe</p>
            </div>

            {/* Subject pills */}
            <div className="px-4 pb-3">
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Fach</p>
              <div className="flex flex-wrap gap-1.5">
                {profileSubjects.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setAddSubjectId(s.id === addSubjectId ? '' : s.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs font-semibold border transition-all press-sm"
                    style={addSubjectId === s.id
                      ? { backgroundColor: s.color, borderColor: 'transparent', color: 'white' }
                      : { borderColor: 'rgba(var(--color-border),0.6)', color: 'rgb(var(--color-text-secondary))' }}
                  >
                    {s.icon} {s.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="px-4 pb-3">
              <textarea
                value={addDescription}
                onChange={(e) => {
                  e.target.style.height = 'auto'
                  e.target.style.height = `${e.target.scrollHeight}px`
                  setAddDescription(e.target.value)
                }}
                placeholder="Was ist zu tun? z.B. Seite 23, Nr. 4–7…"
                className="w-full bg-background border border-border rounded-card px-3 py-2.5 text-text-secondary text-sm placeholder-text-muted focus:outline-none focus:border-accent transition-colors resize-none leading-relaxed"
                style={{ minHeight: '72px', overflow: 'hidden' }}
              />
            </div>

            {/* Date + next lesson */}
            <div className="px-4 pb-3">
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Abgabe</p>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={addDueDate}
                  onChange={(e) => setAddDueDate(e.target.value)}
                  min={toDateStr(new Date())}
                  className="flex-1 bg-background border border-border rounded-card px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent transition-colors"
                />
                {nextLessonDate && (
                  <button
                    onClick={() => setAddDueDate(nextLessonDate)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-card text-xs font-semibold border transition-all press-sm whitespace-nowrap"
                    style={addDueDate === nextLessonDate
                      ? { background: 'rgb(var(--color-accent))', borderColor: 'transparent', color: 'white' }
                      : { borderColor: 'rgba(var(--color-accent),0.4)', color: 'rgb(var(--color-accent))' }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
                    </svg>
                    Nächste Stunde
                  </button>
                )}
              </div>
              {nextLessonDate && addDueDate === nextLessonDate && (
                <p className="text-[10px] text-accent mt-1">→ {formatDate(nextLessonDate)}</p>
              )}
            </div>

            {/* Save */}
            <div className="px-4 pb-4">
              <button
                onClick={handleAdd}
                disabled={!addDescription.trim() || !addSubjectId}
                className="w-full py-3 rounded-card text-white text-sm font-bold disabled:opacity-40 transition-all press-sm"
                style={{ background: 'linear-gradient(135deg, rgb(var(--color-accent)), rgba(var(--color-accent),0.8))' }}
              >
                Hinzufügen
              </button>
              {!addSubjectId && addDescription.trim().length > 0 && (
                <p className="text-[11px] text-warning text-center mt-2">Bitte zuerst ein Fach auswählen</p>
              )}
            </div>
          </div>
        )}

        {/* ── Pending homework list ────────────────────────────── */}
        {pending.length === 0 && !showAddForm && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center text-3xl">✅</div>
            <p className="text-text-primary font-bold text-[16px]">Alle Hausaufgaben erledigt!</p>
            <p className="text-text-muted text-[13px]">Tippe + um neue hinzuzufügen</p>
          </div>
        )}

        {pending.map((item) => {
          const subj = item.subjectId ? SUBJECT_INFO[item.subjectId] : null
          const color = subj?.color ?? '#FF9500'
          const isConfirming = confirmingId === item.id
          const days = item.dueDate ? daysUntil(item.dueDate) : null

          return (
            <div
              key={item.id}
              className="bg-surface border border-border/60 rounded-2xl overflow-hidden transition-all"
              style={isConfirming ? { borderColor: 'rgba(74,222,128,0.4)' } : undefined}
            >
              {/* Subject + meta row */}
              <div className="flex items-center gap-2 px-4 pt-3.5 pb-1">
                {subj ? (
                  <div
                    className="w-7 h-7 rounded-[8px] flex items-center justify-center text-sm shrink-0"
                    style={{ backgroundColor: `${color}20` }}
                  >
                    {subj.icon}
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-[8px] bg-surface-hover flex items-center justify-center shrink-0 text-sm">📚</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold truncate" style={{ color: subj ? color : 'rgb(var(--color-text-muted))' }}>
                    {subj?.name ?? 'Kein Fach'}
                  </p>
                </div>
                {item.dueDate && days !== null && (
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-pill shrink-0"
                    style={{
                      background: days <= 0 ? 'rgba(255,59,48,0.12)' : days <= 2 ? 'rgba(255,149,0,0.12)' : 'rgba(var(--color-border),0.3)',
                      color: days <= 0 ? '#FF3B30' : days <= 2 ? '#FF9500' : 'rgb(var(--color-text-muted))',
                    }}
                  >
                    {days === 0 ? 'Heute' : days < 0 ? 'Überfällig' : days === 1 ? 'Morgen' : formatDate(item.dueDate)}
                  </span>
                )}
              </div>

              {/* Description */}
              <div className="px-4 pb-2">
                <p className="text-[14px] text-text-primary leading-relaxed">{item.description}</p>
              </div>

              {/* Note title (if from a note) */}
              {item.noteTitle && (
                <div className="px-4 pb-2">
                  <p className="text-[11px] text-text-muted">aus: {item.noteTitle}</p>
                </div>
              )}

              {/* Action row */}
              <div className="px-4 pb-3.5 pt-1 border-t border-border/30">
                {isConfirming ? (
                  <div className="flex gap-2 items-center">
                    <p className="text-[12px] text-text-secondary flex-1">Wirklich fertig?</p>
                    <button
                      onClick={() => setConfirmingId(null)}
                      className="px-3 py-1.5 rounded-pill text-[11px] font-semibold border border-border text-text-muted hover:bg-surface-hover transition-all press-sm"
                    >
                      Zurück
                    </button>
                    <button
                      onClick={() => handleComplete(item.id)}
                      className="px-3 py-1.5 rounded-pill text-[11px] font-bold text-white press-sm"
                      style={{ background: 'linear-gradient(135deg,#34C759,#28a745)' }}
                    >
                      Ja, erledigt ✓
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleComplete(item.id)}
                    className="flex items-center gap-2 text-[12px] font-semibold text-text-muted hover:text-success transition-colors press-sm"
                  >
                    <div className="w-5 h-5 rounded-full border-2 border-border flex items-center justify-center">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    Als erledigt markieren
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
