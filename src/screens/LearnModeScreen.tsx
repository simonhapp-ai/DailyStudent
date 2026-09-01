import { useState } from 'react'
import { Progress } from '../components/ui/Progress'
import { Icon } from '../components/ui/Icon'
import { Tag } from '../components/ui/Tag'
import { EmptyState } from '../components/ui/EmptyState'
import { ListGroup, ListRow } from '../components/ui/ListGroup'
import { SubjectIcon } from '../components/ui/SubjectIcon'
import { useNavigate } from 'react-router-dom'
import { FlashCard } from '../components/learn/FlashCard'
import { Header } from '../components/ui/Header'
import { useUser } from '../context/UserContext'
import { resolveSubjectInfo } from '../data/subjectInfo'
import type { FlashCard as FlashCardType } from '../types'


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
    void addCoins('FLASHCARD_LEARNED').then((gain) => { if (gain > 0) showCoinToast(gain) })
  }

  const handleAgain = () => {
    setCardIndex((i) => (i + 1) % sessionCards.length)
  }

  // ── Session view ───────────────────────────────────────────────────────────
  if (view === 'session' && activeDeck) {
    return (
      <div className="flex flex-col min-h-dvh bg-background pb-24">
        <Header
          title={activeDeck.noteTitle}
          subtitle={activeDeck.subjectName}
          onBack={() => setView('library')}
        />
        <div className="px-4 flex-1">
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 min-w-0">
                <SubjectIcon subjectId={activeDeck.subjectId} size="sm" className="!w-6 !h-6" />
                <span className="text-[13px] font-semibold text-text-primary truncate">
                  {activeDeck.subjectName}
                </span>
              </span>
              <span className="text-[13px] text-text-secondary tabular-nums shrink-0">
                {cardIndex + 1} / {sessionCards.length}
                {knownCount > 0 && <span className="text-text-primary ml-1.5">· {knownCount} gewusst</span>}
              </span>
            </div>

            <Progress value={knownCount / sessionCards.length} className="-mt-2" />

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

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleAgain}
                className="h-12 rounded-pill bg-[rgb(120,120,128)]/[0.12] dark:bg-[rgb(120,120,128)]/[0.24] text-text-primary text-[15px] font-semibold press"
              >
                Nochmal
              </button>
              <button
                onClick={handleKnown}
                className="h-12 rounded-pill text-[15px] font-semibold press"
                style={{ background: 'rgb(var(--color-accent))', color: 'rgb(var(--color-on-accent))' }}
              >
                Weiß ich
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Library view ───────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-dvh bg-background pb-28">

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

        {/* Eine Pille wie ueberall sonst — der Knopf traegt die Modusfarbe,
            nicht einen eigenen Verlauf mit eigenem Schlagschatten. */}
        <button
          onClick={() => navigate('/klausurmodus/karteikarten/neu')}
          className="w-full h-12 rounded-pill flex items-center justify-center gap-2 font-semibold text-[15px] press"
          style={{ background: 'rgb(var(--color-accent))', color: 'rgb(var(--color-on-accent))' }}
        >
          <Icon name="plus" size={17} />
          Neue Karteikarten erstellen
        </button>

        {decks.length === 0 ? (
          <EmptyState
            title="Noch keine Karteikarten"
            note="Lass eine Notiz im Unterrichtsmodus analysieren — daraus macht die KI Fragen und Antworten."
            action={
              <button
                onClick={() => navigate('/klausurmodus/karteikarten/neu')}
                className="w-full h-12 rounded-pill font-semibold text-[15px] press"
                style={{ background: 'rgb(var(--color-accent))', color: 'rgb(var(--color-on-accent))' }}
              >
                Erstes Set erstellen
              </button>
            }
          />
        ) : (
          /* Nach Fach gruppiert: Das Fachzeichen traegt die Zeile, die
             Ueberschrift bleibt neutral. Der farbige Randstreifen und die
             zweite getoente Kachel waren zwei Anzeigen fuer dasselbe Fach. */
          Object.entries(subjectGroups).map(([subjectId, group]) => (
            <div key={subjectId} className="space-y-2.5">
              <div className="flex items-center gap-2 px-1">
                <SubjectIcon subjectId={subjectId} size="sm" className="!w-6 !h-6" />
                <p className="section-label">
                  {group.name}
                </p>
                <div className="flex-1 h-px bg-border/60" />
                <span className="text-[11px] text-text-secondary tabular-nums">
                  {group.decks.length} {group.decks.length === 1 ? 'Set' : 'Sets'}
                </span>
              </div>

              <ListGroup>
                {group.decks.map((deck) => (
                  <ListRow
                    key={deck.noteId}
                    leading={<SubjectIcon subjectId={subjectId} size="md" />}
                    title={deck.noteTitle}
                    subtitle={`${deck.cards.length} ${deck.cards.length === 1 ? 'Karte' : 'Karten'}`}
                    value={<Tag size="sm">Lernen</Tag>}
                    chevron
                    onClick={() => startSession(deck)}
                  />
                ))}
              </ListGroup>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
