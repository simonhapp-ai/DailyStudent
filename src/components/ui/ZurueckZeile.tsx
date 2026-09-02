import { useNavigate } from 'react-router-dom'

// Zurueck-Weg ueber der Ueberschrift.
//
// Profil und Planen waren beide Sackgassen: Man kam ueber den Avatar bzw. den
// Planen-Knopf hinein, aber wieder heraus nur ueber die Leiste unten — und im
// Planen fuehrt die inzwischen woanders hin. Ein Screen, in den man
// hineingeht, braucht einen sichtbaren Weg zurueck.
//
// Dezent und ueber der Ueberschrift statt daneben: Die Ueberschriften dieser
// Screens sind gross gesetzt, ein Knopf auf gleicher Hoehe wuerde mit ihnen
// konkurrieren. Oben links ist ausserdem die Stelle, an der man ihn sucht.
//
// Die Tippflaeche steckt in echter Polsterung statt in einem unsichtbaren Feld
// (.tap-44). Das Feld ist 44 px hoch und um die Mitte des Knopfes zentriert —
// bei einem 20 px hohen Knopf ragte es 12 px nach unten und lag damit auf der
// Ueberschrift: Ein Tipp auf deren oberen Rand fuehrte zurueck. Mit Polsterung
// ist die antippbare Flaeche genau das, was man auch sieht.
export function ZurueckZeile({
  label = 'Zurück', ziel, className = '',
}: { label?: string; ziel?: string; className?: string }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => (ziel ? navigate(ziel) : navigate(-1))}
      className={`flex items-center gap-1 -ml-2 -mt-1 mb-2 px-2 py-2 rounded-btn press-sm text-[13px] font-medium text-text-primary ${className}`}
    >
      <svg width="7" height="12" viewBox="0 0 8 14" fill="none" stroke="currentColor" strokeWidth="2.2"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M7 1L1 7l6 6" />
      </svg>
      {label}
    </button>
  )
}
