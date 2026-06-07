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
| Persistenz | localStorage (`lernapp_v1`) → Supabase DB (Phase 3 in Arbeit) |
| KI Text + Vision | Groq API — Llama 3.3 70B (Text) + Llama 4 Scout Vision (Bilder/Scans) |
| KI Probeklausuren + Lernplan | Google Gemini — `gemini-2.5-flash` |
| Auth | Supabase Auth — Email/Passwort + Google OAuth (gebaut, noch nicht in App verdrahtet) |
| DB | Supabase PostgreSQL — Schema + RLS fertig (`supabase/migrations/001_initial_schema.sql`) |
| Payments | Stripe (Phase 3, noch nicht begonnen) |
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
    ├── Karteikarten      → generateFlashcards() via Groq → LearnModeScreen ✓
    ├── Blurting          → evaluateBlurting() via Groq → BlurtingScreen ✓
    ├── Probeklausur      → generateMode1-4Exam() via Gemini → ProbeklausurMode1-4Screen ✓
    ├── Lernzettel        → generateLernzettel() via Groq → LernzettelScreen ✓
    └── Lernplan          → generateLernplan() via Gemini → LernplanKonfiguratorScreen ✓
```

### Klausurenmodus-Screen als Hub
`KlausurphasenScreen` ist KEIN Feature-Screen — er ist eine **Übersicht/Startpunkt** für alle Lernmethoden, zeigt den nächsten Klausurtermin, Streak, Schwächefach und ermöglicht den Einstieg in alle Lernwege. Das Layout ist bewusst so gewählt. Nicht ändern ohne Rückfrage.

---

## Aktueller Stand — Phase 2 vollständig, Phase 3 in Arbeit (Stand: 06.06.2026)

### Phase 2 — vollständig funktioniert (echte KI, kein Mock):
- Onboarding Gate (Name, Klasse, Schulform, Bundesland, Fächer, Klausurtermin, Stundenplan-Scan)
- **Unterricht-Screen:** Fach-Tree mit Ordnern, Notizen erstellen, Foto-Import per Gemini KI mit auto-Ziel-Vorschlag
- **Smart Notes:** Foto/PDF/Text → Groq OCR → Groq Analyse → `GeneratedSmartNote` mit Summary, Keywords, Klausurthemen, Lösungsschritte
- **Keyword-Erklärung:** Tap auf Schlüsselbegriff → `explainKeyword()` via Groq
- **Karteikarten:** `generateFlashcards()` via Groq aus Smart Note → `LearnModeScreen` mit Deck-Verwaltung
- **Blurting:** `evaluateBlurting()` via Groq — echter KI-Vergleich mit Smart Note Inhalt
- **Probeklausur 4 Modi:** `generateMode1-4Exam()` via Gemini `gemini-2.5-flash` — echt generiert, echt korrigiert
- **Lernzettel:** `generateLernzettel()` via Groq — `LernzettelScreen` + `LernzettelGeneratorScreen` vollständig
- **Lernplan:** `generateLernplan()` via Gemini — 6-Schritt-Konfigurator (`LernplanKonfiguratorScreen`), Detailansicht (`LernplanDetailScreen`), 3 Plantypen (Einzel/Vollständig/Abitur), LK-Gewichtung, Kalender-Export, Print/PDF. Paywall: Einzel → erste 3 Tage frei, Rest blur; Vollständig + Abitur → Pro ab Schritt 1
- **KC-Daten:** 196 JSON-Dateien in `public/kc/` für 15 Bundesländer, `kcLoader.ts` vollständig, Fallback auf Niedersachsen
- **Stundenplan-Scanner:** `parseStundenplanFromImage()` via Groq Vision
- **Stats:** Streak (echt), scanCount, examCount, studiedDays — live in localStorage
- **InsightsScreen:** Notenverlauf-Chart, Fachvergleich, Wochenaktivität, KI-Lerntipps — alle Daten live
- **AbiRechnerScreen:** NP-Rechner mit Zielnote-Vergleich
- **KlausurplanScreen, HausaufgabenheftScreen, KalenderScreen** — funktionsfähig
- **FaecherEditScreen:** Fächer nachträglich hinzufügen/entfernen mit Ordner-Sync
- **FolderSystem:** Ordner, Unterordner, auto-generiert nach Halbjahr/Quartal
- **Theme:** Hell/Dunkel/System
- **isPro-Flag:** Toggle im Profil (Dev-Mode) — schaltet alle KI-Features + Paywalls app-weit

### Was noch Placeholder ist (bewusst, Phase-3-Aufgaben):
| Was | Datei | Notiz |
|-----|-------|-------|
| Einstellungs-Buttons | `ProfilScreen.tsx` | "Bundesland & Lehrplan", "Benachrichtigungen", "Datenschutz", "Account" — Buttons ohne onClick |
| "Abi-Schnitt Ø 1.7" | `ProfilScreen.tsx` | Hardcoded Marketing-Text im Pro-Banner |
| isPro via Stripe | `UserContext.tsx` | Aktuell localStorage-Flag; wird durch Stripe-Webhook + Supabase ersetzt |

### Phase 3 — Was Jan bereits gebaut hat:
- **`src/lib/supabase.ts`** — Supabase Client (braucht `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` in `.env`)
- **`src/screens/AuthScreen.tsx`** — Login/Signup Screen mit Google OAuth + Email/Passwort, deutsche Fehlermeldungen
- **`UserContext.tsx`** — `authUser`, `authLoading`, `signOut` State + `supabase.auth.onAuthStateChange` Listener
- **`supabase/migrations/001_initial_schema.sql`** — Vollständiges DB-Schema: 12 Tabellen (profiles, app_stats, user_folders, user_notes, generated_smart_notes, flashcards, lernzettel, saved_probeklausuren, lernplaene, personal_entries, standalone_homework, subscriptions), RLS für alle Tabellen, Trigger für auto-Profile-Erstellung + updated_at, Indexes

### Phase 3 — Was Simon gebaut hat (07.06.2026):
- **`supabase/functions/groq-proxy/index.ts`** — Edge Function: proxied alle Groq API Calls serverseitig. `GROQ_API_KEY` als Supabase Secret gesetzt. `src/lib/groq.ts` nutzt jetzt `supabase.functions.invoke('groq-proxy')` statt direktem Fetch.
- **`supabase/functions/gemini-proxy/index.ts`** — Edge Function: proxied alle Gemini API Calls serverseitig (flash + flash-lite). `GEMINI_API_KEY` als Supabase Secret gesetzt. `src/lib/gemini.ts` nutzt jetzt `geminiProxy()` Helper statt direktem Fetch. 503-Fallback (flash→flash-lite) bleibt erhalten.
- **Verifiziert:** API-Keys aus `.env` auskommentiert → App funktioniert weiter → Backend bestätigt.

### Phase 3 — Was noch fehlt:
1. **AuthScreen in App.tsx einbinden** — Routing: unauthenticated → AuthScreen, authenticated + onboarded → App
2. **Daten-Sync localStorage → Supabase** — alle CRUD-Operationen in UserContext auf Supabase umstellen
3. **Migration bestehender localStorage-Daten** — beim ersten Login nach Supabase hochladen
4. **Stripe Payments** — Pro-Subscription, Webhook → `subscriptions` Tabelle → `isPro` setzen
5. **Push-Benachrichtigungen** für Lernplan-Erinnerungen
6. **Responsive Layouts (iPad + Laptop) — VOR LAUNCH ZWINGEND** — Primäre Zielgruppe nutzt App im Unterricht auf iPad und in Vorlesungen auf Laptop. Handy ist sekundär (immer erreichbar). Umsetzung: Tailwind Breakpoints (`md:` iPad, `lg:` Laptop), Sidebar-Navigation statt BottomNav ab `md:`, 2-Column-Layouts wo sinnvoll. Nach Phase 3 als erste große UI-Iteration.
7. **Deployment** (Vercel/Netlify)
8. **Studentenadaption** (Uni-Fächer, kein KC aber Syllabus-Upload)

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

---

## Architektur-Entscheidungen (nicht ändern ohne Rückfrage)

- **localStorage Key:** `lernapp_v1` — bleibt als lokale Fallback-Schicht; Schema nicht brechen
- **`persist()` in UserContext:** IMMER mit `{ ...loadStorage(), ...fields }` — niemals direkt ohne Merge, sonst Datenverlust (Bug wurde 06.06.2026 gefixt)
- **isPro-Flag:** aktuell `isPro: boolean` in UserContext aus localStorage; wird durch Stripe + Supabase `subscriptions` Tabelle ersetzt
- **Groq für Text/Vision** — Llama 3.3 70B + Llama 4 Scout Vision: Kosten, Geschwindigkeit, kein Rate-Limit für Prototyp
- **Gemini für Probeklausuren + Lernplan** — `gemini-2.5-flash`: bessere Reasoning-Qualität für strukturierte Outputs; `gemini-2.5-flash-lite` für File-Import (günstiger)
- **Blur-Paywall Pattern** — für alle KI-Features bei Free-Usern beibehalten
- **TypeScript strict** — keine `any` Types einbauen
- **KlausurphasenScreen bleibt Hub** — kein Feature-Screen, nur Einstieg in die Lernmethoden
- **HomeScreen = UnterrichtScreen** — kein separater HomeScreen; `/` redirectet direkt zu `/unterricht`
- **Supabase DB-Schema:** alle User-Daten haben `user_id UUID REFERENCES profiles(id)` + RLS `auth.uid() = user_id`; subscriptions nur server-seitig schreibbar (Webhook)

---

## Umgebungsvariablen

```
VITE_GROQ_API_KEY=gsk_...           # Groq API Key (Text + Vision) — gültig
VITE_GEMINI_API_KEY=AIzaSy...       # Google Gemini API Key — gültig (neu generiert 05.06.2026)
VITE_SUPABASE_URL=https://...       # Supabase Project URL — für Phase 3
VITE_SUPABASE_ANON_KEY=eyJ...       # Supabase Anon Key — für Phase 3
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
│   └── UserContext.tsx            # Zentraler State + localStorage + Supabase Auth State
├── data/
│   ├── mockData.ts                # NUR NOCH: halfYears[], topics[], subjects[] — kein Legacy-Mock
│   ├── subjectInfo.ts             # SUBJECT_INFO + SUBJECT_GROUPS (Name, Icon, Farbe pro Fach)
│   └── kcLoader.ts                # loadKcForSubject/User(), buildKcPromptContext()
├── lib/
│   ├── groq.ts                    # Alle Groq API Calls (OCR, SmartNote, Flashcards, Blurting, Lernzettel, ...)
│   ├── gemini.ts                  # Gemini API Calls (Probeklausur + Lernplan Generierung, File-Import)
│   ├── supabase.ts                # Supabase Client (createClient mit URL + AnonKey aus .env)
│   └── pdf.ts                     # PDF → Bilder Konvertierung (pdfjs)
├── screens/                       # Ein Screen pro Route
│   ├── OnboardingScreen.tsx       # Enthält DEV_PROFILE für Skip-Button
│   ├── AuthScreen.tsx             # Login/Signup — Email + Google OAuth (noch nicht in App.tsx geroutet)
│   ├── KalenderScreen.tsx
│   ├── UnterrichtScreen.tsx       # Fach-Tree, Ordner, Foto-Import mit KI-Zielvorschlag
│   ├── LessonScreen.tsx
│   ├── FolderScreen.tsx
│   ├── SmartNotesScreen.tsx       # Notiz-Detail + KI-Analyse + Keyword-Erklärung + FC-Generator
│   ├── NoteCreateScreen.tsx
│   ├── KlausurphasenScreen.tsx    # Hub für alle Lernmethoden
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
│   ├── LernplanKonfiguratorScreen.tsx # 6-Schritt-Konfigurator → generateLernplan() via Gemini
│   ├── LernplanDetailScreen.tsx   # Lernplan-Ansicht: Tage, Sessions, Kalender-Export, Print
│   ├── KlausurplanScreen.tsx
│   ├── HausaufgabenheftScreen.tsx
│   ├── AbiRechnerScreen.tsx
│   ├── InsightsScreen.tsx         # Statistiken, Charts, Lerntipps — alle Daten live
│   ├── ProfilScreen.tsx           # Pro-Banner nur bei !isPro sichtbar
│   └── FaecherEditScreen.tsx      # Fächer hinzufügen/entfernen (Route: /profil/faecher)
└── types/
    └── index.ts                   # Alle TypeScript-Typen
public/
└── kc/                            # KC-JSONs: 15 Bundesländer × ~14 Fächer = ~196 Dateien
supabase/
└── migrations/
    └── 001_initial_schema.sql     # Vollständiges DB-Schema + RLS + Trigger + Indexes
```

**Gelöschte Screens (nicht mehr vorhanden):**
- `HomeScreen.tsx` — war ungeroutet, komplett toter Screen
- `ExamModeScreen.tsx` — Legacy Mock-Klausur, von Probeklausur-4-Modi ersetzt
- `ExamResultScreen.tsx` — Legacy Mock-Ergebnis, von Probeklausur-Korrektur ersetzt
- `SubjectListScreen.tsx` — Legacy Mock mit `mockData.subjects`, nie geroutet (gelöscht 06.06.2026)

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

- **Entwickler:** Simon (kein Coding-Background, arbeitet mit Claude Code in VS Code) + Jan (baut Supabase/Backend)
- **Workflow:** Claude Code baut, Simon reviewed im Browser (localhost:5174), dann git commit + push
- **Git:** `git add . && git commit -m "..." && git push`
- **Wichtig:** Immer erklären was du gebaut hast und warum — keine stillen Änderungen

---

## Letzte Session (06.06.2026)

**Was gemacht wurde:**
- Phase-2-Vollständigkeits-Review durchgeführt
- **Bug gefixt:** `persist()` in `UserContext.tsx` hat bei jedem Aufruf `generatedFlashCards`, `appStats`, `lernzettel`, `savedProbeklausuren`, `lernplaene` aus dem localStorage gelöscht → Fix: `{ ...loadStorage(), ...fields }` Merge-Pattern
- `SubjectListScreen.tsx` gelöscht — war Legacy-Code mit `mockData.subjects`, nie geroutet, nie importiert
- CLAUDE.md aktualisiert: Phase 2 als abgeschlossen markiert, Phase 3 Stand dokumentiert

**Was Jan in Jans PR gebaut hat (Phase 3 Start):**
- `src/lib/supabase.ts` — Supabase Client
- `src/screens/AuthScreen.tsx` — vollständiger Auth-Screen (Email + Google OAuth)
- `UserContext.tsx` erweitert um `authUser`, `authLoading`, `signOut` + Auth State Listener
- `supabase/migrations/001_initial_schema.sql` — komplettes DB-Schema

**Nächster Schritt: Phase 3 weiterbauen**
1. `AuthScreen` in `App.tsx` einbinden (Route-Guard: kein Auth → AuthScreen)
2. Daten-Sync: UserContext-Operationen auf Supabase umstellen
3. Migration: bestehende localStorage-Daten beim ersten Login hochladen
