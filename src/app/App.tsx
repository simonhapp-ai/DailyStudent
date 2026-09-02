import { Component, useEffect, useRef, useState } from 'react'
import { modeForPath } from '../lib/appMode'
import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'

class ErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null }
  static getDerivedStateFromError(e: Error) { return { error: e.message } }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: 'system-ui', background: '#0f0f13', color: '#fff', minHeight: '100dvh' }}>
          <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Fehler beim Laden</p>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>{this.state.error}</p>
          <button
            onClick={() => window.location.reload()}
            style={{ background: '#7c3aed', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600 }}
          >
            Neu laden
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
import { BottomNav } from '../components/ui/BottomNav'
import { DesktopSidebar, DesktopSidebarWide } from '../components/ui/DesktopSidebar'
import { SyncErrorBanner } from '../components/ui/SyncErrorBanner'
import { CoinToast } from '../components/ui/CoinToast'
import { AttachmentToast } from '../components/ui/AttachmentToast'
import { StreakBadge } from '../components/ui/StreakBadge'
import { ReferralPill } from '../components/ui/ReferralPill'
import { UserProvider, useUser } from '../context/UserContext'
import { useDeepLinkAuth } from '../hooks/useDeepLinkAuth'
import { OnboardingScreen } from '../screens/OnboardingScreen'
import { KalenderScreen } from '../screens/KalenderScreen'
import { StundenplanScreen } from '../screens/StundenplanScreen'
import { UnterrichtScreen } from '../screens/UnterrichtScreen'
import { LessonScreen } from '../screens/LessonScreen'
import { SmartNotesScreen } from '../screens/SmartNotesScreen'
import { KlausurphasenScreen } from '../screens/KlausurphasenScreen'
import { LearnModeScreen } from '../screens/LearnModeScreen'
import { NoteCreateScreen } from '../screens/NoteCreateScreen'
import { FolderScreen } from '../screens/FolderScreen'
import { ProfilScreen } from '../screens/ProfilScreen'
import { ProfilCoinsScreen } from '../screens/ProfilCoinsScreen'
import { ProfilAccountScreen } from '../screens/ProfilAccountScreen'
import { ProfilSupportScreen } from '../screens/ProfilSupportScreen'
import { ProfilDevToolsScreen } from '../screens/ProfilDevToolsScreen'
import { FlashCardGeneratorScreen } from '../screens/FlashCardGeneratorScreen'
import { ProbeklausurMenuScreen } from '../screens/ProbeklausurMenuScreen'
import { ProbeklausurMode1Screen } from '../screens/ProbeklausurMode1Screen'
import { ProbeklausurMode2Screen } from '../screens/ProbeklausurMode2Screen'
import { ProbeklausurMode3Screen } from '../screens/ProbeklausurMode3Screen'
import { ProbeklausurMode4Screen } from '../screens/ProbeklausurMode4Screen'
import { BlurtingScreen } from '../screens/BlurtingScreen'
import { KlausurplanScreen } from '../screens/KlausurplanScreen'
import { AbiRechnerScreen } from '../screens/AbiRechnerScreen'
import { HausaufgabenheftScreen } from '../screens/HausaufgabenheftScreen'
import { InsightsScreen } from '../screens/InsightsScreen'
import { FaecherEditScreen } from '../screens/FaecherEditScreen'
import { BundeslandScreen } from '../screens/BundeslandScreen'
import { BenachrichtigungenScreen } from '../screens/BenachrichtigungenScreen'
import { AGBScreen } from '../screens/AGBScreen'
import { DatenschutzScreen } from '../screens/DatenschutzScreen'
import { ImpressumScreen } from '../screens/ImpressumScreen'
import { LernzettelScreen } from '../screens/LernzettelScreen'
import { LernzettelGeneratorScreen } from '../screens/LernzettelGeneratorScreen'
import { ProbeklausurRetroScreen } from '../screens/ProbeklausurRetroScreen'
import { LernplanKonfiguratorScreen } from '../screens/LernplanKonfiguratorScreen'
import { LernplanDetailScreen } from '../screens/LernplanDetailScreen'
import { LernplanListScreen } from '../screens/LernplanListScreen'
import { AuthScreen } from '../screens/AuthScreen'
import { DashboardScreen } from '../screens/DashboardScreen'
import { LandingScreen } from '../screens/LandingScreen'
import { DemoScreen } from '../screens/DemoScreen'
import { DemoConsentScreen } from '../screens/DemoConsentScreen'
import { EarlyAccessScreen } from '../screens/EarlyAccessScreen'
import { DrawingCanvasScreen } from '../screens/DrawingCanvasScreen'
import { TwoFactorVerifyScreen } from '../screens/TwoFactorVerifyScreen'
import { TwoFactorSetupScreen } from '../screens/TwoFactorSetupScreen'
import { supabase } from '../lib/supabase'
import { notifyNativeTheme, recenterScreen } from '../lib/nativeBridge'
import { Analytics } from '@vercel/analytics/react'
import { CookieBanner } from '../components/ui/CookieBanner'
import { analyticsAllowed, hasConsent, saveConsent } from '../lib/consent'
import { Capacitor } from '@capacitor/core'
import { IST_TELEFON } from '../lib/geraet'

function ThemeApplier() {
  // Erscheinungsbild.
  //
  // Apples HIG raet von einem app-eigenen Appearance-Setting ab ("users may
  // think your app is broken because it doesn't respond to their systemwide
  // appearance choice"). Deshalb war der Schalter am 31.08.2026 entfernt worden
  // und die App folgte immer dem System.
  //
  // Er ist zurueck — mit "System" als einer der drei Moeglichkeiten und als
  // Standard. Damit bleibt Apples eigentliche Sorge beantwortet: Wer nichts
  // einstellt, folgt dem Geraet. Wer bewusst etwas anderes waehlt, bekommt es.
  // Ein Schalter, der in den Speicher schreibt und nichts bewirkt, waere die
  // schlechteste der drei Varianten gewesen.
  const { theme } = useUser()

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const isDark = theme === 'system' ? mq.matches : theme === 'dark'
      document.documentElement.classList.toggle('dark', isDark)
      // Native (iOS wrapper) can't see this in-app theme choice on its own —
      // it only knows the device's OS-level appearance, which can differ.
      notifyNativeTheme(isDark)
    }
    apply()
    // Dem System nur folgen, solange nichts anderes gewaehlt ist.
    if (theme !== 'system') return
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])

  return null
}

// ── Device detection ─────────────────────────────────────────────────────────
// User-Agent based: phones have "iPhone"/"iPod" or "Android" + "Mobile" in UA.
// iPads (all versions), Android tablets, and desktops do NOT match → desktop.
// Also works in Chrome DevTools device simulation (DevTools changes the UA).
const IS_DESKTOP = !IST_TELEFON
const IS_NATIVE = Capacitor.isNativePlatform()

// Web-only signal for the landing page: has this browser touched the app
// before (previous account data, prior cookie consent, or already seen the
// demo)? If so, dailystudent.de should skip straight to login instead of
// showing the marketing page again — landing is only for true first visits.
function hasPriorVisit(): boolean {
  try {
    if (localStorage.getItem('lernapp_v1')) return true
    if (localStorage.getItem('ds_consent_v1')) return true
    if (localStorage.getItem('demoShown') === 'true') return true
  } catch { /* localStorage unavailable — treat as first visit */ }
  return false
}

// Suppresses the floating CookieBanner exactly where Layout would already be
// showing the full-screen DemoConsentScreen instead — otherwise both consent
// UIs would stack on top of each other.
function CookieBannerGate({ onConsent }: { onConsent: (analytics: boolean) => void }) {
  const { authUser, authLoading } = useUser()
  const location = useLocation()
  const demoConsentActive =
    location.pathname === '/demo' ||
    (location.pathname === '/' && IS_NATIVE && !authLoading && !authUser)
  if (demoConsentActive) return null
  return <CookieBanner onConsent={onConsent} />
}

function FixedBadges() {
  return (
    <div
      className="fixed z-40 flex items-center gap-2"
      style={{ top: 'max(14px, calc(env(safe-area-inset-top, 0px) + 10px))', right: '16px' }}
    >
      <ReferralPill />
      <StreakBadge inline />
    </div>
  )
}

function SmartRedirect() {
  return <Navigate to="/unterricht" replace />
}

// All routes extracted into a component so the route tree is always at the
// same position in the component tree regardless of which layout branch renders.
function AppRoutes() {
  return (
    <Routes>
      <Route path="/landing" element={<LandingScreen />} />
      <Route path="/early-access" element={<EarlyAccessScreen />} />
      <Route path="/impressum" element={<ImpressumScreen />} />
      <Route path="/datenschutz" element={<DatenschutzScreen />} />
      <Route path="/agb" element={<AGBScreen />} />
      <Route path="/" element={<SmartRedirect />} />
      <Route path="/dashboard" element={<DashboardScreen />} />
      <Route path="/kalender" element={<KalenderScreen />} />
      <Route path="/stundenplan" element={<StundenplanScreen />} />
      <Route path="/hausaufgaben" element={<HausaufgabenheftScreen />} />
      <Route path="/klausuren" element={<KlausurplanScreen />} />
      <Route path="/abi-rechner" element={<AbiRechnerScreen />} />
      <Route path="/unterricht" element={<UnterrichtScreen />} />
      <Route path="/unterricht/neue-notiz" element={<NoteCreateScreen />} />
      <Route path="/unterricht/ohne-fach/ordner/:folderId" element={<FolderScreen />} />
      <Route path="/unterricht/ohne-fach/ordner/:folderId/neue-notiz" element={<NoteCreateScreen />} />
      <Route path="/unterricht/ohne-fach/:lessonId" element={<SmartNotesScreen />} />
      <Route path="/unterricht/:id" element={<LessonScreen />} />
      <Route path="/unterricht/:id/neue-notiz" element={<NoteCreateScreen />} />
      <Route path="/unterricht/:id/ordner/:folderId" element={<FolderScreen />} />
      <Route path="/unterricht/:id/ordner/:folderId/neue-notiz" element={<NoteCreateScreen />} />
      <Route path="/unterricht/:id/:lessonId" element={<SmartNotesScreen />} />
      <Route path="/klausurmodus" element={<KlausurphasenScreen />} />
      <Route path="/klausurmodus/lernen" element={<LearnModeScreen />} />
      <Route path="/klausurmodus/karteikarten/neu" element={<FlashCardGeneratorScreen />} />
      <Route path="/klausurmodus/probeklausur" element={<ProbeklausurMenuScreen />} />
      <Route path="/klausurmodus/probeklausur/retrospektive" element={<ProbeklausurRetroScreen />} />
      <Route path="/klausurmodus/probeklausur/afb-trainer" element={<ProbeklausurMode1Screen />} />
      <Route path="/klausurmodus/probeklausur/vollstaendige-klausur" element={<ProbeklausurMode2Screen />} />
      <Route path="/klausurmodus/probeklausur/materialklausur" element={<ProbeklausurMode3Screen />} />
      <Route path="/klausurmodus/probeklausur/ohne-material" element={<ProbeklausurMode4Screen />} />
      <Route path="/klausurmodus/blurting" element={<BlurtingScreen />} />
      <Route path="/klausurmodus/lernzettel" element={<LernzettelScreen />} />
      <Route path="/klausurmodus/lernzettel/neu" element={<LernzettelGeneratorScreen />} />
      <Route path="/klausurmodus/lernplan" element={<LernplanListScreen />} />
      <Route path="/klausurmodus/lernplan/neu" element={<LernplanKonfiguratorScreen />} />
      <Route path="/klausurmodus/lernplan/:id" element={<LernplanDetailScreen />} />
      <Route path="/profil" element={<ProfilScreen />} />
      <Route path="/profil/coins" element={<ProfilCoinsScreen />} />
      <Route path="/profil/account" element={<ProfilAccountScreen />} />
      <Route path="/profil/support" element={<ProfilSupportScreen />} />
      <Route path="/profil/dev-tools" element={<ProfilDevToolsScreen />} />
      <Route path="/profil/faecher" element={<FaecherEditScreen />} />
      <Route path="/profil/bundesland" element={<BundeslandScreen />} />
      <Route path="/profil/benachrichtigungen" element={<BenachrichtigungenScreen />} />
      <Route path="/profil/agb" element={<AGBScreen />} />
      <Route path="/profil/datenschutz" element={<DatenschutzScreen />} />
      <Route path="/profil/impressum" element={<ImpressumScreen />} />
      <Route path="/schreibblock" element={<DrawingCanvasScreen />} />
      <Route path="/profil/2fa" element={<TwoFactorSetupScreen />} />
      <Route path="/insights" element={<InsightsScreen />} />
    </Routes>
  )
}

// Block 4 (Navigation/Layout-Politur): dezenter Fade zwischen Routen statt
// hartem Schnitt — kein Bounce, respektiert prefers-reduced-motion.
// Kein AnimatePresence/Exit-Animation bewusst: ein reiner Enter-Fade,
// gekeyed auf den Pfad, reicht für "fühlt sich nicht wie ein Website-Reload
// an" und hält das Timing simpel (kein doppeltes Rendering alter+neuer
// Screen während der Übergangsdauer). Deckt sich gut mit dem bestehenden
// Scroll-Reset-Effect (App.tsx, useEffect auf location.pathname): der neue
// Screen ist schon oben gescrollt, bevor er sichtbar einblendet.
function RouteFade({ children, routeKey }: { children: ReactNode; routeKey: string }) {
  const reducedMotion = useReducedMotion()
  if (reducedMotion) return <>{children}</>
  return (
    <motion.div key={routeKey} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.18, ease: 'easeOut' }}>
      {children}
    </motion.div>
  )
}

function Layout({ consentGiven, onConsentGiven }: { consentGiven: boolean; onConsentGiven: (analytics: boolean) => void }) {
  const { isOnboarded, authUser, authLoading, supabaseDataLoading } = useUser()
  const location = useLocation()
  const desktopMainRef = useRef<HTMLElement>(null)

  // Capture ?ref= before redirect strips the query param (e.g. /?ref=CODE → /landing)
  useEffect(() => {
    const ref = new URLSearchParams(location.search).get('ref')
    if (ref) localStorage.setItem('referral_code', ref)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Every route change starts scrolled to the top — otherwise a screen you
  // scrolled down on before navigating away reopens still scrolled down,
  // which reads as a website reloading state rather than a real app screen.
  useEffect(() => {
    recenterScreen()
    desktopMainRef.current?.scrollTo(0, 0)
  }, [location.pathname])
  // True if localStorage has a previous session — lets us skip the spinner for returning users
  const [hasLocalSession] = useState(() => {
    try {
      const raw = localStorage.getItem('lernapp_v1')
      return raw ? !!(JSON.parse(raw) as { userId?: string }).userId : false
    } catch { return false }
  })
  // Initialize from cache so MFA screen shows immediately on refresh — no app flash
  const [needsMfa, setNeedsMfa] = useState(() => {
    try {
      const raw = localStorage.getItem('lernapp_v1')
      return raw ? !!(JSON.parse(raw) as { mfaRequired?: boolean }).mfaRequired : false
    } catch { return false }
  })

  useEffect(() => {
    if (!authUser) {
      setNeedsMfa(false)
      return
    }
    void (async () => {
      const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      const required = data?.nextLevel === 'aal2' && data?.currentLevel !== 'aal2'
      setNeedsMfa(required)
      // Cache result so next refresh shows the right screen immediately
      try {
        const raw = localStorage.getItem('lernapp_v1')
        const stored = raw ? (JSON.parse(raw) as object) : {}
        localStorage.setItem('lernapp_v1', JSON.stringify({ ...stored, mfaRequired: required }))
      } catch {}
    })()
  }, [authUser?.id])

  // Only block with spinner if there's no local data to show while Supabase initializes
  if (authLoading && !hasLocalSession) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    )
  }

  // Public routes — always accessible without auth
  if (location.pathname === '/landing') return <LandingScreen />
  if (location.pathname === '/early-access') return <EarlyAccessScreen />
  if (location.pathname === '/demo') {
    // Gate the demo behind the Datenschutz/Cookie screen once — same
    // consent flag the rest of the app uses (CookieBanner, native flow below).
    if (!consentGiven) return <DemoConsentScreen onAccept={onConsentGiven} />
    return <DemoScreen />
  }
  if (location.pathname === '/impressum') return <ImpressumScreen />
  if (location.pathname === '/datenschutz') return <DatenschutzScreen />
  if (location.pathname === '/agb') return <AGBScreen />

  // Only redirect to auth once Supabase has confirmed there's no valid session
  const designPreview = !IS_NATIVE && /^(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.test(window.location.hostname) && new URLSearchParams(window.location.search).get('vorschau') === '1'
    if (!authLoading && !authUser && !designPreview) {
    if (location.pathname === '/') {
      // Native app cold start: consent → demo → login, once per device —
      // no marketing landing page, straight into the product. The URL bar
      // isn't visible in the native WebView, so rendering directly here
      // instead of navigating is fine (same pattern /landing etc. already use).
      if (IS_NATIVE) {
        if (!consentGiven) return <DemoConsentScreen onAccept={onConsentGiven} />
        if (localStorage.getItem('demoShown') !== 'true') return <DemoScreen />
        return <AuthScreen />
      }
      // Web: landing page only for genuine first-time visitors — anyone
      // whose browser already has app data, consent, or has seen the demo
      // goes straight to login instead of the marketing pitch again.
      return <Navigate to={hasPriorVisit() ? '/auth' : '/landing'} replace />
    }
    return <AuthScreen />
  }

  if (needsMfa) {
    return <TwoFactorVerifyScreen onVerified={() => setNeedsMfa(false)} />
  }

  // While Supabase is loading data for a freshly authenticated user, show spinner
  // to avoid flickering the OnboardingScreen for users who are already onboarded.
  if (supabaseDataLoading && !isOnboarded) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isOnboarded) {
    return <OnboardingScreen />
  }

  if (location.pathname === '/landing') return <LandingScreen />

  const hideNav =
    location.pathname === '/klausurmodus/karteikarten/neu' ||
    location.pathname === '/klausurmodus/lernzettel/neu' ||
    location.pathname === '/klausurmodus/lernplan/neu' ||
    location.pathname === '/klausurmodus/blurting' ||
    location.pathname.endsWith('/neue-notiz') ||
    location.pathname.startsWith('/klausurmodus/probeklausur/') ||
    location.pathname.startsWith('/klausurmodus/lernplan/')

  // ── Desktop / iPad layout (UA-based: not iPhone / Android phone) ────────────
  // sidebar uses CSS breakpoints internally for icon-only (md:) vs wide (lg:)
  // so orientation changes between portrait/landscape are handled correctly.
  if (IS_DESKTOP) {
    return (
      <div className="flex h-dvh bg-background overflow-hidden">
        <DesktopSidebar />
        <DesktopSidebarWide />
        <main
          ref={desktopMainRef}
          className={`flex-1 overflow-y-auto relative ${modeForPath(location.pathname) === 'klausur' ? 'mode-klausur' : ''}`}
        >
          <RouteFade routeKey={location.pathname}>
            <AppRoutes />
          </RouteFade>
          <SyncErrorBanner />
        </main>
        <FixedBadges />
        <CoinToast />
        <AttachmentToast />
      </div>
    )
  }

  // ── Mobile layout (screen.width < 768px) ───────────────────────────────────
  return (
    <div className="max-w-lg mx-auto relative min-h-dvh">
      <div className={modeForPath(location.pathname) === 'klausur' ? 'mode-klausur' : undefined}>
        <RouteFade routeKey={location.pathname}>
          <AppRoutes />
        </RouteFade>
      </div>
      {!hideNav && <BottomNav />}
      <SyncErrorBanner />
      <StreakBadge />
      <CoinToast />
      <AttachmentToast />
    </div>
  )
}

export function App() {
  const [consentGiven, setConsentGiven] = useState(() => hasConsent())
  const [analyticsOn, setAnalyticsOn] = useState(() => analyticsAllowed())
  useDeepLinkAuth()

  // Shared by the floating CookieBanner (non-blocking, shown on any screen)
  // and DemoConsentScreen (blocking, shown once before the demo) — whichever
  // fires first satisfies consent for the rest of the session.
  const handleConsent = (analytics: boolean) => {
    saveConsent(analytics)
    setConsentGiven(true)
    setAnalyticsOn(analytics)
  }

  return (
    <ErrorBoundary>
      <UserProvider>
        <ThemeApplier />
        <BrowserRouter>
          <Layout consentGiven={consentGiven} onConsentGiven={handleConsent} />
          {!consentGiven && <CookieBannerGate onConsent={handleConsent} />}
        </BrowserRouter>
        {analyticsOn && <Analytics />}
      </UserProvider>
    </ErrorBoundary>
  )
}
