import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUser } from '../../context/UserContext'
import { CoinIcon } from './CoinIcon'

export function CoinToast() {
  const { coinToastVisible, coinToastAmount, hideCoinToast, appStats } = useUser()

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
          initial={{ y: 18, opacity: 0, scale: 0.88 }}
          animate={{ y: 0,  opacity: 1, scale: 1 }}
          // Faster exit (Emil: release/exit should always be snappy)
          exit={{ y: -14, opacity: 0, scale: 0.88, transition: { duration: 0.16, ease: [0.23, 1, 0.32, 1] } }}
          transition={{ type: 'spring', stiffness: 380, damping: 26 }}
          className="fixed z-[200] pointer-events-none select-none
                     left-1/2 -translate-x-1/2
                     bottom-[calc(env(safe-area-inset-bottom,0px)+84px)]
                     lg:bottom-8 lg:left-auto lg:right-8 lg:translate-x-0
                     flex items-center gap-3
                     pl-2 pr-5 py-2.5 rounded-2xl
                     text-white
                     shadow-[0_8px_36px_rgba(0,0,0,0.30)]"
          style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)' }}
        >
          {/* Tier icon reflects total wealth — grows alongside the user's stash */}
          <CoinIcon coins={appStats.coins} size={34} noAnimation tilt={false}/>
          <div>
            <p className="text-[11px] font-semibold opacity-80 leading-none mb-0.5">Coins verdient</p>
            <p className="text-[17px] font-black leading-none">+{coinToastAmount}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
