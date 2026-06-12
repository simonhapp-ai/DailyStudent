import { useRef, useState, useEffect, useCallback } from 'react'
import { getStroke } from 'perfect-freehand'

// ── Types ─────────────────────────────────────────────────────────────────────

type Tool = 'pen' | 'highlighter' | 'eraser' | 'select' | 'geometry' | 'lasso'
type BackgroundType = 'white' | 'lined' | 'grid' | 'dotted'
type Background = { type: BackgroundType } | { type: 'image'; dataUrl: string }

export interface CanvasImageData {
  id: string
  dataUrl: string
  x: number
  y: number
  w: number
  h: number
}

type GeomShape =
  | { kind: 'line';    x1: number; y1: number; x2: number; y2: number }
  | { kind: 'rect';    x: number;  y: number;  w: number;  h: number  }
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number }

interface StrokeRecord {
  id?: string
  points: number[][]
  tool: Exclude<Tool, 'select'>
  colorHex: string
  size: number
  shape?: GeomShape
}

export interface CanvasPageData {
  id: string
  background: Background
  strokes: StrokeRecord[]
  images: CanvasImageData[]
  thumbnail?: string
}

type ImageInteractionAction = 'drag' | 'resize-right' | 'resize-bottom' | 'resize-corner'

// ── Constants ─────────────────────────────────────────────────────────────────

const PEN_SIZES    = [2, 4, 8]
const MARKER_SIZES = [8, 14, 24]
const ERASER_SIZES = [10, 20, 36]

const DEFAULT_COLORS = ['#111827', '#2563EB', '#DC2626', '#16A34A', '#7C3AED', '#F97316']
const COLORS_KEY = 'sb_palette_v1'

const BG_OPTIONS: { type: BackgroundType; label: string }[] = [
  { type: 'white',  label: 'Weiß'      },
  { type: 'lined',  label: 'Liniert'   },
  { type: 'grid',   label: 'Kariert'   },
  { type: 'dotted', label: 'Gepunktet' },
]

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

// ── SVG icons ─────────────────────────────────────────────────────────────────

function BgIcon({ type, size = 13 }: { type: string; size?: number }) {
  if (type === 'lined') return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <rect x=".5" y=".5" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth=".8" />
      {[3.5, 5.5, 7.5, 9.5].map(y => (
        <line key={y} x1="2" y1={y} x2="10" y2={y} stroke="currentColor" strokeWidth=".7" />
      ))}
    </svg>
  )
  if (type === 'grid') return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <rect x=".5" y=".5" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth=".8" />
      {[4, 8].map(x => <line key={`v${x}`} x1={x} y1="1" x2={x} y2="11" stroke="currentColor" strokeWidth=".6" />)}
      {[4, 8].map(y => <line key={`h${y}`} x1="1" y1={y} x2="11" y2={y} stroke="currentColor" strokeWidth=".6" />)}
    </svg>
  )
  if (type === 'dotted') return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <rect x=".5" y=".5" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth=".8" />
      {[3, 6, 9].flatMap(x => [3, 6, 9].map(y => (
        <circle key={`${x}${y}`} cx={x} cy={y} r=".9" fill="currentColor" />
      )))}
    </svg>
  )
  if (type === 'image') return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <rect x=".5" y=".5" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth=".8" />
      <circle cx="4" cy="4" r="1" fill="currentColor" />
      <path d="M1 9l3-3 2 2 2-2.5 3 3.5" stroke="currentColor" strokeWidth=".8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <rect x=".5" y=".5" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth=".8" />
    </svg>
  )
}

// ── Canvas helpers ────────────────────────────────────────────────────────────

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

function paintStroke(
  ctx: CanvasRenderingContext2D,
  points: number[][],
  tool: Exclude<Tool, 'select'>,
  colorHex: string,
  size: number,
) {
  if (points.length === 0) return
  const outline = getStroke(points, {
    size: tool === 'eraser' ? size * 4 : size,
    smoothing: 0.5,
    thinning: tool === 'pen' ? 0.45 : 0,
    simulatePressure: tool === 'pen',
  })
  const path = buildPath(outline)
  ctx.save()
  if (tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out'
    ctx.fillStyle = '#000'
  } else if (tool === 'highlighter') {
    ctx.globalAlpha = 0.35
    ctx.fillStyle = colorHex
  } else {
    ctx.fillStyle = colorHex
  }
  ctx.fill(path)
  ctx.restore()
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  bg: Background,
  imgCache: Map<string, HTMLImageElement>,
) {
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, w, h)
  if (bg.type === 'lined') {
    ctx.strokeStyle = '#C9D5E8'
    ctx.lineWidth = 0.8
    const gap = 28
    for (let y = gap; y < h; y += gap) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
    }
  } else if (bg.type === 'grid') {
    ctx.strokeStyle = '#C9D5E8'
    ctx.lineWidth = 0.5
    const sz = 22
    for (let x = 0; x <= w; x += sz) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke() }
    for (let y = 0; y <= h; y += sz) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke() }
  } else if (bg.type === 'dotted') {
    ctx.fillStyle = '#AEBACB'
    const sp = 22
    for (let x = sp; x < w; x += sp)
      for (let y = sp; y < h; y += sp) {
        ctx.beginPath(); ctx.arc(x, y, 1.2, 0, Math.PI * 2); ctx.fill()
      }
  } else if (bg.type === 'image') {
    const img = imgCache.get((bg as { dataUrl: string }).dataUrl)
    if (img?.complete && img.naturalWidth > 0) ctx.drawImage(img, 0, 0, w, h)
  }
}

function drawCanvasImages(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  images: CanvasImageData[],
  imgCache: Map<string, HTMLImageElement>,
) {
  for (const img of images) {
    const el = imgCache.get(img.dataUrl)
    if (el?.complete && el.naturalWidth > 0) {
      ctx.drawImage(el, img.x * w, img.y * h, img.w * w, img.h * h)
    }
  }
}

// ── Geometry helpers ──────────────────────────────────────────────────────────

function detectGeomShape(pts: number[][]): GeomShape {
  if (pts.length < 2) return { kind: 'line', x1: pts[0][0], y1: pts[0][1], x2: pts[0][0], y2: pts[0][1] }
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1])
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const bw = maxX - minX, bh = maxY - minY
  const diag = Math.hypot(bw, bh)
  const first = pts[0], last = pts[pts.length - 1]
  const closeDist = Math.hypot(last[0] - first[0], last[1] - first[1])
  const isClosed = closeDist < diag * 0.28 && pts.length > 10

  // Line: very thin bounding box
  if (!isClosed && Math.min(bw, bh) < diag * 0.18)
    return { kind: 'line', x1: first[0], y1: first[1], x2: last[0], y2: last[1] }

  if (isClosed) {
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2
    // Circularity: how close are points to equidistant from center?
    const expR = (bw + bh) / 4
    let dev = 0
    for (const p of pts) dev += Math.abs(Math.hypot(p[0] - cx, p[1] - cy) - expR) / expR
    const avgDev = dev / pts.length
    if (avgDev < 0.32 && bw / bh < 2.8 && bh / bw < 2.8)
      return { kind: 'ellipse', cx, cy, rx: bw / 2, ry: bh / 2 }
    return { kind: 'rect', x: minX, y: minY, w: bw, h: bh }
  }
  return { kind: 'line', x1: first[0], y1: first[1], x2: last[0], y2: last[1] }
}

function paintGeomShape(
  ctx: CanvasRenderingContext2D,
  shape: GeomShape,
  colorHex: string,
  strokePx: number,
) {
  ctx.save()
  ctx.strokeStyle = colorHex
  ctx.lineWidth   = Math.max(1.5, strokePx * 0.6)
  ctx.lineCap     = 'round'
  ctx.lineJoin    = 'round'
  ctx.beginPath()
  if (shape.kind === 'line') {
    ctx.moveTo(shape.x1, shape.y1); ctx.lineTo(shape.x2, shape.y2)
  } else if (shape.kind === 'rect') {
    ctx.rect(shape.x, shape.y, shape.w, shape.h)
  } else {
    ctx.ellipse(shape.cx, shape.cy, Math.abs(shape.rx), Math.abs(shape.ry), 0, 0, Math.PI * 2)
  }
  ctx.stroke(); ctx.restore()
}

function paintStrokeRecord(ctx: CanvasRenderingContext2D, s: StrokeRecord) {
  if (s.shape) paintGeomShape(ctx, s.shape, s.colorHex, s.size)
  else         paintStroke(ctx, s.points, s.tool, s.colorHex, s.size)
}

type GeomHandle = { x: number; y: number; idx: number }
function getGeomHandles(shape: GeomShape): GeomHandle[] {
  if (shape.kind === 'line')
    return [{ x: shape.x1, y: shape.y1, idx: 0 }, { x: shape.x2, y: shape.y2, idx: 1 }]
  if (shape.kind === 'rect')
    return [
      { x: shape.x,          y: shape.y,          idx: 0 },
      { x: shape.x + shape.w, y: shape.y,          idx: 1 },
      { x: shape.x + shape.w, y: shape.y + shape.h, idx: 2 },
      { x: shape.x,          y: shape.y + shape.h, idx: 3 },
    ]
  // ellipse: 4 cardinal handles
  return [
    { x: shape.cx,          y: shape.cy - shape.ry, idx: 0 },
    { x: shape.cx + shape.rx, y: shape.cy,          idx: 1 },
    { x: shape.cx,          y: shape.cy + shape.ry, idx: 2 },
    { x: shape.cx - shape.rx, y: shape.cy,          idx: 3 },
  ]
}

function hitTestGeomShape(
  shape: GeomShape, px: number, py: number, handleR: number, bodyT: number,
): { type: 'handle'; idx: number } | { type: 'body' } | null {
  for (const h of getGeomHandles(shape))
    if (Math.hypot(px - h.x, py - h.y) < handleR) return { type: 'handle', idx: h.idx }

  if (shape.kind === 'line') {
    const dx = shape.x2 - shape.x1, dy = shape.y2 - shape.y1
    const len2 = dx * dx + dy * dy
    if (len2 < 0.001) return Math.hypot(px - shape.x1, py - shape.y1) < bodyT ? { type: 'body' } : null
    const t = clamp(((px - shape.x1) * dx + (py - shape.y1) * dy) / len2, 0, 1)
    return Math.hypot(px - (shape.x1 + t * dx), py - (shape.y1 + t * dy)) < bodyT ? { type: 'body' } : null
  }
  if (shape.kind === 'rect') {
    const inside = px > shape.x - bodyT && px < shape.x + shape.w + bodyT && py > shape.y - bodyT && py < shape.y + shape.h + bodyT
    const nearBorder = px < shape.x + bodyT || px > shape.x + shape.w - bodyT || py < shape.y + bodyT || py > shape.y + shape.h - bodyT
    return inside && nearBorder ? { type: 'body' } : null
  }
  // ellipse
  const dx2 = (px - shape.cx) / shape.rx, dy2 = (py - shape.cy) / shape.ry
  return Math.abs(Math.sqrt(dx2 * dx2 + dy2 * dy2) - 1) < bodyT / Math.max(shape.rx, shape.ry) * 2 ? { type: 'body' } : null
}

function applyHandleDrag(shape: GeomShape, idx: number, dx: number, dy: number): GeomShape {
  if (shape.kind === 'line')
    return idx === 0
      ? { ...shape, x1: shape.x1 + dx, y1: shape.y1 + dy }
      : { ...shape, x2: shape.x2 + dx, y2: shape.y2 + dy }
  if (shape.kind === 'rect') {
    const { x, y, w, h } = shape
    if (idx === 0) return { kind: 'rect', x: x + dx, y: y + dy, w: Math.max(10, w - dx), h: Math.max(10, h - dy) }
    if (idx === 1) return { kind: 'rect', x, y: y + dy, w: Math.max(10, w + dx), h: Math.max(10, h - dy) }
    if (idx === 2) return { kind: 'rect', x, y, w: Math.max(10, w + dx), h: Math.max(10, h + dy) }
    return { kind: 'rect', x: x + dx, y, w: Math.max(10, w - dx), h: Math.max(10, h + dy) }
  }
  // ellipse cardinal handles
  if (idx === 0) return { ...shape, ry: Math.max(8, shape.ry - dy) }
  if (idx === 1) return { ...shape, rx: Math.max(8, shape.rx + dx) }
  if (idx === 2) return { ...shape, ry: Math.max(8, shape.ry + dy) }
  return { ...shape, rx: Math.max(8, shape.rx - dx) }
}

function moveGeomShape(shape: GeomShape, dx: number, dy: number): GeomShape {
  if (shape.kind === 'line') return { ...shape, x1: shape.x1 + dx, y1: shape.y1 + dy, x2: shape.x2 + dx, y2: shape.y2 + dy }
  if (shape.kind === 'rect') return { ...shape, x: shape.x + dx, y: shape.y + dy }
  return { ...shape, cx: shape.cx + dx, cy: shape.cy + dy }
}

// ── Lasso / selection helpers ─────────────────────────────────────────────────

function pointInPoly(px: number, py: number, poly: number[][]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1]
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi)
      inside = !inside
  }
  return inside
}

function getStrokeKeyPts(s: StrokeRecord): number[][] {
  if (s.shape) return getGeomHandles(s.shape).map(h => [h.x, h.y])
  const pts = s.points
  const result: number[][] = [pts[0], pts[pts.length - 1]]
  for (let i = 4; i < pts.length - 1; i += 4) result.push(pts[i])
  return result
}

function isStrokeInLasso(s: StrokeRecord, lasso: number[][]): boolean {
  return getStrokeKeyPts(s).some(p => pointInPoly(p[0], p[1], lasso))
}

function getStrokesBBox(strokes: StrokeRecord[]): { x: number; y: number; w: number; h: number } | null {
  if (strokes.length === 0) return null
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const s of strokes) {
    const pts = s.shape ? getStrokeKeyPts(s) : s.points
    for (const p of pts) {
      if (p[0] < minX) minX = p[0]; if (p[1] < minY) minY = p[1]
      if (p[0] > maxX) maxX = p[0]; if (p[1] > maxY) maxY = p[1]
    }
  }
  const pad = 14
  return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 }
}

function scaleGeomShape(shape: GeomShape, sf: number, cx: number, cy: number): GeomShape {
  const sc = (v: number, c: number) => c + (v - c) * sf
  if (shape.kind === 'line') return { kind: 'line', x1: sc(shape.x1,cx)+0, y1: sc(shape.y1,cy)+0, x2: sc(shape.x2,cx)+0, y2: sc(shape.y2,cy)+0 }
  if (shape.kind === 'rect') return { kind: 'rect', x: sc(shape.x,cx), y: sc(shape.y,cy), w: Math.max(10,shape.w*sf), h: Math.max(10,shape.h*sf) }
  return { kind: 'ellipse', cx: sc(shape.cx,cx), cy: sc(shape.cy,cy), rx: Math.max(8,shape.rx*sf), ry: Math.max(8,shape.ry*sf) }
}

function applyTransformToStroke(
  s: StrokeRecord,
  dx: number, dy: number, sf: number, cx: number, cy: number,
): StrokeRecord {
  const tp = (p: number[]): number[] => [cx + (p[0]-cx)*sf + dx, cy + (p[1]-cy)*sf + dy, p[2] ?? 0.5]
  const newPts = s.points.map(tp)
  let newShape: GeomShape | undefined
  if (s.shape) {
    const sh = s.shape
    if (sh.kind === 'line') newShape = { kind:'line', x1: cx+(sh.x1-cx)*sf+dx, y1: cy+(sh.y1-cy)*sf+dy, x2: cx+(sh.x2-cx)*sf+dx, y2: cy+(sh.y2-cy)*sf+dy }
    else if (sh.kind === 'rect') newShape = { kind:'rect', x: cx+(sh.x-cx)*sf+dx, y: cy+(sh.y-cy)*sf+dy, w: Math.max(10,sh.w*sf), h: Math.max(10,sh.h*sf) }
    else newShape = { kind:'ellipse', cx: cx+(sh.cx-cx)*sf+dx, cy: cy+(sh.cy-cy)*sf+dy, rx: Math.max(8,sh.rx*sf), ry: Math.max(8,sh.ry*sf) }
  }
  return { ...s, points: newPts, shape: newShape }
}

function genId() { return `s${Date.now()}_${Math.random().toString(36).slice(2,5)}` }

function paintLassoPath(ctx: CanvasRenderingContext2D, pts: number[][]) {
  if (pts.length < 2) return
  ctx.save()
  ctx.strokeStyle = '#7C3AED'; ctx.lineWidth = 1.8
  ctx.setLineDash([6, 4]); ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1])
  ctx.lineTo(pts[0][0], pts[0][1])
  ctx.stroke()
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1])
  ctx.closePath(); ctx.fillStyle = '#7C3AED'; ctx.globalAlpha = 0.07; ctx.fill()
  ctx.restore()
}

function resizeCanvas(canvas: HTMLCanvasElement, cssW: number, cssH: number) {
  const dpr = window.devicePixelRatio || 1
  canvas.width  = Math.round(cssW * dpr)
  canvas.height = Math.round(cssH * dpr)
  canvas.style.width  = `${cssW}px`
  canvas.style.height = `${cssH}px`
  const ctx = canvas.getContext('2d')
  if (ctx) ctx.scale(dpr, dpr)
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DrawingCanvas({
  onChange,
  onAnalyzeRequest,
  isFullscreen = false,
  initialPages,
  onPagesChange,
  onBack,
}: {
  onChange: (dataUrl: string | null) => void
  onAnalyzeRequest?: (pageDataUrl: string) => void
  isFullscreen?: boolean
  initialPages?: CanvasPageData[]
  onPagesChange?: (pages: CanvasPageData[]) => void
  onBack?: () => void
}) {
  const containerRef  = useRef<HTMLDivElement>(null)
  const pageWrapRef   = useRef<HTMLDivElement>(null)
  const pageRef       = useRef<HTMLDivElement>(null)
  const bgCanvasRef   = useRef<HTMLCanvasElement>(null)
  const skCanvasRef   = useRef<HTMLCanvasElement>(null)
  const fgCanvasRef   = useRef<HTMLCanvasElement>(null)

  const activeRef    = useRef<StrokeRecord | null>(null)
  const strokesRef   = useRef<StrokeRecord[]>([])
  const undoStackRef = useRef<StrokeRecord[][]>([])
  const redoStackRef = useRef<StrokeRecord[][]>([])
  const imgCacheRef  = useRef(new Map<string, HTMLImageElement>())
  const bgInputRef   = useRef<HTMLInputElement>(null)
  const canvasImgInputRef = useRef<HTMLInputElement>(null)
  const colorInputRef = useRef<HTMLInputElement>(null)
  const editingColorIdxRef = useRef(0)
  const canvasSizeRef = useRef({ w: 0, h: 0 })

  // View transform (zoom + pan)
  const viewTransformRef = useRef({ scale: 1, tx: 12, ty: 12 })
  const [viewTransform, setViewTransform] = useState({ scale: 1, tx: 12, ty: 12 })

  // Pinch state for 2-finger zoom
  const pinchRef = useRef<{
    initDist: number; initScale: number
    initTx: number; initTy: number
    initMx: number; initMy: number
  } | null>(null)
  const isPinchingRef = useRef(false)

  // Active pointer tracking (to block drawing when 2 fingers down)
  const activePointerIdsRef = useRef(new Set<number>())

  // Palm rejection: once a pen pointer is seen, ignore finger touches
  const hasSeenPenRef = useRef(false)
  // True while the pencil is physically pressed — blocks ALL touch events during active stroke
  const penIsActiveRef = useRef(false)

  // Pen-only mode: fingers navigate (pan), only pencil draws
  const PEN_ONLY_KEY = 'sb_pen_only_v1'
  const [penOnlyMode, setPenOnlyMode] = useState(() => localStorage.getItem(PEN_ONLY_KEY) === '1')
  const penOnlyModeRef = useRef(penOnlyMode)
  useEffect(() => { penOnlyModeRef.current = penOnlyMode }, [penOnlyMode])
  useEffect(() => { if (tool !== 'lasso') { selectionRef.current = null; setSelection(null) } }, [tool])

  // Single-finger pan state (used in pen-only mode)
  const singleTouchRef = useRef<{
    startTx: number; startTy: number
    startCx: number; startCy: number
  } | null>(null)

  // Eraser cursor position in canvas coordinates (null = not over canvas)
  const [eraserCursorPos, setEraserCursorPos] = useState<{x: number; y: number} | null>(null)

  // Pages
  const pagesRef  = useRef<CanvasPageData[]>([{ id: 'p0', background: { type: 'white' }, strokes: [], images: [] }])
  const curIdxRef = useRef(0)
  const [pageCount,   setPageCount]   = useState(1)
  const [currentIdx,  setCurrentIdx]  = useState(0)
  const [currentBgType, setCurrentBgType] = useState<string>('white')

  // Image state
  const currentImagesRef = useRef<CanvasImageData[]>([])
  const [currentImagesState, setCurrentImagesState] = useState<CanvasImageData[]>([])
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)
  const imageInteractionRef = useRef<{
    action: ImageInteractionAction
    imageId: string
    startClientX: number; startClientY: number
    startX: number; startY: number; startW: number; startH: number
    canvasW: number; canvasH: number
  } | null>(null)

  // Tool state
  const [tool,             setTool]            = useState<Tool>('pen')
  const [penSizeIdx,       setPenSizeIdx]       = useState(1)
  const [hlSizeIdx,        setHlSizeIdx]        = useState(1)
  const [erSizeIdx,        setErSizeIdx]        = useState(1)
  const [colors,           setColors]           = useState<string[]>(() => {
    try {
      const s = localStorage.getItem(COLORS_KEY)
      if (s) { const p = JSON.parse(s); if (Array.isArray(p) && p.length === 6) return p }
    } catch {}
    return DEFAULT_COLORS
  })
  const [activeColorIdx,   setActiveColorIdx]   = useState(0)
  const [showBgPicker,     setShowBgPicker]     = useState(false)
  const [showSettings,     setShowSettings]     = useState(false)
  const settingsBtnRef = useRef<HTMLButtonElement>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [isExporting,      setIsExporting]      = useState(false)
  const [canUndo,  setCanUndo]  = useState(false)
  const [canRedo,  setCanRedo]  = useState(false)
  const [hasContent, setHasContent] = useState(false)
  const mountedRef = useRef(false)

  // Lasso selection
  const lassoDrawRef = useRef<number[][] | null>(null)
  type SelectionState = { ids: string[]; bbox: { x: number; y: number; w: number; h: number } }
  const [selection, setSelection] = useState<SelectionState | null>(null)
  const selectionRef = useRef<SelectionState | null>(null)
  const selDragRef = useRef<{
    mode: 'move' | 'scale-tl' | 'scale-tr' | 'scale-br' | 'scale-bl'
    startCX: number; startCY: number
    snapshots: StrokeRecord[]
    origBBox: { x: number; y: number; w: number; h: number }
  } | null>(null)

  // Geometry snap
  const GEOM_HOLD_MS = 400
  const geomHoldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [selectedGeomId, setSelectedGeomId] = useState<string | null>(null)
  const selectedGeomIdRef = useRef<string | null>(null)
  const geomDragRef = useRef<{
    type: 'move' | 'handle'
    strokeId: string
    handleIdx?: number
    startCX: number; startCY: number
    origShape: GeomShape
  } | null>(null)

  // ── Color helpers ─────────────────────────────────────────────────────────

  const handleColorDotClick = (idx: number) => {
    if (activeColorIdx === idx) {
      editingColorIdxRef.current = idx
      if (colorInputRef.current) {
        colorInputRef.current.value = colors[idx]
        colorInputRef.current.click()
      }
    } else {
      setActiveColorIdx(idx)
    }
  }

  const handleColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHex = e.target.value
    const idx = editingColorIdxRef.current
    const next = [...colors]
    next[idx] = newHex
    setColors(next)
    localStorage.setItem(COLORS_KEY, JSON.stringify(next))
  }

  const getActiveColor = (): string => colors[activeColorIdx]

  const getActiveSize = useCallback((): number => {
    if (tool === 'highlighter') return MARKER_SIZES[hlSizeIdx]
    if (tool === 'eraser')      return ERASER_SIZES[erSizeIdx]
    return PEN_SIZES[penSizeIdx]  // pen, geometry, lasso all use pen sizes
  }, [tool, penSizeIdx, hlSizeIdx, erSizeIdx])

  // ── Image helpers ─────────────────────────────────────────────────────────

  const setCurrentImages = useCallback((images: CanvasImageData[]) => {
    currentImagesRef.current = images
    setCurrentImagesState(images)
    pagesRef.current[curIdxRef.current].images = images
  }, [])

  const preloadImage = useCallback((dataUrl: string) => {
    if (imgCacheRef.current.has(dataUrl)) return
    const el = new Image()
    el.src = dataUrl
    imgCacheRef.current.set(dataUrl, el)
  }, [])

  // ── Thumbnail ─────────────────────────────────────────────────────────────

  const generateThumbnail = useCallback((pageIdx: number): string => {
    const { w, h } = canvasSizeRef.current
    if (w === 0 || h === 0) return ''
    const page = pagesRef.current[pageIdx]
    const THUMB_W = 280
    const scale = THUMB_W / w
    const THUMB_H = Math.round(h * scale)
    const off = document.createElement('canvas')
    off.width = THUMB_W; off.height = THUMB_H
    const ctx = off.getContext('2d')!
    ctx.scale(scale, scale)
    drawBackground(ctx, w, h, page.background, imgCacheRef.current)
    drawCanvasImages(ctx, w, h, page.images ?? [], imgCacheRef.current)
    const strokes = pageIdx === curIdxRef.current ? strokesRef.current : page.strokes
    for (const s of strokes) paintStroke(ctx, s.points, s.tool, s.colorHex, s.size)
    return off.toDataURL('image/png', 0.75)
  }, [])

  const notifyPagesChanged = useCallback(() => {
    if (!onPagesChange) return
    const idx = curIdxRef.current
    pagesRef.current[idx].strokes   = [...strokesRef.current]
    pagesRef.current[idx].images    = currentImagesRef.current
    pagesRef.current[idx].thumbnail = generateThumbnail(idx)
    onPagesChange(pagesRef.current.map(p => ({
      id: p.id, background: p.background,
      strokes: [...p.strokes], images: [...p.images], thumbnail: p.thumbnail,
    })))
  }, [onPagesChange, generateThumbnail])

  // ── Load initialPages ─────────────────────────────────────────────────────

  useEffect(() => {
    if (mountedRef.current) return
    mountedRef.current = true
    if (!initialPages || initialPages.length === 0) return
    pagesRef.current = initialPages.map(p => ({
      id: p.id, background: p.background,
      strokes: p.strokes.map(s => s.id ? s : { ...s, id: genId() }),
      images: [...(p.images ?? [])],
    }))
    curIdxRef.current = 0
    strokesRef.current = [...pagesRef.current[0].strokes]
    setPageCount(pagesRef.current.length)
    setCurrentIdx(0)
    setCurrentBgType(pagesRef.current[0].background.type)
    const imgs0 = pagesRef.current[0].images ?? []
    currentImagesRef.current = imgs0
    setCurrentImagesState(imgs0)
    pagesRef.current.forEach(page => {
      if (page.background.type === 'image') preloadImage((page.background as { dataUrl: string }).dataUrl)
      ;(page.images ?? []).forEach(img => preloadImage(img.dataUrl))
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updateHistoryState = useCallback(() => {
    setCanUndo(undoStackRef.current.length > 0)
    setCanRedo(redoStackRef.current.length > 0)
    setHasContent(strokesRef.current.length > 0)
  }, [])

  const getCSS = useCallback((): { w: number; h: number } => {
    const c = bgCanvasRef.current
    if (!c) return canvasSizeRef.current
    return {
      w: parseFloat(c.style.width)  || c.offsetWidth,
      h: parseFloat(c.style.height) || c.offsetHeight,
    }
  }, [])

  const redrawBgCanvas = useCallback((bg: Background) => {
    const c = bgCanvasRef.current; if (!c) return
    const ctx = c.getContext('2d'); if (!ctx) return
    const { w, h } = getCSS()
    drawBackground(ctx, w, h, bg, imgCacheRef.current)
  }, [getCSS])

  const redrawStrokeCanvas = useCallback((strokes: StrokeRecord[]) => {
    const c = skCanvasRef.current; if (!c) return
    const ctx = c.getContext('2d'); if (!ctx) return
    const { w, h } = getCSS()
    ctx.clearRect(0, 0, w, h)
    for (const s of strokes) paintStrokeRecord(ctx, s)
  }, [getCSS])

  const exportAndNotify = useCallback(() => {
    const sk = skCanvasRef.current; if (!sk) return
    const { w, h } = getCSS()
    const page = pagesRef.current[curIdxRef.current]
    const images = currentImagesRef.current
    if (strokesRef.current.length === 0 && page.background.type === 'white' && images.length === 0) {
      onChange(null); return
    }
    const dpr = window.devicePixelRatio || 1
    const exp = document.createElement('canvas')
    exp.width  = Math.round(w * dpr)
    exp.height = Math.round(h * dpr)
    const ctx = exp.getContext('2d')!
    ctx.scale(dpr, dpr)
    drawBackground(ctx, w, h, page.background, imgCacheRef.current)
    drawCanvasImages(ctx, w, h, images, imgCacheRef.current)
    ctx.drawImage(sk, 0, 0, w, h)
    onChange(exp.toDataURL('image/png'))
  }, [getCSS, onChange])

  // ── Page management ───────────────────────────────────────────────────────

  const goToPage = useCallback((idx: number) => {
    const leaving = curIdxRef.current
    pagesRef.current[leaving].strokes   = [...strokesRef.current]
    pagesRef.current[leaving].images    = currentImagesRef.current
    pagesRef.current[leaving].thumbnail = generateThumbnail(leaving)
    curIdxRef.current = idx
    strokesRef.current = [...pagesRef.current[idx].strokes]
    undoStackRef.current = []; redoStackRef.current = []
    const newBg  = pagesRef.current[idx].background
    const newImg = pagesRef.current[idx].images ?? []
    setCurrentIdx(idx); setCurrentBgType(newBg.type)
    currentImagesRef.current = newImg; setCurrentImagesState(newImg)
    setSelectedImageId(null); updateHistoryState()
    redrawBgCanvas(newBg); redrawStrokeCanvas(strokesRef.current)
    notifyPagesChanged()
  }, [redrawBgCanvas, redrawStrokeCanvas, updateHistoryState, notifyPagesChanged, generateThumbnail])

  const addPage = useCallback(() => {
    pagesRef.current[curIdxRef.current].strokes = [...strokesRef.current]
    pagesRef.current[curIdxRef.current].images  = currentImagesRef.current
    const newPage: CanvasPageData = { id: `p${Date.now()}`, background: { type: 'white' }, strokes: [], images: [] }
    pagesRef.current.push(newPage)
    const newIdx = pagesRef.current.length - 1
    curIdxRef.current = newIdx
    strokesRef.current = []; undoStackRef.current = []; redoStackRef.current = []
    currentImagesRef.current = []
    setPageCount(pagesRef.current.length); setCurrentIdx(newIdx)
    setCurrentBgType('white'); setCurrentImagesState([]); setSelectedImageId(null)
    updateHistoryState(); redrawBgCanvas({ type: 'white' }); redrawStrokeCanvas([])
    onChange(null); notifyPagesChanged()
  }, [redrawBgCanvas, redrawStrokeCanvas, updateHistoryState, onChange, notifyPagesChanged])

  const setPageBackground = useCallback((bg: Background) => {
    if (bg.type === 'image') {
      const dataUrl = (bg as { dataUrl: string }).dataUrl
      if (!imgCacheRef.current.has(dataUrl)) {
        const img = new Image()
        img.onload = () => { imgCacheRef.current.set(dataUrl, img); redrawBgCanvas(bg); exportAndNotify() }
        img.src = dataUrl
      }
    }
    pagesRef.current[curIdxRef.current].background = bg
    setCurrentBgType(bg.type); setShowBgPicker(false)
    redrawBgCanvas(bg); exportAndNotify(); notifyPagesChanged()
  }, [redrawBgCanvas, exportAndNotify, notifyPagesChanged])

  // ── Resize observer ───────────────────────────────────────────────────────

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    function resize() {
      const outerRect = container!.getBoundingClientRect()
      let w: number, h: number

      if (isFullscreen) {
        const pad = 14
        w = Math.floor(outerRect.width - pad * 2)
        h = Math.floor(w * (297 / 210))
        if (pageRef.current) {
          pageRef.current.style.width  = `${w}px`
          pageRef.current.style.height = `${h}px`
        }
        // Reset view so page starts at top-left with small padding
        const initT = { scale: 1, tx: pad, ty: 12 }
        viewTransformRef.current = initT
        setViewTransform(initT)
      } else {
        w = outerRect.width
        h = outerRect.height
      }

      if (w === 0 || h === 0) return
      canvasSizeRef.current = { w, h }
      if (bgCanvasRef.current) resizeCanvas(bgCanvasRef.current, w, h)
      if (skCanvasRef.current) resizeCanvas(skCanvasRef.current, w, h)
      if (fgCanvasRef.current) resizeCanvas(fgCanvasRef.current, w, h)
      const bg = pagesRef.current[curIdxRef.current].background
      redrawBgCanvas(bg); redrawStrokeCanvas(strokesRef.current)
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(container)
    return () => ro.disconnect()
  }, [isFullscreen, redrawBgCanvas, redrawStrokeCanvas])

  // ── Touch zoom + pan (2-finger pinch / 1-finger pan in pen-only mode) ────────

  useEffect(() => {
    const container = containerRef.current
    if (!container || !isFullscreen) return

    function onTouchStart(e: TouchEvent) {
      // While pencil is actively drawing, block all touch input (palm rejection)
      if (penIsActiveRef.current) { e.preventDefault(); return }

      if (e.touches.length >= 2) {
        e.preventDefault()
        singleTouchRef.current = null
        isPinchingRef.current = true
        activeRef.current = null
        const t1 = e.touches[0], t2 = e.touches[1]
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
        const mx = (t1.clientX + t2.clientX) / 2
        const my = (t1.clientY + t2.clientY) / 2
        const { scale, tx, ty } = viewTransformRef.current
        pinchRef.current = { initDist: dist, initScale: scale, initTx: tx, initTy: ty, initMx: mx, initMy: my }
      } else if (e.touches.length === 1 && penOnlyModeRef.current) {
        // Single finger in pen-only mode = pan
        e.preventDefault()
        const t = e.touches[0]
        const { tx, ty } = viewTransformRef.current
        singleTouchRef.current = { startTx: tx, startTy: ty, startCx: t.clientX, startCy: t.clientY }
      } else {
        isPinchingRef.current = false
        pinchRef.current = null
        singleTouchRef.current = null
      }
    }

    function onTouchMove(e: TouchEvent) {
      if (penIsActiveRef.current) { e.preventDefault(); return }

      // 1-finger pan (pen-only mode)
      if (singleTouchRef.current && e.touches.length === 1) {
        e.preventDefault()
        const t = e.touches[0]
        const { startTx, startTy, startCx, startCy } = singleTouchRef.current
        const { scale } = viewTransformRef.current
        const newTx = startTx + (t.clientX - startCx)
        const newTy = startTy + (t.clientY - startCy)
        viewTransformRef.current = { scale, tx: newTx, ty: newTy }
        setViewTransform({ scale, tx: newTx, ty: newTy })
        return
      }

      // 2-finger pinch/zoom
      if (!pinchRef.current || e.touches.length < 2) return
      e.preventDefault()
      const t1 = e.touches[0], t2 = e.touches[1]
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
      const mx = (t1.clientX + t2.clientX) / 2
      const my = (t1.clientY + t2.clientY) / 2
      const { initDist, initScale, initTx, initTy, initMx, initMy } = pinchRef.current

      const rawScale = initScale * (dist / initDist)
      const newScale = Math.max(0.25, Math.min(10, rawScale))
      const sf = newScale / initScale

      const newTx = initMx - (initMx - initTx) * sf + (mx - initMx)
      const newTy = initMy - (initMy - initTy) * sf + (my - initMy)

      viewTransformRef.current = { scale: newScale, tx: newTx, ty: newTy }
      setViewTransform({ scale: newScale, tx: newTx, ty: newTy })
    }

    function onTouchEnd(e: TouchEvent) {
      if (e.touches.length === 0) {
        singleTouchRef.current = null
        pinchRef.current = null
        setTimeout(() => { isPinchingRef.current = false }, 80)
      } else if (e.touches.length < 2) {
        pinchRef.current = null
        setTimeout(() => { isPinchingRef.current = false }, 80)
      }
    }

    // Mouse wheel: scroll = pan, Ctrl+scroll = zoom
    function onWheel(e: WheelEvent) {
      e.preventDefault()
      const { scale, tx, ty } = viewTransformRef.current
      if (e.ctrlKey || e.metaKey) {
        // Zoom centred on cursor
        const factor = e.deltaY < 0 ? 1.1 : 0.9
        const newScale = Math.max(0.25, Math.min(10, scale * factor))
        const rect = container!.getBoundingClientRect()
        const mx = e.clientX - rect.left
        const my = e.clientY - rect.top
        const sf = newScale / scale
        const newTx = mx - (mx - tx) * sf
        const newTy = my - (my - ty) * sf
        viewTransformRef.current = { scale: newScale, tx: newTx, ty: newTy }
        setViewTransform({ scale: newScale, tx: newTx, ty: newTy })
      } else {
        // Pan
        const newTx = tx - e.deltaX
        const newTy = ty - e.deltaY
        viewTransformRef.current = { scale, tx: newTx, ty: newTy }
        setViewTransform({ scale, tx: newTx, ty: newTy })
      }
    }

    container.addEventListener('touchstart', onTouchStart, { passive: false })
    container.addEventListener('touchmove',  onTouchMove,  { passive: false })
    container.addEventListener('touchend',   onTouchEnd)
    container.addEventListener('touchcancel', onTouchEnd)
    container.addEventListener('wheel',      onWheel,      { passive: false })
    return () => {
      container.removeEventListener('touchstart', onTouchStart)
      container.removeEventListener('touchmove',  onTouchMove)
      container.removeEventListener('touchend',   onTouchEnd)
      container.removeEventListener('touchcancel', onTouchEnd)
      container.removeEventListener('wheel',      onWheel)
    }
  }, [isFullscreen])

  // ── Pointer events (drawing) ──────────────────────────────────────────────

  const getXY = (e: React.PointerEvent<HTMLCanvasElement>): number[] => {
    const rect = fgCanvasRef.current!.getBoundingClientRect()
    const scale = viewTransformRef.current.scale
    return [
      (e.clientX - rect.left) / scale,
      (e.clientY - rect.top)  / scale,
      e.pressure || 0.5,
    ]
  }

  const handleDeleteSelection = () => {
    const sel = selectionRef.current
    if (!sel) return
    const selIds = new Set(sel.ids)
    undoStackRef.current = [...undoStackRef.current, [...strokesRef.current]]
    redoStackRef.current = []
    strokesRef.current = strokesRef.current.filter(s => !s.id || !selIds.has(s.id))
    redrawStrokeCanvas(strokesRef.current)
    selectionRef.current = null; setSelection(null)
    updateHistoryState(); exportAndNotify(); notifyPagesChanged()
  }

  const snapCurrentStroke = () => {
    if (geomHoldTimerRef.current) { clearTimeout(geomHoldTimerRef.current); geomHoldTimerRef.current = null }
    const active = activeRef.current
    if (!active || active.points.length < 3) {
      // Too few points — just clear
      activeRef.current = null
      const fg = fgCanvasRef.current
      if (fg) { const ctx = fg.getContext('2d'); const { w, h } = getCSS(); if (ctx) ctx.clearRect(0, 0, w, h) }
      return
    }
    const shape = detectGeomShape(active.points)
    const newId = `g${Date.now()}`
    const snap: StrokeRecord = { id: newId, points: active.points, tool: 'geometry', colorHex: active.colorHex, size: active.size, shape }
    // Paint shape to sk canvas
    const sk = skCanvasRef.current
    if (sk) { const ctx = sk.getContext('2d'); if (ctx) paintGeomShape(ctx, shape, active.colorHex, active.size) }
    // Clear fg
    const fg = fgCanvasRef.current
    if (fg) { const ctx = fg.getContext('2d'); const { w, h } = getCSS(); if (ctx) ctx.clearRect(0, 0, w, h) }
    activeRef.current = null
    undoStackRef.current = [...undoStackRef.current, [...strokesRef.current]]
    redoStackRef.current = []
    strokesRef.current = [...strokesRef.current, snap]
    updateHistoryState(); exportAndNotify(); notifyPagesChanged()
    selectedGeomIdRef.current = newId
    setSelectedGeomId(newId)
  }

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool === 'select') return

    if (e.pointerType === 'pen') { hasSeenPenRef.current = true; penIsActiveRef.current = true }
    if (penOnlyModeRef.current && e.pointerType !== 'pen') return
    if (!penOnlyModeRef.current && hasSeenPenRef.current && e.pointerType === 'touch') return

    // Lasso tool: selection drag or new lasso
    if (tool === 'lasso') {
      const [cx, cy] = getXY(e)
      const scale = viewTransformRef.current.scale
      const sel = selectionRef.current
      if (sel) {
        const { x, y, w, h } = sel.bbox
        const handleR = 18 / scale
        const corners: { cx: number; cy: number; mode: typeof selDragRef.current extends null ? never : NonNullable<typeof selDragRef.current>['mode'] }[] = [
          { cx: x,     cy: y,     mode: 'scale-tl' },
          { cx: x + w, cy: y,     mode: 'scale-tr' },
          { cx: x + w, cy: y + h, mode: 'scale-br' },
          { cx: x,     cy: y + h, mode: 'scale-bl' },
        ]
        for (const c of corners) {
          if (Math.hypot(cx - c.cx, cy - c.cy) < handleR) {
            e.currentTarget.setPointerCapture(e.pointerId)
            const snaps = strokesRef.current.filter(s => s.id && sel.ids.includes(s.id)).map(s => ({ ...s }))
            selDragRef.current = { mode: c.mode, startCX: cx, startCY: cy, snapshots: snaps, origBBox: { ...sel.bbox } }
            redrawStrokeCanvas(strokesRef.current.filter(s => !s.id || !sel.ids.includes(s.id)))
            return
          }
        }
        // Move: click inside bbox
        if (cx >= x && cx <= x + w && cy >= y && cy <= y + h) {
          e.currentTarget.setPointerCapture(e.pointerId)
          const snaps = strokesRef.current.filter(s => s.id && sel.ids.includes(s.id)).map(s => ({ ...s }))
          selDragRef.current = { mode: 'move', startCX: cx, startCY: cy, snapshots: snaps, origBBox: { ...sel.bbox } }
          redrawStrokeCanvas(strokesRef.current.filter(s => !s.id || !sel.ids.includes(s.id)))
          return
        }
        // Click outside → deselect, start new lasso
        selectionRef.current = null; setSelection(null)
        redrawStrokeCanvas(strokesRef.current)
      }
      e.currentTarget.setPointerCapture(e.pointerId)
      lassoDrawRef.current = [getXY(e)]
      return
    }

    // Geometry tool: check if tapping an existing snapped shape
    if (tool === 'geometry') {
      const [cx, cy] = getXY(e)
      const scale = viewTransformRef.current.scale
      const handleR = 18 / scale
      const bodyT   = 14 / scale
      for (let i = strokesRef.current.length - 1; i >= 0; i--) {
        const s = strokesRef.current[i]
        if (!s.shape || !s.id) continue
        const hit = hitTestGeomShape(s.shape, cx, cy, handleR, bodyT)
        if (!hit) continue
        e.currentTarget.setPointerCapture(e.pointerId)
        selectedGeomIdRef.current = s.id
        setSelectedGeomId(s.id)
        geomDragRef.current = {
          type: hit.type === 'handle' ? 'handle' : 'move',
          strokeId: s.id,
          handleIdx: hit.type === 'handle' ? hit.idx : undefined,
          startCX: cx, startCY: cy,
          origShape: { ...s.shape } as GeomShape,
        }
        return
      }
      // Clicked empty — deselect
      selectedGeomIdRef.current = null
      setSelectedGeomId(null)
    }

    activePointerIdsRef.current.add(e.pointerId)
    if (isPinchingRef.current || activePointerIdsRef.current.size > 1) { activeRef.current = null; return }
    e.currentTarget.setPointerCapture(e.pointerId)
    const drawTool: Exclude<Tool, 'select' | 'geometry' | 'lasso'> =
      (tool === 'geometry' || tool === 'lasso') ? 'pen' : tool as Exclude<Tool, 'select' | 'geometry' | 'lasso'>
    activeRef.current = {
      points: [getXY(e)],
      tool: drawTool,
      colorHex: getActiveColor(),
      size: getActiveSize(),
    }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool === 'eraser') {
      const rect = fgCanvasRef.current!.getBoundingClientRect()
      const scale = viewTransformRef.current.scale
      setEraserCursorPos({ x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale })
    }

    // Lasso selection drag / scale
    if (selDragRef.current) {
      const drag = selDragRef.current
      const [cx, cy] = getXY(e)
      const bbox = drag.origBBox
      const bcx = bbox.x + bbox.w / 2, bcy = bbox.y + bbox.h / 2
      let dx = 0, dy = 0, sf = 1
      if (drag.mode === 'move') {
        dx = cx - drag.startCX; dy = cy - drag.startCY
      } else {
        const origDist = Math.hypot(drag.startCX - bcx, drag.startCY - bcy)
        const newDist  = Math.hypot(cx - bcx, cy - bcy)
        sf = origDist > 5 ? newDist / origDist : 1
      }
      const transformed = drag.snapshots.map(s => applyTransformToStroke(s, dx, dy, sf, bcx, bcy))
      const fg = fgCanvasRef.current; if (!fg) return
      const ctx = fg.getContext('2d'); if (!ctx) return
      const { w, h } = getCSS(); ctx.clearRect(0, 0, w, h)
      for (const s of transformed) paintStrokeRecord(ctx, s)
      const nb = getStrokesBBox(transformed)
      if (nb) { selectionRef.current = { ...selectionRef.current!, bbox: nb }; setSelection({ ...selectionRef.current!, bbox: nb }) }
      return
    }

    // Lasso drawing on fg canvas
    if (lassoDrawRef.current) {
      lassoDrawRef.current.push(getXY(e))
      const fg = fgCanvasRef.current; if (!fg) return
      const ctx = fg.getContext('2d'); if (!ctx) return
      const { w, h } = getCSS(); ctx.clearRect(0, 0, w, h)
      paintLassoPath(ctx, lassoDrawRef.current)
      return
    }

    // Geometry shape drag / resize
    if (geomDragRef.current) {
      const drag = geomDragRef.current
      const [cx, cy] = getXY(e)
      const dx = cx - drag.startCX, dy = cy - drag.startCY
      strokesRef.current = strokesRef.current.map(s => {
        if (s.id !== drag.strokeId || !s.shape) return s
        const newShape = drag.type === 'handle' && drag.handleIdx !== undefined
          ? applyHandleDrag(drag.origShape, drag.handleIdx, dx, dy)
          : moveGeomShape(drag.origShape, dx, dy)
        return { ...s, shape: newShape }
      })
      redrawStrokeCanvas(strokesRef.current)
      return
    }

    if (!activeRef.current || e.buttons === 0) return
    if (isPinchingRef.current || activePointerIdsRef.current.size > 1) return
    if (hasSeenPenRef.current && e.pointerType === 'touch') return

    activeRef.current.points.push(getXY(e))

    // Geometry: reset hold timer on every move (snap fires after stillness)
    if (tool === 'geometry') {
      if (geomHoldTimerRef.current) clearTimeout(geomHoldTimerRef.current)
      geomHoldTimerRef.current = setTimeout(snapCurrentStroke, GEOM_HOLD_MS)
    }

    if (activeRef.current.tool === 'eraser') {
      const sk = skCanvasRef.current; if (!sk) return
      const ctx = sk.getContext('2d'); if (!ctx) return
      const { w, h } = getCSS()
      ctx.clearRect(0, 0, w, h)
      for (const s of strokesRef.current) paintStrokeRecord(ctx, s)
      paintStroke(ctx, activeRef.current.points, 'eraser', activeRef.current.colorHex, activeRef.current.size)
      return
    }

    const fg = fgCanvasRef.current; if (!fg) return
    const ctx = fg.getContext('2d'); if (!ctx) return
    const { w, h } = getCSS()
    ctx.clearRect(0, 0, w, h)
    paintStroke(ctx, activeRef.current.points, activeRef.current.tool, activeRef.current.colorHex, activeRef.current.size)
  }

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === 'pen') penIsActiveRef.current = false
    activePointerIdsRef.current.delete(e.pointerId)

    // Lasso selection drag/scale commit
    if (selDragRef.current) {
      const drag = selDragRef.current
      const [cx, cy] = getXY(e)
      const bbox = drag.origBBox
      const bcx = bbox.x + bbox.w / 2, bcy = bbox.y + bbox.h / 2
      let dx = 0, dy = 0, sf = 1
      if (drag.mode === 'move') {
        dx = cx - drag.startCX; dy = cy - drag.startCY
      } else {
        const origDist = Math.hypot(drag.startCX - bcx, drag.startCY - bcy)
        const newDist  = Math.hypot(cx - bcx, cy - bcy)
        sf = origDist > 5 ? newDist / origDist : 1
      }
      const selIds = new Set(selectionRef.current?.ids ?? [])
      const transformed = drag.snapshots.map(s => applyTransformToStroke(s, dx, dy, sf, bcx, bcy))
      const nonSel = strokesRef.current.filter(s => !s.id || !selIds.has(s.id))
      const fg = fgCanvasRef.current; if (fg) { const ctx = fg.getContext('2d'); const { w, h } = getCSS(); if (ctx) ctx.clearRect(0, 0, w, h) }
      strokesRef.current = [...nonSel, ...transformed]
      redrawStrokeCanvas(strokesRef.current)
      const nb = getStrokesBBox(transformed)
      const newSel = nb ? { ids: [...selIds], bbox: nb } : null
      selectionRef.current = newSel; setSelection(newSel)
      selDragRef.current = null
      undoStackRef.current = [...undoStackRef.current, [...strokesRef.current]]
      redoStackRef.current = []
      updateHistoryState(); exportAndNotify(); notifyPagesChanged()
      return
    }

    // Lasso draw complete — detect selection
    if (lassoDrawRef.current) {
      const lasso = lassoDrawRef.current
      lassoDrawRef.current = null
      const fg = fgCanvasRef.current; if (fg) { const ctx = fg.getContext('2d'); const { w, h } = getCSS(); if (ctx) ctx.clearRect(0, 0, w, h) }
      if (lasso.length >= 3) {
        const selected = strokesRef.current.filter(s => isStrokeInLasso(s, lasso))
        if (selected.length > 0) {
          const ids = selected.map(s => s.id!).filter(Boolean)
          const bbox = getStrokesBBox(selected)
          if (bbox) {
            const newSel = { ids, bbox }
            selectionRef.current = newSel; setSelection(newSel)
          }
        } else {
          selectionRef.current = null; setSelection(null)
        }
      }
      return
    }

    // Geometry drag commit
    if (geomDragRef.current) {
      geomDragRef.current = null
      exportAndNotify(); notifyPagesChanged()
      return
    }

    const stroke = activeRef.current
    activeRef.current = null

    // Geometry hold timer: user released early — cancel snap, discard the freehand preview
    if (tool === 'geometry') {
      if (geomHoldTimerRef.current) { clearTimeout(geomHoldTimerRef.current); geomHoldTimerRef.current = null }
      // If released early (no snap yet) just clear fg and don't commit freehand
      const fg = fgCanvasRef.current
      if (fg) { const ctx = fg.getContext('2d'); const { w, h } = getCSS(); if (ctx) ctx.clearRect(0, 0, w, h) }
      return
    }

    if (!stroke || stroke.points.length === 0) return

    if (stroke.tool !== 'eraser') {
      const sk = skCanvasRef.current
      if (sk) { const ctx = sk.getContext('2d'); if (ctx) paintStroke(ctx, stroke.points, stroke.tool, stroke.colorHex, stroke.size) }
      const fg = fgCanvasRef.current
      if (fg) { const ctx = fg.getContext('2d'); const { w, h } = getCSS(); if (ctx) ctx.clearRect(0, 0, w, h) }
    }

    if (!stroke.id) stroke.id = genId()
    undoStackRef.current = [...undoStackRef.current, [...strokesRef.current]]
    redoStackRef.current = []
    strokesRef.current = [...strokesRef.current, stroke]
    updateHistoryState(); exportAndNotify(); notifyPagesChanged()
  }

  const onPointerLeave = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === 'pen') penIsActiveRef.current = false
    setEraserCursorPos(null)
    onPointerUp(e)
  }

  // ── Image pointer events ──────────────────────────────────────────────────

  const handleImagePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    img: CanvasImageData,
    action: ImageInteractionAction,
  ) => {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    setSelectedImageId(img.id)
    const { w: cw, h: ch } = getCSS()
    imageInteractionRef.current = {
      action, imageId: img.id,
      startClientX: e.clientX, startClientY: e.clientY,
      startX: img.x, startY: img.y, startW: img.w, startH: img.h,
      canvasW: cw, canvasH: ch,
    }
  }

  const handleImagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const inter = imageInteractionRef.current; if (!inter) return
    const scale = viewTransformRef.current.scale
    const dx = (e.clientX - inter.startClientX) / (inter.canvasW * scale)
    const dy = (e.clientY - inter.startClientY) / (inter.canvasH * scale)
    const newImages = currentImagesRef.current.map(img => {
      if (img.id !== inter.imageId) return img
      if (inter.action === 'drag')
        return { ...img, x: clamp(inter.startX + dx, 0, 1 - img.w), y: clamp(inter.startY + dy, 0, 1 - img.h) }
      if (inter.action === 'resize-right')
        return { ...img, w: Math.max(0.04, inter.startW + dx) }
      if (inter.action === 'resize-bottom')
        return { ...img, h: Math.max(0.04, inter.startH + dy) }
      if (inter.action === 'resize-corner') {
        const newW = Math.max(0.04, inter.startW + dx)
        return { ...img, w: newW, h: Math.max(0.04, newW * (inter.startH / Math.max(0.001, inter.startW))) }
      }
      return img
    })
    setCurrentImages(newImages)
  }

  const handleImagePointerUp = () => {
    if (imageInteractionRef.current) {
      imageInteractionRef.current = null; exportAndNotify(); notifyPagesChanged()
    }
  }

  const deleteSelectedImage = (id: string) => {
    setCurrentImages(currentImagesRef.current.filter(i => i.id !== id))
    setSelectedImageId(null); exportAndNotify(); notifyPagesChanged()
  }

  const handleCanvasImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string; if (!dataUrl) return
      preloadImage(dataUrl)
      const newImg: CanvasImageData = { id: `img-${Date.now()}`, dataUrl, x: 0.05, y: 0.05, w: 0.4, h: 0.3 }
      setCurrentImages([...currentImagesRef.current, newImg])
      setSelectedImageId(newImg.id); setTool('select')
      exportAndNotify(); notifyPagesChanged()
    }
    reader.readAsDataURL(file); e.target.value = ''
  }

  // ── Undo / Redo / Clear ───────────────────────────────────────────────────

  const handleUndo = () => {
    if (undoStackRef.current.length === 0) return
    const snap = undoStackRef.current[undoStackRef.current.length - 1]
    redoStackRef.current = [...redoStackRef.current, [...strokesRef.current]]
    undoStackRef.current = undoStackRef.current.slice(0, -1)
    strokesRef.current = [...snap]
    selectionRef.current = null; setSelection(null)
    redrawStrokeCanvas(strokesRef.current); updateHistoryState(); exportAndNotify(); notifyPagesChanged()
  }

  const handleRedo = () => {
    if (redoStackRef.current.length === 0) return
    const snap = redoStackRef.current[redoStackRef.current.length - 1]
    undoStackRef.current = [...undoStackRef.current, [...strokesRef.current]]
    redoStackRef.current = redoStackRef.current.slice(0, -1)
    strokesRef.current = [...snap]
    selectionRef.current = null; setSelection(null)
    redrawStrokeCanvas(strokesRef.current); updateHistoryState(); exportAndNotify(); notifyPagesChanged()
  }

  const handleClear = () => {
    setShowClearConfirm(false)
    selectionRef.current = null; setSelection(null)
    undoStackRef.current = [...undoStackRef.current, [...strokesRef.current]]
    redoStackRef.current = []; strokesRef.current = []
    const sk = skCanvasRef.current
    if (sk) { const { w, h } = getCSS(); sk.getContext('2d')?.clearRect(0, 0, w, h) }
    updateHistoryState(); exportAndNotify(); notifyPagesChanged()
  }

  const handleBgImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => { const d = ev.target?.result as string; if (d) setPageBackground({ type: 'image', dataUrl: d }) }
    reader.readAsDataURL(file); e.target.value = ''
  }

  // ── PDF export ────────────────────────────────────────────────────────────

  const handleExportPDF = useCallback(async () => {
    pagesRef.current[curIdxRef.current].strokes = [...strokesRef.current]
    pagesRef.current[curIdxRef.current].images  = currentImagesRef.current
    setIsExporting(true)
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const { w, h } = getCSS()
      const dpr = Math.max(2, window.devicePixelRatio || 2)
      for (let i = 0; i < pagesRef.current.length; i++) {
        if (i > 0) doc.addPage()
        const page = pagesRef.current[i]
        const canvas = document.createElement('canvas')
        canvas.width  = Math.round(w * dpr)
        canvas.height = Math.round(h * dpr)
        const ctx = canvas.getContext('2d')!
        ctx.scale(dpr, dpr)
        drawBackground(ctx, w, h, page.background, imgCacheRef.current)
        drawCanvasImages(ctx, w, h, page.images ?? [], imgCacheRef.current)
        for (const s of page.strokes) paintStrokeRecord(ctx, s)
        doc.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 297)
      }
      doc.save('notiz.pdf')
    } finally {
      setIsExporting(false)
    }
  }, [getCSS])

  // ── OCR Bridge ────────────────────────────────────────────────────────────

  const handleAnalyzeRequest = useCallback(() => {
    if (!onAnalyzeRequest) return
    pagesRef.current[curIdxRef.current].strokes = [...strokesRef.current]
    const { w, h } = getCSS()
    const page = pagesRef.current[curIdxRef.current]
    const images = currentImagesRef.current
    const dpr = Math.max(2, window.devicePixelRatio || 2)
    const canvas = document.createElement('canvas')
    canvas.width  = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)
    drawBackground(ctx, w, h, page.background, imgCacheRef.current)
    drawCanvasImages(ctx, w, h, images, imgCacheRef.current)
    if (skCanvasRef.current) ctx.drawImage(skCanvasRef.current, 0, 0, w, h)
    onAnalyzeRequest(canvas.toDataURL('image/png'))
  }, [onAnalyzeRequest, getCSS])

  // ── Size UI helpers ───────────────────────────────────────────────────────

  const currentSizeIdx = tool === 'pen' ? penSizeIdx : tool === 'highlighter' ? hlSizeIdx : erSizeIdx
  const setCurrentSizeIdx = tool === 'pen' ? setPenSizeIdx : tool === 'highlighter' ? setHlSizeIdx : setErSizeIdx

  // ── Render ────────────────────────────────────────────────────────────────

  const selectedImg = currentImagesState.find(i => i.id === selectedImageId) ?? null

  // Shared page style to prevent selection/callout
  const noSelectStyle: React.CSSProperties = {
    userSelect: 'none',
    WebkitUserSelect: 'none',
    // @ts-ignore
    WebkitTouchCallout: 'none',
  }

  return (
    <div className={`flex flex-col ${isFullscreen ? 'h-full w-full' : ''}`}>

      {/* ── Settings popup (dropdown over canvas) ── */}
      {showSettings && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0"
            style={{ zIndex: 48 }}
            onClick={() => { setShowSettings(false); setShowBgPicker(false) }}
          />
          {/* Popup card */}
          <div
            className="fixed"
            style={{
              zIndex: 49,
              top: (() => { const r = settingsBtnRef.current?.getBoundingClientRect(); return r ? r.bottom + 8 : 60 })(),
              left: (() => { const r = settingsBtnRef.current?.getBoundingClientRect(); return r ? r.left : 12 })(),
              minWidth: 220,
            }}
          >
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: '#2C2C2E',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.55), 0 4px 16px rgba(0,0,0,0.3)',
              }}
            >
              {/* Vorlage wechseln */}
              <button
                onClick={() => setShowBgPicker(v => !v)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors"
                style={{ '--hover-bg': 'rgba(255,255,255,0.06)' } as React.CSSProperties}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }}>
                  <BgIcon type={currentBgType} size={15} />
                </div>
                <span className="text-[14px] font-semibold" style={{ color: 'rgba(255,255,255,0.92)' }}>Vorlage wechseln</span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.2" className="ml-auto">
                  <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {/* Background sub-menu */}
              {showBgPicker && (
                <div className="px-4 pb-3 flex flex-wrap gap-1.5" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                  {BG_OPTIONS.map(({ type, label }) => (
                    <button
                      key={type}
                      onClick={() => { setPageBackground({ type }); setShowBgPicker(false) }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all press-sm mt-2"
                      style={
                        currentBgType === type
                          ? { background: 'rgba(124,58,237,0.3)', border: '1.5px solid rgba(124,58,237,0.7)', color: '#C4B5FD' }
                          : { background: 'rgba(255,255,255,0.08)', border: '1.5px solid transparent', color: 'rgba(255,255,255,0.7)' }
                      }
                    >
                      <BgIcon type={type} size={11} />
                      {label}
                    </button>
                  ))}
                  <button
                    onClick={() => { bgInputRef.current?.click(); setShowBgPicker(false) }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all press-sm mt-2"
                    style={
                      currentBgType === 'image'
                        ? { background: 'rgba(124,58,237,0.3)', border: '1.5px solid rgba(124,58,237,0.7)', color: '#C4B5FD' }
                        : { background: 'rgba(255,255,255,0.08)', border: '1.5px solid transparent', color: 'rgba(255,255,255,0.7)' }
                    }
                  >
                    <BgIcon type="image" size={11} />
                    Bild
                  </button>
                  <input ref={bgInputRef} type="file" accept="image/*" className="hidden" onChange={handleBgImageUpload} />
                </div>
              )}

              <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '0 16px' }} />

              {/* Seite drehen */}
              <button
                onClick={() => { setShowSettings(false) }}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                disabled
                style={{ opacity: 0.38 }}
              >
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(90,200,250,0.15)' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#5AC8FA" strokeWidth="2.2">
                    <path d="M1 4v6h6" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M3.51 15a9 9 0 1 0 .49-4.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <span className="text-[14px] font-semibold" style={{ color: 'rgba(255,255,255,0.92)' }}>Seite drehen</span>
                  <span className="block text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Kommt bald</span>
                </div>
              </button>

              <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '0 16px' }} />

              {/* Nur Stift */}
              <button
                onClick={() => {
                  const next = !penOnlyMode
                  setPenOnlyMode(next)
                  localStorage.setItem(PEN_ONLY_KEY, next ? '1' : '0')
                }}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors"
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: penOnlyMode ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.1)' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={penOnlyMode ? '#C4B5FD' : 'rgba(255,255,255,0.7)'} strokeWidth="2.2">
                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span className="text-[14px] font-semibold" style={{ color: 'rgba(255,255,255,0.92)' }}>Nur Stift</span>
                {/* Toggle */}
                <div
                  className="ml-auto flex items-center"
                  style={{
                    width: 40, height: 24, borderRadius: 12,
                    background: penOnlyMode ? '#7C3AED' : 'rgba(255,255,255,0.18)',
                    padding: 3, transition: 'background 0.22s',
                  }}
                >
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%', background: 'white',
                    marginLeft: penOnlyMode ? 16 : 0,
                    transition: 'margin-left 0.22s',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
                  }} />
                </div>
              </button>

              <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '0 16px' }} />

              {/* Seite löschen */}
              <button
                onClick={() => { setShowSettings(false); setShowClearConfirm(true) }}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors"
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,59,48,0.12)' }}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(255,59,48,0.18)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF6B6B" strokeWidth="2.2">
                    <path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2" strokeLinecap="round" />
                  </svg>
                </div>
                <span className="text-[14px] font-semibold" style={{ color: '#FF6B6B' }}>Seite löschen</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Clear confirm overlay */}
      {showClearConfirm && (
        <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 60, background: 'rgba(0,0,0,0.4)' }}>
          <div className="rounded-2xl px-6 py-5 flex flex-col gap-3" style={{ background: 'var(--color-surface, #fff)', boxShadow: '0 16px 48px rgba(0,0,0,0.2)', minWidth: 240 }}>
            <p className="text-[15px] font-bold text-text-primary text-center">Seite löschen?</p>
            <p className="text-[12px] text-text-secondary text-center">Alle Striche auf dieser Seite werden entfernt.</p>
            <div className="flex gap-2 mt-1">
              <button onClick={() => setShowClearConfirm(false)} className="flex-1 py-2 rounded-xl text-[13px] font-semibold transition-all press-sm" style={{ background: 'rgba(0,0,0,0.07)', color: 'rgb(var(--color-text-secondary))' }}>Abbrechen</button>
              <button onClick={handleClear} className="flex-1 py-2 rounded-xl text-[13px] font-bold transition-all press-sm" style={{ background: '#FF3B30', color: 'white' }}>Löschen</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main toolbar (icon-only) ── */}
      <div
        className="flex items-center gap-0.5 px-3 border-b border-border/30 bg-surface shrink-0"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 10px)', paddingBottom: 10 }}
      >

        {/* Back */}
        {isFullscreen && onBack && (
          <button
            onClick={onBack}
            className="flex items-center justify-center w-11 h-11 rounded-xl transition-all press-sm shrink-0"
            style={{ color: 'rgb(var(--color-text-secondary))' }}
            title="Zurück"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
              <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}

        {/* Settings / 3-dots */}
        <button
          ref={settingsBtnRef}
          onClick={() => { setShowSettings(v => !v); if (showSettings) setShowBgPicker(false) }}
          className="flex items-center justify-center w-11 h-11 rounded-xl transition-all press-sm shrink-0"
          style={showSettings
            ? { background: 'rgba(124,58,237,0.12)', color: '#7C3AED' }
            : { color: 'rgb(var(--color-text-muted))' }}
          title="Einstellungen"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" />
          </svg>
        </button>

        {/* Undo / Redo */}
        <button onClick={handleUndo} disabled={!canUndo} className={`flex items-center justify-center w-11 h-11 rounded-xl transition-all press-sm shrink-0 ${!canUndo ? 'opacity-25 cursor-not-allowed' : ''}`} style={{ color: 'rgb(var(--color-text-secondary))' }} title="Rückgängig">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
            <path d="M3 7v6h6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button onClick={handleRedo} disabled={!canRedo} className={`flex items-center justify-center w-11 h-11 rounded-xl transition-all press-sm shrink-0 ${!canRedo ? 'opacity-25 cursor-not-allowed' : ''}`} style={{ color: 'rgb(var(--color-text-secondary))' }} title="Wiederholen">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
            <path d="M21 7v6h-6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3 17a9 9 0 019-9 9 9 0 016 2.3l3 2.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-border/50 mx-1.5 shrink-0" />

        {/* ── Tool icons ── */}

        {/* Pen — fountain pen nib */}
        <button onClick={() => setTool('pen')} className="flex items-center justify-center w-11 h-11 rounded-xl transition-all press-sm shrink-0" style={tool === 'pen' ? { background: 'rgba(124,58,237,0.14)', color: '#7C3AED' } : { color: 'rgb(var(--color-text-muted))' }} title="Stift">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
            {/* Body */}
            <path d="M19 2C20.1 2 21.5 3 21.5 4.5C21.5 5.2 21.2 5.8 20.7 6.3L8.5 18.5L4.5 20L6 16L18.2 3.8C18.7 3.2 19 2 19 2Z" strokeWidth="1.65"/>
            {/* Nib joint */}
            <path d="M16.5 5L19 7.5" strokeWidth="1.4"/>
            {/* Ink tip */}
            <path d="M5.2 16.8L4.5 20" strokeWidth="1.65"/>
            {/* Ink dot */}
            <circle cx="4.5" cy="20" r="0.7" fill="currentColor" stroke="none"/>
          </svg>
        </button>

        {/* Marker — flat chisel-tip highlighter */}
        <button onClick={() => setTool('highlighter')} className="flex items-center justify-center w-11 h-11 rounded-xl transition-all press-sm shrink-0" style={tool === 'highlighter' ? { background: 'rgba(250,204,21,0.15)', color: '#CA8A04' } : { color: 'rgb(var(--color-text-muted))' }} title="Marker">
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
            {/* Wide marker barrel */}
            <path d="M20.5 3.5C21.3 4.3 21.3 5.7 20.5 6.5L9.5 17.5L6 18.5L7 15L18 4C18.8 3.2 20.5 3.5 20.5 3.5Z" strokeWidth="1.8"/>
            {/* Cap band near top */}
            <path d="M17.5 5L20.5 8" strokeWidth="1.4"/>
            {/* Chisel tip — flat angled end at bottom-left */}
            <path d="M6 18.5L9.5 17.5" strokeWidth="2.8"/>
            {/* Wide highlight stroke below (shows it's a highlighter) */}
            <path d="M2.5 22L12 22" strokeWidth="3.5" strokeOpacity="0.45"/>
          </svg>
        </button>

        {/* Eraser — rectangular block eraser, slightly tilted */}
        <button onClick={() => setTool('eraser')} className="flex items-center justify-center w-11 h-11 rounded-xl transition-all press-sm shrink-0" style={tool === 'eraser' ? { background: 'rgba(255,59,48,0.11)', color: '#FF3B30' } : { color: 'rgb(var(--color-text-muted))' }} title="Radierer">
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
            <g transform="rotate(-10, 12, 14)">
              {/* Eraser block */}
              <rect x="2" y="9" width="20" height="10" rx="2" strokeWidth="1.75"/>
              {/* Cap / rubber separator */}
              <line x1="14" y1="9" x2="14" y2="19" strokeWidth="1.45"/>
              {/* Erasing-marks above (lines being erased) */}
              <path d="M3.5 5.5L10 5.5M4.5 7.2L9 7.2" strokeWidth="1.2" strokeOpacity="0.5"/>
            </g>
          </svg>
        </button>

        {/* Geometry pen — pen + ruler */}
        <button onClick={() => setTool('geometry')} className="flex items-center justify-center w-11 h-11 rounded-xl transition-all press-sm shrink-0" style={tool === 'geometry' ? { background: 'rgba(90,200,250,0.15)', color: '#5AC8FA' } : { color: 'rgb(var(--color-text-muted))' }} title="Geometrie-Stift (bald)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
            {/* Ruler bar */}
            <rect x="2" y="17" width="20" height="5" rx="1.5" strokeWidth="1.65"/>
            {/* Ruler tick marks */}
            <path d="M7 17L7 19.5M12 17L12 19.5M17 17L17 19.5" strokeWidth="1.2"/>
            {/* Pen above ruler */}
            <path d="M15.5 3.5C16.3 2.7 17.8 2.7 18 4L18 4.5C18 5.5 17.3 6.5 16.4 7.4L10.5 13.3L8 15L8.8 12.5L14.5 6.5C15 5.5 15.5 3.5 15.5 3.5Z" strokeWidth="1.65"/>
            {/* Pen nib joint */}
            <path d="M14 6L16 8" strokeWidth="1.3"/>
          </svg>
        </button>

        {/* Lasso — dashed selection oval */}
        <button onClick={() => setTool('lasso')} className="flex items-center justify-center w-11 h-11 rounded-xl transition-all press-sm shrink-0" style={tool === 'lasso' ? { background: 'rgba(52,199,89,0.13)', color: '#34C759' } : { color: 'rgb(var(--color-text-muted))' }} title="Lasso-Auswahl (bald)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round">
            {/* Dashed selection oval */}
            <ellipse cx="13" cy="10" rx="8.5" ry="6" strokeWidth="1.75" strokeDasharray="2.8 2"/>
            {/* Lasso tail (dashed, connecting back) */}
            <path d="M4.5 11C3.2 13.5 3.8 16.5 6.5 16.5L9 16.5" strokeWidth="1.65" strokeDasharray="2.8 2"/>
            {/* Arrow end of lasso */}
            <path d="M9 16.5L9 20" strokeWidth="1.65" strokeLinejoin="round"/>
            <path d="M7 18.2L9 20.5L11 18.2" strokeWidth="1.55" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Foto hinzufügen */}
        {isFullscreen && (
          <button onClick={() => canvasImgInputRef.current?.click()} className="flex items-center justify-center w-11 h-11 rounded-xl transition-all press-sm shrink-0" style={{ color: 'rgb(var(--color-text-muted))' }} title="Foto einfügen">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2.5" y="4" width="19" height="16" rx="2.5" />
              <circle cx="8.5" cy="9.5" r="2" />
              <path d="M2.5 17L8 12L12.5 16.5L15.5 13.5L21.5 19" />
            </svg>
          </button>
        )}
        <input ref={canvasImgInputRef} type="file" accept="image/*" className="hidden" onChange={handleCanvasImageUpload} />

        {/* Size picker — S/M/L dots (only for drawing tools) */}
        {(tool === 'pen' || tool === 'highlighter' || tool === 'eraser' || tool === 'geometry') && (
          <>
            <div className="w-px h-6 bg-border/40 mx-1 shrink-0" />
            <div className="flex items-center gap-0.5">
              {([0, 1, 2] as const).map(sIdx => {
                const isActive = currentSizeIdx === sIdx
                const visualSz = [5, 8, 12][sIdx]
                const dotColor = tool === 'eraser'
                  ? (isActive ? '#888' : '#bbb')
                  : (isActive ? colors[activeColorIdx] : colors[activeColorIdx] + '55')
                return (
                  <button key={sIdx} onClick={() => setCurrentSizeIdx(sIdx)}
                    className="flex items-center justify-center w-10 h-10 rounded-full transition-all press-sm"
                    style={{ background: isActive ? 'rgba(124,58,237,0.1)' : 'transparent', border: `1.5px solid ${isActive ? 'rgba(124,58,237,0.4)' : 'transparent'}` }}
                  >
                    <div style={{ width: visualSz, height: visualSz, borderRadius: '50%', background: dotColor }} />
                  </button>
                )
              })}
            </div>
          </>
        )}

        {/* ── Prominent separator ── */}
        <div className="w-px h-7 mx-2 shrink-0" style={{ background: 'rgba(0,0,0,0.12)' }} />

        {/* 6 Color dots */}
        {(tool === 'pen' || tool === 'highlighter' || tool === 'geometry') && (
          <div className="flex items-center gap-1.5 shrink-0">
            {colors.map((hex, idx) => {
              const isActive = activeColorIdx === idx
              const displayHex = tool === 'highlighter' ? hex + '99' : hex
              return (
                <button key={idx} onClick={() => handleColorDotClick(idx)}
                  className="transition-all press-sm shrink-0"
                  style={{
                    width: isActive ? 22 : 16, height: isActive ? 22 : 16,
                    borderRadius: '50%', backgroundColor: displayHex,
                    border: isActive ? '2.5px solid white' : '2px solid transparent',
                    boxShadow: isActive ? `0 0 0 2.5px ${hex}90` : 'none',
                    opacity: isActive ? 1 : 0.65,
                  }}
                  title={isActive ? 'Farbe ändern' : 'Farbe wählen'}
                />
              )
            })}
            <input ref={colorInputRef} type="color" className="opacity-0 absolute pointer-events-none" style={{ width: 0, height: 0 }} onChange={handleColorPickerChange} />
          </div>
        )}

        <div className="flex-1" />

        {/* KI-Analyse */}
        {isFullscreen && onAnalyzeRequest && (
          <button onClick={handleAnalyzeRequest}
            className="flex items-center justify-center w-11 h-11 rounded-xl transition-all press-sm shrink-0"
            title="KI-Analyse"
          >
            <span style={{ fontSize: 13, fontWeight: 800, color: '#059669', letterSpacing: '-0.3px' }}>KI</span>
          </button>
        )}

        {/* PDF export */}
        {isFullscreen && (
          <button onClick={handleExportPDF} disabled={isExporting}
            className="flex items-center justify-center w-11 h-11 rounded-xl transition-all press-sm shrink-0"
            style={{ color: '#7C3AED', opacity: isExporting ? 0.5 : 1 }}
            title="Als PDF exportieren"
          >
            {isExporting ? (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" className="animate-spin">
                <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        )}
      </div>

      {/* ── Canvas area ── */}
      {isFullscreen ? (
        <div
          ref={containerRef}
          className="flex-1 relative overflow-hidden"
          style={{ backgroundColor: '#E2E4E9', ...noSelectStyle }}
          onContextMenu={(e) => e.preventDefault()}
          onDoubleClick={(e) => e.preventDefault()}
        >
          {/* Transform wrapper — this is what gets zoomed/panned */}
          <div
            ref={pageWrapRef}
            style={{
              position: 'absolute',
              top: 0, left: 0,
              transformOrigin: '0 0',
              transform: `translate(${viewTransform.tx}px, ${viewTransform.ty}px) scale(${viewTransform.scale})`,
              willChange: 'transform',
            }}
          >
            {/* A4 page */}
            <div
              ref={pageRef}
              className="relative shrink-0"
              style={{
                backgroundColor: '#FFFFFF',
                boxShadow: '0 8px 40px rgba(0,0,0,0.22), 0 2px 8px rgba(0,0,0,0.10)',
                ...noSelectStyle,
              }}
            >
              {/* bg canvas */}
              <canvas ref={bgCanvasRef} className="absolute inset-0 w-full h-full" style={{ zIndex: 1, pointerEvents: 'none' }} />

              {/* image layer */}
              <div
                className="absolute inset-0"
                style={{ zIndex: 2, pointerEvents: tool === 'select' ? 'auto' : 'none' }}
                onClick={() => setSelectedImageId(null)}
              >
                {currentImagesState.map(img => (
                  <div
                    key={img.id}
                    style={{ position: 'absolute', left: `${img.x * 100}%`, top: `${img.y * 100}%`, width: `${img.w * 100}%`, height: `${img.h * 100}%`, cursor: 'move', boxSizing: 'border-box' }}
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => handleImagePointerDown(e, img, 'drag')}
                    onPointerMove={handleImagePointerMove}
                    onPointerUp={handleImagePointerUp}
                    onPointerCancel={handleImagePointerUp}
                  >
                    <img src={img.dataUrl} style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'none', userSelect: 'none', objectFit: 'fill' }} draggable={false} alt="" />
                  </div>
                ))}
              </div>

              {/* stroke canvas */}
              <canvas ref={skCanvasRef} className="absolute inset-0 w-full h-full" style={{ zIndex: 3, pointerEvents: 'none' }} />

              {/* active stroke canvas */}
              <canvas
                ref={fgCanvasRef}
                className="absolute inset-0 w-full h-full"
                style={{
                  zIndex: 4,
                  cursor: tool === 'eraser' ? 'none' : tool === 'select' ? 'default' : 'crosshair',
                  pointerEvents: tool === 'select' ? 'none' : 'auto',
                  touchAction: 'none',
                }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerLeave}
                onPointerCancel={onPointerLeave}
                onDoubleClick={(e) => e.preventDefault()}
              />

              {/* Eraser circle cursor */}
              {tool === 'eraser' && eraserCursorPos && (() => {
                const r = ERASER_SIZES[erSizeIdx] * 2
                return (
                  <div
                    style={{
                      position: 'absolute',
                      left: eraserCursorPos.x - r,
                      top:  eraserCursorPos.y - r,
                      width:  r * 2,
                      height: r * 2,
                      borderRadius: '50%',
                      border: '1.5px solid rgba(80,80,80,0.75)',
                      background: 'rgba(255,255,255,0.35)',
                      pointerEvents: 'none',
                      zIndex: 6,
                      boxSizing: 'border-box',
                    }}
                  />
                )
              })()}

              {/* selection handles */}
              {tool === 'select' && selectedImg && (() => {
                const { w: cw, h: ch } = canvasSizeRef.current
                const px = selectedImg.x * cw, py = selectedImg.y * ch
                const pw = selectedImg.w * cw, ph = selectedImg.h * ch
                const hs: React.CSSProperties = { position: 'absolute', background: '#7C3AED', borderRadius: 3 }
                return (
                  <div style={{ position: 'absolute', zIndex: 5, left: px, top: py, width: pw, height: ph, boxSizing: 'border-box', border: '2px solid #7C3AED', pointerEvents: 'none' }}>
                    <div style={{ position: 'absolute', top: -12, right: -12, width: 22, height: 22, background: '#FF3B30', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', pointerEvents: 'auto' }} onPointerDown={(e) => { e.stopPropagation(); deleteSelectedImage(selectedImg.id) }}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" /></svg>
                    </div>
                    <div style={{ ...hs, right: -5, top: '50%', transform: 'translateY(-50%)', width: 10, height: 28, cursor: 'ew-resize', pointerEvents: 'auto' }} onPointerDown={(e) => { e.stopPropagation(); handleImagePointerDown(e, selectedImg, 'resize-right') }} onPointerMove={handleImagePointerMove} onPointerUp={handleImagePointerUp} onPointerCancel={handleImagePointerUp} />
                    <div style={{ ...hs, bottom: -5, left: '50%', transform: 'translateX(-50%)', width: 28, height: 10, cursor: 'ns-resize', pointerEvents: 'auto' }} onPointerDown={(e) => { e.stopPropagation(); handleImagePointerDown(e, selectedImg, 'resize-bottom') }} onPointerMove={handleImagePointerMove} onPointerUp={handleImagePointerUp} onPointerCancel={handleImagePointerUp} />
                    <div style={{ ...hs, right: -5, bottom: -5, width: 14, height: 14, cursor: 'nwse-resize', pointerEvents: 'auto' }} onPointerDown={(e) => { e.stopPropagation(); handleImagePointerDown(e, selectedImg, 'resize-corner') }} onPointerMove={handleImagePointerMove} onPointerUp={handleImagePointerUp} onPointerCancel={handleImagePointerUp} />
                  </div>
                )
              })()}
            </div>
          </div>

          {/* Geometry shape handles overlay */}
          {tool === 'geometry' && selectedGeomId && (() => {
            const s = strokesRef.current.find(s => s.id === selectedGeomId)
            if (!s?.shape) return null
            const handles = getGeomHandles(s.shape)
            const { tx, ty, scale } = viewTransform
            // Bounding-box highlight
            let bx: number, by: number, bw2: number, bh2: number
            if (s.shape.kind === 'line') {
              const mx = Math.min(s.shape.x1, s.shape.x2), my = Math.min(s.shape.y1, s.shape.y2)
              bx = tx + mx * scale; by = ty + my * scale
              bw2 = Math.abs(s.shape.x2 - s.shape.x1) * scale; bh2 = Math.abs(s.shape.y2 - s.shape.y1) * scale
            } else if (s.shape.kind === 'rect') {
              bx = tx + s.shape.x * scale; by = ty + s.shape.y * scale
              bw2 = s.shape.w * scale; bh2 = s.shape.h * scale
            } else {
              bx = tx + (s.shape.cx - s.shape.rx) * scale; by = ty + (s.shape.cy - s.shape.ry) * scale
              bw2 = s.shape.rx * 2 * scale; bh2 = s.shape.ry * 2 * scale
            }
            return (
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 8 }}>
                {/* Dashed selection outline */}
                <div style={{
                  position: 'absolute', left: bx - 4, top: by - 4, width: bw2 + 8, height: bh2 + 8,
                  border: '1.5px dashed rgba(124,58,237,0.6)', borderRadius: 4, pointerEvents: 'none',
                }} />
                {/* Drag handles */}
                {handles.map(h => (
                  <div
                    key={h.idx}
                    style={{
                      position: 'absolute',
                      left: tx + h.x * scale - 8, top: ty + h.y * scale - 8,
                      width: 16, height: 16, borderRadius: '50%',
                      background: 'white', border: '2px solid #7C3AED',
                      boxShadow: '0 1px 6px rgba(0,0,0,0.25)',
                      pointerEvents: 'none',
                    }}
                  />
                ))}
              </div>
            )
          })()}

          {/* Lasso selection overlay */}
          {tool === 'lasso' && selection && (() => {
            const { x, y, w, h } = selection.bbox
            const { tx, ty, scale } = viewTransform
            const left = tx + x * scale, top = ty + y * scale
            const width = w * scale, height = h * scale
            const HR = 9 // handle radius px
            const corners = [
              { key: 'tl', left: left - HR,         top: top - HR },
              { key: 'tr', left: left + width - HR,  top: top - HR },
              { key: 'br', left: left + width - HR,  top: top + height - HR },
              { key: 'bl', left: left - HR,          top: top + height - HR },
            ]
            return (
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 9 }}>
                {/* Dashed bounding box */}
                <div style={{
                  position: 'absolute', left: left - 2, top: top - 2,
                  width: width + 4, height: height + 4,
                  border: '1.8px dashed rgba(124,58,237,0.75)',
                  borderRadius: 3, pointerEvents: 'none',
                }} />
                {/* Corner handles */}
                {corners.map(c => (
                  <div key={c.key} style={{
                    position: 'absolute', left: c.left, top: c.top,
                    width: HR * 2, height: HR * 2, borderRadius: '50%',
                    background: 'white', border: '2px solid #7C3AED',
                    boxShadow: '0 1px 6px rgba(0,0,0,0.25)',
                    pointerEvents: 'none',
                  }} />
                ))}
                {/* Action buttons */}
                <div style={{
                  position: 'absolute',
                  left: left + width / 2 - 64,
                  top: top - 46,
                  display: 'flex', gap: 6,
                  pointerEvents: 'auto',
                }}>
                  <button
                    onPointerDown={e => e.stopPropagation()}
                    onClick={handleDeleteSelection}
                    style={{
                      height: 32, paddingInline: 14,
                      borderRadius: 10, border: 'none',
                      background: '#FF453A', color: 'white',
                      fontSize: 13, fontWeight: 700,
                      boxShadow: '0 2px 10px rgba(0,0,0,0.25)',
                      cursor: 'pointer',
                    }}
                  >Löschen</button>
                  <button
                    onPointerDown={e => e.stopPropagation()}
                    onClick={() => { /* copy stub */ }}
                    style={{
                      height: 32, paddingInline: 14,
                      borderRadius: 10, border: '1.5px solid rgba(124,58,237,0.5)',
                      background: 'white', color: '#7C3AED',
                      fontSize: 13, fontWeight: 700,
                      boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
                      cursor: 'pointer',
                    }}
                  >Kopieren</button>
                </div>
              </div>
            )
          })()}

          {/* Page strip — outside transform wrapper so it stays fixed at bottom */}
          <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none" style={{ zIndex: 10 }}>
            <div className="flex items-center gap-2 bg-black/20 backdrop-blur-sm rounded-full px-3 py-1.5 pointer-events-auto">
              {Array.from({ length: pageCount }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => goToPage(i)}
                  className="transition-all press-sm"
                  style={{ width: i === currentIdx ? 22 : 8, height: 8, borderRadius: 4, backgroundColor: i === currentIdx ? '#1A1A2E' : 'rgba(0,0,0,0.2)' }}
                />
              ))}
              <div className="w-px h-3 bg-black/15 mx-0.5" />
              <button onClick={addPage} className="w-6 h-6 rounded-full flex items-center justify-center text-black/40 hover:text-black/70 transition-all press-sm">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ) : (
        // Inline mode
        <div
          ref={containerRef}
          className="relative w-full"
          style={{ height: '220px', touchAction: 'none', backgroundColor: '#FFFFFF', ...noSelectStyle }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <canvas ref={bgCanvasRef} className="absolute inset-0 w-full h-full" />
          <canvas ref={skCanvasRef} className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }} />
          <canvas
            ref={fgCanvasRef}
            className="absolute inset-0 w-full h-full"
            style={{ cursor: tool === 'eraser' ? 'cell' : 'crosshair', touchAction: 'none' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            onPointerCancel={onPointerUp}
          />
        </div>
      )}
    </div>
  )
}
