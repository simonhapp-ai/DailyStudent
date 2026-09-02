import { useEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useUser } from '../../context/UserContext'
import { etappeFuer, XP_GETAN } from '../../lib/xp'

// ── XP-Toast ──────────────────────────────────────────────────────────────
//
// Kommt von oben herein, zeigt was es gab, und laesst den Balken der laufenden
// Etappe sichtbar vorwaerts wandern.
//
// Warum ueberhaupt Etappen und nicht der Rang: Der Rang „Konstant" ist 1050 XP
// breit. Eine analysierte Notiz gibt 5 XP — auf einem Rang-Balken waeren das
// weniger als ein Pixel. Der Balken wuerde also nicht wenig zeigen, sondern
// nichts. Innerhalb einer Etappe von 50 XP sind dieselben 5 XP ein Zehntel,
// und das sieht man.
//
// Der Balken laeuft erst los, NACHDEM der Toast steht. Liefe beides zugleich,
// waere die Bewegung genau in dem Moment vorbei, in dem man hinsieht.
//
// Breite statt scaleX: Beim Stauchen verzerren die runden Enden des Balkens.
// Die Regel „nur transform und opacity animieren" zielt auf Bewegungen, die
// staendig und unter Last laufen — dieser Toast erscheint hoechstens sechsmal
// am Tag und bewegt ein 8 px hohes Element.

const KURVE = [0.23, 1, 0.32, 1] as const

export function XpToast() {
  const reducedMotion = useReducedMotion()
  const { xpToast, hideCoinToast } = useUser()

  const etappeVorher  = xpToast ? etappeFuer(xpToast.vorher)  : null
  const etappeNachher = xpToast ? etappeFuer(xpToast.nachher) : null

  // Wurde beim Gutschreiben eine Etappengrenze ueberschritten? Dann darf der
  // Balken nicht einfach zurueckspringen — er laeuft erst voll, wird dann
  // geleert und laeuft weiter.
  const grenze = !!etappeVorher && !!etappeNachher && etappeVorher.von !== etappeNachher.von
  const neuerRang = !!etappeVorher && !!etappeNachher
    && etappeVorher.rang.stufe !== etappeNachher.rang.stufe

  const dauer = reducedMotion ? 0 : grenze ? 1.25 : 0.75
  const sichtbar = (grenze ? 3100 : 2600)

  useEffect(() => {
    if (!xpToast) return
    const t = setTimeout(hideCoinToast, sichtbar)
    return () => clearTimeout(t)
  }, [xpToast, hideCoinToast, sichtbar])

  return (
    <AnimatePresence>
      {xpToast && etappeVorher && etappeNachher && (
        <motion.div
          key="xp-toast"
          initial={reducedMotion ? { opacity: 0 } : { y: -24, opacity: 0 }}
          animate={reducedMotion ? { opacity: 1 } : { y: 0, opacity: 1 }}
          exit={reducedMotion
            ? { opacity: 0, transition: { duration: 0.12 } }
            : { y: -18, opacity: 0, transition: { duration: 0.18, ease: KURVE } }}
          transition={reducedMotion ? { duration: 0.14 } : { type: 'spring', duration: 0.42, bounce: 0.18 }}
          className="fixed z-[200] pointer-events-none select-none left-1/2 -translate-x-1/2
                     w-[min(380px,calc(100vw-32px))]
                     rounded-card bg-surface border border-border/60
                     shadow-[0_10px_40px_rgb(0_0_0_/_0.22)]
                     px-4 py-3"
          style={{ top: 'max(14px, calc(env(safe-area-inset-top, 0px) + 10px))' }}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[17px] font-bold tabular-nums text-text-primary leading-none">
              +{xpToast.betrag}
              <span className="text-[12px] font-semibold text-text-secondary ml-1">XP</span>
            </span>
            {xpToast.action && XP_GETAN[xpToast.action] && (
              <span className="text-[12px] text-text-secondary truncate">
                {XP_GETAN[xpToast.action]}
              </span>
            )}
          </div>

          <div className="h-2 rounded-pill mt-2.5 overflow-hidden bg-[rgb(120,120,128)]/[0.16] dark:bg-[rgb(120,120,128)]/[0.28]">
            <motion.div
              className="h-full rounded-pill"
              style={{ background: 'var(--grad-mode)' }}
              initial={{ width: `${etappeVorher.anteil * 100}%` }}
              animate={{
                width: grenze
                  // Voll laufen, kurz leeren, weiterlaufen.
                  ? [`${etappeVorher.anteil * 100}%`, '100%', '0%', `${etappeNachher.anteil * 100}%`]
                  : [`${etappeVorher.anteil * 100}%`, `${etappeNachher.anteil * 100}%`],
              }}
              transition={{
                duration: dauer,
                delay: reducedMotion ? 0 : 0.26,
                times: grenze ? [0, 0.46, 0.54, 1] : [0, 1],
                ease: grenze ? [KURVE, 'linear', KURVE] : KURVE,
              }}
            />
          </div>

          <p className="text-[12px] text-text-secondary mt-2 leading-none">
            {neuerRang
              ? `Neuer Rang · ${etappeNachher.rang.label}`
              : grenze
                ? `Etappe geschafft · ${etappeNachher.rang.label}`
                : etappeNachher.gesamt
                  ? `Etappe ${etappeNachher.nummer} von ${etappeNachher.gesamt} · ${etappeNachher.rang.label}`
                  : `Etappe ${etappeNachher.nummer} · ${etappeNachher.rang.label}`}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
