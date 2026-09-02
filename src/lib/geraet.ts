// Ein Telefon oder etwas Größeres?
//
// Die App entscheidet ihr Layout nicht am Fenster, sondern am Gerät: iPhone und
// Android-Telefon bekommen die untere Leiste, alles andere die Seitenleiste.
// Deshalb darf sich auch nichts anderes am Fenster entscheiden — sonst tauchen
// Bedienelemente beim Verkleinern eines Desktopfensters auf, die dort nichts
// verloren haben.
export const IST_TELEFON = /iPhone|iPod|(Android.*Mobile)/i.test(navigator.userAgent)
