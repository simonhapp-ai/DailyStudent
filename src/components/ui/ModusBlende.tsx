import { useEffect, useRef, useState } from 'react'
import { aufModusWechsel } from '../../lib/appMode'

// Kurze Verdunklung beim Moduswechsel.
//
// Der Wechsel tauscht Farbe, Navigation und Inhalt auf einmal aus. Ohne
// Uebergang wirkt das wie ein Sprung in eine andere App; die Blende deckt den
// Austausch ab und macht aus zwei Bildern eine Bewegung.
//
// Als CSS-Keyframe statt ueber JavaScript-Zwischenschritte: Sie laeuft genau in
// dem Moment, in dem React den halben Baum neu aufbaut — auf dem Hauptstrang
// wuerde sie dabei Bilder verlieren. Und nie klickbar: Ein Feld ueber dem
// ganzen Bildschirm darf keine Beruehrung schlucken.
export function ModusBlende() {
  const [lauf, setLauf] = useState(0)
  const zeit = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => aufModusWechsel(() => {
    setLauf((n) => n + 1)
    if (zeit.current) clearTimeout(zeit.current)
    zeit.current = setTimeout(() => setLauf(0), 460)
  }), [])

  useEffect(() => () => { if (zeit.current) clearTimeout(zeit.current) }, [])

  if (lauf === 0) return null

  return (
    <div
      key={lauf}
      aria-hidden
      className="fixed inset-0 z-[300] pointer-events-none modus-blende"
      style={{ background: '#000000' }}
    />
  )
}
