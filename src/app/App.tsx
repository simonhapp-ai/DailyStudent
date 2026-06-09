import { Component, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'

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
import { UserProvider, useUser } from '../context/UserContext'
import { OnboardingScreen } from '../screens/OnboardingScreen'
import { KalenderScreen } from '../screens/KalenderScreen'
import { UnterrichtScreen } from '../screens/UnterrichtScreen'
import { LessonScreen } from '../screens/LessonScreen'
import { SmartNotesScreen } from '../screens/SmartNotesScreen'
import { KlausurphasenScreen } from '../screens/KlausurphasenScreen'
import { LearnModeScreen } from '../screens/LearnModeScreen'
import { NoteCreateScreen } from '../screens/NoteCreateScreen'
import { FolderScreen } from '../screens/FolderScreen'
import { ProfilScreen } from '../screens/ProfilScreen'
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
import { TwoFactorVerifyScreen } from '../screens/TwoFactorVerifyScreen'
import { TwoFactorSetupScreen } from '../screens/TwoFactorSetupScreen'
import { supabase } from '../lib/supabase'

function ThemeApplier() {
  const { theme } = useUser()

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else if (theme === 'light') {
      root.classList.remove('dark')
    } else {
      root.classList.toggle('dark', window.matchMedia('(prefers-color-scheme: dark)').matches)
    }
  }, [theme])

  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      document.documentElement.classList.toggle('dark', e.matches)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  return null
}

// ── Device detection ─────────────────────────────────────────────────────────
// User-Agent based: phones have "iPhone"/"iPod" or "Android" + "Mobile" in UA.
// iPads (all versions), Android tablets, and desktops do NOT match → desktop.
// Also works in Chrome DevTools device simulation (DevTools changes the UA).
const IS_DESKTOP = !/iPhone|iPod|(Android.*Mobile)/i.test(navigator.userAgent)

function SmartRedirect() {
  return <Navigate to={IS_DESKTOP ? '/dashboard' : '/unterricht'} replace />
}

// All routes extracted into a component so the route tree is always at the
// same position in the component tree regardless of which layout branch renders.
function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<SmartRedirect />} />
      <Route path="/dashboard" element={<DashboardScreen />} />
      <Route path="/kalender" element={<KalenderScreen />} />
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
      <Route path="/profil/faecher" element={<FaecherEditScreen />} />
      <Route path="/profil/bundesland" element={<BundeslandScreen />} />
      <Route path="/profil/benachrichtigungen" element={<BenachrichtigungenScreen />} />
      <Route path="/profil/datenschutz" element={<DatenschutzScreen />} />
      <Route path="/profil/impressum" element={<ImpressumScreen />} />
      <Route path="/profil/2fa" element={<TwoFactorSetupScreen />} />
      <Route path="/insights" element={<InsightsScreen />} />
    </Routes>
  )
}

function Layout() {
  const { isOnboarded, authUser, authLoading, supabaseDataLoading } = useUser()
  const location = useLocation()
  const [needsMfa, setNeedsMfa] = useState(false)
  const [mfaChecked, setMfaChecked] = useState(false)

  useEffect(() => {
    if (!authUser) {
      setNeedsMfa(false)
      setMfaChecked(false)
      return
    }
    void (async () => {
      const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      setNeedsMfa(data?.nextLevel === 'aal2' && data?.currentLevel !== 'aal2')
      setMfaChecked(true)
    })()
  }, [authUser?.id])

  if (authLoading || (authUser && !mfaChecked)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    )
  }

  if (!authUser) {
    return <AuthScreen />
  }

  if (needsMfa) {
    return <TwoFactorVerifyScreen onVerified={() => setNeedsMfa(false)} />
  }

  // While Supabase is loading data for a freshly authenticated user, show spinner
  // to avoid flickering the OnboardingScreen for users who are already onboarded.
  if (supabaseDataLoading && !isOnboarded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isOnboarded) {
    return <OnboardingScreen />
  }

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
      <div className="flex h-screen bg-background overflow-hidden">
        <DesktopSidebar />
        <DesktopSidebarWide />
        <main className="flex-1 overflow-y-auto relative">
          <AppRoutes />
          <SyncErrorBanner />
        </main>
      </div>
    )
  }

  // ── Mobile layout (screen.width < 768px) ───────────────────────────────────
  return (
    <div className="max-w-lg mx-auto relative min-h-screen">
      <AppRoutes />
      {!hideNav && <BottomNav />}
      <SyncErrorBanner />
    </div>
  )
}

export function App() {
  return (
    <ErrorBoundary>
      <UserProvider>
        <ThemeApplier />
        <BrowserRouter>
          <Layout />
        </BrowserRouter>
      </UserProvider>
    </ErrorBoundary>
  )
}
