import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import type { FlashCard, GeneratedSmartNote, Lernzettel, Lernplan, SavedProbeklausur, UserFolder, UserNote, Stundenplan, AbiGradeEntry, AbiHalbjahr, AppStats, ExamScoreRecord } from '../types'
import { subjects, topics, halfYears } from '../data/mockData'
import { loadKcForUser, type KcSubjectData } from '../data/kcLoader'
import { supabase } from '../lib/supabase'
import {
  loadUserDataFromSupabase, migrateToSupabase,
  syncProfile, syncAppStats,
  syncFolder, syncFoldersBatch, deleteFoldersFromDB,
  syncNote, syncNotesBatch, deleteNotesFromDB,
  syncSmartNote,
  syncFlashCardsBatch,
  syncLernzettel,
  syncProbeklausur, deleteProbeklausurFromDB,
  syncLernplaeneBatch, deleteLernplanFromDB,
  syncEntry, syncEntriesBatch, deleteEntryFromDB,
  syncHomeworkBatch, syncCompletedHomework,
} from '../lib/supabaseSync'

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
  lkFaecher?: string[]
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
  lernzettel?: Lernzettel[]
  savedProbeklausuren?: SavedProbeklausur[]
  lernplaene?: Lernplan[]
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
  applyFaecherChanges: (newFaecher: string[], deletedFaecherIds: string[]) => void
  completedHomeworkIds: string[]
  standaloneHomework: StandaloneHomeworkItem[]
  completeHomework: (id: string) => void
  addStandaloneHomework: (item: Omit<StandaloneHomeworkItem, 'id' | 'createdAt'>) => void
  appStats: AppStats
  recordStudyDay: () => void
  recordExam: (score: ExamScoreRecord) => void
  incrementScanCount: () => void
  kcCache: Record<string, KcSubjectData>
  kcFallbacks: string[]
  getKc: (subjectId: string) => KcSubjectData | null
  loadKcData: () => Promise<void>
  lernzettel: Lernzettel[]
  saveLernzettel: (lz: Lernzettel) => void
  savedProbeklausuren: SavedProbeklausur[]
  saveProbeklausur: (pk: SavedProbeklausur) => void
  deleteSavedProbeklausur: (id: string) => void
  lernplaene: Lernplan[]
  saveLernplan: (plan: Lernplan) => void
  deleteLernplan: (id: string) => void
  authUser: User | null
  authLoading: boolean
  signOut: () => Promise<void>
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

  const [authUser, setAuthUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Auth]', event, session?.user?.email ?? 'no user')
      setAuthUser(session?.user ?? null)
      setAuthLoading(false)

      if (event === 'SIGNED_IN' && session?.user) {
        const userId = session.user.id

        // Immediately populate from localStorage for instant UI
        const s = loadStorage()
        setProfile(s.profile ?? null)
        setThemeState(s.theme ?? 'dark')
        setIsProState(s.isPro ?? false)
        setPersonalEntries(s.personalEntries ?? [])
        setGeneratedNotes(s.generatedNotes ?? {})
        setUserNotes(s.userNotes ?? [])
        setGeneratedFlashCards(s.generatedFlashCards ?? [])
        setCompletedHomeworkIds(s.completedHomeworkIds ?? [])
        setStandaloneHomework(s.standaloneHomework ?? [])
        setAppStats(s.appStats ?? DEFAULT_APP_STATS)
        setLernzettel(s.lernzettel ?? [])
        setSavedProbeklausuren(s.savedProbeklausuren ?? [])
        setLernplaene(s.lernplaene ?? [])
        let folders = s.userFolders ?? []
        if (folders.length === 0 && s.profile) {
          folders = generateDefaultFolders(s.profile)
          saveStorage({ ...s, userFolders: folders })
        }
        setUserFolders(folders)

        // Async: load from Supabase (authoritative) or migrate if empty
        void (async () => {
          const supabaseData = await loadUserDataFromSupabase(userId)
          if (supabaseData) {
            // Supabase has data → use it (supports multi-device)
            setProfile(supabaseData.profile)
            setThemeState(supabaseData.theme)
            setIsProState(supabaseData.isPro)
            setPersonalEntries(supabaseData.personalEntries)
            setGeneratedNotes(supabaseData.generatedNotes)
            setUserNotes(supabaseData.userNotes)
            setUserFolders(supabaseData.userFolders)
            setGeneratedFlashCards(supabaseData.generatedFlashCards)
            setCompletedHomeworkIds(supabaseData.completedHomeworkIds)
            setStandaloneHomework(supabaseData.standaloneHomework)
            setAppStats(supabaseData.appStats)
            setLernzettel(supabaseData.lernzettel)
            setSavedProbeklausuren(supabaseData.savedProbeklausuren)
            setLernplaene(supabaseData.lernplaene)
            // Cache Supabase data in localStorage
            saveStorage({
              profile: supabaseData.profile,
              theme: supabaseData.theme,
              isPro: supabaseData.isPro,
              appStats: supabaseData.appStats,
              userFolders: supabaseData.userFolders,
              userNotes: supabaseData.userNotes,
              generatedNotes: supabaseData.generatedNotes,
              generatedFlashCards: supabaseData.generatedFlashCards,
              lernzettel: supabaseData.lernzettel,
              savedProbeklausuren: supabaseData.savedProbeklausuren,
              lernplaene: supabaseData.lernplaene,
              personalEntries: supabaseData.personalEntries,
              standaloneHomework: supabaseData.standaloneHomework,
              completedHomeworkIds: supabaseData.completedHomeworkIds,
            })
          } else if (s.profile && s.profile.faecher?.length) {
            // Supabase empty, localStorage has onboarded data → migrate once
            await migrateToSupabase(userId, {
              profile: s.profile,
              theme: s.theme ?? 'dark',
              isPro: s.isPro ?? false,
              appStats: s.appStats ?? DEFAULT_APP_STATS,
              userFolders: folders,
              userNotes: s.userNotes ?? [],
              generatedNotes: s.generatedNotes ?? {},
              generatedFlashCards: s.generatedFlashCards ?? [],
              lernzettel: s.lernzettel ?? [],
              savedProbeklausuren: s.savedProbeklausuren ?? [],
              lernplaene: s.lernplaene ?? [],
              personalEntries: s.personalEntries ?? [],
              standaloneHomework: s.standaloneHomework ?? [],
              completedHomeworkIds: s.completedHomeworkIds ?? [],
            })
          }
        })()
      }
    })
    return () => subscription.unsubscribe()
  }, [])

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
  const [kcCache, setKcCache] = useState<Record<string, KcSubjectData>>({})
  const [kcFallbacks, setKcFallbacks] = useState<string[]>([])
  const [lernzettel, setLernzettel] = useState<Lernzettel[]>(stored.lernzettel ?? [])
  const [savedProbeklausuren, setSavedProbeklausuren] = useState<SavedProbeklausur[]>(stored.savedProbeklausuren ?? [])
  const [lernplaene, setLernplaene] = useState<Lernplan[]>(stored.lernplaene ?? [])

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
  ) => saveStorage({ ...loadStorage(), profile: p ?? undefined, personalEntries: e, generatedNotes: n, userNotes: un, userFolders: uf, theme: t ?? theme, isPro: pro ?? isPro })

  const setTheme = (t: AppTheme) => {
    setThemeState(t)
    persist(profile, personalEntries, generatedNotes, userNotes, userFolders, t)
    if (authUser && profile) void syncProfile(authUser.id, profile, t, isPro)
  }

  const setIsPro = (v: boolean) => {
    setIsProState(v)
    saveStorage({ ...loadStorage(), isPro: v })
    if (authUser && profile) void syncProfile(authUser.id, profile, theme, v)
  }

  const loadKcData = useCallback(async (targetProfile?: UserProfile) => {
    const p = targetProfile ?? profile
    if (!p?.bundeslandId || !p.faecher?.length) return
    const cache = await loadKcForUser(p.bundeslandId, p.faecher)
    setKcCache(cache)
    setKcFallbacks(
      Object.entries(cache)
        .filter(([, d]) => d.isFallback)
        .map(([id]) => id),
    )
  }, [profile])

  useEffect(() => {
    if (profile && Object.keys(kcCache).length === 0) {
      void loadKcData()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.bundeslandId])

  const getKc = useCallback(
    (subjectId: string): KcSubjectData | null => kcCache[subjectId] ?? null,
    [kcCache],
  )

  const completeOnboarding = (p: UserProfile, prebuiltFolders?: UserFolder[]) => {
    const generated = prebuiltFolders ?? generateDefaultFolders(p)
    // Preserve any folders created before onboarding (e.g. ohne-fach from file import step)
    const preserved = userFolders.filter((f) => !f.isAutoGenerated)
    const merged = [...generated, ...preserved]
    setProfile(p)
    setUserFolders(merged)
    persist(p, personalEntries, generatedNotes, userNotes, merged)
    void loadKcData(p)
    if (authUser) {
      void syncProfile(authUser.id, p, theme, isPro)
      if (merged.length) void syncFoldersBatch(authUser.id, merged)
    }
  }

  const updateProfile = (data: Partial<UserProfile>) => {
    if (!profile) return
    const updated = { ...profile, ...data }
    setProfile(updated)
    persist(updated, personalEntries, generatedNotes, userNotes, userFolders)
    if (authUser) void syncProfile(authUser.id, updated, theme, isPro)
  }

  const addEntry = (entry: PersonalEntry) => {
    const updated = [...personalEntries, entry]
    setPersonalEntries(updated)
    persist(profile, updated, generatedNotes, userNotes, userFolders)
    if (authUser) void syncEntry(authUser.id, entry)
  }

  const removeEntry = (id: string) => {
    const updated = personalEntries.filter((e) => e.id !== id)
    setPersonalEntries(updated)
    persist(profile, updated, generatedNotes, userNotes, userFolders)
    if (authUser) void deleteEntryFromDB(authUser.id, id)
  }

  const saveGeneratedNote = (lessonId: string, note: GeneratedSmartNote) => {
    const updated = { ...generatedNotes, [lessonId]: note }
    setGeneratedNotes(updated)
    persist(profile, personalEntries, updated, userNotes, userFolders)
    if (authUser) void syncSmartNote(authUser.id, lessonId, note)
  }

  const addUserNote = (note: UserNote) => {
    const updated = [...userNotes, note]
    setUserNotes(updated)
    persist(profile, personalEntries, generatedNotes, updated, userFolders)
    recordStudyDay()
    if (authUser) void syncNote(authUser.id, note)
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
    if (authUser) {
      void syncNote(authUser.id, note)
      if (generated) void syncSmartNote(authUser.id, note.id, generated)
    }
  }

  const updateUserNote = (note: UserNote) => {
    const updated = userNotes.map((n) => (n.id === note.id ? note : n))
    setUserNotes(updated)
    persist(profile, personalEntries, generatedNotes, updated, userFolders)
    if (authUser) void syncNote(authUser.id, note)
  }

  const addFolder = (folder: UserFolder) => {
    const updated = [...userFolders, folder]
    setUserFolders(updated)
    persist(profile, personalEntries, generatedNotes, userNotes, updated)
    if (authUser) void syncFolder(authUser.id, folder)
  }

  const saveToOhneFachFolder = (note: UserNote, generated?: GeneratedSmartNote) => {
    const folderExists = userFolders.some((f) => f.id === 'folder-no-subject')
    const newFolder: UserFolder = { id: 'folder-no-subject', subjectId: 'ohne-fach', name: 'Schnellnotizen', createdAt: new Date().toISOString() }
    const updatedFolders = folderExists ? userFolders : [...userFolders, newFolder]
    const updatedNotes = [...userNotes, note]
    const updatedGenerated = generated
      ? { ...generatedNotes, [note.id]: generated }
      : generatedNotes
    if (!folderExists) setUserFolders(updatedFolders)
    setUserNotes(updatedNotes)
    if (generated) setGeneratedNotes(updatedGenerated)
    persist(profile, personalEntries, updatedGenerated, updatedNotes, updatedFolders)
    if (authUser) {
      if (!folderExists) void syncFolder(authUser.id, newFolder)
      void syncNote(authUser.id, note)
      if (generated) void syncSmartNote(authUser.id, note.id, generated)
    }
  }

  const addKlausurtermin = (termin: KlausurTermin) => {
    if (!profile) return
    const updated = { ...profile, klausurtermine: [...(profile.klausurtermine ?? []), termin] }
    setProfile(updated)
    persist(updated, personalEntries, generatedNotes, userNotes, userFolders)
    if (authUser) void syncProfile(authUser.id, updated, theme, isPro)
  }

  const removeKlausurtermin = (subjectId: string, date: string) => {
    if (!profile) return
    const updated = { ...profile, klausurtermine: (profile.klausurtermine ?? []).filter((k) => !(k.subjectId === subjectId && k.date === date)) }
    setProfile(updated)
    persist(updated, personalEntries, generatedNotes, userNotes, userFolders)
    if (authUser) void syncProfile(authUser.id, updated, theme, isPro)
  }

  const saveFlashCards = (newCards: FlashCard[]) => {
    const noteIds = [...new Set(newCards.map((c) => c.noteId).filter(Boolean))]
    const kept = generatedFlashCards.filter((c) => !noteIds.includes(c.noteId))
    const updated = [...kept, ...newCards]
    setGeneratedFlashCards(updated)
    saveStorage({ ...loadStorage(), generatedFlashCards: updated })
    recordStudyDay()
    if (authUser) void syncFlashCardsBatch(authUser.id, updated)
  }

  const saveLernzettel = (lz: Lernzettel) => {
    const folderId = `folder-lernzettel-${lz.subjectId}`
    const folderExists = userFolders.some((f) => f.id === folderId)
    const newFolder: UserFolder = { id: folderId, subjectId: lz.subjectId, name: 'Lernzettel', createdAt: lz.generatedAt, isAutoGenerated: false }
    const updatedFolders = folderExists ? userFolders : [...userFolders, newFolder]
    const note: UserNote = {
      id: lz.userNoteId,
      subjectId: lz.subjectId,
      folderId,
      title: lz.title,
      content: lz.content,
      createdAt: lz.generatedAt,
    }
    const updatedNotes = [...userNotes, note]
    const updatedLernzettel = [...lernzettel, lz]
    if (!folderExists) setUserFolders(updatedFolders)
    setUserNotes(updatedNotes)
    setLernzettel(updatedLernzettel)
    saveStorage({ ...loadStorage(), userFolders: updatedFolders, userNotes: updatedNotes, lernzettel: updatedLernzettel })
    recordStudyDay()
    if (authUser) {
      if (!folderExists) void syncFolder(authUser.id, newFolder)
      void syncNote(authUser.id, note)
      void syncLernzettel(authUser.id, lz)
    }
  }

  const saveProbeklausur = (pk: SavedProbeklausur) => {
    const updated = [...savedProbeklausuren, pk]
    setSavedProbeklausuren(updated)
    saveStorage({ ...loadStorage(), savedProbeklausuren: updated })
    recordExam({ id: pk.id, date: pk.completedAt, subjectId: pk.subjectId, gradeLabel: pk.gradeLabel, totalNP: pk.totalNP, source: 'probeklausur' })
    if (authUser) void syncProbeklausur(authUser.id, pk)
  }

  const deleteSavedProbeklausur = (id: string) => {
    const updated = savedProbeklausuren.filter((p) => p.id !== id)
    setSavedProbeklausuren(updated)
    saveStorage({ ...loadStorage(), savedProbeklausuren: updated })
    if (authUser) void deleteProbeklausurFromDB(authUser.id, id)
  }

  const saveLernplan = (plan: Lernplan) => {
    const deactivated = lernplaene.map((p) => ({ ...p, isActive: false }))
    const existing = deactivated.findIndex((p) => p.id === plan.id)
    const updated = existing >= 0
      ? deactivated.map((p) => p.id === plan.id ? { ...plan, isActive: true } : p)
      : [...deactivated, { ...plan, isActive: true }]
    setLernplaene(updated)
    saveStorage({ ...loadStorage(), lernplaene: updated })
    if (authUser) void syncLernplaeneBatch(authUser.id, updated)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
    setPersonalEntries([])
    setGeneratedNotes({})
    setUserNotes([])
    setUserFolders([])
    setGeneratedFlashCards([])
    setCompletedHomeworkIds([])
    setStandaloneHomework([])
    setAppStats(DEFAULT_APP_STATS)
    setLernzettel([])
    setSavedProbeklausuren([])
    setLernplaene([])
  }

  const deleteLernplan = (id: string) => {
    const updated = lernplaene.filter((p) => p.id !== id)
    setLernplaene(updated)
    saveStorage({ ...loadStorage(), lernplaene: updated })
    if (authUser) void deleteLernplanFromDB(authUser.id, id)
  }

  const completeHomework = (id: string) => {
    const updated = [...completedHomeworkIds, id]
    setCompletedHomeworkIds(updated)
    saveStorage({ ...loadStorage(), completedHomeworkIds: updated })
    if (authUser) void syncCompletedHomework(authUser.id, [id])
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
    if (authUser) void syncAppStats(authUser.id, updated)
  }

  const recordExam = (score: ExamScoreRecord) => {
    const updated: AppStats = {
      ...appStats,
      examCount: appStats.examCount + 1,
      examScores: [...appStats.examScores, score],
    }
    setAppStats(updated)
    saveStorage({ ...loadStorage(), appStats: updated })
    if (authUser) void syncAppStats(authUser.id, updated)
    recordStudyDay()
  }

  const incrementScanCount = () => {
    const updated: AppStats = { ...appStats, scanCount: appStats.scanCount + 1 }
    setAppStats(updated)
    saveStorage({ ...loadStorage(), appStats: updated })
    if (authUser) void syncAppStats(authUser.id, updated)
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
    if (authUser) void syncHomeworkBatch(authUser.id, [newItem])
  }

  const deleteFolder = (folderId: string) => {
    const childIds = userFolders.filter((f) => f.parentFolderId === folderId).map((f) => f.id)
    const deletedNoteIds = userNotes.filter((n) => n.folderId === folderId).map((n) => n.id)
    const updatedFolders = userFolders.filter((f) => f.id !== folderId && f.parentFolderId !== folderId)
    const updatedNotes = userNotes.filter((n) => n.folderId !== folderId)
    setUserFolders(updatedFolders)
    setUserNotes(updatedNotes)
    persist(profile, personalEntries, generatedNotes, updatedNotes, updatedFolders)
    if (authUser) {
      void deleteFoldersFromDB(authUser.id, [folderId, ...childIds])
      if (deletedNoteIds.length) void deleteNotesFromDB(authUser.id, deletedNoteIds)
    }
  }

  const applyFaecherChanges = (newFaecher: string[], deletedFaecherIds: string[]) => {
    if (!profile) return
    const deletedFolderIds = new Set(
      userFolders.filter((f) => deletedFaecherIds.includes(f.subjectId)).map((f) => f.id)
    )
    const deletedNoteIds = userNotes
      .filter((n) => deletedFaecherIds.includes(n.subjectId ?? '') || deletedFolderIds.has(n.folderId ?? ''))
      .map((n) => n.id)
    const updatedFolders = userFolders.filter((f) => !deletedFolderIds.has(f.id))
    const updatedNotes = userNotes.filter(
      (n) => !deletedFaecherIds.includes(n.subjectId ?? '') && !deletedFolderIds.has(n.folderId ?? '')
    )
    const addedSubjects = newFaecher.filter((id) => !profile.faecher.includes(id))
    const newFolders = addedSubjects.length > 0
      ? generateDefaultFolders({ ...profile, faecher: addedSubjects })
      : []
    const finalFolders = [...updatedFolders, ...newFolders]
    const updatedProfile = { ...profile, faecher: newFaecher }
    setProfile(updatedProfile)
    setUserFolders(finalFolders)
    setUserNotes(updatedNotes)
    persist(updatedProfile, personalEntries, generatedNotes, updatedNotes, finalFolders)
    if (authUser) {
      void syncProfile(authUser.id, updatedProfile, theme, isPro)
      if (deletedFolderIds.size) void deleteFoldersFromDB(authUser.id, [...deletedFolderIds])
      if (deletedNoteIds.length) void deleteNotesFromDB(authUser.id, deletedNoteIds)
      if (newFolders.length) void syncFoldersBatch(authUser.id, newFolders)
    }
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
        applyFaecherChanges,
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
        kcCache,
        kcFallbacks,
        getKc,
        loadKcData,
        lernzettel,
        saveLernzettel,
        savedProbeklausuren,
        saveProbeklausur,
        deleteSavedProbeklausur,
        lernplaene,
        saveLernplan,
        deleteLernplan,
        authUser,
        authLoading,
        signOut,
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
