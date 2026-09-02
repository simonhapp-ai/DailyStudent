import { useLocation, useNavigate } from 'react-router-dom'
import { IST_TELEFON } from '../../lib/geraet'

// Planen-Leiste (Version C) — sechs Rubriken in einem festen Raster.
//
// Zwei Zeilen zu dritt, alle sechs sichtbar. Vorher stand in der ersten Zeile
// „Mehr" und klappte die zweite auf. Das kostete auf jedem Telefon unter 420 px
// — also auf fast allen — eine Zeile in voller Breite für ein einziges Wort,
// und es versteckte drei von sechs Rubriken hinter einem Tipp.
//
// Drei Spalten sind auch auf dem schmalsten Gerät breit genug, dass „Stundenplan"
// und „Notenrechner" ungekürzt hineinpassen. Gekürzte Beschriftungen in einer
// Navigation sind schlimmer als eine Zeile mehr.
//
// Reihenfolge nach Häufigkeit, nicht nach Alphabet. Alle sechs liegen im
// Klausurenmodus: Geplant wird zuhause, erfasst wird in der Schule.
const RUBRIKEN = [
  { label: 'Kalender', path: '/kalender' },
  { label: 'Statistiken', path: '/insights' },
  { label: 'Stundenplan', path: '/stundenplan' },
  { label: 'Notenrechner', path: '/abi-rechner' },
  { label: 'Hausaufgaben', path: '/hausaufgaben' },
  { label: 'Klausuren', path: '/klausuren' },
]

export function PlanenBar({ className = '' }: { className?: string }) {
  const location = useLocation()
  const navigate = useNavigate()

  // Nur auf dem Telefon. Am Schreibtisch fuehrt die Seitenleiste dieselben sechs
  // Rubriken — vorher hing es an der Fensterbreite, ob beides gleichzeitig zu
  // sehen war: unter 1024 px erschienen die Pillen zusaetzlich zur Leiste.
  if (!IST_TELEFON) return null

  return (
    <div className={`grid grid-cols-3 gap-2 ${className}`}>
      {RUBRIKEN.map(({ label, path }) => {
        const active = location.pathname.startsWith(path)
        return (
          <button
            key={path}
            onClick={() => { if (!active) navigate(path) }}
            aria-current={active ? 'page' : undefined}
            className={`w-full h-9 px-2 rounded-pill text-[12.5px] font-semibold truncate press-sm transition-colors ${
              active ? 'btn-mode' : 'bg-surface text-text-primary hover:bg-surface-hover'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
