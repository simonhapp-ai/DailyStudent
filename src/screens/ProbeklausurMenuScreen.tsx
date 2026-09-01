import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { ProModal } from '../components/ui/ProModal'
import { SubjectIcon } from '../components/ui/SubjectIcon'
import { Icon, type IconName } from '../components/ui/Icon'
import { Stage } from '../components/ui/Stage'
import { Tag } from '../components/ui/Tag'
import { ListGroup, ListRow } from '../components/ui/ListGroup'
import { EmptyState } from '../components/ui/EmptyState'
import { Banner } from '../components/ui/Banner'

interface ProbeklausurPrefill {
  subjectId: string
  subjectName: string
  topics: string[]
  sourceNoteIds: string[]
}

// Die vier Klausurarten sind Inhaltskategorien, genau wie die vier Fachgruppen —
// deshalb tragen sie DEREN Töne statt eines eigenen Farbvokabulars. Mint bleibt
// der vollständigen Klausur vorbehalten, weil sie das Kernstück des Modus ist.
// Lila kommt hier nicht vor: das ist die Farbe des Unterrichtsmodus.
interface Mode {
  id: number
  route: string
  fill: string
  /** Schriftfarbe auf der Fläche — die Töne sind hell, Weiß trägt darauf nicht. */
  on: string
  icon: IconName
  title: string
  subtitle: string
  description: string
  badges: string[]
  proBadge?: string
}

const MODES: Mode[] = [
  {
    id: 2,
    route: '/klausurmodus/probeklausur/vollstaendige-klausur',
    fill: '#34D399',
    on: '#062017',
    icon: 'clock',
    title: 'Vollständige Klausur',
    subtitle: 'Realistische Klausur-Simulation',
    description: 'Eine komplette 90-Minuten-Klausur mit AFB I–III, 2–3 Materialien und echter Zeitgrenze — genau wie im Abitur.',
    badges: ['90 Minuten', '3–5 Aufgaben'],
    proBadge: 'KI-Korrektur',
  },
  {
    id: 1,
    route: '/klausurmodus/probeklausur/afb-trainer',
    fill: 'rgb(var(--subj-spr))',
    on: '#062017',
    icon: 'target',
    title: 'AFB-Aufgabentrainer',
    subtitle: 'Einzelne Aufgabe gezielt üben',
    description: 'Du wählst das AFB-Level und bekommst genau eine präzise Abituraufgabe auf diesem Niveau — mit Material, wenn nötig.',
    badges: ['1 Aufgabe', 'AFB I / II / III'],
    proBadge: 'KI-Korrektur',
  },
  {
    id: 3,
    route: '/klausurmodus/probeklausur/materialklausur',
    fill: 'rgb(var(--subj-ges))',
    on: '#2A1200',
    icon: 'document',
    title: 'Materialklausur',
    subtitle: 'Alle drei AFB zu einem Material',
    description: 'Ein Material, drei Aufgaben darauf — vom Beschreiben über das Erklären bis zum Beurteilen.',
    badges: ['1–3 Materialien', 'AFB I + II + III'],
    proBadge: 'KI-Korrektur',
  },
  {
    id: 4,
    route: '/klausurmodus/probeklausur/ohne-material',
    fill: 'rgb(var(--subj-kre))',
    on: '#2A0A1B',
    icon: 'bulb',
    title: 'Ohne Material',
    subtitle: 'Alles aus dem Kopf',
    description: 'Keine Vorlage, kein Text — nur die Aufgabe und was du selbst abrufen kannst.',
    badges: ['Kein Material', 'AFB I + II + III'],
    proBadge: 'KI-Korrektur',
  },
]

const MODE_ROUTE: Record<number, string> = {
  1: '/klausurmodus/probeklausur/afb-trainer',
  2: '/klausurmodus/probeklausur/vollstaendige-klausur',
  3: '/klausurmodus/probeklausur/materialklausur',
  4: '/klausurmodus/probeklausur/ohne-material',
}

const MODE_LABEL: Record<number, string> = {
  1: 'AFB-Trainer',
  2: 'Vollständige Klausur',
  3: 'Materialklausur',
  4: 'Ohne Material',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: '2-digit' })
}

// Notenpunkte laufen über die beschlossene Fünf-Stufen-Skala. Jede Stufe bringt
// ihre eigene Gegenfarbe mit — auf Gelb und Hellgrün trägt Weiß nicht.
function npTone(np: number): { bg: string; fg: string } {
  const step = np >= 13 ? 5 : np >= 10 ? 4 : np >= 7 ? 3 : np >= 4 ? 2 : 1
  return { bg: `rgb(var(--grade-${step}))`, fg: `rgb(var(--grade-${step}-on))` }
}

export function ProbeklausurMenuScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const prefill = (location.state as { prefill?: ProbeklausurPrefill } | null)?.prefill ?? null
  const {
    inProgressProbeklausuren, deleteInProgressProbeklausur,
    savedProbeklausuren, deleteSavedProbeklausur, isPro, appConfig,
  } = useUser()
  const [showProModal, setShowProModal] = useState(false)

  // Beta launch (migration 017_beta_mode_config.sql): AFB-Aufgabentrainer (mode 1)
  // opened for free regardless of isPro — Simon wants to showcase it. The other
  // three modes are paused (most token-expensive generations) — same ProModal
  // as the normal Pro-lock, since it already shows the beta "coming soon"
  // content whenever Pro purchases are paused. Reverts to the original
  // !isPro-gated behavior automatically once the flags flip back.
  const modeEnabled: Record<number, boolean> = {
    2: appConfig.probeklausurMode2Enabled,
    3: appConfig.probeklausurMode3Enabled,
    4: appConfig.probeklausurMode4Enabled,
  }

  const handleModeClick = (mode: Mode) => {
    if (mode.id === 1 && appConfig.probeklausurAfbTrainerFree) {
      navigate(mode.route, { state: prefill ? { prefill } : undefined })
      return
    }
    if (mode.id !== 1 && modeEnabled[mode.id] === false) { setShowProModal(true); return }
    if (!isPro && mode.id !== 2) { setShowProModal(true); return }
    navigate(mode.route, { state: prefill ? { prefill } : undefined })
  }

  // Bühne nur, wenn es genau eine zeitkritische Handlung gibt (Regel 1): eine
  // angefangene Klausur will zu Ende geschrieben werden. Sonst reicht der Titel.
  const offen = [...inProgressProbeklausuren]
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0]
  const offenTasks = offen ? offen.exam.tasks.length : 0
  const offenBeantwortet = offen ? Object.values(offen.userAnswers).filter(Boolean).length : 0

  const erledigt = [...savedProbeklausuren].sort((a, b) => b.completedAt.localeCompare(a.completedAt))

  return (
    <div className="flex flex-col min-h-dvh bg-background pb-28">
      {/* ── Kopf ────────────────────────────────────────────────────── */}
      <div className="px-4" style={{ paddingTop: 'max(58px, calc(env(safe-area-inset-top, 0px) + 18px))' }}>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-text-primary text-[15px] font-semibold mb-4 press-sm -ml-1"
        >
          <svg width="9" height="15" viewBox="0 0 8 14" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M7 1L1 7l6 6" />
          </svg>
          Zurück
        </button>
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[30px] font-extrabold tracking-[-0.035em] text-text-primary">Probeklausur</h1>
            <p className="text-[13px] text-text-secondary mt-0.5">
              {erledigt.length > 0
                ? `${erledigt.length} ${erledigt.length === 1 ? 'geschrieben' : 'geschrieben'} · AFB I–III`
                : 'KI-generiert · AFB I–III · Abitur-konform'}
            </p>
          </div>
          <button
            onClick={() => navigate('/klausurmodus/probeklausur/retrospektive')}
            className="flex items-center gap-1.5 text-text-primary text-[14px] font-semibold press-sm shrink-0 pb-1"
          >
            <Icon name="chart" size={15} />
            Verlauf
          </button>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-3">

        {/* Angefangene Klausur — die eine zeitkritische Sache */}
        {offen && (
          <Stage
            tone="klausur"
            eyebrow={`${MODE_LABEL[offen.mode]} · seit ${fmtDate(offen.startedAt)}`}
            title={offen.subjectName}
            progress={offenTasks > 0 ? offenBeantwortet / offenTasks : 0}
            note={`${offenBeantwortet} von ${offenTasks} Aufgaben bearbeitet`}
            action={
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => navigate(MODE_ROUTE[offen.mode], { state: { resume: offen } })}
                  className="h-12 rounded-pill text-[15px] font-semibold press flex items-center justify-center gap-2"
                  style={{ background: 'rgb(var(--color-accent))', color: 'rgb(var(--color-on-accent))' }}
                >
                  <Icon name="play" size={16} />
                  Fortfahren
                </button>
                <button
                  onClick={() => deleteInProgressProbeklausur(offen.id)}
                  className="h-12 rounded-pill bg-white/15 text-white text-[15px] font-semibold press flex items-center justify-center gap-2 border border-white/25"
                >
                  <Icon name="trash" size={16} />
                  Verwerfen
                </button>
              </div>
            }
          />
        )}

        {/* Herkunft, falls aus einem Lernzettel heraus gestartet */}
        {prefill && (
          <Banner tone="info">
            <span className="font-semibold">Basierend auf Lernzettel</span>
            <span className="block text-text-secondary mt-0.5">
              {prefill.subjectName}
              {prefill.topics.length > 0 &&
                ` · ${prefill.topics.slice(0, 2).join(', ')}${prefill.topics.length > 2 ? ' …' : ''}`}
            </span>
          </Banner>
        )}

        {/* Zwei Spalten, sobald Platz da ist: links die Auswahl, rechts der
            Bestand. Im Hochformat bleibt die Reihenfolge Auswahl → Bestand. */}
        <div className="grid gap-3 xl:grid-cols-2 xl:items-start xl:gap-5">

          {/* ── Klausurarten ──────────────────────────────────────── */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-text-secondary px-1">
              Klausurart wählen
            </p>
            {MODES.map((mode) => {
              const gratisInBeta = mode.id === 1 && appConfig.probeklausurAfbTrainerFree
              const pausiert = mode.id !== 1 && modeEnabled[mode.id] === false
              return (
                <button
                  key={mode.id}
                  onClick={() => handleModeClick(mode)}
                  className="w-full bg-surface rounded-card shadow-card-adaptive border border-border/60 p-4 text-left press hover:bg-surface-hover transition-colors"
                >
                  <div className="flex items-start gap-3.5">
                    <span
                      className="w-11 h-11 rounded-icon flex items-center justify-center shrink-0"
                      style={{ backgroundColor: mode.fill, backgroundImage: 'var(--subj-fade)', color: mode.on }}
                    >
                      <Icon name={mode.icon} size={21} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[16px] font-semibold tracking-[-0.015em] text-text-primary">
                        {mode.title}
                      </span>
                      <span className="block text-[13px] text-text-secondary mt-0.5">{mode.subtitle}</span>
                    </span>
                    <svg className="shrink-0 text-text-muted mt-3" width="8" height="14" viewBox="0 0 8 14" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M1 1l6 6-6 6" />
                    </svg>
                  </div>

                  <p className="text-[13px] text-text-secondary leading-relaxed mt-3">{mode.description}</p>

                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {mode.badges.map((badge) => (
                      <Tag key={badge} size="sm">{badge}</Tag>
                    ))}
                    {gratisInBeta ? (
                      <Tag tone="green" size="sm">Kostenlos in der Beta</Tag>
                    ) : pausiert ? (
                      <Tag size="sm">Bald wieder da</Tag>
                    ) : mode.proBadge && !isPro ? (
                      <Tag tone="gold" size="sm" className="gap-1">
                        <Icon name="sparkle" size={10} filled />Pro
                      </Tag>
                    ) : null}
                  </div>
                </button>
              )
            })}

            <p className="text-[12px] text-text-secondary leading-relaxed px-1">
              Alle Arten folgen den Abitur-Regeln deines Bundeslands: Operatoren, BE-Angaben,
              AFB-Progression und fachspezifische Aufgabentypen.
            </p>
          </div>

          {/* ── Bestand ───────────────────────────────────────────── */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-text-secondary px-1">
              Deine Klausuren
            </p>

            {inProgressProbeklausuren.length > 1 && (
              <ListGroup>
                {inProgressProbeklausuren
                  .filter((pk) => pk.id !== offen?.id)
                  .map((pk) => {
                    const beantwortet = Object.values(pk.userAnswers).filter(Boolean).length
                    return (
                      <ListRow
                        key={pk.id}
                        leading={<SubjectIcon subjectId={pk.subjectId} size="md" />}
                        title={pk.subjectName}
                        subtitle={`${MODE_LABEL[pk.mode]} · ${beantwortet}/${pk.exam.tasks.length} bearbeitet`}
                        value={<Tag tone="orange" size="sm">offen</Tag>}
                        chevron
                        onClick={() => navigate(MODE_ROUTE[pk.mode], { state: { resume: pk } })}
                      />
                    )
                  })}
              </ListGroup>
            )}

            {erledigt.length > 0 ? (
              <ListGroup>
                {erledigt.map((pk) => (
                  <ListRow
                    key={pk.id}
                    leading={<SubjectIcon subjectId={pk.subjectId} size="md" />}
                    title={pk.topic}
                    subtitle={`${pk.subjectName} · ${MODE_LABEL[pk.mode]} · ${fmtDate(pk.completedAt)}`}
                    value={
                      <span className="flex items-center gap-2">
                        <span
                          className="px-2.5 py-1 rounded-pill text-[11px] font-bold tabular-nums"
                          style={{ background: npTone(pk.totalNP).bg, color: npTone(pk.totalNP).fg }}
                        >
                          {pk.totalNP}/15
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteSavedProbeklausur(pk.id) }}
                          aria-label={`${pk.topic} löschen`}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-text-primary press-sm"
                        >
                          <Icon name="trash" size={15} />
                        </button>
                      </span>
                    }
                    onClick={() => navigate('/klausurmodus/probeklausur/retrospektive')}
                  />
                ))}
              </ListGroup>
            ) : !offen && (
              <EmptyState
                title="Noch keine Klausur geschrieben"
                note="Wähle links eine Art — die KI baut daraus eine Klausur aus deinen Notizen und dem Lehrplan deines Bundeslands."
              />
            )}
          </div>
        </div>
      </div>

      <ProModal feature="probeklausur" isOpen={showProModal} onClose={() => setShowProModal(false)} />
    </div>
  )
}
