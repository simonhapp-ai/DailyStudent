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

export function DrawingCanvas({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const bgRef = useRef<HTMLCanvasElement>(null)
  const fgRef = useRef<HTMLCanvasElement>(null)
  const activeRef = useRef<StrokeRecord | null>(null)
  // strokesRef is used by the resize observer (stable ref, doesn't trigger re-renders)
  const strokesRef = useRef<StrokeRecord[]>([])

  const [tool, setTool] = useState<Tool>('pen')
  const [color, setColor] = useState<ColorId>('white')
  const [hasContent, setHasContent] = useState(false)

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
    setHasContent(true)

    // Export PNG to parent
    if (bgRef.current) onChange(exportPNG(bgRef.current))
  }

  const handleClear = () => {
    strokesRef.current = []
    if (bgRef.current) clearCanvas(bgRef.current)
    if (fgRef.current) clearCanvas(fgRef.current)
    setHasContent(false)
    onChange(null)
  }

  const colorHex = COLORS.find((c) => c.id === color)!.hex

  return (
    <div className="flex flex-col">

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-t border-border">

        {/* Tool buttons */}
        <div className="flex items-center gap-0.5">
          {/* Pen */}
          <button
            onClick={() => setTool('pen')}
            title="Stift"
            className={`w-7 h-7 rounded-btn flex items-center justify-center transition-colors ${
              tool === 'pen' ? 'bg-surface-hover border border-border' : 'hover:bg-surface-hover'
            }`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              className={tool === 'pen' ? 'text-text-primary' : 'text-text-muted'}>
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Highlighter */}
          <button
            onClick={() => setTool('highlighter')}
            title="Textmarker"
            className={`w-7 h-7 rounded-btn flex items-center justify-center transition-colors ${
              tool === 'highlighter' ? 'bg-surface-hover border border-border' : 'hover:bg-surface-hover'
            }`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke={tool === 'highlighter' ? '#FACC15' : undefined}
              strokeWidth="2"
              className={tool === 'highlighter' ? '' : 'text-text-muted'}>
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Eraser */}
          <button
            onClick={() => setTool('eraser')}
            title="Radiergummi"
            className={`w-7 h-7 rounded-btn flex items-center justify-center transition-colors ${
              tool === 'eraser' ? 'bg-surface-hover border border-border' : 'hover:bg-surface-hover'
            }`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              className={tool === 'eraser' ? 'text-text-primary' : 'text-text-muted'}>
              <path d="M20 20H7L3 16l9-9 5 5-3.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M6.5 17.5L3 14l4.5-4.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Divider */}
        <div className="w-px h-4 bg-border mx-0.5" />

        {/* Color dots — pen only */}
        {tool === 'pen' && (
          <div className="flex items-center gap-1.5">
            {COLORS.map((c) => (
              <button
                key={c.id}
                onClick={() => setColor(c.id)}
                className={`w-4 h-4 rounded-full border-2 transition-all ${
                  color === c.id ? 'border-text-primary scale-125' : 'border-transparent opacity-50 hover:opacity-90'
                }`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        )}

        <div className="flex-1" />

        {/* Active color pip + clear */}
        <div className="flex items-center gap-2">
          {tool === 'pen' && (
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colorHex }} />
          )}
          <button
            onClick={handleClear}
            disabled={!hasContent}
            className={`text-[11px] font-medium px-2 py-1 rounded-btn transition-colors ${
              hasContent
                ? 'text-text-muted hover:text-danger hover:bg-danger/10'
                : 'text-text-muted/30 cursor-not-allowed'
            }`}
          >
            Löschen
          </button>
        </div>
      </div>

      {/* ── Canvas area ── */}
      <div
        ref={containerRef}
        className="relative"
        style={{ height: '220px', touchAction: 'none', backgroundColor: '#0D0D0F' }}
      >
        <canvas ref={bgRef} className="absolute inset-0" />
        <canvas
          ref={fgRef}
          className="absolute inset-0"
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
