import { useParams, useNavigate } from 'react-router-dom'
import { useUser, type PersonalEntry } from '../context/UserContext'
import { SUBJECT_INFO } from '../data/subjectInfo'
import type { LernplanSession, LernDayType, LernMethode } from '../types'

const METHOD_ICONS: Record<LernMethode, string> = {
  karteikarten: '🃏',
  blurting: '✍️',
  lernzettel: '📝',
  probeklausur: '📋',
  lesen: '📖',
  wiederholen: '🔁',
}

const METHOD_LABELS: Record<LernMethode, string> = {
  karteikarten: 'Karteikarten',
  blurting: 'Blurting',
  lernzettel: 'Lernzettel',
  probeklausur: 'Probeklausur',
  lesen: 'Lesen',
  wiederholen: 'Wiederholen',
}

const DAY_TYPE_LABELS: Record<LernDayType, string> = {
  lern: 'Lerntag',
  pause: 'Pausentag',
  klausur: 'Klausurtag',
  puffer: 'Puffertag',
}

const DAY_TYPE_COLORS: Record<LernDayType, string> = {
  lern: 'rgba(var(--color-accent), 0.12)',
  pause: 'rgba(var(--color-border), 0.6)',
  klausur: 'rgba(var(--color-danger), 0.12)',
  puffer: 'rgba(255, 149, 0, 0.12)',
}

const DAY_TYPE_TEXT: Record<LernDayType, string> = {
  lern: 'text-accent',
  pause: 'text-text-muted',
  klausur: 'text-danger',
  puffer: 'text-[#FF9F0A]',
}

const WEEKDAY_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
const MONTH_SHORT = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

function formatDay(dateStr: string): { weekday: string; day: string; month: string } {
  const d = new Date(dateStr)
  return {
    weekday: WEEKDAY_SHORT[d.getDay()],
    day: String(d.getDate()),
    month: MONTH_SHORT[d.getMonth()],
  }
}

function isToday(dateStr: string): boolean {
  return dateStr === new Date().toISOString().slice(0, 10)
}

function isPast(dateStr: string): boolean {
  return dateStr < new Date().toISOString().slice(0, 10)
}

function durationLabel(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

function uid() {
  return `pe-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function LernplanDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { lernplaene, deleteLernplan, addEntries, isPro } = useUser()

  const plan = lernplaene.find((p) => p.id === id)

  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4 px-8">
        <div className="w-16 h-16 rounded-2xl bg-surface flex items-center justify-center text-3xl">📅</div>
        <p className="text-text-primary font-semibold text-lg text-center">Lernplan nicht gefunden</p>
        <button onClick={() => navigate(-1)} className="text-accent text-sm font-medium">Zurück</button>
      </div>
    )
  }

  const totalStudyDays = plan.days.filter((d) => d.dayType === 'lern' || d.dayType === 'puffer').length
  const totalMinutes = plan.days.reduce((sum, d) => sum + d.totalMin, 0)

  const addToCalendar = () => {
    const timeToMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
    const pad = (n: number) => String(n).padStart(2, '0')
    const pref = plan.config.studyTimePreference ?? 'beides'
    const baseMin = pref === 'morgen' ? 420 : pref === 'abend' ? 1020 : 540

    const getDow = (dateStr: string) => {
      const d = new Date(dateStr).getDay()
      return d === 0 ? 6 : d - 1
    }

    const advancePastBlocks = (dateStr: string, cursor: number, dur: number): number => {
      const dow = getDow(dateStr)
      let c = cursor
      let changed = true
      while (changed) {
        changed = false
        for (const bt of plan.config.blockedTimes) {
          const applies = bt.dayOfWeek.length === 0 || bt.dayOfWeek.includes(dow)
          if (!applies) continue
          const bs = timeToMin(bt.startTime)
          const be = timeToMin(bt.endTime)
          if (c < be && c + dur > bs) { c = be; changed = true }
        }
      }
      return c
    }

    const entries: PersonalEntry[] = []
    const skipped: string[] = []

    plan.days.forEach((day) => {
      if (!day.sessions.length) return
      let cursor = baseMin
      day.sessions.forEach((session) => {
        cursor = advancePastBlocks(day.date, cursor, session.durationMin)
        if (cursor + session.durationMin > 23 * 60) {
          skipped.push(`${session.subjectName} (${day.date})`)
          return
        }
        const end = cursor + session.durationMin
        entries.push({
          id: uid(),
          title: `${session.subjectName} – ${session.topic}`,
          type: 'lerneinheit',
          date: day.date,
          time: `${pad(Math.floor(cursor / 60))}:${pad(cursor % 60)}`,
          endTime: `${pad(Math.floor(end / 60))}:${pad(end % 60)}`,
          lernplanId: plan.id,
          color: SUBJECT_INFO[session.subjectId]?.color ?? '#34C759',
        })
        cursor = end + 15
      })
    })

    addEntries(entries)
    let msg = `${entries.length} Lernblöcke wurden zum Kalender hinzugefügt.`
    if (skipped.length) msg += `\n\n${skipped.length} Session(s) konnten nicht eingeplant werden (nach 23:00): ${skipped.join(', ')}`
    alert(msg)
  }

  const handlePrint = () => {
    const prevTitle = document.title
    const planTypeLabel = plan.planType === 'einzel' ? 'Einzel Lernplan'
      : plan.planType === 'abitur' ? 'Abitur Lernplan'
      : 'Vollständiger Plan'
    let suffix: string
    if (plan.planType === 'einzel' && plan.examSchedule.length === 1) {
      const exam = plan.examSchedule[0]
      const info = SUBJECT_INFO[exam.subjectId]
      const abbrev = info?.name?.slice(0, 3) ?? exam.subjectId
      suffix = exam.topic ? `${abbrev} ${exam.topic}` : abbrev
    } else {
      const abbrevs = [...new Set(plan.examSchedule.map((e) => SUBJECT_INFO[e.subjectId]?.name?.slice(0, 3) ?? e.subjectId))]
      suffix = abbrevs.join(', ')
    }
    document.title = `Lernapp – ${planTypeLabel} – ${suffix}`
    window.print()
    setTimeout(() => { document.title = prevTitle }, 500)
  }

  const handleDelete = () => {
    if (!window.confirm('Lernplan wirklich löschen?')) return
    deleteLernplan(plan.id)
    navigate(-1)
  }

  const planTypeLabel = plan.planType === 'einzel' ? 'Einzel' : plan.planType === 'abitur' ? 'Abitur' : 'Vollständig'

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white !important; }
          .bg-background { background: white !important; }
          .bg-surface { background: #f9f9f9 !important; }
        }
        .print-only { display: none; }
      `}</style>

      <div className="flex flex-col min-h-screen bg-background max-w-lg mx-auto pb-24">
        {/* Header */}
        <div className="no-print sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/40 px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 flex items-center justify-center rounded-btn text-text-secondary hover:bg-surface-hover transition-colors shrink-0"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-text-primary font-bold text-[16px] truncate">{plan.title}</p>
              <p className="text-text-muted text-[12px]">{planTypeLabel} · {plan.days.length} Tage</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrint}
                className="w-9 h-9 flex items-center justify-center rounded-btn text-text-secondary hover:bg-surface-hover transition-colors"
                title="Drucken / Als PDF speichern"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 6 2 18 2 18 9" />
                  <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
                  <rect x="6" y="14" width="12" height="8" />
                </svg>
              </button>
              <button
                onClick={addToCalendar}
                className="w-9 h-9 flex items-center justify-center rounded-btn text-text-secondary hover:bg-surface-hover transition-colors"
                title="Zum Kalender hinzufügen"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                  <line x1="12" y1="14" x2="12" y2="18" />
                  <line x1="10" y1="16" x2="14" y2="16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Summary strip */}
        <div className="px-4 py-4">
          <div className="bg-surface border border-border/60 rounded-[20px] p-4 flex items-start gap-0">
            {[
              { label: 'Lerntage', value: String(totalStudyDays) },
              { label: 'Lernzeit', value: `${Math.round(totalMinutes / 60)}h` },
              { label: 'Klausuren', value: String(plan.examSchedule.length) },
            ].map((item, i) => (
              <div key={i} className={`flex-1 text-center ${i < 2 ? 'border-r border-border/40' : ''}`}>
                <p className="text-[26px] font-black text-text-primary leading-none">{item.value}</p>
                <p className="text-[11px] text-text-muted mt-1">{item.label}</p>
              </div>
            ))}
          </div>
          {plan.summary && (
            <p className="text-text-muted text-[13px] mt-3 leading-relaxed px-1">{plan.summary}</p>
          )}
        </div>

        {/* Days */}
        <div className="px-4 space-y-3">
          {plan.days.map((day, idx) => {
            const { weekday, day: dayNum, month } = formatDay(day.date)
            const todayMark = isToday(day.date)
            const pastMark = isPast(day.date)

            // Paywall: Free Einzel users see only first 3 days
            const isBlurred = !isPro && plan.planType === 'einzel' && idx >= 3

            return (
              <div
                key={day.date}
                className={`relative rounded-[20px] border overflow-hidden transition-all ${
                  todayMark ? 'border-accent shadow-lg' : 'border-border/60'
                } ${pastMark && !todayMark ? 'opacity-60' : ''}`}
                style={{ background: DAY_TYPE_COLORS[day.dayType] }}
              >
                {/* Day header */}
                <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                  {/* Date pill */}
                  <div className={`flex flex-col items-center w-10 rounded-[10px] py-1 shrink-0 ${
                    todayMark ? 'bg-accent' : 'bg-background/60'
                  }`}>
                    <p className={`text-[10px] font-bold leading-none ${todayMark ? 'text-white/80' : 'text-text-muted'}`}>{weekday}</p>
                    <p className={`text-[18px] font-black leading-tight ${todayMark ? 'text-white' : 'text-text-primary'}`}>{dayNum}</p>
                    <p className={`text-[10px] font-medium leading-none ${todayMark ? 'text-white/70' : 'text-text-muted'}`}>{month}</p>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[11px] font-bold uppercase tracking-wider ${DAY_TYPE_TEXT[day.dayType]}`}>
                        {DAY_TYPE_LABELS[day.dayType]}
                      </span>
                      {todayMark && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-pill bg-accent text-white">Heute</span>
                      )}
                    </div>
                    {day.note && (
                      <p className="text-[13px] font-semibold text-text-primary mt-0.5 truncate">{day.note}</p>
                    )}
                    {day.totalMin > 0 && (
                      <p className="text-[12px] text-text-muted mt-0.5">{durationLabel(day.totalMin)} geplant</p>
                    )}
                  </div>
                </div>

                {/* Exam banner */}
                {day.dayType === 'klausur' && (
                  <div className="mx-4 mb-4 p-3 rounded-[14px] flex items-center gap-2" style={{ background: 'rgba(var(--color-danger),0.10)', border: '1px solid rgba(var(--color-danger),0.25)' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-danger shrink-0">
                      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <p className="text-danger font-semibold text-[13px]">{day.note ?? 'Klausur heute'}</p>
                  </div>
                )}

                {/* Pause banner */}
                {day.dayType === 'pause' && (
                  <div className="mx-4 mb-4 p-3 rounded-[14px]" style={{ background: 'rgba(var(--color-border),0.3)' }}>
                    <p className="text-text-muted text-[13px] text-center">🌿 Erholungstag — keine Lernaufgaben</p>
                  </div>
                )}

                {/* Sessions */}
                {day.sessions.length > 0 && (
                  <div className={`px-4 pb-4 space-y-2 ${isBlurred ? 'filter blur-[4px] pointer-events-none select-none' : ''}`}>
                    {day.sessions.map((session, sIdx) => (
                      <SessionCard key={sIdx} session={session} />
                    ))}
                  </div>
                )}

                {/* Paywall overlay */}
                {isBlurred && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/40 backdrop-blur-[2px] rounded-[20px]">
                    <div className="bg-surface border border-border rounded-[14px] px-4 py-3 text-center shadow-lg">
                      <p className="text-text-primary font-bold text-[13px]">Pro freischalten</p>
                      <p className="text-text-muted text-[11px] mt-0.5">Vollständigen Plan sehen</p>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Delete button */}
        <div className="no-print px-4 pt-6">
          <button
            onClick={handleDelete}
            className="w-full py-3 rounded-[20px] border border-danger/30 text-danger text-[14px] font-medium hover:bg-danger/5 transition-colors"
          >
            Lernplan löschen
          </button>
        </div>
      </div>
    </>
  )
}

function SessionCard({ session }: { session: LernplanSession }) {
  const subj = SUBJECT_INFO[session.subjectId]
  const priorityColor = session.priority === 'hoch' ? '#FF453A' : session.priority === 'mittel' ? '#FF9F0A' : '#30D158'

  return (
    <div className="bg-background/70 border border-border/40 rounded-[14px] p-3 flex items-center gap-3">
      <div
        className="w-9 h-9 rounded-[10px] flex items-center justify-center text-base shrink-0"
        style={{ backgroundColor: `${subj?.color ?? '#7C3AED'}22` }}
      >
        {subj?.icon ?? '📚'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-text-primary font-semibold text-[13px]">{session.subjectName}</p>
          {session.isLK && (
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-accent/15 text-accent">LK</span>
          )}
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: priorityColor }}
          />
        </div>
        <p className="text-text-muted text-[12px] truncate">{session.topic}</p>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="text-[11px] font-bold text-text-muted">{durationLabel(session.durationMin)}</span>
        <span className="text-[11px] text-text-muted/70 flex items-center gap-0.5">
          <span>{METHOD_ICONS[session.method]}</span>
          <span className="text-[10px]">{METHOD_LABELS[session.method]}</span>
        </span>
      </div>
    </div>
  )
}
