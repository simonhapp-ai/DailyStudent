import { useRef, useState, useEffect, useCallback } from 'react'
import { getStroke } from 'perfect-freehand'

type Tool = 'pen' | 'highlighter' | 'eraser'

const COLORS = [
  { id: 'white' as const, hex: '#F0F0F5' },
  { id: 'blue'  as const, hex: '#7C6FFF' },
  { id: 'red'   as const, hex: '#F87171' },
]
type ColorId = (typeof COLORS)[number]['id']

interface StrokeRecord {
  points: number[][]
  tool: Tool
  colorHex: string
}

// Convert perfect-freehand outline points to a Path2D
function buildPath(outline: number[][]): Path2D {
  const path = new Path2D()
  if (outline.length === 0) return path
  if (outline.length === 1) {
    path.arc(outline[0][0], outline[0][1], 2, 0, Math.PI * 2)
    return path
  }
  path.moveTo(outline[0][0], outline[0][1])
  for (let i = 1; i < outline.length - 1; i++) {
    const mx = (outline[i][0] + outline[i + 1][0]) / 2
    const my = (outline[i][1] + outline[i + 1][1]) / 2
    path.quadraticCurveTo(outline[i][0], outline[i][1], mx, my)
  }
  path.lineTo(outline[outline.length - 1][0], outline[outline.length - 1][1])
  path.closePath()
  return path
}

function paintStroke(ctx: CanvasRenderingContext2D, points: number[][], tool: Tool, colorHex: string) {
  if (points.length === 0) return
  const outline = getStroke(points, {
    size: tool === 'pen' ? 4 : 22,
    smoothing: 0.5,
    thinning: tool === 'pen' ? 0.5 : 0,
    simulatePressure: tool === 'pen',
  })
  const path = buildPath(outline)
  ctx.save()
  if (tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out'
    ctx.fillStyle = '#000'
  } else if (tool === 'highlighter') {
    ctx.globalAlpha = 0.4
    ctx.fillStyle = '#FACC15'
  } else {
    ctx.fillStyle = colorHex
  }
  ctx.fill(path)
  ctx.restore()
}

function resizeCanvas(canvas: HTMLCanvasElement, cssW: number, cssH: number) {
  const dpr = window.devicePixelRatio || 1
  canvas.width = Math.round(cssW * dpr)
  canvas.height = Math.round(cssH * dpr)
  canvas.style.width = `${cssW}px`
  canvas.style.height = `${cssH}px`
  const ctx = canvas.getContext('2d')
  if (ctx) ctx.scale(dpr, dpr)
}

function clearCanvas(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')
  const dpr = window.devicePixelRatio || 1
  if (ctx) ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)
}

function exportPNG(canvas: HTMLCanvasElement): string {
  const exp = document.createElement('canvas')
  exp.width = canvas.width
  exp.height = canvas.height
  const ctx = exp.getContext('2d')!
  ctx.fillStyle = '#161618'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(canvas, 0, 0)
  return exp.toDataURL('image/png')
}

export function DrawingCanvas({ onChange, isFullscreen = false }: { onChange: (dataUrl: string | null) => void; isFullscreen?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const bgRef = useRef<HTMLCanvasElement>(null)
  const fgRef = useRef<HTMLCanvasElement>(null)
  const activeRef = useRef<StrokeRecord | null>(null)
  // strokesRef is used by the resize observer (stable ref, doesn't trigger re-renders)
  const strokesRef = useRef<StrokeRecord[]>([])
  const redoStackRef = useRef<StrokeRecord[]>([])

  const [tool, setTool] = useState<Tool>('pen')
  const [color, setColor] = useState<ColorId>('white')
  const [hasContent, setHasContent] = useState(false)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const updateHistoryState = useCallback(() => {
    setCanUndo(strokesRef.current.length > 0)
    setCanRedo(redoStackRef.current.length > 0)
    setHasContent(strokesRef.current.length > 0)
  }, [])

  const redrawBg = useCallback((strokes: StrokeRecord[]) => {
    const bg = bgRef.current
    if (!bg) return
    clearCanvas(bg)
    const ctx = bg.getContext('2d')
    if (!ctx) return
    for (const s of strokes) paintStroke(ctx, s.points, s.tool, s.colorHex)
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    function resize() {
      const { width: w, height: h } = container!.getBoundingClientRect()
      if (bgRef.current) resizeCanvas(bgRef.current, w, h)
      if (fgRef.current) resizeCanvas(fgRef.current, w, h)
      redrawBg(strokesRef.current)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(container)
    return () => ro.disconnect()
  }, [redrawBg])

  const getXY = (e: React.PointerEvent<HTMLCanvasElement>): number[] => {
    const rect = fgRef.current!.getBoundingClientRect()
    return [e.clientX - rect.left, e.clientY - rect.top, e.pressure || 0.5]
  }

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const colorHex = COLORS.find((c) => c.id === color)!.hex
    activeRef.current = { points: [getXY(e)], tool, colorHex }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!activeRef.current || e.buttons === 0) return
    activeRef.current.points.push(getXY(e))
    const fg = fgRef.current
    if (!fg) return
    const ctx = fg.getContext('2d')
    if (!ctx) return
    clearCanvas(fg)
    paintStroke(ctx, activeRef.current.points, activeRef.current.tool, activeRef.current.colorHex)
  }

  const onPointerUp = () => {
    const stroke = activeRef.current
    activeRef.current = null
    if (!stroke || stroke.points.length === 0) return

    // Commit stroke to bg canvas immediately (no re-render lag)
    const bgCtx = bgRef.current?.getContext('2d')
    if (bgCtx) paintStroke(bgCtx, stroke.points, stroke.tool, stroke.colorHex)

    // Clear in-progress stroke from fg canvas
    if (fgRef.current) clearCanvas(fgRef.current)

    // Persist for resize replay
    strokesRef.current = [...strokesRef.current, stroke]
    redoStackRef.current = []
    updateHistoryState()

    // Export PNG to parent
    if (bgRef.current) onChange(exportPNG(bgRef.current))
  }

  const handleUndo = () => {
    if (strokesRef.current.length === 0) return
    const popped = strokesRef.current[strokesRef.current.length - 1]
    strokesRef.current = strokesRef.current.slice(0, -1)
    redoStackRef.current = [...redoStackRef.current, popped]
    
    redrawBg(strokesRef.current)
    updateHistoryState()
    
    if (bgRef.current) {
      if (strokesRef.current.length > 0) {
        onChange(exportPNG(bgRef.current))
      } else {
        onChange(null)
      }
    }
  }

  const handleRedo = () => {
    if (redoStackRef.current.length === 0) return
    const popped = redoStackRef.current[redoStackRef.current.length - 1]
    redoStackRef.current = redoStackRef.current.slice(0, -1)
    strokesRef.current = [...strokesRef.current, popped]
    
    redrawBg(strokesRef.current)
    updateHistoryState()
    
    if (bgRef.current) {
      onChange(exportPNG(bgRef.current))
    }
  }

  const handleClear = () => {
    redoStackRef.current = [...strokesRef.current]
    strokesRef.current = []
    if (bgRef.current) clearCanvas(bgRef.current)
    if (fgRef.current) clearCanvas(fgRef.current)
    updateHistoryState()
    onChange(null)
  }

  return (
    <div className={`flex flex-col ${isFullscreen ? 'h-full w-full' : ''}`}>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-t border-border bg-surface shrink-0">

        {/* Tool pills — icon + label, colored active state */}
        <div className="flex items-center gap-1.5">

          {/* Pen */}
          <button
            onClick={() => setTool('pen')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-pill text-[11px] font-bold transition-all press-sm"
            style={
              tool === 'pen'
                ? { background: 'rgba(var(--color-accent),0.15)', border: '1px solid rgba(var(--color-accent),0.5)', color: 'rgb(var(--color-accent))' }
                : { background: 'transparent', border: '1px solid rgba(var(--color-border),0.6)', color: 'rgb(var(--color-text-muted))' }
            }
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Stift
          </button>

          {/* Highlighter */}
          <button
            onClick={() => setTool('highlighter')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-pill text-[11px] font-bold transition-all press-sm"
            style={
              tool === 'highlighter'
                ? { background: 'rgba(250,204,21,0.15)', border: '1px solid rgba(250,204,21,0.55)', color: '#FACC15' }
                : { background: 'transparent', border: '1px solid rgba(var(--color-border),0.6)', color: 'rgb(var(--color-text-muted))' }
            }
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 22l4-4" strokeLinecap="round" />
            </svg>
            Marker
          </button>

          {/* Eraser */}
          <button
            onClick={() => setTool('eraser')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-pill text-[11px] font-bold transition-all press-sm"
            style={
              tool === 'eraser'
                ? { background: 'rgba(255,59,48,0.12)', border: '1px solid rgba(255,59,48,0.45)', color: '#FF3B30' }
                : { background: 'transparent', border: '1px solid rgba(var(--color-border),0.6)', color: 'rgb(var(--color-text-muted))' }
            }
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M20 20H7L3 16l9-9 5 5-3.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M6.5 17.5L3 14l4.5-4.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Radier
          </button>
        </div>

        {/* Divider 1 */}
        <div className="w-px h-4 bg-border/60 shrink-0" />

        {/* Color dots — pen only & only in fullscreen */}
        {isFullscreen && tool === 'pen' && (
          <>
            <div className="flex items-center gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setColor(c.id)}
                  className="transition-all press-sm shrink-0"
                  style={{
                    width: color === c.id ? 20 : 14,
                    height: color === c.id ? 20 : 14,
                    borderRadius: '50%',
                    backgroundColor: c.hex,
                    border: color === c.id ? '2.5px solid white' : '2px solid transparent',
                    boxShadow: color === c.id ? `0 0 0 2px ${c.hex}80` : 'none',
                    opacity: color === c.id ? 1 : 0.5,
                  }}
                />
              ))}
            </div>
            {/* Divider 2 */}
            <div className="w-px h-4 bg-border/60 shrink-0" />
          </>
        )}

        {/* Undo / Redo */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            className={`p-1.5 rounded-pill border border-border/60 hover:bg-surface-hover transition-all press-sm shrink-0 ${
              !canUndo ? 'opacity-30 cursor-not-allowed text-text-muted' : 'text-text-secondary'
            }`}
            title="Zurück"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 7v6h6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            onClick={handleRedo}
            disabled={!canRedo}
            className={`p-1.5 rounded-pill border border-border/60 hover:bg-surface-hover transition-all press-sm shrink-0 ${
              !canRedo ? 'opacity-30 cursor-not-allowed text-text-muted' : 'text-text-secondary'
            }`}
            title="Wiederholen"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 7v6h-6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 17a9 9 0 019-9 9 9 0 016 2.3l3 2.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="flex-1" />

        {/* Clear — only in fullscreen */}
        {isFullscreen && (
          <button
            onClick={handleClear}
            disabled={!hasContent}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-pill text-[11px] font-bold transition-all press-sm shrink-0"
            style={
              hasContent
                ? { background: 'rgba(255,59,48,0.1)', border: '1px solid rgba(255,59,48,0.35)', color: '#FF3B30' }
                : { background: 'transparent', border: '1px solid rgba(var(--color-border),0.4)', color: 'rgb(var(--color-text-muted))', opacity: 0.4, cursor: 'not-allowed' }
            }
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2" strokeLinecap="round" />
            </svg>
            Löschen
          </button>
        )}
      </div>

      {/* ── Canvas area ── */}
      <div
        ref={containerRef}
        className={`relative w-full ${isFullscreen ? 'flex-1' : ''}`}
        style={{ height: isFullscreen ? '100%' : '220px', touchAction: 'none', backgroundColor: '#0D0D0F' }}
      >
        <canvas ref={bgRef} className="absolute inset-0 w-full h-full" />
        <canvas
          ref={fgRef}
          className="absolute inset-0 w-full h-full"
          style={{ cursor: tool === 'eraser' ? 'cell' : 'crosshair' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      </div>
    </div>
  )
}
