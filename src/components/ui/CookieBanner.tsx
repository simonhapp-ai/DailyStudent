import { useState } from 'react'
import { Link } from 'react-router-dom'
import { saveConsent } from '../../lib/consent'

interface CookieBannerProps {
  onConsent: (analytics: boolean) => void
}

export function CookieBanner({ onConsent }: CookieBannerProps) {
  const [visible, setVisible] = useState(true)

  if (!visible) return null

  const handle = (analytics: boolean) => {
    saveConsent(analytics)
    setVisible(false)
    onConsent(analytics)
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] border-t border-border/60 bg-background/95 backdrop-blur-lg"
      role="dialog"
      aria-label="Cookie-Einstellungen"
    >
      <div className="mx-auto max-w-screen-xl px-4 py-3">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12px] leading-relaxed text-muted-foreground">
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
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => handle(false)}
              className="press rounded-lg border border-border/60 bg-transparent px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted/60"
            >
              Nur notwendige
            </button>
            <button
              onClick={() => handle(true)}
              className="press rounded-lg bg-violet-600 px-3 py-1.5 text-[12px] font-medium text-white transition-opacity hover:opacity-90"
            >
              Alle akzeptieren
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
