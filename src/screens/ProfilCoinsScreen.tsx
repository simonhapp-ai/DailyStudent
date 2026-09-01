import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { Icon, type IconName } from '../components/ui/Icon'
import { ListGroup, ListRow } from '../components/ui/ListGroup'
import { Tag } from '../components/ui/Tag'
import { getActiveStreak } from '../lib/streak'
import {
  RAENGE, rangFuer, naechsterRang, rangFortschritt, xpBisNaechster,
  FREEZE_PRO_TAGE, FREEZE_MAX, verdienteFreezes,
} from '../lib/xp'

// ── Rang ──────────────────────────────────────────────────────────────────
//
// War der Coins-Shop. Es gibt aber nichts mehr zu kaufen: Der Rabatt ist seit
// dem Wechsel auf Apple-Käufe tot, und der Streak-Freeze wird jetzt verdient
// statt bezahlt. Ein Shop ohne Ware ist kein Shop.
//
// Was bleibt, ist die ehrliche Frage: Wofür bekomme ich XP, und wo stehe ich?
// Genau das zeigt der Screen — keine Währung, keine Kachel-Landschaft, eine
// Liste.

const AKTIONEN: { key: string; label: string; xp: number; icon: IconName }[] = [
  { key: 'SMART_NOTE',        label: 'Notiz analysieren lassen', xp: 5,  icon: 'camera' },
  { key: 'FLASHCARD_LEARNED', label: 'Karteikarten lernen',      xp: 10, icon: 'cards' },
  { key: 'BLURTING',          label: 'Blurting abschließen',     xp: 10, icon: 'bulb' },
  { key: 'LERNPLAN_DAY',      label: 'Lernplan-Tag erledigen',   xp: 15, icon: 'calendar' },
  { key: 'LERNZETTEL',        label: 'Lernzettel erstellen',     xp: 20, icon: 'document' },
  { key: 'PROBEKLAUSUR',      label: 'Probeklausur schreiben',   xp: 50, icon: 'clipboard' },
]

export function ProfilCoinsScreen() {
  const navigate = useNavigate()
  const { appStats } = useUser()

  const xp = appStats.coins ?? 0
  const rang = rangFuer(xp)
  const naechster = naechsterRang(xp)
  const anteil = rangFortschritt(xp)
  const fehlend = xpBisNaechster(xp)

  const today = new Date().toISOString().slice(0, 10)
  const cooldowns = appStats.cooldowns ?? []

  const streak = getActiveStreak(appStats.streak ?? 0, appStats.lastStudyDate)
  const freezes = appStats.streakFreezes ?? 0
  const bisFreeze = FREEZE_PRO_TAGE - (streak % FREEZE_PRO_TAGE)

  return (
    <div className="flex flex-col min-h-dvh bg-background pb-10">
      <div className="px-4" style={{ paddingTop: 'max(58px, calc(env(safe-area-inset-top, 0px) + 18px))' }}>
        <button
          onClick={() => navigate('/profil')}
          className="flex items-center gap-1 text-text-primary text-[15px] font-semibold mb-4 press-sm -ml-1"
        >
          <svg width="9" height="15" viewBox="0 0 8 14" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M7 1L1 7l6 6" />
          </svg>
          Zurück
        </button>
        <h1 className="text-[30px] font-extrabold tracking-[-0.035em] text-text-primary">Rang</h1>
        <p className="text-[13px] text-text-secondary mt-0.5">
          XP zeigen, wie viel du gearbeitet hast. Die Streak, ob du drangeblieben bist.
        </p>
      </div>

      <div className="px-4 mt-5 space-y-4 lg:px-6 lg:max-w-[760px]">

        {/* ── Wo du stehst ──────────────────────────────────────
            Eine Zahl, ein Balken, ein Satz. Das ersetzt die gezeichnete
            Münze — sie versprach Kaufkraft, die es nie gab. */}
        <div className="bg-surface rounded-card border border-border/60 shadow-card-adaptive p-5">
          <div className="flex items-baseline justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-text-secondary">
                Stufe {rang.stufe} von {RAENGE.length}
              </p>
              <p className="text-[24px] font-extrabold tracking-[-0.03em] text-text-primary mt-0.5">{rang.label}</p>
            </div>
            <p className="text-[20px] font-bold tabular-nums text-text-primary shrink-0">{xp} XP</p>
          </div>

          <p className="text-[13px] text-text-secondary mt-2 leading-relaxed">{rang.bedeutung}</p>

          <div className="h-2 rounded-pill bg-[rgb(120,120,128)]/[0.12] dark:bg-[rgb(120,120,128)]/[0.24] overflow-hidden mt-4">
            <div
              className="h-full rounded-pill transition-[width] duration-[280ms] ease-[cubic-bezier(.23,1,.32,1)]"
              style={{ width: `${anteil * 100}%`, background: 'var(--grad-mode)' }}
            />
          </div>
          <p className="text-[12px] text-text-secondary mt-2">
            {naechster && fehlend !== null
              ? `Noch ${fehlend} XP bis „${naechster.label}“`
              : 'Höchste Stufe erreicht.'}
          </p>
        </div>

        {/* ── Streak-Schutz ─────────────────────────────────────
            Der Freeze war käuflich, solange es eine Währung gab. Jetzt wird er
            durch genau das verdient, was er schützt. */}
        <div className="bg-surface rounded-card border border-border/60 shadow-card-adaptive p-5">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-icon bg-[rgb(120,120,128)]/[0.12] dark:bg-[rgb(120,120,128)]/[0.24] flex items-center justify-center text-text-primary shrink-0">
              <Icon name="snowflake" size={19} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[16px] font-semibold text-text-primary">Streak-Schutz</p>
              <p className="text-[13px] text-text-secondary mt-0.5">
                Rettet deine Streak, wenn du einen Tag verpasst.
              </p>
            </div>
            <Tag size="sm">{freezes} von {FREEZE_MAX}</Tag>
          </div>

          <p className="text-[13px] text-text-secondary mt-4 leading-relaxed">
            Du verdienst ihn durch das, was er schützt: je {FREEZE_PRO_TAGE} Tage
            am Stück einen, höchstens {FREEZE_MAX} auf Vorrat.
            {streak > 0 && verdienteFreezes(streak) < FREEZE_MAX && (
              <> Noch {bisFreeze} {bisFreeze === 1 ? 'Tag' : 'Tage'} bis zum nächsten.</>
            )}
          </p>
        </div>

        {/* ── Wofür es XP gibt ──────────────────────────────────
            Nur Dinge, die wirklich Lernen sind. Der tägliche Login-Bonus ist
            entfallen — er belohnte Anwesenheit und untergrub damit die Aussage
            des Rangs. */}
        <div>
          <p className="section-label px-1 mb-2">Wofür es XP gibt</p>
          <ListGroup>
            {AKTIONEN.map((a) => {
              const heuteSchon = cooldowns.includes(`${a.key}:${today}`)
              return (
                <ListRow
                  key={a.key}
                  leading={
                    <span className="w-9 h-9 rounded-icon bg-[rgb(120,120,128)]/[0.12] dark:bg-[rgb(120,120,128)]/[0.24] flex items-center justify-center text-text-primary shrink-0">
                      <Icon name={a.icon} size={17} />
                    </span>
                  }
                  title={<span className="text-[15px] font-normal">{a.label}</span>}
                  subtitle={heuteSchon ? 'Heute schon erledigt' : undefined}
                  value={
                    heuteSchon
                      ? <Tag tone="green" size="sm">erledigt</Tag>
                      : <span className="tabular-nums font-semibold text-text-primary">+{a.xp}</span>
                  }
                />
              )
            })}
          </ListGroup>
          <p className="text-[12px] text-text-secondary mt-2 px-1 leading-relaxed">
            Einmal pro Tag und Aktion. Fürs bloße Öffnen der App gibt es nichts —
            der Rang soll etwas über deine Arbeit sagen, nicht über deine Anwesenheit.
          </p>
        </div>

        {/* ── Die Stufen ────────────────────────────────────── */}
        <div>
          <p className="section-label px-1 mb-2">Die Stufen</p>
          <ListGroup>
            {RAENGE.map((r) => {
              const erreicht = xp >= r.ab
              const aktuell = r.stufe === rang.stufe
              return (
                <ListRow
                  key={r.stufe}
                  leading={
                    <span
                      className="w-9 h-9 rounded-icon flex items-center justify-center shrink-0 text-[13px] font-bold tabular-nums"
                      style={erreicht
                        ? { background: 'var(--grad-mode)', color: '#FFFFFF' }
                        : { background: 'rgb(var(--color-border) / 0.5)', color: 'rgb(var(--color-text-muted))' }}
                    >
                      {r.stufe}
                    </span>
                  }
                  title={
                    <span className="flex items-center gap-2">
                      <span className="text-[15px] font-normal">{r.label}</span>
                      {aktuell && <Tag size="sm">aktuell</Tag>}
                    </span>
                  }
                  subtitle={r.bedeutung}
                  value={<span className="tabular-nums text-text-secondary">ab {r.ab}</span>}
                />
              )
            })}
          </ListGroup>
        </div>
      </div>
    </div>
  )
}
