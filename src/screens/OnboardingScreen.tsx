import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { useUser, generateKcFolders } from '../context/UserContext'
import { type UserProfile } from '../context/UserContext'
import { analyzeFileToSmartNote } from '../lib/gemini'
import type { UserNote } from '../types'

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

const SUBJECTS: Record<string, { name: string; icon: string; color: string }> = {
  deutsch:      { name: 'Deutsch',          icon: '📖', color: '#4ADE80' },
  mathematik:   { name: 'Mathematik',       icon: '📐', color: '#6366F1' },
  englisch:     { name: 'Englisch',         icon: '🌍', color: '#38BDF8' },
  franzoesisch: { name: 'Französisch',      icon: '🗼', color: '#2DD4BF' },
  latein:       { name: 'Latein',           icon: '🏺', color: '#C084FC' },
  spanisch:     { name: 'Spanisch',         icon: '🌶️', color: '#059669' },
  biologie:     { name: 'Biologie',         icon: '🧬', color: '#FACC15' },
  chemie:       { name: 'Chemie',           icon: '🧪', color: '#34D399' },
  physik:       { name: 'Physik',           icon: '⚛️', color: '#818CF8' },
  geschichte:   { name: 'Geschichte',       icon: '🏛️', color: '#F87171' },
  politik:      { name: 'Politik / Soz.',   icon: '⚖️', color: '#6366F1' },
  geographie:   { name: 'Geographie',       icon: '🗺️', color: '#A78BFA' },
  kunst:        { name: 'Kunst',            icon: '🎨', color: '#E879F9' },
  musik:        { name: 'Musik',            icon: '🎵', color: '#EC4899' },
  sport:        { name: 'Sport',            icon: '🏃', color: '#F472B6' },
  religion:     { name: 'Religion / Ethik', icon: '🙏', color: '#D97706' },
  informatik:   { name: 'Informatik',       icon: '💻', color: '#60A5FA' },
  wirtschaft:   { name: 'Wirtschaft',       icon: '📊', color: '#FB923C' },
}

const SUBJECT_GROUPS = [
  { label: 'Kernfächer',            ids: ['deutsch', 'mathematik', 'englisch'] },
  { label: 'Sprachen',              ids: ['franzoesisch', 'latein', 'spanisch'] },
  { label: 'Naturwissenschaften',   ids: ['biologie', 'chemie', 'physik'] },
  { label: 'Gesellschaftswiss.',    ids: ['geschichte', 'politik', 'geographie'] },
  { label: 'Kunst & Sport',         ids: ['kunst', 'musik', 'sport', 'religion'] },
  { label: 'Weiteres',              ids: ['informatik', 'wirtschaft'] },
]

const KLASSEN = ['10', '11', '12', '13']
const SCHULFORMEN = ['Gymnasium', 'FOS', 'Gesamtschule']

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7

const DEV_PROFILE: UserProfile = {
  name: 'Simon Happ',
  klasse: '13',
  schulform: 'Gymnasium',
  bundesland: 'Niedersachsen',
  bundeslandId: 'ni',
  faecher: ['englisch', 'mathematik', 'biologie', 'physik', 'religion'],
  klausurtermine: [{ subjectId: 'mathematik', date: '2026-06-06' }],
  isDevMode: true,
}

export function OnboardingScreen() {
  const { completeOnboarding } = useUser()
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>(1)
  const [finishing, setFinishing] = useState(false)

  const [name, setName] = useState('')
  const [klasse, setKlasse] = useState('')
  const [schulform, setSchulform] = useState('')
  const [zielnote, setZielnote] = useState('')
  const [bundeslandId, setBundeslandId] = useState('')
  const [faecher, setFaecher] = useState<string[]>([])
  const [klausurSubject, setKlausurSubject] = useState('')
  const [klausurDate, setKlausurDate] = useState('')

  const progress = (step / 7) * 100

  const canNext: Record<Step, boolean> = {
    1: true,
    2: name.trim().length > 0 && klasse !== '' && schulform !== '',
    3: true,
    4: true, // optional — StepDateiImport manages its own footer
    5: bundeslandId !== '',
    6: faecher.length > 0,
    7: true,
  }

  const next = () => {
    if (step < 7) setStep((s) => (s + 1) as Step)
  }

  const back = () => {
    if (step > 1) setStep((s) => (s - 1) as Step)
  }

  const toggleFach = (id: string) => {
    setFaecher((prev) =>
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
          ? [{ subjectId: klausurSubject, date: klausurDate }]
          : [],
      zielnote: zielnote || undefined,
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
            className="h-full bg-accent transition-all duration-300"
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
          />
        )}
        {step === 3 && (
          <StepZielnote zielnote={zielnote} setZielnote={setZielnote} />
        )}
        {step === 4 && (
          <StepDateiImport onNext={next} />
        )}
        {step === 5 && (
          <StepBundesland selected={bundeslandId} onSelect={setBundeslandId} />
        )}
        {step === 6 && (
          <StepFaecher selected={faecher} onToggle={toggleFach} />
        )}
        {step === 7 && (
          <StepKlausur
            faecher={faecher}
            subject={klausurSubject} setSubject={setKlausurSubject}
            date={klausurDate} setDate={setKlausurDate}
          />
        )}
      </div>

      {/* Footer CTA — step 4 manages its own footer */}
      {step > 1 && step !== 4 && (
        <div className="px-6 pb-10 pt-4">
          {step < 7 ? (
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
}: {
  name: string; setName: (v: string) => void
  klasse: string; setKlasse: (v: string) => void
  schulform: string; setSchulform: (v: string) => void
}) {
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

      <p className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Klasse</p>
      <div className="grid grid-cols-4 gap-2 mb-8">
        {KLASSEN.map((k) => (
          <button
            key={k}
            onClick={() => setKlasse(k)}
            className={`py-3 rounded-card text-sm font-bold border transition-all duration-150 ${
              klasse === k
                ? 'bg-accent border-accent text-white'
                : 'bg-surface border-border text-text-secondary hover:bg-surface-hover'
            }`}
          >
            {k}.
          </button>
        ))}
      </div>

      <p className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Schulform</p>
      <div className="flex flex-col gap-2">
        {SCHULFORMEN.map((sf) => (
          <button
            key={sf}
            onClick={() => setSchulform(sf)}
            className={`py-3 rounded-card text-sm font-medium border transition-all duration-150 ${
              schulform === sf
                ? 'bg-accent border-accent text-white'
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

/* ─── Step 4: Datei-Import ────────────────────────────────── */

function StepDateiImport({ onNext }: { onNext: () => void }) {
  const { saveToOhneFachFolder } = useUser()
  const fileRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [processing, setProcessing] = useState(false)
  const [processed, setProcessed] = useState(0)
  const [failCount, setFailCount] = useState(0)
  const [done, setDone] = useState(false)

  const processAll = async (selected: File[]) => {
    setProcessing(true)
    setProcessed(0)
    setFailCount(0)
    let fails = 0
    for (let i = 0; i < selected.length; i++) {
      const file = selected[i]
      try {
        const noteId = `import-onboarding-${Date.now()}-${i}`
        const { generated, noteTitle } = await analyzeFileToSmartNote(file, noteId)
        const note: UserNote = {
          id: noteId,
          title: noteTitle,
          content: generated.summary,
          folderId: 'folder-no-subject',
          createdAt: new Date().toISOString(),
        }
        saveToOhneFachFolder(note, generated)
      } catch {
        fails++
      }
      setProcessed(i + 1)
    }
    setFailCount(fails)
    setProcessing(false)
    setDone(true)
  }

  const handleSelect = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    const selected = Array.from(fileList).slice(0, 5)
    setFiles(selected)
    setDone(false)
    void processAll(selected)
  }

  const successCount = files.length - failCount

  return (
    <div className="flex flex-col justify-between min-h-[calc(100vh-80px)]">
      <div className="flex-1">
        <h2 className="text-2xl font-bold text-text-primary mb-1">Starte mit deinen Unterlagen</h2>
        <p className="text-text-muted text-sm mb-8">
          Importiere vorhandene Mitschriften, PDFs oder Lernzettel — die KI erstellt daraus sofort Smart Notes.
        </p>

        {/* Upload zone */}
        {!done && !processing && (
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-border rounded-[20px] p-8 flex flex-col items-center gap-3 hover:border-accent/50 hover:bg-accent/5 transition-all mb-6"
          >
            <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="1.8" className="text-accent">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-text-primary font-semibold text-base">Dateien hochladen</p>
              <p className="text-text-muted text-sm mt-1">PDF, JPG, PNG, WebP · bis zu 5 Dateien</p>
            </div>
          </button>
        )}

        {/* Processing */}
        {processing && (
          <div className="bg-surface border border-border rounded-[20px] p-5 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin shrink-0" />
              <p className="text-text-primary font-semibold text-sm">KI analysiert deine {files.length === 1 ? 'Datei' : 'Dateien'}…</p>
            </div>
            <p className="text-text-muted text-sm">{processed} von {files.length} verarbeitet</p>
            <div className="mt-3 h-1.5 bg-border/40 rounded-pill overflow-hidden">
              <div
                className="h-full bg-accent rounded-pill transition-all duration-500"
                style={{ width: `${files.length > 0 ? (processed / files.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Done */}
        {done && (
          <div className="rounded-[20px] p-5 mb-4" style={{ background: 'rgba(var(--color-success),0.08)', border: '1px solid rgba(var(--color-success),0.2)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(var(--color-success),0.15)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-success">
                  <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <p className="text-text-primary font-bold text-[16px]">
                  {successCount} Smart {successCount === 1 ? 'Note' : 'Notes'} erstellt ✓
                </p>
                <p className="text-text-muted text-[13px] mt-0.5">Du findest sie später in Schnellnotizen</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Step's own footer */}
      <div className="space-y-3">
        {done ? (
          <Button variant="primary" fullWidth size="lg" onClick={onNext}>
            Weiter
          </Button>
        ) : (
          <>
            {files.length === 0 && (
              <Button variant="primary" fullWidth size="lg" onClick={() => fileRef.current?.click()}>
                Dateien auswählen
              </Button>
            )}
            <button
              onClick={onNext}
              disabled={processing}
              className="w-full py-3 text-sm text-text-muted hover:text-text-secondary transition-colors disabled:opacity-40"
            >
              Jetzt überspringen
            </button>
          </>
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

/* ─── Step 5: Bundesland ──────────────────────────────────── */

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
                ? 'bg-accent border-accent text-white'
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

/* ─── Step 6: Fächer ──────────────────────────────────────── */

function StepFaecher({ selected, onToggle }: { selected: string[]; onToggle: (id: string) => void }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-text-primary mb-1">Deine Fächer</h2>
      <p className="text-text-muted text-sm mb-5">
        Wähle alle Fächer, die du lernst. <span className="text-accent font-medium">{selected.length} ausgewählt</span>
      </p>

      <div className="space-y-5">
        {SUBJECT_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
              {group.label}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {group.ids.map((id) => {
                const subject = SUBJECTS[id]
                const active = selected.includes(id)
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
                    <p className={`text-xs font-semibold leading-tight ${active ? 'text-text-primary' : 'text-text-secondary'}`}>
                      {subject.name}
                    </p>
                    {active && (
                      <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-accent flex items-center justify-center shrink-0">
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                          <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
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

/* ─── Step 7: Erste Klausur ───────────────────────────────── */

function StepKlausur({
  faecher,
  subject, setSubject,
  date, setDate,
}: {
  faecher: string[]
  subject: string; setSubject: (v: string) => void
  date: string; setDate: (v: string) => void
}) {
  const available = faecher.map((id) => ({ id, ...SUBJECTS[id] })).filter((s) => s.name)

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
                ? 'bg-accent border-accent text-white'
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
            className="w-full bg-surface border border-border rounded-card px-4 py-3.5 text-text-primary text-sm focus:outline-none focus:border-accent transition-colors"
                     />
        </>
      )}
    </div>
  )
}
