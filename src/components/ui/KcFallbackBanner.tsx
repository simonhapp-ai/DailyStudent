interface KcFallbackBannerProps {
  subjectName: string
  bundesland: string
}

export function KcFallbackBanner({ subjectName, bundesland }: KcFallbackBannerProps) {
  return (
    <div className="mx-4 mb-3 flex items-start gap-2.5 rounded-xl border border-orange-500/20 bg-orange-500/10 px-3.5 py-3">
      <span className="mt-0.5 text-base leading-none">⚠️</span>
      <p className="text-left text-xs leading-relaxed text-orange-400">
        KC für <span className="font-semibold">{subjectName}</span> in{' '}
        <span className="font-semibold">{bundesland}</span> noch nicht verfügbar. Wir
        verwenden Niedersachsen als Basis — das Team kümmert sich darum.
      </p>
    </div>
  )
}
