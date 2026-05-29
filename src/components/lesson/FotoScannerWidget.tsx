import { useRef, useState } from 'react'
import type { GeneratedSmartNote } from '../../types'
import { extractTextFromImage, generateSmartNote } from '../../lib/groq'
import { analyzeFileToSmartNote } from '../../lib/gemini'

type ScanStatus = 'idle' | 'selected' | 'ocr' | 'generating' | 'done' | 'error'

interface FotoScannerWidgetProps {
  lessonId?: string
  subjectName?: string
  onNoteGenerated?: (note: GeneratedSmartNote) => void
}

export function FotoScannerWidget({ lessonId, subjectName = 'Allgemein', onNoteGenerated }: FotoScannerWidgetProps) {
  const [status, setStatus] = useState<ScanStatus>('idle')
  const [preview, setPreview] = useState<string | null>(null)
  const [isPdf, setIsPdf] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File | undefined) => {
    if (!file) return
    const pdf = file.type === 'application/pdf'
    setIsPdf(pdf)
    setSelectedFile(file)
    setErrorMsg(null)
    if (pdf) {
      setPreview(null)
      setStatus('selected')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
      setStatus('selected')
    }
    reader.readAsDataURL(file)
  }

  const reset = () => {
    setStatus('idle')
    setPreview(null)
    setIsPdf(false)
    setSelectedFile(null)
    setErrorMsg(null)
    if (cameraRef.current) cameraRef.current.value = ''
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const analyze = async () => {
    setErrorMsg(null)
    if (isPdf && selectedFile) {
      try {
        setStatus('ocr')
        const noteId = lessonId ?? crypto.randomUUID()
        const { generated } = await analyzeFileToSmartNote(selectedFile, noteId, subjectName)
        onNoteGenerated?.(generated)
        setStatus('done')
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Analyse fehlgeschlagen')
        setStatus('error')
      }
    } else if (!isPdf && preview) {
      try {
        setStatus('ocr')
        const rawText = await extractTextFromImage(preview)
        setStatus('generating')
        const note = await generateSmartNote(rawText, subjectName, lessonId ?? crypto.randomUUID())
        onNoteGenerated?.(note)
        setStatus('done')
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Analyse fehlgeschlagen')
        setStatus('error')
      }
    }
  }

  return (
    <div className="p-4">
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])} />
      <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])} />

      {/* IDLE */}
      {status === 'idle' && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-accent" strokeWidth="2">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="13" r="4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-text-primary text-sm font-semibold">Foto oder PDF hinzufügen</span>
            <span className="text-xs text-text-muted ml-auto">KI analysiert automatisch</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => cameraRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-card border border-border bg-background hover:bg-surface-hover transition-colors text-sm text-text-secondary font-medium"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              Foto aufnehmen
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-card border border-border bg-background hover:bg-surface-hover transition-colors text-sm text-text-secondary font-medium"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
                <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" />
              </svg>
              Datei / PDF
            </button>
          </div>
        </div>
      )}

      {/* SELECTED */}
      {status === 'selected' && (preview !== null || isPdf) && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2.5">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-success text-sm font-semibold">
              {isPdf ? 'PDF bereit' : 'Scan bereit'}
            </span>
            <button onClick={reset} className="ml-auto text-xs text-text-muted hover:text-text-secondary transition-colors">
              Neu aufnehmen
            </button>
          </div>
          <div className="flex gap-3 items-start">
            {isPdf ? (
              <div className="w-20 h-20 rounded-card border border-border bg-surface-hover flex flex-col items-center justify-center shrink-0 gap-1">
                <span className="text-2xl">📄</span>
                <span className="text-[9px] text-text-muted font-bold uppercase tracking-wide">PDF</span>
              </div>
            ) : (
              <img src={preview!} alt="Scan preview"
                className="w-20 h-20 object-cover rounded-card border border-border shrink-0" />
            )}
            <div className="flex-1">
              {isPdf ? (
                <p className="text-text-secondary text-xs mb-3 leading-relaxed">
                  <span className="text-accent font-medium">Gemini</span> liest das PDF und erstellt eine Smart Note mit Zusammenfassung und Schlüsselbegriffen.
                </p>
              ) : (
                <p className="text-text-secondary text-xs mb-3 leading-relaxed">
                  <span className="text-accent font-medium">Groq KI</span> transkribiert das Bild, fasst zusammen und löst Aufgaben automatisch.
                </p>
              )}
              <button
                onClick={() => { void analyze() }}
                className="w-full py-2.5 rounded-card bg-accent text-white text-sm font-semibold hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                    strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                KI-Analyse starten
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OCR — Schritt 1 */}
      {status === 'ocr' && (
        <div className="flex items-center gap-3 py-1">
          <div className="w-9 h-9 rounded-btn bg-accent-soft flex items-center justify-center shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-accent animate-spin" strokeWidth="2">
              <path d="M21 12a9 9 0 11-6.219-8.56" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <p className="text-text-primary text-sm font-semibold">
              {isPdf ? 'PDF wird analysiert…' : 'Foto wird gelesen…'}
            </p>
            <p className="text-text-muted text-xs mt-0.5">
              {isPdf ? 'Gemini versteht das Dokument' : 'Llama Vision erkennt Text und Formeln'}
            </p>
          </div>
        </div>
      )}

      {/* GENERATING — Schritt 2 (nur für Fotos via Groq) */}
      {status === 'generating' && (
        <div className="flex items-center gap-3 py-1">
          <div className="w-9 h-9 rounded-btn bg-accent-soft flex items-center justify-center shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-accent animate-spin" strokeWidth="2">
              <path d="M21 12a9 9 0 11-6.219-8.56" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <p className="text-text-primary text-sm font-semibold">Smart Note wird erstellt…</p>
            <p className="text-text-muted text-xs mt-0.5">Llama 3.3 generiert Zusammenfassung & Karten</p>
          </div>
        </div>
      )}

      {/* DONE */}
      {status === 'done' && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-btn bg-success/10 flex items-center justify-center shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <p className="text-success text-sm font-semibold">Smart Note erstellt</p>
              <p className="text-text-muted text-xs mt-0.5">Scroll nach unten zum Lesen</p>
            </div>
          </div>
          <button onClick={reset} className="text-xs text-text-muted hover:text-text-secondary transition-colors">
            {isPdf ? 'Neues PDF' : 'Neues Foto'}
          </button>
        </div>
      )}

      {/* ERROR */}
      {status === 'error' && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-btn bg-danger/10 flex items-center justify-center shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F87171" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" strokeLinecap="round" />
                <line x1="9" y1="9" x2="15" y2="15" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <p className="text-danger text-sm font-semibold">Analyse fehlgeschlagen</p>
              {errorMsg && <p className="text-text-muted text-xs mt-0.5 leading-relaxed">{errorMsg}</p>}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { void analyze() }}
              className="flex-1 py-2 rounded-card bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Nochmal versuchen
            </button>
            <button
              onClick={reset}
              className="px-4 py-2 rounded-card border border-border text-text-secondary text-sm hover:bg-surface-hover transition-colors"
            >
              Neu
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
