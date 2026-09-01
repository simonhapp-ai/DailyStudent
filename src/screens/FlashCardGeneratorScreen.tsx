import { useState, useEffect } from 'react'
import { EmptyState } from '../components/ui/EmptyState'
import { ListGroup, ListRow } from '../components/ui/ListGroup'
import { SubjectIcon } from '../components/ui/SubjectIcon'
import { Icon } from '../components/ui/Icon'
import { useNavigate, useLocation } from 'react-router-dom'
import { Header } from '../components/ui/Header'
import { useUser } from '../context/UserContext'
import { generateFlashcards } from '../lib/groq'
import { resolveSubjectInfo } from '../data/subjectInfo'
import type { FlashCard } from '../types'

type Step = 'fach' | 'note' | 'method' | 'generating'
type Method = 'ki' | 'manuell'

const COUNT_OPTIONS = [5, 10, 15, 20]

interface PrefillState {
  prefilledSubjectId?: string
  prefilledNoteId?: string
}

export function FlashCardGeneratorScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const prefill = (location.state as PrefillState | null)
  const { profile, userNotes, generatedNotes, saveFlashCards, getKc } = useUser()

  const [step, setStep] = useState<Step>(
    prefill?.prefilledSubjectId && prefill?.prefilledNoteId ? 'generating' : 'fach'
  )
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(prefill?.prefilledSubjectId ?? null)
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>(
    prefill?.prefilledNoteId ? [prefill.prefilledNoteId] : []
  )
  const [method, setMethod] = useState<Method>('ki')
  const [cardCount, setCardCount] = useState(10)
  const [manualCards, setManualCards] = useState<Array<{ front: string; back: string }>>([
    { front: '', back: '' },
  ])
  const [error, setError] = useState('')

  // Auto-generate on mount when prefill is provided from SmartNotes detail
  useEffect(() => {
    if (!prefill?.prefilledSubjectId || !prefill?.prefilledNoteId) return
    const subjectId = prefill.prefilledSubjectId
    const noteId = prefill.prefilledNoteId
    const genNote = generatedNotes[noteId]
    if (!genNote) { setStep('fach'); return }

    void (async () => {
      try {
        const pairs = await generateFlashcards(genNote, 10, getKc(subjectId) ?? undefined)
        const cards: FlashCard[] = pairs.map((p, i) => ({
          id: `fc-${noteId}-${i}-${Date.now()}`,
          subjectId,
          noteId,
          front: p.front,
          back: p.back,
          keywords: p.keywords ?? [],
          createdAt: new Date().toISOString(),
        }))
        saveFlashCards(cards)
        navigate('/klausurmodus/lernen', { replace: true })
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Fehler beim Generieren')
        setStep('fach')
      }
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const availableSubjects = (profile?.faecher ?? []).map((id) => ({
    id,
    ...resolveSubjectInfo(id, profile?.customFaecher),
  }))

  const notesForSubject = selectedSubjectId
    ? userNotes
        .filter((n) => n.subjectId === selectedSubjectId && generatedNotes[n.id])
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    : []

  const selectedSubject = selectedSubjectId
    ? resolveSubjectInfo(selectedSubjectId, profile?.customFaecher)
    : null

  const handleSelectSubject = (subjectId: string) => {
    setSelectedSubjectId(subjectId)
    setSelectedNoteIds([])
    setStep('note')
    setError('')
  }

  const toggleNote = (noteId: string) => {
    setSelectedNoteIds((prev) =>
      prev.includes(noteId) ? prev.filter((id) => id !== noteId) : [...prev, noteId]
    )
  }

  const handleGenerateKI = async () => {
    if (selectedNoteIds.length === 0 || !selectedSubjectId) return
    setStep('generating')
    setError('')
    try {
      const countPerNote = Math.max(1, Math.ceil(cardCount / selectedNoteIds.length))
      const allCards: FlashCard[] = []

      for (const noteId of selectedNoteIds) {
        const genNote = generatedNotes[noteId]
        if (!genNote) continue
        const pairs = await generateFlashcards(genNote, countPerNote, getKc(selectedSubjectId) ?? undefined)
        const cards: FlashCard[] = pairs.map((p, i) => ({
          id: `fc-${noteId}-${i}-${Date.now()}`,
          subjectId: selectedSubjectId,
          noteId,
          front: p.front,
          back: p.back,
          keywords: p.keywords ?? [],
          createdAt: new Date().toISOString(),
        }))
        allCards.push(...cards)
      }

      saveFlashCards(allCards.slice(0, cardCount))
      navigate('/klausurmodus/lernen')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler beim Generieren')
      setStep('method')
    }
  }

  const handleSaveManual = () => {
    const valid = manualCards.filter((c) => c.front.trim() && c.back.trim())
    if (valid.length === 0) {
      setError('Mindestens eine Karte muss Vorder- und Rückseite haben.')
      return
    }
    const deckId = `manual-${selectedSubjectId}-${Date.now()}`
    const cards: FlashCard[] = valid.map((c, i) => ({
      id: `fc-manual-${i}-${Date.now()}`,
      subjectId: selectedSubjectId!,
      noteId: deckId,
      front: c.front,
      back: c.back,
      keywords: [],
      createdAt: new Date().toISOString(),
    }))
    saveFlashCards(cards)
    navigate('/klausurmodus/lernen')
  }

  const STEPS = ['Fach', 'Notizen', 'Methode']
  const stepIndex = step === 'fach' ? 0 : step === 'note' ? 1 : 2
  const validManualCount = manualCards.filter((c) => c.front.trim() && c.back.trim()).length

  return (
    <div className="flex flex-col min-h-dvh bg-background pb-24">
      <Header
        title="Karteikarten erstellen"
        onBack={() => {
          if (step === 'note') setStep('fach')
          else if (step === 'method') setStep('note')
          else navigate(-1)
        }}
      />

      <div className="px-4 mt-2 space-y-4">

        {/* ── Progress bar ───────────────────────────────────────── */}
        {step !== 'generating' && (
          <div className="flex items-center gap-2">
            {STEPS.map((label, i) => {
              const active = i === stepIndex
              const done = i < stepIndex
              return (
                <div key={label} className="flex items-center gap-2">
                  {i > 0 && <div className="h-px w-8 bg-border" />}
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold transition-all"
                      style={{
                        background: done
                          ? 'rgb(var(--fill-green))'
                          : active
                          ? '#34D399'
                          : 'rgb(var(--color-border))',
                        color: done
                          ? 'rgb(var(--fill-green-on))'
                          : active
                          ? '#062017'
                          : 'rgb(var(--color-text-muted))',
                      }}
                    >
                      {done ? <Icon name="check" size={13} /> : i + 1}
                    </div>
                    <span className={`text-xs font-medium ${active ? 'text-text-primary' : 'text-text-muted'}`}>
                      {label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Step 1: Fach wählen ────────────────────────────────── */}
        {step === 'fach' && (
          <div className="space-y-2">
            <p className="section-label px-1">Für welches Fach?</p>
            {availableSubjects.length === 0 ? (
              <EmptyState
                title="Keine Fächer ausgewählt"
                note="Wähle im Profil deine Fächer — danach kannst du daraus Karteikarten erstellen."
                action={
                  <button
                    onClick={() => navigate('/profil/faecher')}
                    className="w-full h-12 rounded-pill font-semibold text-[15px] press"
                    style={{ background: '#34D399', color: '#062017' }}
                  >
                    Fächer auswählen
                  </button>
                }
              />
            ) : (
              <ListGroup>
                {availableSubjects.map((subject) => {
                  const noteCount = userNotes.filter(
                    (n) => n.subjectId === subject.id && generatedNotes[n.id]
                  ).length
                  return (
                    <ListRow
                      key={subject.id}
                      leading={<SubjectIcon subjectId={subject.id} size="md" />}
                      title={subject.name}
                      subtitle={
                        noteCount > 0
                          ? `${noteCount} analysierte Notiz${noteCount > 1 ? 'en' : ''}`
                          : 'Noch keine analysierten Notizen'
                      }
                      chevron
                      onClick={() => handleSelectSubject(subject.id)}
                    />
                  )
                })}
              </ListGroup>
            )}
          </div>
        )}

        {/* ── Step 2: Smart Note(n) wählen ──────────────────────── */}
        {step === 'note' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <p className="section-label">
                Notizen aus {selectedSubject?.name}
                {selectedNoteIds.length > 0 && (
                  <span
                    className="ml-2 px-1.5 py-0.5 rounded-full text-[11px] font-bold"
                    style={{ background: '#34D399', color: '#062017' }}
                  >
                    {selectedNoteIds.length}
                  </span>
                )}
              </p>
              {selectedNoteIds.length > 0 && (
                <button
                  className="text-xs font-bold px-3 py-1.5 rounded-pill press-sm"
                  style={{ background: '#34D399', color: '#062017' }}
                  onClick={() => setStep('method')}
                >
                  Weiter
                </button>
              )}
            </div>

            {notesForSubject.length === 0 ? (
              <EmptyState
                title="Noch keine analysierten Notizen"
                note="Öffne eine Notiz im Unterrichtsmodus und lass sie analysieren — daraus entstehen die Karten."
                action={
                <button
                  onClick={() => navigate('/unterricht')}
                  className="w-full h-12 rounded-pill on-mint text-[15px] font-semibold press"
                  style={{ background: '#34D399' }}
                >
                  Zum Unterrichtsmodus
                </button>
                }
              />
            ) : (
              notesForSubject.map((note) => {
                const genNote = generatedNotes[note.id]
                const isSelected = selectedNoteIds.includes(note.id)
                return (
                  <button
                    key={note.id}
                    onClick={() => toggleNote(note.id)}
                    className={`w-full bg-surface border rounded-card px-4 py-4 text-left press transition-colors ${
                      isSelected ? 'border-[#34D399]' : 'border-border hover:border-[#34D399]/40'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Circle checkbox */}
                      <div
                        className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all"
                        style={{
                          borderColor: isSelected ? '#34D399' : 'rgb(var(--color-border))',
                          background: isSelected ? '#34D399' : 'transparent',
                        }}
                      >
                        {isSelected && (
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="#062017" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-text-primary font-semibold text-[14px] leading-snug">{note.title}</p>
                        {genNote?.summary && (
                          <p className="text-text-muted text-xs mt-1 leading-relaxed line-clamp-2">
                            {genNote.summary}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs px-1.5 py-0.5 rounded bg-fill-green text-fill-green-on font-medium">
                            KI analysiert
                          </span>
                          {genNote?.keywords && (
                            <span className="text-text-muted text-xs">{genNote.keywords.length} Begriffe</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        )}

        {/* ── Step 3: Methode ────────────────────────────────────── */}
        {step === 'method' && (
          <div className="space-y-4">
            {/* Tab switcher */}
            <div className="flex gap-1.5 bg-surface border border-border rounded-[14px] p-1">
              {(['ki', 'manuell'] as Method[]).map((m) => (
                <button
                  key={m}
                  onClick={() => { setMethod(m); setError('') }}
                  className={`flex-1 py-2.5 rounded-[10px] text-[13px] font-semibold transition-all press-sm ${
                    method === m ? 'on-mint' : 'text-text-muted'
                  }`}
                  style={method === m ? { background: '#34D399' } : {}}
                >
                  <span className="inline-flex items-center gap-1.5"><Icon name={m === 'ki' ? 'sparkle' : 'pencil'} size={15} />{m === 'ki' ? 'KI generieren' : 'Manuell erstellen'}</span>
                </button>
              ))}
            </div>

            {/* ── KI Pfad ──────────────────────────────────────── */}
            {method === 'ki' && (
              <div className="space-y-4">
                <div className="bg-surface border border-border rounded-[16px] p-4">
                  <p className="section-label mb-3">Wie viele Karten?</p>
                  <div className="flex gap-2">
                    {COUNT_OPTIONS.map((n) => (
                      <button
                        key={n}
                        onClick={() => setCardCount(n)}
                        className={`flex-1 py-2.5 rounded-[10px] text-sm font-bold press-sm transition-all ${
                          cardCount === n ? 'on-mint' : 'text-text-muted'
                        }`}
                        style={
                          cardCount === n
                            ? { background: '#34D399' }
                            : { background: 'rgb(var(--color-border) / 0.3)' }
                        }
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-text-muted mt-2.5">
                    {selectedNoteIds.length} Notiz{selectedNoteIds.length !== 1 ? 'en' : ''} ·{' '}
                    je ~{Math.max(1, Math.ceil(cardCount / selectedNoteIds.length))} Karten pro Notiz
                  </p>
                </div>

                {error && (
                  <div className="bg-danger/10 border border-danger/30 rounded-card px-4 py-3">
                    <p className="text-text-primary text-sm">{error}</p>
                  </div>
                )}

                <button
                  onClick={handleGenerateKI}
                  className="w-full py-3.5 rounded-[14px] font-bold text-[15px] press"
                  style={{ background: '#34D399', color: '#062017' }}
                >
                  {cardCount} Karten mit KI erstellen
                </button>
              </div>
            )}

            {/* ── Manuell Pfad ─────────────────────────────────── */}
            {method === 'manuell' && (
              <div className="space-y-3">
                {error && (
                  <div className="bg-danger/10 border border-danger/30 rounded-card px-4 py-3">
                    <p className="text-text-primary text-sm">{error}</p>
                  </div>
                )}

                {manualCards.map((card, idx) => (
                  <div key={idx} className="bg-surface border border-border rounded-[16px] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-bold text-text-muted uppercase tracking-wide">
                        Karte {idx + 1}
                      </p>
                      {manualCards.length > 1 && (
                        <button
                          onClick={() => setManualCards((prev) => prev.filter((_, i) => i !== idx))}
                          className="w-6 h-6 rounded-full flex items-center justify-center press-sm"
                          style={{ background: 'rgb(var(--color-danger) / 0.12)' }}
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" style={{ stroke: 'rgb(var(--color-danger))' }}>
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-text-muted mb-1.5">Vorderseite (Frage)</p>
                      <textarea
                        value={card.front}
                        onChange={(e) =>
                          setManualCards((prev) =>
                            prev.map((c, i) => (i === idx ? { ...c, front: e.target.value } : c))
                          )
                        }
                        placeholder="Frage oder Begriff…"
                        rows={2}
                        className="w-full bg-background border border-border rounded-[10px] px-3 py-2.5 text-[14px] text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:border-accent/60 transition-colors"
                      />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-text-muted mb-1.5">Rückseite (Antwort)</p>
                      <textarea
                        value={card.back}
                        onChange={(e) =>
                          setManualCards((prev) =>
                            prev.map((c, i) => (i === idx ? { ...c, back: e.target.value } : c))
                          )
                        }
                        placeholder="Antwort oder Erklärung…"
                        rows={2}
                        className="w-full bg-background border border-border rounded-[10px] px-3 py-2.5 text-[14px] text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:border-accent/60 transition-colors"
                      />
                    </div>
                  </div>
                ))}

                <button
                  onClick={() => setManualCards((prev) => [...prev, { front: '', back: '' }])}
                  className="w-full py-3 rounded-[14px] border-2 border-dashed text-text-muted text-sm font-semibold press-sm hover:border-accent/40 transition-colors"
                  style={{ borderColor: 'rgb(var(--color-border))' }}
                >
                  + Karte hinzufügen
                </button>

                <button
                  onClick={handleSaveManual}
                  disabled={validManualCount === 0}
                  className="w-full py-3.5 rounded-[14px] on-mint font-bold text-[15px] press disabled:opacity-40"
                  style={{ background: '#34D399' }}
                >
                  {validManualCount > 0 ? `${validManualCount} Karte${validManualCount !== 1 ? 'n' : ''} speichern` : 'Karten speichern'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Generating ────────────────────────────────────────── */}
        {step === 'generating' && (
          <div className="flex flex-col items-center justify-center py-16 gap-5">
            <div
              className="w-16 h-16 rounded-[20px] flex items-center justify-center"
              style={{ background: '#34D399' }}
            >
              <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#062017" strokeWidth="2.5">
                <path d="M21 12a9 9 0 11-6.219-8.56" strokeLinecap="round" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-text-primary font-bold text-[17px]">Karteikarten werden erstellt</p>
              <p className="text-text-muted text-sm mt-1">
                {selectedNoteIds.length > 1
                  ? `${selectedNoteIds.length} Notizen werden verarbeitet…`
                  : 'Llama 3.3 generiert Fragen aus deiner Smart Note…'}
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
