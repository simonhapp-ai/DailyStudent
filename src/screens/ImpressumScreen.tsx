import { useNavigate } from 'react-router-dom'

const SECTIONS = [
  {
    title: 'Angaben gem. § 5 TMG',
    rows: [
      { label: 'Betreiber', value: 'Simon Happ Social Media' },
      { label: 'Inhaber', value: 'Simon Happ' },
      { label: 'Anschrift', value: 'Henners Hof 13\n21217 Seevetal' },
    ],
  },
  {
    title: 'Kontakt',
    rows: [
      { label: 'E-Mail', value: 'simon.happ@gmx.de' },
    ],
  },
  {
    title: 'Steuerliche Angaben',
    rows: [
      { label: 'Steuernummer', value: 'Bitte beim zuständigen Finanzamt erfragen — wird nachgetragen.' },
    ],
  },
  {
    title: 'Verantwortlich für den Inhalt gem. § 18 Abs. 2 MStV',
    rows: [
      { label: 'Name', value: 'Simon Happ' },
      { label: 'Anschrift', value: 'Henners Hof 13, 21217 Seevetal' },
    ],
  },
  {
    title: 'Streitschlichtung',
    rows: [
      {
        label: 'EU-Plattform',
        value: 'Die EU-Kommission stellt eine Plattform zur Online-Streitbeilegung bereit: https://ec.europa.eu/consumers/odr',
      },
      {
        label: 'Hinweis',
        value: 'Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.',
      },
    ],
  },
  {
    title: 'Haftungsausschluss',
    rows: [
      {
        label: 'KI-Inhalte',
        value: 'Die KI-generierten Lernmaterialien (Smart Notes, Karteikarten, Probeklausuren, Lernpläne) werden automatisch erstellt und können Fehler enthalten. Sie ersetzen nicht die eigenständige Prüfung der Inhalte anhand offizieller Unterrichtsmaterialien.',
      },
      {
        label: 'Externe Links',
        value: 'Trotz sorgfältiger Kontrolle übernehmen wir keine Haftung für Inhalte externer Links. Für verlinkte Seiten sind ausschließlich deren Betreiber verantwortlich.',
      },
    ],
  },
]

export function ImpressumScreen() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col min-h-screen bg-background pb-10">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="px-4" style={{ paddingTop: 'max(58px, calc(env(safe-area-inset-top, 0px) + 18px))' }}>
        <button
          onClick={() => navigate('/profil')}
          className="flex items-center gap-1 text-accent text-[14px] font-medium mb-3 press-sm -ml-0.5"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Zurück
        </button>
        <h1 className="text-[28px] font-bold text-text-primary">Impressum</h1>
        <p className="text-text-muted text-[13px] mt-0.5">Angaben gem. § 5 TMG</p>
      </div>

      <div className="px-4 mt-5 space-y-3">
        {SECTIONS.map((section) => (
          <div key={section.title} className="bg-surface rounded-card shadow-card-adaptive border border-border/60 overflow-hidden">
            <div className="px-4 py-3 border-b border-border/40">
              <p className="text-text-primary font-semibold text-[14px]">{section.title}</p>
            </div>
            {section.rows.map((row, i) => (
              <div
                key={row.label}
                className={`px-4 py-3 flex items-start gap-3 ${i < section.rows.length - 1 ? 'border-b border-border/40' : ''}`}
              >
                <span className="text-text-muted text-[13px] shrink-0 w-[110px]">{row.label}</span>
                <span className="text-text-primary text-[13px] leading-relaxed flex-1 whitespace-pre-line">{row.value}</span>
              </div>
            ))}
          </div>
        ))}

        <p className="text-text-muted text-[11px] px-1 leading-relaxed pb-4">
          Stand: Juni 2026
        </p>
      </div>
    </div>
  )
}
