/**
 * JSON.parse mit Reparatur für die zwei häufigsten KI-Fehler:
 *  A) LaTeX-Backslashes (\vec, \lim, \frac …) einfach statt doppelt escaped.
 *  B) Antwort mitten im String abgeschnitten (Token-Limit) → "Unterminated string".
 *
 * Reihenfolge: erst normal parsen (mit $…$-Backslash-Reparatur), dann Escapes global
 * reparieren, zuletzt eine abgeschnittene Antwort notdürftig schließen — lieber ein
 * unvollständiger Lernzettel als ein harter Fehler.
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
 *  anwenden (verdoppelt auch \frac, \nabla, die außerhalb echte \n/\f sein könnten). */
function repairMathSpans(raw: string): string {
  if (!raw.includes('$')) return raw
  return raw.replace(/(\${1,2})([^$]*?)\1/g, (_m, delim: string, inner: string) =>
    delim + repairEscapes(inner) + delim,
  )
}

/** Eine abgeschnittene JSON-Antwort so weit schließen, dass sie parst: offenen
 *  String beenden, offene {}/[] in umgekehrter Reihenfolge schließen. Das letzte
 *  Feld bleibt dann evtl. unvollständig, aber der Rest ist nutzbar. */
function closeTruncatedJson(s: string): string {
  const stack: string[] = []
  let inStr = false
  let esc = false
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (inStr) {
      if (esc) esc = false
      else if (c === '\\') esc = true
      else if (c === '"') inStr = false
      continue
    }
    if (c === '"') inStr = true
    else if (c === '{' || c === '[') stack.push(c)
    else if (c === '}' || c === ']') stack.pop()
  }
  let out = s
  if (esc) out = out.slice(0, -1)        // einzelner Backslash am Ende → weg
  if (inStr) out += '"'
  // hängendes ',' oder ':' vor dem Schließen entfernen
  out = out.replace(/[,\s]+$/, '')
  if (/[:]\s*$/.test(out)) out += 'null'
  for (let i = stack.length - 1; i >= 0; i--) out += stack[i] === '{' ? '}' : ']'
  return out
}

export function safeJsonParse(raw: string): unknown {
  try { return JSON.parse(repairMathSpans(raw)) } catch { /* weiter */ }
  try { return JSON.parse(repairEscapes(raw)) } catch { /* weiter */ }
  return JSON.parse(closeTruncatedJson(repairEscapes(raw)))
}
