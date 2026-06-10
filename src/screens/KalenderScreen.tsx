import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser, type EntryType, type PersonalEntry, type KlausurTermin } from '../context/UserContext'
import { SUBJECT_INFO, getTopicPlaceholder } from '../data/subjectInfo'
import { topics } from '../data/mockData'
import type { StundenplanSlot, Stundenplan, AbiHalbjahr, UserNote } from '../types'
import type { StandaloneHomeworkItem } from '../context/UserContext'
import { totalPunkteAllHalbjahre, pktToNoteAbi, noteColorAbi } from './AbiRechnerScreen'
import { parseStundenplanFromImage } from '../lib/groq'
import { LernvorschlagWidget } from '../components/ui/LernvorschlagWidget'

function getCurrentStreak(streak: number, lastStudyDate: string | null): number {
  if (!lastStudyDate) return 0
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return lastStudyDate === today || lastStudyDate === yesterday.toISOString().slice(0, 10)
    ? streak : 0
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const MONTHS_DE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
const MONTHS_SHORT = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

const TYPE_CONFIG: Record<EntryType, { label: string; icon: string; color: string; grad: string }> = {
  lerneinheit: { label: 'Lernzeit',  icon: '📚', color: '#34C759', grad: 'linear-gradient(135deg,#34C759,#28a745)' },
  termin:      { label: 'Termin',    icon: '📅', color: '#007AFF', grad: 'linear-gradient(135deg,#007AFF,#0055cc)' },
  erinnerung:  { label: 'Sonstiges', icon: '🔔', color: '#FF9500', grad: 'linear-gradient(135deg,#FF9500,#e07b00)' },
}

const PX_PER_HOUR = 56
const START_H = 0
const END_H = 24
const TOTAL_H = END_H - START_H

type RecurFreq = 'daily' | 'weekly' | 'monthly'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
}

function getWeekDays(ref: Date = new Date()): Date[] {
  const dow = ref.getDay()
  const mon = new Date(ref)
  mon.setDate(ref.getDate() - (dow === 0 ? 6 : dow - 1))
  mon.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return d })
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getGreeting(name: string): string {
  const h = new Date().getHours()
  return `${h < 12 ? 'Guten Morgen' : h < 17 ? 'Guten Tag' : 'Guten Abend'}, ${name}`
}

function toPx(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return ((h * 60 + m - START_H * 60) / 60) * PX_PER_HOUR
}

function minToPx(minutes: number): number {
  return ((minutes - START_H * 60) / 60) * PX_PER_HOUR
}

function durToPx(min: number): number { return (min / 60) * PX_PER_HOUR }

function getDaysInMonth(y: number, m: number): number { return new Date(y, m + 1, 0).getDate() }

function firstDayOffset(y: number, m: number): number {
  const d = new Date(y, m, 1).getDay(); return d === 0 ? 6 : d - 1
}

function dayLabelIdx(d: Date): number { const dow = d.getDay(); return dow === 0 ? 6 : dow - 1 }

function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + mins
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function timeToMin(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function generateRecurring(
  form: { title: string; type: EntryType; date: string; time: string; endTime?: string },
  freq: RecurFreq,
  endDate: string,
): PersonalEntry[] {
  const result: PersonalEntry[] = []
  const end = new Date(endDate + 'T00:00:00')
  let cur = new Date(form.date + 'T00:00:00')
  const base = Date.now()
  while (cur <= end && result.length < 365) {
    result.push({ id: `${base}-${result.length}`, title: form.title.trim(), type: form.type, date: toDateStr(cur), time: form.time, endTime: form.endTime })
    if (freq === 'daily') cur = addDays(cur, 1)
    else if (freq === 'weekly') cur = addDays(cur, 7)
    else cur = new Date(cur.getFullYear(), cur.getMonth() + 1, cur.getDate())
  }
  return result
}

// ─── Premium icon helpers ─────────────────────────────────────────────────────

function ChevronLeft({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
function ChevronRight({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
function CloseIcon({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" /></svg>
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export function KalenderScreen() {
  const { profile, personalEntries, addEntry, removeEntry, updateProfile, addKlausurtermin, userNotes, completedHomeworkIds, standaloneHomework, appStats } = useUser()
  const activeStreak = getCurrentStreak(appStats.streak, appStats.lastStudyDate)

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const todayStr = toDateStr(today)

  // Desktop detection (responsive layout)
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 1024)
  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 1024)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  // Calendar
  const [calOpen, setCalOpen]   = useState(() => window.innerWidth >= 1024)
  const [calView, setCalView]   = useState<'twoday' | 'month' | 'year'>('twoday')
  const [viewDate, setViewDate] = useState(new Date(today))
  const [showStundenplan, setShowStundenplan] = useState<boolean>(() => {
    const v = localStorage.getItem('lernapp_stundenplan_visible')
    return v === null ? true : v === 'true'
  })
  const toggleStundenplan = () => {
    const next = !showStundenplan
    setShowStundenplan(next)
    localStorage.setItem('lernapp_stundenplan_visible', String(next))
  }

  // Add-entry modal (FAB)
  type FormType = EntryType | 'klausur'
  const [fabOpen,     setFabOpen]     = useState(false)
  const [fabAnimated, setFabAnimated] = useState(false)
  const [addForm, setAddForm] = useState<{ title: string; type: FormType; date: string; time: string; endTime: string; klausurSubjectId: string; klausurTopic: string }>({
    title: '', type: 'termin', date: todayStr, time: '', endTime: '', klausurSubjectId: '', klausurTopic: '',
  })
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurFreq,   setRecurFreq]   = useState<RecurFreq>('weekly')
  const [recurEnd,    setRecurEnd]    = useState('')


  // Entry detail
  const [selectedEntry, setSelectedEntry] = useState<PersonalEntry | null>(null)
  const [detailAnimated, setDetailAnimated] = useState(false)

  // Stundenplan views
  const [spViewOpen, setSpViewOpen] = useState(false)
  const [spEditOpen, setSpEditOpen] = useState(false)

  const hasStundenplan = (profile?.stundenplan?.slots?.length ?? 0) > 0

  // ── FAB open/close ──────────────────────────────────────────
  const openFab = (date = todayStr, time = '', type: FormType = 'termin') => {
    const endTime = time ? addMinutes(time, 60) : ''
    setAddForm({ title: '', type, date, time, endTime, klausurSubjectId: '', klausurTopic: '' })
    setIsRecurring(false)
    setRecurFreq('weekly')
    setRecurEnd(toDateStr(addDays(new Date(), 90)))
    setFabOpen(true)
    requestAnimationFrame(() => requestAnimationFrame(() => setFabAnimated(true)))
  }

  const closeFab = () => {
    setFabAnimated(false)
    setTimeout(() => setFabOpen(false), 220)
  }

  const handleAdd = () => {
    if (addForm.type === 'klausur') {
      if (!addForm.klausurSubjectId || !addForm.date) return
      addKlausurtermin({ subjectId: addForm.klausurSubjectId, date: addForm.date, topic: addForm.klausurTopic || undefined })
    } else {
      if (!addForm.title.trim()) return
      const entry = { id: Date.now().toString(), title: addForm.title.trim(), type: addForm.type as EntryType, date: addForm.date, time: addForm.time, endTime: addForm.endTime || undefined }
      if (isRecurring && recurEnd) {
        generateRecurring(entry, recurFreq, recurEnd).forEach((e) => addEntry(e))
      } else {
        addEntry(entry)
      }
    }
    closeFab()
  }


  // ── Entry detail open/close ──────────────────────────────────
  const openDetail = (entry: PersonalEntry) => {
    setSelectedEntry(entry)
    requestAnimationFrame(() => requestAnimationFrame(() => setDetailAnimated(true)))
  }

  const closeDetail = () => {
    setDetailAnimated(false)
    setTimeout(() => setSelectedEntry(null), 200)
  }

  const goToToday = () => { setViewDate(new Date(today)); setCalView('twoday') }

  // ── Pre-compute collapsed calendar data ──────────────────────
  const calWeekDays = getWeekDays(today)
  type CPill = { time: string; label: string; color: string; icon: string }
  const calPills: CPill[] = [
    ...personalEntries.filter((e) => e.date === todayStr).map((e) => ({ time: e.time || '', label: e.title, color: TYPE_CONFIG[e.type].color, icon: TYPE_CONFIG[e.type].icon })),
    ...(profile?.klausurtermine ?? []).filter((k) => k.date === todayStr).map((k) => ({ time: '', label: `Klausur: ${SUBJECT_INFO[k.subjectId]?.name ?? k.subjectId}`, color: '#FF3B30', icon: '📝' })),
  ].sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99')).slice(0, 3)

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen bg-background pb-28 lg:h-screen lg:overflow-hidden lg:pb-0">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="px-4 lg:px-6 shrink-0" style={{ paddingTop: 'max(58px, calc(env(safe-area-inset-top, 0px) + 18px))' }}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[13px] text-text-muted">
              {today.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <h1 className="text-[28px] font-bold text-text-primary mt-0.5 leading-tight">
              {getGreeting(profile?.name ?? 'Max')}
            </h1>
          </div>
          <span className="mt-1 shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-pill bg-warning/10 text-warning font-bold text-[13px] whitespace-nowrap">
            <span>🔥</span>
            <span>{activeStreak}</span>
          </span>
        </div>
      </div>

      {/* ── 2-column layout on desktop ──────────────────────── */}
      <div className="px-4 mt-5 lg:flex lg:gap-5 lg:flex-1 lg:min-h-0 lg:px-6 lg:overflow-hidden lg:pb-6">

        {/* ── RIGHT COLUMN (desktop) / TOP (mobile): Calendar ── */}
        <div className="lg:flex-1 lg:order-2 lg:overflow-hidden lg:flex lg:flex-col">

        {/* ── Kalender Widget (inline accordion) ──────────────── */}
        <div className="bg-surface border border-border/60 rounded-2xl shadow-card-adaptive overflow-hidden lg:flex-1 lg:flex lg:flex-col lg:overflow-hidden">

          {/* Collapsed header — mobile only */}
          <button
            onClick={() => setCalOpen((o) => !o)}
            className="w-full px-4 pt-4 pb-3 text-left transition-colors hover:bg-surface-hover lg:hidden"
          >
            <p className="text-[13px] font-semibold text-text-muted mb-3">
              {today.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            {/* Week strip */}
            <div className="flex gap-1 mb-3">
              {calWeekDays.map((d, i) => {
                const isToday = toDateStr(d) === todayStr
                const dayStr = toDateStr(d)
                const hasKlausur = (profile?.klausurtermine ?? []).some((k) => k.date === dayStr)
                const hasEntry = personalEntries.some((e) => e.date === dayStr)
                return (
                  <div key={i} className={`flex-1 flex flex-col items-center py-2 rounded-[12px] relative ${isToday ? 'grad-accent' : ''}`}>
                    <span className={`text-[10px] font-semibold ${isToday ? 'text-white/80' : 'text-text-muted'}`}>{DAY_LABELS[i]}</span>
                    <span className={`text-[14px] font-bold mt-0.5 leading-none ${isToday ? 'text-white' : 'text-text-secondary'}`}>{d.getDate()}</span>
                    {hasKlausur && <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isToday ? 'rgba(255,255,255,0.9)' : '#FF3B30' }} />}
                    {!hasKlausur && hasEntry && <span className="absolute bottom-1 w-1 h-1 rounded-full" style={{ backgroundColor: isToday ? 'rgba(255,255,255,0.7)' : 'rgb(var(--color-accent))' }} />}
                  </div>
                )
              })}
            </div>
            {/* Today's events */}
            {calPills.length === 0 ? (
              <p className="text-text-muted text-[12px] italic">Heute keine Einträge</p>
            ) : (
              <div className="space-y-1.5">
                {calPills.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-sm shrink-0">{p.icon}</span>
                    <span className="text-[13px] font-medium text-text-primary truncate flex-1">{p.label}</span>
                    {p.time && <span className="text-[11px] text-text-muted shrink-0 tabular-nums">{p.time}</span>}
                  </div>
                ))}
              </div>
            )}
            {/* Chevron */}
            <div className="flex justify-end items-center gap-1 mt-2.5 text-text-muted">
              <span className="text-[11px]">{calOpen ? 'Einklappen' : 'Aufklappen'}</span>
              <svg
                width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                className="transition-transform duration-300"
                style={{ transform: calOpen ? 'rotate(180deg)' : 'none' }}
              >
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </button>

          {/* Expandable section */}
          <div
            className={`overflow-hidden${isDesktop ? ' flex-1 min-h-0' : ''}`}
            style={{
              maxHeight: isDesktop ? 'none' : calOpen ? '540px' : '0',
              transition: isDesktop ? 'none' : 'max-height 0.38s cubic-bezier(0.4,0,0.2,1)',
            }}
          >
            <div className="border-t border-border/30 flex flex-col" style={{ height: isDesktop ? '100%' : 540 }}>

              {/* View toggle + collapse button */}
              <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0">
                <div className="flex items-center gap-0.5 bg-background rounded-[11px] p-[3px]">
                  {(['twoday', 'month', 'year'] as const).map((view, i) => (
                    <button
                      key={view}
                      onClick={() => setCalView(view)}
                      className="px-4 py-1.5 rounded-[8px] text-[12px] font-bold transition-all duration-200 press-sm"
                      style={calView === view ? {
                        background: 'linear-gradient(135deg, rgb(var(--color-accent)), rgba(var(--color-accent),0.8))',
                        color: 'white',
                        boxShadow: '0 2px 8px rgba(var(--color-accent),0.35)',
                      } : { color: 'rgb(var(--color-text-muted))' }}
                    >
                      {['2T', 'M', 'J'][i]}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  {calView === 'twoday' && (
                    <button
                      onClick={toggleStundenplan}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-[9px] text-[11px] font-bold transition-all press-sm"
                      style={showStundenplan ? {
                        background: 'rgba(var(--color-accent), 0.12)',
                        color: 'rgb(var(--color-accent))',
                      } : {
                        background: 'rgba(var(--color-border), 0.5)',
                        color: 'rgb(var(--color-text-muted))',
                      }}
                    >
                      📅 Stundenplan
                    </button>
                  )}
                  <button
                    onClick={() => {
                      const now = new Date()
                      const h = now.getMinutes() >= 30 ? Math.min(now.getHours() + 1, 23) : now.getHours()
                      openFab(todayStr, `${String(h).padStart(2, '0')}:00`)
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-[11px] text-[12px] font-bold press-sm"
                    style={{
                      background: 'linear-gradient(135deg, #7C3AED, #9F5FFA, #7C3AED)',
                      backgroundSize: '200% 200%',
                      color: 'white',
                      boxShadow: '0 0 16px 3px rgba(124,58,237,0.55), 0 3px 10px rgba(124,58,237,0.4)',
                      border: '1px solid rgba(159,95,250,0.5)',
                    }}
                  >
                    + Eintrag
                  </button>
                </div>
              </div>

              {/* Date strip (2T only) */}
              {calView === 'twoday' && (
                <DateStrip
                  viewDate={viewDate}
                  todayStr={todayStr}
                  onDaySelect={(d) => setViewDate(d)}
                  onPrevWeek={() => setViewDate((v) => addDays(v, -2))}
                  onNextWeek={() => setViewDate((v) => addDays(v, 2))}
                />
              )}

              {/* Calendar content */}
              <div className="flex-1 overflow-hidden min-h-0">
                {calView === 'twoday' && (
                  <TwoDayView
                    viewDate={viewDate} todayStr={todayStr}
                    stundenplan={profile?.stundenplan}
                    personalEntries={personalEntries}
                    klausurtermine={profile?.klausurtermine ?? []}
                    calOpen={calOpen}
                    showStundenplan={showStundenplan}
                    onSlotPress={(dateStr, time) => openFab(dateStr, time)}
                    onEntryPress={openDetail}
                  />
                )}
                {calView === 'month' && (
                  <MonthView
                    viewDate={viewDate} todayStr={todayStr}
                    personalEntries={personalEntries}
                    klausurtermine={profile?.klausurtermine ?? []}
                    onNavigate={(off) => setViewDate((v) => new Date(v.getFullYear(), v.getMonth() + off, 1))}
                    onDayPress={(d) => { setViewDate(d); setCalView('twoday') }}
                  />
                )}
                {calView === 'year' && (
                  <YearView
                    viewDate={viewDate} todayStr={todayStr}
                    personalEntries={personalEntries}
                    klausurtermine={profile?.klausurtermine ?? []}
                    onNavigate={(off) => setViewDate((v) => new Date(v.getFullYear() + off, v.getMonth(), 1))}
                    onMonthPress={(d) => { setViewDate(d); setCalView('month') }}
                  />
                )}
              </div>

              {/* Bottom bar */}
              <div className="px-4 py-2.5 border-t border-border/40 shrink-0 flex items-center justify-between">
                <button
                  onClick={goToToday}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-[11px] text-white text-[12px] font-bold press-sm"
                  style={{
                    background: 'linear-gradient(135deg, #7C3AED, #9F5FFA, #7C3AED)',
                    backgroundSize: '200% 200%',
                    boxShadow: '0 0 16px 3px rgba(124,58,237,0.55), 0 3px 10px rgba(124,58,237,0.4)',
                    border: '1px solid rgba(159,95,250,0.5)',
                  }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Heute
                </button>
                <span className="text-text-muted text-[10px]">Leere Stelle tippen → Eintrag</span>
              </div>
            </div>
          </div>
        </div>
        </div>{/* end right column */}

        {/* ── LEFT COLUMN (desktop) / BELOW calendar (mobile) ── */}
        <div className="space-y-3 mt-4 lg:mt-0 lg:w-[40%] lg:min-w-[360px] lg:shrink-0 lg:order-1 lg:overflow-y-auto lg:pb-4">

        {/* ── Row 1: Hausaufgaben + Klausuren ──────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <HausaufgabenWidget
            userNotes={userNotes}
            completedHomeworkIds={completedHomeworkIds}
            standaloneHomework={standaloneHomework}
          />
          <KlausurterminWidget klausurtermine={profile?.klausurtermine ?? []} />
        </div>

        {/* ── Row 2: Lernplan + Notenrechner ───────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <LernplanWidget />
          <AbiRechnerWidget abiHalbjahre={profile?.abiHalbjahre} zielnote={profile?.zielnote} />
        </div>

        {/* ── Stundenplan (full week, full-width) ──────────────── */}
        {hasStundenplan ? (
          <StundenplanWeekWidget
            stundenplan={profile!.stundenplan!}
            onOpen={() => setSpViewOpen(true)}
          />
        ) : (
          <StundenplanSetupCard onSetup={() => setSpEditOpen(true)} fullWidth />
        )}

        {/* ── KI-Lernvorschlag ─────────────────────────────────── */}
        <section>
          <h2 className="section-label mb-3">Lernvorschlag für heute</h2>
          <LernvorschlagWidget />
        </section>

        </div>{/* end left column */}

      </div>{/* end 2-column container */}

      {/* ══════════════════════════════════════════════════════════
          FAB Modal — pops from button, top-anchored for keyboard stability
         ══════════════════════════════════════════════════════════ */}
      {fabOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-[44] bg-black/35" onClick={closeFab} />

          {/* Modal card — top-anchored so keyboard doesn't push it */}
          <div
            className="fixed z-[45] bg-surface rounded-2xl shadow-float overflow-hidden"
            style={{
              top: 'max(60px, calc(env(safe-area-inset-top, 0px) + 52px))',
              left: 16,
              right: 16,
              maxHeight: 'calc(100vh - 180px)',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              transformOrigin: 'bottom right',
              transform: fabAnimated ? 'scale(1)' : 'scale(0.12)',
              opacity: fabAnimated ? 1 : 0,
              transition: 'transform 0.28s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s ease',
            }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border/40">
              <h2 className="text-[17px] font-bold text-text-primary">Eintrag hinzufügen</h2>
              <button onClick={closeFab} className="w-8 h-8 rounded-full bg-surface-hover flex items-center justify-center text-text-muted press-sm">
                <CloseIcon />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">

              {/* ── Type selector */}
              <div className="grid grid-cols-4 gap-1.5">
                {(Object.entries(TYPE_CONFIG) as [EntryType, typeof TYPE_CONFIG[EntryType]][]).map(([type, cfg]) => {
                  const active = addForm.type === type
                  return (
                    <button
                      key={type}
                      onClick={() => setAddForm((f) => ({ ...f, type }))}
                      className="py-2.5 rounded-[12px] text-[10px] font-bold flex flex-col items-center justify-center gap-0.5 border transition-all duration-200 press-sm"
                      style={active ? { background: cfg.grad, borderColor: 'transparent', color: 'white', boxShadow: `0 4px 12px ${cfg.color}50` } : { borderColor: 'rgba(var(--color-border),0.6)', color: 'rgb(var(--color-text-secondary))' }}
                    >
                      <span>{cfg.icon}</span>
                      <span>{cfg.label}</span>
                    </button>
                  )
                })}
                {(() => {
                  const active = addForm.type === 'klausur'
                  return (
                    <button
                      onClick={() => setAddForm((f) => ({ ...f, type: 'klausur' }))}
                      className="py-2.5 rounded-[12px] text-[10px] font-bold flex flex-col items-center justify-center gap-0.5 border transition-all duration-200 press-sm"
                      style={active ? { background: 'linear-gradient(135deg,#FF3B30,#CC2E28)', borderColor: 'transparent', color: 'white', boxShadow: '0 4px 12px #FF3B3050' } : { borderColor: 'rgba(var(--color-border),0.6)', color: 'rgb(var(--color-text-secondary))' }}
                    >
                      <span>📝</span>
                      <span>Klausur</span>
                    </button>
                  )
                })()}
              </div>

              {/* ── Klausur form */}
              {addForm.type === 'klausur' && (
                <KlausurFormFields
                  faecher={profile?.faecher ?? []}
                  subjectId={addForm.klausurSubjectId}
                  topic={addForm.klausurTopic}
                  date={addForm.date}
                  onSubjectId={(v) => setAddForm((f) => ({ ...f, klausurSubjectId: v }))}
                  onTopic={(v) => setAddForm((f) => ({ ...f, klausurTopic: v }))}
                  onDate={(v) => setAddForm((f) => ({ ...f, date: v }))}
                />
              )}

              {/* ── Regular entry form */}
              {addForm.type !== 'klausur' && (
                <>
                  <input
                    type="text"
                    value={addForm.title}
                    onChange={(e) => setAddForm((f) => ({ ...f, title: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    placeholder={
                      addForm.type === 'lerneinheit' ? 'z.B. Geschichte Karteikarten' :
                      addForm.type === 'termin' ? 'z.B. Nachhilfe bei Frau Müller' : 'z.B. Lernplan aktualisieren'
                    }
                    className="w-full bg-background border border-border rounded-[12px] px-4 py-3 text-[14px] text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
                  />

                  {/* Date + Von/Bis */}
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={addForm.date}
                      onChange={(e) => setAddForm((f) => ({ ...f, date: e.target.value }))}
                      className="flex-1 bg-background border border-border rounded-[12px] px-3 py-2.5 text-[13px] text-text-primary focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <p className="text-[9px] font-bold text-text-muted uppercase tracking-wider mb-1">Von</p>
                      <input
                        type="time"
                        value={addForm.time}
                        onChange={(e) => {
                          const t = e.target.value
                          setAddForm((f) => ({ ...f, time: t, endTime: t ? addMinutes(t, 60) : '' }))
                        }}
                        className="w-full bg-background border border-border rounded-[12px] px-3 py-2.5 text-[13px] text-text-primary focus:outline-none focus:border-accent transition-colors"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-[9px] font-bold text-text-muted uppercase tracking-wider mb-1">Bis</p>
                      <input
                        type="time"
                        value={addForm.endTime}
                        onChange={(e) => setAddForm((f) => ({ ...f, endTime: e.target.value }))}
                        className="w-full bg-background border border-border rounded-[12px] px-3 py-2.5 text-[13px] text-text-primary focus:outline-none focus:border-accent transition-colors"
                      />
                    </div>
                  </div>
                </>
              )}


              {/* ── Recurring toggle — only for regular entries */}
              {addForm.type !== 'klausur' && <div>
                <div className="flex gap-1.5 mb-3 p-1 bg-background rounded-[12px]">
                  {([false, true] as const).map((val) => {
                    const active = isRecurring === val
                    return (
                      <button
                        key={String(val)}
                        onClick={() => setIsRecurring(val)}
                        className="flex-1 py-2.5 rounded-[9px] text-[12px] font-bold transition-all duration-200 press-sm"
                        style={active ? {
                          background: 'linear-gradient(135deg, #7C3AED, #9F5FFA)',
                          color: 'white',
                          boxShadow: '0 3px 10px rgba(124,58,237,0.38)',
                        } : {
                          color: 'rgb(var(--color-text-secondary))',
                          background: 'rgba(var(--color-border),0.35)',
                        }}
                      >
                        {val ? '🔁 Wiederkehrend' : '📌 Einmalig'}
                      </button>
                    )
                  })}
                </div>

                {/* Recurring options */}
                {isRecurring && (
                  <div className="space-y-2.5 bg-background rounded-[12px] p-3 border border-border/40">
                    <div>
                      <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Häufigkeit</p>
                      <div className="flex gap-1.5 p-0.5 bg-surface rounded-[10px]">
                        {(['daily', 'weekly', 'monthly'] as RecurFreq[]).map((f) => {
                          const label = f === 'daily' ? 'Täglich' : f === 'weekly' ? 'Wöchentlich' : 'Monatlich'
                          const active = recurFreq === f
                          return (
                            <button
                              key={f}
                              onClick={() => setRecurFreq(f)}
                              className="flex-1 py-1.5 rounded-[8px] text-[11px] font-bold transition-all press-sm"
                              style={active ? {
                                background: 'linear-gradient(135deg, rgb(var(--color-accent)), rgba(var(--color-accent),0.78))',
                                color: 'white',
                                boxShadow: '0 2px 6px rgba(var(--color-accent),0.35)',
                              } : { color: 'rgb(var(--color-text-muted))', background: 'transparent' }}
                            >
                              {label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Bis</p>
                      <input
                        type="date"
                        value={recurEnd}
                        onChange={(e) => setRecurEnd(e.target.value)}
                        className="w-full bg-surface border border-border rounded-[10px] px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-accent transition-colors"
                      />
                    </div>
                  </div>
                )}
              </div>}

              {/* ── Submit */}
              {(() => {
                const canAdd = addForm.type === 'klausur'
                  ? !!(addForm.klausurSubjectId && addForm.date)
                  : !!addForm.title.trim()
                return (
                  <button
                    onClick={handleAdd}
                    disabled={!canAdd}
                    className="w-full py-3 rounded-[14px] text-white text-[15px] font-bold press-sm disabled:opacity-40 transition-all"
                    style={{
                      background: addForm.type === 'klausur'
                        ? 'linear-gradient(135deg,#FF3B30,#CC2E28)'
                        : 'linear-gradient(135deg, rgb(var(--color-accent)), rgba(var(--color-accent),0.8))',
                      boxShadow: canAdd ? '0 4px 16px rgba(var(--color-accent),0.4)' : 'none',
                    }}
                  >
                    {addForm.type === 'klausur' ? 'Klausur eintragen' : isRecurring ? 'Wiederkehrend speichern' : 'Hinzufügen'}
                  </button>
                )
              })()}
            </div>
          </div>

          {/* FAB becomes X while modal is open */}
          <button
            onClick={closeFab}
            className="fixed bottom-[100px] right-5 w-14 h-14 rounded-full flex items-center justify-center z-[46] press-sm"
            style={{
              background: 'linear-gradient(145deg, rgb(var(--color-accent)), rgba(var(--color-accent),0.75))',
              boxShadow: '0 8px 24px rgba(var(--color-accent),0.45), 0 2px 8px rgba(0,0,0,0.2)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </>
      )}


      {/* ══════════════════════════════════════════════════════════
          Entry Detail Modal — fixed overlay, no layout shift
         ══════════════════════════════════════════════════════════ */}
      {selectedEntry && (
        <>
          <div className="fixed inset-0 z-[50] bg-black/40" onClick={closeDetail} />
          <div
            className="fixed inset-x-4 z-[51] bg-surface rounded-2xl shadow-float overflow-hidden"
            style={{
              top: '22%',
              transformOrigin: 'center center',
              transform: detailAnimated ? 'scale(1)' : 'scale(0.85)',
              opacity: detailAnimated ? 1 : 0,
              transition: 'transform 0.2s cubic-bezier(0.34,1.2,0.64,1), opacity 0.18s ease',
            }}
          >
            {/* Header */}
            <div
              className="px-5 py-4 flex items-center gap-3"
              style={{ background: `linear-gradient(135deg, ${TYPE_CONFIG[selectedEntry.type].color}20, ${TYPE_CONFIG[selectedEntry.type].color}08)` }}
            >
              <div
                className="w-12 h-12 rounded-[14px] flex items-center justify-center text-2xl shrink-0"
                style={{ background: `linear-gradient(135deg, ${TYPE_CONFIG[selectedEntry.type].color}35, ${TYPE_CONFIG[selectedEntry.type].color}15)` }}
              >
                {TYPE_CONFIG[selectedEntry.type].icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-text-primary font-bold text-[17px] leading-tight truncate">{selectedEntry.title}</p>
                <p className="text-text-muted text-[12px] mt-0.5">
                  {new Date(selectedEntry.date + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <button onClick={closeDetail} className="w-8 h-8 rounded-full bg-surface-hover flex items-center justify-center text-text-muted press-sm shrink-0">
                <CloseIcon />
              </button>
            </div>

            {/* Details */}
            <div className="px-5 py-4 space-y-3">
              {selectedEntry.time && (
                <div className="flex items-center gap-3 bg-background rounded-[12px] px-4 py-3">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted shrink-0">
                    <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-text-primary font-semibold text-[14px]">
                    {selectedEntry.time} Uhr{selectedEntry.endTime ? ` – ${selectedEntry.endTime} Uhr` : ''}
                    {selectedEntry.endTime && selectedEntry.time && (() => {
                      const mins = timeToMin(selectedEntry.endTime) - timeToMin(selectedEntry.time)
                      if (mins > 0) return <span className="text-text-muted text-[12px] ml-2">({mins} Min)</span>
                      return null
                    })()}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-3 bg-background rounded-[12px] px-4 py-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted shrink-0">
                  <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
                </svg>
                <span
                  className="text-[12px] font-semibold px-2 py-0.5 rounded-pill"
                  style={{ backgroundColor: `${TYPE_CONFIG[selectedEntry.type].color}18`, color: TYPE_CONFIG[selectedEntry.type].color }}
                >
                  {TYPE_CONFIG[selectedEntry.type].label}
                </span>
              </div>

              {/* Delete */}
              <button
                onClick={() => { removeEntry(selectedEntry.id); closeDetail() }}
                className="w-full py-3 rounded-[12px] border text-[14px] font-bold transition-all press-sm mt-1"
                style={{
                  borderColor: 'rgba(var(--color-danger), 0.3)',
                  color: 'rgb(var(--color-danger))',
                  background: 'rgba(var(--color-danger), 0.05)',
                }}
              >
                Eintrag löschen
              </button>
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════
          Stundenplan Full View Overlay
         ══════════════════════════════════════════════════════════ */}
      {spViewOpen && (
        <StundenplanFullView
          stundenplan={profile!.stundenplan!}
          onClose={() => setSpViewOpen(false)}
          onEdit={() => setSpEditOpen(true)}
        />
      )}

      {/* ══════════════════════════════════════════════════════════
          Stundenplan Edit Overlay (full screen)
         ══════════════════════════════════════════════════════════ */}
      {spEditOpen && (
        <div className="fixed inset-0 z-[62] bg-background flex flex-col">
          {/* Edit header */}
          <div
            className="flex items-center gap-3 px-5 border-b border-border/40 shrink-0"
            style={{ paddingTop: 'max(58px, calc(env(safe-area-inset-top, 0px) + 18px))', paddingBottom: 14 }}
          >
            <button
              onClick={() => setSpEditOpen(false)}
              className="w-9 h-9 rounded-full bg-surface-hover flex items-center justify-center text-text-muted press-sm shrink-0"
            >
              <CloseIcon />
            </button>
            <h1 className="text-[18px] font-bold text-text-primary flex-1">Stundenplan bearbeiten</h1>
          </div>
          {/* Reuse setup widget in edit mode */}
          <div className="flex-1 overflow-y-auto px-5 pt-4 pb-10">
            <StundenplanSetupWidget
              faecher={profile?.faecher ?? []}
              initialSlots={profile?.stundenplan?.slots}
              onSave={(slots) => {
                updateProfile({ stundenplan: { slots, createdAt: new Date().toISOString() } })
                setSpEditOpen(false)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Date Strip ───────────────────────────────────────────────────────────────

interface DateStripProps {
  viewDate: Date; todayStr: string
  onDaySelect: (d: Date) => void; onPrevWeek: () => void; onNextWeek: () => void
}

function DateStrip({ viewDate, todayStr, onDaySelect, onPrevWeek, onNextWeek }: DateStripProps) {
  const weekDays = getWeekDays(viewDate)
  const viewStartStr = toDateStr(viewDate)
  const viewEndStr   = toDateStr(addDays(viewDate, 1))

  return (
    <div className="flex items-center px-2 py-2 border-b border-border/30 shrink-0 gap-1">
      <button onClick={onPrevWeek} className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-hover border border-border/30 shadow-sm text-text-secondary hover:bg-surface press-sm shrink-0">
        <ChevronLeft />
      </button>
      <div className="flex flex-1 justify-between">
        {weekDays.map((d, i) => {
          const dateStr = toDateStr(d)
          const isToday    = dateStr === todayStr
          const isSelected = dateStr === viewStartStr || dateStr === viewEndStr
          return (
            <button key={i} onClick={() => onDaySelect(d)} className="flex flex-col items-center gap-0.5 press-sm">
              <span className="text-[9px] font-bold text-text-muted">{DAY_LABELS[i]}</span>
              <span
                className="w-7 h-7 flex items-center justify-center rounded-full text-[13px] font-bold transition-all"
                style={isToday ? {
                  background: 'linear-gradient(135deg, #7C3AED, #9F5FFA)',
                  color: 'white',
                  boxShadow: '0 0 14px 4px rgba(124,58,237,0.65), 0 2px 6px rgba(124,58,237,0.45)',
                  border: '1px solid rgba(159,95,250,0.6)',
                } : isSelected ? {
                  border: '2px solid rgb(var(--color-accent))',
                  color: 'rgb(var(--color-accent))',
                } : { color: 'rgb(var(--color-text-secondary))' }}
              >
                {d.getDate()}
              </span>
            </button>
          )
        })}
      </div>
      <button onClick={onNextWeek} className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-hover border border-border/30 shadow-sm text-text-secondary hover:bg-surface press-sm shrink-0">
        <ChevronRight />
      </button>
    </div>
  )
}

// ─── Two-Day View ─────────────────────────────────────────────────────────────

interface TwoDayProps {
  viewDate: Date; todayStr: string; stundenplan: Stundenplan | undefined
  personalEntries: PersonalEntry[]; klausurtermine: { subjectId: string; date: string }[]
  calOpen: boolean; showStundenplan: boolean
  onSlotPress: (dateStr: string, time: string) => void
  onEntryPress: (entry: PersonalEntry) => void
}

function TwoDayView({ viewDate, todayStr, stundenplan, personalEntries, klausurtermine, calOpen, showStundenplan, onSlotPress, onEntryPress }: TwoDayProps) {
  const days = [viewDate, addDays(viewDate, 1)]
  const gridHeight = TOTAL_H * PX_PER_HOUR
  const hours = Array.from({ length: TOTAL_H }, (_, i) => START_H + i)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!calOpen || !scrollRef.current) return
    requestAnimationFrame(() => {
      if (!scrollRef.current) return
      const now = new Date()
      const nowMin = now.getHours() * 60 + now.getMinutes()
      const nowPx = minToPx(nowMin)
      const viewH = scrollRef.current.clientHeight || 320
      scrollRef.current.scrollTop = Math.max(0, nowPx - viewH / 2)
    })
  }, [calOpen])

  const handleColumnClick = (e: React.MouseEvent<HTMLDivElement>, dateStr: string) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const totalMin = (y / PX_PER_HOUR) * 60 + START_H * 60
    const h = Math.max(START_H, Math.min(END_H - 1, Math.floor(totalMin / 60)))
    const m = Math.round((totalMin % 60) / 15) * 15
    onSlotPress(dateStr, `${String(h).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Column headers */}
      <div className="flex shrink-0 border-b border-border/20" style={{ paddingLeft: 40 }}>
        {days.map((d, i) => {
          const isToday = toDateStr(d) === todayStr
          return (
            <div key={i} className={`flex-1 text-center py-2 border-l border-border/20`}>
              <span className={`text-[11px] font-bold ${isToday ? 'text-accent' : 'text-text-secondary'}`}>
                {DAY_LABELS[dayLabelIdx(d)]} – {d.getDate()}. {MONTHS_SHORT[d.getMonth()]}
              </span>
            </div>
          )
        })}
      </div>

      {/* Scrollable grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="flex" style={{ minHeight: gridHeight }}>
          {/* Time axis */}
          <div className="shrink-0 relative" style={{ width: 40, height: gridHeight }}>
            {hours.map((h) => (
              <div key={h} className="absolute right-2 flex items-center" style={{ top: minToPx(h * 60) - 7 }}>
                <span className="text-[8px] text-text-muted/50 tabular-nums leading-none">{h}:00</span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((d, colIdx) => {
            const dateStr = toDateStr(d)
            const isToday = dateStr === todayStr
            const dow = d.getDay()
            const spIdx = dow >= 1 && dow <= 5 ? dow - 1 : -1
            const spSlots    = spIdx >= 0 ? (stundenplan?.slots ?? []).filter((s) => s.day === spIdx) : []
            const dayEntries = personalEntries.filter((e) => e.date === dateStr && e.time)
            const dayKlausur = klausurtermine.filter((k) => k.date === dateStr)

            return (
              <div
                key={colIdx}
                className={`flex-1 relative border-l border-border/20 cursor-pointer${isToday ? ' bg-accent/[0.03]' : ''}`}
                style={{ height: gridHeight }}
                onClick={(e) => handleColumnClick(e, dateStr)}
              >
                {/* Hour lines */}
                {hours.map((h) => <div key={h} className="absolute left-0 right-0 border-t border-border/[0.15]" style={{ top: minToPx(h * 60) }} />)}

                {/* Klausur banner */}
                {dayKlausur.map((k) => {
                  const subj = SUBJECT_INFO[k.subjectId]
                  return (
                    <div key={k.subjectId} className="absolute left-0.5 right-0.5 rounded-[5px] flex items-center px-1.5 overflow-hidden" style={{ top: 3, height: 15, backgroundColor: '#FF3B3018', borderLeft: '2px solid #FF3B30' }} onClick={(e) => e.stopPropagation()}>
                      <span className="text-[7px] font-bold truncate" style={{ color: '#FF3B30' }}>📝 {subj?.name?.slice(0, 6) ?? 'Klausur'}</span>
                    </div>
                  )
                })}

                {/* Stundenplan blocks */}
                {showStundenplan && spSlots.map((slot) => {
                  const subj = SUBJECT_INFO[slot.subjectId]
                  const topPx = toPx(slot.startTime)
                  const startMin = slot.startTime.split(':').map(Number).reduce((h, m) => h * 60 + m)
                  const endMin   = slot.endTime.split(':').map(Number).reduce((h, m) => h * 60 + m)
                  const heightPx = Math.max(durToPx(endMin - startMin), 22)
                  const color = subj?.color ?? '#6366F1'
                  return (
                    <div key={slot.id} className="absolute left-0.5 right-0.5 rounded-[7px] flex flex-col justify-center px-2 overflow-hidden" style={{ top: topPx, height: heightPx, background: `linear-gradient(135deg, ${color}28, ${color}15)`, borderLeft: `2.5px solid ${color}90` }} onClick={(e) => e.stopPropagation()}>
                      <span className="text-[9px] font-bold leading-tight truncate" style={{ color }}>{subj?.icon ?? ''} {subj?.name ?? slot.subjectId}</span>
                      {slot.room && <span className="text-[7px] truncate" style={{ color, opacity: 0.7 }}>{slot.room}</span>}
                    </div>
                  )
                })}

                {/* Personal entries */}
                {dayEntries.map((entry) => {
                  const cfg = TYPE_CONFIG[entry.type]
                  const entryColor = (entry.type === 'lerneinheit' && entry.color) ? entry.color : cfg.color
                  const startMin = timeToMin(entry.time)
                  const endMin = entry.endTime ? timeToMin(entry.endTime) : startMin + 60
                  const heightPx = Math.max(durToPx(Math.max(endMin - startMin, 15)), 24)
                  return (
                    <div key={entry.id} className="absolute left-0.5 right-0.5 rounded-[7px] flex flex-col justify-center px-2 overflow-hidden cursor-pointer press-sm" style={{ top: toPx(entry.time), height: heightPx, background: `linear-gradient(135deg, ${entryColor}40, ${entryColor}25)`, borderLeft: `2.5px solid ${entryColor}` }} onClick={(e) => { e.stopPropagation(); onEntryPress(entry) }}>
                      <span className="text-[9px] font-bold truncate leading-tight" style={{ color: entryColor }}>{cfg.icon} {entry.title}</span>
                      {heightPx > 36 && entry.endTime && <span className="text-[7px] truncate" style={{ color: entryColor, opacity: 0.7 }}>{entry.time}–{entry.endTime}</span>}
                    </div>
                  )
                })}

                {/* Current time line */}
                {isToday && (() => {
                  const now = new Date()
                  const nowMin = now.getHours() * 60 + now.getMinutes()
                  if (nowMin < START_H * 60 || nowMin > END_H * 60) return null
                  return (
                    <div className="absolute left-0 right-0 flex items-center pointer-events-none" style={{ top: minToPx(nowMin) }}>
                      <div className="w-2 h-2 rounded-full -ml-1 shrink-0" style={{ background: 'rgb(var(--color-accent))' }} />
                      <div className="flex-1 h-[1.5px]" style={{ background: 'rgb(var(--color-accent))', opacity: 0.85 }} />
                    </div>
                  )
                })()}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Month View ───────────────────────────────────────────────────────────────

interface MonthViewProps {
  viewDate: Date; todayStr: string
  personalEntries: PersonalEntry[]; klausurtermine: { subjectId: string; date: string }[]
  onNavigate: (off: number) => void; onDayPress: (d: Date) => void
}

function MonthView({ viewDate, todayStr, personalEntries, klausurtermine, onNavigate, onDayPress }: MonthViewProps) {
  const year = viewDate.getFullYear(), month = viewDate.getMonth()
  const daysInMonth = getDaysInMonth(year, month)
  const offset = firstDayOffset(year, month)
  const todayDate = new Date(todayStr + 'T00:00:00')

  const cells: (number | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <div>
          <span className="text-[22px] font-bold text-text-primary">{MONTHS_DE[month]}</span>
          <span className="text-[18px] font-semibold text-text-muted ml-2">{year}</span>
        </div>
        <div className="flex gap-1">
          <button onClick={() => onNavigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-hover border border-border/30 shadow-sm text-text-secondary press-sm"><ChevronLeft /></button>
          <button onClick={() => onNavigate(1)}  className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-hover border border-border/30 shadow-sm text-text-secondary press-sm"><ChevronRight /></button>
        </div>
      </div>

      <div className="grid grid-cols-7 px-2 shrink-0 border-b border-border/20 pb-1.5">
        {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((d) => (
          <div key={d} className="text-center text-[10px] font-bold text-text-muted/60">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 px-2 overflow-y-auto flex-1 py-1">
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} />
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const cellDate = new Date(year, month, day)
          const isToday = dateStr === todayStr
          const isPast  = cellDate < todayDate
          const events  = [
            ...personalEntries.filter((e) => e.date === dateStr).map((e) => ({ color: TYPE_CONFIG[e.type].color })),
            ...klausurtermine.filter((k) => k.date === dateStr).map(() => ({ color: '#FF3B30' })),
          ]
          return (
            <button key={idx} onClick={() => onDayPress(cellDate)} className="flex flex-col items-center py-1 press-sm">
              <span
                className="w-7 h-7 flex items-center justify-center rounded-full text-[13px] font-semibold transition-all"
                style={isToday ? {
                  background: 'linear-gradient(135deg, rgb(var(--color-accent)), rgba(var(--color-accent),0.8))',
                  color: 'white',
                  boxShadow: '0 2px 6px rgba(var(--color-accent),0.4)',
                } : isPast ? { color: 'rgb(var(--color-text-muted) / 0.4)' } : { color: 'rgb(var(--color-text-primary))' }}
              >
                {day}
              </span>
              {events.length > 0 && (
                <div className="flex gap-0.5 mt-0.5 h-1.5 items-center">
                  {events.slice(0, 3).map((ev, ei) => (
                    <span key={ei} className="w-1 h-1 rounded-full" style={{ backgroundColor: isToday ? 'rgba(255,255,255,0.8)' : ev.color }} />
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Year View ────────────────────────────────────────────────────────────────

interface YearViewProps {
  viewDate: Date; todayStr: string
  personalEntries: PersonalEntry[]; klausurtermine: { subjectId: string; date: string }[]
  onNavigate: (off: number) => void; onMonthPress: (d: Date) => void
}

function YearView({ viewDate, todayStr, personalEntries, klausurtermine, onNavigate, onMonthPress }: YearViewProps) {
  const year = viewDate.getFullYear()
  const todayD = new Date(todayStr + 'T00:00:00')

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-2.5 shrink-0 sticky top-0 bg-surface z-10 border-b border-border/20">
        <button onClick={() => onNavigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-hover border border-border/30 shadow-sm text-text-secondary press-sm"><ChevronLeft /></button>
        <span className="text-[16px] font-bold text-text-primary">{year}</span>
        <button onClick={() => onNavigate(1)}  className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-hover border border-border/30 shadow-sm text-text-secondary press-sm"><ChevronRight /></button>
      </div>

      <div className="grid grid-cols-3 gap-2 px-3 py-2">
        {Array.from({ length: 12 }, (_, m) => {
          const days = getDaysInMonth(year, m)
          const off  = firstDayOffset(year, m)
          const isCurrent = year === todayD.getFullYear() && m === todayD.getMonth()
          const cells: (number | null)[] = [
            ...Array.from({ length: off }, () => null),
            ...Array.from({ length: days }, (_, i) => i + 1),
          ]
          while (cells.length % 7 !== 0) cells.push(null)

          return (
            <button key={m} onClick={() => onMonthPress(new Date(year, m, 1))} className="bg-background rounded-xl p-2 border text-left press-sm" style={{ borderColor: isCurrent ? 'rgba(var(--color-accent),0.6)' : 'rgba(var(--color-border),0.3)', boxShadow: isCurrent ? '0 0 0 1px rgba(var(--color-accent),0.2)' : 'none' }}>
              <p className="text-[9px] font-bold mb-1 text-center" style={{ color: isCurrent ? 'rgb(var(--color-accent))' : 'rgb(var(--color-text-secondary))' }}>{MONTHS_SHORT[m]}</p>
              <div className="grid grid-cols-7 gap-y-px">
                {['M','D','M','D','F','S','S'].map((l, i) => <div key={i} className="text-center text-[4px] text-text-muted/30">{l}</div>)}
                {cells.map((day, idx) => {
                  if (!day) return <div key={idx} className="aspect-square" />
                  const dateStr = `${year}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  const isToday = dateStr === todayStr
                  const hasEvt  = personalEntries.some((e) => e.date === dateStr) || klausurtermine.some((k) => k.date === dateStr)
                  return (
                    <div key={idx} className="flex items-center justify-center aspect-square rounded-[2px]" style={{ background: isToday ? 'rgb(var(--color-accent))' : hasEvt ? 'rgba(var(--color-accent),0.2)' : 'transparent' }}>
                      <span className="text-[5px] font-medium leading-none" style={{ color: isToday ? 'white' : hasEvt ? 'rgb(var(--color-accent))' : 'rgb(var(--color-text-muted) / 0.5)' }}>{day}</span>
                    </div>
                  )
                })}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Shared: App Icon Pill ────────────────────────────────────────────────────

function AppIconPill({ gradient, shadow, children }: { gradient: string; shadow: string; children: React.ReactNode }) {
  return (
    <div
      className="w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0"
      style={{ background: gradient, boxShadow: shadow }}
    >
      {children}
    </div>
  )
}

// ─── Stundenplan Setup Card (half-width, no SP set yet) ───────────────────────

function StundenplanSetupCard({ onSetup, fullWidth }: { onSetup: () => void; fullWidth?: boolean }) {
  return (
    <button
      onClick={onSetup}
      className="flex flex-col bg-surface border border-border/60 rounded-[20px] shadow-card-adaptive overflow-hidden press-sm text-left w-full"
      style={{ minHeight: fullWidth ? undefined : 152 }}
    >
      <div className="flex items-center gap-2.5 px-3.5 pt-3.5">
        <AppIconPill gradient="linear-gradient(145deg,#5AC8FA,#0080B8)" shadow="0 4px 14px rgba(0,128,184,0.5)">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /><path d="M12 14v4M10 16h4" strokeWidth="2.5" />
          </svg>
        </AppIconPill>
        <span className="text-[13px] font-bold text-text-primary leading-tight">Stundenplan</span>
      </div>
      <div className="flex-1 px-3.5 pb-3.5 pt-2.5 flex flex-col justify-end">
        <p className="text-[16px] font-black text-text-muted">–</p>
        <p className="text-[11px] font-semibold mt-0.5" style={{ color: '#5AC8FA' }}>Einrichten →</p>
      </div>
    </button>
  )
}

// ─── Hausaufgaben Widget (half-width) ─────────────────────────────────────────

function HausaufgabenWidget({ userNotes, completedHomeworkIds, standaloneHomework }: {
  userNotes: UserNote[]
  completedHomeworkIds: string[]
  standaloneHomework: StandaloneHomeworkItem[]
}) {
  const navigate = useNavigate()

  const pendingCount = userNotes.reduce((acc, note) => {
    return acc + (note.homeworkItems ?? []).filter((item, idx) => {
      const id = item.id ?? `${note.id}-hw-${idx}`
      return !completedHomeworkIds.includes(id)
    }).length
  }, 0) + standaloneHomework.filter((s) => !completedHomeworkIds.includes(s.id)).length

  const allDone = pendingCount === 0

  return (
    <button
      onClick={() => navigate('/hausaufgaben')}
      className="flex flex-col bg-surface border border-border/60 rounded-[20px] shadow-card-adaptive overflow-hidden press-sm text-left"
      style={{ minHeight: 152 }}
    >
      <div className="flex items-center gap-2.5 px-3.5 pt-3.5">
        <AppIconPill
          gradient={allDone ? 'linear-gradient(145deg,#30D158,#1A8C33)' : 'linear-gradient(145deg,#FF9F0A,#C97000)'}
          shadow={allDone ? '0 4px 14px rgba(48,209,88,0.45)' : '0 4px 14px rgba(255,159,10,0.5)'}
        >
          {allDone ? (
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          ) : (
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
            </svg>
          )}
        </AppIconPill>
        <span className="text-[13px] font-bold text-text-primary leading-tight">Hausaufgaben</span>
      </div>
      <div className="flex-1 px-3.5 pb-3.5 pt-2.5 flex flex-col justify-end">
        {allDone ? (
          <>
            <p className="text-[18px] font-black leading-tight" style={{ color: '#30D158' }}>Alles</p>
            <p className="text-[12px] font-bold mt-0.5" style={{ color: '#30D158' }}>erledigt ✓</p>
          </>
        ) : (
          <>
            <p className="text-[34px] font-black text-text-primary leading-none">{pendingCount}</p>
            <p className="text-[11px] text-text-muted mt-1">{pendingCount === 1 ? 'Aufgabe offen' : 'Aufgaben offen'}</p>
          </>
        )}
      </div>
    </button>
  )
}

// ─── Stundenplan Mini Widget ──────────────────────────────────────────────────

const SP_DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr'] as const

// ─── Stundenplan Full View ────────────────────────────────────────────────────

function StundenplanFullView({
  stundenplan,
  onClose,
  onEdit,
}: {
  stundenplan: Stundenplan
  onClose: () => void
  onEdit: () => void
}) {
  const byDay = SP_DAYS.map((_, i) =>
    stundenplan.slots.filter((s) => s.day === i).sort((a, b) => a.startTime.localeCompare(b.startTime))
  )

  return (
    <div className="fixed inset-0 z-[60] bg-background flex flex-col">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 border-b border-border/40 shrink-0"
        style={{ paddingTop: 'max(58px, calc(env(safe-area-inset-top, 0px) + 18px))', paddingBottom: 14 }}
      >
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-surface-hover flex items-center justify-center text-text-muted press-sm shrink-0"
        >
          <ChevronLeft />
        </button>
        <h1 className="text-[20px] font-bold text-text-primary flex-1">Stundenplan</h1>
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] press-sm"
          style={{
            background: 'linear-gradient(135deg, rgb(var(--color-accent)), rgba(var(--color-accent),0.8))',
            boxShadow: '0 3px 10px rgba(var(--color-accent),0.3)',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-white text-[12px] font-bold">Bearbeiten</span>
        </button>
      </div>

      {/* 5-column Stundenplan */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-10">
        {/* Day header row */}
        <div className="grid grid-cols-5 gap-2 mb-3">
          {SP_DAYS.map((d, i) => {
            const count = byDay[i].length
            return (
              <div key={d} className="flex flex-col items-center">
                <span className="text-[11px] font-bold text-text-primary">{d}</span>
                <span className="text-[9px] text-text-muted">{count} Std</span>
              </div>
            )
          })}
        </div>

        {/* Divider */}
        <div className="h-px bg-border/40 mb-3" />

        {/* Columns — one row per "time slot layer", all days side by side */}
        <div className="grid grid-cols-5 gap-2">
          {SP_DAYS.map((_, dayIdx) => (
            <div key={dayIdx} className="flex flex-col gap-2">
              {byDay[dayIdx].length === 0 ? (
                <div className="rounded-[10px] p-2 flex items-center justify-center" style={{ background: 'rgba(var(--color-border),0.12)', minHeight: 48 }}>
                  <span className="text-[9px] text-text-muted/50">–</span>
                </div>
              ) : (
                byDay[dayIdx].map((slot) => {
                  const subj = SUBJECT_INFO[slot.subjectId]
                  const color = subj?.color ?? '#6366F1'
                  return (
                    <div
                      key={slot.id}
                      className="rounded-[10px] px-2 py-2.5 flex flex-col items-center gap-0.5 overflow-hidden"
                      style={{
                        background: `linear-gradient(135deg, ${color}25, ${color}12)`,
                        border: `1.5px solid ${color}50`,
                      }}
                    >
                      <span className="text-base leading-none">{subj?.icon ?? '📚'}</span>
                      <span className="text-[9px] font-bold text-center leading-tight truncate w-full text-center" style={{ color }}>
                        {subj?.name ?? slot.subjectId}
                      </span>
                      <span className="text-[7px] text-text-muted/70 tabular-nums">{slot.startTime}</span>
                      {slot.room && (
                        <span className="text-[7px] text-text-muted/50 truncate w-full text-center">{slot.room}</span>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          ))}
        </div>

        {/* Slot count summary */}
        <div className="mt-4 pt-3 border-t border-border/30 flex items-center justify-center gap-1.5">
          <span className="text-[11px] text-text-muted">
            {stundenplan.slots.length} Stunden gesamt · erstellt {new Date(stundenplan.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: 'long' })}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Klausurtermin Widget (half-width) ───────────────────────────────────────

function KlausurterminWidget({ klausurtermine }: { klausurtermine: KlausurTermin[] }) {
  const navigate = useNavigate()
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const todayStr = toDateStr(today)
  const upcoming = klausurtermine
    .filter((k) => k.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))

  const next = upcoming[0]
  const daysLeft = next
    ? Math.round((new Date(next.date + 'T00:00:00').getTime() - today.getTime()) / 86400000)
    : null

  return (
    <button
      onClick={() => navigate('/klausuren')}
      className="flex flex-col bg-surface border border-border/60 rounded-[20px] shadow-card-adaptive overflow-hidden press-sm text-left"
      style={{ minHeight: 152 }}
    >
      <div className="flex items-center gap-2.5 px-3.5 pt-3.5">
        <AppIconPill gradient="linear-gradient(145deg,#FF453A,#B01208)" shadow="0 4px 14px rgba(255,69,58,0.5)">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18M8 14h8M8 18h5" />
          </svg>
        </AppIconPill>
        <span className="text-[13px] font-bold text-text-primary leading-tight">Klausuren</span>
        {upcoming.length > 1 && (
          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(255,69,58,0.15)', color: '#FF453A' }}>
            {upcoming.length}
          </span>
        )}
      </div>
      <div className="flex-1 px-3.5 pb-3.5 pt-2.5 flex flex-col justify-end">
        {next ? (
          <>
            <p className="text-[14px] font-black text-text-primary leading-tight truncate">
              {SUBJECT_INFO[next.subjectId]?.name ?? next.subjectId}
            </p>
            {(() => {
              const color = daysLeft! <= 0 ? '#FF453A' : daysLeft! <= 7 ? '#FF9F0A' : '#94A3B8'
              return (
                <p className="text-[12px] font-bold mt-0.5" style={{ color }}>
                  {daysLeft === 0 ? 'Heute!' : daysLeft === 1 ? 'Morgen' : `in ${daysLeft} T`}
                </p>
              )
            })()}
          </>
        ) : (
          <>
            <p className="text-[18px] font-black text-text-primary">–</p>
            <p className="text-[11px] text-text-muted mt-0.5">Keine Klausuren</p>
          </>
        )}
      </div>
    </button>
  )
}

// ─── Abi-Rechner Widget (half-width) ─────────────────────────────────────────

function AbiRechnerWidget({ abiHalbjahre, zielnote }: { abiHalbjahre?: AbiHalbjahr[]; zielnote?: string }) {
  const navigate = useNavigate()
  const overall = totalPunkteAllHalbjahre(abiHalbjahre ?? [])
  const noteStr = overall !== null ? pktToNoteAbi(overall) : null
  const gradeColor = noteStr ? noteColorAbi(noteStr) : 'rgb(var(--color-text-muted))'
  const isOnTrack = noteStr && zielnote
    ? parseFloat(noteStr.replace(',', '.')) <= parseFloat(zielnote.replace(',', '.'))
    : null

  return (
    <button
      onClick={() => navigate('/abi-rechner')}
      className="flex flex-col bg-surface border border-border/60 rounded-[20px] shadow-card-adaptive overflow-hidden press-sm text-left"
      style={{ minHeight: 152 }}
    >
      <div className="flex items-center gap-2.5 px-3.5 pt-3.5">
        <AppIconPill gradient="linear-gradient(145deg,#BF5AF2,#7C00CC)" shadow="0 4px 14px rgba(191,90,242,0.5)">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" />
          </svg>
        </AppIconPill>
        <span className="text-[13px] font-bold text-text-primary leading-tight">Noten Rechner</span>
      </div>
      <div className="flex-1 px-3.5 pb-3.5 pt-2.5 flex flex-col justify-end">
        {noteStr ? (
          <>
            <div className="flex items-end gap-1 leading-none">
              <span className="font-black" style={{ fontSize: 28, color: gradeColor, letterSpacing: '-0.03em' }}>
                {overall!.toFixed(1).replace('.', ',')}
              </span>
              <span className="text-[10px] text-text-muted mb-0.5">Pkt</span>
            </div>
            <p className="text-[12px] font-bold mt-0.5" style={{ color: gradeColor }}>
              ≈ {noteStr}{zielnote && isOnTrack !== null && (
                <span className="ml-1.5 text-[10px]" style={{ color: isOnTrack ? '#30D158' : '#FF9F0A' }}>
                  {isOnTrack ? '✓ Ziel' : '↑ Ziel'}
                </span>
              )}
            </p>
          </>
        ) : (
          <>
            <p className="text-[18px] font-black text-text-primary">–</p>
            <p className="text-[11px] text-text-muted mt-0.5">Noten eintragen</p>
          </>
        )}
      </div>
    </button>
  )
}

// ─── Lernplan Widget (half-width) ────────────────────────────────────────────

function LernplanWidget() {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate('/klausurmodus/lernplan')}
      className="flex flex-col bg-surface border border-border/60 rounded-[20px] shadow-card-adaptive overflow-hidden press-sm text-left"
      style={{ minHeight: 152 }}
    >
      <div className="flex items-start justify-between px-3.5 pt-3.5">
        <AppIconPill gradient="linear-gradient(145deg,#FFD060,#C07700)" shadow="0 4px 14px rgba(192,119,0,0.4)">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
            <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" strokeWidth="2.5" />
          </svg>
        </AppIconPill>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted mt-1 shrink-0">
          <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="flex-1 px-3.5 pb-3.5 pt-2.5 flex flex-col justify-end">
        <p className="text-[14px] font-bold text-text-primary leading-tight">Lernplan</p>
        <p className="text-[11px] text-text-muted mt-0.5">KI-Lernplan</p>
      </div>
    </button>
  )
}

// ─── Stundenplan Week Widget (full-width) ────────────────────────────────────

const WEEK_DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr']

function StundenplanWeekWidget({ stundenplan, onOpen }: { stundenplan: Stundenplan; onOpen: () => void }) {
  const daySlots = WEEK_DAYS.map((_, i) =>
    stundenplan.slots
      .filter((s) => s.day === i)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  )

  return (
    <button
      onClick={onOpen}
      className="flex flex-col bg-surface border border-border/60 rounded-[20px] shadow-card-adaptive overflow-hidden press-sm text-left w-full"
    >
      <div className="flex items-center gap-2.5 px-3.5 pt-3.5 pb-2.5">
        <AppIconPill gradient="linear-gradient(145deg,#5AC8FA,#0080B8)" shadow="0 4px 14px rgba(0,128,184,0.5)">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        </AppIconPill>
        <span className="text-[13px] font-bold text-text-primary leading-tight flex-1">Stundenplan</span>
        <span className="text-[11px] font-semibold" style={{ color: '#5AC8FA' }}>Bearbeiten →</span>
      </div>
      <div className="grid grid-cols-5 gap-1.5 px-3 pb-3.5">
        {WEEK_DAYS.map((label, i) => (
          <div key={label} className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-text-muted text-center mb-0.5">{label}</span>
            {daySlots[i].length === 0 ? (
              <span className="text-[10px] text-text-muted text-center">–</span>
            ) : (
              daySlots[i].map((slot) => {
                const subj = SUBJECT_INFO[slot.subjectId]
                const color = subj?.color ?? '#5AC8FA'
                return (
                  <div
                    key={slot.id}
                    className="flex items-center gap-1 px-1.5 py-1 rounded-[7px] text-[9px] font-bold leading-none"
                    style={{ background: `${color}20`, border: `1px solid ${color}35` }}
                  >
                    <span className="shrink-0" style={{ fontSize: 9 }}>{subj?.icon ?? '📚'}</span>
                    <span className="truncate" style={{ color }}>{(subj?.name ?? slot.subjectId).split(' ')[0]}</span>
                  </div>
                )
              })
            )}
          </div>
        ))}
      </div>
    </button>
  )
}

// ─── Klausur Form Fields (shared by FAB + standalone modal) ──────────────────

function KlausurFormFields({
  faecher,
  subjectId,
  topic,
  date,
  onSubjectId,
  onTopic,
  onDate,
}: {
  faecher: string[]
  subjectId: string
  topic: string
  date: string
  onSubjectId: (v: string) => void
  onTopic: (v: string) => void
  onDate: (v: string) => void
}) {
  const subjectTopics = subjectId
    ? topics.filter((t) => t.subjectId === subjectId).map((t) => t.name)
    : []

  return (
    <div className="space-y-3">
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
                onClick={() => onSubjectId(id)}
                className="flex items-center gap-1.5 p-2.5 rounded-[10px] border text-left transition-all press-sm"
                style={active ? { background: `${subj.color}18`, borderColor: subj.color } : { borderColor: 'rgba(var(--color-border),0.6)', background: 'transparent' }}
              >
                <span className="text-sm shrink-0">{subj.icon}</span>
                <span className="text-[10px] font-semibold truncate leading-tight" style={{ color: active ? subj.color : 'rgb(var(--color-text-secondary))' }}>{subj.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Datum</p>
        <input
          type="date"
          value={date}
          onChange={(e) => onDate(e.target.value)}
          min={new Date().toISOString().slice(0, 10)}
          className="w-full bg-background border border-border rounded-[12px] px-3 py-2.5 text-[13px] text-text-primary focus:outline-none focus:border-accent transition-colors"
        />
      </div>

      <div>
        <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Thema (optional)</p>
        {subjectTopics.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {subjectTopics.slice(0, 6).map((t) => (
              <button
                key={t}
                onClick={() => onTopic(topic === t ? '' : t)}
                className="px-2.5 py-1 rounded-pill text-[11px] font-medium press-sm transition-all"
                style={topic === t
                  ? { background: 'linear-gradient(135deg,#FF3B30,#CC2E28)', color: 'white' }
                  : { background: 'rgba(var(--color-border),0.4)', color: 'rgb(var(--color-text-secondary))' }
                }
              >
                {t.length > 28 ? t.slice(0, 28) + '…' : t}
              </button>
            ))}
          </div>
        )}
        <input
          type="text"
          value={topic}
          onChange={(e) => onTopic(e.target.value)}
          placeholder={getTopicPlaceholder(subjectId)}
          className="w-full bg-background border border-border rounded-[12px] px-3 py-2.5 text-[13px] text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
        />
      </div>
    </div>
  )
}

// ─── Stundenplan Setup Widget ─────────────────────────────────────────────────

const SP_DAY_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr'] as const

function StundenplanSetupWidget({ faecher, onSave, initialSlots }: { faecher: string[]; onSave: (slots: StundenplanSlot[]) => void; initialSlots?: StundenplanSlot[] }) {
  const [open, setOpen] = useState(() => !!initialSlots)
  const [mode, setMode] = useState<'choose' | 'manual' | 'scan'>(() => (initialSlots && initialSlots.length > 0 ? 'manual' : 'choose'))
  const [slots, setSlots] = useState<StundenplanSlot[]>(initialSlots ?? [])
  const [activeDay, setActiveDay] = useState(0)
  const [addingSlot, setAddingSlot] = useState(false)
  const [newSlot, setNewSlot] = useState({ startTime: '08:00', endTime: '08:45', subjectId: '', room: '' })
  const fileRef = useRef<HTMLInputElement>(null)
  const [scanFile, setScanFile] = useState<File | null>(null)
  const [scanPhase, setScanPhase] = useState<'idle' | 'analyzing' | 'error'>('idle')
  const [scanError, setScanError] = useState('')
  const [fromAI, setFromAI] = useState(false)

  const profileSubjects = faecher.map((id) => SUBJECT_INFO[id] ? { id, ...SUBJECT_INFO[id] } : null).filter((s): s is { id: string; name: string; icon: string; color: string } => s !== null)
  const daySlots = slots.filter((s) => s.day === activeDay).sort((a, b) => a.startTime.localeCompare(b.startTime))
  const totalSlots = slots.length

  const handleStartTime = (startTime: string) => {
    const [h, m] = startTime.split(':').map(Number)
    const endMin = h * 60 + m + 45
    const endTime = `${String(Math.floor(endMin / 60) % 24).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`
    setNewSlot((n) => ({ ...n, startTime, endTime }))
  }

  const commitSlot = () => {
    if (!newSlot.subjectId) return
    setSlots((prev) => [...prev, { id: `slot-${Date.now()}`, day: activeDay, startTime: newSlot.startTime, endTime: newSlot.endTime, subjectId: newSlot.subjectId, room: newSlot.room || undefined }])
    setAddingSlot(false)
    setNewSlot({ startTime: '08:00', endTime: '08:45', subjectId: '', room: '' })
  }

  const removeSlot = (id: string) => setSlots((prev) => prev.filter((s) => s.id !== id))
  const handleSave  = () => { if (totalSlots > 0) onSave(slots) }
  const handleClose = () => { setOpen(false); setMode('choose'); setAddingSlot(false) }

  const handleScanFileSelect = async (file: File) => {
    setScanFile(file); setScanPhase('analyzing'); setScanError('')
    try {
      const result = await parseStundenplanFromImage(file, profileSubjects)
      setSlots(result.slots); setFromAI(true); setMode('manual'); setScanPhase('idle')
    } catch (err) {
      setScanPhase('error'); setScanError(err instanceof Error ? err.message : 'Analyse fehlgeschlagen')
    }
  }

  return (
    <section>
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-3 bg-surface border border-border/60 rounded-[20px] shadow-card-adaptive px-5 py-4 text-left hover:bg-surface-hover active:scale-[0.99] transition-all duration-200">
        <div className="w-10 h-10 rounded-[12px] bg-accent/10 flex items-center justify-center text-xl shrink-0">🗓️</div>
        <div className="flex-1">
          <p className="text-text-primary font-semibold text-[15px]">Stundenplan einrichten</p>
          <p className="text-text-muted text-[12px] mt-0.5">Dein Schultag auf einen Blick</p>
        </div>
        <svg className={`text-text-muted shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>

      {open && (
        <div className="mt-1.5 bg-surface border border-border/60 rounded-[20px] shadow-card-adaptive overflow-hidden animate-fade-in">

          {mode === 'choose' && (
            <div className="p-4 space-y-2">
              <button onClick={() => setMode('manual')} className="w-full flex items-center gap-3 bg-background border border-border rounded-[14px] px-4 py-3.5 text-left hover:bg-surface-hover active:scale-[0.98] transition-all">
                <span className="text-xl shrink-0">✏️</span>
                <div className="flex-1"><p className="text-text-primary font-semibold text-[14px]">Manuell eintragen</p><p className="text-text-muted text-[12px] mt-0.5">Fächer und Zeiten eingeben</p></div>
                <ChevronRight />
              </button>
              <button onClick={() => setMode('scan')} className="w-full flex items-center gap-3 bg-background border border-border rounded-[14px] px-4 py-3.5 text-left hover:bg-surface-hover active:scale-[0.98] transition-all">
                <span className="text-xl shrink-0">📷</span>
                <div className="flex-1"><p className="text-text-primary font-semibold text-[14px]">Foto / Scan hochladen</p><p className="text-text-muted text-[12px] mt-0.5">Stundenplan fotografieren oder PDF</p></div>
                <ChevronRight />
              </button>
              <button onClick={handleClose} className="w-full py-2.5 text-center text-[13px] text-text-muted hover:text-text-secondary transition-colors">Schließen</button>
            </div>
          )}

          {mode === 'scan' && (
            <div className="p-4 space-y-3">
              <button onClick={() => { setMode('choose'); setScanPhase('idle'); setScanError(''); setScanFile(null) }} className="flex items-center gap-1.5 text-text-muted text-sm hover:text-text-secondary transition-colors">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>Zurück
              </button>
              {scanPhase === 'idle' && (
                <button onClick={() => fileRef.current?.click()} className="w-full border-2 border-dashed border-border rounded-[16px] p-6 flex flex-col items-center gap-2 hover:border-accent/50 hover:bg-accent/5 transition-all">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-2xl">📷</div>
                  <p className="text-text-primary font-semibold text-[14px]">Foto oder PDF auswählen</p>
                  <p className="text-text-muted text-xs">KI erkennt Fächer und Zeiten automatisch</p>
                </button>
              )}
              {scanPhase === 'analyzing' && (
                <div className="bg-background border border-border rounded-[16px] p-5 flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-[3px] border-accent/25 border-t-accent rounded-full animate-spin" />
                  <p className="text-text-primary font-semibold text-[14px]">KI analysiert Stundenplan…</p>
                  <p className="text-text-muted text-[12px] truncate max-w-[200px]">{scanFile?.name}</p>
                </div>
              )}
              {scanPhase === 'error' && (
                <div className="space-y-2">
                  <div className="rounded-[14px] p-4" style={{ background: 'rgba(var(--color-danger),0.08)', border: '1px solid rgba(var(--color-danger),0.25)' }}>
                    <p className="text-text-primary font-semibold text-[14px] mb-1">Erkennung fehlgeschlagen</p>
                    <p className="text-text-muted text-[12px] leading-relaxed">{scanError}</p>
                  </div>
                  <button onClick={() => { setScanPhase('idle'); setScanFile(null); setScanError('') }} className="w-full py-2.5 rounded-[12px] grad-accent text-white text-sm font-semibold active:scale-95 transition-all">Erneut versuchen</button>
                  <button onClick={() => { setMode('manual'); setScanPhase('idle'); setScanError('') }} className="w-full py-2.5 rounded-[12px] border border-border text-text-secondary text-sm font-medium hover:bg-surface-hover transition-colors">Manuell eintragen</button>
                </div>
              )}
              <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,image/*,application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleScanFileSelect(f) }} />
            </div>
          )}

          {mode === 'manual' && (
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <button onClick={() => { setMode('choose'); setAddingSlot(false); setFromAI(false) }} className="flex items-center gap-1.5 text-text-muted text-sm hover:text-text-secondary transition-colors">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>Zurück
                </button>
                {totalSlots > 0 && !addingSlot && (
                  <button onClick={handleSave} className="px-3.5 py-1.5 rounded-pill text-white text-[12px] font-bold press-sm" style={{ background: 'linear-gradient(135deg, rgb(var(--color-accent)), rgba(var(--color-accent),0.8))', boxShadow: '0 3px 10px rgba(var(--color-accent),0.35)' }}>
                    Speichern · {totalSlots} Std
                  </button>
                )}
              </div>

              {fromAI && totalSlots > 0 && (
                <div className="rounded-[12px] px-3 py-2.5 flex items-center gap-2" style={{ background: 'rgba(var(--color-success),0.08)', border: '1px solid rgba(var(--color-success),0.25)' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-success shrink-0"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  <p className="text-[12px] font-medium text-success">{totalSlots} Stunden erkannt — prüfen &amp; anpassen</p>
                </div>
              )}

              <div className="flex gap-1">
                {SP_DAY_SHORT.map((d, i) => {
                  const count = slots.filter((s) => s.day === i).length
                  return (
                    <button key={d} onClick={() => { setActiveDay(i); setAddingSlot(false) }}
                      className="flex-1 flex flex-col items-center py-2 rounded-[12px] transition-all duration-200 border"
                      style={activeDay === i ? {
                        background: 'linear-gradient(135deg, #7C3AED, #9F5FFA)',
                        borderColor: 'transparent',
                        boxShadow: '0 2px 8px rgba(124,58,237,0.35)',
                      } : { background: 'rgb(var(--color-background))', borderColor: 'rgba(var(--color-border),0.6)' }}>
                      <span className={`text-[10px] font-semibold ${activeDay === i ? 'text-white/80' : 'text-text-muted'}`}>{d}</span>
                      <span className={`text-[12px] font-bold mt-0.5 ${activeDay === i ? 'text-white' : count > 0 ? 'text-accent' : 'text-text-muted/30'}`}>{count > 0 ? count : '·'}</span>
                    </button>
                  )
                })}
              </div>

              {daySlots.length > 0 && (
                <div className="space-y-1.5">
                  {daySlots.map((slot) => {
                    const subj = SUBJECT_INFO[slot.subjectId]
                    return (
                      <div key={slot.id} className="bg-background border border-border/60 rounded-[12px] p-3 flex items-center gap-2.5 animate-fade-in">
                        <div className="w-8 h-8 rounded-btn flex items-center justify-center text-base shrink-0" style={{ backgroundColor: `${subj?.color ?? '#7C3AED'}22` }}>{subj?.icon ?? '📚'}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-text-primary font-semibold text-[13px]">{subj?.name ?? slot.subjectId}</p>
                          <p className="text-text-muted text-[11px]">{slot.startTime} – {slot.endTime}{slot.room ? ` · ${slot.room}` : ''}</p>
                        </div>
                        <button onClick={() => removeSlot(slot.id)} className="w-6 h-6 flex items-center justify-center text-text-muted hover:text-danger transition-colors shrink-0">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" /></svg>
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              {!addingSlot ? (
                <button onClick={() => setAddingSlot(true)} className="w-full border border-dashed border-border rounded-[12px] py-3 flex items-center justify-center gap-2 text-text-muted hover:border-accent/50 hover:text-accent hover:bg-accent/5 transition-all">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>
                  <span className="text-[13px] font-medium">Stunde hinzufügen</span>
                </button>
              ) : (
                <div className="bg-background border border-accent/30 rounded-[14px] p-3.5 space-y-2.5">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Von</p>
                      <input type="time" value={newSlot.startTime} onChange={(e) => handleStartTime(e.target.value)} className="w-full bg-surface border border-border rounded-[10px] px-2.5 py-2 text-text-primary text-sm focus:outline-none focus:border-accent transition-colors" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Bis</p>
                      <input type="time" value={newSlot.endTime} onChange={(e) => setNewSlot((n) => ({ ...n, endTime: e.target.value }))} className="w-full bg-surface border border-border rounded-[10px] px-2.5 py-2 text-text-primary text-sm focus:outline-none focus:border-accent transition-colors" />
                    </div>
                  </div>
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Fach</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {profileSubjects.map((s) => (
                      <button key={s.id} onClick={() => setNewSlot((n) => ({ ...n, subjectId: s.id }))} className={`flex items-center gap-1.5 p-2 rounded-[10px] border text-left transition-all duration-150 ${newSlot.subjectId === s.id ? 'border-accent bg-accent-soft' : 'border-border bg-surface hover:bg-surface-hover'}`}>
                        <span className="text-sm shrink-0">{s.icon}</span>
                        <span className={`text-[10px] font-medium leading-tight truncate ${newSlot.subjectId === s.id ? 'text-text-primary' : 'text-text-secondary'}`}>{s.name}</span>
                      </button>
                    ))}
                  </div>
                  <input type="text" value={newSlot.room} onChange={(e) => setNewSlot((n) => ({ ...n, room: e.target.value }))} placeholder="Raum (optional)" className="w-full bg-surface border border-border rounded-[10px] px-2.5 py-2 text-text-primary text-sm placeholder-text-muted focus:outline-none focus:border-accent transition-colors" />
                  <div className="flex gap-2">
                    <button onClick={() => { setAddingSlot(false); setNewSlot({ startTime: '08:00', endTime: '08:45', subjectId: '', room: '' }) }} className="flex-1 py-2 rounded-[10px] border border-border text-text-secondary text-sm font-medium hover:bg-surface-hover transition-colors">Abbrechen</button>
                    <button onClick={commitSlot} disabled={!newSlot.subjectId} className="flex-1 py-2 rounded-[10px] text-white text-sm font-bold disabled:opacity-40 active:scale-95 transition-all" style={{ background: 'linear-gradient(135deg, #7C3AED, #9F5FFA)', boxShadow: '0 2px 8px rgba(124,58,237,0.35)' }}>Hinzufügen</button>
                  </div>
                </div>
              )}

              {totalSlots > 0 && !addingSlot && (
                <button onClick={handleSave} className="w-full py-3 rounded-[14px] text-white text-[14px] font-bold press-sm" style={{ background: 'linear-gradient(135deg, rgb(var(--color-accent)), rgba(var(--color-accent),0.8))', boxShadow: '0 4px 16px rgba(var(--color-accent),0.4)' }}>
                  Stundenplan speichern · {totalSlots} Stunde{totalSlots === 1 ? '' : 'n'}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
