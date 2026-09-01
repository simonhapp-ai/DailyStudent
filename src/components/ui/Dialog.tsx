import { useEffect, useRef, type ReactNode } from 'react'

interface DialogProps {
  open: boolean
  /** Titel als Frage — „Lernzettel löschen?", nicht „Löschen". */
  title: string
  /** Ein Satz Konsequenz, möglichst mit echten Zahlen aus dem Konto. */
  message?: ReactNode
  /** Beschriftung der bestätigenden Aktion. Benennt die Handlung, nie „OK". */
  confirmLabel: string
  cancelLabel?: string
  /** Zerstörend? Dann steht die Aktion in Rot und zuerst. */
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

// Dialog (Version C) — für genau EINE Entscheidung mit Folgen.
// Ersetzt window.confirm(): Der Systemdialog ignoriert jede Gestaltung und sieht auf
// iOS aus wie eine Webseite. Nie für Informationen, nie für Formulare — dafür ist das
// Sheet da.
export function Dialog({
  open, title, message, confirmLabel, cancelLabel = 'Abbrechen', destructive, onConfirm, onCancel,
}: DialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    confirmRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-10">
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-[4px] animate-fade-in motion-reduce:animate-none"
        onClick={onCancel}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-[320px] bg-surface rounded-sheet p-5 pb-4 flex flex-col gap-3 text-center shadow-modal animate-fade-in motion-reduce:animate-none"
      >
        <span className="text-[19px] font-bold tracking-[-0.02em] text-text-primary">{title}</span>
        {message && <span className="text-[13px] leading-snug text-text-secondary">{message}</span>}
        <div className="flex flex-col gap-2 pt-1">
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`h-12 rounded-pill text-[16px] font-semibold press ${
              destructive
                ? 'bg-fill-red text-fill-red-on'
                : 'btn-mode'
            }`}
          >
            {confirmLabel}
          </button>
          <button
            onClick={onCancel}
            className="h-12 rounded-pill text-[16px] font-semibold text-text-primary bg-[rgb(120,120,128)]/[0.12] dark:bg-[rgb(120,120,128)]/[0.24] press"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
