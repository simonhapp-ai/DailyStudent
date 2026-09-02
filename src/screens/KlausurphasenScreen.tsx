import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { SUBJECT_INFO } from '../data/subjectInfo'
import { Icon } from '../components/ui/Icon'
import { Stage } from '../components/ui/Stage'
import { Metric, MetricRow } from '../components/ui/Metric'
import { ListGroup, ListRow } from '../components/ui/ListGroup'
import { endnoteForEntry } from './AbiRechnerScreen'
import { LernvorschlagWidget } from '../components/ui/LernvorschlagWidget'
import { getActiveStreak } from '../lib/streak'
import type { AbiHalbjahr } from '../types'


function daysUntil(dateStr: string): number {
  const target = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / 86400000)
}



// ── Grade helpers ─────────────────────────────────────────────────────────────



function getSubjectNP(subjectId: string, halbjahre: AbiHalbjahr[]): number | null {
  for (const q of ['Q4','Q3','Q2','Q1'] as const) {
    const hj = halbjahre.find(h => h.label === q)
    if (!hj) continue
    const entry = hj.entries.find(e => e.subjectId === subjectId)
    if (!entry) continue
    const np = endnoteForEntry(entry)
    if (np !== null) return np
  }
  return null
}

// ── Mini bar chart (subject grades) ──────────────────────────────────────────


// ── Icon-Gradienten ──────────────────────────────────────────────────────────
// Identity palette redefinition (31.08.2026, Simon): only Purple/Mint/Gold/Navy
// from here on — no more Pink/random-Blue sitting next to each other. Adjacent
// widget pairs (in each group below) never share a color.



export function KlausurphasenScreen() {
  const navigate = useNavigate()
  const { generatedFlashCards, profile, appStats, lernplaene, savedProbeklausuren, lernzettel } = useUser()

  const totalCards = generatedFlashCards.length
  const activeStreak = getActiveStreak(appStats.streak, appStats.lastStudyDate)

  // Next upcoming exam
  const nextExam = useMemo(() => {
    const upcoming = (profile?.klausurtermine ?? [])
      .map((k) => ({ ...k, days: daysUntil(k.date), info: SUBJECT_INFO[k.subjectId] }))
      .filter((k) => k.days > 0 && k.info)
      .sort((a, b) => a.days - b.days)
    return upcoming[0] ?? null
  }, [profile?.klausurtermine])

  const subjectName = nextExam?.info?.name ?? 'Nächste Klausur'
  const daysUntilExam = nextExam?.days ?? null

  // Active Lernplan: find the active one, compute next 3 upcoming lern/puffer days
  const activePlan = lernplaene.find((p) => p.isActive)
  const upcomingDays = useMemo(() => {
    if (!activePlan) return []
    const today = new Date().toISOString().slice(0, 10)
    return activePlan.days
      .filter((d) => d.date >= today && (d.dayType === 'lern' || d.dayType === 'puffer') && d.sessions.length > 0)
      .slice(0, 2)
  }, [activePlan])

  // Fortschritt des aktiven Lernplans — Grundlage der Bühne.
  const erledigteTage = activePlan?.completedDays?.length ?? 0
  const planFortschritt = activePlan && activePlan.days.length > 0
    ? erledigteTage / activePlan.days.length
    : 0

  // Durchschnitt über alle Fächer mit eingetragener Note.
  const durchschnittNP = useMemo(() => {
    const hj = profile?.abiHalbjahre ?? []
    const werte = (profile?.faecher ?? [])
      .map((id) => getSubjectNP(id, hj))
      .filter((n): n is number => n !== null)
    if (werte.length === 0) return null
    return werte.reduce((a, b) => a + b, 0) / werte.length
  }, [profile?.abiHalbjahre, profile?.faecher])


  return (
    <div className="flex flex-col min-h-dvh bg-background pb-28">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      {/* Kopfzeile mit „Planen" (Version C) — Kalender, Statistiken, Stundenplan,
          Notenrechner, Hausaufgaben und Klausurtermine liegen hinter diesem einen
          Knopf. Zum ersten Mal an einem Ort: Geplant wird zuhause, also im
          Klausurenmodus. */}
      <div
        className="px-4 flex items-start justify-between gap-3"
        style={{ paddingTop: 'max(58px, calc(env(safe-area-inset-top, 0px) + 18px))' }}
      >
        <div className="min-w-0">
          <h1 className="text-[28px] font-bold text-text-primary">Klausurenmodus</h1>
          <p className="text-[13px] text-text-muted mt-0.5">
            {nextExam
              ? `${subjectName} · Klausur in ${daysUntilExam} Tagen`
              : 'Bereite dich auf deine Klausuren vor'}
          </p>
        </div>
        <button
          onClick={() => navigate('/kalender')}
          className="glanz-lauf shrink-0 h-11 pl-4 pr-3 rounded-pill text-[15px] font-semibold text-text-primary bg-surface border border-border/60 press-grow mt-1 flex items-center gap-1.5"
        >
          Planen
          <svg width="8" height="14" viewBox="0 0 8 14" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" className="text-text-muted" aria-hidden>
            <path d="M1 1l6 6-6 6" />
          </svg>
        </button>
      </div>

      <div className="px-4 mt-5 space-y-3 lg:px-6">

        {/* ── Bühne ───────────────────────────────────────────────────
            Beantwortet die einzige Frage, mit der man diesen Screen öffnet:
            Was mache ich jetzt? Drei Zustände — laufender Lernplan, Klausur
            ohne Plan, oder nichts von beidem. Im letzten Fall entfällt sie und
            der Screen beginnt mit den Methoden (Regel 1). */}
        {activePlan && upcomingDays.length > 0 ? (
          <Stage
            tone="klausur"
            eyebrow={nextExam ? `${subjectName} · in ${daysUntilExam} Tagen` : 'Aktiver Lernplan'}
            title={upcomingDays[0]?.sessions[0]?.topic ?? activePlan.title}
            progress={planFortschritt}
            note={`Tag ${erledigteTage + 1} von ${activePlan.days.length}${
              upcomingDays[0]?.sessions[0]?.durationMin ? ` · heute ${upcomingDays[0].sessions[0].durationMin} Minuten` : ''
            }`}
            action={
              <button
                onClick={() => navigate(`/klausurmodus/lernplan/${activePlan.id}`)}
                className="w-full h-12 rounded-pill bg-white text-[#1B1B1F] text-[16px] font-semibold press"
              >
                Weiterlernen
              </button>
            }
          />
        ) : nextExam ? (
          <Stage
            tone="klausur"
            eyebrow={`Nächste Klausur · ${subjectName}`}
            title={`In ${daysUntilExam} Tagen, kein Plan`}
            note="Ein Lernplan verteilt den Stoff auf die verbleibenden Tage — um deinen Stundenplan herum."
            action={
              <button
                onClick={() => navigate('/klausurmodus/lernplan/neu')}
                className="w-full h-12 rounded-pill bg-white text-[#1B1B1F] text-[16px] font-semibold press"
              >
                Lernplan erstellen
              </button>
            }
          />
        ) : (
          <Stage
            tone="klausur"
            eyebrow="Kein Klausurtermin eingetragen"
            title="Womit soll ich rechnen?"
            note="Mit einem Termin weiß die App, wie viele Tage bleiben — daraus entstehen Lernplan, Vorschläge und Countdown."
            action={
              <button
                onClick={() => navigate('/klausuren')}
                className="w-full h-12 rounded-pill bg-white text-[#1B1B1F] text-[16px] font-semibold press"
              >
                Klausurtermin eintragen
              </button>
            }
          />
        )}

        {/* ── Lernen ──────────────────────────────────────────────────
            Vier gleichwertige Kacheln mit ihrem echten Bestand. Flache
            Flächen statt Verlaufs-Icons mit farbigem Glow; das Chevron oben
            rechts zeigt, dass die Kachel antippbar ist. */}
        <p className="section-label px-1 pt-1">Lernen</p>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {([
            {
              label: 'Karteikarten',
              note: totalCards > 0 ? `${totalCards} Karten` : 'Noch keine',
              icon: 'cards' as const,
              fill: 'rgb(var(--color-accent))', on: '#FFFFFF',
              to: totalCards > 0 ? '/klausurmodus/lernen' : '/klausurmodus/karteikarten/neu',
            },
            {
              label: 'Blurting',
              note: 'Aus dem Kopf',
              icon: 'speech' as const,
              fill: 'rgb(var(--subj-spr))', on: '#FFFFFF',
              to: '/klausurmodus/blurting',
            },
            {
              label: 'Lernzettel',
              note: lernzettel.length > 0 ? `${lernzettel.length} gespeichert` : 'Noch keine',
              icon: 'document' as const,
              fill: 'rgb(var(--subj-ges))', on: '#FFFFFF',
              to: '/klausurmodus/lernzettel',
            },
            {
              label: 'Probeklausur',
              note: savedProbeklausuren.length > 0 ? `${savedProbeklausuren.length} geschrieben` : '4 Arten',
              icon: 'clipboard' as const,
              fill: 'rgb(var(--subj-kre))', on: '#FFFFFF',
              to: '/klausurmodus/probeklausur',
            },
          ]).map((m) => (
            <button
              key={m.label}
              onClick={() => navigate(m.to)}
              className="relative bg-surface rounded-card p-4 flex flex-col gap-3 text-left press-sm hover:bg-surface-hover transition-colors"
            >
              <span className="absolute right-3.5 top-3.5 text-text-muted" aria-hidden>
                <svg width="7" height="12" viewBox="0 0 8 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 1l6 6-6 6" />
                </svg>
              </span>
              <span
                className="w-11 h-11 rounded-icon flex items-center justify-center shrink-0"
                style={{ backgroundColor: m.fill, backgroundImage: 'var(--subj-fade)', color: m.on }}
              >
                <Icon name={m.icon} size={21} />
              </span>
              <span>
                <span className="block text-[15px] font-semibold text-text-primary">{m.label}</span>
                <span className="block text-[13px] text-text-secondary mt-0.5">{m.note}</span>
              </span>
            </button>
          ))}
        </div>

        {/* ── Stand ───────────────────────────────────────────────────
            Aus acht Statistik-Pillen in verschiedenen Formen werden drei
            Kennzahlfelder. Die Diagramme liegen jetzt vollständig unter
            Planen › Statistiken statt hier als Vorschau. */}
        <p className="section-label px-1 pt-1">Stand</p>
        <MetricRow>
          <Metric value={durchschnittNP !== null ? durchschnittNP.toFixed(1) : '—'} label="Ø Notenpunkte" />
          <Metric value={activeStreak} label="Tage Streak" />
          <Metric value={savedProbeklausuren.length} label="Klausuren" />
        </MetricRow>
        <ListGroup>
          <ListRow
            title="Statistiken"
            subtitle="Notenverlauf, Aktivität, Klausuren"
            chevron
            onClick={() => navigate('/insights')}
          />
        </ListGroup>

        {/* ── 5. KI-Lernvorschlag ───────────────────────────────────────── */}
        <div>
          <p className="section-label px-1 mb-2.5">Lernvorschlag für heute</p>
          <LernvorschlagWidget />
        </div>

      </div>


    </div>
  )
}
