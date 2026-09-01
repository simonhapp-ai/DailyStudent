import { useNavigate } from 'react-router-dom'
import { SubjectIcon } from '../components/ui/SubjectIcon'
import { Header } from '../components/ui/Header'
import { Stage } from '../components/ui/Stage'
import { Tag, type TagTone } from '../components/ui/Tag'
import { ListGroup, ListRow } from '../components/ui/ListGroup'
import { EmptyState } from '../components/ui/EmptyState'
import { Icon } from '../components/ui/Icon'
import { useUser } from '../context/UserContext'
import { SUBJECT_INFO } from '../data/subjectInfo'
import type { Lernplan, LernplanType } from '../types'

const PLAN_TYPE_LABELS: Record<LernplanType, string> = {
  einzel: 'Einzel',
  vollstaendig: 'Vollständig',
  abitur: 'Abitur',
}

// Die drei Plantypen sind Inhaltskategorien und tragen deshalb Töne aus dem
// bestehenden Vorrat — keine eigenen Hexwerte.
const PLAN_TYPE_TONE: Record<LernplanType, TagTone> = {
  einzel: 'green',
  vollstaendig: 'blue',
  abitur: 'orange',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
}

/** Anteil erledigter Tage — dieselbe Quelle, aus der die Übersicht ihre Hero-Karte speist. */
function fortschritt(plan: Lernplan): { erledigt: number; gesamt: number; anteil: number } {
  const gesamt = plan.days?.length ?? 0
  const erledigt = plan.completedDays?.length ?? 0
  return { erledigt, gesamt, anteil: gesamt > 0 ? Math.min(1, erledigt / gesamt) : 0 }
}

/** Der nächste noch offene Tag eines Plans — das, was als Nächstes ansteht. */
function naechsterTag(plan: Lernplan) {
  const erledigt = new Set(plan.completedDays ?? [])
  return plan.days?.find((d) => !erledigt.has(d.date))
}

export function LernplanListScreen() {
  const navigate = useNavigate()
  const { lernplaene } = useUser()

  const sorted = [...lernplaene].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  // Bühne nach Regel 1: Es gibt genau dann eine zeitkritische Handlung, wenn ein
  // Plan läuft und noch Tage offen sind. Sonst ist dieser Screen ein Bestand und
  // der Titel genügt.
  const aktiv = sorted.find((p) => p.isActive) ?? sorted[0]
  const aktivTag = aktiv ? naechsterTag(aktiv) : undefined
  const aktivFortschritt = aktiv ? fortschritt(aktiv) : null

  const handleCreate = () => navigate('/klausurmodus/lernplan/neu')

  return (
    <div className="flex flex-col min-h-dvh bg-background pb-28">
      <Header
        title="Lernpläne"
        subtitle={sorted.length > 0 ? `${sorted.length} ${sorted.length === 1 ? 'Plan' : 'Pläne'}` : 'KI-generiert'}
        onBack={() => navigate(-1)}
      />

      <div className="px-4 space-y-3 mt-2">

        {aktiv && aktivTag && aktivFortschritt && (
          <Stage
            tone="klausur"
            eyebrow={`${PLAN_TYPE_LABELS[aktiv.planType]} · ${aktivFortschritt.erledigt} von ${aktivFortschritt.gesamt} Tagen`}
            title={aktiv.title}
            progress={aktivFortschritt.anteil}
            note={
              aktivTag.sessions?.length
                ? `Als Nächstes: ${aktivTag.sessions
                    .map((s) => SUBJECT_INFO[s.subjectId]?.name ?? s.subjectId)
                    .join(' · ')}`
                : 'Als Nächstes: freier Tag'
            }
            action={
              <button
                onClick={() => navigate(`/klausurmodus/lernplan/${aktiv.id}`)}
                className="w-full h-12 rounded-pill text-[15px] font-semibold press flex items-center justify-center gap-2"
                style={{ background: 'var(--grad-mode)', color: '#FFFFFF' }}
              >
                <Icon name="play" size={16} />
                Weiterlernen
              </button>
            }
          />
        )}

        <button
          onClick={handleCreate}
          className="w-full flex items-center justify-center gap-2 h-12 rounded-pill font-semibold text-[15px] press"
          style={{ background: 'var(--grad-mode)', color: '#FFFFFF' }}
        >
          <Icon name="plus" size={17} />
          Neuen Lernplan erstellen
        </button>

        {sorted.length === 0 ? (
          <EmptyState
            title="Noch kein Lernplan"
            note="Sag der KI, wann deine Klausuren sind und wie viel Zeit du hast — sie verteilt den Stoff auf die Tage dazwischen."
          />
        ) : (
          <>
            <p className="section-label px-1 pt-2">
              Gespeicherte Lernpläne
            </p>
            <ListGroup>
              {sorted.map((plan) => {
                const f = fortschritt(plan)
                const faecher = [...new Set(plan.examSchedule.map((e) => e.subjectId))].slice(0, 3)
                return (
                  <ListRow
                    key={plan.id}
                    leading={
                      <span className="flex -space-x-2 shrink-0">
                        {faecher.length > 0 ? (
                          faecher.map((sId) => (
                            <SubjectIcon
                              key={sId}
                              subjectId={sId}
                              size="sm"
                              className="!w-9 !h-9 ring-2 ring-surface"
                            />
                          ))
                        ) : (
                          <span className="w-9 h-9 rounded-icon bg-[rgb(120,120,128)]/[0.12] dark:bg-[rgb(120,120,128)]/[0.24] flex items-center justify-center text-text-primary">
                            <Icon name="calendar" size={17} />
                          </span>
                        )}
                      </span>
                    }
                    title={
                      <span className="flex items-center gap-2">
                        <span className="truncate">{plan.title}</span>
                        {plan.isActive && <Tag tone="green" size="sm">Aktuell</Tag>}
                      </span>
                    }
                    subtitle={
                      f.gesamt > 0
                        ? `${PLAN_TYPE_LABELS[plan.planType]} · ${f.erledigt}/${f.gesamt} Tage · ${formatDate(plan.createdAt)}`
                        : `${PLAN_TYPE_LABELS[plan.planType]} · ${formatDate(plan.createdAt)}`
                    }
                    value={<Tag tone={PLAN_TYPE_TONE[plan.planType]} size="sm">{PLAN_TYPE_LABELS[plan.planType]}</Tag>}
                    chevron
                    onClick={() => navigate(`/klausurmodus/lernplan/${plan.id}`)}
                  />
                )
              })}
            </ListGroup>
          </>
        )}
      </div>
    </div>
  )
}
