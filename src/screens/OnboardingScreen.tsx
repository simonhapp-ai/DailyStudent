import { useState, useRef } from 'react'
import { Icon, type IconName } from '../components/ui/Icon'
import { SubjectIcon } from '../components/ui/SubjectIcon'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Button } from '../components/ui/Button'
import { useUser } from '../context/UserContext'
import { type UserProfile } from '../context/UserContext'
import { callHandleReferral } from '../lib/referral'
import type { StundenplanSlot } from '../types'
import { SUBJECT_INFO, SUBJECT_GROUPS, resolveSubjectInfo, getTopicPlaceholder } from '../data/subjectInfo'
import { topics } from '../data/mockData'
import { parseStundenplanFromImage } from '../lib/groq'
import { Tag } from '../components/ui/Tag'

const BUNDESLAENDER = [
  { id: 'by', name: 'Bayern' },
  { id: 'bw', name: 'Baden-Württ.' },
  { id: 'be', name: 'Berlin' },
  { id: 'bb', name: 'Brandenburg' },
  { id: 'hb', name: 'Bremen' },
  { id: 'hh', name: 'Hamburg' },
  { id: 'he', name: 'Hessen' },
  { id: 'mv', name: 'Meckl.-Vorp.' },
  { id: 'ni', name: 'Niedersachsen' },
  { id: 'nw', name: 'NRW' },
  { id: 'rp', name: 'Rheinl.-Pfalz' },
  { id: 'sl', name: 'Saarland' },
  { id: 'sn', name: 'Sachsen' },
  { id: 'st', name: 'Sachsen-Anh.' },
  { id: 'sh', name: 'Schleswig-H.' },
  { id: 'th', name: 'Thüringen' },
]

const SCHULFORMEN_SCHUELER = ['Gymnasium', 'Gesamtschule', 'FOS']

const E = [0.23, 1, 0.32, 1] as const

// Forward = incoming step slides in from the right, outgoing exits left.
// Back = reversed. Keeps the wizard's direction spatially consistent.
// Reduced motion keeps the opacity fade but drops the horizontal movement.
function getStepVariants(reduceMotion: boolean) {
  return {
    enter: (dir: 1 | -1) => ({ opacity: 0, x: reduceMotion ? 0 : dir * 24 }),
    center: { opacity: 1, x: 0 },
    exit: (dir: 1 | -1) => ({ opacity: 0, x: reduceMotion ? 0 : dir * -24 }),
  }
}

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

export function OnboardingScreen() {
  const { completeOnboarding } = useUser()
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>(1)
  const [direction, setDirection] = useState<1 | -1>(1)
  const [finishing, setFinishing] = useState(false)
  const reduceMotion = useReducedMotion()

  const [name, setName] = useState('')
  const [klasse, setKlasse] = useState('')
  const [schulform, setSchulform] = useState('')
  const [schultyp, setSchultyp] = useState<'g8' | 'g9' | ''>('')
  const [userType, setUserType] = useState<'schüler' | 'student' | ''>('')
  const [zielnote, setZielnote] = useState('')
  const [bundeslandId, setBundeslandId] = useState('')
  const [faecher, setFaecher] = useState<string[]>([])
  const [lkFaecher, setLkFaecher] = useState<string[]>([])
  const [customFaecher, setCustomFaecher] = useState<CustomFach[]>([])
  const [folderSortMode, setFolderSortMode] = useState<'manual' | 'halbjahr' | 'themen'>('halbjahr')
  const [stundenplanSlots, setStundenplanSlots] = useState<StundenplanSlot[]>([])
  const [klausurSubject, setKlausurSubject] = useState('')
  const [klausurDate, setKlausurDate] = useState('')
  const [klausurTopic, setKlausurTopic] = useState('')

  const progress = (step / 8) * 100
  const isStudent = userType === 'student'

  const isOberstufe = !isStudent && schultyp !== '' && (
    schultyp === 'g8' ? parseInt(klasse) >= 11 : parseInt(klasse) >= 12
  )

  const canNext: Record<Step, boolean> = {
    1: true,
    2: name.trim().length > 0 && userType !== '' && (
      isStudent || (klasse !== '' && schulform !== '' && schultyp !== '')
    ),
    3: true,
    4: isStudent || bundeslandId !== '',
    5: faecher.length > 0 || customFaecher.length > 0,
    6: true,
    7: true,
    8: true,
  }

  const next = () => {
    if (step < 8) {
      setDirection(1)
      setStep((s) => (s + 1) as Step)
    }
  }

  const back = () => {
    if (step > 1) {
      setDirection(-1)
      setStep((s) => (s - 1) as Step)
    }
  }

  const toggleFach = (id: string) => {
    setFaecher((prev) => {
      if (prev.includes(id)) {
        setLkFaecher((lk) => lk.filter((f) => f !== id))
        return prev.filter((f) => f !== id)
      }
      return [...prev, id]
    })
  }

  const toggleLK = (id: string) => {
    setLkFaecher((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    )
  }

  const finish = () => {
    setFinishing(true)
    const bl = BUNDESLAENDER.find((b) => b.id === bundeslandId)
    const allFaecherIds = [...faecher, ...customFaecher.map((cf) => cf.id)]
    const profile: UserProfile = {
      name: name.trim(),
      klasse: isStudent ? 'student' : klasse,
      schulform: isStudent ? 'Universität' : schulform,
      bundesland: bl?.name ?? bundeslandId ?? '',
      bundeslandId: bundeslandId || '',
      faecher: allFaecherIds,
      customFaecher: customFaecher.length > 0 ? customFaecher : undefined,
      klausurtermine:
        klausurSubject && klausurDate
          ? [{ subjectId: klausurSubject, date: klausurDate, topic: klausurTopic || undefined }]
          : [],
      zielnote: zielnote || undefined,
      folderSortMode,
      schultyp: isStudent ? undefined : ((schultyp || undefined) as 'g8' | 'g9' | undefined),
      lkFaecher: !isStudent && lkFaecher.length > 0 ? lkFaecher : undefined,
      stundenplan: stundenplanSlots.length > 0
        ? { slots: stundenplanSlots, createdAt: new Date().toISOString() }
        : undefined,
      userType: userType || undefined,
    }
    const pendingRef = localStorage.getItem('referral_code')
    if (pendingRef) {
      localStorage.removeItem('referral_code')
      void callHandleReferral(pendingRef)
    }
    setTimeout(() => { completeOnboarding(profile); navigate('/unterricht') }, 800)
  }

  if (finishing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh bg-background gap-4">
        <div className="w-12 h-12 rounded-btn bg-accent-soft flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-primary">
            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-text-primary font-semibold text-lg">Deine App wird vorbereitet…</p>
        <p className="text-text-muted text-sm">
          {isStudent
            ? 'Deine Studienfächer werden vorbereitet…'
            : `${BUNDESLAENDER.find(b => b.id === bundeslandId)?.name ?? ''} · Lehrplan wird geladen`}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-dvh bg-background max-w-lg mx-auto">
      {/* Progress bar */}
      {step > 1 && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-border z-10 max-w-lg mx-auto">
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Back button */}
      {step > 1 && (
        <button
          onClick={back}
          className="absolute left-4 flex items-center gap-1 text-text-primary text-[14px] font-medium press-sm z-10"
          style={{ top: 'max(48px, calc(env(safe-area-inset-top, 0px) + 12px))' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Zurück
        </button>
      )}

      {/* Step content */}
      <div className="flex-1 px-6 pt-20 pb-10 overflow-hidden">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={step}
            custom={direction}
            variants={getStepVariants(!!reduceMotion)}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: E }}
          >
            {step === 1 && <StepWelcome onNext={next} />}
            {step === 2 && (
              <StepPersonal
                name={name} setName={setName}
                klasse={klasse} setKlasse={setKlasse}
                schulform={schulform} setSchulform={setSchulform}
                schultyp={schultyp} setSchultyp={(v) => setSchultyp(v)}
                userType={userType} setUserType={setUserType}
              />
            )}
            {step === 3 && (
              <StepZielnote zielnote={zielnote} setZielnote={setZielnote} isStudent={isStudent} />
            )}
            {step === 4 && (
              <StepBundesland selected={bundeslandId} onSelect={setBundeslandId} isStudent={isStudent} />
            )}
            {step === 5 && (
              <StepFaecher
                selected={faecher} onToggle={toggleFach}
                lkFaecher={lkFaecher} onToggleLK={toggleLK}
                isOberstufe={isOberstufe}
                customFaecher={customFaecher} setCustomFaecher={setCustomFaecher}
                isStudent={isStudent}
              />
            )}
            {step === 6 && (
              <StepFolderSort sortMode={folderSortMode} setSortMode={setFolderSortMode} klasse={klasse} schultyp={schultyp} isStudent={isStudent} />
            )}
            {step === 7 && (
              <StepStundenplan
                faecher={faecher}
                customFaecher={customFaecher}
                slots={stundenplanSlots}
                setSlots={setStundenplanSlots}
                onNext={next}
                onUpdateFaecher={(ids) => setFaecher((prev) => [...prev, ...ids.filter((id) => !prev.includes(id))])}
              />
            )}
            {step === 8 && (
              <StepKlausur
                faecher={faecher}
                customFaecher={customFaecher}
                subject={klausurSubject} setSubject={setKlausurSubject}
                date={klausurDate} setDate={setKlausurDate}
                topic={klausurTopic} setTopic={setKlausurTopic}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer CTA — step 7 (Stundenplan) manages its own footer */}
      {step > 1 && step !== 7 && (
        <div className="px-6 pb-10 pt-4">
          {step < 8 ? (
            <Button variant="primary" fullWidth onClick={next} disabled={!canNext[step]}>
              Weiter
            </Button>
          ) : (
            <div className="space-y-3">
              <Button variant="primary" fullWidth onClick={finish}>
                Loslegen
              </Button>
              {!(klausurSubject && klausurDate) && (
                <button
                  onClick={finish}
                  className="w-full text-center text-sm text-text-muted hover:text-text-secondary transition-colors py-2"
                >
                  Überspringen
                </button>
              )}
              {/* Referral teaser */}
              <div
                className="rounded-icon p-4 flex items-center gap-3"
                style={{ background: 'rgba(255,185,0,0.08)', border: '1px solid rgba(255,185,0,0.2)' }}
              >
                <span className="shrink-0 text-text-primary"><Icon name="gift" size={21} /></span>
                <div>
                  <p className="text-text-primary font-semibold text-[13px]">
                    14 Tage Pro — kostenlos
                  </p>
                  <p className="text-text-muted text-[11px] mt-0.5">
                    Lade nach dem Start 5 Freunde ein. Zu finden im Profil.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Step 1: Welcome ─────────────────────────────────────── */

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col justify-between min-h-[calc(100dvh-80px)]">
      <div className="flex-1 flex flex-col justify-center">
        {/* Volle Modusfarbe mit weissem Zeichen — dasselbe Muster wie ueberall
            sonst in der App, statt eines blassen Zeichens auf blasser Flaeche. */}
        <div
          className="w-16 h-16 rounded-card flex items-center justify-center mb-8"
          style={{ background: 'var(--grad-mode)', color: '#FFFFFF' }}
        >
          <Icon name="cap" size={30} />
        </div>
        <h1 className="text-4xl font-bold text-text-primary leading-tight mb-4">
          Smarter lernen.<br />
          <span className="text-text-primary">Besser abschneiden.</span>
        </h1>
        <p className="text-text-secondary text-lg leading-relaxed mb-10">
          Die KI, die deinen echten Unterricht kennt — personalisiert auf deinen Lehrplan.
        </p>

        <div className="space-y-4 mb-6">
          {[
            { icon: 'camera' as IconName, text: 'Tafelbilder scannen → fertige Lernnotiz in Sekunden' },
            { icon: 'clipboard' as IconName, text: 'Probeklausuren genau wie im Unterricht (AFB I–III)' },
            { icon: 'target' as IconName, text: 'KI-Feedback wie vom Lehrer — mit Erwartungshorizont' },
          ].map((item, i) => (
            /* Die Zeichen standen nackt und grau neben dem Text und lasen sich
               eher als Rauschen denn als Hinweis. Kachel wie im Rest der App. */
            <div key={i} className="flex items-center gap-3">
              <span
                className="w-9 h-9 rounded-icon flex items-center justify-center shrink-0"
                style={{ background: 'var(--color-accent-soft)', color: 'rgb(var(--color-accent))' }}
              >
                <Icon name={item.icon} size={18} />
              </span>
              <p className="text-text-primary text-[14px] leading-snug">{item.text}</p>
            </div>
          ))}
        </div>

        {/* War ein beiger Kasten mit oranger Schrift — eine Farbe, die sonst
            nirgends im Erscheinungsbild vorkommt, und farbige Schrift dazu. Der
            Hinweis traegt sein Signal jetzt in der Marke, der Text ist normal. */}
        <div className="rounded-card px-4 py-3.5 mb-8 bg-surface border border-border/60">
          <Tag tone="orange" size="sm" className="mb-2">Beta</Tag>
          <p className="text-text-secondary text-[13px] leading-relaxed">
            Die App funktioniert vor allem für Oberstufenschüler richtig gut. Für Studierende und die Mittelstufe ist sie nutzbar, aber noch nicht perfekt — sobald die Beta endet, wird sie für alle besser.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <Button variant="primary" fullWidth size="lg" onClick={onNext}>
          Los geht's
        </Button>
      </div>
    </div>
  )
}

/* ─── Step 2: Personal info ───────────────────────────────── */

const ALL_GRADES = Array.from({ length: 21 }, (_, i) =>
  (1.0 + i * 0.1).toFixed(1).replace('.', ',')
)

const MAJOR_IDX = new Set([0, 5, 10, 15, 20])
const MAJOR_LABELS = ['1,0', '1,5', '2,0', '2,5', '3,0']

function getGradeLabel(value: string): string {
  const n = parseFloat(value.replace(',', '.'))
  if (n <= 1.0) return 'Spitzenleistung'
  if (n <= 1.5) return 'Sehr gut'
  if (n <= 2.0) return 'Gut'
  if (n <= 2.5) return 'Solides Gut'
  return 'Entspannt'
}

function GradeSlider({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)

  const activeIndex = ALL_GRADES.indexOf(value)
  const hasValue = activeIndex !== -1
  const thumbPct = hasValue ? (activeIndex / (ALL_GRADES.length - 1)) * 100 : 0
  const thumbLeft = `calc(14px + ${thumbPct / 100} * (100% - 28px))`

  const getIndexFromX = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return 0
    const pad = 14
    const usable = rect.width - pad * 2
    const x = Math.max(0, Math.min(clientX - rect.left - pad, usable))
    return Math.round((x / usable) * (ALL_GRADES.length - 1))
  }

  return (
    <div className="bg-surface rounded-card border border-border/60 shadow-card-adaptive overflow-hidden">

      {/* ── Grade display ─────────────────────────────── */}
      <div
        className="px-5 pt-6 pb-5 text-center"
        style={{
          background: hasValue
            ? 'linear-gradient(180deg, rgb(var(--color-accent) / 0.08) 0%, transparent 100%)'
            : undefined,
        }}
      >
        <div key={value} className="animate-grade-pop">
          <p
            className="font-black leading-none mb-2"
            style={{
              fontSize: 68,
              color: hasValue ? 'rgb(var(--color-accent))' : 'rgb(var(--color-text-muted))',
              letterSpacing: '-0.02em',
            }}
          >
            {hasValue ? value : '—'}
          </p>
          <p
            className="text-[13px] font-medium tracking-wide"
            style={{ color: hasValue ? 'rgb(var(--color-accent))' : 'rgb(var(--color-text-muted))' }}
          >
            {hasValue ? getGradeLabel(value) : 'Regler ziehen zum Auswählen'}
          </p>
        </div>
      </div>

      {/* ── Slider ────────────────────────────────────── */}
      <div className="px-5 pb-5 pt-1">
        <div
          ref={trackRef}
          className="relative h-11 flex items-center cursor-pointer select-none touch-none"
          onPointerDown={(e) => {
            setDragging(true)
            e.currentTarget.setPointerCapture(e.pointerId)
            onChange(ALL_GRADES[getIndexFromX(e.clientX)])
          }}
          onPointerMove={(e) => {
            if (!dragging) return
            onChange(ALL_GRADES[getIndexFromX(e.clientX)])
          }}
          onPointerUp={() => setDragging(false)}
          onPointerCancel={() => setDragging(false)}
        >
          {/* Track bg */}
          <div
            className="absolute rounded-full"
            style={{ left: 14, right: 14, height: 3, backgroundColor: 'rgb(var(--color-border))' }}
          />

          {/* Track fill */}
          {hasValue && (
            <div
              className="absolute rounded-full transition-all duration-100"
              style={{
                left: 14,
                width: `calc(${thumbPct / 100} * (100% - 28px))`,
                height: 3,
                backgroundColor: 'rgb(var(--color-accent))',
              }}
            />
          )}

          {/* Ticks — major (5px) and minor (3px) */}
          {ALL_GRADES.map((g, i) => {
            const pct = (i / (ALL_GRADES.length - 1)) * 100
            const isMajor = MAJOR_IDX.has(i)
            const isActive = i === activeIndex
            const isPast = hasValue && i < activeIndex
            return (
              <div
                key={g}
                className="absolute -translate-x-1/2"
                style={{ left: `calc(14px + ${pct / 100} * (100% - 28px))` }}
              >
                <div
                  className="rounded-full transition-all duration-150"
                  style={{
                    width:  isMajor ? (isActive ? 8 : 5) : (isActive ? 5 : 3),
                    height: isMajor ? (isActive ? 8 : 5) : (isActive ? 5 : 3),
                    backgroundColor: isActive || isPast
                      ? 'rgb(var(--color-accent))'
                      : 'rgb(var(--color-border))',
                    opacity: isPast ? 0.4 : isMajor ? 1 : 0.5,
                  }}
                />
              </div>
            )
          })}

          {/* Thumb */}
          {hasValue && (
            <div
              className="absolute -translate-x-1/2 transition-all duration-150"
              style={{ left: thumbLeft }}
            >
              <div
                className="rounded-full transition-all duration-200"
                style={{
                  width: dragging ? 30 : 24,
                  height: dragging ? 30 : 24,
                  backgroundColor: 'rgb(var(--color-accent))',
                  border: '2.5px solid white',
                  boxShadow: '0 2px 12px rgba(124,58,237,0.35), 0 1px 3px rgba(0,0,0,0.12)',
                }}
              />
            </div>
          )}
        </div>

        {/* Major grade labels */}
        <div className="relative" style={{ height: 16 }}>
          {MAJOR_LABELS.map((label, i) => {
            const pct = (i / (MAJOR_LABELS.length - 1)) * 100
            return (
              <span
                key={label}
                className="absolute -translate-x-1/2 text-[11px] font-semibold text-text-muted"
                style={{ left: `calc(14px + ${pct / 100} * (100% - 28px))` }}
              >
                {label}
              </span>
            )
          })}
        </div>
      </div>

      {/* Clear */}
      {hasValue && (
        <button
          onClick={() => onChange('')}
          className="w-full py-3 text-[12px] text-text-muted hover:text-text-secondary border-t border-border/60 transition-colors"
        >
          Kein Ziel setzen
        </button>
      )}
    </div>
  )
}

function StepPersonal({
  name, setName,
  klasse, setKlasse,
  schulform, setSchulform,
  schultyp, setSchultyp,
  userType, setUserType,
}: {
  name: string; setName: (v: string) => void
  klasse: string; setKlasse: (v: string) => void
  schulform: string; setSchulform: (v: string) => void
  schultyp: 'g8' | 'g9' | ''; setSchultyp: (v: 'g8' | 'g9') => void
  userType: 'schüler' | 'student' | ''; setUserType: (v: 'schüler' | 'student') => void
}) {
  const [showMittelstufePicker, setShowMittelstufePicker] = useState(
    klasse !== '' && !['11', '12', '13'].includes(klasse),
  )

  const mittelstufeRange = schultyp === 'g8'
    ? ['5', '6', '7', '8', '9', '10']
    : ['5', '6', '7', '8', '9', '10', '11']

  const oberstufeKlassen = schultyp === 'g8' ? ['11', '12'] : ['12', '13']
  const mittelstufeSelected = klasse !== '' && !['11', '12', '13'].includes(klasse)

  const oberstufeSubLabel = (k: string) => {
    if (schultyp === 'g8') return k === '11' ? 'Q1 · Q2' : 'Q3 · Q4'
    return k === '12' ? 'Q1 · Q2' : 'Q3 · Q4'
  }

  const handleSetUserType = (t: 'schüler' | 'student') => {
    setUserType(t)
    if (t === 'student') {
      // Reset schüler-specific fields
      setSchulform('')
      setKlasse('')
      setSchultyp('g9' as 'g8' | 'g9')
      setShowMittelstufePicker(false)
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-text-primary mb-1">Hallo! Wie heißt du?</h2>
      <p className="text-text-muted text-sm mb-6">Dein Name personalisiert die App für dich.</p>

      {/* Solange nichts drinsteht, laeuft alle gut vier Sekunden ein Lichtstrahl
          um das Feld. Beim Durchspielen ging es unter: Man tippt zuerst auf die
          Knoepfe darunter und uebersieht, dass hier noch etwas fehlt. Der Ring
          liegt auf einer Huelle statt auf dem Feld selbst — Eingabefelder
          zeichnen kein ::after. Er hoert auf, sobald etwas im Feld steht. */}
      <div className={`rounded-card mb-6 ${name.trim() ? '' : 'glanz-lauf glanz-lila glanz-warten'}`}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Dein Vorname"
          autoFocus
          className="w-full bg-surface border border-border rounded-card px-4 py-4 text-text-primary text-lg placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
        />
      </div>

      {/* Schüler / Student picker */}
      <p className="section-label mb-3">Ich bin …</p>
      <div className="grid grid-cols-2 gap-2 mb-8">
        {([
          { id: 'schüler' as const, icon: 'book' as IconName, label: 'Schüler', desc: 'Klasse 5–13, Gymnasium etc.' },
          { id: 'student' as const, icon: 'cap' as IconName, label: 'Student', desc: 'Hochschule, Uni, FH …' },
        ]).map(({ id, icon, label, desc }) => (
          <button
            key={id}
            onClick={() => handleSetUserType(id)}
            className={`py-4 px-4 rounded-card border text-left transition-all duration-150 ${
              userType === id
                ? 'bg-accent border-transparent'
                : 'bg-surface border-border hover:bg-surface-hover'
            }`}
          >
            {/* Das Zeichen sass nackt und mittig ueber der Beschriftung und trug
                immer die Schriftfarbe — auf der ausgewaehlten, lila gefuellten
                Karte also Schwarz auf Lila. Jetzt eine Kachel wie ueberall
                sonst, links, mit weissem Zeichen. */}
            <span
              className="w-11 h-11 rounded-icon flex items-center justify-center mb-2.5"
              style={userType === id
                ? { background: 'rgb(255 255 255 / 0.18)', color: '#FFFFFF' }
                : { background: 'var(--grad-mode)', color: '#FFFFFF' }}
            >
              <Icon name={icon} size={22} />
            </span>
            <p className={`text-[15px] font-bold ${userType === id ? 'text-white' : 'text-text-primary'}`}>{label}</p>
            <p className={`text-[11px] mt-0.5 ${userType === id ? 'text-white/80' : 'text-text-muted'}`}>{desc}</p>
          </button>
        ))}
      </div>

      {/* Student confirmation — no G8/G9 needed */}
      {userType === 'student' && (
        <div className="rounded-card px-4 py-3.5 flex items-center gap-3 mb-2"
          style={{ background: 'rgb(var(--color-accent) / 0.08)', border: '1px solid rgb(var(--color-accent) / 0.2)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-text-primary shrink-0">
            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="text-[13px] text-text-primary font-medium">
            Kein G8/G9 nötig — du legst deine Fächer im nächsten Schritt selbst an.
          </p>
        </div>
      )}

      {/* Schüler: G8/G9 + class + Schulform */}
      {userType === 'schüler' && (
        <>
          <p className="section-label mb-3">
            Gymnasialsystem
          </p>
          <div className="grid grid-cols-2 gap-2 mb-8">
            {([
              { id: 'g8' as const, label: 'G8', desc: '8 Jahre — Oberstufe ab Kl. 11' },
              { id: 'g9' as const, label: 'G9', desc: '9 Jahre — Oberstufe ab Kl. 12' },
            ]).map(({ id, label, desc }) => (
              <button
                key={id}
                onClick={() => { setSchultyp(id); setKlasse(''); setShowMittelstufePicker(false) }}
                className={`py-4 px-4 rounded-card border text-left transition-all duration-150 ${
                  schultyp === id
                    ? 'bg-accent border-transparent'
                    : 'bg-surface border-border hover:bg-surface-hover'
                }`}
              >
                <p className={`text-xl font-black ${schultyp === id ? 'text-white' : 'text-text-primary'}`}>{label}</p>
                <p className={`text-[11px] mt-0.5 ${schultyp === id ? 'text-white/80' : 'text-text-muted'}`}>{desc}</p>
              </button>
            ))}
          </div>

          {/* Class picker — shown after G8/G9 selected */}
          {schultyp !== '' && (
            <>
              <p className="section-label mb-3">Klasse</p>

              {/* Mittelstufe collapsible */}
              <div className="mb-2">
                <button
                  onClick={() => { setShowMittelstufePicker(true); if (!mittelstufeSelected) setKlasse('') }}
                  className={`w-full py-3.5 px-4 rounded-card border text-left transition-all duration-150 ${
                    mittelstufeSelected
                      ? 'bg-accent border-transparent'
                      : 'bg-surface border-border hover:bg-surface-hover'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`font-semibold text-[15px] ${mittelstufeSelected ? 'text-white' : 'text-text-primary'}`}>
                        Mittelstufe{mittelstufeSelected ? ` · ${klasse}. Klasse` : ''}
                      </p>
                      <p className={`text-[12px] mt-0.5 ${mittelstufeSelected ? 'text-white/80' : 'text-text-muted'}`}>
                        Klasse {schultyp === 'g8' ? '5 – 10' : '5 – 11'}
                      </p>
                    </div>
                    <svg
                      className={`transition-transform duration-200 shrink-0 ${showMittelstufePicker ? 'rotate-180' : ''} ${mittelstufeSelected ? 'text-white/80' : 'text-text-muted'}`}
                      width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    >
                      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </button>

                {showMittelstufePicker && (
                  <div className="mt-2 grid grid-cols-4 gap-2 px-1 animate-fade-in">
                    {mittelstufeRange.map((k) => (
                      <button
                        key={k}
                        onClick={() => setKlasse(k)}
                        className={`py-3 rounded-card text-sm font-bold border transition-all duration-150 ${
                          klasse === k
                            ? 'bg-accent border-transparent text-white'
                            : 'bg-surface border-border text-text-secondary hover:bg-surface-hover'
                        }`}
                      >
                        {k}.
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Oberstufe */}
              <div className="mb-8">
                <p className="text-[11px] font-semibold text-text-muted mb-2">Oberstufe</p>
                <div className="grid grid-cols-2 gap-2">
                  {oberstufeKlassen.map((k) => (
                    <button
                      key={k}
                      onClick={() => { setKlasse(k); setShowMittelstufePicker(false) }}
                      className={`py-3.5 px-4 rounded-card border text-left transition-all duration-150 ${
                        klasse === k
                          ? 'bg-accent border-transparent'
                          : 'bg-surface border-border hover:bg-surface-hover'
                      }`}
                    >
                      <p className={`font-semibold text-[14px] ${klasse === k ? 'text-white' : 'text-text-primary'}`}>
                        {k}. Klasse
                      </p>
                      <p className={`text-[11px] mt-0.5 ${klasse === k ? 'text-white/80' : 'text-text-muted'}`}>
                        {oberstufeSubLabel(k)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Schulform */}
          <p className="section-label mb-3">Schulform</p>
          <div className="grid grid-cols-3 gap-2">
            {SCHULFORMEN_SCHUELER.map((sf) => (
              <button
                key={sf}
                onClick={() => setSchulform(sf)}
                className={`py-3 rounded-card text-sm font-medium border transition-all duration-150 ${
                  schulform === sf
                    ? 'bg-accent border-transparent text-white'
                    : 'bg-surface border-border text-text-secondary hover:bg-surface-hover'
                }`}
              >
                {sf}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/* ─── Step 3: Zielnote ────────────────────────────────────── */

function StepZielnote({ zielnote, setZielnote, isStudent }: { zielnote: string; setZielnote: (v: string) => void; isStudent?: boolean }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-text-primary mb-1">
        {isStudent ? 'Was ist dein Notenziel?' : 'Was ist dein Abi-Ziel?'}
      </h2>
      <p className="text-text-muted text-sm mb-8">
        Optional — die KI passt deinen Lernplan auf deine Zielnote an.
      </p>
      <GradeSlider value={zielnote} onChange={setZielnote} />
    </div>
  )
}

/* ─── Step 4: Bundesland ──────────────────────────────────── */

function StepBundesland({ selected, onSelect, isStudent }: { selected: string; onSelect: (id: string) => void; isStudent?: boolean }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-text-primary mb-1">
        {isStudent ? 'Wo studierst du?' : 'Wo gehst du zur Schule?'}
      </h2>
      <p className="text-text-muted text-sm mb-6">
        {isStudent
          ? 'Optional — hilft bei regionalen Features. Du kannst das überspringen.'
          : 'Wir laden deinen Lehrplan automatisch.'}
      </p>

      <div className="grid grid-cols-2 gap-2">
        {BUNDESLAENDER.map((bl) => (
          <button
            key={bl.id}
            onClick={() => onSelect(bl.id)}
            className={`py-3 px-3 rounded-card text-sm font-medium border text-left transition-all duration-150 ${
              selected === bl.id
                ? 'bg-accent border-transparent text-white'
                : 'bg-surface border-border text-text-secondary hover:bg-surface-hover'
            }`}
          >
            {bl.name}
          </button>
        ))}
      </div>

      {selected && (
        <div className="mt-5 flex items-center gap-2 text-text-primary text-sm">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Lehrplan {BUNDESLAENDER.find(b => b.id === selected)?.name} wird vorbereitet
        </div>
      )}
    </div>
  )
}

/* ─── Step 5: Fächer ──────────────────────────────────────── */

type CustomFach = { id: string; name: string }

function CustomFaecherModal({
  initial,
  onSave,
  onClose,
}: {
  initial: CustomFach[]
  onSave: (faecher: CustomFach[]) => void
  onClose: () => void
}) {
  const [inputs, setInputs] = useState<string[]>(
    initial.length > 0 ? initial.map((cf) => cf.name) : [''],
  )

  const updateInput = (i: number, val: string) =>
    setInputs((prev) => prev.map((inp, idx) => (idx === i ? val : inp)))

  const removeInput = (i: number) =>
    setInputs((prev) => prev.filter((_, idx) => idx !== i))

  const addInput = () => setInputs((prev) => [...prev, ''])

  const handleSave = () => {
    const valid = inputs.filter((s) => s.trim().length > 0)
    const faecher: CustomFach[] = valid.map((name, i) => ({
      id: `custom_${Date.now()}_${i}`,
      name: name.trim(),
    }))
    onSave(faecher)
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <h2 className="text-[17px] font-bold text-text-primary">Eigene Fächer</h2>
          <p className="text-[12px] text-text-muted mt-0.5">Trag so viele Fächer ein wie du möchtest</p>
        </div>
        <button
          onClick={onClose}
          className="text-text-muted hover:text-text-secondary text-sm font-medium transition-colors"
        >
          Abbrechen
        </button>
      </div>

      {/* Inputs */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-3">
        {inputs.map((val, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={val}
              onChange={(e) => updateInput(i, e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addInput() }}
              placeholder={`z. B. ${['Informatik', 'BWL', 'Jura', 'Medizin', 'Psychologie'][i % 5]}`}
              autoFocus={i === inputs.length - 1 && i > 0}
              className="flex-1 bg-surface border border-border rounded-card px-4 py-3.5 text-text-primary text-[15px] placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
            />
            {inputs.length > 1 && (
              <button
                onClick={() => removeInput(i)}
                className="w-11 h-11 rounded-card border border-border flex items-center justify-center text-text-muted hover:text-text-primary hover:border-danger/30 transition-colors shrink-0"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        ))}

        <button
          onClick={addInput}
          className="w-full py-3 border border-dashed border-border rounded-card flex items-center justify-center gap-2 text-text-muted hover:border-accent/50 hover:text-text-primary hover:bg-accent/5 transition-all duration-200"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          <span className="text-[13px] font-medium">Weiteres Fach hinzufügen</span>
        </button>
      </div>

      {/* Footer */}
      <div className="px-5 pb-8 pt-4 border-t border-border">
        <Button variant="primary" fullWidth size="lg" onClick={handleSave}>
          Fertig
        </Button>
      </div>
    </div>
  )
}

function StepFaecher({
  selected,
  onToggle,
  lkFaecher,
  onToggleLK,
  isOberstufe,
  customFaecher,
  setCustomFaecher,
  isStudent,
}: {
  selected: string[]
  onToggle: (id: string) => void
  lkFaecher: string[]
  onToggleLK: (id: string) => void
  isOberstufe: boolean
  customFaecher: CustomFach[]
  setCustomFaecher: (faecher: CustomFach[]) => void
  isStudent: boolean
}) {
  const [showCustomModal, setShowCustomModal] = useState(false)

  const totalSelected = selected.length + customFaecher.length

  return (
    <div>
      {showCustomModal && (
        <CustomFaecherModal
          initial={customFaecher}
          onSave={(faecher) => { setCustomFaecher(faecher); setShowCustomModal(false) }}
          onClose={() => setShowCustomModal(false)}
        />
      )}

      <h2 className="text-2xl font-bold text-text-primary mb-1">Deine Fächer</h2>
      <p className="text-text-muted text-sm mb-1">
        {isStudent
          ? 'Lege deine Studienfächer an.'
          : 'Wähle alle Fächer, die du lernst.'}
        {' '}<span className="text-text-primary font-medium">{totalSelected} ausgewählt</span>
      </p>
      {isOberstufe && !isStudent && (
        <p className="text-[11px] text-text-muted mb-4">Tippe auf <span className="font-bold text-text-primary">LK</span> um Leistungskurse zu markieren.</p>
      )}
      {(!isOberstufe || isStudent) && <div className="mb-5" />}

      {/* ── Custom Fächer section ────────────────────────── */}
      <div className="mb-6 rounded-card border border-border/60 bg-surface overflow-hidden">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-[15px] text-text-primary">
                {isStudent ? 'Studienfächer anlegen' : 'Eigene Fächer hinzufügen'}
              </p>
              <p className="text-[12px] text-text-muted mt-0.5">
                {isStudent
                  ? 'Lege hier deine Studienfächer an — ohne KC-Anbindung'
                  : 'Fächer die oben nicht aufgeführt sind, z. B. Informatik, Latein …'}
              </p>
            </div>
            <button
              onClick={() => setShowCustomModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-btn btn-mode text-[13px] font-semibold shrink-0 active:scale-95 transition-all"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
              Anlegen
            </button>
          </div>
        </div>

        {customFaecher.length > 0 && (
          <div className="px-4 pb-4 flex flex-wrap gap-2">
            {customFaecher.map((cf) => (
              <div
                key={cf.id}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill"
                style={{ background: 'rgb(var(--color-accent) / 0.1)', border: '1px solid rgb(var(--color-accent) / 0.25)' }}
              >
                <span className="text-[13px] font-semibold text-text-primary">{cf.name}</span>
                <button
                  onClick={() => setCustomFaecher(customFaecher.filter((c) => c.id !== cf.id))}
                  className="text-text-primary/60 hover:text-text-primary transition-colors"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            ))}
            <button
              onClick={() => setShowCustomModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-pill text-[13px] font-medium text-text-muted border border-dashed border-border hover:border-accent/50 hover:text-text-primary transition-all"
            >
              + bearbeiten
            </button>
          </div>
        )}
      </div>

      {/* ── Standard subject groups ──────────────────────── */}
      {!isStudent && (
        <div className="space-y-5">
          {SUBJECT_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="section-label mb-2">
                {group.label}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {group.ids.map((id) => {
                  const subject = SUBJECT_INFO[id]
                  const active = selected.includes(id)
                  const isLK = lkFaecher.includes(id)
                  return (
                    <button
                      key={id}
                      onClick={() => onToggle(id)}
                      className={`relative flex items-center gap-3 p-3 rounded-card border text-left transition-all duration-150 ${
                        active ? 'border-accent bg-accent-soft' : 'border-border bg-surface hover:bg-surface-hover'
                      }`}
                    >
                      <SubjectIcon subjectId={id} size="sm" />
                      <p className={`text-xs font-semibold leading-tight flex-1 min-w-0 ${active ? 'text-text-primary' : 'text-text-secondary'}`}>
                        {subject.name}
                      </p>
                      {active && isOberstufe ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); onToggleLK(id) }}
                          className={`absolute top-2 right-2 px-1.5 py-0.5 rounded-chip text-[11px] font-black tracking-wide transition-all ${
                            isLK
                              ? 'btn-mode'
                              : 'bg-accent/15 text-text-primary border border-accent/30'
                          }`}
                        >
                          LK
                        </button>
                      ) : active ? (
                        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-accent flex items-center justify-center shrink-0">
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hint for students if no custom fächer yet */}
      {isStudent && customFaecher.length === 0 && (
        <div className="text-center py-8">
          <p className="mb-3 flex justify-center text-text-secondary"><Icon name="book" size={28} /></p>
          <p className="text-text-secondary text-[14px] font-medium">Noch keine Fächer angelegt</p>
          <p className="text-text-muted text-[12px] mt-1">Klicke auf "Anlegen" um deine Studienfächer hinzuzufügen</p>
        </div>
      )}
    </div>
  )
}

/* ─── Step 6: FolderSort ──────────────────────────────────── */

function StepFolderSort({
  sortMode,
  setSortMode,
  klasse,
  schultyp,
  isStudent,
}: {
  sortMode: 'manual' | 'halbjahr' | 'themen'
  setSortMode: (v: 'manual' | 'halbjahr' | 'themen') => void
  klasse: string
  schultyp?: 'g8' | 'g9' | ''
  isStudent?: boolean
}) {
  const isQPhase = !isStudent && (schultyp === 'g8' ? parseInt(klasse) >= 11 : parseInt(klasse) >= 12)

  const options: { id: 'manual' | 'halbjahr' | 'themen'; icon: IconName; title: string; desc: string; comingSoon?: boolean }[] = [
    {
      id: 'halbjahr',
      icon: 'calendar',
      title: isStudent ? 'Nach Semester' : isQPhase ? 'Nach Quartal' : 'Nach Halbjahr',
      desc: isStudent
        ? 'Ordner werden automatisch nach 1., 2., 3. und 4. Semester erstellt'
        : isQPhase
        ? 'Ordner werden automatisch nach Q1, Q2, Q3 und Q4 sortiert'
        : 'Ordner werden automatisch nach 1. und 2. Halbjahr erstellt',
    },
    {
      id: 'manual',
      icon: 'settings',
      title: 'Manuell',
      desc: 'Du erstellst und benennst Ordner selbst — maximale Kontrolle',
    },
    {
      id: 'themen',
      icon: 'book',
      title: 'Nach Themen',
      desc: 'Ordner nach Lehrplanthemen (KC) — folgt bald für alle Bundesländer',
      comingSoon: true,
    },
  ]

  return (
    <div>
      <h2 className="text-2xl font-bold text-text-primary mb-1">Wie sortierst du deine Notizen?</h2>
      <p className="text-text-muted text-sm mb-8">
        Wähle, wie deine Ordner im Unterrichtsbereich strukturiert werden.
      </p>
      <div className="space-y-3">
        {options.map((opt) => {
          const active = sortMode === opt.id
          return (
            <button
              key={opt.id}
              onClick={() => { if (!opt.comingSoon) setSortMode(opt.id) }}
              className={`w-full flex items-start gap-4 p-4 rounded-card border text-left transition-all duration-150 ${
                active
                  ? 'bg-accent border-transparent'
                  : opt.comingSoon
                  ? 'bg-surface border-border/40 opacity-55 cursor-not-allowed'
                  : 'bg-surface border-border hover:bg-surface-hover active:scale-[0.98]'
              }`}
            >
              <div className={`w-12 h-12 rounded-btn flex items-center justify-center text-2xl shrink-0 ${active ? 'bg-white/20' : 'bg-accent/10'}`}>
                <Icon name={opt.icon} size={20} />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`font-semibold text-[15px] ${active ? 'text-white' : 'text-text-primary'}`}>
                    {opt.title}
                  </p>
                  {opt.comingSoon && (
                    <span className="px-2 py-0.5 rounded-pill text-[11px] font-bold bg-border/80 text-text-muted">
                      Bald
                    </span>
                  )}
                </div>
                <p className={`text-[13px] mt-0.5 leading-snug ${active ? 'text-white/80' : 'text-text-muted'}`}>
                  {opt.desc}
                </p>
              </div>
              {active && (
                <div className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center shrink-0 mt-0.5">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Step 7: SmartStundenplan ────────────────────────────── */

type StundenplanMode = 'choose' | 'manual' | 'scan'
type ScanPhase = 'idle' | 'analyzing' | 'error' | 'mismatch'

const DAY_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr'] as const

function StepStundenplan({
  faecher,
  customFaecher,
  slots,
  setSlots,
  onNext,
  onUpdateFaecher,
}: {
  faecher: string[]
  customFaecher: CustomFach[]
  slots: StundenplanSlot[]
  setSlots: (s: StundenplanSlot[]) => void
  onNext: () => void
  onUpdateFaecher: (additionalIds: string[]) => void
}) {
  const [mode, setMode] = useState<StundenplanMode>('choose')
  const [activeDay, setActiveDay] = useState(0)
  const [addingSlot, setAddingSlot] = useState(false)
  const [newSlot, setNewSlot] = useState({ startTime: '08:00', endTime: '08:45', subjectId: '', room: '', isFreistunde: false })
  const fileRef = useRef<HTMLInputElement>(null)
  const [scanFile, setScanFile] = useState<File | null>(null)
  const [scanPhase, setScanPhase] = useState<ScanPhase>('idle')
  const [scanError, setScanError] = useState('')
  const [fromAI, setFromAI] = useState(false)
  const [mismatchData, setMismatchData] = useState<{ slots: StundenplanSlot[]; additionalSubjectIds: string[] } | null>(null)

  const profileSubjects = faecher.map((id) => ({ id, ...resolveSubjectInfo(id, customFaecher) }))

  const daySlots = slots
    .filter((s) => s.day === activeDay)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
  const totalSlots = slots.length

  const handleStartTime = (startTime: string) => {
    const [h, m] = startTime.split(':').map(Number)
    const endMin = h * 60 + m + 45
    const endTime = `${String(Math.floor(endMin / 60) % 24).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`
    setNewSlot((n) => ({ ...n, startTime, endTime }))
  }

  const commitSlot = () => {
    if (!newSlot.subjectId && !newSlot.isFreistunde) return
    const slot: StundenplanSlot = {
      id: `slot-${Date.now()}`,
      day: activeDay,
      startTime: newSlot.startTime,
      endTime: newSlot.endTime,
      subjectId: newSlot.isFreistunde ? '' : newSlot.subjectId,
      room: newSlot.isFreistunde ? undefined : (newSlot.room || undefined),
      ...(newSlot.isFreistunde ? { isFreistunde: true } : {}),
    }
    setSlots([...slots, slot])
    setAddingSlot(false)
    setNewSlot({ startTime: '08:00', endTime: '08:45', subjectId: '', room: '', isFreistunde: false })
  }

  const removeSlot = (id: string) => setSlots(slots.filter((s) => s.id !== id))

  const handleScanFileSelect = async (file: File) => {
    setScanFile(file)
    setScanPhase('analyzing')
    setScanError('')
    try {
      const allSubjects = Object.entries(SUBJECT_INFO).map(([id, info]) => ({ id, name: info.name }))
      const result = await parseStundenplanFromImage(file, profileSubjects, allSubjects)
      if (result.additionalSubjectIds.length > 0) {
        setMismatchData(result)
        setScanPhase('mismatch')
      } else {
        setSlots(result.slots)
        setFromAI(true)
        setMode('manual')
      }
    } catch (err) {
      setScanPhase('error')
      setScanError(err instanceof Error ? err.message : 'Analyse fehlgeschlagen')
    }
  }

  // ── CHOOSE MODE ─────────────────────────────────────────────
  if (mode === 'choose') {
    return (
      <div className="flex flex-col min-h-[calc(100dvh-80px)]">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-text-primary mb-1">Dein Stundenplan</h2>
          <p className="text-text-muted text-sm mb-8">
            Optional — hilft der App, deinen Schultag zu strukturieren und dich besser zu begleiten.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => setMode('manual')}
              className="w-full flex items-center gap-4 bg-surface border border-border rounded-card p-5 text-left hover:bg-surface-hover active:scale-[0.98] transition-all duration-150"
            >
              <div className="w-12 h-12 rounded-btn btn-mode flex items-center justify-center shrink-0"><Icon name="pencil" size={22} /></div>
              <div className="flex-1">
                <p className="text-text-primary font-semibold text-[15px]">Manuell eintragen</p>
                <p className="text-text-muted text-[13px] mt-0.5">Fächer und Zeiten selbst eingeben</p>
              </div>
              <svg className="text-text-muted shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              onClick={() => setMode('scan')}
              className="w-full flex items-center gap-4 bg-surface border border-border rounded-card p-5 text-left hover:bg-surface-hover active:scale-[0.98] transition-all duration-150"
            >
              <div className="w-12 h-12 rounded-btn btn-mode flex items-center justify-center shrink-0"><Icon name="camera" size={22} /></div>
              <div className="flex-1">
                <p className="text-text-primary font-semibold text-[15px]">Foto / Scan hochladen</p>
                <p className="text-text-muted text-[13px] mt-0.5">Stundenplan fotografieren oder PDF importieren</p>
              </div>
              <svg className="text-text-muted shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
        <div className="pt-6">
          <button
            onClick={onNext}
            className="w-full py-3 text-sm text-text-muted hover:text-text-secondary transition-colors"
          >
            Jetzt überspringen
          </button>
        </div>
      </div>
    )
  }

  // ── SCAN MODE ───────────────────────────────────────────────
  if (mode === 'scan') {
    return (
      <div className="flex flex-col min-h-[calc(100dvh-80px)]">
        <div className="flex-1">
          <button
            onClick={() => { setMode('choose'); setScanPhase('idle'); setScanError(''); setScanFile(null) }}
            className="flex items-center gap-1.5 text-text-primary text-sm font-medium mb-6 hover:opacity-80 transition-opacity"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Zurück
          </button>
          <h2 className="text-2xl font-bold text-text-primary mb-1">Stundenplan scannen</h2>
          <p className="text-text-muted text-sm mb-8">Foto oder PDF — KI erkennt Fächer und Zeiten automatisch</p>

          {/* IDLE — upload area */}
          {scanPhase === 'idle' && (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-border rounded-card p-8 flex flex-col items-center gap-3 hover:border-accent/50 hover:bg-accent/5 transition-all"
            >
              <div className="w-16 h-16 rounded-card btn-mode flex items-center justify-center"><Icon name="camera" size={28} /></div>
              <div className="text-center">
                <p className="text-text-primary font-semibold text-base">Foto oder PDF auswählen</p>
                <p className="text-text-muted text-sm mt-1">JPG, PNG oder PDF</p>
              </div>
            </button>
          )}

          {/* ANALYZING — spinner */}
          {scanPhase === 'analyzing' && (
            <div className="bg-surface border border-border rounded-card p-6 flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-[3px] border-accent/25 border-t-accent rounded-full animate-spin" />
              <div className="text-center">
                <p className="text-text-primary font-semibold text-[15px]">KI analysiert Stundenplan…</p>
                <p className="text-text-muted text-[13px] mt-1 truncate max-w-[220px]">{scanFile?.name}</p>
              </div>
            </div>
          )}

          {/* ERROR */}
          {scanPhase === 'error' && (
            <div className="space-y-3">
              <div className="rounded-card p-5" style={{ background: 'rgb(var(--color-danger) / 0.08)', border: '1px solid rgb(var(--color-danger) / 0.25)' }}>
                <p className="text-text-primary font-semibold text-[15px] mb-1">Erkennung fehlgeschlagen</p>
                <p className="text-text-muted text-[13px] leading-relaxed">{scanError}</p>
              </div>
              <button
                onClick={() => { setScanPhase('idle'); setScanFile(null); setScanError('') }}
                className="w-full h-12 rounded-pill btn-mode text-[15px] font-semibold hover:opacity-90 active:scale-95 transition-all"
              >
                Erneut versuchen
              </button>
              <button
                onClick={() => { setMode('manual'); setScanPhase('idle'); setScanError('') }}
                className="w-full h-12 rounded-pill border border-border text-text-secondary text-[15px] font-medium hover:bg-surface-hover transition-colors"
              >
                Manuell eintragen
              </button>
            </div>
          )}

          {/* MISMATCH — AI found subjects not in user's faecher selection */}
          {scanPhase === 'mismatch' && mismatchData && (
            <div className="space-y-3">
              <div className="rounded-card p-5 space-y-3" style={{ background: 'rgba(255,149,0,0.08)', border: '1px solid rgba(255,149,0,0.25)' }}>
                <div className="flex items-center gap-2">
                  <span className="text-text-secondary"><Icon name="search" size={19} /></span>
                  <p className="text-text-primary font-semibold text-[15px]">Neue Fächer erkannt</p>
                </div>
                <p className="text-text-muted text-[13px] leading-relaxed">
                  Auf deinem Stundenplan wurden Fächer gefunden, die nicht in deiner Auswahl sind:
                </p>
                <div className="flex flex-wrap gap-2">
                  {mismatchData.additionalSubjectIds.map((id) => {
                    const subj = SUBJECT_INFO[id]
                    return (
                      <div
                        key={id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill"
                        style={{ background: `${subj?.color ?? '#7C3AED'}22`, border: `1px solid ${subj?.color ?? '#7C3AED'}40` }}
                      >
                        <SubjectIcon subjectId={id} size="sm" className="!w-5 !h-5" />
                        <span className="text-[13px] font-semibold" style={{ color: subj?.color ?? '#7C3AED' }}>
                          {subj?.name ?? id}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
              <button
                onClick={() => {
                  onUpdateFaecher(mismatchData.additionalSubjectIds)
                  setSlots(mismatchData.slots)
                  setFromAI(true)
                  setMode('manual')
                  setScanPhase('idle')
                  setMismatchData(null)
                }}
                className="w-full h-12 rounded-pill btn-mode text-[15px] font-semibold hover:opacity-90 active:scale-95 transition-all"
              >
                Fächer hinzufügen &amp; Stundenplan übernehmen
              </button>
              <button
                onClick={() => {
                  const faecherSet = new Set(faecher)
                  setSlots(mismatchData.slots.filter((s) => faecherSet.has(s.subjectId)))
                  setFromAI(true)
                  setMode('manual')
                  setScanPhase('idle')
                  setMismatchData(null)
                }}
                className="w-full h-12 rounded-pill border border-border text-text-secondary text-[15px] font-medium hover:bg-surface-hover transition-colors"
              >
                Nur meine Fächer verwenden
              </button>
            </div>
          )}
        </div>

        {scanPhase !== 'analyzing' && scanPhase !== 'error' && scanPhase !== 'mismatch' && (
          <div className="pt-6 space-y-2">
            <button
              onClick={onNext}
              className="w-full py-3 text-sm text-text-muted hover:text-text-secondary transition-colors"
            >
              Jetzt überspringen
            </button>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,image/*,application/pdf"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleScanFileSelect(f) }}
        />
      </div>
    )
  }

  // ── MANUAL MODE ─────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-[calc(100dvh-80px)]">
      <div className="flex-1">
        <button
          onClick={() => { setMode('choose'); setAddingSlot(false); setFromAI(false) }}
          className="flex items-center gap-1.5 text-text-primary text-sm font-medium mb-6 hover:opacity-80 transition-opacity"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Zurück
        </button>

        {fromAI && totalSlots > 0 && (
          <div className="mb-5 rounded-icon px-4 py-3 flex items-center gap-2.5" style={{ background: 'rgb(var(--color-success) / 0.08)', border: '1px solid rgb(var(--color-success) / 0.25)' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-text-primary shrink-0">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-[13px] font-medium text-text-primary">
              {totalSlots} Stunden erkannt — prüfen & anpassen
            </p>
          </div>
        )}

        <h2 className="text-2xl font-bold text-text-primary mb-1">Stundenplan eintragen</h2>
        <p className="text-text-muted text-sm mb-5">
          {totalSlots > 0
            ? `${totalSlots} Stunde${totalSlots === 1 ? '' : 'n'} eingetragen`
            : 'Wähle einen Tag und trage deine Stunden ein.'}
        </p>

        {/* Day tabs */}
        <div className="flex gap-1.5 mb-5">
          {DAY_SHORT.map((d, i) => {
            const count = slots.filter((s) => s.day === i).length
            return (
              <button
                key={d}
                onClick={() => { setActiveDay(i); setAddingSlot(false) }}
                className={`flex-1 flex flex-col items-center py-2.5 rounded-icon transition-all duration-200 ${
                  activeDay === i ? 'bg-accent' : 'bg-surface border border-border hover:bg-surface-hover'
                }`}
              >
                <span className={`text-[11px] font-semibold ${activeDay === i ? 'text-white/80' : 'text-text-muted'}`}>{d}</span>
                <span className={`text-[13px] font-bold mt-0.5 ${activeDay === i ? 'text-white' : count > 0 ? 'text-text-primary' : 'text-text-muted/30'}`}>
                  {count > 0 ? count : '·'}
                </span>
              </button>
            )
          })}
        </div>

        {/* Slot list */}
        <div className="space-y-2 mb-3">
          {daySlots.map((slot) => {
            const subj = SUBJECT_INFO[slot.subjectId]
            const name = slot.isFreistunde ? 'Freistunde' : (subj?.name ?? slot.subjectId)
            const iconBg = slot.isFreistunde ? 'rgba(148,163,184,0.18)' : `${subj?.color ?? '#7C3AED'}22`
            return (
              <div key={slot.id} className="bg-surface border border-border/60 rounded-card p-3.5 flex items-center gap-3 animate-fade-in">
                {slot.isFreistunde ? (
                  <div
                    className="w-9 h-9 rounded-btn flex items-center justify-center shrink-0 text-text-secondary"
                    style={{ backgroundColor: iconBg }}
                  >
                    <Icon name="coffee" size={17} />
                  </div>
                ) : (
                  <SubjectIcon subjectId={slot.subjectId} size="sm" className="!w-9 !h-9" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary font-semibold text-[14px]">{name}</p>
                  <p className="text-text-muted text-[12px]">
                    {slot.startTime} – {slot.endTime}
                    {slot.room ? ` · ${slot.room}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => removeSlot(slot.id)}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-danger/10 transition-colors shrink-0 press-sm"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            )
          })}
        </div>

        {/* Add slot trigger or inline form */}
        {!addingSlot ? (
          <button
            onClick={() => setAddingSlot(true)}
            className="w-full border border-dashed border-border rounded-card py-3.5 flex items-center justify-center gap-2 text-text-muted hover:border-accent/50 hover:text-text-primary hover:bg-accent/5 transition-all duration-200"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            <span className="text-[13px] font-medium">Stunde hinzufügen</span>
          </button>
        ) : (
          <div className="bg-surface border border-accent/30 rounded-card p-4 space-y-3">
            {/* Time row */}
            <div className="flex gap-2">
              <div className="flex-1">
                <p className="section-label mb-1.5">Von</p>
                <input
                  type="time"
                  value={newSlot.startTime}
                  onChange={(e) => handleStartTime(e.target.value)}
                  className="w-full bg-background border border-border rounded-card px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent transition-colors"
                />
              </div>
              <div className="flex-1">
                <p className="section-label mb-1.5">Bis</p>
                <input
                  type="time"
                  value={newSlot.endTime}
                  onChange={(e) => setNewSlot((n) => ({ ...n, endTime: e.target.value }))}
                  className="w-full bg-background border border-border rounded-card px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>

            {/* Subject picker */}
            <p className="section-label">Fach</p>
            <div className="grid grid-cols-3 gap-1.5">
              {profileSubjects.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setNewSlot((n) => ({ ...n, subjectId: s.id, isFreistunde: false }))}
                  className={`flex items-center gap-2 p-2.5 rounded-card border text-left transition-all duration-150 ${
                    !newSlot.isFreistunde && newSlot.subjectId === s.id
                      ? 'border-accent bg-accent-soft'
                      : 'border-border bg-background hover:bg-surface-hover'
                  }`}
                >
                  <SubjectIcon subjectId={s.id} size="sm" className="!w-5 !h-5" />
                  <span className={`text-[11px] font-medium leading-tight truncate ${!newSlot.isFreistunde && newSlot.subjectId === s.id ? 'text-text-primary' : 'text-text-secondary'}`}>
                    {s.name}
                  </span>
                </button>
              ))}
              <button
                onClick={() => setNewSlot((n) => ({ ...n, subjectId: '', isFreistunde: true }))}
                className={`flex items-center gap-2 p-2.5 rounded-card border border-dashed text-left transition-all duration-150 ${
                  newSlot.isFreistunde
                    ? 'border-accent bg-accent-soft'
                    : 'border-border bg-background hover:bg-surface-hover'
                }`}
              >
                <span className="shrink-0 text-text-secondary"><Icon name="coffee" size={15} /></span>
                <span className={`text-[11px] font-medium leading-tight truncate ${newSlot.isFreistunde ? 'text-text-primary' : 'text-text-secondary'}`}>
                  Freistunde
                </span>
              </button>
            </div>

            {/* Room optional */}
            {!newSlot.isFreistunde && (
              <input
                type="text"
                value={newSlot.room}
                onChange={(e) => setNewSlot((n) => ({ ...n, room: e.target.value }))}
                placeholder="Raum (optional, z.B. A204)"
                className="w-full bg-background border border-border rounded-card px-3 py-2.5 text-text-primary text-sm placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
              />
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => {
                  setAddingSlot(false)
                  setNewSlot({ startTime: '08:00', endTime: '08:45', subjectId: '', room: '', isFreistunde: false })
                }}
                className="flex-1 py-2.5 rounded-card border border-border text-text-secondary text-sm font-medium hover:bg-surface-hover transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={commitSlot}
                disabled={!newSlot.subjectId && !newSlot.isFreistunde}
                className="flex-1 py-2.5 rounded-card btn-mode text-sm font-semibold disabled:opacity-40 active:scale-95 transition-all"
              >
                Hinzufügen
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="pt-6 space-y-2">
        <Button variant="primary" fullWidth onClick={onNext}>
          {totalSlots > 0 ? `Fertig · ${totalSlots} Stunde${totalSlots === 1 ? '' : 'n'}` : 'Weiter'}
        </Button>
        {totalSlots === 0 && (
          <button
            onClick={onNext}
            className="w-full py-2 text-sm text-text-muted hover:text-text-secondary transition-colors"
          >
            Jetzt überspringen
          </button>
        )}
      </div>
    </div>
  )
}

/* ─── Step 8: Erste Klausur ───────────────────────────────── */

function StepKlausur({
  faecher,
  customFaecher,
  subject, setSubject,
  date, setDate,
  topic, setTopic,
}: {
  faecher: string[]
  customFaecher: CustomFach[]
  subject: string; setSubject: (v: string) => void
  date: string; setDate: (v: string) => void
  topic: string; setTopic: (v: string) => void
}) {
  const available = faecher.map((id) => ({ id, ...resolveSubjectInfo(id, customFaecher) }))
  const subjectTopics = subject
    ? topics.filter((t) => t.subjectId === subject).map((t) => t.name)
    : []

  return (
    <div>
      <h2 className="text-2xl font-bold text-text-primary mb-1">Wann ist deine nächste Klausur?</h2>
      <p className="text-text-muted text-sm mb-8">
        Wir erstellen direkt einen Countdown und Lernvorschläge für dich.
      </p>

      <p className="section-label mb-3">Fach</p>
      <div className="flex flex-col gap-2 mb-6">
        {available.map((s) => (
          <button
            key={s.id}
            onClick={() => setSubject(s.id)}
            className={`flex items-center gap-3 py-3 px-4 rounded-card border text-left transition-all duration-150 ${
              subject === s.id
                ? 'bg-accent border-transparent text-white'
                : 'bg-surface border-border text-text-secondary hover:bg-surface-hover'
            }`}
          >
            <SubjectIcon subjectId={s.id} size="sm" />
            <span className="font-medium text-sm">{s.name}</span>
          </button>
        ))}
      </div>

      {subject && (
        <>
          <p className="section-label mb-3">Datum</p>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            min={new Date().toISOString().slice(0, 10)}
            className="w-full bg-surface border border-border rounded-card px-4 py-3.5 text-text-primary text-sm focus:outline-none focus:border-accent transition-colors mb-6"
          />

          <p className="section-label mb-3">Thema (optional)</p>
          {subjectTopics.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {subjectTopics.slice(0, 6).map((t) => (
                <button
                  key={t}
                  onClick={() => setTopic(topic === t ? '' : t)}
                  className="px-3 py-1.5 rounded-pill text-[12px] font-medium transition-all press-sm"
                  style={topic === t ? { background: 'rgb(var(--color-accent))', color: 'white' } : { background: 'rgb(var(--color-border) / 0.5)', color: 'rgb(var(--color-text-secondary))' }}
                >
                  {t.length > 30 ? t.slice(0, 30) + '…' : t}
                </button>
              ))}
            </div>
          )}
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={`${getTopicPlaceholder(subject)} (optional)`}
            className="w-full bg-surface border border-border rounded-card px-4 py-3.5 text-text-primary text-sm placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
          />
        </>
      )}
    </div>
  )
}
