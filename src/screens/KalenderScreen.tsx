import { useState, useRef, useEffect } from 'react'
import { Icon, type IconName } from '../components/ui/Icon'
import { useNavigate } from 'react-router-dom'
import { useUser, type EntryType, type PersonalEntry } from '../context/UserContext'
import { SUBJECT_INFO, resolveSubjectInfo, getTopicPlaceholder } from '../data/subjectInfo'
import { SubjectIcon } from '../components/ui/SubjectIcon'
import { topics } from '../data/mockData'
import type { StundenplanSlot, Stundenplan } from '../types'
import { parseStundenplanFromImage } from '../lib/groq'
import { StundenplanPill } from '../components/ui/StundenplanPill'
import { PlanenBar } from '../components/ui/PlanenBar'


// ─── Constants ───────────────────────────────────────────────────────────────

const DAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const MONTHS_DE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
const MONTHS_SHORT = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

// Die drei Eintragsarten trugen freie iOS-Systemfarben. Jetzt tragen sie die
// Signalwerte des eigenen Systems — samt der Gegenfarbe, die dort schon
// festgelegt ist: Auf Gruen und Blau traegt Weiss, auf Orange nicht.
// Als Hexwerte, weil die Toenungen unten mit Alpha-Suffix arbeiten (`${color}18`).
const TYPE_CONFIG: Record<EntryType, { label: string; icon: IconName; color: string; grad: string; on: string }> = {
  lerneinheit: { label: 'Lernzeit',  icon: 'book',     color: '#008932', grad: '#008932', on: '#FFFFFF' },
  termin:      { label: 'Termin',    icon: 'calendar', color: '#1E6EF4', grad: '#1E6EF4', on: '#FFFFFF' },
  erinnerung:  { label: 'Sonstiges', icon: 'bell',     color: '#FF8D28', grad: '#FF8D28', on: '#1B1B1F' },
}

const PX_PER_HOUR = 56
const START_H = 6
const END_H = 23
const TOTAL_H = END_H - START_H

type RecurFreq = 'daily' | 'weekly' | 'monthly'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
}

/** Montag der Woche, in der das Datum liegt. */
function mondayOf(ref: Date): Date {
  const dow = ref.getDay()
  const mon = new Date(ref)
  mon.setDate(ref.getDate() - (dow === 0 ? 6 : dow - 1))
  mon.setHours(0, 0, 0, 0)
  return mon
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
  const { profile, personalEntries, addEntry, removeEntry, addKlausurtermin } = useUser()
  const navigate = useNavigate()
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
  const calOpen = true
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
  // Nur noch fuer das Ausblenden. Das Einblenden laeuft ueber die Klasse
  // .fab-in als Keyframe und braucht keinen Zustand.
  const [fabAnimated, setFabAnimated] = useState(true)
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


  // ── FAB open/close ──────────────────────────────────────────
  const openFab = (date = todayStr, time = '', type: FormType = 'termin') => {
    const endTime = time ? addMinutes(time, 60) : ''
    setAddForm({ title: '', type, date, time, endTime, klausurSubjectId: '', klausurTopic: '' })
    setIsRecurring(false)
    setRecurFreq('weekly')
    setRecurEnd(toDateStr(addDays(new Date(), 90)))
    setFabAnimated(true)
    setFabOpen(true)
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

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-dvh bg-background overflow-hidden pb-28 lg:pb-0">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="px-4 lg:px-6 shrink-0" style={{ paddingTop: 'max(58px, calc(env(safe-area-inset-top, 0px) + 18px))' }}>
        {/* Gleicher Kopf wie in den fuenf anderen Planen-Rubriken: Der Titel nennt
            den Bereich, die Leiste sagt, wo man darin steht. Die Begruessung
            ruecht in die Unterzeile — sie bleibt, ohne die Reihe zu brechen. */}
        <h1 className="text-[30px] font-extrabold tracking-[-0.035em] text-text-primary">Planen</h1>
        <p className="text-[13px] text-text-secondary mt-0.5">
          {getGreeting(profile?.name ?? 'Max')} · {today.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        {/* Planen-Leiste — Kalender ist die erste von sechs Rubriken. */}
        <PlanenBar className="mt-4" />
      </div>

      {/* Der Kalender ist der ganze Screen.
          Vorher stand er in einer Spalte, daneben lagen Hausaufgaben, Klausuren,
          Lernplan, Notenrechner, Stundenplan und der Lernvorschlag — also fuenf
          andere Rubriken im Screen der sechsten. Jede davon hat inzwischen ihren
          eigenen Platz unter „Planen"; hier waren sie eine Dopplung, die den
          Kalender auf ein Drittel zusammendrueckte. */}
      <div className="px-4 mt-4 flex-1 min-h-0 flex flex-col lg:px-6 lg:pb-6">
        <div className="flex-1 min-h-0 flex flex-col">

        {/* ── Kalender Widget (inline accordion) ──────────────── */}
        <div className="bg-surface border border-border/60 rounded-card shadow-card-adaptive overflow-hidden flex-1 min-h-0 flex flex-col">

          {/* Der Kalender war auf dem Telefon eingeklappt, weil darunter fuenf
              fremde Rubriken lagen. Die sind weg — jetzt fuellt er den Screen. */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <div className="flex flex-col h-full">

              {/* Ansicht und Aktionen */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3 pb-2 shrink-0">
                <div className="flex items-center gap-0.5 bg-background rounded-btn p-[3px]">
                  {(['twoday', 'month', 'year'] as const).map((view, i) => (
                    <button
                      key={view}
                      onClick={() => setCalView(view)}
                      className="px-3 min-[420px]:px-4 py-1.5 rounded-chip text-[11px] min-[420px]:text-[12px] font-bold whitespace-nowrap transition-all duration-200 press-sm"
                      style={calView === view ? {
                        background: 'var(--grad-mode)',
                        color: 'rgb(var(--color-on-accent))',
                      } : { color: 'rgb(var(--color-text-secondary))' }}
                    >
                      {[isDesktop ? 'Woche' : '2 Tage', 'Monat', 'Jahr'][i]}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  {calView === 'twoday' && (
                    <button
                      onClick={toggleStundenplan}
                      aria-label="Stundenplan im Kalender zeigen"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-chip text-[11px] font-bold transition-all press-sm shrink-0"
                      style={showStundenplan ? {
                        background: 'var(--grad-mode)',
                        color: 'rgb(var(--color-on-accent))',
                      } : {
                        background: 'rgb(var(--color-border) / 0.5)',
                        color: 'rgb(var(--color-text-muted))',
                      }}
                    >
                      {/* Auf dem Telefon nur das Zeichen — mit Beschriftung passt
                          die Zeile nicht und bricht um, was eine ganze Stunde
                          des Tagesrasters kostet. */}
                      <span className="inline-flex items-center gap-1.5">
                        <Icon name="calendar" size={14} />
                        <span className="hidden min-[420px]:inline">Stundenplan</span>
                      </span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      const now = new Date()
                      const h = now.getMinutes() >= 30 ? Math.min(now.getHours() + 1, 23) : now.getHours()
                      openFab(todayStr, `${String(h).padStart(2, '0')}:00`)
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-btn text-[12px] font-bold press-sm shrink-0"
                    style={{ background: 'var(--grad-mode)', color: '#FFFFFF' }}
                  >
                    + Eintrag
                  </button>
                </div>
              </div>

              {/* Date strip (2T only) */}
              {calView === 'twoday' && !isDesktop && (
                <DateStrip
                  viewDate={viewDate}
                  todayStr={todayStr}
                  onDaySelect={(d) => setViewDate(d)}
                  onPrevWeek={() => setViewDate((v) => addDays(v, isDesktop ? -7 : -2))}
                  onNextWeek={() => setViewDate((v) => addDays(v, isDesktop ? 7 : 2))}
                />
              )}

              {/* Calendar content */}
              <div className="flex-1 overflow-hidden min-h-0">
                {calView === 'twoday' && (
                  <TwoDayView
                    dayCount={isDesktop ? 7 : 2}
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
                  className="flex items-center gap-1.5 px-4 py-2 rounded-btn text-white text-[12px] font-bold press-sm"
                  style={{ background: 'var(--grad-mode)', color: '#FFFFFF' }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Heute
                </button>
                <span className="text-text-muted text-[11px]">Leere Stelle tippen → Eintrag</span>
              </div>
            </div>
          </div>
        </div>
        </div>

      </div>{/* Ende Kalenderflaeche */}

      {/* ══════════════════════════════════════════════════════════
          FAB Modal — pops from button, top-anchored for keyboard stability
         ══════════════════════════════════════════════════════════ */}
      {fabOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-[44] bg-black/35" onClick={closeFab} />

          {/* Modal card — top-anchored so keyboard doesn't push it */}
          <div
            className="fixed z-[45] bg-surface rounded-card shadow-float overflow-hidden fab-in"
            style={{
              // Am Schreibtisch war der Kasten so breit wie das Fenster — ein
              // Formular mit vier Feldern ueber 1200 px liest sich nicht.
              top: 'max(60px, calc(env(safe-area-inset-top, 0px) + 52px))',
              left: 16,
              right: 16,
              maxWidth: 560,
              marginLeft: 'auto',
              marginRight: 'auto',
              maxHeight: 'calc(100dvh - 180px)',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              transformOrigin: 'bottom right',
              ...(fabAnimated ? {} : {
                transform: 'scale(0.12)',
                opacity: 0,
                transition: 'transform 0.2s ease, opacity 0.2s ease',
              }),
            }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border/40">
              <h2 className="text-[17px] font-bold text-text-primary">Eintrag hinzufügen</h2>
              <button onClick={closeFab} className="w-8 h-8 rounded-full bg-surface-hover flex items-center justify-center text-text-muted press-sm tap-44">
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
                      className="py-2.5 rounded-btn text-[11px] font-bold flex flex-col items-center justify-center gap-0.5 border transition-all duration-200 press-sm"
                      style={active ? { background: cfg.grad, borderColor: 'transparent', color: cfg.on } : { borderColor: 'rgb(var(--color-border) / 0.6)', color: 'rgb(var(--color-text-primary))' }}
                    >
                      <Icon name={cfg.icon} size={15} />
                      <span>{cfg.label}</span>
                    </button>
                  )
                })}
                {(() => {
                  const active = addForm.type === 'klausur'
                  return (
                    <button
                      onClick={() => setAddForm((f) => ({ ...f, type: 'klausur' }))}
                      className="py-2.5 rounded-btn text-[11px] font-bold flex flex-col items-center justify-center gap-0.5 border transition-all duration-200 press-sm"
                      style={active ? { background: '#FF152D', borderColor: 'transparent', color: '#FFFFFF' } : { borderColor: 'rgb(var(--color-border) / 0.6)', color: 'rgb(var(--color-text-primary))' }}
                    >
                      <span className="text-text-secondary"><Icon name="note" size={15} /></span>
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
                    className="w-full bg-background border border-border rounded-btn px-4 py-3 text-[14px] text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
                  />

                  {/* Date + Von/Bis */}
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={addForm.date}
                      onChange={(e) => setAddForm((f) => ({ ...f, date: e.target.value }))}
                      className="flex-1 bg-background border border-border rounded-btn px-3 py-2.5 text-[13px] text-text-primary focus:outline-none focus:border-accent transition-colors"
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
                        className="w-full bg-background border border-border rounded-btn px-3 py-2.5 text-[13px] text-text-primary focus:outline-none focus:border-accent transition-colors"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-[9px] font-bold text-text-muted uppercase tracking-wider mb-1">Bis</p>
                      <input
                        type="time"
                        value={addForm.endTime}
                        onChange={(e) => setAddForm((f) => ({ ...f, endTime: e.target.value }))}
                        className="w-full bg-background border border-border rounded-btn px-3 py-2.5 text-[13px] text-text-primary focus:outline-none focus:border-accent transition-colors"
                      />
                    </div>
                  </div>
                </>
              )}


              {/* ── Recurring toggle — only for regular entries */}
              {addForm.type !== 'klausur' && <div>
                <div className="flex gap-1.5 mb-3 p-1 bg-background rounded-btn">
                  {([false, true] as const).map((val) => {
                    const active = isRecurring === val
                    return (
                      <button
                        key={String(val)}
                        onClick={() => setIsRecurring(val)}
                        className="flex-1 py-2.5 rounded-chip text-[12px] font-bold transition-all duration-200 press-sm"
                        style={active ? {
                          background: 'var(--grad-mode)',
                          color: 'white',
                        } : {
                          color: 'rgb(var(--color-text-secondary))',
                          background: 'rgb(var(--color-border) / 0.35)',
                        }}
                      >
                        <span className="inline-flex items-center gap-1.5"><Icon name={val ? 'repeat' : 'pin'} size={13} />{val ? 'Wiederkehrend' : 'Einmalig'}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Recurring options */}
                {isRecurring && (
                  <div className="space-y-2.5 bg-background rounded-btn p-3 border border-border/40">
                    <div>
                      <p className="section-label mb-1.5">Häufigkeit</p>
                      <div className="flex gap-1.5 p-0.5 bg-surface rounded-btn">
                        {(['daily', 'weekly', 'monthly'] as RecurFreq[]).map((f) => {
                          const label = f === 'daily' ? 'Täglich' : f === 'weekly' ? 'Wöchentlich' : 'Monatlich'
                          const active = recurFreq === f
                          return (
                            <button
                              key={f}
                              onClick={() => setRecurFreq(f)}
                              className="flex-1 py-1.5 rounded-chip text-[11px] font-bold transition-all press-sm"
                              style={active ? {
                                background: 'var(--grad-mode)',
                                color: 'white',
                                boxShadow: '0 2px 6px rgb(var(--color-accent) / 0.35)',
                              } : { color: 'rgb(var(--color-text-muted))', background: 'transparent' }}
                            >
                              {label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <div>
                      <p className="section-label mb-1.5">Bis</p>
                      <input
                        type="date"
                        value={recurEnd}
                        onChange={(e) => setRecurEnd(e.target.value)}
                        className="w-full bg-surface border border-border rounded-btn px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-accent transition-colors"
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
                    className="w-full py-3 rounded-icon text-on-accent text-[15px] font-bold press-sm disabled:opacity-40 transition-all"
                    style={{
                      background: addForm.type === 'klausur'
                        ? '#FF3B30'
                        : 'rgb(var(--color-accent))',
                      boxShadow: canAdd ? '0 4px 16px rgb(var(--color-accent) / 0.4)' : 'none',
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
              background: 'var(--grad-mode)',
              boxShadow: '0 8px 24px rgb(var(--color-accent) / 0.45), 0 2px 8px rgba(0,0,0,0.2)',
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
            className="fixed inset-x-4 z-[51] bg-surface rounded-card shadow-float overflow-hidden"
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
              style={{ background: `${TYPE_CONFIG[selectedEntry.type].color}18` }}
            >
              <div
                className="w-12 h-12 rounded-icon flex items-center justify-center text-2xl shrink-0"
                style={{ background: `${TYPE_CONFIG[selectedEntry.type].color}28` }}
              >
                <Icon name={TYPE_CONFIG[selectedEntry.type].icon} size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-text-primary font-bold text-[17px] leading-tight truncate">{selectedEntry.title}</p>
                <p className="text-text-muted text-[12px] mt-0.5">
                  {new Date(selectedEntry.date + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <button onClick={closeDetail} className="w-8 h-8 rounded-full bg-surface-hover flex items-center justify-center text-text-muted press-sm shrink-0 tap-44">
                <CloseIcon />
              </button>
            </div>

            {/* Details */}
            <div className="px-5 py-4 space-y-3">
              {selectedEntry.time && (
                <div className="flex items-center gap-3 bg-background rounded-btn px-4 py-3">
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
              <div className="flex items-center gap-3 bg-background rounded-btn px-4 py-3">
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

              {/* Zum Lernplan */}
              {selectedEntry.lernplanId && (
                <button
                  onClick={() => { closeDetail(); navigate(`/klausurmodus/lernplan/${selectedEntry.lernplanId}`) }}
                  className="w-full py-3 rounded-btn text-[14px] font-bold transition-all press-sm flex items-center justify-center gap-2"
                  style={{ background: 'rgb(var(--color-accent) / 0.10)', color: 'rgb(var(--color-accent))' }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Zum Lernplan
                </button>
              )}

              {/* Delete */}
              <button
                onClick={() => { removeEntry(selectedEntry.id); closeDetail() }}
                className="w-full py-3 rounded-btn border text-[14px] font-bold transition-all press-sm mt-1"
                style={{
                  borderColor: 'rgb(var(--color-danger) / 0.3)',
                  color: 'rgb(var(--color-danger))',
                  background: 'rgb(var(--color-danger) / 0.05)',
                }}
              >
                Eintrag löschen
              </button>
            </div>
          </div>
        </>
      )}

      {/* Die beiden Stundenplan-Overlays lagen hier, weil der Kalender-Screen
          den Stundenplan als Kachel mitfuehrte. Die Kachel ist weg, die Rubrik
          „Stundenplan" hat ihren eigenen Screen — die Overlays waren danach von
          nirgends mehr erreichbar. */}
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
      <button onClick={onPrevWeek} className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-hover border border-border/30 shadow-sm text-text-secondary hover:bg-surface press-sm shrink-0 tap-44">
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
                  background: 'var(--grad-mode)',
                  color: 'white',
                  border: '1px solid rgb(var(--color-accent) / 0.6)',
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
      <button onClick={onNextWeek} className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-hover border border-border/30 shadow-sm text-text-secondary hover:bg-surface press-sm shrink-0 tap-44">
        <ChevronRight />
      </button>
    </div>
  )
}

// ─── Two-Day View ─────────────────────────────────────────────────────────────

interface TwoDayProps {
  /** Wie viele Tagesspalten nebeneinander stehen — zwei auf dem Telefon, vier im Querformat. */
  dayCount?: number
  viewDate: Date; todayStr: string; stundenplan: Stundenplan | undefined
  personalEntries: PersonalEntry[]; klausurtermine: { subjectId: string; date: string }[]
  calOpen: boolean; showStundenplan: boolean
  onSlotPress: (dateStr: string, time: string) => void
  onEntryPress: (entry: PersonalEntry) => void
}

function TwoDayView({ dayCount = 2, viewDate, todayStr, stundenplan, personalEntries, klausurtermine, calOpen, showStundenplan, onSlotPress, onEntryPress }: TwoDayProps) {
  // Sieben Spalten heissen: ganze Woche ab Montag — so sieht der Schreibtisch
  // aus. Auf dem Telefon sind es zwei Tage ab dem gewaehlten, mit Wochenleiste
  // darueber.
  const start = dayCount >= 7 ? mondayOf(viewDate) : viewDate
  const days = Array.from({ length: dayCount }, (_, i) => addDays(start, i))
  const gridHeight = TOTAL_H * PX_PER_HOUR
  const hours = Array.from({ length: TOTAL_H }, (_, i) => START_H + i)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Auf dem Schreibtisch gibt es kein Auf- und Zuklappen; dort muss der
    // Sprung zur aktuellen Stunde trotzdem passieren.
    if ((!calOpen && dayCount < 7) || !scrollRef.current) return
    requestAnimationFrame(() => {
      if (!scrollRef.current) return
      const now = new Date()
      const nowMin = now.getHours() * 60 + now.getMinutes()
      const nowPx = minToPx(nowMin)
      const viewH = scrollRef.current.clientHeight || 320
      scrollRef.current.scrollTop = Math.max(0, nowPx - viewH / 2)
    })
  }, [calOpen, dayCount])

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
      <div className="flex shrink-0 border-b border-border/20" style={{ paddingLeft: 48 }}>
        {days.map((d, i) => {
          const isToday = toDateStr(d) === todayStr
          return (
            <div key={i} className={`flex-1 text-center py-2 border-l border-border/20`}>
              <span className={`text-[11px] font-bold ${isToday ? 'text-text-primary' : 'text-text-secondary'}`}>
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
          <div className="shrink-0 relative" style={{ width: 48, height: gridHeight }}>
            {hours.map((h) => (
              <div key={h} className="absolute right-2 flex items-center" style={{ top: minToPx(h * 60) - 7 }}>
                <span className="text-[11px] text-text-secondary tabular-nums leading-none">{h}:00</span>
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
                      <span className="text-[7px] font-bold truncate" style={{ color: '#FF3B30' }}>{subj?.name?.slice(0, 6) ?? 'Klausur'}</span>
                    </div>
                  )
                })}

                {/* Stundenplan blocks */}
                {showStundenplan && spSlots.map((slot) => {
                  const topPx = toPx(slot.startTime)
                  const startMin = slot.startTime.split(':').map(Number).reduce((h, m) => h * 60 + m)
                  const endMin   = slot.endTime.split(':').map(Number).reduce((h, m) => h * 60 + m)
                  const heightPx = Math.max(durToPx(endMin - startMin), 22)
                  return (
                    <StundenplanPill
                      key={slot.id}
                      slot={slot}
                      variant="timeline"
                      style={{ top: topPx, height: heightPx }}
                      onClick={(e) => e.stopPropagation()}
                    />
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
                    <div key={entry.id} className="absolute left-0.5 right-0.5 rounded-[7px] flex flex-col justify-center px-2 overflow-hidden cursor-pointer press-sm" style={{ top: toPx(entry.time), height: heightPx, background: `${entryColor}33`, borderLeft: `2.5px solid ${entryColor}` }} onClick={(e) => { e.stopPropagation(); onEntryPress(entry) }}>
                      <span className="text-[9px] font-bold truncate leading-tight" style={{ color: entryColor }}>{entry.title}</span>
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
                      <div className="w-2 h-2 rounded-full -ml-1 shrink-0" style={{ background: 'var(--grad-mode)' }} />
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
          <div key={d} className="text-center text-[11px] font-bold text-text-muted/60">{d}</div>
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
                  background: 'var(--grad-mode)',
                  color: 'white',
                  boxShadow: '0 2px 6px rgb(var(--color-accent) / 0.4)',
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
            <button key={m} onClick={() => onMonthPress(new Date(year, m, 1))} className="bg-background rounded-btn p-2 border text-left press-sm" style={{ borderColor: isCurrent ? 'rgb(var(--color-accent) / 0.6)' : 'rgb(var(--color-border) / 0.3)', boxShadow: isCurrent ? '0 0 0 1px rgb(var(--color-accent) / 0.2)' : 'none' }}>
              <p className="text-[9px] font-bold mb-1 text-center" style={{ color: isCurrent ? 'rgb(var(--color-accent))' : 'rgb(var(--color-text-secondary))' }}>{MONTHS_SHORT[m]}</p>
              <div className="grid grid-cols-7 gap-y-px">
                {['M','D','M','D','F','S','S'].map((l, i) => <div key={i} className="text-center text-[4px] text-text-muted/30">{l}</div>)}
                {cells.map((day, idx) => {
                  if (!day) return <div key={idx} className="aspect-square" />
                  const dateStr = `${year}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  const isToday = dateStr === todayStr
                  const hasEvt  = personalEntries.some((e) => e.date === dateStr) || klausurtermine.some((k) => k.date === dateStr)
                  return (
                    <div key={idx} className="flex items-center justify-center aspect-square rounded-[2px]" style={{ background: isToday ? 'rgb(var(--color-accent))' : hasEvt ? 'rgb(var(--color-accent) / 0.2)' : 'transparent' }}>
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

// Zeichen der Planen-Kacheln.
//
// Vorher trug jede Kachel eine eigene Farbe mit farbigem Schein darunter —
// Grau, Orange, Rot, Lila, Gelb nebeneinander, ohne dass die Farbe etwas
// bedeutet haette. Jetzt gilt: Neutral ist der Normalfall, Farbe sagt etwas
// ueber den Zustand (offene Aufgaben, naher Termin), und was dem Modus selbst
// gehoert, traegt die Modusfarbe. Der Schein ist ersatzlos entfallen.
type PillTone = 'neutral' | 'mode' | 'warn' | 'done'

function AppIconPill({ tone = 'neutral', children }: { tone?: PillTone; children: React.ReactNode }) {
  const styles: Record<PillTone, string> = {
    neutral: 'bg-[rgb(120,120,128)]/[0.12] dark:bg-[rgb(120,120,128)]/[0.24] text-text-primary',
    mode:    'btn-mode',
    warn:    'bg-[rgb(120,120,128)]/[0.12] dark:bg-[rgb(120,120,128)]/[0.24] text-[rgb(var(--fill-red))]',
    done:    'bg-[rgb(120,120,128)]/[0.12] dark:bg-[rgb(120,120,128)]/[0.24] text-[rgb(var(--fill-green))]',
  }
  return (
    <div className={`w-11 h-11 rounded-icon flex items-center justify-center shrink-0 ${styles[tone]}`}>
      {children}
    </div>
  )
}

// ─── Stundenplan Mini Widget ──────────────────────────────────────────────────


// ─── Stundenplan Week Widget (full-width) ────────────────────────────────────

const WEEK_DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr']

export function StundenplanWeekWidget({ stundenplan, onOpen }: { stundenplan: Stundenplan; onOpen: () => void }) {
  const daySlots = WEEK_DAYS.map((_, i) =>
    stundenplan.slots
      .filter((s) => s.day === i)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  )

  return (
    <button
      onClick={onOpen}
      className="flex flex-col bg-surface border border-border/60 rounded-card shadow-card-adaptive overflow-hidden press-sm text-left w-full"
    >
      <div className="flex items-center gap-2.5 px-3.5 pt-3.5 pb-2.5">
        <AppIconPill>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        </AppIconPill>
        <span className="text-[13px] font-bold text-text-primary leading-tight flex-1">Stundenplan</span>
        <span className="text-[11px] font-semibold" style={{ color: 'rgb(var(--color-text-secondary))' }}>Bearbeiten →</span>
      </div>
      <div className="grid grid-cols-5 gap-1.5 px-3 pb-3.5">
        {WEEK_DAYS.map((label, i) => (
          <div key={label} className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-text-muted text-center mb-0.5">{label}</span>
            {daySlots[i].length === 0 ? (
              <span className="text-[11px] text-text-muted text-center">–</span>
            ) : (
              daySlots[i].map((slot) => <StundenplanPill key={slot.id} slot={slot} variant="compact" />)
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
        <p className="section-label mb-2">Fach</p>
        <div className="grid grid-cols-3 gap-1.5">
          {faecher.map((id) => {
            const subj = SUBJECT_INFO[id]
            if (!subj) return null
            const active = subjectId === id
            return (
              <button
                key={id}
                onClick={() => onSubjectId(id)}
                className="flex items-center gap-1.5 p-2.5 rounded-btn border text-left transition-all press-sm"
                style={active ? { background: `${subj.color}18`, borderColor: subj.color } : { borderColor: 'rgb(var(--color-border) / 0.6)', background: 'transparent' }}
              >
                <SubjectIcon subjectId={id} size="sm" className="!w-5 !h-5" />
                <span className="text-[11px] font-semibold truncate leading-tight" style={{ color: active ? subj.color : 'rgb(var(--color-text-secondary))' }}>{subj.name}</span>
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
          onChange={(e) => onDate(e.target.value)}
          min={new Date().toISOString().slice(0, 10)}
          className="w-full bg-background border border-border rounded-btn px-3 py-2.5 text-[13px] text-text-primary focus:outline-none focus:border-accent transition-colors"
        />
      </div>

      <div>
        <p className="section-label mb-1.5">Thema (optional)</p>
        {subjectTopics.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {subjectTopics.slice(0, 6).map((t) => (
              <button
                key={t}
                onClick={() => onTopic(topic === t ? '' : t)}
                className="px-2.5 py-1 rounded-pill text-[11px] font-medium press-sm transition-all"
                style={topic === t
                  ? { background: '#FF3B30', color: 'white' }
                  : { background: 'rgb(var(--color-border) / 0.4)', color: 'rgb(var(--color-text-secondary))' }
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
          className="w-full bg-background border border-border rounded-btn px-3 py-2.5 text-[13px] text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
        />
      </div>
    </div>
  )
}

// ─── Stundenplan Setup Widget ─────────────────────────────────────────────────

const SP_DAY_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr'] as const

export function StundenplanSetupWidget({ faecher, onSave, initialSlots }: { faecher: string[]; onSave: (slots: StundenplanSlot[]) => void; initialSlots?: StundenplanSlot[] }) {
  const { profile: spProfile } = useUser()
  const [open, setOpen] = useState(() => !!initialSlots)
  const [mode, setMode] = useState<'choose' | 'manual' | 'scan'>(() => (initialSlots && initialSlots.length > 0 ? 'manual' : 'choose'))
  const [slots, setSlots] = useState<StundenplanSlot[]>(initialSlots ?? [])
  const [activeDay, setActiveDay] = useState(0)
  const [addingSlot, setAddingSlot] = useState(false)
  const [newSlot, setNewSlot] = useState({ startTime: '08:00', endTime: '08:45', subjectId: '', room: '', isFreistunde: false })
  const fileRef = useRef<HTMLInputElement>(null)
  const [scanFile, setScanFile] = useState<File | null>(null)
  const [scanPhase, setScanPhase] = useState<'idle' | 'analyzing' | 'error'>('idle')
  const [scanError, setScanError] = useState('')
  const [fromAI, setFromAI] = useState(false)

  const profileSubjects = faecher.map((id) => ({ id, ...resolveSubjectInfo(id, spProfile?.customFaecher) }))
  const daySlots = slots.filter((s) => s.day === activeDay).sort((a, b) => a.startTime.localeCompare(b.startTime))
  const totalSlots = slots.length

  const handleStartTime = (startTime: string) => {
    const [h, m] = startTime.split(':').map(Number)
    const endMin = h * 60 + m + 45
    const endTime = `${String(Math.floor(endMin / 60) % 24).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`
    setNewSlot((n) => ({ ...n, startTime, endTime }))
  }

  const commitSlot = () => {
    if (!newSlot.subjectId && !newSlot.isFreistunde) return
    setSlots((prev) => [...prev, {
      id: `slot-${Date.now()}`,
      day: activeDay,
      startTime: newSlot.startTime,
      endTime: newSlot.endTime,
      subjectId: newSlot.isFreistunde ? '' : newSlot.subjectId,
      room: newSlot.isFreistunde ? undefined : (newSlot.room || undefined),
      ...(newSlot.isFreistunde ? { isFreistunde: true } : {}),
    }])
    setAddingSlot(false)
    setNewSlot({ startTime: '08:00', endTime: '08:45', subjectId: '', room: '', isFreistunde: false })
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
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-3 bg-surface border border-border/60 rounded-card shadow-card-adaptive px-5 py-4 text-left hover:bg-surface-hover active:scale-[0.99] transition-all duration-200">
        <div className="w-10 h-10 rounded-btn btn-mode flex items-center justify-center shrink-0"><Icon name="calendar" size={19} /></div>
        <div className="flex-1">
          <p className="text-text-primary font-semibold text-[15px]">Stundenplan einrichten</p>
          <p className="text-text-muted text-[12px] mt-0.5">Dein Schultag auf einen Blick</p>
        </div>
        <svg className={`text-text-muted shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>

      {open && (
        <div className="mt-1.5 bg-surface border border-border/60 rounded-card shadow-card-adaptive overflow-hidden animate-fade-in">

          {mode === 'choose' && (
            <div className="p-4 space-y-2">
              <button onClick={() => setMode('manual')} className="w-full flex items-center gap-3 bg-background border border-border rounded-icon px-4 py-3.5 text-left hover:bg-surface-hover active:scale-[0.98] transition-all">
                <span className="shrink-0 text-text-secondary"><Icon name="pencil" size={19} /></span>
                <div className="flex-1"><p className="text-text-primary font-semibold text-[14px]">Manuell eintragen</p><p className="text-text-muted text-[12px] mt-0.5">Fächer und Zeiten eingeben</p></div>
                <ChevronRight />
              </button>
              <button onClick={() => setMode('scan')} className="w-full flex items-center gap-3 bg-background border border-border rounded-icon px-4 py-3.5 text-left hover:bg-surface-hover active:scale-[0.98] transition-all">
                <span className="shrink-0 text-text-secondary"><Icon name="camera" size={19} /></span>
                <div className="flex-1"><p className="text-text-primary font-semibold text-[14px]">Foto / Scan hochladen</p><p className="text-text-muted text-[12px] mt-0.5">Stundenplan fotografieren oder PDF</p></div>
                <ChevronRight />
              </button>
              <button onClick={handleClose} className="w-full py-2.5 text-center text-[13px] text-text-muted hover:text-text-secondary transition-colors">Schließen</button>
            </div>
          )}

          {mode === 'scan' && (
            <div className="p-4 space-y-3">
              <button onClick={() => { setMode(totalSlots > 0 ? 'manual' : 'choose'); setScanPhase('idle'); setScanError(''); setScanFile(null) }} className="flex items-center gap-1.5 text-text-primary text-sm font-medium hover:opacity-80 transition-opacity">
                <ChevronLeft />Zurück
              </button>
              {scanPhase === 'idle' && (
                <button onClick={() => fileRef.current?.click()} className="w-full border-2 border-dashed border-border rounded-card p-6 flex flex-col items-center gap-2 hover:border-accent/50 hover:bg-accent/5 transition-all">
                  <div className="w-12 h-12 rounded-btn btn-mode flex items-center justify-center"><Icon name="camera" size={22} /></div>
                  <p className="text-text-primary font-semibold text-[14px]">Foto oder PDF auswählen</p>
                  <p className="text-text-muted text-xs">KI erkennt Fächer und Zeiten automatisch</p>
                </button>
              )}
              {scanPhase === 'analyzing' && (
                <div className="bg-background border border-border rounded-card p-5 flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-[3px] border-accent/25 border-t-accent rounded-full animate-spin" />
                  <p className="text-text-primary font-semibold text-[14px]">KI analysiert Stundenplan…</p>
                  <p className="text-text-muted text-[12px] truncate max-w-[200px]">{scanFile?.name}</p>
                </div>
              )}
              {scanPhase === 'error' && (
                <div className="space-y-2">
                  <div className="rounded-icon p-4" style={{ background: 'rgb(var(--color-danger) / 0.08)', border: '1px solid rgb(var(--color-danger) / 0.25)' }}>
                    <p className="text-text-primary font-semibold text-[14px] mb-1">Erkennung fehlgeschlagen</p>
                    <p className="text-text-muted text-[12px] leading-relaxed">{scanError}</p>
                  </div>
                  <button onClick={() => { setScanPhase('idle'); setScanFile(null); setScanError('') }} className="w-full py-2.5 rounded-btn btn-mode text-sm font-semibold active:scale-95 transition-all">Erneut versuchen</button>
                  <button onClick={() => { setMode('manual'); setScanPhase('idle'); setScanError('') }} className="w-full py-2.5 rounded-btn border border-border text-text-secondary text-sm font-medium hover:bg-surface-hover transition-colors">Manuell eintragen</button>
                </div>
              )}
              <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,image/*,application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleScanFileSelect(f) }} />
            </div>
          )}

          {mode === 'manual' && (
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <button onClick={() => { setMode('choose'); setAddingSlot(false); setFromAI(false) }} className="flex items-center gap-1.5 text-text-primary text-sm font-medium hover:opacity-80 transition-opacity">
                  <ChevronLeft />Zurück
                </button>
                {totalSlots > 0 && !addingSlot && (
                  <button onClick={handleSave} className="px-3.5 py-1.5 rounded-pill text-on-accent text-[12px] font-bold press-sm" style={{ background: 'rgb(var(--color-accent))', boxShadow: '0 3px 10px rgb(var(--color-accent) / 0.35)' }}>
                    Speichern · {totalSlots} Std
                  </button>
                )}
              </div>

              {fromAI && totalSlots > 0 && (
                <div className="rounded-btn px-3 py-2.5 flex items-center gap-2" style={{ background: 'rgb(var(--color-success) / 0.08)', border: '1px solid rgb(var(--color-success) / 0.25)' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-text-primary shrink-0"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  <p className="text-[12px] font-medium text-text-primary">{totalSlots} Stunden erkannt — prüfen &amp; anpassen</p>
                </div>
              )}

              <div className="flex gap-1">
                {SP_DAY_SHORT.map((d, i) => {
                  const count = slots.filter((s) => s.day === i).length
                  return (
                    <button key={d} onClick={() => { setActiveDay(i); setAddingSlot(false) }}
                      className="flex-1 flex flex-col items-center py-2 rounded-btn transition-all duration-200 border"
                      style={activeDay === i ? {
                        background: 'var(--grad-mode)',
                        borderColor: 'transparent',
                      } : { background: 'rgb(var(--color-background))', borderColor: 'rgb(var(--color-border) / 0.6)' }}>
                      <span className={`text-[11px] font-semibold ${activeDay === i ? 'text-white/80' : 'text-text-muted'}`}>{d}</span>
                      <span className={`text-[12px] font-bold mt-0.5 ${activeDay === i ? 'text-white' : count > 0 ? 'text-text-primary' : 'text-text-muted/30'}`}>{count > 0 ? count : '·'}</span>
                    </button>
                  )
                })}
              </div>

              {daySlots.length > 0 && (
                <div className="space-y-1.5">
                  {daySlots.map((slot) => {
                    const subj = SUBJECT_INFO[slot.subjectId]
                    const name = slot.isFreistunde ? 'Freistunde' : (subj?.name ?? slot.subjectId)
                    return (
                      <div key={slot.id} className="bg-background border border-border/60 rounded-btn p-3 flex items-center gap-2.5 animate-fade-in">
                        {slot.isFreistunde ? (
                          <div className="w-8 h-8 rounded-btn flex items-center justify-center shrink-0 bg-surface-hover">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-text-muted))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 8h1a4 4 0 010 8h-1" /><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" /><line x1="6" y1="1" x2="6" y2="4" /><line x1="10" y1="1" x2="10" y2="4" /><line x1="14" y1="1" x2="14" y2="4" />
                            </svg>
                          </div>
                        ) : (
                          <SubjectIcon subjectId={slot.subjectId} size="sm" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-text-primary font-semibold text-[13px]">{name}</p>
                          <p className="text-text-muted text-[11px]">{slot.startTime} – {slot.endTime}{slot.room ? ` · ${slot.room}` : ''}</p>
                        </div>
                        <button onClick={() => removeSlot(slot.id)} className="w-6 h-6 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors shrink-0">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" /></svg>
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              {!addingSlot ? (
                <button onClick={() => setAddingSlot(true)} className="w-full border border-dashed border-border rounded-btn py-3 flex items-center justify-center gap-2 text-text-muted hover:border-accent/50 hover:text-text-primary hover:bg-accent/5 transition-all">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>
                  <span className="text-[13px] font-medium">Stunde hinzufügen</span>
                </button>
              ) : (
                <div className="bg-background border border-accent/30 rounded-icon p-3.5 space-y-2.5">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <p className="section-label mb-1">Von</p>
                      <input type="time" value={newSlot.startTime} onChange={(e) => handleStartTime(e.target.value)} className="w-full bg-surface border border-border rounded-btn px-2.5 py-2 text-text-primary text-sm focus:outline-none focus:border-accent transition-colors" />
                    </div>
                    <div className="flex-1">
                      <p className="section-label mb-1">Bis</p>
                      <input type="time" value={newSlot.endTime} onChange={(e) => setNewSlot((n) => ({ ...n, endTime: e.target.value }))} className="w-full bg-surface border border-border rounded-btn px-2.5 py-2 text-text-primary text-sm focus:outline-none focus:border-accent transition-colors" />
                    </div>
                  </div>
                  <p className="section-label">Fach</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {profileSubjects.map((s) => (
                      <button key={s.id} onClick={() => setNewSlot((n) => ({ ...n, subjectId: s.id, isFreistunde: false }))} className={`flex items-center gap-1.5 p-2 rounded-btn border text-left transition-all duration-150 ${!newSlot.isFreistunde && newSlot.subjectId === s.id ? 'border-accent bg-accent-soft' : 'border-border bg-surface hover:bg-surface-hover'}`}>
                        <SubjectIcon subjectId={s.id} size="sm" className="!w-5 !h-5" />
                        <span className={`text-[11px] font-medium leading-tight truncate ${!newSlot.isFreistunde && newSlot.subjectId === s.id ? 'text-text-primary' : 'text-text-secondary'}`}>{s.name}</span>
                      </button>
                    ))}
                    <button onClick={() => setNewSlot((n) => ({ ...n, subjectId: '', isFreistunde: true }))} className={`flex items-center gap-1.5 p-2 rounded-btn border border-dashed text-left transition-all duration-150 ${newSlot.isFreistunde ? 'border-accent bg-accent-soft' : 'border-border bg-surface hover:bg-surface-hover'}`}>
                      <span className="shrink-0 text-text-secondary"><Icon name="coffee" size={14} /></span>
                      <span className={`text-[11px] font-medium leading-tight truncate ${newSlot.isFreistunde ? 'text-text-primary' : 'text-text-secondary'}`}>Freistunde</span>
                    </button>
                  </div>
                  {!newSlot.isFreistunde && (
                    <input type="text" value={newSlot.room} onChange={(e) => setNewSlot((n) => ({ ...n, room: e.target.value }))} placeholder="Raum (optional)" className="w-full bg-surface border border-border rounded-btn px-2.5 py-2 text-text-primary text-sm placeholder-text-muted focus:outline-none focus:border-accent transition-colors" />
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => { setAddingSlot(false); setNewSlot({ startTime: '08:00', endTime: '08:45', subjectId: '', room: '', isFreistunde: false }) }} className="flex-1 py-2 rounded-btn border border-border text-text-secondary text-sm font-medium hover:bg-surface-hover transition-colors">Abbrechen</button>
                    <button onClick={commitSlot} disabled={!newSlot.subjectId && !newSlot.isFreistunde} className="flex-1 py-2 rounded-btn text-white text-sm font-bold disabled:opacity-40 active:scale-95 transition-all" style={{ background: 'var(--grad-mode)' }}>Hinzufügen</button>
                  </div>
                </div>
              )}

              {totalSlots > 0 && !addingSlot && (
                <button onClick={handleSave} className="w-full py-3 rounded-icon text-on-accent text-[14px] font-bold press-sm" style={{ background: 'rgb(var(--color-accent))', boxShadow: '0 4px 16px rgb(var(--color-accent) / 0.4)' }}>
                  Stundenplan speichern · {totalSlots} Stunde{totalSlots === 1 ? '' : 'n'}
                </button>
              )}

              {!addingSlot && (
                <button
                  onClick={() => { setMode('scan'); setScanPhase('idle'); setScanError(''); setScanFile(null) }}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-pill text-[13px] font-bold press-sm"
                  style={{ background: 'rgb(var(--color-accent) / 0.1)', color: 'rgb(var(--color-accent))' }}
                >
                  <span className="shrink-0 text-text-secondary"><Icon name="camera" size={14} /></span>
                  Mit KI Scannen
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
