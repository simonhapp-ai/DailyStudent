import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useUser, type PersonalEntry } from '../context/UserContext'
import { SUBJECT_INFO } from '../data/subjectInfo'
import { ProModal } from '../components/ui/ProModal'
import type { LernplanSession, LernplanActivity, LernDayType, LernMethode, StundenplanSlot } from '../types'

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

const METHOD_ROUTES: Partial<Record<LernMethode, string>> = {
  karteikarten: '/klausurmodus/karteikarten/neu',
  blurting: '/klausurmodus/blurting',
  lernzettel: '/klausurmodus/lernzettel/neu',
  probeklausur: '/klausurmodus/probeklausur',
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
  const { lernplaene, deleteLernplan, addEntries, personalEntries, profile, isPro } = useUser()

  const plan = lernplaene.find((p) => p.id === id)

  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set())
  const [showProModal, setShowProModal] = useState(false)

  const toggleSession = (key: string) => {
    setExpandedSessions((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

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
    const minToTime = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`
    const BUFFER = 15
    const MAX_SESSION_MIN = 90
    const NOON = 13 * 60

    const getSpDow = (dateStr: string): number => {
      const d = new Date(dateStr).getDay()
      return d === 0 ? 6 : d - 1
    }

    const getBusyIntervals = (dateStr: string): Array<{ s: number; e: number }> => {
      const dow = getSpDow(dateStr)
      const raw: Array<{ s: number; e: number }> = []

      if (dow >= 0 && dow <= 4) {
        const slots: StundenplanSlot[] = profile?.stundenplan?.slots ?? []
        for (const slot of slots) {
          if (slot.day !== dow) continue
          raw.push({ s: timeToMin(slot.startTime), e: timeToMin(slot.endTime) })
        }
      }

      for (const entry of personalEntries) {
        if (entry.date !== dateStr) continue
        const s = timeToMin(entry.time)
        const e = entry.endTime ? timeToMin(entry.endTime) : s + 60
        raw.push({ s, e })
      }

      for (const bt of plan.config.blockedTimes ?? []) {
        const applies = bt.dayOfWeek.length === 0 || bt.dayOfWeek.includes(dow)
        if (!applies) continue
        raw.push({ s: timeToMin(bt.startTime), e: timeToMin(bt.endTime) })
      }

      const sorted = raw.sort((a, b) => a.s - b.s)
      const merged: Array<{ s: number; e: number }> = []
      for (const iv of sorted) {
        if (merged.length > 0 && iv.s <= merged[merged.length - 1].e + BUFFER) {
          merged[merged.length - 1].e = Math.max(merged[merged.length - 1].e, iv.e)
        } else {
          merged.push({ ...iv })
        }
      }
      return merged
    }

    const getFreeGaps = (
      busy: Array<{ s: number; e: number }>,
      pref: 'morgen' | 'abend' | 'beides',
      dayStart: number,
    ): Array<{ s: number; e: number }> => {
      const DAY_END = 23 * 60
      const gaps: Array<{ s: number; e: number }> = []
      let cursor = dayStart

      for (const iv of busy) {
        if (iv.s > cursor) gaps.push({ s: cursor, e: iv.s })
        cursor = Math.max(cursor, iv.e + BUFFER)
      }
      if (cursor < DAY_END) gaps.push({ s: cursor, e: DAY_END })

      if (pref === 'morgen') {
        return [...gaps.filter(g => g.s < NOON), ...gaps.filter(g => g.s >= NOON)]
      }
      if (pref === 'abend') {
        return [...gaps.filter(g => g.e > NOON), ...gaps.filter(g => g.e <= NOON)]
      }
      return gaps
    }

    const pref = plan.config.studyTimePreference ?? 'beides'
    const entries: PersonalEntry[] = []
    const skipped: string[] = []

    plan.days.forEach((day) => {
      if (!day.sessions.length) return
      const busy = getBusyIntervals(day.date)

      const lastSchoolEnd = busy.filter(b => {
        const dow = getSpDow(day.date)
        if (dow < 0 || dow > 4) return false
        const slots: StundenplanSlot[] = profile?.stundenplan?.slots ?? []
        return slots.some(sl => sl.day === dow && timeToMin(sl.startTime) === b.s)
      }).reduce((max, b) => Math.max(max, b.e), 0)

      const dayStart = pref === 'morgen' ? 7 * 60 : pref === 'abend' ? Math.max(13 * 60, lastSchoolEnd + BUFFER) : Math.max(7 * 60, lastSchoolEnd > 0 ? lastSchoolEnd + BUFFER : 7 * 60)
      const freeGaps = getFreeGaps(busy, pref, dayStart)

      let gapIdx = 0
      let gapCursor = freeGaps[0]?.s ?? -1

      day.sessions.forEach((session, sessionIdx) => {
        const dur = Math.min(session.durationMin, MAX_SESSION_MIN)

        while (gapIdx < freeGaps.length) {
          const gap = freeGaps[gapIdx]
          if (gapCursor < gap.s) gapCursor = gap.s
          if (gapCursor + dur <= gap.e) {
            const start = gapCursor
            const end = start + dur
            entries.push({
              id: uid(),
              title: `Lernblock ${sessionIdx + 1}: ${session.topic}`,
              type: 'lerneinheit',
              date: day.date,
              time: minToTime(start),
              endTime: minToTime(end),
              lernplanId: plan.id,
              color: SUBJECT_INFO[session.subjectId]?.color ?? '#34C759',
            })
            gapCursor = end + BUFFER
            return
          }
          gapIdx++
          gapCursor = freeGaps[gapIdx]?.s ?? -1
        }
        skipped.push(`${session.subjectName} (${day.date})`)
      })
    })

    addEntries(entries)
    let msg = `${entries.length} Lernblöcke wurden zum Kalender hinzugefügt.`
    if (skipped.length) msg += `\n\n${skipped.length} Block(s) konnten nicht eingeplant werden: ${skipped.join(', ')}`
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
          {plan.days.map((day) => {
            const { weekday, day: dayNum, month } = formatDay(day.date)
            const todayMark = isToday(day.date)
            const pastMark = isPast(day.date)

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
                  <div className="px-4 pb-4 space-y-2">
                    {day.sessions.map((session, sIdx) => {
                      const sessionKey = `${day.date}-${sIdx}`
                      const isExpanded = expandedSessions.has(sessionKey)
                      return (
                        <SessionCard
                          key={sIdx}
                          session={session}
                          isExpanded={isExpanded}
                          onToggle={() => toggleSession(sessionKey)}
                          isPro={isPro}
                          onShowPro={() => setShowProModal(true)}
                          onNavigate={(route) => navigate(route)}
                        />
                      )
                    })}
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

      <ProModal isOpen={showProModal} onClose={() => setShowProModal(false)} feature="lernplan" />
    </>
  )
}

/* ─── SessionCard ──────────────────────────────────────────────── */

function SessionCard({
  session,
  isExpanded,
  onToggle,
  isPro,
  onShowPro,
  onNavigate,
}: {
  session: LernplanSession
  isExpanded: boolean
  onToggle: () => void
  isPro: boolean
  onShowPro: () => void
  onNavigate: (route: string) => void
}) {
  const subj = SUBJECT_INFO[session.subjectId]
  const priorityColor = session.priority === 'hoch' ? '#FF453A' : session.priority === 'mittel' ? '#FF9F0A' : '#30D158'
  const hasActivities = (session.activities?.length ?? 0) > 0
  const hasProActivity = session.activities?.some((a) => a.isPro) ?? false

  return (
    <div className="bg-background/70 border border-border/40 rounded-[14px] overflow-hidden">
      {/* Collapsed header — always clickable */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 text-left active:bg-surface-hover/30 transition-colors"
      >
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
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: priorityColor }} />
          </div>
          <p className="text-text-muted text-[12px] truncate">{session.topic}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-[11px] font-bold text-text-muted">{durationLabel(session.durationMin)}</span>
          <div className="flex items-center gap-1">
            {hasProActivity && !isPro && (
              <span className="badge-pro-gold px-1.5 py-0.5">✦ Pro</span>
            )}
            <span className="text-[11px] text-text-muted/70 flex items-center gap-0.5">
              <span>{METHOD_ICONS[session.method]}</span>
            </span>
            {hasActivities && (
              <svg
                width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                className={`text-text-muted transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
              >
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        </div>
      </button>

      {/* Expanded detail */}
      {isExpanded && hasActivities && (
        <div className="px-3 pb-3 space-y-2 border-t border-border/30 pt-3">
          {/* Learning goal */}
          {session.learningGoal && (
            <div className="flex items-start gap-2 px-1 mb-3">
              <span className="text-[13px] shrink-0 mt-0.5">🎯</span>
              <p className="text-text-secondary text-[12px] leading-relaxed italic">{session.learningGoal}</p>
            </div>
          )}

          {/* Activity rows */}
          {session.activities!.map((activity, aIdx) => (
            <ActivityRow
              key={aIdx}
              activity={activity}
              isPro={isPro}
              onShowPro={onShowPro}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── ActivityRow ──────────────────────────────────────────────── */

function ActivityRow({
  activity,
  isPro,
  onShowPro,
  onNavigate,
}: {
  activity: LernplanActivity
  isPro: boolean
  onShowPro: () => void
  onNavigate: (route: string) => void
}) {
  const route = METHOD_ROUTES[activity.method]
  const isLocked = activity.isPro && !isPro

  const handleAction = () => {
    if (isLocked) { onShowPro(); return }
    if (route) onNavigate(route)
  }

  return (
    <div className={`flex items-center gap-2.5 p-2.5 rounded-[10px] ${
      isLocked ? 'bg-amber-500/6 border border-amber-500/15' : 'bg-surface/60 border border-border/30'
    }`}>
      {/* Duration chip */}
      <span className="text-[11px] font-bold text-text-muted bg-background/80 px-2 py-0.5 rounded-[6px] shrink-0 w-14 text-center">
        {activity.durationMin} min
      </span>

      {/* Method icon */}
      <span className="text-[15px] shrink-0">{METHOD_ICONS[activity.method]}</span>

      {/* Title */}
      <div className="flex-1 min-w-0">
        <p className={`text-[12px] font-medium leading-tight ${isLocked ? 'text-text-secondary' : 'text-text-primary'}`}>
          {activity.title}
        </p>
        <p className="text-[10px] text-text-muted mt-0.5">{METHOD_LABELS[activity.method]}</p>
      </div>

      {/* Action button */}
      {route && (
        <button
          onClick={handleAction}
          className={`flex items-center gap-1 px-2 py-1.5 rounded-[8px] text-[11px] font-semibold shrink-0 transition-all active:scale-[0.95] ${
            isLocked
              ? 'bg-amber-500/15 text-amber-500'
              : 'bg-accent/12 text-accent'
          }`}
        >
          {isLocked ? (
            <>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
              Pro
            </>
          ) : (
            <>
              Starten
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </>
          )}
        </button>
      )}
    </div>
  )
}
