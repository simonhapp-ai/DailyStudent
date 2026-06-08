import { useUser } from '../../context/UserContext'

export function SyncErrorBanner() {
  const { syncQueueStatus, retrySyncQueue } = useUser()
  const { pending, failed } = syncQueueStatus

  if (pending === 0 && failed === 0) return null

  const hasFailures = failed > 0

  return (
    <div
      className="fixed bottom-24 left-4 right-4 rounded-card px-4 py-3 flex items-center justify-between gap-3 animate-pulse md:left-auto md:right-4 md:max-w-sm z-40"
      style={{
        background: hasFailures
          ? 'rgba(255, 59, 48, 0.12)'
          : 'rgba(255, 159, 10, 0.12)',
      }}
    >
      <div className="flex-1 min-w-0">
        <p
          className="text-[13px] font-semibold"
          style={{
            color: hasFailures ? '#FF3B30' : '#FF9F0A',
          }}
        >
          {hasFailures
            ? `Fehler beim Speichern (${failed} Items)`
            : `Speichern läuft... (${pending} Items)`}
        </p>
        <p className="text-[11px] text-text-muted mt-0.5">
          {hasFailures
            ? 'Tippe zum Wiederholen'
            : 'Daten werden zu Supabase synchronisiert'}
        </p>
      </div>

      {hasFailures && (
        <button
          onClick={retrySyncQueue}
          className="px-3 py-1.5 rounded-pill text-[12px] font-bold shrink-0 press-sm"
          style={{
            background: 'linear-gradient(135deg, #FF3B30, #FF6B5B)',
            color: 'white',
          }}
        >
          Wiederholen
        </button>
      )}
    </div>
  )
}
