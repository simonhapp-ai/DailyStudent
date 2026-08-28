import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { BottomSheet } from '../components/ui/BottomSheet'
import { SUBJECT_INFO } from '../data/subjectInfo'
import type { SavedProbeklausur } from '../types'

const MODE_LABELS: Record<number, string> = {
  1: 'AFB-Trainer',
  2: 'Vollständig',
  3: 'Material',
  4: 'Ohne Material',
}

const AFB_COLORS: Record<string, string> = {
  I:   'bg-blue-500/15 text-blue-400',
  II:  'bg-amber-500/15 text-amber-400',
  III: 'bg-purple-500/15 text-purple-400',
}

function npColor(np: number): string {
  if (np >= 13) return '#34D399'
  if (np >= 10) return '#60A5FA'
  if (np >= 7)  return '#FACC15'
  if (np >= 4)  return '#FB923C'
  return '#F87171'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
}

function CorrectionDetail({ task }: { task: SavedProbeklausur['taskResults'][0] }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-background rounded-[14px] border border-border/60 mb-2.5 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 press-sm"
      >
        <div className="flex items-center gap-2">
          <span className="text-text-muted text-[11px] font-semibold uppercase tracking-wide">Aufgabe {task.label}</span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${AFB_COLORS[task.afb]}`}>AFB {task.afb}</span>
          <span className="text-text-muted text-[11px]">{task.be} BE</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold" style={{ color: npColor(task.scoreNP) }}>
            {task.scoreNP}/15 NP
          </span>
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" className="text-text-muted transition-transform"
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/40">
          {/* Task question */}
          <p className="text-[13px] text-text-primary font-medium leading-relaxed pt-3">{task.taskText}</p>

          {/* User answer */}
          {task.userAnswer.trim() && (
            <div>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wide mb-1">Deine Antwort</p>
              <p className="text-[12px] text-text-secondary leading-relaxed bg-surface/60 rounded-[10px] px-3 py-2 whitespace-pre-wrap">{task.userAnswer}</p>
            </div>
          )}

          {/* Errors */}
          {task.errors.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-wide mb-1">Fehler</p>
              {task.errors.map((e, i) => (
                <p key={i} className="text-[12px] text-text-secondary mb-0.5">· {e}</p>
              ))}
            </div>
          )}

          {/* Gaps */}
          {task.gaps.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wide mb-1">Lücken</p>
              {task.gaps.map((g, i) => (
                <p key={i} className="text-[12px] text-text-secondary mb-0.5">· {g}</p>
              ))}
            </div>
          )}

          {/* Justification */}
          {task.justification && (
            <p className="text-[11px] text-text-muted leading-relaxed border-t border-border/40 pt-2">{task.justification}</p>
          )}
        </div>
      )}
    </div>
  )
}

type View = 'library' | 'detail'

export function ProbeklausurRetroScreen() {
  const navigate = useNavigate()
  const { savedProbeklausuren, deleteSavedProbeklausur } = useUser()
  const [view, setView] = useState<View>('library')
  const [active, setActive] = useState<SavedProbeklausur | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const sorted = [...savedProbeklausuren].sort((a, b) =>
    b.completedAt.localeCompare(a.completedAt)
  )

  const handleDelete = (id: string) => {
    deleteSavedProbeklausur(id)
    setShowDeleteConfirm(false)
    if (active?.id === id) { setActive(null); setView('library') }
  }

  // ── DETAIL VIEW ──────────────────────────────────────────────────────
  if (view === 'detail' && active) {
    const info = SUBJECT_INFO[active.subjectId]
    const avgAFB = (afb: 'I' | 'II' | 'III') => {
      const tasks = active.taskResults.filter((t) => t.afb === afb)
      if (tasks.length === 0) return null
      return Math.round(tasks.reduce((s, t) => s + t.scoreNP, 0) / tasks.length)
    }

    return (
      <div className="flex flex-col min-h-dvh bg-background pb-28">
        {/* Header */}
        <div className="px-4 pt-12 pb-4 border-b border-border/60 bg-surface/80">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setView('library'); setActive(null) }}
              className="flex items-center gap-1 text-accent text-[14px] font-medium press-sm shrink-0 -ml-1"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              Zurück
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-text-primary font-bold text-[17px] truncate">{active.topic}</p>
              <p className="text-text-muted text-[12px]">{info?.name ?? active.subjectName} · {formatDate(active.completedAt)}</p>
            </div>
            <div
              className="px-3 py-1 rounded-full text-white text-[13px] font-bold shrink-0"
              style={{ background: npColor(active.totalNP) }}
            >
              {active.totalNP}/15 NP
            </div>
          </div>
        </div>

        <div className="px-4 py-5 space-y-5">
          {/* Grade card */}
          <div className="bg-surface border border-border/60 rounded-[20px] p-5 shadow-card-adaptive">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[13px] text-text-muted mb-0.5">{MODE_LABELS[active.mode]} · {formatDate(active.completedAt)}</p>
                <p className="text-[28px] font-black" style={{ color: npColor(active.totalNP) }}>
                  {active.gradeLabel}
                </p>
                <p className="text-[13px] text-text-muted">{active.totalNP} von 15 Notenpunkten</p>
              </div>
              <div
                className="w-16 h-16 rounded-[20px] flex items-center justify-center"
                style={{ background: `${npColor(active.totalNP)}22` }}
              >
                <span className="text-[28px] font-black" style={{ color: npColor(active.totalNP) }}>
                  {active.totalNP}
                </span>
              </div>
            </div>

            {/* AFB breakdown */}
            {(['I', 'II', 'III'] as const).map((afb) => {
              const avg = avgAFB(afb)
              if (avg === null) return null
              return (
                <div key={afb} className="flex items-center gap-3 mb-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${AFB_COLORS[afb]}`}>AFB {afb}</span>
                  <div className="flex-1 h-1.5 bg-border/40 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(avg / 15) * 100}%`, background: npColor(avg) }} />
                  </div>
                  <span className="text-[12px] font-semibold text-text-secondary">{avg}/15</span>
                </div>
              )
            })}
          </div>

          {/* Overall feedback */}
          {active.overallJustification && (
            <div className="bg-surface border border-border/60 rounded-[20px] p-4 shadow-card-adaptive">
              <p className="text-[11px] font-bold text-text-muted uppercase tracking-wide mb-2">KI-Gesamturteil</p>
              <p className="text-[13px] text-text-secondary leading-relaxed">{active.overallJustification}</p>
            </div>
          )}

          {/* Per-task correction */}
          <div>
            <p className="section-label px-1 mb-2.5">Aufgaben im Detail</p>
            {active.taskResults.map((task) => (
              <CorrectionDetail key={task.taskId} task={task} />
            ))}
          </div>

          {/* Delete */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full py-3.5 rounded-[16px] font-semibold text-[14px] border border-red-500/30 text-red-400 press"
          >
            Klausur löschen
          </button>
        </div>

        <BottomSheet isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)}>
          <div className="px-5 pb-2 space-y-3">
            <div className="flex flex-col items-center text-center gap-2 pt-2 pb-1">
              <p className="text-[18px] font-bold text-text-primary">Klausur löschen?</p>
              <p className="text-[13px] text-text-secondary leading-snug">
                Die Klausur "{active.topic}" wird dauerhaft gelöscht.
              </p>
            </div>
            <button onClick={() => setShowDeleteConfirm(false)} className="w-full py-3.5 rounded-[16px] font-semibold text-[15px] bg-surface border border-border/60 text-text-primary press">
              Abbrechen
            </button>
            <button onClick={() => handleDelete(active.id)} className="w-full py-3.5 rounded-[16px] font-semibold text-[15px] text-white press mb-2" style={{ background: 'linear-gradient(145deg, #FF453A, #C0392B)' }}>
              Löschen
            </button>
          </div>
        </BottomSheet>
      </div>
    )
  }

  // ── LIBRARY VIEW ─────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-dvh bg-background pb-28">
      {/* Header */}
      <div className="px-4 pt-12 pb-4 border-b border-border/60 bg-surface/80">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-accent text-[14px] font-medium press-sm shrink-0 -ml-1"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Zurück
          </button>
          <div>
            <p className="text-text-primary font-bold text-[17px]">Klausur-Verlauf</p>
            <p className="text-text-muted text-[12px]">
              {sorted.length === 0 ? 'Noch keine Klausuren' : `${sorted.length} abgeschlossen`}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-3">
        {/* Empty state */}
        {sorted.length === 0 && (
          <div className="bg-surface border border-border/60 rounded-[20px] p-8 shadow-card-adaptive text-center mt-4">
            <div
              className="w-14 h-14 rounded-[18px] flex items-center justify-center mx-auto mb-4"
              style={{ background: 'linear-gradient(145deg, #0891B2, #065666)' }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
              </svg>
            </div>
            <p className="text-[16px] font-bold text-text-primary mb-1">Noch keine Klausuren</p>
            <p className="text-[13px] text-text-muted leading-snug">
              Schließe eine Probeklausur ab — sie wird hier automatisch gespeichert.
            </p>
          </div>
        )}

        {/* Exam list */}
        {sorted.map((pk) => {
          const info = SUBJECT_INFO[pk.subjectId]
          return (
            <button
              key={pk.id}
              onClick={() => { setActive(pk); setView('detail') }}
              className="w-full bg-surface border border-border/60 rounded-[20px] shadow-card-adaptive text-left press overflow-hidden flex"
            >
              {/* Left color accent */}
              <div className="w-1 shrink-0 rounded-l-[20px]" style={{ background: npColor(pk.totalNP) }} />

              <div className="flex items-center gap-3 p-4 flex-1 min-w-0">
                {/* Subject icon */}
                <div
                  className="w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0 text-xl"
                  style={{ background: info?.color ? `${info.color}22` : '#ffffff11' }}
                >
                  <span>{info?.icon ?? '📄'}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-[15px] font-bold text-text-primary truncate">{pk.topic}</p>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-border/40 text-text-muted shrink-0 whitespace-nowrap">
                      {MODE_LABELS[pk.mode]}
                    </span>
                  </div>
                  <p className="text-[12px] text-text-muted">
                    {info?.name ?? pk.subjectName} · {formatDate(pk.completedAt)}
                  </p>
                </div>

                {/* NP badge */}
                <div
                  className="px-2.5 py-1 rounded-full text-white text-[12px] font-bold shrink-0 whitespace-nowrap"
                  style={{ background: npColor(pk.totalNP) }}
                >
                  {pk.totalNP}/15
                </div>

                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-text-muted shrink-0" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
