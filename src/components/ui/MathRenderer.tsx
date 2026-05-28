import katex from 'katex'

type Segment =
  | { type: 'text'; content: string }
  | { type: 'math'; displayMode: boolean; content: string }

function parseSegments(text: string): Segment[] {
  const re = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\\begin\{[^}]+\}[\s\S]+?\\end\{[^}]+\})/g
  const segs: Segment[] = []
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segs.push({ type: 'text', content: text.slice(last, m.index) })
    const raw = m[0]
    let latex: string
    let displayMode: boolean
    if (raw.startsWith('$$')) {
      latex = raw.slice(2, -2).trim()
      displayMode = true
    } else if (raw.startsWith('\\[')) {
      latex = raw.slice(2, -2).trim()
      displayMode = true
    } else if (raw.startsWith('\\(')) {
      latex = raw.slice(2, -2).trim()
      displayMode = false
    } else if (raw.startsWith('$')) {
      latex = raw.slice(1, -1).trim()
      displayMode = false
    } else {
      latex = raw.trim()
      displayMode = true
    }
    segs.push({ type: 'math', displayMode, content: latex })
    last = m.index + raw.length
  }
  if (last < text.length) segs.push({ type: 'text', content: text.slice(last) })
  return segs
}

function renderLatex(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(latex, { displayMode, throwOnError: false, strict: false })
  } catch {
    return latex
  }
}

export function MathRenderer({ text }: { text: string }) {
  if (!text) return null
  const segs = parseSegments(text)
  return (
    <>
      {segs.map((seg, i) =>
        seg.type === 'text'
          ? <span key={i}>{seg.content}</span>
          : <span key={i} dangerouslySetInnerHTML={{ __html: renderLatex(seg.content, seg.displayMode) }} />
      )}
    </>
  )
}
