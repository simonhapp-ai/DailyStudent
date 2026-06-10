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
| Persistenz | localStorage (`lernapp_v1`) → Supabase DB (Phase 3 aktiv) |
| KI Text + Vision | Groq API — Llama 3.3 70B (Text) + Llama 4 Scout Vision (Bilder/Scans) |
| KI Probeklausuren + Lernplan | Google Gemini — `gemini-2.5-flash` |
| Auth | Supabase Auth — Email/Passwort + Google OAuth ✅ vollständig in App.tsx geroutet |
| DB | Supabase PostgreSQL — 13 Tabellen + RLS (`supabase/migrations/`) |
| Payments | Stripe — Edge Function + Webhook ✅ Sandbox getestet |
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
`KlausurphasenScreen` ist KEIN Feature-Screen — er ist eine **Übersicht/Startpunkt** für alle Lernmethoden. Enthält: nächster Klausurtermin, Lernplan-Preview, Auswendig-Lernen-Buttons, Probeklausur + Lernzettel, Statistik-Preview-Widget (Mini-Charts + 6 Stats → navigiert zu InsightsScreen). Das Layout ist bewusst so gewählt. Nicht ändern ohne Rückfrage.

---

## Aktueller Stand — Phase 2 komplett, Phase 3 zu ~90% (Stand: 09.06.2026)

### Phase 2 — 100% funktioniert (echte KI, kein Mock):
- Onboarding Gate (Name, Klasse, Schulform, Bundesland, Fächer, Klausurtermin, Stundenplan-Scan)
- **Unterricht-Screen:** Fach-Tree mit Ordnern, Notizen erstellen, Foto-Import per Gemini KI mit auto-Ziel-Vorschlag
- **Smart Notes:** Foto/PDF/Text → Groq OCR → Groq Analyse → `GeneratedSmartNote` mit Summary, Keywords, Klausurthemen, Lösungsschritte
- **Keyword-Erklärung:** Tap auf Schlüsselbegriff → `explainKeyword()` via Groq
- **Karteikarten:** `generateFlashcards()` via Groq aus Smart Note → `LearnModeScreen` mit Deck-Verwaltung
- **Blurting:** `evaluateBlurting()` via Groq — echter KI-Vergleich mit Smart Note Inhalt
- **Probeklausur 4 Modi:** `generateMode1-4Exam()` via Gemini `gemini-2.5-flash` — echt generiert, echt korrigiert
- **Lernzettel:** `generateLernzettel()` via Groq — `LernzettelScreen` + `LernzettelGeneratorScreen` vollständig
- **Lernplan:** `generateLernplan()` via Gemini — 6-Schritt-Konfigurator (`LernplanKonfiguratorScreen`), Detailansicht (`LernplanDetailScreen`), 3 Plantypen (Einzel/Vollständig/Abitur), LK-Gewichtung, Kalender-Export (smart scheduler), Print/PDF. Paywall: Einzel → erste 3 Tage frei, Rest blur; Vollständig + Abitur → Pro ab Schritt 1
- **KC-Daten:** 196 JSON-Dateien in `public/kc/` für 16 Bundesländer, `kcLoader.ts` vollständig, Fallback auf Niedersachsen
- **Stundenplan-Scanner:** `parseStundenplanFromImage()` via Groq Vision
- **Stats:** Streak (echt), scanCount, examCount, studiedDays — live in localStorage + Supabase
- **InsightsScreen:** Notenverlauf-Chart (Q1–Q4), Fachvergleich-Balken, Wochenaktivität, KI-Lerntipps — alle Daten live
- **KlausurphasenScreen Statistik-Widget:** Mini-Balkendiagramm (Notenpunkte/Fach) + Mini-Linienchart (Notenverlauf) + 6 Stats-Kacheln (Streak, Notizen, Fotos, PK, Lernzettel, Karten) → klickt zu InsightsScreen
- **AbiRechnerScreen:** NP-Rechner mit Zielnote-Vergleich, Sync-Status-Feedback
- **KlausurplanScreen, HausaufgabenheftScreen, KalenderScreen** — funktionsfähig
- **FaecherEditScreen:** Fächer nachträglich hinzufügen/entfernen mit Ordner-Sync
- **FolderSystem:** Ordner, Unterordner, auto-generiert nach Halbjahr/Quartal
- **Theme:** Hell/Dunkel/System
- **isPro-Flag:** Toggle im Profil (Dev-Mode) — schaltet alle KI-Features + Paywalls app-weit
- **DashboardScreen:** Desktop-Landing mit Stundenplan-heute, Klausur-Countdown, Top-Notizen, Quick-Actions

### Phase 3 — Was fertig ist:
- **`src/lib/supabase.ts`** ✅ — Supabase Client vollständig
- **`src/screens/AuthScreen.tsx`** ✅ — Login/Signup mit Email + Google OAuth + deutsche Fehlermeldungen — **INTEGRIERT IN APP.TSX ROUTING**
- **`UserContext.tsx`** ✅ — `authUser`, `authLoading`, `signOut`, Auth State Listener, Sync Queue System, Retry-Logik
- **`src/lib/supabaseSync.ts`** ✅ — Sync Queue mit Retry für alle Operationen inkl. `syncGradeData`
- **`supabase/migrations/001_initial_schema.sql`** ✅ — Vollständiges DB-Schema mit 12 Tabellen, RLS, Trigger
- **`supabase/migrations/002_grade_data.sql`** ✅ — Dedizierte `grade_data` Tabelle für Notenisolation — **ANGEWENDET 09.06.2026**
- **`supabase/functions/groq-proxy/index.ts`** ✅ — Groq API über Edge Functions proxied
- **`supabase/functions/gemini-proxy/index.ts`** ✅ — Gemini API über Edge Functions proxied
- **`supabase/functions/create-checkout-session`** ✅ — Stripe Edge Function: getestet mit Sandbox-Karte, Pro-Flag wird korrekt gesetzt
- **`supabase/functions/stripe-webhook/index.ts`** ✅ — Webhook Handler: funktioniert im Sandbox-Test
- **`supabase/functions/delete-account/index.ts`** ✅ — Account-Löschung: verifiziert JWT, ruft `admin.deleteUser()` auf → CASCADE löscht alle 13 Tabellen
- **Grade Data Isolation** ✅ — `grade_data` Tabelle + `syncGradeData()` isoliert Noten vom Profile-Sync (09.06.2026)
- **Lernplan Kalender-Export** ✅ — Smart Scheduler: meidet Stundenplan + personalEntries, 15-Min-Pausen, max 90 Min/Block (09.06.2026)
- **Avatar-Editor** ✅ — `avatarEmoji` + `avatarBg` in `UserProfile`; Picker in ProfilScreen (10 Farben, 10 Emojis); Sidebar zeigt immer lila (nicht mehr grau/weiß)
- **Rechtliches (Beta-ready)** ✅ — `ImpressumScreen` (/profil/impressum) mit echten Daten; `DatenschutzScreen` vollständige DSGVO-Erklärung (10 Abschnitte); Account-Lösch-Modal direkt in ProfilScreen

### Phase 3 — Known Issues & Bugs (Stand: 09.06.2026):

**Kein Launch-Blocker mehr** — Responsive Layouts funktionieren (iPad Querformat = Desktop Layout, Hochformat = Mobile), Stripe im Sandbox getestet und funktioniert.

**MAJOR (vor Public Launch fixen):**
1. **TypeScript `noUnusedLocals` Warnungen:**
   - `KalenderScreen.tsx`: `navigate`, `calSpIdx`, `_CalendarCollapsed`, `StundenplanTodayWidget`, `_StundenplanMiniWidget` (5 unused)
   - `KlausurphasenScreen.tsx`: `_zielnoteToNP` (1 unused)
   - `LernplanKonfiguratorScreen.tsx`: `_abortRef` (1 unused)
   **FIX NEEDED:** Entfernen oder verwenden
2. **Audio Transcription NOT implemented** — `AudioRecorderWidget.tsx`: Feature nicht fertig. **FIX NEEDED:** Entfernen aus UI
3. **Note Editor NOT connected** — `NoteEditor.tsx`: kein Auto-Save verbunden. **FIX NEEDED:** Entfernen oder implementieren

**MINOR:**
4. **Apple OAuth** — Button in AuthScreen vorhanden, aber NICHT GETESTET
5. **Email Confirmation Flow** — kein UI-Hinweis nach Signup
6. **Impressum Steuernummer** — Platzhalter, muss nach Erhalt vom Finanzamt Harburg nachgetragen werden

**Rechtliches — Beta-ready ✅:**
- Impressum: Simon Happ / Simon Happ Social Media, Henners Hof 13, 21217 Seevetal — Steuernummer fehlt noch
- Datenschutzerklärung: vollständig, 10 Abschnitte, DSGVO-konform
- Account-Löschung: DSGVO Art. 17 erfüllt via `delete-account` Edge Function
- Vor zahlenden Nutzern noch nötig: AGB + Stripe Production-Mode

### Phase 3 — Was noch zu tun ist:
1. ~~**Deployment** (Vercel) — höchste Priorität~~ ✅ deployed auf dailystudent.de (10.06.2026)
2. **`delete-account` Edge Function deployen** — `supabase functions deploy delete-account`
3. ~~**TypeScript Cleanup**~~ ✅ erledigt (10.06.2026)
4. **Audio/NoteEditor aus UI entfernen** — unfertige Features nicht sichtbar lassen
5. **Email Confirmation Flow** — Hinweis nach Signup
6. ~~**Stripe Production-Mode**~~ ✅ Live-Keys + Live-Preise gesetzt (10.06.2026)
7. **AGB** — vor zahlenden Nutzern (Generator reicht)
8. **Steuernummer ins Impressum** — nach Eingang vom Finanzamt
9. **Push-Benachrichtigungen** — nach Launch
10. **Studentenadaption** — nach Launch
11. **Import-Funktion prüfen** — vollständigen Import-Flow testen und Bugs fixen

---

## Upcoming Features (Roadmap)

### Kurzfristig (nächste Wochen)
- **Pro Lernzettel Preview** — neuer Screen in der Lernzettel-Konfiguration der Pro-Lernzettel vorschaut (Claude Haiku, beiger Hintergrund, SVG-Diagramme, Flip-Cards)
- **Schreibscreen Update** — mehr Stifte, mehr Auswahl, cleaneres UI

### Mittelfristig (2–3 Monate)
- **Referral-Promo: 5 Freunde = 30 Tage Pro gratis** — eigener Referral-Code pro User, bei 5 erfolgreichen Signups bekommt Einlader 30 Tage Pro automatisch freigeschaltet (ohne Stripe-Verbindung). Braucht: `referrals` Tabelle in Supabase, Referral-Code-Generator, Tracking-Logik
- **14-Tage-Pro für neue User** — bei Signup automatisch 14 Tage Pro ohne Kreditkarte. Braucht: `trial_ends_at` Feld in `profiles`, Ablauf-Check in `isPro`-Logik
- **Working Streak-Animation** — sichtbare Animation wenn Streak-Meilensteine erreicht werden (z.B. 7, 30, 100 Tage)
- **Screen-Transition-Animation** — sanfte Übergangsanimation zwischen Klausurmodus und Unterrichtsmodus

### Langfristig (nach Launch)
- **Studentenadaption** — Uni-spezifische Features, ECTS, Semesterplanung

---

## Supabase DB-Schema — 13 Tabellen (Stand 09.06.2026)

| Tabelle | Inhalt |
|---------|--------|
| `profiles` | Name, Klasse, Schulform, Bundesland, Fächer, Klausurtermine, Stundenplan (JSONB), Abi-Gesamtnote, Theme, isPro, isDevMode |
| `grade_data` | `abi_halbjahre` (JSONB) — **dedizierte, isolierte Notentabelle**, verhindert Überschreiben durch Profile-Sync |
| `app_stats` | Streak, scanCount, examCount, lastStudyDate, studiedDays[], examScores[] |
| `user_folders` | Fach-Ordner-Baum mit Eltern-Kind-Beziehung |
| `user_notes` | Alle Notizen (Text/Foto/PDF), attachments, homework_items, qa |
| `generated_smart_notes` | KI-Analyse-Ergebnis pro Notiz (summary, keywords, examTopics, solution) |
| `flashcards` | Alle Karteikarten mit front/back/subjectId |
| `lernzettel` | Generierte Lernzettel mit Inhalt und Metadaten |
| `saved_probeklausuren` | Abgeschlossene Klausurversuche mit KI-Korrektur |
| `lernplaene` | Generierte Lernpläne (days JSONB, config JSONB) |
| `personal_entries` | Kalendereinträge (lerneinheit/termin/erinnerung) |
| `standalone_homework` | Hausaufgaben ohne Notiz-Kontext |
| `subscriptions` | Stripe-Abonnements (nur server-seitig schreibbar via Webhook) |

**RLS:** Jede Tabelle hat RLS — User kann nur eigene Rows lesen/schreiben (`auth.uid() = user_id`).

---

## KC-Daten — vollständig implementiert

KC-Daten liegen als JSON-Dateien in `public/kc/{Bundesland}/{fach}.json`.

**Verfügbare Bundesländer:** Baden-Württemberg, Bayern, Berlin, Brandenburg, Bremen, Hamburg, Hessen, Mecklenburg-Vorpommern, Niedersachsen, NRW, Rheinland-Pfalz, Saarland, Sachsen, Sachsen-Anhalt, Schleswig-Holstein, Thüringen (Fallback auf Niedersachsen)  
**Fallback:** Niedersachsen

**kcLoader.ts** (`src/data/kcLoader.ts`):
- `loadKcForSubject(bundeslandId, subjectId)` — lädt JSON async, fällt auf Niedersachsen zurück
- `loadKcForUser(bundeslandId, faecher[])` — lädt alle Fächer parallel
- `buildKcPromptContext(kc, stufe)` — baut kompakten KC-String für Prompt-Injection

---

## Architektur-Entscheidungen (nicht ändern ohne Rückfrage)

- **localStorage Key:** `lernapp_v1` — bleibt als lokale Fallback-Schicht; Schema nicht brechen
- **`persist()` in UserContext:** IMMER mit `{ ...loadStorage(), ...fields }` — niemals direkt ohne Merge, sonst Datenverlust (Bug 06.06.2026)
- **Grade Data Isolation:** `abiHalbjahre` wird über `syncGradeData()` in die dedizierte `grade_data` Tabelle geschrieben. Beim Laden: `grade_data` hat Priorität vor `profiles.abi_halbjahre`. Nie grades nur über `syncProfile` schreiben!
- **isPro-Flag:** aktuell `isPro: boolean` in UserContext; wird durch Stripe + Supabase `subscriptions` Tabelle ersetzt. Dev-Mode-Accounts vertrauen dem manuellen Flag.
- **Groq für Text/Vision** — Llama 3.3 70B + Llama 4 Scout Vision: Kosten, Geschwindigkeit
- **Gemini für Probeklausuren + Lernplan** — `gemini-2.5-flash`: bessere Reasoning-Qualität
- **Blur-Paywall Pattern** — für alle KI-Features bei Free-Usern beibehalten
- **TypeScript strict** — keine `any` Types einbauen
- **KlausurphasenScreen bleibt Hub** — kein Feature-Screen, nur Einstieg in die Lernmethoden
- **HomeScreen = UnterrichtScreen** — kein separater HomeScreen; `/` redirectet direkt zu `/unterricht`
- **Lernplan Kalender-Export:** `addToCalendar()` in `LernplanDetailScreen` baut Busy-Intervalle aus Stundenplan + personalEntries und platziert Sessions in freien Fenstern. Max 90 Min/Block, 15-Min-Pausen. Preferences: morgen=0–13h first, abend=13–24h first, beides=chronologisch.

---

## Umgebungsvariablen

```
VITE_GROQ_API_KEY=gsk_...           # Groq API Key (Text + Vision) — gültig
VITE_GEMINI_API_KEY=AIzaSy...       # Google Gemini API Key — gültig
VITE_SUPABASE_URL=https://...       # Supabase Project URL
VITE_SUPABASE_ANON_KEY=eyJ...       # Supabase Anon Key
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

## Screens (33 total — alle geroutet, alle funktionsfähig)

| Screen | Route | Funktion |
|--------|-------|---------|
| AuthScreen | /auth | Login/Signup Email + Google OAuth |
| OnboardingScreen | (gate) | 9-Schritt-Onboarding mit Stundenplan-Scan |
| DashboardScreen | /dashboard | Desktop-Landing, heute-Übersicht |
| UnterrichtScreen | /unterricht | Fach-Tree, Ordner, Foto-Import |
| LessonScreen | /unterricht/:id | Fach-Detail, alle Notizen |
| FolderScreen | /unterricht/:id/ordner/:folderId | Ordner-Ansicht |
| NoteCreateScreen | .../neue-notiz | Notiz erstellen (5 Block-Typen) |
| SmartNotesScreen | .../notiz/:lessonId | Notiz-Detail + KI-Analyse |
| KalenderScreen | /kalender | Wochen-/Monatskalender + Einträge |
| HausaufgabenheftScreen | /hausaufgaben | Hausaufgaben-Tracker |
| KlausurplanScreen | /klausuren | Klausurtermine verwalten |
| AbiRechnerScreen | /abi-rechner | NP-Rechner Q1–Q4 mit Zielnote |
| KlausurphasenScreen | /klausurmodus | Hub für alle Lernmethoden |
| LearnModeScreen | /klausurmodus/lernen | Karteikarten-Lern-Session |
| FlashCardGeneratorScreen | /klausurmodus/karteikarten/neu | Karteikarten generieren |
| BlurtingScreen | /klausurmodus/blurting | Blurting + KI-Bewertung |
| LernzettelScreen | /klausurmodus/lernzettel | Lernzettel-Bibliothek |
| LernzettelGeneratorScreen | /klausurmodus/lernzettel/neu | Lernzettel generieren |
| ProbeklausurMenuScreen | /klausurmodus/probeklausur | Probeklausur-Hub |
| ProbeklausurMode1Screen | .../afb-trainer | AFB I–III Trainer |
| ProbeklausurMode2Screen | .../vollstaendige-klausur | 90-Min-Klausur |
| ProbeklausurMode3Screen | .../materialklausur | Material-Klausur |
| ProbeklausurMode4Screen | .../ohne-material | Ohne Material |
| ProbeklausurRetroScreen | .../retrospektive | Alle PK-Ergebnisse |
| LernplanListScreen | /klausurmodus/lernplan | Alle Lernpläne |
| LernplanKonfiguratorScreen | /klausurmodus/lernplan/neu | 6-Schritt-Generator |
| LernplanDetailScreen | /klausurmodus/lernplan/:id | Tages-Ansicht + Kalender-Export |
| InsightsScreen | /insights | Statistiken, Charts, Lerntipps |
| ProfilScreen | /profil | User-Settings, Pro-Toggle |
| FaecherEditScreen | /profil/faecher | Fächer hinzufügen/entfernen |
| BundeslandScreen | /profil/bundesland | Bundesland + Schulform ändern |
| BenachrichtigungenScreen | /profil/benachrichtigungen | Notification-Toggles (UI only) |
| DatenschutzScreen | /profil/datenschutz | Vollständige DSGVO-Datenschutzerklärung + Account-Löschung |
| ImpressumScreen | /profil/impressum | Impressum gem. §5 TMG |

---

## Wichtige Dateien / Struktur

```
src/
├── app/
│   └── App.tsx                   # Router, ErrorBoundary, ThemeApplier, Layout, Auth-Gate
├── components/
│   ├── lesson/
│   │   ├── FotoScannerWidget.tsx  # Kamera-Zugriff + Foto-Capture
│   │   ├── AudioRecorderWidget.tsx # Web Audio API (UNFERTIG — kein Whisper)
│   │   └── NoteEditor.tsx        # Text-Editor (UNFERTIG — kein Auto-Save)
│   ├── learn/
│   │   ├── FlashCard.tsx         # Karteikarte mit Flip-Mechanik
│   │   ├── ExamQuestion.tsx      # Klausur-Frage-Display
│   │   └── AIFeedbackCard.tsx    # KI-Korrektur-Display
│   └── ui/                       # Button, Card, Badge, BottomNav, DesktopSidebar,
│                                 # Header, ProModal, BottomSheet, LernvorschlagWidget,
│                                 # SyncErrorBanner, KcFallbackBanner, MathRenderer, ...
├── context/
│   └── UserContext.tsx            # Zentraler State + localStorage + Supabase Auth + Sync Queue
├── data/
│   ├── mockData.ts                # halfYears[], topics[], subjects[] (Legacy-Stubs, kein Mock mehr)
│   ├── subjectInfo.ts             # SUBJECT_INFO + SUBJECT_GROUPS (Name, Icon, Farbe pro Fach)
│   └── kcLoader.ts                # loadKcForSubject/User(), buildKcPromptContext()
├── lib/
│   ├── groq.ts                    # Alle Groq API Calls (OCR, SmartNote, Flashcards, Blurting, Lernzettel, ...)
│   ├── gemini.ts                  # Gemini API Calls (Probeklausur, Lernplan, File-Import)
│   ├── supabase.ts                # Supabase Client
│   ├── supabaseSync.ts            # Sync-Layer: syncProfile, syncGradeData, syncNote, etc. + Queue
│   └── pdf.ts                     # PDF → Bilder Konvertierung (pdfjs)
├── screens/                       # Ein Screen pro Route (35 Screens — alle aktiv)
└── types/
    └── index.ts                   # Alle TypeScript-Typen
public/
└── kc/                            # KC-JSONs: 16 Bundesländer × ~12 Fächer = ~196 Dateien
supabase/
├── migrations/
│   ├── 001_initial_schema.sql     # 13 Tabellen, RLS, Trigger — ANGEWENDET
│   └── 002_grade_data.sql         # grade_data Tabelle — ANGEWENDET 09.06.2026
└── functions/
    ├── groq-proxy/                # Groq API Proxy (deployed)
    ├── gemini-proxy/              # Gemini API Proxy (deployed)
    ├── create-checkout-session/   # Stripe Checkout (deployed, Sandbox getestet)
    ├── stripe-webhook/            # Stripe Webhook Handler (deployed, Sandbox getestet)
    └── delete-account/            # Account-Löschung (MUSS NOCH DEPLOYED WERDEN)
```

**Gelöschte Screens (nicht mehr vorhanden):**
- `HomeScreen.tsx`, `ExamModeScreen.tsx`, `ExamResultScreen.tsx`, `SubjectListScreen.tsx`

---

## Design-Prinzipien — iOS / Apple Quality Standard

DailyStudent soll sich anfühlen wie eine native Apple-App.

**1. Klarheit vor Dekoration** — Kein Ornament ohne Bedeutung. Text ≥ 10px, Haupttext ≥ 13px.

**2. Links-Ausrichtung als Standard** — `text-left` überall außer isolierte Metriken oder Leerzustände.

**3. Tiefe durch Schatten** — `shadow-card-adaptive` + `border-border/60`. Keine harten Borders.

**4. Konsistente Spacing-Sprache**
- Screen-Padding: `px-4`
- Card-Innenabstand: `p-4` oder `p-5`
- Gap zwischen Widgets: `gap-3` oder `space-y-3`
- Section-Label Abstand: `mb-2.5`

**5. Gradient-Icons** — `w-11 h-11 rounded-[14px]` (GradientIcon Pattern). Weiß auf Gradient. Keine nackten Emojis als primäre Widget-Icons.

**6. Chevron bei Navigation** — Jeder navigierende Button bekommt `<Chevron />` rechts.

**7. Farbe kommuniziert Zustand**
- Grün (`#30D158`) = erledigt / Erfolg
- Orange (`#FF9F0A`) = Warnung / Streak
- Rot (`#FF453A`) = kritisch / Klausur
- Lila Accent (`#7C3AED`) = primäre Aktion / Brand
- Teal (`#5AC8FA`) = Kalender / neutral

**8. Typografie-Hierarchie**
| Rolle | Größe | Gewicht |
|-------|-------|---------|
| Screen-Titel | 28px | 700 bold |
| Section-Label | 12px | 600 semibold, text-muted, uppercase |
| Card-Titel | 15–16px | 700 bold |
| Card-Subtitle | 12–13px | 400–500 |
| Metric groß | 28–34px | 900 black |

**9. Zustandsdesign** — Leere Screens: Icon + Headline + Erklärung + CTA-Button.

**10. Animationen** — `active:scale-[0.98]`, transitions max 0.28s, keine Bounce-Animationen.

---

## Developer-Kontext

- **Entwickler:** Simon (kein Coding-Background, arbeitet mit Claude Code in VS Code) + Jan (Simons Helfer)
- **Workflow:** Claude Code baut, Simon reviewed im Browser (localhost:5174), dann git commit + push
- **Git:** `git add . && git commit -m "..." && git push`
- **Wichtig:** Immer erklären was gebaut wurde und warum — keine stillen Änderungen

---

## Letzte Session (09.06.2026)

**Beta-Vorbereitung: Rechtliches + Avatar + Security-Review**

**1. Avatar-Editor (ProfilScreen + DesktopSidebar + UserContext)**
- `avatarEmoji?: string` + `avatarBg?: string` zu `UserProfile` hinzugefügt
- Profilkreis in beiden Sidebars zeigt jetzt immer lila (vorher grau/weiß je nach Theme)
- Inline-Picker in ProfilScreen: 10 Farbverläufe + 10 Schul-Emojis, auto-save via `updateProfile()`
- Edit-Badge (Bleistift) auf Avatar-Kreis als Hinweis

**2. Rechtliches — Beta-ready**
- `ImpressumScreen.tsx` neu erstellt (`/profil/impressum`) — befüllt mit echten Daten (Simon Happ / Simon Happ Social Media, Henners Hof 13, 21217 Seevetal)
- `DatenschutzScreen.tsx` komplett neu geschrieben — 10 Abschnitte, vollständige DSGVO-Erklärung
- Steuernummer fehlt noch (Platzhalter) — nach Eingang vom Finanzamt Harburg nachtragen
- Links in ProfilScreen: "Datenschutzerklärung" + "Impressum" unter Einstellungen

**3. Account-Löschung (DSGVO Art. 17)**
- `supabase/functions/delete-account/index.ts` neu — verifiziert JWT, ruft `admin.deleteUser()` auf, CASCADE löscht alle 13 Tabellen automatisch
- Lösch-Modal direkt in ProfilScreen (Account-Sektion): sofortiges Popup, "löschen" eintippen, dann Edge Function + localStorage clear + signOut
- `DatenschutzScreen` hat ebenfalls Lösch-Button (für User die über den Datenschutz-Screen navigieren)
- **TODO:** `supabase functions deploy delete-account` — noch nicht deployed!
