import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { SUBJECT_INFO } from '../data/subjectInfo'
import { endnoteForEntry } from './AbiRechnerScreen'
import type { AbiHalbjahr } from '../types'

// ── Constants ──────────────────────────────────────────────────────────────

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'] as const
type Quarter = (typeof QUARTERS)[number]

// ── Helpers ────────────────────────────────────────────────────────────────

function npToLabel(np: number): string {
  const m: Record<number, string> = {
    15: '1+', 14: '1', 13: '1−', 12: '2+', 11: '2', 10: '2−',
    9: '3+', 8: '3', 7: '3−', 6: '4+', 5: '4', 4: '4−',
    3: '5+', 2: '5', 1: '5−', 0: '6',
  }
  return m[Math.round(Math.max(0, Math.min(15, np)))] ?? '—'
}

function npToBarColor(np: number): string {
  if (np >= 11) return '#34C759'
  if (np >= 8) return '#FF9500'
  if (np >= 5) return '#FF6B35'
  return '#FF3B30'
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / 86400000)
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
}

function last7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().slice(0, 10)
  })
}

function dayLabel(dateStr: string): string {
  return ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][new Date(dateStr).getDay()]
}

function getWeekStart(): string {
  const d = new Date()
  const day = d.getDay() || 7
  d.setDate(d.getDate() - day + 1)
  return d.toISOString().slice(0, 10)
}

function getCurrentNP(subjectId: string, halbjahre: AbiHalbjahr[]): { np: number | null; quarter: Quarter | null; isLK: boolean } {
  for (const q of ['Q4', 'Q3', 'Q2', 'Q1'] as Quarter[]) {
    const hj = halbjahre.find((h) => h.label === q)
    if (!hj) continue
    const entry = hj.entries.find((e) => e.subjectId === subjectId)
    if (!entry) continue
    const np = endnoteForEntry(entry)
    if (np !== null) return { np, quarter: q, isLK: entry.isLK }
  }
  return { np: null, quarter: null, isLK: false }
}

function zielnoteToNP(z: string): number {
  return 17 - parseFloat(z.replace(',', '.')) * 3
}

function getCurrentStreak(streak: number, lastStudyDate: string | null): number {
  if (!lastStudyDate) return 0
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().slice(0, 10)
  return lastStudyDate === today || lastStudyDate === yesterdayStr ? streak : 0
}

// ── Grade Line Chart ───────────────────────────────────────────────────────

interface ChartLine {
  subjectId: string
  name: string
  color: string
  data: Array<{ q: Quarter; np: number | null }>
}

function buildChartLines(halbjahre: AbiHalbjahr[], faecher: string[]): ChartLine[] {
  return faecher.flatMap((subjectId) => {
    const info = SUBJECT_INFO[subjectId]
    if (!info) return []
    const data = QUARTERS.map((q) => {
      const hj = halbjahre.find((h) => h.label === q)
      const entry = hj?.entries.find((e) => e.subjectId === subjectId)
      return { q, np: entry ? endnoteForEntry(entry) : null }
    })
    if (data.every((d) => d.np === null)) return []
    return [{ subjectId, name: info.name, color: info.color, data }]
  })
}

function GradeChart({ lines, zielnoteNP }: { lines: ChartLine[]; zielnoteNP: number | null }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const W = 310, H = 130
  const PL = 22, PR = 36, PT = 10, PB = 22
  const cW = W - PL - PR
  const cH = H - PT - PB

  const xPos = (qi: number) => PL + (qi / 3) * cW
  const yPos = (np: number) => PT + cH - (np / 15) * cH

  const buildPath = (data: ChartLine['data']) => {
    let path = ''
    let penUp = true
    data.forEach((d, i) => {
      if (d.np === null) { penUp = true; return }
      path += (penUp ? 'M' : ' L') + `${xPos(i).toFixed(1)},${yPos(d.np).toFixed(1)}`
      penUp = false
    })
    return path
  }

  if (lines.length === 0) {
    return (
      <div className="py-6 text-center">
        <p className="text-text-muted text-[13px]">Noch keine Noten im Abi-Rechner eingetragen</p>
      </div>
    )
  }

  return (
    <div>
      {/* Subject filter chips */}
      <div className="flex gap-1.5 flex-wrap mb-3">
        {lines.length > 1 && (
          <button
            onClick={() => setSelectedId(null)}
            className={`px-2.5 py-1 rounded-pill text-[11px] font-medium transition-colors press-sm ${
              selectedId === null ? 'bg-accent text-white' : 'bg-background text-text-muted'
            }`}
          >
            Alle
          </button>
        )}
        {lines.map((l) => (
          <button
            key={l.subjectId}
            onClick={() => setSelectedId((prev) => (prev === l.subjectId ? null : l.subjectId))}
            className="px-2.5 py-1 rounded-pill text-[11px] font-medium transition-colors press-sm"
            style={
              selectedId === l.subjectId
                ? { background: l.color + '28', color: l.color, border: `1px solid ${l.color}55` }
                : { background: 'var(--color-background)', color: 'var(--color-text-muted)' }
            }
          >
            {l.name}
          </button>
        ))}
      </div>

      {/* SVG chart */}
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ height: 130 }}>
        {/* Grid lines */}
        {[5, 10].map((np) => (
          <line
            key={np}
            x1={PL} y1={yPos(np)} x2={W - PR} y2={yPos(np)}
            stroke="var(--color-border)" strokeWidth="0.6" strokeDasharray="3 3"
          />
        ))}
        {/* Y-axis labels */}
        {[0, 5, 10, 15].map((np) => (
          <text key={np} x={PL - 3} y={yPos(np) + 3.5} fontSize="8" textAnchor="end" fill="var(--color-text-muted)">
            {np}
          </text>
        ))}
        {/* X-axis labels */}
        {QUARTERS.map((q, i) => (
          <text key={q} x={xPos(i)} y={H - 4} fontSize="9" textAnchor="middle" fill="var(--color-text-muted)">
            {q}
          </text>
        ))}
        {/* Zielnote dashed line */}
        {zielnoteNP !== null && (
          <>
            <line
              x1={PL} y1={yPos(zielnoteNP)} x2={W - PR} y2={yPos(zielnoteNP)}
              stroke="#FF9500" strokeWidth="1.2" strokeDasharray="5 3" opacity="0.85"
            />
            <text x={W - PR + 4} y={yPos(zielnoteNP) + 3.5} fontSize="8" fill="#FF9500" fontWeight="500">
              Ziel
            </text>
          </>
        )}
        {/* Subject lines */}
        {lines.map((l) => {
          const isSelected = selectedId === l.subjectId
          const opacity = selectedId === null || isSelected ? 1 : 0.1
          const path = buildPath(l.data)
          if (!path) return null
          const lastIdx = l.data.reduce((acc, d, i) => (d.np !== null ? i : acc), -1)
          return (
            <g key={l.subjectId} opacity={opacity}>
              <path
                d={path} fill="none" stroke={l.color}
                strokeWidth={isSelected ? 2.5 : 1.8}
                strokeLinecap="round" strokeLinejoin="round"
              />
              {l.data.map((d, i) =>
                d.np !== null ? (
                  <circle
                    key={i} cx={xPos(i)} cy={yPos(d.np)}
                    r={isSelected ? 3.5 : 2.5}
                    fill={l.color} stroke="var(--color-surface)" strokeWidth="1"
                  />
                ) : null,
              )}
              {isSelected && lastIdx >= 0 && l.data[lastIdx].np !== null && (
                <text
                  x={xPos(lastIdx)} y={yPos(l.data[lastIdx].np!) - 7}
                  fontSize="9" textAnchor="middle" fill={l.color} fontWeight="600"
                >
                  {npToLabel(l.data[lastIdx].np!)}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ── Study Tips ─────────────────────────────────────────────────────────────

interface TipCtx {
  streak: number
  nextExamInDays: number | null
  weakestName: string | null
  weakestNP: number | null
  isOnTrack: boolean | null
}

interface TipDef {
  id: string
  icon: string
  accentColor: string
  title: (ctx: TipCtx) => string
  text: (ctx: TipCtx) => string
  condition: ((ctx: TipCtx) => boolean) | null
  priority: number
}

const ALL_TIPS: TipDef[] = [
  {
    id: 'exam-urgent',
    icon: '🔔',
    accentColor: '#EF4444',
    title: (ctx) => `Klausur in ${ctx.nextExamInDays} Tagen`,
    text: () => 'Nutze jetzt Active Recall: Schreib ohne Notizen alles auf, was du weißt. Das ist 2× effektiver als erneutes Lesen.',
    condition: (ctx) => ctx.nextExamInDays !== null && ctx.nextExamInDays > 0 && ctx.nextExamInDays <= 7,
    priority: 10,
  },
  {
    id: 'exam-soon',
    icon: '⏰',
    accentColor: '#F97316',
    title: (ctx) => `Klausur in ${ctx.nextExamInDays} Tagen`,
    text: () => 'Starte täglich mit 25 Minuten Probeklausur. So trainierst du das Abrufen unter Zeitdruck — genau wie im echten Abi.',
    condition: (ctx) => ctx.nextExamInDays !== null && ctx.nextExamInDays > 7 && ctx.nextExamInDays <= 21,
    priority: 8,
  },
  {
    id: 'weakness',
    icon: '📈',
    accentColor: '#6366F1',
    title: (ctx) => `${ctx.weakestName} verbessern`,
    text: () => '5 Karteikarten pro Tag fürs Schwachfach. Kleine, konsistente Einheiten schlagen Marathon-Lernen am Wochenende.',
    condition: (ctx) => ctx.weakestNP !== null && ctx.weakestNP < 8 && ctx.weakestName !== null,
    priority: 7,
  },
  {
    id: 'streak-high',
    icon: '🔥',
    accentColor: '#FF9500',
    title: (ctx) => `${ctx.streak} Tage Streak — stark!`,
    text: () => 'Konstanz ist der stärkste Lernbooster. Selbst 10 Minuten täglich reichen, um den Streak zu halten.',
    condition: (ctx) => ctx.streak >= 7,
    priority: 5,
  },
  {
    id: 'on-track',
    icon: '⭐',
    accentColor: '#34C759',
    title: () => 'Du bist auf Kurs!',
    text: () => 'Deine Note liegt im Zielbereich. Halte dieses Niveau durch regelmäßige Wiederholungen — Konstanz schlägt Intensität.',
    condition: (ctx) => ctx.isOnTrack === true,
    priority: 4,
  },
  {
    id: 'spaced-rep',
    icon: '🧠',
    accentColor: '#8B5CF6',
    title: () => 'Spaced Repetition',
    text: () => 'Dein Gehirn vergisst 80% innerhalb von 24h. Wiederhole Karteikarten täglich in kurzen Sessions — das verankert Wissen im Langzeitgedächtnis.',
    condition: null,
    priority: 3,
  },
  {
    id: 'active-recall',
    icon: '✏️',
    accentColor: '#14B8A6',
    title: () => 'Active Recall',
    text: () => 'Schreib auf, was du weißt — ohne Notizen. Fehler jetzt zu machen ist der effektivste Weg zum Lernen.',
    condition: null,
    priority: 2,
  },
  {
    id: 'feynman',
    icon: '💡',
    accentColor: '#EAB308',
    title: () => 'Feynman-Methode',
    text: () => 'Erkläre ein Thema, als wärst du der Lehrer und dein Schüler ist 10 Jahre alt. Wo du stockst — da sind deine Lücken.',
    condition: null,
    priority: 2,
  },
  {
    id: 'pomodoro',
    icon: '🍅',
    accentColor: '#EF4444',
    title: () => 'Pomodoro-Technik',
    text: () => '25 Minuten fokussiert lernen, 5 Minuten Pause. Dein Gehirn braucht diese Erholung, um Gelerntes zu festigen.',
    condition: null,
    priority: 1,
  },
  {
    id: 'sleep',
    icon: '💤',
    accentColor: '#6366F1',
    title: () => 'Schlaf konsolidiert Wissen',
    text: () => 'Während du schläfst, schreibt dein Gehirn das Gelernte ins Langzeitgedächtnis. 8 Stunden vor der Klausur sind Gold wert.',
    condition: null,
    priority: 1,
  },
]

function selectTips(ctx: TipCtx): TipDef[] {
  const dayOfYear = Math.floor(Date.now() / 86400000)
  const contextTips = ALL_TIPS
    .filter((t) => t.condition !== null && t.condition(ctx))
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 2)
  const generalTips = ALL_TIPS.filter((t) => t.condition === null)
  const needed = 3 - contextTips.length
  const start = dayOfYear % generalTips.length
  const rotated = [...generalTips.slice(start), ...generalTips.slice(0, start)]
  return [...contextTips, ...rotated.slice(0, needed)]
}

// ── Main Screen ────────────────────────────────────────────────────────────

export function InsightsScreen() {
  const navigate = useNavigate()
  const { profile, appStats, userNotes, generatedFlashCards } = useUser()

  const halbjahre = profile?.abiHalbjahre ?? []
  const faecher = profile?.faecher ?? []
  const zielnote = profile?.zielnote
  const abiGesamtnote = profile?.abiGesamtnote

  const activeStreak = getCurrentStreak(appStats.streak, appStats.lastStudyDate)

  // Chart
  const chartLines = useMemo(() => buildChartLines(halbjahre, faecher), [halbjahre, faecher])
  const zielnoteNP = zielnote ? zielnoteToNP(zielnote) : null

  // Per-subject current grades
  const subjectGrades = useMemo(
    () =>
      faecher
        .map((subjectId) => ({
          subjectId,
          info: SUBJECT_INFO[subjectId],
          ...getCurrentNP(subjectId, halbjahre),
        }))
        .filter((s) => s.info),
    [faecher, halbjahre],
  )

  const sortedGrades = useMemo(
    () =>
      [...subjectGrades].sort((a, b) => {
        if (a.np === null && b.np === null) return 0
        if (a.np === null) return 1
        if (b.np === null) return -1
        return (b.np as number) - (a.np as number)
      }),
    [subjectGrades],
  )

  // Upcoming exams
  const upcomingExams = useMemo(
    () =>
      (profile?.klausurtermine ?? [])
        .map((k) => ({ ...k, days: daysUntil(k.date), info: SUBJECT_INFO[k.subjectId] }))
        .filter((k) => k.days > 0 && k.info)
        .sort((a, b) => a.days - b.days)
        .slice(0, 5),
    [profile?.klausurtermine],
  )

  const nextExamInDays = upcomingExams[0]?.days ?? null

  // Weakest subject
  const weakestSubject = useMemo(() => {
    const withGrades = subjectGrades.filter((s) => s.np !== null) as Array<{
      subjectId: string; info: { name: string; icon: string; color: string }; np: number; quarter: Quarter | null; isLK: boolean
    }>
    if (withGrades.length === 0) return null
    return withGrades.reduce((min, s) => ((s.np as number) < (min.np as number) ? s : min))
  }, [subjectGrades])

  // On track comparison
  const isOnTrack = useMemo(() => {
    if (!abiGesamtnote || !zielnote) return null
    const current = parseFloat(abiGesamtnote.replace(',', '.'))
    const target = parseFloat(zielnote.replace(',', '.'))
    return !isNaN(current) && !isNaN(target) ? current <= target : null
  }, [abiGesamtnote, zielnote])

  // Progress percentage toward zielnote
  const progressPct = useMemo(() => {
    if (!abiGesamtnote || !zielnote) return null
    const current = parseFloat(abiGesamtnote.replace(',', '.'))
    const target = parseFloat(zielnote.replace(',', '.'))
    if (isNaN(current) || isNaN(target) || target >= 6.0) return null
    return Math.round(Math.max(0, Math.min(100, ((6.0 - current) / (6.0 - target)) * 100)))
  }, [abiGesamtnote, zielnote])

  // Tips
  const tipCtx: TipCtx = {
    streak: activeStreak,
    nextExamInDays,
    weakestName: weakestSubject?.info.name ?? null,
    weakestNP: weakestSubject?.np ?? null,
    isOnTrack,
  }
  const tips = useMemo(() => selectTips(tipCtx), [
    activeStreak, nextExamInDays, weakestSubject?.subjectId, isOnTrack,
  ])

  // Weekly activity
  const days7 = useMemo(() => last7Days(), [])
  const studiedSet = new Set(appStats.studiedDays)
  const todayStr = new Date().toISOString().slice(0, 10)
  const weekStart = useMemo(() => getWeekStart(), [])
  const daysStudiedThisWeek = days7.filter((d) => d >= weekStart && studiedSet.has(d)).length

  // This-week notes and exams
  const notesThisWeek = userNotes.filter((n) => n.createdAt.slice(0, 10) >= weekStart).length
  const examsThisWeek = appStats.examScores.filter((s) => s.date.slice(0, 10) >= weekStart).length

  return (
    <div className="flex flex-col min-h-screen bg-background pb-28">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="px-4" style={{ paddingTop: 'max(58px, calc(env(safe-area-inset-top, 0px) + 18px))' }}>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-accent text-[14px] font-medium mb-3 press-sm -ml-0.5"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Zurück
        </button>
        <h1 className="text-[28px] font-bold text-text-primary">Statistiken</h1>
        <p className="text-[13px] text-text-muted mt-0.5">Dein Lernfortschritt auf einen Blick</p>
      </div>

      <div className="px-4 mt-5 space-y-4">

        {/* ── Quick Stats ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          {([
            { icon: '🔥', value: activeStreak.toString(), unit: 'Tage', label: 'Streak', color: '#FF9500' },
            { icon: '📝', value: userNotes.length.toString(), unit: '', label: 'Notizen', color: '#6366F1' },
            { icon: '📸', value: appStats.scanCount.toString(), unit: '', label: 'Scans', color: '#38BDF8' },
            { icon: '⭐', value: abiGesamtnote ?? '—', unit: '', label: 'Ø Note', color: '#34C759' },
          ] as const).map((s) => (
            <div key={s.label} className="bg-surface rounded-card shadow-card-adaptive border border-border/60 p-4">
              <div className="flex items-start justify-between mb-1.5">
                <span className="text-[22px]">{s.icon}</span>
                <p className="text-text-primary font-bold text-[22px] leading-none">
                  {s.value}
                  {s.unit && <span className="text-text-muted text-[12px] font-normal ml-1">{s.unit}</span>}
                </p>
              </div>
              <p className="text-text-muted text-[12px] mb-2">{s.label}</p>
              <div className="h-1 rounded-pill" style={{ background: `${s.color}25` }}>
                <div className="h-full rounded-pill" style={{ background: s.color, width: '35%' }} />
              </div>
            </div>
          ))}
        </div>

        {/* ── Zielnote Vergleich ────────────────────────────────────────── */}
        <div className="bg-surface rounded-card shadow-card-adaptive border border-border/60 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-text-primary font-bold text-[16px]">Zielnote-Vergleich</p>
              <p className="text-text-muted text-[12px] mt-0.5">
                {abiGesamtnote ? 'Aktuelle Tendenz im Abi-Rechner' : 'Noch keine Noten eingetragen'}
              </p>
            </div>
            <button onClick={() => navigate('/abi-rechner')} className="text-accent text-[13px] font-medium press-sm">
              {abiGesamtnote ? 'Details →' : 'Eintragen →'}
            </button>
          </div>

          {abiGesamtnote && zielnote ? (
            <div>
              <div className="flex items-end justify-between mb-4">
                <div>
                  <p className="text-text-muted text-[10px] uppercase tracking-widest mb-1.5">Aktuell</p>
                  <p className="text-[38px] font-bold leading-none" style={{ color: isOnTrack ? '#34C759' : '#FF6B35' }}>
                    {abiGesamtnote}
                  </p>
                </div>
                <div className="flex-1 flex justify-center">
                  {isOnTrack ? (
                    <span className="px-3 py-1.5 rounded-pill text-[12px] font-semibold" style={{ background: 'rgba(52,199,89,0.15)', color: '#34C759' }}>
                      ✓ Auf Kurs
                    </span>
                  ) : (
                    <span className="px-3 py-1.5 rounded-pill text-[12px] font-semibold" style={{ background: 'rgba(255,107,53,0.15)', color: '#FF6B35' }}>
                      {(parseFloat(abiGesamtnote.replace(',', '.')) - parseFloat(zielnote.replace(',', '.'))).toFixed(1)} Abstand
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-text-muted text-[10px] uppercase tracking-widest mb-1.5">Ziel</p>
                  <p className="text-[38px] font-bold text-text-secondary leading-none">{zielnote}</p>
                </div>
              </div>
              {progressPct !== null && (
                <div>
                  <div className="h-2.5 bg-border/40 rounded-pill overflow-hidden">
                    <div
                      className="h-full rounded-pill transition-all duration-700"
                      style={{
                        width: `${progressPct}%`,
                        background: isOnTrack ? '#34C759' : 'linear-gradient(90deg, #FF6B35, #FF9500)',
                      }}
                    />
                  </div>
                  <p className="text-text-muted text-[11px] mt-1.5">{progressPct}% auf dem Weg zur Zielnote</p>
                </div>
              )}
            </div>
          ) : abiGesamtnote ? (
            <div>
              <p className="text-[38px] font-bold text-text-primary">{abiGesamtnote}</p>
              <p className="text-text-muted text-[13px] mt-1">Lege eine Zielnote im Onboarding oder Abi-Rechner fest.</p>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-text-muted text-[14px] leading-relaxed">
                Trage deine Noten im Abi-Rechner ein, um hier deinen Fortschritt zu sehen.
              </p>
              <button
                onClick={() => navigate('/abi-rechner')}
                className="mt-4 px-5 py-2.5 rounded-card bg-accent text-white text-[14px] font-semibold press"
              >
                Zum Abi-Rechner →
              </button>
            </div>
          )}
        </div>

        {/* ── Notenverlauf Chart ────────────────────────────────────────── */}
        <div className="bg-surface rounded-card shadow-card-adaptive border border-border/60 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-text-primary font-bold text-[16px]">Notenverlauf</p>
              <p className="text-text-muted text-[12px] mt-0.5">Entwicklung Q1 → Q4 (NP 0–15)</p>
            </div>
          </div>
          <GradeChart lines={chartLines} zielnoteNP={zielnoteNP} />
        </div>

        {/* ── Fächer-Übersicht ──────────────────────────────────────────── */}
        <div>
          <h2 className="section-label mb-3">Fächer-Übersicht</h2>
          {sortedGrades.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {sortedGrades.map((s) => (
                <div key={s.subjectId} className="bg-surface rounded-card shadow-card-adaptive border border-border/60 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[22px]">{s.info.icon}</span>
                      {s.isLK && (
                        <span
                          className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                          style={{ background: s.info.color + '25', color: s.info.color }}
                        >
                          LK
                        </span>
                      )}
                    </div>
                    {s.quarter && <span className="text-text-muted text-[10px]">{s.quarter}</span>}
                  </div>
                  <p className="text-text-secondary text-[12px] truncate mb-1">{s.info.name}</p>
                  {s.np !== null ? (
                    <>
                      <div className="flex items-baseline gap-1.5">
                        <p className="font-bold text-[22px] text-text-primary leading-none">{npToLabel(s.np)}</p>
                        <p className="text-text-muted text-[12px]">{s.np} NP</p>
                      </div>
                      <div className="h-1.5 bg-border/40 rounded-pill mt-2.5">
                        <div
                          className="h-full rounded-pill transition-all"
                          style={{ width: `${(s.np / 15) * 100}%`, background: npToBarColor(s.np) }}
                        />
                      </div>
                    </>
                  ) : (
                    <div>
                      <p className="text-text-muted text-[13px] mt-1">—</p>
                      <div className="h-1.5 bg-border/30 rounded-pill mt-2.5" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-surface rounded-card border border-border/60 p-5 text-center">
              <p className="text-text-muted text-[14px]">Füge Fächer im Onboarding hinzu.</p>
            </div>
          )}
        </div>

        {/* ── Nächste Klausuren ─────────────────────────────────────────── */}
        {upcomingExams.length > 0 && (
          <div>
            <h2 className="section-label mb-3">Nächste Klausuren</h2>
            <div className="space-y-2">
              {upcomingExams.map((exam) => {
                const urgencyColor = exam.days <= 7 ? '#EF4444' : exam.days <= 14 ? '#F97316' : '#007AFF'
                return (
                  <div
                    key={`${exam.subjectId}-${exam.date}`}
                    className="bg-surface rounded-card shadow-card-adaptive border border-border/60 px-4 py-3.5 flex items-center gap-4"
                  >
                    <div
                      className="w-11 h-11 rounded-[12px] flex items-center justify-center shrink-0 text-[20px]"
                      style={{ background: exam.info.color + '20' }}
                    >
                      {exam.info.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-text-primary font-semibold text-[15px] truncate">{exam.info.name}</p>
                      <p className="text-text-muted text-[12px] mt-0.5">{fmtDate(exam.date)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-[24px] leading-none" style={{ color: urgencyColor }}>
                        {exam.days}
                      </p>
                      <p className="text-text-muted text-[11px] mt-0.5">Tage</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Wochenaktivität ───────────────────────────────────────────── */}
        <div className="bg-surface rounded-card shadow-card-adaptive border border-border/60 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-text-primary font-bold text-[16px]">Wochenaktivität</p>
              <p className="text-text-muted text-[12px] mt-0.5">{daysStudiedThisWeek}/7 Tage gelernt</p>
            </div>
            {daysStudiedThisWeek === 7 && (
              <span className="text-[13px]">🏆</span>
            )}
          </div>
          <div className="flex justify-between mb-4">
            {days7.map((day) => {
              const studied = studiedSet.has(day)
              const isToday = day === todayStr
              return (
                <div key={day} className="flex flex-col items-center gap-1.5">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                      isToday ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface' : ''
                    }`}
                    style={studied ? { background: '#34C759' } : { border: '1.5px solid var(--color-border)' }}
                  >
                    {studied && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                        <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span className={`text-[10px] font-medium ${isToday ? 'text-accent' : 'text-text-muted'}`}>
                    {dayLabel(day)}
                  </span>
                </div>
              )
            })}
          </div>
          <div>
            <div className="h-1.5 bg-border/40 rounded-pill overflow-hidden">
              <div
                className="h-full rounded-pill transition-all"
                style={{ width: `${(daysStudiedThisWeek / 7) * 100}%`, background: '#34C759' }}
              />
            </div>
            <p className="text-text-muted text-[11px] mt-1.5">
              {daysStudiedThisWeek === 7
                ? '🏆 Perfekte Woche — großartig!'
                : `Noch ${7 - daysStudiedThisWeek} ${7 - daysStudiedThisWeek === 1 ? 'Tag' : 'Tage'} für eine perfekte Woche`}
            </p>
          </div>
          {/* Weekly detail stats */}
          {(notesThisWeek > 0 || examsThisWeek > 0) && (
            <div className="flex gap-3 mt-4 pt-4 border-t border-border/50">
              {notesThisWeek > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[16px]">📝</span>
                  <div>
                    <p className="text-text-primary font-semibold text-[14px] leading-none">{notesThisWeek}</p>
                    <p className="text-text-muted text-[11px] mt-0.5">Notiz{notesThisWeek !== 1 ? 'en' : ''}</p>
                  </div>
                </div>
              )}
              {examsThisWeek > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[16px]">📋</span>
                  <div>
                    <p className="text-text-primary font-semibold text-[14px] leading-none">{examsThisWeek}</p>
                    <p className="text-text-muted text-[11px] mt-0.5">Klausur{examsThisWeek !== 1 ? 'en' : ''}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Lernmaterial ──────────────────────────────────────────────── */}
        {(generatedFlashCards.length > 0 || userNotes.length > 0 || appStats.examCount > 0) && (
          <div className="bg-surface rounded-card shadow-card-adaptive border border-border/60 p-5">
            <p className="text-text-primary font-bold text-[16px] mb-4">Lernmaterial gesamt</p>
            <div className="flex gap-3">
              <div className="flex-1 bg-background rounded-[14px] p-3 text-center">
                <p className="font-bold text-[22px] text-text-primary">{userNotes.length}</p>
                <p className="text-text-muted text-[11px] mt-0.5">Notizen</p>
              </div>
              <div className="flex-1 bg-background rounded-[14px] p-3 text-center">
                <p className="font-bold text-[22px] text-text-primary">{generatedFlashCards.length}</p>
                <p className="text-text-muted text-[11px] mt-0.5">Karten</p>
              </div>
              <div className="flex-1 bg-background rounded-[14px] p-3 text-center">
                <p className="font-bold text-[22px] text-text-primary">{appStats.examCount}</p>
                <p className="text-text-muted text-[11px] mt-0.5">Klausuren</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Lerntipps ─────────────────────────────────────────────────── */}
        <div>
          <h2 className="section-label mb-3">Lerntipps für dich</h2>
          <div className="space-y-3">
            {tips.map((tip) => (
              <div
                key={tip.id}
                className="bg-surface rounded-card shadow-card-adaptive border border-border/60 p-4"
                style={{ borderLeft: `3px solid ${tip.accentColor}` }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 text-[18px]"
                    style={{ background: tip.accentColor + '1A' }}
                  >
                    {tip.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary font-semibold text-[14px]">{tip.title(tipCtx)}</p>
                    <p className="text-text-secondary text-[13px] mt-1 leading-relaxed">{tip.text(tipCtx)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
