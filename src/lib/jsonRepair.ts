/**
 * JSON.parse mit Reparatur für den häufigsten KI-Fehler: LaTeX-Backslashes
 * (\vec, \lim, \alpha, \frac …) einfach statt doppelt in JSON-Strings.
 *
 * Zwei Fehlerklassen:
 *  1. Ungültiges Escape (\v, \e, \l, \frac, …) → JSON.parse WIRFT. Fängt `repairEscapes`.
 *  2. Zufällig gültiges Escape (\n, \t, \f, \b, \r + Buchstabe, z. B. \nabla → \n+"abla",
 *     \frac → \f+"rac") → JSON.parse schluckt es still und schiebt ein Steuerzeichen
 *     mitten in die Formel. Das lässt sich NACH dem Parsen nicht mehr erkennen, nur
 *     davor — und nur dort, wo wir sicher sind, dass es LaTeX ist: innerhalb von $…$.
 */

/** Verdoppelt jeden Backslash, der kein gültiges JSON-Escape einleitet. Lässt
 *  \" \\ \/ \uXXXX intakt; \b\f\n\r\t nur, wenn KEIN Buchstabe folgt. */
function repairEscapes(s: string): string {
  let out = ''
  for (let i = 0; i < s.length; i++) {
    if (s[i] !== '\\') { out += s[i]; continue }
    const n = s[i + 1]
    if (n === undefined) { out += '\\\\'; break }
    if (n === '"' || n === '\\' || n === '/') { out += '\\' + n; i++; continue }
    if (n === 'u' && /^[0-9a-fA-F]{4}$/.test(s.slice(i + 2, i + 6))) {
      out += s.slice(i, i + 6); i += 5; continue
    }
    if ('bfnrt'.includes(n) && !/[a-zA-Z]/.test(s[i + 2] ?? '')) {
      out += '\\' + n; i++; continue
    }
    out += '\\\\' + n; i++
  }
  return out
}

/** In $…$ / $$…$$-Spannen ist jeder Backslash LaTeX → dort `repairEscapes` roh
 *  anwenden (verdoppelt auch \frac, \nabla, die außerhalb echte \n/\f sein könnten).
 *  Prosa außerhalb der Mathe-Spannen bleibt unangetastet. */
function repairMathSpans(raw: string): string {
  if (!raw.includes('$')) return raw
  return raw.replace(/(\${1,2})([^$]*?)\1/g, (_m, delim: string, inner: string) =>
    delim + repairEscapes(inner) + delim,
  )
}

export function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(repairMathSpans(raw))
  } catch {
    return JSON.parse(repairEscapes(raw))
  }
}
