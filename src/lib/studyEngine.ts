import type { Engine, EngineOpts } from './claude'

export type { Engine, EngineOpts }

/**
 * Welche KI-Engine für Lernzettel / Probeklausur-Material:
 *   - Pro-Nutzer               → Claude Sonnet 5
 *   - Free + Kostprobe frei + opt-in → Claude (einmalig, Server zählt runter)
 *   - sonst                    → Gemini
 *
 * Der Server (api/claude.ts) ist die eigentliche Durchsetzung — das hier ist nur
 * die Client-Vorentscheidung, damit wir gar nicht erst Claude anfragen, wenn es
 * ohnehin abgelehnt würde. Bei einem Claude-Fallback generiert examFetch still
 * über Gemini weiter, ohne dass der Aufrufer etwas tun muss.
 */
export function resolveEngine(args: {
  isPro: boolean
  claudeTrialUsed: boolean
  useTrial?: boolean
  /** Pro-Nutzer-Schalter (profile.claudeEnabled). Nur `false` schaltet ab —
   *  undefined/true heißt an. Greift nur für Pro; die Kostprobe ist davon unberührt. */
  claudePref?: boolean
}): EngineOpts {
  if (args.isPro) return args.claudePref === false ? { engine: 'gemini' } : { engine: 'claude' }
  if (!args.claudeTrialUsed && args.useTrial) return { engine: 'claude', trial: true }
  return { engine: 'gemini' }
}

/** Ist die einmalige Claude-Kostprobe für diesen Free-Nutzer noch verfügbar? */
export function claudeTrialAvailable(isPro: boolean, claudeTrialUsed: boolean): boolean {
  return !isPro && !claudeTrialUsed
}
