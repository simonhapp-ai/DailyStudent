import { useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { recenterScreen } from '../../lib/nativeBridge'
import { modeForPath, MODE_HOME, PLANEN_HOME, type AppMode } from '../../lib/appMode'

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

/** Zeitfenster, in dem ein zweiter Tipp als Doppeltipp zaehlt. */
const DOPPELTIPP_MS = 350

export function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const letzterTipp = useRef(0)
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
                // Nicht am Startpunkt dieses Modus? Dann dorthin. Das gilt
                // auch fuer Screens, die zu keinem Modus gehoeren — aus dem
                // Profil kam man sonst nicht mehr in den Unterricht zurueck,
                // weil dessen Knopf dort faelschlich als „aktiv" galt.
                if (location.pathname !== MODE_HOME[mode]) {
                  recenterScreen(false)
                  navigate(MODE_HOME[mode])
                  return
                }

                // Schon am Startpunkt: Ein SCHNELLER zweiter Tipp auf den
                // Klausurenmodus fuehrt ins Planen — sonst muss man dafuer
                // jedes Mal an den oberen Bildschirmrand greifen. Ohne das
                // Zeitfenster waere jeder zweite Tipp irgendwann ein Sprung,
                // auch Minuten spaeter, und das Hochscrollen des aktiven Tabs
                // nicht mehr erreichbar.
                const jetzt = Date.now()
                const schnell = jetzt - letzterTipp.current < DOPPELTIPP_MS
                letzterTipp.current = jetzt

                if (schnell && mode === 'klausur') {
                  recenterScreen(false)
                  navigate(PLANEN_HOME)
                  return
                }
                recenterScreen()
              }}
              aria-current={active ? 'page' : undefined}
              className="flex-1 relative flex items-center justify-center rounded-full h-[46px] px-3 press-grow"
            >
              {/* Die Fuellung lag frueher auf einem einzigen Element, das per
                  layoutId zwischen den beiden Haelften wanderte. Bei jedem
                  Routenwechsel misst framer-motion dessen Lage neu — stimmte
                  die gespeicherte Lage nicht mehr, flog die Pille sichtbar an
                  ihren Platz, auch wenn sich der Modus gar nicht geaendert
                  hatte. Jetzt hat jede Haelfte ihre eigene Fuellung und blendet
                  auf; da wandert nichts, also kann auch nichts fehlfliegen. */}
              <span
                aria-hidden
                className="absolute inset-0 rounded-full transition-opacity duration-200 ease-out motion-reduce:transition-none"
                style={{ background: fill, opacity: active ? 1 : 0 }}
              />
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
