/**
 * JSON.parse mit Reparatur für die drei häufigsten KI-Fehler:
 *  A) LaTeX-Backslashes (\vec, \lim, \frac …) einfach statt doppelt escaped.
 *  B) Antwort mitten drin abgeschnitten (Token-Limit) → "Unterminated string" / "expected }".
 *  C) kaputter Token kurz vor dem Ende → Rückwärts wegschneiden bis der Rest parst.
 *
 * Vier Versuche, billigster/sauberster zuerst. Bei allem, was auch danach nicht
 * parst, fliegt der Fehler nach oben (der Aufrufer fällt dann auf Gemini zurück).
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

/** Offenen String beenden + offene {}/[] in umgekehrter Reihenfolge schließen. */
function completeBrackets(s: string): string {
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
  if (esc) out = out.slice(0, -1)             // einzelner Backslash am Ende → weg
  if (inStr) out += '"'
  if (/:\s*$/.test(out)) out += 'null'        // "key": ohne Wert → null
  out = out.replace(/[,\s]+$/, '')            // hängendes ',' vor dem Schließen weg
  for (let i = stack.length - 1; i >= 0; i--) out += stack[i] === '{' ? '}' : ']'
  return out
}

/** Abgeschnittene Antwort schließen; wenn das nicht parst, vom Ende her in
 *  1-Zeichen-Schritten wegschneiden und neu schließen, bis es parst (max 500). */
function closeTruncatedJson(s: string): string {
  for (let cut = 0; cut <= 500 && cut < s.length; cut++) {
    const candidate = completeBrackets(s.slice(0, s.length - cut))
    try { JSON.parse(candidate); return candidate } catch { /* weiter schneiden */ }
  }
  return completeBrackets(s) // letzter Versuch — wirft dann upstream
}

export function safeJsonParse(raw: string): unknown {
  const mathFixed = repairMathSpans(raw)
  try { return JSON.parse(mathFixed) } catch { /* weiter */ }
  try { return JSON.parse(closeTruncatedJson(mathFixed)) } catch { /* weiter */ }
  const aggressive = repairEscapes(raw)
  try { return JSON.parse(aggressive) } catch { /* weiter */ }
  return JSON.parse(closeTruncatedJson(aggressive))
}
