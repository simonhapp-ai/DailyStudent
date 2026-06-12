import { useState, useEffect } from 'react'
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

  // Auto-hide the "done" toast after 4 seconds
  useEffect(() => {
    if (analysisStatus !== 'done') return
    const t = setTimeout(() => setShowAnalysis(false), 4000)
    return () => clearTimeout(t)
  }, [analysisStatus])

  return (
    <div className="fixed inset-0 flex flex-col" style={{ zIndex: 50, backgroundColor: '#E2E4E9' }}>

      {/* Canvas — fills everything */}
      <div className="flex-1 min-h-0 relative">
        <DrawingCanvas
          isFullscreen
          initialPages={pages}
          onPagesChange={setPages}
          onChange={setDataUrl}
          onAnalyzeRequest={handleAnalyzeRequest}
          onBack={handleBack}
        />

        {/* Floating corner status — replaces the old full panel */}
        {showAnalysis && analysisStatus !== 'idle' && (
          <div
            className="absolute bottom-16 right-4 pointer-events-none"
            style={{ zIndex: 20 }}
          >
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-2xl"
              style={{
                background: 'rgba(30,30,40,0.88)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                maxWidth: 260,
              }}
            >
              {(analysisStatus === 'transcribing' || analysisStatus === 'analyzing') && (
                <>
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin shrink-0" />
                  <span className="text-[12px] font-semibold text-white">
                    {analysisStatus === 'transcribing' ? 'Handschrift wird erkannt…' : 'Smart Note wird erstellt…'}
                  </span>
                </>
              )}
              {analysisStatus === 'error' && (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FF453A" strokeWidth="2.2" className="shrink-0">
                    <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" strokeLinecap="round" />
                  </svg>
                  <span className="text-[12px] font-semibold" style={{ color: '#FF453A' }}>
                    {analysisError}
                  </span>
                </>
              )}
              {analysisStatus === 'done' && (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#30D158" strokeWidth="2.5" className="shrink-0">
                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-[12px] font-semibold text-white">
                    KI-Analyse fertig <span style={{ color: '#30D158' }}>(in Mitschrift)</span>
                  </span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
