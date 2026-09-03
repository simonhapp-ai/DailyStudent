/**
 * JSON.parse mit einer Reparatur für den häufigsten KI-Fehler: LaTeX-Backslashes
 * (\epsilon, \frac, \end{...}) unescaped in JSON-Strings. Einzelne Backslashes,
 * die keine gültige JSON-Escape einleiten, werden verdoppelt — läuft nur, wenn
 * der erste Parse fehlschlägt, korrektes JSON wird also nie angefasst.
 */
export function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    const repaired = raw.replace(/\\(?!["\\/bfnrtu]|u[0-9a-fA-F]{4})/g, '\\\\')
    return JSON.parse(repaired)
  }
}
