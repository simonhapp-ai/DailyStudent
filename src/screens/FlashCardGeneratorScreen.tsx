import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Header } from '../components/ui/Header'
import { useUser } from '../context/UserContext'
import { generateFlashcards } from '../lib/groq'
import { subjects } from '../data/mockData'
import type { FlashCard } from '../types'

type Step = 'fach' | 'note' | 'generating'

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
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(
    prefill?.prefilledSubjectId ?? null
  )
  const [error, setError] = useState('')

  // Auto-generate on mount when prefill is provided from Lernzettel detail
  useEffect(() => {
    if (!prefill?.prefilledSubjectId || !prefill?.prefilledNoteId) return
    const subjectId = prefill.prefilledSubjectId
    const noteId = prefill.prefilledNoteId
    const genNote = generatedNotes[noteId]
    if (!genNote) { setStep('fach'); return }

    void (async () => {
      try {
        const pairs = await generateFlashcards(genNote, 7, getKc(subjectId) ?? undefined)
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

  const availableSubjects = subjects.filter((s) => profile?.faecher.includes(s.id))

  const notesForSubject = selectedSubjectId
    ? userNotes
        .filter((n) => n.subjectId === selectedSubjectId && generatedNotes[n.id])
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    : []

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId)

  const handleSelectSubject = (subjectId: string) => {
    setSelectedSubjectId(subjectId)
    setStep('note')
    setError('')
  }

  const handleGenerateFromNote = async (noteId: string) => {
    const genNote = generatedNotes[noteId]
    if (!genNote) return
    setStep('generating')
    setError('')
    try {
      const pairs = await generateFlashcards(genNote, 7, getKc(selectedSubjectId ?? '') ?? undefined)
      const cards: FlashCard[] = pairs.map((p, i) => ({
        id: `fc-${noteId}-${i}-${Date.now()}`,
        subjectId: selectedSubjectId!,
        noteId,
        front: p.front,
        back: p.back,
        keywords: p.keywords ?? [],
        createdAt: new Date().toISOString(),
      }))
      saveFlashCards(cards)
      navigate('/klausurmodus/lernen')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler beim Generieren')
      setStep('note')
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      <Header
        title="Karteikarten erstellen"
        onBack={step === 'note' ? () => setStep('fach') : () => navigate(-1)}
      />

      <div className="px-4 mt-2 space-y-3">

        {/* Fortschrittsanzeige */}
        <div className="flex items-center gap-2 mb-2">
          {(['fach', 'note'] as const).map((s, i) => {
            const active = step === s || (step === 'generating' && s === 'note')
            const done = (s === 'fach' && (step === 'note' || step === 'generating'))
            return (
              <div key={s} className="flex items-center gap-2">
                {i > 0 && <div className="h-px w-8 bg-border" />}
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{
                      background: done ? 'rgb(var(--color-success))' : active ? 'linear-gradient(135deg, #A78BFA, #6D28D9)' : 'rgb(var(--color-border))',
                      color: done || active ? 'white' : 'rgb(var(--color-text-muted))',
                    }}
                  >
                    {done ? '✓' : i + 1}
                  </div>
                  <span className={`text-xs font-medium ${active ? 'text-text-primary' : 'text-text-muted'}`}>
                    {s === 'fach' ? 'Fach' : 'Smart Note'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Schritt 1: Fach wählen */}
        {step === 'fach' && (
          <div className="space-y-2">
            <p className="section-label px-1">Für welches Fach möchtest du Karten erstellen?</p>
            {availableSubjects.length === 0 ? (
              <div className="bg-surface border border-border rounded-card px-4 py-6 text-center">
                <p className="text-text-muted text-sm">Keine Fächer gefunden. Bitte erst Fächer im Profil auswählen.</p>
              </div>
            ) : (
              availableSubjects.map((subject) => {
                const noteCount = userNotes.filter(
                  (n) => n.subjectId === subject.id && generatedNotes[n.id],
                ).length
                return (
                  <button
                    key={subject.id}
                    onClick={() => handleSelectSubject(subject.id)}
                    className="w-full bg-surface border border-border rounded-card px-4 py-4 flex items-center gap-4 text-left press hover:border-accent/40 transition-colors"
                  >
                    <div
                      className="w-10 h-10 rounded-[12px] flex items-center justify-center text-lg shrink-0"
                      style={{ backgroundColor: `${subject.color}22` }}
                    >
                      {subject.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-text-primary font-semibold text-[15px]">{subject.name}</p>
                      <p className="text-text-muted text-xs mt-0.5">
                        {noteCount > 0
                          ? `${noteCount} analysierte Smart Note${noteCount > 1 ? 'n' : ''}`
                          : 'Noch keine analysierten Notizen'}
                      </p>
                    </div>
                    {noteCount > 0 && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted shrink-0">
                        <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                )
              })
            )}
          </div>
        )}

        {/* Schritt 2: Smart Note wählen */}
        {step === 'note' && (
          <div className="space-y-2">
            <p className="section-label px-1">
              Welche Smart Note aus {selectedSubject?.name}?
            </p>

            {error && (
              <div className="bg-error/10 border border-error/30 rounded-card px-4 py-3">
                <p className="text-error text-sm">{error}</p>
              </div>
            )}

            {notesForSubject.length === 0 ? (
              <div className="bg-surface border border-border rounded-card px-4 py-8 text-center space-y-2">
                <p className="text-text-primary text-sm font-medium">Noch keine analysierten Notizen</p>
                <p className="text-text-muted text-xs leading-relaxed">
                  Öffne eine Notiz aus dem Unterrichtsmodus und tippe auf „Neu analysieren" um eine Smart Note zu erstellen.
                </p>
                <button
                  onClick={() => navigate('/unterricht')}
                  className="mt-3 px-4 py-2 rounded-pill text-white text-sm font-semibold press-sm"
                  style={{ background: 'linear-gradient(135deg, #A78BFA, #6D28D9)' }}
                >
                  Zum Unterrichtsmodus
                </button>
              </div>
            ) : (
              notesForSubject.map((note) => {
                const genNote = generatedNotes[note.id]
                return (
                  <button
                    key={note.id}
                    onClick={() => handleGenerateFromNote(note.id)}
                    className="w-full bg-surface border border-border rounded-card px-4 py-4 text-left press hover:border-accent/40 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 mt-0.5"
                        style={{ backgroundColor: `${selectedSubject?.color ?? '#007AFF'}22` }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={selectedSubject?.color ?? '#007AFF'} strokeWidth="1.8" strokeLinecap="round">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                          <path d="M14 2v6h6M9 13h6M9 17h4" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-text-primary font-semibold text-[14px] leading-snug">{note.title}</p>
                        {genNote?.summary && (
                          <p className="text-text-muted text-xs mt-1 leading-relaxed line-clamp-2">{genNote.summary}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs px-1.5 py-0.5 rounded bg-success/10 text-success font-medium">KI analysiert</span>
                          {genNote?.keywords && (
                            <span className="text-text-muted text-xs">{genNote.keywords.length} Begriffe</span>
                          )}
                        </div>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted shrink-0 mt-1">
                        <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        )}

        {/* Schritt 3: Generierung läuft */}
        {step === 'generating' && (
          <div className="flex flex-col items-center justify-center py-16 gap-5">
            <div
              className="w-16 h-16 rounded-[20px] flex items-center justify-center"
              style={{ background: 'linear-gradient(145deg, #34D399, #059669)' }}
            >
              <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M21 12a9 9 0 11-6.219-8.56" strokeLinecap="round" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-text-primary font-bold text-[17px]">Karteikarten werden erstellt</p>
              <p className="text-text-muted text-sm mt-1">Llama 3.3 generiert Fragen aus deiner Smart Note…</p>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
