import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { SUBJECT_INFO } from '../data/subjectInfo'
import type { StundenplanSlot } from '../types'

// ── Helpers ──────────────────────────────────────────────────────────────────

const WEEKDAYS_DE = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']
const MONTHS_FULL = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
const MONTHS_SHORT = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
const WEEKDAY_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

function getGreeting(name: string): string {
  const h = new Date().getHours()
  const first = name.split(' ')[0]
  if (h < 12) return `Guten Morgen, ${first}`
  if (h < 17) return `Hallo, ${first}`
  return `Guten Abend, ${first}`
}

function formatDateFull(d: Date): string {
  const dayName = WEEKDAYS_DE[(d.getDay() + 6) % 7]
  return `${dayName}, ${d.getDate()}. ${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`
}

function getTimeStr(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

// StundenplanSlot.day: 0=Mo, 1=Di, ... JS getDay(): 0=Sun, 1=Mon...
function getTodayDayIndex(): number {
  const jsDay = new Date().getDay()
  return jsDay === 0 ? -1 : jsDay - 1
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / 86400000)
}

function getCurrentStreak(streak: number, lastStudyDate: string | null): number {
  if (!lastStudyDate) return 0
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return lastStudyDate === today || lastStudyDate === yesterday.toISOString().slice(0, 10)
    ? streak : 0
}

function getTimeAgo(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'gerade eben'
  if (mins < 60) return `vor ${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `vor ${hours}h`
  const days = Math.floor(hours / 24)
  return `vor ${days}d`
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Card({ children, className = '', onClick }: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}) {
  return (
    <div
      className={`bg-surface rounded-[20px] border border-border/60 shadow-card-adaptive p-5 ${onClick ? 'cursor-pointer press' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="section-label mb-3.5">{children}</p>
}

function ChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted shrink-0">
      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Today Card ────────────────────────────────────────────────────────────────

function TodayCard({ slots, className }: { slots: StundenplanSlot[]; className?: string }) {
  const now = getTimeStr()
  const today = new Date()
  const weekdayName = WEEKDAYS_DE[(today.getDay() + 6) % 7]
  const nextLessonId = slots.find(s => s.startTime > now)?.id ?? null

  return (
    <Card className={`flex flex-col ${className ?? ''}`}>
      <div className="flex items-center justify-between mb-4">
        <SectionLabel>Heute</SectionLabel>
        <span className="text-[12px] font-semibold text-text-secondary -mt-1">{weekdayName}</span>
      </div>

      {slots.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-8">
          <span className="text-[40px] mb-2">🎉</span>
          <p className="text-[15px] font-bold text-text-primary">Freier Tag!</p>
          <p className="text-[12px] text-text-muted mt-1">Nutze die Zeit zum Lernen</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {slots.slice(0, 8).map((slot) => {
            const info = SUBJECT_INFO[slot.subjectId]
            const isCurrent = now >= slot.startTime && now < slot.endTime
            const isNext = !isCurrent && slot.id === nextLessonId

            return (
              <div
                key={slot.id}
                className="flex items-center gap-3 rounded-[12px] px-3 py-2 transition-colors"
                style={{
                  background: isCurrent
                    ? 'rgba(52,199,89,0.10)'
                    : isNext
                    ? 'rgba(var(--color-accent), 0.07)'
                    : undefined,
                }}
              >
                <span
                  className="text-[11px] font-mono font-semibold shrink-0 w-[38px]"
                  style={{ color: isCurrent ? '#30D158' : 'rgb(var(--color-text-muted))' }}
                >
                  {slot.startTime}
                </span>
                <span className="text-[17px] shrink-0">{info?.icon ?? '📚'}</span>
                <span className="text-[13px] font-medium text-text-primary flex-1 truncate">
                  {info?.name ?? slot.subjectId}
                </span>
                {isCurrent && (
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap"
                    style={{ background: 'rgba(52,199,89,0.18)', color: '#30D158' }}
                  >
                    Jetzt
                  </span>
                )}
                {isNext && (
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap"
                    style={{ background: 'rgba(var(--color-accent), 0.12)', color: 'rgb(var(--color-accent))' }}
                  >
                    Nächste
                  </span>
                )}
              </div>
            )
          })}
          {slots.length > 8 && (
            <p className="text-[11px] text-text-muted text-center pt-1">
              +{slots.length - 8} weitere Stunden
            </p>
          )}
        </div>
      )}
    </Card>
  )
}

// ── Klausur Card ──────────────────────────────────────────────────────────────

function KlausurCard({
  exam,
  className,
  onNavigate,
}: {
  exam: { subjectId: string; date: string; days: number; info: { name: string; icon: string; color: string } | undefined } | null
  className?: string
  onNavigate: () => void
}) {
  return (
    <Card className={`flex flex-col ${className ?? ''}`} onClick={exam ? onNavigate : undefined}>
      <div className="flex items-center justify-between mb-2">
        <SectionLabel>Nächste Klausur</SectionLabel>
        {exam && <ChevronRight />}
      </div>

      {exam ? (
        <div className="flex-1 flex flex-col items-center justify-center py-4 text-center">
          {/* Subject icon in color bubble */}
          <div
            className="w-16 h-16 rounded-[20px] flex items-center justify-center text-[36px] mb-3"
            style={{ background: `${exam.info?.color ?? '#7C3AED'}22` }}
          >
            {exam.info?.icon ?? '📝'}
          </div>
          <p className="text-[13px] font-semibold text-text-secondary">
            {exam.info?.name ?? exam.subjectId}
          </p>

          {/* Big countdown */}
          <div className="flex items-baseline gap-1.5 mt-3 mb-2">
            <span
              className="text-[54px] font-black leading-none tabular-nums"
              style={{
                color: exam.days <= 3
                  ? 'rgb(var(--color-danger))'
                  : exam.days <= 7
                  ? 'rgb(var(--color-warning))'
                  : 'rgb(var(--color-accent))',
              }}
            >
              {exam.days}
            </span>
            <span className="text-[16px] font-semibold text-text-muted self-end mb-2">Tage</span>
          </div>

          <p className="text-[12px] text-text-muted">
            {new Date(exam.date).toLocaleDateString('de-DE', {
              day: 'numeric', month: 'long', year: 'numeric',
            })}
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
          <div className="w-14 h-14 rounded-[18px] icon-accent flex items-center justify-center mb-3">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-accent))" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="3" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
              <line x1="12" y1="14" x2="12" y2="18" />
              <line x1="10" y1="16" x2="14" y2="16" />
            </svg>
          </div>
          <p className="text-[14px] font-semibold text-text-primary">Kein Klausurtermin</p>
          <p className="text-[12px] text-text-muted mt-1">Im Kalender eintragen</p>
        </div>
      )}
    </Card>
  )
}

// ── Streak Card ───────────────────────────────────────────────────────────────

function StreakCard({
  streak,
  last7,
  className,
  onNavigate,
}: {
  streak: number
  last7: { str: string; studied: boolean }[]
  className?: string
  onNavigate: () => void
}) {
  return (
    <Card className={`flex flex-col ${className ?? ''}`} onClick={onNavigate}>
      <div className="flex items-center justify-between mb-1">
        <SectionLabel>Lernstreak</SectionLabel>
        <ChevronRight />
      </div>

      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-[32px] leading-none">🔥</span>
        <span className="text-[44px] font-black leading-none text-text-primary tabular-nums">
          {streak}
        </span>
      </div>
      <p className="text-[12px] text-text-muted mb-4">Tage in Folge</p>

      {/* 7 day activity bars */}
      <div className="flex gap-1.5 mt-auto">
        {last7.map((day) => (
          <div
            key={day.str}
            className="flex-1 h-1.5 rounded-full transition-colors"
            style={{ background: day.studied ? '#30D158' : 'rgb(var(--color-border))' }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-[9px] text-text-muted">vor 6 Tagen</span>
        <span className="text-[9px] text-text-muted">heute</span>
      </div>
    </Card>
  )
}

// ── Lernplan Card ─────────────────────────────────────────────────────────────

function LernplanCard({
  activePlan,
  upcomingDays,
  className,
  onNavigate,
}: {
  activePlan: import('../types').Lernplan | undefined
  upcomingDays: import('../types').LernplanDay[]
  className?: string
  onNavigate: () => void
}) {
  return (
    <Card className={`flex flex-col ${className ?? ''}`} onClick={onNavigate}>
      <div className="flex items-center justify-between mb-1">
        <SectionLabel>Lernplan</SectionLabel>
        {activePlan ? (
          <span
            className="text-[10px] font-bold px-2.5 py-0.5 rounded-full -mt-1 whitespace-nowrap"
            style={{ background: 'rgba(192,119,0,0.15)', color: '#C07700' }}
          >
            Aktiv
          </span>
        ) : (
          <ChevronRight />
        )}
      </div>

      {activePlan && upcomingDays.length > 0 ? (
        <div className="flex gap-2 mt-1">
          {upcomingDays.map((day) => {
            const d = new Date(day.date)
            const mainSession = day.sessions[0]
            return (
              <div key={day.date} className="flex-1 bg-background rounded-[14px] p-3 text-center min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                  {WEEKDAY_SHORT[(d.getDay() + 6) % 7]}
                </p>
                <p className="text-[10px] text-text-secondary mt-0.5">
                  {d.getDate()}. {MONTHS_SHORT[d.getMonth()]}
                </p>
                <div className="mt-2 text-[20px]">
                  {mainSession ? (SUBJECT_INFO[mainSession.subjectId]?.icon ?? '📚') : '—'}
                </div>
                <p className="text-[9px] text-text-muted font-medium mt-1 truncate px-0.5">
                  {mainSession?.subjectName ?? '—'}
                </p>
                <p className="text-[9px] text-text-muted mt-0.5">
                  {Math.round(day.totalMin / 60 * 10) / 10}h
                </p>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex-1 flex items-center gap-4 mt-2">
          <div
            className="w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(145deg, #FFD060, #C07700)', boxShadow: '0 4px 14px rgba(192,119,0,0.35)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
              <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" strokeWidth="2.5" />
            </svg>
          </div>
          <div className="text-left">
            <p className="text-[14px] font-bold text-text-primary">Lernplan erstellen</p>
            <p className="text-[12px] text-text-muted mt-0.5">KI plant deinen Lernweg</p>
          </div>
        </div>
      )}
    </Card>
  )
}

// ── Schnellstart Card ─────────────────────────────────────────────────────────

function SchnellstartCard({
  flashCardCount,
  className,
  onNewNote,
  onFlashCards,
  onProbeklausur,
}: {
  flashCardCount: number
  className?: string
  onNewNote: () => void
  onFlashCards: () => void
  onProbeklausur: () => void
}) {
  const actions = [
    {
      label: 'Neue Notiz',
      sublabel: 'Smart Note erstellen',
      gradient: 'linear-gradient(145deg, #5AC8FA, #007BB8)',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      ),
      onClick: onNewNote,
    },
    {
      label: 'Karteikarten',
      sublabel: flashCardCount > 0 ? `${flashCardCount} Karten · lernen` : 'Karten erstellen',
      gradient: 'linear-gradient(145deg, #7C3AED, #4C1D95)',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="7" y="7" width="13" height="12" rx="2.5" strokeOpacity="0.5" />
          <rect x="4" y="9" width="13" height="12" rx="2.5" />
          <line x1="7" y1="14" x2="14" y2="14" />
          <line x1="7" y1="16.5" x2="12" y2="16.5" />
        </svg>
      ),
      onClick: onFlashCards,
    },
    {
      label: 'Probeklausur',
      sublabel: '4 Modi · KI-Feedback',
      gradient: 'linear-gradient(145deg, #0891B2, #065666)',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
        </svg>
      ),
      onClick: onProbeklausur,
    },
  ]

  return (
    <Card className={`flex flex-col ${className ?? ''}`}>
      <SectionLabel>Schnellstart</SectionLabel>
      <div className="flex flex-col gap-2">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-[14px] bg-background hover:bg-surface-hover press-sm text-left transition-colors"
          >
            <div
              className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
              style={{ background: action.gradient }}
            >
              {action.icon}
            </div>
            <div>
              <p className="text-[13px] font-semibold text-text-primary leading-tight">{action.label}</p>
              <p className="text-[11px] text-text-muted leading-tight">{action.sublabel}</p>
            </div>
          </button>
        ))}
      </div>
    </Card>
  )
}

// ── Stats Row ─────────────────────────────────────────────────────────────────

function StatPill({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="flex-1 bg-background rounded-[14px] p-3 text-center min-w-0">
      <p className="text-[22px] font-black text-text-primary tabular-nums leading-tight">{value}</p>
      <p className="text-[10px] text-text-muted mt-0.5 truncate">{label}</p>
      <div className="w-4 h-0.5 rounded-full mx-auto mt-1.5" style={{ background: color }} />
    </div>
  )
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function DashboardScreen() {
  const navigate = useNavigate()
  const {
    profile, appStats, lernplaene,
    userNotes, generatedFlashCards, lernzettel, savedProbeklausuren,
  } = useUser()

  const today = new Date()
  const todayDayIdx = getTodayDayIndex()

  // Today's slots
  const todaySlots = useMemo(() => {
    if (!profile?.stundenplan || todayDayIdx === -1) return []
    return profile.stundenplan.slots
      .filter(s => s.day === todayDayIdx)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  }, [profile?.stundenplan, todayDayIdx])

  // Next exam
  const nextExam = useMemo(() => {
    const upcoming = (profile?.klausurtermine ?? [])
      .map(k => ({ ...k, days: daysUntil(k.date), info: SUBJECT_INFO[k.subjectId] }))
      .filter(k => k.days >= 0 && k.info)
      .sort((a, b) => a.days - b.days)
    return upcoming[0] ?? null
  }, [profile?.klausurtermine])

  // Streak
  const activeStreak = getCurrentStreak(appStats.streak, appStats.lastStudyDate)

  // Last 7 days for streak visualization
  const last7Days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      const str = d.toISOString().slice(0, 10)
      return { str, studied: appStats.studiedDays.includes(str) }
    })
  }, [appStats.studiedDays])

  // Active lernplan + upcoming days
  const activePlan = lernplaene.find(p => p.isActive)
  const upcomingPlanDays = useMemo(() => {
    if (!activePlan) return []
    const todayStr = today.toISOString().slice(0, 10)
    return activePlan.days
      .filter(d => d.date >= todayStr && (d.dayType === 'lern' || d.dayType === 'puffer') && d.sessions.length > 0)
      .slice(0, 3)
  }, [activePlan]) // eslint-disable-line react-hooks/exhaustive-deps

  // Recent notes (last 3 with a subjectId for proper navigation)
  const recentNotes = useMemo(() => {
    return [...userNotes]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 3)
  }, [userNotes])

  return (
    <div
      className="min-h-screen bg-background pb-20"
      style={{ paddingTop: 'max(40px, calc(env(safe-area-inset-top, 0px) + 20px))' }}
    >
      <div className="px-6 md:px-8">

        {/* ── Greeting ─────────────────────────────────────────────────── */}
        <div className="mb-8">
          <h1 className="text-[30px] font-bold text-text-primary">
            {getGreeting(profile?.name ?? 'Student')}
          </h1>
          <p className="text-[13px] text-text-muted mt-1">{formatDateFull(today)}</p>
        </div>

        {/* ── Row 1: Heute + Nächste Klausur ───────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 mb-4">
          <TodayCard slots={todaySlots} className="md:col-span-1 lg:col-span-7" />
          <KlausurCard
            exam={nextExam}
            className="md:col-span-1 lg:col-span-5"
            onNavigate={() => navigate('/klausurmodus')}
          />
        </div>

        {/* ── Row 2: Streak + Lernplan + Schnellstart ──────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-12 gap-4 mb-6">
          <StreakCard
            streak={activeStreak}
            last7={last7Days}
            className="md:col-span-1 lg:col-span-3"
            onNavigate={() => navigate('/insights')}
          />
          <LernplanCard
            activePlan={activePlan}
            upcomingDays={upcomingPlanDays}
            className="md:col-span-1 lg:col-span-5"
            onNavigate={() =>
              activePlan
                ? navigate(`/klausurmodus/lernplan/${activePlan.id}`)
                : navigate('/klausurmodus/lernplan/neu')
            }
          />
          <SchnellstartCard
            flashCardCount={generatedFlashCards.length}
            className="md:col-span-1 lg:col-span-4"
            onNewNote={() => navigate('/unterricht')}
            onFlashCards={() =>
              generatedFlashCards.length > 0
                ? navigate('/klausurmodus/lernen')
                : navigate('/klausurmodus/karteikarten/neu')
            }
            onProbeklausur={() => navigate('/klausurmodus/probeklausur')}
          />
        </div>

        {/* ── Stats Row ─────────────────────────────────────────────────── */}
        <div className="bg-surface rounded-[20px] border border-border/60 shadow-card-adaptive p-4 mb-6">
          <div className="flex gap-3">
            <StatPill label="Smart Notes" value={userNotes.length} color="#5AC8FA" />
            <StatPill label="Karteikarten" value={generatedFlashCards.length} color="#7C3AED" />
            <StatPill label="Lernzettel" value={lernzettel.length} color="#DB2777" />
            <StatPill label="Probeklausuren" value={savedProbeklausuren.length} color="#0891B2" />
            <StatPill label="Lerntage" value={appStats.studiedDays.length} color="#30D158" />
          </div>
        </div>

        {/* ── Recent Notes ──────────────────────────────────────────────── */}
        {recentNotes.length > 0 && (
          <div>
            <p className="section-label mb-3">Zuletzt bearbeitet</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {recentNotes.map((note) => {
                const info = note.subjectId ? SUBJECT_INFO[note.subjectId] : null
                const notePath = note.subjectId
                  ? `/unterricht/${note.subjectId}/${note.id}`
                  : `/unterricht/ohne-fach/${note.id}`
                return (
                  <button
                    key={note.id}
                    onClick={() => navigate(notePath)}
                    className="bg-surface rounded-[16px] border border-border/60 shadow-card-adaptive p-4 text-left hover:bg-surface-hover press-sm transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[16px]">{info?.icon ?? '📝'}</span>
                      <span className="text-[11px] font-semibold text-text-muted truncate flex-1">
                        {info?.name ?? 'Notiz'}
                      </span>
                      <span className="text-[10px] text-text-muted shrink-0">{getTimeAgo(note.createdAt)}</span>
                    </div>
                    <p className="text-[14px] font-semibold text-text-primary leading-snug line-clamp-2">
                      {note.title}
                    </p>
                    {note.content && (
                      <p className="text-[12px] text-text-muted mt-1 line-clamp-1 leading-snug">
                        {note.content.slice(0, 80)}
                      </p>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
