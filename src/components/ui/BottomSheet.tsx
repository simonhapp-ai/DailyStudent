import { useRef, useState, type ReactNode } from 'react'

interface Props {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
}

export function BottomSheet({ isOpen, onClose, children }: Props) {
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const startY = useRef(0)
  const latestDragY = useRef(0)
  const isDown = useRef(false)

  if (!isOpen) return null

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDown.current = true
    setIsDragging(true)
    startY.current = e.clientY
    latestDragY.current = 0
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDown.current) return
    const dy = Math.max(0, e.clientY - startY.current)
    latestDragY.current = dy
    setDragY(dy)
  }

  const onUp = () => {
    if (!isDown.current) return
    isDown.current = false
    setIsDragging(false)
    const dy = latestDragY.current
    latestDragY.current = 0
    setDragY(0)
    // tap (barely moved) OR swipe down far enough → close
    if (dy < 8 || dy > 72) onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className="relative max-w-lg mx-auto w-full bg-surface rounded-t-sheet z-10 animate-sheet-up"
        style={{
          transform: `translateY(${dragY}px)`,
          transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom, 0px))',
        }}
      >
        {/* Handle — tap = schließen, nach unten wischen = schließen */}
        <div
          className="pt-4 pb-2 flex justify-center touch-none select-none"
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          <div
            className="w-10 h-1 rounded-full transition-colors duration-150"
            style={{ backgroundColor: isDragging ? 'rgb(var(--color-accent))' : 'rgb(var(--color-border) / 0.6)' }}
          />
        </div>
        {children}
      </div>
    </div>
  )
}
