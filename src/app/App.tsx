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
import { ExamModeScreen } from '../screens/ExamModeScreen'
import { ExamResultScreen } from '../screens/ExamResultScreen'
import { NoteCreateScreen } from '../screens/NoteCreateScreen'
import { FolderScreen } from '../screens/FolderScreen'
import { ProfilScreen } from '../screens/ProfilScreen'

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
  const { isOnboarded } = useUser()
  const location = useLocation()

  if (!isOnboarded) {
    return <OnboardingScreen />
  }

  const hideNav =
    location.pathname === '/klausurmodus/klausur' ||
    location.pathname.endsWith('/neue-notiz')

  return (
    <div className="max-w-lg mx-auto relative min-h-screen">
      <Routes>
        <Route path="/" element={<Navigate to="/unterricht" replace />} />
        <Route path="/kalender" element={<KalenderScreen />} />
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
        <Route path="/klausurmodus/klausur" element={<ExamModeScreen />} />
        <Route path="/klausurmodus/klausur/ergebnis" element={<ExamResultScreen />} />
        <Route path="/profil" element={<ProfilScreen />} />
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
