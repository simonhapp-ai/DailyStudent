import { useState } from 'react'
import { Icon } from '../components/ui/Icon'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { rangFuer } from '../lib/xp'

// Emails die die Dev-Tools sehen dürfen
const PRO_TOGGLE_ALLOWLIST = [
  'simon.happ@gmx.de',
  // 'weitere@email.de',
]

export function ProfilDevToolsScreen() {
  const navigate = useNavigate()
  const { authUser, isPro, setIsPro, appStats, debugSetCoins, showCoinToast } = useUser()
  const [proToast, setProToast] = useState(false)

  const handleProToggle = () => {
    const next = !isPro
    setIsPro(next)
    setProToast(true)
    setTimeout(() => setProToast(false), 2000)
  }

  if (!PRO_TOGGLE_ALLOWLIST.includes(authUser?.email ?? '')) return null

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
        <h1 className="text-[28px] font-bold text-text-primary">Dev-Tools</h1>
      </div>

      <div className="px-4 lg:px-6 mt-5 lg:max-w-[760px]">
        <div className="bg-surface rounded-card shadow-card-adaptive border border-border/60 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-btn flex items-center justify-center shrink-0 text-[16px]">
                <Icon name={isPro ? 'star' : 'lock'} size={18} />
              </div>
              <div>
                <p className="text-text-primary text-[15px] font-medium">Pro-Status</p>
                <p className="text-text-muted text-[12px] mt-0.5">{isPro ? 'Aktiv — alle Features entsperrt' : 'Inaktiv — Paywall sichtbar'}</p>
              </div>
            </div>
            <button
              onClick={handleProToggle}
              className={`relative w-12 h-6 rounded-full transition-all duration-200 press-sm shrink-0 ${isPro ? 'bg-accent' : 'bg-border'}`}
            >
              <span
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200"
                style={{ left: isPro ? '26px' : '2px' }}
              />
            </button>
          </div>

          {/* ── XP-Regler ─────────────────────────────── */}
          <div className="border-t border-border/40 px-4 py-3.5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1">
                <p className="text-text-primary text-[15px] font-medium">XP</p>
                <p className="text-text-muted text-[12px] mt-0.5">
                  {appStats.coins ?? 0} XP · Stufe {rangFuer(appStats.coins ?? 0).stufe}: {rangFuer(appStats.coins ?? 0).label}
                </p>
              </div>
              <span className="text-[22px] font-black tabular-nums text-text-primary">
                {appStats.coins ?? 0}
              </span>
            </div>
            <input
              type="range"
              min={0} max={6000} step={50}
              value={appStats.coins ?? 0}
              onChange={e => debugSetCoins(Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none outline-none cursor-pointer"
              style={{ accentColor: '#F59E0B' }}
            />
            <div className="flex justify-between mt-1.5">
              {[0, 100, 500, 1000, 2500, 5000].map(v => (
                <button
                  key={v}
                  onClick={() => debugSetCoins(v)}
                  className="text-[11px] text-text-muted hover:text-amber-500 transition-colors press-sm"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Der XP-Toast erscheint sonst nur beim echten Verdienen, also
              hoechstens sechsmal am Tag — zum Ansehen einer Aenderung daran
              waere das unbrauchbar. Die zweite Schaltflaeche trifft absichtlich
              eine Etappengrenze, weil der Balken dort einen anderen Weg nimmt. */}
          <div className="bg-surface rounded-card border border-border/60 p-4">
            <p className="text-[15px] font-semibold text-text-primary">XP-Toast ansehen</p>
            <p className="text-[12px] text-text-secondary mt-0.5 mb-3">
              Schreibt keine XP gut — zeigt nur die Meldung.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => showCoinToast(10, 'BLURTING')}
                className="flex-1 h-11 rounded-pill text-[14px] font-semibold text-text-primary bg-[rgb(120,120,128)]/[0.12] dark:bg-[rgb(120,120,128)]/[0.24] press-sm"
              >
                +10 XP
              </button>
              <button
                onClick={() => showCoinToast(50, 'PROBEKLAUSUR')}
                className="flex-1 h-11 rounded-pill text-[14px] font-semibold text-text-primary bg-[rgb(120,120,128)]/[0.12] dark:bg-[rgb(120,120,128)]/[0.24] press-sm"
              >
                +50 XP
              </button>
            </div>
          </div>

          {/* ── Onboarding reset (dev-only — wipes local data cache) ── */}
          <button
            onClick={() => {
              localStorage.removeItem('lernapp_v1')
              window.location.href = '/'
            }}
            className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-surface-hover transition-colors press-sm border-t border-border/40"
          >
            <span className="text-text-primary text-[15px]">Onboarding zurücksetzen</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-primary">
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      {proToast && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-pill bg-surface border border-border shadow-float animate-fade-in">
          <p className="text-text-primary text-[13px] font-semibold whitespace-nowrap">
            {isPro ? 'Pro aktiviert' : 'Pro deaktiviert'}
          </p>
        </div>
      )}
    </div>
  )
}
