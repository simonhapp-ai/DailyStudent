import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { useUser, generateKcFolders } from '../context/UserContext'
import { type UserProfile } from '../context/UserContext'

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
  mathematik:   { name: 'Mathematik',       icon: '📐', color: '#7C6FFF' },
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

type Step = 1 | 2 | 3 | 4 | 5

const DEV_PROFILE: UserProfile = {
  name: 'Simon Happ',
  klasse: '13',
  schulform: 'Gymnasium',
  bundesland: 'Niedersachsen',
  bundeslandId: 'ni',
  faecher: ['englisch', 'mathematik', 'biologie', 'physik', 'religion'],
  klausurtermine: [{ subjectId: 'mathematik', date: '2026-06-06' }],
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

  const progress = (step / 5) * 100

  const canNext: Record<Step, boolean> = {
    1: true,
    2: name.trim().length > 0 && klasse !== '' && schulform !== '',
    3: bundeslandId !== '',
    4: faecher.length > 0,
    5: true,
  }

  const next = () => {
    if (step < 5) setStep((s) => (s + 1) as Step)
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
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7C6FFF" strokeWidth="2">
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
            zielnote={zielnote} setZielnote={setZielnote}
          />
        )}
        {step === 3 && (
          <StepBundesland selected={bundeslandId} onSelect={setBundeslandId} />
        )}
        {step === 4 && (
          <StepFaecher selected={faecher} onToggle={toggleFach} />
        )}
        {step === 5 && (
          <StepKlausur
            faecher={faecher}
            subject={klausurSubject} setSubject={setKlausurSubject}
            date={klausurDate} setDate={setKlausurDate}
          />
        )}
      </div>

      {/* Footer CTA */}
      {step > 1 && (
        <div className="px-6 pb-10 pt-4">
          {step < 5 ? (
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
          <span style={{ color: '#7C6FFF' }}>Besser abschneiden.</span>
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

const ZIELNOTEN = ['1,0', '1,5', '2,0', '2,5', '3,0+']

function StepPersonal({
  name, setName,
  klasse, setKlasse,
  schulform, setSchulform,
  zielnote, setZielnote,
}: {
  name: string; setName: (v: string) => void
  klasse: string; setKlasse: (v: string) => void
  schulform: string; setSchulform: (v: string) => void
  zielnote: string; setZielnote: (v: string) => void
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
      <div className="flex flex-col gap-2 mb-8">
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

      <p className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-1">Abi-Zielnote</p>
      <p className="text-xs text-text-muted mb-3">Optional — hilft der KI, deine Lernintensität anzupassen.</p>
      <div className="grid grid-cols-5 gap-2">
        {ZIELNOTEN.map((z) => (
          <button
            key={z}
            onClick={() => setZielnote(zielnote === z ? '' : z)}
            className={`py-2.5 rounded-card text-sm font-bold border transition-all duration-150 ${
              zielnote === z
                ? 'bg-accent border-accent text-white'
                : 'bg-surface border-border text-text-secondary hover:bg-surface-hover'
            }`}
          >
            {z}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ─── Step 3: Bundesland ──────────────────────────────────── */

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

/* ─── Step 4: Fächer ──────────────────────────────────────── */

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

/* ─── Step 5: Erste Klausur ───────────────────────────────── */

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
            style={{ colorScheme: 'dark' }}
          />
        </>
      )}
    </div>
  )
}
