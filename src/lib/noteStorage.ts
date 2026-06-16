import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { UserNote } from '../types'

const DB_NAME = 'dailystudent-attachments'
const STORE_NAME = 'attachments'
const DB_VERSION = 1
const BUCKET = 'note-attachments'

// Refs in UserNote.attachments/drawingAttachments take one of three forms:
// - 'data:...'        legacy / not-yet-localized inline base64 (still supported at read time)
// - 'idb:<uuid>'       local-only, IndexedDB on this device only
// - 'cloud:<uuid>:<path>'  uploaded via the "transfer to other devices" action — resolves from
//                          the local IndexedDB cache first (same uuid), falls back to downloading
//                          from the Supabase Storage bucket and caches the result locally
const IDB_PREFIX = 'idb:'
const CLOUD_PREFIX = 'cloud:'

export function isLocalRef(value: string): boolean {
  return value.startsWith(IDB_PREFIX)
}

export function isCloudRef(value: string): boolean {
  return value.startsWith(CLOUD_PREFIX)
}

function parseCloudRef(ref: string): { id: string; path: string } {
  const rest = ref.slice(CLOUD_PREFIX.length)
  const sep = rest.indexOf(':')
  return { id: rest.slice(0, sep), path: rest.slice(sep + 1) }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function putRecord(id: string, dataUrl: string): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put({ id, dataUrl })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

async function getRecord(id: string): Promise<string | undefined> {
  const db = await openDb()
  const dataUrl = await new Promise<string | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(id)
    req.onsuccess = () => resolve(req.result?.dataUrl)
    req.onerror = () => reject(req.error)
  })
  db.close()
  return dataUrl
}

async function deleteRecord(id: string): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',')
  const mime = header.match(/data:([^;]+)/)?.[1] ?? 'application/octet-stream'
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

/** Resolves a ref (idb:, cloud:, or a legacy plain data: URL) to a displayable src. */
export async function getAttachment(ref: string): Promise<string | undefined> {
  if (isLocalRef(ref)) {
    try {
      return await getRecord(ref.slice(IDB_PREFIX.length))
    } catch {
      return undefined
    }
  }
  if (isCloudRef(ref)) {
    const { id, path } = parseCloudRef(ref)
    try {
      const cached = await getRecord(id)
      if (cached) return cached
      const { data, error } = await supabase.storage.from(BUCKET).download(path)
      if (error || !data) return undefined
      const dataUrl = await blobToDataUrl(data)
      void putRecord(id, dataUrl)
      return dataUrl
    } catch {
      return undefined
    }
  }
  return ref
}

export async function deleteAttachment(ref: string): Promise<void> {
  if (isLocalRef(ref)) {
    try {
      await deleteRecord(ref.slice(IDB_PREFIX.length))
    } catch {
      // best-effort cleanup
    }
    return
  }
  if (isCloudRef(ref)) {
    const { id, path } = parseCloudRef(ref)
    try {
      await deleteRecord(id)
    } catch {
      // best-effort cleanup
    }
    try {
      await supabase.storage.from(BUCKET).remove([path])
    } catch {
      // best-effort cleanup
    }
  }
}

/**
 * Replaces inline base64 data: URLs in a note's attachments/drawingAttachments with
 * local IndexedDB refs, so the note object handed to localStorage/Supabase stays tiny.
 * The IndexedDB writes happen in the background — the returned note already has the
 * small ref strings, so callers don't need to await this. Already-localized (idb:/cloud:)
 * refs pass through untouched.
 */
export function localizeNoteAttachments(note: UserNote): UserNote {
  const refByValue = new Map<string, string>()

  const localize = (value: string): string => {
    if (!value.startsWith('data:')) return value
    const existing = refByValue.get(value)
    if (existing) return existing
    const id = crypto.randomUUID()
    const ref = `${IDB_PREFIX}${id}`
    refByValue.set(value, ref)
    void putRecord(id, value)
    return ref
  }

  const attachments = note.attachments?.map(localize)
  const drawingAttachments = note.drawingAttachments?.map(localize)

  if (!attachments && !drawingAttachments) return note
  return { ...note, attachments, drawingAttachments }
}

/**
 * One-time cleanup for notes synced before the IndexedDB switch: any note still carrying
 * raw base64 data: URLs (sent in full to Postgres) gets localized to small refs. Called
 * after loading notes from Supabase — the device that loads them already has the actual
 * image bytes, so writing them into its own IndexedDB loses nothing, and the next sync
 * shrinks that row down to ref strings instead of base64.
 */
export function migrateLegacyNoteAttachments(notes: UserNote[]): { notes: UserNote[]; changed: UserNote[] } | null {
  const changed: UserNote[] = []
  const result = notes.map((n) => {
    const hasLegacy = [...(n.attachments ?? []), ...(n.drawingAttachments ?? [])].some((v) => v.startsWith('data:'))
    if (!hasLegacy) return n
    const localized = localizeNoteAttachments(n)
    changed.push(localized)
    return localized
  })
  return changed.length > 0 ? { notes: result, changed } : null
}

function collectManagedRefs(note: UserNote): string[] {
  return [...(note.attachments ?? []), ...(note.drawingAttachments ?? [])]
    .filter((v) => isLocalRef(v) || isCloudRef(v))
}

export async function deleteAttachmentsForNotes(notes: UserNote[]): Promise<void> {
  const refs = notes.flatMap(collectManagedRefs)
  await Promise.all(refs.map(deleteAttachment))
}

export function hasLocalOnlyAttachments(note: UserNote): boolean {
  return collectManagedRefs(note).some(isLocalRef)
}

/**
 * Uploads this note's local-only (idb:) attachments to the user's Storage bucket so
 * they become available on other devices. Already-uploaded (cloud:) and legacy data:
 * entries are left untouched. Returns null if there was nothing local to upload.
 */
export async function transferNoteAttachmentsToCloud(userId: string, note: UserNote): Promise<UserNote | null> {
  const refMap = new Map<string, string>()

  const upload = async (ref: string): Promise<string> => {
    if (!isLocalRef(ref)) return ref
    const cached = refMap.get(ref)
    if (cached) return cached
    const id = ref.slice(IDB_PREFIX.length)
    const dataUrl = await getRecord(id)
    if (!dataUrl) return ref
    const blob = dataUrlToBlob(dataUrl)
    const path = `${userId}/${note.id}/${id}`
    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
      contentType: blob.type,
      upsert: true,
    })
    if (error) return ref
    const newRef = `${CLOUD_PREFIX}${id}:${path}`
    refMap.set(ref, newRef)
    return newRef
  }

  if (!hasLocalOnlyAttachments(note)) return null

  const attachments = note.attachments ? await Promise.all(note.attachments.map(upload)) : undefined
  const drawingAttachments = note.drawingAttachments
    ? await Promise.all(note.drawingAttachments.map(upload))
    : undefined

  return { ...note, attachments, drawingAttachments }
}

/** Resolves a list of refs/legacy data: URLs to displayable srcs. Falls back to the raw ref until resolved. */
export function useResolvedAttachments(refs: string[]): string[] {
  const [resolved, setResolved] = useState<string[]>(refs)
  const key = refs.join('|')

  useEffect(() => {
    let cancelled = false
    Promise.all(refs.map((r) => getAttachment(r))).then((srcs) => {
      if (cancelled) return
      setResolved(srcs.map((s, i) => s ?? refs[i]))
    })
    return () => { cancelled = true }
    // refs is reconstructed every render — key (its content) is the real dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return resolved
}
