import { useState } from 'react'
import { SubjectIcon } from '../components/ui/SubjectIcon'
import { EmptyState } from '../components/ui/EmptyState'
import { Tag } from '../components/ui/Tag'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Header } from '../components/ui/Header'
import { ProModal } from '../components/ui/ProModal'
import { RichText } from '../components/ui/RichText'
import { useUser } from '../context/UserContext'
import { SUBJECT_INFO } from '../data/subjectInfo'
import { Dialog } from '../components/ui/Dialog'
import type { Lernzettel } from '../types'
import { Icon } from '../components/ui/Icon'

const G_LERNZETTEL = '#34D399'

type View = 'library' | 'detail'

const PREVIEWS = [
  {
    id: 'physik-quanten',
    src: '/lernzettel-previews/physik-quantenobjekte-preview.html',
    fullSrc: '/lernzettel-previews/physik-quantenobjekte.html',
    subject: 'Physik',
    title: 'Quantenobjekte & Doppelspalt',
    color: '#1a3d6b',
  },
  {
    id: 'bio-oeko',
    src: '/lernzettel-previews/bio-oekologie-preview.html',
    fullSrc: '/lernzettel-previews/bio-oekologie.html',
    subject: 'Biologie',
    title: 'Kohlenstoffkreislauf & Ökosysteme',
    color: '#2a6e4a',
  },
  {
    id: 'bio-neuro',
    src: '/lernzettel-previews/bio-neurobiologie-preview.html',
    fullSrc: '/lernzettel-previews/bio-neurobiologie.html',
    subject: 'Biologie',
    title: 'Neurobiologie & Aktionspotenzial',
    color: '#2a6e4a',
  },
  {
    id: 'physik-atom',
    src: '/lernzettel-previews/physik-atomhulle-preview.html',
    fullSrc: '/lernzettel-previews/physik-atomhulle.html',
    subject: 'Physik',
    title: 'Atommodelle & Energieniveaus',
    color: '#1a3d6b',
  },
] as const

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
}

const MODUS_LABELS: Record<Lernzettel['modus'], string> = {
  faktisch: 'Faktisch',
  bildlich: 'Bildlich',
  grundlagen: 'Von Grund auf',
  stichpunkte: 'Stichpunkte',
}

// ── Swipeable list row (wie in Apple Notizen: nach links wischen → Markieren + Löschen) ──

const SWIPE_ACTION_WIDTH = 76
const SWIPE_REVEAL = SWIPE_ACTION_WIDTH * 2

function StarIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
    </svg>
  )
}

function LernzettelRow({
  lz, info, isOpen, onOpenChange, onSelect, onToggleHighlight, onDelete,
}: {
  lz: Lernzettel
  info: { name: string; icon: string; color: string } | undefined
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSelect: () => void
  onToggleHighlight: () => void
  onDelete: () => void
}) {
  const reducedMotion = useReducedMotion()
  return (
    <div className="relative rounded-card overflow-hidden">
      {/* Reveal actions — Markieren (gelb) + Löschen (rot), wie in Apple Notizen */}
      <div className="absolute inset-y-0 right-0 flex">
        {/* Gelb traegt schwarze Schrift, Rot weisse — beide aus den Fuellmarken,
            damit die Beschriftung auf der Flaeche lesbar bleibt. */}
        <button
          onClick={() => { onToggleHighlight(); onOpenChange(false) }}
          className="flex flex-col items-center justify-center gap-1 press-sm bg-fill-yellow text-fill-yellow-on"
          style={{ width: SWIPE_ACTION_WIDTH }}
        >
          <StarIcon filled={lz.highlighted} />
          <span className="text-[11px] font-semibold">{lz.highlighted ? 'Entfernen' : 'Markieren'}</span>
        </button>
        <button
          onClick={onDelete}
          className="flex flex-col items-center justify-center gap-1 press-sm bg-fill-red text-fill-red-on"
          style={{ width: SWIPE_ACTION_WIDTH }}
        >
          <TrashIcon />
          <span className="text-[11px] font-semibold">Löschen</span>
        </button>
      </div>

      {/* Front card — draggable, taps open the detail view unless the row is swiped open */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -SWIPE_REVEAL, right: 0 }}
        dragElastic={{ left: 0.1, right: 0.35 }}
        animate={{ x: isOpen ? -SWIPE_REVEAL : 0 }}
        transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 42 }}
        onDragStart={() => onOpenChange(true)}
        onDragEnd={(_, dragInfo) => {
          const shouldStayOpen = dragInfo.offset.x < -SWIPE_REVEAL / 2 || dragInfo.velocity.x < -400
          onOpenChange(shouldStayOpen)
        }}
        onTap={() => { if (isOpen) onOpenChange(false); else onSelect() }}
        className="relative z-10 bg-surface border border-border/60 shadow-card-adaptive text-left overflow-hidden flex"
        style={{ touchAction: 'pan-y' }}
      >
        <div className="flex items-center gap-3 px-4 py-3.5 flex-1 min-w-0">
          {/* Das Fach traegt die Zeile — Farbstreifen UND eine zweite gefaerbte
              Kachel waren zwei Anzeigen fuer dieselbe Angabe. */}
          <SubjectIcon subjectId={lz.subjectId} size="md" />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-[16px] font-semibold tracking-[-0.015em] text-text-primary truncate">{lz.title}</p>
              {lz.highlighted && (
                <span className="shrink-0 w-5 h-5 rounded-full bg-fill-yellow text-fill-yellow-on flex items-center justify-center">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </span>
              )}
            </div>
            {/* Subject + date row */}
            <p className="text-[13px] text-text-secondary mt-0.5 truncate">
              {info?.name ?? lz.subjectName} · {formatDate(lz.generatedAt)}
              {MODUS_LABELS[lz.modus] && ` · ${MODUS_LABELS[lz.modus]}`}
            </p>
            {/* Topics row */}
            {lz.selectedTopics.length > 0 && (
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {lz.selectedTopics.slice(0, 3).map((t) => (
                  <Tag key={t} size="sm" className="whitespace-nowrap">{t}</Tag>
                ))}
                {lz.selectedTopics.length > 3 && (
                  <span className="text-[11px] text-text-muted">+{lz.selectedTopics.length - 3}</span>
                )}
              </div>
            )}
          </div>

          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-text-muted shrink-0" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </div>
      </motion.div>
    </div>
  )
}

export function LernzettelScreen() {
  const navigate = useNavigate()
  const { lernzettel, isPro, deleteLernzettel, toggleLernzettelHighlight, appConfig } = useUser()
  const [view, setView] = useState<View>('library')
  const [activeLz, setActiveLz] = useState<Lernzettel | null>(null)
  const [showPro, setShowPro] = useState(false)
  const [openPreview, setOpenPreview] = useState<typeof PREVIEWS[number] | null>(null)
  const [openRowId, setOpenRowId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const setRowOpen = (id: string, open: boolean) => {
    setOpenRowId((prev) => open ? id : (prev === id ? null : prev))
  }

  const handleDeleteLz = (id: string) => {
    deleteLernzettel(id)
    setOpenRowId(null)
    if (activeLz?.id === id) { setView('library'); setActiveLz(null) }
  }

  const today = new Date().toISOString().slice(0, 10)
  const createdToday = lernzettel.filter(lz => lz.generatedAt?.slice(0, 10) === today).length

  const handleOpenDetail = (lz: Lernzettel) => {
    setActiveLz(lz)
    setView('detail')
  }

  const handleNew = () => {
    if (!isPro && createdToday >= 1) { setShowPro(true); return }
    navigate('/klausurmodus/lernzettel/neu')
  }

  // ── DETAIL VIEW ────────────────────────────────────────────
  if (view === 'detail' && activeLz) {
    const info = SUBJECT_INFO[activeLz.subjectId]
    return (
      <div className="flex flex-col min-h-dvh bg-background pb-28">
        <Header
          title={activeLz.title}
          subtitle={info?.name ?? activeLz.subjectName}
          onBack={() => { setView('library'); setActiveLz(null) }}
        />

        <div className="px-4 mt-2 space-y-4">
          {/* Subject badge */}
          <div className="flex items-center gap-2">
            <span
              className="text-[11px] font-semibold px-2.5 py-1 rounded-full text-on-accent"
              style={{ background: info?.color ?? '#34D399' }}
            >
              {info?.name ?? activeLz.subjectName}
            </span>
            {MODUS_LABELS[activeLz.modus] && (
              <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-surface border border-border text-text-secondary">
                {MODUS_LABELS[activeLz.modus]}
              </span>
            )}
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
          <div className="bg-surface border border-border/60 rounded-card p-5 shadow-card-adaptive">
            <RichText text={activeLz.content} images={activeLz.images} />
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
              <div className="bg-surface border border-border/60 rounded-card p-4 shadow-card-adaptive space-y-2">
                {activeLz.examTopics.map((t, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 mt-0.5"
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
            className="w-full bg-surface border border-border/60 rounded-card p-4 shadow-card-adaptive text-left press flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-btn flex items-center justify-center shrink-0"
                style={{ background: 'rgb(var(--color-accent))' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-on-accent))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            className="w-full bg-surface border border-border/60 rounded-card p-4 shadow-card-adaptive text-left press flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-btn flex items-center justify-center shrink-0"
                style={{ background: 'rgb(var(--color-accent))' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-on-accent))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

          {/* Löschen */}
          <button
            onClick={() => {
              setConfirmDeleteId(activeLz.id)
            }}
            className="w-full h-12 rounded-pill border border-danger/30 text-text-primary text-[14px] font-medium hover:bg-danger/5 transition-colors"
          >
            Lernzettel löschen
          </button>
        </div>
      </div>
    )
  }

  // ── LIBRARY VIEW ───────────────────────────────────────────
  const sorted = [...lernzettel].sort((a, b) => {
    if (!!a.highlighted !== !!b.highlighted) return a.highlighted ? -1 : 1
    return b.generatedAt.localeCompare(a.generatedAt)
  })

  return (
    <div className="flex flex-col min-h-dvh bg-background pb-28">
      <Header title="Lernzettel" subtitle="Deine Zusammenfassungen" onBack={() => navigate(-1)} />
      <div className="px-4 pb-2" />

      <div className="px-4 space-y-3">
        {/* Neuer Lernzettel Button */}
        <button
          onClick={handleNew}
          className="w-full flex items-center justify-center gap-2 h-12 rounded-pill font-semibold text-[15px] press"
          style={{ background: 'rgb(var(--color-accent))', color: 'rgb(var(--color-on-accent))' }}
        >
          <Icon name="plus" size={17} />
          Neuen Lernzettel erstellen
        </button>

        {sorted.length === 0 && (
          <EmptyState
            title="Noch keine Lernzettel"
            note="Wähle ein Fach und deine Notizen — die KI schreibt daraus eine Zusammenfassung, passend zum Lehrplan deines Bundeslands."
          />
        )}

        {/* Lernzettel list */}
        {sorted.length > 0 && (
          <div className="space-y-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-text-secondary px-1 pt-2">
              Gespeicherte Lernzettel
            </p>
            {sorted.map((lz) => (
              <LernzettelRow
                key={lz.id}
                lz={lz}
                info={SUBJECT_INFO[lz.subjectId]}
                isOpen={openRowId === lz.id}
                onOpenChange={(open) => setRowOpen(lz.id, open)}
                onSelect={() => handleOpenDetail(lz)}
                onToggleHighlight={() => toggleLernzettelHighlight(lz.id)}
                onDelete={() => handleDeleteLz(lz.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Pro Lernzettel Preview ──────────────────────────────── */}
      <div className="mt-6">
        {/* Section header */}
        <div className="flex items-center gap-2 px-4 mb-2">
          {appConfig.proPurchasesEnabled ? (
            <span className="badge-pro-gold px-2.5 py-1 gap-1"><Icon name="sparkle" size={10} filled />PRO</span>
          ) : (
            <span className="px-2.5 py-1 rounded-pill text-[11px] font-bold bg-background text-text-muted">Vorschau</span>
          )}
          <p className="text-[15px] font-bold text-text-primary">Pro Lernzettel</p>
          <span className="ml-auto text-[11px] text-text-muted font-normal">
            Nächstes Update
          </span>
        </div>
        <p className="text-[13px] text-text-muted px-4 mb-3 leading-snug">
          KI-generierte Lernzettel mit SVG-Diagrammen, Formeln, Eselsbrücken und strukturierten Prüfungsübersichten — wie von einem Lehrer erstellt.
        </p>

        {/* Horizontal carousel */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            overflowX: 'auto',
            paddingLeft: '16px',
            paddingRight: '16px',
            paddingBottom: '10px',
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
          } as React.CSSProperties}
        >
          {PREVIEWS.map((p) => (
            <div
              key={p.id}
              style={{ display: 'flex', flexDirection: 'column', gap: '5px', flexShrink: 0, width: '320px' }}
            >
              {/* Thin header row — badges live here, not over the content */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1px' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', background: p.color, color: '#fff' }}>
                  {p.subject}
                </span>
                {appConfig.proPurchasesEnabled ? (
                  <span className="badge-pro-gold gap-1" style={{ padding: '2px 7px', fontSize: '10px' }}><Icon name="sparkle" size={9} filled />PRO</span>
                ) : (
                  <span style={{ padding: '2px 7px', fontSize: '10px', fontWeight: 700, borderRadius: '999px', background: 'rgba(var(--color-border), 0.5)', color: 'rgb(var(--color-text-muted))' }}>Vorschau</span>
                )}
              </div>

              {/* Card — pure content, no overlay, so the Lernzettel itself dominates */}
              <div
                onClick={() => setOpenPreview(p)}
                style={{
                  width: '320px',
                  height: '200px',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  boxShadow: '0 6px 28px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)',
                  cursor: 'pointer',
                }}
              >
                <iframe
                  src={p.src}
                  loading="lazy"
                  title={p.title}
                  style={{
                    width: '960px',
                    height: '601px',
                    transform: 'scale(0.3333)',
                    transformOrigin: 'top left',
                    border: 'none',
                    pointerEvents: 'none',
                    display: 'block',
                  }}
                />
              </div>

              {/* Thin footer row — title + caption in one line */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px', padding: '0 1px' }}>
                <p className="text-[12px] font-bold text-text-primary truncate">{p.title}</p>
                <span className="text-[11px] text-text-muted shrink-0">· Tippen zum Anzeigen</span>
              </div>
            </div>
          ))}
        </div>

        {/* CTA — nur für Free-User */}
        {!isPro && (
          <div className="px-4 mt-3 mb-6">
            {appConfig.proPurchasesEnabled ? (
              <button
                onClick={() => setShowPro(true)}
                className="w-full h-12 rounded-pill font-bold text-[14px] press"
                style={{
                  background: 'linear-gradient(135deg, #C8860A 0%, #F5C842 45%, #D97706 100%)',
                  color: '#3B1F00',
                  boxShadow: '0 4px 18px rgba(200,134,10,0.45), inset 0 1px 0 rgba(255,255,255,0.3)',
                }}
              >
                Pro freischalten
              </button>
            ) : (
              <button
                onClick={() => setShowPro(true)}
                className="w-full h-12 rounded-pill font-bold text-[14px] press bg-surface border border-border/60 text-text-secondary"
              >
                Für Update vormerken
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Fullscreen Preview Modal ────────────────────────────── */}
      {openPreview && (
        <div
          className="fixed inset-0 z-[60] flex flex-col items-center justify-end sm:justify-center"
          style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(var(--material-blur-ultrathin))' }}
          onClick={() => setOpenPreview(null)}
        >
          <div
            className="flex flex-col animate-sheet-up sm:animate-fade-in"
            style={{
              width: '100%',
              maxWidth: '960px',
              height: '92vh',
              borderRadius: '20px 20px 0 0',
              overflow: 'hidden',
              background: '#fff',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header bar */}
            <div
              className="flex items-center gap-3 px-4 py-3 shrink-0"
              style={{ background: openPreview.color, borderRadius: '20px 20px 0 0' }}
            >
              <span
                className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(255,255,255,0.22)', color: '#fff' }}
              >
                {openPreview.subject}
              </span>
              <p className="text-white font-semibold text-[14px] flex-1 truncate">{openPreview.title}</p>
              <button
                onClick={() => setOpenPreview(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'rgba(255,255,255,0.2)' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* iframe — explizite Höhe damit Scroll funktioniert */}
            <iframe
              src={openPreview.fullSrc}
              title={openPreview.title}
              style={{ width: '100%', height: 'calc(92vh - 56px)', border: 'none', display: 'block' }}
            />
          </div>
        </div>
      )}

      <Dialog
        open={confirmDeleteId !== null}
        title="Lernzettel löschen?"
        message="Der Lernzettel wird dauerhaft entfernt. Das lässt sich nicht rückgängig machen."
        confirmLabel="Löschen"
        cancelLabel="Behalten"
        destructive
        onConfirm={() => { if (confirmDeleteId) handleDeleteLz(confirmDeleteId); setConfirmDeleteId(null) }}
        onCancel={() => setConfirmDeleteId(null)}
      />

      <ProModal feature="lernzettel" isOpen={showPro} onClose={() => setShowPro(false)} />
    </div>
  )
}
