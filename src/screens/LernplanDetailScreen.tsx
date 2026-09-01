import { useState } from 'react'
import { Stage } from '../components/ui/Stage'
import { Metric, MetricRow } from '../components/ui/Metric'
import { useParams, useNavigate } from 'react-router-dom'
import { useUser, type PersonalEntry } from '../context/UserContext'
import { SUBJECT_INFO } from '../data/subjectInfo'
import { SubjectIcon } from '../components/ui/SubjectIcon'
import { ProModal } from '../components/ui/ProModal'
import { Dialog } from '../components/ui/Dialog'
import { Icon, type IconName } from '../components/ui/Icon'
import type { LernplanSession, LernplanActivity, LernDayType, LernMethode, StundenplanSlot } from '../types'

const METHOD_ICONS: Record<LernMethode, IconName> = {
  karteikarten: 'cards',
  blurting: 'bulb',
  lernzettel: 'document',
  probeklausur: 'clipboard',
  lesen: 'book',
  wiederholen: 'repeat',
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
  lern: 'text-text-primary',
  pause: 'text-text-muted',
  klausur: 'text-text-primary',
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

/** Setzt den Dokumenttitel — steht bewusst ausserhalb des Bauteils, weil er
 *  zur Seite gehoert und nicht zum Zustand des Screens. */
function setDocumentTitle(title: string) {
  document.title = title
}

export function LernplanDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { lernplaene, deleteLernplan, saveLernplan, addEntries, personalEntries, profile, isPro, appConfig, supabaseDataLoading } = useUser()

  const plan = lernplaene.find((p) => p.id === id)

  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set())
  const [showProModal, setShowProModal] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const toggleSession = (key: string) => {
    setExpandedSessions((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  if (!plan) {
    // Distinguish "still loading" from "actually not found" — lernplaene comes
    // from Supabase and can still be mid-sync on mount (e.g. deep link/refresh
    // right after login), which used to briefly show "nicht gefunden" before
    // flashing into the real detail view once data arrived (CLS finding,
    // Block 4 nav audit). A plain spinner avoids that structural DOM swap.
    if (supabaseDataLoading) {
      return (
        <div className="min-h-dvh bg-background flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        </div>
      )
    }
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh bg-background gap-4 px-8">
        <div className="w-16 h-16 rounded-card bg-surface flex items-center justify-center text-text-secondary"><Icon name="calendar" size={28} /></div>
        <p className="text-text-primary font-semibold text-lg text-center">Lernplan nicht gefunden</p>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-text-primary text-[14px] font-medium press-sm"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Zurück
        </button>
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
    setDocumentTitle(`Lernapp – ${planTypeLabel} – ${suffix}`)
    window.print()
    setTimeout(() => setDocumentTitle(prevTitle), 500)
  }

  const handleDelete = () => {
    deleteLernplan(plan.id)
    navigate(-1)
  }

  const planTypeLabel = plan.planType === 'einzel' ? 'Einzel' : plan.planType === 'abitur' ? 'Abitur' : 'Vollständig'

  const erledigteTage = plan.completedDays ?? []
  const lerntage = plan.days.filter((d) => d.totalMin > 0)
  const erledigtAnzahl = lerntage.filter((d) => erledigteTage.includes(d.date)).length
  const naechsterOffener = lerntage.find((d) => !erledigteTage.includes(d.date))

  const toggleTag = (date: string) => {
    const drin = erledigteTage.includes(date)
    saveLernplan({
      ...plan,
      completedDays: drin ? erledigteTage.filter((d) => d !== date) : [...erledigteTage, date],
    })
  }

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

      <div className="flex flex-col min-h-dvh bg-background max-w-lg mx-auto pb-24">
        {/* Header */}
        <div
          className="no-print sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/40 px-4 pb-3"
          style={{ paddingTop: 'max(58px, calc(env(safe-area-inset-top, 0px) + 18px))' }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-0.5 press-sm shrink-0 -ml-2 px-2 py-1.5 rounded-btn text-text-primary"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-text-primary font-bold text-[16px] truncate">{plan.title}</p>
              <p className="text-text-muted text-[12px]">{planTypeLabel} · {plan.days.length} Tage</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrint}
                className="icon-expand-btn rounded-btn text-text-secondary hover:bg-surface-hover transition-colors"
                title="Drucken / Als PDF speichern"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                  <polyline points="6 9 6 2 18 2 18 9" />
                  <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
                  <rect x="6" y="14" width="12" height="8" />
                </svg>
                <span className="icon-expand-label text-[12px] font-semibold">Drucken</span>
              </button>
              <button
                onClick={addToCalendar}
                className="icon-expand-btn rounded-btn text-text-secondary hover:bg-surface-hover transition-colors"
                title="Zum Kalender hinzufügen"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                  <line x1="12" y1="14" x2="12" y2="18" />
                  <line x1="10" y1="16" x2="14" y2="16" />
                </svg>
                <span className="icon-expand-label text-[12px] font-semibold">Zum Kalender</span>
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-9 h-9 flex items-center justify-center rounded-btn text-text-secondary hover:text-text-primary transition-colors"
                title="Lernplan löschen"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {naechsterOffener && (
          <div className="px-4 pt-4">
            <Stage
              tone="klausur"
              eyebrow={`${erledigtAnzahl} von ${lerntage.length} Lerntagen erledigt`}
              title={naechsterOffener.note ?? formatDay(naechsterOffener.date).weekday + ', ' + formatDay(naechsterOffener.date).day + '. ' + formatDay(naechsterOffener.date).month}
              progress={lerntage.length > 0 ? erledigtAnzahl / lerntage.length : 0}
              note={naechsterOffener.totalMin > 0 ? `${durationLabel(naechsterOffener.totalMin)} geplant` : undefined}
              action={
                <button
                  onClick={() => toggleTag(naechsterOffener.date)}
                  className="w-full h-12 rounded-pill text-[15px] font-semibold press flex items-center justify-center gap-2"
                  style={{ background: 'rgb(var(--color-accent))', color: 'rgb(var(--color-on-accent))' }}
                >
                  <Icon name="check" size={16} />
                  Tag als erledigt markieren
                </button>
              }
            />
          </div>
        )}

        {/* Summary strip */}
        <div className="px-4 py-4">
          <MetricRow>
            <Metric value={totalStudyDays} label="Lerntage" />
            <Metric value={`${Math.round(totalMinutes / 60)}h`} label="Lernzeit" />
            <Metric value={plan.examSchedule.length} label="Klausuren" />
          </MetricRow>
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
                className={`relative rounded-card border overflow-hidden transition-all ${
                  todayMark ? 'border-accent shadow-lg' : 'border-border/60'
                } ${pastMark && !todayMark ? 'opacity-60' : ''}`}
                style={{ background: DAY_TYPE_COLORS[day.dayType] }}
              >
                {/* Day header */}
                <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                  <div className={`flex flex-col items-center w-10 rounded-btn py-1 shrink-0 ${
                    todayMark ? 'bg-accent' : 'bg-background/60'
                  }`}>
                    <p className={`text-[11px] font-bold leading-none ${todayMark ? 'text-white/80' : 'text-text-muted'}`}>{weekday}</p>
                    <p className={`text-[18px] font-black leading-tight ${todayMark ? 'text-white' : 'text-text-primary'}`}>{dayNum}</p>
                    <p className={`text-[11px] font-medium leading-none ${todayMark ? 'text-white/70' : 'text-text-muted'}`}>{month}</p>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[11px] font-bold uppercase tracking-wider ${DAY_TYPE_TEXT[day.dayType]}`}>
                        {DAY_TYPE_LABELS[day.dayType]}
                      </span>
                      {todayMark && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-pill bg-accent text-white">Heute</span>
                      )}
                    </div>
                    {day.note && (
                      <p className="text-[13px] font-semibold text-text-primary mt-0.5 truncate">{day.note}</p>
                    )}
                    {day.totalMin > 0 && (
                      <p className="text-[12px] text-text-muted mt-0.5">{durationLabel(day.totalMin)} geplant</p>
                    )}
                  </div>

                  {/* Erledigt-Schalter — gefuellte Marke, wenn der Tag steht */}
                  {day.totalMin > 0 && (
                    <button
                      onClick={() => toggleTag(day.date)}
                      aria-pressed={erledigteTage.includes(day.date)}
                      aria-label={erledigteTage.includes(day.date) ? 'Tag wieder öffnen' : 'Tag als erledigt markieren'}
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 press-sm border transition-colors"
                      style={
                        erledigteTage.includes(day.date)
                          ? { background: 'rgb(var(--color-accent))', color: 'rgb(var(--color-on-accent))', borderColor: 'transparent' }
                          : { borderColor: 'rgb(var(--color-border))', color: 'rgb(var(--color-text-muted))' }
                      }
                    >
                      <Icon name="check" size={15} />
                    </button>
                  )}
                </div>

                {/* Exam banner */}
                {day.dayType === 'klausur' && (
                  <div className="mx-4 mb-4 p-3 rounded-icon flex items-center gap-2" style={{ background: 'rgba(var(--color-danger),0.10)', border: '1px solid rgba(var(--color-danger),0.25)' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-text-primary shrink-0">
                      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <p className="text-text-primary font-semibold text-[13px]">{day.note ?? 'Klausur heute'}</p>
                  </div>
                )}

                {/* Pause banner */}
                {day.dayType === 'pause' && (
                  <div className="mx-4 mb-4 p-3 rounded-icon" style={{ background: 'rgba(var(--color-border),0.3)' }}>
                    <p className="text-text-muted text-[13px] text-center flex items-center justify-center gap-1.5"><Icon name="coffee" size={14} />Erholungstag — keine Lernaufgaben</p>
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
                          // Beta launch: treat paused purchases as "not Pro" here too, so
                          // the badge + lock stay consistent with everywhere else — no
                          // effect once purchases resume (see migration 017_beta_mode_config.sql).
                          isPro={isPro && appConfig.proPurchasesEnabled}
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

        {/* Add to calendar — full-width primary action, purple like the landing page CTAs */}
        <div className="no-print px-4 pt-6">
          <button
            onClick={addToCalendar}
            className="w-full h-12 rounded-pill text-on-accent text-[14px] font-bold press-sm flex items-center justify-center gap-2"
            style={{ background: 'rgb(var(--color-accent))' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Zum Kalender hinzufügen
          </button>
        </div>

        {/* Delete button */}
        <div className="no-print px-4 pt-3">
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-full h-12 rounded-pill border border-danger/30 text-text-primary text-[14px] font-medium hover:bg-danger/5 transition-colors"
          >
            Lernplan löschen
          </button>
        </div>
      </div>

      <Dialog
        open={confirmDelete}
        title="Lernplan löschen?"
        message={`Der Lernplan wird mit allen ${plan.days.length} Lerntagen dauerhaft entfernt.`}
        confirmLabel="Löschen"
        cancelLabel="Behalten"
        destructive
        onConfirm={() => { setConfirmDelete(false); handleDelete() }}
        onCancel={() => setConfirmDelete(false)}
      />

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
  const priorityColor = session.priority === 'hoch' ? '#FF453A' : session.priority === 'mittel' ? '#FF9F0A' : '#30D158'
  const hasActivities = (session.activities?.length ?? 0) > 0
  const hasProActivity = session.activities?.some((a) => a.isPro) ?? false

  return (
    <div className="bg-background/70 border border-border/40 rounded-icon overflow-hidden">
      {/* Collapsed header — always clickable */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 text-left active:bg-surface-hover/30 transition-colors"
      >
        <SubjectIcon subjectId={session.subjectId} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-text-primary font-semibold text-[13px]">{session.subjectName}</p>
            {session.isLK && (
              <span className="text-[11px] font-black px-1.5 py-0.5 rounded-chip bg-accent/15 text-text-primary">LK</span>
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
              <span className="text-text-secondary"><Icon name={METHOD_ICONS[session.method]} size={15} /></span>
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
              <span className="shrink-0 mt-0.5 text-text-secondary"><Icon name="target" size={14} /></span>
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
    <div className={`flex items-center gap-2.5 p-2.5 rounded-btn ${
      isLocked ? 'bg-warning/6 border border-warning/15' : 'bg-surface/60 border border-border/30'
    }`}>
      {/* Duration chip */}
      <span className="text-[11px] font-bold text-text-muted bg-background/80 px-2 py-0.5 rounded-[6px] shrink-0 w-14 text-center">
        {activity.durationMin} min
      </span>

      {/* Method icon */}
      <span className="shrink-0 text-text-secondary"><Icon name={METHOD_ICONS[activity.method]} size={15} /></span>

      {/* Title */}
      <div className="flex-1 min-w-0">
        <p className={`text-[12px] font-medium leading-tight ${isLocked ? 'text-text-secondary' : 'text-text-primary'}`}>
          {activity.title}
        </p>
        <p className="text-[11px] text-text-muted mt-0.5">{METHOD_LABELS[activity.method]}</p>
      </div>

      {/* Action button */}
      {route && (
        <button
          onClick={handleAction}
          className={`flex items-center gap-1 px-2 py-1.5 rounded-chip text-[11px] font-semibold shrink-0 transition-all active:scale-[0.95] ${
            isLocked
              ? 'bg-warning/15 text-text-secondary'
              : 'bg-accent/12 text-text-primary'
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
