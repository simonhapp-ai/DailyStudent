import { useState } from 'react'
import { Button } from './Button'

type ProFeature = 'ki-zusammenfassung' | 'ki-korrektur' | 'lernplan' | 'karteikarten' | 'lernzettel' | 'probeklausur'

const featureContent: Record<ProFeature, { headline: string; bullets: string[] }> = {
  'ki-zusammenfassung': {
    headline: 'KI-Zusammenfassung freischalten',
    bullets: [
      'Aufnahmen werden automatisch zu strukturierten Notizen',
      'Schlüsselbegriffe und Klausurthemen werden erkannt',
      'Spare bis zu 2 Stunden Nachbereitung pro Woche',
    ],
  },
  'ki-korrektur': {
    headline: 'KI-Analyse freischalten',
    bullets: [
      'Detailliertes Feedback zu Stärken und Schwächen',
      'Konkrete Tipps für die echte Klausur',
      'Abitur-gerechte Bewertung nach Erwartungshorizont',
    ],
  },
  'lernplan': {
    headline: 'KI-Lernplan freischalten',
    bullets: [
      'Rückwärts-Lernplan aus dem Klausurdatum berechnen',
      'Tägliche Ziele passend zu deinem Stundenplan',
      'Automatische Anpassung bei Änderungen',
    ],
  },
  'karteikarten': {
    headline: 'Unbegrenzte Karteikarten',
    bullets: [
      'Alle Karteikarten für alle Fächer ohne Limit',
      'KI-generierte Karten aus deinen Smart Notes',
      'Spaced-Repetition für effizientes Lernen',
    ],
  },
  'lernzettel': {
    headline: 'Unbegrenzte Lernzettel',
    bullets: [
      'Free-Nutzer: 1 Lernzettel pro Tag',
      'Pro: Unbegrenzt für alle Fächer',
      'KI nutzt dein Kerncurriculum für optimale Vorbereitung',
    ],
  },
  'probeklausur': {
    headline: 'Unbegrenzte Probeklausuren',
    bullets: [
      'Free-Nutzer: 1 vollständige Klausur pro Tag',
      'Pro: Unbegrenzt üben für alle Fächer',
      'Inkl. vollständiger KI-Korrektur mit Fehlern & Lücken',
    ],
  },
}

interface ProModalProps {
  feature: ProFeature
  isOpen: boolean
  onClose: () => void
}

export function ProModal({ feature, isOpen, onClose }: ProModalProps) {
  const [plan, setPlan] = useState<'annual' | 'monthly'>('annual')

  if (!isOpen) return null

  const content = featureContent[feature]

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Sheet */}
      <div className="relative max-w-lg mx-auto w-full bg-surface border-t border-border rounded-t-2xl px-5 pt-5 pb-10 z-10">
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />

        <div className="w-12 h-12 rounded-btn icon-accent flex items-center justify-center mb-4">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h2 className="text-xl font-bold text-text-primary mb-1">{content.headline}</h2>
        <p className="text-text-secondary text-sm mb-5">Weniger als eine Nachhilfestunde im Monat.</p>

        <ul className="space-y-3 mb-6">
          {content.bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-text-secondary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2.5" className="shrink-0 mt-0.5">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {b}
            </li>
          ))}
        </ul>

        {/* Price toggle */}
        <div className="bg-background border border-border rounded-card p-1 flex mb-4">
          <button
            onClick={() => setPlan('annual')}
            className={`flex-1 py-2.5 rounded-btn text-sm font-medium transition-all duration-150 ${
              plan === 'annual' ? 'grad-accent text-white' : 'text-text-secondary'
            }`}
          >
            Jährlich · €5/Mo
            {plan === 'annual' && <span className="ml-1.5 text-xs opacity-75">2 Monate gratis</span>}
          </button>
          <button
            onClick={() => setPlan('monthly')}
            className={`flex-1 py-2.5 rounded-btn text-sm font-medium transition-all duration-150 ${
              plan === 'monthly' ? 'grad-accent text-white' : 'text-text-secondary'
            }`}
          >
            Monatlich · €7,99
          </button>
        </div>

        <Button variant="primary" fullWidth className="mb-3">
          Pro freischalten · {plan === 'annual' ? '€59,99/Jahr' : '€7,99/Monat'}
        </Button>

        <button
          onClick={onClose}
          className="w-full text-center text-sm text-text-muted hover:text-text-secondary transition-colors py-2"
        >
          Später
        </button>

        <p className="text-center text-xs text-text-muted mt-3">
          Abi-Schnitt unserer Pro-Nutzer: Ø 1.7
        </p>
      </div>
    </div>
  )
}
