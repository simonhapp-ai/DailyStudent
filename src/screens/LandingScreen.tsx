import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import { useUser } from '../context/UserContext'

const E = [0.23, 1, 0.32, 1] as const

function FadeUp({
  children,
  delay = 0,
  className = '',
  y = 24,
}: {
  children: React.ReactNode
  delay?: number
  className?: string
  y?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: false, margin: '-72px' })
  const [offscreen, setOffscreen] = useState<'above' | 'below'>('below')

  useEffect(() => {
    if (!inView && ref.current) {
      const rect = ref.current.getBoundingClientRect()
      setOffscreen(rect.top + rect.height / 2 < window.innerHeight / 2 ? 'above' : 'below')
    }
  }, [inView])

  const hiddenY = offscreen === 'above' ? -y : y

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: hiddenY }}
      transition={{ duration: 0.55, ease: E, delay: inView ? delay : 0 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ── App Mockups ──────────────────────────────────────────────────────────────

function SmartNoteMockup() {
  return (
    <div className="relative w-full max-w-sm mx-auto select-none">
      <div
        className="rounded-[36px] p-3 shadow-2xl"
        style={{ background: 'linear-gradient(145deg, #1a1a1f, #0d0d12)' }}
      >
        <div className="rounded-[28px] overflow-hidden bg-[#F4F4F4]">
          <div className="flex items-center justify-between px-5 pt-3 pb-1">
            <span className="text-[11px] font-semibold text-[#160E28]">9:41</span>
            <div className="flex gap-1 items-center">
              <div className="w-4 h-2 rounded-sm bg-[#160E28]/30" />
              <div className="w-1 h-2 rounded-sm bg-[#160E28]/30" />
            </div>
          </div>

          <div className="px-4 pb-5 pt-1">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[10px] font-semibold text-[#988CAF] uppercase tracking-wide">Smart Note</p>
                <p className="text-[14px] font-bold text-[#160E28]">Biologie — Photosynthese</p>
              </div>
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #34D399, #059669)' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-3 mb-2.5 shadow-sm border border-black/5">
              <p className="text-[9px] font-semibold text-[#7C3AED] uppercase tracking-wide mb-1.5">KI-Zusammenfassung</p>
              <div className="space-y-1">
                <div className="h-1.5 bg-[#160E28]/10 rounded-full w-full" />
                <div className="h-1.5 bg-[#160E28]/10 rounded-full w-5/6" />
                <div className="h-1.5 bg-[#160E28]/10 rounded-full w-4/6" />
                <div className="h-1.5 bg-[#160E28]/10 rounded-full w-5/6" />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-3 mb-2.5 shadow-sm border border-black/5">
              <p className="text-[9px] font-semibold text-[#988CAF] uppercase tracking-wide mb-2">Schlüsselbegriffe</p>
              <div className="flex flex-wrap gap-1.5">
                {['Chlorophyll', 'ATP', 'Calvin-Zyklus', 'CO₂', 'Lichtreaktion'].map(k => (
                  <span key={k} className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">{k}</span>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-3 shadow-sm border border-black/5">
              <p className="text-[9px] font-semibold text-[#988CAF] uppercase tracking-wide mb-1.5">Klausurthemen</p>
              {['Lichtreaktion vs. Dunkelreaktion', 'ATP-Synthese erklären'].map(t => (
                <div key={t} className="flex items-center gap-1.5 mb-1">
                  <div className="w-1 h-1 rounded-full bg-[#7C3AED] shrink-0" />
                  <p className="text-[9px] text-[#483C5F]">{t}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: E, delay: 0.4 }}
        className="absolute -right-4 top-16 bg-white rounded-2xl px-3 py-2 shadow-xl border border-black/5 flex items-center gap-2"
      >
        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)' }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
          </svg>
        </div>
        <div>
          <p className="text-[10px] font-bold text-[#160E28] leading-tight">KI-Analyse fertig</p>
          <p className="text-[9px] text-[#988CAF]">3 Klausurthemen erkannt</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: E, delay: 0.6 }}
        className="absolute -left-4 bottom-20 bg-white rounded-2xl px-3 py-2 shadow-xl border border-black/5 flex items-center gap-2"
      >
        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #34D399, #059669)' }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </div>
        <div>
          <p className="text-[10px] font-bold text-[#160E28] leading-tight">Foto gescannt</p>
          <p className="text-[9px] text-[#988CAF]">in 1.2 Sek. analysiert</p>
        </div>
      </motion.div>
    </div>
  )
}

function FlashcardMockup() {
  return (
    <div className="relative w-full max-w-sm mx-auto select-none">
      <div className="bg-white rounded-3xl shadow-2xl border border-black/5 overflow-hidden">
        <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-black/5">
          <div>
            <p className="text-[11px] font-semibold text-[#988CAF] uppercase tracking-wide">Karteikarten</p>
            <p className="text-[15px] font-bold text-[#160E28]">Biologie — Zelle</p>
          </div>
          <span className="text-[12px] font-medium text-[#7C3AED] bg-violet-50 px-2.5 py-1 rounded-full">4 / 12</span>
        </div>

        <div className="p-5">
          <div
            className="rounded-2xl p-5 text-center min-h-[120px] flex flex-col items-center justify-center mb-4"
            style={{ background: 'linear-gradient(145deg, rgba(124,58,237,0.06), rgba(124,58,237,0.02))' }}
          >
            <p className="text-[11px] font-semibold text-[#7C3AED] uppercase tracking-wide mb-3">Frage</p>
            <p className="text-[14px] font-semibold text-[#160E28] leading-snug">
              Welche Organelle ist für die Energiegewinnung der Zelle verantwortlich?
            </p>
          </div>

          <div className="rounded-2xl p-4 mb-4 border-2 border-emerald-200 bg-emerald-50">
            <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wide mb-1">Antwort</p>
            <p className="text-[13px] font-medium text-[#160E28]">Das Mitochondrium — auch „Kraftwerk der Zelle" genannt.</p>
          </div>

          <div className="flex gap-2">
            <button className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold text-red-500 bg-red-50">
              Nochmal
            </button>
            <button className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold text-white" style={{ background: 'linear-gradient(135deg, #34D399, #059669)' }}>
              Gewusst
            </button>
          </div>
        </div>

        <div className="px-5 pb-5">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: '33%', background: 'linear-gradient(90deg, #7C3AED, #A78BFA)' }} />
          </div>
        </div>
      </div>
    </div>
  )
}

function ExamMockup() {
  return (
    <div className="relative w-full max-w-sm mx-auto select-none">
      <div className="bg-white rounded-3xl shadow-2xl border border-black/5 overflow-hidden">
        <div className="px-5 pt-5 pb-3 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)' }}>
          <div>
            <p className="text-[10px] font-semibold text-white/70 uppercase tracking-wide">Probeklausur</p>
            <p className="text-[14px] font-bold text-white">Mathematik · 90 Min</p>
          </div>
          <div className="bg-white/20 rounded-xl px-3 py-1.5">
            <p className="text-[12px] font-bold text-white">47:22</p>
          </div>
        </div>

        <div className="p-5">
          <div className="mb-4">
            <p className="text-[10px] font-semibold text-[#988CAF] uppercase tracking-wide mb-2">Aufgabe 2 von 5 · 8 Punkte</p>
            <p className="text-[13px] text-[#160E28] leading-relaxed">
              Berechne die Ableitung von f(x) = 3x³ − 2x² + 5x − 1 und bestimme die Nullstellen von f′(x).
            </p>
          </div>

          <div className="rounded-2xl border border-[#7C3AED]/30 bg-violet-50/50 p-3 mb-4 min-h-[72px]">
            <div className="space-y-1.5">
              <div className="h-1.5 bg-[#160E28]/15 rounded-full w-full" />
              <div className="h-1.5 bg-[#160E28]/15 rounded-full w-4/5" />
              <div className="h-1.5 bg-[#160E28]/10 rounded-full w-3/5" />
            </div>
          </div>

          <div className="rounded-2xl p-3.5 border border-emerald-200 bg-emerald-50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #34D399, #059669)' }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <p className="text-[10px] font-bold text-emerald-700">KI-Korrektur · 7 / 8 Punkte</p>
            </div>
            <div className="space-y-1">
              <div className="h-1.5 bg-emerald-200 rounded-full w-full" />
              <div className="h-1.5 bg-emerald-200 rounded-full w-4/6" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function LernplanMockup() {
  const days = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

  return (
    <div className="relative w-full max-w-sm mx-auto select-none">
      <div className="bg-white rounded-3xl shadow-2xl border border-black/5 overflow-hidden">
        <div className="px-5 pt-5 pb-4 border-b border-black/5">
          <p className="text-[11px] font-semibold text-[#988CAF] uppercase tracking-wide">Lernplan</p>
          <p className="text-[15px] font-bold text-[#160E28]">3 Wochen bis zur Klausur</p>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-7 gap-1 mb-4">
            {days.map((day, i) => (
              <div key={day} className="text-center">
                <p className="text-[9px] font-medium text-[#988CAF] mb-1.5">{day}</p>
                <div
                  className="w-full aspect-square rounded-xl flex items-center justify-center text-[9px] font-bold"
                  style={{
                    background: i === 2 ? '#7C3AED' : i === 0 || i === 4 ? 'rgba(124,58,237,0.1)' : i === 1 || i === 3 ? 'rgba(5,150,105,0.1)' : 'rgba(0,0,0,0.04)',
                    color: i === 2 ? 'white' : i < 5 ? '#160E28' : '#988CAF',
                  }}
                >
                  {i + 9}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-[#988CAF] uppercase tracking-wide">Heute geplant</p>
            {[
              { name: 'Mathe', color: '#7C3AED' },
              { name: 'Biologie', color: '#059669' },
            ].map(s => (
              <div key={s.name} className="flex items-center gap-3 bg-[#F8F7FF] rounded-xl px-3 py-2.5">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-[#160E28]">{s.name}</p>
                  <p className="text-[9px] text-[#988CAF]">60 Min · Kapitel 4–6</p>
                </div>
                <div className="w-4 h-4 rounded-full border-2 border-[#D1D1D6]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Navbar ──────────────────────────────────────────────────────────────────

function Navbar({ onCta }: { onCta: () => void }) {
  return (
    <div className="fixed top-4 sm:top-5 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
      <motion.div
        initial={{ opacity: 0, y: -16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.52, ease: E }}
        className="pointer-events-auto w-full flex items-center justify-between px-4 py-2.5 rounded-2xl"
        style={{
          maxWidth: '800px',
          background: 'rgba(250,250,253,0.92)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(209,209,214,0.5)',
          boxShadow: '0 4px 28px rgba(22,14,40,0.09), 0 1px 4px rgba(22,14,40,0.05)',
        }}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-[9px] overflow-hidden shrink-0">
            <img
              src="/logo.png"
              alt="DailyStudent"
              className="w-full h-full object-cover"
              style={{ transform: 'scale(1.38)', transformOrigin: 'center' }}
            />
          </div>
          <span className="font-bold text-[15px] text-[#160E28] tracking-tight">DailyStudent</span>
        </div>

        <div className="hidden md:flex items-center gap-6">
          {[['#system', 'Wie es funktioniert'], ['#features', 'Features'], ['#preise', 'Preise']].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="text-[13px] font-medium text-[#483C5F] hover:text-[#160E28] transition-colors duration-150"
            >
              {label}
            </a>
          ))}
        </div>

        <button
          onClick={onCta}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12px] font-semibold text-white press-sm shrink-0"
          style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)', boxShadow: '0 2px 8px rgba(124,58,237,0.35)' }}
        >
          App öffnen
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </motion.div>
    </div>
  )
}

// ── Feature Section ─────────────────────────────────────────────────────────

function FeatureSection({
  badge,
  badgeColor,
  title,
  description,
  bullets,
  mockup,
  reverse = false,
  id,
}: {
  badge: string
  badgeColor: string
  title: string
  description: string
  bullets: string[]
  mockup: React.ReactNode
  reverse?: boolean
  id?: string
}) {
  return (
    <section id={id} className="py-20 md:py-28">
      <div className="max-w-6xl mx-auto px-6">
        <div className={`flex flex-col ${reverse ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-12 md:gap-20`}>
          <div className="flex-1 min-w-0">
            <FadeUp>
              <span
                className="inline-block text-[11px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-5"
                style={{ background: `${badgeColor}15`, color: badgeColor }}
              >
                {badge}
              </span>
            </FadeUp>
            <FadeUp delay={0.05}>
              <h2
                className="font-bold leading-tight mb-4"
                style={{ fontSize: 'clamp(26px, 4vw, 40px)', color: '#160E28', letterSpacing: '-0.02em' }}
              >
                {title}
              </h2>
            </FadeUp>
            <FadeUp delay={0.1}>
              <p className="text-[16px] leading-relaxed mb-6" style={{ color: '#483C5F' }}>
                {description}
              </p>
            </FadeUp>
            <div className="space-y-3">
              {bullets.map((b, i) => (
                <FadeUp key={b} delay={0.12 + i * 0.06}>
                  <div className="flex items-start gap-3">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: `${badgeColor}15` }}
                    >
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={badgeColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </div>
                    <p className="text-[14px] leading-relaxed" style={{ color: '#483C5F' }}>{b}</p>
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>

          <FadeUp delay={0.08} className="flex-1 w-full">
            {mockup}
          </FadeUp>
        </div>
      </div>
    </section>
  )
}

// ── Main Screen ─────────────────────────────────────────────────────────────

export function LandingScreen() {
  const navigate = useNavigate()
  const { authUser } = useUser()
  const goToApp = () => {
    if (authUser) {
      const isDesktop = !/iPhone|iPod|(Android.*Mobile)/i.test(navigator.userAgent)
      navigate(isDesktop ? '/dashboard' : '/unterricht')
    } else {
      navigate('/auth')
    }
  }

  return (
    <div className="min-h-dvh" style={{ background: '#FAFAFD', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' }}>
      <Navbar onCta={goToApp} />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative min-h-dvh flex items-center overflow-hidden pt-24">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: [
              'radial-gradient(ellipse 70% 55% at 65% -5%, rgba(124,58,237,0.11) 0%, transparent 65%)',
              'radial-gradient(ellipse 45% 35% at 10% 90%, rgba(99,102,241,0.07) 0%, transparent 60%)',
            ].join(', '),
          }}
        />

        <div
          className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{
            backgroundImage: 'linear-gradient(#160E28 1px, transparent 1px), linear-gradient(90deg, #160E28 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div className="max-w-6xl mx-auto px-6 py-20 w-full">
          <div className="flex flex-col md:flex-row items-center gap-12 md:gap-16">
            {/* Left — Text */}
            <div className="flex-1 min-w-0 text-center md:text-left">

              {/* H1 — first to appear */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, ease: E, delay: 0 }}
                className="font-black leading-[1.08] mb-4"
                style={{ fontSize: 'clamp(36px, 6.5vw, 72px)', color: '#160E28', letterSpacing: '-0.03em' }}
              >
                Das KI-Lernsystem
                <br />
                <span
                  style={{
                    background: 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 60%, #7C3AED 100%)',
                    backgroundSize: '200% auto',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  für bessere Noten.
                </span>
              </motion.h1>

              {/* Accent line — second */}
              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: E, delay: 0.09 }}
                className="text-[18px] md:text-[20px] font-semibold mb-4"
                style={{ color: '#483C5F', letterSpacing: '-0.01em' }}
              >
                Organisation wie ein Einser-Schüler.
              </motion.p>

              {/* Subtext — third */}
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.58, ease: E, delay: 0.18 }}
                className="text-[16px] md:text-[17px] leading-relaxed mb-8 max-w-lg"
                style={{ color: '#988CAF' }}
              >
                Die App versteht alles, was in deinem Schulalltag passiert, und erstellt daraus automatisch ein personalisiertes Lernsystem — für Schüler und Studenten.
              </motion.p>

              {/* CTAs — fourth */}
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: E, delay: 0.28 }}
                className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-3 mb-8"
              >
                <button
                  onClick={goToApp}
                  className="relative w-full sm:w-auto px-7 py-3.5 rounded-full text-[15px] font-bold text-white shadow-lg press-sm overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)' }}
                >
                  <span
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 3s infinite linear',
                    }}
                  />
                  <span className="relative flex items-center justify-center gap-2">
                    Kostenlos starten
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </span>
                </button>
                <a
                  href="#features"
                  className="w-full sm:w-auto px-7 py-3.5 rounded-full text-[15px] font-semibold text-[#160E28] border press-sm text-center"
                  style={{ borderColor: 'rgba(0,0,0,0.12)', background: 'rgba(255,255,255,0.8)' }}
                >
                  Features entdecken
                </a>
              </motion.div>

              {/* Trust — fifth */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: E, delay: 0.38 }}
                className="flex items-center justify-center md:justify-start gap-2 text-[13px]"
                style={{ color: '#988CAF' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Bereits <strong className="text-[#160E28]">4.000+ Schüler</strong> in unserer Discord-Community
              </motion.div>
            </div>

            {/* Right — App mockup — appears with hero, slightly delayed */}
            <motion.div
              initial={{ opacity: 0, x: 28, y: 8 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ duration: 0.8, ease: E, delay: 0.14 }}
              className="flex-1 w-full max-w-[360px] md:max-w-none"
            >
              <SmartNoteMockup />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ─────────────────────────────────────────────────────── */}
      <FadeUp>
        <div className="border-y" style={{ background: 'white', borderColor: 'rgba(209,209,214,0.4)' }}>
          <div className="max-w-6xl mx-auto px-6 py-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0 md:divide-x" style={{ '--tw-divide-opacity': '0.3' } as React.CSSProperties}>
              {[
                { value: '4.000+', label: 'Schüler auf Discord' },
                { value: '4 Methoden', label: 'Smart Notes, Karten, Klausur, Plan' },
                { value: '16 Bundesländer', label: 'Kerncurriculum inklusive' },
                { value: 'Kostenlos', label: 'Core-Features gratis' },
              ].map((stat, i) => (
                <div key={i} className="text-center md:px-8">
                  <p className="font-black text-[20px] text-[#160E28] leading-tight" style={{ letterSpacing: '-0.02em' }}>{stat.value}</p>
                  <p className="text-[12px] mt-0.5" style={{ color: '#988CAF' }}>{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </FadeUp>

      {/* ── System Section ──────────────────────────────────────────────────── */}
      <section id="system" className="py-20 md:py-28" style={{ background: 'white' }}>
        <div className="max-w-6xl mx-auto px-6">
          <FadeUp className="text-center mb-14">
            <span className="inline-block text-[11px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4"
              style={{ background: 'rgba(124,58,237,0.08)', color: '#7C3AED' }}>
              Das System
            </span>
            <h2
              className="font-black leading-tight mb-4"
              style={{ fontSize: 'clamp(28px, 4.5vw, 48px)', color: '#160E28', letterSpacing: '-0.025em' }}
            >
              Organisation wie ein Einser-Schüler.
            </h2>
            <p className="text-[17px] leading-relaxed max-w-2xl mx-auto" style={{ color: '#483C5F' }}>
              Die App versteht alles, was in deinem Schulalltag passiert, und erstellt daraus automatisch ein personalisiertes Lernsystem.
            </p>
          </FadeUp>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                ),
                iconBg: 'linear-gradient(135deg, #34D399, #059669)',
                title: 'Stoff erfassen',
                text: 'Foto, PDF oder Text — die KI analysiert sofort, erkennt Klausurthemen und erstellt eine strukturierte Smart Note.',
                color: '#059669',
              },
              {
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2z" />
                  </svg>
                ),
                iconBg: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
                title: 'KI generiert alles',
                text: 'Karteikarten, Lernzettel und Probeklausuren entstehen direkt aus deinen eigenen Notizen — auf dein Fach und Bundesland abgestimmt.',
                color: '#7C3AED',
              },
              {
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                    <polyline points="16 7 22 7 22 13" />
                  </svg>
                ),
                iconBg: 'linear-gradient(135deg, #5AC8FA, #2563EB)',
                title: 'Besser werden',
                text: 'Dein Lernplan kennt deinen Stundenplan und plant realistische Sessions. Fortschritt verfolgen, Noten verbessern — alles vernetzt.',
                color: '#2563EB',
              },
            ].map((item, i) => (
              <FadeUp key={item.title} delay={i * 0.08}>
                <div className="rounded-2xl p-6 h-full border border-black/5" style={{ background: '#FAFAFD' }}>
                  <div
                    className="w-11 h-11 rounded-[14px] flex items-center justify-center mb-4"
                    style={{ background: item.iconBg }}
                  >
                    {item.icon}
                  </div>
                  <h3 className="font-bold text-[16px] text-[#160E28] mb-2">{item.title}</h3>
                  <p className="text-[14px] leading-relaxed" style={{ color: '#483C5F' }}>{item.text}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature Sections ──────────────────────────────────────────────── */}
      <div id="features" style={{ background: '#FAFAFD' }}>
        <FeatureSection
          badge="Smart Notes"
          badgeColor="#7C3AED"
          title="Foto scannen, fertige Zusammenfassung."
          description="Knips dein Tafelbild oder deine handschriftlichen Notizen — die KI analysiert den Inhalt, extrahiert Schlüsselbegriffe und zeigt dir, was klausurrelevant ist."
          bullets={[
            'OCR aus Fotos, PDFs und Handschrift',
            'Schlüsselbegriffe und Klausurthemen automatisch erkannt',
            'Auf dein Bundesland und Kerncurriculum abgestimmt',
          ]}
          mockup={<SmartNoteMockup />}
        />
      </div>

      <div style={{ background: 'white' }}>
        <FeatureSection
          badge="Karteikarten"
          badgeColor="#5AC8FA"
          title="KI generiert dein Lernset automatisch."
          description="Aus jeder Smart Note entstehen mit einem Klick Karteikarten — sortiert nach dem, was du noch nicht sicher kannst."
          bullets={[
            'Karteikarten direkt aus deinen Notizen generiert',
            'Lernstatus nach jeder Runde angepasst',
            'Fach-übergreifend organisiert',
          ]}
          mockup={<FlashcardMockup />}
          reverse
        />
      </div>

      <div style={{ background: '#FAFAFD' }}>
        <FeatureSection
          badge="Probeklausur"
          badgeColor="#FF453A"
          title="Klausur schreiben — KI korrigiert."
          description="Vier verschiedene Modi für jede Prüfungssituation. Die KI gibt danach echtes Rotstift-Feedback mit Punktevergabe und Verbesserungshinweisen."
          bullets={[
            '4 Klausur-Modi für unterschiedliche Aufgabenformate',
            'KI-Korrektur mit konkreten Verbesserungsvorschlägen',
            'Fortschritt über alle Klausuren im Blick',
          ]}
          mockup={<ExamMockup />}
        />
      </div>

      <div style={{ background: 'white' }}>
        <FeatureSection
          badge="Lernplan"
          badgeColor="#34D399"
          title="Dein persönlicher Plan bis zur Klausur."
          description="Gib deine Klausurtermine ein — der Lernplan kennt deinen Stundenplan und plant realistische Sessions ohne Überschneidungen."
          bullets={[
            'Automatisch um deinen Stundenplan herum geplant',
            'Einzel-, Vollständig- und Abitur-Planung',
            'Kalender-Export und Tagesansicht',
          ]}
          mockup={<LernplanMockup />}
          reverse
        />
      </div>

      {/* ── Social Proof ──────────────────────────────────────────────────── */}
      <section style={{ background: '#FAFAFD' }} className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <FadeUp>
            <div
              className="rounded-3xl p-10 md:p-14 text-center"
              style={{ background: 'linear-gradient(145deg, rgba(124,58,237,0.07) 0%, rgba(99,102,241,0.04) 100%)', border: '1px solid rgba(124,58,237,0.12)' }}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                style={{ background: 'linear-gradient(135deg, #5865F2, #4752C4)' }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                  <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z" />
                </svg>
              </div>
              <p className="font-black text-[52px] md:text-[64px] text-[#160E28] leading-none mb-2" style={{ letterSpacing: '-0.03em' }}>
                4.000+
              </p>
              <p className="text-[18px] font-semibold text-[#160E28] mb-2">Schüler in unserer Discord-Community</p>
              <p className="text-[15px] max-w-md mx-auto leading-relaxed" style={{ color: '#483C5F' }}>
                Tausch dich aus, bekomme Support und bleibe up-to-date bei neuen Features.
              </p>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────────────── */}
      <section id="preise" className="py-20 md:py-28" style={{ background: 'white' }}>
        <div className="max-w-6xl mx-auto px-6">
          <FadeUp className="text-center mb-12">
            <span className="inline-block text-[11px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4"
              style={{ background: 'rgba(124,58,237,0.08)', color: '#7C3AED' }}>
              Preise
            </span>
            <h2
              className="font-black leading-tight"
              style={{ fontSize: 'clamp(28px, 4.5vw, 48px)', color: '#160E28', letterSpacing: '-0.025em' }}
            >
              Starte kostenlos.
            </h2>
          </FadeUp>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl mx-auto">
            {/* Free */}
            <FadeUp delay={0.04}>
              <div className="rounded-2xl p-7 h-full border" style={{ background: '#FAFAFD', borderColor: 'rgba(209,209,214,0.6)' }}>
                <p className="text-[13px] font-semibold text-[#988CAF] mb-1">Free</p>
                <p className="font-black text-[36px] text-[#160E28] mb-5" style={{ letterSpacing: '-0.03em' }}>€0</p>
                <div className="space-y-3 mb-7">
                  {[
                    'Smart Notes (Foto-Scan + KI-Analyse)',
                    'Karteikarten generieren',
                    'Blurting',
                    '1 Lernzettel / Tag',
                    '1 vollständige Probeklausur / Tag',
                    'Einzel-Lernplan',
                  ].map(f => (
                    <div key={f} className="flex items-center gap-2.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                      <span className="text-[13px] text-[#483C5F]">{f}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={goToApp}
                  className="w-full py-3 rounded-xl text-[14px] font-semibold text-[#160E28] border press-sm"
                  style={{ borderColor: 'rgba(0,0,0,0.12)' }}
                >
                  Kostenlos starten
                </button>
              </div>
            </FadeUp>

            {/* Pro */}
            <FadeUp delay={0.1}>
              <div
                className="rounded-2xl p-7 h-full relative overflow-hidden"
                style={{ background: 'linear-gradient(145deg, #160E28 0%, #2A1B5C 100%)' }}
              >
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: 'radial-gradient(ellipse 60% 40% at 80% 0%, rgba(167,139,250,0.2) 0%, transparent 60%)' }}
                />
                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[13px] font-semibold text-white/60">Pro</p>
                    <span className="text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full" style={{ background: 'rgba(124,58,237,0.4)', color: '#A78BFA' }}>Beliebt</span>
                  </div>
                  <div className="flex items-end gap-1.5 mb-5">
                    <p className="font-black text-[36px] text-white leading-none" style={{ letterSpacing: '-0.03em' }}>€7,99</p>
                    <p className="text-[14px] text-white/50 mb-1.5">/Mo</p>
                  </div>
                  <div className="space-y-3 mb-7">
                    {[
                      'Alles aus Free',
                      'Unbegrenzte Lernzettel',
                      'Alle 4 Probeklausur-Modi',
                      'KI-Rotstift-Korrektur',
                      'Vollständiger & Abitur-Lernplan',
                      'Prioritäts-Support',
                    ].map(f => (
                      <div key={f} className="flex items-center gap-2.5">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                        <span className="text-[13px] text-white/80">{f}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={goToApp}
                    className="w-full py-3 rounded-xl text-[14px] font-bold text-white press-sm relative overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)' }}
                  >
                    <span
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)',
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 3s infinite linear',
                      }}
                    />
                    <span className="relative">Pro freischalten · €59,99/Jahr</span>
                  </button>
                  <p className="text-center text-[11px] text-white/40 mt-3">Oder €7,99/Monat · Jederzeit kündbar</p>
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <FadeUp>
        <section className="py-20 md:py-28" style={{ background: '#FAFAFD' }}>
          <div className="max-w-6xl mx-auto px-6">
            <div
              className="rounded-3xl p-10 md:p-16 text-center relative overflow-hidden"
              style={{ background: 'linear-gradient(145deg, #160E28 0%, #2A1B5C 100%)' }}
            >
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse 60% 50% at 50% -10%, rgba(124,58,237,0.35) 0%, transparent 60%)' }} />
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse 40% 40% at 80% 110%, rgba(99,102,241,0.2) 0%, transparent 60%)' }} />

              <div className="relative">
                <p className="text-[13px] font-semibold text-white/50 uppercase tracking-widest mb-4">Bereit?</p>
                <h2
                  className="font-black text-white mb-5"
                  style={{ fontSize: 'clamp(30px, 5vw, 56px)', letterSpacing: '-0.025em', lineHeight: 1.1 }}
                >
                  Jetzt besser werden.
                </h2>
                <p className="text-[16px] text-white/60 leading-relaxed mb-9 max-w-lg mx-auto">
                  Konto erstellen, Fächer eingeben, KI arbeiten lassen.
                </p>
                <button
                  onClick={goToApp}
                  className="inline-flex items-center gap-2.5 px-8 py-4 rounded-full text-[15px] font-bold text-white shadow-2xl press-sm relative overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)', boxShadow: '0 0 40px rgba(124,58,237,0.4)' }}
                >
                  <span
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 3s infinite linear',
                    }}
                  />
                  <span className="relative">Kostenlos starten</span>
                  <svg className="relative" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </section>
      </FadeUp>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer
        className="border-t py-8"
        style={{ background: 'white', borderColor: 'rgba(209,209,214,0.4)' }}
      >
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg overflow-hidden shrink-0">
              <img src="/logo.png" alt="DailyStudent" className="w-full h-full object-cover" style={{ transform: 'scale(1.38)', transformOrigin: 'center' }} />
            </div>
            <span className="text-[13px] font-semibold text-[#160E28]">DailyStudent</span>
            <span className="text-[12px] text-[#988CAF] ml-1">© 2026 Simon Happ</span>
          </div>
          <div className="flex items-center gap-6">
            {[
              ['/impressum', 'Impressum'],
              ['/datenschutz', 'Datenschutz'],
              ['/agb', 'AGB'],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="text-[12px] text-[#988CAF] hover:text-[#483C5F] transition-colors duration-150"
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}</style>
    </div>
  )
}
