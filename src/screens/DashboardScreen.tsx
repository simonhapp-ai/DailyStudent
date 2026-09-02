import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { subjectInfo } from '../data/subjectInfo'
import { SubjectIcon } from '../components/ui/SubjectIcon'
import { getActiveStreak } from '../lib/streak'
import { StreakInfoSheet } from '../components/ui/StreakInfoSheet'
import { StundenplanPill } from '../components/ui/StundenplanPill'
import type { StundenplanSlot, Lernplan } from '../types'
import { Icon } from '../components/ui/Icon'

// ── Helpers ──────────────────────────────────────────────────────────────────

const WEEKDAYS_DE = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']
const MONTHS_FULL = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

const ERSTE_SCHRITTE_DISMISSED_KEY = 'dailystudent_erste_schritte_dismissed'

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Guten Morgen'
  if (h < 17) return 'Hallo'
  return 'Guten Abend'
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

// ── Shared card shell ─────────────────────────────────────────────────────────
// Supports onClick as a real keyboard-accessible action (role=button + Enter/Space),
// not just a mouse-only click target.

const DARK_GLOW: Record<'purple' | 'mint', string> = {
  purple: 'radial-gradient(130% 100% at 12% -10%, rgba(167,139,250,0.32) 0%, rgba(10,10,15,0) 48%), #170f22',
  mint:   'radial-gradient(130% 100% at 12% -10%, rgba(52,211,153,0.24) 0%, rgba(10,10,15,0) 48%), #0f1a17',
}

function Card({ children, className = '', onClick, dark = false, glow = 'purple' }: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  dark?: boolean
  glow?: 'purple' | 'mint'
}) {
  const interactive = !!onClick
  return (
    <div
      className={`rounded-card p-5 transition-shadow ${
        dark ? 'text-white' : 'bg-surface border border-border/60 shadow-card-adaptive'
      } ${interactive ? 'cursor-pointer press' : ''} ${className}`}
      style={dark ? {
        background: DARK_GLOW[glow],
        boxShadow: '0 24px 48px -16px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)',
      } : undefined}
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick!() } } : undefined}
    >
      {children}
    </div>
  )
}

function SectionLabel({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return <p className={`section-label mb-3.5 ${dark ? 'text-white/50' : ''}`}>{children}</p>
}

function ChevronRight({ dark = false }: { dark?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      className={dark ? 'text-white/50 shrink-0' : 'text-text-muted shrink-0'}>
      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Erste Schritte (progressive onboarding checklist) ────────────────────────

interface ErsteSchritteTask {
  key: string
  label: string
  done: boolean
  onNavigate: () => void
}

function ErsteSchritteCard({ tasks, onDismiss }: { tasks: ErsteSchritteTask[]; onDismiss: () => void }) {
  const doneCount = tasks.filter(t => t.done).length
  const pct = Math.round((doneCount / tasks.length) * 100)
  const nextTasks = tasks.filter(t => !t.done)

  return (
    <div className="bg-surface rounded-card border border-border/60 shadow-card-adaptive p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span className="text-text-primary"><Icon name="target" size={19} /></span>
          <p className="text-[15px] font-bold text-text-primary">Erste Schritte</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-bold tabular-nums" style={{ color: 'rgb(var(--color-accent))' }}>{pct}%</span>
          <button
            onClick={onDismiss}
            aria-label="Erste Schritte ausblenden"
            className="text-[12px] text-text-muted hover:text-text-secondary transition-colors press-sm"
          >
            Ausblenden
          </button>
        </div>
      </div>

      <div className="h-2 rounded-pill overflow-hidden mb-3" style={{ background: 'rgb(var(--color-border) / 0.5)' }}>
        <div className="h-full rounded-pill transition-all duration-500 bg-accent" style={{ width: `${pct}%` }} />
      </div>

      {nextTasks.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {nextTasks.map(t => (
            <button
              key={t.key}
              onClick={t.onNavigate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-background hover:bg-surface-hover press-sm transition-colors text-[12px] font-medium text-text-secondary"
            >
              {t.label}
              <ChevronRight />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Hero: active Lernplan continuation ───────────────────────────────────────

function HeroLernplanCard({
  activePlan,
  onContinue,
  onCreate,
}: {
  activePlan: Lernplan | undefined
  onContinue: () => void
  onCreate: () => void
}) {
  const studyDays = useMemo(() => {
    if (!activePlan) return []
    return activePlan.days.filter(d => (d.dayType === 'lern' || d.dayType === 'puffer') && d.sessions.length > 0)
  }, [activePlan])

  const todayStr = new Date().toISOString().slice(0, 10)
  const completed = activePlan?.completedDays ?? []
  const doneCount = studyDays.filter(d => completed.includes(d.date)).length
  const pct = studyDays.length > 0 ? Math.round((doneCount / studyDays.length) * 100) : 0
  const nextDay = studyDays.find(d => d.date >= todayStr) ?? studyDays[studyDays.length - 1]
  const mainSession = nextDay?.sessions[0]

  if (!activePlan || studyDays.length === 0) {
    return (
      <Card dark className="flex flex-col justify-center min-h-[280px]">
        <SectionLabel dark>Lernplan</SectionLabel>
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-card flex items-center justify-center shrink-0"
            style={{ background: 'var(--grad-mode)' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" strokeWidth="2.5" />
            </svg>
          </div>
          <div>
            <p className="text-[18px] font-bold">Erstelle deinen Lernplan</p>
            <p className="text-[13px] text-white/60 mt-0.5">KI plant deinen Lernweg zur nächsten Klausur</p>
          </div>
        </div>
        <button
          onClick={onCreate}
          className="mt-5 self-start px-5 py-2.5 rounded-icon btn-mode text-[13px] font-semibold press-sm"
        >
          Lernplan erstellen
        </button>
      </Card>
    )
  }

  return (
    <Card dark className="flex flex-col justify-between min-h-[280px]">
      <div>
        <div className="flex items-start justify-between mb-1">
          <SectionLabel dark>{nextDay && nextDay.date === todayStr ? 'Heute im Lernplan' : 'Nächste Lerneinheit'}</SectionLabel>
          {mainSession?.subjectId
            ? <SubjectIcon subjectId={mainSession.subjectId} size="sm" />
            : (
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-white/70"
                style={{ background: 'rgba(255,255,255,0.1)' }}
              >
                <Icon name="book" size={16} />
              </div>
            )}
        </div>
        <p className="text-[26px] font-bold leading-tight tracking-tight">{mainSession?.subjectName ?? activePlan.title}</p>
        <p className="text-[13px] text-white/60 mt-1.5 leading-snug">
          {mainSession?.topic || activePlan.summary || 'Weiter mit deinem Lernplan'}
          {nextDay && ` · ${Math.round(nextDay.totalMin / 60 * 10) / 10}h geplant`}
        </p>
      </div>

      <div>
        <div className="h-2 rounded-pill overflow-hidden mb-2.5" style={{ background: 'rgba(255,255,255,0.15)' }}>
          <div className="h-full rounded-pill transition-all duration-500 bg-accent" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-white/60">{pct}% erledigt</span>
          <button
            onClick={onContinue}
            className="px-5 py-2 rounded-btn bg-white text-[13px] font-bold text-[#0a0a0f] press-sm"
          >
            Fortsetzen
          </button>
        </div>
      </div>
    </Card>
  )
}

// ── To-Do: exam countdown + homework, split in one connected hero card ───────

function ToDoCard({
  exam,
  homeworkCount,
  onExamNavigate,
  onHomeworkNavigate,
}: {
  exam: { subjectId: string; date: string; days: number; info: { name: string; icon: string; color: string } | undefined } | null
  homeworkCount: number
  onExamNavigate: () => void
  onHomeworkNavigate: () => void
}) {
  const weeks = exam ? Math.floor(exam.days / 7) : 0
  const restDays = exam ? exam.days % 7 : 0

  // Card is always dark chrome regardless of app theme, so urgency colors are hardcoded
  // (dark-tuned) rather than the theme-conditional CSS vars — they'd read muddy in light mode.
  // Low-urgency/no-exam case is plain white, not purple — this card's glow is mint
  // (Klausurenmodus), and purple text inside a mint card mixed the two identity
  // colors in one component (fixed 31.08.2026, see feedback_no_colored_text_rule).
  const urgencyColor = exam
    ? exam.days <= 3 ? '#FF6B5F' : exam.days <= 7 ? '#FFB84D' : '#FFFFFF'
    : '#FFFFFF'

  return (
    <Card dark glow="mint" className="min-h-[280px] !p-0 overflow-hidden">
      <div className="px-5 pt-5">
        <SectionLabel dark>To-Do</SectionLabel>
      </div>
      <div className="flex" style={{ minHeight: 236 }}>
        {/* ── Exam half ── */}
        <button
          onClick={onExamNavigate}
          className="flex-1 flex flex-col items-center justify-center text-center px-4 py-4 press-sm"
        >
          {exam ? (
            <>
              <SubjectIcon subjectId={exam.subjectId} size="md" className="mb-2" />
              <p className="text-[12px] font-semibold text-white/55 mb-2 truncate max-w-full px-1">{exam.info?.name ?? exam.subjectId}</p>
              <p className="text-[32px] font-black leading-none tabular-nums tracking-tight" style={{ color: urgencyColor }}>
                {exam.days === 0 ? 'Heute' : exam.days}
              </p>
              <p className="text-[11px] text-white/45 mt-1">
                {exam.days === 0 ? '' : weeks > 0 ? `${weeks} Wo. ${restDays} Tg.` : 'Tage'}
              </p>
            </>
          ) : (
            <>
              <div className="w-11 h-11 rounded-icon flex items-center justify-center mb-2" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="3" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <p className="text-[14px] font-semibold text-white/85">Kein Termin</p>
              <p className="text-[11px] text-white/45 mt-1">Klausur eintragen →</p>
            </>
          )}
        </button>

        <div className="w-px my-6" style={{ background: 'rgba(255,255,255,0.1)' }} />

        {/* ── Homework half ── */}
        <button
          onClick={onHomeworkNavigate}
          className="flex-1 flex flex-col items-center justify-center text-center px-4 py-4 press-sm"
        >
          <div className="w-11 h-11 rounded-icon flex items-center justify-center text-[20px] mb-2" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <Icon name="note" size={26} />
          </div>
          {homeworkCount > 0 ? (
            <>
              <p className="text-[32px] font-black leading-none tabular-nums tracking-tight text-white">{homeworkCount}</p>
              <p className="text-[11px] text-white/45 mt-1">Hausaufgabe{homeworkCount === 1 ? '' : 'n'} offen</p>
            </>
          ) : (
            <>
              <p className="text-[14px] font-semibold text-white/85">Alles erledigt</p>
              <p className="text-[11px] text-white/45 mt-1">Neue Notiz erstellen →</p>
            </>
          )}
        </button>
      </div>
    </Card>
  )
}

// ── Schnellnotiz ──────────────────────────────────────────────────────────────

function SchnellnotizCard({ onClick }: { onClick: () => void }) {
  return (
    <Card className="flex items-center gap-4 min-h-[120px]" onClick={onClick}>
      <div
        className="w-12 h-12 rounded-icon flex items-center justify-center shrink-0"
        style={{ background: 'var(--grad-mode)' }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </div>
      <div>
        <p className="text-[16px] font-bold text-text-primary">Schnellnotiz</p>
        <p className="text-[12px] text-text-muted mt-0.5">Smart Note erstellen</p>
      </div>
    </Card>
  )
}

// ── Streak mini-widget ────────────────────────────────────────────────────────

function StreakMiniCard({ streak, onClick }: { streak: number; onClick: () => void }) {
  return (
    <Card className="flex flex-col items-center justify-center text-center min-h-[120px] gap-0.5" onClick={onClick}>
      <Icon name="flame" size={26} filled className="text-fill-orange" />
      <p className="text-[22px] font-black text-text-primary tabular-nums leading-none mt-1.5">{streak}</p>
      <p className="text-[11px] text-text-muted mt-0.5">{streak === 1 ? 'Tag' : 'Tage'}</p>
    </Card>
  )
}

// ── Tagesplan (today's Stundenplan) ──────────────────────────────────────────

function TagesplanCard({ slots }: { slots: StundenplanSlot[] }) {
  const now = getTimeStr()
  const nextLessonId = slots.find(s => s.startTime > now)?.id ?? null

  return (
    <Card className="min-h-[120px]">
      <div className="flex items-center justify-between mb-3">
        <SectionLabel>Tagesplan</SectionLabel>
      </div>

      {slots.length === 0 ? (
        <div className="flex items-center gap-3 py-1">
          <span className="text-text-primary"><Icon name="check" size={22} /></span>
          <div>
            <p className="text-[14px] font-bold text-text-primary">Freier Tag!</p>
            <p className="text-[12px] text-text-muted">Nutze die Zeit zum Lernen</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {slots.map((slot) => {
            const isCurrent = now >= slot.startTime && now < slot.endTime
            const isPast = now >= slot.endTime
            const isNext = !isCurrent && !isPast && slot.id === nextLessonId
            return <StundenplanPill key={slot.id} slot={slot} variant="row" isCurrent={isCurrent} isPast={isPast} isNext={isNext} />
          })}
        </div>
      )}
    </Card>
  )
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function DashboardScreen() {
  const navigate = useNavigate()
  const {
    profile, lernplaene, userNotes, generatedFlashCards, savedProbeklausuren, saveLernplan,
    appStats, completedHomeworkIds, standaloneHomework, supabaseDataLoading,
  } = useUser()

  const [ersteSchritteDismissed, setErsteSchritteDismissed] = useState(
    () => localStorage.getItem(ERSTE_SCHRITTE_DISMISSED_KEY) === 'true'
  )
  const [streakInfoOpen, setStreakInfoOpen] = useState(false)

  const today = new Date()
  const todayDayIdx = getTodayDayIndex()

  const todaySlots = useMemo(() => {
    if (!profile?.stundenplan || todayDayIdx === -1) return []
    return profile.stundenplan.slots
      .filter(s => s.day === todayDayIdx)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  }, [profile?.stundenplan, todayDayIdx])

  const nextExam = useMemo(() => {
    const upcoming = (profile?.klausurtermine ?? [])
      .map(k => ({ ...k, days: daysUntil(k.date), info: subjectInfo(k.subjectId) }))
      .filter(k => k.days >= 0 && k.info)
      .sort((a, b) => a.days - b.days)
    return upcoming[0] ?? null
  }, [profile?.klausurtermine])

  const upcomingExamsCount = useMemo(() => {
    return (profile?.klausurtermine ?? []).filter(k => { const d = daysUntil(k.date); return d >= 0 && d <= 30 }).length
  }, [profile?.klausurtermine])

  const activePlan = lernplaene.find(p => p.isActive)

  const recentNotes = useMemo(() => {
    return [...userNotes].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3)
  }, [userNotes])

  const activeStreak = getActiveStreak(appStats.streak ?? 0, appStats.lastStudyDate ?? null)

  // Same aggregation as HausaufgabenheftScreen: note-embedded homeworkItems + standaloneHomework,
  // minus whatever's already completed.
  const pendingHomework = useMemo(() => {
    const pending: { subjectId?: string; dueDate?: string }[] = []
    for (const note of userNotes) {
      for (let idx = 0; idx < (note.homeworkItems ?? []).length; idx++) {
        const item = note.homeworkItems![idx]
        const id = item.id ?? `${note.id}-hw-${idx}`
        if (!completedHomeworkIds.includes(id)) {
          pending.push({ subjectId: item.subjectId ?? note.subjectId, dueDate: item.dueDate })
        }
      }
    }
    for (const s of standaloneHomework) {
      if (!completedHomeworkIds.includes(s.id)) {
        pending.push({ subjectId: s.subjectId, dueDate: s.dueDate })
      }
    }
    return pending
  }, [userNotes, standaloneHomework, completedHomeworkIds])

  // Soonest-due item decides which subject gets preselected when jumping to "create a note" —
  // undated items sort last since there's no urgency signal to rank them by.
  const nextHomeworkSubjectId = useMemo(() => {
    const sorted = [...pendingHomework].sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return a.dueDate.localeCompare(b.dueDate)
    })
    return sorted[0]?.subjectId
  }, [pendingHomework])

  const headline = useMemo(() => {
    if (nextExam && nextExam.days <= 7) return `Noch ${nextExam.days} Tag${nextExam.days === 1 ? '' : 'e'} bis ${nextExam.info?.name ?? 'deiner Klausur'}`
    if (activePlan) return 'Weiter geht’s mit deinem Lernplan'
    if (nextExam) return `Bald steht ${nextExam.info?.name ?? 'eine Klausur'} an`
    return 'Bereit für deinen nächsten Lernschritt?'
  }, [nextExam, activePlan])

  const ersteSchritteTasks: ErsteSchritteTask[] = [
    { key: 'note', label: 'Erste Notiz erstellen', done: userNotes.length > 0, onNavigate: () => navigate('/unterricht') },
    { key: 'exam', label: 'Klausurtermin anlegen', done: (profile?.klausurtermine?.length ?? 0) > 0, onNavigate: () => navigate('/klausuren') },
    { key: 'cards', label: 'Karteikarten erstellen', done: generatedFlashCards.length > 0, onNavigate: () => navigate('/klausurmodus/karteikarten/neu') },
    { key: 'plan', label: 'Lernplan erstellen', done: lernplaene.length > 0, onNavigate: () => navigate('/klausurmodus/lernplan/neu') },
    { key: 'exam-sim', label: 'Probeklausur machen', done: savedProbeklausuren.length > 0, onNavigate: () => navigate('/klausurmodus/probeklausur') },
  ]
  // supabaseDataLoading-Gate verhindert den CLS-Sprung aus dem Nav-Audit
  // (Block 4): ohne ihn konnte die Karte kurz mit noch-leeren lokalen Daten
  // aufblitzen und dann verschwinden, sobald der echte Supabase-Stand landet.
  const showErsteSchritte = !supabaseDataLoading && !ersteSchritteDismissed && ersteSchritteTasks.some(t => !t.done)

  const handleDismissErsteSchritte = () => {
    localStorage.setItem(ERSTE_SCHRITTE_DISMISSED_KEY, 'true')
    setErsteSchritteDismissed(true)
  }

  const handleContinuePlan = () => {
    if (!activePlan) { navigate('/klausurmodus/lernplan/neu'); return }
    const studyDays = activePlan.days.filter(d => (d.dayType === 'lern' || d.dayType === 'puffer') && d.sessions.length > 0)
    const todayStr = today.toISOString().slice(0, 10)
    const nextDay = studyDays.find(d => d.date >= todayStr)
    if (nextDay) {
      const completed = [...new Set([...(activePlan.completedDays ?? []), nextDay.date])]
      saveLernplan({ ...activePlan, completedDays: completed })
    }
    navigate(`/klausurmodus/lernplan/${activePlan.id}`)
  }

  return (
    <div className="min-h-dvh bg-background pb-20" style={{ paddingTop: 'max(40px, calc(env(safe-area-inset-top, 0px) + 20px))' }}>
      <div className="px-6 md:px-8">

        {/* ── Greeting ─────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-[13px] text-text-muted">{getGreeting()}, {profile?.name?.split(' ')[0] ?? 'Student'}</p>
            <h1 className="text-[30px] font-bold text-text-primary mt-0.5 leading-[1.15] tracking-tight">{headline}</h1>
            <p className="text-[13px] text-text-muted mt-1">{formatDateFull(today)}</p>
          </div>
          {upcomingExamsCount > 0 && (
            <span
              className="shrink-0 flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-pill whitespace-nowrap"
              style={{ background: 'rgb(var(--color-accent) / 0.1)', color: 'rgb(var(--color-accent))' }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--grad-mode)' }} />
              {upcomingExamsCount} Klausur{upcomingExamsCount === 1 ? '' : 'en'} in Sicht
            </span>
          )}
        </div>

        {/* ── Erste Schritte ───────────────────────────────────────────── */}
        {showErsteSchritte && (
          <ErsteSchritteCard tasks={ersteSchritteTasks} onDismiss={handleDismissErsteSchritte} />
        )}

        {/* ── Row 1: Lernplan-Hero + Klausur ────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
          <div className="lg:col-span-7">
            <HeroLernplanCard
              activePlan={activePlan}
              onContinue={handleContinuePlan}
              onCreate={() => navigate('/klausurmodus/lernplan/neu')}
            />
          </div>
          <div className="lg:col-span-5">
            <ToDoCard
              exam={nextExam}
              homeworkCount={pendingHomework.length}
              onExamNavigate={() => navigate(nextExam ? '/klausurmodus' : '/kalender')}
              onHomeworkNavigate={() => navigate(nextHomeworkSubjectId ? `/unterricht/${nextHomeworkSubjectId}/neue-notiz` : '/unterricht/neue-notiz')}
            />
          </div>
        </div>

        {/* ── Row 2: Schnellnotiz + Streak + Tagesplan ──────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6">
          <div className="lg:col-span-3">
            <SchnellnotizCard onClick={() => navigate('/unterricht')} />
          </div>
          <div className="lg:col-span-2">
            <StreakMiniCard streak={activeStreak} onClick={() => setStreakInfoOpen(true)} />
          </div>
          <div className="lg:col-span-7">
            <TagesplanCard slots={todaySlots} />
          </div>
        </div>

        {/* ── Recent Notes ──────────────────────────────────────────────── */}
        {recentNotes.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="section-label">Letzte Notizen</p>
              <button onClick={() => navigate('/unterricht')} className="text-[12px] font-semibold press-sm" style={{ color: 'rgb(var(--color-accent))' }}>
                Alle ansehen
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-3 gap-y-6 pt-1 pb-2 px-1">
              {recentNotes.map((note) => {
                const info = note.subjectId ? subjectInfo(note.subjectId) : null
                const notePath = note.subjectId ? `/unterricht/${note.subjectId}/${note.id}` : `/unterricht/ohne-fach/${note.id}`
                return (
                  <button key={note.id} onClick={() => navigate(notePath)} className="relative block text-left press-sm" style={{ minHeight: 128 }}>
                    {/* Back layer 2 — furthest back, most rotated, softest */}
                    <div
                      className="absolute inset-0 bg-surface rounded-card border border-border/40"
                      style={{ transform: 'rotate(5deg) translate(3px, 3px)', boxShadow: '0 2px 6px rgba(0,0,0,0.04)', opacity: 0.55 }}
                    />
                    {/* Back layer 1 */}
                    <div
                      className="absolute inset-0 bg-surface rounded-card border border-border/50"
                      style={{ transform: 'rotate(2.5deg) translate(1.5px, 1.5px)', boxShadow: '0 3px 8px rgba(0,0,0,0.06)', opacity: 0.8 }}
                    />
                    {/* Front card — actual content */}
                    <div className="relative bg-surface rounded-card border border-border/60 shadow-card-adaptive p-4 h-full flex flex-col justify-between hover:bg-surface-hover transition-colors">
                      <div className="flex items-center justify-between gap-2">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgb(var(--color-text-primary))' }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-bg))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /><path d="M9 13h6M9 17h4" />
                          </svg>
                        </div>
                        <span className="text-[11px] font-semibold text-text-muted bg-background px-2.5 py-1 rounded-pill truncate">
                          {(info?.name ?? 'Notiz').toUpperCase()}
                        </span>
                      </div>
                      <div className="mt-3">
                        <p className="text-[14px] font-semibold text-text-primary leading-snug line-clamp-2">{note.title}</p>
                        <p className="text-[12px] text-text-muted mt-1">{getTimeAgo(note.createdAt)}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
      <StreakInfoSheet isOpen={streakInfoOpen} onClose={() => setStreakInfoOpen(false)} />
    </div>
  )
}
