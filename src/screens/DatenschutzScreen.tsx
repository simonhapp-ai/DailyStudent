import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { supabase } from '../lib/supabase'
import { clearConsent, getConsent } from '../lib/consent'

const SECTIONS = [
  {
    title: '1. Verantwortlicher',
    text: 'Verantwortlicher im Sinne der DSGVO ist der Betreiber von DailyStudent. Die vollständigen Kontaktdaten findest du im Impressum (Einstellungen → Impressum).',
  },
  {
    title: '2. Welche Daten wir speichern',
    text: 'Wir speichern folgende Daten:\n\n• Accountdaten: E-Mail-Adresse, verschlüsseltes Passwort (verwaltet durch Supabase Auth)\n• Profildaten: Name, Klasse, Schulform, Bundesland, Fächer, Stundenplan\n• Lerninhalte: Notizen, Smart Notes, Karteikarten, Lernzettel, Probeklausuren, Lernpläne\n• Nutzungsstatistiken: Lern-Streak, Lernaktivität, Scan-Anzahl\n• Noten: Halbjahresergebnisse für den Abi-Rechner\n• Zahlungsstatus: Pro-Abo-Status (kein Speichern von Zahlungsdaten)',
  },
  {
    title: '3. Rechtsgrundlage',
    text: 'Die Verarbeitung deiner Daten erfolgt auf Basis von Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) für alle Daten die zur Bereitstellung des Dienstes notwendig sind, sowie Art. 6 Abs. 1 lit. a DSGVO (Einwilligung) für optionale Funktionen wie KI-Analyse.',
  },
  {
    title: '4. KI-Verarbeitung (Groq & Google)',
    text: 'Für KI-Funktionen (Smart Notes, Karteikarten, Probeklausuren, Lernplan) werden Lerninhalte temporär an folgende Dienste übertragen:\n\n• Groq Inc. (USA): Textgenerierung und Foto-OCR\n• Google LLC (USA/EU): Probeklausur-Generierung und Lernplanung\n\nDiese Inhalte werden ausschließlich zur Antwortgenerierung verwendet und nicht dauerhaft gespeichert oder zum Modelltraining genutzt. Es werden keine persönlichen Identifikatoren (Name, E-Mail) übermittelt. Die Übertragung erfolgt verschlüsselt über unsere Server in der EU (Supabase Frankfurt).',
  },
  {
    title: '5. Datenspeicherung & Hosting',
    text: 'Deine Daten werden gespeichert bei:\n\n• Supabase (EU-West-1, Frankfurt, Deutschland): Datenbank, Authentifizierung, Serverlogik — DSGVO-konform, AVV vorhanden\n• Stripe Inc. (USA): Zahlungsabwicklung — kein Speichern von Kreditkartendaten bei uns\n\nAlle Verbindungen sind TLS-verschlüsselt. Supabase nutzt Row Level Security: Jeder Nutzer kann ausschließlich auf seine eigenen Daten zugreifen.',
  },
  {
    title: '6. Weitergabe an Dritte',
    text: 'Deine Daten werden nicht verkauft oder für Werbezwecke genutzt. Eine Weitergabe erfolgt ausschließlich an die oben genannten Technologiepartner (Supabase, Groq, Google, Stripe) im für den Dienst notwendigen Umfang.',
  },
  {
    title: '7. Speicherdauer',
    text: 'Deine Daten werden gespeichert, solange dein Account besteht. Nach Löschung des Accounts werden alle personenbezogenen Daten innerhalb von 30 Tagen unwiderruflich gelöscht. Zahlungsbelege werden entsprechend der gesetzlichen Aufbewahrungspflichten (10 Jahre) von Stripe aufbewahrt.',
  },
  {
    title: '8. Cookies & Tracking',
    text: 'DailyStudent verwendet keine Tracking-Cookies und kein verhaltensbasiertes Tracking.\n\nOptional (nur mit deiner Einwilligung):\n• Vercel Analytics: anonyme Seitenstatistiken (Seitenaufrufe, Herkunftsland, Gerättyp) — cookielos, keine persönlichen Daten, kein Cross-Site-Tracking. Betreiber: Vercel Inc., USA. Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO (Einwilligung).\n\nTechnisch notwendig (keine Einwilligung erforderlich):\n• Auth-Token im LocalStorage zur Sitzungsverwaltung\n• App-Daten im LocalStorage (Offline-Nutzung)\n\nDu kannst deine Einwilligung jederzeit über den Button „Cookie-Einstellungen zurücksetzen" widerrufen.',
  },
  {
    title: '9. Deine Rechte (DSGVO)',
    text: 'Du hast folgende Rechte:\n\n• Auskunft (Art. 15 DSGVO): Welche Daten wir über dich gespeichert haben\n• Berichtigung (Art. 16 DSGVO): Korrektur falscher Daten\n• Löschung (Art. 17 DSGVO): Vollständige Löschung deines Accounts und aller Daten\n• Datenportabilität (Art. 20 DSGVO): Export deiner Daten\n• Widerspruch (Art. 21 DSGVO): Gegen die Verarbeitung deiner Daten\n• Beschwerde: Bei der zuständigen Datenschutzbehörde\n\nAnfragen richten an: datenschutz@dailystudent.de',
  },
  {
    title: '10. Minderjährige',
    text: 'DailyStudent richtet sich an Schülerinnen und Schüler ab 13 Jahren. Für Nutzer unter 16 Jahren ist die Einwilligung der Erziehungsberechtigten erforderlich. Wir erheben keine bewusst Daten von Kindern unter 13 Jahren.',
  },
]

const DELETE_ITEMS = [
  'Alle Notizen, Smart Notes und Fotos',
  'Alle Karteikarten und Lerndecks',
  'Alle Lernzettel und Probeklausuren',
  'Alle Lernpläne und Statistiken',
  'Dein Profil, Noten und Einstellungen',
  'Dein Account und alle Zugangsdaten',
]

export function DatenschutzScreen() {
  const navigate = useNavigate()
  const { signOut } = useUser()

  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmInput, setConfirmInput] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [consentReset, setConsentReset] = useState(false)

  const currentConsent = getConsent()

  const canDelete = confirmInput.toLowerCase() === 'löschen'

  const handleDelete = async () => {
    if (!canDelete) return
    setDeleting(true)
    setDeleteError(null)

    try {
      const { error } = await supabase.functions.invoke('delete-account')
      if (error) throw new Error(error.message)
    } catch (err) {
      // If Edge Function fails, still clear local data and sign out
      console.error('delete-account error:', err)
      setDeleteError('Serverfehler beim Löschen. Lokale Daten werden trotzdem entfernt.')
    }

    localStorage.removeItem('lernapp_v1')
    await signOut()
    window.location.href = '/'
  }

  const openConfirm = () => {
    setConfirmInput('')
    setDeleteError(null)
    setShowConfirm(true)
  }

  const closeConfirm = () => {
    if (deleting) return
    setShowConfirm(false)
    setConfirmInput('')
    setDeleteError(null)
  }

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
        <h1 className="text-[28px] font-bold text-text-primary">Datenschutz</h1>
        <p className="text-text-muted text-[13px] mt-0.5">Datenschutzerklärung gem. DSGVO · Stand: Juni 2026</p>
      </div>

      <div className="px-4 mt-5 space-y-3">

        {/* ── Abschnitte ───────────────────────────────────────── */}
        {SECTIONS.map((s) => (
          <div key={s.title} className="bg-surface rounded-card shadow-card-adaptive border border-border/60 p-4">
            <p className="text-text-primary font-semibold text-[15px] mb-2">{s.title}</p>
            <p className="text-text-secondary text-[13px] leading-relaxed whitespace-pre-line">{s.text}</p>
          </div>
        ))}

        {/* ── Trennlinie ──────────────────────────────────────── */}
        <div className="pt-3 pb-1">
          <div className="h-px bg-border/40" />
        </div>

        {/* ── Cookie-Einstellungen ─────────────────────────────── */}
        <div>
          <h2 className="section-label mb-2.5">Cookie-Einstellungen</h2>
          <div className="bg-surface rounded-card shadow-card-adaptive border border-border/60 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-text-primary font-semibold text-[14px]">Notwendige Cookies</p>
                <p className="text-text-muted text-[12px] mt-0.5">Auth-Token, App-Daten — immer aktiv</p>
              </div>
              <span className="mt-0.5 shrink-0 rounded-full bg-green-500/15 px-2 py-0.5 text-[11px] font-semibold text-green-500">
                Aktiv
              </span>
            </div>
            <div className="h-px bg-border/30" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-text-primary font-semibold text-[14px]">Analytics (Vercel)</p>
                <p className="text-text-muted text-[12px] mt-0.5">Anonyme Seitenstatistiken</p>
              </div>
              {currentConsent === null ? (
                <span className="mt-0.5 shrink-0 rounded-full bg-border/40 px-2 py-0.5 text-[11px] font-semibold text-text-muted">
                  Ausstehend
                </span>
              ) : currentConsent.analytics ? (
                <span className="mt-0.5 shrink-0 rounded-full bg-green-500/15 px-2 py-0.5 text-[11px] font-semibold text-green-500">
                  Akzeptiert
                </span>
              ) : (
                <span className="mt-0.5 shrink-0 rounded-full bg-border/40 px-2 py-0.5 text-[11px] font-semibold text-text-muted">
                  Abgelehnt
                </span>
              )}
            </div>
            {consentReset ? (
              <p className="text-[12px] text-green-500 font-medium pt-1">
                Einstellungen zurückgesetzt — beim nächsten Laden erscheint der Banner erneut.
              </p>
            ) : (
              <button
                onClick={() => {
                  clearConsent()
                  setConsentReset(true)
                }}
                className="w-full mt-1 py-2.5 rounded-[12px] border border-border/60 text-text-secondary text-[13px] font-medium press-sm hover:bg-surface-hover transition-colors"
              >
                Cookie-Einstellungen zurücksetzen
              </button>
            )}
          </div>
        </div>

        <div className="pt-1 pb-1">
          <div className="h-px bg-border/40" />
        </div>

        {/* ── Konto löschen ───────────────────────────────────── */}
        <div>
          <h2 className="section-label mb-2.5">Account & Datenlöschung</h2>
          <p className="text-text-muted text-[12px] mb-3 leading-relaxed px-0.5">
            Löscht deinen gesamten Account und alle damit verbundenen Daten unwiderruflich — gemäß Art. 17 DSGVO (Recht auf Löschung).
          </p>
          <button
            onClick={openConfirm}
            className="w-full py-3.5 rounded-card border press-sm transition-all text-[15px] font-bold"
            style={{
              borderColor: 'rgba(var(--color-danger), 0.35)',
              color: 'rgb(var(--color-danger))',
              background: 'rgba(var(--color-danger), 0.05)',
            }}
          >
            Account & alle Daten löschen
          </button>
        </div>

      </div>

      {/* ── Bestätigungs-Modal ──────────────────────────────── */}
      {showConfirm && (
        <>
          <div className="fixed inset-0 z-[50] bg-black/50" onClick={closeConfirm} />
          <div
            className="fixed inset-x-4 z-[51] bg-surface rounded-2xl shadow-float overflow-hidden"
            style={{ top: '12%' }}
          >
            <div className="px-5 pt-6 pb-5">

              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(var(--color-danger), 0.1)' }}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-danger))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>

              <h2 className="text-[18px] font-bold text-text-primary text-center mb-2">Account unwiderruflich löschen?</h2>
              <p className="text-text-secondary text-[13px] text-center leading-relaxed mb-4">
                Diese Aktion kann nicht rückgängig gemacht werden. Folgendes wird gelöscht:
              </p>

              <div className="bg-background rounded-[12px] px-4 py-3 mb-4 space-y-2">
                {DELETE_ITEMS.map((item) => (
                  <div key={item} className="flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'rgb(var(--color-danger))' }} />
                    <span className="text-[13px] text-text-secondary">{item}</span>
                  </div>
                ))}
              </div>

              {deleteError && (
                <div className="bg-danger/10 border border-danger/20 rounded-[10px] px-3 py-2.5 mb-4">
                  <p className="text-[12px] text-danger leading-snug">{deleteError}</p>
                </div>
              )}

              <p className="text-text-muted text-[12px] mb-2 px-0.5">
                Tippe <span className="font-bold text-text-primary">löschen</span> um fortzufahren:
              </p>
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="löschen"
                autoFocus
                className="w-full bg-background border rounded-[12px] px-4 py-3 text-[14px] text-text-primary placeholder-text-muted focus:outline-none transition-colors mb-4"
                style={{
                  borderColor: canDelete
                    ? 'rgba(var(--color-danger), 0.6)'
                    : 'rgba(var(--color-border), 0.8)',
                }}
              />

              <div className="flex gap-2">
                <button
                  onClick={closeConfirm}
                  disabled={deleting}
                  className="flex-1 py-3 rounded-[14px] bg-surface-hover text-text-secondary text-[14px] font-semibold press-sm disabled:opacity-50"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleDelete}
                  disabled={!canDelete || deleting}
                  className="flex-1 py-3 rounded-[14px] text-white text-[14px] font-bold press-sm disabled:opacity-40 transition-all"
                  style={{
                    background: canDelete
                      ? 'linear-gradient(135deg, rgb(var(--color-danger)), rgba(var(--color-danger),0.85))'
                      : 'rgba(var(--color-danger), 0.25)',
                    boxShadow: canDelete ? '0 4px 16px rgba(var(--color-danger),0.35)' : 'none',
                  }}
                >
                  {deleting ? 'Wird gelöscht…' : 'Endgültig löschen'}
                </button>
              </div>

            </div>
          </div>
        </>
      )}
    </div>
  )
}
