import { useLocation, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { recenterScreen } from '../../lib/nativeBridge'
import { modeForPath, MODE_HOME, isPlanenPath, PLANEN_HOME, type AppMode } from '../../lib/appMode'

// Zwei Modi statt vier Tabs (Version C).
//
// Die Leiste kennt nur noch Unterricht und Klausur, weil es im Alltag der Nutzer
// genau diese zwei Situationen gibt. Alles Weitere hängt an einem der beiden:
// Profil und Personalisierung am Avatar oben rechts im Unterrichtsmodus, Kalender,
// Statistiken, Stundenplan, Notenrechner, Hausaufgaben und Klausurtermine hinter
// „Planen" im Klausurenmodus.
//
// Farbe: Der aktive Modus trägt seine eigene Farbe als Fläche — Purple für
// Unterricht, Mint für Klausur. Schrift darauf ist weiß oder fast schwarz nach
// Kontrast, nie die Akzentfarbe selbst.
const MODES: Array<{ mode: AppMode; label: string; fill: string; on: string }> = [
  { mode: 'unterricht', label: 'Unterricht', fill: 'linear-gradient(135deg, #7C3AED, #5B21B6)', on: '#FFFFFF' },
  { mode: 'klausur', label: 'Klausur', fill: 'linear-gradient(135deg, #34D399, #059669)', on: '#FFFFFF' },
]

export function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const reducedMotion = useReducedMotion()
  const current = modeForPath(location.pathname)

  return (
    <nav
      className="fixed left-4 right-4 z-50"
      style={{ bottom: 'max(4px, calc(env(safe-area-inset-bottom, 0px) - 12px))' }}
      aria-label="Modus"
    >
      <div
        className="flex items-center rounded-full p-[5px] gap-[5px]"
        style={{
          backdropFilter: 'blur(var(--material-blur-thick)) saturate(2.8) brightness(1.06)',
          WebkitBackdropFilter: 'blur(var(--material-blur-thick)) saturate(2.8) brightness(1.06)',
          backgroundColor: 'var(--nav-pill-bg)',
          boxShadow: 'var(--nav-pill-shadow)',
        }}
      >
        {MODES.map(({ mode, label, fill, on }) => {
          const active = current === mode
          return (
            <button
              key={mode}
              onClick={() => {
                // Immer neu zentrieren — deckt sowohl das erneute Tippen auf den
                // bereits aktiven Modus ab (der Pfad ändert sich nicht, der
                // app-weite Route-Effect feuert also nicht) als auch den Wechsel.
                recenterScreen()
                if (!active) { navigate(MODE_HOME[mode]); return }
                // Nochmal auf den bereits aktiven Klausurenmodus tippen fuehrt
                // ins Planen — sonst muss man dafuer jedes Mal an den oberen
                // Bildschirmrand greifen. Ist man schon dort, bleibt es beim
                // Hochscrollen (natives Verhalten einer Tableiste).
                if (mode === 'klausur' && !isPlanenPath(location.pathname)) {
                  navigate(PLANEN_HOME)
                }
              }}
              aria-current={active ? 'page' : undefined}
              className="flex-1 relative flex items-center justify-center rounded-full h-[46px] px-3 press-grow"
            >
              {active && (
                <motion.div
                  layoutId={reducedMotion ? undefined : 'nav-mode'}
                  className="absolute inset-0 rounded-full"
                  style={{ background: fill }}
                  transition={{ type: 'spring', duration: 0.32, bounce: 0.18 }}
                />
              )}
              <span
                className="relative z-10 whitespace-nowrap text-[16px]"
                style={{
                  color: active ? on : 'rgb(var(--color-text-primary) / 0.55)',
                  fontWeight: active ? 700 : 500,
                  letterSpacing: '-0.015em',
                  transition: 'color 180ms ease',
                }}
              >
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
