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

const mobileNavItems = [
  {
    label: 'Zurück',
    path: null as string | null,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: 'Unterricht',
    path: '/unterricht',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 2v6h6" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="16" y1="13" x2="8" y2="13" strokeLinecap="round" />
        <line x1="16" y1="17" x2="8" y2="17" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: 'Klausur',
    path: '/klausurmodus',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M2 10l10-5 10 5-10 5z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: 'Kalender',
    path: '/kalender',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="4" width="18" height="18" rx="3" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="16" y1="2" x2="16" y2="6" strokeLinecap="round" />
        <line x1="8" y1="2" x2="8" y2="6" strokeLinecap="round" />
        <line x1="3" y1="10" x2="21" y2="10" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: 'Profil',
    path: '/profil',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
]

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

      {/* Canvas — fills remaining height */}
      <div className="flex-1 min-h-0 relative">
        <DrawingCanvas
          isFullscreen
          initialPages={pages}
          onPagesChange={setPages}
          onChange={setDataUrl}
          onAnalyzeRequest={handleAnalyzeRequest}
          onBack={handleBack}
        />

        {/* Floating corner status toast */}
        {showAnalysis && analysisStatus !== 'idle' && (
          <div
            className="absolute right-4 pointer-events-none"
            style={{ zIndex: 20, bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
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

      {/* Mobile-only bottom navigation bar */}
      <nav
        className="shrink-0 md:hidden"
        style={{
          backdropFilter: 'saturate(180%) blur(28px)',
          WebkitBackdropFilter: 'saturate(180%) blur(28px)',
          backgroundColor: 'rgba(var(--color-surface), 0.95)',
          borderTop: '0.5px solid rgba(var(--color-border), 0.4)',
          paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom, 0px))',
          paddingTop: 6,
        }}
      >
        <div className="flex items-center justify-around px-1 max-w-lg mx-auto">
          {mobileNavItems.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                if (item.path === null) { handleBack(); return }
                navigate(item.path)
              }}
              className="flex flex-col items-center gap-[3px] min-w-[56px] py-1 press-sm"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              <div
                className="px-2 py-1.5 rounded-[10px]"
                style={{ background: item.path === null ? 'rgba(124,58,237,0.12)' : 'rgba(var(--color-border), 0.22)' }}
              >
                <div style={{ color: item.path === null ? '#7C3AED' : undefined }}>
                  {item.icon}
                </div>
              </div>
              <span
                className="text-[9px] leading-none tracking-tight font-medium"
                style={{ color: item.path === null ? '#7C3AED' : undefined }}
              >
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
