import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { CoinIcon, getCoinTier, COIN_TIERS } from '../components/ui/CoinIcon'
import { ProModal } from '../components/ui/ProModal'

const DAILY_TASKS = [
  { key: 'LOGIN',            label: 'Einloggen',              reward: 5,  icon: '🔑' },
  { key: 'SMART_NOTE',       label: 'Smart Note erstellen',   reward: 5,  icon: '📷' },
  { key: 'FLASHCARD_LEARNED',label: 'Karteikarten lernen',    reward: 10, icon: '🃏' },
  { key: 'BLURTING',         label: 'Blurting abschließen',   reward: 10, icon: '🧠' },
  { key: 'LERNZETTEL',       label: 'Lernzettel erstellen',   reward: 20, icon: '📄' },
  { key: 'LERNPLAN_DAY',     label: 'Lernplan-Tag erledigen', reward: 15, icon: '📅' },
  { key: 'PROBEKLAUSUR',     label: 'Probeklausur machen',    reward: 50, icon: '📋' },
] as const

export function ProfilCoinsScreen() {
  const navigate = useNavigate()
  const { appStats, buyStreakFreeze, redeemDiscount, showCoinToast } = useUser()

  const [freezeToast, setFreezeToast] = useState<'success' | 'error' | null>(null)
  const [redeemToast, setRedeemToast] = useState<'error' | null>(null)
  const [discountModal, setDiscountModal] = useState<{ couponId: string; percent: number } | null>(null)

  const coins = appStats.coins ?? 0
  const cooldowns = appStats.cooldowns ?? []
  const today = new Date().toISOString().slice(0, 10)

  const handleBuyFreeze = () => {
    void buyStreakFreeze().then((ok) => {
      if (ok) {
        showCoinToast(0)
        setFreezeToast('success')
        setTimeout(() => setFreezeToast(null), 2200)
      } else {
        setFreezeToast('error')
        setTimeout(() => setFreezeToast(null), 2200)
      }
    })
  }

  const handleRedeemDiscount = (tier: '15' | '30') => {
    void redeemDiscount(tier).then((couponId) => {
      if (couponId) {
        setDiscountModal({ couponId, percent: tier === '15' ? 15 : 30 })
      } else {
        setRedeemToast('error')
        setTimeout(() => setRedeemToast(null), 2500)
      }
    })
  }

  const FREEZE_COST = 500
  const canAfford = coins >= FREEZE_COST
  const freezeCount = appStats.streakFreezes ?? 0

  const RABATT_15 = 2500
  const RABATT_30 = 5000
  const used15 = cooldowns.includes('DISCOUNT_15:USED')
  const used30 = cooldowns.includes('DISCOUNT_30:USED')
  const has15 = coins >= RABATT_15
  const has30 = coins >= RABATT_30
  const progress15 = Math.min((coins / RABATT_15) * 100, 100)
  const progress30 = Math.min((coins / RABATT_30) * 100, 100)

  return (
    <div className="flex flex-col min-h-screen bg-background pb-10">
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
        <h1 className="text-[28px] font-bold text-text-primary">Coins</h1>
      </div>

      <div className="px-4 mt-5 space-y-4">

        {/* ── Coin balance ─────────────────────────────────────── */}
        <div
          className="rounded-card border overflow-hidden p-4"
          style={{ background: 'linear-gradient(140deg, rgba(245,158,11,0.08) 0%, rgba(239,68,68,0.04) 100%)', borderColor: 'rgba(245,158,11,0.22)' }}
        >
          <div className="flex items-center gap-3">
            <CoinIcon coins={coins} size={38} tilt={false} noAnimation/>
            <div className="flex-1 text-left min-w-0">
              <p className="text-text-primary font-bold text-[15px] leading-none">Deine Coins</p>
              <p className="text-text-muted text-[12px] mt-0.5">
                <span className="font-semibold tabular-nums" style={{ color: '#F59E0B' }}>{coins}</span>
                {' '}· {COIN_TIERS[getCoinTier(coins)].label}
              </p>
            </div>
          </div>

          <div className="h-px my-3" style={{ background: 'rgba(245,158,11,0.18)' }}/>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-2">Heute verdienen</p>
          <div className="space-y-1.5">
            {DAILY_TASKS.map(task => {
              const done = cooldowns.includes(`${task.key}:${today}`)
              return (
                <div key={task.key} className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                    style={done
                      ? { background: '#34D399' }
                      : { border: '1.5px solid rgba(var(--color-border), 0.7)' }}
                  >
                    {done && (
                      <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 6l3 3 5-5"/>
                      </svg>
                    )}
                  </div>
                  <span className={`text-[11px] flex-1 leading-none ${done ? 'line-through text-text-muted' : 'text-text-secondary'}`}>
                    {task.icon} {task.label}
                  </span>
                  {!done && (
                    <span className="text-[11px] font-bold tabular-nums" style={{ color: '#F59E0B' }}>
                      +{task.reward}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Coins Shop ───────────────────────────────────────── */}
        <div
          className="rounded-card border overflow-hidden p-4"
          style={{ background: 'linear-gradient(140deg, rgba(90,200,250,0.08) 0%, rgba(99,102,241,0.04) 100%)', borderColor: 'rgba(90,200,250,0.22)' }}
        >
          <p className="text-text-primary font-bold text-[15px] mb-3">Coins Shop</p>

          {/* ─ Streak Freeze ─ */}
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <p className="text-text-primary font-bold text-[14px]">Streak Freeze 🧊</p>
                {freezeCount > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-pill"
                    style={{ background: 'rgba(90,200,250,0.15)', color: '#5AC8FA' }}>
                    {freezeCount}× vorhanden
                  </span>
                )}
              </div>
              <p className="text-text-muted text-[11px] leading-snug">
                Erhält die Streak bei einem verpassten Tag
              </p>
              <span className="inline-flex items-center gap-1 font-bold text-[12px] mt-1" style={{ color: '#F59E0B' }}>
                500 <CoinIcon coins={coins} size={13} tilt={false} noAnimation/>
              </span>
            </div>
            <button
              onClick={handleBuyFreeze}
              disabled={!canAfford}
              className="shrink-0 px-4 py-2.5 rounded-[12px] text-[13px] font-bold press-sm transition-all disabled:opacity-40"
              style={canAfford
                ? { background: 'linear-gradient(135deg, #5AC8FA, #6366F1)', color: '#fff', boxShadow: '0 3px 10px rgba(90,200,250,0.28)' }
                : { background: 'rgba(var(--color-border), 0.5)', color: 'rgb(var(--color-text-muted))' }}
            >
              Kaufen
            </button>
          </div>

          {freezeToast === 'success' && (
            <div className="rounded-[10px] px-3 py-2 mt-3 border text-center"
              style={{ background: 'rgba(52,211,153,0.08)', borderColor: 'rgba(52,211,153,0.25)' }}>
              <p className="text-[12px] font-semibold" style={{ color: '#34D399' }}>🧊 Streak Freeze gekauft!</p>
            </div>
          )}
          {freezeToast === 'error' && (
            <div className="rounded-[10px] px-3 py-2 mt-3 border text-center"
              style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.25)' }}>
              <p className="text-[12px] font-semibold" style={{ color: '#EF4444' }}>
                Nicht genug Coins —{' '}
                <span className="inline-flex items-center gap-0.5">
                  500 <CoinIcon coins={0} size={11} tilt={false} noAnimation/>
                </span>{' '}
                nötig
              </p>
            </div>
          )}
          {!canAfford && !freezeToast && (
            <p className="text-text-muted text-[11px] text-center mt-3">
              Noch {Math.max(0, FREEZE_COST - coins)} Coins bis zum Kauf
            </p>
          )}

          <div className="h-px my-4" style={{ borderTop: '1px solid rgba(var(--color-border), 0.4)' }}/>

          {/* ─ 15% Rabatt progress ─ */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div>
                <p className="text-text-primary font-bold text-[13px]">15% Rabatt</p>
                <p className="text-text-muted text-[10px]">€6,80 statt €7,99/Mo</p>
              </div>
              {used15
                ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-pill shrink-0"
                    style={{ background: 'rgba(var(--color-border), 0.5)', color: 'rgb(var(--color-text-muted))' }}>✓ Eingelöst</span>
                : has15
                ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-pill shrink-0"
                    style={{ background: 'rgba(52,211,153,0.15)', color: '#34D399' }}>✓ Verfügbar</span>
                : <span className="text-text-muted text-[10px] shrink-0">Noch {Math.max(0, RABATT_15 - coins)}</span>
              }
            </div>
            <div className="h-2 rounded-pill overflow-hidden" style={{ background: 'rgba(var(--color-border), 0.5)' }}>
              <div className="h-full rounded-pill transition-all duration-500"
                style={{ width: `${progress15}%`, background: 'linear-gradient(90deg, #34D399, #059669)' }}/>
            </div>
            {has15 && !used15 && (
              <button
                onClick={() => handleRedeemDiscount('15')}
                className="w-full mt-2 py-2.5 rounded-[12px] text-white text-[13px] font-bold press-sm transition-opacity hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #34D399, #059669)' }}
              >
                15% Rabatt einlösen →
              </button>
            )}
          </div>

          {/* ─ 30% Rabatt progress ─ */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <div>
                <p className="text-text-primary font-bold text-[13px]">30% Rabatt</p>
                <p className="text-text-muted text-[10px]">€5,59 statt €7,99/Mo</p>
              </div>
              {used30
                ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-pill shrink-0"
                    style={{ background: 'rgba(var(--color-border), 0.5)', color: 'rgb(var(--color-text-muted))' }}>✓ Eingelöst</span>
                : has30
                ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-pill shrink-0"
                    style={{ background: 'rgba(52,211,153,0.15)', color: '#34D399' }}>✓ Verfügbar</span>
                : <span className="text-text-muted text-[10px] shrink-0">Noch {Math.max(0, RABATT_30 - coins)}</span>
              }
            </div>
            <div className="h-2 rounded-pill overflow-hidden" style={{ background: 'rgba(var(--color-border), 0.5)' }}>
              <div className="h-full rounded-pill transition-all duration-500"
                style={{ width: `${progress30}%`, background: 'linear-gradient(90deg, #34D399, #059669)' }}/>
            </div>
            {has30 && !used30 && (
              <button
                onClick={() => handleRedeemDiscount('30')}
                className="w-full mt-2 py-2.5 rounded-[12px] text-white text-[13px] font-bold press-sm transition-opacity hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #34D399, #059669)' }}
              >
                30% Rabatt einlösen →
              </button>
            )}
          </div>

          {redeemToast === 'error' && (
            <div className="rounded-[10px] px-3 py-2 mt-3 border text-center"
              style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.25)' }}>
              <p className="text-[12px] font-semibold" style={{ color: '#EF4444' }}>
                Einlösen fehlgeschlagen. Bitte erneut versuchen.
              </p>
            </div>
          )}
        </div>
      </div>

      <ProModal
        feature="rabatt"
        isOpen={!!discountModal}
        onClose={() => setDiscountModal(null)}
        couponId={discountModal?.couponId}
        discountPercent={discountModal?.percent}
      />
    </div>
  )
}
