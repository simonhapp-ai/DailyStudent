import { renderMathSegments } from '../../lib/mathSegments'
import { useResolvedAttachments } from '../../lib/noteStorage'
import type { LernzettelImage } from '../../types'

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return parts.flatMap((part, j): React.ReactNode[] =>
    part.startsWith('**') && part.endsWith('**')
      ? [
          <strong key={`${keyPrefix}b${j}`} className="text-text-primary font-semibold">
            {renderMathSegments(part.slice(2, -2), `${keyPrefix}b${j}-`)}
          </strong>,
        ]
      : renderMathSegments(part, `${keyPrefix}p${j}-`)
  )
}

function ImageBlock({ src, alt }: { src: string; alt: string }) {
  const isResolved = !src.startsWith('idb:') && !src.startsWith('cloud:')
  if (!isResolved) {
    return <div className="w-full h-40 rounded-card bg-surface-hover animate-pulse my-3" />
  }
  return (
    <div className="my-3 rounded-card overflow-hidden border border-border/60 bg-surface-hover">
      <img src={src} alt={alt} className="w-full h-auto block" />
      {alt && <p className="text-[11px] text-text-muted px-3 py-2">{alt}</p>}
    </div>
  )
}

/**
 * Markdown-lite + LaTeX renderer for AI-generated content: `##`/`###` headings, `**bold**`,
 * `> `/"Merke: " blockquotes, `- ` bullets, blank-line spacers, and inline `$...$` math via KaTeX.
 * Used wherever Smart-Note or Lernzettel content (not just single short fields) is displayed.
 *
 * `images` (Lernzettel-only): each is inserted right after the heading line whose text matches
 * `afterHeading` exactly; unmatched images are appended at the end so nothing silently disappears.
 */
export function RichText({ text, images }: { text: string; images?: LernzettelImage[] }) {
  const refs = images?.map((img) => img.ref) ?? []
  const resolvedSrcs = useResolvedAttachments(refs)

  if (!text) return null
  const lines = text.split('\n')
  const placed = new Set<number>()

  const imagesAfter = (headingText: string) =>
    (images ?? [])
      .map((img, idx) => ({ img, idx }))
      .filter(({ img }) => img.afterHeading === headingText)
      .map(({ img, idx }) => {
        placed.add(idx)
        return <ImageBlock key={`img-${idx}`} src={resolvedSrcs[idx] ?? img.ref} alt={img.alt} />
      })

  const nodes = lines.map((line, i) => {
    if (line.startsWith('### ')) {
      const heading = line.slice(4)
      return (
        <div key={i}>
          <p className="text-[14px] font-semibold text-text-primary mt-4 mb-1">{renderInline(heading, `h3-${i}-`)}</p>
          {imagesAfter(heading)}
        </div>
      )
    }
    if (line.startsWith('## ')) {
      const heading = line.slice(3)
      return (
        <div key={i}>
          <p className="text-[16px] font-bold text-text-primary mt-5 mb-1.5">{renderInline(heading, `h2-${i}-`)}</p>
          {imagesAfter(heading)}
        </div>
      )
    }
    if (line.startsWith('> ')) {
      return (
        <div key={i} className="border-l-[3px] border-[#5AC8FA] pl-3 py-0.5 my-2">
          <p className="text-[13px] text-text-secondary italic">{renderInline(line.slice(2), `q-${i}-`)}</p>
        </div>
      )
    }
    if (line.startsWith('Merke: ')) {
      return (
        <div key={i} className="border-l-[3px] border-[#5AC8FA] pl-3 py-0.5 my-2">
          <p className="text-[13px] text-text-secondary italic">{renderInline(line, `m-${i}-`)}</p>
        </div>
      )
    }
    if (line.startsWith('- ')) {
      return (
        <div key={i} className="flex items-start gap-2 my-0.5">
          <span className="w-1 h-1 rounded-full bg-text-muted shrink-0 mt-[7px]" />
          <p className="text-[13px] text-text-secondary leading-relaxed flex-1">{renderInline(line.slice(2), `li-${i}-`)}</p>
        </div>
      )
    }
    if (line.trim() === '') {
      return <div key={i} className="h-2" />
    }
    return (
      <p key={i} className="text-[13px] text-text-secondary leading-relaxed">
        {renderInline(line, `p-${i}-`)}
      </p>
    )
  })

  const leftover = (images ?? [])
    .map((img, idx) => ({ img, idx }))
    .filter(({ idx }) => !placed.has(idx))
    .map(({ img, idx }) => <ImageBlock key={`img-leftover-${idx}`} src={resolvedSrcs[idx] ?? img.ref} alt={img.alt} />)

  return (
    <>
      {nodes}
      {leftover}
    </>
  )
}
