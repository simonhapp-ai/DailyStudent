const CONSENT_KEY = 'ds_consent_v1'

export type ConsentState = {
  analytics: boolean
  timestamp: string
}

export function getConsent(): ConsentState | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY)
    if (!raw) return null
    return JSON.parse(raw) as ConsentState
  } catch {
    return null
  }
}

export function saveConsent(analytics: boolean): void {
  const consent: ConsentState = { analytics, timestamp: new Date().toISOString() }
  localStorage.setItem(CONSENT_KEY, JSON.stringify(consent))
}

export function hasConsent(): boolean {
  return getConsent() !== null
}

export function analyticsAllowed(): boolean {
  return getConsent()?.analytics === true
}

export function clearConsent(): void {
  localStorage.removeItem(CONSENT_KEY)
}
