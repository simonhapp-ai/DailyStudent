import { useNavigate } from 'react-router-dom'

interface BetaPausedScreenProps {
  title: string
}

// Full-screen fallback for a Probeklausur mode paused during the beta launch
// (migration 017_beta_mode_config.sql). Placed as an early return inside each
// Mode2/3/4 screen (after all hooks) so it also catches direct URL access and
// the "Fortfahren" resume button on an in-progress exam saved before the pause
// — not just the menu screen's own click-gate.
export function BetaPausedScreen({ title }: BetaPausedScreenProps) {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col min-h-dvh bg-background items-center justify-center px-8 text-center">
      <div
        className="w-16 h-16 rounded-[20px] flex items-center justify-center mb-5"
        style={{ background: 'linear-gradient(145deg, #7C3AED, #5B21B6)' }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><path d="M12 7v5l3.5 2" />
        </svg>
      </div>
      <h1 className="text-[20px] font-bold text-text-primary mb-2">{title} pausiert</h1>
      <p className="text-text-secondary text-[14px] leading-relaxed max-w-xs mb-6">
        Dieser Modus ist während unserer Beta-Phase kurz pausiert, um KI-Kapazität zu sparen — er kommt zurück, versprochen. Deine bisherigen Ergebnisse bleiben natürlich gespeichert.
      </p>
      <button
        onClick={() => navigate('/klausurmodus/probeklausur/afb-trainer')}
        className="px-5 py-3 rounded-card grad-accent text-white text-[14px] font-semibold press mb-3"
      >
        AFB-Aufgabentrainer ausprobieren →
      </button>
      <button
        onClick={() => navigate('/klausurmodus/probeklausur')}
        className="text-text-muted text-[13px] font-medium press-sm"
      >
        Zurück
      </button>
    </div>
  )
}
