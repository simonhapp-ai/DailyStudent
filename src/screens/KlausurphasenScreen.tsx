import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { SUBJECT_INFO } from '../data/subjectInfo'
import { endnoteForEntry } from './AbiRechnerScreen'

function getCurrentStreak(streak: number, lastStudyDate: string | null): number {
  if (!lastStudyDate) return 0
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return lastStudyDate === today || lastStudyDate === yesterday.toISOString().slice(0, 10) ? streak : 0
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / 86400000)
}


// Converts Zielnote (1,0–3,0) to Notenpunkte (15–6) — reserved for future Zielnote-Tracking UI
function _zielnoteToNP(z: string): number {
  return 17 - parseFloat(z.replace(',', '.')) * 3
}

const WEEKDAY_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

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
  const { generatedFlashCards, profile, appStats, lernplaene } = useUser()

  const totalCards = generatedFlashCards.length
  const activeStreak = getCurrentStreak(appStats.streak, appStats.lastStudyDate)

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

  // Weakest subject from abiHalbjahre
  const weakestSubject = useMemo(() => {
    const halbjahre = profile?.abiHalbjahre ?? []
    const faecher = profile?.faecher ?? []
    let weakest: { name: string; np: number } | null = null
    for (const subjectId of faecher) {
      const info = SUBJECT_INFO[subjectId]
      if (!info) continue
      for (const q of ['Q4', 'Q3', 'Q2', 'Q1']) {
        const hj = halbjahre.find((h) => h.label === q)
        if (!hj) continue
        const entry = hj.entries.find((e) => e.subjectId === subjectId)
        if (!entry) continue
        const np = endnoteForEntry(entry)
        if (np !== null && (weakest === null || np < weakest.np)) {
          weakest = { name: info.name, np }
        }
        break
      }
    }
    return weakest
  }, [profile?.abiHalbjahre, profile?.faecher])

  // Active Lernplan: find the active one, compute next 3 upcoming lern/puffer days
  const activePlan = lernplaene.find((p) => p.isActive)
  const upcomingDays = useMemo(() => {
    if (!activePlan) return []
    const today = new Date().toISOString().slice(0, 10)
    return activePlan.days
      .filter((d) => d.date >= today && (d.dayType === 'lern' || d.dayType === 'puffer') && d.sessions.length > 0)
      .slice(0, 2)
  }, [activePlan])

  // Progress toward zielnote (for the "Vorbereitung" bar)
  const prepPct = useMemo(() => {
    const note = profile?.abiGesamtnote
    const ziel = profile?.zielnote
    if (!note || !ziel) return null
    const current = parseFloat(note.replace(',', '.'))
    const target = parseFloat(ziel.replace(',', '.'))
    if (isNaN(current) || isNaN(target) || target >= 6.0) return null
    return Math.round(Math.max(0, Math.min(100, ((6.0 - current) / (6.0 - target)) * 100)))
  }, [profile?.abiGesamtnote, profile?.zielnote])

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

      <div className="px-4 mt-5 space-y-3">

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
            onClick={() => navigate('/klausurmodus/lernplan/neu')}
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
          <div className="flex gap-3">

            {/* Karteikarten */}
            <button
              onClick={() => navigate(totalCards > 0 ? '/klausurmodus/lernen' : '/klausurmodus/karteikarten/neu')}
              className="flex-1 aspect-square bg-surface rounded-[20px] shadow-card-adaptive border border-border/60 p-4 flex flex-col justify-between text-left press"
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
              className="flex-1 aspect-square bg-surface rounded-[20px] shadow-card-adaptive border border-border/60 p-4 flex flex-col justify-between text-left press"
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
          <div className="space-y-3">

            {/* Probeklausur */}
            <button
              onClick={() => navigate('/klausurmodus/probeklausur')}
              className="w-full bg-surface rounded-[20px] shadow-card-adaptive border border-border/60 p-5 flex items-center gap-4 text-left press"
            >
              <GradientIcon gradient={G.probeklausur} glow="glow-cyan">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white"
                  strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
              </GradientIcon>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-text-primary font-bold text-[16px]">Probeklausur</p>
                  <span
                    className="px-2 py-0.5 rounded-pill text-[11px] font-semibold shrink-0"
                    style={{ background: 'rgba(248,113,113,0.15)', color: '#F87171' }}
                  >
                    KI-Korrektur
                  </span>
                </div>
                <p className="text-text-muted text-[13px] mt-0.5">AFB I–III · 45 Minuten</p>
              </div>
              <Chevron />
            </button>

            {/* Lernzettel */}
            <button
              onClick={() => navigate('/klausurmodus/lernzettel')}
              className="w-full bg-surface rounded-[20px] shadow-card-adaptive border border-border/60 p-5 flex items-center gap-4 text-left press"
            >
              <GradientIcon gradient={G.lernzettel} glow="glow-teal">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white"
                  strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <path d="M14 2v6h6" />
                  <path d="M9 13h6M9 17h4" />
                </svg>
              </GradientIcon>
              <div className="flex-1 min-w-0">
                <p className="text-text-primary font-bold text-[16px]">Lernzettel</p>
                <p className="text-text-muted text-[13px] mt-0.5 leading-snug">
                  KI-generierte Zusammenfassung deiner Smart Notes
                </p>
              </div>
              <Chevron />
            </button>

          </div>
        </div>

        {/* ── 4. Statistik & Insights ──────────────────────────────────── */}
        <div>
          <p className="section-label px-1 mb-2.5">Statistik & Insights</p>
          <button
            onClick={() => navigate('/insights')}
            className="w-full bg-surface rounded-[20px] shadow-card-adaptive border border-border/60 p-5 text-left press"
          >
            <div className="flex gap-2.5 mb-5">
              <div className="flex-1 bg-background rounded-[14px] p-3 text-center">
                <div className="w-8 h-8 rounded-[10px] mx-auto mb-2 flex items-center justify-center" style={{ background: G.streak }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                </div>
                <p className="text-text-primary font-bold text-[18px] leading-none">{activeStreak}</p>
                <p className="text-text-muted text-[11px] mt-1">Streak</p>
              </div>
              <div className="flex-1 bg-background rounded-[14px] p-3 text-center">
                <div className="w-8 h-8 rounded-[10px] mx-auto mb-2 flex items-center justify-center" style={{ background: G.probeklausur }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="3" />
                  </svg>
                </div>
                {weakestSubject ? (
                  <>
                    <p className="text-text-primary font-bold text-[11px] leading-tight line-clamp-2">{weakestSubject.name}</p>
                    <p className="text-text-muted text-[11px] mt-1">Schwäche</p>
                  </>
                ) : (
                  <>
                    <p className="text-text-primary font-bold text-[11px] leading-tight">—</p>
                    <p className="text-text-muted text-[11px] mt-1">Schwäche</p>
                  </>
                )}
              </div>
              <div className="flex-1 bg-background rounded-[14px] p-3 text-center">
                <div className="w-8 h-8 rounded-[10px] mx-auto mb-2 flex items-center justify-center" style={{ background: G.lernplan }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </div>
                <p className="text-text-primary font-bold text-[18px] leading-none">{profile?.abiGesamtnote ?? '—'}</p>
                <p className="text-text-muted text-[11px] mt-1">Ø Note</p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-text-secondary text-[12px] font-medium">Vorbereitung</p>
                <p className="text-text-muted text-[12px]">{prepPct !== null ? `${prepPct} %` : '—'}</p>
              </div>
              <div className="h-2 bg-border/40 rounded-pill overflow-hidden">
                <div
                  className="h-full rounded-pill"
                  style={{ width: `${prepPct ?? 0}%`, background: G.blurting }}
                />
              </div>
              <p className="text-text-muted text-[11px] mt-1.5">Alle Details →</p>
            </div>
          </button>
        </div>

      </div>


    </div>
  )
}
