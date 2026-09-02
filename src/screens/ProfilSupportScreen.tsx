import { useNavigate } from 'react-router-dom'
import { BugReportWidget } from '../components/ui/BugReportWidget'

export function ProfilSupportScreen() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col min-h-dvh bg-background pb-10">
      <div className="px-4" style={{ paddingTop: 'max(58px, calc(env(safe-area-inset-top, 0px) + 18px))' }}>
        <button
          onClick={() => navigate('/profil')}
          className="flex items-center gap-1 text-text-primary text-[14px] font-medium mb-3 press-sm -ml-0.5"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Zurück
        </button>
        <h1 className="text-[28px] font-bold text-text-primary">Hilfe & Feedback</h1>
      </div>

      <div className="px-4 lg:px-6 mt-5 space-y-3 lg:max-w-[760px]">
        <div className="bg-surface rounded-card shadow-card-adaptive border border-border/60 overflow-hidden">
          <button
            onClick={() => navigate('/landing')}
            className="w-full flex items-center justify-between px-4 py-3.5 text-left press-sm"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-btn flex items-center justify-center shrink-0"
                style={{ background: 'var(--grad-mode)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
                </svg>
              </div>
              <span className="text-text-primary text-[15px]">App Übersicht</span>
            </div>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted">
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <div className="bg-surface rounded-card shadow-card-adaptive border border-border/60 overflow-hidden">
          <button
            onClick={() => navigate('/demo')}
            className="w-full flex items-center justify-between px-4 py-3.5 text-left press-sm"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-btn flex items-center justify-center shrink-0"
                style={{ background: 'var(--grad-mode)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
              <span className="text-text-primary text-[15px]">Demo Ansicht</span>
            </div>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted">
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <BugReportWidget />
      </div>
    </div>
  )
}
