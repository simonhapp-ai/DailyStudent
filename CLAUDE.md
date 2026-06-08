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
| Auth | Supabase Auth — Email/Passwort + Google OAuth ✅ (vollständig implementiert + geroutet) |
| DB | Supabase PostgreSQL — Schema + RLS fertig (`supabase/migrations/001_initial_schema.sql`) |
| Payments | Stripe (Scaffold existiert, Edge Function + checkout code vorhanden, aber untested) |
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

## Aktueller Stand — Phase 2 komplett, Phase 3 zu 70% in Arbeit (Stand: 08.06.2026)

### Phase 2 — 100% funktioniert (echte KI, kein Mock):
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

### Phase 3 — Was bereits fertig ist (NICHT wie dokumentiert):
- **`src/lib/supabase.ts`** ✅ — Supabase Client vollständig
- **`src/screens/AuthScreen.tsx`** ✅ — Login/Signup mit Email + Google OAuth + deutsche Fehlermeldungen — **ALREADY INTEGRATED IN APP.TX ROUTING** (Docs waren falsch)
- **`UserContext.tsx`** ✅ — `authUser`, `authLoading`, `signOut`, Auth State Listener bereits implementiert
- **`supabase/migrations/001_initial_schema.sql`** ✅ — Vollständiges DB-Schema mit 12 Tabellen, RLS, Trigger
- **`supabase/functions/groq-proxy/index.ts`** ✅ — Groq API über Edge Functions proxied, API-Keys in Supabase Secrets
- **`supabase/functions/gemini-proxy/index.ts`** ✅ — Gemini API über Edge Functions proxied (flash + flash-lite mit Fallback)
- **`supabase/functions/create-checkout-session`** ⚠️ — Stripe Edge Function existiert, aber **NICHT vollständig getestet**
- **`AbiRechnerScreen.tsx` Datenspeicherung** ✅ — Noten werden zu Supabase gespeichert, Sync-Status-Feedback für User (08.06.2026)
- **`BundeslandScreen.tsx` Fehlerbehandlung** ✅ — Profil-Updates mit Error-Handling + User-Feedback (08.06.2026)

### Phase 3 — Known Issues & Bugs (Audit 08.06.2026):

**KRITISCH (Launch-Blocker):**
1. **Responsive Layouts NOT ready** — nur `DashboardScreen` ist responsive (`md:`/`lg:` Breakpoints). Alle anderen Screens sind mobile-only. CLAUDE.md sagt "VOR LAUNCH ZWINGEND" aber nur ~10% implementiert. **FIX NEEDED:** Alle Screens mit `md:` (iPad) + `lg:` (Laptop) Layouts updaten, 2-Column-Layouts wo sinnvoll, Sidebar-Navigation ab `md:`
2. **Supabase Sync fires-and-forgets** — Alle `sync*()` Funktionen in `UserContext.tsx` catchen errors silently mit `console.warn()`. Wenn Sync fehlschlägt, bekommt der User keine Benachrichtigung → stille Datenverluste möglich. **FIX NEEDED:** Error-Handling + Retry-Logik
3. **Stripe `create-checkout-session` Edge Function untested** — Code existiert, aber kein Test, kein Production-Webhook. **FIX NEEDED:** Vollständig implementieren + testen vor Launch

**MAJOR (vor Launch fixen):**
4. **7 TypeScript `noUnusedLocals` Warnungen:**
   - `KalenderScreen.tsx`: `navigate`, `calSpIdx`, `_CalendarCollapsed`, `StundenplanTodayWidget`, `_StundenplanMiniWidget` (5 unused)
   - `KlausurphasenScreen.tsx`: `_zielnoteToNP` (1 unused)
   - `LernplanKonfiguratorScreen.tsx`: `_abortRef` (1 unused)
   **FIX NEEDED:** Entfernen oder verwenden

5. **Audio Transcription NOT implemented** — `AudioRecorderWidget.tsx` hat `// TODO: connect to Web Audio API + Whisper`. Feature ist nicht fertig. **FIX NEEDED:** Entfernen aus UI oder implementieren
6. **Note Editor NOT connected** — `NoteEditor.tsx` hat `// TODO: connect to real note editing with auto-save`. **FIX NEEDED:** Entfernen oder implementieren
7. **AbiRechnerScreen Daten-Verlust** ⚠️ **PARTIALLY FIXED (08.06.2026)** — Grades werden jetzt zu Supabase gespeichert mit Sync-Status-Feedback. Aber: Fehlerbehandlung muss noch in UserContext verbesert werden für stille Fehler.

**MINOR (sollte gefixed werden, aber nicht Launch-blocker):**
7. **Settings Screens sind Stubs** — `BenachrichtigungenScreen`, `DatenschutzScreen`, `BundeslandScreen` existieren aber sind minimal implementiert (buttons navigieren dahin, aber Screens zeigen fast nichts)
8. **Console Logs** — 20+ `console.log()` + `console.warn()` statements für Debug; sollten vor Production entfernt/reduziert werden

### Phase 3 — Was noch zu tun ist:
1. **Responsive Layouts — URGENTLY** — Alle Screens müssen `md:` (iPad) + `lg:` (Laptop) Support haben
2. **Supabase Sync Error Handling** — Retry-Logik, User-Feedback für Fehler
3. **Stripe Testing** — `create-checkout-session` Edge Function testen + Webhook validieren
4. **TypeScript Cleanup** — 7 unused variables entfernen
5. **Audio/Note Features** — Entweder implementieren oder UI entfernen
6. **Settings Screens** — Placeholder-Screens mit echtem Inhalt füllen oder entfernen
7. **Push-Benachrichtigungen** für Lernplan-Erinnerungen
8. **Deployment** (Vercel/Netlify)
9. **Studentenadaption** (Uni-Fächer, kein KC aber Syllabus-Upload)

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

## Letzte Session (08.06.2026)

**Comprehensive App Audit durchgeführt:**
- Alle 40+ Screens reviewd auf echte Fertigstellung vs. CLAUDE.md Claims
- Befund: Phase 2 AI Features 100% funktional, aber Phase 3 hat große Lücken
- **Critical Issues:** Responsive Layouts NOT ready (nur DashboardScreen responsive), Supabase-Sync errors silently fail, Stripe untested
- Docs waren teilweise falsch (Auth IS integrated, nicht "noch nicht begonnen")

**Fixes implementiert (08.06.2026):**
1. **AbiRechnerScreen** — Noten speichern jetzt zu Supabase mit visueller Bestätigung:
   - Added syncStatus state: 'saving' | 'saved' | 'error' | null
   - Header zeigt Sync-Status: "Speichern..." → "✓ Gespeichert" → auto-clear nach 2s
   - Grades werden zu `profile.abiHalbjahre` gepersisted via `updateProfile()` → Supabase
2. **BundeslandScreen** — Profil-Updates mit Error-Handling:
   - try/catch um handleSave() mit Fehler-Feedback für User
   - Button zeigt "✕ Fehler" wenn Exception auftritt
   - Error-Nachricht angezeigt: "Fehler beim Speichern. Bitte versuchen Sie es später erneut."

**CLAUDE.md aktualisiert:**
- Auth Integration Status korrigiert (war: "noch nicht begonnen", ist: ✅ DONE)
- Stripe Status korrigiert (war: "noch nicht begonnen", ist: ⚠️ scaffolded but untested)
- Responsive Layout Status korrigiert (nur 10% implementiert, nicht "ready")
- 9 Known Issues + Fixes dokumentiert
