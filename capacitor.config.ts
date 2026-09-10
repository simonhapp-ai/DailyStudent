import type { CapacitorConfig } from '@capacitor/cli'

// Always points at production. Never hand-edit this for local testing —
// use `npm run cap:dev` (live-reload against the Vite dev server) instead,
// so an archived build can never accidentally ship pointed at a dev URL.
const config: CapacitorConfig = {
  appId: 'com.dailystudent.app', // must exactly match the App ID registered in Apple Developer Portal
  appName: 'DailyStudent',
  webDir: 'dist',
  server: {
    // Apex dailystudent.de 308-redirects here — pointing directly at the
    // canonical host avoids an extra network hop on every app launch.
    url: 'https://www.dailystudent.de',
    cleartext: false,
  },
  ios: {
    contentInset: 'automatic',
    // Pairs with WKAppBoundDomains in ios/App/App/Info.plist: marks this origin
    // as app-bound so its WebKit storage (IndexedDB / localStorage / Cache) is
    // exempt from the ~7-day ITP eviction that was silently wiping locally
    // cached note images a few days after they were taken. Side effect: the
    // main WebView can no longer navigate to domains outside that list — OAuth
    // (@capacitor/browser) and native IAP are unaffected, but verify native
    // Google/Apple sign-in on device after shipping this. Takes effect only in
    // a fresh Xcode archive, never via the Vercel-served bundle. `npm run
    // cap:dev` live-reload would need `localhost` added to WKAppBoundDomains.
    limitsNavigationsToAppBoundDomains: true,
  },
  plugins: {
    // Kept visible until src/main.tsx explicitly hides it once React has
    // mounted — server.url is a remote origin, so without this there's a
    // blank-white flash while the page loads over the network.
    SplashScreen: {
      launchAutoHide: false,
    },
  },
}

export default config
