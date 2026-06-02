import { createContext, useContext, useState } from 'react'
import { type ReactNode } from 'react'
import type { FlashCard, GeneratedSmartNote, UserFolder, UserNote, Stundenplan, AbiGradeEntry, AbiHalbjahr, AppStats, ExamScoreRecord } from '../types'
import { subjects, topics, halfYears } from '../data/mockData'

export interface StandaloneHomeworkItem {
  id: string
  subjectId?: string
  description: string
  dueDate?: string
  createdAt: string
}

export type EntryType = 'lerneinheit' | 'termin' | 'erinnerung'

export interface PersonalEntry {
  id: string
  title: string
  type: EntryType
  date: string
  time: string
  endTime?: string
}

export interface KlausurTermin {
  subjectId: string
  date: string
  topic?: string
}

export interface UserProfile {
  name: string
  klasse: string
  schulform: string
  bundesland: string
  bundeslandId: string
  faecher: string[]
  klausurtermine: KlausurTermin[]
  zielnote?: string
  stundenplan?: Stundenplan
  folderSortMode?: 'manual' | 'halbjahr' | 'themen'
  isDevMode?: boolean
  abiNoten?: AbiGradeEntry[]      // legacy — kept for migration
  abiHalbjahre?: AbiHalbjahr[]
  schultyp?: 'g8' | 'g9'
  abiGesamtpunkte?: number | null  // computed Abi score — synced from AbiRechnerScreen for stats
  abiGesamtnote?: string            // computed Abi grade string — synced from AbiRechnerScreen for stats
}

export type AppTheme = 'light' | 'dark' | 'system'

const DEFAULT_APP_STATS: AppStats = {
  scanCount: 0,
  examCount: 0,
  streak: 0,
  lastStudyDate: null,
  studiedDays: [],
  examScores: [],
}

interface StorageData {
  profile?: UserProfile
  personalEntries?: PersonalEntry[]
  generatedNotes?: Record<string, GeneratedSmartNote>
  userNotes?: UserNote[]
  userFolders?: UserFolder[]
  theme?: AppTheme
  isPro?: boolean
  generatedFlashCards?: FlashCard[]
  completedHomeworkIds?: string[]
  standaloneHomework?: StandaloneHomeworkItem[]
  appStats?: AppStats
}

interface UserContextValue {
  profile: UserProfile | null
  isOnboarded: boolean
  personalEntries: PersonalEntry[]
  generatedNotes: Record<string, GeneratedSmartNote>
  userNotes: UserNote[]
  userFolders: UserFolder[]
  generatedFlashCards: FlashCard[]
  theme: AppTheme
  setTheme: (t: AppTheme) => void
  isPro: boolean
  setIsPro: (v: boolean) => void
  completeOnboarding: (profile: UserProfile, prebuiltFolders?: UserFolder[]) => void
  updateProfile: (data: Partial<UserProfile>) => void
  addEntry: (entry: PersonalEntry) => void
  removeEntry: (id: string) => void
  saveGeneratedNote: (lessonId: string, note: GeneratedSmartNote) => void
  addUserNote: (note: UserNote) => void
  saveNote: (note: UserNote, generated?: GeneratedSmartNote) => void
  updateUserNote: (note: UserNote) => void
  addFolder: (folder: UserFolder) => void
  deleteFolder: (folderId: string) => void
  saveToOhneFachFolder: (note: UserNote, generated?: GeneratedSmartNote) => void
  saveFlashCards: (newCards: FlashCard[]) => void
  addKlausurtermin: (termin: KlausurTermin) => void
  removeKlausurtermin: (subjectId: string, date: string) => void
  completedHomeworkIds: string[]
  standaloneHomework: StandaloneHomeworkItem[]
  completeHomework: (id: string) => void
  addStandaloneHomework: (item: Omit<StandaloneHomeworkItem, 'id' | 'createdAt'>) => void
  appStats: AppStats
  recordStudyDay: () => void
  recordExam: (score: ExamScoreRecord) => void
  incrementScanCount: () => void
}

const STORAGE_KEY = 'lernapp_v1'

function loadStorage(): StorageData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StorageData) : {}
  } catch {
    return {}
  }
}

function saveStorage(data: StorageData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {}
}

function halfYearGrade(halfYearId: string): number {
  const m = /kl(\d+)/.exec(halfYearId)
  return m ? parseInt(m[1], 10) : 99
}

// Normal users: folders based on folderSortMode preference
function generateDefaultFolders(profile: UserProfile): UserFolder[] {
  const mode = profile.folderSortMode ?? 'halbjahr'
  // Manual: user creates their own folders — no auto-generated ones
  if (mode === 'manual') return []

  const folders: UserFolder[] = []
  const now = new Date().toISOString()
  const klasse = parseInt(profile.klasse, 10)
  const isOberstufe = profile.schultyp === 'g8' ? klasse >= 11 : klasse >= 12

  for (const subjectId of profile.faecher) {
    if (isOberstufe) {
      // Qualifikationsphase: Q1 (Kl.12 HJ1), Q2 (Kl.12 HJ2), Q3 (Kl.13 HJ1), Q4 (Kl.13 HJ2)
      const quarters = [
        { id: `folder-${subjectId}-q1`, halfYearId: 'kl12-hj1', name: 'Q1' },
        { id: `folder-${subjectId}-q2`, halfYearId: 'kl12-hj2', name: 'Q2' },
        { id: `folder-${subjectId}-q3`, halfYearId: 'kl13-hj1', name: 'Q3' },
        { id: `folder-${subjectId}-q4`, halfYearId: 'kl13-hj2', name: 'Q4' },
      ]
      for (const q of quarters) {
        folders.push({
          id: q.id,
          subjectId,
          halfYearId: q.halfYearId,
          name: q.name,
          createdAt: now,
          isAutoGenerated: true,
        })
      }
    } else {
      folders.push(
        {
          id: `folder-${subjectId}-kl${klasse}-hj1`,
          subjectId,
          halfYearId: `kl${klasse}-hj1`,
          name: `${klasse}. Klasse — 1. Halbjahr`,
          createdAt: now,
          isAutoGenerated: true,
        },
        {
          id: `folder-${subjectId}-kl${klasse}-hj2`,
          subjectId,
          halfYearId: `kl${klasse}-hj2`,
          name: `${klasse}. Klasse — 2. Halbjahr`,
          createdAt: now,
          isAutoGenerated: true,
        },
      )
    }
  }
  return folders
}

// DEV/demo only: KC-topic-aligned folders across all eligible grades
export function generateKcFolders(profile: UserProfile): UserFolder[] {
  const folders: UserFolder[] = []
  const now = new Date().toISOString()
  const maxGrade = parseInt(profile.klasse, 10)

  for (const subjectId of profile.faecher) {
    const subjectTopics = topics.filter(
      (t) => t.subjectId === subjectId && halfYearGrade(t.halfYearId) <= maxGrade,
    )

    if (subjectTopics.length > 0) {
      for (const topic of subjectTopics) {
        folders.push({
          id: `folder-kc-${topic.id}`,
          subjectId,
          halfYearId: topic.halfYearId,
          name: topic.name,
          createdAt: now,
          isAutoGenerated: true,
        })
      }
    } else {
      const subject = subjects.find((s) => s.id === subjectId)
      const currentHalfYear = halfYears.find((h) => h.isCurrent)
      folders.push({
        id: `folder-default-${subjectId}`,
        subjectId,
        halfYearId: currentHalfYear?.id ?? `kl${maxGrade}-hj2`,
        name: `${subject?.name ?? subjectId} — ${profile.klasse}. Klasse`,
        createdAt: now,
        isAutoGenerated: true,
      })
    }
  }
  return folders
}

const UserContext = createContext<UserContextValue | null>(null)

export function UserProvider({ children }: { children: ReactNode }) {
  const stored = loadStorage()

  const [profile, setProfile] = useState<UserProfile | null>(stored.profile ?? null)
  const [theme, setThemeState] = useState<AppTheme>(stored.theme ?? 'dark')
  const [isPro, setIsProState] = useState<boolean>(stored.isPro ?? false)
  const [personalEntries, setPersonalEntries] = useState<PersonalEntry[]>(stored.personalEntries ?? [])
  const [generatedNotes, setGeneratedNotes] = useState<Record<string, GeneratedSmartNote>>(
    stored.generatedNotes ?? {},
  )
  const [userNotes, setUserNotes] = useState<UserNote[]>(stored.userNotes ?? [])
  const [generatedFlashCards, setGeneratedFlashCards] = useState<FlashCard[]>(stored.generatedFlashCards ?? [])
  const [completedHomeworkIds, setCompletedHomeworkIds] = useState<string[]>(stored.completedHomeworkIds ?? [])
  const [standaloneHomework, setStandaloneHomework] = useState<StandaloneHomeworkItem[]>(stored.standaloneHomework ?? [])
  const [appStats, setAppStats] = useState<AppStats>(stored.appStats ?? DEFAULT_APP_STATS)

  const [userFolders, setUserFolders] = useState<UserFolder[]>(() => {
    if (stored.userFolders && stored.userFolders.length > 0) return stored.userFolders
    if (stored.profile) {
      const generated = generateDefaultFolders(stored.profile)
      saveStorage({ ...stored, userFolders: generated })
      return generated
    }
    return []
  })

  const persist = (
    p: UserProfile | null,
    e: PersonalEntry[],
    n: Record<string, GeneratedSmartNote>,
    un: UserNote[],
    uf: UserFolder[],
    t?: AppTheme,
    pro?: boolean,
  ) => saveStorage({ profile: p ?? undefined, personalEntries: e, generatedNotes: n, userNotes: un, userFolders: uf, theme: t ?? theme, isPro: pro ?? isPro })

  const setTheme = (t: AppTheme) => {
    setThemeState(t)
    persist(profile, personalEntries, generatedNotes, userNotes, userFolders, t)
  }

  const setIsPro = (v: boolean) => {
    setIsProState(v)
    saveStorage({ ...loadStorage(), isPro: v })
  }

  const completeOnboarding = (p: UserProfile, prebuiltFolders?: UserFolder[]) => {
    const generated = prebuiltFolders ?? generateDefaultFolders(p)
    // Preserve any folders created before onboarding (e.g. ohne-fach from file import step)
    const preserved = userFolders.filter((f) => !f.isAutoGenerated)
    const merged = [...generated, ...preserved]
    setProfile(p)
    setUserFolders(merged)
    persist(p, personalEntries, generatedNotes, userNotes, merged)
  }

  const updateProfile = (data: Partial<UserProfile>) => {
    if (!profile) return
    const updated = { ...profile, ...data }
    setProfile(updated)
    persist(updated, personalEntries, generatedNotes, userNotes, userFolders)
  }

  const addEntry = (entry: PersonalEntry) => {
    const updated = [...personalEntries, entry]
    setPersonalEntries(updated)
    persist(profile, updated, generatedNotes, userNotes, userFolders)
  }

  const removeEntry = (id: string) => {
    const updated = personalEntries.filter((e) => e.id !== id)
    setPersonalEntries(updated)
    persist(profile, updated, generatedNotes, userNotes, userFolders)
  }

  const saveGeneratedNote = (lessonId: string, note: GeneratedSmartNote) => {
    const updated = { ...generatedNotes, [lessonId]: note }
    setGeneratedNotes(updated)
    persist(profile, personalEntries, updated, userNotes, userFolders)
  }

  const addUserNote = (note: UserNote) => {
    const updated = [...userNotes, note]
    setUserNotes(updated)
    persist(profile, personalEntries, generatedNotes, updated, userFolders)
    recordStudyDay()
  }

  const saveNote = (note: UserNote, generated?: GeneratedSmartNote) => {
    const updatedNotes = [...userNotes, note]
    const updatedGenerated = generated
      ? { ...generatedNotes, [note.id]: generated }
      : generatedNotes
    setUserNotes(updatedNotes)
    if (generated) setGeneratedNotes(updatedGenerated)
    persist(profile, personalEntries, updatedGenerated, updatedNotes, userFolders)
    recordStudyDay()
  }

  const updateUserNote = (note: UserNote) => {
    const updated = userNotes.map((n) => (n.id === note.id ? note : n))
    setUserNotes(updated)
    persist(profile, personalEntries, generatedNotes, updated, userFolders)
  }

  const addFolder = (folder: UserFolder) => {
    const updated = [...userFolders, folder]
    setUserFolders(updated)
    persist(profile, personalEntries, generatedNotes, userNotes, updated)
  }

  const saveToOhneFachFolder = (note: UserNote, generated?: GeneratedSmartNote) => {
    const folderExists = userFolders.some((f) => f.id === 'folder-no-subject')
    const updatedFolders = folderExists
      ? userFolders
      : [...userFolders, {
          id: 'folder-no-subject',
          subjectId: 'ohne-fach',
          name: 'Schnellnotizen',
          createdAt: new Date().toISOString(),
        }]
    const updatedNotes = [...userNotes, note]
    const updatedGenerated = generated
      ? { ...generatedNotes, [note.id]: generated }
      : generatedNotes
    if (!folderExists) setUserFolders(updatedFolders)
    setUserNotes(updatedNotes)
    if (generated) setGeneratedNotes(updatedGenerated)
    persist(profile, personalEntries, updatedGenerated, updatedNotes, updatedFolders)
  }

  const addKlausurtermin = (termin: KlausurTermin) => {
    if (!profile) return
    const updated = { ...profile, klausurtermine: [...(profile.klausurtermine ?? []), termin] }
    setProfile(updated)
    persist(updated, personalEntries, generatedNotes, userNotes, userFolders)
  }

  const removeKlausurtermin = (subjectId: string, date: string) => {
    if (!profile) return
    const updated = { ...profile, klausurtermine: (profile.klausurtermine ?? []).filter((k) => !(k.subjectId === subjectId && k.date === date)) }
    setProfile(updated)
    persist(updated, personalEntries, generatedNotes, userNotes, userFolders)
  }

  const saveFlashCards = (newCards: FlashCard[]) => {
    const noteIds = [...new Set(newCards.map((c) => c.noteId).filter(Boolean))]
    const kept = generatedFlashCards.filter((c) => !noteIds.includes(c.noteId))
    const updated = [...kept, ...newCards]
    setGeneratedFlashCards(updated)
    saveStorage({ ...loadStorage(), generatedFlashCards: updated })
    recordStudyDay()
  }

  const completeHomework = (id: string) => {
    const updated = [...completedHomeworkIds, id]
    setCompletedHomeworkIds(updated)
    saveStorage({ ...loadStorage(), completedHomeworkIds: updated })
  }

  const recordStudyDay = () => {
    const today = new Date().toISOString().slice(0, 10)
    if (appStats.lastStudyDate === today) return
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().slice(0, 10)
    const newStreak = appStats.lastStudyDate === yesterdayStr ? appStats.streak + 1 : 1
    const studiedDays = [...new Set([...appStats.studiedDays, today])].slice(-90)
    const updated: AppStats = { ...appStats, streak: newStreak, lastStudyDate: today, studiedDays }
    setAppStats(updated)
    saveStorage({ ...loadStorage(), appStats: updated })
  }

  const recordExam = (score: ExamScoreRecord) => {
    const updated: AppStats = {
      ...appStats,
      examCount: appStats.examCount + 1,
      examScores: [...appStats.examScores, score],
    }
    setAppStats(updated)
    saveStorage({ ...loadStorage(), appStats: updated })
    recordStudyDay()
  }

  const incrementScanCount = () => {
    const updated: AppStats = { ...appStats, scanCount: appStats.scanCount + 1 }
    setAppStats(updated)
    saveStorage({ ...loadStorage(), appStats: updated })
  }

  const addStandaloneHomework = (item: Omit<StandaloneHomeworkItem, 'id' | 'createdAt'>) => {
    const newItem: StandaloneHomeworkItem = {
      ...item,
      id: `standalone-hw-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      createdAt: new Date().toISOString(),
    }
    const updated = [...standaloneHomework, newItem]
    setStandaloneHomework(updated)
    saveStorage({ ...loadStorage(), standaloneHomework: updated })
  }

  const deleteFolder = (folderId: string) => {
    const updatedFolders = userFolders.filter((f) => f.id !== folderId && f.parentFolderId !== folderId)
    const updatedNotes = userNotes.filter((n) => n.folderId !== folderId)
    setUserFolders(updatedFolders)
    setUserNotes(updatedNotes)
    persist(profile, personalEntries, generatedNotes, updatedNotes, updatedFolders)
  }

  return (
    <UserContext.Provider
      value={{
        profile,
        isOnboarded: profile !== null,
        personalEntries,
        generatedNotes,
        userNotes,
        userFolders,
        generatedFlashCards,
        theme,
        setTheme,
        isPro,
        setIsPro,
        completeOnboarding,
        updateProfile,
        addEntry,
        removeEntry,
        saveGeneratedNote,
        addUserNote,
        saveNote,
        updateUserNote,
        addFolder,
        deleteFolder,
        saveToOhneFachFolder,
        saveFlashCards,
        addKlausurtermin,
        removeKlausurtermin,
        completedHomeworkIds,
        standaloneHomework,
        completeHomework,
        addStandaloneHomework,
        appStats,
        recordStudyDay,
        recordExam,
        incrementScanCount,
      }}
    >
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be within UserProvider')
  return ctx
}
