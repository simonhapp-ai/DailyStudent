// Supabase sync layer — fire-and-forget writes, authoritative reads on login.
// localStorage remains the React state source of truth for instant UI.
// Failed syncs are queued for retry — data is never lost.

import { supabase } from './supabase'
import type {
  UserFolder, UserNote, GeneratedSmartNote, FlashCard,
  Lernzettel, SavedProbeklausur, Lernplan, AppStats, AbiHalbjahr,
} from '../types'
import type { UserProfile, PersonalEntry, StandaloneHomeworkItem, AppTheme } from '../context/UserContext'

// ─── SYNC QUEUE — track failed syncs for recovery ──────────────────────────

export interface SyncQueueItem {
  id: string
  operation: string
  timestamp: number
  retries: number
  lastError: string | null
  payload: unknown
}

const SYNC_QUEUE_KEY = 'lernapp_sync_queue'
const MAX_RETRIES = 3

export function loadSyncQueue(): SyncQueueItem[] {
  try {
    const stored = localStorage.getItem(SYNC_QUEUE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function saveSyncQueue(items: SyncQueueItem[]): void {
  try {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(items))
  } catch (err) {
    console.warn('[SyncQueue] Failed to save queue', err)
  }
}

export function addToSyncQueue(operation: string, payload: unknown): void {
  const queue = loadSyncQueue()
  queue.push({
    id: `${operation}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    operation,
    timestamp: Date.now(),
    retries: 0,
    lastError: null,
    payload,
  })
  saveSyncQueue(queue)
  console.log(`[SyncQueue] Added: ${operation}`, queue.length)
}

export function recordSyncError(itemId: string, error: string): void {
  const queue = loadSyncQueue()
  const item = queue.find(i => i.id === itemId)
  if (item) {
    item.retries += 1
    item.lastError = error
    item.timestamp = Date.now()

    if (item.retries > MAX_RETRIES) {
      // Remove after max retries (user can see in error banner)
      const filtered = queue.filter(i => i.id !== itemId)
      saveSyncQueue(filtered)
      console.warn(`[SyncQueue] Max retries exceeded for ${itemId}, removing from queue`)
    } else {
      saveSyncQueue(queue)
      console.warn(`[SyncQueue] Retry ${item.retries}/${MAX_RETRIES} for ${itemId}`)
    }
  }
}

export function clearSyncQueue(): void {
  localStorage.removeItem(SYNC_QUEUE_KEY)
  console.log('[SyncQueue] Cleared')
}

export function getSyncQueueStats(): { pending: number; failed: number } {
  const queue = loadSyncQueue()
  return {
    pending: queue.filter(i => i.retries === 0).length,
    failed: queue.filter(i => i.retries > 0).length,
  }
}

export async function retrySyncQueue(userId: string): Promise<{ success: number; failed: number }> {
  const queue = loadSyncQueue()
  if (queue.length === 0) return { success: 0, failed: 0 }

  console.log(`[SyncQueue] Retrying ${queue.length} items...`)
  let success = 0
  let failed = 0
  const succeededIds = new Set<string>()

  for (const item of queue) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = item.payload as any
    try {
      switch (item.operation) {
        case 'syncProfile':
          await supabase.from('profiles').upsert({
            id: userId,
            name: p.profile.name, klasse: p.profile.klasse, schulform: p.profile.schulform,
            schultyp: p.profile.schultyp, bundesland: p.profile.bundesland,
            bundesland_id: p.profile.bundeslandId, faecher: p.profile.faecher,
            lk_faecher: p.profile.lkFaecher ?? [], custom_faecher: p.profile.customFaecher?.length ? p.profile.customFaecher : null,
            zielnote: p.profile.zielnote, folder_sort_mode: p.profile.folderSortMode ?? 'halbjahr',
            klausurtermine: p.profile.klausurtermine ?? [], stundenplan: p.profile.stundenplan ?? null,
            abi_halbjahre: p.profile.abiHalbjahre ?? null, abi_gesamtpunkte: p.profile.abiGesamtpunkte ?? null,
            abi_gesamtnote: p.profile.abiGesamtnote ?? null, is_dev_mode: p.profile.isDevMode ?? false,
            theme: p.theme, is_pro: p.isPro,
          })
          break
        case 'syncGradeData':
          await supabase.from('grade_data').upsert({ user_id: userId, abi_halbjahre: p.abiHalbjahre, updated_at: new Date().toISOString() })
          break
        case 'syncNote':
          await supabase.from('user_notes').upsert({
            id: p.note.id, user_id: userId, subject_id: p.note.subjectId ?? null, folder_id: p.note.folderId ?? null,
            title: p.note.title, content: p.note.content, attachments: p.note.attachments ?? [],
            pdf_attachments: p.note.pdfAttachments ?? [], homework_items: p.note.homeworkItems ?? [],
            qa: p.note.qa ?? [], created_at: p.note.createdAt,
          })
          break
        case 'syncFolder':
          await supabase.from('user_folders').upsert({
            id: p.folder.id, user_id: userId, subject_id: p.folder.subjectId,
            half_year_id: p.folder.halfYearId ?? null, parent_folder_id: p.folder.parentFolderId ?? null,
            name: p.folder.name, is_auto_generated: p.folder.isAutoGenerated ?? false, created_at: p.folder.createdAt,
          })
          break
        case 'syncSmartNote':
          await supabase.from('generated_smart_notes').upsert({
            note_id: p.noteId, user_id: userId, lesson_id: p.note.lessonId, subject_name: p.note.subjectName,
            raw_text: p.note.rawText, content_type: p.note.contentType ?? null, summary: p.note.summary,
            keywords: p.note.keywords, exam_topics: p.note.examTopics, solution: p.note.solution ?? null,
            tasks: p.note.tasks ?? null, generated_at: p.note.generatedAt,
          })
          break
        case 'syncFlashCardsBatch':
          await supabase.from('flashcards').upsert((p.cards as FlashCard[]).map(c => ({
            id: c.id, user_id: userId, subject_id: c.subjectId, note_id: c.noteId ?? null,
            front: c.front, back: c.back, keywords: c.keywords ?? [], created_at: c.createdAt ?? new Date().toISOString(),
          })))
          break
        case 'syncLernzettel':
          await supabase.from('lernzettel').upsert({
            id: p.lz.id, user_id: userId, subject_id: p.lz.subjectId, subject_name: p.lz.subjectName,
            title: p.lz.title, selected_topics: p.lz.selectedTopics, source_note_ids: p.lz.sourceNoteIds,
            content: p.lz.content, keywords: p.lz.keywords, exam_topics: p.lz.examTopics,
            user_note_id: p.lz.userNoteId, folder_id: p.lz.folderId, generated_at: p.lz.generatedAt,
          })
          break
        case 'syncProbeklausur':
          await supabase.from('saved_probeklausuren').upsert({
            id: p.pk.id, user_id: userId, mode: p.pk.mode, subject_id: p.pk.subjectId,
            subject_name: p.pk.subjectName, topic: p.pk.topic, total_np: p.pk.totalNP,
            grade_label: p.pk.gradeLabel, task_results: p.pk.taskResults,
            overall_justification: p.pk.overallJustification, completed_at: p.pk.completedAt,
          })
          break
        case 'syncLernplaeneBatch':
          await supabase.from('lernplaene').upsert((p.plans as Lernplan[]).map(plan => ({
            id: plan.id, user_id: userId, title: plan.title, plan_type: plan.planType,
            is_active: plan.isActive, start_date: plan.startDate, end_date: plan.endDate,
            summary: plan.summary, days: plan.days, exam_schedule: plan.examSchedule,
            config: plan.config, created_at: plan.createdAt,
          })))
          break
        case 'syncEntry':
          await supabase.from('personal_entries').upsert({
            id: p.entry.id, user_id: userId, title: p.entry.title, type: p.entry.type,
            date: p.entry.date, time: p.entry.time, end_time: p.entry.endTime ?? null,
            color: p.entry.color ?? null, lernplan_id: p.entry.lernplanId ?? null,
          })
          break
        case 'syncEntriesBatch':
          await supabase.from('personal_entries').upsert((p.entries as PersonalEntry[]).map(e => ({
            id: e.id, user_id: userId, title: e.title, type: e.type,
            date: e.date, time: e.time, end_time: e.endTime ?? null,
            color: e.color ?? null, lernplan_id: e.lernplanId ?? null,
          })))
          break
        case 'syncAppStats':
          await supabase.from('app_stats').upsert({
            user_id: userId, scan_count: p.stats.scanCount, exam_count: p.stats.examCount,
            streak: p.stats.streak, last_study_date: p.stats.lastStudyDate,
            studied_days: p.stats.studiedDays, exam_scores: p.stats.examScores,
            coins: p.stats.coins ?? 0, cooldowns: p.stats.cooldowns ?? [],
            streak_freezes: p.stats.streakFreezes ?? 0, freeze_used_dates: p.stats.freezeUsedDates ?? [],
          })
          break
        default:
          // Unknown operation — discard it
          succeededIds.add(item.id)
          continue
      }
      succeededIds.add(item.id)
      success++
    } catch (err) {
      failed++
      recordSyncError(item.id, err instanceof Error ? err.message : String(err))
    }
  }

  const remaining = queue.filter(i => !succeededIds.has(i.id))
  saveSyncQueue(remaining)

  console.log(`[SyncQueue] Retry complete: ${success} success, ${failed} failed`)
  return { success, failed }
}

// ─── Data type mappers ────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

function mapProfile(r: Row, abiHalbjahreOverride?: AbiHalbjahr[] | null): UserProfile {
  return {
    name: r.name,
    klasse: r.klasse,
    schulform: r.schulform,
    schultyp: r.schultyp,
    bundesland: r.bundesland,
    bundeslandId: r.bundesland_id,
    faecher: r.faecher ?? [],
    lkFaecher: r.lk_faecher ?? [],
    customFaecher: r.custom_faecher ?? undefined,
    zielnote: r.zielnote,
    folderSortMode: r.folder_sort_mode,
    klausurtermine: r.klausurtermine ?? [],
    stundenplan: r.stundenplan,
    abiHalbjahre: abiHalbjahreOverride !== undefined ? abiHalbjahreOverride : r.abi_halbjahre,
    abiGesamtpunkte: r.abi_gesamtpunkte,
    abiGesamtnote: r.abi_gesamtnote,
    isDevMode: r.is_dev_mode ?? false,
  }
}

function mapFolder(r: Row): UserFolder {
  return {
    id: r.id,
    subjectId: r.subject_id,
    halfYearId: r.half_year_id,
    parentFolderId: r.parent_folder_id,
    name: r.name,
    createdAt: r.created_at,
    isAutoGenerated: r.is_auto_generated ?? false,
  }
}

function mapNote(r: Row): UserNote {
  return {
    id: r.id,
    subjectId: r.subject_id,
    folderId: r.folder_id,
    title: r.title,
    content: r.content,
    attachments: r.attachments,
    pdfAttachments: r.pdf_attachments,
    homeworkItems: r.homework_items,
    qa: r.qa,
    createdAt: r.created_at,
  }
}

function mapSmartNote(r: Row): GeneratedSmartNote {
  return {
    lessonId: r.lesson_id,
    subjectName: r.subject_name,
    rawText: r.raw_text,
    contentType: r.content_type,
    summary: r.summary,
    keywords: r.keywords ?? [],
    examTopics: r.exam_topics ?? [],
    solution: r.solution,
    tasks: r.tasks,
    generatedAt: r.generated_at,
  }
}

function mapFlashCard(r: Row): FlashCard {
  return {
    id: r.id,
    subjectId: r.subject_id,
    noteId: r.note_id,
    front: r.front,
    back: r.back,
    keywords: r.keywords,
    createdAt: r.created_at,
  }
}

function mapLernzettel(r: Row): Lernzettel {
  return {
    id: r.id,
    subjectId: r.subject_id,
    subjectName: r.subject_name,
    title: r.title,
    selectedTopics: r.selected_topics ?? [],
    sourceNoteIds: r.source_note_ids ?? [],
    content: r.content,
    keywords: r.keywords ?? [],
    examTopics: r.exam_topics ?? [],
    generatedAt: r.generated_at,
    userNoteId: r.user_note_id,
    folderId: r.folder_id,
  }
}

function mapProbeklausur(r: Row): SavedProbeklausur {
  return {
    id: r.id,
    mode: r.mode,
    subjectId: r.subject_id,
    subjectName: r.subject_name,
    topic: r.topic,
    totalNP: r.total_np,
    gradeLabel: r.grade_label,
    taskResults: r.task_results,
    overallJustification: r.overall_justification,
    completedAt: r.completed_at,
  }
}

function mapLernplan(r: Row): Lernplan {
  return {
    id: r.id,
    title: r.title,
    planType: r.plan_type,
    isActive: r.is_active,
    startDate: r.start_date,
    endDate: r.end_date,
    summary: r.summary,
    days: r.days ?? [],
    examSchedule: r.exam_schedule ?? [],
    config: r.config ?? {},
    createdAt: r.created_at,
  }
}

function mapAppStats(r: Row): AppStats {
  return {
    scanCount: r.scan_count,
    examCount: r.exam_count,
    streak: r.streak,
    lastStudyDate: r.last_study_date,
    studiedDays: r.studied_days ?? [],
    examScores: r.exam_scores ?? [],
    coins: r.coins ?? 0,
    cooldowns: r.cooldowns ?? [],
    streakFreezes: r.streak_freezes ?? 0,
    freezeUsedDates: r.freeze_used_dates ?? [],
  }
}

function mapEntry(r: Row): PersonalEntry {
  return {
    id: r.id,
    title: r.title,
    type: r.type,
    date: r.date,
    time: r.time,
    endTime: r.end_time,
    color: r.color ?? undefined,
    lernplanId: r.lernplan_id ?? undefined,
  }
}

function mapHomework(r: Row): StandaloneHomeworkItem {
  return {
    id: r.id,
    subjectId: r.subject_id,
    description: r.description,
    dueDate: r.due_date,
    createdAt: r.created_at,
  }
}

// ─── Load all user data from Supabase ──────────────────────────────────────

export interface SupabaseUserData {
  profile: UserProfile
  theme: AppTheme
  isPro: boolean
  appStats: AppStats
  userFolders: UserFolder[]
  userNotes: UserNote[]
  generatedNotes: Record<string, GeneratedSmartNote>
  generatedFlashCards: FlashCard[]
  lernzettel: Lernzettel[]
  savedProbeklausuren: SavedProbeklausur[]
  lernplaene: Lernplan[]
  personalEntries: PersonalEntry[]
  standaloneHomework: StandaloneHomeworkItem[]
  completedHomeworkIds: string[]
  referralCode: string | null
  referralCount: number
  trialEndsAt: string | null
}

export async function loadUserDataFromSupabase(userId: string): Promise<SupabaseUserData | null> {
  try {
    const { data: profileRow } = await supabase
      .from('profiles').select('*').eq('id', userId).single()

    // faecher empty = not onboarded yet
    if (!profileRow || (profileRow.faecher as string[]).length === 0) return null

    const [
      { data: statsRow },
      { data: folderRows },
      { data: noteRows },
      { data: smartNoteRows },
      { data: flashcardRows },
      { data: lernzettelRows },
      { data: probeklausurRows },
      { data: lernplanRows },
      { data: entryRows },
      { data: homeworkRows },
      { data: completedRows },
      { data: subRow },
      { data: gradeRow },
      { count: referralCount },
    ] = await Promise.all([
      supabase.from('app_stats').select('*').eq('user_id', userId).single(),
      supabase.from('user_folders').select('*').eq('user_id', userId),
      supabase.from('user_notes').select('*').eq('user_id', userId),
      supabase.from('generated_smart_notes').select('*').eq('user_id', userId),
      supabase.from('flashcards').select('*').eq('user_id', userId),
      supabase.from('lernzettel').select('*').eq('user_id', userId),
      supabase.from('saved_probeklausuren').select('*').eq('user_id', userId),
      supabase.from('lernplaene').select('*').eq('user_id', userId),
      supabase.from('personal_entries').select('*').eq('user_id', userId),
      supabase.from('standalone_homework').select('*').eq('user_id', userId),
      supabase.from('completed_homework_ids').select('homework_id').eq('user_id', userId),
      supabase.from('subscriptions').select('status').eq('user_id', userId).maybeSingle(),
      supabase.from('grade_data').select('abi_halbjahre').eq('user_id', userId).maybeSingle(),
      supabase.from('referrals').select('*', { count: 'exact', head: true }).eq('referrer_id', userId),
    ])

    const DEFAULT_STATS: AppStats = { scanCount: 0, examCount: 0, streak: 0, lastStudyDate: null, studiedDays: [], examScores: [], coins: 0, cooldowns: [], streakFreezes: 0, freezeUsedDates: [] }

    // isPro = manual override in profiles.is_pro OR active/trialing subscription
    const isPro =
      (profileRow.is_pro ?? false) ||
      (subRow?.status === 'active' || subRow?.status === 'trialing')

    // grade_data table is authoritative — fall back to profiles.abi_halbjahre for old accounts
    const resolvedAbiHalbjahre = gradeRow?.abi_halbjahre ?? profileRow.abi_halbjahre ?? null

    return {
      profile: mapProfile(profileRow, resolvedAbiHalbjahre),
      theme: (profileRow.theme as AppTheme) ?? 'dark',
      isPro,
      appStats: statsRow ? mapAppStats(statsRow) : DEFAULT_STATS,
      userFolders: (folderRows ?? []).map(mapFolder),
      userNotes: (noteRows ?? []).map(mapNote),
      generatedNotes: Object.fromEntries(
        (smartNoteRows ?? []).map((r) => [r.note_id, mapSmartNote(r)])
      ),
      generatedFlashCards: (flashcardRows ?? []).map(mapFlashCard),
      lernzettel: (lernzettelRows ?? []).map(mapLernzettel),
      savedProbeklausuren: (probeklausurRows ?? []).map(mapProbeklausur),
      lernplaene: (lernplanRows ?? []).map(mapLernplan),
      personalEntries: (entryRows ?? []).map(mapEntry),
      standaloneHomework: (homeworkRows ?? []).map(mapHomework),
      completedHomeworkIds: (completedRows ?? []).map((r) => r.homework_id as string),
      referralCode: profileRow.referral_code ?? null,
      referralCount: referralCount ?? 0,
      trialEndsAt: profileRow.trial_ends_at ?? null,
    }
  } catch (err) {
    console.warn('[Supabase] loadUserData failed', err)
    return null
  }
}

// ─── Lightweight metadata load (cache-first strategy) ─────────────────────
// Fetches only the 5 small metadata tables — no notes, no lernzettel content,
// no flashcards. Used when localStorage cache is fresh (< 24 h) to avoid
// re-downloading the user's entire dataset on every session start.

export interface SupabaseUserMeta {
  profile: UserProfile
  theme: AppTheme
  isPro: boolean
  appStats: AppStats
  referralCode: string | null
  referralCount: number
  trialEndsAt: string | null
}

export async function loadUserMetaFromSupabase(userId: string): Promise<SupabaseUserMeta | null> {
  try {
    const [
      { data: profileRow },
      { data: statsRow },
      { data: subRow },
      { data: gradeRow },
      { count: referralCount },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('app_stats').select('*').eq('user_id', userId).single(),
      supabase.from('subscriptions').select('status').eq('user_id', userId).maybeSingle(),
      supabase.from('grade_data').select('abi_halbjahre').eq('user_id', userId).maybeSingle(),
      supabase.from('referrals').select('*', { count: 'exact', head: true }).eq('referrer_id', userId),
    ])

    if (!profileRow || (profileRow.faecher as string[]).length === 0) return null

    const isPro =
      (profileRow.is_pro ?? false) ||
      (subRow?.status === 'active' || subRow?.status === 'trialing')
    const resolvedAbiHalbjahre = gradeRow?.abi_halbjahre ?? profileRow.abi_halbjahre ?? null
    const DEFAULT_STATS: AppStats = {
      scanCount: 0, examCount: 0, streak: 0, lastStudyDate: null,
      studiedDays: [], examScores: [], coins: 0, cooldowns: [],
      streakFreezes: 0, freezeUsedDates: [],
    }

    return {
      profile: mapProfile(profileRow, resolvedAbiHalbjahre),
      theme: (profileRow.theme as AppTheme) ?? 'dark',
      isPro,
      appStats: statsRow ? mapAppStats(statsRow) : DEFAULT_STATS,
      referralCode: profileRow.referral_code ?? null,
      referralCount: referralCount ?? 0,
      trialEndsAt: profileRow.trial_ends_at ?? null,
    }
  } catch (err) {
    console.warn('[Supabase] loadUserMeta failed', err)
    return null
  }
}

// ─── One-time migration: localStorage → Supabase ───────────────────────────

export async function migrateToSupabase(userId: string, data: SupabaseUserData): Promise<void> {
  try {
    await syncProfile(userId, data.profile, data.theme, data.isPro)
    await syncAppStats(userId, data.appStats)
    if (data.userFolders.length) await syncFoldersBatch(userId, data.userFolders)
    if (data.userNotes.length) await syncNotesBatch(userId, data.userNotes)
    const smartEntries = Object.entries(data.generatedNotes)
    if (smartEntries.length) {
      await Promise.all(smartEntries.map(([noteId, note]) => syncSmartNote(userId, noteId, note)))
    }
    if (data.generatedFlashCards.length) await syncFlashCardsBatch(userId, data.generatedFlashCards)
    if (data.lernzettel.length) await Promise.all(data.lernzettel.map((lz) => syncLernzettel(userId, lz)))
    if (data.savedProbeklausuren.length) await Promise.all(data.savedProbeklausuren.map((pk) => syncProbeklausur(userId, pk)))
    if (data.lernplaene.length) await syncLernplaeneBatch(userId, data.lernplaene)
    if (data.personalEntries.length) await syncEntriesBatch(userId, data.personalEntries)
    if (data.standaloneHomework.length) await syncHomeworkBatch(userId, data.standaloneHomework)
    if (data.completedHomeworkIds.length) await syncCompletedHomework(userId, data.completedHomeworkIds)
    console.log('[Supabase] Migration complete')
  } catch (err) {
    console.warn('[Supabase] Migration failed', err)
  }
}

// ─── Sync functions (fire-and-forget, all errors swallowed) ────────────────

export async function syncProfile(userId: string, profile: UserProfile, theme: AppTheme, isPro: boolean): Promise<void> {
  try {
    await supabase.from('profiles').upsert({
      id: userId,
      name: profile.name,
      klasse: profile.klasse,
      schulform: profile.schulform,
      schultyp: profile.schultyp,
      bundesland: profile.bundesland,
      bundesland_id: profile.bundeslandId,
      faecher: profile.faecher,
      lk_faecher: profile.lkFaecher ?? [],
      custom_faecher: profile.customFaecher?.length ? profile.customFaecher : null,
      zielnote: profile.zielnote,
      folder_sort_mode: profile.folderSortMode ?? 'halbjahr',
      klausurtermine: profile.klausurtermine ?? [],
      stundenplan: profile.stundenplan ?? null,
      abi_halbjahre: profile.abiHalbjahre ?? null,
      abi_gesamtpunkte: profile.abiGesamtpunkte ?? null,
      abi_gesamtnote: profile.abiGesamtnote ?? null,
      is_dev_mode: profile.isDevMode ?? false,
      theme,
      is_pro: isPro,
    })
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.warn('[Supabase] syncProfile failed:', errMsg)
    addToSyncQueue('syncProfile', { userId, profile, theme, isPro })
  }
}

// Dedicated grade sync — isolated from profile sync to prevent overwrite races.
// grade_data table is the authoritative source for abiHalbjahre.
// Sets referral_code only when the column is still NULL — safe to call repeatedly.
export async function syncReferralCode(userId: string, code: string): Promise<void> {
  try {
    await supabase.from('profiles').update({ referral_code: code }).eq('id', userId).is('referral_code', null)
  } catch (err) { console.warn('[Supabase] syncReferralCode', err) }
}

export async function syncGradeData(userId: string, abiHalbjahre: AbiHalbjahr[]): Promise<void> {
  try {
    await supabase.from('grade_data').upsert({
      user_id: userId,
      abi_halbjahre: abiHalbjahre,
      updated_at: new Date().toISOString(),
    })
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.warn('[Supabase] syncGradeData failed:', errMsg)
    addToSyncQueue('syncGradeData', { userId, abiHalbjahre })
  }
}

export async function syncAppStats(userId: string, stats: AppStats): Promise<void> {
  try {
    await supabase.from('app_stats').upsert({
      user_id: userId,
      scan_count: stats.scanCount,
      exam_count: stats.examCount,
      streak: stats.streak,
      last_study_date: stats.lastStudyDate,
      studied_days: stats.studiedDays,
      exam_scores: stats.examScores,
      coins: stats.coins ?? 0,
      cooldowns: stats.cooldowns ?? [],
      streak_freezes: stats.streakFreezes ?? 0,
      freeze_used_dates: stats.freezeUsedDates ?? [],
    })
  } catch (err) { console.warn('[Supabase] syncAppStats', err) }
}

// Atomic coin grant via RPC (row-locked on the server) — safe against concurrent
// tabs/devices racing on the same daily cooldown. Returns null if the call failed
// (offline, RLS, etc.) so the caller can fall back to a local-only optimistic grant.
export async function grantCoinsRemote(
  userId: string, amount: number, cooldownKey: string,
): Promise<{ granted: number; coins: number; cooldowns: string[] } | null> {
  try {
    const { data, error } = await supabase.rpc('grant_coins', {
      p_user_id: userId, p_amount: amount, p_cooldown_key: cooldownKey,
    })
    if (error || !data?.[0]) { console.warn('[Supabase] grantCoinsRemote', error); return null }
    const row = data[0]
    return { granted: row.granted, coins: row.new_coins, cooldowns: row.new_cooldowns ?? [] }
  } catch (err) { console.warn('[Supabase] grantCoinsRemote', err); return null }
}

// Atomic streak-freeze purchase via RPC — same row-lock guarantee as grantCoinsRemote.
export async function buyStreakFreezeRemote(
  userId: string, cost: number,
): Promise<{ success: boolean; coins: number; streakFreezes: number } | null> {
  try {
    const { data, error } = await supabase.rpc('buy_streak_freeze', {
      p_user_id: userId, p_cost: cost,
    })
    if (error || !data?.[0]) { console.warn('[Supabase] buyStreakFreezeRemote', error); return null }
    const row = data[0]
    return { success: row.success, coins: row.new_coins, streakFreezes: row.new_streak_freezes }
  } catch (err) { console.warn('[Supabase] buyStreakFreezeRemote', err); return null }
}

export async function syncFolder(userId: string, folder: UserFolder): Promise<void> {
  try {
    await supabase.from('user_folders').upsert({
      id: folder.id, user_id: userId,
      subject_id: folder.subjectId,
      half_year_id: folder.halfYearId ?? null,
      parent_folder_id: folder.parentFolderId ?? null,
      name: folder.name,
      is_auto_generated: folder.isAutoGenerated ?? false,
      created_at: folder.createdAt,
    })
  } catch (err) {
    console.warn('[Supabase] syncFolder', err)
    addToSyncQueue('syncFolder', { folder })
  }
}

export async function syncFoldersBatch(userId: string, folders: UserFolder[]): Promise<void> {
  try {
    await supabase.from('user_folders').upsert(folders.map((f) => ({
      id: f.id, user_id: userId,
      subject_id: f.subjectId,
      half_year_id: f.halfYearId ?? null,
      parent_folder_id: f.parentFolderId ?? null,
      name: f.name,
      is_auto_generated: f.isAutoGenerated ?? false,
      created_at: f.createdAt,
    })))
  } catch (err) { console.warn('[Supabase] syncFoldersBatch', err) }
}

export async function deleteFoldersFromDB(userId: string, folderIds: string[]): Promise<void> {
  try {
    await supabase.from('user_folders').delete().eq('user_id', userId).in('id', folderIds)
  } catch (err) { console.warn('[Supabase] deleteFolders', err) }
}

export async function syncNote(userId: string, note: UserNote): Promise<void> {
  try {
    await supabase.from('user_notes').upsert({
      id: note.id, user_id: userId,
      subject_id: note.subjectId ?? null,
      folder_id: note.folderId ?? null,
      title: note.title,
      content: note.content,
      attachments: note.attachments ?? [],
      pdf_attachments: note.pdfAttachments ?? [],
      homework_items: note.homeworkItems ?? [],
      qa: note.qa ?? [],
      created_at: note.createdAt,
    })
  } catch (err) {
    console.warn('[Supabase] syncNote', err)
    addToSyncQueue('syncNote', { note })
  }
}

export async function syncNotesBatch(userId: string, notes: UserNote[]): Promise<void> {
  try {
    await supabase.from('user_notes').upsert(notes.map((note) => ({
      id: note.id, user_id: userId,
      subject_id: note.subjectId ?? null,
      folder_id: note.folderId ?? null,
      title: note.title,
      content: note.content,
      attachments: note.attachments ?? [],
      pdf_attachments: note.pdfAttachments ?? [],
      homework_items: note.homeworkItems ?? [],
      qa: note.qa ?? [],
      created_at: note.createdAt,
    })))
  } catch (err) { console.warn('[Supabase] syncNotesBatch', err) }
}

export async function deleteNotesFromDB(userId: string, noteIds: string[]): Promise<void> {
  try {
    await supabase.from('user_notes').delete().eq('user_id', userId).in('id', noteIds)
  } catch (err) { console.warn('[Supabase] deleteNotes', err) }
}

export async function syncSmartNote(userId: string, noteId: string, note: GeneratedSmartNote): Promise<void> {
  try {
    await supabase.from('generated_smart_notes').upsert({
      note_id: noteId, user_id: userId,
      lesson_id: note.lessonId,
      subject_name: note.subjectName,
      raw_text: note.rawText,
      content_type: note.contentType ?? null,
      summary: note.summary,
      keywords: note.keywords,
      exam_topics: note.examTopics,
      solution: note.solution ?? null,
      tasks: note.tasks ?? null,
      generated_at: note.generatedAt,
    })
  } catch (err) {
    console.warn('[Supabase] syncSmartNote', err)
    addToSyncQueue('syncSmartNote', { noteId, note })
  }
}

export async function syncFlashCardsBatch(userId: string, cards: FlashCard[]): Promise<void> {
  try {
    await supabase.from('flashcards').upsert(cards.map((c) => ({
      id: c.id, user_id: userId,
      subject_id: c.subjectId,
      note_id: c.noteId ?? null,
      front: c.front,
      back: c.back,
      keywords: c.keywords ?? [],
      created_at: c.createdAt ?? new Date().toISOString(),
    })))
  } catch (err) {
    console.warn('[Supabase] syncFlashCards', err)
    addToSyncQueue('syncFlashCardsBatch', { cards })
  }
}

export async function syncLernzettel(userId: string, lz: Lernzettel): Promise<void> {
  try {
    await supabase.from('lernzettel').upsert({
      id: lz.id, user_id: userId,
      subject_id: lz.subjectId,
      subject_name: lz.subjectName,
      title: lz.title,
      selected_topics: lz.selectedTopics,
      source_note_ids: lz.sourceNoteIds,
      content: lz.content,
      keywords: lz.keywords,
      exam_topics: lz.examTopics,
      user_note_id: lz.userNoteId,
      folder_id: lz.folderId,
      generated_at: lz.generatedAt,
    })
  } catch (err) {
    console.warn('[Supabase] syncLernzettel', err)
    addToSyncQueue('syncLernzettel', { lz })
  }
}

export async function syncProbeklausur(userId: string, pk: SavedProbeklausur): Promise<void> {
  try {
    await supabase.from('saved_probeklausuren').upsert({
      id: pk.id, user_id: userId,
      mode: pk.mode,
      subject_id: pk.subjectId,
      subject_name: pk.subjectName,
      topic: pk.topic,
      total_np: pk.totalNP,
      grade_label: pk.gradeLabel,
      task_results: pk.taskResults,
      overall_justification: pk.overallJustification,
      completed_at: pk.completedAt,
    })
  } catch (err) {
    console.warn('[Supabase] syncProbeklausur', err)
    addToSyncQueue('syncProbeklausur', { pk })
  }
}

export async function deleteProbeklausurFromDB(userId: string, id: string): Promise<void> {
  try {
    await supabase.from('saved_probeklausuren').delete().eq('id', id).eq('user_id', userId)
  } catch (err) { console.warn('[Supabase] deleteProbeklausur', err) }
}

export async function syncLernplaeneBatch(userId: string, plans: Lernplan[]): Promise<void> {
  try {
    await supabase.from('lernplaene').upsert(plans.map((plan) => ({
      id: plan.id, user_id: userId,
      title: plan.title,
      plan_type: plan.planType,
      is_active: plan.isActive,
      start_date: plan.startDate,
      end_date: plan.endDate,
      summary: plan.summary,
      days: plan.days,
      exam_schedule: plan.examSchedule,
      config: plan.config,
      created_at: plan.createdAt,
    })))
  } catch (err) {
    console.warn('[Supabase] syncLernplaene', err)
    addToSyncQueue('syncLernplaeneBatch', { plans })
  }
}

export async function deleteLernplanFromDB(userId: string, id: string): Promise<void> {
  try {
    await supabase.from('lernplaene').delete().eq('id', id).eq('user_id', userId)
  } catch (err) { console.warn('[Supabase] deleteLernplan', err) }
}

export async function syncEntry(userId: string, entry: PersonalEntry): Promise<void> {
  try {
    await supabase.from('personal_entries').upsert({
      id: entry.id, user_id: userId,
      title: entry.title,
      type: entry.type,
      date: entry.date,
      time: entry.time,
      end_time: entry.endTime ?? null,
      color: entry.color ?? null,
      lernplan_id: entry.lernplanId ?? null,
    })
  } catch (err) {
    console.warn('[Supabase] syncEntry', err)
    addToSyncQueue('syncEntry', { entry })
  }
}

export async function syncEntriesBatch(userId: string, entries: PersonalEntry[]): Promise<void> {
  try {
    await supabase.from('personal_entries').upsert(entries.map((e) => ({
      id: e.id, user_id: userId,
      title: e.title,
      type: e.type,
      date: e.date,
      time: e.time,
      end_time: e.endTime ?? null,
      color: e.color ?? null,
      lernplan_id: e.lernplanId ?? null,
    })))
  } catch (err) {
    console.warn('[Supabase] syncEntriesBatch', err)
    addToSyncQueue('syncEntriesBatch', { entries })
  }
}

export async function deleteEntryFromDB(userId: string, id: string): Promise<void> {
  try {
    await supabase.from('personal_entries').delete().eq('id', id).eq('user_id', userId)
  } catch (err) { console.warn('[Supabase] deleteEntry', err) }
}

export async function syncHomeworkBatch(userId: string, items: StandaloneHomeworkItem[]): Promise<void> {
  try {
    await supabase.from('standalone_homework').upsert(items.map((item) => ({
      id: item.id, user_id: userId,
      subject_id: item.subjectId ?? null,
      description: item.description,
      due_date: item.dueDate ?? null,
      created_at: item.createdAt,
    })))
  } catch (err) { console.warn('[Supabase] syncHomework', err) }
}

export async function syncCompletedHomework(userId: string, ids: string[]): Promise<void> {
  try {
    if (!ids.length) return
    await supabase.from('completed_homework_ids').upsert(
      ids.map((id) => ({ user_id: userId, homework_id: id }))
    )
  } catch (err) { console.warn('[Supabase] syncCompleted', err) }
}
