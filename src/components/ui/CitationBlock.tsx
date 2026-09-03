import { renderMathSegments } from '../../lib/mathSegments'
import type { MaterialCitation } from '../../types'

// Originalquelle mit Quellenangabe — für Quellenarbeit in Deutsch, Geschichte,
// PoWi usw. `url` bleibt reiner Text (kein Anchor): die App läuft offline/nativ.

function formatCitation(c: MaterialCitation): string {
  const parts: string[] = []
  if (c.author) parts.push(c.author)
  if (c.work) parts.push(c.year ? `${c.work} (${c.year})` : c.work)
  else if (c.year) parts.push(c.year)
  if (c.publisher) parts.push(c.publisher)
  if (c.pages) parts.push(`S. ${c.pages}`)
  if (c.url) parts.push(c.url)
  return parts.join(', ')
}

export function CitationBlock({ citation, excerpt }: { citation?: MaterialCitation; excerpt?: string }) {
  const src = citation ? formatCitation(citation) : ''
  return (
    <figure className="border-l-[3px] border-[#5AC8FA] pl-3 py-1 my-1.5">
      {excerpt && (
        <blockquote className="text-[13px] text-text-primary leading-relaxed whitespace-pre-wrap">
          {renderMathSegments(excerpt, 'src')}
        </blockquote>
      )}
      {src && (
        <figcaption className="text-[12px] text-text-muted mt-1.5">Quelle: {src}</figcaption>
      )}
    </figure>
  )
}
