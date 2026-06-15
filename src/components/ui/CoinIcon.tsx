import { motion, AnimatePresence, useAnimation } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

// ── Tier config ────────────────────────────────────────────────────────────

export const COIN_TIERS = [
  { min: 0,    label: 'Münzen',     scale: 1.00 },
  { min: 100,  label: 'Stapel',     scale: 1.10 },
  { min: 500,  label: 'Beutel',     scale: 1.22 },
  { min: 1000, label: 'Geldbeutel', scale: 1.34 },
  { min: 2500, label: 'Sack',       scale: 1.48 },
  { min: 5000, label: 'Schubkarre', scale: 1.64 },
] as const

export function getCoinTier(coins: number): number {
  for (let i = COIN_TIERS.length - 1; i >= 0; i--) {
    if (coins >= COIN_TIERS[i].min) return i
  }
  return 0
}

// ── Global gradient defs — render <CoinIconGlobalDefs /> once in App.tsx ──

export function CoinIconGlobalDefs() {
  return (
    <svg
      aria-hidden
      focusable="false"
      style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden', pointerEvents: 'none' }}
    >
      <defs>
        {/* Coin top face — bright gold radial */}
        <radialGradient id="ci-face" cx="34%" cy="30%" r="74%">
          <stop offset="0%"   stopColor="#FFFBEB"/>
          <stop offset="22%"  stopColor="#FDE68A"/>
          <stop offset="58%"  stopColor="#F59E0B"/>
          <stop offset="100%" stopColor="#D97706"/>
        </radialGradient>
        {/* Coin top face — slightly dimmer (bottom of stacks) */}
        <radialGradient id="ci-face-dim" cx="34%" cy="30%" r="74%">
          <stop offset="0%"   stopColor="#FDE68A"/>
          <stop offset="50%"  stopColor="#D97706"/>
          <stop offset="100%" stopColor="#92400E"/>
        </radialGradient>
        {/* Coin cylindrical edge */}
        <linearGradient id="ci-side" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#B45309"/>
          <stop offset="100%" stopColor="#6B2D0A"/>
        </linearGradient>
        {/* Bag / pouch surface — warm tan-to-brown */}
        <radialGradient id="ci-bag" cx="30%" cy="26%" r="80%">
          <stop offset="0%"   stopColor="#F8E4A8"/>
          <stop offset="38%"  stopColor="#C4882A"/>
          <stop offset="100%" stopColor="#7C4B0E"/>
        </radialGradient>
        {/* Larger sack — slightly darker */}
        <radialGradient id="ci-sack" cx="28%" cy="24%" r="80%">
          <stop offset="0%"   stopColor="#EDD48A"/>
          <stop offset="40%"  stopColor="#A87020"/>
          <stop offset="100%" stopColor="#5C3408"/>
        </radialGradient>
        {/* Soft drop shadow */}
        <filter id="ci-shadow" x="-28%" y="-22%" width="156%" height="168%">
          <feDropShadow dx="0" dy="3" stdDeviation="4.5" floodColor="#78350F" floodOpacity="0.28"/>
        </filter>
      </defs>
    </svg>
  )
}

// ── 3D coin building block ─────────────────────────────────────────────────

function Coin({
  cx, cy, rx, ry, edge, bright = 1, dim = false,
}: {
  cx: number; cy: number; rx: number; ry: number; edge: number
  bright?: number; dim?: boolean
}) {
  return (
    <g opacity={bright}>
      {/* Edge bottom ellipse */}
      <ellipse cx={cx} cy={cy + edge} rx={rx} ry={ry} fill="url(#ci-side)"/>
      {/* Edge side wall */}
      <rect x={cx - rx} y={cy} width={rx * 2} height={edge} fill="url(#ci-side)"/>
      {/* Top face */}
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={dim ? 'url(#ci-face-dim)' : 'url(#ci-face)'}/>
      {/* Shine ellipse */}
      <ellipse
        cx={cx - rx * 0.27} cy={cy - ry * 0.19}
        rx={rx * 0.30} ry={ry * 0.44}
        fill="white" opacity={0.36}
        transform={`rotate(-17 ${cx - rx * 0.27} ${cy - ry * 0.19})`}
      />
    </g>
  )
}

// ── Tier 0: Three scattered coins (0–99) ───────────────────────────────────

function T0_ThreeCoins() {
  return (
    <g filter="url(#ci-shadow)">
      <Coin cx={16} cy={24} rx={14} ry={5.5} edge={4.5} bright={0.68} dim/>
      <Coin cx={58} cy={27} rx={13} ry={5}   edge={4}   bright={0.70} dim/>
      <Coin cx={37} cy={43} rx={18} ry={7}   edge={5.5} bright={1}/>
    </g>
  )
}

// ── Tier 1: Stack of 6 coins (100–499) ─────────────────────────────────────

function T1_Stack() {
  const levels = [50, 43, 36, 29, 22, 16]
  return (
    <g filter="url(#ci-shadow)">
      {levels.map((cy, i) => (
        <Coin key={i} cx={40} cy={cy} rx={21} ry={7.5} edge={5}
          bright={0.50 + i * 0.10} dim={i < 3}/>
      ))}
    </g>
  )
}

// ── Tier 2: Small drawstring bag (500–999) ──────────────────────────────────

function T2_SmallBag() {
  return (
    <g filter="url(#ci-shadow)">
      <ellipse cx={40} cy={57} rx={19} ry={4} fill="#5C3408" opacity={0.22}/>
      <ellipse cx={40} cy={41} rx={21} ry={19} fill="url(#ci-bag)"/>
      <path d="M 27 23 Q 40 18 53 23 L 51 29 Q 40 24 29 29 Z" fill="#5C3408"/>
      <ellipse cx={40} cy={18} rx={8} ry={5.5} fill="#7C4B0E"/>
      <ellipse cx={40} cy={17} rx={6} ry={3.5} fill="#9A6420"/>
      {/* Coin bumps through fabric */}
      <circle cx={33} cy={44} r={5}   fill="rgba(245,158,11,0.18)" stroke="#F59E0B" strokeWidth={1.5}/>
      <circle cx={47} cy={42} r={5}   fill="rgba(245,158,11,0.18)" stroke="#F59E0B" strokeWidth={1.5}/>
      <circle cx={40} cy={51} r={4.5} fill="rgba(245,158,11,0.18)" stroke="#F59E0B" strokeWidth={1.5}/>
      <ellipse cx={30} cy={34} rx={9} ry={6} fill="white" opacity={0.16} transform="rotate(-15 30 34)"/>
    </g>
  )
}

// ── Tier 3: Bigger money bag (1000–2499) ────────────────────────────────────

function T3_BigBag() {
  const bumps: [number, number][] = [[32,44],[48,42],[40,52],[35,34],[45,35]]
  return (
    <g filter="url(#ci-shadow)">
      <ellipse cx={40} cy={59} rx={25} ry={4.5} fill="#5C3408" opacity={0.26}/>
      <ellipse cx={40} cy={40} rx={27} ry={23} fill="url(#ci-bag)"/>
      <path d="M 15 44 Q 13 52 18 57" stroke="#7C4B0E" strokeWidth={1.5} fill="none" opacity={0.40}/>
      <path d="M 65 44 Q 67 52 62 57" stroke="#7C4B0E" strokeWidth={1.5} fill="none" opacity={0.40}/>
      <path d="M 25 18 Q 40 13 55 18 L 53 25 Q 40 20 27 25 Z" fill="#5C3408"/>
      <ellipse cx={40} cy={13} rx={9}  ry={6}   fill="#7C4B0E"/>
      <ellipse cx={40} cy={12} rx={7}  ry={3.8} fill="#9A6420"/>
      {bumps.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={5.5} fill="rgba(245,158,11,0.21)" stroke="#F59E0B" strokeWidth={1.5}/>
      ))}
      {/* € pressed into leather */}
      <text x={40} y={44} textAnchor="middle" fontSize={13} fontWeight="bold"
        fill="#92400E" opacity={0.48} fontFamily="system-ui, sans-serif">€</text>
      <ellipse cx={28} cy={30} rx={11} ry={7} fill="white" opacity={0.14} transform="rotate(-15 28 30)"/>
    </g>
  )
}

// ── Tier 4: Large bulging sack (2500–4999) ──────────────────────────────────

function T4_LargeSack() {
  const bumps: [number, number][] = [
    [32,43],[50,41],[40,52],[27,36],[53,38],[40,32],[36,57],[46,56],[34,24],[46,24],
  ]
  return (
    <g filter="url(#ci-shadow)">
      <ellipse cx={40} cy={60} rx={28} ry={5} fill="#5C3408" opacity={0.30}/>
      <ellipse cx={40} cy={38} rx={30} ry={26} fill="url(#ci-sack)"/>
      <path d="M 14 40 Q 11 51 16 57" stroke="#5C3408" strokeWidth={2} fill="none" opacity={0.38}/>
      <path d="M 66 40 Q 69 51 64 57" stroke="#5C3408" strokeWidth={2} fill="none" opacity={0.38}/>
      <path d="M 23 13 Q 40 7 57 13 L 55 22 Q 40 16 25 22 Z" fill="#3D1F07"/>
      <ellipse cx={40} cy={9}  rx={10.5} ry={7}   fill="#5C3408"/>
      <ellipse cx={40} cy={8}  rx={8}    ry={4.5}  fill="#7C4B0E"/>
      <path d="M 37 4 Q 28 -2 23 1"  stroke="#3D1F07" strokeWidth={2} fill="none" strokeLinecap="round"/>
      <path d="M 43 4 Q 52 -2 57 1"  stroke="#3D1F07" strokeWidth={2} fill="none" strokeLinecap="round"/>
      {bumps.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={5} fill="rgba(245,158,11,0.19)" stroke="#F59E0B" strokeWidth={1.3}/>
      ))}
      <text x={40} y={42} textAnchor="middle" fontSize={15} fontWeight="bold"
        fill="#7C4B0E" opacity={0.52} fontFamily="system-ui, sans-serif">€</text>
      <ellipse cx={25} cy={26} rx={13} ry={8} fill="white" opacity={0.12} transform="rotate(-12 25 26)"/>
    </g>
  )
}

// ── Tier 5: Schubkarre (5000+) ──────────────────────────────────────────────

function T5_Wheelbarrow() {
  const coinLayers = [
    { cy: 39, rx: 17, ry: 5.5, dim: true,  bright: 0.60 },
    { cy: 33, rx: 17, ry: 5.5, dim: true,  bright: 0.72 },
    { cy: 27, rx: 15, ry: 5,   dim: true,  bright: 0.83 },
    { cy: 22, rx: 12, ry: 4.5, dim: false, bright: 0.92 },
    { cy: 18, rx: 9,  ry: 4,   dim: false, bright: 1.00 },
  ]
  const spokes = [0, 60, 120]
  return (
    <g filter="url(#ci-shadow)">
      {/* Wheel */}
      <circle cx={14} cy={52} r={9}  fill="none" stroke="#6B7280" strokeWidth={2.8}/>
      <circle cx={14} cy={52} r={3}  fill="#6B7280"/>
      {spokes.map(a => {
        const r = (a * Math.PI) / 180
        return (
          <line key={a}
            x1={14 + Math.cos(r) * 9} y1={52 + Math.sin(r) * 9}
            x2={14 - Math.cos(r) * 9} y2={52 - Math.sin(r) * 9}
            stroke="#9CA3AF" strokeWidth={1.4}
          />
        )
      })}

      {/* Tray outer (dark) */}
      <path d="M 20 46 L 17 22 L 66 14 L 70 38 Z" fill="#374151"/>
      {/* Tray inner face */}
      <path d="M 22 44 L 19 24 L 64 16 L 67 36 Z" fill="#4B5563"/>
      {/* Tray top rim */}
      <path d="M 17 22 L 66 14" stroke="#6B7280" strokeWidth={2} strokeLinecap="round"/>

      {/* Coin stack in tray */}
      {coinLayers.map((c, i) => (
        <Coin key={i} cx={43} cy={c.cy} rx={c.rx} ry={c.ry} edge={c.ry * 0.65}
          bright={c.bright} dim={c.dim}/>
      ))}
      {/* Extra shine on top coin */}
      <ellipse cx={40} cy={18} rx={3.5} ry={1.8} fill="white" opacity={0.45}/>

      {/* Front support leg */}
      <line x1={20} y1={46} x2={11} y2={60} stroke="#6B7280" strokeWidth={3}   strokeLinecap="round"/>
      {/* Rear support leg */}
      <line x1={70} y1={38} x2={73} y2={58} stroke="#6B7280" strokeWidth={3}   strokeLinecap="round"/>

      {/* Handle bars */}
      <line x1={68} y1={22} x2={80} y2={10} stroke="#9CA3AF" strokeWidth={3.5} strokeLinecap="round"/>
      <line x1={70} y1={36} x2={80} y2={24} stroke="#9CA3AF" strokeWidth={3.5} strokeLinecap="round"/>
      {/* Grip */}
      <rect x={77} y={9} width={5} height={17} rx={2.5} fill="#6B7280"/>
    </g>
  )
}

// ── Main CoinIcon component ────────────────────────────────────────────────

const TIER_SVGS = [T0_ThreeCoins, T1_Stack, T2_SmallBag, T3_BigBag, T4_LargeSack, T5_Wheelbarrow]

export interface CoinIconProps {
  coins: number
  size?: number        // base size in px (default 64). Tier scale multiplies on top.
  className?: string
  tilt?: boolean       // subtle 3D perspective tilt — default true for size >= 40
  noAnimation?: boolean
}

export function CoinIcon({ coins, size = 64, className = '', tilt, noAnimation = false }: CoinIconProps) {
  const tier = getCoinTier(coins)
  const TierSVG = TIER_SVGS[tier]
  const tierScale = COIN_TIERS[tier].scale
  const displaySize = Math.round(size * tierScale)

  const controls = useAnimation()
  const prevCoinsRef = useRef(coins)
  const prevTierRef  = useRef(tier)
  const [svgKey, setSvgKey] = useState(tier)

  useEffect(() => {
    if (noAnimation) return
    const prevCoins = prevCoinsRef.current
    const prevTier  = prevTierRef.current

    if (coins > prevCoins) {
      // Pulse bounce on any coin gain — spring stays under ~300ms (Emil: UI < 300ms)
      void controls.start({
        scale: [1, 1.14, 1],
        transition: { type: 'spring', stiffness: 480, damping: 11 },
      })
    }
    if (tier !== prevTier) {
      setSvgKey(tier)
    }

    prevCoinsRef.current = coins
    prevTierRef.current  = tier
  }, [coins, tier, controls, noAnimation])

  // Default tilt only for medium+ sizes — tiny icons look odd when tilted
  const applyTilt = tilt ?? size >= 40

  return (
    <motion.div
      className={`inline-flex items-center justify-center ${className}`}
      style={{ width: displaySize, height: displaySize }}
      animate={controls}
    >
      <AnimatePresence mode="wait">
        <motion.svg
          key={svgKey}
          viewBox="0 0 80 62"
          width={displaySize}
          height={displaySize}
          // Never from scale(0) — Emil principle: start at 0.78 so origin is visible
          initial={noAnimation ? false : { scale: 0.78, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.78, opacity: 0, transition: { duration: 0.14, ease: [0.23, 1, 0.32, 1] } }}
          // ease-out cubic-bezier for enter — Emil's strong ease-out
          transition={{ type: 'spring', duration: 0.52, bounce: 0.24 }}
          style={{
            overflow: 'visible',
            // Subtle 3D tilt — perspective on parent, rotateX on element
            ...(applyTilt ? {
              transform: 'perspective(280px) rotateX(7deg)',
              transformOrigin: 'center 80%',
            } : {}),
          }}
        >
          <TierSVG/>
        </motion.svg>
      </AnimatePresence>
    </motion.div>
  )
}
