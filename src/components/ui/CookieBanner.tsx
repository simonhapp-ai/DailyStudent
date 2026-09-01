import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { saveConsent } from '../../lib/consent'

interface CookieBannerProps {
  onConsent: (analytics: boolean) => void
}

export function CookieBanner({ onConsent }: CookieBannerProps) {
  const reducedMotion = useReducedMotion()
  const [visible, setVisible] = useState(true)
  const location = useLocation()

  if (!visible) return null

  const handle = (analytics: boolean) => {
    saveConsent(analytics)
    setVisible(false)
    onConsent(analytics)
    // On the landing page, scrolling back to the top replays the scroll-in
    // animations (FadeUp reverses off-screen sections) — a soft "refresh"
    // without an actual reload.
    if (location.pathname === '/landing') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <motion.div
      className="fixed z-[9999] w-[calc(100%-32px)] max-w-[340px]"
      style={{ right: 16, bottom: 'max(16px, calc(env(safe-area-inset-bottom, 0px) + 12px))' }}
      role="dialog"
      aria-label="Cookie-Einstellungen"
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.94 }}
      animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
      transition={reducedMotion ? { duration: 0.16 } : { type: 'spring', duration: 0.5, bounce: 0.22 }}
    >
      <div className="rounded-[28px] border border-border/60 bg-background/95 backdrop-blur-lg shadow-float p-4">
        <p className="text-[12px] leading-relaxed text-muted-foreground mb-3">
          Wir nutzen{' '}
          <span className="font-medium text-foreground">Vercel Analytics</span>
          {' '}für anonyme Seitenstatistiken — keine Cookies, keine persönlichen Daten.{' '}
          <Link
            to="/profil/datenschutz"
            className="underline underline-offset-2 transition-opacity hover:opacity-70"
          >
            Datenschutzerklärung
          </Link>
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => handle(true)}
            className="press rounded-full bg-violet-600 px-4 py-2 text-[12px] font-medium text-white transition-opacity hover:opacity-90"
          >
            Alle akzeptieren
          </button>
          <button
            onClick={() => handle(false)}
            className="press rounded-full border border-border/60 bg-transparent px-4 py-2 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted/60"
          >
            Nur notwendige
          </button>
        </div>
      </div>
    </motion.div>
  )
}
