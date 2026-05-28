import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
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
    <UserProvider>
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    </UserProvider>
  )
}
