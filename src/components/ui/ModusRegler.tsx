import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

export interface ModusOption {
  id: string
  title: string
  desc: string
  icon: React.ReactNode
}

const MINT = '#34D399'

// Functions (not plain objects) so AnimatePresence can re-evaluate the exiting card's
// direction via `custom` after it's no longer part of the render tree — a static exit
// object would freeze the direction from whichever render last had it as the active card.
const previewVariants = {
  enter: (dir: number) => ({ opacity: 0, scale: 0.92, x: dir * 20 }),
  center: { opacity: 1, scale: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, scale: 0.95, x: dir * -20 }),
}
const previewVariantsReduced = {
  enter: { opacity: 0 },
  center: { opacity: 1 },
  exit: { opacity: 0 },
}

/**
 * Swipeable, always-dark "Regler" for picking one of a few modes: a tappable segmented
 * track (mint pill slides via a shared layoutId) plus a swipeable preview card below that
 * shows only the active mode's icon/title/description — never all options at once.
 * Hardcoded dark palette on purpose (matches the DashboardScreen hero-card convention for
 * "always dark regardless of app theme" — see CLAUDE.md), independent of light/dark mode.
 */
export function ModusRegler({
  options, activeId, onChange,
}: {
  options: ModusOption[]
  activeId: string
  onChange: (id: string) => void
}) {
  const reduceMotion = useReducedMotion()
  const activeIndex = Math.max(0, options.findIndex((o) => o.id === activeId))
  const active = options[activeIndex] ?? options[0]
  const [direction, setDirection] = useState(1)

  const goTo = (index: number) => {
    const clamped = Math.max(0, Math.min(options.length - 1, index))
    if (clamped === activeIndex) return
    setDirection(clamped > activeIndex ? 1 : -1)
    onChange(options[clamped].id)
  }

  return (
    <div
      className="rounded-sheet p-5 overflow-hidden relative"
      style={{
        background: '#14141f',
        boxShadow: '0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)',
      }}
    >
      {/* Ambient mint glow */}
      <div
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{
          top: '-90px', left: '50%', transform: 'translateX(-50%)',
          width: '260px', height: '220px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(52,211,153,0.20) 0%, transparent 70%)',
        }}
      />

      {/* Track — the "Regler": tap any stop to jump straight there */}
      <div
        className="relative flex items-center gap-1 mb-5 rounded-full p-1.5"
        style={{ background: 'rgba(255,255,255,0.05)' }}
        role="tablist"
        aria-label="Erklärungs-Modus"
      >
        {options.map((o, i) => {
          const isActive = i === activeIndex
          return (
            <button
              key={o.id}
              onClick={() => goTo(i)}
              role="tab"
              aria-selected={isActive}
              aria-label={o.title}
              className="relative flex-1 flex items-center justify-center press-sm"
              style={{ height: '44px', borderRadius: '999px' }}
            >
              {isActive && (
                <motion.div
                  layoutId="modus-regler-thumb"
                  className="absolute inset-0 rounded-full"
                  style={{ background: `${MINT}`, boxShadow: '0 2px 14px rgba(52,211,153,0.5)' }}
                  transition={reduceMotion ? { duration: 0.01 } : { type: 'spring', duration: 0.4, bounce: 0.2 }}
                />
              )}
              <span className="relative z-10 w-[18px] h-[18px]" style={{ color: isActive ? '#0a0a0f' : 'rgba(255,255,255,0.55)' }}>
                {o.icon}
              </span>
            </button>
          )
        })}
      </div>

      {/* Preview — swipe left/right to browse, only the active mode is shown */}
      <motion.div
        drag={reduceMotion ? false : 'x'}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.5}
        onDragEnd={(_, info) => {
          if (info.offset.x < -60 || info.velocity.x < -400) goTo(activeIndex + 1)
          else if (info.offset.x > 60 || info.velocity.x > 400) goTo(activeIndex - 1)
        }}
        className="relative"
        style={{ touchAction: 'pan-y' }}
      >
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={active.id}
            custom={direction}
            variants={reduceMotion ? previewVariantsReduced : previewVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={reduceMotion ? { duration: 0.15 } : { type: 'spring', duration: 0.4, bounce: 0.22 }}
            className="flex flex-col items-center text-center px-2 pt-1 pb-1"
          >
            <div
              className="w-14 h-14 rounded-card flex items-center justify-center mb-3"
              style={{ background: `${MINT}`, boxShadow: '0 4px 18px rgba(52,211,153,0.4)' }}
            >
              <span className="w-6 h-6" style={{ color: '#0a0a0f' }}>{active.icon}</span>
            </div>
            <p className="text-[17px] font-bold text-white mb-1.5">{active.title}</p>
            <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)', maxWidth: '300px' }}>
              {active.desc}
            </p>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
