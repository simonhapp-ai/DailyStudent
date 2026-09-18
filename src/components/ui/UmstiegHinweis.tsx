import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'

// ── Der Hinweis für alle, die noch in der alten Hülle sitzen ────────────────
//
// Seit dem 16.09.2026 liegt im App Store eine **eigenständige** DailyStudent-App
// (Version 2.1, nativ in Swift). Sie lädt diese Website nicht mehr. Wer diesen
// Code also in einer nativen WebView ausführt, benutzt zwangsläufig die alte
// Fassung — es braucht keinen Versionsvergleich, die Ausführungsumgebung ist
// schon die Antwort.
//
// Warum das dringend ist: Die alte Hülle zeigt eine entfernte Herkunft
// (dailystudent.de). WebKit räumt deren Speicher nach rund sieben Tagen ohne
// Nutzung ab — mit ihm Fotos in Notizen und den lokalen Stand. Die neue App
// legt alles im eigenen App-Container ab, den räumt iOS nicht ab.
//
// Und warum der Hinweis hier steht und nicht in der App: Die alte Hülle lässt
// sich nicht mehr aktualisieren. Jede neue Fassung im App Store müsste eine
// höhere Nummer tragen als 2.1 und würde damit die native App verdrängen. Diese
// Website ist der einzige Weg, der diese Nutzer noch erreicht — ein Deploy, und
// er steht bei allen.

const APP_STORE_URL = 'https://apps.apple.com/de/app/dailystudent/id6795091937'

/** Die native App verlangt iOS 26.5. Darunter hilft der App Store nicht. */
const MINDEST_IOS: [number, number] = [26, 5]

/** Sieben Tage Ruhe nach „Später". Fällt der Speicher weg, kommt er wieder — */
/** und genau dann ist er auch wieder berechtigt. */
const RUHE_SCHLUESSEL = 'ds_umstieg_spaeter_v1'
const RUHE_DAUER = 7 * 24 * 60 * 60 * 1000

/**
 * Liest die iOS-Fassung aus der Kennung des Browsers („… CPU iPhone OS 18_5 …“).
 * Gibt `null` zurück, wenn dort nichts Lesbares steht — dann wird der
 * vorsichtigere Weg gewählt und **kein** Store-Knopf gezeigt.
 */
function iosFassung(): [number, number] | null {
  const treffer = /OS (\d+)[._](\d+)/.exec(navigator.userAgent)
  if (!treffer) return null
  return [parseInt(treffer[1], 10), parseInt(treffer[2], 10)]
}

function reichtAus(fassung: [number, number] | null): boolean {
  if (!fassung) return false
  if (fassung[0] !== MINDEST_IOS[0]) return fassung[0] > MINDEST_IOS[0]
  return fassung[1] >= MINDEST_IOS[1]
}

function ruhtNoch(): boolean {
  try {
    const bis = localStorage.getItem(RUHE_SCHLUESSEL)
    return bis !== null && Date.now() < parseInt(bis, 10)
  } catch {
    return false
  }
}

export function UmstiegHinweis() {
  const [sichtbar, setSichtbar] = useState(false)
  const [kannLaden, setKannLaden] = useState(false)

  useEffect(() => {
    // Zum Ansehen im Browser, ohne die alte Hülle installieren zu müssen:
    //   …/?umstieg=test   → Fassung wie mit neuem iOS
    //   …/?umstieg=altios → Fassung ohne Store-Knopf
    const probe = new URLSearchParams(window.location.search).get('umstieg')
    if (probe === 'test' || probe === 'altios') {
      setKannLaden(probe === 'test')
      setSichtbar(true)
      return
    }

    if (!Capacitor.isNativePlatform()) return
    if (ruhtNoch()) return
    setKannLaden(reichtAus(iosFassung()))
    setSichtbar(true)
  }, [])

  if (!sichtbar) return null

  const spaeter = () => {
    try {
      localStorage.setItem(RUHE_SCHLUESSEL, String(Date.now() + RUHE_DAUER))
    } catch {
      /* Kein Speicher — dann eben nur für diese Sitzung. */
    }
    setSichtbar(false)
  }

  return (
    <div
      className="fixed left-0 right-0 top-0 z-50 px-4 pb-3"
      style={{ paddingTop: 'max(12px, calc(env(safe-area-inset-top, 0px) + 8px))' }}
    >
      <div className="mx-auto max-w-lg rounded-card bg-surface border-l-4 border-l-accent px-3.5 py-3 shadow-lg">
        <p className="text-[13px] font-semibold leading-snug text-text-primary">
          {kannLaden
            ? 'Es gibt eine neue DailyStudent-App'
            : 'Die neue DailyStudent-App braucht iOS 26.5'}
        </p>
        <p className="mt-1 text-[12px] leading-snug text-text-muted">
          {kannLaden
            ? 'Sie speichert deine Notizen und Fotos direkt auf dem Gerät. In dieser '
              + 'Fassung hier löscht iOS sie nach etwa einer Woche ohne Nutzung.'
            : 'Aktualisiere zuerst dein iPhone oder iPad: Einstellungen › Allgemein › '
              + 'Softwareupdate. Danach findest du die neue App im App Store. In dieser '
              + 'Fassung hier löscht iOS Notizen und Fotos nach etwa einer Woche ohne Nutzung.'}
        </p>

        <div className="mt-2.5 flex items-center gap-2">
          {/* Kein Store-Knopf unter iOS 26.5: Dort stünde „Öffnen“ statt
              „Aktualisieren“, und der Nutzer hielte sich für aktuell. */}
          {kannLaden && (
            <a
              href={APP_STORE_URL}
              target="_blank"
              rel="noreferrer"
              className="press-sm rounded-btn btn-mode px-3 py-1.5 text-[12px] font-semibold hover:opacity-90"
            >
              Im App Store öffnen
            </a>
          )}
          <button
            onClick={spaeter}
            className="press-sm rounded-btn px-3 py-1.5 text-[12px] font-semibold text-text-muted"
          >
            Später
          </button>
        </div>
      </div>
    </div>
  )
}
