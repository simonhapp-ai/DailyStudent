import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import type { FlashCard, GeneratedSmartNote, Lernzettel, Lernplan, SavedProbeklausur, InProgressProbeklausur, UserFolder, UserNote, Stundenplan, AbiGradeEntry, AbiHalbjahr, AppStats, ExamScoreRecord } from '../types'
import { subjects, topics, halfYears } from '../data/mockData'
import { loadKcForUser, type KcSubjectData } from '../data/kcLoader'
import { supabase } from '../lib/supabase'
import {
  loadUserDataFromSupabase, migrateToSupabase,
  syncProfile, syncGradeData, syncAppStats, grantCoinsRemote, buyStreakFreezeRemote,
  syncFolder, syncFoldersBatch, deleteFoldersFromDB,
  syncNote, deleteNotesFromDB,
  syncSmartNote,
  syncFlashCardsBatch,
  syncLernzettel,
  syncProbeklausur, deleteProbeklausurFromDB,
  syncLernplaeneBatch, deleteLernplanFromDB,
  syncEntry, syncEntriesBatch, deleteEntryFromDB,
  syncHomeworkBatch, syncCompletedHomework,
  retrySyncQueue, getSyncQueueStats,
  syncReferralCode,
} from '../lib/supabaseSync'

function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}
import { localizeNoteAttachments, deleteAttachmentsForNotes, migrateLegacyNoteAttachments } from '../lib/noteStorage'

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
  color?: string
  lernplanId?: string
}

export interface KlausurTermin {
  subjectId: string
  date: string
  topic?: string
}

export const COIN_VALUES = {
  LOGIN: 5,
  SMART_NOTE: 5,
  FLASHCARD_LEARNED: 10,
  BLURTING: 10,
  LERNZETTEL: 20,
  PROBEKLAUSUR: 50,
  LERNPLAN_DAY: 15,
} as const

export type CoinAction = keyof typeof COIN_VALUES

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
  notificationPrefs?: {
    klausurReminder: boolean
    lernplanReminder: boolean
    streakReminder: boolean
  }
  avatarEmoji?: string
  avatarBg?: string
  userType?: 'schüler' | 'student'
  customFaecher?: Array<{ id: string; name: string; icon?: string }>
}

export type AppTheme = 'light' | 'dark' | 'system'

const DEFAULT_APP_STATS: AppStats = {
  scanCount: 0,
  examCount: 0,
  streak: 0,
  lastStudyDate: null,
  studiedDays: [],
  examScores: [],
  coins: 0,
  cooldowns: [],
  streakFreezes: 0,
  freezeUsedDates: [],
}

interface StorageData {
  userId?: string
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
  inProgressProbeklausuren?: InProgressProbeklausur[]
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
  addEntries: (entries: PersonalEntry[]) => void
  removeEntry: (id: string) => void
  saveGeneratedNote: (lessonId: string, note: GeneratedSmartNote) => void
  addUserNote: (note: UserNote) => void
  saveNote: (note: UserNote, generated?: GeneratedSmartNote) => void
  updateUserNote: (note: UserNote) => void
  deleteUserNote: (noteId: string) => void
  addFolder: (folder: UserFolder) => void
  deleteFolder: (folderId: string) => void
  saveToOhneFachFolder: (note: UserNote, generated?: GeneratedSmartNote) => void
  saveFlashCards: (newCards: FlashCard[]) => void
  addKlausurtermin: (termin: KlausurTermin) => void
  removeKlausurtermin: (subjectId: string, date: string) => void
  applyFaecherChanges: (newFaecher: string[], deletedFaecherIds: string[], newCustomFaecher?: Array<{ id: string; name: string; icon?: string }>) => void
  completedHomeworkIds: string[]
  standaloneHomework: StandaloneHomeworkItem[]
  completeHomework: (id: string) => void
  addStandaloneHomework: (item: Omit<StandaloneHomeworkItem, 'id' | 'createdAt'>) => void
  appStats: AppStats
  recordStudyDay: () => number
  recordExam: (score: ExamScoreRecord) => void
  addCoins: (action: CoinAction) => Promise<number>
  recordLogin: () => void
  buyStreakFreeze: () => Promise<boolean>
  debugSetCoins: (amount: number) => void
  incrementScanCount: () => void
  coinToastVisible: boolean
  coinToastAmount: number
  showCoinToast: (amount: number) => void
  hideCoinToast: () => void
  localAttachmentToastVisible: boolean
  showLocalAttachmentToast: () => void
  hideLocalAttachmentToast: () => void
  kcCache: Record<string, KcSubjectData>
  kcFallbacks: string[]
  getKc: (subjectId: string) => KcSubjectData | null
  loadKcData: () => Promise<void>
  lernzettel: Lernzettel[]
  saveLernzettel: (lz: Lernzettel) => void
  savedProbeklausuren: SavedProbeklausur[]
  saveProbeklausur: (pk: SavedProbeklausur) => void
  deleteSavedProbeklausur: (id: string) => void
  inProgressProbeklausuren: InProgressProbeklausur[]
  saveInProgressProbeklausur: (pk: InProgressProbeklausur) => void
  deleteInProgressProbeklausur: (id: string) => void
  lernplaene: Lernplan[]
  saveLernplan: (plan: Lernplan) => void
  deleteLernplan: (id: string) => void
  authUser: User | null
  authLoading: boolean
  supabaseDataLoading: boolean
  signOut: () => Promise<void>
  syncQueueStatus: { pending: number; failed: number }
  retrySyncQueue: () => Promise<void>
  referralCode: string | null
  referralCount: number
  trialEndsAt: string | null
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
  const isStudent = profile.userType === 'student' || profile.schulform === 'Universität'
  const klasse = parseInt(profile.klasse, 10)
  const isOberstufe = !isStudent && (profile.schultyp === 'g8' ? klasse >= 11 : klasse >= 12)

  for (const subjectId of profile.faecher) {
    if (isStudent) {
      // Semester structure for university students
      const semesters = ['1. Semester', '2. Semester', '3. Semester', '4. Semester']
      semesters.forEach((semName, i) => {
        folders.push({
          id: `folder-${subjectId}-sem${i + 1}`,
          subjectId,
          halfYearId: `sem${i + 1}`,
          name: semName,
          createdAt: now,
          isAutoGenerated: true,
        })
      })
    } else if (isOberstufe) {
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
  const [supabaseDataLoading, setSupabaseDataLoading] = useState(false)
  // Guard: only load Supabase data once per user session, not on every token refresh
  const loadedForUserId = useRef<string | null>(null)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Auth]', event, session?.user?.email ?? 'no user')
      setAuthUser(session?.user ?? null)
      setAuthLoading(false)

      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        const userId = session.user.id
        // Skip if we already loaded data for this user (e.g. background token refresh)
        if (loadedForUserId.current === userId) return
        loadedForUserId.current = userId

        // Only use localStorage cache if it belongs to this user
        const s = loadStorage()
        const cacheIsOwn = s.userId === userId
        if (!cacheIsOwn) {
          localStorage.removeItem(STORAGE_KEY)
        } else {
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
          setInProgressProbeklausuren(s.inProgressProbeklausuren ?? [])
          setLernplaene(s.lernplaene ?? [])
          let folders = s.userFolders ?? []
          if (folders.length === 0 && s.profile) {
            folders = generateDefaultFolders(s.profile)
            saveStorage({ ...s, userFolders: folders })
          }
          setUserFolders(folders)
        }

        // Async: load from Supabase (authoritative)
        setSupabaseDataLoading(true)
        void (async () => {
          try {
            const supabaseData = await loadUserDataFromSupabase(userId)
            if (supabaseData) {
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
              // Merge cooldowns: any coins/cooldowns added locally since the fetch started
              // must survive — otherwise the stale Supabase response overwrites them.
              const localCooldowns = loadStorage().appStats?.cooldowns ?? []
              const mergedStats: AppStats = {
                ...supabaseData.appStats,
                cooldowns: [...new Set([...(supabaseData.appStats.cooldowns ?? []), ...localCooldowns])],
              }
              setAppStats(mergedStats)
              setLernzettel(supabaseData.lernzettel)
              setSavedProbeklausuren(supabaseData.savedProbeklausuren)
              setLernplaene(supabaseData.lernplaene)
              setReferralCode(supabaseData.referralCode)
              setReferralCount(supabaseData.referralCount)
              setTrialEndsAt(supabaseData.trialEndsAt)
              if (!supabaseData.referralCode) {
                const newCode = generateReferralCode()
                setReferralCode(newCode)
                void syncReferralCode(userId, newCode)
              }
              saveStorage({
                userId,
                profile: supabaseData.profile,
                theme: supabaseData.theme,
                isPro: supabaseData.isPro,
                appStats: mergedStats,
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
              // One-time cleanup: notes synced before the IndexedDB switch still carry
              // full base64 in Postgres — localize them now and shrink that row on next sync.
              const legacyMigration = migrateLegacyNoteAttachments(supabaseData.userNotes)
              if (legacyMigration) {
                setUserNotes(legacyMigration.notes)
                saveStorage({ ...loadStorage(), userNotes: legacyMigration.notes })
                for (const note of legacyMigration.changed) void syncNote(userId, note)
              }
            } else if (cacheIsOwn && s.profile && s.profile.faecher?.length) {
              // Supabase empty, localStorage has THIS user's onboarded data → migrate once
              await migrateToSupabase(userId, {
                profile: s.profile,
                theme: s.theme ?? 'dark',
                isPro: s.isPro ?? false,
                appStats: s.appStats ?? DEFAULT_APP_STATS,
                userFolders: s.userFolders ?? [],
                userNotes: s.userNotes ?? [],
                generatedNotes: s.generatedNotes ?? {},
                generatedFlashCards: s.generatedFlashCards ?? [],
                lernzettel: s.lernzettel ?? [],
                savedProbeklausuren: s.savedProbeklausuren ?? [],
                lernplaene: s.lernplaene ?? [],
                personalEntries: s.personalEntries ?? [],
                standaloneHomework: s.standaloneHomework ?? [],
                completedHomeworkIds: s.completedHomeworkIds ?? [],
                referralCode: null,
                referralCount: 0,
                trialEndsAt: null,
              })
            }
          } finally {
            setSupabaseDataLoading(false)
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
  const [syncQueueStatus, setSyncQueueStatus] = useState({ pending: 0, failed: 0 })

  // Check sync queue status on mount
  useEffect(() => {
    setSyncQueueStatus(getSyncQueueStats())
  }, [])

  // Retry sync queue when auth user changes
  useEffect(() => {
    if (authUser) {
      void (async () => {
        const result = await retrySyncQueue(authUser.id)
        setSyncQueueStatus(getSyncQueueStats())
        if (result.success > 0 || result.failed > 0) {
          console.log(`[Sync] Queue retry: ${result.success} success, ${result.failed} failed`)
        }
      })()
    }
  }, [authUser?.id])
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const [referralCount, setReferralCount] = useState(0)
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null)

  const [coinToastVisible, setCoinToastVisible] = useState(false)
  const [coinToastAmount, setCoinToastAmount] = useState(0)

  const showCoinToast = (amount: number) => {
    if (amount <= 0) return
    setCoinToastAmount(amount)
    setCoinToastVisible(true)
  }

  const hideCoinToast = () => setCoinToastVisible(false)

  const [localAttachmentToastVisible, setLocalAttachmentToastVisible] = useState(false)
  const showLocalAttachmentToast = () => setLocalAttachmentToastVisible(true)
  const hideLocalAttachmentToast = () => setLocalAttachmentToastVisible(false)

  const [lernzettel, setLernzettel] = useState<Lernzettel[]>(stored.lernzettel ?? [])
  const [savedProbeklausuren, setSavedProbeklausuren] = useState<SavedProbeklausur[]>(stored.savedProbeklausuren ?? [])
  const [inProgressProbeklausuren, setInProgressProbeklausuren] = useState<InProgressProbeklausur[]>(stored.inProgressProbeklausuren ?? [])
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
    // Mark isDevMode so Supabase trusts profiles.is_pro on next load (loadUserDataFromSupabase
    // only reads is_pro from profiles when is_dev_mode = true; otherwise it uses subscriptions).
    const devProfile = profile ? { ...profile, isDevMode: true } : profile
    setProfile(devProfile)
    saveStorage({ ...loadStorage(), isPro: v, profile: devProfile ?? undefined })
    if (authUser && devProfile) void syncProfile(authUser.id, devProfile, theme, v)
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

  // Per-session guard so the login bonus only fires once even if deps re-trigger
  const loginBonusGrantedRef = useRef(false)
  useEffect(() => {
    loginBonusGrantedRef.current = false
  }, [authUser?.id])

  // Grant daily login bonus AFTER Supabase data has loaded.
  // Firing before the load completes caused a race: the Supabase response (fetched before
  // addCoins ran) would overwrite localStorage with stale data, erasing the cooldown key —
  // so every login appeared to be the first one of the day.
  useEffect(() => {
    if (authUser && profile && !supabaseDataLoading && !loginBonusGrantedRef.current) {
      loginBonusGrantedRef.current = true
      recordLogin()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.id, supabaseDataLoading, !!profile])

  // Pro perk: one free Streak Freeze per calendar month.
  // Uses the same cooldowns array as coins — key FREE_FREEZE:YYYY-MM ensures
  // it only fires once per month even across sessions/devices.
  const monthlyFreezeGrantedRef = useRef(false)
  useEffect(() => {
    monthlyFreezeGrantedRef.current = false
  }, [authUser?.id])

  useEffect(() => {
    if (!authUser || !profile || supabaseDataLoading || monthlyFreezeGrantedRef.current) return
    const isProNow = isPro || (trialEndsAt ? new Date(trialEndsAt) > new Date() : false)
    if (!isProNow) return
    const thisMonth = new Date().toISOString().slice(0, 7)
    const cooldownKey = `FREE_FREEZE:${thisMonth}`
    const current = loadStorage().appStats ?? DEFAULT_APP_STATS
    if ((current.cooldowns ?? []).includes(cooldownKey)) return
    monthlyFreezeGrantedRef.current = true
    const updated: AppStats = {
      ...current,
      streakFreezes: (current.streakFreezes ?? 0) + 1,
      cooldowns: [...(current.cooldowns ?? []), cooldownKey],
    }
    setAppStats(updated)
    saveStorage({ ...loadStorage(), appStats: updated })
    if (authUser) void syncAppStats(authUser.id, updated)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.id, isPro, trialEndsAt, supabaseDataLoading, !!profile])

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
      if (!referralCode) {
        const newCode = generateReferralCode()
        setReferralCode(newCode)
        void syncReferralCode(authUser.id, newCode)
      }
    }
  }

  const updateProfile = (data: Partial<UserProfile>) => {
    if (!profile) return
    const updated = { ...profile, ...data }
    setProfile(updated)
    persist(updated, personalEntries, generatedNotes, userNotes, userFolders)
    if (authUser) {
      void syncProfile(authUser.id, updated, theme, isPro)
      // Grade data gets its own dedicated sync to prevent profile-sync races overwriting it
      if (data.abiHalbjahre !== undefined) {
        void syncGradeData(authUser.id, data.abiHalbjahre ?? [])
      }
    }
  }

  const addEntry = (entry: PersonalEntry) => {
    const updated = [...personalEntries, entry]
    setPersonalEntries(updated)
    persist(profile, updated, generatedNotes, userNotes, userFolders)
    if (authUser) void syncEntry(authUser.id, entry)
  }

  const addEntries = (newEntries: PersonalEntry[]) => {
    const updated = [...personalEntries, ...newEntries]
    setPersonalEntries(updated)
    saveStorage({ ...loadStorage(), personalEntries: updated })
    if (authUser) void syncEntriesBatch(authUser.id, newEntries)
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

  const addUserNote = (rawNote: UserNote) => {
    const note = localizeNoteAttachments(rawNote)
    const updated = [...userNotes, note]
    setUserNotes(updated)
    persist(profile, personalEntries, generatedNotes, updated, userFolders)
    if (authUser) void syncNote(authUser.id, note)
  }

  const saveNote = (rawNote: UserNote, generated?: GeneratedSmartNote) => {
    const note = localizeNoteAttachments(rawNote)
    const updatedNotes = [...userNotes, note]
    const updatedGenerated = generated
      ? { ...generatedNotes, [note.id]: generated }
      : generatedNotes
    setUserNotes(updatedNotes)
    if (generated) setGeneratedNotes(updatedGenerated)
    persist(profile, personalEntries, updatedGenerated, updatedNotes, userFolders)
    if (authUser) {
      void syncNote(authUser.id, note)
      if (generated) void syncSmartNote(authUser.id, note.id, generated)
    }
  }

  const updateUserNote = (rawNote: UserNote) => {
    const note = localizeNoteAttachments(rawNote)
    const updated = userNotes.map((n) => (n.id === note.id ? note : n))
    setUserNotes(updated)
    persist(profile, personalEntries, generatedNotes, updated, userFolders)
    if (authUser) void syncNote(authUser.id, note)
  }

  const deleteUserNote = (noteId: string) => {
    const deletedNote = userNotes.find((n) => n.id === noteId)
    const updatedNotes = userNotes.filter((n) => n.id !== noteId)
    const updatedGenerated = { ...generatedNotes }
    delete updatedGenerated[noteId]
    setUserNotes(updatedNotes)
    setGeneratedNotes(updatedGenerated)
    persist(profile, personalEntries, updatedGenerated, updatedNotes, userFolders)
    if (deletedNote) void deleteAttachmentsForNotes([deletedNote])
    if (authUser) void deleteNotesFromDB(authUser.id, [noteId])
  }

  const addFolder = (folder: UserFolder) => {
    const updated = [...userFolders, folder]
    setUserFolders(updated)
    persist(profile, personalEntries, generatedNotes, userNotes, updated)
    if (authUser) void syncFolder(authUser.id, folder)
  }

  const saveToOhneFachFolder = (rawNote: UserNote, generated?: GeneratedSmartNote) => {
    const note = localizeNoteAttachments(rawNote)
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
    // Only mode 2 (Vollständige 90-Min-Klausur) earns coins
    if (pk.mode === 2) {
      void addCoins('PROBEKLAUSUR').then((coinGain) => { if (coinGain > 0) showCoinToast(coinGain) })
    }
    if (authUser) void syncProbeklausur(authUser.id, pk)
  }

  const deleteSavedProbeklausur = (id: string) => {
    const updated = savedProbeklausuren.filter((p) => p.id !== id)
    setSavedProbeklausuren(updated)
    saveStorage({ ...loadStorage(), savedProbeklausuren: updated })
    if (authUser) void deleteProbeklausurFromDB(authUser.id, id)
  }

  const saveInProgressProbeklausur = (pk: InProgressProbeklausur) => {
    const updated = inProgressProbeklausuren.some((p) => p.id === pk.id)
      ? inProgressProbeklausuren.map((p) => p.id === pk.id ? pk : p)
      : [...inProgressProbeklausuren, pk]
    setInProgressProbeklausuren(updated)
    saveStorage({ ...loadStorage(), inProgressProbeklausuren: updated })
  }

  const deleteInProgressProbeklausur = (id: string) => {
    const updated = inProgressProbeklausuren.filter((p) => p.id !== id)
    setInProgressProbeklausuren(updated)
    saveStorage({ ...loadStorage(), inProgressProbeklausuren: updated })
  }

  const saveLernplan = (plan: Lernplan) => {
    const existing = lernplaene.findIndex((p) => p.id === plan.id)
    const updated = existing >= 0
      ? lernplaene.map((p) => p.id === plan.id ? plan : p)
      : [...lernplaene, plan]
    setLernplaene(updated)
    saveStorage({ ...loadStorage(), lernplaene: updated })
    if (authUser) void syncLernplaeneBatch(authUser.id, updated)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    loadedForUserId.current = null
    localStorage.removeItem(STORAGE_KEY)
    setProfile(null)
    setIsProState(false)
    setThemeState('dark')
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
    const updatedPlans = lernplaene.filter((p) => p.id !== id)
    const removedEntryIds = personalEntries.filter((e) => e.lernplanId === id).map((e) => e.id)
    const updatedEntries = personalEntries.filter((e) => e.lernplanId !== id)
    setLernplaene(updatedPlans)
    setPersonalEntries(updatedEntries)
    saveStorage({ ...loadStorage(), lernplaene: updatedPlans, personalEntries: updatedEntries })
    if (authUser) {
      void deleteLernplanFromDB(authUser.id, id)
      removedEntryIds.forEach((eid) => void deleteEntryFromDB(authUser.id, eid))
    }
  }

  const completeHomework = (id: string) => {
    const updated = [...completedHomeworkIds, id]
    setCompletedHomeworkIds(updated)
    saveStorage({ ...loadStorage(), completedHomeworkIds: updated })
    if (authUser) void syncCompletedHomework(authUser.id, [id])
  }

  // All stat functions read from loadStorage() rather than the React state closure
  // to avoid stale-state bugs when multiple functions run in the same event handler.

  const recordStudyDay = (): number => {
    const today = new Date().toISOString().slice(0, 10)
    const current = loadStorage().appStats ?? DEFAULT_APP_STATS
    if (current.lastStudyDate === today) return 0

    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    const dayBeforeYesterday = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10)

    let newStreak: number
    let freezeUsedDates = current.freezeUsedDates ?? []
    let streakFreezes = current.streakFreezes ?? 0

    if (current.lastStudyDate === yesterday) {
      // Normal: studied yesterday, streak continues
      newStreak = current.streak + 1
    } else if (
      current.lastStudyDate === dayBeforeYesterday &&
      streakFreezes > 0 &&
      !freezeUsedDates.includes(yesterday)
    ) {
      // Missed exactly 1 day + freeze available → auto-use freeze
      newStreak = current.streak + 1
      streakFreezes -= 1
      freezeUsedDates = [...freezeUsedDates.slice(-6), yesterday]
      showCoinToast(0) // toast suppressed but we could show freeze notification later
    } else {
      // Streak broken
      newStreak = 1
    }

    const studiedDays = [...new Set([...current.studiedDays, today])].slice(-90)

    // Streak milestones (bonus coins)
    let bonusCoins = 0
    if (newStreak === 5)  bonusCoins = 25
    if (newStreak === 10) bonusCoins = 50
    if (newStreak === 30) bonusCoins = 100
    if (newStreak === 60) bonusCoins = 500

    const updated: AppStats = {
      ...current,
      streak: newStreak,
      lastStudyDate: today,
      studiedDays,
      streakFreezes,
      freezeUsedDates,
      coins: (current.coins ?? 0) + bonusCoins,
    }
    setAppStats(updated)
    saveStorage({ ...loadStorage(), appStats: updated })
    if (authUser) void syncAppStats(authUser.id, updated)
    return bonusCoins
  }

  // Buy a streak freeze for 500 coins. Returns true if purchase succeeded.
  // Goes through an atomic server RPC when logged in — a client-side
  // read-modify-write would let two open tabs both "see" enough coins and
  // double-spend, since only the last write survives in the DB.
  const buyStreakFreeze = async (): Promise<boolean> => {
    const FREEZE_COST = 500

    if (authUser) {
      const result = await buyStreakFreezeRemote(authUser.id, FREEZE_COST)
      if (result) {
        const updated: AppStats = { ...(loadStorage().appStats ?? DEFAULT_APP_STATS), coins: result.coins, streakFreezes: result.streakFreezes }
        setAppStats(updated)
        saveStorage({ ...loadStorage(), appStats: updated })
        return result.success
      }
      // RPC unreachable (offline) — fall through to local-only optimistic path below
    }

    const current = loadStorage().appStats ?? DEFAULT_APP_STATS
    if ((current.coins ?? 0) < FREEZE_COST) return false
    const updated: AppStats = {
      ...current,
      coins: current.coins - FREEZE_COST,
      streakFreezes: (current.streakFreezes ?? 0) + 1,
    }
    setAppStats(updated)
    saveStorage({ ...loadStorage(), appStats: updated })
    if (authUser) void syncAppStats(authUser.id, updated)
    return true
  }

  // Dev-only: directly set coin balance (used by ProfilScreen slider)
  const debugSetCoins = (amount: number) => {
    const current = loadStorage().appStats ?? DEFAULT_APP_STATS
    const updated: AppStats = { ...current, coins: Math.max(0, Math.min(6000, amount)) }
    setAppStats(updated)
    saveStorage({ ...loadStorage(), appStats: updated })
  }

  // Grant daily login coins — call once per session, cooldown prevents duplicates
  const recordLogin = () => {
    void addCoins('LOGIN').then((gain) => { if (gain > 0) showCoinToast(gain) })
  }

  // Atomic via server RPC when logged in — the cooldown check-and-increment happens
  // under a row lock on app_stats, so two tabs/devices racing on the same daily
  // cooldown key serialize instead of both granting coins that only one write keeps.
  const addCoins = async (action: CoinAction): Promise<number> => {
    const today = new Date().toISOString().slice(0, 10)
    const cooldownKey = `${action}:${today}`
    const amount = COIN_VALUES[action]

    if (authUser) {
      const result = await grantCoinsRemote(authUser.id, amount, cooldownKey)
      if (result) {
        const updated: AppStats = { ...(loadStorage().appStats ?? DEFAULT_APP_STATS), coins: result.coins, cooldowns: result.cooldowns }
        setAppStats(updated)
        saveStorage({ ...loadStorage(), appStats: updated })
        return result.granted
      }
      // RPC unreachable (offline) — fall through to local-only optimistic path below
    }

    const current = loadStorage().appStats ?? DEFAULT_APP_STATS
    if ((current.cooldowns ?? []).includes(cooldownKey)) return 0
    const updated: AppStats = {
      ...current,
      coins: (current.coins ?? 0) + amount,
      cooldowns: [...(current.cooldowns ?? []), cooldownKey],
    }
    setAppStats(updated)
    saveStorage({ ...loadStorage(), appStats: updated })
    if (authUser) void syncAppStats(authUser.id, updated)
    return amount
  }

  const recordExam = (score: ExamScoreRecord) => {
    const current = loadStorage().appStats ?? DEFAULT_APP_STATS
    const updated: AppStats = {
      ...current,
      examCount: current.examCount + 1,
      examScores: [...current.examScores, score],
    }
    setAppStats(updated)
    saveStorage({ ...loadStorage(), appStats: updated })
    if (authUser) void syncAppStats(authUser.id, updated)
    recordStudyDay()
  }

  const incrementScanCount = () => {
    const current = loadStorage().appStats ?? DEFAULT_APP_STATS
    const updated: AppStats = { ...current, scanCount: current.scanCount + 1 }
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
    const deletedNotes = userNotes.filter((n) => n.folderId === folderId)
    const deletedNoteIds = deletedNotes.map((n) => n.id)
    const updatedFolders = userFolders.filter((f) => f.id !== folderId && f.parentFolderId !== folderId)
    const updatedNotes = userNotes.filter((n) => n.folderId !== folderId)
    setUserFolders(updatedFolders)
    setUserNotes(updatedNotes)
    persist(profile, personalEntries, generatedNotes, updatedNotes, updatedFolders)
    if (deletedNotes.length) void deleteAttachmentsForNotes(deletedNotes)
    if (authUser) {
      void deleteFoldersFromDB(authUser.id, [folderId, ...childIds])
      if (deletedNoteIds.length) void deleteNotesFromDB(authUser.id, deletedNoteIds)
    }
  }

  const applyFaecherChanges = (
    newFaecher: string[],
    deletedFaecherIds: string[],
    newCustomFaecher?: Array<{ id: string; name: string; icon?: string }>,
  ) => {
    if (!profile) return
    const deletedFolderIds = new Set(
      userFolders.filter((f) => deletedFaecherIds.includes(f.subjectId)).map((f) => f.id)
    )
    const deletedNotes = userNotes
      .filter((n) => deletedFaecherIds.includes(n.subjectId ?? '') || deletedFolderIds.has(n.folderId ?? ''))
    const deletedNoteIds = deletedNotes.map((n) => n.id)
    const updatedFolders = userFolders.filter((f) => !deletedFolderIds.has(f.id))
    const updatedNotes = userNotes.filter(
      (n) => !deletedFaecherIds.includes(n.subjectId ?? '') && !deletedFolderIds.has(n.folderId ?? '')
    )
    const addedSubjects = newFaecher.filter((id) => !profile.faecher.includes(id))
    const newFolders = addedSubjects.length > 0
      ? generateDefaultFolders({ ...profile, faecher: addedSubjects })
      : []
    const finalFolders = [...updatedFolders, ...newFolders]
    const resolvedCustomFaecher = newCustomFaecher !== undefined
      ? (newCustomFaecher.length > 0 ? newCustomFaecher : undefined)
      : profile.customFaecher
    const updatedProfile = { ...profile, faecher: newFaecher, customFaecher: resolvedCustomFaecher }
    setProfile(updatedProfile)
    setUserFolders(finalFolders)
    setUserNotes(updatedNotes)
    persist(updatedProfile, personalEntries, generatedNotes, updatedNotes, finalFolders)
    if (deletedNotes.length) void deleteAttachmentsForNotes(deletedNotes)
    if (authUser) {
      void syncProfile(authUser.id, updatedProfile, theme, isPro)
      if (deletedFolderIds.size) void deleteFoldersFromDB(authUser.id, [...deletedFolderIds])
      if (deletedNoteIds.length) void deleteNotesFromDB(authUser.id, deletedNoteIds)
      if (newFolders.length) void syncFoldersBatch(authUser.id, newFolders)
    }
  }

  const manualRetrySyncQueue = async () => {
    if (!authUser) return
    console.log('[Sync] Manual retry initiated')
    const result = await retrySyncQueue(authUser.id)
    setSyncQueueStatus(getSyncQueueStats())
    console.log(`[Sync] Manual retry: ${result.success} success, ${result.failed} failed`)
  }

  const effectiveIsPro = isPro || (trialEndsAt ? new Date(trialEndsAt) > new Date() : false)

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
        isPro: effectiveIsPro,
        setIsPro,
        completeOnboarding,
        updateProfile,
        addEntry,
        addEntries,
        removeEntry,
        saveGeneratedNote,
        addUserNote,
        saveNote,
        updateUserNote,
        deleteUserNote,
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
        addCoins,
        recordLogin,
        buyStreakFreeze,
        debugSetCoins,
        incrementScanCount,
        coinToastVisible,
        coinToastAmount,
        showCoinToast,
        hideCoinToast,
        localAttachmentToastVisible,
        showLocalAttachmentToast,
        hideLocalAttachmentToast,
        kcCache,
        kcFallbacks,
        getKc,
        loadKcData,
        lernzettel,
        saveLernzettel,
        savedProbeklausuren,
        saveProbeklausur,
        deleteSavedProbeklausur,
        inProgressProbeklausuren,
        saveInProgressProbeklausur,
        deleteInProgressProbeklausur,
        lernplaene,
        saveLernplan,
        deleteLernplan,
        authUser,
        authLoading,
        supabaseDataLoading,
        signOut,
        syncQueueStatus,
        retrySyncQueue: manualRetrySyncQueue,
        referralCode,
        referralCount,
        trialEndsAt,
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
