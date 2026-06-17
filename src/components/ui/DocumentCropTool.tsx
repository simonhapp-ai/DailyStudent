import { useRef, useState, useCallback, useEffect } from 'react'
import { applyPerspectiveWarp, enhanceDocumentScan } from '../../lib/imageProcessing'

type Point = [number, number]
type ScanMode = 'color' | 'grayscale' | 'bw'

interface Props {
  imageDataUrl: string
  onConfirm: (processedDataUrl: string) => void
  onCancel: () => void
}

// Returns the actual rendered image rect within an object-contain container
function getImageDisplayRect(img: HTMLImageElement): { left: number; top: number; width: number; height: number } {
  const container = img.parentElement!
  const containerRect = container.getBoundingClientRect()
  const imgAspect = img.naturalWidth / img.naturalHeight
  const containerAspect = containerRect.width / containerRect.height

  let renderedW: number, renderedH: number
  if (imgAspect > containerAspect) {
    renderedW = containerRect.width
    renderedH = containerRect.width / imgAspect
  } else {
    renderedH = containerRect.height
    renderedW = containerRect.height * imgAspect
  }

  return {
    left: containerRect.left + (containerRect.width - renderedW) / 2,
    top: containerRect.top + (containerRect.height - renderedH) / 2,
    width: renderedW,
    height: renderedH,
  }
}

export default function DocumentCropTool({ imageDataUrl, onConfirm, onCancel }: Props) {
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [corners, setCorners] = useState<Point[]>([[0, 0], [0, 0], [0, 0], [0, 0]])
  const [scanMode, setScanMode] = useState<ScanMode>('color')
  const [processing, setProcessing] = useState(false)
  const draggingIdx = useRef<number | null>(null)

  // Initialize corners after image loads
  const initCorners = useCallback(() => {
    if (!imgRef.current) return
    const r = getImageDisplayRect(imgRef.current)
    const inset = 0.08
    setCorners([
      [r.left + r.width * inset, r.top + r.height * inset],        // TL
      [r.left + r.width * (1 - inset), r.top + r.height * inset],  // TR
      [r.left + r.width * (1 - inset), r.top + r.height * (1 - inset)], // BR
      [r.left + r.width * inset, r.top + r.height * (1 - inset)],  // BL
    ])
    setImgLoaded(true)
  }, [])

  useEffect(() => {
    if (!imgLoaded) return
    const observer = new ResizeObserver(initCorners)
    if (containerRef.current) observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [imgLoaded, initCorners])

  const onPointerDown = useCallback((e: React.PointerEvent, idx: number) => {
    e.preventDefault()
    e.stopPropagation()
    draggingIdx.current = idx
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (draggingIdx.current === null) return
    e.preventDefault()
    const idx = draggingIdx.current
    setCorners(prev => {
      const next = [...prev] as Point[]
      next[idx] = [e.clientX, e.clientY]
      return next
    })
  }, [])

  const onPointerUp = useCallback(() => {
    draggingIdx.current = null
  }, [])

  const handleScan = useCallback(async () => {
    if (!imgRef.current || processing) return
    setProcessing(true)
    try {
      const imgRect = getImageDisplayRect(imgRef.current)
      const scaleX = imgRef.current.naturalWidth / imgRect.width
      const scaleY = imgRef.current.naturalHeight / imgRect.height

      // Convert display coords → image pixel coords
      const pixelCorners: Point[] = corners.map(([cx, cy]) => [
        (cx - imgRect.left) * scaleX,
        (cy - imgRect.top) * scaleY,
      ])

      const warped = await applyPerspectiveWarp(imageDataUrl, pixelCorners)
      const enhanced = await enhanceDocumentScan(warped, scanMode)
      onConfirm(enhanced)
    } catch (err) {
      console.error('Document scan failed:', err)
      setProcessing(false)
    }
  }, [corners, imageDataUrl, scanMode, onConfirm, processing])

  // Build SVG polygon path from corner points (screen coords → relative to container)
  const containerRect = containerRef.current?.getBoundingClientRect()
  const relCorners = containerRect
    ? corners.map(([cx, cy]): Point => [cx - containerRect.left, cy - containerRect.top])
    : corners

  const polygonPoints = relCorners.map(([x, y]) => `${x},${y}`).join(' ')

  const modeLabels: { key: ScanMode; label: string }[] = [
    { key: 'color', label: 'Farbe' },
    { key: 'grayscale', label: 'Graustufen' },
    { key: 'bw', label: 'S/W' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <span className="text-white font-semibold text-base">Dokument scannen</span>
        <button
          onClick={onCancel}
          className="text-white/70 text-sm active:opacity-50"
        >
          Abbrechen
        </button>
      </div>

      {/* Image + overlay */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <img
          ref={imgRef}
          src={imageDataUrl}
          onLoad={initCorners}
          className="absolute inset-0 w-full h-full object-contain select-none"
          draggable={false}
          alt=""
        />

        {imgLoaded && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ touchAction: 'none' }}>
            {/* Dark overlay outside the quad */}
            <defs>
              <mask id="doc-mask">
                <rect width="100%" height="100%" fill="white" />
                <polygon points={polygonPoints} fill="black" />
              </mask>
            </defs>
            <rect width="100%" height="100%" fill="rgba(0,0,0,0.5)" mask="url(#doc-mask)" />

            {/* Quad border */}
            <polygon
              points={polygonPoints}
              fill="none"
              stroke="#7C3AED"
              strokeWidth="2"
              strokeOpacity="0.9"
            />

            {/* Edge lines for clarity */}
            {[0, 1, 2, 3].map(i => {
              const [x1, y1] = relCorners[i]
              const [x2, y2] = relCorners[(i + 1) % 4]
              return (
                <line
                  key={i}
                  x1={x1} y1={y1}
                  x2={x2} y2={y2}
                  stroke="#7C3AED"
                  strokeWidth="2"
                  strokeOpacity="0.85"
                />
              )
            })}
          </svg>
        )}

        {/* Drag handles — rendered in DOM so pointer events work */}
        {imgLoaded && relCorners.map(([x, y], idx) => (
          <div
            key={idx}
            onPointerDown={e => onPointerDown(e, idx)}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              transform: 'translate(-50%, -50%)',
              width: 32,
              height: 32,
              touchAction: 'none',
              cursor: 'grab',
            }}
            className="rounded-full bg-white shadow-lg border-2 border-purple-500 active:scale-110 z-10"
          />
        ))}
      </div>

      {/* Bottom panel */}
      <div className="shrink-0 bg-black/80 backdrop-blur-sm px-4 pt-3 pb-6 space-y-3">
        {/* Scan mode pills */}
        <div className="flex items-center gap-2 justify-center">
          {modeLabels.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setScanMode(key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                scanMode === key
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Action button */}
        <button
          onClick={handleScan}
          disabled={processing || !imgLoaded}
          className="w-full py-3.5 rounded-2xl font-semibold text-white text-base bg-gradient-to-r from-purple-600 to-violet-600 active:opacity-80 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {processing ? (
            <>
              <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Wird gescannt…
            </>
          ) : (
            'Scannen'
          )}
        </button>
      </div>
    </div>
  )
}
