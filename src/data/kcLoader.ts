export interface KcHauptthema {
  thema: string
  relevante_unterthemen: string[]
  kernkompetenzen: string[]
}

export interface KcSubjectData {
  bundesland: string
  fach: string
  zusammenfassung: string
  hauptthemen: KcHauptthema[]
  isFallback: boolean
  fallbackReason?: string
}

// Maps app bundeslandId → folder name in public/kc/
const BUNDESLAND_FOLDER: Record<string, string> = {
  bw: 'Baden-Wuerttemberg',
  by: 'Bayern',
  be: 'Berlin',
  bb: 'Brandenburg',
  hb: 'Bremen',
  hh: 'Hamburg',
  he: 'Hessen',
  mv: 'Mecklenburg-Vorpommern',
  ni: 'Niedersachsen',
  nrw: 'NRW',
  rp: 'Rheinland-Pfalz',
  sl: 'Saarland',
  sn: 'Sachsen',
  st: 'Sachsen-Anhalt',
  sh: 'Schleswig-Holstein',
  th: 'Thüringen',
}

// Maps app subjectId → JSON filename in public/kc/{Bundesland}/
const SUBJECT_FILE: Record<string, string> = {
  deutsch: 'deutsch',
  mathematik: 'mathematik',
  englisch: 'englisch',
  geschichte: 'geschichte',
  biologie: 'biologie',
  physik: 'physik',
  chemie: 'chemie',
  geographie: 'geografie',
  politik: 'politik',
  informatik: 'informatik',
  kunst: 'kunst',
  musik: 'musik',
  sport: 'sport',
  religion: 'religion-ethik',
  ethik: 'religion-ethik',
  franzoesisch: 'franzoesisch',
}

const FALLBACK_ID = 'ni'
const FALLBACK_FOLDER = 'Niedersachsen'

interface RawKcJSON {
  bundesland: string
  fach: string
  zusammenfassung: string
  hauptthemen: KcHauptthema[]
}

async function fetchKcFile(folder: string, file: string): Promise<RawKcJSON | null> {
  try {
    const res = await fetch(`/kc/${folder}/${file}.json`)
    if (!res.ok) return null
    return (await res.json()) as RawKcJSON
  } catch {
    return null
  }
}

export async function loadKcForSubject(
  bundeslandId: string,
  subjectId: string,
): Promise<KcSubjectData | null> {
  const file = SUBJECT_FILE[subjectId]
  if (!file) return null // No KC data for this subject (latein, spanisch, etc.)

  const folder = BUNDESLAND_FOLDER[bundeslandId]
  if (!folder) return null

  // Try user's Bundesland first
  if (folder !== FALLBACK_FOLDER) {
    const data = await fetchKcFile(folder, file)
    if (data) {
      return { ...data, isFallback: false }
    }
  }

  // Fallback to Niedersachsen
  const fallbackData = await fetchKcFile(FALLBACK_FOLDER, file)
  if (fallbackData) {
    return {
      ...fallbackData,
      isFallback: bundeslandId !== FALLBACK_ID,
      fallbackReason: folder === FALLBACK_FOLDER
        ? undefined
        : `${folder} nicht verfügbar für ${file}`,
    }
  }

  return null
}

export async function loadKcForUser(
  bundeslandId: string,
  faecher: string[],
): Promise<Record<string, KcSubjectData>> {
  const results = await Promise.all(
    faecher.map(async (subjectId) => {
      const data = await loadKcForSubject(bundeslandId, subjectId)
      return { subjectId, data }
    }),
  )
  const cache: Record<string, KcSubjectData> = {}
  for (const { subjectId, data } of results) {
    if (data) cache[subjectId] = data
  }
  return cache
}

// Builds a compact KC context string for AI prompt injection
export function buildKcPromptContext(
  kc: KcSubjectData,
  stufe: 'mittelstufe' | 'oberstufe',
): string {
  const stufeName = stufe === 'oberstufe' ? 'Oberstufe' : 'Mittelstufe'
  const lines: string[] = [
    `Kerncurriculum ${kc.bundesland} — ${kc.fach} (${stufeName}):`,
  ]
  for (const t of kc.hauptthemen) {
    const subs = t.relevante_unterthemen.slice(0, 4).join(', ')
    const comps = t.kernkompetenzen.slice(0, 2).join('; ')
    lines.push(`• ${t.thema}${subs ? ` (${subs})` : ''}${comps ? ` → ${comps}` : ''}`)
  }
  return lines.join('\n')
}
