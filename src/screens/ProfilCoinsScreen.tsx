import { useState, useEffect } from 'react'
import { Icon, type IconName } from '../components/ui/Icon'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { useUser } from '../context/UserContext'
import { CoinIcon, getCoinTier, COIN_TIERS } from '../components/ui/CoinIcon'
import { ProModal } from '../components/ui/ProModal'

// Matches DemoScreen's easing constant — a strong ease-out curve for entrances.
const EASE = [0.23, 1, 0.32, 1] as const

function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : false
  )
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const onChange = () => setIsDesktop(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return isDesktop
}

// Coins→Pro-Rabatt-Einlösung pausiert (28.08.2026, vor Pro-Launch): auf
// nativem iOS bricht das Feature, weil ProModal Stripe-Coupons nur im Web-
// Checkout anwenden kann — RevenueCat/Apple-IAP-Käufe (purchasePlan())
// kennen kein couponId-Konzept. Ein Coins-Ausgabe-Erlebnis, das den Rabatt
// dann auf iOS einfach verschluckt, ist schlimmer als das Feature zu
// pausieren. Der korrekte iOS-Weg (Apple Promotional Offers, signierte
// StoreKit-Angebote pro Produkt in App Store Connect) ist deutlich mehr
// Aufwand als hier kurzfristig sinnvoll. Streak-Freeze-Kauf + Coins-Sammeln
// bleiben komplett unberührt — nur die Rabatt-Einlösung ist ausgeblendet,
// nichts gelöscht (gleiches "skip, nicht entfernen"-Prinzip wie die
// app_config-Beta-Flags, hier aber als reiner Code-Toggle, da es keine
// Beta-Zeitfrage ist, sondern eine echte Produktentscheidung).
const COINS_DISCOUNT_ENABLED = false

const DAILY_TASKS = [
  { key: 'LOGIN',            label: 'Einloggen',              reward: 5,  icon: 'key' as IconName },
  { key: 'SMART_NOTE',       label: 'Smart Note erstellen',   reward: 5,  icon: 'camera' as IconName },
  { key: 'FLASHCARD_LEARNED',label: 'Karteikarten lernen',    reward: 10, icon: 'cards' as IconName },
  { key: 'BLURTING',         label: 'Blurting abschließen',   reward: 10, icon: 'bulb' as IconName },
  { key: 'LERNZETTEL',       label: 'Lernzettel erstellen',   reward: 20, icon: 'document' as IconName },
  { key: 'LERNPLAN_DAY',     label: 'Lernplan-Tag erledigen', reward: 15, icon: 'calendar' as IconName },
  { key: 'PROBEKLAUSUR',     label: 'Probeklausur machen',    reward: 50, icon: 'clipboard' as IconName },
] as const

export function ProfilCoinsScreen() {
  const navigate = useNavigate()
  const { appStats, buyStreakFreeze, redeemDiscount, showCoinToast, appConfig } = useUser()
  const isDesktop = useIsDesktop()
  const shouldReduceMotion = useReducedMotion()

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
    // Beta launch (migration 017_beta_mode_config.sql): redeemDiscount() spends
    // coins immediately server-side, but with purchases paused there's no
    // checkout to apply the coupon to — refuse up front so nobody burns coins
    // for a discount they can't actually use right now.
    if (!appConfig.proPurchasesEnabled) return
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

  // Desktop: panels converge from the sides. Mobile (stacked): both rise from below.
  // Never scale from 0 — start at a barely-visible 0.95 so the entrance feels like
  // something arriving, not appearing from nothing.
  const panelMotion = (side: 'left' | 'right', delay: number) => shouldReduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.25, delay } }
    : {
        initial: {
          opacity: 0,
          scale: 0.95,
          x: isDesktop ? (side === 'left' ? -28 : 28) : 0,
          y: isDesktop ? 0 : 20,
        },
        animate: { opacity: 1, scale: 1, x: 0, y: 0 },
        transition: { duration: 0.42, ease: EASE, delay },
      }

  return (
    <div className="flex flex-col min-h-dvh bg-white dark:bg-black pb-10">
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
        <h1 className="text-[28px] font-bold text-text-primary tracking-tight">Coins</h1>
      </div>

      <div className="px-4 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">

          {/* ── PURPLE — Checklist ─────────────────────────────────── */}
          <motion.div
            {...panelMotion('left', 0)}
            className="rounded-[28px] p-7"
            style={{
              background: 'linear-gradient(155deg, rgba(124,58,237,0.09) 0%, rgba(124,58,237,0.02) 100%)',
              border: '1px solid rgba(124,58,237,0.18)',
            }}
          >
            <div className="flex items-center gap-3.5 mb-6">
              <CoinIcon coins={coins} size={44} tilt={false} noAnimation/>
              <div className="flex-1 min-w-0">
                <p className="text-[19px] font-bold text-text-primary leading-tight tracking-tight">Deine Coins</p>
                <p className="text-[13px] text-text-muted mt-0.5">
                  <span className="font-semibold tabular-nums" style={{ color: '#7C3AED' }}>{coins}</span>
                  {' '}· {COIN_TIERS[getCoinTier(coins)].label}
                </p>
              </div>
            </div>

            <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-3.5">Heute verdienen</p>
            <div className="space-y-3">
              {DAILY_TASKS.map(task => {
                const done = cooldowns.includes(`${task.key}:${today}`)
                return (
                  <div key={task.key} className="flex items-center gap-3">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors"
                      style={done
                        ? { background: '#7C3AED' }
                        : { border: '1.5px solid rgba(124,58,237,0.3)' }}
                    >
                      {done && (
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 6l3 3 5-5"/>
                        </svg>
                      )}
                    </div>
                    <span className={`text-[13px] flex-1 leading-snug ${done ? 'line-through text-text-muted' : 'text-text-secondary'}`}>
                      <span className="inline-flex items-center gap-2"><Icon name={task.icon} size={15} />{task.label}</span>
                    </span>
                    {!done && (
                      <span className="text-[12px] font-bold tabular-nums shrink-0" style={{ color: '#7C3AED' }}>
                        +{task.reward}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </motion.div>

          {/* ── MINT — Shop ────────────────────────────────────────── */}
          <motion.div
            {...panelMotion('right', shouldReduceMotion ? 0.06 : 0.09)}
            className="rounded-[28px] p-7"
            style={{
              background: 'linear-gradient(155deg, rgba(52,211,153,0.09) 0%, rgba(52,211,153,0.02) 100%)',
              border: '1px solid rgba(52,211,153,0.18)',
            }}
          >
            <p className="text-[19px] font-bold text-text-primary mb-6 tracking-tight">Coins Shop</p>

            {/* Streak Freeze */}
            <div className="flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="text-text-primary font-bold text-[15px]">Streak Freeze</p>
                  {freezeCount > 0 && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-pill"
                      style={{ background: 'rgba(52,211,153,0.15)', color: '#059669' }}>
                      {freezeCount}× vorhanden
                    </span>
                  )}
                </div>
                <p className="text-text-muted text-[12px] leading-relaxed mb-1.5">
                  Erhält die Streak bei einem verpassten Tag
                </p>
                <span className="inline-flex items-center gap-1 font-bold text-[13px]" style={{ color: '#059669' }}>
                  500 <CoinIcon coins={coins} size={14} tilt={false} noAnimation/>
                </span>
              </div>
              <button
                onClick={handleBuyFreeze}
                disabled={!canAfford}
                className="shrink-0 px-5 py-3 rounded-[14px] text-[13px] font-bold press-sm transition-all disabled:opacity-40"
                style={canAfford
                  ? { background: '#34D399', color: '#fff', boxShadow: '0 3px 10px rgba(5,150,105,0.28)' }
                  : { background: 'rgba(var(--color-border), 0.5)', color: 'rgb(var(--color-text-muted))' }}
              >
                Kaufen
              </button>
            </div>

            {freezeToast === 'success' && (
              <div className="rounded-[12px] px-3.5 py-2.5 mt-4 border text-center"
                style={{ background: 'rgba(52,211,153,0.1)', borderColor: 'rgba(52,211,153,0.3)' }}>
                <p className="text-[12px] font-semibold text-text-primary">Streak Freeze gekauft</p>
              </div>
            )}
            {freezeToast === 'error' && (
              <div className="rounded-[12px] px-3.5 py-2.5 mt-4 border text-center"
                style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.25)' }}>
                <p className="text-[12px] font-semibold" style={{ color: '#EF4444' }}>
                  Nicht genug Coins — 500 nötig
                </p>
              </div>
            )}
            {!canAfford && !freezeToast && (
              <p className="text-text-muted text-[12px] mt-3">
                Noch {Math.max(0, FREEZE_COST - coins)} Coins bis zum Kauf
              </p>
            )}

            {COINS_DISCOUNT_ENABLED && (
              <>
            <div className="h-px my-6" style={{ background: 'rgba(52,211,153,0.18)' }}/>

            {/* 15% Rabatt */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-text-primary font-bold text-[14px]">15% Rabatt</p>
                  <p className="text-text-muted text-[11px] mt-0.5">
                    {appConfig.proPurchasesEnabled ? '€6,80 statt €7,99/Mo' : 'Wartet auf dich — Pro startet nach der Beta'}
                  </p>
                </div>
                {used15
                  ? <span className="text-[11px] font-bold px-2.5 py-1 rounded-pill shrink-0"
                      style={{ background: 'rgba(var(--color-border), 0.5)', color: 'rgb(var(--color-text-muted))' }}>Eingelöst</span>
                  : has15
                  ? <span className="text-[11px] font-bold px-2.5 py-1 rounded-pill shrink-0"
                      style={{ background: '#34D399', color: '#062017' }}>Verfügbar</span>
                  : <span className="text-text-muted text-[11px] shrink-0">Noch {Math.max(0, RABATT_15 - coins)}</span>
                }
              </div>
              <div className="h-2 rounded-pill overflow-hidden" style={{ background: 'rgba(52,211,153,0.12)' }}>
                <div className="h-full rounded-pill transition-all duration-500"
                  style={{ width: `${progress15}%`, background: '#34D399' }}/>
              </div>
              {has15 && !used15 && (
                appConfig.proPurchasesEnabled ? (
                  <button
                    onClick={() => handleRedeemDiscount('15')}
                    className="w-full mt-3 py-3 rounded-[14px] text-white text-[13px] font-bold press-sm transition-opacity hover:opacity-90"
                    style={{ background: '#34D399' }}
                  >
                    15% Rabatt einlösen →
                  </button>
                ) : (
                  <p className="w-full mt-3 py-3 rounded-[14px] text-center text-[12px] font-semibold text-text-muted bg-background">
                    Deine Coins sind sicher — einlösbar sobald Pro startet
                  </p>
                )
              )}
            </div>

            {/* 30% Rabatt */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-text-primary font-bold text-[14px]">30% Rabatt</p>
                  <p className="text-text-muted text-[11px] mt-0.5">
                    {appConfig.proPurchasesEnabled ? '€5,59 statt €7,99/Mo' : 'Wartet auf dich — Pro startet nach der Beta'}
                  </p>
                </div>
                {used30
                  ? <span className="text-[11px] font-bold px-2.5 py-1 rounded-pill shrink-0"
                      style={{ background: 'rgba(var(--color-border), 0.5)', color: 'rgb(var(--color-text-muted))' }}>Eingelöst</span>
                  : has30
                  ? <span className="text-[11px] font-bold px-2.5 py-1 rounded-pill shrink-0"
                      style={{ background: '#34D399', color: '#062017' }}>Verfügbar</span>
                  : <span className="text-text-muted text-[11px] shrink-0">Noch {Math.max(0, RABATT_30 - coins)}</span>
                }
              </div>
              <div className="h-2 rounded-pill overflow-hidden" style={{ background: 'rgba(52,211,153,0.12)' }}>
                <div className="h-full rounded-pill transition-all duration-500"
                  style={{ width: `${progress30}%`, background: '#34D399' }}/>
              </div>
              {has30 && !used30 && (
                appConfig.proPurchasesEnabled ? (
                  <button
                    onClick={() => handleRedeemDiscount('30')}
                    className="w-full mt-3 py-3 rounded-[14px] text-white text-[13px] font-bold press-sm transition-opacity hover:opacity-90"
                    style={{ background: '#34D399' }}
                  >
                    30% Rabatt einlösen →
                  </button>
                ) : (
                  <p className="w-full mt-3 py-3 rounded-[14px] text-center text-[12px] font-semibold text-text-muted bg-background">
                    Deine Coins sind sicher — einlösbar sobald Pro startet
                  </p>
                )
              )}
            </div>

            {redeemToast === 'error' && (
              <div className="rounded-[12px] px-3.5 py-2.5 mt-4 border text-center"
                style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.25)' }}>
                <p className="text-[12px] font-semibold" style={{ color: '#EF4444' }}>
                  Einlösen fehlgeschlagen. Bitte erneut versuchen.
                </p>
              </div>
            )}
              </>
            )}
          </motion.div>
        </div>
      </div>

      {COINS_DISCOUNT_ENABLED && (
        <ProModal
          feature="rabatt"
          isOpen={!!discountModal}
          onClose={() => setDiscountModal(null)}
          couponId={discountModal?.couponId}
          discountPercent={discountModal?.percent}
        />
      )}
    </div>
  )
}
