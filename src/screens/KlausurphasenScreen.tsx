import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { SUBJECT_INFO } from '../data/subjectInfo'
import { endnoteForEntry } from './AbiRechnerScreen'
import { LernvorschlagWidget } from '../components/ui/LernvorschlagWidget'
import { getActiveStreak } from '../lib/streak'
import type { AbiHalbjahr } from '../types'


function daysUntil(dateStr: string): number {
  const target = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / 86400000)
}


const WEEKDAY_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

// ── Grade helpers ─────────────────────────────────────────────────────────────

function npColor(np: number): string {
  if (np >= 11) return '#34C759'
  if (np >= 8)  return '#FF9500'
  if (np >= 5)  return '#FF6B35'
  return '#FF3B30'
}

function npLabel(np: number): string {
  const m: Record<number, string> = {
    15:'1+',14:'1',13:'1−',12:'2+',11:'2',10:'2−',
    9:'3+',8:'3',7:'3−',6:'4+',5:'4',4:'4−',
    3:'5+',2:'5',1:'5−',0:'6',
  }
  return m[Math.round(Math.max(0, Math.min(15, np)))] ?? '—'
}

function getSubjectNP(subjectId: string, halbjahre: AbiHalbjahr[]): number | null {
  for (const q of ['Q4','Q3','Q2','Q1'] as const) {
    const hj = halbjahre.find(h => h.label === q)
    if (!hj) continue
    const entry = hj.entries.find(e => e.subjectId === subjectId)
    if (!entry) continue
    const np = endnoteForEntry(entry)
    if (np !== null) return np
  }
  return null
}

// ── Mini bar chart (subject grades) ──────────────────────────────────────────

function MiniBarChart({ halbjahre, faecher }: { halbjahre: AbiHalbjahr[]; faecher: string[] }) {
  const items = faecher
    .map(id => ({ id, info: SUBJECT_INFO[id], np: getSubjectNP(id, halbjahre) }))
    .filter(s => s.info && s.np !== null) as Array<{ id: string; info: { name: string; icon: string; color: string }; np: number }>

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-2 gap-1">
        <span className="text-[22px]">📊</span>
        <p className="text-text-muted text-[10px] text-center leading-tight">Noch keine<br/>Noten</p>
      </div>
    )
  }

  const shown = items
  const BAR_H = 52

  return (
    <div className="overflow-hidden">
      <p className="text-text-muted text-[9px] font-semibold uppercase tracking-wide mb-1.5">Notenpunkte</p>
      <div className="flex gap-1.5 items-end" style={{ height: BAR_H + 28 }}>
        {shown.map(s => {
          const barH = Math.max(3, Math.round((s.np / 15) * BAR_H))
          const c = npColor(s.np)
          return (
            <div key={s.id} className="flex flex-col items-center flex-1 min-w-0">
              <div className="flex flex-col items-center justify-end w-full" style={{ height: BAR_H + 10 }}>
                <span className="text-[8px] font-bold leading-none mb-0.5" style={{ color: c }}>{npLabel(s.np)}</span>
                <div className="rounded-t-[3px] w-full" style={{ height: barH, background: c, minWidth: 6 }} />
              </div>
              <div className="w-full h-px bg-border/50 mb-0.5" />
              <span className="text-[12px] leading-none">{s.info.icon}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Icon-Gradienten ──────────────────────────────────────────────────────────
const G = {
  // Pro-Feature — Premium Gold
  lernplan:     'linear-gradient(145deg, #FFD060, #C07700)',

  // Auswendig lernen — Dark Purple + Dark Pink (selbe Familie)
  karteikarten: 'linear-gradient(145deg, #7C3AED, #4C1D95)',
  blurting:     'linear-gradient(145deg, #DB2777, #9D174D)',

  // Tiefer lernen — Teal + Meerblau (selbe Familie, Probeklausur dunkler)
  lernzettel:   'linear-gradient(145deg, #5AC8FA, #007BB8)',
  probeklausur: 'linear-gradient(145deg, #0891B2, #065666)',

  // Statistik
  streak:       'linear-gradient(145deg, #FF9F0A, #E07008)',
}

function GradientIcon({ gradient, glow, children }: { gradient: string; glow?: string; children: React.ReactNode }) {
  return (
    <div
      className={`w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0${glow ? ` ${glow}` : ''}`}
      style={{ background: gradient }}
    >
      {children}
    </div>
  )
}

function Chevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" className="text-text-muted shrink-0">
      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function KlausurphasenScreen() {
  const navigate = useNavigate()
  const { generatedFlashCards, profile, appStats, lernplaene, userNotes, savedProbeklausuren, lernzettel, personalEntries } = useUser()

  const totalCards = generatedFlashCards.length
  const activeStreak = getActiveStreak(appStats.streak, appStats.lastStudyDate)

  // Next upcoming exam
  const nextExam = useMemo(() => {
    const upcoming = (profile?.klausurtermine ?? [])
      .map((k) => ({ ...k, days: daysUntil(k.date), info: SUBJECT_INFO[k.subjectId] }))
      .filter((k) => k.days > 0 && k.info)
      .sort((a, b) => a.days - b.days)
    return upcoming[0] ?? null
  }, [profile?.klausurtermine])

  const subjectName = nextExam?.info?.name ?? 'Nächste Klausur'
  const daysUntilExam = nextExam?.days ?? null

  // Active Lernplan: find the active one, compute next 3 upcoming lern/puffer days
  const activePlan = lernplaene.find((p) => p.isActive)
  const upcomingDays = useMemo(() => {
    if (!activePlan) return []
    const today = new Date().toISOString().slice(0, 10)
    return activePlan.days
      .filter((d) => d.date >= today && (d.dayType === 'lern' || d.dayType === 'puffer') && d.sessions.length > 0)
      .slice(0, 2)
  }, [activePlan])

  const totalPhotos = useMemo(
    () => userNotes.reduce((acc, n) => acc + (n.attachments?.length ?? 0), 0),
    [userNotes],
  )

  return (
    <div className="flex flex-col min-h-screen bg-background pb-28">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="px-4" style={{ paddingTop: 'max(58px, calc(env(safe-area-inset-top, 0px) + 18px))' }}>
        <h1 className="text-[28px] font-bold text-text-primary">Klausurenmodus</h1>
        <p className="text-[13px] text-text-muted mt-0.5">
          {nextExam
            ? `${subjectName} · Klausur in ${daysUntilExam} Tagen`
            : 'Bereite dich auf deine Klausuren vor'}
        </p>
      </div>

      <div className="px-4 mt-5 space-y-3 lg:px-6">

        {/* ── 1. Lernplan ─────────────────────────────────────────────── */}
        {activePlan && upcomingDays.length > 0 ? (
          <button
            onClick={() => navigate(`/klausurmodus/lernplan/${activePlan.id}`)}
            className="w-full bg-surface rounded-[20px] shadow-card-adaptive border border-border/60 p-5 text-left press"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" style={{ color: '#C07700' }}>
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <p className="text-text-primary font-bold text-[15px]">Lernplan</p>
              </div>
              <span className="text-[12px] font-medium" style={{ color: '#C07700' }}>Details →</span>
            </div>
            <div className="flex gap-2.5">
              {upcomingDays.map((day) => {
                const d = new Date(day.date)
                const mainTopic = day.sessions[0]?.topic ?? '—'
                const subjectName = day.sessions[0]?.subjectName ?? ''
                return (
                  <div key={day.date} className="flex-1 bg-background rounded-[14px] p-3 text-center">
                    <p className="text-text-muted text-[10px] font-semibold uppercase tracking-wide">{WEEKDAY_SHORT[d.getDay()]}</p>
                    <p className="text-text-secondary text-[11px] mt-0.5">{d.getDate()}. {['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'][d.getMonth()]}</p>
                    <div className="mt-2 mx-auto w-6 h-6 rounded-btn flex items-center justify-center text-base">
                      {SUBJECT_INFO[day.sessions[0]?.subjectId]?.icon ?? '📚'}
                    </div>
                    <p className="text-text-muted text-[10px] font-medium mt-1 leading-tight">{subjectName}</p>
                    <p className="text-text-secondary text-[10px] font-medium mt-0.5 leading-tight line-clamp-2">{mainTopic}</p>
                  </div>
                )
              })}
            </div>
          </button>
        ) : (
          <button
            onClick={() => navigate('/klausurmodus/lernplan')}
            className="w-full bg-surface rounded-[20px] shadow-card-adaptive border border-border/60 p-5 press"
          >
            <div className="flex items-center gap-4">
              <GradientIcon gradient={G.lernplan} glow="glow-gold">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white"
                  strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                  <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" strokeWidth="2.5" />
                </svg>
              </GradientIcon>
              <div className="flex-1 text-left">
                <p className="text-text-primary font-bold text-[16px]">Lernplan erstellen</p>
                <p className="text-text-muted text-[13px] mt-0.5">
                  {daysUntilExam ? `${daysUntilExam} Tage bis zur Klausur` : 'KI plant deinen Lernweg'} — KI plant für dich
                </p>
              </div>
              <span
                className="px-3.5 py-1.5 rounded-pill text-white text-[13px] font-semibold shrink-0"
                style={{ background: G.lernplan }}
              >
                Starten
              </span>
            </div>
          </button>
        )}

        {/* ── 2. Auswendig lernen ──────────────────────────────────────── */}
        <div>
          <p className="section-label px-1 mb-2.5">Auswendig lernen</p>
          <div className="flex gap-3 lg:gap-4">

            {/* Karteikarten */}
            <button
              onClick={() => navigate(totalCards > 0 ? '/klausurmodus/lernen' : '/klausurmodus/karteikarten/neu')}
              className="flex-1 aspect-square lg:aspect-auto lg:h-44 bg-surface rounded-[20px] shadow-card-adaptive border border-border/60 p-4 flex flex-col justify-between text-left press"
            >
              <div className="flex items-start justify-between w-full">
                <GradientIcon gradient={G.karteikarten} glow="glow-purple">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="7" y="7" width="13" height="12" rx="2.5" strokeOpacity="0.5" />
                    <rect x="4" y="9" width="13" height="12" rx="2.5" />
                    <line x1="7" y1="14" x2="14" y2="14" />
                    <line x1="7" y1="16.5" x2="14" y2="16.5" />
                    <line x1="7" y1="19" x2="11" y2="19" />
                    <path d="M9 9.5 L9 5.5 Q9 3.5 11 3.5 Q13 3.5 13 5.5 L13 9.5 Q13 11 11 11 Q9 11 9 9.5 Z" strokeWidth="1.4" />
                    <path d="M11 9.5 L11 6.5 Q11 5.2 11.8 4.8" strokeWidth="1.4" />
                  </svg>
                </GradientIcon>
                <Chevron />
              </div>
              <div>
                <p className="text-text-primary font-bold text-[15px] leading-tight">Karteikarten</p>
                <p className="text-[12px] font-medium mt-0.5" style={{ color: '#7C3AED' }}>
                  {totalCards > 0 ? `${totalCards} Karten · lernen` : '+ Karten erstellen'}
                </p>
              </div>
            </button>

            {/* Blurting */}
            <button
              onClick={() => navigate('/klausurmodus/blurting')}
              className="flex-1 aspect-square lg:aspect-auto lg:h-44 bg-surface rounded-[20px] shadow-card-adaptive border border-border/60 p-4 flex flex-col justify-between text-left press"
            >
              <div className="flex items-start justify-between w-full">
                <GradientIcon gradient={G.blurting} glow="glow-pink">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="2" width="12" height="16" rx="2" />
                    <line x1="6" y1="7" x2="12" y2="7" />
                    <line x1="6" y1="10" x2="12" y2="10" />
                    <line x1="6" y1="13" x2="9.5" y2="13" />
                    <path d="M11 15 L19 7 Q20.5 5.5 21.5 6.5 Q22.5 7.5 21 9 L13 17 L10.5 17.5 Z" strokeWidth="1.5" />
                  </svg>
                </GradientIcon>
                <Chevron />
              </div>
              <div>
                <p className="text-text-primary font-bold text-[15px] leading-tight">Blurting</p>
                <p className="text-[12px] font-medium mt-0.5 leading-tight" style={{ color: '#60A5FA' }}>
                  Schreib alles auf, was du weißt
                </p>
              </div>
            </button>

          </div>
        </div>

        {/* ── 3. Tiefer lernen ─────────────────────────────────────────── */}
        <div>
          <p className="section-label px-1 mb-2.5">Tiefer lernen</p>
          <div className="space-y-3 lg:flex lg:gap-3 lg:space-y-0">

            {/* Probeklausur */}
            <button
              onClick={() => navigate('/klausurmodus/probeklausur')}
              className="w-full bg-surface rounded-[20px] shadow-card-adaptive border border-border/60 p-5 flex items-center gap-4 text-left press
                lg:flex-1 lg:h-44 lg:flex-col lg:items-start lg:justify-between lg:p-4 lg:gap-0"
            >
              <div className="flex items-start justify-between w-auto lg:w-full">
                <GradientIcon gradient={G.probeklausur} glow="glow-cyan">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white"
                    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                </GradientIcon>
                <span className="hidden lg:block"><Chevron /></span>
              </div>
              <div className="flex-1 min-w-0 lg:flex-none">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-text-primary font-bold text-[16px] lg:text-[15px]">Probeklausur</p>
                  <span
                    className="px-2 py-0.5 rounded-pill text-[11px] font-semibold shrink-0"
                    style={{ background: 'rgba(248,113,113,0.15)', color: '#F87171' }}
                  >
                    KI-Korrektur
                  </span>
                </div>
                <p className="text-text-muted text-[13px] mt-0.5">AFB I–III · 45 Min</p>
              </div>
              <span className="lg:hidden"><Chevron /></span>
            </button>

            {/* Lernzettel */}
            <button
              onClick={() => navigate('/klausurmodus/lernzettel')}
              className="w-full bg-surface rounded-[20px] shadow-card-adaptive border border-border/60 p-5 flex items-center gap-4 text-left press
                lg:flex-1 lg:h-44 lg:flex-col lg:items-start lg:justify-between lg:p-4 lg:gap-0"
            >
              <div className="flex items-start justify-between w-auto lg:w-full">
                <GradientIcon gradient={G.lernzettel} glow="glow-teal">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white"
                    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <path d="M14 2v6h6" />
                    <path d="M9 13h6M9 17h4" />
                  </svg>
                </GradientIcon>
                <span className="hidden lg:block"><Chevron /></span>
              </div>
              <div className="flex-1 min-w-0 lg:flex-none">
                <p className="text-text-primary font-bold text-[16px] lg:text-[15px]">Lernzettel</p>
                <p className="text-text-muted text-[13px] mt-0.5 leading-snug">
                  KI-Zusammenfassung deiner Smart Notes
                </p>
              </div>
              <span className="lg:hidden"><Chevron /></span>
            </button>

          </div>
        </div>

        {/* ── 4. Statistik & Insights ──────────────────────────────────── */}
        <div>
          <p className="section-label px-1 mb-2.5">Statistik & Insights</p>
          <button
            onClick={() => navigate('/insights')}
            className="w-full bg-surface rounded-[20px] shadow-card-adaptive border border-border/60 p-4 text-left press"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <p className="text-text-primary font-bold text-[14px]">Dein Überblick</p>
              <span className="text-text-muted text-[11px]">Alle Details →</span>
            </div>

            {/* Two-column layout: bar chart | 6 stats */}
            <div className="grid grid-cols-2 gap-2.5">

              {/* Left: bar chart */}
              <div className="bg-background rounded-[12px] p-2">
                <MiniBarChart halbjahre={profile?.abiHalbjahre ?? []} faecher={profile?.faecher ?? []} />
              </div>

              {/* Right: 8 stats (2 col × 4 row) */}
              <div className="grid grid-cols-2 gap-1 content-start">
                {([
                  { icon: '🔥', value: activeStreak,                   label: 'Streak'   },
                  { icon: '📝', value: userNotes.length,               label: 'Notizen'  },
                  { icon: '📸', value: totalPhotos,                    label: 'Fotos'    },
                  { icon: '📋', value: savedProbeklausuren.length,     label: 'PK'       },
                  { icon: '📄', value: lernzettel.length,              label: 'LZ'       },
                  { icon: '🎴', value: generatedFlashCards.length,     label: 'Karten'   },
                  { icon: '🪙', value: appStats.coins ?? 0,            label: 'Coins'    },
                  { icon: '📅', value: personalEntries.length,         label: 'Kalender' },
                ] as const).map(s => (
                  <div key={s.label} className="bg-background rounded-[8px] px-2 py-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] leading-none">{s.icon}</span>
                      <p className="text-text-primary font-bold text-[13px] leading-none">{s.value}</p>
                    </div>
                    <p className="text-text-muted text-[9px] mt-1 leading-none">{s.label}</p>
                  </div>
                ))}
              </div>

            </div>
          </button>
        </div>

        {/* ── 5. KI-Lernvorschlag ───────────────────────────────────────── */}
        <div>
          <p className="section-label px-1 mb-2.5">Lernvorschlag für heute</p>
          <LernvorschlagWidget />
        </div>

      </div>


    </div>
  )
}
