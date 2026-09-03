import { renderMathSegments } from '../../lib/mathSegments'
import type { MaterialTable } from '../../types'

// Echte HTML-Tabelle für Material-/Lernzettel-Daten. Horizontal scrollbar, damit
// breite Messreihen die Seite nicht sprengen (Regel: Wide content scrollt in
// seinem eigenen Container). Zellen können Inline-Mathe ($…$) tragen.

export function DataTable({ table }: { table: MaterialTable }) {
  const { headers, rows, caption } = table
  return (
    <figure className="my-1">
      <div className="overflow-x-auto rounded-icon border border-border/60">
        <table className="w-full text-left border-collapse text-[13px]">
          {headers.length > 0 && (
            <thead>
              <tr>
                {headers.map((h, i) => (
                  <th
                    key={i}
                    className="px-3 py-2 bg-surface text-text-secondary font-semibold whitespace-nowrap border-b border-border/60"
                  >
                    {renderMathSegments(h, `h${i}`)}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {rows.map((row, r) => (
              <tr key={r} className={r % 2 ? 'bg-surface/40' : undefined}>
                {row.map((cell, c) => (
                  <td
                    key={c}
                    className="px-3 py-2 text-text-primary align-top border-b border-border/40 whitespace-pre-wrap"
                  >
                    {renderMathSegments(cell, `c${r}-${c}`)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {caption && (
        <figcaption className="text-[12px] text-text-muted mt-1.5">{caption}</figcaption>
      )}
    </figure>
  )
}
