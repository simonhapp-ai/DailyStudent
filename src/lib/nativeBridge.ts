// Two small dedicated JS→native message channels for the iOS Capacitor
// wrapper (see ios/App/App/BridgeViewController.swift), kept separate from
// Capacitor's own bridge. Both are no-ops outside the native WKWebView
// (web/desktop), where `window.webkit` doesn't exist.

type NativeMessageHandler = { postMessage: (body: unknown) => void }

function getHandler(name: 'themeBridge' | 'recenterBridge'): NativeMessageHandler | undefined {
  return (window as unknown as { webkit?: { messageHandlers?: Record<string, NativeMessageHandler> } })
    .webkit?.messageHandlers?.[name]
}

// Tells native code the web app's actually-resolved light/dark state —
// the in-app theme (Hell/Dunkel/System) can differ from the device's OS
// appearance setting, which native can't see on its own.
export function notifyNativeTheme(isDark: boolean) {
  getHandler('themeBridge')?.postMessage(isDark)
}

/**
 * @param animiert Weiches Hochscrollen. Richtig, wenn der Nutzer den bereits
 *   aktiven Tab noch einmal antippt — dann ist die Bewegung die Antwort auf
 *   seine Geste. Falsch beim Wechsel auf einen anderen Screen: Dort soll er
 *   sofort richtig sitzen, sonst sieht man ihn erst an der alten Stelle und
 *   dann nach oben rutschen.
 */
/** Laeuft gerade eine Sperre? Verhindert, dass ein zweiter Aufruf sie festhaelt. */
let gesperrt = false

export function recenterScreen(animiert = true) {
  if (animiert) {
    // Die native Bruecke faehrt eine Federanimation ueber 0,35 s. Genau das
    // will man hier: Der Nutzer hat den bereits aktiven Tab noch einmal
    // angetippt, die Bewegung ist die Antwort darauf.
    const bridge = getHandler('recenterBridge')
    if (bridge) bridge.postMessage(null)
    else window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }

  // Beim Screenwechsel bewusst OHNE Bruecke: Deren Federanimation lief bisher
  // bei jedem Routenwechsel mit und sah aus, als wuerde die Seite von selbst
  // nach oben wischen — auch dann, wenn der neue Screen ohnehin oben beginnt.
  // Screens haengen nicht aneinander; wer in einem heruntergescrollt hat,
  // startet im naechsten trotzdem oben, und zwar ohne Bewegung.

  // Eine Wischbewegung gleitet nach dem Loslassen weiter. Tippt man waehrend
  // dieses Nachlaufs auf die Leiste, ueberschreibt die laufende Bewegung ein
  // blosses scrollTo(0) — die Seite rutscht wieder dorthin zurueck, wo der
  // Schwung sie hintraegt. Ganz unten faellt das nicht auf: Dort ist die
  // Bewegung schon an ihre Grenze gestossen und steht.
  //
  // Genau dieses Problem ist fuer die native Seite oben im Kommentar der
  // Bruecke beschrieben; im Web gilt es genauso. Kurzes Sperren des Scrollens
  // beendet den Nachlauf, danach bleibt die Seite oben.
  //
  // Zurueckgesetzt wird ueber zwei Wege, die beide dasselbe tun: Bleibt einer
  // aus — im Hintergrund laufen Animationsbilder nicht —, greift der andere.
  // Eine Seite, die sich nicht mehr scrollen laesst, waere schlimmer als ein
  // Nachlauf.
  const wurzel = document.documentElement
  wurzel.scrollTop = 0
  window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })

  // Nur einmal gleichzeitig sperren. Der Wechsel loest zwei Aufrufe aus — einen
  // im Klick, einen nach dem Routenwechsel. Wuerde der zweite den aktuellen
  // Wert sichern, sicherte er das 'hidden' des ersten und stellte es danach
  // dauerhaft wieder her: Die Seite liesse sich nie wieder scrollen. Genau das
  // ist beim Testen passiert.
  if (gesperrt) return
  gesperrt = true
  const loesen = () => { wurzel.style.overflowY = ''; gesperrt = false }
  wurzel.style.overflowY = 'hidden'
  requestAnimationFrame(loesen)
  setTimeout(loesen, 60)
}
