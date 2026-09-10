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

const MAX_IMAGE_DIM = 2000
const JPEG_QUALITY = 0.8

/**
 * Shrinks an oversized raster image data: URL before it goes into IndexedDB and
 * Storage. Phone camera captures arrive at full sensor resolution and several
 * MB — wasteful for a "look at it again later" attachment and slow to upload on
 * mobile data. PNGs (drawing exports, screenshots) are resized but kept
 * lossless; other raster formats are re-encoded as JPEG on white. SVG, GIF and
 * anything that doesn't decode as an image pass through untouched. Never
 * throws — returns the input unchanged on any failure or if it can't beat it.
 */
export function downscaleDataUrl(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const mime = /^data:([^;,]+)/.exec(dataUrl)?.[1] ?? ''
    if (!mime.startsWith('image/') || mime === 'image/svg+xml' || mime === 'image/gif') {
      resolve(dataUrl)
      return
    }
    const img = new Image()
    img.onload = () => {
      try {
        const scale = Math.min(1, MAX_IMAGE_DIM / Math.max(img.width, img.height))
        const isPng = mime === 'image/png'
        if (scale === 1 && isPng) { resolve(dataUrl); return }
        const w = Math.max(1, Math.round(img.width * scale))
        const h = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) { resolve(dataUrl); return }
        if (!isPng) {
          ctx.fillStyle = '#FFFFFF'
          ctx.fillRect(0, 0, w, h)
        }
        ctx.drawImage(img, 0, 0, w, h)
        const out = isPng ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', JPEG_QUALITY)
        resolve(out && out.length < dataUrl.length ? out : dataUrl)
      } catch {
        resolve(dataUrl)
      }
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}


/** Stores a raw data: URL (e.g. a generated image) in IndexedDB and returns its idb:<uuid> ref. */
export async function saveLocalAsset(dataUrl: string): Promise<string> {
  const id = crypto.randomUUID()
  await putRecord(id, dataUrl)
  return `${IDB_PREFIX}${id}`
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

function collectPendingRefs(note: UserNote): string[] {
  return [...(note.attachments ?? []), ...(note.drawingAttachments ?? [])]
    .filter((r) => r.startsWith('data:') || isLocalRef(r))
}

/**
 * Makes this note's images durable. Every attachment still held only as inline
 * base64 (data:) or device-local IndexedDB (idb:) is downscaled, cached locally
 * at its smaller size, and uploaded to the user's Storage bucket, leaving a
 * cloud:<uuid>:<path> ref that resolves on any device. Already-uploaded (cloud:)
 * refs are untouched. Returns the rewritten note, or null when there was nothing
 * to make durable.
 *
 * This is what stops note images from vanishing: on iOS the WebView's IndexedDB
 * for the remote origin is wiped by WebKit's ~7-day script-writable-storage cap,
 * so an idb:-only image disappears within days of being taken. Called
 * automatically on every note save and again on load, to heal notes that were
 * saved before this ran (as long as their local bytes are still around).
 */
export async function transferNoteAttachmentsToCloud(userId: string, note: UserNote): Promise<UserNote | null> {
  if (collectPendingRefs(note).length === 0) return null

  const done = new Map<string, string>()

  const toCloud = async (ref: string): Promise<string> => {
    if (isCloudRef(ref) || (!ref.startsWith('data:') && !isLocalRef(ref))) return ref
    const cached = done.get(ref)
    if (cached) return cached

    const wasLocal = isLocalRef(ref)
    const id = wasLocal ? ref.slice(IDB_PREFIX.length) : crypto.randomUUID()
    let dataUrl = wasLocal ? await getRecord(id).catch(() => undefined) : ref
    if (!dataUrl) return ref // bytes gone locally, or the localize write hasn't
                             // landed yet — either way, retry on the next load

    const smaller = await downscaleDataUrl(dataUrl)
    if (smaller !== dataUrl) dataUrl = smaller

    // Fall back to a local ref only if the bytes are actually safe locally — never
    // drop a data: URL for an idb: ref that points at nothing.
    let cachedLocally = wasLocal
    try { await putRecord(id, dataUrl); cachedLocally = true } catch { /* best-effort */ }
    const localFallback = () => (cachedLocally ? `${IDB_PREFIX}${id}` : ref)

    const path = `${userId}/${note.id}/${id}`
    try {
      const blob = dataUrlToBlob(dataUrl)
      const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
        contentType: blob.type,
        upsert: true,
      })
      if (error) return localFallback() // keep it local, retried on the next load
    } catch {
      return localFallback()
    }

    const cloudRef = `${CLOUD_PREFIX}${id}:${path}`
    done.set(ref, cloudRef)
    return cloudRef
  }

  const attachments = note.attachments ? await Promise.all(note.attachments.map(toCloud)) : undefined
  const drawingAttachments = note.drawingAttachments
    ? await Promise.all(note.drawingAttachments.map(toCloud))
    : undefined

  const same = (a?: string[], b?: string[]) =>
    (a?.length ?? 0) === (b?.length ?? 0) && (a ?? []).every((v, i) => v === b?.[i])
  if (same(attachments, note.attachments) && same(drawingAttachments, note.drawingAttachments)) return null

  return { ...note, attachments, drawingAttachments }
}

/**
 * Backfill for note images that predate cloud auto-upload, or whose upload
 * failed earlier: uploads every still-local attachment and returns the notes
 * that changed. Capped so one load never fans out into hundreds of uploads —
 * the rest heal on the next load. A no-op once everything is already cloud:.
 */
export async function healNoteAttachments(userId: string, notes: UserNote[], limit = 25): Promise<UserNote[]> {
  const stale = notes.filter((n) => collectPendingRefs(n).length > 0).slice(0, limit)
  const healed: UserNote[] = []
  for (const n of stale) {
    try {
      const c = await transferNoteAttachmentsToCloud(userId, n)
      if (c) healed.push(c)
    } catch {
      // move on to the next note
    }
  }
  return healed
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
