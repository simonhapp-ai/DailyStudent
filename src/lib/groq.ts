import type { GeneratedSmartNote } from '../types'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct'
const TEXT_MODEL = 'llama-3.3-70b-versatile'

async function resizeImage(dataUrl: string, maxWidth = 1280): Promise<{ base64: string; mimeType: 'image/jpeg' }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas nicht verfügbar')); return }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve({ base64: canvas.toDataURL('image/jpeg', 0.85).split(',')[1], mimeType: 'image/jpeg' })
    }
    img.onerror = () => reject(new Error('Bild konnte nicht geladen werden'))
    img.src = dataUrl
  })
}

interface GroqResponse {
  choices: { message: { content: string } }[]
}

async function groqFetch(body: Record<string, unknown>): Promise<string> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY as string | undefined
  if (!apiKey) throw new Error('VITE_GROQ_API_KEY fehlt in .env')

  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Groq API Fehler ${res.status}: ${text}`)
  }

  return ((await res.json()) as GroqResponse).choices[0].message.content
}

// Step 1: Foto → Text via Llama 3.2 Vision
export async function extractTextFromImage(dataUrl: string): Promise<string> {
  const { base64, mimeType } = await resizeImage(dataUrl)

  return groqFetch({
    model: VISION_MODEL,
    max_tokens: 2048,
    temperature: 0.1,
    messages: [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
        {
          type: 'text',
          text: 'Du bist ein OCR-Spezialist für Schulunterlagen. Extrahiere ALLES: Text, Überschriften, Stichpunkte, Formeln, Diagrammbeschriftungen. Behalte Struktur und Einrückungen bei. Antworte NUR mit dem extrahierten Text, keine Kommentare oder Einleitungen.',
        },
      ],
    }],
  })
}

interface SmartNoteJSON {
  summary: string
  keywords: string[]
  examTopics: string[]
}

interface SubjectSuggestionJSON {
  subjectId: string
  reason: string
}

export async function suggestNoteSubject(
  rawText: string,
  subjects: { id: string; name: string }[],
): Promise<{ subjectId: string; subjectName: string; reason: string } | null> {
  if (!rawText.trim() || subjects.length === 0) return null
  try {
    const content = await groqFetch({
      model: TEXT_MODEL,
      max_tokens: 128,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'Du ordnest Schülernotizen dem richtigen Schulfach zu. Antworte nur mit validem JSON.',
        },
        {
          role: 'user',
          content: `Ordne diese Notiz dem passenden Fach zu.

Fächer: ${subjects.map((s) => `"${s.id}" = ${s.name}`).join(', ')}

Notiz:
${rawText.slice(0, 600)}

JSON: {"subjectId": "id", "reason": "Ein-Satz-Begründung auf Deutsch"}`,
        },
      ],
    })
    const parsed = JSON.parse(content) as SubjectSuggestionJSON
    const match = subjects.find((s) => s.id === parsed.subjectId)
    if (!match) return null
    return { subjectId: match.id, subjectName: match.name, reason: parsed.reason }
  } catch {
    return null
  }
}

export async function answerQuestion(
  question: string,
  subjectName: string,
  noteContext?: string,
): Promise<string> {
  return groqFetch({
    model: TEXT_MODEL,
    max_tokens: 250,
    temperature: 0.3,
    messages: [
      {
        role: 'system',
        content: 'Du bist ein Nachhilfelehrer für deutsche Gymnasiasten (Klasse 10–13). Antworte direkt auf Deutsch. Keine Einleitung, keine "Also:". Maximal 4 Sätze.',
      },
      {
        role: 'user',
        content: `Fach: ${subjectName}${noteContext ? `\nKontext aus der Stunde: ${noteContext.slice(0, 400)}` : ''}

Frage / Begriff: "${question}"`,
      },
    ],
  })
}

export async function explainKeyword(
  keyword: string,
  subjectName: string,
  context?: string,
): Promise<string> {
  return groqFetch({
    model: TEXT_MODEL,
    max_tokens: 150,
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content: 'Du bist ein Lernassistent für deutsche Gymnasiasten. Antworte immer auf Deutsch. Erkläre Fachbegriffe kurz, präzise und verständlich.',
      },
      {
        role: 'user',
        content: `Fach: ${subjectName}${context ? `\nKontext: ${context.slice(0, 300)}` : ''}

Erkläre den Begriff "${keyword}" in 2–3 prägnanten Sätzen für einen Gymnasiasten der Klasse 10–13. Nur die Erklärung, ohne Einleitung oder "Also:".`,
      },
    ],
  })
}

// Step 2: Text → strukturierte Smart Note via Llama 3.3 70B
export async function generateSmartNote(
  rawText: string,
  subjectName: string,
  lessonId: string,
): Promise<GeneratedSmartNote> {
  const content = await groqFetch({
    model: TEXT_MODEL,
    max_tokens: 2048,
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'Du bist ein Lernassistent für deutsche Gymnasiasten (Klasse 10–13). Antworte ausschließlich auf Deutsch. Gib immer valides JSON zurück.',
      },
      {
        role: 'user',
        content: `Fach: ${subjectName}

Tafelbild-Text:
${rawText}

Erstelle eine Smart Note als JSON mit exakt diesem Format:
{
  "summary": "Kernkonzepte in 3-5 prägnanten Sätzen erklärt",
  "keywords": ["Fachbegriff1", "Fachbegriff2"],
  "examTopics": ["Klausurthema 1", "Klausurthema 2"]
}
keywords: 6-10 Fachbegriffe die ein Schüler für die Klausur kennen muss.
examTopics: 3-5 konkrete Aufgabenstellungen wie sie in einer echten Abiturklausur vorkommen.`,
      },
    ],
  })

  const parsed = JSON.parse(content) as SmartNoteJSON

  return {
    lessonId,
    rawText,
    summary: parsed.summary,
    keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
    examTopics: Array.isArray(parsed.examTopics) ? parsed.examTopics : [],
    generatedAt: new Date().toISOString(),
    subjectName,
  }
}
