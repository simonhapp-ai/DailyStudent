import { useMemo } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'
import { useUser } from '../../context/UserContext'
import { QuickNotesIcon } from './SubjectIcon'
import { Icon, type IconName } from './Icon'
import { SubjectIcon } from './SubjectIcon'
import { resolveSubjectInfo } from '../../data/subjectInfo'
import { isPlanenPath, PLANEN_HOME, modeForPath, MODE_HOME, type AppMode } from '../../lib/appMode'
import { UNTERRICHT_TIPS, KLAUSUR_TIPS, tipOfTheDay, type Tip } from '../../data/tips'

// Seitenleiste für iPad und Desktop (Version C).
//
// Im Querformat wandern die zwei Modi aus der schwebenden Leiste unten in eine
// feste Seitenleiste links. Dort liegt auch das Profil und der Planen-Bereich,
// ohne dass etwas aufklappen muss — es ist Platz da, also wird er genutzt.
// Rechts steht der Inhalt.
//
// Das ist ausdrücklich kein breit gezogenes Telefon-Layout: Was auf dem Telefon
// nacheinander kommt (Modus wählen → Rubrik wählen → Inhalt), steht hier
// nebeneinander.

interface NavEntry {
  label: string
  path: string
  icon: IconName
  badge?: string
}

const UNTERRICHT_NAV: NavEntry[] = [
  { label: 'Neue Notiz', path: '/unterricht/neue-notiz', icon: 'note' },
  { label: 'Schnellnotizen', path: '/unterricht/ohne-fach/ordner/folder-no-subject', icon: 'folder' },
  { label: 'Schreibblock', path: '/schreibblock', icon: 'pencil' },
]

const KLAUSUR_NAV: NavEntry[] = [
  { label: 'Übersicht', path: '/klausurmodus', icon: 'cap' },
  { label: 'Karteikarten', path: '/klausurmodus/lernen', icon: 'cards' },
  { label: 'Blurting', path: '/klausurmodus/blurting', icon: 'speech' },
  { label: 'Lernzettel', path: '/klausurmodus/lernzettel', icon: 'document' },
  { label: 'Probeklausur', path: '/klausurmodus/probeklausur', icon: 'clipboard' },
  { label: 'Lernplan', path: '/klausurmodus/lernplan', icon: 'target' },
]

// Planen — dieselben sechs Rubriken wie in der Planen-Leiste auf dem Telefon,
// hier aber dauerhaft sichtbar statt hinter „Mehr".
const PLANEN_NAV: NavEntry[] = [
  { label: 'Kalender', path: '/kalender', icon: 'calendar' },
  { label: 'Statistiken', path: '/insights', icon: 'chart' },
  { label: 'Stundenplan', path: '/stundenplan', icon: 'clock' },
  { label: 'Notenrechner', path: '/abi-rechner', icon: 'target' },
  { label: 'Hausaufgaben', path: '/hausaufgaben', icon: 'check' },
  { label: 'Klausuren', path: '/klausuren', icon: 'warning' },
]

function useSidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { profile, userNotes } = useUser()
  const mode = modeForPath(location.pathname)
  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/')
  const initials =
    (profile?.name ?? '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('') || '·'
  // Die drei zuletzt benutzten Fächer — abgeleitet aus dem jüngsten Notizdatum
  // je Fach. Wer noch keine Notizen hat, sieht die ersten drei aus dem Profil,
  // damit die Leiste nicht leer bleibt.
  const zuletztBenutzt = useMemo(() => {
    const faecher = profile?.faecher ?? []
    const letzteNutzung = new Map<string, string>()
    for (const n of userNotes) {
      if (!n.subjectId) continue
      const bisher = letzteNutzung.get(n.subjectId)
      if (!bisher || n.createdAt > bisher) letzteNutzung.set(n.subjectId, n.createdAt)
    }
    const benutzt = faecher
      .filter((id) => letzteNutzung.has(id))
      .sort((a, b) => (letzteNutzung.get(b) ?? '').localeCompare(letzteNutzung.get(a) ?? ''))
    return (benutzt.length > 0 ? benutzt : faecher).slice(0, 3)
  }, [profile?.faecher, userNotes])

  return { location, navigate, profile, mode, isActive, initials, zuletztBenutzt, inPlanen: isPlanenPath(location.pathname) }
}

// Hinweiskarte — im Querformat ist unter der Navigation Platz, der sonst leer
// bliebe. Sie beschreibt eine Gewohnheit, kein Feature.
function TipCard({ tip }: { tip: Tip }) {
  return (
    <div className="mt-5 mx-1 rounded-card bg-[rgb(120,120,128)]/[0.12] dark:bg-[rgb(120,120,128)]/[0.24] p-3.5 flex gap-2.5">
      <span className="text-text-secondary shrink-0 mt-0.5">
        <Icon name="speech" size={16} />
      </span>
      <span className="min-w-0">
        <span className="block text-[12px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
          {tip.title}
        </span>
        <span className="block text-[12.5px] leading-snug text-text-primary mt-1">{tip.body}</span>
      </span>
    </div>
  )
}

function ModeSwitch({ mode, onPick }: { mode: AppMode; onPick: (m: AppMode) => void }) {
  const reducedMotion = useReducedMotion()
  return (
    <div
      role="tablist"
      aria-label="Modus"
      className="relative flex p-1 rounded-pill border border-border/50"
      style={{ background: 'rgb(var(--color-bg))' }}
    >
      {/* Der Schieber liegt UNTER den Beschriftungen und wandert zwischen den
          beiden Haelften. Dadurch liest sich die Leiste als ein Schalter statt
          als zwei Knoepfe auf grauem Grund. */}
      <motion.span
        aria-hidden
        layout
        className="absolute top-1 bottom-1 rounded-pill"
        style={{
          left: mode === 'unterricht' ? '0.25rem' : '50%',
          right: mode === 'unterricht' ? '50%' : '0.25rem',
          background: mode === 'unterricht'
            ? 'linear-gradient(135deg, #8B5CF6, #7C3AED)'
            : 'linear-gradient(135deg, #34D399, #10B981)',
        }}
        transition={reducedMotion ? { duration: 0 } : { type: 'spring', duration: 0.34, bounce: 0.16 }}
      />
      {(['unterricht', 'klausur'] as AppMode[]).map((m) => {
        const active = mode === m
        return (
          <button
            key={m}
            role="tab"
            aria-selected={active}
            onClick={() => onPick(m)}
            className="relative flex-1 h-9 rounded-pill text-[14px] font-semibold press-sm transition-colors"
            style={{
              color: active
                ? '#FFFFFF'
                : 'rgb(var(--color-text-secondary))',
            }}
          >
            {m === 'unterricht' ? 'Unterricht' : 'Klausur'}
          </button>
        )
      })}
    </div>
  )
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="section-label px-3.5 pt-4 pb-1.5">
      {children}
    </p>
  )
}

// ── Schmale Variante (Tablet-Hochformat / kleinere Fenster) ─────────────────
export function DesktopSidebar() {
  const { navigate, mode, isActive, initials, inPlanen } = useSidebar()
  const entries = mode === 'unterricht'
    ? UNTERRICHT_NAV
    : inPlanen ? PLANEN_NAV : [...KLAUSUR_NAV, { label: 'Planen', path: PLANEN_HOME, icon: 'calendar' as IconName }]

  return (
    <aside
      className="flex flex-col h-dvh shrink-0 border-r border-border/40 lg:hidden"
      style={{
        width: '76px',
        backdropFilter: 'saturate(180%) blur(var(--material-blur-regular))',
        WebkitBackdropFilter: 'saturate(180%) blur(var(--material-blur-regular))',
        backgroundColor: 'rgba(var(--color-surface), 0.96)',
      }}
    >
      <button
        onClick={() => navigate('/profil')}
        title="Profil und Einstellungen"
        className="mx-auto mt-6 mb-4 w-11 h-11 rounded-full flex items-center justify-center text-white text-[15px] font-bold press shrink-0"
        style={{ background: 'var(--stage-bg)' }}
      >
        {initials}
      </button>

      {/* Modus als zwei gestapelte Flächen — dieselbe Logik wie die Leiste unten */}
      <div className="px-2 flex flex-col gap-1.5">
        {(['unterricht', 'klausur'] as AppMode[]).map((m) => {
          const active = mode === m
          return (
            <button
              key={m}
              onClick={() => navigate(MODE_HOME[m])}
              title={m === 'unterricht' ? 'Unterricht' : 'Klausur'}
              className="w-full h-11 rounded-icon text-[11px] font-bold press-sm transition-colors"
              style={
                active
                  ? {
                      background: m === 'unterricht' ? '#7C3AED' : '#34D399',
                      color: '#FFFFFF',
                    }
                  : { color: 'rgb(var(--color-text-primary) / 0.55)' }
              }
            >
              {m === 'unterricht' ? 'Unt.' : 'Kla.'}
            </button>
          )
        })}
      </div>

      <nav className="flex-1 flex flex-col gap-1 px-2 pt-4 overflow-y-auto">
        {entries.map((e) => {
          const active = isActive(e.path)
          return (
            <button
              key={e.path}
              onClick={() => navigate(e.path)}
              title={e.label}
              className={`w-full flex flex-col items-center gap-1 py-2.5 px-1 rounded-btn press-sm nav-btn ${active ? 'nav-active' : ''}`}
              style={{ color: active ? 'rgb(var(--color-text-primary))' : 'rgb(var(--color-text-muted))' }}
            >
              <Icon name={e.icon} size={20} />
              <span className="text-[11px] leading-none tracking-tight truncate w-full text-center">{e.label}</span>
            </button>
          )
        })}
      </nav>
    </aside>
  )
}

// ── Breite Variante (Desktop, iPad Querformat) ──────────────────────────────
export function DesktopSidebarWide() {
  const { navigate, profile, mode, isActive, initials, zuletztBenutzt, inPlanen } = useSidebar()
  const reducedMotion = useReducedMotion()

  return (
    <aside
      className="hidden lg:flex flex-col h-dvh shrink-0 border-r border-border/40"
      style={{
        width: '272px',
        backdropFilter: 'saturate(180%) blur(var(--material-blur-regular))',
        WebkitBackdropFilter: 'saturate(180%) blur(var(--material-blur-regular))',
        backgroundColor: 'rgba(var(--color-surface), 0.96)',
      }}
    >
      {/* Identität — die ganze Zeile ist antippbar und führt ins Profil */}
      <button
        onClick={() => navigate('/profil')}
        className="flex items-center gap-3 px-4 pt-6 pb-4 press-sm text-left"
      >
        <span
          className="w-11 h-11 rounded-full flex items-center justify-center text-white text-[15px] font-bold shrink-0"
          style={{ background: 'var(--stage-bg)' }}
        >
          {initials}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[15px] font-semibold text-text-primary truncate">
            {profile?.name ?? 'Profil'}
          </span>
          <span className="block text-[12px] text-text-secondary truncate">
            {profile?.klasse ? `Klasse ${profile.klasse}` : 'Einstellungen'}
            {profile?.bundesland ? ` · ${profile.bundesland}` : ''}
          </span>
        </span>
        <svg width="7" height="12" viewBox="0 0 8 14" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" className="text-text-muted shrink-0" aria-hidden>
          <path d="M1 1l6 6-6 6" />
        </svg>
      </button>

      <div className="px-3">
        <ModeSwitch mode={mode} onPick={(m) => navigate(MODE_HOME[m])} />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-6">
        {mode === 'unterricht' ? (
          <>
            {/* Nur die drei zuletzt benutzten Fächer. Die vollständige Liste
                steht direkt daneben im Inhalt — sie hier zu wiederholen macht
                die Leiste bei acht Fächern voll, ohne etwas hinzuzufügen. */}
            {zuletztBenutzt.length > 0 && (
              <>
                <SectionLabel>Zuletzt</SectionLabel>
                <div className="flex flex-col gap-0.5">
                  {zuletztBenutzt.map((id) => {
                    const info = resolveSubjectInfo(id, profile?.customFaecher)
                    const active = isActive(`/unterricht/${id}`)
                    return (
                      <button
                        key={id}
                        onClick={() => navigate(`/unterricht/${id}`)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-btn press-sm text-left nav-btn ${active ? 'nav-active' : ''}`}
                        style={{ color: 'rgb(var(--color-text-primary))' }}
                      >
                        <SubjectIcon subjectId={id} size="sm" />
                        <span className="text-[14px] font-medium truncate">{info.name}</span>
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            <SectionLabel>Erfassen</SectionLabel>
            <div className="flex flex-col gap-0.5">
              {UNTERRICHT_NAV.map((e) => (
                <SideRow key={e.path} entry={e} active={isActive(e.path)} onClick={() => navigate(e.path)} />
              ))}
            </div>

            <TipCard tip={tipOfTheDay(UNTERRICHT_TIPS)} />
          </>
        ) : (
          /* Klausurenmodus hat zwei Ebenen: die Lernwerkzeuge und, eine Ebene
             tiefer, den Planen-Bereich. Beide zusammen waren zwölf Zeilen
             untereinander — zu viel. Man steigt jetzt hinab und wieder herauf;
             die Liste wechselt dabei, die Modusfarbe bleibt. */
          <AnimatePresence mode="wait" initial={false}>
            {inPlanen ? (
              <motion.div
                key="planen"
                initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 14 }}
                animate={reducedMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
                exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 14 }}
                transition={reducedMotion ? { duration: 0 } : { duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              >
                <button
                  onClick={() => navigate(MODE_HOME.klausur)}
                  className="w-full flex items-center gap-2 px-3.5 pt-4 pb-2 text-[13px] font-semibold text-text-primary press-sm"
                >
                  <svg width="8" height="14" viewBox="0 0 8 14" fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M7 1L1 7l6 6" />
                  </svg>
                  Klausurenmodus
                </button>
                <SectionLabel>Planen</SectionLabel>
                <div className="flex flex-col gap-0.5">
                  {PLANEN_NAV.map((e) => (
                    <SideRow key={e.path} entry={e} active={isActive(e.path)} onClick={() => navigate(e.path)} />
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="lernen"
                initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: -14 }}
                animate={reducedMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
                exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: -14 }}
                transition={reducedMotion ? { duration: 0 } : { duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              >
                <SectionLabel>Lernen</SectionLabel>
                <div className="flex flex-col gap-0.5">
                  {KLAUSUR_NAV.map((e) => (
                    <SideRow key={e.path} entry={e} active={isActive(e.path)} onClick={() => navigate(e.path)} />
                  ))}
                </div>

                <SectionLabel>Weiter</SectionLabel>
                <SideRow
                  entry={{ label: 'Planen', path: PLANEN_HOME, icon: 'calendar' }}
                  active={false}
                  onClick={() => navigate(PLANEN_HOME)}
                />

                <TipCard tip={tipOfTheDay(KLAUSUR_TIPS)} />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </nav>
    </aside>
  )
}

function SideRow({ entry, active, onClick }: { entry: NavEntry; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-btn press-sm text-left nav-btn ${active ? 'nav-active' : ''}`}
      style={{
        color: active ? 'rgb(var(--color-text-primary))' : 'rgb(var(--color-text-secondary))',
        fontWeight: active ? 600 : 500,
      }}
    >
      {/* Schnellnotizen traegt sein eigenes Zeichen — dasselbe wie im
          Unterrichtsmodus, damit man dieselbe Sache nicht zweimal
          unterschiedlich dargestellt sieht. */}
      {entry.label === 'Schnellnotizen' ? (
        <QuickNotesIcon size="sm" />
      ) : (
        <span className="w-8 h-8 rounded-btn flex items-center justify-center shrink-0 bg-[rgb(120,120,128)]/[0.12] dark:bg-[rgb(120,120,128)]/[0.24]">
          <Icon name={entry.icon} size={17} />
        </span>
      )}
      <span className="text-[14px] truncate flex-1">{entry.label}</span>
      {entry.badge && (
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-pill bg-fill-red text-fill-red-on shrink-0">
          {entry.badge}
        </span>
      )}
    </button>
  )
}
