import type { CSSProperties, MouseEvent } from 'react'
import type { StundenplanSlot } from '../../types'
import { SUBJECT_INFO } from '../../data/subjectInfo'
import { SubjectIcon } from './SubjectIcon'
import { Icon } from './Icon'

// Einheitlicher Stundenplan-Pillen-Look für alle 4 Render-Stellen (Dashboard-
// Tagesplan, Kalender-Zeitachse, Kalender-Wochenübersicht, Kalender-Mini-
// Vorschau) — vorher hatte jede Stelle ihren eigenen Chip-Stil. Referenz war
// die bereits zeitproportionale Kalender-Timeline (Farbverlauf + linker
// Akzentstreifen pro Fach); die anderen 3 Stellen sind jetzt darauf
// vereinheitlicht. Freistunden (siehe StundenplanSlot.isFreistunde) bekommen
// bewusst keinen Fach-Akzent (gestrichelt, gedimmt, kein Farbverlauf), damit
// sie sich klar von echten Stunden abheben, egal in welcher Variante.
type StundenplanPillVariant = 'row' | 'stack' | 'compact' | 'timeline'

interface StundenplanPillProps {
  slot: StundenplanSlot
  variant: StundenplanPillVariant
  isCurrent?: boolean
  isPast?: boolean
  isNext?: boolean
  /** Nur für 'timeline': top/height kommen vom Aufrufer (echte Zeitachsen-Position) */
  style?: CSSProperties
  onClick?: (e: MouseEvent) => void
}

export function StundenplanPill({ slot, variant, isCurrent, isPast, isNext, style, onClick }: StundenplanPillProps) {
  if (slot.isFreistunde) {
    return <FreistundeBlock variant={variant} style={style} onClick={onClick} />
  }

  const subj = SUBJECT_INFO[slot.subjectId]
  const color = subj?.color ?? '#7C3AED'
  const name = subj?.name ?? slot.subjectId
  const accent = isCurrent ? '#30D158' : color
  const background = isCurrent ? 'rgba(52,199,89,0.10)' : `linear-gradient(135deg, ${color}28, ${color}15)`

  if (variant === 'timeline') {
    return (
      <div
        onClick={onClick}
        className="absolute left-0.5 right-0.5 rounded-[7px] flex flex-col justify-center px-2 overflow-hidden"
        style={{ ...style, background, borderLeft: `2.5px solid ${accent}90` }}
      >
        <span className="text-[9px] font-bold leading-tight truncate" style={{ color: accent }}>{name}</span>
        {slot.room && <span className="text-[7px] truncate" style={{ color: accent, opacity: 0.7 }}>{slot.room}</span>}
      </div>
    )
  }

  if (variant === 'stack') {
    return (
      <div
        className="rounded-btn px-2 py-2.5 flex flex-col items-center gap-0.5 overflow-hidden"
        style={{ background, borderLeft: `2.5px solid ${accent}90`, opacity: isPast ? 0.5 : 1 }}
      >
        <span className="text-[9px] font-bold text-center leading-tight truncate w-full" style={{ color: accent }}>{name}</span>
        <span className="text-[7px] text-text-muted/70 tabular-nums">{slot.startTime}</span>
        {slot.room && <span className="text-[7px] text-text-muted/50 truncate w-full text-center">{slot.room}</span>}
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div
        className="flex items-center gap-1 px-1.5 py-1 rounded-[7px] text-[9px] font-bold leading-none overflow-hidden"
        style={{ background, borderLeft: `2px solid ${accent}90` }}
      >
        <span className="truncate" style={{ color: accent }}>{name.split(' ')[0]}</span>
      </div>
    )
  }

  // 'row'
  return (
    <div
      className="flex items-center gap-2 rounded-btn px-3 py-2 overflow-hidden"
      style={{ background, borderLeft: `2.5px solid ${accent}90`, opacity: isPast ? 0.5 : 1 }}
    >
      <span className={`text-[11px] font-mono font-semibold ${isPast ? 'line-through' : ''}`} style={{ color: isCurrent ? '#30D158' : 'rgb(var(--color-text-muted))' }}>
        {slot.startTime}
      </span>
      <SubjectIcon subjectId={slot.subjectId} size="sm" />
      <span className={`text-[13px] font-medium text-text-primary ${isPast ? 'line-through text-text-muted' : ''}`}>
        {name}
      </span>
      {isCurrent && (
        <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(52,199,89,0.18)', color: '#30D158' }}>Jetzt</span>
      )}
      {isNext && !isCurrent && (
        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(var(--color-accent), 0.12)', color: 'rgb(var(--color-accent))' }}>Nächste</span>
      )}
    </div>
  )
}

function FreistundeBlock({ variant, style, onClick }: { variant: StundenplanPillVariant; style?: CSSProperties; onClick?: (e: MouseEvent) => void }) {
  const borderColor = 'rgba(148,163,184,0.4)'
  const bg = 'rgba(148,163,184,0.07)'
  const textColor = 'rgb(var(--color-text-muted))'
  const base = 'border border-dashed overflow-hidden'

  if (variant === 'timeline') {
    return (
      <div onClick={onClick} className={`absolute left-0.5 right-0.5 rounded-[7px] flex items-center justify-center gap-1 ${base}`} style={{ ...style, background: bg, borderColor }}>
        <span className="text-[9px] font-semibold truncate flex items-center gap-1" style={{ color: textColor }}><Icon name="coffee" size={9} />Freistunde</span>
      </div>
    )
  }

  if (variant === 'stack') {
    return (
      <div className={`rounded-btn px-2 py-2.5 flex flex-col items-center gap-0.5 ${base}`} style={{ background: bg, borderColor }}>
        <Icon name="coffee" size={15} className="opacity-60" />
        <span className="text-[9px] font-semibold text-center leading-tight" style={{ color: textColor }}>Frei</span>
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-center justify-center px-1.5 py-1 rounded-[7px] text-[9px] font-semibold leading-none ${base}`} style={{ background: bg, borderColor, color: textColor }}>
        <Icon name="coffee" size={11} />
      </div>
    )
  }

  // 'row'
  return (
    <div className={`flex items-center gap-2 rounded-btn px-3 py-2 ${base}`} style={{ background: bg, borderColor }}>
      <Icon name="coffee" size={14} className="opacity-60" />
      <span className="text-[13px] font-medium" style={{ color: textColor }}>Freistunde</span>
    </div>
  )
}
