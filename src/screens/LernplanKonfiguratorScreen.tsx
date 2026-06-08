import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { generateLernplan } from '../lib/gemini'
import { buildKcPromptContext } from '../data/kcLoader'
import { SUBJECT_INFO, getTopicPlaceholder, getTopicsPlaceholder } from '../data/subjectInfo'
import { ProModal } from '../components/ui/ProModal'
import type { LernplanType, LernplanBlockedTime, Lernplan, LernplanGeneratorInput } from '../types'

const TODAY = new Date().toISOString().slice(0, 10)

const DAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

const BLOCK_PRESETS: Omit<LernplanBlockedTime, 'id'>[] = [
  { label: 'Sport / Training', dayOfWeek: [], startTime: '17:00', endTime: '19:00' },
  { label: 'Mittagspause', dayOfWeek: [], startTime: '12:00', endTime: '13:00' },
  { label: 'Familie / Abend', dayOfWeek: [], startTime: '19:00', endTime: '22:00' },
]

function uid() {
  return `bt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d = new Date(dateStr); d.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - today.getTime()) / 86400000)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function LernplanKonfiguratorScreen() {
  const { profile, isPro, saveLernplan, getKc } = useUser()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const TOTAL_STEPS = 6

  // Step 1: Plan type
  const [planType, setPlanType] = useState<LernplanType>('vollstaendig')
  const [showProModal, setShowProModal] = useState(false)

  // Step 2: Klausurtermine
  const allTermine = (profile?.klausurtermine ?? []).filter((k) => daysUntil(k.date) >= 0)
  const [selectedTermineKeys, setSelectedTermineKeys] = useState<string[]>(() =>
    allTermine.map((k) => `${k.subjectId}|${k.date}`)
  )
  const [examTopics, setExamTopics] = useState<Record<string, string>>({})

  // Step 3: Zeit & Blockierungen
  const [startDate, setStartDate] = useState(TODAY)
  const [blockedTimes, setBlockedTimes] = useState<LernplanBlockedTime[]>([])
  const [addingBlock, setAddingBlock] = useState(false)
  const [newBlock, setNewBlock] = useState<Omit<LernplanBlockedTime, 'id'>>({
    label: '', dayOfWeek: [], startTime: '17:00', endTime: '19:00',
  })

  // Step 4: Lernkapazität
  const [dailyStudyHours, setDailyStudyHours] = useState(4)
  const [studyTimePreference, setStudyTimePreference] = useState<'morgen' | 'abend' | 'beides'>('beides')
  const [includeWeekends, setIncludeWeekends] = useState(false)
  const [targetGrade, setTargetGrade] = useState(profile?.zielnote ?? '')
  const [lkFaecher, setLkFaecher] = useState<string[]>(profile?.lkFaecher ?? [])

  // Step 5: Schwerpunkte
  const [weaknesses, setWeaknesses] = useState<Record<string, string>>({}) // subjectId → free text

  // Step 6: Generation
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState('')
  const _abortRef = useRef<AbortController | null>(null)

  const selectedTermine = allTermine.filter((k) =>
    selectedTermineKeys.includes(`${k.subjectId}|${k.date}`)
  )

  const canNext: Record<number, boolean> = {
    1: true,
    2: planType === 'einzel' ? selectedTermineKeys.length === 1 : selectedTermineKeys.length >= 1,
    3: true,
    4: true,
    5: true,
    6: true,
  }

  const handleNext = () => {
    if (step === 1 && (planType === 'vollstaendig' || planType === 'abitur') && !isPro) {
      setShowProModal(true)
      return
    }
    if (step < TOTAL_STEPS) setStep((s) => s + 1)
  }

  const handleBack = () => {
    if (step > 1) setStep((s) => s - 1)
  }

  const toggleTermin = (key: string) => {
    if (planType === 'einzel') {
      setSelectedTermineKeys([key])
    } else {
      setSelectedTermineKeys((prev) =>
        prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
      )
    }
  }

  const addBlockedTime = (preset?: Omit<LernplanBlockedTime, 'id'>) => {
    const block = preset ?? newBlock
    if (!block.label.trim()) return
    setBlockedTimes((prev) => [...prev, { ...block, id: uid() }])
    setNewBlock({ label: '', dayOfWeek: [], startTime: '17:00', endTime: '19:00' })
    setAddingBlock(false)
  }

  const removeBlock = (id: string) => setBlockedTimes((prev) => prev.filter((b) => b.id !== id))

  const toggleLK = (subjectId: string) => {
    setLkFaecher((prev) =>
      prev.includes(subjectId) ? prev.filter((s) => s !== subjectId) : [...prev, subjectId]
    )
  }

  const handleGenerate = async () => {
    setGenerating(true)
    setGenError('')

    try {
      const lastExamDate = [...selectedTermine].sort((a, b) => b.date.localeCompare(a.date))[0]?.date ?? TODAY
      const planDurationDays = Math.max(1, daysUntil(lastExamDate))

      // Build KC context for selected subjects
      const subjectIds = [...new Set(selectedTermine.map((k) => k.subjectId))]
      const kcParts: string[] = []
      for (const subjectId of subjectIds) {
        const kc = getKc(subjectId)
        if (kc) {
          kcParts.push(`[${SUBJECT_INFO[subjectId]?.name ?? subjectId}]\n${buildKcPromptContext(kc, 'oberstufe')}`)
        }
      }

      const input: LernplanGeneratorInput = {
        planType,
        startDate,
        planDurationDays,
        klausurtermine: selectedTermine.map((k) => ({
          subjectId: k.subjectId,
          subjectName: SUBJECT_INFO[k.subjectId]?.name ?? k.subjectId,
          date: k.date,
          topic: examTopics[`${k.subjectId}|${k.date}`] || k.topic,
          isLK: lkFaecher.includes(k.subjectId),
        })),
        dailyStudyHours,
        targetGrade: targetGrade || '2,0',
        blockedTimes,
        weaknesses: Object.entries(weaknesses)
          .filter(([, text]) => text.trim())
          .map(([subjectId, text]) => ({
            subjectId,
            topics: text.split(',').map((t) => t.trim()).filter(Boolean),
          })),
        kcContext: kcParts.length > 0 ? kcParts.join('\n\n') : undefined,
        schulform: profile?.schulform ?? 'Gymnasium',
        klasse: profile?.klasse ?? '12',
        studyTimePreference,
        includeWeekends,
      }

      const result = await generateLernplan(input)

      const plan: Lernplan = {
        id: `lp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: result.title,
        planType,
        createdAt: new Date().toISOString(),
        startDate,
        endDate: result.days[result.days.length - 1]?.date ?? lastExamDate,
        days: result.days,
        summary: result.summary,
        examSchedule: result.examSchedule,
        isActive: true,
        config: {
          dailyStudyHours,
          targetGrade: targetGrade || '2,0',
          blockedTimes,
          weaknesses: Object.entries(weaknesses)
            .filter(([, text]) => text.trim())
            .map(([subjectId, text]) => ({
              subjectId,
              topics: text.split(',').map((t) => t.trim()).filter(Boolean),
            })),
          lkFaecher,
          studyTimePreference,
        },
      }

      saveLernplan(plan)
      navigate(`/klausurmodus/lernplan/${plan.id}`)
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Fehler bei der Generierung.')
      setGenerating(false)
    }
  }

  const progress = (step / TOTAL_STEPS) * 100

  const isOberstufe = profile?.schulform !== 'Universität' && (
    profile?.schultyp === 'g8' ? parseInt(profile?.klasse ?? '0') >= 11 : parseInt(profile?.klasse ?? '0') >= 12
  )

  return (
    <div className="flex flex-col min-h-screen bg-background max-w-lg mx-auto">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-border z-10 max-w-lg mx-auto">
        <div className="h-full grad-accent transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-8 pb-4">
        <button
          onClick={step === 1 ? () => navigate(-1) : handleBack}
          className="w-9 h-9 flex items-center justify-center rounded-btn text-text-secondary hover:bg-surface-hover transition-colors shrink-0"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="flex-1">
          <p className="text-[11px] text-text-muted font-semibold uppercase tracking-wider">
            Schritt {step} von {TOTAL_STEPS}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 pb-4 overflow-y-auto">
        {step === 1 && (
          <StepPlanType planType={planType} onSelect={setPlanType} />
        )}
        {step === 2 && (
          <StepKlausurtermine
            planType={planType}
            allTermine={allTermine}
            selectedKeys={selectedTermineKeys}
            onToggle={toggleTermin}
            examTopics={examTopics}
            onTopicChange={(key, value) => setExamTopics((prev) => ({ ...prev, [key]: value }))}
          />
        )}
        {step === 3 && (
          <StepZeitBlocker
            startDate={startDate}
            onStartDateChange={setStartDate}
            blockedTimes={blockedTimes}
            onRemoveBlock={removeBlock}
            addingBlock={addingBlock}
            setAddingBlock={setAddingBlock}
            newBlock={newBlock}
            setNewBlock={setNewBlock}
            onAddBlock={addBlockedTime}
            presets={BLOCK_PRESETS}
          />
        )}
        {step === 4 && (
          <StepLernkapazitaet
            dailyStudyHours={dailyStudyHours}
            onHoursChange={setDailyStudyHours}
            studyTimePreference={studyTimePreference}
            onPreferenceChange={setStudyTimePreference}
            includeWeekends={includeWeekends}
            onWeekendsChange={setIncludeWeekends}
            targetGrade={targetGrade}
            onGradeChange={setTargetGrade}
            lkFaecher={lkFaecher}
            onToggleLK={toggleLK}
            selectedSubjectIds={[...new Set(selectedTermine.map((k) => k.subjectId))]}
            isOberstufe={isOberstufe}
          />
        )}
        {step === 5 && (
          <StepSchwerpunkte
            subjectIds={[...new Set(selectedTermine.map((k) => k.subjectId))]}
            weaknesses={weaknesses}
            onWeaknessChange={(id, text) => setWeaknesses((prev) => ({ ...prev, [id]: text }))}
            onSkip={() => setStep(6)}
          />
        )}
        {step === 6 && (
          <StepZusammenfassung
            planType={planType}
            selectedTermine={selectedTermine}
            startDate={startDate}
            blockedTimes={blockedTimes}
            dailyStudyHours={dailyStudyHours}
            includeWeekends={includeWeekends}
            targetGrade={targetGrade}
            lkFaecher={lkFaecher}
            weaknesses={weaknesses}
            generating={generating}
            genError={genError}
            onGenerate={handleGenerate}
          />
        )}
      </div>

      {/* Footer */}
      {step < TOTAL_STEPS && (
        <div className="px-4 pb-8 pt-2">
          <button
            onClick={handleNext}
            disabled={!canNext[step]}
            className="w-full py-4 rounded-[20px] grad-accent text-white text-[16px] font-semibold disabled:opacity-40 active:scale-[0.98] transition-all"
          >
            {step === TOTAL_STEPS - 1 ? 'Weiter zur Zusammenfassung' : 'Weiter'}
          </button>
          {step === 5 && (
            <button
              onClick={() => setStep(6)}
              className="w-full mt-2 py-3 text-sm text-text-muted hover:text-text-secondary transition-colors"
            >
              Schritt überspringen
            </button>
          )}
        </div>
      )}

      {showProModal && (
        <ProModal
          isOpen={showProModal}
          onClose={() => setShowProModal(false)}
          feature="lernplan"
        />
      )}
    </div>
  )
}

/* ─── Step 1: Plan Type ────────────────────────────────────────── */

function StepPlanType({ planType, onSelect }: { planType: LernplanType; onSelect: (t: LernplanType) => void }) {
  const options: { id: LernplanType; icon: string; title: string; desc: string; badge?: string }[] = [
    {
      id: 'einzel',
      icon: '🎯',
      title: 'Einzel-Lernplan',
      desc: 'Fokussierter Plan für eine einzelne Klausur. Perfekt wenn du dich auf ein bestimmtes Fach konzentrieren willst.',
    },
    {
      id: 'vollstaendig',
      icon: '📅',
      title: 'Vollständiger Lernplan',
      desc: 'Strukturierter Mehrwochen-Plan für alle anstehenden Klausuren — mit Priorisierung und Ausgleich.',
      badge: 'Pro',
    },
    {
      id: 'abitur',
      icon: '🏆',
      title: 'Abitur-Lernplan',
      desc: 'Der große Plan für die Abiprüfungen: 4 Semester Stoff, volle Tage verfügbar, LK-Gewichtung.',
      badge: 'Pro',
    },
  ]

  return (
    <div>
      <h2 className="text-2xl font-bold text-text-primary mb-1">Welchen Lernplan willst du?</h2>
      <p className="text-text-muted text-sm mb-6">Wähle den Plantyp passend zu deiner Situation.</p>
      <div className="space-y-3">
        {options.map((opt) => {
          const active = planType === opt.id
          return (
            <button
              key={opt.id}
              onClick={() => onSelect(opt.id)}
              className={`w-full flex items-start gap-4 p-4 rounded-[20px] border text-left transition-all duration-150 active:scale-[0.98] ${
                active ? 'grad-accent border-transparent' : 'bg-surface border-border hover:bg-surface-hover'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${active ? 'bg-white/20' : 'bg-accent/10'}`}>
                {opt.icon}
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`font-bold text-[16px] ${active ? 'text-white' : 'text-text-primary'}`}>{opt.title}</p>
                  {opt.badge && (
                    <span className={`px-2 py-0.5 rounded-pill text-[10px] font-black ${active ? 'bg-white/25 text-white' : 'bg-accent/15 text-accent'}`}>
                      {opt.badge}
                    </span>
                  )}
                </div>
                <p className={`text-[13px] mt-1 leading-snug ${active ? 'text-white/80' : 'text-text-muted'}`}>{opt.desc}</p>
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
      {planType === 'einzel' && (
        <div className="mt-4 flex items-start gap-3 p-3.5 rounded-[16px] border border-amber-500/20" style={{ background: 'rgba(245,158,11,0.07)' }}>
          <span className="shrink-0 mt-0.5">💡</span>
          <p className="text-[12px] text-text-secondary leading-relaxed">
            <strong className="text-text-primary">Hinweis:</strong> Bist du mitten in einer Klausurenphase mit mehreren Klausuren, empfehlen wir den{' '}
            <strong className="text-text-primary">Vollständigen Lernplan</strong> – er koordiniert alle Fächer gleichzeitig.
          </p>
        </div>
      )}
    </div>
  )
}

/* ─── Step 2: Klausurtermine ───────────────────────────────────── */

function StepKlausurtermine({
  planType,
  allTermine,
  selectedKeys,
  onToggle,
  examTopics,
  onTopicChange,
}: {
  planType: LernplanType
  allTermine: { subjectId: string; date: string; topic?: string }[]
  selectedKeys: string[]
  onToggle: (key: string) => void
  examTopics: Record<string, string>
  onTopicChange: (key: string, value: string) => void
}) {
  if (allTermine.length === 0) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-text-primary mb-1">Klausurtermine</h2>
        <div className="mt-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-surface mx-auto flex items-center justify-center text-3xl mb-4">📅</div>
          <p className="text-text-primary font-semibold mb-2">Keine Klausurtermine eingetragen</p>
          <p className="text-text-muted text-sm leading-relaxed">
            Trage zuerst deine Klausurtermine im Kalender ein, dann komm zurück.
          </p>
        </div>
      </div>
    )
  }

  const sorted = [...allTermine].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div>
      <h2 className="text-2xl font-bold text-text-primary mb-1">
        {planType === 'einzel' ? 'Welche Klausur?' : 'Welche Klausuren?'}
      </h2>
      <p className="text-text-muted text-sm mb-6">
        {planType === 'einzel'
          ? 'Wähle die Klausur, für die du lernen möchtest.'
          : 'Alle markierten Klausuren werden in den Plan aufgenommen.'}
      </p>
      <div className="space-y-2">
        {sorted.map((k) => {
          const key = `${k.subjectId}|${k.date}`
          const active = selectedKeys.includes(key)
          const subj = SUBJECT_INFO[k.subjectId]
          const days = daysUntil(k.date)
          return (
            <div
              key={key}
              className={`w-full rounded-[20px] border transition-all duration-150 ${
                active ? 'border-accent bg-accent-soft' : 'border-border bg-surface'
              }`}
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => onToggle(key)}
                onKeyDown={(e) => e.key === 'Enter' && onToggle(key)}
                className="w-full flex items-center gap-3 p-4 cursor-pointer hover:bg-white/[0.02] active:scale-[0.98] transition-all select-none"
              >
                <div
                  className="w-11 h-11 rounded-[14px] flex items-center justify-center text-xl shrink-0"
                  style={{ backgroundColor: `${subj?.color ?? '#7C3AED'}22` }}
                >
                  {subj?.icon ?? '📚'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[15px] text-text-primary">
                    {subj?.name ?? k.subjectId}
                  </p>
                  <p className="text-text-muted text-[12px] mt-0.5">
                    {formatDate(k.date)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-pill ${
                    days <= 3 ? 'bg-danger/15 text-danger' : days <= 7 ? 'bg-orange-500/15 text-orange-400' : 'bg-border text-text-muted'
                  }`}>
                    {days === 0 ? 'Heute' : days === 1 ? 'Morgen' : `${days}d`}
                  </span>
                  {active && (
                    <div className="w-5 h-5 rounded-full grad-accent flex items-center justify-center">
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                        <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
              {active && (
                <div className="px-4 pb-3">
                  <input
                    type="text"
                    value={examTopics[key] ?? ''}
                    onChange={(e) => onTopicChange(key, e.target.value)}
                    placeholder={`Thema der Klausur (${getTopicPlaceholder(k.subjectId)})`}
                    className="w-full bg-background border border-border rounded-[12px] px-3 py-2 text-text-primary text-[13px] placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Step 3: Zeit & Blockierungen ────────────────────────────── */

function StepZeitBlocker({
  startDate,
  onStartDateChange,
  blockedTimes,
  onRemoveBlock,
  addingBlock,
  setAddingBlock,
  newBlock,
  setNewBlock,
  onAddBlock,
  presets,
}: {
  startDate: string
  onStartDateChange: (d: string) => void
  blockedTimes: LernplanBlockedTime[]
  onRemoveBlock: (id: string) => void
  addingBlock: boolean
  setAddingBlock: (v: boolean) => void
  newBlock: Omit<LernplanBlockedTime, 'id'>
  setNewBlock: (b: Omit<LernplanBlockedTime, 'id'>) => void
  onAddBlock: (preset?: Omit<LernplanBlockedTime, 'id'>) => void
  presets: Omit<LernplanBlockedTime, 'id'>[]
}) {
  const toggleBlockDay = (day: number) => {
    setNewBlock({
      ...newBlock,
      dayOfWeek: newBlock.dayOfWeek.includes(day)
        ? newBlock.dayOfWeek.filter((d) => d !== day)
        : [...newBlock.dayOfWeek, day],
    })
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-text-primary mb-1">Zeitraum & Blockierungen</h2>
      <p className="text-text-muted text-sm mb-6">Ab wann soll der Plan starten und welche Zeiten sind blockiert?</p>

      {/* Start date */}
      <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">Startdatum</p>
      <input
        type="date"
        value={startDate}
        min={TODAY}
        onChange={(e) => onStartDateChange(e.target.value)}
        className="w-full bg-surface border border-border rounded-card px-4 py-3.5 text-text-primary text-sm focus:outline-none focus:border-accent transition-colors mb-6"
      />

      {/* Existing blocks */}
      {blockedTimes.length > 0 && (
        <div className="space-y-2 mb-4">
          <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">Blockierte Zeiten</p>
          {blockedTimes.map((b) => (
            <div key={b.id} className="flex items-center gap-3 bg-surface border border-border/60 rounded-card p-3">
              <div className="flex-1 min-w-0">
                <p className="text-text-primary font-semibold text-[14px]">{b.label}</p>
                <p className="text-text-muted text-[12px]">
                  {b.dayOfWeek.length === 0 ? 'Täglich' : b.dayOfWeek.map((d) => DAY_LABELS[d]).join(', ')}
                  {' · '}{b.startTime}–{b.endTime}
                </p>
              </div>
              <button
                onClick={() => onRemoveBlock(b.id)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Preset suggestions */}
      {!addingBlock && (
        <div>
          <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">Schnell hinzufügen</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {presets
              .filter((p) => !blockedTimes.some((b) => b.label === p.label))
              .map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => onAddBlock(preset)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-pill bg-surface border border-border text-text-secondary text-[13px] font-medium hover:bg-surface-hover hover:border-accent/40 transition-all"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                  </svg>
                  {preset.label}
                </button>
              ))}
            <button
              onClick={() => setAddingBlock(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-pill bg-accent-soft border border-accent/30 text-accent text-[13px] font-medium hover:bg-accent/20 transition-all"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
              Eigener Block
            </button>
          </div>
        </div>
      )}

      {/* Custom block form */}
      {addingBlock && (
        <div className="bg-surface border border-accent/30 rounded-[20px] p-4 space-y-3">
          <input
            type="text"
            value={newBlock.label}
            onChange={(e) => setNewBlock({ ...newBlock, label: e.target.value })}
            placeholder="Name (z.B. Sport, Hobby)"
            autoFocus
            className="w-full bg-background border border-border rounded-card px-3 py-2.5 text-text-primary text-sm placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
          />
          <div className="flex gap-1.5 flex-wrap">
            {DAY_LABELS.map((label, i) => (
              <button
                key={i}
                onClick={() => toggleBlockDay(i)}
                className={`w-9 h-9 rounded-btn text-[12px] font-bold border transition-all ${
                  newBlock.dayOfWeek.includes(i)
                    ? 'grad-accent border-transparent text-white'
                    : 'bg-background border-border text-text-secondary hover:bg-surface-hover'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <p className="text-[10px] font-bold text-text-muted uppercase mb-1">Von</p>
              <input
                type="time"
                value={newBlock.startTime}
                onChange={(e) => setNewBlock({ ...newBlock, startTime: e.target.value })}
                className="w-full bg-background border border-border rounded-card px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold text-text-muted uppercase mb-1">Bis</p>
              <input
                type="time"
                value={newBlock.endTime}
                onChange={(e) => setNewBlock({ ...newBlock, endTime: e.target.value })}
                className="w-full bg-background border border-border rounded-card px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent transition-colors"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setAddingBlock(false)}
              className="flex-1 py-2.5 rounded-card border border-border text-text-secondary text-sm font-medium hover:bg-surface-hover transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={() => onAddBlock()}
              disabled={!newBlock.label.trim()}
              className="flex-1 py-2.5 rounded-card grad-accent text-white text-sm font-semibold disabled:opacity-40 active:scale-95 transition-all"
            >
              Hinzufügen
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Step 4: Lernkapazität ────────────────────────────────────── */

function StepLernkapazitaet({
  dailyStudyHours,
  onHoursChange,
  studyTimePreference,
  onPreferenceChange,
  includeWeekends,
  onWeekendsChange,
  targetGrade,
  onGradeChange,
  lkFaecher,
  onToggleLK,
  selectedSubjectIds,
  isOberstufe,
}: {
  dailyStudyHours: number
  onHoursChange: (h: number) => void
  studyTimePreference: 'morgen' | 'abend' | 'beides'
  onPreferenceChange: (v: 'morgen' | 'abend' | 'beides') => void
  includeWeekends: boolean
  onWeekendsChange: (v: boolean) => void
  targetGrade: string
  onGradeChange: (v: string) => void
  lkFaecher: string[]
  onToggleLK: (id: string) => void
  selectedSubjectIds: string[]
  isOberstufe: boolean
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-text-primary mb-1">Lernkapazität</h2>
      <p className="text-text-muted text-sm mb-6">Wie viel kannst und willst du täglich lernen?</p>

      {/* Hours */}
      <div className="bg-surface border border-border/60 rounded-[20px] p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-text-primary font-bold text-[16px]">{dailyStudyHours}h pro Tag</p>
          <span className="text-[12px] text-text-muted">{dailyStudyHours <= 2 ? 'Leicht' : dailyStudyHours <= 4 ? 'Moderat' : dailyStudyHours <= 6 ? 'Intensiv' : 'Vollgas'}</span>
        </div>
        <input
          type="range"
          min="1"
          max="8"
          step="0.5"
          value={dailyStudyHours}
          onChange={(e) => onHoursChange(parseFloat(e.target.value))}
          className="w-full accent-accent"
        />
        <div className="flex justify-between text-[10px] text-text-muted mt-1">
          <span>1h</span><span>4h</span><span>8h</span>
        </div>
      </div>

      {/* Study time preference */}
      <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">Lernzeit bevorzugt</p>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { id: 'morgen' as const, label: 'Morgens', sub: '7–13 Uhr' },
          { id: 'beides' as const, label: 'Flexibel', sub: 'Morgens & Abends' },
          { id: 'abend' as const, label: 'Abends', sub: '16–22 Uhr' },
        ].map((opt) => (
          <button
            key={opt.id}
            onClick={() => onPreferenceChange(opt.id)}
            className={`py-3 px-2 rounded-card border text-center transition-all duration-150 ${
              studyTimePreference === opt.id
                ? 'grad-accent border-transparent'
                : 'bg-surface border-border hover:bg-surface-hover'
            }`}
          >
            <p className={`text-[13px] font-bold ${studyTimePreference === opt.id ? 'text-white' : 'text-text-primary'}`}>{opt.label}</p>
            <p className={`text-[10px] mt-0.5 ${studyTimePreference === opt.id ? 'text-white/70' : 'text-text-muted'}`}>{opt.sub}</p>
          </button>
        ))}
      </div>

      {/* Weekends */}
      <div className="flex items-center justify-between bg-surface border border-border/60 rounded-card p-4 mb-4">
        <div>
          <p className="text-text-primary font-semibold text-[14px]">Wochenende einplanen</p>
          <p className="text-text-muted text-[12px] mt-0.5">Sa + So als Lerntage nutzen</p>
        </div>
        <button
          onClick={() => onWeekendsChange(!includeWeekends)}
          className={`w-12 h-7 rounded-pill transition-all duration-200 relative ${includeWeekends ? 'bg-accent' : 'bg-border'}`}
        >
          <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${includeWeekends ? 'left-6' : 'left-1'}`} />
        </button>
      </div>

      {/* Target grade */}
      <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">Zielnote</p>
      <input
        type="text"
        value={targetGrade}
        onChange={(e) => onGradeChange(e.target.value)}
        placeholder="z.B. 1,5 oder 2,0"
        className="w-full bg-surface border border-border rounded-card px-4 py-3.5 text-text-primary text-sm placeholder-text-muted focus:outline-none focus:border-accent transition-colors mb-4"
      />

      {/* LK subjects */}
      {isOberstufe && selectedSubjectIds.length > 0 && (
        <>
          <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">Leistungskurse (LK)</p>
          <p className="text-[12px] text-text-muted mb-3">LK-Fächer erhalten im Plan ~40% mehr Lernzeit.</p>
          <div className="flex flex-wrap gap-2">
            {selectedSubjectIds.map((id) => {
              const subj = SUBJECT_INFO[id]
              const isLK = lkFaecher.includes(id)
              return (
                <button
                  key={id}
                  onClick={() => onToggleLK(id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-pill border text-[13px] font-semibold transition-all ${
                    isLK
                      ? 'bg-accent text-white border-accent'
                      : 'bg-surface border-border text-text-secondary hover:bg-surface-hover'
                  }`}
                >
                  <span>{subj?.icon ?? '📚'}</span>
                  {subj?.name ?? id}
                  {isLK && <span className="text-[10px] font-black">LK</span>}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

/* ─── Step 5: Schwerpunkte ─────────────────────────────────────── */

function StepSchwerpunkte({
  subjectIds,
  weaknesses,
  onWeaknessChange,
  onSkip,
}: {
  subjectIds: string[]
  weaknesses: Record<string, string>
  onWeaknessChange: (id: string, text: string) => void
  onSkip: () => void
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-text-primary mb-1">Deine Schwächen</h2>
      <p className="text-text-muted text-sm mb-1">
        Optional — welche Themen bereiten dir Probleme? Der Plan gibt diesen mehr Zeit.
      </p>
      <button onClick={onSkip} className="text-accent text-[13px] font-medium mb-6 hover:text-accent/80 transition-colors">
        Überspringen →
      </button>

      <div className="space-y-4">
        {subjectIds.map((id) => {
          const subj = SUBJECT_INFO[id]
          return (
            <div key={id} className="bg-surface border border-border/60 rounded-[20px] p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{subj?.icon ?? '📚'}</span>
                <p className="text-text-primary font-bold text-[15px]">{subj?.name ?? id}</p>
              </div>
              <textarea
                value={weaknesses[id] ?? ''}
                onChange={(e) => onWeaknessChange(id, e.target.value)}
                placeholder={getTopicsPlaceholder(id)}
                rows={2}
                className="w-full bg-background border border-border rounded-card px-3 py-2.5 text-text-primary text-sm placeholder-text-muted focus:outline-none focus:border-accent transition-colors resize-none"
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Step 6: Zusammenfassung ──────────────────────────────────── */

function StepZusammenfassung({
  planType,
  selectedTermine,
  startDate,
  blockedTimes,
  dailyStudyHours,
  includeWeekends,
  targetGrade,
  lkFaecher,
  weaknesses,
  generating,
  genError,
  onGenerate,
}: {
  planType: LernplanType
  selectedTermine: { subjectId: string; date: string; topic?: string }[]
  startDate: string
  blockedTimes: LernplanBlockedTime[]
  dailyStudyHours: number
  includeWeekends: boolean
  targetGrade: string
  lkFaecher: string[]
  weaknesses: Record<string, string>
  generating: boolean
  genError: string
  onGenerate: () => void
}) {
  const lastExam = [...selectedTermine].sort((a, b) => b.date.localeCompare(a.date))[0]
  const planDays = lastExam ? Math.max(1, daysUntil(lastExam.date)) : 0
  const planTypeLabels: Record<LernplanType, string> = {
    einzel: 'Einzel-Lernplan',
    vollstaendig: 'Vollständiger Lernplan',
    abitur: 'Abitur-Lernplan',
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-text-primary mb-1">Bereit zum Generieren</h2>
      <p className="text-text-muted text-sm mb-6">Überprüfe deine Einstellungen, dann erstellt die KI deinen Plan.</p>

      {/* Summary card */}
      <div className="bg-surface border border-border/60 rounded-[20px] p-5 mb-5 space-y-4">
        <SummaryRow icon="📋" label="Plantyp" value={planTypeLabels[planType]} />
        <SummaryRow
          icon="📚"
          label="Klausuren"
          value={selectedTermine.map((k) => SUBJECT_INFO[k.subjectId]?.name ?? k.subjectId).join(', ')}
        />
        <SummaryRow icon="📅" label="Startdatum" value={formatDate(startDate)} />
        <SummaryRow icon="⏱️" label="Planungszeitraum" value={`${planDays} Tage`} />
        <SummaryRow icon="🕐" label="Lernzeit/Tag" value={`${dailyStudyHours}h`} />
        <SummaryRow icon="📅" label="Wochenende" value={includeWeekends ? 'Eingeschlossen' : 'Pausentage'} />
        {targetGrade && <SummaryRow icon="🎯" label="Zielnote" value={targetGrade} />}
        {lkFaecher.length > 0 && (
          <SummaryRow
            icon="⭐"
            label="Leistungskurse"
            value={lkFaecher.map((id) => SUBJECT_INFO[id]?.name ?? id).join(', ')}
          />
        )}
        {blockedTimes.length > 0 && (
          <SummaryRow icon="🚫" label="Blockierungen" value={blockedTimes.map((b) => b.label).join(', ')} />
        )}
        {Object.values(weaknesses).some((v) => v.trim()) && (
          <SummaryRow icon="⚠️" label="Schwächen eingetragen" value="Ja — mehr Sessions eingeplant" />
        )}
      </div>

      {genError && (
        <div className="mb-4 p-3 rounded-[14px] text-danger text-[13px]" style={{ background: 'rgba(var(--color-danger),0.08)', border: '1px solid rgba(var(--color-danger),0.2)' }}>
          {genError}
        </div>
      )}

      {generating ? (
        <div className="bg-surface border border-border/60 rounded-[20px] p-6 flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-[3px] border-accent/25 border-t-accent rounded-full animate-spin" />
          <div className="text-center">
            <p className="text-text-primary font-semibold text-[15px]">KI erstellt deinen Lernplan…</p>
            <p className="text-text-muted text-[13px] mt-1">Das kann 20–40 Sekunden dauern.</p>
          </div>
        </div>
      ) : (
        <button
          onClick={onGenerate}
          className="w-full py-4 rounded-[20px] grad-accent text-white text-[16px] font-bold active:scale-[0.98] transition-all"
        >
          Lernplan generieren ✨
        </button>
      )}
    </div>
  )
}

function SummaryRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-base shrink-0 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">{label}</p>
        <p className="text-text-primary text-[14px] font-medium mt-0.5 break-words">{value}</p>
      </div>
    </div>
  )
}
