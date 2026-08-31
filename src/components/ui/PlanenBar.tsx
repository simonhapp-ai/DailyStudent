import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'

// Planen-Leiste (Version C) — sechs Rubriken in einem festen Raster.
//
// Erste Zeile: die drei häufigsten plus „Mehr". Ein Tipp klappt die zweite Zeile
// auf, die exakt unter den ersten drei sitzt — gleiche Spalten, gleiche Breite,
// nichts versetzt. Man bleibt dabei im aktuellen Screen und wählt von dort seine
// Rubrik.
//
// Reihenfolge nach Häufigkeit, nicht nach Alphabet. Alle sechs liegen im
// Klausurenmodus: Geplant wird zuhause, erfasst wird in der Schule.
const PRIMARY = [
  { label: 'Kalender', path: '/kalender' },
  { label: 'Statistiken', path: '/insights' },
  { label: 'Stundenplan', path: '/stundenplan' },
]

const SECONDARY = [
  { label: 'Notenrechner', path: '/abi-rechner' },
  { label: 'Hausaufgaben', path: '/hausaufgaben' },
  { label: 'Klausuren', path: '/klausuren' },
]

export function PlanenBar({ className = '' }: { className?: string }) {
  const location = useLocation()
  const navigate = useNavigate()
  const reducedMotion = useReducedMotion()
  const inSecondary = SECONDARY.some((i) => location.pathname.startsWith(i.path))
  const [open, setOpen] = useState(inSecondary)

  const pill = (label: string, path: string) => {
    const active = location.pathname.startsWith(path)
    return (
      <button
        key={path}
        onClick={() => { if (!active) navigate(path) }}
        aria-current={active ? 'page' : undefined}
        title={label}
        className={`w-full h-9 px-2 rounded-pill text-[12.5px] font-semibold truncate press-sm transition-colors ${
          active
            ? 'bg-accent text-white dark:text-[#160E28]'
            : 'bg-surface text-text-primary hover:bg-surface-hover'
        }`}
      >
        {label}
      </button>
    )
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="grid grid-cols-4 gap-2">
        {PRIMARY.map((i) => pill(i.label, i.path))}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="h-9 px-2 rounded-pill text-[12.5px] font-semibold text-text-primary bg-fill-2 press-sm flex items-center justify-center gap-1"
        >
          Mehr
          <motion.svg
            width="9" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden
            animate={{ rotate: open ? 180 : 0 }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
          >
            <path d="M1 1l4 4 4-4" />
          </motion.svg>
        </button>
      </div>

      {/* Zweite Zeile — dasselbe Vier-Spalten-Raster, damit die drei Rubriken
          bündig unter den ersten dreien stehen statt versetzt. */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="more"
            initial={reducedMotion ? { opacity: 1 } : { height: 0, opacity: 0 }}
            animate={reducedMotion ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-4 gap-2">
              {SECONDARY.map((i, idx) => (
                <motion.div
                  key={i.path}
                  className="flex"
                  initial={reducedMotion ? false : { opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={reducedMotion ? { duration: 0 } : { delay: idx * 0.04, duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                >
                  {pill(i.label, i.path)}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
