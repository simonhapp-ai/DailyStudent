# CLAUDE.md — DailyStudent App Context

> Lies diese Datei zu Beginn jeder Session vollständig durch, bevor du irgendwelchen Code schreibst oder Änderungen machst.

---

## Was ist DailyStudent?

DailyStudent ist ein **personalisiertes, KI-gestütztes Lernökosystem** für deutsche Schüler (Klasse 10–13, primär Oberstufe/Abi) und zukünftig auch Studenten.

Die App bietet keinen einzelnen Lernweg, sondern einen **vernetzten Mix aus Lernstrategien**, die sich an die individuelle Lage des Schülers anpassen:
- Wie viel Zeit bleibt bis zur Klausur?
- Was wurde im Unterricht behandelt (Smart Notes)?
- Welche Themen stehen laut Kerncurriculum (KC) des Bundeslandes an?
- Welches Fach ist das schwächste?

**Das Ergebnis** ist ein kohärentes System, in dem jeder Output (Karteikarten, Probeklausur, Lernzettel, Lernplan) auf denselben Inputs basiert: Smart Notes + KC-Daten + Nutzerprofil.

**Zielgruppe:** Gymnasiasten Klasse 10–13, Mittelstufe und Oberstufe — Studentenanpassung in Planung  
**Wachstumshebel:** Discord-Community mit 5.000+ Schülern  
**Monetarisierung:** Freemium — Free Tier mit Blur-Paywall, Pro für €7,99/Mo oder €59,99/Jahr

---

## Tech Stack

| Was | Womit |
|-----|-------|
| Framework | React + TypeScript |
| Styling | Tailwind CSS |
| Build Tool | Vite |
| Routing | React Router |
| Persistenz (aktuell) | localStorage (`lernapp_v1`) |
| KI Text + Vision | Groq API — Llama 3.3 70B (Text) + Llama 4 Scout Vision (Bilder/Scans) |
| KI Probeklausuren | Google Gemini — `gemini-2.5-flash` (Klausurgenerierung + Korrektur) |
| Auth + DB (Phase 3) | Supabase |
| Payments (Phase 3) | Stripe |
| Dev Server | localhost:5174 |
| Repo | https://github.com/simonhapp-ai/DailyStudent.git |
| Projektordner | C:\Users\simon\OneDrive\Desktop\Claude App |

---

## Das Ökosystem-Konzept (Kern der App-Logik)

### Smart Notes als Grundlage
Alles in der App baut auf **Smart Notes** auf. Eine Smart Note entsteht durch:
1. Foto/PDF/Text-Import → Groq Vision OCR → Groq Text → `GeneratedSmartNote`
2. Manuelle Eingabe → optional KI-Analyse → `GeneratedSmartNote`

`GeneratedSmartNote` enthält: `summary`, `keywords`, `examTopics`, optional `solution`/`tasks` (für Aufgaben), `rawText`.

### Die Lernmethoden-Kette

```
Smart Notes
    ├── Karteikarten      → generateFlashcards() via Groq → LearnModeScreen
    ├── Blurting          → evaluateBlurting() via Groq → BlurtingScreen
    ├── Probeklausur      → generateMode1-4Exam() via Gemini → ProbeklausurMode1-4Screen
    ├── Lernzettel        → generateLernzettel() via Groq → LernzettelScreen ✓ FERTIG
    └── Lernplan          → [FEHLT] generateLernplan() via Groq → KlausurphasenScreen
```

### Klausurenmodus-Screen als Hub
`KlausurphasenScreen` ist KEIN Feature-Screen — er ist eine **Übersicht/Startpunkt** für alle Lernmethoden, zeigt den nächsten Klausurtermin, Streak, Schwächefach und ermöglicht den Einstieg in alle Lernwege. Das Layout ist bewusst so gewählt. Nicht ändern ohne Rückfrage.

---

## Aktueller Stand — Phase 2 fast fertig (Stand: 05.06.2026)

### Was vollständig funktioniert (echte KI, kein Mock):
- Onboarding Gate (Name, Klasse, Schulform, Bundesland, Fächer, Klausurtermin, Stundenplan-Scan)
- **Unterricht-Screen:** Fach-Tree mit Ordnern, Notizen erstellen, Foto-Import per Gemini KI mit auto-Ziel-Vorschlag
- **Smart Notes:** Foto/PDF/Text → Groq OCR → Groq Analyse → `GeneratedSmartNote` mit Summary, Keywords, Klausurthemen, Lösungsschritte
- **Keyword-Erklärung:** Tap auf Schlüsselbegriff → `explainKeyword()` via Groq
- **Karteikarten:** `generateFlashcards()` via Groq aus Smart Note → `LearnModeScreen` mit Deck-Verwaltung
- **Blurting:** `evaluateBlurting()` via Groq — echter KI-Vergleich mit Smart Note Inhalt
- **Probeklausur 4 Modi:** `generateMode1-4Exam()` via Gemini `gemini-2.5-flash` — echt generiert, echt korrigiert
- **Lernzettel:** `generateLernzettel()` via Groq — `LernzettelScreen` + `LernzettelGeneratorScreen` vollständig implementiert
- **KC-Daten:** 196 JSON-Dateien in `public/kc/` für 15 Bundesländer, `kcLoader.ts` vollständig implementiert, Fallback auf Niedersachsen
- **Stundenplan-Scanner:** `parseStundenplanFromImage()` via Groq Vision — liest Foto/PDF ein
- **Stats:** Streak (echt), scanCount, examCount, studiedDays — alles live in localStorage
- **InsightsScreen:** Notenverlauf-Chart, Fachvergleich, Wochenaktivität, KI-Lerntipps — alle Daten live aus UserContext
- **AbiRechnerScreen:** NP-Rechner mit Zielnote-Vergleich
- **KlausurplanScreen, HausaufgabenheftScreen, KalenderScreen** — funktionsfähig
- **FaecherEditScreen:** Fächer nachträglich hinzufügen/entfernen mit Ordner-Sync
- **FolderSystem:** Ordner, Unterordner, auto-generiert nach Halbjahr/Quartal
- **Theme:** Hell/Dunkel/System
- **isPro-Flag:** Toggle im Profil (Dev-Mode) — schaltet alle KI-Features + Paywalls app-weit; Pro-Banner im Profil verschwindet bei aktivem Pro

### Was noch Mock/Placeholder ist:
| Was | Datei | Notiz |
|-----|-------|-------|
| `LERNPLAN_DAYS` | `KlausurphasenScreen.tsx:27` | 3 hardcoded Tage — Lernplan-Button öffnet Modal aber generiert nichts |
| Einstellungs-Buttons | `ProfilScreen.tsx` | "Bundesland & Lehrplan", "Benachrichtigungen", "Datenschutz", "Account" — Buttons ohne onClick, Phase-3-Platzhalter |
| "Abi-Schnitt Ø 1.7" | `ProfilScreen.tsx` | Hardcoded Marketing-Text im Pro-Banner |

### Was komplett fehlt (letztes Feature vor Phase 3):
1. **Lernplan** — echter KI-generierter Tagesplan (Groq) basierend auf Klausurdatum + Smart Notes + KC. UI-Skeleton in KlausurphasenScreen vorhanden, aber kein API-Call, keine `generateLernplan()`-Funktion.

---

## KC-Daten — vollständig implementiert

KC-Daten liegen als JSON-Dateien in `public/kc/{Bundesland}/{fach}.json`.

**Verfügbare Bundesländer:** Baden-Württemberg, Bayern, Berlin, Brandenburg, Bremen, Hamburg, Hessen, Mecklenburg-Vorpommern, Niedersachsen, NRW, Rheinland-Pfalz, Saarland, Sachsen, Sachsen-Anhalt, Schleswig-Holstein  
**Fallback:** Niedersachsen (wenn Bundesland fehlt)  
**Fehlend:** Thüringen (in kcLoader gemappt aber kein Ordner → fällt auf Niedersachsen zurück)

**kcLoader.ts** (`src/data/kcLoader.ts`):
- `loadKcForSubject(bundeslandId, subjectId)` — lädt JSON async, fällt auf Niedersachsen zurück
- `loadKcForUser(bundeslandId, faecher[])` — lädt alle Fächer parallel
- `buildKcPromptContext(kc, stufe)` — baut kompakten KC-String für Prompt-Injection

**JSON-Struktur:**
```json
{
  "bundesland": "NRW",
  "fach": "geschichte",
  "zusammenfassung": "...",
  "hauptthemen": [
    {
      "thema": "Weimarer Republik",
      "relevante_unterthemen": ["Novemberrevolution", "Verfassung 1919"],
      "kernkompetenzen": ["Quellen analysieren", "historisch urteilen"]
    }
  ]
}
```

---

## Roadmap

### NÄCHSTER SCHRITT — Lernplan Feature (einziges fehlendes Phase-2-Feature)
- [ ] `src/lib/groq.ts`: `generateLernplan(profile, klausurtermin, userNotes, kcData)` — gibt Tagesplan als JSON zurück
- [ ] Struktur: `{ days: [{ date, topic, kcRef, durationMin, method: 'karteikarten'|'blurting'|'lernzettel'|'probeklausur' }] }`
- [ ] `KlausurphasenScreen`: "Lernplan generieren" Button ruft echte Funktion auf, speichert Plan in localStorage
- [ ] `LERNPLAN_DAYS` durch echte Plan-Daten ersetzen
- [ ] Free-User: erster Tag sichtbar, Rest blur → Pro required

### Phase 3 — Backend (NACH Lernplan)
- Supabase Auth + DB (User-Daten, Notes, Flashcards in Cloud)
- Stripe Payments (Pro-Subscription, Webhook)
- KI-API-Calls serverseitig (API-Keys nicht mehr im Client)
- Push-Benachrichtigungen für Lernplan-Erinnerungen
- Deployment (Vercel/Netlify)
- Studentenadaption (Uni-Fächer, kein KC aber Syllabus-Upload)

---

## Architektur-Entscheidungen (nicht ändern ohne Rückfrage)

- **localStorage Key:** `lernapp_v1` — Schema nicht brechen, Migration schreiben wenn nötig
- **isPro-Flag:** in `UserContext` als `isPro: boolean` — bleibt so bis Stripe kommt; im Profil-Screen manuell togglebar (Dev-Mode); schaltet alle Paywalls und den Pro-Banner app-weit
- **Kein eigener Backend-Server** — alles Client-Side bis Phase 3; Groq + Gemini direkt aus dem Browser
- **Groq für Text/Vision** — Llama 3.3 70B + Llama 4 Scout Vision: Kosten, Geschwindigkeit, kein Rate-Limit für Prototyp
- **Gemini für Probeklausuren** — `gemini-2.5-flash` hat bessere längere Reasoning-Qualität für strukturierte Klausurgenerierung; `gemini-2.5-flash-lite` für File-Import (günstiger)
- **Blur-Paywall Pattern** — für alle KI-Features bei Free-Usern beibehalten
- **TypeScript strict** — keine `any` Types einbauen
- **KlausurphasenScreen bleibt Hub** — kein Feature-Screen, nur Einstieg in die Lernmethoden
- **HomeScreen = UnterrichtScreen** — kein separater HomeScreen; `/` redirectet direkt zu `/unterricht`

---

## Umgebungsvariablen

```
VITE_GROQ_API_KEY=gsk_...        # Groq API Key (Text + Vision) — gültig
VITE_GEMINI_API_KEY=AIzaSy...    # Google Gemini API Key — gültig (neu generiert 05.06.2026)
```

`.env` liegt im Root-Verzeichnis. Nie in Git committen (ist in `.gitignore`).

---

## Dev-Profil (OnboardingScreen.tsx — DEV_PROFILE)

```
Name:       Simon Happ
Klasse:     13, Gymnasium G9
Bundesland: Niedersachsen (ni)
Fächer:     Deutsch, Mathematik, Englisch, Biologie, Physik, Politik, Religion, Sport
Klausur:    Mathematik am 06.06.2026
isDevMode:  true
```

**Stundenplan (29 Slots, exakt nach echtem Stundenplan Klasse 13):**
- Mo: Physik 7:45, Englisch 11:30+12:20, Religion 13:50+14:35
- Di: Mathe 8:35
- Mi: Mathe 7:45+8:35, Bio 9:40+10:25, Englisch 11:30, Politik 12:20, Deutsch 13:50+14:35
- Do: Politik 7:45+8:35, Bio 9:40+10:25, Religion 11:30, Deutsch 12:20, Physik 13:50+14:35
- Fr: Englisch 7:45+8:35, Mathe 9:40+10:25, Bio 11:30, Sport 13:50+14:35

---

## Wichtige Dateien / Struktur

```
src/
├── app/
│   └── App.tsx                   # Router, ErrorBoundary, ThemeApplier, Layout
├── components/
│   ├── lesson/
│   │   ├── FotoScannerWidget.tsx
│   │   ├── AudioRecorderWidget.tsx
│   │   └── NoteEditor.tsx
│   ├── learn/
│   │   ├── FlashCard.tsx
│   │   ├── ExamQuestion.tsx
│   │   └── AIFeedbackCard.tsx
│   └── ui/                       # Button, Card, Badge, BottomNav, Header, ProModal, BottomSheet, ...
├── context/
│   └── UserContext.tsx            # Zentraler State + localStorage Persistenz
├── data/
│   ├── mockData.ts                # NUR NOCH: halfYears[], topics[], subjects[] — kein Legacy-Mock mehr
│   ├── subjectInfo.ts             # SUBJECT_INFO + SUBJECT_GROUPS (Name, Icon, Farbe pro Fach)
│   └── kcLoader.ts                # loadKcForSubject/User(), buildKcPromptContext()
├── lib/
│   ├── groq.ts                    # Alle Groq API Calls (OCR, SmartNote, Flashcards, Blurting, Lernzettel, ...)
│   ├── gemini.ts                  # Gemini API Calls (Probeklausur-Generierung + Korrektur, File-Import)
│   └── pdf.ts                     # PDF → Bilder Konvertierung (pdfjs)
├── screens/                       # Ein Screen pro Route
│   ├── OnboardingScreen.tsx       # Enthält DEV_PROFILE für Skip-Button
│   ├── KalenderScreen.tsx
│   ├── UnterrichtScreen.tsx       # Fach-Tree, Ordner, Foto-Import mit KI-Zielvorschlag
│   ├── LessonScreen.tsx
│   ├── FolderScreen.tsx
│   ├── SmartNotesScreen.tsx       # Notiz-Detail + KI-Analyse + Keyword-Erklärung + FC-Generator
│   ├── NoteCreateScreen.tsx
│   ├── KlausurphasenScreen.tsx    # Hub für alle Lernmethoden — LERNPLAN_DAYS noch hardcoded
│   ├── LearnModeScreen.tsx        # Karteikarten-Bibliothek + Lern-Session
│   ├── FlashCardGeneratorScreen.tsx
│   ├── BlurtingScreen.tsx         # Blurting + KI-Bewertung
│   ├── ProbeklausurMenuScreen.tsx
│   ├── ProbeklausurMode1Screen.tsx  # AFB-Trainer
│   ├── ProbeklausurMode2Screen.tsx  # Vollständige Klausur
│   ├── ProbeklausurMode3Screen.tsx  # Materialklausur
│   ├── ProbeklausurMode4Screen.tsx  # Ohne Material
│   ├── ProbeklausurRetroScreen.tsx
│   ├── LernzettelScreen.tsx       # Lernzettel-Bibliothek + Detail-Ansicht
│   ├── LernzettelGeneratorScreen.tsx  # Lernzettel generieren via Groq
│   ├── KlausurplanScreen.tsx
│   ├── HausaufgabenheftScreen.tsx
│   ├── AbiRechnerScreen.tsx
│   ├── InsightsScreen.tsx         # Statistiken, Charts, Lerntipps — alle Daten live
│   ├── ProfilScreen.tsx           # Pro-Banner nur bei !isPro sichtbar
│   ├── FaecherEditScreen.tsx
│   └── SubjectListScreen.tsx
└── types/
    └── index.ts                   # Alle TypeScript-Typen
public/
└── kc/                            # KC-JSONs: 15 Bundesländer × ~14 Fächer = ~196 Dateien
    ├── NRW/
    ├── Bayern/
    ├── Niedersachsen/
    └── ...
```

**Gelöschte Screens (nicht mehr vorhanden):**
- `HomeScreen.tsx` — war ungeroutet, komplett toter Screen
- `ExamModeScreen.tsx` — Legacy Mock-Klausur (hardcoded Geschichte-Fragen), von Probeklausur-4-Modi ersetzt
- `ExamResultScreen.tsx` — Legacy Mock-Ergebnis, von Probeklausur-Korrektur ersetzt

---

## Design-Prinzipien — iOS / Apple Quality Standard

DailyStudent soll sich anfühlen wie eine native Apple-App. Jede UI-Entscheidung orientiert sich an iOS-Designsprache.

### Grundprinzipien

**1. Klarheit vor Dekoration**
Jedes Element hat eine klare Funktion. Kein Ornament ohne Bedeutung. Text ist immer lesbar — nie kleiner als 10px, Haupttext ≥ 13px.

**2. Links-Ausrichtung als Standard**
Alle Widget-Inhalte, Listenpunkte und Karten-Texte sind linksbündig (`text-left`). Zentrierter Text nur für isolierte Metriken (Zahl mit Label darunter) oder leere Zustände. Buttons ohne explizites `text-left` können Browser-seitig zentrieren — immer `text-left` setzen.

**3. Tiefe durch Schatten, nicht Rahmen**
Primäre Karten: `shadow-card-adaptive` + subtiler Border (`border-border/60`). Keine harten schwarzen Borders. Schatten-Stärke signalisiert Hierarchie — float > card > flat.

**4. Konsistente Spacing-Sprache**
- Screen-Padding: `px-4`
- Card-Innenabstand: `p-4` oder `p-5`
- Widget-Icon-Padding: `px-3.5 pt-3.5`
- Gap zwischen Widgets: `gap-3` oder `space-y-3`
- Section-Label Abstand: `mb-2.5`

**5. Gradients für Akzente, nicht für Backgrounds**
Gradient-Icons: `rounded-[14px]` Pill mit farbigem Gradient + Schatten. Gradient-Buttons für primäre CTAs. Hintergrundfarben bleiben flach (`bg-surface`, `bg-background`).

**6. Icons sind immer in einem Gradient-Container**
Widget-Icons: `w-11 h-11 rounded-[14px]` (AppIconPill / GradientIcon Pattern). Icon-Farbe ist immer weiß auf farbigem Gradient. Niemals nackte Emojis als primäre Widget-Icons.

**7. Indikator-Pfeile bei navigierbaren Elementen**
Jeder Button der zu einem anderen Screen navigiert bekommt einen `<Chevron />` (`›`) am rechten Rand. Quadratische Karten: Chevron top-right via `flex items-start justify-between`. Volle Breite: Chevron am Ende der Flex-Row.

**8. Farbe kommuniziert Zustand**
- Grün (`#30D158`) = erledigt / gut / Erfolg
- Orange (`#FF9F0A`) = Warnung / bald fällig / Streak
- Rot (`#FF453A`) = kritisch / Klausur / Gefahr
- Lila (Accent `#7C3AED`) = primäre Aktion / Brand
- Teal (`#5AC8FA`) = Kalender / neutral-informativ

**9. Zahlen in Pill-Badges: immer `whitespace-nowrap`**
Streak, Counts, Badges in Pills: `inline-flex items-center gap-1 whitespace-nowrap` — verhindert Umbruch auf kleinen Phones (375px). `shrink-0` wenn neben flexiblem Text.

**10. Typografie-Hierarchie**
| Rolle | Größe | Gewicht |
|-------|-------|---------|
| Screen-Titel | 28px | 700 bold |
| Section-Label | 12px | 600 semibold, text-muted, uppercase |
| Card-Titel | 15–16px | 700 bold |
| Card-Subtitle | 12–13px | 400–500 |
| Metric groß | 28–34px | 900 black |
| Metric klein | 18px | 900 black |
| Label unter Metric | 11px | 400, text-muted |

**11. Zustandsdesign für leere Screens**
Leerzustände zeigen: Icon (groß, Gradient-Container) + Headline + kurze Erklärung + primärer CTA-Button. Kein leerer Screen ohne Handlungsaufforderung.

**12. Animationen sind subtil und schnell**
- Fade-in: `opacity 0.18s ease`
- Scale-press: `active:scale-[0.98]` oder `press-sm`
- Accordion: `max-height` transition `0.38s cubic-bezier(0.4,0,0.2,1)`
- Modal: `scale + opacity`, origin contextual, `0.2–0.28s`
- Keine Bounce-Animationen auf Datenelementen

---

## Developer-Kontext

- **Entwickler:** Simon, kein Coding-Background — arbeitet mit Claude Code in VS Code
- **Workflow:** Claude Code baut, Simon reviewed im Browser (localhost:5174), dann git commit + push
- **Git:** `git add . && git commit -m "..." && git push`
- **Wichtig:** Immer erklären was du gebaut hast und warum — keine stillen Änderungen

---

## Letzte Session (05.06.2026)

**Was gemacht wurde:**
- Gemini API Key repariert (neuer gültiger Key eingesetzt, getestet ✓)
- Dev-Profil aktualisiert: echter Stundenplan (29 Slots Mo–Fr), Fächer auf 8 erweitert (Deutsch, Mathe, Englisch, Bio, Physik, Politik, Religion, Sport)
- `HomeScreen.tsx`, `ExamModeScreen.tsx`, `ExamResultScreen.tsx` gelöscht — waren Mock-Inseln ohne echte Funktion
- `mockData.ts` bereinigt: `lessons[]`, `smartNotes[]`, `flashCards[]`, `examQuestions[]`, `mockExamResult` entfernt — nur noch `halfYears[]`, `topics[]`, `subjects[]`
- `SmartNotesScreen.tsx` auf `SUBJECT_INFO` + `userNotes` umgestellt, keine mockData-Abhängigkeit mehr
- `ProfilScreen.tsx`: Badge zeigt dynamisch "Pro"/"Free", Preis €7,99/Mo, Pro-Banner verschwindet bei aktivem isPro
- `InsightsScreen.tsx`: hardcoded 35%-Decorationbars entfernt
- `App.tsx`: Routen und Imports für gelöschte Screens entfernt

**Nächster Schritt: Lernplan Feature implementieren**
- `generateLernplan()` in `src/lib/groq.ts`
- Echter Button in `KlausurphasenScreen` ersetzt `LERNPLAN_DAYS`
- Paywall: erster Tag frei, Rest blur für Free-User
