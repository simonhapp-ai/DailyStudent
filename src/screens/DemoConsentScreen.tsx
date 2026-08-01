import { motion } from 'framer-motion'
import { DATENSCHUTZ_SECTIONS } from '../data/datenschutzContent'

const E = [0.23, 1, 0.32, 1] as const

// onAccept persists consent (same handler CookieBanner uses) — this screen
// only presents the choice.
export function DemoConsentScreen({ onAccept }: { onAccept: (analytics: boolean) => void }) {
  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden" style={{ background: '#0a0a0f' }}>
      {/* ambient glow, matches DemoScreen's purple */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 45% at 50% -5%, rgba(124,58,237,0.28) 0%, transparent 65%)' }}
      />

      {/* ── Header ── */}
      <motion.div
        className="relative shrink-0 px-5 text-center"
        style={{ paddingTop: 'max(28px, calc(env(safe-area-inset-top, 0px) + 20px))', paddingBottom: 16 }}
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: E }}
      >
        <div
          className="mx-auto mb-3 flex items-center justify-center rounded-2xl"
          style={{ width: 52, height: 52, background: 'linear-gradient(135deg, #7C3AED, #5B21B6)', boxShadow: '0 8px 24px rgba(124,58,237,0.4)' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <h1 className="text-white font-bold" style={{ fontSize: 20 }}>Bevor es losgeht</h1>
        <p className="text-[13px] mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
          Datenschutz &amp; Cookies — einmal kurz lesen und bestätigen
        </p>
      </motion.div>

      {/* ── Scrollable Datenschutzerklärung ── */}
      <motion.div
        className="relative flex-1 overflow-y-auto px-5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1, ease: E }}
      >
        <div className="mx-auto space-y-2.5 pb-6" style={{ maxWidth: 560 }}>
          {DATENSCHUTZ_SECTIONS.map((s) => (
            <div
              key={s.title}
              className="rounded-2xl px-4 py-3.5"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <p className="text-white font-semibold text-[13px] mb-1.5">{s.title}</p>
              <p className="text-[12.5px] leading-relaxed whitespace-pre-line" style={{ color: 'rgba(255,255,255,0.55)' }}>
                {s.text}
              </p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Fixed accept bar ── */}
      <motion.div
        className="relative shrink-0 px-5"
        style={{
          paddingTop: 14,
          paddingBottom: 'max(18px, calc(env(safe-area-inset-bottom, 0px) + 14px))',
          background: 'linear-gradient(180deg, transparent, #0a0a0f 22%)',
        }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease: E }}
      >
        <div className="mx-auto flex flex-col gap-2" style={{ maxWidth: 560 }}>
          <motion.button
            onClick={() => onAccept(true)}
            className="w-full py-3.5 rounded-2xl text-[15px] font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)', boxShadow: '0 6px 22px rgba(124,58,237,0.35)' }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.97 }}
          >
            Alle akzeptieren
          </motion.button>
          <motion.button
            onClick={() => onAccept(false)}
            className="w-full py-3 rounded-2xl text-[14px] font-medium"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.97 }}
          >
            Nur notwendige
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}
