export const DATENSCHUTZ_SECTIONS = [
  {
    title: '1. Verantwortlicher',
    text: 'Verantwortlicher im Sinne der DSGVO ist der Betreiber von DailyStudent. Die vollständigen Kontaktdaten findest du im Impressum (Einstellungen → Impressum).',
  },
  {
    title: '2. Welche Daten wir speichern',
    text: 'Wir speichern folgende Daten:\n\n• Accountdaten: E-Mail-Adresse, verschlüsseltes Passwort (verwaltet durch Supabase Auth)\n• Profildaten: Name, Klasse, Schulform, Bundesland, Fächer, Stundenplan\n• Lerninhalte: Notizen, Smart Notes, Karteikarten, Lernzettel, Probeklausuren, Lernpläne\n• Nutzungsstatistiken: Lern-Streak, Lernaktivität, Scan-Anzahl\n• Noten: Halbjahresergebnisse für den Abi-Rechner\n• Zahlungsstatus: Pro-Abo-Status (kein Speichern von Zahlungsdaten)',
  },
  {
    title: '3. Rechtsgrundlage',
    text: 'Die Verarbeitung deiner Daten erfolgt auf Basis von Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) für alle Daten die zur Bereitstellung des Dienstes notwendig sind, sowie Art. 6 Abs. 1 lit. a DSGVO (Einwilligung) für optionale Funktionen wie KI-Analyse.',
  },
  {
    title: '4. KI-Verarbeitung (Groq & Google)',
    text: 'Für KI-Funktionen (Smart Notes, Karteikarten, Probeklausuren, Lernplan) werden Lerninhalte temporär an folgende Dienste übertragen:\n\n• Groq Inc. (USA): Textgenerierung und Foto-OCR\n• Google LLC (USA/EU): Probeklausur-Generierung und Lernplanung\n\nDiese Inhalte werden ausschließlich zur Antwortgenerierung verwendet und nicht dauerhaft gespeichert oder zum Modelltraining genutzt. Es werden keine persönlichen Identifikatoren (Name, E-Mail) übermittelt. Die Übertragung erfolgt verschlüsselt über unsere Server in der EU (Supabase Frankfurt).',
  },
  {
    title: '5. Datenspeicherung & Hosting',
    text: 'Deine Daten werden gespeichert bei:\n\n• Supabase (EU-West-1, Frankfurt, Deutschland): Datenbank, Authentifizierung, Serverlogik — DSGVO-konform, AVV vorhanden\n• Stripe Inc. (USA): Zahlungsabwicklung — kein Speichern von Kreditkartendaten bei uns\n\nAlle Verbindungen sind TLS-verschlüsselt. Supabase nutzt Row Level Security: Jeder Nutzer kann ausschließlich auf seine eigenen Daten zugreifen.',
  },
  {
    title: '6. Weitergabe an Dritte',
    text: 'Deine Daten werden nicht verkauft oder für Werbezwecke genutzt. Eine Weitergabe erfolgt ausschließlich an die oben genannten Technologiepartner (Supabase, Groq, Google, Stripe) im für den Dienst notwendigen Umfang.',
  },
  {
    title: '7. Speicherdauer',
    text: 'Deine Daten werden gespeichert, solange dein Account besteht. Nach Löschung des Accounts werden alle personenbezogenen Daten innerhalb von 30 Tagen unwiderruflich gelöscht. Zahlungsbelege werden entsprechend der gesetzlichen Aufbewahrungspflichten (10 Jahre) von Stripe aufbewahrt.',
  },
  {
    title: '8. Cookies & Tracking',
    text: 'DailyStudent verwendet keine Tracking-Cookies und kein verhaltensbasiertes Tracking.\n\nOptional (nur mit deiner Einwilligung):\n• Vercel Analytics: anonyme Seitenstatistiken (Seitenaufrufe, Herkunftsland, Gerättyp) — cookielos, keine persönlichen Daten, kein Cross-Site-Tracking. Betreiber: Vercel Inc., USA. Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO (Einwilligung).\n\nTechnisch notwendig (keine Einwilligung erforderlich):\n• Auth-Token im LocalStorage zur Sitzungsverwaltung\n• App-Daten im LocalStorage (Offline-Nutzung)\n\nDu kannst deine Einwilligung jederzeit über den Button „Cookie-Einstellungen zurücksetzen" widerrufen.',
  },
  {
    title: '9. Deine Rechte (DSGVO)',
    text: 'Du hast folgende Rechte:\n\n• Auskunft (Art. 15 DSGVO): Welche Daten wir über dich gespeichert haben\n• Berichtigung (Art. 16 DSGVO): Korrektur falscher Daten\n• Löschung (Art. 17 DSGVO): Vollständige Löschung deines Accounts und aller Daten\n• Datenportabilität (Art. 20 DSGVO): Export deiner Daten\n• Widerspruch (Art. 21 DSGVO): Gegen die Verarbeitung deiner Daten\n• Beschwerde: Bei der zuständigen Datenschutzbehörde\n\nAnfragen richten an: datenschutz@dailystudent.de',
  },
  {
    title: '10. Minderjährige',
    text: 'DailyStudent richtet sich an Schülerinnen und Schüler ab 13 Jahren. Für Nutzer unter 16 Jahren ist die Einwilligung der Erziehungsberechtigten erforderlich. Wir erheben keine bewusst Daten von Kindern unter 13 Jahren.',
  },
]
