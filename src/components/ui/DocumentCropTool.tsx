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
      [r.left + r.width * inset, r.top + r.height * inset],
      [r.left + r.width * (1 - inset), r.top + r.height * inset],
      [r.left + r.width * (1 - inset), r.top + r.height * (1 - inset)],
      [r.left + r.width * inset, r.top + r.height * (1 - inset)],
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

  const modeLabels: { key: ScanMode; label: string; icon: string }[] = [
    { key: 'color', label: 'Farbe', icon: '🎨' },
    { key: 'grayscale', label: 'Graustufen', icon: '⬛' },
    { key: 'bw', label: 'S/W', icon: '◼' },
  ]

  const cornerColors = ['#7C3AED', '#7C3AED', '#7C3AED', '#7C3AED']

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#0a0a0a' }}>

      {/* ── Header ── */}
      <div
        className="shrink-0 flex items-center justify-between px-5"
        style={{
          paddingTop: 'max(14px, env(safe-area-inset-top, 14px))',
          paddingBottom: 12,
          background: 'rgba(10,10,10,0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '0.5px solid rgba(255,255,255,0.08)',
        }}
      >
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 active:opacity-60 transition-opacity"
          style={{ color: 'rgba(255,255,255,0.75)', fontSize: 15, fontWeight: 500 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
          Abbrechen
        </button>

        <span style={{ color: 'white', fontSize: 16, fontWeight: 700 }}>Dokument scannen</span>

        <div style={{ width: 90 }} />
      </div>

      {/* ── Image + overlay ── */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ touchAction: 'none' }}
      >
        <img
          ref={imgRef}
          src={imageDataUrl}
          onLoad={initCorners}
          className="absolute inset-0 w-full h-full object-contain select-none"
          draggable={false}
          alt=""
          style={{ userSelect: 'none' }}
        />

        {imgLoaded && (
          <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none', touchAction: 'none' }}>
            <defs>
              <mask id="doc-crop-mask">
                <rect width="100%" height="100%" fill="white" />
                <polygon points={polygonPoints} fill="black" />
              </mask>
            </defs>

            {/* Dark overlay outside selection */}
            <rect width="100%" height="100%" fill="rgba(0,0,0,0.55)" mask="url(#doc-crop-mask)" />

            {/* Edge lines */}
            {[0, 1, 2, 3].map(i => {
              const [x1, y1] = relCorners[i]
              const [x2, y2] = relCorners[(i + 1) % 4]
              return (
                <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="#7C3AED" strokeWidth="2.5" strokeOpacity="0.95"
                />
              )
            })}

            {/* Quad border */}
            <polygon
              points={polygonPoints}
              fill="none"
              stroke="#7C3AED"
              strokeWidth="2.5"
              strokeOpacity="0.9"
            />
          </svg>
        )}

        {/* Corner drag handles — large iOS-style */}
        {imgLoaded && relCorners.map(([x, y], idx) => (
          <div
            key={idx}
            onPointerDown={e => onPointerDown(e, idx)}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              transform: 'translate(-50%, -50%)',
              width: 52,
              height: 52,
              touchAction: 'none',
              cursor: 'grab',
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Outer ring (hit target) */}
            <div style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'rgba(124,58,237,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 0 1.5px rgba(124,58,237,0.4)',
            }}>
              {/* Inner circle */}
              <div style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: 'white',
                border: `2.5px solid ${cornerColors[idx]}`,
                boxShadow: '0 2px 8px rgba(0,0,0,0.45), 0 1px 3px rgba(0,0,0,0.3)',
              }} />
            </div>
          </div>
        ))}

        {/* Corner index hints (small numbers) */}
        {imgLoaded && relCorners.map(([x, y], idx) => {
          const offsets = [[-18, -18], [18, -18], [18, 18], [-18, 18]]
          return (
            <div
              key={`hint-${idx}`}
              style={{
                position: 'absolute',
                left: x + offsets[idx][0],
                top: y + offsets[idx][1],
                pointerEvents: 'none',
                zIndex: 9,
              }}
            >
              <div style={{
                background: 'rgba(124,58,237,0.85)',
                color: 'white',
                fontSize: 9,
                fontWeight: 800,
                width: 16,
                height: 16,
                borderRadius: 5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>{idx + 1}</div>
            </div>
          )
        })}
      </div>

      {/* ── Bottom panel ── */}
      <div
        className="shrink-0"
        style={{
          background: 'rgba(18,18,22,0.96)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          borderRadius: '20px 20px 0 0',
          borderTop: '0.5px solid rgba(255,255,255,0.1)',
          paddingTop: 16,
          paddingBottom: 'max(28px, env(safe-area-inset-bottom, 28px))',
          paddingInline: 20,
        }}
      >
        {/* Drag pill */}
        <div style={{
          width: 36, height: 4, borderRadius: 2,
          background: 'rgba(255,255,255,0.18)',
          margin: '0 auto 16px',
        }} />

        {/* Scan mode pills */}
        <div className="flex items-center gap-2 justify-center mb-4">
          {modeLabels.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setScanMode(key)}
              style={{
                height: 38,
                paddingInline: 16,
                borderRadius: 20,
                border: scanMode === key ? 'none' : '1.5px solid rgba(255,255,255,0.15)',
                background: scanMode === key ? '#7C3AED' : 'rgba(255,255,255,0.07)',
                color: scanMode === key ? 'white' : 'rgba(255,255,255,0.6)',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                touchAction: 'manipulation',
                transition: 'all 0.18s',
                minWidth: 80,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Scan button */}
        <button
          onClick={handleScan}
          disabled={processing || !imgLoaded}
          style={{
            width: '100%',
            height: 54,
            borderRadius: 16,
            border: 'none',
            background: processing || !imgLoaded
              ? 'rgba(124,58,237,0.4)'
              : 'linear-gradient(135deg, #7C3AED 0%, #9B59B6 100%)',
            color: 'white',
            fontSize: 16,
            fontWeight: 700,
            cursor: processing || !imgLoaded ? 'not-allowed' : 'pointer',
            touchAction: 'manipulation',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: processing || !imgLoaded ? 'none' : '0 4px 20px rgba(124,58,237,0.45)',
            transition: 'all 0.2s',
          }}
        >
          {processing ? (
            <>
              <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                <path d="M12 2a10 10 0 0110 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
              </svg>
              Wird verarbeitet…
            </>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              Scannen
            </>
          )}
        </button>
      </div>
    </div>
  )
}
