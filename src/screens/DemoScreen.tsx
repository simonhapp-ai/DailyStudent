import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useUser } from '../context/UserContext'
import { Icon, type IconName } from '../components/ui/Icon'

// ── Demo ──────────────────────────────────────────────────────────────────
//
// Keine Bilderfolge und kein Video, sondern EIN nachgebauter Bildschirm, durch
// den eine einzige Sache wandert: ein Tafelbild wird zur Notiz, die Notiz zum
// Stoff, der Stoff zum Plan. Der Regler oben gleitet dabei von selbst vom
// Unterrichts- in den Klausurenmodus, und die Akzente kippen sichtbar von Lila
// auf Mint.
//
// Das erklaert die Zwei-Modi-Architektur, ohne sie zu erklaeren — und es ist
// aus denselben Bausteinen gebaut wie die App, bleibt also richtig, wenn sich
// das Design aendert. Ein Video waere am naechsten Tag veraltet.
//
// Sechs Bilder, jedes mit einer Sprechblase, die sagt WARUM man das sieht.

type ModeTone = 'unterricht' | 'klausur'

interface Beat {
  /** Welcher Modus gerade laeuft — steuert Regler und Akzentfarbe. */
  mode: ModeTone
  /** Was die Sprechblase sagt. Kein Feature-Name, sondern der Nutzen. */
  bubble: string
  /** Wie lange das Bild steht, in Millisekunden. */
  hold: number
}

const BEATS: Beat[] = [
  { mode: 'unterricht', bubble: 'Du sitzt im Unterricht. Tafelbild abfotografieren — mehr machst du nicht.', hold: 3200 },
  { mode: 'unterricht', bubble: 'Die KI liest mit: Zusammenfassung, Schlüsselbegriffe, mögliche Klausurthemen.', hold: 3600 },
  { mode: 'unterricht', bubble: 'Fertig. Die Stunde ist erfasst, bevor du zu Hause bist.', hold: 2600 },
  { mode: 'klausur',    bubble: 'Zu Hause wechselst du den Modus — und dieselbe Notiz wird zum Lernstoff.', hold: 3600 },
  { mode: 'klausur',    bubble: 'Karteikarten, Lernzettel, Probeklausur. Alles aus deiner eigenen Stunde.', hold: 3400 },
  { mode: 'klausur',    bubble: 'Und der Lernplan legt sie in die Tage, an denen du wirklich Zeit hast.', hold: 3400 },
]

const ACCENT: Record<ModeTone, string> = {
  unterricht: '#7C3AED',
  klausur: '#10B981',
}

const SURFACE: Record<ModeTone, string> = {
  unterricht: 'linear-gradient(158deg, #241640 0%, #1B1130 55%, #2B1B5E 100%)',
  klausur: 'linear-gradient(158deg, #0A3A2B 0%, #06251B 55%, #0E5540 100%)',
}

export function DemoScreen() {
  const navigate = useNavigate()
  const { authUser } = useUser()
  const reducedMotion = useReducedMotion()
  const [beat, setBeat] = useState(0)
  const [running, setRunning] = useState(true)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const current = BEATS[beat]
  const accent = ACCENT[current.mode]

  // Der Ablauf laeuft von selbst weiter und bleibt am Ende stehen — er springt
  // nicht zurueck an den Anfang. Wer bis hierher geschaut hat, soll den Knopf
  // sehen, nicht die Wiederholung.
  useEffect(() => {
    if (!running) return
    if (beat >= BEATS.length - 1) return
    timer.current = setTimeout(() => setBeat((b) => b + 1), current.hold)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [beat, running, current.hold])

  const finished = beat >= BEATS.length - 1
  const goOn = () => navigate(authUser ? '/unterricht' : '/auth')

  return (
    <div className="min-h-dvh bg-background flex flex-col items-center px-5"
      style={{ paddingTop: 'max(48px, calc(env(safe-area-inset-top, 0px) + 24px))', paddingBottom: 32 }}>

      <div className="w-full max-w-[440px] flex flex-col flex-1">

        {/* ── Begruessung ────────────────────────────────────────── */}
        <h1 className="text-[28px] font-extrabold tracking-[-0.035em] text-text-primary leading-tight">
          So läuft ein Schultag<br />mit DailyStudent.
        </h1>
        <p className="text-[15px] text-text-secondary mt-2 leading-relaxed">
          Zwei Modi, ein Weg: Erfassen, wo du bist. Lernen, wenn du Zeit hast.
        </p>

        {/* ── Die Buehne ─────────────────────────────────────────
            Eine immer dunkle Flaeche, deren Farbe mit dem Modus kippt. Das ist
            der eigentliche Trick der Demo: Man SIEHT den Wechsel, statt ihn
            erklaert zu bekommen. */}
        <motion.div
          className="relative rounded-sheet overflow-hidden mt-6 p-5 text-white"
          animate={{ background: SURFACE[current.mode] }}
          transition={reducedMotion ? { duration: 0 } : { duration: 0.75, ease: [0.23, 1, 0.32, 1] }}
          style={{ background: SURFACE[current.mode], minHeight: 328 }}
        >
          {/* Schein in der Modusfarbe */}
          <motion.span
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-24 w-[280px] h-[280px] rounded-full opacity-70"
            animate={{ background: `radial-gradient(circle, ${accent}, transparent 70%)` }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.75 }}
          />

          {/* Der Regler — wandert von selbst */}
          <div className="relative flex p-1 rounded-pill mb-5" style={{ background: 'rgba(255,255,255,0.12)' }}>
            <motion.span
              aria-hidden
              className="absolute top-1 bottom-1 rounded-pill"
              animate={{
                left: current.mode === 'unterricht' ? '0.25rem' : '50%',
                right: current.mode === 'unterricht' ? '50%' : '0.25rem',
                background: accent,
              }}
              transition={reducedMotion ? { duration: 0 } : { type: 'spring', duration: 0.7, bounce: 0.16 }}
            />
            {(['unterricht', 'klausur'] as ModeTone[]).map((m) => (
              <span key={m} className="relative flex-1 h-8 flex items-center justify-center text-[13px] font-semibold"
                style={{ color: current.mode === m ? '#FFFFFF' : 'rgba(255,255,255,0.55)' }}>
                {m === 'unterricht' ? 'Unterricht' : 'Klausur'}
              </span>
            ))}
          </div>

          {/* Der Inhalt — je Bild ein anderer */}
          <div className="relative" style={{ minHeight: 168 }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={beat}
                initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
                transition={reducedMotion ? { duration: 0 } : { duration: 0.32, ease: [0.23, 1, 0.32, 1] }}
              >
                <BeatContent beat={beat} accent={accent} />
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* ── Sprechblase ────────────────────────────────────────
            Sagt nie, wie das Feature heisst — immer, was es dir spart. */}
        <div className="flex gap-2.5 mt-4 min-h-[64px]">
          <span className="shrink-0 mt-0.5 text-text-secondary"><Icon name="speech" size={17} /></span>
          <AnimatePresence mode="wait">
            <motion.p
              key={beat}
              className="text-[14.5px] leading-relaxed text-text-primary"
              initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={reducedMotion ? { duration: 0 } : { duration: 0.28 }}
            >
              {current.bubble}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* ── Fortschritt ────────────────────────────────────────
            Antippbar: Wer schneller ist als die Animation, springt weiter. */}
        <div className="flex gap-1.5 mt-5">
          {BEATS.map((b, i) => (
            <button
              key={i}
              onClick={() => { setRunning(false); setBeat(i) }}
              aria-label={`Bild ${i + 1} von ${BEATS.length}`}
              className="flex-1 h-1.5 rounded-pill transition-colors"
              style={{ background: i <= beat ? ACCENT[b.mode] : 'rgb(var(--color-border))' }}
            />
          ))}
        </div>

        <div className="flex-1" />

        {/* ── Weiter ─────────────────────────────────────────────
            Ein Knopf, immer sichtbar. Wer die Demo nicht will, muss sie nicht
            zu Ende sehen — das ist der haeufigste Fall und darf kein Umweg sein. */}
        {/* Der Knopf faerbt mit — am Ende steht er in Mint, weil die Erzaehlung
            dort endet. Ein lila Knopf unter einer mintgruenen Buehne waere der
            einzige Bruch in der ganzen Folge. */}
        <motion.button
          onClick={goOn}
          className="w-full min-h-[52px] rounded-pill text-white text-[16px] font-semibold press mt-6"
          animate={{
            background: current.mode === 'unterricht'
              ? 'linear-gradient(135deg, #7C3AED, #5B21B6)'
              : 'linear-gradient(135deg, #047857, #10B981)',
          }}
          transition={reducedMotion ? { duration: 0 } : { duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        >
          {finished ? 'Starten und durchziehen' : 'Überspringen und loslegen'}
        </motion.button>
      </div>
    </div>
  )
}

// ── Die sechs Bilder ──────────────────────────────────────────────────────
// Alle aus denselben Formen wie die App: Listenzeile, Karte, Marke. Keine
// Screenshots — die waeren beim naechsten Redesign falsch.

function BeatContent({ beat, accent }: { beat: number; accent: string }) {
  if (beat === 0) return <FotoBeat accent={accent} />
  if (beat === 1) return <AnalyseBeat accent={accent} />
  if (beat === 2) return <NotizFertigBeat accent={accent} />
  if (beat === 3) return <UebergangBeat accent={accent} />
  if (beat === 4) return <MethodenBeat accent={accent} />
  return <PlanBeat accent={accent} />
}

function Zeile({ icon, title, sub, accent, filled }: {
  icon: IconName; title: string; sub?: string; accent: string; filled?: boolean
}) {
  return (
    <div className="flex items-center gap-3 rounded-card px-3.5 py-3" style={{ background: 'rgba(255,255,255,0.09)' }}>
      <span className="w-9 h-9 rounded-icon flex items-center justify-center shrink-0"
        style={{ background: filled ? accent : 'rgba(255,255,255,0.14)', color: '#FFFFFF' }}>
        <Icon name={icon} size={17} />
      </span>
      <span className="min-w-0">
        <span className="block text-[14px] font-semibold">{title}</span>
        {sub && <span className="block text-[12.5px] text-white/60 mt-0.5">{sub}</span>}
      </span>
    </div>
  )
}

/** Platzhalterzeilen — stehen fuer Text, ohne welchen zu erfinden. */
function Linien({ widths }: { widths: number[] }) {
  return (
    <div className="flex flex-col gap-2">
      {widths.map((w, i) => (
        <span key={i} className="h-2 rounded-pill" style={{ width: `${w}%`, background: 'rgba(255,255,255,0.20)' }} />
      ))}
    </div>
  )
}

function FotoBeat({ accent }: { accent: string }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-card h-[104px] flex items-center justify-center"
        style={{ background: 'rgba(255,255,255,0.09)', border: '1px dashed rgba(255,255,255,0.25)' }}>
        <span className="flex items-center gap-2 text-[13px] text-white/70">
          <Icon name="camera" size={17} />Tafelbild
        </span>
      </div>
      <Zeile icon="note" title="Neue Notiz · Biologie" sub="3. Stunde, gerade eben" accent={accent} filled />
    </div>
  )
}

function AnalyseBeat({ accent }: { accent: string }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-card p-3.5" style={{ background: 'rgba(255,255,255,0.09)' }}>
        <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-white/55">Zusammenfassung</span>
        <div className="mt-2.5"><Linien widths={[96, 88, 72]} /></div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {['Glykolyse', 'Citratzyklus', 'ATP'].map((k) => (
          <span key={k} className="px-2.5 py-1 rounded-pill text-[12px] font-semibold"
            style={{ background: accent, color: '#FFFFFF' }}>{k}</span>
        ))}
      </div>
    </div>
  )
}

function NotizFertigBeat({ accent }: { accent: string }) {
  return (
    <div className="flex flex-col gap-2.5">
      <Zeile icon="check" title="Zellatmung" sub="Zusammenfassung · 3 Begriffe · 2 Klausurthemen" accent={accent} filled />
      <Zeile icon="folder" title="Biologie · Q1" sub="Automatisch einsortiert" accent={accent} />
    </div>
  )
}

function UebergangBeat({ accent }: { accent: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-6">
      <span className="w-12 h-12 rounded-sheet flex items-center justify-center" style={{ background: accent }}>
        <Icon name="repeat" size={22} />
      </span>
      <span className="text-[15px] font-semibold">Dieselbe Notiz. Anderer Modus.</span>
      <span className="text-[13px] text-white/60">Zellatmung · Biologie</span>
    </div>
  )
}

function MethodenBeat({ accent }: { accent: string }) {
  const items: { icon: IconName; label: string }[] = [
    { icon: 'cards', label: 'Karteikarten' },
    { icon: 'bulb', label: 'Blurting' },
    { icon: 'document', label: 'Lernzettel' },
    { icon: 'clipboard', label: 'Probeklausur' },
  ]
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {items.map((it) => (
        <div key={it.label} className="rounded-card p-3" style={{ background: 'rgba(255,255,255,0.09)' }}>
          <span className="w-8 h-8 rounded-icon flex items-center justify-center mb-2"
            style={{ background: accent, color: '#FFFFFF' }}>
            <Icon name={it.icon} size={16} />
          </span>
          <span className="block text-[13px] font-semibold">{it.label}</span>
        </div>
      ))}
    </div>
  )
}

function PlanBeat({ accent }: { accent: string }) {
  const tage = [
    { tag: 'Mi', text: 'Karteikarten · 30 Min', an: true },
    { tag: 'Do', text: 'Lernzettel lesen · 20 Min', an: true },
    { tag: 'Fr', text: 'Probeklausur · 90 Min', an: false },
  ]
  return (
    <div className="flex flex-col gap-2">
      {tage.map((t) => (
        <div key={t.tag} className="flex items-center gap-3 rounded-card px-3.5 py-2.5"
          style={{ background: 'rgba(255,255,255,0.09)' }}>
          <span className="w-8 h-8 rounded-icon flex items-center justify-center text-[12px] font-bold shrink-0"
            style={{ background: t.an ? accent : 'rgba(255,255,255,0.14)', color: '#FFFFFF' }}>
            {t.tag}
          </span>
          <span className="text-[13.5px]">{t.text}</span>
        </div>
      ))}
      <span className="text-[12px] text-white/55 mt-1">Um deinen Stundenplan herum gelegt.</span>
    </div>
  )
}
