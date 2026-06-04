import type { GeneratedSmartNote, GeneratedExam, ExamCorrection, ProbeklausurTask, ProbeklausurMaterial, TaskCorrection } from '../types'
import { buildKcPromptContext, type KcSubjectData } from '../data/kcLoader'

const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent'
const EXAM_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

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

// ── Probeklausur: Exam Generation & Correction ───────────────────────────────

async function examFetch(systemPrompt: string, userPrompt: string, temperature = 0.6): Promise<unknown> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY fehlt in .env')

  const res = await fetch(`${EXAM_API_URL}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
      },
    }),
  })

  if (!res.ok) {
    let msg = `Gemini Fehler ${res.status}`
    try { msg = ((await res.json()) as { error?: { message?: string } }).error?.message ?? msg } catch { /* keep */ }
    throw new Error(msg)
  }

  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  const cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```\s*$/, '').trim()
  if (!cleaned) throw new Error('Gemini hat keine Antwort zurückgegeben')
  return JSON.parse(cleaned)
}

const GENERATION_SYSTEM = `Du bist ein Abiturklausur-Generator für Niedersachsen. Erstelle exakt dem deutschen Abitur entsprechende Aufgaben.

AUFGABENFORMAT:
- Genau 1 Satz pro Teilaufgabe (max. 2 bei AFB III). Operator am Satzanfang. Sie-Form.
- Bewertungseinheiten am Ende: (8 BE)
- Materialverweise: (M 1), (M 2)

AFB I — Reproduktion (4–8 BE):
Operatoren: nennen, beschreiben, skizzieren, zusammenfassen, darstellen, angeben
KEIN Material. Direktes Fachwissen.

AFB II — Transfer (8–12 BE):
Operatoren: erläutern, erklären, auswerten, vergleichen, ermitteln, bestätigen, herleiten, interpretieren
MIT Material ODER Transferkontext direkt in der Aufgabe (Szenario, Vergleich, selbstgewähltes Beispiel).

AFB III — Bewertung (8–12 BE):
Operatoren: beurteilen, bewerten, Stellung nehmen, erörtern, prüfen, entwickeln (Hypothese)
Optional Material. Eigenständiges Urteil gefordert.

MATERIALREGELN:
- Datentabelle: ≥6 Messpunkte, realistische Werte mit Einheiten, erkennbarer Trend
- Diagramm: Als Text beschrieben, Achsenbeschriftung+Einheiten, Zahlenwerte
- Versuchsaufbau: Bauteile mit Messwerten, klare Schritte
- Informationstext: 3–6 Sätze, neue Fachinfo die NICHT die Antwort vorwegnimmt
- Formeln: nur Unicode (x², √, π, ∫, ·, ≈, →, Δ) — KEIN LaTeX

FACHSPEZIFISCH:
Bio: I=Schemata/Prozesse; II=Materialauswertung+Fachwissen; III=Hypothesen/Ethik
Physik: I=Begriffe/Schaltpläne; II=Messwerte auswerten/Gleichungen herleiten; III=Hypothesen
Mathe: I=ohne GTR; II=Sachaufgabe+GTR; III=Begründen ohne Rechnung. Formeln in Unicode.
Religion: I=Theologenpositionen; II=Vergleiche/biblische Bezüge; III=Ethische Erörterung
Geschichte: I=Ereignisse/Begriffe; II=Quellen auswerten; III=These erörtern
Englisch: Aufgaben auf ENGLISCH. I=Comprehension; II=Analysis; III=Comment

Jedes Material in mind. 1 Aufgabe referenziert. Antworte ausschließlich mit validem JSON.`

interface RawExamJSON {
  materials: { id: string; title: string; type: string; content: string }[]
  tasks: { id: string; label: string; afb: string; operator: string; text: string; be: number; materialRefs: string[] }[]
  totalBE: number
}

function parseExam(raw: unknown, subject: string, subjectId: string, topic: string, mode: 1 | 2 | 3 | 4): GeneratedExam {
  const j = raw as RawExamJSON
  const materials: ProbeklausurMaterial[] = (j.materials ?? []).map((m) => ({
    id: String(m.id),
    title: String(m.title ?? ''),
    type: (['tabelle', 'diagramm', 'versuchsaufbau', 'text', 'sequenz'].includes(m.type)
      ? m.type : 'text') as ProbeklausurMaterial['type'],
    content: String(m.content ?? ''),
  }))
  const tasks: ProbeklausurTask[] = (j.tasks ?? []).map((t) => ({
    id: String(t.id),
    label: String(t.label ?? t.id),
    afb: (['I', 'II', 'III'].includes(String(t.afb)) ? t.afb : 'I') as ProbeklausurTask['afb'],
    operator: String(t.operator ?? ''),
    text: String(t.text ?? ''),
    be: Number(t.be) || 0,
    materialRefs: Array.isArray(t.materialRefs) ? t.materialRefs.map(String) : [],
  }))
  return {
    subject, subjectId, topic, mode, materials, tasks,
    totalBE: Number(j.totalBE) || tasks.reduce((s, t) => s + t.be, 0),
  }
}

export async function generateMode1Exam(subject: string, subjectId: string, topic: string, afb: 'I' | 'II' | 'III', kcData?: KcSubjectData): Promise<GeneratedExam> {
  const materialRule = afb === 'I'
    ? 'Kein Material (leeres Array).'
    : afb === 'II'
      ? 'Genau 1 passendes Material (Tabelle oder Text).'
      : 'Optional 1 Material wenn nötig, sonst leer.'
  const beRange = afb === 'I' ? '4–8' : '8–12'
  const kcBlock = kcData ? `\nKC-Kontext:\n${buildKcPromptContext(kcData, 'oberstufe')}\n` : ''

  const raw = await examFetch(GENERATION_SYSTEM,
    `Fach: ${subject} | Thema: ${topic} | AFB: ${afb} | Material: ${materialRule} | BE: ${beRange}${kcBlock}

JSON: {"materials":[],"tasks":[{"id":"t1","label":"1","afb":"${afb}","operator":"...","text":"1 Satz mit Operator vorne + BE am Ende.","be":8,"materialRefs":[]}],"totalBE":8}`)
  return parseExam(raw, subject, subjectId, topic, 1)
}

export async function generateMode2Exam(subject: string, subjectId: string, topic: string, kcData?: KcSubjectData): Promise<GeneratedExam> {
  const fachHinweis: Record<string, string> = {
    biologie: '1 Komplex, Teilaufgaben 1.1–1.4, ~35 BE, 2 Materialien (M1+M2).',
    physik: '1 Komplex, Teilaufgaben 1.1–1.5, ~50 BE, M1=Versuchsaufbau+Messdaten, M2=Diagramm.',
    mathematik: 'TEIL A: Kurzaufgaben A1–A5 ohne GTR je 4 BE. TEIL B: Sachaufgaben B1.1–B2.x mit GTR. ~60 BE.',
    religion: '1 Komplex, 4–6 Aufgaben Trichter I→II→III, ~50 BE.',
  }
  const hinweis = fachHinweis[subjectId] ?? '1 Komplex, 3–5 Teilaufgaben, AFB I→II→III, 2–3 Materialien, ~45 BE.'
  const kcBlock = kcData ? `\nKC-Kontext:\n${buildKcPromptContext(kcData, 'oberstufe')}\n` : ''

  const raw = await examFetch(GENERATION_SYSTEM,
    `Fach: ${subject} | Thema: ${topic} | Struktur: ${hinweis}${kcBlock}

JSON: {"materials":[{"id":"M1","title":"...","type":"tabelle","content":"..."},{"id":"M2","title":"...","type":"text","content":"..."}],"tasks":[{"id":"t1","label":"1.1","afb":"I","operator":"...","text":"...","be":8,"materialRefs":[]},{"id":"t2","label":"1.2","afb":"II","operator":"...","text":"...","be":10,"materialRefs":["M1"]},{"id":"t3","label":"1.3","afb":"II","operator":"...","text":"...","be":10,"materialRefs":["M2"]},{"id":"t4","label":"1.4","afb":"III","operator":"...","text":"...","be":10,"materialRefs":["M2"]}],"totalBE":38}`,
    0.55)
  return parseExam(raw, subject, subjectId, topic, 2)
}

export async function generateMode3Exam(subject: string, subjectId: string, topic: string, kcData?: KcSubjectData): Promise<GeneratedExam> {
  const kcBlock = kcData ? `\nKC-Kontext:\n${buildKcPromptContext(kcData, 'oberstufe')}\n` : ''
  const raw = await examFetch(GENERATION_SYSTEM,
    `Fach: ${subject} | Thema: ${topic} | Modus: Materialklausur${kcBlock}
Regeln: M1=Kontext (Text/Versuch), M2=Daten (Tabelle/Diagramm), M3=optional.
Aufg.1 AFB I 6–8 BE: Fachwissen nötig zum Materialverständnis (kein Materialbezug).
Aufg.2 AFB II 10–12 BE: Material direkt auswerten + Fachwissen verknüpfen.
Aufg.3 AFB III 8–10 BE: Über Material hinaus (Hypothese, Bewertung, Stellung).

JSON: {"materials":[{"id":"M1","title":"...","type":"text","content":"..."},{"id":"M2","title":"...","type":"tabelle","content":"..."}],"tasks":[{"id":"t1","label":"1","afb":"I","operator":"Beschreiben","text":"...","be":6,"materialRefs":[]},{"id":"t2","label":"2","afb":"II","operator":"Auswerten","text":"...","be":12,"materialRefs":["M1","M2"]},{"id":"t3","label":"3","afb":"III","operator":"Entwickeln","text":"...","be":10,"materialRefs":["M2"]}],"totalBE":28}`)
  return parseExam(raw, subject, subjectId, topic, 3)
}

export async function generateMode4Exam(subject: string, subjectId: string, topic: string, kcData?: KcSubjectData): Promise<GeneratedExam> {
  const kcBlock = kcData ? `\nKC-Kontext:\n${buildKcPromptContext(kcData, 'oberstufe')}\n` : ''
  const raw = await examFetch(GENERATION_SYSTEM,
    `Fach: ${subject} | Thema: ${topic} | Modus: Ohne Material (alles aus dem Kopf)${kcBlock}
Aufg.1 AFB I 4–8 BE: Reproduktion ohne Material.
Aufg.2 AFB II 8–12 BE: Transfer OHNE Material — Vergleich, Szenario, oder "an einem selbst gewählten Beispiel".
Aufg.3 AFB III 8–10 BE: Argumentative Beurteilung/Erörterung ohne Material.

JSON: {"materials":[],"tasks":[{"id":"t1","label":"1","afb":"I","operator":"Beschreiben","text":"...","be":6,"materialRefs":[]},{"id":"t2","label":"2","afb":"II","operator":"Erläutern","text":"...","be":10,"materialRefs":[]},{"id":"t3","label":"3","afb":"III","operator":"Erörtern","text":"...","be":8,"materialRefs":[]}],"totalBE":24}`,
    0.65)
  return parseExam(raw, subject, subjectId, topic, 4)
}

// ── AI Correction ─────────────────────────────────────────────────────────────

const CORRECTION_SYSTEM = `Du bist ein erfahrener Abitur-Korrekteur für Niedersachsen. Korrigiere Schülerantworten konstruktiv und präzise.

KATEGORIEN:
- errors: Inhaltlich falsche oder ungenaue Aussagen (leer wenn keine Fehler)
- gaps: Was fehlt, das für volle Punkte nötig wäre (leer wenn vollständig)
- formulationHelp: Wissenschaftlichere Formulierungen (konkrete Beispiele "Statt '...' besser: '...'")

NOTENPUNKTE 0–15:
15=herausragend, 13–14=Sehr gut, 10–12=Gut, 7–9=Befriedigend, 4–6=Ausreichend, 1–3=Mangelhaft, 0=Ungenügend/leer

gradeLabel: "Sehr gut" | "Gut" | "Befriedigend" | "Ausreichend" | "Mangelhaft" | "Ungenügend"
Bei leerer Antwort: scoreNP=0, errors=[], gaps=["Keine Antwort gegeben."], formulationHelp=[].
Antworte ausschließlich mit validem JSON.`

function npToGradeLabel(np: number): string {
  if (np >= 13) return 'Sehr gut'
  if (np >= 10) return 'Gut'
  if (np >= 7) return 'Befriedigend'
  if (np >= 4) return 'Ausreichend'
  if (np >= 1) return 'Mangelhaft'
  return 'Ungenügend'
}

export async function correctExam(exam: GeneratedExam, answers: Record<string, string>): Promise<ExamCorrection> {
  const materialsBlock = exam.materials.map((m) => `${m.id} — ${m.title}:\n${m.content}`).join('\n\n')
  const tasksBlock = exam.tasks.map((t) => {
    const answer = (answers[t.id] ?? '').trim()
    return `Aufgabe ${t.label} (AFB ${t.afb}, ${t.be} BE): ${t.text}\nAntwort: ${answer || '[keine Antwort]'}`
  }).join('\n\n')

  const userPrompt = `Fach: ${exam.subject} | Thema: ${exam.topic}
${exam.materials.length > 0 ? `\nMaterialien:\n${materialsBlock}\n` : ''}
${tasksBlock}

JSON: {"taskCorrections":[{"taskId":"t1","errors":[],"gaps":[],"formulationHelp":[],"scoreNP":11,"justification":"..."}],"totalNP":11,"gradeLabel":"Gut","overallJustification":"..."}`

  const raw = (await examFetch(CORRECTION_SYSTEM, userPrompt, 0.3)) as {
    taskCorrections?: { taskId?: string; errors?: string[]; gaps?: string[]; formulationHelp?: string[]; scoreNP?: number; justification?: string }[]
    totalNP?: number
    gradeLabel?: string
    overallJustification?: string
  }

  const taskCorrections: TaskCorrection[] = (raw.taskCorrections ?? []).map((tc) => ({
    taskId: String(tc.taskId ?? ''),
    errors: Array.isArray(tc.errors) ? tc.errors.map(String) : [],
    gaps: Array.isArray(tc.gaps) ? tc.gaps.map(String) : [],
    formulationHelp: Array.isArray(tc.formulationHelp) ? tc.formulationHelp.map(String) : [],
    scoreNP: Math.max(0, Math.min(15, Number(tc.scoreNP) || 0)),
    justification: String(tc.justification ?? ''),
  }))

  const totalNP = Math.max(0, Math.min(15, Number(raw.totalNP) || 0))

  return {
    taskCorrections,
    totalNP,
    gradeLabel: String(raw.gradeLabel || npToGradeLabel(totalNP)),
    overallJustification: String(raw.overallJustification ?? ''),
  }
}

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
