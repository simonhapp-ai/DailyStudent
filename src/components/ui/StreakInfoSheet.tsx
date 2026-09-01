import { useUser } from '../../context/UserContext'
import { getActiveStreak } from '../../lib/streak'
import { Icon } from './Icon'

const MILESTONES = [
  { days: 5, reward: 25 },
  { days: 10, reward: 50 },
  { days: 30, reward: 100 },
  { days: 60, reward: 500 },
]

export function StreakInfoSheet({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { appStats } = useUser()
  const streak = getActiveStreak(appStats.streak ?? 0, appStats.lastStudyDate ?? null)
  const freezes = appStats.streakFreezes ?? 0

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative max-w-lg mx-auto w-full bg-surface border-t border-border rounded-t-2xl px-5 pt-5 z-10" style={{ paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom, 0px))' }}>
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />

        <div className="flex items-center gap-3 mb-1">
          <Icon name="flame" size={32} filled className="text-fill-orange" />
          <div>
            <p className="text-[22px] font-black text-text-primary tabular-nums leading-none">{streak} {streak === 1 ? 'Tag' : 'Tage'}</p>
            <p className="text-text-muted text-[12px] mt-1">Aktuelle Lernstreak</p>
          </div>
        </div>

        <div className="h-px bg-border/60 my-4" />

        <div className="space-y-3 mb-5">
          <p className="text-text-primary text-[14px] font-semibold">Wie funktioniert die Streak?</p>
          <p className="text-text-secondary text-[13px] leading-relaxed">
            Jeder Tag, an dem du mindestens eine Lernmethode nutzt — Smart Note, Karteikarten lernen, Blurting, Lernzettel oder Probeklausur — zählt und deine Streak wächst.
          </p>
          <p className="text-text-secondary text-[13px] leading-relaxed">
            Verpasst du einen Tag komplett, wird die Streak zurückgesetzt — <strong className="text-text-primary">außer</strong> du besitzt einen Streak Freeze: der wird dann automatisch eingesetzt und deine Streak bleibt erhalten.
          </p>
        </div>

        <div className="rounded-icon bg-background px-4 py-3 mb-5 flex items-center justify-between">
          <span className="text-text-secondary text-[13px]">Deine Streak Freezes</span>
          <span className="text-text-primary font-bold text-[15px] tabular-nums flex items-center gap-1.5"><Icon name="snowflake" size={15} />{freezes}</span>
        </div>

        <p className="text-text-primary text-[14px] font-semibold mb-2.5">Meilenstein-Boni</p>
        <div className="grid grid-cols-4 gap-2 mb-6">
          {MILESTONES.map((m) => (
            <div
              key={m.days}
              className="rounded-btn py-2.5 text-center"
              style={{
                background: streak >= m.days ? 'rgba(52,211,153,0.12)' : 'rgba(var(--color-border), 0.4)',
              }}
            >
              <p className="text-[15px] font-black tabular-nums" style={{ color: streak >= m.days ? '#059669' : 'rgb(var(--color-text-muted))' }}>
                {m.days}
              </p>
              <p className="text-[11px] text-text-muted mt-0.5">+{m.reward}</p>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full h-12 rounded-pill btn-mode text-[15px] font-semibold press transition-all"
        >
          Verstanden
        </button>
      </div>
    </div>
  )
}
