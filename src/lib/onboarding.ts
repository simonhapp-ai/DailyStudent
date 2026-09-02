// Erzwungenes Onboarding.
//
// Der Reset in den Dev-Werkzeugen loeschte bisher nur die lokalen Daten. Das
// half nicht: Das Profil liegt auch in Supabase und wurde beim naechsten Laden
// sofort wieder heruntergeladen — man landete direkt in der App statt im
// Onboarding. Diese Marke haelt es offen, bis es einmal abgeschlossen ist.
//
// Liegt bewusst NICHT in UserContext.tsx: Eine Datei, die Komponenten UND
// Funktionen exportiert, bricht Fast Refresh (react-refresh/only-export-
// components) — dieselbe Regel, wegen der gradeTone und renderMathSegments
// eigene Dateien haben.
const SCHLUESSEL = 'onboarding_erzwingen'

export function erzwingeOnboarding() {
  try { localStorage.setItem(SCHLUESSEL, '1') } catch { /* privates Fenster */ }
}

export function onboardingErzwungen(): boolean {
  try { return localStorage.getItem(SCHLUESSEL) === '1' } catch { return false }
}

export function onboardingFreigeben() {
  try { localStorage.removeItem(SCHLUESSEL) } catch { /* privates Fenster */ }
}
