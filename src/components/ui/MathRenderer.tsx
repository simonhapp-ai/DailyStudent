import { renderMathSegments } from '../../lib/mathSegments'

export function MathRenderer({ text }: { text: string }) {
  if (!text) return null
  return <>{renderMathSegments(text)}</>
}
