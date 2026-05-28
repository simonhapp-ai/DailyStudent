import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { ProModal } from '../components/ui/ProModal'
import { mockExamResult } from '../data/mockData'

const IS_PRO = false

export function ExamResultScreen() {
  const navigate = useNavigate()
  const result = mockExamResult
  const [proOpen, setProOpen] = useState(false)
  const percentage = (result.score / result.maxScore) * 100

  return (
    <div className="flex flex-col min-h-screen bg-background pb-10">
      {/* Header */}
      <div className="px-4 pt-14 pb-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-btn bg-accent-soft flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7C6FFF" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4l3 3" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">KI-Korrektur</h1>
            <p className="text-text-muted text-xs">Geschichte · Aufgabe 1</p>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-4">
        {/* Score — always visible */}
        <div className="bg-surface border border-border rounded-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-text-muted text-xs uppercase tracking-wider mb-1">Ergebnis</p>
              <p className="text-3xl font-bold text-text-primary">
                {result.score} <span className="text-text-secondary text-lg font-normal">/ {result.maxScore} Punkte</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-text-muted text-xs uppercase tracking-wider mb-1">Note</p>
              <Badge color="success" className="text-lg px-3 py-1">{result.grade}</Badge>
            </div>
          </div>
          <div className="w-full bg-border rounded-pill h-2 overflow-hidden">
            <div
              className="h-full rounded-pill transition-all duration-700"
              style={{
                width: `${percentage}%`,
                backgroundColor: percentage >= 80 ? '#4ADE80' : percentage >= 60 ? '#FACC15' : '#F87171',
              }}
            />
          </div>
          <p className="text-right text-xs text-text-muted mt-1">{Math.round(percentage)}%</p>
        </div>

        {/* KI-Analyse — locked for free users */}
        {IS_PRO ? (
          <>
            <div className="bg-success/5 border border-success/20 rounded-card p-4 space-y-2">
              <p className="text-success text-sm font-semibold">✓ Stärken</p>
              <ul className="space-y-2">
                {result.strengths.map((s, i) => (
                  <li key={i} className="text-text-secondary text-sm flex gap-2">
                    <span className="text-success shrink-0 mt-0.5">·</span><span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-warning/5 border border-warning/20 rounded-card p-4 space-y-2">
              <p className="text-warning text-sm font-semibold">! Schwächen</p>
              <ul className="space-y-2">
                {result.weaknesses.map((w, i) => (
                  <li key={i} className="text-text-secondary text-sm flex gap-2">
                    <span className="text-warning shrink-0 mt-0.5">·</span><span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-accent-soft border border-accent/20 rounded-card p-4 space-y-2">
              <p className="text-accent text-sm font-semibold">→ Verbesserungsvorschlag</p>
              <p className="text-text-secondary text-sm leading-relaxed">{result.suggestion}</p>
            </div>
          </>
        ) : (
          <div className="relative overflow-hidden rounded-card">
            {/* Blurred content preview */}
            <div className="filter blur-sm pointer-events-none select-none space-y-4">
              <div className="bg-success/5 border border-success/20 rounded-card p-4">
                <p className="text-success text-sm font-semibold mb-2">✓ Stärken</p>
                <ul className="space-y-1.5">
                  {result.strengths.map((s, i) => (
                    <li key={i} className="text-text-secondary text-sm">{s}</li>
                  ))}
                </ul>
              </div>
              <div className="bg-warning/5 border border-warning/20 rounded-card p-4">
                <p className="text-warning text-sm font-semibold mb-2">! Schwächen</p>
                <ul className="space-y-1.5">
                  {result.weaknesses.map((w, i) => (
                    <li key={i} className="text-text-secondary text-sm">{w}</li>
                  ))}
                </ul>
              </div>
              <div className="bg-accent-soft border border-accent/20 rounded-card p-4">
                <p className="text-accent text-sm font-semibold mb-2">→ Verbesserungsvorschlag</p>
                <p className="text-text-secondary text-sm">{result.suggestion}</p>
              </div>
            </div>

            {/* Lock overlay */}
            <button
              className="absolute inset-0 flex items-center justify-center w-full bg-background/30"
              onClick={() => setProOpen(true)}
            >
              <div className="bg-surface border border-border rounded-card px-5 py-4 flex flex-col items-center gap-2 shadow-xl">
                <div className="w-10 h-10 rounded-btn bg-accent-soft flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7C6FFF" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" strokeLinecap="round" />
                  </svg>
                </div>
                <p className="text-text-primary font-semibold text-sm">KI-Analyse · Pro</p>
                <p className="text-text-muted text-xs">Stärken, Schwächen & Tipps</p>
                <span className="text-accent text-xs font-medium">Jetzt freischalten →</span>
              </div>
            </button>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" className="flex-1" onClick={() => navigate('/klausurmodus')}>
            Zurück
          </Button>
          <Button variant="primary" className="flex-1" onClick={() => navigate('/klausurmodus/klausur')}>
            Nochmal
          </Button>
        </div>
      </div>

      <ProModal feature="ki-korrektur" isOpen={proOpen} onClose={() => setProOpen(false)} />
    </div>
  )
}
