import type { CanvasPageData } from '../components/ui/DrawingCanvas'

interface PhotoBlockAIResult {
  transcription: string
  contentType: 'info' | 'aufgabe' | 'beides'
  summary: string
  keywords: string[]
  examTopics: string[]
  tasks: Array<{ question: string; steps: string[]; answer: string; proof?: string }>
}

export interface DrawingBlockPatch {
  blockId: string
  pages: CanvasPageData[]
  dataUrl: string | null
  aiStatus?: string
  aiError?: string
  transcription?: string | null
  aiResult?: PhotoBlockAIResult | null
}

let _pending: DrawingBlockPatch | null = null

export const drawingBlockTransfer = {
  store: (patch: DrawingBlockPatch) => { _pending = patch },
  consume: (): DrawingBlockPatch | null => {
    const d = _pending
    _pending = null
    return d
  },
}
