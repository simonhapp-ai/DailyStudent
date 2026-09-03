import { useMemo } from 'react'
import type { MaterialChart } from '../../types'

/* ════════════════════════════════════════════════════════════════════════════
   Deterministisches Diagramm aus strukturierten Daten — keine Dependency.
   Das Modell liefert nur Zahlen (series/functions), das Zeichnen passiert hier:
   scharf, theme-fähig (currentColor), reproduzierbar.
   ════════════════════════════════════════════════════════════════════════════ */

const W = 320
const H = 220
const MARGIN = { top: 14, right: 14, bottom: 34, left: 46 }
const PW = W - MARGIN.left - MARGIN.right
const PH = H - MARGIN.top - MARGIN.bottom

const SERIES_COLORS = ['#5AC8FA', '#FACC15', '#C084FC', '#34D399']

function niceTicks(min: number, max: number, count = 5): number[] {
  if (!isFinite(min) || !isFinite(max) || min === max) {
    const c = isFinite(min) ? min : 0
    return [c - 1, c, c + 1]
  }
  const span = max - min
  const step0 = span / count
  const mag = Math.pow(10, Math.floor(Math.log10(step0)))
  const norm = step0 / mag
  const step = (norm >= 5 ? 10 : norm >= 2 ? 5 : norm >= 1 ? 2 : 1) * mag
  const start = Math.ceil(min / step) * step
  const out: number[] = []
  for (let v = start; v <= max + step * 1e-6; v += step) out.push(Math.round(v * 1e9) / 1e9)
  return out.length ? out : [min, max]
}

const fmt = (n: number) => {
  const a = Math.abs(n)
  if (a !== 0 && (a < 1e-3 || a >= 1e5)) return n.toExponential(1)
  return String(Math.round(n * 1000) / 1000)
}

/* ─── Sichere Term-Auswertung (Shunting-Yard, kein eval/Function) ───────────── */

const FUNCS: Record<string, (n: number) => number> = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan, sqrt: Math.sqrt,
  abs: Math.abs, exp: Math.exp, ln: Math.log, log: Math.log10,
}
const CONSTS: Record<string, number> = { pi: Math.PI, e: Math.E }
const PREC: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 3, 'u-': 4 }

function tokenize(src: string): string[] | null {
  const s = src.replace(/\s+/g, '')
  const tokens: string[] = []
  let i = 0
  while (i < s.length) {
    const c = s[i]
    if (/[0-9.]/.test(c)) {
      let n = ''
      while (i < s.length && /[0-9.]/.test(s[i])) n += s[i++]
      tokens.push(n)
    } else if (/[a-z]/.test(c)) {
      let name = ''
      while (i < s.length && /[a-z]/.test(s[i])) name += s[i++]
      if (name === 'x' || name in FUNCS || name in CONSTS) tokens.push(name)
      else return null
    } else if ('+-*/^()'.includes(c)) {
      tokens.push(c); i++
    } else return null
  }
  return tokens
}

function toRPN(tokens: string[]): string[] | null {
  const out: string[] = []
  const ops: string[] = []
  const topPrec = () => {
    const t = ops[ops.length - 1]
    return t in FUNCS ? 5 : PREC[t] ?? 0
  }
  let prev: string | null = null
  for (let t of tokens) {
    if (/^[0-9.]+$/.test(t) || t === 'x' || t in CONSTS) {
      out.push(t)
    } else if (t in FUNCS) {
      ops.push(t)
    } else if (t === '(') {
      ops.push(t)
    } else if (t === ')') {
      while (ops.length && ops[ops.length - 1] !== '(') out.push(ops.pop() as string)
      if (!ops.length) return null
      ops.pop()
      if (ops.length && ops[ops.length - 1] in FUNCS) out.push(ops.pop() as string)
    } else if ('+-*/^'.includes(t)) {
      if (t === '-' && (prev === null || prev === '(' || '+-*/^'.includes(prev))) t = 'u-'
      const p = PREC[t]
      const rightAssoc = t === '^' || t === 'u-'
      while (ops.length && ops[ops.length - 1] !== '(' && (topPrec() > p || (!rightAssoc && topPrec() === p))) {
        out.push(ops.pop() as string)
      }
      ops.push(t)
    } else return null
    prev = t
  }
  while (ops.length) {
    const op = ops.pop() as string
    if (op === '(') return null
    out.push(op)
  }
  return out
}

function compileExpr(expr: string): ((x: number) => number) | null {
  const tokens = tokenize(expr)
  if (!tokens) return null
  const rpn = toRPN(tokens)
  if (!rpn) return null
  return (x: number) => {
    const st: number[] = []
    for (const t of rpn) {
      if (t === 'x') st.push(x)
      else if (t in CONSTS) st.push(CONSTS[t])
      else if (/^[0-9.]+$/.test(t)) st.push(parseFloat(t))
      else if (t === 'u-') st.push(-(st.pop() ?? NaN))
      else if (t in FUNCS) st.push(FUNCS[t](st.pop() ?? NaN))
      else {
        const b = st.pop() ?? NaN
        const a = st.pop() ?? NaN
        st.push(t === '+' ? a + b : t === '-' ? a - b : t === '*' ? a * b : t === '/' ? a / b : Math.pow(a, b))
      }
    }
    return st.length === 1 ? st[0] : NaN
  }
}

export function ChartSvg({ chart }: { chart: MaterialChart }) {
  const model = useMemo(() => {
    const series = chart.series ?? []
    const isCategory = chart.type === 'bar' &&
      series.some((s) => s.points.some((p) => typeof p.x === 'string'))

    // sampled function curves
    const curves = (chart.functions ?? []).map((f, i) => {
      const ev = compileExpr(f.expr)
      const [d0, d1] = f.domain ?? [-5, 5]
      const pts: Array<{ x: number; y: number }> = []
      if (ev) {
        for (let k = 0; k <= 120; k++) {
          const x = d0 + ((d1 - d0) * k) / 120
          const y = ev(x)
          if (isFinite(y)) pts.push({ x, y })
        }
      }
      return { label: f.label, color: SERIES_COLORS[(series.length + i) % SERIES_COLORS.length], pts, ok: !!ev && pts.length > 1 }
    })

    const numX: number[] = []
    const numY: number[] = []
    series.forEach((s) => s.points.forEach((p) => {
      if (typeof p.x === 'number') numX.push(p.x)
      if (typeof p.y === 'number') numY.push(p.y)
    }))
    curves.forEach((c) => c.pts.forEach((p) => { numX.push(p.x); numY.push(p.y) }))

    const cats = isCategory ? [...new Set(series.flatMap((s) => s.points.map((p) => String(p.x))))] : []

    const xMin = numX.length ? Math.min(...numX) : 0
    const xMax = numX.length ? Math.max(...numX) : 1
    let yMin = numY.length ? Math.min(...numY) : 0
    let yMax = numY.length ? Math.max(...numY) : 1
    if (chart.type === 'bar') yMin = Math.min(0, yMin)
    if (yMin === yMax) yMax = yMin + 1

    const yTicks = niceTicks(yMin, yMax)
    const yLo = Math.min(yMin, yTicks[0])
    const yHi = Math.max(yMax, yTicks[yTicks.length - 1])
    const xTicks = isCategory ? [] : niceTicks(xMin, xMax, 4)
    const xLo = isCategory ? 0 : Math.min(xMin, xTicks[0] ?? xMin)
    const xHi = isCategory ? 1 : Math.max(xMax, xTicks[xTicks.length - 1] ?? xMax)

    const sx = (x: number) => MARGIN.left + (xHi === xLo ? 0.5 : (x - xLo) / (xHi - xLo)) * PW
    const sy = (y: number) => MARGIN.top + PH - (yHi === yLo ? 0.5 : (y - yLo) / (yHi - yLo)) * PH
    const bandFor = (cat: string) => {
      const idx = cats.indexOf(cat)
      const bw = PW / Math.max(cats.length, 1)
      return { x: MARGIN.left + idx * bw + bw * 0.18, w: bw * 0.64 }
    }

    return { series, curves, isCategory, cats, yTicks, xTicks, sx, sy, bandFor, y0: sy(Math.max(0, yLo)) }
  }, [chart])

  const { series, curves, isCategory, cats, yTicks, xTicks, sx, sy, bandFor, y0 } = model
  const hasAny = series.some((s) => s.points.length > 0) || curves.some((c) => c.ok)

  if (!hasAny) {
    return (
      <p className="text-[13px] text-text-muted italic my-1">
        {chart.title ? `Diagramm: ${chart.title}` : 'Diagramm (keine Daten)'}
      </p>
    )
  }

  return (
    <figure className="my-1">
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[420px] h-auto text-text-primary" role="img"
          aria-label={chart.title ?? 'Diagramm'}>
          {/* Achsen */}
          <line x1={MARGIN.left} y1={MARGIN.top} x2={MARGIN.left} y2={MARGIN.top + PH} stroke="currentColor" strokeWidth={1} opacity={0.5} />
          <line x1={MARGIN.left} y1={MARGIN.top + PH} x2={MARGIN.left + PW} y2={MARGIN.top + PH} stroke="currentColor" strokeWidth={1} opacity={0.5} />

          {/* y-Ticks + Gridlines */}
          {yTicks.map((t, i) => (
            <g key={`y${i}`}>
              <line x1={MARGIN.left} y1={sy(t)} x2={MARGIN.left + PW} y2={sy(t)} stroke="currentColor" strokeWidth={0.5} opacity={0.12} />
              <text x={MARGIN.left - 6} y={sy(t) + 3} textAnchor="end" fontSize={8} fill="currentColor" opacity={0.6}>{fmt(t)}</text>
            </g>
          ))}

          {/* x-Ticks */}
          {isCategory
            ? cats.map((c, i) => {
              const b = bandFor(c)
              return <text key={`x${i}`} x={b.x + b.w / 2} y={MARGIN.top + PH + 12} textAnchor="middle" fontSize={8} fill="currentColor" opacity={0.6}>{c.length > 8 ? c.slice(0, 8) + '…' : c}</text>
            })
            : xTicks.map((t, i) => (
              <text key={`x${i}`} x={sx(t)} y={MARGIN.top + PH + 12} textAnchor="middle" fontSize={8} fill="currentColor" opacity={0.6}>{fmt(t)}</text>
            ))}

          {/* Achsen-Labels */}
          {chart.xLabel && <text x={MARGIN.left + PW / 2} y={H - 3} textAnchor="middle" fontSize={8} fill="currentColor" opacity={0.7}>{chart.xLabel}{chart.xUnit ? ` [${chart.xUnit}]` : ''}</text>}
          {chart.yLabel && <text x={10} y={MARGIN.top + PH / 2} textAnchor="middle" fontSize={8} fill="currentColor" opacity={0.7} transform={`rotate(-90 10 ${MARGIN.top + PH / 2})`}>{chart.yLabel}{chart.yUnit ? ` [${chart.yUnit}]` : ''}</text>}

          {/* Serien */}
          {series.map((s, si) => {
            const color = SERIES_COLORS[si % SERIES_COLORS.length]
            if (chart.type === 'bar' && isCategory) {
              return s.points.map((p, pi) => {
                const b = bandFor(String(p.x))
                const yTop = sy(typeof p.y === 'number' ? p.y : 0)
                return <rect key={`b${si}-${pi}`} x={b.x} y={Math.min(yTop, y0)} width={b.w} height={Math.abs(y0 - yTop)} fill={color} opacity={0.85} rx={1} />
              })
            }
            const pts = s.points.filter((p) => typeof p.x === 'number' && typeof p.y === 'number') as Array<{ x: number; y: number }>
            const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ')
            return (
              <g key={`s${si}`}>
                {chart.type !== 'scatter' && d && <path d={d} fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />}
                {pts.map((p, i) => <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={2} fill={color} />)}
              </g>
            )
          })}

          {/* Funktionskurven */}
          {curves.filter((c) => c.ok).map((c, ci) => (
            <path key={`f${ci}`} d={c.pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ')}
              fill="none" stroke={c.color} strokeWidth={1.6} />
          ))}
        </svg>
      </div>
      {(chart.title || series.length + curves.filter((c) => c.ok).length > 1) && (
        <figcaption className="text-[12px] text-text-muted mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          {chart.title && <span className="font-medium text-text-secondary">{chart.title}</span>}
          {[...series.map((s, i) => ({ label: s.label, color: SERIES_COLORS[i % SERIES_COLORS.length] })),
            ...curves.filter((c) => c.ok).map((c) => ({ label: c.label, color: c.color }))]
            .filter((l) => l.label)
            .map((l, i) => (
              <span key={i} className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: l.color }} />
                {l.label}
              </span>
            ))}
        </figcaption>
      )}
    </figure>
  )
}

/* ════════════════════════════════════════════════════════════════════════════
   Modell-erzeugtes <svg> hinter einer harten Allowlist rendern. Gleiches
   Vertrauensmodell wie KaTeX (dangerouslySetInnerHTML in mathSegments.tsx),
   jetzt zusätzlich Tag-/Attribut-gefiltert.
   ════════════════════════════════════════════════════════════════════════════ */

const SVG_TAGS = new Set([
  'svg', 'g', 'path', 'line', 'polyline', 'polygon', 'rect', 'circle', 'ellipse',
  'text', 'tspan', 'defs', 'marker', 'lineargradient', 'radialgradient', 'stop', 'title', 'desc',
])
const SVG_ATTRS = new Set([
  'd', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray',
  'points', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'width', 'height',
  'viewbox', 'transform', 'font-size', 'font-family', 'font-weight', 'text-anchor',
  'dominant-baseline', 'offset', 'stop-color', 'stop-opacity', 'fill-opacity', 'stroke-opacity',
  'opacity', 'gradientunits', 'gradienttransform', 'marker-end', 'marker-start', 'id', 'class',
])

function sanitizeSvg(markup: string): string | null {
  if (typeof markup !== 'string' || markup.length > 20000) return null
  let doc: Document
  try {
    doc = new DOMParser().parseFromString(markup.trim(), 'image/svg+xml')
  } catch {
    return null
  }
  if (doc.querySelector('parsererror')) return null
  const root = doc.documentElement
  if (!root || root.tagName.toLowerCase() !== 'svg') return null

  const walk = (el: Element): boolean => {
    if (!SVG_TAGS.has(el.tagName.toLowerCase())) return false
    for (const attr of [...el.attributes]) {
      const name = attr.name.toLowerCase()
      if (name.startsWith('on') || name === 'style' || name === 'href' || name.endsWith(':href') || !SVG_ATTRS.has(name)) {
        el.removeAttribute(attr.name)
      }
    }
    for (const child of [...el.children]) {
      if (!walk(child)) child.remove()
    }
    return true
  }
  if (!walk(root)) return null

  root.setAttribute('width', '100%')
  root.removeAttribute('height')
  root.setAttribute('class', 'text-text-primary max-w-[420px] h-auto')
  if (!root.getAttribute('viewBox')) root.setAttribute('viewBox', `0 0 ${W} ${H}`)
  return new XMLSerializer().serializeToString(root)
}

export function SafeSvg({ markup }: { markup: string }) {
  const clean = useMemo(() => sanitizeSvg(markup), [markup])
  if (!clean) return null
  return (
    <div className="my-1 overflow-x-auto" dangerouslySetInnerHTML={{ __html: clean }} />
  )
}
