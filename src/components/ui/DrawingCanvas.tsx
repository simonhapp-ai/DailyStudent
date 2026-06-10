import { useRef, useState, useEffect, useCallback } from 'react'
import { getStroke } from 'perfect-freehand'

// ── Types (exported for DrawingCanvasScreen + NoteCreateScreen) ───────────────

type Tool = 'pen' | 'highlighter' | 'eraser' | 'select'
type BackgroundType = 'white' | 'lined' | 'grid' | 'dotted'
type Background = { type: BackgroundType } | { type: 'image'; dataUrl: string }

export interface CanvasImageData {
  id: string
  dataUrl: string
  x: number  // relative 0-1 of page width
  y: number  // relative 0-1 of page height
  w: number  // relative 0-1 of page width
  h: number  // relative 0-1 of page height
}

interface StrokeRecord {
  points: number[][]
  tool: Exclude<Tool, 'select'>
  colorHex: string
  size: number
}

export interface CanvasPageData {
  id: string
  background: Background
  strokes: StrokeRecord[]
  images: CanvasImageData[]
  thumbnail?: string  // small PNG preview, updated when leaving or saving
}

type ImageInteractionAction = 'drag' | 'resize-right' | 'resize-bottom' | 'resize-corner'

// ── Constants ─────────────────────────────────────────────────────────────────

const COLORS = [
  { id: 'black'  as const, hex: '#111827' },
  { id: 'blue'   as const, hex: '#2563EB' },
  { id: 'red'    as const, hex: '#DC2626' },
]
type ColorId = (typeof COLORS)[number]['id']

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
    const img = imgCache.get(bg.dataUrl)
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
  const containerRef = useRef<HTMLDivElement>(null)
  const pageRef      = useRef<HTMLDivElement>(null)
  const bgCanvasRef  = useRef<HTMLCanvasElement>(null)
  const skCanvasRef  = useRef<HTMLCanvasElement>(null)
  const fgCanvasRef  = useRef<HTMLCanvasElement>(null)

  const activeRef    = useRef<StrokeRecord | null>(null)
  const strokesRef   = useRef<StrokeRecord[]>([])
  const undoStackRef = useRef<StrokeRecord[][]>([])
  const redoStackRef = useRef<StrokeRecord[][]>([])
  const imgCacheRef  = useRef(new Map<string, HTMLImageElement>())
  const bgInputRef   = useRef<HTMLInputElement>(null)
  const canvasImgInputRef = useRef<HTMLInputElement>(null)
  const canvasSizeRef = useRef({ w: 0, h: 0 })

  // Pages: pagesRef is source of truth
  const pagesRef  = useRef<CanvasPageData[]>([{ id: 'p0', background: { type: 'white' }, strokes: [], images: [] }])
  const curIdxRef = useRef(0)
  const [pageCount,   setPageCount]   = useState(1)
  const [currentIdx,  setCurrentIdx]  = useState(0)
  const [currentBgType, setCurrentBgType] = useState<string>('white')

  // Image state — ref for sync in handlers, state for rendering
  const currentImagesRef = useRef<CanvasImageData[]>([])
  const [currentImagesState, setCurrentImagesState] = useState<CanvasImageData[]>([])
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)
  const imageInteractionRef = useRef<{
    action: ImageInteractionAction
    imageId: string
    startClientX: number
    startClientY: number
    startX: number; startY: number; startW: number; startH: number
    canvasW: number; canvasH: number
  } | null>(null)

  const [tool,             setTool]            = useState<Tool>('pen')
  const [color,            setColor]           = useState<ColorId>('black')
  const [showBgPicker,     setShowBgPicker]     = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [isExporting,      setIsExporting]      = useState(false)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [hasContent, setHasContent] = useState(false)
  const mountedRef = useRef(false)

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

  // ── Thumbnail generation ─────────────────────────────────────────────────

  const generateThumbnail = useCallback((pageIdx: number): string => {
    const { w, h } = canvasSizeRef.current
    if (w === 0 || h === 0) return ''
    const page = pagesRef.current[pageIdx]
    const THUMB_W = 280
    const scale = THUMB_W / w
    const THUMB_H = Math.round(h * scale)
    const offscreen = document.createElement('canvas')
    offscreen.width = THUMB_W
    offscreen.height = THUMB_H
    const ctx = offscreen.getContext('2d')!
    ctx.scale(scale, scale)
    drawBackground(ctx, w, h, page.background, imgCacheRef.current)
    drawCanvasImages(ctx, w, h, page.images ?? [], imgCacheRef.current)
    const strokes = pageIdx === curIdxRef.current ? strokesRef.current : page.strokes
    for (const s of strokes) paintStroke(ctx, s.points, s.tool, s.colorHex, s.size)
    return offscreen.toDataURL('image/png', 0.75)
  }, [])

  // ── Notify parent of pages change ─────────────────────────────────────────

  const notifyPagesChanged = useCallback(() => {
    if (!onPagesChange) return
    const idx = curIdxRef.current
    pagesRef.current[idx].strokes   = [...strokesRef.current]
    pagesRef.current[idx].images    = currentImagesRef.current
    pagesRef.current[idx].thumbnail = generateThumbnail(idx)
    onPagesChange(pagesRef.current.map(p => ({
      id: p.id,
      background: p.background,
      strokes: [...p.strokes],
      images: [...p.images],
      thumbnail: p.thumbnail,
    })))
  }, [onPagesChange, generateThumbnail])

  // ── Load initialPages on mount ────────────────────────────────────────────

  useEffect(() => {
    if (mountedRef.current) return
    mountedRef.current = true
    if (!initialPages || initialPages.length === 0) return

    pagesRef.current = initialPages.map(p => ({
      id: p.id,
      background: p.background,
      strokes: [...p.strokes],
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

    // Preload all cached images
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
    const c = bgCanvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    const { w, h } = getCSS()
    drawBackground(ctx, w, h, bg, imgCacheRef.current)
  }, [getCSS])

  const redrawStrokeCanvas = useCallback((strokes: StrokeRecord[]) => {
    const c = skCanvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    const { w, h } = getCSS()
    ctx.clearRect(0, 0, w, h)
    for (const s of strokes) paintStroke(ctx, s.points, s.tool, s.colorHex, s.size)
  }, [getCSS])

  const exportAndNotify = useCallback(() => {
    const sk = skCanvasRef.current
    if (!sk) return
    const { w, h } = getCSS()
    const page = pagesRef.current[curIdxRef.current]
    const images = currentImagesRef.current
    if (strokesRef.current.length === 0 && page.background.type === 'white' && images.length === 0) {
      onChange(null)
      return
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
    undoStackRef.current = []
    redoStackRef.current = []
    const newBg  = pagesRef.current[idx].background
    const newImg = pagesRef.current[idx].images ?? []
    setCurrentIdx(idx)
    setCurrentBgType(newBg.type)
    currentImagesRef.current = newImg
    setCurrentImagesState(newImg)
    setSelectedImageId(null)
    updateHistoryState()
    redrawBgCanvas(newBg)
    redrawStrokeCanvas(strokesRef.current)
    notifyPagesChanged()
  }, [redrawBgCanvas, redrawStrokeCanvas, updateHistoryState, notifyPagesChanged, generateThumbnail])

  const addPage = useCallback(() => {
    pagesRef.current[curIdxRef.current].strokes = [...strokesRef.current]
    pagesRef.current[curIdxRef.current].images  = currentImagesRef.current
    const newPage: CanvasPageData = { id: `p${Date.now()}`, background: { type: 'white' }, strokes: [], images: [] }
    pagesRef.current.push(newPage)
    const newIdx = pagesRef.current.length - 1
    curIdxRef.current = newIdx
    strokesRef.current = []
    undoStackRef.current = []
    redoStackRef.current = []
    currentImagesRef.current = []
    setPageCount(pagesRef.current.length)
    setCurrentIdx(newIdx)
    setCurrentBgType('white')
    setCurrentImagesState([])
    setSelectedImageId(null)
    updateHistoryState()
    redrawBgCanvas({ type: 'white' })
    redrawStrokeCanvas([])
    onChange(null)
    notifyPagesChanged()
  }, [redrawBgCanvas, redrawStrokeCanvas, updateHistoryState, onChange, notifyPagesChanged])

  const setPageBackground = useCallback((bg: Background) => {
    if (bg.type === 'image' && !imgCacheRef.current.has((bg as { dataUrl: string }).dataUrl)) {
      const dataUrl = (bg as { dataUrl: string }).dataUrl
      const img = new Image()
      img.onload = () => {
        imgCacheRef.current.set(dataUrl, img)
        redrawBgCanvas(bg)
        exportAndNotify()
      }
      img.src = dataUrl
    }
    pagesRef.current[curIdxRef.current].background = bg
    setCurrentBgType(bg.type)
    setShowBgPicker(false)
    redrawBgCanvas(bg)
    exportAndNotify()
    notifyPagesChanged()
  }, [redrawBgCanvas, exportAndNotify, notifyPagesChanged])

  // ── Resize observer ───────────────────────────────────────────────────────

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    function resize() {
      const outerRect = container!.getBoundingClientRect()
      let w: number, h: number

      if (isFullscreen) {
        const availW = outerRect.width - 48
        const availH = outerRect.height - 48
        const A4_RATIO = 297 / 210
        w = availW
        h = w * A4_RATIO
        if (h > availH) { h = availH; w = h / A4_RATIO }
        w = Math.floor(w); h = Math.floor(h)
        if (pageRef.current) {
          pageRef.current.style.width  = `${w}px`
          pageRef.current.style.height = `${h}px`
        }
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
      redrawBgCanvas(bg)
      redrawStrokeCanvas(strokesRef.current)
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(container)
    return () => ro.disconnect()
  }, [isFullscreen, redrawBgCanvas, redrawStrokeCanvas])

  // ── Pointer events (drawing) ──────────────────────────────────────────────

  const getXY = (e: React.PointerEvent<HTMLCanvasElement>): number[] => {
    const rect = fgCanvasRef.current!.getBoundingClientRect()
    return [e.clientX - rect.left, e.clientY - rect.top, e.pressure || 0.5]
  }

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool === 'select') return
    e.currentTarget.setPointerCapture(e.pointerId)
    const colorHex = COLORS.find(c => c.id === color)!.hex
    activeRef.current = { points: [getXY(e)], tool: tool as Exclude<Tool, 'select'>, colorHex, size: 4 }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!activeRef.current || e.buttons === 0) return
    activeRef.current.points.push(getXY(e))
    const fg = fgCanvasRef.current
    if (!fg) return
    const ctx = fg.getContext('2d')
    if (!ctx) return
    const { w, h } = getCSS()
    ctx.clearRect(0, 0, w, h)
    paintStroke(ctx, activeRef.current.points, activeRef.current.tool, activeRef.current.colorHex, activeRef.current.size)
  }

  const onPointerUp = () => {
    const stroke = activeRef.current
    activeRef.current = null
    if (!stroke || stroke.points.length === 0) return
    const sk = skCanvasRef.current
    if (sk) {
      const ctx = sk.getContext('2d')
      if (ctx) paintStroke(ctx, stroke.points, stroke.tool, stroke.colorHex, stroke.size)
    }
    const fg = fgCanvasRef.current
    if (fg) {
      const ctx = fg.getContext('2d')
      const { w, h } = getCSS()
      if (ctx) ctx.clearRect(0, 0, w, h)
    }
    undoStackRef.current = [...undoStackRef.current, [...strokesRef.current]]
    redoStackRef.current = []
    strokesRef.current = [...strokesRef.current, stroke]
    updateHistoryState()
    exportAndNotify()
    notifyPagesChanged()
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
    const inter = imageInteractionRef.current
    if (!inter) return
    const dx = (e.clientX - inter.startClientX) / inter.canvasW
    const dy = (e.clientY - inter.startClientY) / inter.canvasH
    const newImages = currentImagesRef.current.map(img => {
      if (img.id !== inter.imageId) return img
      if (inter.action === 'drag') {
        return { ...img, x: clamp(inter.startX + dx, 0, 1 - img.w), y: clamp(inter.startY + dy, 0, 1 - img.h) }
      }
      if (inter.action === 'resize-right') {
        return { ...img, w: Math.max(0.04, inter.startW + dx) }
      }
      if (inter.action === 'resize-bottom') {
        return { ...img, h: Math.max(0.04, inter.startH + dy) }
      }
      if (inter.action === 'resize-corner') {
        const newW = Math.max(0.04, inter.startW + dx)
        const ratio = inter.startH / Math.max(0.001, inter.startW)
        return { ...img, w: newW, h: Math.max(0.04, newW * ratio) }
      }
      return img
    })
    setCurrentImages(newImages)
  }

  const handleImagePointerUp = () => {
    if (imageInteractionRef.current) {
      imageInteractionRef.current = null
      exportAndNotify()
      notifyPagesChanged()
    }
  }

  const deleteSelectedImage = (id: string) => {
    const newImages = currentImagesRef.current.filter(i => i.id !== id)
    setCurrentImages(newImages)
    setSelectedImageId(null)
    exportAndNotify()
    notifyPagesChanged()
  }

  const handleCanvasImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      if (!dataUrl) return
      preloadImage(dataUrl)
      const newImg: CanvasImageData = {
        id: `img-${Date.now()}`,
        dataUrl,
        x: 0.05, y: 0.05, w: 0.4, h: 0.3,
      }
      const newImages = [...currentImagesRef.current, newImg]
      setCurrentImages(newImages)
      setSelectedImageId(newImg.id)
      setTool('select')
      exportAndNotify()
      notifyPagesChanged()
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // ── Undo / Redo / Clear ───────────────────────────────────────────────────

  const handleUndo = () => {
    if (undoStackRef.current.length === 0) return
    const snapshot = undoStackRef.current[undoStackRef.current.length - 1]
    redoStackRef.current = [...redoStackRef.current, [...strokesRef.current]]
    undoStackRef.current = undoStackRef.current.slice(0, -1)
    strokesRef.current = [...snapshot]
    redrawStrokeCanvas(strokesRef.current)
    updateHistoryState()
    exportAndNotify()
    notifyPagesChanged()
  }

  const handleRedo = () => {
    if (redoStackRef.current.length === 0) return
    const snapshot = redoStackRef.current[redoStackRef.current.length - 1]
    undoStackRef.current = [...undoStackRef.current, [...strokesRef.current]]
    redoStackRef.current = redoStackRef.current.slice(0, -1)
    strokesRef.current = [...snapshot]
    redrawStrokeCanvas(strokesRef.current)
    updateHistoryState()
    exportAndNotify()
    notifyPagesChanged()
  }

  const handleClear = () => {
    setShowClearConfirm(false)
    undoStackRef.current = [...undoStackRef.current, [...strokesRef.current]]
    redoStackRef.current = []
    strokesRef.current = []
    const sk = skCanvasRef.current
    if (sk) {
      const { w, h } = getCSS()
      sk.getContext('2d')?.clearRect(0, 0, w, h)
    }
    updateHistoryState()
    exportAndNotify()
    notifyPagesChanged()
  }

  // ── Background image upload ───────────────────────────────────────────────

  const handleBgImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      if (dataUrl) setPageBackground({ type: 'image', dataUrl })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
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
      const dpr = window.devicePixelRatio || 1

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
        for (const s of page.strokes) paintStroke(ctx, s.points, s.tool, s.colorHex, s.size)
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
    const dpr = window.devicePixelRatio || 1
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

  // ── Render ────────────────────────────────────────────────────────────────

  const selectedImg = currentImagesState.find(i => i.id === selectedImageId) ?? null

  return (
    <div className={`flex flex-col ${isFullscreen ? 'h-full w-full' : ''}`}>

      {/* ── Background picker panel ── */}
      {showBgPicker && (
        <div className="flex items-center gap-1.5 px-3 py-2 border-t border-border bg-surface shrink-0 flex-wrap">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider mr-1 shrink-0">
            Hintergrund
          </span>
          {BG_OPTIONS.map(({ type, label }) => (
            <button
              key={type}
              onClick={() => setPageBackground({ type })}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-[11px] font-semibold border transition-all press-sm"
              style={
                currentBgType === type
                  ? { background: 'rgba(var(--color-accent),0.12)', border: '1px solid rgba(var(--color-accent),0.5)', color: 'rgb(var(--color-accent))' }
                  : { background: 'transparent', border: '1px solid rgba(var(--color-border),0.6)', color: 'rgb(var(--color-text-secondary))' }
              }
            >
              <BgIcon type={type} size={12} />
              {label}
            </button>
          ))}
          <button
            onClick={() => bgInputRef.current?.click()}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-[11px] font-semibold border border-border/60 text-text-secondary transition-all press-sm"
            style={
              currentBgType === 'image'
                ? { background: 'rgba(var(--color-accent),0.12)', border: '1px solid rgba(var(--color-accent),0.5)', color: 'rgb(var(--color-accent))' }
                : { background: 'transparent', border: '1px solid rgba(var(--color-border),0.6)', color: 'rgb(var(--color-text-secondary))' }
            }
          >
            <BgIcon type="image" size={12} />
            Bild laden
          </button>
          <input ref={bgInputRef} type="file" accept="image/*" className="hidden" onChange={handleBgImageUpload} />
        </div>
      )}

      {/* ── Main toolbar ── */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-t border-border bg-surface shrink-0 flex-wrap">

        {/* Back button — fullscreen only */}
        {isFullscreen && onBack && (
          <>
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-pill text-[11px] font-bold transition-all press-sm shrink-0"
              style={{ background: 'transparent', border: '1px solid rgba(var(--color-border),0.6)', color: 'rgb(var(--color-text-secondary))' }}
              title="Zurück und speichern"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Zurück
            </button>
            <div className="w-px h-4 bg-border/60 shrink-0" />
          </>
        )}

        {/* Background toggle */}
        <button
          onClick={() => setShowBgPicker(v => !v)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-pill text-[11px] font-bold transition-all press-sm shrink-0"
          style={
            showBgPicker
              ? { background: 'rgba(var(--color-accent),0.15)', border: '1px solid rgba(var(--color-accent),0.5)', color: 'rgb(var(--color-accent))' }
              : { background: 'transparent', border: '1px solid rgba(var(--color-border),0.6)', color: 'rgb(var(--color-text-muted))' }
          }
          title="Hintergrund wechseln"
        >
          <BgIcon type={currentBgType} size={11} />
          Seite
        </button>

        <div className="w-px h-4 bg-border/60 shrink-0" />

        {/* Tool pills */}
        <div className="flex items-center gap-1.5">
          {/* Select tool */}
          <button
            onClick={() => setTool('select')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-pill text-[11px] font-bold transition-all press-sm"
            style={
              tool === 'select'
                ? { background: 'rgba(var(--color-accent),0.15)', border: '1px solid rgba(var(--color-accent),0.5)', color: 'rgb(var(--color-accent))' }
                : { background: 'transparent', border: '1px solid rgba(var(--color-border),0.6)', color: 'rgb(var(--color-text-muted))' }
            }
            title="Objekte auswählen"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M5 3l14 9-7 1-4 6-3-16z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

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

          <button
            onClick={() => setTool('highlighter')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-pill text-[11px] font-bold transition-all press-sm"
            style={
              tool === 'highlighter'
                ? { background: 'rgba(250,204,21,0.15)', border: '1px solid rgba(250,204,21,0.55)', color: '#CA8A04' }
                : { background: 'transparent', border: '1px solid rgba(var(--color-border),0.6)', color: 'rgb(var(--color-text-muted))' }
            }
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 22l4-4" strokeLinecap="round" />
            </svg>
            Marker
          </button>

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

        {/* Image upload button — fullscreen only */}
        {isFullscreen && (
          <>
            <div className="w-px h-4 bg-border/60 shrink-0" />
            <button
              onClick={() => canvasImgInputRef.current?.click()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-pill text-[11px] font-bold transition-all press-sm shrink-0"
              style={{ background: 'transparent', border: '1px solid rgba(var(--color-border),0.6)', color: 'rgb(var(--color-text-muted))' }}
              title="Foto in Canvas einfügen"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Foto
            </button>
            <input ref={canvasImgInputRef} type="file" accept="image/*" className="hidden" onChange={handleCanvasImageUpload} />
          </>
        )}

        <div className="w-px h-4 bg-border/60 shrink-0" />

        {/* Color dots — pen/highlighter only */}
        {(tool === 'pen' || tool === 'highlighter') && (
          <>
            <div className="flex items-center gap-2">
              {COLORS.map(c => (
                <button
                  key={c.id}
                  onClick={() => setColor(c.id)}
                  className="transition-all press-sm shrink-0"
                  style={{
                    width: color === c.id ? 20 : 14,
                    height: color === c.id ? 20 : 14,
                    borderRadius: '50%',
                    backgroundColor: tool === 'highlighter' ? c.hex + '99' : c.hex,
                    border: color === c.id ? '2.5px solid white' : '2px solid transparent',
                    boxShadow: color === c.id ? `0 0 0 2px ${c.hex}80` : 'none',
                    opacity: color === c.id ? 1 : 0.55,
                  }}
                />
              ))}
            </div>
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

        {/* Clear — fullscreen only */}
        {isFullscreen && (
          showClearConfirm ? (
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] font-semibold text-text-secondary">Seite löschen?</span>
              <button
                onClick={handleClear}
                className="px-2.5 py-1.5 rounded-pill text-[11px] font-bold transition-all press-sm"
                style={{ background: 'rgba(255,59,48,0.12)', border: '1px solid rgba(255,59,48,0.45)', color: '#FF3B30' }}
              >
                Ja
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-2.5 py-1.5 rounded-pill text-[11px] font-bold transition-all press-sm"
                style={{ background: 'transparent', border: '1px solid rgba(var(--color-border),0.6)', color: 'rgb(var(--color-text-secondary))' }}
              >
                Nein
              </button>
            </div>
          ) : (
            <button
              onClick={() => hasContent && setShowClearConfirm(true)}
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
          )
        )}

        {/* KI-Analyse — fullscreen only */}
        {isFullscreen && !showClearConfirm && onAnalyzeRequest && (
          <button
            onClick={handleAnalyzeRequest}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-pill text-[11px] font-bold transition-all press-sm shrink-0"
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.4)', color: '#059669' }}
            title="Handschrift analysieren"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
              <path d="M12 8v4l3 3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            KI-Analyse
          </button>
        )}

        {/* PDF export — fullscreen only */}
        {isFullscreen && !showClearConfirm && (
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-pill text-[11px] font-bold transition-all press-sm shrink-0 ml-1"
            style={{
              background: 'rgba(var(--color-accent),0.12)',
              border: '1px solid rgba(var(--color-accent),0.45)',
              color: 'rgb(var(--color-accent))',
              opacity: isExporting ? 0.6 : 1,
              cursor: isExporting ? 'not-allowed' : 'pointer',
            }}
          >
            {isExporting ? (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin">
                <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {isExporting ? 'Erstellt…' : 'PDF'}
          </button>
        )}
      </div>

      {/* ── Canvas area ── */}
      {isFullscreen ? (
        <div
          ref={containerRef}
          className="flex-1 flex items-center justify-center overflow-hidden"
          style={{ backgroundColor: '#E2E4E9' }}
        >
          <div
            ref={pageRef}
            className="relative shrink-0"
            style={{
              backgroundColor: '#FFFFFF',
              touchAction: 'none',
              boxShadow: '0 8px 40px rgba(0,0,0,0.22), 0 2px 8px rgba(0,0,0,0.10)',
            }}
          >
            {/* z-1: background canvas */}
            <canvas ref={bgCanvasRef} className="absolute inset-0 w-full h-full" style={{ zIndex: 1, pointerEvents: 'none' }} />

            {/* z-2: image layer (interactive in select mode) */}
            <div
              className="absolute inset-0"
              style={{ zIndex: 2, pointerEvents: tool === 'select' ? 'auto' : 'none' }}
              onClick={() => setSelectedImageId(null)}
            >
              {currentImagesState.map(img => (
                <div
                  key={img.id}
                  style={{
                    position: 'absolute',
                    left: `${img.x * 100}%`,
                    top: `${img.y * 100}%`,
                    width: `${img.w * 100}%`,
                    height: `${img.h * 100}%`,
                    cursor: 'move',
                    boxSizing: 'border-box',
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => handleImagePointerDown(e, img, 'drag')}
                  onPointerMove={handleImagePointerMove}
                  onPointerUp={handleImagePointerUp}
                  onPointerCancel={handleImagePointerUp}
                >
                  <img
                    src={img.dataUrl}
                    style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'none', userSelect: 'none', objectFit: 'fill' }}
                    draggable={false}
                    alt=""
                  />
                </div>
              ))}
            </div>

            {/* z-3: stroke canvas (display only) */}
            <canvas ref={skCanvasRef} className="absolute inset-0 w-full h-full" style={{ zIndex: 3, pointerEvents: 'none' }} />

            {/* z-4: active stroke canvas */}
            <canvas
              ref={fgCanvasRef}
              className="absolute inset-0 w-full h-full"
              style={{
                zIndex: 4,
                cursor: tool === 'eraser' ? 'cell' : tool === 'select' ? 'default' : 'crosshair',
                pointerEvents: tool === 'select' ? 'none' : 'auto',
                touchAction: 'none',
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
              onPointerCancel={onPointerUp}
            />

            {/* z-5: selection handles (above strokes when in select mode) */}
            {tool === 'select' && selectedImg && (() => {
              const { w: cw, h: ch } = canvasSizeRef.current
              const px = selectedImg.x * cw
              const py = selectedImg.y * ch
              const pw = selectedImg.w * cw
              const ph = selectedImg.h * ch
              const handleStyle: React.CSSProperties = {
                position: 'absolute',
                background: '#7C3AED',
                borderRadius: 3,
              }
              return (
                <div
                  style={{
                    position: 'absolute',
                    zIndex: 5,
                    left: px,
                    top: py,
                    width: pw,
                    height: ph,
                    boxSizing: 'border-box',
                    border: '2px solid #7C3AED',
                    pointerEvents: 'none',
                  }}
                >
                  {/* Delete */}
                  <div
                    style={{
                      position: 'absolute', top: -12, right: -12,
                      width: 22, height: 22,
                      background: '#FF3B30', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', pointerEvents: 'auto',
                    }}
                    onPointerDown={(e) => { e.stopPropagation(); deleteSelectedImage(selectedImg.id) }}
                  >
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                    </svg>
                  </div>
                  {/* Right resize */}
                  <div
                    style={{ ...handleStyle, right: -5, top: '50%', transform: 'translateY(-50%)', width: 10, height: 28, cursor: 'ew-resize', pointerEvents: 'auto' }}
                    onPointerDown={(e) => { e.stopPropagation(); handleImagePointerDown(e, selectedImg, 'resize-right') }}
                    onPointerMove={handleImagePointerMove}
                    onPointerUp={handleImagePointerUp}
                    onPointerCancel={handleImagePointerUp}
                  />
                  {/* Bottom resize */}
                  <div
                    style={{ ...handleStyle, bottom: -5, left: '50%', transform: 'translateX(-50%)', width: 28, height: 10, cursor: 'ns-resize', pointerEvents: 'auto' }}
                    onPointerDown={(e) => { e.stopPropagation(); handleImagePointerDown(e, selectedImg, 'resize-bottom') }}
                    onPointerMove={handleImagePointerMove}
                    onPointerUp={handleImagePointerUp}
                    onPointerCancel={handleImagePointerUp}
                  />
                  {/* Corner resize */}
                  <div
                    style={{ ...handleStyle, right: -5, bottom: -5, width: 14, height: 14, cursor: 'nwse-resize', pointerEvents: 'auto' }}
                    onPointerDown={(e) => { e.stopPropagation(); handleImagePointerDown(e, selectedImg, 'resize-corner') }}
                    onPointerMove={handleImagePointerMove}
                    onPointerUp={handleImagePointerUp}
                    onPointerCancel={handleImagePointerUp}
                  />
                </div>
              )
            })()}

            {/* Page strip */}
            <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none" style={{ zIndex: 6 }}>
              <div className="flex items-center gap-2 bg-black/20 backdrop-blur-sm rounded-full px-3 py-1.5 pointer-events-auto">
                {Array.from({ length: pageCount }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goToPage(i)}
                    className="transition-all press-sm"
                    style={{
                      width: i === currentIdx ? 22 : 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: i === currentIdx ? '#1A1A2E' : 'rgba(0,0,0,0.2)',
                    }}
                    title={`Seite ${i + 1}`}
                  />
                ))}
                <div className="w-px h-3 bg-black/15 mx-0.5" />
                <button
                  onClick={addPage}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-black/40 hover:text-black/70 hover:bg-black/8 transition-all press-sm"
                  title="Neue Seite"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Inline mode: simple canvas preview, no image interaction
        <div
          ref={containerRef}
          className="relative w-full"
          style={{ height: '220px', touchAction: 'none', backgroundColor: '#FFFFFF' }}
        >
          <canvas ref={bgCanvasRef} className="absolute inset-0 w-full h-full" />
          <canvas ref={skCanvasRef} className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }} />
          <canvas
            ref={fgCanvasRef}
            className="absolute inset-0 w-full h-full"
            style={{ cursor: tool === 'eraser' ? 'cell' : 'crosshair' }}
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
