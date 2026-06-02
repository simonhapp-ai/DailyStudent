import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { SUBJECT_INFO } from '../data/subjectInfo'
import type { AbiGradeEntry, AbiHalbjahr } from '../types'

// ── Internal helpers ──────────────────────────────────────────────────────────

function avgGrades(grades: (number | null)[]): number | null {
  const valid = grades.filter((g): g is number => g !== null)
  return valid.length > 0 ? valid.reduce((s, v) => s + v, 0) / valid.length : null
}

function resolveGrades(arr: (number | null)[] | undefined, single: number | null): (number | null)[] {
  return arr?.length ? arr : [single]
}

// ── Calculation helpers (exported for widget use) ────────────────────────────

export function subjectAvgAbi(e: AbiGradeEntry): number | null {
  const r = e.smRatio ?? 0.5
  const s = avgGrades(resolveGrades(e.schriftlichGrades, e.schriftlich))
  const m = avgGrades(resolveGrades(e.muendlichGrades, e.muendlich))
  if (s !== null && m !== null) return s * r + m * (1 - r)
  if (s !== null) return s
  if (m !== null) return m
  return null
}

export function endnoteForEntry(e: AbiGradeEntry): number | null {
  if (e.endnoteOverride !== null && e.endnoteOverride !== undefined) return e.endnoteOverride
  const avg = subjectAvgAbi(e)
  return avg !== null ? Math.round(avg) : null
}

export function effectiveWeightAbi(e: AbiGradeEntry): number {
  return e.isLK ? 2 : 1
}

export function overallPunkteAbi(entries: AbiGradeEntry[]): number | null {
  const valid = entries
    .map((e) => ({ en: endnoteForEntry(e), w: effectiveWeightAbi(e) }))
    .filter((e): e is { en: number; w: number } => e.en !== null)
  if (valid.length === 0) return null
  const totalW = valid.reduce((s, e) => s + e.w, 0)
  return valid.reduce((s, e) => s + e.en * e.w, 0) / totalW
}

export function pktToNoteAbi(p: number): string {
  const note = Math.min(6.0, (17 - p) / 3)
  return note.toFixed(1).replace('.', ',')
}

export function noteColorAbi(note: string): string {
  const n = parseFloat(note.replace(',', '.'))
  if (n <= 1.9) return '#34C759'
  if (n <= 2.9) return '#FF9500'
  return '#FF3B30'
}

export function totalPunkteAllHalbjahre(halbjahre: AbiHalbjahr[]): number | null {
  const subjectMap = new Map<string, { endnotes: number[]; isLK: boolean }>()
  for (const hj of halbjahre) {
    for (const entry of hj.entries) {
      const en = endnoteForEntry(entry)
      if (en === null) continue
      const ex = subjectMap.get(entry.subjectId)
      if (ex) { ex.endnotes.push(en); if (entry.isLK) ex.isLK = true }
      else subjectMap.set(entry.subjectId, { endnotes: [en], isLK: entry.isLK })
    }
  }
  if (subjectMap.size === 0) return null
  let tw = 0, ws = 0
  for (const [, { endnotes, isLK }] of subjectMap) {
    const mean = endnotes.reduce((s, v) => s + v, 0) / endnotes.length
    const w = isLK ? 2 : 1
    ws += mean * w; tw += w
  }
  return ws / tw
}

function zielnoteToPoints(z: string): number {
  return 17 - parseFloat(z.replace(',', '.')) * 3
}

// ── Color scale (slate→amber→green→emerald) ──────────────────────────────────

function getValueColor(v: number): string {
  const stops: Array<[number, number, number, number]> = [
    [0,  100, 116, 139],
    [5,  217, 119,   6],
    [10,  34, 197,  94],
    [15,   5, 220, 140],
  ]
  for (let i = 0; i < stops.length - 1; i++) {
    const [v1, r1, g1, b1] = stops[i]
    const [v2, r2, g2, b2] = stops[i + 1]
    if (v <= v2) {
      const t = (v - v1) / (v2 - v1)
      return `rgb(${Math.round(r1+(r2-r1)*t)},${Math.round(g1+(g2-g1)*t)},${Math.round(b1+(b2-b1)*t)})`
    }
  }
  return 'rgb(5,220,140)'
}

// ── Wheel picker ──────────────────────────────────────────────────────────────

const CELL_W = 26

function WheelPicker({
  value,
  onChange,
}: {
  value: number | null
  onChange: (v: number) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [local, setLocal] = useState(value ?? 10)
  const [sidePad, setSidePad] = useState<number | null>(null)
  const programmatic = useRef(false)

  // Read the actual rendered viewport width to compute exact pixel side padding.
  // Using % in paddingLeft on the flex content div produces unreliable results
  // in a flex-1 column, so we measure once after mount and use integer pixels.
  useLayoutEffect(() => {
    if (scrollRef.current) {
      const w = scrollRef.current.clientWidth
      setSidePad(Math.max(0, Math.floor(w / 2 - CELL_W / 2)))
    }
  }, [])

  // Scroll to initial position after padding is applied (sidePad changes from null → value)
  useEffect(() => {
    if (sidePad === null) return
    programmatic.current = true
    if (scrollRef.current) scrollRef.current.scrollLeft = (value ?? 10) * CELL_W
    setTimeout(() => { programmatic.current = false }, 50)
  }, [sidePad]) // eslint-disable-line

  // Sync to external value changes
  useEffect(() => {
    if (value !== null && value !== local) {
      setLocal(value)
      programmatic.current = true
      scrollRef.current?.scrollTo({ left: value * CELL_W, behavior: 'smooth' })
      setTimeout(() => { programmatic.current = false }, 350)
    }
  }, [value]) // eslint-disable-line

  const onScroll = () => {
    if (programmatic.current || !scrollRef.current) return
    const v = Math.max(0, Math.min(15, Math.round(scrollRef.current.scrollLeft / CELL_W)))
    if (v !== local) { setLocal(v); onChange(v) }
  }

  // Mouse drag — lets PC users click-and-drag the wheel left/right
  const onMouseDown = (e: React.MouseEvent) => {
    const el = scrollRef.current
    if (!el) return
    e.preventDefault()
    const startX = e.clientX
    const startLeft = el.scrollLeft
    el.style.cursor = 'grabbing'

    const onMove = (ev: MouseEvent) => {
      el.scrollLeft = startLeft + (startX - ev.clientX)
    }

    const onUp = () => {
      el.style.cursor = 'grab'
      // Snap to nearest value and commit
      const v = Math.max(0, Math.min(15, Math.round(el.scrollLeft / CELL_W)))
      programmatic.current = true
      el.scrollTo({ left: v * CELL_W, behavior: 'smooth' })
      setTimeout(() => { programmatic.current = false }, 350)
      setLocal(v)
      onChange(v)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const color = getValueColor(local)
  const isSet = value !== null

  return (
    <div className="w-full select-none">
      {/* Wheel track — no top number; center cell is visually bigger */}
      <div className="relative" style={{ height: 48 }}>
        <div
          ref={scrollRef}
          onScroll={onScroll}
          onMouseDown={onMouseDown}
          className="h-full"
          style={{
            overflowX: 'auto',
            overflowY: 'hidden',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
            cursor: 'grab',
          } as CSSProperties}
        >
          <div
            className="flex h-full items-stretch"
            style={{
              paddingLeft: sidePad ?? 80,
              paddingRight: sidePad ?? 80,
            }}
          >
            {Array.from({ length: 16 }, (_, i) => {
              const dist = Math.abs(i - local)
              const isCenter = dist === 0
              const c = getValueColor(i)
              return (
                <div
                  key={i}
                  className="shrink-0 flex flex-col items-center justify-center"
                  style={{ width: CELL_W, scrollSnapAlign: 'center', gap: 3 }}
                >
                  {/* Wheel spoke */}
                  <div
                    style={{
                      width: 1.5,
                      height: isCenter ? 13 : dist === 1 ? 8 : 5,
                      borderRadius: 1,
                      background: isCenter
                        ? (isSet ? color : 'rgb(var(--color-text-secondary))')
                        : 'rgba(var(--color-border), 1)',
                      opacity: isCenter ? 1 : dist === 1 ? 0.6 : dist === 2 ? 0.35 : 0.15,
                      flexShrink: 0,
                    }}
                  />
                  {/* Number — selected cell is noticeably larger */}
                  <span
                    style={{
                      fontSize: isCenter ? 20 : dist === 1 ? 12 : 10,
                      fontWeight: isCenter ? 900 : 700,
                      color: isSet ? c : (isCenter ? 'rgb(var(--color-text-primary))' : 'rgb(var(--color-text-muted))'),
                      opacity: isCenter ? 1 : dist === 1 ? 0.5 : dist === 2 ? 0.27 : 0.1,
                      lineHeight: 1,
                      transition: 'font-size 0.08s ease',
                    }}
                  >
                    {i}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Edge fades */}
        <div
          className="absolute inset-y-0 left-0 w-8 pointer-events-none"
          style={{ background: 'linear-gradient(to right, rgb(var(--color-surface)) 15%, transparent)' }}
        />
        <div
          className="absolute inset-y-0 right-0 w-8 pointer-events-none"
          style={{ background: 'linear-gradient(to left, rgb(var(--color-surface)) 15%, transparent)' }}
        />

        {/* Center bracket */}
        <div
          className="absolute inset-y-1 left-1/2 -translate-x-1/2 pointer-events-none"
          style={{
            width: CELL_W,
            borderLeft: `1.5px solid ${isSet ? color + '65' : 'rgba(var(--color-border),0.55)'}`,
            borderRight: `1.5px solid ${isSet ? color + '65' : 'rgba(var(--color-border),0.55)'}`,
          }}
        />
      </div>
    </div>
  )
}

// ── Endnote control (top-bar +/- stepper) ─────────────────────────────────────

function EndnoteControl({
  endnote,
  isOverride,
  onIncrement,
  onDecrement,
  onReset,
}: {
  endnote: number
  isOverride: boolean
  onIncrement: () => void
  onDecrement: () => void
  onReset: () => void
}) {
  const color = getValueColor(endnote)
  return (
    <div className="flex items-center gap-0.5 shrink-0">
      {isOverride && (
        <button
          onClick={onReset}
          className="w-4 h-4 flex items-center justify-center rounded-full text-text-muted/50 hover:text-text-muted transition-colors press-sm shrink-0"
          title="Zurück zu berechnet"
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 4v6h6M3.51 15a9 9 0 102.13-9.36L1 10" />
          </svg>
        </button>
      )}
      <button
        onClick={onDecrement}
        className="w-5 h-5 rounded-full bg-surface-hover flex items-center justify-center text-text-secondary press-sm shrink-0"
      >
        <span className="text-[12px] font-bold leading-none">−</span>
      </button>
      <span
        className="text-[14px] font-black tabular-nums text-center"
        style={{ minWidth: 22, color, transition: 'color 0.12s ease' }}
      >
        {endnote}
      </span>
      <button
        onClick={onIncrement}
        className="w-5 h-5 rounded-full bg-surface-hover flex items-center justify-center text-text-secondary press-sm shrink-0"
      >
        <span className="text-[12px] font-bold leading-none">+</span>
      </button>
    </div>
  )
}

// ── Grade column (one side of the card body) ──────────────────────────────────

function GradeColumn({
  title,
  grades,
  onGradeChange,
  onAddGrade,
  onRemoveGrade,
}: {
  title: string
  grades: (number | null)[]
  onGradeChange: (idx: number, v: number) => void
  onAddGrade: () => void
  onRemoveGrade: (idx: number) => void
}) {
  const multiAvg = grades.filter((g): g is number => g !== null).length > 1
    ? avgGrades(grades)
    : null

  return (
    <div className="flex-1 min-w-0 flex flex-col py-3 px-2.5 gap-2.5">
      {/* Column header */}
      <div className="flex items-center justify-between px-0.5">
        <p className="text-[9px] font-bold text-text-muted uppercase tracking-wider">{title}</p>
        {multiAvg !== null && (
          <span
            className="text-[9px] font-bold tabular-nums"
            style={{ color: getValueColor(multiAvg) }}
          >
            Ø {multiAvg.toFixed(1)}
          </span>
        )}
      </div>

      {/* Grade wheels — one per grade entry */}
      {grades.map((grade, idx) => (
        <div key={idx}>
          {grades.length > 1 && (
            <div className="flex items-center justify-between px-0.5 mb-0.5">
              <span className="text-[8px] text-text-muted/50 font-medium">Note {idx + 1}</span>
              <button
                onClick={() => onRemoveGrade(idx)}
                className="w-4 h-4 rounded-full flex items-center justify-center press-sm"
                style={{ background: 'rgba(var(--color-border),0.55)' }}
              >
                <span className="text-[10px] text-text-muted leading-none">×</span>
              </button>
            </div>
          )}
          <WheelPicker
            value={grade}
            onChange={(v) => onGradeChange(idx, v)}
          />
        </div>
      ))}

      {/* Add grade button */}
      <button
        onClick={onAddGrade}
        className="w-full py-1.5 rounded-[8px] text-[10px] font-bold press-sm"
        style={{
          background: 'rgba(var(--color-accent),0.07)',
          color: 'rgb(var(--color-accent))',
          border: '1px dashed rgba(var(--color-accent),0.3)',
        }}
      >
        + Note
      </button>
    </div>
  )
}

// ── Subject card ──────────────────────────────────────────────────────────────

const SM_RATIOS = [
  { label: '50/50', ratio: 0.5 },
  { label: '60/40', ratio: 0.6 },
  { label: '70/30', ratio: 0.7 },
  { label: '40/60', ratio: 0.4 },
  { label: '30/70', ratio: 0.3 },
] as const

function SubjectCard({
  entry,
  onChange,
}: {
  entry: AbiGradeEntry
  onChange: (e: AbiGradeEntry) => void
}) {
  const subj = SUBJECT_INFO[entry.subjectId]
  const ratio = entry.smRatio ?? 0.5

  // Resolve grades — migrate from single values when no array exists yet
  const sGrades: (number | null)[] = resolveGrades(entry.schriftlichGrades, entry.schriftlich)
  const mGrades: (number | null)[] = resolveGrades(entry.muendlichGrades, entry.muendlich)

  const sAvg = avgGrades(sGrades)
  const mAvg = avgGrades(mGrades)
  const bothEntered = sAvg !== null && mAvg !== null

  const endnote = endnoteForEntry(entry)
  const isOverride = entry.endnoteOverride !== null && entry.endnoteOverride !== undefined

  const matchesPreset = SM_RATIOS.some((r) => r.ratio === ratio)
  const [manualOpen, setManualOpen] = useState(!matchesPreset)
  const [manualPct, setManualPct] = useState(Math.round(ratio * 100))

  // Commit grade arrays + keep legacy single-value fields in sync
  const commit = (newS: (number | null)[], newM: (number | null)[], extra?: Partial<AbiGradeEntry>) => {
    onChange({
      ...entry,
      schriftlichGrades: newS,
      muendlichGrades: newM,
      schriftlich: avgGrades(newS),
      muendlich: avgGrades(newM),
      ...extra,
    })
  }

  return (
    <div className="bg-surface border border-border/60 rounded-[18px] overflow-hidden">

      {/* ── Top bar: icon · name · LK toggle · Endnote ── */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div
            className="w-8 h-8 rounded-btn flex items-center justify-center text-lg shrink-0"
            style={{ background: `${subj?.color ?? '#7C3AED'}22` }}
          >
            {subj?.icon ?? '📚'}
          </div>
          <span className="font-semibold text-[14px] text-text-primary truncate">
            {subj?.name ?? entry.subjectId}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {/* LK 2× toggle */}
          <button
            onClick={() => onChange({ ...entry, isLK: !entry.isLK })}
            className="px-2.5 py-0.5 rounded-pill text-[10px] font-bold transition-all press-sm"
            style={
              entry.isLK
                ? { background: 'linear-gradient(135deg, #7C3AED, #9F5FFA)', color: 'white', boxShadow: '0 2px 8px rgba(124,58,237,0.45)', border: '1px solid transparent' }
                : { background: 'rgba(var(--color-border),0.4)', color: 'rgb(var(--color-text-muted))', border: '1px solid transparent' }
            }
          >
            LK 2×
          </button>
          {/* Endnote with +/- override */}
          {endnote !== null && (
            <EndnoteControl
              endnote={endnote}
              isOverride={isOverride}
              onIncrement={() => onChange({ ...entry, endnoteOverride: Math.min(15, endnote + 1) })}
              onDecrement={() => onChange({ ...entry, endnoteOverride: Math.max(0, endnote - 1) })}
              onReset={() => onChange({ ...entry, endnoteOverride: undefined })}
            />
          )}
        </div>
      </div>

      {/* ── Body: Schriftlich | Mündlich columns ── */}
      <div className="flex border-t border-border/30">
        <GradeColumn
          title="Schriftlich"
          grades={sGrades}
          onGradeChange={(idx, v) => {
            const next = [...sGrades]; next[idx] = v
            commit(next, mGrades)
          }}
          onAddGrade={() => commit([...sGrades, null], mGrades)}
          onRemoveGrade={(idx) => {
            if (sGrades.length <= 1) return
            commit(sGrades.filter((_, i) => i !== idx), mGrades)
          }}
        />

        <div className="w-px bg-border/30 self-stretch shrink-0" />

        <GradeColumn
          title="Mündlich"
          grades={mGrades}
          onGradeChange={(idx, v) => {
            const next = [...mGrades]; next[idx] = v
            commit(sGrades, next)
          }}
          onAddGrade={() => commit(sGrades, [...mGrades, null])}
          onRemoveGrade={(idx) => {
            if (mGrades.length <= 1) return
            commit(sGrades, mGrades.filter((_, i) => i !== idx))
          }}
        />
      </div>

      {/* ── Bottom bar: S/M weight (shown when both sides set) ── */}
      {bothEntered && (
        <div className="px-4 py-3 border-t border-border/30 bg-background/40 space-y-2.5">
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">S / M Gewichtung</p>

          <div className="flex flex-wrap gap-1">
            {SM_RATIOS.map(({ label, ratio: r }) => {
              const active = !manualOpen && ratio === r
              return (
                <button
                  key={label}
                  onClick={() => { onChange({ ...entry, smRatio: r }); setManualOpen(false) }}
                  className="px-2 py-1 rounded-pill text-[10px] font-bold transition-all press-sm"
                  style={
                    active
                      ? { background: 'linear-gradient(135deg, #7C3AED, #9F5FFA)', color: 'white', boxShadow: '0 2px 8px rgba(124,58,237,0.45)' }
                      : { background: 'rgba(var(--color-border),0.4)', color: 'rgb(var(--color-text-secondary))' }
                  }
                >
                  {label}
                </button>
              )
            })}
            <button
              onClick={() => setManualOpen((v) => !v)}
              className="px-2 py-1 rounded-pill text-[10px] font-bold transition-all press-sm"
              style={
                manualOpen
                  ? { background: 'linear-gradient(135deg, #7C3AED, #9F5FFA)', color: 'white', boxShadow: '0 2px 8px rgba(124,58,237,0.45)' }
                  : { background: 'rgba(var(--color-border),0.4)', color: 'rgb(var(--color-text-secondary))' }
              }
            >
              Manuell
            </button>
          </div>

          {manualOpen && (
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5 bg-background border border-border rounded-[10px] px-3 py-1.5">
                <span className="text-[10px] font-bold text-text-muted">S</span>
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={manualPct}
                  onChange={(e) => {
                    const v = Math.min(99, Math.max(1, parseInt(e.target.value) || 1))
                    setManualPct(v)
                    onChange({ ...entry, smRatio: v / 100 })
                  }}
                  className="w-9 bg-transparent text-text-primary text-[14px] font-bold text-center focus:outline-none tabular-nums"
                />
                <span className="text-[10px] text-text-muted">%</span>
              </div>
              <span className="text-[11px] text-text-muted">/</span>
              <div className="flex items-center gap-1.5 bg-background border border-border/50 rounded-[10px] px-3 py-1.5 opacity-70">
                <span className="text-[10px] font-bold text-text-muted">M</span>
                <span className="w-9 text-text-secondary text-[14px] font-bold text-center tabular-nums">
                  {100 - manualPct}
                </span>
                <span className="text-[10px] text-text-muted">%</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

function ChevronLeft({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function AbiRechnerScreen() {
  const { profile, updateProfile } = useUser()
  const navigate = useNavigate()

  const faecher = profile?.faecher ?? []
  const zielnote = profile?.zielnote
  const klasse = profile?.klasse ?? '12'
  const schultyp = profile?.schultyp

  const isOberstufe = schultyp === 'g8'
    ? parseInt(klasse) >= 11
    : parseInt(klasse) >= 12
  const targetLabels = isOberstufe
    ? ['Q1', 'Q2', 'Q3', 'Q4']
    : ['1. Halbjahr', '2. Halbjahr']

  const [halbjahre, setHalbjahre] = useState<AbiHalbjahr[]>(() => {
    const saved = profile?.abiHalbjahre ?? []
    const legacy = profile?.abiNoten ?? []

    const ensureAllFaecher = (entries: AbiGradeEntry[]): AbiGradeEntry[] =>
      faecher.map(
        (subjectId) =>
          entries.find((e) => e.subjectId === subjectId) ?? {
            subjectId, schriftlich: null, muendlich: null, isLK: false,
          },
      )

    return targetLabels.map((label, i) => {
      const byLabel = saved.find((hj) => hj.label === label)
      const fallback = i === 0 && saved.length === 0 ? legacy : []
      return {
        id: byLabel?.id ?? `hj-${i + 1}`,
        label,
        entries: ensureAllFaecher(byLabel?.entries ?? fallback),
      }
    })
  })

  const [activeId, setActiveId] = useState<string>(halbjahre[0]?.id ?? '')

  const activeHj = halbjahre.find((hj) => hj.id === activeId) ?? halbjahre[0]
  const activeEntries = activeHj?.entries ?? []

  const persist = (updated: AbiHalbjahr[]) => {
    setHalbjahre(updated)
    const gesamtPunkte = totalPunkteAllHalbjahre(updated)
    updateProfile({
      abiHalbjahre: updated,
      abiGesamtpunkte: gesamtPunkte,
      abiGesamtnote: gesamtPunkte !== null ? pktToNoteAbi(gesamtPunkte) : undefined,
    })
  }

  const updateEntry = (updatedEntry: AbiGradeEntry) => {
    persist(
      halbjahre.map((hj) =>
        hj.id === activeId
          ? { ...hj, entries: hj.entries.map((e) => e.subjectId === updatedEntry.subjectId ? updatedEntry : e) }
          : hj,
      ),
    )
  }

  const totalPunkte = totalPunkteAllHalbjahre(halbjahre)
  const totalNote = totalPunkte !== null ? pktToNoteAbi(totalPunkte) : null
  const zielpunkte = zielnote ? zielnoteToPoints(zielnote) : null
  const diffPunkte = totalPunkte !== null && zielpunkte !== null ? totalPunkte - zielpunkte : null
  const isOnTrack = diffPunkte !== null && diffPunkte >= 0

  const activeOverall = overallPunkteAbi(activeEntries)
  const activeNote = activeOverall !== null ? pktToNoteAbi(activeOverall) : null
  const activeFilledCount = activeEntries.filter((e) => subjectAvgAbi(e) !== null).length
  const activeLkCount = activeEntries.filter((e) => e.isLK).length

  const summaryLabel = isOberstufe ? 'Abi-Gesamtschnitt' : `Jahresnote ${klasse}. Klasse`
  const hjFilledCount = halbjahre.filter((hj) => overallPunkteAbi(hj.entries) !== null).length

  return (
    <div className="flex flex-col min-h-screen bg-background pb-28">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 border-b border-border/40"
        style={{ paddingTop: 'max(58px, calc(env(safe-area-inset-top, 0px) + 18px))', paddingBottom: 14 }}
      >
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-surface-hover flex items-center justify-center text-text-muted press-sm shrink-0"
        >
          <ChevronLeft />
        </button>
        <div className="flex-1">
          <h1 className="text-[20px] font-bold text-text-primary">Noten Rechner</h1>
          <p className="text-[12px] text-text-muted">
            {isOberstufe
              ? `Oberstufe · Q1–Q4${totalPunkte !== null ? ` · Ø ${totalPunkte.toFixed(1)} Pkt` : ''}`
              : `${klasse}. Klasse · 1. & 2. Halbjahr${totalPunkte !== null ? ` · Ø ${totalPunkte.toFixed(1)} Pkt` : ''}`
            }
          </p>
        </div>
      </div>

      <div className="px-4 pt-4 pb-8 space-y-4">

        {/* Summary card */}
        <div className="bg-surface border border-border/60 rounded-[20px] p-5">
          {totalPunkte !== null ? (
            <>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">
                    {summaryLabel}
                  </p>
                  <div className="flex items-end gap-2">
                    <span
                      className="font-black leading-none"
                      style={{ fontSize: 54, color: noteColorAbi(totalNote!), letterSpacing: '-0.02em' }}
                    >
                      {totalPunkte.toFixed(1).replace('.', ',')}
                    </span>
                    <div className="mb-1 leading-tight">
                      <p className="text-[12px] text-text-muted">Punkte</p>
                      <p className="text-[18px] font-bold" style={{ color: noteColorAbi(totalNote!) }}>
                        ≈ {totalNote}
                      </p>
                    </div>
                  </div>
                </div>
                {zielnote && (
                  <div className="text-right">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">Zielnote</p>
                    <p className="text-[28px] font-bold text-text-secondary leading-none">{zielnote}</p>
                    {diffPunkte !== null && (
                      <p className="text-[12px] font-bold mt-1" style={{ color: isOnTrack ? '#34C759' : '#FF9500' }}>
                        {isOnTrack ? `+${diffPunkte.toFixed(1)} Pkt ✓` : `${diffPunkte.toFixed(1)} Pkt`}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {zielpunkte !== null && (
                <div className="mb-3">
                  <div className="relative h-2.5 bg-border/30 rounded-pill overflow-hidden">
                    <div
                      className="h-full rounded-pill transition-all duration-700"
                      style={{
                        width: `${Math.min(100, (totalPunkte / 15) * 100)}%`,
                        background: `linear-gradient(90deg, ${noteColorAbi(totalNote!)}, ${noteColorAbi(totalNote!)}CC)`,
                      }}
                    />
                    <div
                      className="absolute top-0 bottom-0 w-0.5"
                      style={{ left: `${Math.min(99, (zielpunkte / 15) * 100)}%`, background: 'rgb(var(--color-text-secondary))', opacity: 0.7 }}
                    />
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="text-[9px] text-text-muted">0 Pkt</span>
                    <span className="text-[9px] text-text-muted/60">Ziel {zielpunkte.toFixed(1)} Pkt (Note {zielnote})</span>
                    <span className="text-[9px] text-text-muted">15 Pkt</span>
                  </div>
                </div>
              )}

              {isOberstufe && (
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-text-muted">Aus</span>
                  {halbjahre.map((hj) => {
                    const pts = overallPunkteAbi(hj.entries)
                    const note = pts !== null ? pktToNoteAbi(pts) : null
                    return (
                      <span
                        key={hj.id}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-pill"
                        style={{
                          background: note ? `${noteColorAbi(note)}18` : 'rgba(var(--color-border),0.3)',
                          color: note ? noteColorAbi(note) : 'rgb(var(--color-text-muted))',
                        }}
                      >
                        {hj.label}{note ? ` · ${note}` : ''}
                      </span>
                    )
                  })}
                </div>
              )}

              {!isOberstufe && hjFilledCount === 2 && (
                <p className="text-[11px] text-text-muted mt-2">
                  1. und 2. Halbjahr fließen gemeinsam in die Jahresnote ein
                </p>
              )}
            </>
          ) : (
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-[14px] flex items-center justify-center text-2xl shrink-0"
                style={{ background: 'rgba(var(--color-accent),0.1)' }}
              >
                🎓
              </div>
              <div>
                <p className="text-text-primary font-semibold text-[15px]">Noch keine Noten eingetragen</p>
                <p className="text-text-muted text-[13px] mt-0.5">Trag deine Punkte für jedes Fach ein</p>
              </div>
            </div>
          )}
        </div>

        {/* Halbjahr tab bar */}
        <div>
          <div className="pb-1 pt-0.5 -mx-4 px-4">
            <div
              className="flex gap-2"
              style={{ overflowX: 'auto', msOverflowStyle: 'none', scrollbarWidth: 'none', paddingBottom: 8, paddingTop: 4 } as CSSProperties}
            >
              {halbjahre.map((hj) => {
                const isActive = hj.id === activeId
                const pts = overallPunkteAbi(hj.entries)
                const note = pts !== null ? pktToNoteAbi(pts) : null
                return (
                  <button
                    key={hj.id}
                    onClick={() => setActiveId(hj.id)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-pill shrink-0 press-sm transition-all duration-200"
                    style={
                      isActive
                        ? { background: 'linear-gradient(135deg, #7C3AED, #9F5FFA)', color: 'white', boxShadow: '0 4px 16px rgba(124,58,237,0.55)' }
                        : { background: 'rgb(var(--color-surface))', border: '1.5px solid rgba(var(--color-border),1)', color: 'rgb(var(--color-text-secondary))' }
                    }
                  >
                    <span className="text-[13px] font-bold">{hj.label}</span>
                    {note && (
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-pill"
                        style={
                          isActive
                            ? { background: 'rgba(255,255,255,0.22)', color: 'white' }
                            : { background: `${noteColorAbi(note)}18`, color: noteColorAbi(note) }
                        }
                      >
                        {note}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {activeOverall !== null && activeHj && (
            <div className="flex items-center justify-between px-1 py-0.5 mt-0.5">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-semibold text-text-secondary">{activeHj.label}</span>
                <span className="text-[12px] font-bold" style={{ color: noteColorAbi(activeNote!) }}>
                  {activeOverall.toFixed(1).replace('.', ',')} Pkt · ≈ {activeNote}
                </span>
              </div>
              <span className="text-[11px] text-text-muted">
                {activeFilledCount}/{activeEntries.length} Fächer
                {activeLkCount > 0 && ` · ${activeLkCount} LK`}
              </span>
            </div>
          )}
        </div>

        {/* Subject cards */}
        {activeEntries.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-text-muted text-[13px]">Keine Fächer ausgewählt</p>
            <p className="text-text-muted text-[11px] mt-1">Füge Fächer im Profil hinzu</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
              {activeHj?.label ?? ''} — Noten
            </p>
            {activeEntries.map((entry) => (
              <SubjectCard
                key={`${activeId}-${entry.subjectId}`}
                entry={entry}
                onChange={updateEntry}
              />
            ))}
          </div>
        )}

        {/* Grade scale reference */}
        <div className="bg-surface border border-border/40 rounded-[14px] px-4 py-3.5">
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-3">Punkte → Note</p>
          <div className="grid grid-cols-5 gap-1.5">
            {(
              [
                { pts: '15',    note: '0,7',      color: '#34C759' },
                { pts: '14–13', note: '1,0–1,3',  color: '#34C759' },
                { pts: '12–10', note: '1,7–2,3',  color: '#34C759' },
                { pts: '9–7',   note: '2,7–3,3',  color: '#FF9500' },
                { pts: '6–5',   note: '3,7–4,0',  color: '#FF3B30' },
              ] as const
            ).map((item) => (
              <div key={item.pts} className="text-center">
                <p className="text-[12px] font-bold text-text-primary">{item.pts}</p>
                <p className="text-[9px] font-semibold" style={{ color: item.color }}>{item.note}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
