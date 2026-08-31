import type { ReactElement, SVGProps } from 'react'

// Ein Strich-Icon-Satz (Version C) — ersetzt die Emojis in der Oberfläche.
//
// Emojis rendern je nach Gerät und Systemversion anders, lassen sich nicht
// einfärben und nicht in der Strichstärke an die Schrift angleichen. Genau das ist
// der schnellste Weg, dass eine App nach Baukasten aussieht.
//
// Alle Glyphen: 24×24-Raster, Strichstärke 2, runde Enden — dieselbe Bauweise wie
// die Fach-Icons in SubjectIcon, damit beide Sätze nebeneinander stimmig wirken.
// Farbe kommt immer über `currentColor`, nie fest verdrahtet.
//
// ── Verhältnis zu SF Symbols ────────────────────────────────────────────────
// Jeder Glyph ist nach seinem SF-Symbols-Gegenstück benannt und gebaut (siehe
// Kommentar an jeder Zeile). Die echten SF-Symbols-Glyphen werden bewusst NICHT
// eingebettet: Apples Lizenz beschränkt sie auf native Apple-Plattform-Software,
// und DailyStudent läuft als WebView. Übernommen sind deshalb Apples
// Gestaltungsprinzipien — Strichstärke passend zur Schrift, optisch gleiche
// Gewichtung, gefüllte Variante für aktive Zustände — plus die Standard-Zuordnung
// Aktion ↔ Symbolname aus der HIG-Icons-Seite. Siehe APPLE_HIG_DESIGN_SYSTEM.md.
export type IconName =
  | 'flame' | 'sparkle' | 'clock' | 'coffee' | 'book' | 'target' | 'coins'
  | 'star' | 'calendar' | 'bell' | 'warning' | 'check' | 'close' | 'note'
  | 'camera' | 'cards' | 'speech' | 'bulb' | 'snowflake' | 'chart' | 'clipboard'
  | 'cap' | 'lock' | 'bug' | 'cookie' | 'plus' | 'trash' | 'pin' | 'folder'
  | 'document' | 'image' | 'pencil' | 'play' | 'settings' | 'moon'

const paths: Record<IconName, ReactElement> = {
  // SF Symbols: flame.fill
  flame: <path d="M12 22c4 0 6.5-2.6 6.5-6.2 0-4.4-4.3-6.4-3.6-11.8-2.4 1-4.1 3-4.4 5.6-1-.8-1.5-2-1.5-3.4C7 8 5.5 10.6 5.5 13.6 5.5 18.2 8.4 22 12 22z" />,
  // SF Symbols: sparkles
  sparkle: <path d="M12 2.5l2.2 5.9 5.9 2.2-5.9 2.2L12 18.7l-2.2-5.9-5.9-2.2 5.9-2.2L12 2.5z" />,
  // SF Symbols: clock
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5.2l3.4 2" /></>,
  // SF Symbols: cup.and.saucer
  coffee: <><path d="M4 9h12v6a4 4 0 01-4 4H8a4 4 0 01-4-4V9z" /><path d="M16 10.5h1.8a2.7 2.7 0 010 5.4H16" /><path d="M7 2.5v2.8M11 2.5v2.8" /></>,
  // SF Symbols: book
  book: <><path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2V5z" /><path d="M4 19a2 2 0 012-2h13" /></>,
  // SF Symbols: scope
  target: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /></>,
  // SF Symbols: centsign.circle / cylinder.split.1x2
  coins: <><ellipse cx="12" cy="6.5" rx="7.5" ry="3.2" /><path d="M4.5 6.5v5c0 1.8 3.4 3.2 7.5 3.2s7.5-1.4 7.5-3.2v-5" /><path d="M4.5 11.5v5c0 1.8 3.4 3.2 7.5 3.2s7.5-1.4 7.5-3.2v-5" /></>,
  // SF Symbols: star
  star: <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z" />,
  // SF Symbols: calendar
  calendar: <><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M3.5 10h17M8.5 2.8v4M15.5 2.8v4" /></>,
  // SF Symbols: bell
  bell: <><path d="M18 9a6 6 0 10-12 0c0 5-2 6.5-2 6.5h16S18 14 18 9z" /><path d="M10.3 19.5a2 2 0 003.4 0" /></>,
  // SF Symbols: exclamationmark.triangle
  warning: <><path d="M10.3 3.6L2.5 17a2 2 0 001.7 3h15.6a2 2 0 001.7-3L13.7 3.6a2 2 0 00-3.4 0z" /><path d="M12 9v4.5M12 17.2h.01" /></>,
  // SF Symbols: checkmark
  check: <path d="M20 6.5L9.5 17.5 4 12" />,
  // SF Symbols: xmark
  close: <path d="M18.5 5.5l-13 13M5.5 5.5l13 13" />,
  // SF Symbols: square.and.pencil
  note: <><path d="M11.5 4H5.5a2 2 0 00-2 2v13a2 2 0 002 2h13a2 2 0 002-2v-6" /><path d="M18.5 2.5a2.1 2.1 0 013 3L12.5 14.5l-4 1 1-4 9-9z" /></>,
  // SF Symbols: camera
  camera: <><path d="M3 8.5A2.5 2.5 0 015.5 6h1.7l1.3-2h6l1.3 2h1.7A2.5 2.5 0 0120 8.5v8A2.5 2.5 0 0117.5 19h-11A2.5 2.5 0 014 16.5z" /><circle cx="12" cy="12.5" r="3.4" /></>,
  // SF Symbols: rectangle.on.rectangle
  cards: <><rect x="7.5" y="6" width="13" height="15" rx="2.6" /><path d="M4.2 17.5A2.5 2.5 0 013 15.4V5.6A2.6 2.6 0 015.6 3h8.8c.9 0 1.7.5 2.1 1.2" /></>,
  // SF Symbols: bubble.left
  speech: <path d="M20.5 14.5a2.5 2.5 0 01-2.5 2.5H8l-4.5 4V5.5A2.5 2.5 0 016 3h12a2.5 2.5 0 012.5 2.5z" />,
  // SF Symbols: lightbulb
  bulb: <><path d="M9.2 17.5h5.6M10.3 20.5h3.4" /><path d="M12 2.8A6.2 6.2 0 005.8 9c0 2.6 1.6 4.1 2.6 5.2.7.8 1.1 1.3 1.1 2.3h5c0-1 .4-1.5 1.1-2.3 1-1.1 2.6-2.6 2.6-5.2A6.2 6.2 0 0012 2.8z" /></>,
  // SF Symbols: snowflake
  snowflake: <><path d="M12 2.5v19M3.8 7.2l16.4 9.6M20.2 7.2L3.8 16.8" /><path d="M9.4 4.6L12 6.9l2.6-2.3M9.4 19.4L12 17.1l2.6 2.3" /></>,
  // SF Symbols: chart.bar
  chart: <><path d="M3.5 20.5h17" /><rect x="5" y="12" width="3.6" height="6" rx="1" /><rect x="10.2" y="8" width="3.6" height="10" rx="1" /><rect x="15.4" y="4" width="3.6" height="14" rx="1" /></>,
  // SF Symbols: list.clipboard
  clipboard: <><path d="M9 4.5H7a2 2 0 00-2 2v12.5a2 2 0 002 2h10a2 2 0 002-2V6.5a2 2 0 00-2-2h-2" /><rect x="9" y="2.5" width="6" height="4" rx="1.5" /><path d="M8.8 12h6.4M8.8 15.8h4.4" /></>,
  // SF Symbols: graduationcap
  cap: <><path d="M2.5 8.5L12 4l9.5 4.5L12 13 2.5 8.5z" /><path d="M6.5 10.4v5.1c0 1.8 2.5 3 5.5 3s5.5-1.2 5.5-3v-5.1M21.5 8.5v5.5" /></>,
  // SF Symbols: lock
  lock: <><rect x="4.5" y="10.5" width="15" height="10.5" rx="2.5" /><path d="M8 10.5V7.4a4 4 0 018 0v3.1" /></>,
  // SF Symbols: ant
  bug: <><path d="M8 6.5a4 4 0 018 0" /><rect x="6" y="8.5" width="12" height="11" rx="5.5" /><path d="M3 11h3M18 11h3M3 15.5h2.6M18.4 15.5H21M6.5 19.5l-2 2.2M17.5 19.5l2 2.2" /></>,
  // SF Symbols: circle.hexagongrid
  cookie: <><circle cx="12" cy="12" r="9" /><path d="M9 9.2h.01M14.4 8.6h.01M15.6 14h.01M9.6 15.2h.01M12 12h.01" strokeWidth="2.6" /></>,
  // SF Symbols: plus
  plus: <path d="M12 5.5v13M5.5 12h13" />,
  // SF Symbols: trash
  trash: <><path d="M3.5 6.5h17" /><path d="M8.5 6.5v-2a1 1 0 011-1h5a1 1 0 011 1v2" /><path d="M19 6.5l-1 13.5a2 2 0 01-2 1.9H8a2 2 0 01-2-1.9L5 6.5" /><path d="M10 11v6M14 11v6" /></>,
  // SF Symbols: pin
  pin: <><path d="M12 17.5V22" /><path d="M9 10.6a2 2 0 01-1.1 1.8l-1.8.9A2 2 0 005 15.1v.9a1 1 0 001 1h12a1 1 0 001-1v-.9a2 2 0 00-1.1-1.8l-1.8-.9A2 2 0 0115 10.6V7a1 1 0 011-1 2 2 0 000-4H8a2 2 0 000 4 1 1 0 011 1z" /></>,
  // SF Symbols: folder
  folder: <path d="M3.5 7a2 2 0 012-2h3.6a2 2 0 011.6.8l1 1.4h6.8a2 2 0 012 2v8.3a2 2 0 01-2 2h-13a2 2 0 01-2-2z" />,
  // SF Symbols: doc.text
  document: <><path d="M14 3.5H7a2 2 0 00-2 2v13a2 2 0 002 2h10a2 2 0 002-2V8.5z" /><path d="M14 3.5v5h5M8.8 13h6.4M8.8 16.5h4.4" /></>,
  // SF Symbols: photo
  image: <><rect x="3.5" y="4.5" width="17" height="15" rx="3" /><circle cx="9" cy="10" r="1.8" /><path d="M4 17l4.6-4.6a2 2 0 012.8 0L20 21" /></>,
  // SF Symbols: pencil
  pencil: <><path d="M17.5 3.2a2.6 2.6 0 013.7 3.7L7.6 20.5 3 22l1.5-4.6z" /><path d="M15.2 5.5l3.7 3.7" /></>,
  // SF Symbols: play.fill
  play: <path d="M6.5 4.7l12.4 7.3L6.5 19.3z" />,
  // SF Symbols: gearshape
  settings: <><circle cx="12" cy="12" r="3.2" /><path d="M19.6 14.6a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.9 2.9l-.1-.1a1.7 1.7 0 00-2.9 1.2v.2a2 2 0 11-4 0v-.1a1.7 1.7 0 00-2.9-1.2l-.1.1a2 2 0 11-2.9-2.9l.1-.1a1.7 1.7 0 00-1.2-2.9H3a2 2 0 110-4h.1a1.7 1.7 0 001.2-2.9l-.1-.1a2 2 0 112.9-2.9l.1.1a1.7 1.7 0 002.9-1.2V3a2 2 0 114 0v.1a1.7 1.7 0 002.9 1.2l.1-.1a2 2 0 112.9 2.9l-.1.1a1.7 1.7 0 001.2 2.9H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.3 1.5z" /></>,
  // SF Symbols: moon
  moon: <path d="M20.5 14.3A8.6 8.6 0 019.7 3.5a8.6 8.6 0 1010.8 10.8z" />,
}

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName
  size?: number
  /** Gefüllte Glyphen für aktive Zustände — Flamme, Stern, Funke. */
  filled?: boolean
}

export function Icon({ name, size = 20, filled, className = '', ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
      {...rest}
    >
      {paths[name]}
    </svg>
  )
}
