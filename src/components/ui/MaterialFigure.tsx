import { DataTable } from './DataTable'
import { ChartSvg, SafeSvg } from './FigureSvg'
import type { LernzettelFigure } from '../../types'

// Dispatcher für eine strukturierte Abbildung (Tabelle / Diagramm / SVG).
// Von RichText (Lernzettel-figures) und ExamMaterialCard genutzt.

export function MaterialFigure({ figure }: { figure: LernzettelFigure }) {
  if (figure.kind === 'table' && figure.table) return <DataTable table={figure.table} />
  if (figure.kind === 'chart' && figure.chart) return <ChartSvg chart={figure.chart} />
  if (figure.kind === 'svg' && figure.svg) return <SafeSvg markup={figure.svg} fallback={figure.title ?? figure.alt} />
  return null
}
