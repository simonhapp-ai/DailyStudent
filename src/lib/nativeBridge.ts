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

// Forces the native scroll view back to (0,0), like a real rubber-band
// recoil — window.scrollTo() alone can't reliably cancel an in-flight
// native elastic bounce. Falls back to a plain window scroll on web/desktop.
export function recenterScreen() {
  const bridge = getHandler('recenterBridge')
  if (bridge) {
    bridge.postMessage(null)
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}
