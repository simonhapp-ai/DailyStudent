import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'

// Planen-Leiste (Version C) — sechs Rubriken, ohne dass die Leiste erdrückt.
//
// Sichtbar sind die drei häufigsten plus „Mehr"; ein Tipp klappt eine zweite Zeile
// auf, die sich der ersten unterordnet. Reihenfolge nach Häufigkeit, nicht nach
// Alphabet: Kalender, Statistiken, Stundenplan — dann Notenrechner, Hausaufgaben,
// Klausurtermine.
//
// Alle sechs liegen im Klausurenmodus: Geplant wird zuhause, erfasst in der Schule.
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
        className={`px-4 py-2 rounded-pill text-[14px] font-semibold press-sm transition-colors ${
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
      <div className="flex flex-wrap gap-2">
        {PRIMARY.map((i) => pill(i.label, i.path))}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="px-4 py-2 rounded-pill text-[14px] font-semibold text-text-primary bg-[rgb(120,120,128)]/[0.12] dark:bg-[rgb(120,120,128)]/[0.24] press-sm flex items-center gap-1.5"
        >
          Mehr
          <motion.svg
            width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden
            animate={{ rotate: open ? 180 : 0 }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
          >
            <path d="M1 1l4 4 4-4" />
          </motion.svg>
        </button>
      </div>

      {/* Zweite Zeile fährt aus dem Mehr-Knopf heraus, die drei Pillen versetzt.
          Bei reduzierter Bewegung erscheint sie ohne Auffahren. */}
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
            <div className="flex flex-wrap gap-2 pl-3.5">
              {SECONDARY.map((i, idx) => (
                <motion.span
                  key={i.path}
                  initial={reducedMotion ? false : { opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={reducedMotion ? { duration: 0 } : { delay: idx * 0.04, duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                >
                  {pill(i.label, i.path)}
                </motion.span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
