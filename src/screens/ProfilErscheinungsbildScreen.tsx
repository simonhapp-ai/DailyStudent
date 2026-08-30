import { useNavigate } from 'react-router-dom'
import { useUser, type AppTheme } from '../context/UserContext'

const THEME_OPTIONS: { value: AppTheme; label: string; desc: string; icon: string }[] = [
  { value: 'light', label: 'Hell', desc: 'Immer helles Design verwenden', icon: '☀️' },
  { value: 'dark', label: 'Dunkel', desc: 'Immer dunkles Design verwenden', icon: '🌙' },
  { value: 'system', label: 'System', desc: 'Passt sich den Geräte-Einstellungen an', icon: '⚙️' },
]

export function ProfilErscheinungsbildScreen() {
  const navigate = useNavigate()
  const { theme, setTheme } = useUser()

  return (
    <div className="flex flex-col min-h-dvh bg-background pb-10">
      <div className="px-4" style={{ paddingTop: 'max(58px, calc(env(safe-area-inset-top, 0px) + 18px))' }}>
        <button
          onClick={() => navigate('/profil')}
          className="flex items-center gap-1 text-accent text-[14px] font-medium mb-3 press-sm -ml-0.5"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Zurück
        </button>
        <h1 className="text-[28px] font-bold text-text-primary">Erscheinungsbild</h1>
      </div>

      <div className="px-4 mt-5">
        <div className="bg-surface rounded-card shadow-card-adaptive border border-border/60 overflow-hidden">
          {THEME_OPTIONS.map((opt, i) => (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-surface-hover transition-colors press-sm ${
                i < THEME_OPTIONS.length - 1 ? 'border-b border-border/50' : ''
              }`}
            >
              <span className="text-[20px] shrink-0">{opt.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-text-primary text-[15px] font-medium">{opt.label}</p>
                <p className="text-text-muted text-[12px] mt-0.5">{opt.desc}</p>
              </div>
              {theme === opt.value && (
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 grad-accent">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
