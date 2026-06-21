import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useUser } from '../context/UserContext'

const IS_DESKTOP = !/iPhone|iPod|(Android.*Mobile)/i.test(navigator.userAgent)

const E = [0.23, 1, 0.32, 1] as const

const TOPICS = [
  { label: 'Photosynthese', subject: 'Biologie' },
  { label: 'Weimarer Republik', subject: 'Geschichte' },
  { label: 'Pythagoras', subject: 'Mathematik' },
  { label: 'Newtons Gesetze', subject: 'Physik' },
  { label: 'Impressionismus', subject: 'Kunst' },
  { label: 'EU-Institutionen', subject: 'Politik' },
]

interface SmartNoteData {
  summary: string
  keywords: string[]
  examTopics: string[]
  cardFront: string
  cardBack: string
  folderLabel: string
}

const FALLBACKS: Record<string, SmartNoteData> = {
  Photosynthese: {
    summary:
      'Photosynthese ist der Prozess, bei dem Pflanzen Lichtenergie in chemische Energie umwandeln. In der Lichtreaktion wird Wasser gespalten und ATP sowie NADPH erzeugt. Im Calvin-Zyklus wird CO₂ mithilfe dieser Energie zu Glukose fixiert.',
    keywords: ['Chlorophyll', 'ATP', 'Calvin-Zyklus', 'Lichtreaktion', 'CO₂-Fixierung'],
    examTopics: ['Lichtreaktion vs. Dunkelreaktion erklären', 'Energieumwandlung in der Chloroplaste'],
    cardFront: 'Welche zwei Hauptphasen hat die Photosynthese?',
    cardBack:
      'Lichtreaktion (Thylakoid) + Calvin-Zyklus (Stroma). Lichtreaktion erzeugt ATP/NADPH, Calvin-Zyklus fixiert CO₂ zu Glukose.',
    folderLabel: 'Biologie',
  },
  'Weimarer Republik': {
    summary:
      'Die Weimarer Republik (1919–1933) war Deutschlands erste Demokratie nach dem Ersten Weltkrieg. Sie scheiterte an wirtschaftlichen Krisen, politischer Instabilität, der Dolchstoßlegende und dem Aufstieg extremer Parteien wie der NSDAP.',
    keywords: ['Hyperinflation', 'Reichsverfassung', 'Dolchstoßlegende', 'NSDAP', 'Reichstag'],
    examTopics: ['Gründe für das Scheitern der Weimarer Republik', 'Verfassung und Schwächen des Systems'],
    cardFront: 'Warum scheiterte die Weimarer Republik?',
    cardBack:
      'Mehrere Faktoren: Hyperinflation (1923), Weltwirtschaftskrise (1929), Dolchstoßlegende, fehlende demokratische Tradition, Aufstieg der NSDAP.',
    folderLabel: 'Geschichte',
  },
  Pythagoras: {
    summary:
      'Der Satz des Pythagoras besagt: In jedem rechtwinkligen Dreieck gilt a² + b² = c², wobei c die Hypotenuse ist. Er ermöglicht die Berechnung unbekannter Seiten und kann umgekehrt zur Überprüfung rechter Winkel verwendet werden.',
    keywords: ['Hypotenuse', 'Kathete', 'rechtwinkliges Dreieck', 'Quadratwurzel', 'Umkehrung'],
    examTopics: ['Anwendung des Satzes auf konkrete Dreiecke', 'Umkehrung zur Winkelprüfung'],
    cardFront: 'Wie lautet der Satz des Pythagoras?',
    cardBack:
      'a² + b² = c² — c ist die Hypotenuse (längste Seite, gegenüber dem rechten Winkel). Gilt nur in rechtwinkligen Dreiecken.',
    folderLabel: 'Mathematik',
  },
  'Newtons Gesetze': {
    summary:
      'Newtons drei Bewegungsgesetze bilden die Grundlage der klassischen Mechanik. Das Trägheitsprinzip beschreibt die Beibehaltung des Bewegungszustands, F = m·a verknüpft Kraft mit Beschleunigung, und das Actio-Reactio-Prinzip besagt, dass Kräfte immer paarweise auftreten.',
    keywords: ['Trägheit', 'F = m·a', 'Actio-Reactio', 'Beschleunigung', 'Masse'],
    examTopics: ['Anwendung von F = m·a auf Aufgaben', 'Unterschied zwischen Masse und Gewichtskraft'],
    cardFront: 'Was besagt Newtons zweites Gesetz?',
    cardBack:
      'F = m · a — Kraft (N) = Masse (kg) × Beschleunigung (m/s²). Je größer die Kraft bei gleicher Masse, desto größer die Beschleunigung.',
    folderLabel: 'Physik',
  },
  Impressionismus: {
    summary:
      'Der Impressionismus (ca. 1860–1890) stellte statt exakter Realität das subjektive Lichtempfinden und flüchtige Augenblicke dar. Typisch sind kurze, sichtbare Pinselstriche, helle Farben, Plein-air-Malerei und die Auflösung klarer Konturen.',
    keywords: ['Pinselduktus', 'Plein-air', 'Lichtspiel', 'Monet', 'Komplementärfarben'],
    examTopics: ['Stilmerkmale des Impressionismus benennen', 'Abgrenzung zu vorangehenden Kunststilen'],
    cardFront: 'Was sind typische Merkmale des Impressionismus?',
    cardBack:
      'Kurze, sichtbare Pinselstriche · helle, reine Farben · Darstellung von Lichteffekten · Plein-air-Malerei · Auflösung scharfer Konturen · flüchtige Augenblicke.',
    folderLabel: 'Kunst',
  },
  'EU-Institutionen': {
    summary:
      'Die EU hat vier Hauptinstitutionen: Der Europäische Rat legt Grundsatzziele fest, die Kommission hat das Initiativrecht für Gesetze, das Europäische Parlament vertritt die Bürger und der Rat der EU beschließt Gesetze gemeinsam mit dem Parlament.',
    keywords: ['Europäischer Rat', 'Kommission', 'Europäisches Parlament', 'Initiativrecht', 'Subsidiarität'],
    examTopics: ['Aufgaben der vier Hauptinstitutionen unterscheiden', 'Das demokratische Defizit der EU'],
    cardFront: 'Welche EU-Institution hat das Initiativrecht für Gesetze?',
    cardBack:
      'Die Europäische Kommission — nur sie darf offiziell Gesetzesvorschläge einbringen. Parlament und Rat können die Kommission jedoch auffordern, tätig zu werden.',
    folderLabel: 'Politik',
  },
}

async function callGroqDemo(topic: string): Promise<SmartNoteData> {
  const fallback = FALLBACKS[topic]
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_GROQ_API_KEY as string}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 600,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'Du bist ein Lernassistent für deutsche Gymnasiasten. Antworte ausschließlich auf Deutsch. Gib immer valides JSON zurück.',
        },
        {
          role: 'user',
          content: `Erstelle eine prägnante Smart Note für "${topic}". Antworte NUR mit diesem JSON:\n{"summary":"Kernaussage in 2-3 Sätzen","keywords":["Begriff1","Begriff2","Begriff3","Begriff4","Begriff5"],"examTopics":["Klausurthema 1","Klausurthema 2"]}`,
        },
      ],
    }),
  })
  if (!res.ok) throw new Error(`groq ${res.status}`)
  const data = (await res.json()) as { choices: { message: { content: string } }[] }
  const parsed = JSON.parse(data.choices[0].message.content) as {
    summary: string
    keywords: string[]
    examTopics: string[]
  }
  return {
    summary: typeof parsed.summary === 'string' ? parsed.summary : fallback.summary,
    keywords: Array.isArray(parsed.keywords) ? parsed.keywords : fallback.keywords,
    examTopics: Array.isArray(parsed.examTopics) ? parsed.examTopics : fallback.examTopics,
    cardFront: fallback.cardFront,
    cardBack: fallback.cardBack,
    folderLabel: fallback.folderLabel,
  }
}

type Stage = 0 | 1 | 2 | 3 | 4 | 5

export function DemoScreen() {
  const navigate = useNavigate()
  const { authUser } = useUser()
  const appHome = IS_DESKTOP ? '/dashboard' : '/unterricht'
  const [stage, setStage] = useState<Stage>(0)
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null)
  const [noteData, setNoteData] = useState<SmartNoteData | null>(null)
  const [displayedSummary, setDisplayedSummary] = useState('')
  const [displayedKeywords, setDisplayedKeywords] = useState<string[]>([])
  const [displayedExamTopics, setDisplayedExamTopics] = useState<string[]>([])
  const [cardFlipped, setCardFlipped] = useState(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  function addTimer(t: ReturnType<typeof setTimeout>) {
    timers.current.push(t)
  }

  useEffect(() => {
    localStorage.setItem('demoShown', 'true')
    return () => timers.current.forEach(clearTimeout)
  }, [])

  function handleTopicSelect(topic: string) {
    setSelectedTopic(topic)
    setStage(1)

    let resolved = false

    const fallbackTimer = setTimeout(() => {
      if (!resolved) {
        resolved = true
        setNoteData(FALLBACKS[topic])
        setStage(2)
      }
    }, 8000)
    addTimer(fallbackTimer)

    callGroqDemo(topic)
      .then((data) => {
        if (!resolved) {
          resolved = true
          clearTimeout(fallbackTimer)
          setNoteData(data)
          setStage(2)
        }
      })
      .catch(() => {
        if (!resolved) {
          resolved = true
          clearTimeout(fallbackTimer)
          setNoteData(FALLBACKS[topic])
          setStage(2)
        }
      })
  }

  // Typewriter effect when stage === 2
  useEffect(() => {
    if (stage !== 2 || !noteData) return
    setDisplayedSummary('')
    setDisplayedKeywords([])
    setDisplayedExamTopics([])

    const summary = noteData.summary
    let i = 0

    const typeNext = () => {
      i++
      setDisplayedSummary(summary.slice(0, i))
      if (i < summary.length) {
        const delay = Math.max(8, 28 - Math.floor(i / 8))
        addTimer(setTimeout(typeNext, delay))
      } else {
        addTimer(
          setTimeout(() => {
            setDisplayedKeywords(noteData.keywords)
            addTimer(
              setTimeout(() => {
                setDisplayedExamTopics(noteData.examTopics)
                addTimer(setTimeout(() => setStage(3), 1100))
              }, 450),
            )
          }, 350),
        )
      }
    }
    addTimer(setTimeout(typeNext, 20))
  }, [stage]) // eslint-disable-line react-hooks/exhaustive-deps

  // Folder → card transition
  useEffect(() => {
    if (stage !== 3) return
    addTimer(setTimeout(() => setStage(4), 1700))
  }, [stage])

  // Card auto-flip → show choice
  useEffect(() => {
    if (stage !== 4) return
    setCardFlipped(false)
    addTimer(
      setTimeout(() => {
        setCardFlipped(true)
        addTimer(setTimeout(() => setStage(5), 1300))
      }, 1200),
    )
  }, [stage])

  return (
    <div
      className="fixed inset-0 flex flex-col items-center overflow-y-auto"
      style={{
        background: '#0d0d12',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
      }}
    >
      {/* Background glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: [
            'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(124,58,237,0.22) 0%, transparent 65%)',
            'radial-gradient(ellipse 40% 30% at 80% 80%, rgba(90,200,250,0.05) 0%, transparent 60%)',
          ].join(', '),
        }}
      />

      {/* Fixed Anmelden link */}
      <motion.button
        className="fixed top-4 right-4 z-50 text-[13px] font-semibold px-4 py-2 rounded-full"
        style={{ color: 'rgba(255,255,255,0.45)', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        onClick={() => navigate(authUser ? appHome : '/auth')}
        whileHover={{ color: 'rgba(255,255,255,0.8)' }}
        whileTap={{ scale: 0.95 }}
      >
        Anmelden
      </motion.button>

      {/* Centered content */}
      <div className="relative z-10 w-full max-w-[480px] px-5 py-16 flex flex-col items-center min-h-full justify-center">
        <AnimatePresence mode="wait">
          {/* ── Stage 0: Hook ──────────────────────────────────────────── */}
          {stage === 0 && (
            <motion.div
              key="hook"
              className="text-center w-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -16, transition: { duration: 0.25 } }}
            >
              <motion.h1
                className="font-black text-white mb-3 leading-tight"
                style={{ fontSize: 'clamp(26px, 7vw, 38px)', letterSpacing: '-0.03em' }}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: E }}
              >
                Deine Notizen.{' '}
                <span
                  style={{
                    background: 'linear-gradient(135deg, #A78BFA, #7C3AED)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  Deine Klausur.
                </span>{' '}
                Dein Lernplan.
              </motion.h1>

              <motion.p
                className="text-[15px] mb-10"
                style={{ color: 'rgba(255,255,255,0.42)' }}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: E, delay: 0.38 }}
              >
                Sieh selbst wie es funktioniert.
              </motion.p>

              <div className="flex flex-wrap gap-2.5 justify-center">
                {TOPICS.map((t, i) => (
                  <motion.button
                    key={t.label}
                    onClick={() => handleTopicSelect(t.label)}
                    className="px-4 py-2 rounded-full text-[13px] font-semibold"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: 'rgba(255,255,255,0.82)',
                    }}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.42, ease: E, delay: 0.68 + i * 0.07 }}
                    whileHover={{ scale: 1.06, y: -1, backgroundColor: 'rgba(124,58,237,0.18)', borderColor: 'rgba(124,58,237,0.4)' }}
                    whileTap={{ scale: 0.94 }}
                  >
                    {t.label}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Stage 1: Loading ────────────────────────────────────────── */}
          {stage === 1 && (
            <motion.div
              key="loading"
              className="flex flex-col items-center gap-6"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              transition={{ duration: 0.3, ease: E }}
            >
              <motion.div
                className="px-5 py-2.5 rounded-full text-[15px] font-bold"
                style={{
                  background: 'rgba(124,58,237,0.2)',
                  border: '1.5px solid rgba(124,58,237,0.45)',
                  color: '#A78BFA',
                }}
                initial={{ scale: 0.9 }}
                animate={{ scale: 1.05 }}
                transition={{ duration: 0.35, ease: E }}
              >
                {selectedTopic}
              </motion.div>

              <div className="relative w-14 h-14">
                {[0, 1].map((i) => (
                  <motion.div
                    key={i}
                    className="absolute inset-0 rounded-full"
                    style={{ border: '2px solid rgba(124,58,237,0.5)' }}
                    animate={{ scale: [1, 1.6 + i * 0.3], opacity: [0.7, 0] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut', delay: i * 0.35 }}
                  />
                ))}
                <div
                  className="absolute rounded-full"
                  style={{ inset: '14px', background: 'linear-gradient(135deg, #7C3AED, #A78BFA)' }}
                />
              </div>

              <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Analysiere Thema...
              </p>
            </motion.div>
          )}

          {/* ── Stages 2-5: Note flow ──────────────────────────────────── */}
          {stage >= 2 && (
            <motion.div
              key="note-flow"
              className="w-full flex flex-col items-center gap-5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35, ease: E }}
            >
              {/* Smart Note card — visible stages 2 & 3 */}
              {stage <= 3 && noteData && (
                <motion.div
                  className="w-full rounded-2xl p-5"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={
                    stage === 3
                      ? { opacity: 0, scale: 0.62, y: 90, transition: { duration: 0.55, ease: [0.4, 0, 0.6, 1] } }
                      : { opacity: 1, y: 0, scale: 1, transition: { duration: 0.42, ease: E } }
                  }
                >
                  {/* Header */}
                  <div className="flex items-center gap-2.5 mb-4">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)' }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#A78BFA' }}>
                        Smart Note
                      </p>
                      <p className="text-[12px] font-bold text-white">{selectedTopic}</p>
                    </div>
                  </div>

                  {/* Summary typewriter */}
                  <div className="mb-4">
                    <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(167,139,250,0.7)' }}>
                      Zusammenfassung
                    </p>
                    <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.8)', minHeight: 56 }}>
                      {displayedSummary}
                      {displayedSummary.length < noteData.summary.length && (
                        <motion.span
                          className="inline-block w-[2px] h-[14px] ml-0.5 align-middle rounded-full"
                          style={{ background: '#A78BFA' }}
                          animate={{ opacity: [1, 0] }}
                          transition={{ duration: 0.7, repeat: Infinity, ease: 'linear', repeatType: 'mirror' }}
                        />
                      )}
                    </p>
                  </div>

                  {/* Keywords */}
                  <AnimatePresence>
                    {displayedKeywords.length > 0 && (
                      <motion.div
                        className="mb-4"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.32, ease: E }}
                      >
                        <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
                          Schlüsselbegriffe
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {displayedKeywords.map((kw, i) => (
                            <motion.span
                              key={kw}
                              className="text-[11px] font-medium px-2.5 py-0.5 rounded-full"
                              style={{
                                background: 'rgba(124,58,237,0.2)',
                                border: '1px solid rgba(124,58,237,0.32)',
                                color: '#A78BFA',
                              }}
                              initial={{ opacity: 0, scale: 0.82 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: i * 0.07, duration: 0.22, ease: E }}
                            >
                              {kw}
                            </motion.span>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Exam topics */}
                  <AnimatePresence>
                    {displayedExamTopics.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.32, ease: E }}
                      >
                        <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
                          Klausurthemen
                        </p>
                        {displayedExamTopics.map((t, i) => (
                          <motion.div
                            key={t}
                            className="flex items-center gap-2 mb-1.5"
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1, duration: 0.28, ease: E }}
                          >
                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#A78BFA' }} />
                            <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.72)' }}>
                              {t}
                            </p>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {/* Folder save — stage 3 */}
              <AnimatePresence>
                {stage === 3 && noteData && (
                  <motion.div
                    key="folder"
                    className="flex flex-col items-center gap-2"
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.32, ease: E }}
                  >
                    <motion.div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center"
                      style={{
                        background: 'rgba(124,58,237,0.18)',
                        border: '1.5px solid rgba(124,58,237,0.38)',
                      }}
                      animate={{ scale: [1, 1.18, 1] }}
                      transition={{ duration: 0.55, ease: E, delay: 0.28 }}
                    >
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                      </svg>
                    </motion.div>
                    <motion.p
                      className="text-[12px] font-medium"
                      style={{ color: 'rgba(255,255,255,0.38)' }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                    >
                      Gespeichert in {noteData.folderLabel}
                    </motion.p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Flashcard — stages 4 & 5 */}
              <AnimatePresence>
                {stage >= 4 && noteData && (
                  <motion.div
                    key="flashcard"
                    className="w-full flex flex-col items-center gap-4"
                    initial={{ opacity: 0, y: 22 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, ease: E }}
                  >
                    <div style={{ width: '100%', perspective: '1000px', height: 180 }}>
                      <div
                        className={`flashcard-inner w-full h-full${cardFlipped ? ' flipped' : ''}`}
                        style={{ minHeight: 180 }}
                      >
                        {/* Front */}
                        <div
                          className="flashcard-face absolute inset-0 rounded-2xl p-5 flex flex-col justify-between"
                          style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.1)',
                          }}
                        >
                          <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#A78BFA' }}>
                            Karteikarte · Frage
                          </p>
                          <p className="text-[15px] font-semibold text-white text-center leading-snug flex-1 flex items-center justify-center px-2">
                            {noteData.cardFront}
                          </p>
                          <p className="text-[10px] text-center" style={{ color: 'rgba(255,255,255,0.2)' }}>
                            dreht sich gleich um...
                          </p>
                        </div>

                        {/* Back */}
                        <div
                          className="flashcard-back absolute inset-0 rounded-2xl p-5 flex flex-col justify-between"
                          style={{
                            background: 'rgba(124,58,237,0.14)',
                            border: '1px solid rgba(124,58,237,0.32)',
                          }}
                        >
                          <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#A78BFA' }}>
                            Antwort
                          </p>
                          <p className="text-[14px] text-white leading-relaxed flex-1 flex items-center px-1">
                            {noteData.cardBack}
                          </p>
                          <p className="text-[10px] text-center" style={{ color: 'rgba(255,255,255,0.2)' }}>
                            Tippen zum Zurückdrehen
                          </p>
                        </div>
                      </div>
                    </div>

                    <AnimatePresence>
                      {cardFlipped && (
                        <motion.p
                          className="text-[13px] font-medium text-center"
                          style={{ color: 'rgba(255,255,255,0.52)' }}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, ease: E }}
                        >
                          Das passiert mit jeder Notiz. Automatisch.
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Choice — stage 5 */}
              <AnimatePresence>
                {stage === 5 && (
                  <motion.div
                    key="choice"
                    className="w-full flex flex-col items-center gap-3 pt-2"
                    initial={{ opacity: 0, y: 22 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.48, ease: E, delay: 0.08 }}
                  >
                    <motion.button
                      onClick={() => navigate(authUser ? appHome : '/auth')}
                      className="w-full py-3.5 rounded-2xl text-[15px] font-bold text-white relative overflow-hidden"
                      style={{
                        background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
                        boxShadow: '0 4px 24px rgba(124,58,237,0.45)',
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <span
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background:
                            'linear-gradient(105deg, transparent 38%, rgba(255,255,255,0.18) 50%, transparent 62%)',
                          backgroundSize: '200% 100%',
                          animation: 'shimmer 3s infinite linear',
                        }}
                      />
                      <span className="relative">Jetzt personalisieren →</span>
                    </motion.button>

                    <motion.button
                      onClick={() => navigate(authUser ? appHome : '/auth')}
                      className="w-full py-3 rounded-2xl text-[14px] font-semibold"
                      style={{
                        background: 'transparent',
                        border: '1.5px solid rgba(255,255,255,0.14)',
                        color: 'rgba(255,255,255,0.65)',
                      }}
                      whileHover={{ scale: 1.01, borderColor: 'rgba(255,255,255,0.28)', color: 'rgba(255,255,255,0.9)' }}
                      whileTap={{ scale: 0.97 }}
                    >
                      Anmelden
                    </motion.button>

                    <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.28)' }}>
                      Personalisierung dauert ~2 Minuten
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
