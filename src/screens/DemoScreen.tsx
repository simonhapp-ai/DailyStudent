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

type Stage = 0 | 1 | 2 | 3 | 4 | 5

export function DemoScreen() {
  const navigate = useNavigate()
  const { authUser } = useUser()
  const appHome = IS_DESKTOP ? '/dashboard' : '/unterricht'

  const [stage, setStage] = useState<Stage>(0)
  const [colorMode, setColorMode] = useState<'purple' | 'mint'>('purple')

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

    // No live AI call here — this is a public, unauthenticated page, so there's no way
    // to hide an API key or rate-limit a call from it. Pre-written/templated content only.
    // The delay keeps the loading animation feeling like something is actually happening.
    addTimer(setTimeout(() => {
      setNoteData(fallback)
      setStage(2)
    }, 2200))
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

  const mint = '#34D399'
  const purple = '#7C3AED'

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: '#0a0a0f', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
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
        className="fixed right-4 z-50 px-4 py-2 rounded-full text-[13px] font-medium"
        style={{ top: 'max(20px, calc(env(safe-area-inset-top, 0px) + 16px))', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.12)' }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => navigate(authUser ? appHome : '/auth')}
      >
        {authUser ? 'Zurück zur App' : 'Anmelden'}
      </motion.button>

{/* ── main content ── */}
      <div className="h-full overflow-y-auto" style={{ width: '100%' }}>
      <div className="flex flex-col items-center px-5 mx-auto" style={{ width: '100%', maxWidth: IS_DESKTOP ? 560 : 448, minHeight: '100%', paddingTop: 'max(10vh, calc(env(safe-area-inset-top, 0px) + 48px))', paddingBottom: '12vh', justifyContent: 'center' }}>
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
