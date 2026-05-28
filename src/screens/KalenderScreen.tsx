import { useState } from 'react'
import { Button } from '../components/ui/Button'
import { useUser, type EntryType } from '../context/UserContext'
import { subjects } from '../data/mockData'

const DAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

const TYPE_CONFIG: Record<EntryType, { label: string; icon: string; color: string }> = {
  lerneinheit: { label: 'Lerneinheit', icon: '📚', color: '#7C6FFF' },
  termin:      { label: 'Termin',      icon: '📅', color: '#38BDF8' },
  erinnerung:  { label: 'Erinnerung',  icon: '🔔', color: '#FACC15' },
}

function getWeekDays() {
  const now = new Date()
  const dow = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1))
  monday.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function daysUntil(dateStr: string) {
  const exam = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  exam.setHours(0, 0, 0, 0)
  return Math.ceil((exam.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getGreeting(name: string) {
  const h = new Date().getHours()
  const greet = h < 12 ? 'Guten Morgen' : h < 17 ? 'Guten Tag' : 'Guten Abend'
  return `${greet}, ${name} 👋`
}

export function KalenderScreen() {
  const { profile, personalEntries, addEntry, removeEntry } = useUser()
  const weekDays = getWeekDays()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = toDateStr(today)

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<{ title: string; type: EntryType; date: string; time: string }>({
    title: '',
    type: 'lerneinheit',
    date: todayStr,
    time: '',
  })

  const upcomingExams = (profile?.klausurtermine ?? [])
    .map(({ subjectId, date }) => {
      const subject = subjects.find((s) => s.id === subjectId)
      return { subjectId, date, days: daysUntil(date), subject }
    })
    .filter((e) => e.days >= 0 && e.subject)
    .sort((a, b) => a.days - b.days)

  const todayEntries = personalEntries.filter((e) => e.date === todayStr)
  const futureEntries = personalEntries
    .filter((e) => e.date > todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))

  const openModal = (date = todayStr) => {
    setForm({ title: '', type: 'lerneinheit', date, time: '' })
    setModalOpen(true)
  }

  const handleAdd = () => {
    if (!form.title.trim()) return
    addEntry({ id: Date.now().toString(), ...form, title: form.title.trim() })
    setModalOpen(false)
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="px-4 pt-14 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-text-muted text-sm">
              {today.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <h1 className="text-2xl font-bold text-text-primary mt-0.5">{getGreeting(profile?.name ?? 'Max')}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => openModal()}
              className="w-9 h-9 rounded-btn bg-surface border border-border flex items-center justify-center hover:bg-surface-hover transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-text-secondary">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
            </button>
            <span className="text-sm px-3 py-1.5 rounded-btn bg-warning/10 text-warning font-medium">🔥 12 Tage</span>
          </div>
        </div>
      </div>

      {/* Week strip */}
      <div className="px-4 mt-4 mb-2">
        <div className="flex gap-1">
          {weekDays.map((d, i) => {
            const isToday = d.getTime() === today.getTime()
            const dayStr = toDateStr(d)
            const hasEntries = personalEntries.some((e) => e.date === dayStr)
            return (
              <button
                key={i}
                onClick={() => openModal(dayStr)}
                className={`flex-1 flex flex-col items-center py-2 rounded-btn transition-colors relative ${
                  isToday ? 'bg-accent text-white' : 'text-text-muted hover:bg-surface-hover'
                }`}
              >
                <span className="text-xs font-medium">{DAY_LABELS[i]}</span>
                <span className={`text-sm font-bold mt-0.5 ${isToday ? 'text-white' : 'text-text-secondary'}`}>
                  {d.getDate()}
                </span>
                {hasEntries && (
                  <span
                    className="absolute bottom-1 w-1 h-1 rounded-full"
                    style={{ backgroundColor: isToday ? 'rgba(255,255,255,0.8)' : '#7C6FFF' }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="px-4 space-y-6 mt-2">
        {/* Heute */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Heute</h2>
            <button
              onClick={() => openModal()}
              className="flex items-center gap-1 text-xs text-accent hover:opacity-80 transition-opacity"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
              Hinzufügen
            </button>
          </div>
          <div className="space-y-2">
            {/* Personal entries for today */}
            {todayEntries.map((entry) => {
              const cfg = TYPE_CONFIG[entry.type]
              return (
                <div
                  key={entry.id}
                  className="bg-surface border border-border rounded-card p-4 flex items-center gap-4"
                >
                  <div
                    className="w-10 h-10 rounded-btn flex items-center justify-center text-lg shrink-0"
                    style={{ backgroundColor: `${cfg.color}22` }}
                  >
                    {cfg.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary font-medium text-sm truncate">{entry.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {entry.time && <p className="text-text-muted text-xs">{entry.time} Uhr</p>}
                      <span
                        className="text-xs px-1.5 py-0.5 rounded font-medium"
                        style={{ backgroundColor: `${cfg.color}22`, color: cfg.color }}
                      >
                        {cfg.label}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeEntry(entry.id)}
                    className="w-7 h-7 rounded-btn flex items-center justify-center text-text-muted hover:text-danger hover:bg-danger/10 transition-colors shrink-0"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              )
            })}

            {/* Add entry prompt when nothing custom yet */}
            {todayEntries.length === 0 && (
              <button
                onClick={() => openModal()}
                className="w-full border border-dashed border-border rounded-card p-3 flex items-center justify-center gap-2 text-text-muted hover:border-accent hover:text-accent transition-colors"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                </svg>
                <span className="text-xs font-medium">Persönlichen Eintrag hinzufügen</span>
              </button>
            )}
          </div>
        </section>

        {/* Upcoming personal entries */}
        {futureEntries.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Geplant</h2>
            <div className="space-y-2">
              {futureEntries.map((entry) => {
                const cfg = TYPE_CONFIG[entry.type]
                const d = new Date(entry.date + 'T00:00:00')
                return (
                  <div
                    key={entry.id}
                    className="bg-surface border border-border rounded-card p-4 flex items-center gap-4"
                  >
                    <div
                      className="w-10 h-10 rounded-btn flex items-center justify-center text-lg shrink-0"
                      style={{ backgroundColor: `${cfg.color}22` }}
                    >
                      {cfg.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-text-primary font-medium text-sm truncate">{entry.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-text-muted text-xs">
                          {d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short' })}
                          {entry.time ? `, ${entry.time} Uhr` : ''}
                        </p>
                        <span
                          className="text-xs px-1.5 py-0.5 rounded font-medium"
                          style={{ backgroundColor: `${cfg.color}22`, color: cfg.color }}
                        >
                          {cfg.label}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => removeEntry(entry.id)}
                      className="w-7 h-7 rounded-btn flex items-center justify-center text-text-muted hover:text-danger hover:bg-danger/10 transition-colors shrink-0"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Klausur-Countdown */}
        {upcomingExams.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Nächste Klausuren</h2>
            <div className="space-y-2">
              {upcomingExams.slice(0, 3).map((exam) => (
                <div
                  key={exam.subjectId + exam.date}
                  className="bg-surface border border-border rounded-card p-4 flex items-center gap-4"
                >
                  <div
                    className="w-10 h-10 rounded-btn flex items-center justify-center text-lg shrink-0"
                    style={{ backgroundColor: `${exam.subject!.color}22` }}
                  >
                    {exam.subject!.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-text-primary font-medium text-sm">{exam.subject!.name}</p>
                    <p className="text-text-muted text-xs mt-0.5">
                      {new Date(exam.date).toLocaleDateString('de-DE', { day: '2-digit', month: 'long' })}
                    </p>
                  </div>
                  <div
                    className="px-3 py-1.5 rounded-btn text-xs font-bold shrink-0"
                    style={{ backgroundColor: `${exam.subject!.color}22`, color: exam.subject!.color }}
                  >
                    {exam.days === 0 ? 'Heute' : exam.days === 1 ? 'Morgen' : `${exam.days} Tage`}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* KI-Lernvorschlag — Pro teaser */}
        <section>
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">KI-Lernvorschlag</h2>
          <div className="relative overflow-hidden bg-surface border border-border rounded-card p-4">
            <div className="filter blur-sm pointer-events-none select-none">
              <p className="text-text-primary font-medium text-sm mb-1">Heute: Mathematik — 45 Min</p>
              <p className="text-text-secondary text-sm">Fokus Integralrechnung · 3 Karteikarten · 1 Aufgabe</p>
              <div className="mt-3 flex gap-2">
                <div className="h-7 w-28 bg-accent-soft rounded-btn" />
                <div className="h-7 w-20 bg-surface-hover rounded-btn" />
              </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center bg-background/30">
              <div className="flex items-center gap-2 bg-surface border border-border rounded-card px-4 py-2.5 shadow-lg">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7C6FFF" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" strokeLinecap="round" />
                </svg>
                <span className="text-accent text-xs font-semibold">Pro freischalten</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Add Entry Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => setModalOpen(false)} />
          <div className="relative max-w-lg mx-auto w-full bg-surface border-t border-border rounded-t-2xl px-5 pt-5 z-10" style={{ paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom, 0px))' }}>
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />

            <h2 className="text-lg font-bold text-text-primary mb-4">Eintrag hinzufügen</h2>

            {/* Type chips */}
            <div className="flex gap-2 mb-4">
              {(Object.entries(TYPE_CONFIG) as [EntryType, typeof TYPE_CONFIG['lerneinheit']][]).map(([type, cfg]) => (
                <button
                  key={type}
                  onClick={() => setForm((f) => ({ ...f, type }))}
                  className={`flex-1 py-2 rounded-btn text-xs font-medium flex items-center justify-center gap-1.5 border transition-all duration-150 ${
                    form.type === type
                      ? 'bg-accent border-accent text-white'
                      : 'border-border text-text-secondary hover:bg-surface-hover'
                  }`}
                >
                  {cfg.icon} {cfg.label}
                </button>
              ))}
            </div>

            {/* Title */}
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder={
                form.type === 'lerneinheit' ? 'z.B. Geschichte Karteikarten wiederholen' :
                form.type === 'termin' ? 'z.B. Nachhilfe bei Frau Müller' :
                'z.B. Lernplan aktualisieren'
              }
              className="w-full bg-background border border-border rounded-card px-4 py-3 text-text-primary text-sm placeholder-text-muted mb-3 focus:outline-none focus:border-accent transition-colors"
              autoFocus
            />

            {/* Date + Time */}
            <div className="flex gap-3 mb-5">
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="flex-1 bg-background border border-border rounded-card px-4 py-3 text-text-primary text-sm focus:outline-none focus:border-accent transition-colors"
                style={{ colorScheme: 'dark' }}
              />
              <input
                type="time"
                value={form.time}
                onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                placeholder="Uhrzeit"
                className="w-32 bg-background border border-border rounded-card px-4 py-3 text-text-primary text-sm focus:outline-none focus:border-accent transition-colors"
                style={{ colorScheme: 'dark' }}
              />
            </div>

            <Button variant="primary" fullWidth onClick={handleAdd} disabled={!form.title.trim()}>
              Hinzufügen
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
