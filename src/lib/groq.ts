import type { GeneratedSmartNote } from '../types'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct'
const TEXT_MODEL = 'llama-3.3-70b-versatile'

async function resizeImage(dataUrl: string, maxWidth = 1536): Promise<{ base64: string; mimeType: 'image/jpeg' }> {
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
      resolve({ base64: canvas.toDataURL('image/jpeg', 0.88).split(',')[1], mimeType: 'image/jpeg' })
    }
    img.onerror = () => reject(new Error('Bild konnte nicht geladen werden'))
    img.src = dataUrl
  })
}

interface GroqResponse {
  choices: { message: { content: string } }[]
}

interface GroqErrorBody {
  error?: { message?: string }
}

function parseRetryAfterMs(errorText: string): number {
  const match = /try again in ([\d.]+)s/i.exec(errorText)
  return match ? Math.ceil(parseFloat(match[1]) * 1000) + 500 : 5000
}

async function groqFetch(body: Record<string, unknown>): Promise<string> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY as string | undefined
  if (!apiKey) throw new Error('VITE_GROQ_API_KEY fehlt in .env')

  const attempt = async () => fetch(GROQ_API_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  let res = await attempt()

  if (res.status === 429) {
    const text = await res.text()
    const waitMs = parseRetryAfterMs(text)
    await new Promise((r) => setTimeout(r, waitMs))
    res = await attempt()
  }

  if (!res.ok) {
    const text = await res.text()
    let msg = `Groq API Fehler ${res.status}`
    try { msg = (JSON.parse(text) as GroqErrorBody).error?.message ?? msg } catch { /* raw text */ }
    throw new Error(msg)
  }

  return ((await res.json()) as GroqResponse).choices[0].message.content
}

// Step 1: Foto → Text via Llama 3.2 Vision
export async function extractTextFromImage(dataUrl: string): Promise<string> {
  const { base64, mimeType } = await resizeImage(dataUrl)

  return groqFetch({
    model: VISION_MODEL,
    max_tokens: 1024,
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
  contentType?: 'info' | 'aufgabe' | 'beides'
  summary: string
  keywords: string[]
  examTopics: string[]
  solution?: { steps: string[]; answer: string; proof?: string }
}

interface TextBlockJSON {
  additionalKeywords: string[]
  suggestExplain: string[]
  summary: string
}

export async function analyzeTextBlock(
  text: string,
  subjectName: string,
): Promise<{ additionalKeywords: string[]; suggestExplain: string[]; summary: string }> {
  const content = await groqFetch({
    model: TEXT_MODEL,
    max_tokens: 512,
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

Schülernotizen:
${text.slice(0, 800)}

JSON:
{
  "additionalKeywords": ["Fachbegriff nicht im Text aber relevant"],
  "suggestExplain": ["Begriff aus dem Text der erklärt werden sollte"],
  "summary": "2–3 Sätze Kontext-Zusammenfassung"
}
additionalKeywords: 3–6 Fachbegriffe die zum Thema gehören aber NICHT im Text stehen.
suggestExplain: 2–4 Begriffe die IM Text vorkommen und für einen Schüler erklärenswert sind.`,
      },
    ],
  })
  const parsed = JSON.parse(content) as TextBlockJSON
  return {
    additionalKeywords: Array.isArray(parsed.additionalKeywords) ? parsed.additionalKeywords : [],
    suggestExplain: Array.isArray(parsed.suggestExplain) ? parsed.suggestExplain : [],
    summary: parsed.summary ?? '',
  }
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

interface ClassifyJSON {
  contentType?: 'info' | 'aufgabe' | 'beides'
  summary?: string
  keywords?: string[]
}

export async function classifyContent(
  transcription: string,
  subjectName: string,
): Promise<{ contentType: 'info' | 'aufgabe' | 'beides'; summary: string; keywords: string[] }> {
  const content = await groqFetch({
    model: TEXT_MODEL,
    max_tokens: 512,
    temperature: 0.1,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'Du klassifizierst Schülernotizen. Antworte ausschließlich mit validem JSON.',
      },
      {
        role: 'user',
        content: `Fach: ${subjectName}

Text vom Foto:
${transcription.slice(0, 1500)}

JSON mit exakt diesen 3 Feldern:
{"contentType":"aufgabe","summary":"","keywords":["Begriff"]}
contentType: "info" = nur Lernstoff, "aufgabe" = Aufgaben vorhanden, "beides" = beides
summary: max 2 Sätze Zusammenfassung des Lernstoffs (leer wenn reine Aufgaben)
keywords: 3-5 Fachbegriffe als einfache Strings ohne Sonderzeichen`,
      },
    ],
  })
  const parsed = JSON.parse(content) as ClassifyJSON
  return {
    contentType: parsed.contentType ?? 'info',
    summary: parsed.summary ?? '',
    keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
  }
}

export async function solveTasksFromText(
  transcription: string,
  subjectName: string,
): Promise<Array<{ question: string; steps: string[]; answer: string; proof?: string }>> {
  const raw = await groqFetch({
    model: TEXT_MODEL,
    max_tokens: 4096,
    temperature: 0.1,
    messages: [
      {
        role: 'system',
        content: 'Du bist ein Fachlehrer für deutsche Gymnasiasten. Löse JEDE Aufgabe vollständig. Antworte NUR mit dem vorgegebenen Textformat — kein JSON, keine Einleitung.',
      },
      {
        role: 'user',
        content: `Fach: ${subjectName}

Text vom Foto:
${transcription.slice(0, 2000)}

Löse jede Aufgabe im folgenden Format. Nutze EXAKT diese Marker:

===AUFGABE_1===
[Aufgabenstellung hier]
---SCHRITTE---
2x + 4 = 10 | -4
2x = 6 | /2
x = 3
---ERGEBNIS---
x = 3
---PROBE---
2*3+4=10 (stimmt)
===AUFGABE_2===
[nächste Aufgabe]
---SCHRITTE---
...

Regeln:
- Jeden Rechenschritt auf einer eigenen Zeile mit dem Zwischenergebnis
- ---PROBE--- nur bei Mathe, sonst weglassen
- Sind keine Aufgaben vorhanden, schreibe nur: KEIN_AUFGABEN`,
      },
    ],
  })

  if (raw.trim().startsWith('KEIN_AUFGABEN') || !raw.includes('===AUFGABE_')) return []

  const blocks = raw.split(/===AUFGABE_\d+===/).filter((b) => b.trim())
  return blocks.map((block) => {
    const question = block.split('---SCHRITTE---')[0].trim()
    const stepsPart = block.split('---SCHRITTE---')[1]?.split('---ERGEBNIS---')[0] ?? ''
    const ergebnisPart = block.split('---ERGEBNIS---')[1]?.split('---PROBE---')[0]?.split('===')[0] ?? ''
    const probePart = block.split('---PROBE---')[1]?.split('===')[0] ?? ''
    return {
      question,
      steps: stepsPart.split('\n').map((s) => s.trim()).filter(Boolean),
      answer: ergebnisPart.trim(),
      proof: probePart.trim() || undefined,
    }
  }).filter((t) => t.steps.length > 0 || t.answer)
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

Text:
${rawText}

Analysiere den Text und erstelle eine Smart Note als JSON.

SCHRITT 1 — Erkenne den Typ:
- "info": reiner Lernstoff (Erklärungen, Definitionen, Tafelbilder)
- "aufgabe": Aufgabe oder Problemstellung die gelöst werden soll
- "beides": Lernstoff UND Aufgaben gemischt

SCHRITT 2 — JSON mit exakt diesem Format:
{
  "contentType": "info" | "aufgabe" | "beides",
  "summary": "Kernaussage in 2–4 Sätzen (bei reiner Aufgabe: leerer String)",
  "keywords": ["Fachbegriff1", "Fachbegriff2"],
  "examTopics": ["Klausurthema 1"],
  "solution": {
    "steps": ["Schritt 1: ...", "Schritt 2: ..."],
    "answer": "Ergebnis: ..."
  }
}

Regeln:
- keywords: 4–8 Fachbegriffe die ein Schüler kennen muss
- examTopics: 2–4 Klausurthemen (bei reiner Aufgabe: leeres Array [])
- solution: NUR ausfüllen wenn contentType "aufgabe" oder "beides" ist, sonst weglassen
- solution.steps: 2–6 klare Lösungsschritte mit vollständigem Rechenweg
- solution.answer: finales Ergebnis als ein prägnanter Satz
- solution.proof: Probe — Lösung in die Ausgangsformel einsetzen und Gleichheit zeigen (ein Satz, NUR bei mathematischen Aufgaben)`,
      },
    ],
  })

  const parsed = JSON.parse(content) as SmartNoteJSON

  return {
    lessonId,
    rawText,
    contentType: parsed.contentType,
    summary: parsed.summary ?? '',
    keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
    examTopics: Array.isArray(parsed.examTopics) ? parsed.examTopics : [],
    solution: parsed.solution && Array.isArray(parsed.solution.steps) && parsed.solution.steps.length > 0
      ? { steps: parsed.solution.steps, answer: parsed.solution.answer, proof: parsed.solution.proof }
      : undefined,
    generatedAt: new Date().toISOString(),
    subjectName,
  }
}
