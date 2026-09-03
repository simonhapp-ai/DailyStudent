import { useMemo, useState } from 'react'
import { WorkingState } from '../components/ui/EmptyState'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { generateLernplan } from '../lib/gemini'
import { buildKcPromptContext } from '../data/kcLoader'
import { Icon, type IconName } from '../components/ui/Icon'
import { SubjectIcon } from '../components/ui/SubjectIcon'
import { getTopicsPlaceholder, subjectInfo } from '../data/subjectInfo'
import { ProModal } from '../components/ui/ProModal'
import { ThemenChips } from '../components/ui/ThemenChips'
import type { LernplanType, LernplanBlockedTime, Lernplan, LernplanGeneratorInput, LernMethode } from '../types'
import { zurueckZiel } from '../lib/appMode'

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
  const { profile, isPro, saveLernplan, getKc, generatedNotes, userNotes, lernplaene } = useUser()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const TOTAL_STEPS = 7

  // Step 1: Plan type
  // Vorausgewaehlt war "Vollstaendig" — ein Pro-Typ. Wer einfach auf Weiter
  // tippte, lief damit direkt in die Pro-Sperre. Der Einzel-Lernplan ist der
  // einzige frei nutzbare und deshalb die richtige Vorauswahl. (Regel 4:
  // Vorauswahl ist ein Vorschlag — sie muss
  // funktionieren, sonst ist sie keiner.)
  const [planType, setPlanType] = useState<LernplanType>('einzel')
  const [showProModal, setShowProModal] = useState(false)

  // Step 2: Klausurtermine + Themen-Checklisten
  const allTermine = (profile?.klausurtermine ?? []).filter((k) => daysUntil(k.date) >= 0)
  const [selectedTermineKeys, setSelectedTermineKeys] = useState<string[]>(() =>
    allTermine.map((k) => `${k.subjectId}|${k.date}`)
  )
  // Die beim Klausur-Eintragen erfassten Themen vorbefüllen — Schritt 2 fragt
  // dann nur noch „stimmt das?" statt alles neu.
  const [examChecklists, setExamChecklists] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(
      allTermine.map((k) => [
        `${k.subjectId}|${k.date}`,
        k.topics && k.topics.length > 0 ? k.topics : (k.topic ? [k.topic] : []),
      ])
    )
  )

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
  const [targetGrade, setTargetGrade] = useState('')
  const [lkFaecher, setLkFaecher] = useState<string[]>(profile?.lkFaecher ?? [])

  // Step 5: Methoden
  const ALL_METHODEN: LernMethode[] = ['karteikarten', 'blurting', 'lernzettel', 'probeklausur', 'lesen', 'wiederholen']
  const [preferredMethods, setPreferredMethods] = useState<LernMethode[]>([...ALL_METHODEN])

  // Step 6: Schwerpunkte
  const [weaknesses, setWeaknesses] = useState<Record<string, string>>({}) // subjectId → free text

  // Step 7: Generation
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState('')
  const selectedTermine = allTermine.filter((k) =>
    selectedTermineKeys.includes(`${k.subjectId}|${k.date}`)
  )

  // Was tatsächlich in den Plan einfließt — für die Anzeige in der Zusammenfassung,
  // damit der Nutzer sieht, dass KC + seine Notizen berücksichtigt werden.
  const personalization = useMemo(() => {
    const ids = [...new Set(selectedTermine.map((k) => k.subjectId))]
    const kcSubjects: string[] = []
    const noteSubjects: string[] = []
    let noteCount = 0
    for (const id of ids) {
      const name = subjectInfo(id)?.name ?? id
      if (getKc(id)) kcSubjects.push(name)
      const n = userNotes.filter((x) => x.subjectId === id && generatedNotes[x.id]).length
      if (n > 0) { noteSubjects.push(name); noteCount += n }
    }
    return { kcSubjects, noteSubjects, noteCount }
  }, [selectedTermine, getKc, userNotes, generatedNotes])

  const canNext: Record<number, boolean> = {
    1: true,
    2: planType === 'einzel'
      ? selectedTermineKeys.length === 1 && (examChecklists[selectedTermineKeys[0]]?.length ?? 0) >= 1
      : selectedTermineKeys.length >= 1 && selectedTermineKeys.every((k) => (examChecklists[k]?.length ?? 0) >= 1),
    3: true,
    4: true,
    5: preferredMethods.length >= 1,
    6: true,
    7: true,
  }

  const today = new Date().toISOString().slice(0, 10)
  const einzelCreatedToday = lernplaene.filter(
    (p) => p.planType === 'einzel' && p.createdAt?.slice(0, 10) === today
  ).length

  const handleNext = () => {
    if (step === 1 && (planType === 'vollstaendig' || planType === 'abitur') && !isPro) {
      setShowProModal(true)
      return
    }
    if (step === 1 && planType === 'einzel' && !isPro && einzelCreatedToday >= 3) {
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

      // Build KC + Smart Notes context for selected subjects
      const subjectIds = [...new Set(selectedTermine.map((k) => k.subjectId))]
      const kcParts: string[] = []
      const notesParts: string[] = []
      for (const subjectId of subjectIds) {
        const kc = getKc(subjectId)
        if (kc) {
          kcParts.push(`[${subjectInfo(subjectId)?.name ?? subjectId}]\n${buildKcPromptContext(kc, 'oberstufe')}`)
        }
        const subjectSmartNotes = userNotes
          .filter((n) => n.subjectId === subjectId)
          .map((n) => generatedNotes[n.id])
          .filter(Boolean)
        if (subjectSmartNotes.length > 0) {
          const subjectName = subjectInfo(subjectId)?.name ?? subjectId
          const lines = subjectSmartNotes.map((gn) => {
            const parts: string[] = []
            if (gn.summary) parts.push(gn.summary)
            if (gn.keywords?.length) parts.push(`Begriffe: ${gn.keywords.slice(0, 8).join(', ')}`)
            if (gn.examTopics?.length) parts.push(`Klausurthemen: ${gn.examTopics.slice(0, 5).join(', ')}`)
            return parts.join(' | ')
          })
          notesParts.push(`[${subjectName}]\n${lines.join('\n')}`)
        }
      }

      const input: LernplanGeneratorInput = {
        planType,
        startDate,
        planDurationDays,
        klausurtermine: selectedTermine.map((k) => ({
          subjectId: k.subjectId,
          subjectName: subjectInfo(k.subjectId)?.name ?? k.subjectId,
          date: k.date,
          topic: examChecklists[`${k.subjectId}|${k.date}`]?.[0] ?? k.topic,
          isLK: lkFaecher.includes(k.subjectId),
        })),
        examChecklists: selectedTermine.map((k) => ({
          subjectId: k.subjectId,
          subjectName: subjectInfo(k.subjectId)?.name ?? k.subjectId,
          date: k.date,
          topics: examChecklists[`${k.subjectId}|${k.date}`] ?? [],
          isLK: lkFaecher.includes(k.subjectId),
        })),
        dailyStudyHours,
        targetGrade: targetGrade || '10',
        blockedTimes,
        weaknesses: Object.entries(weaknesses)
          .filter(([, text]) => text.trim())
          .map(([subjectId, text]) => ({
            subjectId,
            topics: text.split(',').map((t) => t.trim()).filter(Boolean),
          })),
        kcContext: kcParts.length > 0 ? kcParts.join('\n\n') : undefined,
        smartNotesContext: notesParts.length > 0 ? notesParts.join('\n\n') : undefined,
        schulform: profile?.schulform ?? 'Gymnasium',
        klasse: profile?.klasse ?? '12',
        studyTimePreference,
        includeWeekends,
        preferredMethods: preferredMethods.length < ALL_METHODEN.length ? preferredMethods : undefined,
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
          targetGrade: targetGrade || '10',
          blockedTimes,
          weaknesses: Object.entries(weaknesses)
            .filter(([, text]) => text.trim())
            .map(([subjectId, text]) => ({
              subjectId,
              topics: text.split(',').map((t) => t.trim()).filter(Boolean),
            })),
          lkFaecher,
          studyTimePreference,
          preferredMethods: preferredMethods.length < ALL_METHODEN.length ? preferredMethods : undefined,
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
    <div className="flex flex-col min-h-dvh bg-background max-w-lg mx-auto">
      {/* Progress bar — die Safe-Area-Zone mitfärben, sonst sitzt der 1px-Balken
          unter der Dynamic Island und ist unsichtbar. */}
      <div
        className="fixed inset-x-0 top-0 z-10 bg-border"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="max-w-lg mx-auto h-1 bg-border">
          <div className="h-full bg-accent transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pb-4" style={{ paddingTop: 'max(58px, calc(env(safe-area-inset-top, 0px) + 18px))' }}>
        <button
          onClick={step === 1 ? () => navigate(zurueckZiel()) : handleBack}
          className="flex items-center gap-1 text-text-primary text-[14px] font-medium press-sm shrink-0 -ml-1"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Zurück
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
          <StepPlanType planType={planType} onSelect={setPlanType} isPro={isPro} onShowPro={() => setShowProModal(true)} einzelCreatedToday={einzelCreatedToday} />
        )}
        {step === 2 && (
          <StepKlausurtermine
            planType={planType}
            allTermine={allTermine}
            selectedKeys={selectedTermineKeys}
            onToggle={toggleTermin}
            examChecklists={examChecklists}
            onChecklistChange={(key, topics) => setExamChecklists((prev) => ({ ...prev, [key]: topics }))}
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
          <StepMethoden
            selectedMethods={preferredMethods}
            onToggle={(m) => setPreferredMethods((prev) =>
              prev.includes(m) ? (prev.length > 1 ? prev.filter((x) => x !== m) : prev) : [...prev, m]
            )}
          />
        )}
        {step === 6 && (
          <StepSchwerpunkte
            subjectIds={[...new Set(selectedTermine.map((k) => k.subjectId))]}
            weaknesses={weaknesses}
            onWeaknessChange={(id, text) => setWeaknesses((prev) => ({ ...prev, [id]: text }))}
            onSkip={() => setStep(7)}
          />
        )}
        {step === 7 && (
          <StepZusammenfassung
            planType={planType}
            selectedTermine={selectedTermine}
            examChecklists={examChecklists}
            personalization={personalization}
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
            className="w-full h-12 rounded-pill btn-mode text-[16px] font-semibold disabled:opacity-40 active:scale-[0.98] transition-all"
          >
            {step === TOTAL_STEPS - 1 ? 'Weiter zur Zusammenfassung' : 'Weiter'}
          </button>
          {step === 6 && (
            <button
              onClick={() => setStep(7)}
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

function StepPlanType({ planType, onSelect, isPro, onShowPro, einzelCreatedToday }: { planType: LernplanType; onSelect: (t: LernplanType) => void; isPro: boolean; onShowPro: () => void; einzelCreatedToday: number }) {
  const options: { id: LernplanType; icon: IconName; title: string; desc: string; badge?: string }[] = [
    {
      id: 'einzel',
      icon: 'target',
      title: 'Einzel-Lernplan',
      desc: !isPro
        ? `Fokussierter Plan für eine einzelne Klausur. ${Math.max(0, 3 - einzelCreatedToday)}/3 heute übrig (Free).`
        : 'Fokussierter Plan für eine einzelne Klausur. Perfekt wenn du dich auf ein bestimmtes Fach konzentrieren willst.',
    },
    {
      id: 'vollstaendig',
      icon: 'calendar',
      title: 'Vollständiger Lernplan',
      desc: 'Strukturierter Mehrwochen-Plan für alle anstehenden Klausuren — mit Priorisierung und Ausgleich.',
      badge: 'Pro',
    },
    {
      id: 'abitur',
      icon: 'cap',
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
              onClick={() => {
                if (opt.badge && !isPro) { onShowPro(); return }
                onSelect(opt.id)
              }}
              className={`w-full flex items-start gap-4 p-4 rounded-card border text-left transition-all duration-150 active:scale-[0.98] ${
                active ? 'bg-accent border-transparent' : 'bg-surface border-border hover:bg-surface-hover'
              }`}
            >
              <div className={`w-12 h-12 rounded-btn flex items-center justify-center text-2xl shrink-0 ${active ? 'bg-[rgb(var(--color-on-accent)/0.18)] text-on-accent' : 'bg-accent/10'}`}>
                <Icon name={opt.icon} size={22} />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`font-bold text-[16px] ${active ? 'text-on-accent' : 'text-text-primary'}`}>{opt.title}</p>
                  {opt.badge && !isPro && (
                    <span className="badge-pro-gold px-1.5 py-0.5">✦ Pro</span>
                  )}
                </div>
                <p className={`text-[13px] mt-1 leading-snug ${active ? 'text-on-accent/80' : 'text-text-muted'}`}>{opt.desc}</p>
              </div>
              {active && (
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-on-accent" style={{ background: 'rgb(var(--color-on-accent) / 0.22)' }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </button>
          )
        })}
      </div>
      {planType === 'einzel' && (
        <div className="mt-4 flex items-start gap-3 p-3.5 rounded-card border border-amber-500/20" style={{ background: 'rgba(245,158,11,0.07)' }}>
          <span className="shrink-0 mt-0.5 text-text-secondary"><Icon name="bulb" size={15} /></span>
          <p className="text-[12px] text-text-secondary leading-relaxed">
            <strong className="text-text-primary">Hinweis:</strong> Bist du mitten in einer Klausurenphase mit mehreren Klausuren, empfehlen wir den{' '}
            <strong className="text-text-primary">Vollständigen Lernplan</strong> – er koordiniert alle Fächer gleichzeitig.
          </p>
        </div>
      )}
    </div>
  )
}

/* ─── Step 2: Klausurtermine + Themen-Checkliste ──────────────── */

function StepKlausurtermine({
  planType,
  allTermine,
  selectedKeys,
  onToggle,
  examChecklists,
  onChecklistChange,
}: {
  planType: LernplanType
  allTermine: { subjectId: string; date: string; topic?: string; topics?: string[] }[]
  selectedKeys: string[]
  onToggle: (key: string) => void
  examChecklists: Record<string, string[]>
  onChecklistChange: (key: string, topics: string[]) => void
}) {
  if (allTermine.length === 0) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-text-primary mb-1">Klausurtermine</h2>
        <div className="mt-8 text-center">
          <div className="w-16 h-16 rounded-card bg-surface mx-auto flex items-center justify-center text-text-secondary mb-4"><Icon name="calendar" size={28} /></div>
          <p className="text-text-primary font-semibold mb-2">Keine Klausurtermine eingetragen</p>
          <p className="text-text-muted text-sm leading-relaxed">
            Trage zuerst deine Klausurtermine im Kalender ein, dann komm zurück.
          </p>
        </div>
      </div>
    )
  }

  // Ein Termin bringt seine Themen schon aus dem Klausur-Eintrag mit — dann
  // fragt dieser Schritt nur noch nach einer Bestätigung.
  const anyPrefilled = allTermine.some((k) => (k.topics?.length ?? 0) > 0 || !!k.topic)

  const sorted = [...allTermine].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div>
      <h2 className="text-2xl font-bold text-text-primary mb-1">
        {planType === 'einzel' ? 'Welche Klausur?' : 'Welche Klausuren?'}
      </h2>
      <p className="text-text-muted text-sm mb-6">
        {anyPrefilled
          ? 'Stimmen die Themen? Ergänze fehlende, dann weiter.'
          : planType === 'einzel'
            ? 'Wähle deine Klausur und trag die Prüfungsthemen ein.'
            : 'Wähle alle Klausuren und trag die Themen ein — der Plan lernt mit.'}
      </p>
      <div className="space-y-3">
        {sorted.map((k) => {
          const key = `${k.subjectId}|${k.date}`
          const active = selectedKeys.includes(key)
          const subj = subjectInfo(k.subjectId)
          const days = daysUntil(k.date)
          const topics = examChecklists[key] ?? []
          const hasTopics = topics.length > 0

          return (
            <div
              key={key}
              className={`w-full rounded-card border transition-all duration-150 ${
                active ? 'border-accent bg-accent-soft' : 'border-border bg-surface'
              }`}
            >
              {/* Exam header row */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => onToggle(key)}
                onKeyDown={(e) => e.key === 'Enter' && onToggle(key)}
                className="w-full flex items-center gap-3 p-4 cursor-pointer active:scale-[0.98] transition-all select-none"
              >
                <SubjectIcon subjectId={k.subjectId} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[15px] text-text-primary">{subj?.name ?? k.subjectId}</p>
                  <p className="text-text-muted text-[12px] mt-0.5">{formatDate(k.date)}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-pill ${
                    days <= 3 ? 'bg-danger/15 text-text-primary' : days <= 7 ? 'bg-orange-500/15 text-orange-400' : 'bg-border text-text-muted'
                  }`}>
                    {days === 0 ? 'Heute' : days === 1 ? 'Morgen' : `${days}d`}
                  </span>
                  {active && (
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${hasTopics ? 'bg-accent' : 'bg-border'}`}>
                      {hasTopics
                        ? <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        : <span className="text-[11px] text-text-muted font-bold">!</span>
                      }
                    </div>
                  )}
                </div>
              </div>

              {/* Checklist section (visible when selected) */}
              {active && (
                <div className="px-4 pb-4 space-y-3">
                  <ThemenChips
                    topics={topics}
                    onChange={(next) => onChecklistChange(key, next)}
                    subjectId={k.subjectId}
                    placeholder={getTopicsPlaceholder(k.subjectId)}
                  />

                  {/* Validation hint */}
                  {!hasTopics && (
                    <p className="text-[12px] text-orange-400 flex items-center gap-1.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                      Mindestens 1 Thema eintragen
                    </p>
                  )}
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
      <p className="section-label mb-2">Startdatum</p>
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
          <p className="section-label mb-2">Blockierte Zeiten</p>
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
                className="w-7 h-7 rounded-full flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-danger/10 transition-colors"
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
          <p className="section-label mb-2">Schnell hinzufügen</p>
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
              className="flex items-center gap-1.5 px-3 py-2 rounded-pill bg-accent-soft border border-accent/30 text-text-primary text-[13px] font-medium hover:bg-accent/20 transition-all"
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
        <div className="bg-surface border border-accent/30 rounded-card p-4 space-y-3">
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
                    ? 'bg-accent border-transparent text-on-accent'
                    : 'bg-background border-border text-text-secondary hover:bg-surface-hover'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <p className="text-[11px] font-bold text-text-muted uppercase mb-1">Von</p>
              <input
                type="time"
                value={newBlock.startTime}
                onChange={(e) => setNewBlock({ ...newBlock, startTime: e.target.value })}
                className="w-full bg-background border border-border rounded-card px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-bold text-text-muted uppercase mb-1">Bis</p>
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
              className="flex-1 py-2.5 rounded-card btn-mode text-sm font-semibold disabled:opacity-40 active:scale-95 transition-all"
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
      <div className="bg-surface border border-border/60 rounded-card p-5 mb-4">
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
        <div className="flex justify-between text-[11px] text-text-muted mt-1">
          <span>1h</span><span>4h</span><span>8h</span>
        </div>
      </div>

      {/* Study time preference */}
      <p className="section-label mb-2">Lernzeit bevorzugt</p>
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
                ? 'bg-accent border-transparent'
                : 'bg-surface border-border hover:bg-surface-hover'
            }`}
          >
            <p className={`text-[13px] font-bold ${studyTimePreference === opt.id ? 'text-on-accent' : 'text-text-primary'}`}>{opt.label}</p>
            <p className={`text-[11px] mt-0.5 ${studyTimePreference === opt.id ? 'text-on-accent/70' : 'text-text-muted'}`}>{opt.sub}</p>
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
      <p className="section-label mb-2">Zielnote (Notenpunkte)</p>
      <div className="bg-surface border border-border/60 rounded-card p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-text-primary font-bold text-[16px]">
            {targetGrade ? `${targetGrade} NP` : '— NP'}
          </p>
          <span className="text-[12px] text-text-muted">
            {!targetGrade ? 'Optional' : parseInt(targetGrade) >= 13 ? 'Sehr gut' : parseInt(targetGrade) >= 11 ? 'Gut' : parseInt(targetGrade) >= 8 ? 'Befriedigend' : parseInt(targetGrade) >= 5 ? 'Ausreichend' : 'Unterpunkt'}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="15"
          step="1"
          value={targetGrade ? parseInt(targetGrade) : 10}
          onChange={(e) => onGradeChange(e.target.value)}
          className="w-full accent-accent"
        />
        <div className="flex justify-between text-[11px] text-text-muted mt-1">
          <span>0</span><span>5</span><span>10</span><span>15</span>
        </div>
      </div>

      {/* LK subjects */}
      {isOberstufe && selectedSubjectIds.length > 0 && (
        <>
          <p className="section-label mb-2">Leistungskurse (LK)</p>
          <p className="text-[12px] text-text-muted mb-3">LK-Fächer erhalten im Plan ~40% mehr Lernzeit.</p>
          <div className="flex flex-wrap gap-2">
            {selectedSubjectIds.map((id) => {
              const subj = subjectInfo(id)
              const isLK = lkFaecher.includes(id)
              return (
                <button
                  key={id}
                  onClick={() => onToggleLK(id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-pill border text-[13px] font-semibold transition-all ${
                    isLK
                      ? 'btn-mode border-accent'
                      : 'bg-surface border-border text-text-secondary hover:bg-surface-hover'
                  }`}
                >
                  <SubjectIcon subjectId={id} size="sm" />
                  {subj?.name ?? id}
                  {isLK && <span className="text-[11px] font-black">LK</span>}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

/* ─── Step 5: Methoden ─────────────────────────────────────────── */

const METHODEN_META: Record<LernMethode, { label: string; icon: IconName; desc: string }> = {
  karteikarten: { label: 'Karteikarten', icon: 'cards',     desc: 'Fragen & Antworten üben' },
  blurting:     { label: 'Blurting',     icon: 'bulb',      desc: 'Alles aus dem Gedächtnis aufschreiben' },
  lernzettel:   { label: 'Lernzettel',   icon: 'document',  desc: 'Zusammenfassung lesen & merken' },
  probeklausur: { label: 'Probeklausur', icon: 'clipboard', desc: 'Unter echten Bedingungen üben' },
  lesen:        { label: 'Lesen',        icon: 'book',      desc: 'Notizen & Lernzettel durchlesen' },
  wiederholen:  { label: 'Wiederholen',  icon: 'repeat',    desc: 'Gelerntes kurz rekapitulieren' },
}

function StepMethoden({
  selectedMethods,
  onToggle,
}: {
  selectedMethods: LernMethode[]
  onToggle: (m: LernMethode) => void
}) {
  const ALL: LernMethode[] = ['karteikarten', 'blurting', 'lernzettel', 'probeklausur', 'lesen', 'wiederholen']
  return (
    <div className="space-y-5 pt-2">
      <div>
        <h2 className="text-[22px] font-bold text-text-primary">Lernmethoden</h2>
        <p className="text-[14px] text-text-muted mt-1">Welche Methoden magst du? Der KI-Plan bevorzugt diese bei der Session-Planung.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {ALL.map((m) => {
          const meta = METHODEN_META[m]
          const active = selectedMethods.includes(m)
          return (
            <button
              key={m}
              onClick={() => onToggle(m)}
              className={`flex flex-col gap-1.5 p-4 rounded-card border text-left transition-all press ${
                active
                  ? 'border-accent bg-accent/10'
                  : 'border-border/60 bg-surface'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-text-primary"><Icon name={meta.icon} size={22} /></span>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                  active ? 'border-accent bg-accent' : 'border-border'
                }`}>
                  {active && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
              </div>
              <span className={`text-[14px] font-semibold ${active ? 'text-text-primary' : 'text-text-primary'}`}>{meta.label}</span>
              <span className="text-[11px] text-text-muted leading-tight">{meta.desc}</span>
            </button>
          )
        })}
      </div>
      {selectedMethods.length === 0 && (
        <p className="text-[13px] text-red-400 text-center">Mindestens eine Methode auswählen</p>
      )}
    </div>
  )
}

/* ─── Step 6: Schwerpunkte ─────────────────────────────────────── */

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
      <button onClick={onSkip} className="text-text-primary text-[13px] font-medium mb-6 hover:text-text-primary/80 transition-colors">
        Überspringen →
      </button>

      <div className="space-y-4">
        {subjectIds.map((id) => {
          const subj = subjectInfo(id)
          return (
            <div key={id} className="bg-surface border border-border/60 rounded-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <SubjectIcon subjectId={id} size="sm" />
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
  examChecklists,
  personalization,
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
  examChecklists: Record<string, string[]>
  personalization: { kcSubjects: string[]; noteSubjects: string[]; noteCount: number }
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
      <div className="bg-surface border border-border/60 rounded-card p-5 mb-5 space-y-4">
        <SummaryRow icon="clipboard" label="Plantyp" value={planTypeLabels[planType]} />
        <SummaryRow
          icon="book"
          label="Klausuren"
          value={selectedTermine.map((k) => {
            const name = subjectInfo(k.subjectId)?.name ?? k.subjectId
            const count = (examChecklists[`${k.subjectId}|${k.date}`] ?? []).length
            return `${name} (${count} Thema${count !== 1 ? 'en' : ''})`
          }).join(', ')}
        />
        <SummaryRow icon="calendar" label="Startdatum" value={formatDate(startDate)} />
        <SummaryRow icon="clock" label="Planungszeitraum" value={`${planDays} Tage`} />
        <SummaryRow icon="clock" label="Lernzeit/Tag" value={`${dailyStudyHours}h`} />
        <SummaryRow icon="calendar" label="Wochenende" value={includeWeekends ? 'Eingeschlossen' : 'Pausentage'} />
        {targetGrade && <SummaryRow icon="target" label="Zielnote" value={`${targetGrade} NP`} />}
        {lkFaecher.length > 0 && (
          <SummaryRow
            icon="star"
            label="Leistungskurse"
            value={lkFaecher.map((id) => subjectInfo(id)?.name ?? id).join(', ')}
          />
        )}
        {blockedTimes.length > 0 && (
          <SummaryRow icon="lock" label="Blockierungen" value={blockedTimes.map((b) => b.label).join(', ')} />
        )}
        {Object.values(weaknesses).some((v) => v.trim()) && (
          <SummaryRow icon="warning" label="Schwächen eingetragen" value="Ja — mehr Sessions eingeplant" />
        )}
        {personalization.kcSubjects.length > 0 ? (
          <SummaryRow icon="book" label="Kerncurriculum" value={personalization.kcSubjects.join(', ')} />
        ) : (
          <SummaryRow icon="book" label="Grundlage" value="Kerncurriculum + deine Themen" />
        )}
        {personalization.noteCount > 0 && (
          <SummaryRow
            icon="note"
            label="Smart Notes fließen ein"
            value={`${personalization.noteCount} — ${personalization.noteSubjects.join(', ')}`}
          />
        )}
      </div>

      {genError && (
        <div className="mb-4 p-3 rounded-icon text-text-primary text-[13px]" style={{ background: 'rgb(var(--color-danger) / 0.08)', border: '1px solid rgb(var(--color-danger) / 0.2)' }}>
          {genError}
        </div>
      )}

      {generating ? (
        <WorkingState
          tone="klausur"
          title="KI erstellt deinen Lernplan"
          note="Das dauert 20 bis 40 Sekunden."
        />
      ) : (
        <button
          onClick={onGenerate}
          className="w-full h-12 rounded-pill btn-mode text-[16px] font-bold active:scale-[0.98] transition-all"
        >
          Lernplan generieren
        </button>
      )}
    </div>
  )
}

function SummaryRow({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="shrink-0 mt-0.5 text-text-secondary"><Icon name={icon} size={16} /></span>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">{label}</p>
        <p className="text-text-primary text-[14px] font-medium mt-0.5 break-words">{value}</p>
      </div>
    </div>
  )
}
