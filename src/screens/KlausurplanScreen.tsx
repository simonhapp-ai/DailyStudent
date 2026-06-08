import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { SUBJECT_INFO, getTopicPlaceholder } from '../data/subjectInfo'
import { topics } from '../data/mockData'

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function CloseIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
    </svg>
  )
}

function ChevronLeft({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function KlausurplanScreen() {
  const { profile, addKlausurtermin, removeKlausurtermin } = useUser()
  const navigate = useNavigate()

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

  return (
    <div className="flex flex-col min-h-screen bg-background pb-28">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 border-b border-border/40 shrink-0"
        style={{ paddingTop: 'max(58px, calc(env(safe-area-inset-top, 0px) + 18px))', paddingBottom: 14 }}
      >
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-surface-hover flex items-center justify-center text-text-muted press-sm shrink-0"
        >
          <ChevronLeft />
        </button>
        <div className="flex-1">
          <h1 className="text-[20px] font-bold text-text-primary">Klausurplan</h1>
          {upcoming.length > 0 && (
            <p className="text-[12px] text-text-muted">
              {upcoming.length} anstehende Klausur{upcoming.length !== 1 ? 'en' : ''}
            </p>
          )}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">

        {/* ── Add section ──────────────────────────────────────── */}
        {!addOpen ? (
          <button
            onClick={() => setAddOpen(true)}
            className="w-full flex items-center gap-3 bg-surface border border-border/60 rounded-[20px] px-5 py-4 text-left hover:bg-surface-hover active:scale-[0.99] transition-all duration-200"
          >
            <div
              className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg,#FF3B30,#CC2E28)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-text-primary font-semibold text-[15px]">Klausur eintragen</p>
              <p className="text-text-muted text-[12px] mt-0.5">Fach, Datum &amp; Thema hinzufügen</p>
            </div>
            <svg className="text-text-muted shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : (
          <div className="bg-surface border border-border/60 rounded-[20px] overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <p className="text-[16px] font-bold text-text-primary">Neue Klausur</p>
              <button
                onClick={() => { setAddOpen(false); setSubjectId(''); setDate(''); setTopic('') }}
                className="w-8 h-8 rounded-full bg-surface-hover flex items-center justify-center text-text-muted press-sm"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="px-5 pb-5 space-y-4">
              {/* Subject grid */}
              <div>
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">Fach</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {faecher.map((id) => {
                    const subj = SUBJECT_INFO[id]
                    if (!subj) return null
                    const active = subjectId === id
                    return (
                      <button
                        key={id}
                        onClick={() => setSubjectId(id)}
                        className="flex items-center gap-2 p-2.5 rounded-[10px] border text-left transition-all press-sm"
                        style={active
                          ? { background: `${subj.color}18`, borderColor: subj.color }
                          : { borderColor: 'rgba(var(--color-border),0.6)' }}
                      >
                        <span className="text-base shrink-0">{subj.icon}</span>
                        <span
                          className="text-[11px] font-semibold truncate leading-tight"
                          style={{ color: active ? subj.color : 'rgb(var(--color-text-secondary))' }}
                        >
                          {subj.name}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Date */}
              <div>
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Datum</p>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  min={todayStr}
                  className="w-full bg-background border border-border rounded-[12px] px-3 py-2.5 text-[13px] text-text-primary focus:outline-none focus:border-accent transition-colors"
                />
              </div>

              {/* Topic */}
              <div>
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
                  Thema <span className="text-text-muted/50 normal-case font-normal">(optional)</span>
                </p>
                {subjectTopics.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {subjectTopics.slice(0, 5).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTopic(topic === t ? '' : t)}
                        className="px-2.5 py-1 rounded-pill text-[11px] font-medium press-sm transition-all"
                        style={topic === t
                          ? { background: 'linear-gradient(135deg,#FF3B30,#CC2E28)', color: 'white' }
                          : { background: 'rgba(var(--color-border),0.4)', color: 'rgb(var(--color-text-secondary))' }}
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
                  className="w-full bg-background border border-border rounded-[12px] px-3 py-2.5 text-[13px] text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleAdd}
                disabled={!subjectId || !date}
                className="w-full py-3 rounded-[14px] text-white text-[15px] font-bold press-sm disabled:opacity-40 transition-all"
                style={{
                  background: 'linear-gradient(135deg,#FF3B30,#CC2E28)',
                  boxShadow: subjectId && date ? '0 4px 16px #FF3B3040' : 'none',
                }}
              >
                Klausur eintragen
              </button>
            </div>
          </div>
        )}

        {/* ── Upcoming exams ───────────────────────────────────── */}
        {upcoming.length > 0 && (
          <section>
            <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-3">Anstehend</p>
            <div className="space-y-2">
              {upcoming.map((k) => {
                const subj = SUBJECT_INFO[k.subjectId]
                const days = daysLeft(k.date)
                const badgeStyle = days === 0
                  ? { bg: 'rgba(255,59,48,0.15)', color: '#FF3B30' }
                  : days <= 7
                  ? { bg: 'rgba(255,59,48,0.12)', color: '#FF3B30' }
                  : days <= 14
                  ? { bg: 'rgba(255,149,0,0.12)', color: '#FF9500' }
                  : { bg: 'rgba(148,163,184,0.1)', color: '#94A3B8' }
                return (
                  <div
                    key={`${k.subjectId}-${k.date}`}
                    className="bg-surface border border-border/60 rounded-[16px] px-4 py-3.5 flex items-center gap-3"
                  >
                    <div
                      className="w-10 h-10 rounded-[12px] flex items-center justify-center text-xl shrink-0"
                      style={{ background: `${subj?.color ?? '#FF3B30'}18` }}
                    >
                      {subj?.icon ?? '📝'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="text-text-primary font-semibold text-[14px]">{subj?.name ?? k.subjectId}</p>
                        <span
                          className="px-2 py-0.5 rounded-pill text-[10px] font-bold shrink-0"
                          style={{ background: badgeStyle.bg, color: badgeStyle.color }}
                        >
                          {days === 0 ? 'Heute!' : days === 1 ? 'Morgen' : `in ${days} Tagen`}
                        </span>
                      </div>
                      <p className="text-text-muted text-[12px]">
                        {new Date(k.date + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'long' })}
                      </p>
                      {k.topic && <p className="text-text-muted text-[11px] mt-0.5 truncate">{k.topic}</p>}
                    </div>
                    <button
                      onClick={() => removeKlausurtermin(k.subjectId, k.date)}
                      className="w-7 h-7 flex items-center justify-center rounded-full text-text-muted hover:text-danger hover:bg-danger/10 transition-colors shrink-0 press-sm"
                    >
                      <CloseIcon size={12} />
                    </button>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Empty state ──────────────────────────────────────── */}
        {upcoming.length === 0 && !addOpen && (
          <div className="text-center py-12">
            <div
              className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl"
              style={{ background: 'rgba(255,59,48,0.08)' }}
            >
              📝
            </div>
            <p className="text-text-muted text-[14px]">Noch keine Klausuren eingetragen</p>
            <p className="text-text-muted text-[12px] mt-1">Trag deine erste Klausur oben ein</p>
          </div>
        )}

        {/* ── Past exams ───────────────────────────────────────── */}
        {past.length > 0 && (
          <section>
            <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-3">Vergangen</p>
            <div className="space-y-2">
              {past.map((k) => {
                const subj = SUBJECT_INFO[k.subjectId]
                return (
                  <div
                    key={`past-${k.subjectId}-${k.date}`}
                    className="bg-surface border border-border/40 rounded-[16px] px-4 py-3 flex items-center gap-3 opacity-55"
                  >
                    <div
                      className="w-9 h-9 rounded-[10px] flex items-center justify-center text-lg shrink-0"
                      style={{ background: `${subj?.color ?? '#94A3B8'}15` }}
                    >
                      {subj?.icon ?? '📝'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-text-secondary font-medium text-[13px]">{subj?.name ?? k.subjectId}</p>
                      <p className="text-text-muted text-[11px]">
                        {new Date(k.date + 'T00:00:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                      {k.topic && <p className="text-text-muted text-[11px] mt-0.5 truncate">{k.topic}</p>}
                    </div>
                    <button
                      onClick={() => removeKlausurtermin(k.subjectId, k.date)}
                      className="w-6 h-6 flex items-center justify-center text-text-muted/50 hover:text-danger hover:bg-danger/10 rounded-full transition-colors shrink-0"
                    >
                      <CloseIcon size={11} />
                    </button>
                  </div>
                )
              })}
            </div>
          </section>
        )}

      </div>
    </div>
  )
}
