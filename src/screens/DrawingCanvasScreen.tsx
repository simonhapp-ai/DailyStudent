import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { DrawingCanvas } from '../components/ui/DrawingCanvas'
import type { CanvasPageData } from '../components/ui/DrawingCanvas'
import { extractTextFromImage, generateSmartNote } from '../lib/groq'

interface PhotoBlockAIResult {
  transcription: string
  contentType: 'info' | 'aufgabe' | 'beides'
  summary: string
  keywords: string[]
  examTopics: string[]
  tasks: Array<{ question: string; steps: string[]; answer: string; proof?: string }>
}

type AnalysisStatus = 'idle' | 'transcribing' | 'analyzing' | 'done' | 'error'

interface CanvasScreenState {
  blockId: string
  initialPages: CanvasPageData[]
  subjectName: string
  returnTo: string
}

export function DrawingCanvasScreen() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const incoming  = (location.state ?? {}) as Partial<CanvasScreenState>

  const [pages,     setPages]   = useState<CanvasPageData[]>(
    incoming.initialPages?.length
      ? incoming.initialPages
      : [{ id: 'p0', background: { type: 'white' }, strokes: [], images: [] }],
  )
  const [dataUrl,   setDataUrl] = useState<string | null>(null)

  const [analysisStatus,  setAnalysisStatus]  = useState<AnalysisStatus>('idle')
  const [analysisError,   setAnalysisError]   = useState('')
  const [transcription,   setTranscription]   = useState<string | null>(null)
  const [analysisResult,  setAnalysisResult]  = useState<PhotoBlockAIResult | null>(null)
  const [showAnalysis,    setShowAnalysis]     = useState(false)

  const handleBack = () => {
    const patch: Record<string, unknown> = {
      blockId:  incoming.blockId,
      pages,
      dataUrl,
    }
    if (analysisStatus !== 'idle') {
      patch.aiStatus      = analysisStatus
      patch.aiError       = analysisError
      patch.transcription = transcription
      patch.aiResult      = analysisResult
    }
    navigate(incoming.returnTo ?? '/unterricht', {
      state: { updatedBlock: patch },
    })
  }

  const handleAnalyzeRequest = async (pageDataUrl: string) => {
    setAnalysisStatus('transcribing')
    setAnalysisError('')
    setTranscription(null)
    setAnalysisResult(null)
    setShowAnalysis(true)
    try {
      const text = await extractTextFromImage(pageDataUrl)
      if (!text.trim()) {
        setAnalysisStatus('error')
        setAnalysisError('Kein Text erkannt — bitte deutlicher schreiben.')
        return
      }
      setTranscription(text)
      setAnalysisStatus('analyzing')
      const smartNote = await generateSmartNote(text, incoming.subjectName ?? 'Allgemein', incoming.blockId ?? 'block')
      setAnalysisResult({
        transcription: text,
        contentType: (smartNote.contentType as PhotoBlockAIResult['contentType']) ?? 'info',
        summary:     smartNote.summary,
        keywords:    smartNote.keywords,
        examTopics:  smartNote.examTopics,
        tasks:       [],
      })
      setAnalysisStatus('done')
    } catch {
      setAnalysisStatus('error')
      setAnalysisError('Analyse fehlgeschlagen — bitte erneut versuchen.')
    }
  }

  return (
    <div className="fixed inset-0 flex flex-col" style={{ zIndex: 50, backgroundColor: '#E2E4E9' }}>

      {/* Analysis panel — appears above canvas when active */}
      {showAnalysis && analysisStatus !== 'idle' && (
        <div
          className="shrink-0 overflow-y-auto"
          style={{
            maxHeight: '35vh',
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid rgba(0,0,0,0.08)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          <div className="px-4 py-3 space-y-2.5">
            {(analysisStatus === 'transcribing' || analysisStatus === 'analyzing') && (
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin shrink-0" />
                <span className="text-[12px] text-text-secondary">
                  {analysisStatus === 'transcribing' ? 'Handschrift wird transkribiert…' : 'Smart Note wird erstellt…'}
                </span>
              </div>
            )}
            {analysisStatus === 'error' && (
              <div className="flex items-center gap-2 text-danger text-[12px]">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" strokeLinecap="round" />
                </svg>
                {analysisError}
              </div>
            )}
            {analysisStatus === 'done' && analysisResult && (
              <>
                <div
                  className="flex items-start gap-2 rounded-xl px-3 py-2"
                  style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2.2" className="shrink-0 mt-0.5">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><path d="M12 9v4M12 17h.01" strokeLinecap="round" />
                  </svg>
                  <span className="text-[11px] font-medium" style={{ color: '#B45309' }}>
                    KI-Transkription kann Fehler enthalten — mit Handschrift vergleichen
                  </span>
                </div>
                <div>
                  <p className="section-label mb-1">Zusammenfassung</p>
                  <p className="text-[13px] text-text-secondary leading-relaxed">{analysisResult.summary}</p>
                </div>
                {analysisResult.keywords.length > 0 && (
                  <div>
                    <p className="section-label mb-1.5">Schlüsselbegriffe</p>
                    <div className="flex flex-wrap gap-1.5">
                      {analysisResult.keywords.map(kw => (
                        <span key={kw} className="px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: 'rgba(var(--color-accent),0.1)', color: 'rgb(var(--color-accent))' }}>{kw}</span>
                      ))}
                    </div>
                  </div>
                )}
                {analysisResult.examTopics.length > 0 && (
                  <div>
                    <p className="section-label mb-1.5">Klausurthemen</p>
                    <div className="flex flex-wrap gap-1.5">
                      {analysisResult.examTopics.map(t => (
                        <span key={t} className="px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: 'rgba(16,185,129,0.1)', color: '#059669' }}>{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Canvas — fills everything, back button lives inside its toolbar */}
      <div className="flex-1 min-h-0">
        <DrawingCanvas
          isFullscreen
          initialPages={pages}
          onPagesChange={setPages}
          onChange={setDataUrl}
          onAnalyzeRequest={handleAnalyzeRequest}
          onBack={handleBack}
        />
      </div>
    </div>
  )
}
