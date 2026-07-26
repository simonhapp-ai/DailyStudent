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
