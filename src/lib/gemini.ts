import type { GeneratedSmartNote } from '../types'

const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent'

interface GeminiJSON {
  title?: string
  summary?: string
  keywords?: string[]
  examTopics?: string[]
}

async function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      const comma = result.indexOf(',')
      resolve({
        base64: result.slice(comma + 1),
        mimeType: result.slice(5, comma).replace(';base64', ''),
      })
    }
    reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden.'))
    reader.readAsDataURL(file)
  })
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

export async function analyzeFileToSmartNote(
  file: File,
  noteId: string,
  subjectName = 'Allgemein',
  signal?: AbortSignal,
): Promise<{ generated: GeneratedSmartNote; noteTitle: string }> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY fehlt in .env')

  const { base64, mimeType } = await fileToBase64(file)

  const body = {
    contents: [{
      parts: [
        { inline_data: { mime_type: mimeType, data: base64 } },
        {
          text: `Du bist ein Lernassistent für deutsche Abiturschüler. Analysiere das Dokument und erstelle eine strukturierte Smart Note. Fach-Kontext: ${subjectName}. Antworte NUR mit validem JSON:
{
  "title": "Kurzer Titel des Inhalts (max 60 Zeichen)",
  "summary": "3-5 Sätze Zusammenfassung des Lerninhalts auf Deutsch",
  "keywords": ["Fachbegriff1", "Fachbegriff2", "Fachbegriff3"],
  "examTopics": ["Mögliches Klausurthema 1", "Mögliches Klausurthema 2"]
}`,
        },
      ],
    }],
    generationConfig: {
      response_mime_type: 'application/json',
      temperature: 0.1,
      maxOutputTokens: 1024,
    },
  }

  const attempt = () =>
    fetch(`${API_URL}?key=${apiKey}`, {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

  let res = await attempt()

  // Auto-retry once on rate limit (back off 8 s) — only if not aborted
  if (res.status === 429 && !signal?.aborted) {
    await sleep(8000)
    res = await attempt()
  }

  if (!res.ok) {
    let msg = `Gemini Fehler ${res.status}`
    try {
      const err = await res.json() as { error?: { message?: string } }
      msg = err?.error?.message ?? msg
    } catch { /* raw text */ }
    if (res.status === 429) msg = 'Rate Limit — wird automatisch wiederholt.'
    if (res.status === 400) msg = 'Datei konnte nicht verarbeitet werden.'
    throw new Error(msg)
  }

  const json = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Keine Antwort von der KI erhalten.')

  let parsed: GeminiJSON
  try {
    parsed = JSON.parse(text) as GeminiJSON
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('KI-Antwort konnte nicht verarbeitet werden.')
    parsed = JSON.parse(match[0]) as GeminiJSON
  }

  const noteTitle = parsed.title?.trim() || file.name.replace(/\.[^/.]+$/, '')

  return {
    generated: {
      lessonId: noteId,
      rawText: parsed.summary ?? '',
      contentType: 'info',
      summary: parsed.summary ?? '',
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      examTopics: Array.isArray(parsed.examTopics) ? parsed.examTopics : [],
      generatedAt: new Date().toISOString(),
      subjectName,
    },
    noteTitle,
  }
}

/** Minimum delay between batch requests to stay under Gemini free-tier rate limit (15 RPM). */
export const GEMINI_BATCH_DELAY_MS = 4500

// ── Destination suggestion ───────────────────────────────────────────────────

interface DestinationJSON {
  subjectId?: string
  folderId?: string
  reason?: string
}

export interface ImportDestination {
  subjectId: string
  subjectName: string
  folderId?: string
  folderName?: string
  reason: string
}

export async function suggestImportDestination(
  file: File,
  subjects: { id: string; name: string }[],
  folders: { id: string; subjectId: string; name: string }[],
  signal?: AbortSignal,
): Promise<ImportDestination | null> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined
  if (!apiKey || subjects.length === 0) return null

  const { base64, mimeType } = await fileToBase64(file)

  const subjectList = subjects.map((s) => `- ${s.id}: ${s.name}`).join('\n')
  const folderSection = folders.length > 0
    ? '\n\nVerfügbare Ordner:\n' + folders.map((f) => {
        const sName = subjects.find((s) => s.id === f.subjectId)?.name ?? f.subjectId
        return `- ${f.id}: "${f.name}" (${sName})`
      }).join('\n')
    : ''

  const folderInstruction = folders.length > 0
    ? `\n\nWähle auch einen passenden Ordner aus wenn möglich. Antworte mit:\n{"subjectId":"exakte-fach-id","folderId":"exakte-ordner-id","reason":"Begründung"}\nOhne Ordner:\n{"subjectId":"exakte-fach-id","folderId":null,"reason":"Begründung"}`
    : `\n\nAntworte mit:\n{"subjectId":"exakte-fach-id","folderId":null,"reason":"Begründung"}`

  let res: Response
  try {
    res = await fetch(`${API_URL}?key=${apiKey}`, {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: mimeType, data: base64 } },
            {
              text: `Analysiere dieses Dokument und ordne es einem Schulfach zu. Verwende NUR die exakten IDs aus der Liste.\n\nVerfügbare Fächer:\n${subjectList}${folderSection}${folderInstruction}`,
            },
          ],
        }],
        generationConfig: { response_mime_type: 'application/json', temperature: 0.1, maxOutputTokens: 150 },
      }),
    })
  } catch {
    return null // AbortError or network error — caller handles
  }

  if (!res.ok) return null

  const json = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) return null

  let parsed: DestinationJSON
  try {
    parsed = JSON.parse(text) as DestinationJSON
  } catch {
    // Gemini sometimes wraps JSON in markdown fences — extract the raw object
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return null
    try { parsed = JSON.parse(match[0]) as DestinationJSON }
    catch { return null }
  }

  // Case-insensitive ID match first, then fall back to name match
  const rawId = (parsed.subjectId ?? '').trim().toLowerCase()
  const matchSubject =
    subjects.find((s) => s.id.toLowerCase() === rawId) ??
    subjects.find((s) => s.name.toLowerCase() === rawId)
  if (!matchSubject) return null

  // Folder: exact ID first, then name fallback within the matched subject
  const rawFolderId = (parsed.folderId ?? '').trim().toLowerCase()
  const matchFolder = rawFolderId
    ? (folders.find((f) => f.id.toLowerCase() === rawFolderId && f.subjectId === matchSubject.id) ??
       folders.find((f) => f.name.toLowerCase() === rawFolderId && f.subjectId === matchSubject.id))
    : undefined

  return {
    subjectId: matchSubject.id,
    subjectName: matchSubject.name,
    folderId: matchFolder?.id,
    folderName: matchFolder?.name,
    reason: parsed.reason ?? '',
  }
}
