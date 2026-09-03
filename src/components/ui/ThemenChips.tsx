import { useRef, useState } from 'react'
import { extractTopicsFromImage } from '../../lib/groq'

// Themen-Eingabe als Chips: Vorschläge antippen, frei tippen, oder eine
// abfotografierte Themenliste per KI einlesen. Herausgelöst aus dem
// Lernplan-Konfigurator, damit dieselbe Eingabe auch beim Klausur-Eintragen
// zur Verfügung steht.

interface ThemenChipsProps {
  topics: string[]
  onChange: (next: string[]) => void
  /** Fach — steuert nur den Platzhaltertext / die Scan-Instruktion. */
  subjectId?: string
  /** Tippbare Vorschlags-Chips (z. B. KC-Themen oder statische Themenliste). */
  suggestions?: string[]
  placeholder?: string
  /** „Liste scannen"-Knopf zeigen (Default: ja). */
  allowScan?: boolean
}

export function ThemenChips({
  topics,
  onChange,
  suggestions = [],
  placeholder = 'Thema eintragen',
  allowScan = true,
}: ThemenChipsProps) {
  const [input, setInput] = useState('')
  const [scanning, setScanning] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const add = (raw: string) => {
    const val = raw.trim()
    if (!val || topics.includes(val)) return
    onChange([...topics, val])
  }

  const remove = (t: string) => onChange(topics.filter((x) => x !== t))

  const commitInput = () => {
    if (!input.trim()) return
    add(input)
    setInput('')
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setScanning(true)
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const scanned = await extractTopicsFromImage(dataUrl)
      const fresh = scanned.filter((t) => !topics.includes(t))
      if (fresh.length > 0) onChange([...topics, ...fresh])
    } catch {
      // still — der Nutzer kann es erneut versuchen
    } finally {
      setScanning(false)
    }
  }

  const openSuggestions = suggestions.filter((s) => !topics.includes(s)).slice(0, 8)

  return (
    <div className="space-y-2.5">
      {allowScan && (
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Themen</p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={scanning}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-btn bg-surface border border-border text-text-secondary text-[12px] font-medium hover:bg-surface-hover active:scale-[0.97] transition-all disabled:opacity-50"
          >
            {scanning
              ? <span className="w-3.5 h-3.5 border border-accent/40 border-t-accent rounded-full animate-spin" />
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><circle cx="12" cy="13" r="4" /></svg>}
            {scanning ? 'Scannt…' : 'Liste scannen'}
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />

      {topics.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {topics.map((t) => (
            <span
              key={t}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-[12px] font-medium bg-accent/12 text-text-primary border border-accent/20"
            >
              {t}
              <button
                type="button"
                onClick={() => remove(t)}
                className="w-4 h-4 rounded-full bg-accent/20 hover:bg-accent/40 flex items-center justify-center transition-colors"
                aria-label={`${t} entfernen`}
              >
                <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {openSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {openSuggestions.map((s) => (
            <button
              type="button"
              key={s}
              onClick={() => add(s)}
              className="px-2.5 py-1.5 rounded-pill text-[12px] font-medium bg-[rgb(120,120,128)]/[0.12] dark:bg-[rgb(120,120,128)]/[0.24] text-text-secondary press-sm"
            >
              + {s.length > 28 ? s.slice(0, 28) + '…' : s}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitInput() } }}
          placeholder={placeholder}
          className="flex-1 bg-background border border-border rounded-btn px-3 py-2 text-text-primary text-[13px] placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
        />
        <button
          type="button"
          onClick={commitInput}
          disabled={!input.trim()}
          className="w-9 h-9 rounded-btn bg-accent flex items-center justify-center shrink-0 disabled:opacity-30 active:scale-[0.95] transition-all"
          aria-label="Thema hinzufügen"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}
