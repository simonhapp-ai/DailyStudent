import { useState } from 'react'
import { EmptyState } from '../components/ui/EmptyState'
import { ListGroup, ListRow } from '../components/ui/ListGroup'
import { Icon } from '../components/ui/Icon'
import { SubjectIcon } from '../components/ui/SubjectIcon'
import { useNavigate } from 'react-router-dom'
import { Header } from '../components/ui/Header'
import { MathRenderer } from '../components/ui/MathRenderer'
import { ModusRegler, type ModusOption } from '../components/ui/ModusRegler'
import { ProModal } from '../components/ui/ProModal'
import { ClaudeWaitNote } from '../components/ui/ClaudeWaitNote'
import { PremiumKiToggle } from '../components/ui/PremiumKiToggle'
import { useUser } from '../context/UserContext'
import { generateLernzettel } from '../lib/gemini'
import { resolveEngine } from '../lib/studyEngine'
import { resolveSubjectInfo, getTopicPlaceholder } from '../data/subjectInfo'
import type { Lernzettel, LernzettelImage, LernzettelModus } from '../types'
import { zurueckZiel } from '../lib/appMode'

const G_LERNZETTEL = 'rgb(var(--color-accent))'

type Step = 'fach' | 'modus' | 'select' | 'generating'

const ICON_FAKTISCH = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M12 3L2 8l10 5 10-5-10-5z" />
    <path d="M6 10.5V16c0 1.1 2.7 2.5 6 2.5s6-1.4 6-2.5v-5.5" />
    <path d="M22 8v6" />
  </svg>
)
const ICON_BILDLICH = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="M21 15l-5-5L5 21" />
  </svg>
)
const ICON_GRUNDLAGEN = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </svg>
)
const ICON_STICHPUNKTE = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <line x1="9" y1="6" x2="21" y2="6" />
    <line x1="9" y1="12" x2="21" y2="12" />
    <line x1="9" y1="18" x2="21" y2="18" />
    <circle cx="4" cy="6" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="4" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="4" cy="18" r="1.2" fill="currentColor" stroke="none" />
  </svg>
)

const MODI: (ModusOption & { id: LernzettelModus })[] = [
  { id: 'faktisch', title: 'Faktisch', desc: 'Druckreif formuliert — jeder Fachbegriff präzise erklärt, ideal für Klausur-Formulierungen.', icon: ICON_FAKTISCH },
  { id: 'bildlich', title: 'Bildlich', desc: 'Mit Alltagsvergleichen und Analogien erklärt, als würdest du das Thema zum ersten Mal hören.', icon: ICON_BILDLICH },
  { id: 'grundlagen', title: 'Von Grund auf', desc: 'Beginnt bei den Voraussetzungen und baut systematisch zum eigentlichen Thema auf.', icon: ICON_GRUNDLAGEN },
  { id: 'stichpunkte', title: 'Stichpunkte', desc: 'Kompakte Bulletpoints für schnelles Wiederholen kurz vor der Klausur.', icon: ICON_STICHPUNKTE },
]

export function LernzettelGeneratorScreen() {
  const navigate = useNavigate()
  const { profile, userNotes, generatedNotes, getKc, saveLernzettel, recordStudyDay, addCoins, showCoinToast, lernzettel, appConfig, isPro, claudeTrialUsed, updateProfile } = useUser()

  const [step, setStep] = useState<Step>('fach')
  const [showProModal, setShowProModal] = useState(false)
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)
  const [selectedModus, setSelectedModus] = useState<LernzettelModus | null>(null)
  const [selectedTopics, setSelectedTopics] = useState<string[]>([])
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([])
  const [customTopicInput, setCustomTopicInput] = useState('')
  const [showNoNotesWarning, setShowNoNotesWarning] = useState(false)
  const [error, setError] = useState('')

  // Lernzettel läuft für Pro über Claude Sonnet (langsam, ~1–2 Min) — sonst Gemini (schnell).
  // Der Pro-Schalter (profile.claudeEnabled, Default an) kann Claude abschalten.
  const claudePref = profile?.claudeEnabled !== false
  const engine = resolveEngine({ isPro, claudeTrialUsed, claudePref })
  const usesClaude = engine.engine === 'claude'

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
    setSelectedModus(MODI[0].id)
    setSelectedTopics([])
    setSelectedNoteIds([])
    setError('')
    setStep('modus')
  }

  const handleConfirmModus = () => {
    if (!selectedModus) return
    setStep('select')
  }

  const today = new Date().toISOString().slice(0, 10)
  const todayLernzettelCount = lernzettel.filter((lz) => lz.generatedAt?.slice(0, 10) === today).length

  const handleGenerate = async () => {
    if (!selectedSubjectId || !selectedModus) return
    // Beta launch (migration 017_beta_mode_config.sql): Pro purchases are
    // paused, so a 1/day cap now applies to everyone, including dev-mode or
    // referral-trial "Pro" accounts — otherwise those would keep burning full
    // Lernzettel generations during the token-cost-sensitive beta window.
    // No effect once purchases resume (this whole check is skipped then).
    if (!appConfig.proPurchasesEnabled && todayLernzettelCount >= 1) {
      setShowProModal(true)
      return
    }
    const info = resolveSubjectInfo(selectedSubjectId, profile?.customFaecher)
    const subjectName = info?.name ?? selectedSubjectId
    const smartNotes = selectedNoteIds
      .map((id) => generatedNotes[id])
      .filter(Boolean)

    setStep('generating')
    setError('')

    try {
      const output = await generateLernzettel({
        subjectId: selectedSubjectId,
        subjectName,
        modus: selectedModus,
        selectedTopics,
        smartNotes,
        kcData: kcData ?? undefined,
      }, engine)

      // Rasterbilder sind derzeit deaktiviert (Gemini-Bildkontingent = 0). Abbildungen
      // liefert jetzt "figures" (client-gerendertes SVG/Tabelle) direkt aus dem Modell.
      const images: LernzettelImage[] = []

      const now = Date.now()
      const lz: Lernzettel = {
        id: `lz-${selectedSubjectId}-${now}`,
        subjectId: selectedSubjectId,
        subjectName,
        title: output.title,
        modus: selectedModus,
        selectedTopics,
        sourceNoteIds: selectedNoteIds,
        content: output.content,
        keywords: output.keywords,
        examTopics: output.examTopics,
        images,
        figures: output.figures.length > 0 ? output.figures : undefined,
        generatedAt: new Date().toISOString(),
        userNoteId: `lz-note-${selectedSubjectId}-${now}`,
        folderId: `folder-lernzettel-${selectedSubjectId}`,
      }

      saveLernzettel(lz)
      recordStudyDay()
      const gain = await addCoins('LERNZETTEL')
      if (gain > 0) showCoinToast(gain, 'LERNZETTEL')
      navigate('/klausurmodus/lernzettel', { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler beim Generieren')
      setStep('select')
    }
  }

  // Ein Fach kann nur einen Lernzettel liefern, wenn es analysierte Notizen hat.
  const faecherNachMaterial = availableSubjectIds.map((subjectId) => ({
    subjectId,
    info: resolveSubjectInfo(subjectId, profile?.customFaecher),
    noteCount: userNotes.filter((n) => n.subjectId === subjectId && generatedNotes[n.id]).length,
  }))
  const mitMaterial = faecherNachMaterial.filter((f) => f.noteCount > 0)
  const ohneMaterial = faecherNachMaterial.filter((f) => f.noteCount === 0)

  return (
    <div className="flex flex-col min-h-dvh bg-background pb-24">
      <Header
        title="Lernzettel erstellen"
        onBack={
          step === 'select'
            ? () => setStep('modus')
            : step === 'modus'
            ? () => { setStep('fach'); setSelectedSubjectId(null) }
            : () => navigate(zurueckZiel())
        }
      />

      <div className="px-4 mt-2 space-y-4">

        {/* Progress indicator */}
        {step !== 'generating' && (
          <div className="flex items-center gap-2">
            {(['fach', 'modus', 'select'] as const).map((s, i, arr) => {
              const active = step === s
              const done = arr.indexOf(step) > i
              return (
                <div key={s} className="flex items-center gap-2">
                  {i > 0 && <div className="h-px w-8 bg-border" />}
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold"
                      style={{
                        background: done
                          ? '#30D158'
                          : active
                          ? G_LERNZETTEL
                          : 'rgb(var(--color-border))',
                        color: 'white',
                      }}
                    >
                      {done ? <Icon name="check" size={13} /> : i + 1}
                    </div>
                    <span className={`text-[12px] font-medium ${active ? 'text-text-primary' : 'text-text-muted'}`}>
                      {s === 'fach' ? 'Fach' : s === 'modus' ? 'Modus' : 'Auswahl'}
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
            {mitMaterial.length > 0 && <p className="section-label px-0.5 mb-1">Fach wählen</p>}
            {availableSubjectIds.length === 0 ? (
              <EmptyState
                title="Keine Fächer ausgewählt"
                note="Wähle im Profil deine Fächer — danach kannst du daraus Lernzettel erstellen."
              />
            ) : (
              <>
                {/* Faecher MIT Material zuerst. Vorher standen alle in einer
                    Reihe, auch die ohne eine einzige analysierte Notiz — jede
                    davon fuehrte in einen leeren zweiten Schritt. Eine Zeile,
                    die sich anbieten laesst, muss auch irgendwohin fuehren. */}
                {mitMaterial.length > 0 && (
                  <ListGroup>
                    {mitMaterial.map(({ subjectId, info, noteCount }) => (
                      <ListRow
                        key={subjectId}
                        leading={<SubjectIcon subjectId={subjectId} size="md" />}
                        title={info?.name ?? subjectId}
                        subtitle={`${noteCount} Smart Note${noteCount !== 1 ? 's' : ''} verfügbar`}
                        chevron
                        onClick={() => handleSelectSubject(subjectId)}
                      />
                    ))}
                  </ListGroup>
                )}

                {ohneMaterial.length > 0 && (
                  <div className="pt-3">
                    <p className="section-label px-0.5 mb-2">Noch ohne Material</p>
                    <ListGroup>
                      {ohneMaterial.map(({ subjectId, info }) => (
                        <ListRow
                          key={subjectId}
                          className="opacity-70"
                          leading={<SubjectIcon subjectId={subjectId} size="md" />}
                          title={info?.name ?? subjectId}
                          subtitle="Erst eine Notiz analysieren lassen"
                          chevron
                          onClick={() => navigate(`/unterricht/${subjectId}`)}
                        />
                      ))}
                    </ListGroup>
                    <p className="text-[12px] text-text-secondary mt-2 px-0.5 leading-relaxed">
                      Ein Lernzettel entsteht aus deinen eigenen Notizen. Tippe ein Fach an,
                      um dort eine anzulegen.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── STEP: MODUS ───────────────────────────────────────── */}
        {step === 'modus' && (
          <div className="space-y-4">
            <p className="section-label px-0.5 mb-1">Wie soll der Lernzettel erklären?</p>
            <ModusRegler
              options={MODI}
              activeId={selectedModus ?? MODI[0].id}
              onChange={(id) => setSelectedModus(id as LernzettelModus)}
            />
            <button
              onClick={handleConfirmModus}
              className="w-full h-12 rounded-pill flex items-center justify-center font-semibold text-[15px] press"
              style={{ background: 'var(--grad-mode)', color: '#FFFFFF' }}
            >
              Weiter
            </button>
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
                            ? 'text-on-accent'
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
                      className="flex-1 bg-surface border border-border rounded-icon px-3.5 py-2.5 text-[13px] text-text-primary placeholder-text-muted focus:outline-none focus:border-[#5AC8FA] transition-colors"
                    />
                    <button
                      onClick={() => {
                        const t = customTopicInput.trim()
                        if (t && !selectedTopics.includes(t)) setSelectedTopics((prev) => [...prev, t])
                        setCustomTopicInput('')
                      }}
                      disabled={!customTopicInput.trim()}
                      className="px-4 py-2.5 rounded-icon text-on-accent text-[15px] font-bold transition-opacity"
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
                          className="flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-medium text-on-accent"
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
                <div className="bg-surface border border-border/60 rounded-card p-4 flex items-start gap-3">
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
                        className="w-full text-left press rounded-card border transition-all overflow-hidden"
                        style={
                          selected
                            ? { borderColor: 'rgb(var(--color-accent))', background: 'rgba(90,200,250,0.08)' }
                            : { borderColor: 'rgb(var(--color-border) / 0.6)', background: 'rgb(var(--color-surface))' }
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
                              <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full text-on-accent shrink-0" style={{ background: G_LERNZETTEL }}>
                                KI
                              </span>
                            </div>
                            {gen?.summary && (
                              <p className="text-[12px] text-text-muted leading-snug line-clamp-2"><MathRenderer text={gen.summary} /></p>
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

            {/* Premium-KI-Schalter (nur Pro) */}
            {isPro && (
              <PremiumKiToggle
                checked={claudePref}
                onChange={(v) => updateProfile({ claudeEnabled: v })}
                subtitle="Lernzettel von Claude — gründlicher formuliert, mit Diagrammen. Etwas langsamer (~1–2 Min). Aus = schneller über Gemini."
              />
            )}

            {/* Error banner */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-card p-3">
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
              className="w-full h-12 rounded-pill flex items-center justify-center gap-2 text-on-accent font-semibold text-[15px] press"
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
                  className="relative max-w-lg mx-auto w-full bg-surface rounded-t-[24px] px-5 pt-5 z-10"
                  style={{ paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom, 0px))' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />

                  {/* Icon */}
                  <div
                    className="w-12 h-12 rounded-card flex items-center justify-center mx-auto mb-4"
                    style={{ background: 'rgb(var(--fill-orange))' }}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--fill-orange-on))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                    className="w-full h-12 rounded-pill bg-[rgb(120,120,128)]/[0.12] dark:bg-[rgb(120,120,128)]/[0.24] text-[rgb(var(--fill-orange))] font-semibold text-[15px] mb-3 press"
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
              className="w-20 h-20 rounded-sheet flex items-center justify-center"
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
                  style={{ background: 'var(--grad-mode)', animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
            {usesClaude && <ClaudeWaitNote className="mt-2" />}
          </div>
        )}
      </div>

      <ProModal feature="lernzettel" isOpen={showProModal} onClose={() => setShowProModal(false)} />
    </div>
  )
}
