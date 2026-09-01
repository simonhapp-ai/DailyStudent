import { useEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useUser } from '../../context/UserContext'

export function CoinToast() {
  const reducedMotion = useReducedMotion()
  const { coinToastVisible, coinToastAmount, hideCoinToast } = useUser()

  useEffect(() => {
    if (!coinToastVisible) return
    const t = setTimeout(hideCoinToast, 1900)
    return () => clearTimeout(t)
  }, [coinToastVisible, hideCoinToast])

  return (
    <AnimatePresence>
      {coinToastVisible && (
        <motion.div
          key="coin-toast"
          // ease-out enter (Emil: enters should use ease-out — starts fast, feels responsive)
          initial={reducedMotion ? { opacity: 0 } : { y: 18, opacity: 0, scale: 0.88 }}
          animate={reducedMotion ? { opacity: 1 } : { y: 0,  opacity: 1, scale: 1 }}
          // Faster exit (Emil: release/exit should always be snappy)
          exit={reducedMotion ? { opacity: 0, transition: { duration: 0.12 } } : { y: -14, opacity: 0, scale: 0.88, transition: { duration: 0.16, ease: [0.23, 1, 0.32, 1] } }}
          transition={reducedMotion ? { duration: 0.14 } : { type: 'spring', stiffness: 380, damping: 26 }}
          className="fixed z-[200] pointer-events-none select-none
                     left-1/2 -translate-x-1/2
                     bottom-[calc(env(safe-area-inset-bottom,0px)+84px)]
                     lg:bottom-8 lg:left-auto lg:right-8 lg:translate-x-0
                     flex items-baseline gap-2
                     px-5 py-3 rounded-pill
                     text-white
                     shadow-[0_8px_36px_rgba(0,0,0,0.30)]"
          style={{ background: 'var(--grad-mode)' }}
        >
          {/* Eine Zahl, kein Bild. Das gezeichnete Muenzenbild war das
              Auffaelligste an einer Belohnung, die selbst unauffaellig sein
              sollte — sie unterbricht ja gerade das Lernen. */}
          <span className="text-[17px] font-black leading-none tabular-nums">+{coinToastAmount}</span>
          <span className="text-[13px] font-semibold opacity-80 leading-none">XP</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
