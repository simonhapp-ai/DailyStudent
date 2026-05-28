import { useNavigate } from 'react-router-dom'
import { examQuestions, flashCards, subjects } from '../data/mockData'
import { SubjectIcon } from '../components/ui/SubjectIcon'

function daysUntil(dateStr: string) {
  const exam = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  exam.setHours(0, 0, 0, 0)
  return Math.ceil((exam.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function KlausurphasenScreen() {
  const navigate = useNavigate()

  const upcomingExams = subjects
    .filter((s) => s.nextExam !== null)
    .map((s) => ({
      ...s,
      days: daysUntil(s.nextExam!),
      cardCount: flashCards.filter((f) => f.subjectId === s.id).length,
      questionCount: examQuestions.filter((q) => q.subjectId === s.id).length,
    }))
    .filter((s) => s.days >= 0)
    .sort((a, b) => a.days - b.days)

  return (
    <div className="flex flex-col min-h-screen bg-background pb-28">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="px-5" style={{ paddingTop: 'max(58px, calc(env(safe-area-inset-top, 0px) + 18px))' }}>
        <h1 className="text-[28px] font-bold text-text-primary">Klausurphase</h1>
        <p className="text-[13px] text-text-muted mt-0.5">Vorbereitung &amp; Mock-Klausuren</p>
      </div>

      <div className="px-5 mt-5 space-y-5">

        {/* ── KI-Lernplan — Pro ──────────────────────────────────── */}
        <div className="relative overflow-hidden bg-surface rounded-card shadow-card-adaptive border border-border/60 p-5">
          <div className="filter blur-sm pointer-events-none select-none">
            <p className="text-[13px] font-semibold text-text-secondary mb-1">KI-Lernplan — Geschichte</p>
            <p className="text-text-muted text-[12px] mb-3">
              {upcomingExams[0]?.days ?? 0} Tage · 3 Einheiten geplant · Ziel: Note 1
            </p>
            <div className="h-2 bg-border/40 rounded-pill overflow-hidden">
              <div className="h-full bg-accent rounded-pill" style={{ width: '40%' }} />
            </div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-2 bg-surface/95 border border-border rounded-[14px] px-4 py-2.5 shadow-float">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" strokeLinecap="round" />
              </svg>
              <span className="text-accent text-[13px] font-semibold">KI-Lernplan · Pro</span>
            </div>
          </div>
        </div>

        {/* ── Klausuren ──────────────────────────────────────────── */}
        <div>
          <h2 className="section-label mb-3">Klausuren</h2>
          <div className="space-y-3">
            {upcomingExams.map((subject) => (
              <div key={subject.id} className="bg-surface rounded-card shadow-card-adaptive border border-border/60 overflow-hidden">
                <div className="p-4 flex items-center gap-4">
                  <SubjectIcon subjectId={subject.id} size="md" />
                  <div className="flex-1">
                    <p className="text-text-primary font-semibold text-[15px]">{subject.name}</p>
                    <p className="text-text-muted text-[12px] mt-0.5">
                      {new Date(subject.nextExam!).toLocaleDateString('de-DE', { day: '2-digit', month: 'long' })}
                    </p>
                  </div>
                  <div className="px-3 py-1.5 rounded-pill text-[12px] font-bold shrink-0 bg-accent/10 text-accent">
                    {subject.days === 0 ? 'Heute' : `${subject.days}d`}
                  </div>
                </div>

                <div className="px-4 pb-3.5">
                  <div className="flex items-center justify-between text-[11px] text-text-muted mb-2">
                    <span>
                      {subject.cardCount > 0 ? `${subject.cardCount} Karten` : 'Keine Karten'}
                      {subject.questionCount > 0 ? ` · ${subject.questionCount} Aufgaben` : ''}
                    </span>
                    <span>0 % gelernt</span>
                  </div>
                  <div className="h-1.5 bg-border/40 rounded-pill overflow-hidden">
                    <div className="h-full bg-accent rounded-pill" style={{ width: '0%' }} />
                  </div>
                </div>

                <div className="flex border-t border-border/60">
                  <button
                    onClick={() => navigate('/klausurmodus/lernen')}
                    disabled={subject.cardCount === 0}
                    className="flex-1 py-3.5 text-[14px] font-medium text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors flex items-center justify-center gap-2 disabled:opacity-40 press-sm"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="5" width="20" height="14" rx="2" />
                      <line x1="2" y1="10" x2="22" y2="10" />
                    </svg>
                    Karteikarten
                  </button>
                  <div className="w-px bg-border/60" />
                  <button
                    onClick={() => navigate('/klausurmodus/klausur')}
                    disabled={subject.questionCount === 0}
                    className="flex-1 py-3.5 text-[14px] font-semibold flex items-center justify-center gap-2 disabled:opacity-40 press-sm transition-colors hover:bg-accent/5 text-accent"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 11l3 3L22 4" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" strokeLinecap="round" />
                    </svg>
                    Mock-Klausur
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
