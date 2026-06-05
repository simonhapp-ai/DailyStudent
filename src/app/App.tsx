import { Component, useEffect } from 'react'
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
import { LernzettelScreen } from '../screens/LernzettelScreen'
import { LernzettelGeneratorScreen } from '../screens/LernzettelGeneratorScreen'
import { ProbeklausurRetroScreen } from '../screens/ProbeklausurRetroScreen'
import { LernplanKonfiguratorScreen } from '../screens/LernplanKonfiguratorScreen'
import { LernplanDetailScreen } from '../screens/LernplanDetailScreen'

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

function Layout() {
  const { isOnboarded, recordStudyDay } = useUser()
  const location = useLocation()

  // Record every calendar day the user opens the app as a study day.
  // recordStudyDay is idempotent for the same calendar day, so this is safe
  // to call on every mount / every time onboarding completes.
  useEffect(() => {
    if (isOnboarded) recordStudyDay()
  }, [isOnboarded]) // eslint-disable-line react-hooks/exhaustive-deps

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

  return (
    <div className="max-w-lg mx-auto relative min-h-screen">
      <Routes>
        <Route path="/" element={<Navigate to="/unterricht" replace />} />
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
        <Route path="/klausurmodus/lernplan/neu" element={<LernplanKonfiguratorScreen />} />
        <Route path="/klausurmodus/lernplan/:id" element={<LernplanDetailScreen />} />
        <Route path="/profil" element={<ProfilScreen />} />
        <Route path="/profil/faecher" element={<FaecherEditScreen />} />
        <Route path="/insights" element={<InsightsScreen />} />
      </Routes>
      {!hideNav && <BottomNav />}
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
