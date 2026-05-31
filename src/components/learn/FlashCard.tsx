import { useState } from 'react'
import { Badge } from '../ui/Badge'

interface FlashCardProps {
  front: string
  back: string
  subjectName?: string
  subjectColor?: string
  keywords?: string[]
}

function highlightKeywords(text: string, keywords: string[], color: string): React.ReactNode {
  if (!keywords.length) return text

  const sorted = [...keywords].sort((a, b) => b.length - a.length)
  const escaped = sorted.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi')
  const parts = text.split(regex)

  return parts.map((part, i) => {
    const isMatch = keywords.some((k) => k.toLowerCase() === part.toLowerCase())
    return isMatch ? (
      <mark
        key={i}
        className="keyword-highlight"
        style={{
          color,
          textDecorationColor: `${color}80`,
        }}
      >
        {part}
      </mark>
    ) : (
      part
    )
  })
}

export function FlashCard({ front, back, subjectName, subjectColor, keywords = [] }: FlashCardProps) {
  const [flipped, setFlipped] = useState(false)
  const accent = subjectColor ?? '#7C3AED'

  return (
    <div
      className="cursor-pointer select-none w-full h-full"
      style={{ perspective: '1000px' }}
      onClick={() => setFlipped((f) => !f)}
    >
      <div
        className={`flashcard-inner w-full h-full${flipped ? ' flipped' : ''}`}
        style={{ minHeight: '240px' }}
      >
        {/* Front */}
        <div className="flashcard-face absolute inset-0 bg-surface border border-border rounded-card p-6 flex flex-col justify-between">
          {subjectName && (
            <div>
              <Badge style={{ backgroundColor: `${accent}22`, color: accent }}>
                {subjectName}
              </Badge>
            </div>
          )}
          <p className="text-text-primary font-semibold text-[17px] leading-snug text-center flex-1 flex items-center justify-center px-2">
            {front}
          </p>
          <p className="text-xs text-text-muted text-center">Tippen zum Umdrehen</p>
        </div>

        {/* Back */}
        <div
          className="flashcard-back absolute inset-0 rounded-card p-6 flex flex-col justify-between border"
          style={{
            backgroundColor: `${accent}0f`,
            borderColor: `${accent}30`,
          }}
        >
          {subjectName && (
            <div>
              <Badge style={{ backgroundColor: `${accent}22`, color: accent }}>
                {subjectName}
              </Badge>
            </div>
          )}
          <p className="text-text-primary text-[15px] leading-relaxed flex-1 flex items-center">
            <span>{highlightKeywords(back, keywords, accent)}</span>
          </p>
          <p className="text-xs text-text-muted text-center">Tippen zum Zurückdrehen</p>
        </div>
      </div>
    </div>
  )
}
