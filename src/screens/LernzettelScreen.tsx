import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../components/ui/Header'
import { ProModal } from '../components/ui/ProModal'
import { useUser } from '../context/UserContext'
import { SUBJECT_INFO } from '../data/subjectInfo'
import type { Lernzettel } from '../types'

const G_LERNZETTEL = 'linear-gradient(145deg, #5AC8FA, #007BB8)'

type View = 'library' | 'detail'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Minimal markdown renderer: handles ##/###, **bold**, > blockquote, plain lines
function renderContent(content: string) {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []

  lines.forEach((line, i) => {
    if (line.startsWith('### ')) {
      elements.push(
        <p key={i} className="text-[14px] font-semibold text-text-primary mt-4 mb-1">
          {line.slice(4)}
        </p>
      )
    } else if (line.startsWith('## ')) {
      elements.push(
        <p key={i} className="text-[16px] font-bold text-text-primary mt-5 mb-1.5">
          {line.slice(3)}
        </p>
      )
    } else if (line.startsWith('> ')) {
      elements.push(
        <div key={i} className="border-l-[3px] border-[#5AC8FA] pl-3 py-0.5 my-2">
          <p className="text-[13px] text-text-secondary italic">{line.slice(2)}</p>
        </div>
      )
    } else if (line.startsWith('Merke: ')) {
      elements.push(
        <div key={i} className="border-l-[3px] border-[#5AC8FA] pl-3 py-0.5 my-2">
          <p className="text-[13px] text-text-secondary italic">{line}</p>
        </div>
      )
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />)
    } else {
      // Handle **bold** inline
      const parts = line.split(/(\*\*[^*]+\*\*)/)
      elements.push(
        <p key={i} className="text-[13px] text-text-secondary leading-relaxed">
          {parts.map((part, j) =>
            part.startsWith('**') && part.endsWith('**')
              ? <strong key={j} className="text-text-primary font-semibold">{part.slice(2, -2)}</strong>
              : part
          )}
        </p>
      )
    }
  })

  return elements
}

export function LernzettelScreen() {
  const navigate = useNavigate()
  const { lernzettel, isPro } = useUser()
  const [view, setView] = useState<View>('library')
  const [activeLz, setActiveLz] = useState<Lernzettel | null>(null)
  const [showPro, setShowPro] = useState(false)

  const handleOpenDetail = (lz: Lernzettel) => {
    setActiveLz(lz)
    setView('detail')
  }

  const handleNew = () => {
    if (!isPro) { setShowPro(true); return }
    navigate('/klausurmodus/lernzettel/neu')
  }

  // ── DETAIL VIEW ────────────────────────────────────────────
  if (view === 'detail' && activeLz) {
    const info = SUBJECT_INFO[activeLz.subjectId]
    return (
      <div className="flex flex-col min-h-screen bg-background pb-28">
        <Header
          title={activeLz.title}
          subtitle={info?.name ?? activeLz.subjectName}
          onBack={() => { setView('library'); setActiveLz(null) }}
        />

        <div className="px-4 mt-2 space-y-4">
          {/* Subject badge */}
          <div className="flex items-center gap-2">
            <span
              className="text-[11px] font-semibold px-2.5 py-1 rounded-full text-white"
              style={{ background: info?.color ?? '#7C3AED' }}
            >
              {info?.icon ?? '📄'} {info?.name ?? activeLz.subjectName}
            </span>
            <span className="text-[11px] text-text-muted">{formatDate(activeLz.generatedAt)}</span>
          </div>

          {/* Themen */}
          {activeLz.selectedTopics.length > 0 && (
            <div>
              <p className="section-label px-0.5 mb-2">Themen</p>
              <div className="flex flex-wrap gap-2">
                {activeLz.selectedTopics.map((t) => (
                  <span
                    key={t}
                    className="text-[12px] font-medium px-3 py-1 rounded-full text-white"
                    style={{ background: G_LERNZETTEL }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Content */}
          <div className="bg-surface border border-border/60 rounded-[20px] p-5 shadow-card-adaptive">
            {renderContent(activeLz.content)}
          </div>

          {/* Schlüsselbegriffe */}
          {activeLz.keywords.length > 0 && (
            <div>
              <p className="section-label px-0.5 mb-2">Schlüsselbegriffe</p>
              <div className="flex flex-wrap gap-2">
                {activeLz.keywords.map((kw) => (
                  <span
                    key={kw}
                    className="text-[12px] font-medium px-3 py-1.5 rounded-full bg-surface border border-border text-text-secondary"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Klausurrelevanz */}
          {activeLz.examTopics.length > 0 && (
            <div>
              <p className="section-label px-0.5 mb-2">Klausurrelevanz</p>
              <div className="bg-surface border border-border/60 rounded-[20px] p-4 shadow-card-adaptive space-y-2">
                {activeLz.examTopics.map((t, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5"
                      style={{ background: G_LERNZETTEL }}
                    >
                      {i + 1}
                    </span>
                    <p className="text-[13px] text-text-secondary leading-snug">{t}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Karteikarten */}
          <button
            onClick={() => navigate('/klausurmodus/karteikarten/neu', {
              state: {
                prefilledSubjectId: activeLz.subjectId,
                prefilledNoteId: activeLz.sourceNoteIds[0] ?? null,
              },
            })}
            className="w-full bg-surface border border-border/60 rounded-[20px] p-4 shadow-card-adaptive text-left press flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-[12px] flex items-center justify-center shrink-0"
                style={{ background: 'linear-gradient(145deg, #A78BFA, #7C3AED)' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <path d="M8 21h8M12 17v4" />
                </svg>
              </div>
              <div>
                <p className="text-[14px] font-semibold text-text-primary">Karteikarten erstellen</p>
                <p className="text-[11px] text-text-muted">Direkt aus diesem Lernzettel generieren</p>
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-text-muted shrink-0" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>

          {/* Probeklausur */}
          <button
            onClick={() => navigate('/klausurmodus/probeklausur', {
              state: {
                prefill: {
                  subjectId: activeLz.subjectId,
                  subjectName: activeLz.subjectName,
                  topics: activeLz.selectedTopics,
                  sourceNoteIds: activeLz.sourceNoteIds,
                },
              },
            })}
            className="w-full bg-surface border border-border/60 rounded-[20px] p-4 shadow-card-adaptive text-left press flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-[12px] flex items-center justify-center shrink-0"
                style={{ background: 'linear-gradient(145deg, #0891B2, #065666)' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                </svg>
              </div>
              <div>
                <p className="text-[14px] font-semibold text-text-primary">Probeklausur erstellen</p>
                <p className="text-[11px] text-text-muted">Mit Themen dieses Lernzettels als Basis</p>
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-text-muted shrink-0" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  // ── LIBRARY VIEW ───────────────────────────────────────────
  const sorted = [...lernzettel].sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))

  return (
    <div className="flex flex-col min-h-screen bg-background pb-28">
      <Header title="Lernzettel" subtitle="Deine Zusammenfassungen" onBack={() => navigate(-1)} />
      <div className="px-4 pb-2" />

      <div className="px-4 space-y-3">
        {/* Neuer Lernzettel Button */}
        <button
          onClick={handleNew}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-[20px] text-white font-semibold text-[15px] shadow-lg press active:scale-[0.98]"
          style={{ background: G_LERNZETTEL }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Neuen Lernzettel erstellen
        </button>

        {/* Empty state */}
        {sorted.length === 0 && (
          <div className="bg-surface border border-border/60 rounded-[20px] p-8 shadow-card-adaptive text-center mt-4">
            <div
              className="w-14 h-14 rounded-[18px] flex items-center justify-center mx-auto mb-4"
              style={{ background: G_LERNZETTEL }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <path d="M14 2v6h6" />
                <path d="M9 13h6M9 17h4" />
              </svg>
            </div>
            <p className="text-[16px] font-bold text-text-primary mb-1">Noch keine Lernzettel</p>
            <p className="text-[13px] text-text-muted leading-snug">
              Erstelle deinen ersten Lernzettel aus deinen Smart Notes — KI-generiert, passend zum Kerncurriculum.
            </p>
          </div>
        )}

        {/* Lernzettel list */}
        {sorted.length > 0 && (
          <div className="space-y-2.5">
            <p className="section-label px-1 mt-2">Gespeicherte Lernzettel</p>
            {sorted.map((lz) => {
              const info = SUBJECT_INFO[lz.subjectId]
              return (
                <button
                  key={lz.id}
                  onClick={() => handleOpenDetail(lz)}
                  className="w-full bg-surface border border-border/60 rounded-[20px] shadow-card-adaptive text-left press overflow-hidden flex"
                >
                  {/* Left color accent bar */}
                  <div className="w-1 shrink-0 rounded-l-[20px]" style={{ background: info?.color ?? '#5AC8FA' }} />

                  <div className="flex items-center gap-3 p-4 flex-1 min-w-0">
                    {/* Gradient icon */}
                    <div
                      className="w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0"
                      style={{ background: G_LERNZETTEL }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                        <path d="M14 2v6h6" />
                        <path d="M9 13h6M9 17h4" />
                      </svg>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-bold text-text-primary truncate">{lz.title}</p>
                      {/* Subject + date row */}
                      <p className="text-[12px] text-text-muted mt-0.5">
                        {info?.icon ?? '📄'} {info?.name ?? lz.subjectName} · {formatDate(lz.generatedAt)}
                      </p>
                      {/* Topics row */}
                      {lz.selectedTopics.length > 0 && (
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {lz.selectedTopics.slice(0, 3).map((t) => (
                            <span
                              key={t}
                              className="text-[10px] font-medium px-2 py-0.5 rounded-full text-white whitespace-nowrap"
                              style={{ background: G_LERNZETTEL }}
                            >
                              {t}
                            </span>
                          ))}
                          {lz.selectedTopics.length > 3 && (
                            <span className="text-[10px] text-text-muted">+{lz.selectedTopics.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>

                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-text-muted shrink-0" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <ProModal feature="lernzettel" isOpen={showPro} onClose={() => setShowPro(false)} />
    </div>
  )
}
