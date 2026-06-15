import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUser } from '../../context/UserContext'

export function CoinToast() {
  const { coinToastVisible, coinToastAmount, hideCoinToast } = useUser()

  useEffect(() => {
    if (!coinToastVisible) return
    const t = setTimeout(hideCoinToast, 1800)
    return () => clearTimeout(t)
  }, [coinToastVisible, hideCoinToast])

  return (
    <AnimatePresence>
      {coinToastVisible && (
        <motion.div
          key="coin-toast"
          initial={{ y: 20, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -16, opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          className="fixed z-[200] pointer-events-none select-none
                     left-1/2 -translate-x-1/2
                     bottom-[calc(env(safe-area-inset-bottom,0px)+80px)]
                     lg:bottom-8 lg:left-auto lg:right-8 lg:translate-x-0
                     flex items-center gap-2
                     px-5 py-3 rounded-2xl
                     text-white text-[15px] font-bold
                     shadow-[0_8px_32px_rgba(0,0,0,0.28)]"
          style={{
            background: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
          }}
        >
          <span className="text-[18px] leading-none">🪙</span>
          <span>+{coinToastAmount} Coins</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
