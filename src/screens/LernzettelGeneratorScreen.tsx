import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../components/ui/Header'
import { useUser } from '../context/UserContext'
import { generateLernzettel } from '../lib/groq'
import { resolveSubjectInfo, getTopicPlaceholder } from '../data/subjectInfo'
import type { Lernzettel } from '../types'

const G_LERNZETTEL = 'linear-gradient(145deg, #5AC8FA, #007BB8)'

type Step = 'fach' | 'select' | 'generating'

export function LernzettelGeneratorScreen() {
  const navigate = useNavigate()
  const { profile, userNotes, generatedNotes, getKc, saveLernzettel, recordStudyDay, addCoins, showCoinToast } = useUser()

  const [step, setStep] = useState<Step>('fach')
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)
  const [selectedTopics, setSelectedTopics] = useState<string[]>([])
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([])
  const [customTopicInput, setCustomTopicInput] = useState('')
  const [showNoNotesWarning, setShowNoNotesWarning] = useState(false)
  const [error, setError] = useState('')

  const availableSubjectIds = profile?.faecher ?? []

  const notesForSubject = selectedSubjectId
    ? userNotes
        .filter((n) => n.subjectId === selectedSubjectId && generatedNotes[n.id])
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    : []

  const kcData = selectedSubjectId ? getKc(selectedSubjectId) : null

  const toggleTopic = (thema: string) => {
    setSelectedTopics((prev) =>
      prev.includes(thema) ? prev.filter((t) => t !== thema) : [...prev, thema]
    )
  }

  const toggleNote = (id: string) => {
    setSelectedNoteIds((prev) =>
      prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id]
    )
  }

  const handleSelectSubject = (id: string) => {
    setSelectedSubjectId(id)
    setSelectedTopics([])
    setSelectedNoteIds([])
    setError('')
    setStep('select')
  }

  const handleGenerate = async () => {
    if (!selectedSubjectId) return
    const info = resolveSubjectInfo(selectedSubjectId, profile?.customFaecher)
    const subjectName = info?.name ?? selectedSubjectId
    const smartNotes = selectedNoteIds
      .map((id) => generatedNotes[id])
      .filter(Boolean)

    setStep('generating')
    setError('')

    try {
      const output = await generateLernzettel({
        subjectName,
        selectedTopics,
        smartNotes,
        kcData: kcData ?? undefined,
      })

      const now = Date.now()
      const lz: Lernzettel = {
        id: `lz-${selectedSubjectId}-${now}`,
        subjectId: selectedSubjectId,
        subjectName,
        title: output.title,
        selectedTopics,
        sourceNoteIds: selectedNoteIds,
        content: output.content,
        keywords: output.keywords,
        examTopics: output.examTopics,
        generatedAt: new Date().toISOString(),
        userNoteId: `lz-note-${selectedSubjectId}-${now}`,
        folderId: `folder-lernzettel-${selectedSubjectId}`,
      }

      saveLernzettel(lz)
      recordStudyDay()
      const gain = addCoins('LERNZETTEL')
      if (gain > 0) showCoinToast(gain)
      navigate('/klausurmodus/lernzettel', { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler beim Generieren')
      setStep('select')
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      <Header
        title="Lernzettel erstellen"
        onBack={
          step === 'select'
            ? () => { setStep('fach'); setSelectedSubjectId(null) }
            : () => navigate(-1)
        }
      />

      <div className="px-4 mt-2 space-y-4">

        {/* Progress indicator */}
        {step !== 'generating' && (
          <div className="flex items-center gap-2">
            {(['fach', 'select'] as const).map((s, i) => {
              const active = step === s
              const done = s === 'fach' && step === 'select'
              return (
                <div key={s} className="flex items-center gap-2">
                  {i > 0 && <div className="h-px w-8 bg-border" />}
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                      style={{
                        background: done
                          ? '#30D158'
                          : active
                          ? G_LERNZETTEL
                          : 'rgb(var(--color-border))',
                        color: 'white',
                      }}
                    >
                      {done ? '✓' : i + 1}
                    </div>
                    <span className={`text-[12px] font-medium ${active ? 'text-text-primary' : 'text-text-muted'}`}>
                      {s === 'fach' ? 'Fach' : 'Auswahl'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── STEP: FACH ────────────────────────────────────────── */}
        {step === 'fach' && (
          <div className="space-y-2.5">
            <p className="section-label px-0.5 mb-1">Fach wählen</p>
            {availableSubjectIds.map((subjectId) => {
              const info = resolveSubjectInfo(subjectId, profile?.customFaecher)
              const noteCount = userNotes.filter(
                (n) => n.subjectId === subjectId && generatedNotes[n.id]
              ).length
              return (
                <button
                  key={subjectId}
                  onClick={() => handleSelectSubject(subjectId)}
                  className="w-full bg-surface border border-border/60 rounded-[20px] shadow-card-adaptive p-4 text-left press flex items-center gap-3"
                >
                  <div
                    className="w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0 text-xl"
                    style={{ background: info?.color ? `${info.color}22` : '#ffffff11' }}
                  >
                    <span>{info?.icon ?? '📄'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-bold text-text-primary">{info?.name ?? subjectId}</p>
                    <p className="text-[12px] text-text-muted mt-0.5">
                      {noteCount === 0
                        ? 'Keine Smart Notes vorhanden'
                        : `${noteCount} Smart Note${noteCount !== 1 ? 's' : ''} verfügbar`}
                    </p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-text-muted shrink-0" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              )
            })}

            {availableSubjectIds.length === 0 && (
              <div className="bg-surface border border-border/60 rounded-[20px] p-6 text-center">
                <p className="text-[14px] text-text-muted">Keine Fächer in deinem Profil.</p>
              </div>
            )}
          </div>
        )}

        {/* ── STEP: SELECT ──────────────────────────────────────── */}
        {step === 'select' && selectedSubjectId && (
          <div className="space-y-5">

            {/* KC Themen */}
            {kcData && kcData.hauptthemen && kcData.hauptthemen.length > 0 && (
              <div>
                <p className="section-label px-0.5 mb-2">Themen wählen <span className="normal-case font-normal">(optional)</span></p>
                <div className="flex flex-wrap gap-2">
                  {kcData.hauptthemen.map((ht) => {
                    const active = selectedTopics.includes(ht.thema)
                    return (
                      <button
                        key={ht.thema}
                        onClick={() => toggleTopic(ht.thema)}
                        className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-all press-sm ${
                          active
                            ? 'text-white'
                            : 'bg-surface border-border text-text-secondary'
                        }`}
                        style={active ? { background: G_LERNZETTEL, borderColor: 'transparent' } : {}}
                      >
                        {ht.thema}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Manual topic input */}
            {(() => {
              const kcTopicNames = kcData?.hauptthemen.map((h) => h.thema) ?? []
              const manualTopics = selectedTopics.filter((t) => !kcTopicNames.includes(t))
              return (
                <div>
                  <p className="section-label px-0.5 mb-2">Eigenes Thema hinzufügen</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customTopicInput}
                      onChange={(e) => setCustomTopicInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && customTopicInput.trim()) {
                          const t = customTopicInput.trim()
                          if (!selectedTopics.includes(t)) setSelectedTopics((prev) => [...prev, t])
                          setCustomTopicInput('')
                        }
                      }}
                      placeholder={getTopicPlaceholder(selectedSubjectId)}
                      className="flex-1 bg-surface border border-border rounded-[14px] px-3.5 py-2.5 text-[13px] text-text-primary placeholder-text-muted focus:outline-none focus:border-[#5AC8FA] transition-colors"
                    />
                    <button
                      onClick={() => {
                        const t = customTopicInput.trim()
                        if (t && !selectedTopics.includes(t)) setSelectedTopics((prev) => [...prev, t])
                        setCustomTopicInput('')
                      }}
                      disabled={!customTopicInput.trim()}
                      className="px-4 py-2.5 rounded-[14px] text-white text-[15px] font-bold transition-opacity"
                      style={{ background: G_LERNZETTEL, opacity: customTopicInput.trim() ? 1 : 0.4 }}
                    >
                      +
                    </button>
                  </div>
                  {manualTopics.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {manualTopics.map((t) => (
                        <button
                          key={t}
                          onClick={() => setSelectedTopics((prev) => prev.filter((x) => x !== t))}
                          className="flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-medium text-white"
                          style={{ background: G_LERNZETTEL }}
                        >
                          {t}
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round">
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Smart Notes */}
            <div>
              <p className="section-label px-0.5 mb-2">
                Smart Notes einbeziehen <span className="normal-case font-normal">(optional)</span>
              </p>
              {notesForSubject.length === 0 ? (
                <div className="bg-surface border border-border/60 rounded-[20px] p-4 flex items-start gap-3">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted shrink-0 mt-0.5">
                    <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
                  </svg>
                  <p className="text-[12px] text-text-muted leading-snug">
                    Noch keine Smart Notes für dieses Fach — der Lernzettel wird nur aus KC-Daten erstellt. Für bessere Ergebnisse erst Notizen im Unterricht analysieren.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {notesForSubject.map((note) => {
                    const gen = generatedNotes[note.id]
                    const selected = selectedNoteIds.includes(note.id)
                    return (
                      <button
                        key={note.id}
                        onClick={() => toggleNote(note.id)}
                        className="w-full text-left press rounded-[16px] border transition-all overflow-hidden"
                        style={
                          selected
                            ? { borderColor: '#5AC8FA', background: 'rgba(90,200,250,0.08)' }
                            : { borderColor: 'rgba(var(--color-border), 0.6)', background: 'rgb(var(--color-surface))' }
                        }
                      >
                        <div className="p-4 flex items-start gap-3">
                          <div
                            className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all"
                            style={
                              selected
                                ? { background: G_LERNZETTEL, borderColor: 'transparent' }
                                : { borderColor: 'rgb(var(--color-border))' }
                            }
                          >
                            {selected && (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-[14px] font-semibold text-text-primary truncate">{note.title}</p>
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white shrink-0" style={{ background: G_LERNZETTEL }}>
                                KI
                              </span>
                            </div>
                            {gen?.summary && (
                              <p className="text-[12px] text-text-muted leading-snug line-clamp-2">{gen.summary}</p>
                            )}
                            {gen?.keywords && gen.keywords.length > 0 && (
                              <p className="text-[11px] text-text-muted mt-1">
                                {gen.keywords.slice(0, 4).join(' · ')}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Error banner */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-[16px] p-3">
                <p className="text-[13px] text-red-500">{error}</p>
              </div>
            )}

            {/* CTA */}
            <button
              onClick={() => {
                if (selectedNoteIds.length === 0) {
                  setShowNoNotesWarning(true)
                } else {
                  void handleGenerate()
                }
              }}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-[20px] text-white font-semibold text-[15px] press"
              style={{ background: G_LERNZETTEL }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              Lernzettel generieren
              {selectedNoteIds.length > 0 && (
                <span className="text-[12px] opacity-80">({selectedNoteIds.length} Note{selectedNoteIds.length !== 1 ? 'n' : ''})</span>
              )}
            </button>

            {/* Warning: no notes selected */}
            {showNoNotesWarning && (
              <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={() => setShowNoNotesWarning(false)}>
                <div className="absolute inset-0 bg-black/50" />
                <div
                  className="relative max-w-lg mx-auto w-full bg-surface rounded-t-[24px] px-5 pt-5 pb-10 z-10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />

                  {/* Icon */}
                  <div
                    className="w-12 h-12 rounded-[16px] flex items-center justify-center mx-auto mb-4"
                    style={{ background: 'linear-gradient(145deg, #FB923C, #EA580C)' }}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  </div>

                  <h2 className="text-[18px] font-bold text-text-primary text-center mb-2">Kein Smart Note ausgewählt</h2>
                  <p className="text-[13px] text-text-secondary text-center leading-relaxed mb-6">
                    Du hast keine Smart Notes ausgewählt. Die KI erstellt den Lernzettel{' '}
                    {selectedTopics.length > 0
                      ? <>nur auf Basis der Kerncurriculum-Daten für <strong className="text-text-primary">{selectedTopics.slice(0, 2).join(', ')}{selectedTopics.length > 2 ? ' …' : ''}</strong>.</>
                      : <>nur auf Basis der allgemeinen Kerncurriculum-Daten für <strong className="text-text-primary">{selectedSubjectId ? resolveSubjectInfo(selectedSubjectId, profile?.customFaecher).name : 'dieses Fach'}</strong>.</>
                    }{' '}
                    Das Ergebnis ist weniger auf deine Unterrichtsinhalte abgestimmt.
                  </p>

                  <button
                    onClick={() => { setShowNoNotesWarning(false); void handleGenerate() }}
                    className="w-full py-3.5 rounded-[16px] text-white font-semibold text-[15px] mb-3"
                    style={{ background: 'linear-gradient(145deg, #FB923C, #EA580C)' }}
                  >
                    Trotzdem generieren
                  </button>
                  <button
                    onClick={() => setShowNoNotesWarning(false)}
                    className="w-full py-3 text-center text-[14px] text-text-muted font-medium"
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP: GENERATING ─────────────────────────────────── */}
        {step === 'generating' && (
          <div className="flex flex-col items-center justify-center pt-20 gap-6">
            <div
              className="w-20 h-20 rounded-[24px] flex items-center justify-center"
              style={{ background: G_LERNZETTEL }}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <path d="M14 2v6h6" />
                <path d="M9 13h6M9 17h4" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-[18px] font-bold text-text-primary mb-1">Lernzettel wird erstellt</p>
              <p className="text-[13px] text-text-muted">
                {selectedNoteIds.length > 0
                  ? 'KI analysiert deine Smart Notes …'
                  : 'KI nutzt Kerncurriculum-Daten als Basis …'}
              </p>
            </div>
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full animate-bounce"
                  style={{ background: '#5AC8FA', animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
