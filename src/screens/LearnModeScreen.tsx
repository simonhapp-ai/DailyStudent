import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FlashCard } from '../components/learn/FlashCard'
import { Button } from '../components/ui/Button'
import { Header } from '../components/ui/Header'
import { useUser } from '../context/UserContext'
import { resolveSubjectInfo } from '../data/subjectInfo'
import type { FlashCard as FlashCardType } from '../types'

const GREEN = 'linear-gradient(145deg, #34D399 0%, #059669 100%)'

type View = 'library' | 'session'

interface Deck {
  noteId: string
  cards: FlashCardType[]
  noteTitle: string
  subjectId: string
  subjectName: string
  subjectColor: string
  subjectIcon: string
  createdAt: string
}

export function LearnModeScreen() {
  const [view, setView] = useState<View>('library')
  const [activeDeck, setActiveDeck] = useState<Deck | null>(null)
  const [cardIndex, setCardIndex] = useState(0)
  const [knownCount, setKnownCount] = useState(0)
  const navigate = useNavigate()
  const { generatedFlashCards, userNotes, profile, recordStudyDay, addCoins, showCoinToast } = useUser()

  // ── Build decks ────────────────────────────────────────────────────────────
  const deckMap = generatedFlashCards.reduce<Record<string, FlashCardType[]>>((acc, card) => {
    const key = card.noteId ?? '_ungrouped'
    if (!acc[key]) acc[key] = []
    acc[key].push(card)
    return acc
  }, {})

  const decks: Deck[] = Object.entries(deckMap).map(([noteId, cards]) => {
    const subjectId = cards[0]?.subjectId ?? ''
    const info = resolveSubjectInfo(subjectId, profile?.customFaecher)
    const note = userNotes.find((n) => n.id === noteId)
    return {
      noteId,
      cards,
      noteTitle: note?.title ?? 'Notiz',
      subjectId,
      subjectName: info.name,
      subjectColor: info.color,
      subjectIcon: info.icon,
      createdAt: cards[0]?.createdAt ?? '',
    }
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  // Group by subject
  const subjectGroups = decks.reduce<Record<string, { name: string; color: string; icon: string; decks: Deck[] }>>((acc, deck) => {
    const key = deck.subjectId || '_other'
    if (!acc[key]) acc[key] = { name: deck.subjectName, color: deck.subjectColor, icon: deck.subjectIcon, decks: [] }
    acc[key].decks.push(deck)
    return acc
  }, {})

  // ── Session controls ───────────────────────────────────────────────────────
  const sessionCards = activeDeck?.cards ?? []
  const currentCard = sessionCards[cardIndex]
  const cardSubject = currentCard ? resolveSubjectInfo(currentCard.subjectId, profile?.customFaecher) : undefined

  const startSession = (deck: Deck) => {
    setActiveDeck(deck)
    setCardIndex(0)
    setKnownCount(0)
    setView('session')
  }

  const handleKnown = () => {
    setKnownCount((n) => n + 1)
    setCardIndex((i) => (i + 1) % sessionCards.length)
    recordStudyDay()
    const gain = addCoins('FLASHCARD_LEARNED')
    if (gain > 0) showCoinToast(gain)
  }

  const handleAgain = () => {
    setCardIndex((i) => (i + 1) % sessionCards.length)
  }

  // ── Session view ───────────────────────────────────────────────────────────
  if (view === 'session' && activeDeck) {
    return (
      <div className="flex flex-col min-h-screen bg-background pb-24">
        <Header
          title={activeDeck.noteTitle}
          subtitle={activeDeck.subjectName}
          onBack={() => setView('library')}
        />
        <div className="px-4 flex-1">
          <div className="space-y-6">
            <div className="flex items-center justify-between text-sm text-text-muted">
              <span
                className="text-xs font-semibold px-2 py-1 rounded-pill"
                style={{ backgroundColor: `${activeDeck.subjectColor}22`, color: activeDeck.subjectColor }}
              >
                {activeDeck.subjectIcon} {activeDeck.subjectName}
              </span>
              <span>
                {cardIndex + 1} / {sessionCards.length}
                {knownCount > 0 && (
                  <span className="text-success ml-1.5">· {knownCount} gewusst</span>
                )}
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 bg-border/40 rounded-pill overflow-hidden -mt-2">
              <div
                className="h-full rounded-pill transition-all duration-300"
                style={{
                  width: `${Math.round((knownCount / sessionCards.length) * 100)}%`,
                  background: 'linear-gradient(90deg, #34D399, #059669)',
                }}
              />
            </div>

            <div className="relative" style={{ height: '260px' }}>
              <FlashCard
                key={cardIndex}
                front={currentCard.front}
                back={currentCard.back}
                subjectName={cardSubject?.name}
                subjectColor={cardSubject?.color}
                keywords={currentCard.keywords ?? []}
              />
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={handleAgain}>
                Nochmal
              </Button>
              <button
                onClick={handleKnown}
                className="flex-1 py-3 rounded-card text-white text-sm font-semibold press transition-opacity hover:opacity-90"
                style={{ background: 'linear-gradient(145deg, #34D399, #059669)' }}
              >
                Weiß ich ✓
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Library view ───────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen bg-background pb-28">

      {/* Header */}
      <div className="px-4" style={{ paddingTop: 'max(58px, calc(env(safe-area-inset-top, 0px) + 18px))' }}>
        <h1 className="text-[28px] font-bold text-text-primary">Karteikarten</h1>
        <p className="text-[13px] text-text-muted mt-0.5">
          {decks.length > 0
            ? `${decks.length} Set${decks.length > 1 ? 's' : ''} · ${generatedFlashCards.length} Karten gesamt`
            : 'Noch keine Karteikarten erstellt'}
        </p>
      </div>

      <div className="px-4 mt-5 space-y-5">

        {/* ── Neue Karten erstellen ─────────────────────────────────────── */}
        <button
          onClick={() => navigate('/klausurmodus/karteikarten/neu')}
          className="w-full rounded-[16px] px-4 py-3.5 flex items-center gap-3 text-left press hover:opacity-95 transition-opacity"
          style={{ background: GREEN, boxShadow: '0 3px 12px rgba(5, 150, 105, 0.25)' }}
        >
          <div className="w-8 h-8 rounded-[10px] bg-white/20 flex items-center justify-center shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="7" y="7" width="13" height="12" rx="2.5" strokeOpacity="0.6" />
              <rect x="4" y="9" width="13" height="12" rx="2.5" />
              <line x1="10.5" y1="13" x2="10.5" y2="17" />
              <line x1="8.5" y1="15" x2="12.5" y2="15" />
            </svg>
          </div>
          <p className="text-white font-semibold text-[14px]">Neue Karteikarten erstellen</p>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeOpacity="0.6" className="ml-auto shrink-0">
            <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* ── Deck-Bibliothek ───────────────────────────────────────────── */}
        {decks.length === 0 ? (
          <div className="bg-surface border border-border/60 rounded-[20px] px-5 py-10 flex flex-col items-center text-center gap-3">
            <div className="w-14 h-14 rounded-[16px] bg-border/30 flex items-center justify-center">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-muted" strokeLinecap="round" strokeLinejoin="round">
                <rect x="7" y="7" width="13" height="12" rx="2.5" strokeOpacity="0.5" />
                <rect x="4" y="9" width="13" height="12" rx="2.5" />
                <line x1="7" y1="14" x2="14" y2="14" />
                <line x1="7" y1="16.5" x2="11" y2="16.5" />
              </svg>
            </div>
            <div>
              <p className="text-text-primary font-semibold text-[15px]">Keine Karten vorhanden</p>
              <p className="text-text-muted text-[13px] mt-1 leading-relaxed max-w-[220px]">
                Erstelle dein erstes Set aus einer analysierten Smart Note.
              </p>
            </div>
          </div>
        ) : (
          Object.entries(subjectGroups).map(([subjectId, group]) => (
            <div key={subjectId}>

              {/* Subject label */}
              <div className="flex items-center gap-2 px-1 mb-2.5">
                <span className="text-base">{group.icon}</span>
                <p
                  className="text-[12px] font-bold uppercase tracking-widest"
                  style={{ color: group.color }}
                >
                  {group.name}
                </p>
                <div className="flex-1 h-px" style={{ background: `${group.color}30` }} />
              </div>

              {/* Deck cards */}
              <div className="space-y-2.5">
                {group.decks.map((deck) => (
                  <button
                    key={deck.noteId}
                    onClick={() => startSession(deck)}
                    className="w-full bg-surface border border-border/60 rounded-[18px] shadow-card-adaptive overflow-hidden flex items-stretch text-left press hover:border-border transition-colors"
                  >
                    {/* Left color accent */}
                    <div
                      className="w-1 shrink-0 rounded-l-[18px]"
                      style={{ background: deck.subjectColor }}
                    />

                    <div className="flex-1 px-4 py-4 flex items-center gap-3">
                      {/* Icon */}
                      <div
                        className="w-11 h-11 rounded-[13px] flex items-center justify-center shrink-0 text-lg"
                        style={{ backgroundColor: `${deck.subjectColor}18` }}
                      >
                        {deck.subjectIcon}
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <p className="text-text-primary font-semibold text-[14px] leading-snug line-clamp-2">{deck.noteTitle}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span
                            className="text-[11px] font-bold px-2 py-0.5 rounded-pill"
                            style={{ backgroundColor: `${deck.subjectColor}18`, color: deck.subjectColor }}
                          >
                            {deck.cards.length} Karten
                          </span>
                        </div>
                      </div>

                      {/* Play button */}
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: `${deck.subjectColor}18` }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" className="ml-0.5" style={{ stroke: deck.subjectColor }}>
                          <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
