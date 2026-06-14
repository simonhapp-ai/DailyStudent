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
**Monetarisierung:** Freemium — Free Tier mit Lock-Paywall (kein Blur!), Pro für €7,99/Mo oder €59,99/Jahr

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
| Payments | Stripe — Edge Function + Webhook ✅ Live-Mode aktiv |
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

## Aktueller Stand — Phase 2 komplett, Phase 3 zu ~99% (Stand: 14.06.2026)

### Phase 2 — 100% funktioniert (echte KI, kein Mock):
- Onboarding Gate (Name, Klasse, Schulform, Bundesland, Fächer, Klausurtermin, Stundenplan-Scan)
- **Unterricht-Screen:** Fach-Tree mit Ordnern, Notizen erstellen, Foto-Import per Gemini KI mit auto-Ziel-Vorschlag
- **Smart Notes:** Foto/PDF/Text → Groq OCR → Groq Analyse → `GeneratedSmartNote` mit Summary, Keywords, Klausurthemen, Lösungsschritte
- **Keyword-Erklärung:** Tap auf Schlüsselbegriff → `explainKeyword()` via Groq
- **Karteikarten:** `generateFlashcards()` via Groq aus Smart Note → `LearnModeScreen` mit Deck-Verwaltung
- **Blurting:** `evaluateBlurting()` via Groq — echter KI-Vergleich mit Smart Note Inhalt
- **Probeklausur 4 Modi:** `generateMode1-4Exam()` via Gemini `gemini-2.5-flash` — echt generiert, echt korrigiert
- **Lernzettel:** `generateLernzettel()` via Groq — `LernzettelScreen` + `LernzettelGeneratorScreen` vollständig
- **Lernplan:** `generateLernplan()` via Gemini — 6-Schritt-Konfigurator (`LernplanKonfiguratorScreen`), Detailansicht (`LernplanDetailScreen`), 3 Plantypen (Einzel/Vollständig/Abitur), LK-Gewichtung, Kalender-Export (smart scheduler), Print/PDF
- **KC-Daten:** 196 JSON-Dateien in `public/kc/` für 16 Bundesländer, `kcLoader.ts` vollständig, Fallback auf Niedersachsen
- **Stundenplan-Scanner:** `parseStundenplanFromImage()` via Groq Vision
- **Stats:** Streak (echt), scanCount, examCount, studiedDays — live in localStorage + Supabase
- **InsightsScreen:** Notenverlauf-Chart (Q1–Q4), Fachvergleich-Balken, Wochenaktivität, KI-Lerntipps — alle Daten live
- **KlausurphasenScreen Statistik-Widget:** Mini-Balkendiagramm (Notenpunkte/Fach) + Mini-Linienchart (Notenverlauf) + 6 Stats-Kacheln (Streak, Notizen, Fotos, PK, Lernzettel, Karten) → klickt zu InsightsScreen
- **AbiRechnerScreen:** NP-Rechner mit Zielnote-Vergleich, Sync-Status-Feedback
- **KlausurplanScreen, HausaufgabenheftScreen, KalenderScreen** — funktionsfähig
- **FaecherEditScreen:** Fächer hinzufügen/entfernen + Custom Fächer (Accordion-Widget, Supabase-sync)
- **FolderSystem:** Ordner, Unterordner, auto-generiert nach Halbjahr/Quartal
- **Theme:** Hell/Dunkel/System
- **isPro-Flag:** Toggle im Profil (Dev-Mode) — schaltet alle KI-Features + Paywalls app-weit
- **DashboardScreen:** Desktop-Landing mit Stundenplan-heute, Klausur-Countdown, Top-Notizen, Quick-Actions

### Phase 3 — Was fertig ist:
- **`src/lib/supabase.ts`** ✅ — Supabase Client vollständig
- **`src/screens/AuthScreen.tsx`** ✅ — Login/Signup mit Email + Google OAuth + deutsche Fehlermeldungen
- **`UserContext.tsx`** ✅ — `authUser`, `authLoading`, `signOut`, Auth State Listener, Sync Queue System, Retry-Logik
- **`src/lib/supabaseSync.ts`** ✅ — Sync Queue mit Retry für alle Operationen inkl. `syncGradeData`
- **`supabase/migrations/001_initial_schema.sql`** ✅ — Vollständiges DB-Schema mit 13 Tabellen, RLS, Trigger
- **`supabase/migrations/002_grade_data.sql`** ✅ — Dedizierte `grade_data` Tabelle — ANGEWENDET 09.06.2026
- **`supabase/migrations/003_custom_faecher.sql`** ✅ — `custom_faecher JSONB` Spalte in `profiles` — **ANGEWENDET 14.06.2026**
- **`supabase/functions/groq-proxy/`** ✅ — deployed
- **`supabase/functions/gemini-proxy/`** ✅ — deployed
- **`supabase/functions/create-checkout-session/`** ✅ — Stripe Checkout, Live-Mode aktiv
- **`supabase/functions/stripe-webhook/`** ✅ — Webhook Handler, Live-Mode aktiv
- **`supabase/functions/delete-account/`** ✅ — **DEPLOYED 10.06.2026** — verifiziert JWT, ruft `admin.deleteUser()` auf → CASCADE löscht alle 13 Tabellen
- **Grade Data Isolation** ✅ — `grade_data` + `syncGradeData()` isoliert Noten vom Profile-Sync
- **Lernplan Kalender-Export** ✅ — Smart Scheduler mit Stundenplan-Konfliktvermeidung
- **Avatar-Editor** ✅ — `avatarEmoji` + `avatarBg` in `UserProfile`; Picker in ProfilScreen
- **Paywall-Redesign** ✅ — Kein Blur mehr. Klare Lock-Cards zeigen was man verpasst. ProModal (`src/components/ui/ProModal.tsx`) mit echtem Stripe-Checkout. Erscheint als Bottom Sheet.
- **Pro badges hidden when isPro** ✅ — `ProbeklausurMenuScreen` + `LernplanKonfiguratorScreen`: Badges verschwinden wenn `isPro = true`
- **Rechtliches — vollständig** ✅:
  - `ImpressumScreen` (`/profil/impressum`) — echte Daten, Steuernummer noch ausstehend
  - `DatenschutzScreen` (`/profil/datenschutz`) — 10 Abschnitte, DSGVO-konform, Account-Lösch-Button
  - `AGBScreen` (`/profil/agb`) — 29 Sektionen (inkl. 22a KI-Haftungsausschluss), Termly-generiert; Streitschlichtungshinweis (OS-Plattform) entfernt (Abmahngefahr)
  - Account-Löschung: DSGVO Art. 17 via `delete-account` Edge Function ✅ deployed
- **LandingScreen** ✅ (`/landing`) — öffentliche Marketing-Seite, Framer Motion, Floating Bubble Navbar, Hero, Features, Pricing, Footer; conditional root: Unauthenticated → `/landing`, authenticated → App
- **Bug-Report Widget** ✅ — Accordion-Card in ProfilScreen (kein Floating Button mehr), EmailJS
- **Nav UX — Emil Kowalski Style** ✅ — Hover-Scale (1.08×), neutrale Grau-Highlights, `.nav-btn` + `.nav-active` CSS-Klassen (kein Inline-Hintergrund), Gold-shimmer Pro Badge (10s-Zyklus)
- **App Icons** ✅ — `public/icon.svg`: transparenter Hintergrund, Motiv 1.22× gezoomt; `logo.png` in Nav + Footer per `scale(1.38)` transform gezoomt
- **Custom Fächer Supabase-Sync** ✅ — `custom_faecher JSONB` Column via Migration `003_custom_faecher.sql`; SQL angewendet 14.06.2026
- **Landing Page Scroll-Animationen** ✅ — `FadeUp` bidirektional (`once: false`), reverse beim Hochscrollen, kein Stagger beim Exit
- **Rechtliches-Sektion im ProfilScreen** ✅ — Impressum, Datenschutz, AGB in eigene Sektion ganz unten ausgelagert
- **Touch-Animation Polish** ✅ — `.press:active` auf `scale(0.985)`, `hover-lift` nur mit `@media (hover: hover) and (pointer: fine)` → kein Distorting auf Touchscreens
- **Karteikarten-Generator Rewrite** ✅ — 3-Schritt-Flow: Fach → Notizen (Multi-Select) → Methode (KI/Manuell); wählbare Anzahl (5/10/15/20); manuelle Karten per Textarea-Paare; Custom Fächer via `resolveSubjectInfo()` sichtbar; Flip-Bug gefixt (`key={cardIndex}`)
- **Probeklausur AFB-Operatoren Mathe** ✅ — `GENERATION_SYSTEM` in `gemini.ts` mit separaten Operator-Listen für Textfächer vs. Mathematik (AFB I–III)
- **Probeklausur Mode 3 Materialtyp-Branching** ✅ — Geisteswissenschaften/Sprachen: Sachtext ~300 Wörter; Naturwissenschaften/Mathe: Messreihen + Tabellen
- **Pro Lernzettel Preview** ✅ — `LernzettelScreen`: horizontales Karussell mit 4 Original-Lernzettel-HTMLs (aus Uploads extrahiert), skaliert als Preview-Cards; Fullscreen-Modal mit scrollbarem iframe; Gold-"Pro Lernzettel"-Badge in Topbar der HTMLs; CTA nur für Free-User; "Tippen zum Anzeigen" Caption

### Paywall-Strategie (Stand 10.06.2026):

| Feature | Free | Pro |
|---------|------|-----|
| Smart Notes (OCR + Analyse) | ✅ unbegrenzt | ✅ |
| Karteikarten generieren | ✅ unbegrenzt | ✅ |
| Blurting | ✅ unbegrenzt | ✅ |
| Lernzettel | 1/Tag | ✅ unbegrenzt |
| Probeklausur — Vollständige (Mode 2) | 1/Tag | ✅ unbegrenzt |
| Probeklausur — AFB Trainer (Mode 1) | ❌ ProModal | ✅ |
| Probeklausur — Materialklausur (Mode 3) | ❌ ProModal | ✅ |
| Probeklausur — Ohne Material (Mode 4) | ❌ ProModal | ✅ |
| KI-Korrektur (alle PK-Modi) | ❌ Lock-Card | ✅ |
| Lernplan Einzel | ✅ | ✅ |
| Lernplan Vollständig | ❌ ProModal | ✅ |
| Lernplan Abitur | ❌ ProModal | ✅ |

**Paywall-Pattern:** Kein Blur. Free-User sehen eine klare Lock-Card mit konkreten Feature-Bullets. Klick öffnet `ProModal` als Bottom Sheet von unten mit Stripe-Checkout.  
**ProModal:** `src/components/ui/ProModal.tsx` — `feature` Prop steuert Headline + Bullets. Stripe-Checkout direkt im Modal.

### Known Issues (Stand: 14.06.2026):

**MINOR:**
1. **Apple OAuth** — Button in AuthScreen vorhanden, aber NICHT GETESTET
2. **Email Confirmation Flow** — kein UI-Hinweis nach Signup
3. **Impressum Steuernummer** — Platzhalter, nach Eingang vom Finanzamt Harburg nachtragen

### To-Do — Priorisiert (Stand: 14.06.2026):

#### UX / Features:
1. **Dashboard verbessern** (`DashboardScreen`) — übersichtlicheres Layout, bessere Stundenplananzeige (heute hervorgehoben, nächste Stunde prominent), Quick-Actions klarer, Klausur-Countdown prominenter
2. **Tutorial / Onboarding-Walkthrough** — nach dem Onboarding einen kurzen interaktiven Tutorial-Modus: zeigt die wichtigsten Screens (Unterricht → Smart Note → Karteikarten → Klausurmodus), max. 4–5 Schritte, überspringbar, nur beim ersten Login
3. **Lernplan funktionieren lassen** — Flow komplett testen: Konfigurator → Gemini → Detailansicht → Kalender-Export, bekannte Bugs fixen
4. **Beta-Referral-System** — siehe Roadmap unten, vollständige Spec
5. **Notenrechner UI** — ausklappbare Fach-Kacheln, Farbcoding grün/orange/rot
6. **Landing Page Content** — Hero-Text, Feature-Sektionen, Social Proof verbessern
7. **Import-Flow** — vollständig testen + Bugs fixen
8. **Email Confirmation Flow** — Hinweis nach Signup

#### Nach Launch:
9. **Steuernummer ins Impressum** — nach Eingang vom Finanzamt
10. **Push-Benachrichtigungen**
11. **Studentenadaption**

---

## Upcoming Features (Roadmap)

### Nächste Session (priorisiert)

#### 1. Beta-Referral-System — 14 Tage Pro bei 5 Signups
**Ziel:** Beta-Tester (Discord-Community) erhalten 14 Tage Pro gratis, wenn 5 neue echte User über ihren Link/QR-Code sich registrieren.

**Spec:**
- Jeder neue User bekommt automatisch einen persönlichen Referral-Code (z.B. `SIMON-X4K2`) bei Signup
- Referral-Link: `dailystudent.de/?ref=SIMON-X4K2`
- QR-Code im ProfilScreen — zeigt auf den Referral-Link (kein externes Paket nötig: `https://api.qrserver.com/v1/create-qr-code/?data=URL` oder `qrcode`-NPM)
- IP-Tracking beim Signup: Supabase Edge Function speichert IP der neuen Anmeldung — verhindert Fake-Accounts von derselben IP (max. 1 Signup pro IP pro Referral-Code)
- Bei 5 validen Referrals → `trial_ends_at = now() + 14 days` beim Referrer setzen (kein Stripe!)
- `isPro` Logik in `UserContext`: `isPro = isPro || (trial_ends_at && new Date(trial_ends_at) > new Date())`
- Counter im ProfilScreen: "3/5 Freunden eingeladen — noch 2 bis 14 Tage Pro"

**Braucht:**
- Supabase Migration: `referral_code TEXT UNIQUE` + `trial_ends_at TIMESTAMPTZ` in `profiles`
- Neue Tabelle `referrals`: `id, referrer_id, referee_id, referee_ip, created_at, is_valid BOOL`
- Edge Function `handle-referral`: aufgerufen nach Signup, prüft IP, trägt Referral ein, zählt valide Referrals, setzt ggf. `trial_ends_at`
- `UserContext`: `trial_ends_at` laden, `isPro`-Check erweitern
- `ProfilScreen`: QR-Code-Widget + Counter-Card + Share-Button (Link kopieren)
- `AuthScreen`/`OnboardingScreen`: `?ref=CODE` aus URL auslesen und bei Signup übergeben

#### 2. Claude Lernzettel Preview (Teaser)
**Ziel:** Free- und Pro-User sehen eine Vorschau des kommenden "Claude Pro Lernzettel"-Features. Noch nicht implementiert — nur UI-Teaser.

**Spec:**
- Teaser-Card in `LernzettelScreen` (Bibliothek-Ansicht) und/oder in `LernzettelGeneratorScreen`
- Design: beiger/warmer Hintergrund (`#FDF6E3`), Claude-Logo-ähnliches Icon, Badge "Nächstes Update"
- Bullet-Liste der geplanten Features: SVG-Diagramme, Flip-Cards, Eselsbrücken, strukturierte Übersichten
- Button "Benachrichtigen" (UI only, kein Backend nötig — einfach "Danke, du wirst informiert!" Toast)

#### 3. Custom Fach (ohne KC)
**Ziel:** User kann ein eigenes Fach mit selbst gewähltem Namen anlegen — kein KC verfügbar, kein Fehler.

**Spec:**
- In `FaecherEditScreen`: "+Eigenes Fach" Button → Modal mit Textfeld für Fachname + Icon-Auswahl (Emoji)
- Custom-Fächer bekommen eine generische ID wie `custom_mathe2` oder `custom_{uuid}`
- In `SUBJECT_INFO`: Custom-Fächer dynamisch aus `profile.faecher` laden — Fallback-Icon 📚, Farbe neutral grau
- KC-Anbindung: `loadKcForSubject()` gibt für Custom-Fächer `null` zurück → KI-Features laufen ohne KC-Kontext (kein Crash, kein Banner nötig)
- Custom-Fächer funktionieren in allen Screens (Unterricht, Karteikarten, Lernzettel, etc.)

#### 4. Notenrechner UI-Redesign (AbiRechnerScreen)
**Ziel:** Schönere, übersichtlichere UI mit ausklappbaren Fächern und besserer Einzelübersicht.

**Spec:**
- Jedes Fach als ausklappbare Karte (Accordion): collapsed = Fachname + aktuelle NP-Summe + Durchschnitt; expanded = Q1–Q4 Eingabefelder + LK-Badge
- Gesamtübersicht oben bleibt als fixiertes Summary-Widget
- Farb-Coding: Grün (≥10 NP), Orange (5–9 NP), Rot (<5 NP)
- Zielnote-Vergleich als prominente Karte unter dem Summary

#### 5. Lernplan Update
**Ziel:** Lernplan-Feature vollständig funktionsfähig machen + UX-Verbesserungen.

**Spec (zu Beginn der Session gemeinsam durchgehen):**
- Lernplan-Flow komplett testen: Konfigurator Schritt 1–6 → Generierung (Gemini) → Detailansicht → Kalender-Export
- Bekannte Baustellen: Navigation zwischen Steps, Gemini-Response-Parsing, Tagesansicht-Rendering
- **Lernplan-Übersicht** (`LernplanListScreen`): bessere Karten — Fortschrittsbalken (wie viele Tage erledigt?), nächste Session heute, Fach-Chips
- **Detailansicht** (`LernplanDetailScreen`): Tages-Kacheln mit "erledigt"-Toggle (lokal speichern), aktueller Tag hervorgehoben, Scroll zu heute
- **Konfigurator UX**: Schritte klarer beschriften, Zurück-Navigation ohne State-Verlust
- Spec-Details beim Start der Session klären

#### 6. Import-Flow prüfen
**Ziel:** Vollständigen Import-Flow testen (Foto → OCR → Smart Note → Ordner-Zuweisung) und bekannte Bugs fixen.
- Prüfen: Kamera-Zugriff, PDF-Upload, Groq Vision Antwort, auto-Ordner-Vorschlag
- Fehlermeldungen auf Deutsch und verständlich

### Kurzfristig (nächste Wochen)
- **Schreibscreen Update** — mehr Stifte, mehr Auswahl, cleaneres UI

### Mittelfristig (2–3 Monate)
- **Working Streak-Animation** — sichtbare Animation bei Meilensteinen (7, 30, 100 Tage)
- **Screen-Transition-Animation** — sanfte Übergangsanimation

### Langfristig (nach Launch)
- **Studentenadaption** — Uni-spezifische Features, ECTS, Semesterplanung

---

## Supabase DB-Schema — 13 Tabellen (Stand 13.06.2026)

| Tabelle | Inhalt |
|---------|--------|
| `profiles` | Name, Klasse, Schulform, Bundesland, Fächer, `custom_faecher` (JSONB), Klausurtermine, Stundenplan (JSONB), Abi-Gesamtnote, Theme, isPro, isDevMode |
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
- **isPro-Flag:** `isPro: boolean` in UserContext. Dev-Mode-Accounts lesen aus `profiles.is_pro`. Echte User lesen aus `subscriptions.status`. Manuell in Supabase Table Editor setzbar für Testzwecke.
- **Groq für Text/Vision** — Llama 3.3 70B + Llama 4 Scout Vision: Kosten, Geschwindigkeit
- **Gemini für Probeklausuren + Lernplan** — `gemini-2.5-flash`: bessere Reasoning-Qualität
- **Paywall-Pattern: Lock-Cards, kein Blur** — Free-User sehen was sie verpassen, klicken auf Lock → ProModal öffnet sich von unten. Kein verschwommener Inhalt mehr.
- **TypeScript strict** — keine `any` Types einbauen
- **KlausurphasenScreen bleibt Hub** — kein Feature-Screen, nur Einstieg in die Lernmethoden
- **HomeScreen = UnterrichtScreen** — kein separater HomeScreen; `/` redirectet direkt zu `/unterricht`
- **Lernplan Kalender-Export:** `addToCalendar()` in `LernplanDetailScreen` baut Busy-Intervalle aus Stundenplan + personalEntries und platziert Sessions in freien Fenstern. Max 90 Min/Block, 15-Min-Pausen. Preferences: morgen=0–13h first, abend=13–24h first, beides=chronologisch.
- **`/landing` Route:** Öffentlich zugänglich für alle (authenticated + unauthenticated). In `App.tsx` Layout: vor dem Sidebar-Render wird `/landing` abgefangen und `<LandingScreen />` direkt gerendert — kein Sidebar. Unauthenticated Startseite redirectet auf `/landing`.
- **Nav-Button Hover:** `.nav-btn` + `.nav-active` CSS-Klassen in `index.css` steuern Hintergrund. **Kein inline `background` Style** auf Nav-Buttons — das würde CSS-Hover (`:hover { transform: scale(1.08) }`) blockieren. Active-State → `nav-active` Klasse, nicht inline.
- **Custom Fächer:** `profile.customFaecher` Array in `UserProfile`. `resolveSubjectInfo(id, customFaecher)` in `subjectInfo.ts` liefert Fallback-Icon 📚 + Farbe für custom IDs. `syncProfile` schreibt `custom_faecher` nach Supabase, `mapProfile` liest es zurück.

---

## Umgebungsvariablen

```
VITE_GROQ_API_KEY=gsk_...           # Groq API Key (Text + Vision) — gültig
VITE_GEMINI_API_KEY=AIzaSy...       # Google Gemini API Key — gültig
VITE_SUPABASE_URL=https://...       # Supabase Project URL
VITE_SUPABASE_ANON_KEY=eyJ...       # Supabase Anon Key
VITE_EMAILJS_SERVICE_ID=...         # EmailJS — auch in Vercel setzen!
VITE_EMAILJS_TEMPLATE_ID=...        # EmailJS — auch in Vercel setzen!
VITE_EMAILJS_PUBLIC_KEY=...         # EmailJS — auch in Vercel setzen!
```

`.env` liegt im Root-Verzeichnis. Nie in Git committen (ist in `.gitignore`).  
**Wichtig:** Alle `VITE_` Keys müssen auch in Vercel unter Environment Variables gesetzt sein — `.env` wird nicht deployed.

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

## Screens (34 total — alle geroutet, alle funktionsfähig)

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
| AGBScreen | /profil/agb | Nutzungsbedingungen — 28 Sektionen (Termly, EN) |

---

## Wichtige Dateien / Struktur

```
src/
├── app/
│   └── App.tsx                   # Router, ErrorBoundary, ThemeApplier, Layout, Auth-Gate
├── components/
│   ├── lesson/
│   │   └── FotoScannerWidget.tsx  # Kamera-Zugriff + Foto-Capture
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
│   ├── stripe.ts                  # createCheckoutSession() — ruft create-checkout-session Edge Fn auf
│   ├── supabase.ts                # Supabase Client
│   ├── supabaseSync.ts            # Sync-Layer: syncProfile, syncGradeData, syncNote, etc. + Queue
│   └── pdf.ts                     # PDF → Bilder Konvertierung (pdfjs)
├── screens/                       # Ein Screen pro Route (34 Screens — alle aktiv)
└── types/
    └── index.ts                   # Alle TypeScript-Typen
public/
├── kc/                            # KC-JSONs: 16 Bundesländer × ~12 Fächer = ~196 Dateien
└── lernzettel-previews/           # 4 Original-Lernzettel-HTMLs für Pro Preview Karussell
supabase/
├── migrations/
│   ├── 001_initial_schema.sql     # 13 Tabellen, RLS, Trigger — ANGEWENDET
│   └── 002_grade_data.sql         # grade_data Tabelle — ANGEWENDET 09.06.2026
└── functions/
    ├── groq-proxy/                # Groq API Proxy (deployed ✅)
    ├── gemini-proxy/              # Gemini API Proxy (deployed ✅)
    ├── create-checkout-session/   # Stripe Checkout (deployed ✅, Live-Mode)
    ├── stripe-webhook/            # Stripe Webhook Handler (deployed ✅, Live-Mode)
    └── delete-account/            # Account-Löschung (deployed ✅ 10.06.2026)
```

**Gelöschte Screens (nicht mehr vorhanden):**
- `HomeScreen.tsx`, `ExamModeScreen.tsx`, `ExamResultScreen.tsx`, `SubjectListScreen.tsx`
- `AudioRecorderWidget.tsx`, `NoteEditor.tsx` — aus UI entfernt (unfertige Features)

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

## Letzte Session (14.06.2026)

**Feinschliff vor Launch — AGB, Karteikarten, Probeklausur, Pro Lernzettel Preview**

**1. AGB & Rechtliches**
- Streitschlichtungshinweis (OS-Plattform / §36 VSBG) aus `AGBScreen` entfernt — Abmahngefahr beseitigt
- Neue Sektion 22a „Haftungsausschluss für KI-generierte Inhalte" eingefügt — keine Haftung für Noten/Prüfungsergebnisse
- AGB jetzt 29 Sektionen

**2. Touch-Animation Polish**
- `.press:active` → `scale(0.985)`, `.press-sm:active` → `scale(0.99)` (weniger aggressiv)
- `.hover-lift:hover` nur noch unter `@media (hover: hover) and (pointer: fine)` aktiv → kein Distorting auf iPads/Touchscreens

**3. Karteikarten-Generator Rewrite (`FlashCardGeneratorScreen.tsx`)**
- 3-Schritt-Flow: **Fach → Notizen → Methode** mit Progress-Bar
- Schritt 2: Multi-Select mit Kreis-Checkboxen — mehrere Notizen gleichzeitig für ein Deck auswählen
- Schritt 3: Tab-Switcher KI / Manuell
  - KI: Chip-Buttons für 5 / 10 / 15 / 20 Karten; bei Multi-Select wird `ceil(count/notes)` Karten je Notiz generiert und auf Zielanzahl beschnitten
  - Manuell: Textarea-Paare (Vorderseite / Rückseite) mit + / − Buttons
- Custom Fächer via `resolveSubjectInfo()` korrekt angezeigt (vorher nur `subjects[]`-Array → Custom-IDs fehlten)
- **Flip-Bug gefixt:** `key={cardIndex}` auf `<FlashCard>` → Karte wird bei Weitergehen neu gemountet, Flip-State resettet

**4. Probeklausur KI-Qualität (`gemini.ts`)**
- `GENERATION_SYSTEM` erweitert: separate AFB I/II/III Operator-Listen für **Textfächer** vs. **Mathematik**
- Mode 3 Materialklausur: `isHumanities`-Flag → Geisteswissenschaften/Sprachen bekommen Sachtext (~300 Wörter), Naturwissenschaften/Mathe bekommen Messreihen + Tabellen

**5. Pro Lernzettel Preview (`LernzettelScreen.tsx` + `public/lernzettel-previews/`)**
- 4 Original-Lernzettel-HTMLs (aus Konversations-Transkript extrahiert) in `public/lernzettel-previews/`
- Horizontales Karussell: iframe-Cards (308×193px, scale 0.321) mit Bottom-Fade, Subject-Badge, Gold-PRO-Shimmer-Badge
- Pro-Badge in Topbar aller 4 HTML-Dateien injiziert (Python-Script)
- Kartenklick → Fullscreen-Modal: Bottom Sheet, farbiger Header-Streifen, scrollbarer iframe `height: calc(92vh - 56px)`
- „Tippen zum Anzeigen"-Caption unter jede Karte
- CTA-Button „Pro freischalten" nur für Free-User sichtbar; Karussell immer sichtbar (auch für Pro)
