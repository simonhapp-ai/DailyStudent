import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useUser } from '../context/UserContext'

const IS_DESKTOP = !/iPhone|iPod|(Android.*Mobile)/i.test(navigator.userAgent)
const E = [0.23, 1, 0.32, 1] as const

// ─── Topic clusters (3 hint terms each, no explicit label) ───────────────────
const CLUSTERS = [
  { terms: ['Chlorophyll', 'ATP', 'Calvin-Zyklus'], fallbackKey: 'photosynthese' },
  { terms: ['Inflation', 'Reichstag', '1933'], fallbackKey: 'weimar' },
  { terms: ['Kathete', 'Hypotenuse', 'Winkel'], fallbackKey: 'pythagoras' },
  { terms: ['Trägheit', 'Kraft', 'Beschleunigung'], fallbackKey: 'newton' },
  { terms: ['Monet', 'Licht', 'Pinselstrich'], fallbackKey: 'impressionismus' },
  { terms: ['Parlament', 'Kommission', 'Rat'], fallbackKey: 'eu' },
]

const LOADING_LABELS = [
  'KC-Inhalte analysieren',
  'Schlüsselbegriffe erkennen',
  'Zusammenfassen',
  'Klausurthemen finden',
  'Definitionen erstellen',
]

interface SmartNoteData {
  summary: string
  keywords: string[]
  examTopics: string[]
  cardFront: string
  cardBack: string
}

const FALLBACKS: Record<string, SmartNoteData> = {
  photosynthese: {
    summary:
      'Photosynthese ist der Prozess, bei dem Pflanzen Lichtenergie in chemische Energie umwandeln. In der Lichtreaktion wird Wasser gespalten und ATP sowie NADPH erzeugt. Im Calvin-Zyklus wird CO₂ zu Glukose fixiert.',
    keywords: ['Chlorophyll', 'ATP', 'NADPH', 'Calvin-Zyklus', 'Thylakoid'],
    examTopics: ['Lichtreaktion vs. Dunkelreaktion erklären', 'Energieumwandlung in Chloroplasten'],
    cardFront: 'Welche zwei Hauptphasen hat die Photosynthese?',
    cardBack:
      'Lichtreaktion (Thylakoid) + Calvin-Zyklus (Stroma). Lichtreaktion erzeugt ATP/NADPH, Calvin-Zyklus fixiert CO₂ zu Glukose.',
  },
  weimar: {
    summary:
      'Die Weimarer Republik (1919–1933) war Deutschlands erste Demokratie nach dem Ersten Weltkrieg. Sie scheiterte an wirtschaftlichen Krisen, politischer Instabilität und dem Aufstieg der NSDAP.',
    keywords: ['Hyperinflation', 'Reichsverfassung', 'Dolchstoßlegende', 'NSDAP', 'Reichstag'],
    examTopics: ['Gründe für das Scheitern der Weimarer Republik', 'Verfassung und ihre Schwächen'],
    cardFront: 'Warum scheiterte die Weimarer Republik?',
    cardBack:
      'Hyperinflation (1923), Weltwirtschaftskrise (1929), Dolchstoßlegende, fehlende demokratische Tradition, Aufstieg der NSDAP bis 1933.',
  },
  pythagoras: {
    summary:
      'Der Satz des Pythagoras: a² + b² = c², wobei c die Hypotenuse ist. Er ermöglicht die Berechnung unbekannter Seiten rechtwinkliger Dreiecke und kann umgekehrt zur Winkelprüfung verwendet werden.',
    keywords: ['Hypotenuse', 'Kathete', 'rechtwinkliges Dreieck', 'Quadratwurzel', 'Satz'],
    examTopics: ['Satz auf konkrete Dreiecke anwenden', 'Umkehrung zur Winkelprüfung'],
    cardFront: 'Wie lautet der Satz des Pythagoras?',
    cardBack:
      'a² + b² = c² — c ist die Hypotenuse (längste Seite, gegenüber dem rechten Winkel). Gilt nur in rechtwinkligen Dreiecken.',
  },
  newton: {
    summary:
      'Newtons drei Gesetze bilden die Grundlage der klassischen Mechanik: Trägheitsprinzip, F = m·a sowie Actio-Reactio. Kräfte treten immer paarweise auf und erzeugen proportionale Beschleunigungen.',
    keywords: ['Trägheit', 'F = m·a', 'Actio-Reactio', 'Beschleunigung', 'Masse'],
    examTopics: ['F = m·a auf Aufgaben anwenden', 'Unterschied Masse vs. Gewichtskraft'],
    cardFront: 'Was besagt Newtons zweites Gesetz?',
    cardBack:
      'F = m · a — Kraft (N) = Masse (kg) × Beschleunigung (m/s²). Je größer die Kraft bei gleicher Masse, desto größer die Beschleunigung.',
  },
  impressionismus: {
    summary:
      'Der Impressionismus (ca. 1860–1890) stellte das subjektive Lichtempfinden und flüchtige Augenblicke dar. Typisch: kurze Pinselstriche, helle Farben, Plein-air-Malerei und Auflösung klarer Konturen.',
    keywords: ['Pinselduktus', 'Plein-air', 'Lichtspiel', 'Monet', 'Komplementärfarben'],
    examTopics: ['Stilmerkmale des Impressionismus benennen', 'Abgrenzung zu vorangehenden Stilen'],
    cardFront: 'Was sind typische Merkmale des Impressionismus?',
    cardBack:
      'Kurze Pinselstriche · helle Farben · Darstellung von Lichteffekten · Plein-air · Auflösung scharfer Konturen · flüchtige Augenblicke.',
  },
  eu: {
    summary:
      'Die EU hat vier Hauptinstitutionen: Europäischer Rat (Grundsatzziele), Kommission (Initiativrecht), Europäisches Parlament (Bürgervertretung) und Rat der EU (Gesetzgebung gemeinsam mit dem Parlament).',
    keywords: ['Europäischer Rat', 'Kommission', 'Europäisches Parlament', 'Initiativrecht', 'Subsidiarität'],
    examTopics: ['Aufgaben der vier Hauptinstitutionen', 'Das demokratische Defizit der EU'],
    cardFront: 'Welche EU-Institution hat das Initiativrecht?',
    cardBack:
      'Die Europäische Kommission — nur sie darf offiziell Gesetzesvorschläge einbringen. Parlament und Rat können sie jedoch dazu auffordern.',
  },
}

async function callGroqDemo(terms: string[]): Promise<SmartNoteData> {
  const key = import.meta.env.VITE_GROQ_API_KEY as string
  if (!key) throw new Error('no key')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 900,
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'Du bist ein Lernassistent für Gymnasiasten (Oberstufe, G9). Antworte immer auf Deutsch. Gib ausschließlich valides JSON ohne Markdown zurück. Schreibe fachlich präzise, inhaltlich tiefe Texte — keine Floskeln wie "sind zentrale Begriffe" oder "regelmäßig in Klausuren". Erkläre was Konzepte wirklich bedeuten.',
          },
          {
            role: 'user',
            content: `Erstelle eine vollständige Smart Note für folgende Lernbegriffe: ${terms.join(', ')}

Die Zusammenfassung soll INHALTLICH erklären was diese Konzepte bedeuten — Definitionen, Mechanismen, Funktionsweisen, Zusammenhänge. 3 vollständige, lehrreiche Sätze. Kein Verweis auf Lehrpläne oder Bundesländer.

Antworte NUR mit diesem JSON:
{
  "summary": "3 vollständige Sätze die fachlich erklären was die Begriffe bedeuten, wie sie funktionieren und welche Kernaussagen wichtig sind",
  "keywords": ["Fachbegriff1", "Fachbegriff2", "Fachbegriff3", "Fachbegriff4", "Fachbegriff5"],
  "examTopics": ["Konkretes Klausurthema als vollständiger Aufgabensatz", "Zweites prüfungsrelevantes Thema als vollständiger Satz"],
  "cardFront": "Präzise Klausurfrage zu einem der Kernkonzepte als vollständiger Fragesatz",
  "cardBack": "Genaue, inhaltlich vollständige Antwort in 1-2 Sätzen"
}`,
          },
        ],
      }),
    })

    clearTimeout(timeout)
    if (!res.ok) throw new Error(`groq ${res.status}`)

    const data = (await res.json()) as { choices: { message: { content: string } }[] }
    const raw = data.choices[0].message.content
    const parsed = JSON.parse(raw) as Partial<SmartNoteData>

    const t0 = terms[0] ?? 'Begriff'
    const t1 = terms[1] ?? terms[0] ?? 'Begriff'
    return {
      summary: typeof parsed.summary === 'string' && parsed.summary.length > 60
        ? parsed.summary
        : `${t0} ist ein grundlegendes Fachkonzept, das präzises Verständnis erfordert. Im Zusammenhang mit ${t1} zeigen sich wichtige inhaltliche Bezüge, die für Klausuren relevant sind. Eine sichere Kenntnis der Definitionen und Zusammenhänge ist entscheidend.`,
      keywords: Array.isArray(parsed.keywords) && parsed.keywords.length >= 2
        ? parsed.keywords.slice(0, 5)
        : terms.slice(0, 5),
      examTopics: Array.isArray(parsed.examTopics) && parsed.examTopics.length >= 1
        ? parsed.examTopics.slice(0, 2)
        : [`${t0} definieren und an einem Beispiel erläutern`, `Zusammenhänge zwischen ${terms.slice(0, 2).join(' und ')} erklären`],
      cardFront: typeof parsed.cardFront === 'string' && parsed.cardFront.length > 10
        ? parsed.cardFront
        : `Was versteht man unter ${t0} und welche Bedeutung hat es im Kontext von ${terms.slice(1).join(', ')}?`,
      cardBack: typeof parsed.cardBack === 'string' && parsed.cardBack.length > 10
        ? parsed.cardBack
        : `${t0} bezeichnet ein zentrales Fachkonzept, das eng mit ${terms.slice(1, 3).join(' und ')} verbunden ist und in verschiedenen Kontexten angewendet werden kann.`,
    }
  } catch (err) {
    clearTimeout(timeout)
    throw err
  }
}

type Stage = 0 | 1 | 2 | 3 | 4 | 5

export function DemoScreen() {
  const navigate = useNavigate()
  const { authUser } = useUser()
  const appHome = IS_DESKTOP ? '/dashboard' : '/unterricht'

  const [stage, setStage] = useState<Stage>(0)
  const [colorMode, setColorMode] = useState<'purple' | 'mint'>('purple')

  // Stage 0 — input
  const [customOpen, setCustomOpen] = useState(false)
  const [customTags, setCustomTags] = useState<string[]>([])
  const [customInput, setCustomInput] = useState('')
  const customInputRef = useRef<HTMLInputElement>(null)
  const SUGGESTIONS = ['Photosynthese', 'Demokratie', 'Pythagoras']

  // Stage 1 — loading
  const [loadingLabelIdx, setLoadingLabelIdx] = useState(0)
  const [activeTerms, setActiveTerms] = useState<string[]>([])

  // Stage 2 — note
  const [noteData, setNoteData] = useState<SmartNoteData | null>(null)
  const [displayedSummary, setDisplayedSummary] = useState('')
  const [showKeywords, setShowKeywords] = useState(false)
  const [showExamTopics, setShowExamTopics] = useState(false)
  const [noteSaved, setNoteSaved] = useState(false)

  // Stage 3 — method selection
  const [methodHighlighted, setMethodHighlighted] = useState(false)

  // Stage 4 — flashcard
  const [cardFlipped, setCardFlipped] = useState(false)
  const [showFlipCta, setShowFlipCta] = useState(false)

  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  function addTimer(t: ReturnType<typeof setTimeout>) {
    timers.current.push(t)
  }

  useEffect(() => {
    localStorage.setItem('demoShown', 'true')
    return () => timers.current.forEach(clearTimeout)
  }, [])

  // Loading label rotation
  useEffect(() => {
    if (stage !== 1) return
    let idx = 0
    const next = () => {
      idx = (idx + 1) % LOADING_LABELS.length
      setLoadingLabelIdx(idx)
      addTimer(setTimeout(next, 1700))
    }
    addTimer(setTimeout(next, 1700))
  }, [stage])

  // Typewriter on stage 2
  useEffect(() => {
    if (stage !== 2 || !noteData) return
    setDisplayedSummary('')
    setShowKeywords(false)
    setShowExamTopics(false)
    let i = 0
    const typeNext = () => {
      i++
      setDisplayedSummary(noteData.summary.slice(0, i))
      if (i < noteData.summary.length) {
        addTimer(setTimeout(typeNext, Math.max(10, 28 - Math.floor(i / 7))))
      } else {
        addTimer(setTimeout(() => setShowKeywords(true), 300))
        addTimer(setTimeout(() => setShowExamTopics(true), 650))
      }
    }
    addTimer(setTimeout(typeNext, 500))
  }, [stage, noteData])

  // Method auto-highlight in stage 3
  useEffect(() => {
    if (stage !== 3) return
    setMethodHighlighted(false)
    addTimer(setTimeout(() => setMethodHighlighted(true), 1000))
  }, [stage])

  // Show next CTA after card flip
  useEffect(() => {
    if (!cardFlipped) return
    addTimer(setTimeout(() => setShowFlipCta(true), 700))
  }, [cardFlipped])

  function buildFallback(terms: string[], key: string): SmartNoteData {
    if (FALLBACKS[key]) return FALLBACKS[key]
    const t0 = terms[0] ?? 'Begriff'
    const t1 = terms[1] ?? terms[0] ?? 'Begriff'
    return {
      summary: `${t0} ist ein grundlegendes Fachkonzept, das präzises Verständnis der zugrunde liegenden Mechanismen und Definitionen erfordert. Im Zusammenhang mit ${t1} zeigen sich wichtige inhaltliche Bezüge, die für ein tiefes Verständnis des Themas essenziell sind. Die sichere Beherrschung dieser Konzepte bildet die Grundlage für Klausurlösungen auf Oberstufenniveau.`,
      keywords: terms.slice(0, 5),
      examTopics: [
        `${t0} definieren und anhand eines konkreten Beispiels erläutern`,
        `Zusammenhänge zwischen ${terms.slice(0, 2).join(' und ')} fachlich korrekt beschreiben`,
      ],
      cardFront: `Was versteht man unter ${t0} und welche Rolle spielt es im Zusammenhang mit ${t1}?`,
      cardBack: `${t0} bezeichnet ein zentrales Fachkonzept, das eng mit ${terms.slice(1, 3).join(' und ')} verbunden ist und in verschiedenen fachlichen Kontexten angewendet werden kann.`,
    }
  }

  function handleAnalyze(terms: string[], fallbackKey: string) {
    setStage(1)
    setActiveTerms(terms)
    const fallback = buildFallback(terms, fallbackKey)

    callGroqDemo(terms)
      .then((data) => {
        setNoteData(data)
        addTimer(setTimeout(() => setStage(2), 400))
      })
      .catch(() => {
        setNoteData(fallback)
        addTimer(setTimeout(() => setStage(2), 400))
      })
  }

  function handleSaveToFolder() {
    setNoteSaved(true)
    addTimer(
      setTimeout(() => {
        setColorMode('mint')
        addTimer(setTimeout(() => setStage(3), 900))
      }, 200),
    )
  }

  function handleCustomTagAdd(e?: React.KeyboardEvent) {
    if (e && e.key !== 'Enter' && e.key !== ',') return
    const val = customInput.trim().replace(/,$/, '')
    if (!val || customTags.includes(val)) { setCustomInput(''); return }
    setCustomTags((p) => [...p, val])
    setCustomInput('')
  }

  const mint = '#34D399'
  const purple = '#7C3AED'

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: '#0a0a0f' }}>
      <style>{`
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes ea-glow {
          0%, 100% { box-shadow: 0 2px 14px rgba(52,211,153,0.35), 0 0 0 0 rgba(52,211,153,0); }
          50% { box-shadow: 0 4px 24px rgba(52,211,153,0.65), 0 0 20px 2px rgba(52,211,153,0.22); }
        }
      `}</style>
      {/* ── ambient glow: cross-fade purple ↔ mint ── */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 50% 110%, rgba(124,58,237,0.4) 0%, transparent 65%)` }}
        animate={{ opacity: colorMode === 'purple' ? 1 : 0 }}
        transition={{ duration: 1.4, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 50% 110%, rgba(52,211,153,0.35) 0%, transparent 65%)` }}
        animate={{ opacity: colorMode === 'mint' ? 1 : 0 }}
        transition={{ duration: 1.4, ease: 'easeInOut' }}
      />

      {/* ── top-right button ── */}
      <motion.button
        className="fixed top-4 right-4 z-50 px-4 py-2 rounded-full text-[13px] font-medium"
        style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.12)' }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => navigate(authUser ? appHome : '/auth')}
      >
        {authUser ? 'Zurück zur App' : 'Anmelden'}
      </motion.button>

{/* ── main content ── */}
      <div className="h-full overflow-y-auto" style={{ width: '100%' }}>
      <div className="flex flex-col items-center px-5 mx-auto" style={{ width: '100%', maxWidth: IS_DESKTOP ? 560 : 448, minHeight: '100%', paddingTop: '10vh', paddingBottom: '10vh', justifyContent: 'center' }}>
        <AnimatePresence mode="wait">

          {/* ────── STAGE 0: input ────── */}
          {stage === 0 && (
            <motion.div
              key="input"
              className="w-full"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.55, ease: E }}
            >
              <motion.h1
                className="text-center font-bold text-white leading-tight mb-2"
                style={{ fontSize: IS_DESKTOP ? 36 : 28 }}
              >
                Deine Notizen.{' '}
                <span style={{ color: purple }}>Deine Klausur.</span>{' '}
                Dein Lernplan.
              </motion.h1>
              <p className="text-center text-[14px] mb-8" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Wähle ein Thema — oder gib deine eigenen Begriffe ein.
              </p>

              {/* 6 term clusters */}
              <div className="grid grid-cols-2 gap-2.5 mb-3">
                {CLUSTERS.map((c) => (
                  <motion.button
                    key={c.terms[0]}
                    className="rounded-2xl px-3 py-3 text-left"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.85)',
                    }}
                    whileHover={{ scale: 1.03, background: 'rgba(124,58,237,0.15)' }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleAnalyze(c.terms, c.fallbackKey)}
                  >
                    <span className="text-[12px] font-medium leading-snug block">
                      {c.terms.join(' · ')}
                    </span>
                  </motion.button>
                ))}
              </div>

              {/* Custom input button / expanded */}
              <AnimatePresence mode="wait">
                {!customOpen ? (
                  <motion.button
                    key="custom-collapsed"
                    className="w-full rounded-2xl py-4 text-[14px] font-semibold flex items-center justify-center gap-2"
                    style={{
                      background: 'rgba(124,58,237,0.12)',
                      border: `1.5px dashed rgba(124,58,237,0.4)`,
                      color: 'rgba(167,139,250,0.9)',
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.25 }}
                    onClick={() => {
                      setCustomOpen(true)
                      setTimeout(() => customInputRef.current?.focus(), 100)
                    }}
                  >
                    <span className="text-[16px]">✏️</span>
                    Eigene Notiz erstellen
                  </motion.button>
                ) : (
                  <motion.div
                    key="custom-expanded"
                    className="w-full rounded-2xl p-4"
                    style={{ background: 'rgba(124,58,237,0.1)', border: `1.5px solid rgba(124,58,237,0.35)` }}
                    initial={{ opacity: 0, scale: 0.95, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3, ease: E }}
                  >
                    <p className="text-[11px] font-semibold mb-2.5" style={{ color: 'rgba(167,139,250,0.8)' }}>
                      DEINE BEGRIFFE
                    </p>

                    {/* Selected tags */}
                    <div className="flex flex-wrap gap-2 mb-2 min-h-[28px]">
                      <AnimatePresence mode="popLayout">
                        {customTags.map((t) => (
                          <motion.span
                            key={t}
                            layout
                            initial={{ opacity: 0, scale: 0.7 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.6 }}
                            transition={{ duration: 0.22, ease: E }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-medium"
                            style={{ background: 'rgba(124,58,237,0.3)', color: '#C4B5FD', border: '1px solid rgba(124,58,237,0.4)' }}
                          >
                            {t}
                            <button
                              onClick={() => setCustomTags((p) => p.filter((x) => x !== t))}
                              className="opacity-60 hover:opacity-100 transition-opacity leading-none"
                            >
                              ×
                            </button>
                          </motion.span>
                        ))}
                      </AnimatePresence>
                      <input
                        ref={customInputRef}
                        value={customInput}
                        onChange={(e) => setCustomInput(e.target.value)}
                        onKeyDown={handleCustomTagAdd}
                        onBlur={() => { if (customInput.trim()) handleCustomTagAdd() }}
                        placeholder={customTags.length === 0 ? 'Begriff eingeben + Enter …' : 'Weiterer Begriff …'}
                        className="bg-transparent text-[12px] text-white placeholder-white/30 outline-none min-w-[130px] flex-1 py-1"
                      />
                    </div>

                    {/* Suggestion chips */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <span className="text-[10px] self-center" style={{ color: 'rgba(255,255,255,0.25)' }}>Ideen:</span>
                      <AnimatePresence mode="popLayout">
                        {SUGGESTIONS.filter((s) => !customTags.includes(s)).map((s) => (
                          <motion.button
                            key={s}
                            layout
                            initial={{ opacity: 0, scale: 0.7 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            transition={{ duration: 0.2, ease: E }}
                            className="px-2 py-0.5 rounded-full text-[11px]"
                            style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.12)' }}
                            whileHover={{ scale: 1.06, background: 'rgba(124,58,237,0.2)', color: '#C4B5FD' }}
                            whileTap={{ scale: 0.92 }}
                            onClick={() => setCustomTags((p) => [...p, s])}
                          >
                            + {s}
                          </motion.button>
                        ))}
                      </AnimatePresence>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        {customTags.length >= 3
                          ? `${customTags.length} Begriffe — bereit!`
                          : `${customTags.length}/3 Begriffe mindestens`}
                      </span>
                      <motion.button
                        className="px-4 py-2 rounded-xl text-[13px] font-semibold"
                        style={{
                          background: customTags.length >= 3 ? purple : 'rgba(255,255,255,0.08)',
                          color: customTags.length >= 3 ? '#fff' : 'rgba(255,255,255,0.3)',
                          transition: 'background 0.3s',
                        }}
                        disabled={customTags.length < 3}
                        whileHover={customTags.length >= 3 ? { scale: 1.04 } : {}}
                        whileTap={customTags.length >= 3 ? { scale: 0.96 } : {}}
                        onClick={() => handleAnalyze(customTags, 'custom')}
                      >
                        Analysieren →
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ────── STAGE 1: loading ────── */}
          {stage === 1 && (
            <motion.div
              key="loading"
              className="flex flex-col items-center gap-6 w-full"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.88 }}
              transition={{ duration: 0.4, ease: E }}
            >
              {/* Vibrating circle with pulsing rings */}
              <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="absolute rounded-full"
                    style={{
                      width: 70 + i * 30,
                      height: 70 + i * 30,
                      border: `1px solid rgba(124,58,237,${0.5 - i * 0.14})`,
                    }}
                    animate={{ scale: [1, 1.25, 1], opacity: [0.7, 0, 0.7] }}
                    transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.5, ease: 'easeInOut' }}
                  />
                ))}
                {/* Orbiting dot */}
                <motion.div
                  className="absolute"
                  style={{ width: 130, height: 130 }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                >
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full" style={{ background: '#7C3AED', boxShadow: '0 0 6px rgba(124,58,237,0.8)' }} />
                </motion.div>
                {/* Center vibrating core */}
                <motion.div
                  className="relative z-10 rounded-full flex items-center justify-center"
                  style={{
                    width: 64,
                    height: 64,
                    background: 'radial-gradient(circle, rgba(124,58,237,0.5) 0%, rgba(124,58,237,0.15) 100%)',
                    border: '1.5px solid rgba(124,58,237,0.6)',
                    boxShadow: '0 0 24px rgba(124,58,237,0.4)',
                  }}
                  animate={{ scale: [1, 1.05, 0.97, 1.03, 1], rotate: [0, 1, -1, 0.5, 0] }}
                  transition={{ duration: 0.45, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <span style={{ fontSize: 26 }}>✦</span>
                </motion.div>
              </div>

              {/* Cycling label */}
              <div className="text-center">
                <p className="text-[11px] font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em' }}>
                  SMART NOTE WIRD ERSTELLT
                </p>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={loadingLabelIdx}
                    className="text-[15px] font-medium"
                    style={{ color: 'rgba(255,255,255,0.8)' }}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.35, ease: E }}
                  >
                    {LOADING_LABELS[loadingLabelIdx]}
                  </motion.p>
                </AnimatePresence>
              </div>

              {/* Active terms being analyzed */}
              {activeTerms.length > 0 && (
                <motion.div
                  className="flex flex-wrap justify-center gap-2"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.4 }}
                >
                  {activeTerms.map((t, i) => (
                    <motion.span
                      key={t}
                      className="px-2.5 py-1 rounded-full text-[11px] font-medium"
                      style={{ background: 'rgba(124,58,237,0.18)', color: 'rgba(196,181,253,0.85)', border: '1px solid rgba(124,58,237,0.3)' }}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5 + i * 0.1, duration: 0.25 }}
                    >
                      {t}
                    </motion.span>
                  ))}
                </motion.div>
              )}

              {/* Pulsing progress bar */}
              <div className="w-48 h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, rgba(124,58,237,0.6), rgba(124,58,237,1))' }}
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>
            </motion.div>
          )}

          {/* ────── STAGE 2: note reveal + save ────── */}
          {stage === 2 && noteData && (
            <motion.div
              key="note"
              className="w-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.4, ease: E }}
            >
              {/* Note card folds open */}
              <motion.div
                className="rounded-2xl overflow-hidden mb-4"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                initial={{ scaleY: 0.08, opacity: 0, originY: 0 }}
                animate={{ scaleY: 1, opacity: 1 }}
                transition={{ duration: 0.55, ease: E }}
              >
                {/* Subject bar */}
                <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: 'rgba(124,58,237,0.15)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <span className="text-[18px]">🧠</span>
                  <span className="text-[12px] font-semibold" style={{ color: '#A78BFA' }}>Smart Note — KI generiert</span>
                </div>

                <div className="p-4 space-y-3">
                  {/* Summary with typewriter */}
                  <div>
                    <p className="text-[10px] font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em' }}>
                      ZUSAMMENFASSUNG
                    </p>
                    <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.82)', minHeight: 52 }}>
                      {displayedSummary}
                      {displayedSummary.length < noteData.summary.length && (
                        <motion.span
                          className="inline-block w-[2px] h-[13px] ml-0.5 align-middle rounded-full"
                          style={{ background: '#A78BFA' }}
                          animate={{ opacity: [1, 0] }}
                          transition={{ duration: 0.7, repeat: Infinity, ease: 'linear', repeatType: 'mirror' }}
                        />
                      )}
                    </p>
                  </div>

                  {/* Keywords */}
                  <AnimatePresence>
                    {showKeywords && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, ease: E }}
                      >
                        <p className="text-[10px] font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em' }}>
                          SCHLÜSSELBEGRIFFE
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {noteData.keywords.map((kw) => (
                            <span
                              key={kw}
                              className="px-2.5 py-0.5 rounded-full text-[11px] font-medium"
                              style={{ background: 'rgba(124,58,237,0.2)', color: '#C4B5FD', border: '1px solid rgba(124,58,237,0.3)' }}
                            >
                              {kw}
                            </span>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Exam topics */}
                  <AnimatePresence>
                    {showExamTopics && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, ease: E }}
                      >
                        <p className="text-[10px] font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em' }}>
                          KLAUSURTHEMEN
                        </p>
                        <div className="space-y-1">
                          {noteData.examTopics.map((t) => (
                            <div key={t} className="flex items-start gap-2">
                              <span style={{ color: purple, fontSize: 12, marginTop: 1 }}>▸</span>
                              <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.7)' }}>{t}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Footer hint */}
                <div className="px-4 py-2.5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    📷 Normalerweise fügst du auch Fotos & Schreibnotizen hinzu
                  </p>
                </div>
              </motion.div>

              {/* Save button */}
              <AnimatePresence>
                {showExamTopics && (
                  <motion.button
                    className="w-full py-3.5 rounded-2xl text-[15px] font-semibold flex items-center justify-center gap-2"
                    style={{
                      background: noteSaved ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.09)',
                      color: noteSaved ? mint : 'rgba(255,255,255,0.85)',
                      border: `1.5px solid ${noteSaved ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.15)'}`,
                      transition: 'all 0.4s',
                    }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: E, delay: 0.2 }}
                    whileHover={!noteSaved ? { scale: 1.02 } : {}}
                    whileTap={!noteSaved ? { scale: 0.97 } : {}}
                    onClick={!noteSaved ? handleSaveToFolder : undefined}
                  >
                    {noteSaved ? (
                      <>✓ In Ordner gespeichert</>
                    ) : (
                      <>📂 In Ordner speichern</>
                    )}
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ────── STAGE 3: method selection (mint theme) ────── */}
          {stage === 3 && (
            <motion.div
              key="methods"
              className="w-full"
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: E }}
            >
              {/* Mode change banner */}
              <motion.div
                className="flex items-center justify-center gap-2 mb-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Unterrichtsmodus</span>
                <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.25)' }}>→</span>
                <span className="text-[12px] font-semibold" style={{ color: mint }}>Klausurenmodus</span>
              </motion.div>

              <p className="text-[17px] font-bold text-white text-center mb-1">
                Was möchtest du aus deiner Notiz machen?
              </p>
              <p className="text-[13px] text-center mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Die KI erstellt beides automatisch aus deinen Inhalten.
              </p>

              <div className="grid grid-cols-2 gap-3">
                {/* Probeklausur card */}
                <motion.div
                  className="rounded-2xl p-4 cursor-pointer"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    opacity: methodHighlighted ? 0.45 : 1,
                    transition: 'opacity 0.4s',
                  }}
                >
                  <div className="text-[24px] mb-2">📝</div>
                  <p className="text-[14px] font-bold text-white mb-1">Probeklausur</p>
                  <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    KI-generiert · 4 Modi · mit Korrektur
                  </p>
                </motion.div>

                {/* Karteikarten card — auto-highlighted */}
                <motion.button
                  className="rounded-2xl p-4 text-left"
                  animate={
                    methodHighlighted
                      ? { scale: 1.04, boxShadow: `0 0 0 2px ${mint}, 0 8px 32px rgba(52,211,153,0.2)` }
                      : { scale: 1, boxShadow: '0 0 0 1px rgba(255,255,255,0.1)' }
                  }
                  style={{ background: methodHighlighted ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.04)', transition: 'background 0.4s' }}
                  transition={{ duration: 0.45, ease: E }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { setCardFlipped(false); setShowFlipCta(false); setStage(4) }}
                >
                  <div className="text-[24px] mb-2">🃏</div>
                  <p className="text-[14px] font-bold text-white mb-1">Karteikarten</p>
                  <p className="text-[11px]" style={{ color: methodHighlighted ? 'rgba(52,211,153,0.7)' : 'rgba(255,255,255,0.4)', transition: 'color 0.4s' }}>
                    {methodHighlighted ? 'Jetzt erstellen ✓' : 'KI-generiert · spaced repetition'}
                  </p>
                </motion.button>
              </div>

              <p className="text-center text-[11px] mt-4" style={{ color: 'rgba(255,255,255,0.25)' }}>
                In der App: Lernzettel, Lernplan, Blurting und mehr
              </p>
            </motion.div>
          )}

          {/* ────── STAGE 4: flashcard (manual flip) ────── */}
          {stage === 4 && noteData && (
            <motion.div
              key="flashcard"
              className="w-full flex flex-col items-center gap-6"
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: E }}
            >
              <div className="text-center">
                <p className="text-[17px] font-bold text-white mb-1">Deine erste Karteikarte</p>
                <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  KI-generiert aus deiner Smart Note
                </p>
              </div>

              {/* Flashcard — real 3D flip */}
              <div
                className="relative w-full cursor-pointer select-none"
                style={{ height: 180, perspective: '1000px' }}
                onClick={() => setCardFlipped((f) => !f)}
              >
                <div className={`flashcard-inner w-full h-full${cardFlipped ? ' flipped' : ''}`}>
                  {/* Front face */}
                  <div
                    className="flashcard-face absolute inset-0 rounded-2xl flex flex-col items-center justify-center p-5 text-center"
                    style={{ background: 'rgba(255,255,255,0.06)', border: `1.5px solid rgba(52,211,153,0.25)` }}
                  >
                    <p className="text-[10px] font-semibold mb-3" style={{ color: mint, letterSpacing: '0.08em' }}>FRAGE</p>
                    <p className="text-[14px] font-medium text-white leading-snug">{noteData.cardFront}</p>
                    <p className="text-[10px] mt-3.5" style={{ color: 'rgba(255,255,255,0.28)' }}>Tippen zum Umdrehen</p>
                  </div>
                  {/* Back face */}
                  <div
                    className="flashcard-back absolute inset-0 rounded-2xl flex flex-col items-center justify-center p-5 text-center"
                    style={{ background: 'rgba(52,211,153,0.09)', border: `1.5px solid rgba(52,211,153,0.45)` }}
                  >
                    <p className="text-[10px] font-semibold mb-3" style={{ color: mint, letterSpacing: '0.08em' }}>ANTWORT</p>
                    <p className="text-[13px] text-white leading-snug">{noteData.cardBack}</p>
                  </div>
                </div>
              </div>

              {/* CTA appears after flip — always in DOM to keep flex layout stable */}
              <motion.div
                className="w-full space-y-2.5"
                initial={false}
                animate={{ opacity: showFlipCta ? 1 : 0, y: showFlipCta ? 0 : 16 }}
                transition={{ duration: 0.45, ease: E }}
                style={{ pointerEvents: showFlipCta ? 'auto' : 'none' }}
              >
                    <p className="text-center text-[13px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      Das passiert mit jeder Notiz. Automatisch.
                    </p>
                    <motion.button
                      className="w-full py-3.5 rounded-2xl text-[15px] font-semibold text-white relative overflow-hidden"
                      style={{ background: 'linear-gradient(135deg, #34D399, #059669)', animation: 'ea-glow 2.4s ease-in-out infinite' }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => navigate(authUser ? appHome : '/auth')}
                    >
                      <span className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.28) 50%, transparent 65%)', backgroundSize: '200% 100%', animation: 'shimmer 2.2s infinite linear' }} />
                      <span className="relative">Jetzt personalisieren →</span>
                    </motion.button>
                    <motion.button
                      className="w-full py-3 rounded-2xl text-[14px] font-medium"
                      style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => navigate(authUser ? appHome : '/auth')}
                    >
                      {authUser ? 'Zurück zur App' : 'Anmelden'}
                    </motion.button>
                    <p className="text-center text-[11px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                      Personalisierung dauert ~2 Minuten
                    </p>
                  </motion.div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
      </div>
    </div>
  )
}
