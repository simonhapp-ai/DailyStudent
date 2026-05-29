import { useState } from 'react'
import { BottomSheet } from '../components/ui/BottomSheet'

// ── Placeholder constants ────────────────────────────────────────────────────
const SUBJECT_NAME = 'Mathematik'
const DAYS_UNTIL   = 12

const LERNPLAN_DAYS = [
  { label: 'Mo', date: '2. Jun', topic: 'Integralrechnung', done: true },
  { label: 'Di', date: '3. Jun', topic: 'Stochastik',       done: false },
  { label: 'Mi', date: '4. Jun', topic: 'Vektoren',         done: false },
]

// ── Accent colour for "Blurting" (no built-in info token) ───────────────────
const BLUE = { fg: '#007AFF', bg: 'rgba(0,122,255,0.10)' }

// ── Reusable icon wrappers ───────────────────────────────────────────────────
function IconBubble({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      className="w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0"
      style={style}
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

// ── Main component ───────────────────────────────────────────────────────────
export function KlausurphasenScreen() {
  const [hasLernplan, setHasLernplan] = useState(false)
  const [showLernplanModal, setShowLernplanModal] = useState(false)

  return (
    <div className="flex flex-col min-h-screen bg-background pb-28">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="px-5" style={{ paddingTop: 'max(58px, calc(env(safe-area-inset-top, 0px) + 18px))' }}>
        <h1 className="text-[28px] font-bold text-text-primary">Klausurenmodus</h1>
        <p className="text-[13px] text-text-muted mt-0.5">
          {SUBJECT_NAME} · Klausur in {DAYS_UNTIL} Tagen
        </p>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className="px-4 mt-5 space-y-3">

        {/* ── 1. Lernplan ─────────────────────────────────────────────── */}
        {hasLernplan ? (
          <div className="bg-surface rounded-[20px] shadow-card-adaptive border border-border/60 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" className="text-accent">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <p className="text-text-primary font-bold text-[15px]">Lernplan</p>
              </div>
              <button onClick={() => console.log('edit lernplan')} className="text-accent text-[13px] font-medium press-sm">
                Bearbeiten
              </button>
            </div>
            <div className="flex gap-2.5">
              {LERNPLAN_DAYS.map((day) => (
                <button
                  key={day.label}
                  onClick={() => console.log('day tapped', day.label)}
                  className="flex-1 bg-background rounded-[14px] p-3 text-center press-sm"
                >
                  <p className="text-text-muted text-[10px] font-semibold uppercase tracking-wide">{day.label}</p>
                  <p className="text-text-secondary text-[11px] mt-0.5">{day.date}</p>
                  <div className={`mt-2 mx-auto w-1.5 h-1.5 rounded-full ${day.done ? 'bg-success' : 'bg-border'}`} />
                  <p className="text-text-secondary text-[11px] font-medium mt-1.5 leading-tight">{day.topic}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowLernplanModal(true)}
            className="w-full bg-surface rounded-[20px] shadow-card-adaptive border border-border/60 p-5 press"
          >
            <div className="flex items-center gap-4">
              <IconBubble style={{ backgroundColor: 'rgba(var(--color-accent), 0.10)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="1.8" className="text-accent">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" strokeLinecap="round" />
                  <line x1="8" y1="2" x2="8" y2="6" strokeLinecap="round" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                  <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" strokeLinecap="round" strokeWidth="2.5" />
                </svg>
              </IconBubble>
              <div className="flex-1 text-left">
                <p className="text-text-primary font-bold text-[16px]">Lernplan erstellen</p>
                <p className="text-text-muted text-[13px] mt-0.5">
                  {DAYS_UNTIL} Tage bis zur Klausur — KI plant für dich
                </p>
              </div>
              <span className="px-3.5 py-1.5 rounded-pill bg-accent text-white text-[13px] font-semibold shrink-0">
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
              onClick={() => console.log('karteikarten')}
              className="flex-1 aspect-square bg-surface rounded-[20px] shadow-card-adaptive border border-border/60 p-4 flex flex-col justify-between text-left press"
            >
              <div
                className="w-11 h-11 rounded-[13px] flex items-center justify-center"
                style={{ backgroundColor: 'rgba(var(--color-success), 0.12)' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="1.8" className="text-success">
                  <rect x="2" y="6" width="20" height="14" rx="2" />
                  <path d="M6 6V4a2 2 0 012-2h8a2 2 0 012 2v2" strokeLinecap="round" />
                  <line x1="2" y1="11" x2="22" y2="11" />
                </svg>
              </div>
              <div>
                <p className="text-text-primary font-bold text-[15px] leading-tight">Karteikarten</p>
                <p className="text-[12px] font-medium mt-0.5" style={{ color: 'rgb(var(--color-success))' }}>
                  24 Karten · 8 fällig
                </p>
              </div>
            </button>

            {/* Blurting */}
            <button
              onClick={() => console.log('blurting')}
              className="flex-1 aspect-square bg-surface rounded-[20px] shadow-card-adaptive border border-border/60 p-4 flex flex-col justify-between text-left press"
            >
              <div
                className="w-11 h-11 rounded-[13px] flex items-center justify-center"
                style={{ backgroundColor: BLUE.bg }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BLUE.fg}
                  strokeWidth="1.8">
                  <path d="M12 20h9" strokeLinecap="round" />
                  <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <p className="text-text-primary font-bold text-[15px] leading-tight">Blurting</p>
                <p className="text-[12px] font-medium mt-0.5 leading-tight" style={{ color: BLUE.fg }}>
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
              onClick={() => console.log('probeklausur')}
              className="w-full bg-surface rounded-[20px] shadow-card-adaptive border border-border/60 p-5 flex items-center gap-4 text-left press"
            >
              <IconBubble style={{ backgroundColor: 'rgba(var(--color-warning), 0.12)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="1.8" className="text-warning">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </IconBubble>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-text-primary font-bold text-[16px]">Probeklausur</p>
                  <span
                    className="px-2 py-0.5 rounded-pill text-[11px] font-semibold shrink-0"
                    style={{ backgroundColor: 'rgba(var(--color-warning), 0.12)', color: 'rgb(var(--color-warning))' }}
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
              onClick={() => console.log('lernzettel')}
              className="w-full bg-surface rounded-[20px] shadow-card-adaptive border border-border/60 p-5 flex items-center gap-4 text-left press"
            >
              <IconBubble style={{ backgroundColor: 'rgba(var(--color-accent), 0.10)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="1.8" className="text-accent">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M14 2v6h6" strokeLinecap="round" />
                  <path d="M9 13h6M9 17h4" strokeLinecap="round" />
                  <circle cx="18" cy="18" r="3" fill="currentColor" fillOpacity="0.15" />
                  <path d="M17.5 17.5l1 1M19 17l-1 1" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </IconBubble>
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
            onClick={() => console.log('statistik')}
            className="w-full bg-surface rounded-[20px] shadow-card-adaptive border border-border/60 p-5 text-left press"
          >
            {/* Stat-Blöcke */}
            <div className="flex gap-2.5 mb-5">
              <div className="flex-1 bg-background rounded-[14px] p-3 text-center">
                <p className="text-[22px] leading-none mb-1.5">🔥</p>
                <p className="text-text-primary font-bold text-[18px] leading-none">12</p>
                <p className="text-text-muted text-[11px] mt-1">Streak</p>
              </div>
              <div className="flex-1 bg-background rounded-[14px] p-3 text-center">
                <p className="text-[22px] leading-none mb-1.5">⚠️</p>
                <p className="text-text-primary font-bold text-[13px] leading-tight">Trigono-<br/>metrie</p>
                <p className="text-text-muted text-[11px] mt-1">Schwäche</p>
              </div>
              <div className="flex-1 bg-background rounded-[14px] p-3 text-center">
                <p className="text-[22px] leading-none mb-1.5">⭐</p>
                <p className="text-text-primary font-bold text-[18px] leading-none">2+</p>
                <p className="text-text-muted text-[11px] mt-1">Ø Note</p>
              </div>
            </div>

            {/* Fortschrittsbalken */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-text-secondary text-[12px] font-medium">Vorbereitung</p>
                <p className="text-text-muted text-[12px]">60 %</p>
              </div>
              <div className="h-2 bg-border/40 rounded-pill overflow-hidden">
                <div
                  className="h-full rounded-pill"
                  style={{ width: '60%', background: 'linear-gradient(90deg, rgb(var(--color-accent)), rgba(var(--color-accent), 0.7))' }}
                />
              </div>
              <p className="text-text-muted text-[11px] mt-1.5">Alle Details →</p>
            </div>
          </button>
        </div>

      </div>

      {/* ── Lernplan Modal (Placeholder) ────────────────────────────────── */}
      <BottomSheet isOpen={showLernplanModal} onClose={() => setShowLernplanModal(false)}>
        <div className="px-5 pb-4">
          <p className="text-[20px] font-bold text-text-primary mb-1">Lernplan erstellen</p>
          <p className="text-text-muted text-[13px] mb-6">
            Die KI berechnet automatisch einen Lernplan für {SUBJECT_NAME} — basierend auf deinen Smart Notes und dem Klausurdatum.
          </p>
          <div className="space-y-2.5 mb-6">
            {[
              { icon: '📅', label: 'Klausurdatum', value: '14. Juni 2026' },
              { icon: '📚', label: 'Lernmaterial', value: '6 Smart Notes' },
              { icon: '⏱', label: 'Täglich', value: '~30 Min geplant' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between bg-background rounded-card px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-[18px]">{item.icon}</span>
                  <p className="text-text-secondary text-[14px]">{item.label}</p>
                </div>
                <p className="text-text-primary text-[14px] font-semibold">{item.value}</p>
              </div>
            ))}
          </div>
          <button
            onClick={() => { setHasLernplan(true); setShowLernplanModal(false) }}
            className="w-full py-3.5 rounded-card bg-accent text-white text-[15px] font-semibold press hover:opacity-90 transition-opacity"
          >
            Lernplan generieren
          </button>
        </div>
      </BottomSheet>

    </div>
  )
}
