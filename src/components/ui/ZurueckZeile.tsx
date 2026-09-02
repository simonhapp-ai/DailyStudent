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
export function ZurueckZeile({
  label = 'Zurück', ziel, className = '',
}: { label?: string; ziel?: string; className?: string }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => (ziel ? navigate(ziel) : navigate(-1))}
      className={`flex items-center gap-1 -ml-1 mb-1.5 press-sm text-[13px] font-medium text-text-secondary tap-44 ${className}`}
    >
      <svg width="7" height="12" viewBox="0 0 8 14" fill="none" stroke="currentColor" strokeWidth="2.2"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M7 1L1 7l6 6" />
      </svg>
      {label}
    </button>
  )
}
