import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { useUser, generateKcFolders } from '../context/UserContext'
import { type UserProfile } from '../context/UserContext'
import { analyzeFileToSmartNote, suggestImportDestination, GEMINI_BATCH_DELAY_MS } from '../lib/gemini'
import type { UserNote, StundenplanSlot } from '../types'
import { SUBJECT_INFO, SUBJECT_GROUPS } from '../data/subjectInfo'
import { topics } from '../data/mockData'
import { parseStundenplanFromImage } from '../lib/groq'

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

const SCHULFORMEN = ['Gymnasium', 'Gesamtschule', 'FOS', 'Universität']

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

const DEV_PROFILE: UserProfile = {
  name: 'Simon Happ',
  klasse: '13',
  schulform: 'Gymnasium',
  bundesland: 'Niedersachsen',
  bundeslandId: 'ni',
  faecher: ['deutsch', 'mathematik', 'englisch', 'biologie', 'physik', 'politik', 'religion', 'sport'],
  lkFaecher: ['mathematik', 'biologie'],
  klausurtermine: [{ subjectId: 'mathematik', date: '2026-06-06' }],
  folderSortMode: 'halbjahr',
  schultyp: 'g9',
  isDevMode: true,
  stundenplan: {
    createdAt: new Date().toISOString(),
    slots: [
      // Montag
      { id: 'dev-s01', day: 0, startTime: '07:45', endTime: '08:30', subjectId: 'physik' },
      { id: 'dev-s02', day: 0, startTime: '11:30', endTime: '12:15', subjectId: 'englisch' },
      { id: 'dev-s03', day: 0, startTime: '12:20', endTime: '13:05', subjectId: 'englisch' },
      { id: 'dev-s04', day: 0, startTime: '13:50', endTime: '14:35', subjectId: 'religion' },
      { id: 'dev-s05', day: 0, startTime: '14:35', endTime: '15:20', subjectId: 'religion' },
      // Dienstag
      { id: 'dev-s06', day: 1, startTime: '08:35', endTime: '09:20', subjectId: 'mathematik' },
      // Mittwoch
      { id: 'dev-s07', day: 2, startTime: '07:45', endTime: '08:30', subjectId: 'mathematik' },
      { id: 'dev-s08', day: 2, startTime: '08:35', endTime: '09:20', subjectId: 'mathematik' },
      { id: 'dev-s09', day: 2, startTime: '09:40', endTime: '10:25', subjectId: 'biologie' },
      { id: 'dev-s10', day: 2, startTime: '10:25', endTime: '11:10', subjectId: 'biologie' },
      { id: 'dev-s11', day: 2, startTime: '11:30', endTime: '12:15', subjectId: 'englisch' },
      { id: 'dev-s12', day: 2, startTime: '12:20', endTime: '13:05', subjectId: 'politik' },
      { id: 'dev-s13', day: 2, startTime: '13:50', endTime: '14:35', subjectId: 'deutsch' },
      { id: 'dev-s14', day: 2, startTime: '14:35', endTime: '15:20', subjectId: 'deutsch' },
      // Donnerstag
      { id: 'dev-s15', day: 3, startTime: '07:45', endTime: '08:30', subjectId: 'politik' },
      { id: 'dev-s16', day: 3, startTime: '08:35', endTime: '09:20', subjectId: 'politik' },
      { id: 'dev-s17', day: 3, startTime: '09:40', endTime: '10:25', subjectId: 'biologie' },
      { id: 'dev-s18', day: 3, startTime: '10:25', endTime: '11:10', subjectId: 'biologie' },
      { id: 'dev-s19', day: 3, startTime: '11:30', endTime: '12:15', subjectId: 'religion' },
      { id: 'dev-s20', day: 3, startTime: '12:20', endTime: '13:05', subjectId: 'deutsch' },
      { id: 'dev-s21', day: 3, startTime: '13:50', endTime: '14:35', subjectId: 'physik' },
      { id: 'dev-s22', day: 3, startTime: '14:35', endTime: '15:20', subjectId: 'physik' },
      // Freitag
      { id: 'dev-s23', day: 4, startTime: '07:45', endTime: '08:30', subjectId: 'englisch' },
      { id: 'dev-s24', day: 4, startTime: '08:35', endTime: '09:20', subjectId: 'englisch' },
      { id: 'dev-s25', day: 4, startTime: '09:40', endTime: '10:25', subjectId: 'mathematik' },
      { id: 'dev-s26', day: 4, startTime: '10:25', endTime: '11:10', subjectId: 'mathematik' },
      { id: 'dev-s27', day: 4, startTime: '11:30', endTime: '12:15', subjectId: 'biologie' },
      { id: 'dev-s28', day: 4, startTime: '13:50', endTime: '14:35', subjectId: 'sport' },
      { id: 'dev-s29', day: 4, startTime: '14:35', endTime: '15:20', subjectId: 'sport' },
    ],
  },
}

export function OnboardingScreen() {
  const { completeOnboarding } = useUser()
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>(1)
  const [finishing, setFinishing] = useState(false)

  const [name, setName] = useState('')
  const [klasse, setKlasse] = useState('')
  const [schulform, setSchulform] = useState('')
  const [schultyp, setSchultyp] = useState<'g8' | 'g9' | ''>('')
  const [zielnote, setZielnote] = useState('')
  const [bundeslandId, setBundeslandId] = useState('')
  const [faecher, setFaecher] = useState<string[]>([])
  const [lkFaecher, setLkFaecher] = useState<string[]>([])
  const [folderSortMode, setFolderSortMode] = useState<'manual' | 'halbjahr' | 'themen'>('halbjahr')
  const [stundenplanSlots, setStundenplanSlots] = useState<StundenplanSlot[]>([])
  const [klausurSubject, setKlausurSubject] = useState('')
  const [klausurDate, setKlausurDate] = useState('')
  const [klausurTopic, setKlausurTopic] = useState('')

  const progress = (step / 9) * 100

  const isOberstufe = schulform !== 'Universität' && schultyp !== '' && (
    schultyp === 'g8' ? parseInt(klasse) >= 11 : parseInt(klasse) >= 12
  )

  const canNext: Record<Step, boolean> = {
    1: true,
    2: name.trim().length > 0 && klasse !== '' && schulform !== '' && (schultyp !== '' || schulform === 'Universität'),
    3: true,
    4: bundeslandId !== '',
    5: faecher.length > 0,
    6: true, // FolderSort — always valid
    7: true, // Stundenplan optional — manages own footer
    8: true, // DateiImport manages own footer
    9: true, // Klausur optional
  }

  const next = () => {
    if (step < 9) setStep((s) => (s + 1) as Step)
  }

  const back = () => {
    if (step > 1) setStep((s) => (s - 1) as Step)
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
    const profile: UserProfile = {
      name: name.trim(),
      klasse,
      schulform,
      bundesland: bl?.name ?? bundeslandId,
      bundeslandId,
      faecher,
      klausurtermine:
        klausurSubject && klausurDate
          ? [{ subjectId: klausurSubject, date: klausurDate, topic: klausurTopic || undefined }]
          : [],
      zielnote: zielnote || undefined,
      folderSortMode,
      schultyp: (schultyp || undefined) as 'g8' | 'g9' | undefined,
      lkFaecher: lkFaecher.length > 0 ? lkFaecher : undefined,
      stundenplan: stundenplanSlots.length > 0
        ? { slots: stundenplanSlots, createdAt: new Date().toISOString() }
        : undefined,
    }
    setTimeout(() => { completeOnboarding(profile); navigate('/unterricht') }, 800)
  }

  if (finishing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4">
        <div className="w-12 h-12 rounded-btn bg-accent-soft flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent">
            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-text-primary font-semibold text-lg">Deine App wird vorbereitet…</p>
        <p className="text-text-muted text-sm">{BUNDESLAENDER.find(b => b.id === bundeslandId)?.name} · Lehrplan wird geladen</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-background max-w-lg mx-auto">
      {/* Progress bar */}
      {step > 1 && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-border z-10 max-w-lg mx-auto">
          <div
            className="h-full grad-accent transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Back button */}
      {step > 1 && (
        <button
          onClick={back}
          className="absolute top-12 left-4 w-9 h-9 flex items-center justify-center rounded-btn text-text-secondary hover:bg-surface-hover transition-colors z-10"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}

      {/* Step content */}
      <div className="flex-1 px-6 pt-20 pb-10">
        {step === 1 && <StepWelcome onNext={next} onSkip={() => { completeOnboarding(DEV_PROFILE, generateKcFolders(DEV_PROFILE)); navigate('/unterricht') }} />}
        {step === 2 && (
          <StepPersonal
            name={name} setName={setName}
            klasse={klasse} setKlasse={setKlasse}
            schulform={schulform} setSchulform={setSchulform}
            schultyp={schultyp} setSchultyp={(v) => setSchultyp(v)}
          />
        )}
        {step === 3 && (
          <StepZielnote zielnote={zielnote} setZielnote={setZielnote} />
        )}
        {step === 4 && (
          <StepBundesland selected={bundeslandId} onSelect={setBundeslandId} />
        )}
        {step === 5 && (
          <StepFaecher selected={faecher} onToggle={toggleFach} lkFaecher={lkFaecher} onToggleLK={toggleLK} isOberstufe={isOberstufe} />
        )}
        {step === 6 && (
          <StepFolderSort sortMode={folderSortMode} setSortMode={setFolderSortMode} klasse={klasse} schultyp={schultyp} />
        )}
        {step === 7 && (
          <StepStundenplan
            faecher={faecher}
            slots={stundenplanSlots}
            setSlots={setStundenplanSlots}
            onNext={next}
            onUpdateFaecher={(ids) => setFaecher((prev) => [...prev, ...ids.filter((id) => !prev.includes(id))])}
          />
        )}
        {step === 8 && (
          <StepDateiImport onNext={next} faecher={faecher} />
        )}
        {step === 9 && (
          <StepKlausur
            faecher={faecher}
            subject={klausurSubject} setSubject={setKlausurSubject}
            date={klausurDate} setDate={setKlausurDate}
            topic={klausurTopic} setTopic={setKlausurTopic}
          />
        )}
      </div>

      {/* Footer CTA — steps 7 (Stundenplan) and 8 (DateiImport) manage their own footer */}
      {step > 1 && step !== 7 && step !== 8 && (
        <div className="px-6 pb-10 pt-4">
          {step < 9 ? (
            <Button variant="primary" fullWidth onClick={next} disabled={!canNext[step]}>
              Weiter
            </Button>
          ) : (
            <div className="space-y-3">
              <Button variant="primary" fullWidth onClick={finish}>
                Loslegen 🚀
              </Button>
              {!(klausurSubject && klausurDate) && (
                <button
                  onClick={finish}
                  className="w-full text-center text-sm text-text-muted hover:text-text-secondary transition-colors py-2"
                >
                  Überspringen
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Step 1: Welcome ─────────────────────────────────────── */

function StepWelcome({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  return (
    <div className="flex flex-col justify-between min-h-[calc(100vh-80px)]">
      <div className="flex-1 flex flex-col justify-center">
        <div className="w-16 h-16 rounded-2xl bg-accent-soft flex items-center justify-center text-3xl mb-8">
          🎓
        </div>
        <h1 className="text-4xl font-bold text-text-primary leading-tight mb-4">
          Smarter lernen.<br />
          <span className="text-accent">Besser abschneiden.</span>
        </h1>
        <p className="text-text-secondary text-lg leading-relaxed mb-10">
          Die KI, die deinen echten Unterricht kennt — personalisiert auf deinen Lehrplan.
        </p>

        <div className="space-y-4 mb-12">
          {[
            { icon: '📸', text: 'Tafelbilder scannen → fertige Lernnotiz in Sekunden' },
            { icon: '📝', text: 'Probeklausuren genau wie im Unterricht (AFB I–III)' },
            { icon: '🎯', text: 'KI-Feedback wie vom Lehrer — mit Erwartungshorizont' },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="text-xl shrink-0">{item.icon}</span>
              <p className="text-text-secondary text-sm leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Button variant="primary" fullWidth size="lg" onClick={onNext}>
          Los geht's
        </Button>
        <button
          onClick={onSkip}
          className="w-full py-2 text-xs text-text-muted hover:text-text-secondary transition-colors"
        >
          Dev: Mit Demo-Profil überspringen
        </button>
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
            ? 'linear-gradient(180deg, rgba(var(--color-accent), 0.08) 0%, transparent 100%)'
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
                className="absolute -translate-x-1/2 text-[10px] font-semibold text-text-muted"
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
}: {
  name: string; setName: (v: string) => void
  klasse: string; setKlasse: (v: string) => void
  schulform: string; setSchulform: (v: string) => void
  schultyp: 'g8' | 'g9' | ''; setSchultyp: (v: 'g8' | 'g9') => void
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

  return (
    <div>
      <h2 className="text-2xl font-bold text-text-primary mb-1">Hallo! Wie heißt du?</h2>
      <p className="text-text-muted text-sm mb-8">Dein Name personalisiert die App für dich.</p>

      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Dein Vorname"
        autoFocus
        className="w-full bg-surface border border-border rounded-card px-4 py-4 text-text-primary text-lg placeholder-text-muted mb-8 focus:outline-none focus:border-accent transition-colors"
      />

      {/* G8 / G9 */}
      <p className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
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
                ? 'grad-accent border-transparent'
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
          <p className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Klasse</p>

          {/* Mittelstufe collapsible */}
          <div className="mb-2">
            <button
              onClick={() => { setShowMittelstufePicker(true); if (!mittelstufeSelected) setKlasse('') }}
              className={`w-full py-3.5 px-4 rounded-card border text-left transition-all duration-150 ${
                mittelstufeSelected
                  ? 'grad-accent border-transparent'
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
                        ? 'grad-accent border-transparent text-white'
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
                      ? 'grad-accent border-transparent'
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
      <p className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Schulform</p>
      <div className="grid grid-cols-2 gap-2">
        {SCHULFORMEN.map((sf) => (
          <button
            key={sf}
            onClick={() => {
              setSchulform(sf)
              if (sf === 'Universität') {
                setSchultyp('g9')
                setKlasse('13')
                setShowMittelstufePicker(false)
              }
            }}
            className={`py-3 rounded-card text-sm font-medium border transition-all duration-150 ${
              schulform === sf
                ? 'grad-accent border-transparent text-white'
                : 'bg-surface border-border text-text-secondary hover:bg-surface-hover'
            }`}
          >
            {sf}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ─── Step 3: Zielnote ────────────────────────────────────── */

function StepZielnote({ zielnote, setZielnote }: { zielnote: string; setZielnote: (v: string) => void }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-text-primary mb-1">Was ist dein Abi-Ziel?</h2>
      <p className="text-text-muted text-sm mb-8">
        Optional — die KI passt deinen Lernplan auf deine Zielnote an.
      </p>
      <GradeSlider value={zielnote} onChange={setZielnote} />
    </div>
  )
}

/* ─── Step 4: Bundesland ──────────────────────────────────── */

function StepBundesland({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-text-primary mb-1">Wo gehst du zur Schule?</h2>
      <p className="text-text-muted text-sm mb-6">Wir laden deinen Lehrplan automatisch.</p>

      <div className="grid grid-cols-2 gap-2">
        {BUNDESLAENDER.map((bl) => (
          <button
            key={bl.id}
            onClick={() => onSelect(bl.id)}
            className={`py-3 px-3 rounded-card text-sm font-medium border text-left transition-all duration-150 ${
              selected === bl.id
                ? 'grad-accent border-transparent text-white'
                : 'bg-surface border-border text-text-secondary hover:bg-surface-hover'
            }`}
          >
            {bl.name}
          </button>
        ))}
      </div>

      {selected && (
        <div className="mt-5 flex items-center gap-2 text-success text-sm">
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

function StepFaecher({
  selected,
  onToggle,
  lkFaecher,
  onToggleLK,
  isOberstufe,
}: {
  selected: string[]
  onToggle: (id: string) => void
  lkFaecher: string[]
  onToggleLK: (id: string) => void
  isOberstufe: boolean
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-text-primary mb-1">Deine Fächer</h2>
      <p className="text-text-muted text-sm mb-1">
        Wähle alle Fächer, die du lernst. <span className="text-accent font-medium">{selected.length} ausgewählt</span>
      </p>
      {isOberstufe && (
        <p className="text-[11px] text-text-muted mb-4">Tippe auf <span className="font-bold text-accent">LK</span> um Leistungskurse zu markieren.</p>
      )}
      {!isOberstufe && <div className="mb-5" />}

      <div className="space-y-5">
        {SUBJECT_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
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
                    <div
                      className="w-8 h-8 rounded-btn flex items-center justify-center text-lg shrink-0"
                      style={{ backgroundColor: `${subject.color}22` }}
                    >
                      {subject.icon}
                    </div>
                    <p className={`text-xs font-semibold leading-tight flex-1 min-w-0 ${active ? 'text-text-primary' : 'text-text-secondary'}`}>
                      {subject.name}
                    </p>
                    {active && isOberstufe ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); onToggleLK(id) }}
                        className={`absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-black tracking-wide transition-all ${
                          isLK
                            ? 'bg-accent text-white'
                            : 'bg-accent/15 text-accent border border-accent/30'
                        }`}
                      >
                        LK
                      </button>
                    ) : active ? (
                      <div className="absolute top-2 right-2 w-4 h-4 rounded-full grad-accent flex items-center justify-center shrink-0">
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
    </div>
  )
}

/* ─── Step 6: FolderSort ──────────────────────────────────── */

function StepFolderSort({
  sortMode,
  setSortMode,
  klasse,
  schultyp,
}: {
  sortMode: 'manual' | 'halbjahr' | 'themen'
  setSortMode: (v: 'manual' | 'halbjahr' | 'themen') => void
  klasse: string
  schultyp?: 'g8' | 'g9' | ''
}) {
  const isQPhase = schultyp === 'g8' ? parseInt(klasse) >= 11 : parseInt(klasse) >= 12

  const options: { id: 'manual' | 'halbjahr' | 'themen'; icon: string; title: string; desc: string; comingSoon?: boolean }[] = [
    {
      id: 'halbjahr',
      icon: '📅',
      title: isQPhase ? 'Nach Quartal' : 'Nach Halbjahr',
      desc: isQPhase
        ? 'Ordner werden automatisch nach Q1, Q2, Q3 und Q4 sortiert'
        : 'Ordner werden automatisch nach 1. und 2. Halbjahr erstellt',
    },
    {
      id: 'manual',
      icon: '✋',
      title: 'Manuell',
      desc: 'Du erstellst und benennst Ordner selbst — maximale Kontrolle',
    },
    {
      id: 'themen',
      icon: '📚',
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
              className={`w-full flex items-start gap-4 p-4 rounded-[20px] border text-left transition-all duration-150 ${
                active
                  ? 'grad-accent border-transparent'
                  : opt.comingSoon
                  ? 'bg-surface border-border/40 opacity-55 cursor-not-allowed'
                  : 'bg-surface border-border hover:bg-surface-hover active:scale-[0.98]'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${active ? 'bg-white/20' : 'bg-accent/10'}`}>
                {opt.icon}
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`font-semibold text-[15px] ${active ? 'text-white' : 'text-text-primary'}`}>
                    {opt.title}
                  </p>
                  {opt.comingSoon && (
                    <span className="px-2 py-0.5 rounded-pill text-[10px] font-bold bg-border/80 text-text-muted">
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
  slots,
  setSlots,
  onNext,
  onUpdateFaecher,
}: {
  faecher: string[]
  slots: StundenplanSlot[]
  setSlots: (s: StundenplanSlot[]) => void
  onNext: () => void
  onUpdateFaecher: (additionalIds: string[]) => void
}) {
  const [mode, setMode] = useState<StundenplanMode>('choose')
  const [activeDay, setActiveDay] = useState(0)
  const [addingSlot, setAddingSlot] = useState(false)
  const [newSlot, setNewSlot] = useState({ startTime: '08:00', endTime: '08:45', subjectId: '', room: '' })
  const fileRef = useRef<HTMLInputElement>(null)
  const [scanFile, setScanFile] = useState<File | null>(null)
  const [scanPhase, setScanPhase] = useState<ScanPhase>('idle')
  const [scanError, setScanError] = useState('')
  const [fromAI, setFromAI] = useState(false)
  const [mismatchData, setMismatchData] = useState<{ slots: StundenplanSlot[]; additionalSubjectIds: string[] } | null>(null)

  const profileSubjects = faecher
    .map((id) => (SUBJECT_INFO[id] ? { id, ...SUBJECT_INFO[id] } : null))
    .filter((s): s is { id: string; name: string; icon: string; color: string } => s !== null)

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
    if (!newSlot.subjectId) return
    const slot: StundenplanSlot = {
      id: `slot-${Date.now()}`,
      day: activeDay,
      startTime: newSlot.startTime,
      endTime: newSlot.endTime,
      subjectId: newSlot.subjectId,
      room: newSlot.room || undefined,
    }
    setSlots([...slots, slot])
    setAddingSlot(false)
    setNewSlot({ startTime: '08:00', endTime: '08:45', subjectId: '', room: '' })
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
      <div className="flex flex-col min-h-[calc(100vh-80px)]">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-text-primary mb-1">Dein Stundenplan</h2>
          <p className="text-text-muted text-sm mb-8">
            Optional — hilft der App, deinen Schultag zu strukturieren und dich besser zu begleiten.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => setMode('manual')}
              className="w-full flex items-center gap-4 bg-surface border border-border rounded-[20px] p-5 text-left hover:bg-surface-hover active:scale-[0.98] transition-all duration-150"
            >
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-2xl shrink-0">✏️</div>
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
              className="w-full flex items-center gap-4 bg-surface border border-border rounded-[20px] p-5 text-left hover:bg-surface-hover active:scale-[0.98] transition-all duration-150"
            >
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-2xl shrink-0">📷</div>
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
      <div className="flex flex-col min-h-[calc(100vh-80px)]">
        <div className="flex-1">
          <button
            onClick={() => { setMode('choose'); setScanPhase('idle'); setScanError(''); setScanFile(null) }}
            className="flex items-center gap-1.5 text-text-muted text-sm mb-6 hover:text-text-secondary transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Zurück
          </button>
          <h2 className="text-2xl font-bold text-text-primary mb-1">Stundenplan scannen</h2>
          <p className="text-text-muted text-sm mb-8">Foto oder PDF — KI erkennt Fächer und Zeiten automatisch</p>

          {/* IDLE — upload area */}
          {scanPhase === 'idle' && (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-border rounded-[20px] p-8 flex flex-col items-center gap-3 hover:border-accent/50 hover:bg-accent/5 transition-all"
            >
              <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center text-3xl">📷</div>
              <div className="text-center">
                <p className="text-text-primary font-semibold text-base">Foto oder PDF auswählen</p>
                <p className="text-text-muted text-sm mt-1">JPG, PNG oder PDF</p>
              </div>
            </button>
          )}

          {/* ANALYZING — spinner */}
          {scanPhase === 'analyzing' && (
            <div className="bg-surface border border-border rounded-[20px] p-6 flex flex-col items-center gap-4">
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
              <div className="rounded-[20px] p-5" style={{ background: 'rgba(var(--color-danger),0.08)', border: '1px solid rgba(var(--color-danger),0.25)' }}>
                <p className="text-text-primary font-semibold text-[15px] mb-1">Erkennung fehlgeschlagen</p>
                <p className="text-text-muted text-[13px] leading-relaxed">{scanError}</p>
              </div>
              <button
                onClick={() => { setScanPhase('idle'); setScanFile(null); setScanError('') }}
                className="w-full py-3.5 rounded-[20px] grad-accent text-white text-[15px] font-semibold hover:opacity-90 active:scale-95 transition-all"
              >
                Erneut versuchen
              </button>
              <button
                onClick={() => { setMode('manual'); setScanPhase('idle'); setScanError('') }}
                className="w-full py-3 rounded-[20px] border border-border text-text-secondary text-[15px] font-medium hover:bg-surface-hover transition-colors"
              >
                Manuell eintragen
              </button>
            </div>
          )}

          {/* MISMATCH — AI found subjects not in user's faecher selection */}
          {scanPhase === 'mismatch' && mismatchData && (
            <div className="space-y-3">
              <div className="rounded-[20px] p-5 space-y-3" style={{ background: 'rgba(255,149,0,0.08)', border: '1px solid rgba(255,149,0,0.25)' }}>
                <div className="flex items-center gap-2">
                  <span className="text-xl">🔎</span>
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
                        <span className="text-sm">{subj?.icon ?? '📚'}</span>
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
                className="w-full py-3.5 rounded-[20px] grad-accent text-white text-[15px] font-semibold hover:opacity-90 active:scale-95 transition-all"
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
                className="w-full py-3 rounded-[20px] border border-border text-text-secondary text-[15px] font-medium hover:bg-surface-hover transition-colors"
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
    <div className="flex flex-col min-h-[calc(100vh-80px)]">
      <div className="flex-1">
        <button
          onClick={() => { setMode('choose'); setAddingSlot(false); setFromAI(false) }}
          className="flex items-center gap-1.5 text-text-muted text-sm mb-6 hover:text-text-secondary transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Zurück
        </button>

        {fromAI && totalSlots > 0 && (
          <div className="mb-5 rounded-[14px] px-4 py-3 flex items-center gap-2.5" style={{ background: 'rgba(var(--color-success),0.08)', border: '1px solid rgba(var(--color-success),0.25)' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-success shrink-0">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-[13px] font-medium text-success">
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
                className={`flex-1 flex flex-col items-center py-2.5 rounded-[14px] transition-all duration-200 ${
                  activeDay === i ? 'grad-accent' : 'bg-surface border border-border hover:bg-surface-hover'
                }`}
              >
                <span className={`text-[11px] font-semibold ${activeDay === i ? 'text-white/80' : 'text-text-muted'}`}>{d}</span>
                <span className={`text-[13px] font-bold mt-0.5 ${activeDay === i ? 'text-white' : count > 0 ? 'text-accent' : 'text-text-muted/30'}`}>
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
            return (
              <div key={slot.id} className="bg-surface border border-border/60 rounded-card p-3.5 flex items-center gap-3 animate-fade-in">
                <div
                  className="w-9 h-9 rounded-btn flex items-center justify-center text-lg shrink-0"
                  style={{ backgroundColor: `${subj?.color ?? '#7C3AED'}22` }}
                >
                  {subj?.icon ?? '📚'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary font-semibold text-[14px]">{subj?.name ?? slot.subjectId}</p>
                  <p className="text-text-muted text-[12px]">
                    {slot.startTime} – {slot.endTime}
                    {slot.room ? ` · ${slot.room}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => removeSlot(slot.id)}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-text-muted hover:text-danger hover:bg-danger/10 transition-colors shrink-0 press-sm"
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
            className="w-full border border-dashed border-border rounded-card py-3.5 flex items-center justify-center gap-2 text-text-muted hover:border-accent/50 hover:text-accent hover:bg-accent/5 transition-all duration-200"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            <span className="text-[13px] font-medium">Stunde hinzufügen</span>
          </button>
        ) : (
          <div className="bg-surface border border-accent/30 rounded-[20px] p-4 space-y-3">
            {/* Time row */}
            <div className="flex gap-2">
              <div className="flex-1">
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Von</p>
                <input
                  type="time"
                  value={newSlot.startTime}
                  onChange={(e) => handleStartTime(e.target.value)}
                  className="w-full bg-background border border-border rounded-card px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent transition-colors"
                />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Bis</p>
                <input
                  type="time"
                  value={newSlot.endTime}
                  onChange={(e) => setNewSlot((n) => ({ ...n, endTime: e.target.value }))}
                  className="w-full bg-background border border-border rounded-card px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>

            {/* Subject picker */}
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Fach</p>
            <div className="grid grid-cols-3 gap-1.5">
              {profileSubjects.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setNewSlot((n) => ({ ...n, subjectId: s.id }))}
                  className={`flex items-center gap-2 p-2.5 rounded-card border text-left transition-all duration-150 ${
                    newSlot.subjectId === s.id
                      ? 'border-accent bg-accent-soft'
                      : 'border-border bg-background hover:bg-surface-hover'
                  }`}
                >
                  <span className="text-base shrink-0">{s.icon}</span>
                  <span className={`text-[11px] font-medium leading-tight truncate ${newSlot.subjectId === s.id ? 'text-text-primary' : 'text-text-secondary'}`}>
                    {s.name}
                  </span>
                </button>
              ))}
            </div>

            {/* Room optional */}
            <input
              type="text"
              value={newSlot.room}
              onChange={(e) => setNewSlot((n) => ({ ...n, room: e.target.value }))}
              placeholder="Raum (optional, z.B. A204)"
              className="w-full bg-background border border-border rounded-card px-3 py-2.5 text-text-primary text-sm placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
            />

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => {
                  setAddingSlot(false)
                  setNewSlot({ startTime: '08:00', endTime: '08:45', subjectId: '', room: '' })
                }}
                className="flex-1 py-2.5 rounded-card border border-border text-text-secondary text-sm font-medium hover:bg-surface-hover transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={commitSlot}
                disabled={!newSlot.subjectId}
                className="flex-1 py-2.5 rounded-card grad-accent text-white text-sm font-semibold disabled:opacity-40 active:scale-95 transition-all"
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

/* ─── Step 8: Datei-Import ────────────────────────────────── */

type ImportPhase = 'idle' | 'suggesting' | 'suggested' | 'manual' | 'processing' | 'done'

function StepDateiImport({ onNext, faecher }: { onNext: () => void; faecher: string[] }) {
  const { saveNote, saveToOhneFachFolder, addFolder, userFolders } = useUser()
  const fileRef = useRef<HTMLInputElement>(null)
  const cancelRef = useRef(false)
  const suggestionAbortRef = useRef<AbortController | null>(null)

  const [phase, setPhase] = useState<ImportPhase>('idle')
  const [files, setFiles] = useState<File[]>([])
  const [suggestion, setSuggestion] = useState<{ subjectId: string; subjectName: string; reason: string } | null>(null)
  const [currentFile, setCurrentFile] = useState(0)
  const [succeeded, setSucceeded] = useState(0)
  const [failed, setFailed] = useState(0)

  const profileSubjects = faecher
    .map((id) => SUBJECT_INFO[id] ? { id, ...SUBJECT_INFO[id] } : null)
    .filter((s): s is { id: string; name: string; icon: string; color: string } => s !== null)

  const handleSelect = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    const selected = Array.from(fileList).slice(0, 5)
    setFiles(selected)

    if (selected.length === 1 && profileSubjects.length > 0) {
      setPhase('suggesting')
      const controller = new AbortController()
      suggestionAbortRef.current = controller
      void suggestImportDestination(selected[0], profileSubjects, [], controller.signal)
        .then((result) => {
          if (controller.signal.aborted) return
          setSuggestion(result ? { subjectId: result.subjectId, subjectName: result.subjectName, reason: result.reason } : null)
          setPhase('suggested')
        })
        .catch(() => {
          if (!controller.signal.aborted) setPhase('manual')
        })
    } else {
      setPhase('manual')
    }
  }

  const goManual = () => {
    if (phase === 'suggesting') suggestionAbortRef.current?.abort()
    setPhase('manual')
  }

  const startProcessing = async (subjectId: string) => {
    setPhase('processing')
    setCurrentFile(0)
    setSucceeded(0)
    setFailed(0)
    cancelRef.current = false

    let targetFolderId: string | undefined
    if (subjectId) {
      const importFolderId = `folder-import-${subjectId}`
      if (!userFolders.some((f) => f.id === importFolderId)) {
        addFolder({
          id: importFolderId,
          subjectId,
          name: 'Importiert',
          createdAt: new Date().toISOString(),
          isAutoGenerated: false,
        })
      }
      targetFolderId = importFolderId
    }

    const subjectName = profileSubjects.find((s) => s.id === subjectId)?.name ?? 'Allgemein'
    let succ = 0
    let fail = 0
    for (let i = 0; i < files.length; i++) {
      if (cancelRef.current) break
      setCurrentFile(i)
      try {
        const noteId = `import-onboarding-${Date.now()}-${i}`
        const { generated, noteTitle } = await analyzeFileToSmartNote(files[i], noteId, subjectName)
        const note: UserNote = {
          id: noteId,
          subjectId: subjectId || undefined,
          folderId: targetFolderId ?? 'folder-no-subject',
          title: noteTitle,
          content: generated.summary,
          createdAt: new Date().toISOString(),
        }
        if (subjectId) saveNote(note, generated)
        else saveToOhneFachFolder(note, generated)
        succ++
        setSucceeded(succ)
      } catch {
        fail++
        setFailed(fail)
      }
      if (i < files.length - 1 && !cancelRef.current) {
        await new Promise<void>((r) => setTimeout(r, GEMINI_BATCH_DELAY_MS))
      }
    }
    setPhase('done')
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-80px)]">
      <div className="flex-1">
        <h2 className="text-2xl font-bold text-text-primary mb-1">Starte mit deinen Unterlagen</h2>
        <p className="text-text-muted text-sm mb-8">
          Importiere Mitschriften, PDFs oder KC-Dokumente — die KI ordnet sie direkt dem richtigen Fach zu.
        </p>

        {/* IDLE — upload zone */}
        {phase === 'idle' && (
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-border rounded-[20px] p-8 flex flex-col items-center gap-3 hover:border-accent/50 hover:bg-accent/5 transition-all"
          >
            <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-accent">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-text-primary font-semibold text-base">Dateien hochladen</p>
              <p className="text-text-muted text-sm mt-1">PDF, JPG, PNG · bis zu 5 Dateien</p>
            </div>
          </button>
        )}

        {/* SUGGESTING — KI spinner */}
        {phase === 'suggesting' && (
          <div className="space-y-3">
            <div className="bg-surface border border-border rounded-[20px] px-4 py-4 flex items-center gap-3">
              <div className="w-8 h-8 border-[3px] border-accent/25 border-t-accent rounded-full animate-spin shrink-0" />
              <div>
                <p className="text-text-primary text-[14px] font-medium">KI ermittelt Fach…</p>
                <p className="text-text-muted text-[12px] mt-0.5 truncate max-w-[220px]">{files[0]?.name}</p>
              </div>
            </div>
            <button
              onClick={goManual}
              className="w-full py-3 rounded-card border border-border text-text-secondary text-sm font-medium hover:bg-surface-hover transition-colors"
            >
              Manuell wählen
            </button>
          </div>
        )}

        {/* SUGGESTED — KI recommendation */}
        {phase === 'suggested' && (
          <div className="space-y-3">
            {suggestion ? (
              <>
                <div className="bg-accent/5 border border-accent/20 rounded-[20px] px-4 py-4">
                  <p className="text-[10px] font-bold text-accent uppercase tracking-wider mb-3">KI-Vorschlag</p>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-btn flex items-center justify-center text-xl shrink-0"
                      style={{ backgroundColor: `${profileSubjects.find(s => s.id === suggestion.subjectId)?.color ?? '#7C3AED'}22` }}
                    >
                      {profileSubjects.find(s => s.id === suggestion.subjectId)?.icon ?? '📚'}
                    </div>
                    <div>
                      <p className="text-text-primary font-bold text-[15px]">{suggestion.subjectName}</p>
                      {suggestion.reason && (
                        <p className="text-text-muted text-[12px] mt-0.5 italic leading-relaxed">{suggestion.reason}</p>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => void startProcessing(suggestion.subjectId)}
                  className="w-full py-3.5 rounded-[20px] grad-accent text-white text-[15px] font-semibold hover:opacity-90 active:scale-95 transition-all"
                >
                  Vorschlag annehmen
                </button>
              </>
            ) : (
              <p className="text-text-muted text-sm mb-2">Kein Fach erkannt — bitte manuell wählen.</p>
            )}
            <button
              onClick={goManual}
              className="w-full py-3 rounded-card border border-border text-text-secondary text-sm font-medium hover:bg-surface-hover transition-colors"
            >
              Manuell wählen
            </button>
          </div>
        )}

        {/* MANUAL — subject picker */}
        {phase === 'manual' && (
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-3">In welches Fach?</p>
            {profileSubjects.map((s) => (
              <button
                key={s.id}
                onClick={() => void startProcessing(s.id)}
                className="w-full flex items-center gap-3 bg-surface border border-border rounded-card px-4 py-3.5 text-left hover:bg-surface-hover active:scale-[0.98] transition-all"
              >
                <div
                  className="w-9 h-9 rounded-btn flex items-center justify-center text-xl shrink-0"
                  style={{ backgroundColor: `${s.color}22` }}
                >
                  {s.icon}
                </div>
                <span className="text-text-primary font-medium text-[15px]">{s.name}</span>
              </button>
            ))}
            <button
              onClick={() => void startProcessing('')}
              className="w-full flex items-center gap-3 bg-surface border border-border rounded-card px-4 py-3.5 text-left hover:bg-surface-hover transition-colors"
            >
              <div className="w-9 h-9 rounded-btn bg-surface-hover flex items-center justify-center shrink-0 text-lg">📁</div>
              <span className="text-text-secondary font-medium text-[15px]">Schnellnotizen</span>
            </button>
          </div>
        )}

        {/* PROCESSING */}
        {phase === 'processing' && (
          <div className="bg-surface border border-border rounded-[20px] p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin shrink-0" />
              <p className="text-text-primary font-semibold text-sm">
                KI analysiert {files.length === 1 ? 'Datei' : 'Dateien'}…
              </p>
            </div>
            <p className="text-text-muted text-sm truncate mb-1">{files[currentFile]?.name}</p>
            <p className="text-text-muted text-sm">{succeeded + failed} von {files.length} verarbeitet</p>
            <div className="mt-3 h-1.5 bg-border/40 rounded-pill overflow-hidden">
              <div
                className="h-full grad-accent rounded-pill transition-all duration-500"
                style={{ width: `${files.length > 0 ? ((succeeded + failed) / files.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        {/* DONE */}
        {phase === 'done' && (
          <div className="rounded-[20px] p-5" style={{ background: 'rgba(var(--color-success),0.08)', border: '1px solid rgba(var(--color-success),0.2)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(var(--color-success),0.15)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-success">
                  <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <p className="text-text-primary font-bold text-[16px]">
                  {succeeded} Smart {succeeded === 1 ? 'Note' : 'Notes'} erstellt ✓
                </p>
                {failed > 0 && <p className="text-text-muted text-[13px] mt-0.5">{failed} fehlgeschlagen</p>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Step's own footer */}
      <div className="space-y-3 pt-6">
        {phase === 'done' && (
          <Button variant="primary" fullWidth size="lg" onClick={onNext}>
            Weiter
          </Button>
        )}
        {phase === 'idle' && (
          <>
            <Button variant="primary" fullWidth size="lg" onClick={() => fileRef.current?.click()}>
              Dateien auswählen
            </Button>
            <button onClick={onNext} className="w-full py-3 text-sm text-text-muted hover:text-text-secondary transition-colors">
              Jetzt überspringen
            </button>
          </>
        )}
        {(phase === 'suggesting' || phase === 'suggested' || phase === 'manual') && (
          <button onClick={onNext} className="w-full py-3 text-sm text-text-muted hover:text-text-secondary transition-colors">
            Jetzt überspringen
          </button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png,.webp,image/*,application/pdf"
        className="hidden"
        onChange={(e) => handleSelect(e.target.files)}
      />
    </div>
  )
}

/* ─── Step 9: Erste Klausur ───────────────────────────────── */

function StepKlausur({
  faecher,
  subject, setSubject,
  date, setDate,
  topic, setTopic,
}: {
  faecher: string[]
  subject: string; setSubject: (v: string) => void
  date: string; setDate: (v: string) => void
  topic: string; setTopic: (v: string) => void
}) {
  const available = faecher.map((id) => ({ id, ...SUBJECT_INFO[id] })).filter((s) => s.name)
  const subjectTopics = subject
    ? topics.filter((t) => t.subjectId === subject).map((t) => t.name)
    : []

  return (
    <div>
      <h2 className="text-2xl font-bold text-text-primary mb-1">Wann ist deine nächste Klausur?</h2>
      <p className="text-text-muted text-sm mb-8">
        Wir erstellen direkt einen Countdown und Lernvorschläge für dich.
      </p>

      <p className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Fach</p>
      <div className="flex flex-col gap-2 mb-6">
        {available.map((s) => (
          <button
            key={s.id}
            onClick={() => setSubject(s.id)}
            className={`flex items-center gap-3 py-3 px-4 rounded-card border text-left transition-all duration-150 ${
              subject === s.id
                ? 'grad-accent border-transparent text-white'
                : 'bg-surface border-border text-text-secondary hover:bg-surface-hover'
            }`}
          >
            <span className="text-xl">{s.icon}</span>
            <span className="font-medium text-sm">{s.name}</span>
          </button>
        ))}
      </div>

      {subject && (
        <>
          <p className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Datum</p>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            min={new Date().toISOString().slice(0, 10)}
            className="w-full bg-surface border border-border rounded-card px-4 py-3.5 text-text-primary text-sm focus:outline-none focus:border-accent transition-colors mb-6"
          />

          <p className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Thema (optional)</p>
          {subjectTopics.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {subjectTopics.slice(0, 6).map((t) => (
                <button
                  key={t}
                  onClick={() => setTopic(topic === t ? '' : t)}
                  className="px-3 py-1.5 rounded-pill text-[12px] font-medium transition-all press-sm"
                  style={topic === t ? { background: 'rgb(var(--color-accent))', color: 'white' } : { background: 'rgba(var(--color-border),0.5)', color: 'rgb(var(--color-text-secondary))' }}
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
            placeholder="z.B. Weimarer Republik (optional)"
            className="w-full bg-surface border border-border rounded-card px-4 py-3.5 text-text-primary text-sm placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
          />
        </>
      )}
    </div>
  )
}
