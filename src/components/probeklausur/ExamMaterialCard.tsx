import { renderMathSegments } from '../../lib/mathSegments'
import { DataTable } from '../ui/DataTable'
import { ChartSvg, SafeSvg } from '../ui/FigureSvg'
import { CitationBlock } from '../ui/CitationBlock'
import type { ProbeklausurMaterial } from '../../types'

// Einheitliche Material-Karte für alle Probeklausur-Modi. Ersetzt die drei fast
// identischen lokalen MaterialCard-Kopien. Schaltet über `m.kind`: Tabelle /
// Diagramm / SVG / Quelle bekommen ihren Renderer, alles andere fällt auf die
// bisherige whitespace-pre-wrap-Darstellung zurück (jetzt mit KaTeX).

const TYPE_LABEL: Record<string, string> = {
  tabelle: 'Tabelle', diagramm: 'Diagramm', text: 'Text',
  versuchsaufbau: 'Versuchsaufbau', sequenz: 'Sequenz',
}

export function ExamMaterialCard({ m, showTypeLabel = false }: { m: ProbeklausurMaterial; showTypeLabel?: boolean }) {
  return (
    <div className="bg-background rounded-icon border border-border/60 p-4 mb-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="px-2 py-0.5 rounded-chip text-[11px] font-bold bg-accent/15 text-text-primary">{m.id}</span>
        {showTypeLabel && (
          <span className="text-text-muted text-[11px] font-semibold uppercase">{TYPE_LABEL[m.type] ?? m.type}</span>
        )}
        <p className="text-text-secondary text-[12px] font-semibold truncate">{m.title}</p>
      </div>

      {m.kind === 'table' && m.table ? (
        <DataTable table={m.table} />
      ) : m.kind === 'chart' && m.chart ? (
        <ChartSvg chart={m.chart} />
      ) : m.kind === 'svg' && m.svg ? (
        <SafeSvg markup={m.svg} fallback={m.content} />
      ) : m.kind === 'source' ? (
        <CitationBlock citation={m.citation} excerpt={m.content} />
      ) : (
        <p className="text-text-primary text-[13px] whitespace-pre-wrap leading-relaxed">
          {renderMathSegments(m.content, `mat-${m.id}`)}
        </p>
      )}
    </div>
  )
}
