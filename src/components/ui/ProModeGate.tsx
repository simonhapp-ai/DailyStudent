import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ProModal } from './ProModal'

// Vollbild-Sperre für eine Pro-only Klausurart (AFB-Trainer / Materialklausur /
// Ohne Material). Als früher Return in den Mode-Screens nach den Hooks — fängt
// auch Direkt-URL-Zugriff und den "Fortfahren"-Knopf einer alten Klausur ab,
// nicht nur den Klick im Menü.
export function ProModeGate({ title }: { title: string }) {
  const navigate = useNavigate()
  const [showPro, setShowPro] = useState(false)
  return (
    <div className="flex flex-col min-h-dvh bg-background items-center justify-center px-8 text-center">
      <div
        className="w-16 h-16 rounded-card flex items-center justify-center mb-5"
        style={{ background: 'var(--grad-mode)' }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      </div>
      <h1 className="text-[20px] font-bold text-text-primary mb-2">{title}</h1>
      <p className="text-text-secondary text-[14px] leading-relaxed max-w-xs mb-6">
        Diese Klausurart gehört zu Pro — inklusive KI-Korrektur und Premium-KI-Material.
        Die Vollständige Klausur bleibt für alle 1× pro Tag frei.
      </p>
      <button
        onClick={() => setShowPro(true)}
        className="px-6 py-3 rounded-card btn-mode text-[14px] font-semibold press mb-3"
      >
        Pro freischalten
      </button>
      <button
        onClick={() => navigate('/klausurmodus/probeklausur')}
        className="text-text-primary text-[13px] font-medium press-sm"
      >
        Zurück
      </button>
      <ProModal feature="probeklausur" isOpen={showPro} onClose={() => setShowPro(false)} />
    </div>
  )
}
