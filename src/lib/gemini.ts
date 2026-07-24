import type { GeneratedSmartNote, GeneratedExam, ExamCorrection, ProbeklausurTask, ProbeklausurMaterial, TaskCorrection, LernplanDay, LernplanExam, LernplanGeneratorInput, LernzettelModus } from '../types'
import { buildKcPromptContext, type KcSubjectData } from '../data/kcLoader'
import { supabase } from './supabase'
import type { AiBucket } from './aiRateLimit'

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
}

interface GeminiProxyResult {
  geminiStatus: number
  geminiData: unknown
}

// gemini-2.5-flash/-flash-lite/-flash-image are deprecated, shutting down Oct 2026. Replacements
// chosen per Simon's explicit "prefer stability" call: established current models, not the
// literal newest point release. flash-image has no non-preview alternative — that's Google's
// label on the model itself, not a stability trade-off made here. Keep in sync with the
// identical map in api/gemini.ts (prod proxy path uses its own copy).
const GEMINI_URLS: Record<string, string> = {
  'flash': 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent',
  'flash-lite': 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent',
  'flash-image': 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent',
}

// Reads the response as text first rather than calling res.json() directly. A non-JSON body
// (almost always a platform-level error page — e.g. a gateway timeout on a very large/slow
// generation like Lernplan's 32k-token request — never something our own api/gemini.ts handler
// produces, since every one of its code paths returns JSON) used to throw a raw, uncatchable
// SyntaxError ("Unexpected token 'A', "An error o"... is not valid JSON") instead of a message
// any caller could show the user. Every caller already branches on `geminiStatus !== 200` and
// reads `geminiData.error.message`, so returning a synthetic result here needs no other changes.
async function parseGeminiResponse(res: Response): Promise<GeminiProxyResult> {
  const text = await res.text()
  try {
    return JSON.parse(text) as GeminiProxyResult
  } catch {
    return {
      geminiStatus: res.status || 500,
      geminiData: {
        error: {
          message: 'Der Server hat keine gültige Antwort geliefert. Das passiert manchmal bei sehr umfangreichen Anfragen (z.B. langen Lernplänen) — bitte erneut versuchen.',
        },
      },
    }
  }
}

async function geminiProxy(
  model: 'flash' | 'flash-lite' | 'flash-image',
  body: Record<string, unknown>,
  bucket: AiBucket,
  signal?: AbortSignal,
): Promise<GeminiProxyResult> {
  if (import.meta.env.DEV) {
    // Dev: call Gemini directly (key in .env, not public). Prod: Vercel Edge Function hides the
    // key and enforces the per-bucket rate limit (see api/gemini.ts) — bucket is unused in dev.
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string
    const url = GEMINI_URLS[model] ?? GEMINI_URLS['flash']
    const res = await fetch(`${url}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    })
    const result = await parseGeminiResponse(res)
    return { geminiStatus: res.status, geminiData: result.geminiData }
  }
  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...await getAuthHeader(),
    },
    body: JSON.stringify({ model, body, bucket }),
    signal,
  })
  return await parseGeminiResponse(res)
}

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
  const { base64, mimeType } = await fileToBase64(file)

  const geminiBody = {
    contents: [{
      parts: [
        { inline_data: { mime_type: mimeType, data: base64 } },
        {
          text: `Du bist ein Lernassistent für deutsche Abiturschüler. Analysiere das Dokument und erstelle eine strukturierte Smart Note. Fach-Kontext: ${subjectName}. Antworte NUR mit validem JSON (keywords: genau 5 Fachbegriffe):
{
  "title": "Kurzer Titel des Inhalts (max 60 Zeichen)",
  "summary": "3-5 Sätze Zusammenfassung des Lerninhalts auf Deutsch",
  "keywords": ["Fachbegriff1", "Fachbegriff2", "Fachbegriff3", "Fachbegriff4", "Fachbegriff5"],
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

  const makeAttempt = () => geminiProxy('flash-lite', geminiBody, 'smart_notes', signal)

  let result = await makeAttempt()

  if (result.geminiStatus === 429 && !signal?.aborted) {
    await sleep(8000)
    result = await makeAttempt()
  }

  if (result.geminiStatus !== 200) {
    const errData = result.geminiData as { error?: { message?: string } }
    let msg = errData?.error?.message ?? `Gemini Fehler ${result.geminiStatus}`
    if (result.geminiStatus === 429) msg = 'Rate Limit — wird automatisch wiederholt.'
    if (result.geminiStatus === 400) msg = 'Datei konnte nicht verarbeitet werden.'
    throw new Error(msg)
  }

  const json = result.geminiData as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
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

async function examFetch(systemPrompt: string, userPrompt: string, bucket: AiBucket, temperature = 0.6): Promise<unknown> {
  const result = await geminiProxy('flash', {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    // gemini-3.5-flash thinks by default (confirmed: ~600 hidden "thought" tokens on a simple
    // exam-generation test, counted against maxOutputTokens) — thinkingLevel 'low' keeps this
    // fast and predictable, matching how these prompts were originally tuned for a non-reasoning
    // model. gemini-3.1-flash-lite has no such overhead by default, so it's left alone below.
    generationConfig: { temperature, maxOutputTokens: 8192, responseMimeType: 'application/json', thinkingConfig: { thinkingLevel: 'low' } },
  }, bucket)

  if (result.geminiStatus !== 200) {
    const errData = result.geminiData as { error?: { message?: string } }
    throw new Error(errData?.error?.message ?? `Gemini Fehler ${result.geminiStatus}`)
  }

  const data = result.geminiData as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
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
Operatoren (Textfächer): nennen, beschreiben, skizzieren, zusammenfassen, darstellen, angeben
Operatoren (Mathematik): nennen, angeben, berechnen (Standardalgorithmus), skizzieren, einsetzen
KEIN Material. Direktes Fachwissen oder Standardverfahren.

AFB II — Transfer (8–12 BE):
Operatoren (Textfächer): erläutern, erklären, auswerten, vergleichen, ermitteln, bestätigen, herleiten, interpretieren
Operatoren (Mathematik): beschreiben, begründen, überprüfen, darstellen, zeichnen, untersuchen
MIT Material ODER Transferkontext / Sachzusammenhang direkt in der Aufgabe.

AFB III — Bewertung (8–12 BE):
Operatoren (Textfächer): beurteilen, bewerten, Stellung nehmen, erörtern, prüfen, entwickeln (Hypothese)
Operatoren (Mathematik): beweisen, beurteilen, diskutieren, interpretieren, verallgemeinern
Optional Material. Eigenständiges Urteil oder mathematischer Beweis gefordert.

MATERIALREGELN (Naturwissenschaften & Mathematik):
- Datentabelle: ≥6 Messpunkte, realistische Werte mit Einheiten, erkennbarer Trend
- Diagramm: Als Text beschrieben, Achsenbeschriftung+Einheiten, Zahlenwerte
- Versuchsaufbau: Bauteile mit Messwerten, klare Schritte
- Formeln: nur Unicode (x², √, π, ∫, ·, ≈, →, Δ) — KEIN LaTeX

MATERIALREGELN (Geistes- & Sprachwissenschaften):
- Sachtext/Zeitungsartikel: ca. 250–350 Wörter, klar strukturiert, fachlich relevant
- Literarischer Text: Textauszug mit Autor und Jahreszahl, ggf. Textsortenhinweis
- Politische Rede / Philosophischer Text: direktes Zitat oder Paratext, klar abgegrenzt
- Statistik: einfache Tabelle mit Prozentwerten oder Fallzahlen, Quelle angeben
- KEINE naturwissenschaftlichen Messreihen oder Laborversuchsbeschreibungen

FACHSPEZIFISCH:
Bio: I=Schemata/Prozesse; II=Materialauswertung+Fachwissen; III=Hypothesen/Ethik
Physik: I=Begriffe/Schaltpläne; II=Messwerte auswerten/Gleichungen herleiten; III=Hypothesen
Chemie: I=Reaktionsgleichungen/Strukturformeln; II=Experiment auswerten; III=Hypothesen/Bewertung
Mathe: I=Standardverfahren ohne GTR, Operatoren nennen/angeben/berechnen/skizzieren; II=Sachaufgabe mit GTR, Operatoren begründen/überprüfen/beschreiben; III=Verallgemeinern/Beweisen ohne Rechnung, Operatoren beweisen/diskutieren/interpretieren. Formeln in Unicode.
Deutsch: I=Wiedergabe/Beschreibung; II=Analyse/Interpretation des Textes; III=Erörterung/Stellungnahme. Material=Literarischer Text oder Sachtext ca. 300 Wörter.
Englisch: Aufgaben auf ENGLISCH. I=Comprehension; II=Analysis; III=Comment. Material=English text ca. 300 words.
Französisch/Spanisch/Latein: Aufgaben in Zielsprache. Material=Authentischer Originaltext.
Geschichte: I=Ereignisse/Begriffe; II=Quelle auswerten; III=These erörtern. Material=Historische Quelle oder Historikertext ca. 250 Wörter.
Politik: I=Sachkenntnis; II=Quelle/Daten auswerten; III=Politisches Urteil. Material=Zeitungsartikel oder Statistik.
Philosophie/Religion/Ethik: I=Position darstellen; II=Vergleichen/Analysieren; III=Ethische Erörterung. Material=Philosophischer Text oder Zitat.

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
  const isMath = subjectId === 'mathematik'

  const materialRule = afb === 'I'
    ? 'Kein Material (leeres Array).'
    : afb === 'II'
      ? isMath
        ? 'Optional: 1 Sachkontext (kurze Textbeschreibung einer realen Situation, KEINE Messreihe).'
        : 'Genau 1 passendes Material (Tabelle oder Text).'
      : 'Optional 1 Material wenn nötig, sonst leer.'

  const operatorHint = isMath
    ? afb === 'I'
      ? 'Operator muss einer sein von: nennen, angeben, berechnen, skizzieren, einsetzen. Standardalgorithmus anwenden.'
      : afb === 'II'
      ? 'Operator muss einer sein von: beschreiben, begründen, überprüfen, darstellen, zeichnen, untersuchen. Sachzusammenhang herstellen.'
      : 'Operator muss einer sein von: beweisen, beurteilen, diskutieren, interpretieren, verallgemeinern. Mathematisches Argument ohne reines Rechnen.'
    : ''

  const beRange = afb === 'I' ? '4–8' : '8–12'
  const kcBlock = kcData ? `\nKC-Kontext:\n${buildKcPromptContext(kcData, 'oberstufe')}\n` : ''

  const raw = await examFetch(GENERATION_SYSTEM,
    `Fach: ${subject} | Thema: ${topic} | AFB: ${afb} | Material: ${materialRule} | BE: ${beRange}${operatorHint ? `\n${operatorHint}` : ''}${kcBlock}

JSON: {"materials":[],"tasks":[{"id":"t1","label":"1","afb":"${afb}","operator":"...","text":"1 Satz mit Operator vorne + BE am Ende.","be":8,"materialRefs":[]}],"totalBE":8}`,
    'probeklausur_other')
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
    'probeklausur_full', 0.55)
  return parseExam(raw, subject, subjectId, topic, 2)
}

export async function generateMode3Exam(subject: string, subjectId: string, topic: string, kcData?: KcSubjectData): Promise<GeneratedExam> {
  const kcBlock = kcData ? `\nKC-Kontext:\n${buildKcPromptContext(kcData, 'oberstufe')}\n` : ''

  const isHumanities = [
    'deutsch', 'englisch', 'franzoesisch', 'latein', 'spanisch', 'russisch', 'italienisch',
    'griechisch', 'japanisch', 'geschichte', 'politik', 'philosophie', 'ethik', 'werteUndNormen',
    'religion', 'seminarfach',
  ].includes(subjectId)

  const materialSpec = isHumanities
    ? `M1=Authentischer Fachtext (ca. 250–350 Wörter, Sachtext/Zeitungsartikel/Quelle/Zitat/Literaturtext — je nach Fach), M2=optional (Statistik, zweiter Textauszug oder entfällt).`
    : `M1=Kontexttext oder Versuchsaufbau, M2=Daten (Messdaten-Tabelle oder Diagramm mit ≥6 Werten), M3=optional.`

  const taskSpec = isHumanities
    ? `Aufg.1 AFB I 6–8 BE: Textinhalt wiedergeben / Fachwissen darstellen (kein Materialbezug).
Aufg.2 AFB II 10–14 BE: Text analysieren / interpretieren / Fachwissen anwenden (Materialbezug M1).
Aufg.3 AFB III 8–12 BE: Erörtern / Stellungnahme / Urteil über das Material hinaus.`
    : `Aufg.1 AFB I 6–8 BE: Fachwissen zum Materialverständnis (kein Materialbezug).
Aufg.2 AFB II 10–12 BE: Material direkt auswerten + Fachwissen verknüpfen (M1+M2).
Aufg.3 AFB III 8–10 BE: Über Material hinaus (Hypothese, Bewertung, Stellungnahme).`

  const raw = await examFetch(GENERATION_SYSTEM,
    `Fach: ${subject} | Thema: ${topic} | Modus: Materialklausur${kcBlock}
Materialien: ${materialSpec}
${taskSpec}

JSON: {"materials":[{"id":"M1","title":"...","type":"text","content":"..."}],"tasks":[{"id":"t1","label":"1","afb":"I","operator":"Beschreiben","text":"...","be":6,"materialRefs":[]},{"id":"t2","label":"2","afb":"II","operator":"Auswerten","text":"...","be":12,"materialRefs":["M1"]},{"id":"t3","label":"3","afb":"III","operator":"Erörtern","text":"...","be":10,"materialRefs":["M1"]}],"totalBE":28}`,
    'probeklausur_other')
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
    'probeklausur_other', 0.65)
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

  const raw = (await examFetch(CORRECTION_SYSTEM, userPrompt, 'probeklausur_other', 0.3)) as {
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

// ── Lernzettel Generation ────────────────────────────────────────────────────

export interface LernzettelInput {
  subjectId: string
  subjectName: string
  modus: LernzettelModus
  selectedTopics: string[]
  smartNotes: GeneratedSmartNote[]
  kcData?: KcSubjectData
}

export interface LernzettelImagePrompt {
  afterHeading?: string
  prompt: string
  alt: string
}

export interface LernzettelOutput {
  title: string
  content: string
  keywords: string[]
  examTopics: string[]
  images: LernzettelImagePrompt[]
}

const LERNZETTEL_SYSTEM = `Du bist ein erfahrener Fachlehrer, der für deutsche Gymnasiasten (Klasse 10–13, Oberstufe) Lernzettel erstellt — so gründlich und durchdacht, wie es ein guter Lehrer für die eigene Klasse tun würde. Antworte ausschließlich auf Deutsch.

OUTPUT-FORMAT (STRIKT):
- Antworte ausschließlich mit validem JSON, keine Markdown-Codeblöcke außen herum.
- "content" ist ein Markdown-artiger String mit exakt diesem Subset (kein anderes Markdown verwenden):
  - "## " für Hauptabschnitte, "### " für Unterabschnitte
  - "**Begriff**: Erklärung" für Definitionen von Fachbegriffen (fett nur der Begriff, nicht der ganze Satz)
  - Zeilen die mit "Merke: " beginnen für die wirklich zentralen Merksätze (sparsam, nur 2–4 pro Lernzettel)
  - Zeilen die mit "- " beginnen für Aufzählungen (v. a. im Stichpunkte-Modus)
  - Leerzeilen zwischen Absätzen für Lesbarkeit
  - Mathematische/naturwissenschaftliche Formeln IMMER als echtes LaTeX zwischen $...$ (inline) oder $$...$$ (eigene Zeile bei längeren Herleitungen) — z. B. $f'(x) = \\lim_{h \\to 0} \\frac{f(x+h)-f(x)}{h}$. Kein Unicode-Ersatz (kein x², kein √) — der Renderer kann echtes LaTeX darstellen.
- content endet immer mit einem Abschnitt "## Klausurrelevanz" mit den wichtigsten prüfungsrelevanten Punkten.

TIEFE:
- Kein oberflächlicher Überblick — jeder in den Smart Notes oder gewählten Themen vorkommende Fachbegriff wird tatsächlich erklärt, nicht nur genannt.
- Ziel-Länge 1500–2500 Wörter (Ausnahme: Stichpunkte-Modus, siehe unten) — lieber gründlich als kurz.
- Bei mathematischen/naturwissenschaftlichen Themen: Herleitungen zeigen, nicht nur Endformeln nennen, wo sinnvoll auch ein Rechenbeispiel einbauen.
- Bei Textfächern/Gesellschaftswissenschaften: Zusammenhänge, Ursachen/Wirkungen, unterschiedliche Positionen wo fachlich relevant.

BILDER (optional, sehr sparsam):
- Nur wenn eine Visualisierung wirklich zusätzliches Verständnis bringt (z. B. ein Diagramm, ein Aufbau, ein Kreislauf, eine räumliche Struktur) — bei rein textlichen/abstrakten Themen "images": [] lassen.
- Maximal 2 Einträge: [{"afterHeading":"Exakter Text einer ##/### Überschrift aus content","prompt":"präzise Bildbeschreibung für einen Bildgenerator, auf Deutsch oder Englisch — klar und sachlich wie ein Schulbuch-Diagramm, kein Foto-Realismus nötig","alt":"kurze Alt-Text-Beschreibung"}]
- "afterHeading" muss wortwörtlich einer Überschrift aus content entsprechen, sonst kann das Bild nicht platziert werden.

Antworte NUR mit validem JSON:
{"title":"...","content":"...","keywords":["..."],"examTopics":["..."],"images":[]}`

const LERNZETTEL_MODUS_PROMPTS: Record<LernzettelModus, string> = {
  faktisch: `MODUS: Faktisch-präzise. Ziel: Der Schüler soll Textbausteine direkt in einer Klausur verwenden können. Jeder Fachbegriff wird vollständig und fachlich korrekt definiert, mit exakter Terminologie — auf dem Niveau, das ein Prüfer erwartet. Sprachlich anspruchsvoll und druckreif formuliert, keine umgangssprachlichen Vereinfachungen. Wo es mehrere gängige Definitionen gibt, die prüfungsrelevanteste wählen und kurz begründen.`,
  bildlich: `MODUS: Bildlich-anschaulich. Ziel: Jemand, der das Thema noch nie gehört hat, versteht es wirklich. Nutze durchgehend Alltagsvergleiche, Analogien und bildhafte Sprache statt trockener Definitionen (z. B. "Stell dir vor…", "Das funktioniert ähnlich wie…"). Fachbegriffe werden eingeführt, aber sofort in einfache Worte übersetzt. Kurze, klare Sätze, wenig Schachtelsätze.`,
  grundlagen: `MODUS: Von Grund auf. Ziel: Nichts wird vorausgesetzt. Beginne mit einem Abschnitt "## Das musst du vorher wissen", der die Voraussetzungen klärt, die man kennen muss, um das eigentliche Thema zu verstehen (auch wenn das nicht Teil der ursprünglichen Notizen war) — und baue danach systematisch Schritt für Schritt zum eigentlichen Thema auf. Jeder Schritt baut erkennbar auf dem vorigen auf.`,
  stichpunkte: `MODUS: Stichpunkte. Ziel: Schnelles Wiederholen kurz vor der Klausur. Überwiegend "- "-Aufzählungen statt Fließtext, nur die wichtigsten Fakten, Definitionen und Zusammenhänge — keine ausschweifenden Erklärungen. Trotzdem inhaltlich vollständig für das Thema. Ziel-Länge hier kürzer: ca. 500–900 Wörter in kompakten Stichpunkten statt der sonst üblichen 1500–2500.`,
}

export async function generateLernzettel(input: LernzettelInput): Promise<LernzettelOutput> {
  const { subjectId, subjectName, modus, selectedTopics, smartNotes, kcData } = input
  const isMath = subjectId === 'mathematik'

  const notesBlock = smartNotes.slice(0, 5).map((n, i) => {
    const body = [
      n.summary ? `Zusammenfassung: ${n.summary.slice(0, 600)}` : '',
      n.keywords.length ? `Schlüsselbegriffe: ${n.keywords.join(', ')}` : '',
      n.examTopics.length ? `Klausurthemen: ${n.examTopics.join(', ')}` : '',
    ].filter(Boolean).join('\n')
    return `--- Note ${i + 1} ---\n${body}`
  }).join('\n\n')

  const topicsLine = selectedTopics.length ? `Ausgewählte Themen: ${selectedTopics.join(', ')}\n` : ''
  const kcBlock = kcData ? `\nKC-Kontext:\n${buildKcPromptContext(kcData, 'oberstufe')}\n` : ''
  const mathHint = isMath ? '\nFach ist Mathematik: Formeln durchgängig in LaTeX, Herleitungen nicht überspringen.' : ''

  const userPrompt = `Fach: ${subjectName}
${topicsLine}${LERNZETTEL_MODUS_PROMPTS[modus]}${mathHint}

Smart Notes des Schülers:
${notesBlock || '(keine — nur auf Basis von Fach/Thema/Kerncurriculum erstellen)'}
${kcBlock}
Erstelle den vollständigen Lernzettel als JSON gemäß der Vorgaben aus der System-Instruktion.`

  const raw = (await examFetch(LERNZETTEL_SYSTEM, userPrompt, 'lernzettel', 0.4)) as {
    title?: string
    content?: string
    keywords?: string[]
    examTopics?: string[]
    images?: { afterHeading?: string; prompt?: string; alt?: string }[]
  }

  return {
    title: raw.title?.trim() || `${subjectName} — Lernzettel`,
    content: raw.content ?? '',
    keywords: Array.isArray(raw.keywords) ? raw.keywords.map(String) : [],
    examTopics: Array.isArray(raw.examTopics) ? raw.examTopics.map(String) : [],
    images: Array.isArray(raw.images)
      ? raw.images.filter((i): i is { afterHeading?: string; prompt: string; alt?: string } => !!i.prompt).slice(0, 2).map((i) => ({
          afterHeading: i.afterHeading,
          prompt: i.prompt,
          alt: i.alt ?? '',
        }))
      : [],
  }
}

/** Generates one explanatory visual via gemini-2.5-flash-image (Gemini's free-tier image model). Returns a data: URL. */
export async function generateLernzettelVisual(prompt: string): Promise<string> {
  const result = await geminiProxy('flash-image', {
    contents: [{
      role: 'user',
      parts: [{ text: `Erstelle ein klares, sachliches Schulbuch-Diagramm/Bild für einen Lernzettel (kein Fotorealismus). ${prompt}` }],
    }],
    generationConfig: { responseModalities: ['IMAGE'] },
  }, 'lernzettel_visuals')

  if (result.geminiStatus !== 200) {
    const errData = result.geminiData as { error?: { message?: string } }
    throw new Error(errData?.error?.message ?? `Gemini Fehler ${result.geminiStatus}`)
  }

  const data = result.geminiData as {
    candidates?: { content?: { parts?: { inlineData?: { data?: string; mimeType?: string } }[] } }[]
  }
  const part = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)
  if (!part?.inlineData?.data) throw new Error('Gemini hat kein Bild zurückgegeben.')
  return `data:${part.inlineData.mimeType ?? 'image/png'};base64,${part.inlineData.data}`
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
  if (subjects.length === 0) return null

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

  let result: GeminiProxyResult
  try {
    result = await geminiProxy('flash-lite', {
      contents: [{
        parts: [
          { inline_data: { mime_type: mimeType, data: base64 } },
          {
            text: `Analysiere dieses Dokument und ordne es einem Schulfach zu. Verwende NUR die exakten IDs aus der Liste.\n\nVerfügbare Fächer:\n${subjectList}${folderSection}${folderInstruction}`,
          },
        ],
      }],
      generationConfig: { response_mime_type: 'application/json', temperature: 0.1, maxOutputTokens: 150 },
    }, 'smart_notes', signal)
  } catch {
    return null
  }

  if (result.geminiStatus !== 200) return null

  const json = result.geminiData as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
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

// ── Lernplan Generation ───────────────────────────────────────────────────────

export async function generateLernplan(input: LernplanGeneratorInput): Promise<{
  title: string
  summary: string
  days: LernplanDay[]
  examSchedule: LernplanExam[]
}> {
  // Build exam text — prefer examChecklists (new), fall back to klausurtermine.topic (legacy)
  const checklistMap = new Map(
    (input.examChecklists ?? []).map((c) => [`${c.subjectId}|${c.date}`, c])
  )

  const examsText = [...input.klausurtermine]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((k) => {
      const cl = checklistMap.get(`${k.subjectId}|${k.date}`)
      if (cl && cl.topics.length > 0) {
        const topicLines = cl.topics.map((t) => `    • ${t}`).join('\n')
        return `- ${k.subjectName} (${k.isLK ? 'LK' : 'GK'}): ${k.date}\n  Prüfungsthemen (ALLE müssen abgedeckt werden):\n${topicLines}`
      }
      return `- ${k.subjectName} (${k.isLK ? 'LK' : 'GK'}): ${k.date}${k.topic ? ' — ' + k.topic : ''}`
    })
    .join('\n')

  const blockedText = input.blockedTimes.length > 0
    ? input.blockedTimes.map((b) => {
        const days = b.dayOfWeek.length === 0 ? 'täglich' : b.dayOfWeek.map((d) => ['Mo','Di','Mi','Do','Fr','Sa','So'][d]).join(', ')
        return `- ${b.label}: ${days}, ${b.startTime}–${b.endTime}`
      }).join('\n')
    : 'Keine speziellen Blockierungen.'

  const weaknessText = input.weaknesses.length > 0
    ? input.weaknesses.map((w) => `- ${w.subjectId}: ${w.topics.join(', ')}`).join('\n')
    : 'Keine angegeben.'

  const systemPrompt = `Du bist ein professioneller Lernplaner für deutsche Gymnasiasten (Klasse 10–13) und Abiturienten. Erstelle einen strukturierten, realistischen Lernplan als JSON.

PLANUNGS-REGELN:
- LK-Fächer erhalten ~40% mehr Lernzeit als GK-Fächer und höhere Priorität.
- Das nächste Klausur-Fach hat die höchste Priorität pro Tag.
- 1 Tag VOR jeder Klausur: dayType="puffer", nur Wiederholung dieses Fachs, keine neuen Themen.
- Am Klausurtag selbst: dayType="klausur", sessions=[], note="Klausur [Fachname]".
- Nach je 4–5 Lerntagen mindestens 1 Pausentag (dayType="pause", sessions=[]).
- Blockierte Zeiten werden NICHT für Lernen genutzt.
- Schwächen in bestimmten Themen bekommen mehr Sessions.
- Methoden-Rotation: möglichst keine 2× identische Methode hintereinander.
- Session-Dauer: 25–90 Minuten. Max. ${input.dailyStudyHours}h Gesamtlernzeit pro Tag.
- Bei Zielnote ≥ 13 NP (sehr gut): mehr Probeklausuren und Wiederholungen einplanen.
- Wenn Prüfungsthemen angegeben: jedes Thema muss in mindestens einer Session als topic auftauchen. Wenn ein Thema einem KC-Oberthema entspricht, alle Unterthemen dieses Oberthemas abdecken.
${input.planType === 'abitur' ? '- ABITUR-MODUS: Kein regulärer Schulunterricht. Volle Tage verfügbar. LK-Fächer haben 2× Gewichtung. Q1–Q4 Inhalte aller Prüfungsfächer abdecken.' : ''}

SESSION-INHALT (PFLICHT für jede Session):
- "learningGoal": 1–2 Sätze konkretes Lernziel ("Nach dieser Session kannst du...").
- "activities": Array mit 2–3 konkreten Lernaktivitäten. Summe der durationMin = session.durationMin.
  - method: karteikarten | blurting | lernzettel | probeklausur | lesen | wiederholen
  - isPro: true für "lernzettel" und "probeklausur" (das sind App-Pro-Features)
  - Typisch 90min: [{lernzettel,30min,Pro}, {blurting,10min,free}, {probeklausur,50min,Pro}]
  - Typisch 60min: [{lernzettel,25min,Pro}, {blurting,10min,free}, {karteikarten,25min,free}]
  - Typisch 45min: [{lesen,20min,free}, {blurting,10min,free}, {karteikarten,15min,free}]
  - Typisch 30min: [{karteikarten,20min,free}, {blurting,10min,free}]
  - Wenn session.durationMin ≥ 45: mindestens eine Pro-Aktivität (lernzettel oder probeklausur) einplanen.

Antworte NUR mit validem JSON (kein Markdown), exakt diese Struktur:
{"title":"...","summary":"...","days":[{"date":"YYYY-MM-DD","dayType":"lern","sessions":[{"subjectId":"...","subjectName":"...","topic":"...","durationMin":90,"method":"lernzettel","isLK":false,"priority":"hoch","learningGoal":"Nach dieser Session kannst du...","activities":[{"title":"Lernzettel aus Smart Notes erstellen","durationMin":30,"method":"lernzettel","isPro":true},{"title":"Blurting – alles aufschreiben","durationMin":10,"method":"blurting","isPro":false},{"title":"Probeklausur ohne Material","durationMin":50,"method":"probeklausur","isPro":true}]}],"totalMin":90,"note":null}],"examSchedule":[{"date":"YYYY-MM-DD","subjectId":"...","subjectName":"...","topic":"..."}]}`

  const userPrompt = `Plantyp: ${input.planType === 'einzel' ? 'Einzelfach-Lernplan' : input.planType === 'vollstaendig' ? 'Vollständiger Klausurenplan' : 'Abitur-Lernplan'}
Klasse: ${input.klasse} | Schulform: ${input.schulform}
Startdatum: ${input.startDate}
Planungszeitraum: ${input.planDurationDays} Tage

KLAUSURTERMINE & PRÜFUNGSTHEMEN:
${examsText}

LERNKAPAZITÄT:
- ${input.dailyStudyHours} Stunden Lernzeit pro Tag
- Lernzeit bevorzugt: ${input.studyTimePreference === 'morgen' ? 'Morgens' : input.studyTimePreference === 'abend' ? 'Abends' : 'Flexibel'}
- Wochenende einplanen: ${input.includeWeekends ? 'Ja' : 'Nein — Sa+So sind Pausentage'}
- Zielnote: ${input.targetGrade} NP (0–15 Notenpunkte-Skala)

BLOCKIERTE ZEITEN:
${blockedText}

SCHWÄCHEN (mehr Sessions):
${weaknessText}
${input.preferredMethods && input.preferredMethods.length > 0 && input.preferredMethods.length < 6 ? `\nBEVORZUGTE LERNMETHODEN:\n${input.preferredMethods.join(', ')}` : ''}${input.smartNotesContext ? `\nBEREITS BEHANDELTE INHALTE (Smart Notes — nutze als konkrete Session-Topics):\n${input.smartNotesContext}` : ''}${input.kcContext ? `\nKERNCURRICULUM:\n${input.kcContext}` : ''}

Erstelle den vollständigen Plan für ALLE ${input.planDurationDays} Tage ab ${input.startDate}. Jeder Tag muss im days-Array enthalten sein. Jede Session muss learningGoal und activities enthalten.`

  const lernplanBodyObj = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 32768, responseMimeType: 'application/json' },
  }

  // gemini-3.5-flash thinks by default (see examFetch comment) — for Lernplan specifically this
  // is the exact call Simon reported as "extremely slow", so capping thinking here directly
  // targets that complaint, not just migration hygiene. Only applied to the flash call, not the
  // flash-lite 503-fallback — flash-lite showed no hidden-thinking overhead in testing, so its
  // config is left exactly as before rather than adding an untested field to the reliability fallback.
  const lernplanFlashBody = {
    ...lernplanBodyObj,
    generationConfig: { ...lernplanBodyObj.generationConfig, thinkingConfig: { thinkingLevel: 'low' } },
  }

  // On 503 (model overloaded), fall back to flash-lite immediately
  let result = await geminiProxy('flash', lernplanFlashBody, 'lernplan')
  if (result.geminiStatus === 503) {
    result = await geminiProxy('flash-lite', lernplanBodyObj, 'lernplan')
  }

  if (result.geminiStatus !== 200) {
    const errData = result.geminiData as { error?: { message?: string } }
    throw new Error(errData?.error?.message ?? `Gemini Fehler ${result.geminiStatus}`)
  }

  const data = result.geminiData as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  const cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```\s*$/, '').trim()
  if (!cleaned) throw new Error('Gemini hat keinen Lernplan zurückgegeben.')

  const raw = JSON.parse(cleaned) as {
    title?: string
    summary?: string
    days?: LernplanDay[]
    examSchedule?: LernplanExam[]
  }

  return {
    title: String(raw.title ?? 'Mein Lernplan'),
    summary: String(raw.summary ?? ''),
    days: Array.isArray(raw.days) ? raw.days : [],
    examSchedule: Array.isArray(raw.examSchedule) ? raw.examSchedule : [],
  }
}
