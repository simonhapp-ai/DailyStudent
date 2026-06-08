import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'

const BUNDESLAENDER = [
  { id: 'by', name: 'Bayern' },
  { id: 'bw', name: 'Baden-Württ.' },
  { id: 'be', name: 'Berlin' },
  { id: 'bb', name: 'Brandenburg' },
  { id: 'hb', name: 'Bremen' },
  { id: 'hh', name: 'Hamburg' },
  { id: 'he', name: 'Hessen' },
  { id: 'mv', name: 'Meckl.-Vorp.' },
  { id: 'ni', name: 'Niedersachsen' },
  { id: 'nw', name: 'NRW' },
  { id: 'rp', name: 'Rheinl.-Pfalz' },
  { id: 'sl', name: 'Saarland' },
  { id: 'sn', name: 'Sachsen' },
  { id: 'st', name: 'Sachsen-Anh.' },
  { id: 'sh', name: 'Schleswig-H.' },
  { id: 'th', name: 'Thüringen' },
]

const SCHULFORMEN = ['Gymnasium', 'Gesamtschule', 'FOS']

export function BundeslandScreen() {
  const navigate = useNavigate()
  const { profile, updateProfile, loadKcData } = useUser()

  const [bundeslandId, setBundeslandId] = useState(profile?.bundeslandId ?? 'ni')
  const [schulform, setSchulform] = useState(profile?.schulform ?? 'Gymnasium')
  const [schultyp, setSchultyp] = useState<'g8' | 'g9'>(profile?.schultyp ?? 'g9')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const showSchultyp = schulform === 'Gymnasium' || schulform === 'Gesamtschule'
  const bundesland = BUNDESLAENDER.find((b) => b.id === bundeslandId)

  const changed =
    bundeslandId !== profile?.bundeslandId ||
    schulform !== profile?.schulform ||
    (showSchultyp && schultyp !== profile?.schultyp)

  const handleSave = async () => {
    try {
      setError(null)
      updateProfile({
        bundesland: bundesland?.name ?? bundeslandId,
        bundeslandId,
        schulform,
        ...(showSchultyp ? { schultyp } : {}),
      })
      await loadKcData()
      setSaved(true)
      setTimeout(() => navigate('/profil'), 900)
    } catch (err) {
      setError('Fehler beim Speichern. Bitte versuchen Sie es später erneut.')
      console.warn('[BundeslandScreen]', err)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-10">
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
        <h1 className="text-[28px] font-bold text-text-primary">Bundesland & Lehrplan</h1>
        <p className="text-text-secondary text-[13px] mt-2 leading-relaxed">
          Dein Bundesland bestimmt, welcher Kernlehrplan (KC) für KI-Funktionen wie Smart Notes und Probeklausuren verwendet wird.
          Die Schulform legt fest, wie dein Stundenplan und deine Jahrgangsstufen strukturiert sind.
        </p>
      </div>

      <div className="px-4 mt-5 space-y-5">

        {/* ── Bundesland ──────────────────────────────────────── */}
        <div>
          <h2 className="section-label mb-3">Bundesland</h2>
          <div className="grid grid-cols-4 gap-2">
            {BUNDESLAENDER.map((bl) => {
              const active = bundeslandId === bl.id
              return (
                <button
                  key={bl.id}
                  onClick={() => { setBundeslandId(bl.id); setSaved(false) }}
                  className="py-2.5 px-1 rounded-[12px] text-center press-sm transition-all duration-200 border"
                  style={active ? {
                    background: 'linear-gradient(135deg, rgb(var(--color-accent)), rgba(var(--color-accent),0.8))',
                    borderColor: 'transparent',
                    color: 'white',
                    boxShadow: '0 4px 12px rgba(var(--color-accent),0.4)',
                  } : {
                    borderColor: 'rgba(var(--color-border),0.6)',
                    color: 'rgb(var(--color-text-secondary))',
                    background: 'rgb(var(--color-surface))',
                  }}
                >
                  <span className="text-[11px] font-semibold leading-tight block">{bl.name}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Schulform ───────────────────────────────────────── */}
        <div>
          <h2 className="section-label mb-3">Schulform</h2>
          <div className="bg-surface rounded-card shadow-card-adaptive border border-border/60 overflow-hidden">
            {SCHULFORMEN.map((sf, i) => {
              const active = schulform === sf
              return (
                <button
                  key={sf}
                  onClick={() => { setSchulform(sf); setSaved(false) }}
                  className={`w-full flex items-center justify-between px-4 py-3.5 press-sm transition-all ${i < SCHULFORMEN.length - 1 ? 'border-b border-border/50' : ''}`}
                  style={active ? { background: 'rgba(var(--color-accent),0.06)' } : {}}
                >
                  <span className={`text-[15px] font-medium ${active ? 'text-accent' : 'text-text-primary'}`}>{sf}</span>
                  {active && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-accent shrink-0">
                      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── G8 / G9 ─────────────────────────────────────────── */}
        {showSchultyp && (
          <div>
            <h2 className="section-label mb-3">Gymnasialform</h2>
            <div className="grid grid-cols-2 gap-3">
              {([
                ['g8', 'G8', '8 Jahre', '5.–12. Klasse'],
                ['g9', 'G9', '9 Jahre', '5.–13. Klasse'],
              ] as const).map(([id, label, sub, range]) => {
                const active = schultyp === id
                return (
                  <button
                    key={id}
                    onClick={() => { setSchultyp(id); setSaved(false) }}
                    className="py-3.5 px-4 rounded-[14px] border press-sm transition-all text-left"
                    style={active ? {
                      background: 'rgba(var(--color-accent),0.08)',
                      borderColor: 'rgba(var(--color-accent),0.5)',
                    } : {
                      borderColor: 'rgba(var(--color-border),0.6)',
                      background: 'rgb(var(--color-surface))',
                    }}
                  >
                    <p className={`font-bold text-[22px] leading-none ${active ? 'text-accent' : 'text-text-primary'}`}>{label}</p>
                    <p className={`text-[11px] mt-1 ${active ? 'text-accent/70' : 'text-text-muted'}`}>{sub} · {range}</p>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Speichern ───────────────────────────────────────── */}
        <button
          onClick={handleSave}
          disabled={!changed || saved}
          className="w-full py-3.5 rounded-card text-white text-[15px] font-bold press-sm disabled:opacity-40 transition-all"
          style={{
            background: 'linear-gradient(135deg, rgb(var(--color-accent)), rgba(var(--color-accent),0.8))',
            boxShadow: changed && !saved ? '0 4px 16px rgba(var(--color-accent),0.4)' : 'none',
          }}
        >
          {saved ? '✓ Gespeichert' : error ? '✕ Fehler' : 'Speichern'}
        </button>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-card px-4 py-3">
            <p className="text-red-700 text-[13px]">{error}</p>
          </div>
        )}

      </div>
    </div>
  )
}
