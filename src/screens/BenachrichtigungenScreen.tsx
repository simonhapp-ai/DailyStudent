import { useState } from 'react'
import { Icon, type IconName } from '../components/ui/Icon'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'

type NotifKey = 'klausurReminder' | 'lernplanReminder' | 'streakReminder'

const DEFAULT_PREFS = {
  klausurReminder: true,
  lernplanReminder: true,
  streakReminder: false,
}

const ITEMS: { key: NotifKey; icon: IconName; title: string; desc: string; color: string }[] = [
  {
    key: 'klausurReminder',
    icon: 'note' as IconName,
    title: 'Klausur-Erinnerung',
    desc: '3 Tage vor jeder eingetragenen Klausur',
    color: '#FF3B30',
  },
  {
    key: 'lernplanReminder',
    icon: 'calendar' as IconName,
    title: 'Lernplan-Erinnerungen',
    desc: 'Täglich zur besten Lernzeit erinnern',
    color: '#7C3AED',
  },
  {
    key: 'streakReminder',
    icon: 'flame' as IconName,
    title: 'Streak-Erinnerung',
    desc: 'Wenn du heute noch nicht gelernt hast',
    color: '#FF9500',
  },
]

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative w-12 h-6 rounded-full transition-all duration-200 press-sm shrink-0 ${on ? 'bg-accent' : 'bg-border'}`}
    >
      <span
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200"
        style={{ left: on ? '26px' : '2px' }}
      />
    </button>
  )
}

export function BenachrichtigungenScreen() {
  const navigate = useNavigate()
  const { profile, updateProfile } = useUser()

  const [prefs, setPrefs] = useState({
    ...DEFAULT_PREFS,
    ...(profile?.notificationPrefs ?? {}),
  })

  const toggle = (key: NotifKey) => {
    const next = { ...prefs, [key]: !prefs[key] }
    setPrefs(next)
    updateProfile({ notificationPrefs: next })
  }

  return (
    <div className="flex flex-col min-h-dvh bg-background pb-10">
      <div className="px-4" style={{ paddingTop: 'max(58px, calc(env(safe-area-inset-top, 0px) + 18px))' }}>
        <button
          onClick={() => navigate('/profil')}
          className="flex items-center gap-1 text-text-primary text-[14px] font-medium mb-3 press-sm -ml-0.5"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Zurück
        </button>
        <h1 className="text-[28px] font-bold text-text-primary">Benachrichtigungen</h1>
      </div>

      <div className="px-4 mt-5 space-y-4">

        {/* ── Coming soon banner ──────────────────────────────── */}
        <div
          className="rounded-card px-4 py-3.5 flex items-start gap-3"
          style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" />
          </svg>
          <p className="text-[13px] text-text-secondary leading-relaxed">
            Push-Benachrichtigungen werden mit dem nächsten Update aktiviert. Deine Einstellungen werden bereits gespeichert.
          </p>
        </div>

        {/* ── Toggles ─────────────────────────────────────────── */}
        <div>
          <h2 className="section-label mb-2.5">Erinnerungen</h2>
          <div className="bg-surface rounded-card shadow-card-adaptive border border-border/60 overflow-hidden">
            {ITEMS.map((item, i) => (
              <div
                key={item.key}
                className={`flex items-center gap-3 px-4 py-4 ${i < ITEMS.length - 1 ? 'border-b border-border/50' : ''}`}
              >
                <div
                  className="w-10 h-10 rounded-btn flex items-center justify-center text-[20px] shrink-0"
                  style={{ background: item.color + '18' }}
                >
                  <Icon name={item.icon} size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary font-medium text-[15px]">{item.title}</p>
                  <p className="text-text-muted text-[12px] mt-0.5">{item.desc}</p>
                </div>
                <Toggle on={prefs[item.key]} onToggle={() => toggle(item.key)} />
              </div>
            ))}
          </div>
        </div>

        {/* ── Hinweis ─────────────────────────────────────────── */}
        <p className="text-text-muted text-[12px] px-1 leading-relaxed">
          Benachrichtigungen werden nur gesendet, wenn du die App auf deinem Gerät installiert hast. Du kannst sie jederzeit in den Geräteeinstellungen deaktivieren.
        </p>

      </div>
    </div>
  )
}
