import { useNavigate } from 'react-router-dom'
import { Header } from '../components/ui/Header'
import { useUser } from '../context/UserContext'
import { SUBJECT_INFO } from '../data/subjectInfo'
import type { Lernplan, LernplanType } from '../types'

const G_LERNPLAN = 'linear-gradient(145deg, #FFD060, #C07700)'

const PLAN_TYPE_LABELS: Record<LernplanType, string> = {
  einzel: 'Einzel',
  vollstaendig: 'Vollständig',
  abitur: 'Abitur',
}

const PLAN_TYPE_COLORS: Record<LernplanType, string> = {
  einzel: '#34C759',
  vollstaendig: '#7C3AED',
  abitur: '#FF9F0A',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatDateShort(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
}

function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-text-muted shrink-0">
      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function LernplanCard({ plan, onPress }: { plan: Lernplan; onPress: () => void }) {
  const subjects = [...new Set(plan.examSchedule.map((e) => e.subjectId))]

  return (
    <button
      onClick={onPress}
      className="w-full bg-surface border border-border/60 rounded-[20px] shadow-card-adaptive text-left press overflow-hidden flex active:scale-[0.98] transition-all"
    >
      <div className="w-1 shrink-0 rounded-l-[20px]" style={{ background: '#C07700' }} />
      <div className="flex items-center gap-3 p-4 flex-1 min-w-0">
        <div
          className="w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0"
          style={{ background: G_LERNPLAN }}
        >
          <CalendarIcon />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[15px] font-bold text-text-primary truncate">{plan.title}</p>
            {plan.isActive && (
              <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-accent/15 text-accent whitespace-nowrap shrink-0">
                Aktuell
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white shrink-0"
              style={{ background: PLAN_TYPE_COLORS[plan.planType] }}
            >
              {PLAN_TYPE_LABELS[plan.planType]}
            </span>
            {subjects.slice(0, 4).map((sId) => (
              <span key={sId} className="text-[12px] shrink-0">{SUBJECT_INFO[sId]?.icon ?? '📚'}</span>
            ))}
            <span className="text-[11px] text-text-muted">{formatDate(plan.createdAt)}</span>
          </div>
          {plan.examSchedule.length > 0 && (
            <p className="text-[11px] text-text-muted mt-0.5 truncate">
              {plan.examSchedule.map((e) => {
                const info = SUBJECT_INFO[e.subjectId]
                const name = info?.name ?? e.subjectId
                return `${name}${e.topic ? ` – ${e.topic}` : ''} ${formatDateShort(e.date)}`
              }).join(' · ')}
            </p>
          )}
        </div>
        <ChevronRight />
      </div>
    </button>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div
        className="w-16 h-16 rounded-[20px] flex items-center justify-center mb-4"
        style={{ background: G_LERNPLAN }}
      >
        <CalendarIcon />
      </div>
      <p className="text-[17px] font-bold text-text-primary mb-2">Noch kein Lernplan</p>
      <p className="text-[13px] text-text-muted leading-relaxed mb-6 max-w-[260px]">
        Erstelle deinen ersten KI-Lernplan und behalte deine Klausurvorbereitung im Blick.
      </p>
      <button
        onClick={onCreate}
        className="px-6 py-3 rounded-[16px] text-white font-semibold text-[14px] active:scale-[0.98] transition-all"
        style={{ background: G_LERNPLAN }}
      >
        Lernplan erstellen
      </button>
    </div>
  )
}

export function LernplanListScreen() {
  const navigate = useNavigate()
  const { lernplaene } = useUser()

  const sorted = [...lernplaene].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const handleCreate = () => navigate('/klausurmodus/lernplan/neu')

  return (
    <div className="flex flex-col min-h-screen bg-background pb-28">
      <Header
        title="Meine Lernpläne"
        subtitle="KI-generierte Lernpläne"
        onBack={() => navigate(-1)}
      />

      <div className="px-4 space-y-3 mt-2">
        <button
          onClick={handleCreate}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-[20px] text-white font-semibold text-[15px] shadow-lg active:scale-[0.98] transition-all"
          style={{ background: G_LERNPLAN }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          Neuen Lernplan erstellen
        </button>

        {sorted.length === 0 && (
          <EmptyState onCreate={handleCreate} />
        )}

        {sorted.length > 0 && (
          <div className="space-y-2.5">
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider px-1 mt-2">
              Gespeicherte Lernpläne
            </p>
            {sorted.map((plan) => (
              <LernplanCard
                key={plan.id}
                plan={plan}
                onPress={() => navigate(`/klausurmodus/lernplan/${plan.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
