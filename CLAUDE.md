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
**Wachstumshebel:** TikTok-Marketing (funktioniert bereits) + Email-Liste mit ~100 warmen Leads vom Landing Page. Discord hat 4.200 User, aber ~3.500 waren Abi-Jahrgänge die jetzt den Server verlassen → nur noch ~1.500 echter Niche. Discord ist NICHT mehr primärer Kanal. **App-Store-Warteliste: 150+ Personen bereits angemeldet und warten aktiv auf den Release** (Stand 27.07.2026) — echte Nutzer, nicht nur hypothetisch, zusätzliche Dringlichkeit hinter dem 02.08.-Ziel.  
**Monetarisierung:** Freemium — Free Tier mit Lock-Paywall (kein Blur!), Pro für €7,99/Mo oder €59,99/Jahr. Auf iOS zusätzlich Apple IAP via RevenueCat (Pflicht für In-App-Käufe, siehe Track A) — Web-Checkout bleibt parallel über Stripe bestehen, beide Systeme koexistieren dauerhaft (nicht nur übergangsweise), da Apple IAP nur auf iOS funktioniert und Stripe die einzige Option für Web/andere Plattformen bleibt.  
**Langfristige Strategie-Verschiebung (Stand 27.07.2026):** Simon plant, die Web-App als eigenständiges Produkt aufzugeben — `dailystudent.de` wird langfristig NUR noch Marketing-Landingpage mit Download-Link zur App-Store-App, keine parallel gepflegte Web-Produktversion mehr. Begründung: In der Schülerzielgruppe wird eine Web-App kaum aktiv genutzt; zukünftige Feature-Updates sollen exklusiv in die native App-Store-App fließen. Details, Zeitrahmen (kein festes Datum) und technische Einordnung siehe neue Sektion „Zukunftsvision — Natives SwiftUI-Rewrite" weiter unten.

---

## Tech Stack

| Was | Womit |
|-----|-------|
| Framework | React + TypeScript |
| Styling | Tailwind CSS |
| Build Tool | Vite |
| Routing | React Router |
| Persistenz | localStorage (`lernapp_v1`) → Supabase DB (Phase 3 aktiv) |
| KI Text + Vision | Groq API — `openai/gpt-oss-120b` (Text) + `qwen/qwen3.6-27b` (Vision/Bilder/Scans) — migriert 25.07.2026, siehe Session-Notiz |
| KI Probeklausuren + Lernplan + Lernzettel | Google Gemini — `gemini-3.5-flash` / `gemini-3.1-flash-lite` / `gemini-3.1-flash-image-preview` — migriert 25.07.2026 |
| Auth | Supabase Auth — Email/Passwort + Google/Apple OAuth (PKCE), nativ via Capacitor Deep-Link (`useDeepLinkAuth.ts`) + web via Redirect ✅ |
| DB | Supabase PostgreSQL — 16 Tabellen + RLS (`supabase/migrations/`) |
| Payments | Stripe (Web) ✅ Live-Mode + Apple IAP via RevenueCat (iOS, Track A) — koexistieren dauerhaft |
| Native Wrapper | Capacitor (`ios/`) — `server.url` zeigt auf `https://www.dailystudent.de`, kein separater Build |
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
    ├── Lernzettel        → generateLernzettel() via Gemini → LernzettelScreen ✓
    └── Lernplan          → generateLernplan() via Gemini → LernplanKonfiguratorScreen ✓
```

### Klausurenmodus-Screen als Hub
`KlausurphasenScreen` ist KEIN Feature-Screen — er ist eine **Übersicht/Startpunkt** für alle Lernmethoden. Enthält: nächster Klausurtermin, Lernplan-Preview, Auswendig-Lernen-Buttons, Probeklausur + Lernzettel, Statistik-Preview-Widget (Mini-Charts + 6 Stats → navigiert zu InsightsScreen). Das Layout ist bewusst so gewählt. Nicht ändern ohne Rückfrage.

---

## Aktueller Stand — Phase 2 komplett, Phase 3 zu ~99%, Track A größtenteils gebaut (Stand: 27.07.2026)

**App-Store-Kontext:** Ziel ist Einreichung im Apple App Store bis **02.08.2026** (danach ist Simon in Kanada, nicht erreichbar). Track B (App-Politur) ist fertig. **Track A (Capacitor-Wrapper + Apple IAP via RevenueCat + Sign in with Apple) wurde in der 26.–27.07.2026-Session zu großen Teilen gebaut** — siehe „Letzte Session" weiter unten für den vollständigen technischen Stand und offene Punkte. Simons parallele manuelle Apple-Portal-Schritte (Developer-Programm-Enrollment, App ID, Services ID, Sign-in-with-Apple-Key, App Store Connect API Key, RevenueCat-Account, Banking/Tax) sind ebenfalls größtenteils erledigt. Volle Sequenzierung + Architekturentscheidungen für Track A liegen in Claudes Memory unter `project-app-store-launch-plan`. **Wichtig, nicht verwechseln:** Das ist der kurzfristige Wrapper-Ansatz für die 02.08.-Deadline — komplett getrennt von Simons langfristiger Vision eines echten nativen SwiftUI-Rewrites OHNE Deadline, siehe neue Sektion „Zukunftsvision" weiter unten.

### Phase 2 — 100% funktioniert (echte KI, kein Mock):
- Onboarding Gate (Name, Klasse, Schulform, Bundesland, Fächer, Klausurtermin, Stundenplan-Scan)
- **Unterricht-Screen:** Fach-Tree mit Ordnern, Notizen erstellen, Foto-Import per Gemini KI mit auto-Ziel-Vorschlag
- **Smart Notes:** Foto/PDF/Text → Groq OCR → Groq Analyse → `GeneratedSmartNote` mit Summary, Keywords, Klausurthemen, Lösungsschritte
- **Keyword-Erklärung:** Tap auf Schlüsselbegriff → `explainKeyword()` via Groq
- **Karteikarten:** `generateFlashcards()` via Groq aus Smart Note → `LearnModeScreen` mit Deck-Verwaltung
- **Blurting:** `evaluateBlurting()` via Groq — echter KI-Vergleich mit Smart Note Inhalt
- **Probeklausur 4 Modi:** `generateMode1-4Exam()` via Gemini `gemini-2.5-flash` — echt generiert, echt korrigiert
- **Lernzettel:** `generateLernzettel()` via Gemini, 4 Erklärungs-Modi (Faktisch/Bildlich/Von Grund auf/Stichpunkte), optionale KI-Erklärbilder — `LernzettelScreen` + `LernzettelGeneratorScreen` vollständig
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
- **`supabase/migrations/004_coins_system.sql`** ✅ — `coins`, `cooldowns`, `streak_freezes`, `freeze_used_dates` Spalten in `app_stats` — **ANGEWENDET 16.06.2026** (Datei existierte vorher nur im Repo, war nie auf die echte DB angewendet → Ursache für Coins/Streak-Freezer, die nicht session-übergreifend gespeichert wurden + täglicher Login-Bonus-Bug)
- **`supabase/migrations/005_atomic_coins.sql`** ✅ — `grant_coins()` + `buy_streak_freeze()` Postgres-Funktionen (row-locked, atomar) — **ANGEWENDET 16.06.2026** (client-seitiges Read-Modify-Write race-te bei mehreren offenen Tabs/Geräten: beide lesen "kein Cooldown heute", beide zeigen Coins lokal an, aber nur der letzte Schreibvorgang überlebt in der DB → UI zeigte mehr Coins als tatsächlich in Supabase landeten)
- **`supabase/migrations/006_harden_coin_rpcs.sql`** ✅ — Security-Fix für 005 — **ANGEWENDET 16.06.2026** (`auth.uid() <> p_user_id` ist NULL statt TRUE für unauthentifizierte Aufrufer → Check griff nicht; Postgres gewährt EXECUTE standardmäßig an PUBLIC, REVOKE fehlte → anon-Key konnte die RPCs aufrufen. Gefixt mit `IS DISTINCT FROM` + explizitem `REVOKE ... FROM PUBLIC`)
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
- **Gamification / Coins-System** ✅ — `COIN_VALUES` in `UserContext.tsx`, `AppStats.coins` + `AppStats.cooldowns` in DB + localStorage, `addCoins(action)` mit tagesbasierter Cooldown-Key-Logik (`ACTION:YYYY-MM-DD`), `buyStreakFreeze()` (500 Coins → `streakFreezes++`), `CoinToast` + `CoinIcon` SVG-Komponenten, `CoinToastDisplay` in App.tsx; 7 tägliche Aktionen mit je eigenem Reward
- **StreakBadge** ✅ — `src/components/ui/StreakBadge.tsx`: fixes Pill top-right (🔥 + Zahl), schwarzer Hintergrund + Blur, klickt zu `/profil`, versteckt auf `/profil/*` + `/landing` + `/auth` + überall unter `/unterricht/*` außer dem Home-Screen selbst (`/unterricht`) — verhinderte Overlap mit Action-Buttons in neue-Notiz/Ordner/Lesson/SmartNotes-Screens; in beiden Layout-Branches von `App.tsx` gerendert
- **`src/lib/streak.ts`** ✅ — Single source of truth: `getActiveStreak(streak, lastStudyDate)` — gibt 0 wenn `lastStudyDate` weder heute noch gestern ist; ersetzt 4 duplizierte `getCurrentStreak`-Funktionen in `DashboardScreen`, `InsightsScreen`, `KlausurphasenScreen`, `ProfilScreen`, `KalenderScreen`
- **CoinIcon T0 (Drei-Münzen-Stack)** ✅ — 3 übereinanderliegende Münzen + 1 angelehnte Münze (SVG `rotate(-25 cx cy)`); löst alten Side-by-Side-Stack ab
- **KlausurphasenScreen Statistik-Widget** ✅ — 8 Pills (war 6): + Coins + Kalendereinträge — alle live an Pipeline angeschlossen
- **AbiRechnerScreen Accordion** ✅ — `SubjectCard` startet eingeklappt; Chevron togglet Schriftlich/Mündlich-Eingaben + S/M-Gewichtung; innere Controls nutzen `e.stopPropagation()` damit Klick auf LK/Buttons nicht die Card schließt
- **KalenderScreen** ✅ — altes orangenes 🔥-Streak-Pill aus Header entfernt (überlappte mit StreakBadge)
- **DesktopSidebar** ✅ — Amber Coins-Pill aus `DesktopSidebarWide` entfernt
- **ProfilScreen Coins-Widgets** ✅ — `CoinsRabattWidget`: zeigt Coin-Count + 7-Task-Checkliste (grüne Checkmarks für done) + "Coins im Shop einlösen"-Footer; `CoinsShopWidget`: Streak Freeze zuerst (mit `<CoinIcon>` statt Emoji), dann zwei grüne Progress-Bars (15%/30% Rabatt-Milestones)
- **Coin/Streak Bug-Fixes (15.06.2026)** ✅ — Race Condition behoben: `recordLogin()` feuert jetzt erst NACH Supabase-Daten-Load (`supabaseDataLoading` Flag als Dep); `loginBonusGrantedRef` verhindert Doppel-Grant pro Session; beim Supabase-Load werden Cooldowns aus localStorage mit Supabase-Daten zusammengeführt (`Set`-Merge) statt überschrieben → Login-Bonus-Bug (+5 bei jedem Login) gefixt; Checkliste zeigt korrekte Done-States session-übergreifend
- **Smart Notes Local-First Storage (16.06.2026)** ✅ — `src/lib/noteStorage.ts`: Foto/Zeichnung-Attachments laufen nicht mehr als Base64 durch `localStorage` + Supabase Postgres, sondern liegen lokal in IndexedDB. Drei Ref-Formate in `UserNote.attachments`/`drawingAttachments`: `data:...` (Legacy, wird weiter unterstützt), `idb:<uuid>` (lokal-only), `cloud:<uuid>:<pfad>` (explizit hochgeladen, lokal gecacht). Zentral abgefangen in `UserContext.tsx` (`saveNote`, `addUserNote`, `updateUserNote`, `saveToOhneFachFolder` lokalisieren automatisch; `deleteUserNote`/`deleteFolder`/`applyFaecherChanges` räumen IndexedDB + Storage auf)
- **Cross-Device Transfer** ✅ — `supabase/migrations/007_note_attachments_storage.sql` — **ANGEWENDET 16.06.2026**: privater Storage Bucket `note-attachments` (15 MB Limit) + RLS (Pfad-Präfix `{user_id}/...`). „Übertragen"-Button in `SmartNotesScreen.tsx` lädt lokal-only Attachments einer Notiz explizit hoch — kein Auto-Upload, User entscheidet pro Notiz
- **Legacy-Migration** ✅ — `migrateLegacyNoteAttachments()` in `noteStorage.ts`, läuft automatisch nach jedem Supabase-Load in `UserContext.tsx`: Notizen mit altem Base64 in Postgres werden beim nächsten Laden lokalisiert (IndexedDB) und mit kleiner Ref zurückgesynct — selbstbegrenzend, läuft nur einmal pro Notiz
- **AttachmentToast** ✅ — `src/components/ui/AttachmentToast.tsx`: erscheint bei jedem Speichern einer Smart Note mit Foto/Zeichnung ("Foto nur auf diesem Gerät — in der Notiz übertragbar"), zeitlich gestaffelt nach `CoinToast` (kein Overlap), in `NoteCreateScreen.tsx` getriggert (`doSave`, `acceptSuggestion`, `saveToOhneFach`)
- **Referral-System (20.06.2026)** ✅ — `supabase/migrations/009_referral_system.sql` (ANGEWENDET), Edge Function `handle-referral` (deployed), `src/lib/referral.ts` (shared helper), Trigger bei Onboarding-Abschluss (nicht Signup), `localStorage` für Code-Persistenz über Email-Confirmation-Flow; `effectiveIsPro` inkl. `trial_ends_at`; UI in `ProfilScreen` + `ReferralPill`
- **AI Rate-Limiting (23.07.2026)** ✅ — `supabase/migrations/012_ai_rate_limits.sql`: `ai_usage`/`ai_rate_limit_strikes` Tabellen + `profiles.ai_blocked` Spalte + `check_ai_rate_limit()` RPC (row-locked, gleiches Muster wie `grant_coins`). `/api/groq` + `/api/gemini` prüften vorher nur ob überhaupt ein gültiger Login vorliegt, nie ein Volumen-Limit — ein Free-Account (30 Sek. zum Anlegen) konnte beide Endpunkte unbegrenzt in einer Schleife aufrufen. Alle 21 Groq/Gemini-Funktionen sind jetzt einem von 8 Buckets zugeordnet (`smart_notes`, `flashcards`, `blurting`, `keyword_qa`, `lernzettel`, `probeklausur_full`, `probeklausur_other`, `lernplan`) mit fester, serverseitiger Tages-Decke pro Bucket — gleiche Zahl für alle Accounts, keine Pro/Free-Unterscheidung im Limiter selbst. Wer eine Decke an 2 verschiedenen Tagen überschreitet, wird per `ai_blocked` dauerhaft von allen KI-Calls gesperrt (ein Strike pro Tag/Bucket, nicht pro Retry). Separat: Lernplan Einzel für Free-User zusätzlich auf 3/Tag begrenzt (Produkt-Limit in `LernplanKonfiguratorScreen.tsx`, unabhängig vom Rate-Limiter).
- **Coins-Rabatt via Stripe (23.07.2026)** ✅ FERTIG — siehe Spec weiter unten unter „Upcoming Features", jetzt als erledigt markiert. `supabase/migrations/011_coins_discount_redeem.sql`: `redeem_discount()` RPC (row-locked). `create-checkout-session` Edge Function akzeptiert einen serverseitig whitelisteten `couponId`-Param (`coins-discount-15` / `coins-discount-30`). `redeemDiscount(tier)` in `UserContext.tsx`, UI in neuem `ProfilCoinsScreen.tsx`. Der vormals tote „Rabatt-Code anzeigen"-Button hat jetzt echte Einlöse-Buttons pro Stufe mit „Eingelöst"-Status. **Simon muss noch:** die 2 Coupons im Stripe Dashboard anlegen (je `once`, kein Ablaufdatum) — Code ist bereit, referenziert die IDs aber sie existieren in Stripe noch nicht.
- **ProfilScreen in Unterseiten aufgeteilt (23.07.2026)** ✅ — war 13 Abschnitte auf einer Seite (Pro-Upsell, Referral, Stats, Coins ×2, Theme, Dev-Tools, Account, Einstellungen, Rechtliches, Feedback). Jetzt schlanker Hub (Avatar, Pro-Upsell, Referral, Stats-Reihe, Coins-Preview-Row, gruppierte Nav-Rows) + 5 neue Unterseiten nach dem Muster der bereits bestehenden (Fächer/Bundesland/Rechtliches): `ProfilCoinsScreen` (`/profil/coins`), `ProfilErscheinungsbildScreen` (`/profil/erscheinungsbild`), `ProfilAccountScreen` (`/profil/account`), `ProfilSupportScreen` (`/profil/support`), `ProfilDevToolsScreen` (`/profil/dev-tools`, weiterhin auf Simons Email allowlisted). Onboarding-Reset lebt jetzt in den Dev-Tools — vorher: destruktiver Button ganz ohne Bestätigung, sichtbar für ALLE User in den normalen Einstellungen (nicht nur Simon).
- **Übersicht (DashboardScreen) neu gestaltet (23.–24.07.2026)** ✅ — mehrfach iteriertes, Mockup-basiertes Redesign:
  - **Erste-Schritte-Checkliste** — 5 Aufgaben (erste Notiz/Klausurtermin/Karteikarten/Lernplan/Probeklausur), dismissible (eigener `localStorage`-Key, nicht Teil von `lernapp_v1`), blendet sich bei 100% automatisch aus
  - **Hero-Karte** — zeigt die nächste Session des aktiven Lernplans mit echtem Fortschritt. Neues Feld `Lernplan.completedDays?: string[]` — Klick auf „Fortsetzen" markiert die nächste Session als erledigt, bevor er in den Lernplan navigiert (kleiner echter Baustein des separat geplanten Lernplan-„erledigt"-Toggles)
  - **„To-Do"-Karte** (vorher „Nächste Klausur") — eine optisch ungeteilte dunkle Karte, intern in 2 Tap-Zonen gesplittet: linke Hälfte Klausur-Countdown (führt ohne Termin in den Kalender statt Klausurenmodus), rechte Hälfte Anzahl offener Hausaufgaben (gleiche Aggregation wie `HausaufgabenheftScreen`; Tap → neue Smart Note mit vorausgewähltem Fach der am nächsten fälligen Hausaufgabe, via `/unterricht/:id/neue-notiz`)
  - Beide oberen Karten sind jetzt dunkel mit weichem Ambient-Glow (violett fürs Hero, mint fürs To-Do — Purple=Unterrichtsmodus/Mint=Klausurenmodus-Konvention). Dringlichkeitsfarben im To-Do sind hardcoded dark-taugliche Werte statt der theme-abhängigen CSS-Variablen (die auf dunklem Kartenhintergrund im Light-Mode zu blass wirken würden — gilt generell für jede Karte, die IMMER dunkel ist unabhängig vom App-Theme)
  - Neues kompaktes Streak-Widget neben dem Tagesplan
  - „Letzte Notizen" haben einen gefächerten Stapel-Look (2 leicht rotierte, blassere Karten hinter der Front-Karte)
  - Entfernt gegenüber der alten Version (bewusste Vereinfachung): eigenständige Streak-Karte, 5er-Stats-Reihe, 2 von 3 Schnellstart-Shortcuts (nur Schnellnotiz blieb)
- **Streak-Erklärung** ✅ — neue `src/components/ui/StreakInfoSheet.tsx`: Bottom Sheet mit den echten Mechanik-Regeln (welche 5 Aktionen zählen, Freeze-Automatik bei genau 1 verpasstem Tag, Meilenstein-Boni bei 5/10/30/60 Tagen — nicht 7/30/100, das war eine falsche Annahme). Tap auf `StreakBadge` (🔥-Pill, global sichtbar) öffnet das Sheet statt direkt zu `/profil` zu navigieren.
- **Google OAuth Account-Picker Fix** ✅ — `signInWithOAuth` in `AuthScreen.tsx` bekam `queryParams: { prompt: 'select_account' }`. Vorher zeigte Google auf Geräten mit nur einem eingeloggten Account beim Login-Versuch keinen Account-Chooser, sondern loggte automatisch den gecachten Account wieder ein — sah wie ein Auto-Login-Bug aus, war eigentlich ein fehlender OAuth-Parameter.
- **DemoScreen Key-Exposure gefixt** ✅ — `DemoScreen.tsx` rief Groq vorher direkt vom Client mit `VITE_GROQ_API_KEY` auf, unconditional (öffentliche `/landing`-Demo, kein Login nötig) → Key war im Production-Bundle scrapebar (verifiziert: Build gemacht, Key im Bundle gefunden). Live-Call komplett entfernt, Demo nutzt jetzt ausschließlich die vorgeschriebenen Fallback-Inhalte, kein KI-Call mehr in der Demo. Der Rest der App (`groq.ts`/`gemini.ts`) war bereits sauber über `/api/groq`/`/api/gemini` proxied. **Wichtig, noch offen:** der alte Groq-Key sollte trotzdem im Groq-Dashboard rotiert werden — war vor diesem Fix schon live exponiert.
- **UI/UX Pro Max + Emil Kowalski Skills installiert** ✅ — `.claude/skills/ui-ux-pro-max` (via `npx uipro-cli init --ai claude`, Design-System-Referenzdaten: Paletten, Typografie, UX-Guidelines) + `.claude/skills/{apple-design,emil-design-eng,animation-vocabulary,find-animation-opportunities,improve-animations,pick-ui-library,review-animations}` (via `npx skills add emilkowalski/skill --all`) — für Design-/Animations-Arbeit in zukünftigen Sessions verfügbar.
- **Lernzettel Groq→Gemini Port + 4 Erklärungs-Modi + KI-Erklärbilder + Markdown/Math-Rendering-Fix (25.07.2026)** ✅ — mehrteilige Überarbeitung:
  - **Prompt-Port:** `generateLernzettel()` lebt jetzt in `gemini.ts` (`LERNZETTEL_SYSTEM` + `examFetch()`-Pattern, `maxOutputTokens: 8192` statt Groqs 2048, Ziel-Länge 1500–2500 Wörter statt 600–1000). Prompt fordert jetzt explizit echtes LaTeX (`$...$`/`$$...$$`) für Formeln — bewusst das Gegenteil von `GENERATION_SYSTEM`s Unicode-only-Regel für Probeklausuren, weil der Lernzettel-Renderer (anders als der Probeklausur-Renderer) jetzt KaTeX kann. Alte Groq-Funktion aus `groq.ts` entfernt.
  - **4 Erklärungs-Modi** (`LernzettelModus` in `types/index.ts`): Faktisch (druckreif/präzise für Klausur-Formulierungen), Bildlich (Analogien/Alltagsvergleiche), Von Grund auf (baut bei den Voraussetzungen an, systematischer Aufbau), Stichpunkte (kompakt, kurz vor der Klausur). Jeder Modus hat einen eigenen ausformulierten Prompt-Baustein (`LERNZETTEL_MODUS_PROMPTS`), kein generisches Template. Neuer Auswahl-Schritt in `LernzettelGeneratorScreen.tsx` zwischen Fach- und Themen/Notizen-Auswahl, `modus` wird auf dem `Lernzettel`-Record persistiert und als Badge in `LernzettelScreen.tsx` angezeigt.
  - **Modus-Auswahl-UI: `ModusRegler` (neu, `src/components/ui/ModusRegler.tsx`)** — erster konkreter Schritt Richtung Landing-Page-Design-Sprache (siehe Design-Sprache-Sektion), ersetzt eine erste Version mit 4 gestapelten Karten, die Simon explizit als „AI slop" abgelehnt hat. Immer-dunkle Karte (Mint-Akzent `#34D399`, unabhängig vom App-Theme, gleiches Prinzip wie die Dashboard-Hero-Karten) mit: (1) einem tap-baren Segmented-Track oben — 4 Icon-Stops, eine Mint-Pille gleitet per `framer-motion` `layoutId` zwischen den Stops; (2) darunter genau EINE Vorschau (Icon + Titel + Beschreibung des aktiven Modus, nie alle 4 gleichzeitig), horizontal wischbar (`drag="x"`, Geschwindigkeits- + Distanz-Schwelle) UND per Tap auf einen Track-Stop erreichbar — bewusst nicht swipe-only (ui-ux-pro-max UX-Guideline: "Gesture Conflicts", swipe-only vermeiden). Eigener "Weiter"-Button bestätigt die Auswahl explizit, damit Durchwischen zum Vergleichen nicht versehentlich einen Modus committet. Federungs-Animation (`type: 'spring', duration: 0.4, bounce: 0.2–0.22`, nach Emil-Kowalski-Richtwerten: dezenter Bounce 0.1–0.3, nie `scale(0)` als Startzustand, `prefers-reduced-motion` respektiert via `useReducedMotion()`). SVG-Icons statt Emojis (ui-ux-pro-max no-emoji-icons-Regel).
  - **KI-Erklärbilder (Beta, opt-in, Gemini-Freikontingent):** `generateLernzettelVisual()` in `gemini.ts` ruft `gemini-2.5-flash-image` (`responseModalities: ['IMAGE']`) — separater Modell-Key `'flash-image'` in `GEMINI_URLS` (Client + `api/gemini.ts`), eigener `AiBucket`-Wert `lernzettel_visuals` (Server-Ceiling 8/Nutzer/Tag in `api/gemini.ts`, siehe Hinweis unten zu Googles eigenem Freikontingent-Limit). Die KI liefert max. 2 `{afterHeading, prompt, alt}`-Bildvorschläge im selben JSON wie der Lernzettel-Text; ein Toggle „Mit Erklärbildern (Beta)" (default AUS) in `LernzettelGeneratorScreen.tsx` steuert ob die Bilder tatsächlich generiert werden. **Speicherung lokal-first wie Note-Attachments:** `saveLocalAsset()` (neu in `noteStorage.ts`) legt die generierten PNGs in IndexedDB ab (`idb:<uuid>`-Refs), kein Supabase-Storage-Bucket nötig. `Lernzettel.images: {ref, afterHeading?, alt}[]` — neue Spalten `modus`/`images` in der `lernzettel`-Tabelle via `013_lernzettel_modus_images.sql` (✅ von Simon angewendet). Fehlschlag bei der Bildgenerierung (z. B. Tageslimit erreicht) blockiert den Lernzettel nicht — Bild wird einfach weggelassen. **Nutzt aktuell nur Googles kostenloses Kontingent — vor Produktions-Launch/breiterem Marketing-Push auf einen bezahlten Gemini-Tier umstellen**, sonst kann das plattformweite Freikontingent (Google AI Studio, ca. 500 Bilder/Tag pro Projekt, nicht pro Nutzer) bei mehr gleichzeitigen Nutzern knapp werden.
  - **Preview-Karussell-Redesign:** `LernzettelScreen.tsx`s „Pro Lernzettel"-Karussell hatte vorher Badges/Titel als Overlay direkt auf dem Vorschau-Iframe (optisch ~50/50 App-Chrome/Inhalt). Jetzt: Fach-/PRO-Badge in einer dünnen Kopfzeile über der Karte, Titel+Caption in einer dünnen Fußzeile darunter, Karte selbst ohne Overlay — Lernzettel-Inhalt dominiert sichtbar stärker.
  - **Markdown/Math-Rendering-Fix (nicht nur Lernzettel, auch Smart Notes):** neue `src/components/ui/RichText.tsx` kombiniert Markdown-Lite-Parsing (`##`/`###`/`**bold**`/`> `/`Merke: `/`- `-Bullets, vorher nur in `LernzettelScreen`s lokaler `renderContent()`) mit KaTeX-Math-Rendering (vorher nur in `MathRenderer.tsx`, das aber keine Markdown-Struktur kennt) — beide teilen sich jetzt `renderMathSegments()` aus neuem `src/lib/mathSegments.tsx`. Ersetzt an allen Stellen, an denen mehrzeiliger KI-Content (nicht nur einzelne kurze Felder) angezeigt wird: `SmartNotesScreen.tsx` (Edit- UND View-Mode der KI-Zusammenfassung), `NoteCreateScreen.tsx` (Foto- und Schreibblock-Ergebnis), `LernzettelScreen.tsx` (ersetzt die alte lokale `renderContent()`). `RichText` übernimmt bei Lernzetteln zusätzlich die Bild-Platzierung (`images`-Prop, siehe oben).
- **Abi-Notenrechner Block II — Abiturprüfungen (25.07.2026)** ✅ — Scoping-Ergebnis mit Simon: keine Niedersachsen-spezifische Einbringungspflicht-Korrektheit nötig, sondern die fehlende Grundstruktur ergänzen. Standard-Punkteschema jetzt vollständig: **Block I** (`blockIPunkte()`, neu in `AbiRechnerScreen.tsx`) skaliert den bestehenden 0–15-Halbjahresnoten-Schnitt (`totalPunkteAllHalbjahre()`, unverändert) auf max. 600 Punkte (`× 40`). **Block II** (`blockIIPunkte()`) ist komplett neu: 5 feste Prüfungs-Slots (`AbiPruefung`-Typ, `types/index.ts`), je Fach-Auswahl (Chips aus `profile.faecher`) + 0–15-Notenpunkte (`× 4`, max. 300 gesamt) — eigene `PruefungCard`-Komponente, gleiches Card-/Accordion-Muster wie `SubjectCard`, aber ohne S/M-Split/LK-Toggle. **Gesamt** (`gesamtpunkte900()`) = Block I + Block II, max. 900 — erscheint als neue Karte "Abitur-Gesamt" erst sobald mind. 1 Prüfung einen Wert hat (vorher nur die bisherige Block-I-Ø-Karte, unverändert). Wichtige Entscheidung zur Abwärtskompatibilität: `abiGesamtpunkte` (die reine Zahl, 0–15-Skala) bleibt unverändert Block-I-only, weil sie die bestehende Zielnote-Fortschrittsleiste speist (0–15-Skala) — nur `abiGesamtnote` (der Notenstring wie "2,3", angezeigt in Insights/Profil/`LernvorschlagWidget`) wechselt sobald verfügbar auf die echte 900-Punkte-Note (`pktToNoteAbi(gesamt900 / 60)` — Wiederverwendung der bereits als korrekt geltenden KMK-Formel, nur auf die 900er-Skala projiziert statt eine zweite Lookup-Tabelle einzuführen). Neue Migration `014_abi_pruefungen.sql` (`grade_data.abi_pruefungen` JSONB-Spalte, gleiches Isolationsprinzip wie `abi_halbjahre`) — ✅ von Simon angewendet. Nur für Oberstufe sichtbar (`isOberstufe`), bewusst kein Redesign der restlichen Screen-Optik (das ist ein separat vorgemerktes Roadmap-Item, siehe „Notenrechner UI-Redesign").

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

### Known Issues (Stand: 25.07.2026):

**MINOR:**
1. **Apple OAuth** — Native PKCE-Deep-Link-Flow gebaut, Supabase-Apple-Provider konfiguriert (Services ID, Team ID, Key ID, generierter Client-Secret-JWT — läuft am **2027-01-22 ab**, siehe Claude-Memory `apple-signin-jwt-expiry` für Regenerierung), "coming soon"-Disclaimer aus `AuthScreen.tsx` entfernt. **Natives Google-Login wurde 27.07.2026 erfolgreich getestet** (nach Fix eines Domain-Redirect-Bugs, siehe „Letzte Session"). **Natives Apple-Login selbst noch NICHT verifiziert getestet** — sollte in der nächsten Session als Erstes nachgeholt werden.
2. **Email Confirmation Flow** — kein UI-Hinweis nach Signup
3. **Impressum Steuernummer** — Platzhalter, nach Eingang vom Finanzamt Harburg nachtragen
4. **Coins Shop Redesign gefällt Simon noch nicht** — `ProfilCoinsScreen.tsx` wurde in 2 große Karten umgebaut (violett Checkliste / mint Shop, Framer-Motion-Entrance-Animation), aber Simon hat explizit gesagt das Design trifft es noch nicht. Konkretes Feedback steht noch aus — vor weiterer Iteration erst nachfragen was genau nicht passt, nicht einfach nochmal neu raten.
5. **Natives Wrapper-Projekt** — ✅ GELÖST (26.–27.07.2026). `ios/` Capacitor-Projekt existiert, ist committed, `capacitor.config.ts` zeigt auf `https://www.dailystudent.de` (kanonische Domain, `dailystudent.de` ohne www 308-redirected dorthin). Noch offen bis zur Einreichung: RevenueCat Offerings/Products anlegen (abhängig von App Store Connect IAP-Produkten), Xcode-Signing für TestFlight, Sandbox-Testkauf, finaler QA-Pass auf echtem TestFlight-Build. Siehe „Letzte Session" für Details.
6. **Lernzettel-Erklärbilder (Beta) aktuell komplett funktionsunfähig — Google-seitiges Freikontingent, nicht unser Bug, NICHT per Code fixbar** — direkt gegen Googles API getestet (curl, mit UND ohne Modell-Migration, altes `gemini-2.5-flash-image` UND neues `gemini-3.1-flash-image-preview` zeigen identisch `RESOURCE_EXHAUSTED`/`limit: 0` für `generate_content_free_tier_requests`). Das Freikontingent für Bildgenerierung scheint für dieses Google-Cloud-Projekt aktuell bei 0 zu liegen. Betrifft nur den optionalen Beta-Toggle (default AUS) — der Rest von Lernzettel/Probeklausur/Lernplan/Smart Notes läuft über Text-Modelle und ist nicht betroffen. **Von Simon zweifach live bestätigt** (25.07.2026, erneut 25.07.2026 in einer späteren Session): Toggle „Mit Erklärbildern (Beta)" eingeschaltet, es wird trotzdem kein Bild generiert/angezeigt — deckt sich exakt mit dem curl-Befund, kein neues Symptom. Die Lernzettel-**Textgenerierung** selbst (alle 4 Modi) funktioniert gut („fast gut") — nur dieser Beta-Bildteil ist betroffen, und die App-seitige Anzeige-/Preview-Logik dafür (`RichText`s Bild-Platzierung, IndexedDB-Auflösung) ist bereits korrekt gebaut und einsatzbereit, sobald Google wieder Kontingent frei gibt. **Simon muss:** im Google AI Studio / Google Cloud Billing prüfen, ob für dieses Projekt Billing aktiviert werden muss — reines Model-Downgrade würde das nicht lösen, da beide Modelle betroffen sind. Dies ist der letzte offene Blocker vor dem Start der Apple-App-Store-Migration (Track A).

### To-Do — Priorisiert (Stand: 25.07.2026):

#### Direkt als nächstes (Track B, noch offen aus der 23.–24.07. + 25.07. Session):
✅ ~~Lernzettel-Prompt: Groq → Gemini portieren~~ FERTIG 25.07.2026 — siehe Phase-3-Liste oben. **Von Simon live getestet:** Textgenerierung/Prompts funktionieren gut („fast gut"). **Weiterhin offen (nicht per Code fixbar):** Erklärbilder-Beta-Toggle erzeugt kein Bild (Google-Freikontingent = 0, siehe Known Issues #6). Migration `013_lernzettel_modus_images.sql` ✅ von Simon angewendet.

✅ ~~Abi-Notenrechner Block II (Abiturprüfungen)~~ FERTIG 25.07.2026 — siehe Phase-3-Liste oben. Migration `014_abi_pruefungen.sql` ✅ von Simon angewendet.

✅ ~~Lernplan-Kalenderexport sichtbarer machen~~ FERTIG 25.07.2026 — siehe Phase-3-Liste oben.

1. **Final QA-Pass auf alle Track-B-Änderungen der 23.–25.07. Sessions** — durchklicken: Google-Login (Account-Picker), Stripe-Checkout + Rabatt-Einlösung (sobald Simon die Coupons angelegt hat), alle 5 neuen Profil-Unterseiten, Übersicht (To-Do-Karte beide Hälften, Streak-Widget, Lernplan-Hero „Fortsetzen", Erste-Schritte-Checkliste, gefächerte Notizen-Karten), Streak-Erklärungs-Sheet, **plus neu:** Lernzettel 4-Modi-Flow + ModusRegler, Erklärbilder-Toggle, Preview-Karussell-Redesign, Markdown/Math-Rendering in Smart Notes + Lernzettel, Abi-Notenrechner Block II, Lernplan-Kalenderexport-Buttons. **Das ist der einzige noch offene Track-B-Punkt** — danach ist Track B (App-Politur) inhaltlich fertig und Track A (Apple-App-Store-Migration) kann beginnen, siehe „Nächste Session — Handoff" gleich unten.

#### Nächste Session — Handoff (Stand 27.07.2026, Ende der Track-A-Bau-Session):
Simon steigt mit einem neuen Chat wieder ein. Kompakter Übergabe-Stand — **zuerst „Letzte Session (26.–27.07.2026)" weiter unten vollständig lesen**, dort steht der volle technische Kontext dieser Liste:

**Track A — konkret noch offen, in ungefährer Reihenfolge:**
1. **Natives Apple-Login end-to-end testen** — Google-Login wurde 27.07.2026 erfolgreich verifiziert (nach dem Domain-Redirect-Fix), Apple-Login (gleicher Code-Pfad, sollte funktionieren) wurde aber noch nie tatsächlich durchgeklickt.
2. **Temporäre Debug-`console.log`-Zeilen entfernen** aus `src/screens/AuthScreen.tsx` (`handleGoogle`) und `src/hooks/useDeepLinkAuth.ts` — dienten der OAuth-Fehlersuche in dieser Session, Cleanup aussteht, dann committen+pushen.
3. **`DemoScreen.tsx`: „Eigene Notiz erstellen"-Button entfernen** (Button + `handleCustomTagAdd` + zugehöriger State `customOpen`/`customTags`/`customInput`) — Simon hat sich 27.07.2026 explizit dafür entschieden, obwohl geklärt wurde dass der Button keinen echten KI-Call macht (rein templated, siehe `buildFallback()`). **Noch NICHT umgesetzt.**
4. **Migration `016_revenuecat_subscriptions.sql`** — unklar ob Simon sie bereits im Supabase SQL Editor ausgeführt hat, unbedingt nachfragen/bestätigen lassen bevor RevenueCat-Testkäufe gemacht werden (fügt `source`/`rc_app_user_id` + `UNIQUE(user_id)` zu `subscriptions` hinzu).
5. **`VITE_REVENUECAT_API_KEY_IOS` in Vercel Environment Variables setzen** — aktuell nur in der lokalen `.env`, die Produktions-Site (die der native Wrapper lädt) hat den Key noch nicht, braucht zusätzlich einen Redeploy.
6. **RevenueCat Offerings/Packages/Products anlegen** — abhängig von IAP-Produkten in App Store Connect (monatlich/jährlich, €7,99/€59,99), die wiederum Banking/Tax-Freigabe brauchten (Simon sagt Stand 27.07. „ist glaube ich durch", nicht 100% verifiziert — nachfragen).
7. **Xcode-Signing für TestFlight finalisieren**, TestFlight-Build hochladen, Sandbox-Testkauf durchführen (braucht Sandbox-Apple-ID aus App Store Connect).
8. **Finaler QA-Pass** auf dem echten TestFlight-Build vor Einreichung.

**Wichtig, nicht mit Track A verwechseln:** Simon hat 27.07.2026 außerdem eine grundsätzliche Zukunftsfrage aufgeworfen (natives SwiftUI-Rewrite statt Wrapper) — Ergebnis: aktueller Wrapper bleibt für die 02.08.-Deadline, ein echter Rewrite ist ein separates Projekt OHNE Datum für danach. Siehe neue Sektion „Zukunftsvision — Natives SwiftUI-Rewrite" weiter unten, bevor in einer zukünftigen Session natives UI-Arbeit begonnen wird — erst mit Simon klären ob das jetzt ansteht.

**Track B ist weiterhin komplett fertig** (Stand 25.07.2026, siehe unten) — kein offener Punkt dort.

#### Danach:
3. **Coins Shop Redesign — konkretes Feedback von Simon einholen** bevor weiter iteriert wird (siehe Known Issues).
4. **Onboarding Soft-Start** — Nutzer bekommt sofort App-Zugang (kein Gate), sieht aber auf jedem Screen eine Bubble/Banner: "Personalisierung in 1 Min abschließen → bessere KI-Ergebnisse".
6. **Email-Liste aktivieren** — ~100 warme Leads (TikTok/Landing Page) sind höchste Conversion-Priorität.
7. **Bottom Nav Colour anpassen** — Farbanpassung der mobilen BottomNav
8. **Foto-Scan: Auswahl/Crop-Tool** — beim Foto-Scan soll man per Drag einen Ausschnitt markieren können, statt immer das komplette Foto an die KI zu schicken
9. **Ausführlichere/bessere KI-Antworten** — Smart Note-Analyse (Groq) soll tiefer gehen; „Stilpunkte"/Darstellungsleistung mitdenken, nicht nur Inhaltspunkte

#### App Store Launch (Ziel 02.08.2026):
Track A (Capacitor, RevenueCat/Apple IAP, Sign in with Apple, Apple Developer Portal) macht Simon selbst — Status unbekannt, bei Simon erfragen. Volle Sequenzierung + Architekturentscheidungen in Claudes Memory unter `project-app-store-launch-plan`.

#### UX / Features (mittelfristig):
- **KI-Erklärungs-Chat** — interaktiver Chat im SmartNotesScreen: "Erkläre mir das genauer", "Ich verstehe X nicht" → Groq antwortet kontextbezogen auf die Note.
- **Tutorial / Onboarding-Walkthrough** — max. 4–5 Schritte, überspringbar, nur beim ersten Login
- **Lernplan-Detailansicht fertigstellen** — Tages-Kacheln mit echtem "erledigt"-Toggle (aktuell nur die Dashboard-Hero-Karte markiert grob den nächsten Tag; ein granulares Toggle direkt in `LernplanDetailScreen` fehlt noch)
- **Import-Flow** — vollständig testen + Bugs fixen
- **Email Confirmation Flow** — Hinweis nach Signup

#### Nach Launch:
1. **Steuernummer ins Impressum** — nach Eingang vom Finanzamt
2. **Push-Benachrichtigungen**
3. **Studentenadaption**

---

## Upcoming Features (Roadmap)

### Nächste Session (priorisiert)

#### 0. Coins-Rabatt via Stripe — Discount direkt im Checkout ✅ FERTIG (23.07.2026)
**Ziel:** Wenn User 2.500 / 5.000 Coins erreicht, können sie ihren Rabatt direkt als Stripe-Checkout einlösen — kein Code-Kopieren, automatisch angewendet.

Umgesetzt wie unten gespeckt, siehe Phase-3-Liste oben. Einziger offener Punkt: Simon muss die beiden Coupons im Stripe Dashboard noch anlegen.

**Spec:**
- **Stripe Dashboard (1× manuell, 5 Min):** Zwei Coupons anlegen:
  - ID `coins-discount-15`, 15% off, Duration: `once`, kein Ablaufdatum
  - ID `coins-discount-30`, 30% off, Duration: `once`, kein Ablaufdatum
- **Edge Function `create-checkout-session`**: Akzeptiert optionalen `couponId` Body-Param → wenn vorhanden: `discounts[0][coupon]` in Stripe-Params setzen (Achtung: `allow_promotion_codes` und `discounts` schließen sich aus!)
- **`src/lib/stripe.ts`**: `createCheckoutSession(plan, couponId?)` — reicht `couponId` an Edge Function durch
- **`UserContext.tsx`**: Neue Funktion `redeemDiscount(tier: '15' | '30'): Promise<boolean>` — prüft Coins (2.500/5.000), zieht Coins ab, setzt permanente Cooldown-Keys `DISCOUNT_15:USED` / `DISCOUNT_30:USED` (kein Datums-Suffix — einmalig permanent), synct zu Supabase, gibt couponId zurück
- **`ProfilScreen.tsx` CoinsShopWidget**: "Rabatt einlösen"-Button wenn Schwelle erreicht UND noch nicht genutzt → ruft `redeemDiscount` auf → öffnet direkt `createCheckoutSession(plan, couponId)` → User wählt Plan im Modal → rabattierter Checkout öffnet; "Bereits genutzt" Badge wenn `DISCOUNT_15:USED` in cooldowns
- **Keine DB-Migration nötig** — `cooldowns`-Array in `app_stats` reicht aus
- **Coins werden sofort abgezogen** (beim Klick auf "Einlösen"), bevor Checkout öffnet — User hat die Entscheidung getroffen

#### 1. Beta-Referral-System — 14 Tage Pro bei 5 Signups ✅ FERTIG (20.06.2026)
- Migration `009_referral_system.sql` angewendet: `referral_code` + `trial_ends_at` in `profiles`, `referrals`-Tabelle mit RLS
- Edge Function `handle-referral` deployed: validiert Auth, verhindert Selbst-Referral, UNIQUE auf `referee_id` verhindert Doppelzählung, setzt `trial_ends_at` bei 5 Referrals
- `src/lib/referral.ts`: shared `callHandleReferral()` Helper
- Trigger: `localStorage` speichert `referral_code` aus `?ref=` URL (überlebt Browser-Close + Email-Confirmation-Flow), wird beim Abschluss des Onboardings (`OnboardingScreen`) gefeuert — nicht bei Signup
- `UserContext`: `referralCode`, `referralCount`, `trialEndsAt` State; `effectiveIsPro` inkl. Trial-Check
- `ProfilScreen`: QR-Code-Widget + Progress-Bar (x/5) + Copy-Button
- `ReferralPill`: fixes Counter-Pill in der App

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

## Supabase DB-Schema — 16 Tabellen (Stand 27.07.2026)

| Tabelle | Inhalt |
|---------|--------|
| `profiles` | Name, Klasse, Schulform, Bundesland, Fächer, `custom_faecher` (JSONB), Klausurtermine, Stundenplan (JSONB), Abi-Gesamtnote, Theme, isPro, isDevMode, `ai_blocked` (neu, Migration 012) |
| `grade_data` | `abi_halbjahre` (JSONB, Block I) + `abi_pruefungen` (JSONB, Block II — neu, Migration 014) — **dedizierte, isolierte Notentabelle**, verhindert Überschreiben durch Profile-Sync |
| `app_stats` | Streak, scanCount, examCount, lastStudyDate, studiedDays[], examScores[], coins, cooldowns[], streakFreezes, freezeUsedDates[] |
| `user_folders` | Fach-Ordner-Baum mit Eltern-Kind-Beziehung |
| `user_notes` | Alle Notizen (Text/Foto/PDF), attachments (lokal-first Refs), homework_items, qa |
| `generated_smart_notes` | KI-Analyse-Ergebnis pro Notiz (summary, keywords, examTopics, solution) |
| `flashcards` | Alle Karteikarten mit front/back/subjectId |
| `lernzettel` | Generierte Lernzettel mit Inhalt und Metadaten, `modus` (neu, Migration 013), `images` JSONB — nur lokale IndexedDB-Refs, keine Bild-Bytes (neu, Migration 013) |
| `saved_probeklausuren` | Abgeschlossene Klausurversuche mit KI-Korrektur |
| `lernplaene` | Generierte Lernpläne (days JSONB, config JSONB, `completedDays` neu) |
| `personal_entries` | Kalendereinträge (lerneinheit/termin/erinnerung) |
| `standalone_homework` | Hausaufgaben ohne Notiz-Kontext |
| `subscriptions` | Abonnements, Stripe UND Apple/RevenueCat (`source` Spalte, neu Migration 016) — `UNIQUE(user_id)`, nur server-seitig schreibbar via Webhook |
| `ai_usage` (neu, Migration 012) | Pro user_id/bucket/day ein Zähler — Grundlage der Rate-Limit-Decke |
| `ai_rate_limit_strikes` (neu, Migration 012) | Ein Eintrag pro user_id/bucket/day an dem die Decke überschritten wurde — 2 Einträge insgesamt → `profiles.ai_blocked = true` |

**RLS:** Jede Tabelle hat RLS — User kann nur eigene Rows lesen/schreiben (`auth.uid() = user_id`). `ai_usage`/`ai_rate_limit_strikes` haben RLS aktiviert aber keine Policies — nur über die `SECURITY DEFINER`-RPC `check_ai_rate_limit()` erreichbar, kein direkter Client-Zugriff vorgesehen.

**Migrationen 001–015 angewendet**, **016 Status UNBESTÄTIGT — bei Simon nachfragen** (siehe Handoff-To-Do oben), alle in `supabase/migrations/`:
001 initial schema · 002 grade_data · 003 custom_faecher · 004 coins_system · 005 atomic_coins (RPC) · 006 harden_coin_rpcs · 007 note_attachments_storage · 008 early_access · 009 referral_system · 010 personal_entries_extra_fields · 011 coins_discount_redeem (RPC) · 012 ai_rate_limits (RPC) · 013 lernzettel_modus_images · 014 abi_pruefungen · 015 lernzettel_highlighted · **016 revenuecat_subscriptions (neu 26.–27.07.2026, `source`/`rc_app_user_id`/`UNIQUE(user_id)` auf `subscriptions`, siehe Track-A-Session oben)**

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
- **Grade Data Isolation:** `abiHalbjahre` (Block I) UND `abiPruefungen` (Block II, neu 25.07.2026) werden gemeinsam über `syncGradeData()` in die dedizierte `grade_data` Tabelle geschrieben — beide Felder immer zusammen im selben Aufruf (aus dem gemergten `updated`-Profil, nicht aus dem partiellen `data`-Patch), sonst würde ein Update, das nur eines der beiden Felder ändert, das andere in Supabase auf `[]` zurücksetzen. Beim Laden: `grade_data` hat Priorität vor `profiles.abi_halbjahre` (für `abiPruefungen` gibt es kein Legacy-Fallback in `profiles`, das Feld existiert dort gar nicht). Nie grades nur über `syncProfile` schreiben!
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
- **Supabase SQL Editor — Queries immer benennen:** Wenn Simon eine neue Migration manuell im Supabase SQL Editor ausführen muss, IMMER explizit dazuschreiben: „Speichere die Query als `<migrations-dateiname ohne .sql>`" (z.B. `007_note_attachments_storage`), statt sie als „Untitled query" im Verlauf stehen zu lassen — sonst sind alte Änderungen im SQL-Editor-Verlauf nicht mehr unterscheidbar.
- **Custom Fächer:** `profile.customFaecher` Array in `UserProfile`. `resolveSubjectInfo(id, customFaecher)` in `subjectInfo.ts` liefert Fallback-Icon 📚 + Farbe für custom IDs. `syncProfile` schreibt `custom_faecher` nach Supabase, `mapProfile` liest es zurück.
- **Note-Attachments sind lokal-first (IndexedDB), nicht Base64:** `UserNote.attachments`/`drawingAttachments` enthalten nach dem Speichern `idb:<uuid>` (lokal) oder `cloud:<uuid>:<pfad>` (explizit übertragen) statt Base64 — Auflösung immer über `getAttachment()`/`useResolvedAttachments()` aus `src/lib/noteStorage.ts`, nie `note.attachments` direkt als `<img src>` rendern. Lokalisierung passiert zentral in `UserContext.tsx` (`saveNote`/`updateUserNote`/etc.) — neue Save-Pfade für Notizen müssen über diese Funktionen laufen, sonst bleibt Base64 ungefiltert in Postgres. Kein Auto-Upload in die Cloud — nur über den expliziten „Übertragen"-Button.
- **AI Rate-Limiting: Buckets sind tier-blind, feste serverseitige Ceilings** — `src/lib/aiRateLimit.ts` definiert das `AiBucket`-Union (`smart_notes`, `flashcards`, `blurting`, `keyword_qa`, `lernzettel`, `lernzettel_visuals` (neu, 25.07.2026), `probeklausur_full`, `probeklausur_other`, `lernplan`). Jede der Groq/Gemini-Funktionen taggt sich beim Aufruf mit ihrem Bucket; die tatsächliche Zahl (Ceiling) lebt NUR serverseitig in `api/groq.ts`/`api/gemini.ts` (hardcoded `BUCKET_LIMITS`), niemals clientseitig — sonst könnte ein manipulierter Client sein eigenes Limit vortäuschen. Bewusst KEIN Pro/Free-Unterscheidung im Limiter selbst (Simons Entscheidung) — das ist reiner Abuse-Schutz, keine Monetarisierung; Produkt-Limits (z.B. Lernzettel 1/Tag Free) bleiben separat client-seitig geprüft wie bisher. **Fail-open, nicht fail-closed** — `checkRateLimit()` in `api/groq.ts`/`api/gemini.ts` lässt bei jedem Fehler/Unreachable den Request durch (`{ allowed: true }`), statt ihn zu blockieren. War anfangs fail-closed gebaut und legte dadurch am 24.07.2026 kurzzeitig alle KI-Features lahm (fehlende Migrationen 011/012 + fail-closed = jeder RPC-Fehler blockierte 100% des Traffics) — seitdem gefixt.
- **Karten die IMMER dunkel sind (unabhängig vom App-Theme) brauchen hardcodierte Farben, nicht die theme-CSS-Variablen** — z.B. die Übersicht-Hero-Karten (`DashboardScreen.tsx`, `Card` mit `dark` Prop). `rgb(var(--color-accent))` etc. sind theme-abhängig (unterschiedliche Werte in `:root` vs `.dark` in `index.css`) und wirken auf einer erzwungenermaßen dunklen Kartenfläche im Light-Mode zu blass. Für solche "immer dunkles Chrome"-Elemente feste, dark-taugliche Hex-Werte direkt im Code verwenden (Beispiel: `urgencyColor` in `ToDoCard`).
- **`Lernplan.completedDays?: string[]`** — Liste von `LernplanDay.date`-Strings, die als erledigt markiert wurden. Bisher nur von der Dashboard-Hero-Karte geschrieben (markiert die nächste Session bei Klick auf „Fortsetzen"), noch kein granulares Toggle direkt in `LernplanDetailScreen` (das ist ein offener Folge-Punkt, siehe To-Do). Persistiert ganz normal über das bestehende `saveLernplan()`.
- **Mehrzeiliger KI-Content (Markdown + Math) läuft immer über `RichText`, nie über rohe String-Interpolation oder `MathRenderer` allein:** `src/components/ui/RichText.tsx` ist der einzige Renderer für `##`/`###`/`**bold**`/`> `/`Merke: `/`- `-Markdown-Lite kombiniert mit KaTeX-Math (`$...$`/`$$...$$`). `MathRenderer.tsx` bleibt daneben bestehen, aber nur noch für einzelne kurze Felder ohne eigene Markdown-Struktur (z.B. `task.answer`, Karteikarten-Vorschau-Snippets mit `line-clamp` — dort würde `RichText`s Block-Layout das Clamping brechen). Beide teilen sich `renderMathSegments()` aus `src/lib/mathSegments.tsx` (bewusst kein Re-Export aus `MathRenderer.tsx` — sonst verletzt die Datei Fast-Refreshs "nur Komponenten exportieren"-Regel, siehe ESLint `react-refresh/only-export-components`). Neue Stellen, die KI-generierten Fließtext/Zusammenfassungen anzeigen, müssen `RichText` verwenden, sonst zeigt die UI wieder rohe `##`/`$`-Zeichen an (Bug vom 25.07.2026, siehe Phase-3-Liste).
- **Capacitor `server.url` zeigt IMMER auf Produktion, nie lokal hand-editieren:** `capacitor.config.ts`s `server.url` ist `https://www.dailystudent.de` (kanonische Domain — Apex `dailystudent.de` 308-redirected dorthin, deshalb direkt die www-Version verwenden). Lokales Testen läuft ausschließlich über `npm run cap:dev` (Live-Reload gegen den Vite-Dev-Server), damit nie versehentlich eine Dev-URL in einen archivierten Build gelangt. **Wichtig:** native Features sind erst nach einem echten `git push` + Vercel-Deploy testbar, da der Wrapper immer den zuletzt deployten Produktions-Code lädt, nicht den lokalen Stand.
- **`subscriptions` hat `UNIQUE(user_id)`, seit Migration 016:** eine Zeile pro Nutzer, egal ob Stripe oder Apple/RevenueCat gerade aktiv ist (`source`-Spalte unterscheidet). Sowohl `stripe-webhook` als auch `revenuecat-webhook` upserten auf `onConflict: 'user_id'`. Grund: `supabaseSync.ts` liest mit `.maybeSingle()`, das bei mehreren Zeilen pro Nutzer crashen würde.
- **RevenueCat-Pro-Status läuft NIE über `setIsPro()`:** `UserContext.tsx` hat einen separaten, nicht-persistierten `nativeEntitlementActive`-State für sofortiges UI-Feedback nach einem nativen Kauf (via RevenueCats `CustomerInfoUpdateListener`). `setIsPro()` ist absichtlich nur für den Dev-Mode-Pro-Toggle reserviert — es setzt `profile.isDevMode = true`, was bei einem echten Abo-Kauf falsch wäre.
- **Sensible Signing-Keys (`.p8`-Dateien, private Keys) nie in den Chat einfügen lassen:** bei Bedarf (z.B. JWT-Generierung für Supabases Apple-Provider) nur den Dateipfad erfragen, lokal per Bash/Node verarbeiten, nur das Ergebnis zurückgeben.
- **Lernzettel-Erklärbilder sind lokal-first (IndexedDB) wie Note-Attachments, kein eigenes Storage-Bucket:** `Lernzettel.images` enthält nur `{ref: 'idb:<uuid>', afterHeading?, alt}` — die eigentlichen PNG-Bytes verlassen nie den `saveLocalAsset()`/`getAttachment()`-Pfad aus `src/lib/noteStorage.ts`. Kein Cross-Device-Sync für diese Bilder (anders als Note-Attachments gibt es hier keinen "Übertragen"-Button) — bewusste Vereinfachung für die erste Version, da die Bilder jederzeit neu generierbar sind. `RichText` löst sie über `useResolvedAttachments()` auf und platziert sie nach der Überschrift, die `afterHeading` wortwörtlich matcht; kein Match → Bild wird ans Ende gehängt statt zu verschwinden.

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
VITE_REVENUECAT_API_KEY_IOS=appl_... # RevenueCat Public SDK Key (Track A) — NUR lokal in .env gesetzt, Vercel-Eintrag noch unbestätigt, siehe To-Do
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

## Screens (39 total — alle geroutet, alle funktionsfähig)

| Screen | Route | Funktion |
|--------|-------|---------|
| AuthScreen | /auth | Login/Signup Email + Google/Apple OAuth (PKCE, nativ + web) |
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
| ProfilScreen | /profil | Schlanker Hub: Avatar, Pro-Upsell, Referral, Stats, Coins-Preview, Nav-Rows |
| ProfilCoinsScreen | /profil/coins | Coins-Checkliste + Shop (Rabatt-Einlösung) |
| ProfilErscheinungsbildScreen | /profil/erscheinungsbild | Theme-Auswahl Hell/Dunkel/System |
| ProfilAccountScreen | /profil/account | Email, Login-Methode, 2FA, Abmelden, Account löschen |
| ProfilSupportScreen | /profil/support | App-Übersicht, Demo-Ansicht, Bug-Report |
| ProfilDevToolsScreen | /profil/dev-tools | Pro-Toggle, Coins-Slider, Onboarding-Reset (allowlisted) |
| FaecherEditScreen | /profil/faecher | Fächer hinzufügen/entfernen |
| BundeslandScreen | /profil/bundesland | Bundesland + Schulform ändern |
| BenachrichtigungenScreen | /profil/benachrichtigungen | Notification-Toggles (UI only) |
| DatenschutzScreen | /profil/datenschutz | Vollständige DSGVO-Datenschutzerklärung + Account-Löschung |
| ImpressumScreen | /profil/impressum | Impressum gem. §5 TMG |
| AGBScreen | /profil/agb | Nutzungsbedingungen — 28 Sektionen (Termly, EN) |

---

## Wichtige Dateien / Struktur

```
capacitor.config.ts                # Capacitor-Config — server.url zeigt IMMER auf Produktion, nie lokal hand-editieren
assets/                             # icon.png/splash.png — Input für `npx @capacitor/assets generate`
scripts/
└── generate-app-icons.mjs          # Sharp-Skript: public/icon.svg → alle Icon-/Splash-PNGs
ios/                                 # Capacitor-iOS-Projekt (Track A) — Info.plist, Assets.xcassets, etc.
src/
├── app/
│   └── App.tsx                   # Router, ErrorBoundary, ThemeApplier, Layout, Auth-Gate, useDeepLinkAuth()
├── hooks/
│   └── useDeepLinkAuth.ts         # Fängt appUrlOpen ab, exchangeCodeForSession() für nativen OAuth-Rückweg
├── components/
│   ├── lesson/
│   │   └── FotoScannerWidget.tsx  # Kamera-Zugriff + Foto-Capture
│   ├── learn/
│   │   ├── FlashCard.tsx         # Karteikarte mit Flip-Mechanik
│   │   ├── ExamQuestion.tsx      # Klausur-Frage-Display
│   │   └── AIFeedbackCard.tsx    # KI-Korrektur-Display
│   └── ui/                       # Button, Card, Badge, BottomNav, DesktopSidebar,
│                                 # Header, ProModal, BottomSheet, LernvorschlagWidget,
│                                 # SyncErrorBanner, KcFallbackBanner, MathRenderer, RichText,
│                                 # ModusRegler, StreakBadge, StreakInfoSheet, ...
├── context/
│   └── UserContext.tsx            # Zentraler State + localStorage + Supabase Auth + Sync Queue + RevenueCat-Init
├── data/
│   ├── mockData.ts                # halfYears[], topics[], subjects[] (Legacy-Stubs, kein Mock mehr)
│   ├── subjectInfo.ts             # SUBJECT_INFO + SUBJECT_GROUPS (Name, Icon, Farbe pro Fach)
│   └── kcLoader.ts                # loadKcForSubject/User(), buildKcPromptContext()
├── lib/
│   ├── groq.ts                    # Alle Groq API Calls (OCR, SmartNote, Flashcards, Blurting, ...) — Lernzettel jetzt in gemini.ts
│   ├── gemini.ts                  # Gemini API Calls (Probeklausur, Lernplan, Lernzettel + Erklärbilder, File-Import)
│   ├── mathSegments.tsx           # renderMathSegments() — KaTeX-Segment-Parser, geteilt von MathRenderer + RichText
│   ├── stripe.ts                  # createCheckoutSession(plan, couponId?), createPortalSession() (neu, Track A)
│   ├── revenuecat.ts              # initRevenueCat, purchasePlan, logOutRevenueCat (neu, Track A)
│   ├── supabase.ts                # Supabase Client — flowType 'pkce', native Storage-Adapter
│   ├── capacitorStorage.ts        # Preferences-basierter Storage-Adapter für Supabase-Session (nativ only, neu Track A)
│   ├── supabaseSync.ts            # Sync-Layer: syncProfile, syncGradeData, syncNote, etc. + Queue
│   ├── streak.ts                  # getActiveStreak(streak, lastStudyDate) — single source of truth
│   ├── noteStorage.ts             # IndexedDB lokal-first Storage: Note-Attachments + Lernzettel-Erklärbilder
│   ├── aiRateLimit.ts             # AiBucket-Union (9 Buckets) — client-seitige Typ-Sicherheit für Rate-Limiting
│   └── pdf.ts                     # PDF → Bilder Konvertierung (pdfjs)
├── screens/                       # Ein Screen pro Route (39 Screens — alle aktiv, inkl. 5 neue Profil*.tsx Unterseiten)
└── types/
    └── index.ts                   # Alle TypeScript-Typen
public/
├── kc/                            # KC-JSONs: 16 Bundesländer × ~12 Fächer = ~196 Dateien
└── lernzettel-previews/           # 4 Original-Lernzettel-HTMLs für Pro Preview Karussell
supabase/
├── migrations/                    # 001–016, siehe DB-Schema-Sektion oben für Details (016 Status unbestätigt)
└── functions/
    ├── groq-proxy/                # (vermutlich toter Code — src/ ruft stattdessen /api/groq auf, prüfen ob löschbar)
    ├── gemini-proxy/              # (vermutlich toter Code — src/ ruft stattdessen /api/gemini auf, prüfen ob löschbar)
    ├── create-checkout-session/   # Stripe Checkout (deployed ✅, Live-Mode, akzeptiert jetzt couponId)
    ├── create-portal-session/     # Stripe Billing Portal (neu, Track A)
    ├── stripe-webhook/            # Stripe Webhook Handler (deployed ✅, Live-Mode, upsert jetzt auf user_id)
    ├── revenuecat-webhook/        # RevenueCat/Apple-IAP-Webhook (neu, Track A)
    └── delete-account/            # Account-Löschung (deployed ✅ 10.06.2026)
api/
├── groq.ts                        # Vercel Edge Function — verifiziert Supabase-Token, prüft Rate-Limit, proxied zu Groq
└── gemini.ts                      # Vercel Edge Function — gleiche Struktur, proxied zu Gemini
```

**Gelöschte Screens (nicht mehr vorhanden):**
- `HomeScreen.tsx`, `ExamModeScreen.tsx`, `ExamResultScreen.tsx`, `SubjectListScreen.tsx`
- `AudioRecorderWidget.tsx`, `NoteEditor.tsx` — aus UI entfernt (unfertige Features)

---

## Design-Sprache — Upcoming Redesign (Inspiration: Landing Page)

**Status:** Aktiv, nicht mehr nur Planung (seit 25.07.2026). Die Landing Page (`/landing`) mit ihrem dunklen Hintergrund, purple/mint Akzenten und Premium-Atmosphäre ist die Referenz für den kompletten App-Redesign — Simon ist mit der Landing Page sehr zufrieden, das ist jetzt explizit die Design-Messlatte für die ganze App, nicht nur neue Screens. Erster konkreter Umsetzungsschritt: Lernzettel-Modus-Auswahl (siehe Phase-3-Liste, "Swipeable Modus-Regler").

**Pflicht-Workflow für Design-Arbeit (Simons ausdrücklicher Wunsch, 25.07.2026):**
- **Neue Screens / größere UI-Überarbeitungen:** immer zuerst den `ui-ux-pro-max` Skill aufrufen (Design-System-Referenzdaten: Paletten, Typografie, UX-Guidelines) — nicht aus dem Bauch heraus stylen.
- **Animationen/Motion:** immer den `emil-design-eng` Skill (Emil-Kowalski-Philosophie) heranziehen, ggf. ergänzt durch `apple-design`/`animation-vocabulary`/`find-animation-opportunities`/`improve-animations`/`review-animations` je nach Aufgabe — keine Animation ohne diese Referenz einbauen.
- Ziel ist spürbar mehr Politur/Bewusstsein bei Interaktionsdesign, nicht nur Funktionalität — "wirkt wie AI-Slop" ist ein explizites Anti-Pattern, das Simon benannt hat (Bezug: die ursprüngliche 4-Karten-Lernzettel-Modus-Auswahl, seitdem durch den Swipeable Regler ersetzt).

### Farbsystem — 4-Color Palette

| Rolle | Farbe | Hex | Verwendung |
|-------|-------|-----|------------|
| Neutral Dark | Black | `#0a0a0f` | Backgrounds, dunkle Oberflächen |
| Neutral Light | White | `#FFFFFF` | Text, helle Oberflächen |
| Unterrichtsmodus | Premium Purple | `#7C3AED` | Alles rund um Notizen, Unterricht, Smart Notes |
| Klausurenmodus | Mint | `#34D399` | Alles rund um Klausur, Karteikarten, Lernplan, Probeklausur |

**Prinzip:** Weniger ist mehr. Nicht jede Farbe gleichzeitig zeigen. Purple dominiert im Unterrichtskontext, Mint dominiert im Klausurenkontext. Details in anderen Farben (Streak-Orange, Fehler-Rot etc.) bleiben als Signalfarben erhalten, werden aber nicht als UI-Akzentfarben eingesetzt.

**DemoScreen als Vorbild:** Der Demo-Bildschirm zeigt die Farbumgebung bereits korrekt — Purple-Glow bei der Notiz-Erstellung (Unterrichtsmodus), Mint-Glow nach dem Speichern (Klausurenmodus übergang). Dieses Muster auf die App übertragen.

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
- **Lila (`#7C3AED`) = Unterrichtsmodus / Brand / primäre Aktion**
- **Mint (`#34D399`) = Klausurenmodus / Lernmethoden**
- Teal (`#5AC8FA`) = Kalender / neutral (bleibt als Detail)

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

## Zukunftsvision — Natives SwiftUI-Rewrite (langfristig, KEIN Datum)

**Status: reine Zukunftsvision, nicht angefangen, nicht terminiert.** Nicht mit Track A (dem aktuellen Capacitor-Wrapper für die 02.08.2026-Deadline) verwechseln — das sind zwei komplett getrennte Vorhaben. Entstanden aus einem ausführlichen Gespräch mit Simon am 27.07.2026 (siehe „Letzte Session" oben für den vollen Gesprächsverlauf).

### Warum Simon das will
Simon plant, die Web-App als eigenständiges Produkt langfristig aufzugeben. `dailystudent.de` soll nur noch Marketing-Landingpage mit App-Store-Download-Link sein (der aktuelle „Get Started"-Button-Zweck bleibt, wird aber die einzige verbleibende Web-Funktion). Begründung: In der Schülerzielgruppe wird eine Web-App kaum aktiv genutzt; alle zukünftigen Feature-Updates sollen exklusiv in die native App-Store-App fließen, nicht mehr parallel in eine Web-Version.

**Wichtige Korrektur aus dem Gespräch, die für jede zukünftige Diskussion gilt:** Der Auslöser für diese Überlegung war ein Missverständnis — der aktuelle Capacitor-Wrapper ist KEIN „Zum-Homescreen-hinzufügen"-PWA-Bookmark, sondern ein echtes App-Store-Bundle. Das eigentliche, validere Argument für einen nativen Rewrite ist NICHT „der Wrapper braucht ein Tutorial", sondern schlicht: echtes natives UI/Feel + langfristig nur noch eine Plattform pflegen wollen, statt Web + App parallel.

### Was tatsächlich für einen Rewrite spricht (geprüft, nicht übertrieben)
- **Supabase-Backend muss nicht neu gebaut werden.** Offizielles `supabase-swift`-SDK deckt Postgres-Zugriff, RLS, Edge Functions und Auth (inkl. Apple/Google-OAuth mit PKCE) vollständig ab — dieselbe Datenbank, dieselben Migrationen, dieselben Edge Functions bedienen dann Web (falls noch relevant) und die native App gleichzeitig.
- **Die bestehende Web-App ist die vollständige Spezifikation.** Jede Screen-Logik, jedes Prompt-Design, jedes Datenmodell ist bereits bekannt und funktionierend — das eliminiert fast das gesamte „was soll das eigentlich tun"-Risiko eines Greenfield-Projekts.

### Was ehrlich dagegen spricht, VOR dem 02.08.-Deadline zu rewriten
- **Umfang:** ~39 Screens, mehrere davon mehrstufige komplexe Flows (6-Schritt-Lernplan-Konfigurator mit Kalender-Konfliktlösung, 4 Probeklausur-Modi mit KI-Generierung+Korrektur, 9-Schritt-Onboarding, Abi-Rechner Block I+II).
- **Mehrere Bausteine haben kein triviales natives 1:1-Äquivalent** — jeweils eigene Neuentwicklung nötig, kein Copy-Paste-Job: KaTeX-Mathe-Rendering (kein natives Swift-Äquivalent, eigene Lib oder eingebettete WebView nur fürs Rendering nötig), Insights-Charts (→ Swift Charts), Zeichnen/Handschrift aus dem Schreibscreen (`perfect-freehand` → PencilKit/Core Graphics), PDF-Export (`jsPDF` → PDFKit), das komplette lokal-first IndexedDB-Attachment-System (→ Core Data/SQLite/FileManager, andere Architektur).
- **Realistischer Zeitaufwand: Wochen bis Monate fokussierte Arbeit**, kein Wochenend-Grind — unabhängig davon, ob Claude Code direkten Xcode-Zugriff hat (beschleunigt das Tippen von Code, ändert aber nichts am fundamentalen Umfang, ~39 Screens Business-Logik ein zweites Mal zu bauen).
- **Zwei Codebasen für immer:** Jedes zukünftige Feature/jeder Bugfix müsste doppelt gebaut werden (React/TS + Swift) — genau die Last, die der Wrapper-Ansatz ursprünglich vermeiden sollte, gegeben Simons fehlendem Coding-Background und der Abhängigkeit von KI-gestützter Einzelperson-Entwicklung.

### Apple On-Device-KI ("Apple Intelligence" / Foundation Models Framework)
Real existierendes, von Apple für Drittanbieter geöffnetes Framework für ein On-Device-LLM (kostenlos, offline, privacy-preserving). **Kein Ersatz für die aktuelle Groq/Gemini-Pipeline** — spürbar schwächeres Modell, für leichte Aufgaben gedacht (nicht für z.B. vollständige AFB-III-Klausurkorrektur oder tiefe Lernzettel-Erklärungen), nur auf neueren Geräten mit Apple-Intelligence-Support verfügbar (nicht alle Nutzer-Geräte). Würde bei Einsatz zusätzlichen Scope bedeuten, keine Abkürzung. Interessant als spätere Ergänzung für leichte Offline-Features, nicht als Rewrite-Vereinfacher.

### Aktueller Stand der Entscheidung
Simon entschied sich (27.07.2026): aktuellen Wrapper für die 02.08.-Deadline einreichen, nativer Rewrite ist ein separates, echtes Projekt für DANACH, im nachhaltigen Tempo ohne Zeitdruck. Denkbar als erster Schritt, falls es losgeht: ein zeitlich klar begrenzter Proof-of-Concept-Spike (Supabase-Swift-Auth + 1–2 einfache Screens porten), um echte Geschwindigkeit/Qualität selbst zu sehen, bevor volles Commitment — **noch nicht entschieden ob/wann dieser Spike stattfindet.**

**Für eine zukünftige Session:** Nicht von selbst anfangen natives UI zu bauen, nur weil dieser Abschnitt existiert — erst mit Simon klären ob der Rewrite jetzt ansteht oder weiterhin zurückgestellt ist. Verwandte, bereits vorher geführte Diskussion zum selben Ergebnis (Wrapper behalten statt nativem Liquid-Glass-UI): Claude-Memory `track-a-liquid-glass-scope`.

---

## Developer-Kontext

- **Entwickler:** Simon (kein Coding-Background, arbeitet mit Claude Code in VS Code) + Jan (Simons Helfer)
- **Workflow:** Claude Code baut, Simon reviewed im Browser (localhost:5174), dann git commit + push
- **Git:** `git add . && git commit -m "..." && git push`
- **Wichtig:** Immer erklären was gebaut wurde und warum — keine stillen Änderungen
- **Simon testet manuelle Portal-Schritte (Apple Developer, App Store Connect, RevenueCat, Supabase Dashboard) selbst hands-on und meldet exakte UI-Texte/Fehlermeldungen/Screenshots zurück** (z.B. wörtliche Fehlermeldungen aus RevenueCats Key-Upload, Screenshots von Supabase-Redirect-URL-Listen). Bei Unsicherheit über exakte Dashboard-Feldnamen/Menüstruktur (ändert sich häufig) IMMER transparent sagen wenn unsicher, dann anhand seines Feedbacks präzise korrigieren — funktioniert gut, mehrfach in der 26.–27.07.2026-Session so gelöst (z.B. Supabase Apple-Provider-Felder, App Store Connect „In-App Purchase"-vs-„App Store Connect API"-Keys).
- **Simon hinterfragt technische Behauptungen aktiv und erwartet ehrliche, unaufgeregte Korrektur ohne Beschönigung** — explizit gewünscht: „no hallucinations". Schätzt direkte, faktenbasierte Einordnung von Aufwand/Risiko/Kosten (z.B. Apple-IAP-Kommission, realistischer Zeitaufwand für einen nativen Rewrite) höher ein als vorauseilende Zustimmung zu seinen eigenen Ideen — siehe 26.–27.07.2026-Diskussion über Wrapper- vs. natives-Rewrite-Strategie in „Zukunftsvision" weiter unten.
- **Sensible Daten (private Keys, `.p8`-Dateien) nie in den Chat einfügen lassen** — wenn ein Signing-Key/Secret gebraucht wird (z.B. Apple Sign-in-Key, App Store Connect API Key), Simon bitten den Dateipfad zu nennen (z.B. Desktop), lokal per Bash/Node einlesen und verarbeiten (z.B. JWT signieren), nur das Ergebnis zurückgeben — nie den Rohinhalt im Gespräch anzeigen oder anzeigen lassen.
- **Über 150 Personen bereits auf der Warteliste für den App-Store-Release** (Stand 27.07.2026) — echter Nutzerdruck hinter der Deadline, nicht nur Simons persönliches Ziel.

---

## Letzte Session (26.–27.07.2026) — Track A: Nativer iOS-Wrapper gebaut + große Strategie-Diskussion

**Ausgangspunkt:** Track B war laut Handoff der Vorsession fertig. Simon fragte, was für Track A nötig ist und bat darum, zuerst zu erklären was er selbst tun muss, dann direkt zu bauen. Plan (Explore + Plan-Mode, dann von Simon freigegeben) liegt unter `/Users/macbookpro14/.claude/plans/read-claude-md-track-b-valiant-petal.md`. Wichtige Vorab-Klärung: **Simon entschied sich explizit für den Capacitor-Wrapper-Ansatz (`server.url` zeigt auf die Live-Produktion) statt einer separaten Kopie** — genau die Architektur, die schon am 13.07.2026 in Claudes Memory (`project-app-store-launch-plan`) festgelegt worden war.

### Gebaut (Phasen 1–3, 5–6 aus dem Plan):
- **Phase 1 — Icons/Splash:** `scripts/generate-app-icons.mjs` (Sharp-basiert, generiert `assets/icon.png`/`assets/splash.png` sowie die vorher fehlenden `public/icon-192.png`/`icon-512.png`/`apple-touch-icon.png` aus `public/icon.svg`). Platzhalter, von Simon jederzeit vor der echten Einreichung austauschbar.
- **Phase 2 — Capacitor-Core:** `ios/` Projekt via `cap add ios` (nutzt Swift Package Manager, kein CocoaPods nötig — neuer als erwartet). `capacitor.config.ts`: `appId: com.dailystudent.app`, `server.url` auf Produktion, `SplashScreen.launchAutoHide: false` + expliziter `SplashScreen.hide()`-Call in `main.tsx` nach React-Mount (vermeidet weißen Flash beim Laden der Remote-URL). `Info.plist`: Kamera/Fotos-Permission-Strings + `CFBundleURLTypes` für das `dailystudent://`-Custom-Scheme. npm-Scripts: `cap:sync`, `cap:open`, `cap:dev` (Live-Reload gegen lokalen Vite-Server, NIE `capacitor.config.ts` für lokales Testen anfassen).
- **Phase 3 — OAuth/PKCE-Rework:** `src/lib/supabase.ts` von `flowType: 'implicit'` auf `'pkce'`, `detectSessionInUrl: !isNative`, neuer `src/lib/capacitorStorage.ts` (Preferences-basierter Storage-Adapter nur nativ). Neuer `src/hooks/useDeepLinkAuth.ts` — fängt `appUrlOpen` ab, tauscht den `code`-Query-Param via `exchangeCodeForSession()` gegen eine Session, schließt den Browser. `AuthScreen.tsx`: `handleGoogle`/`handleApple` bekamen einen nativen Zweig (`skipBrowserRedirect` + `Browser.open()` von `@capacitor/browser`).
- **Phase 5 — RevenueCat:** Migration `016_revenuecat_subscriptions.sql` (neue Spalten `source`/`rc_app_user_id` + `UNIQUE(user_id)` auf `subscriptions` — Korrektheits-Fix nebenbei: `supabaseSync.ts` liest die Tabelle mit `.maybeSingle()`, das ohne `UNIQUE(user_id)` bei Duplikaten crashen würde). Neue Edge Function `supabase/functions/revenuecat-webhook/index.ts` (spiegelt `stripe-webhook`s Muster). Neuer `src/lib/revenuecat.ts` (`initRevenueCat`, `purchasePlan`, `logOutRevenueCat`, plus ein lokaler `nativeEntitlementActive`-State in `UserContext.tsx` für sofortiges UI-Feedback nach einem nativen Kauf, unabhängig vom Webhook-Rückweg — bewusst NICHT über `setIsPro()` gelöst, das würde fälschlich `profile.isDevMode = true` setzen). `ProModal.tsx` hat jetzt einen nativen Kauf-Zweig.
- **Phase 6 — Abo-Verwaltung:** Neue Edge Function `create-portal-session` (Stripe Billing Portal), neue „Abo verwalten"-Zeile in `ProfilAccountScreen.tsx` — verzweigt auf `subscriptions.source` (Apple → Deep-Link zu `itms-apps://apps.apple.com/account/subscriptions`, sonst → Stripe-Portal).
- Alles mit `tsc`/lint/Build verifiziert, committed in zwei Commits: `62144e2` (Haupt-Bau) und `f15963d` (Domain-Fix + Debug-Logs, siehe unten).

### Simons parallele manuelle Schritte (weitgehend erledigt):
Apple-Developer-Programm-Enrollment ✅, Xcode 26.6 installiert ✅, App-Store-Connect-Banking/Tax „glaube ich durch" (nicht 100% verifiziert), App ID `com.dailystudent.app` + Services ID + Sign-in-with-Apple-Key erstellt, App-Store-Connect-API-Key ("Subscription Key", **wichtig: eigener Key-Typ, nicht derselbe wie der allgemeine "App Store Connect API"-Key** — RevenueCat brauchte spezifisch einen `SubscriptionKey_*.p8` aus dem separaten „In-App Purchase"-Tab) an RevenueCat angebunden, RevenueCat-App + Public-API-Key (`appl_...`) erstellt und in `.env` eingetragen (**Vercel-Env-Var noch nicht bestätigt gesetzt, siehe To-Do**).

**Supabase-Apple-Provider-Detail, falls das nochmal auftaucht:** Supabases "Secret Key"-Feld für den Apple-Provider will keinen rohen `.p8`-Inhalt, sondern einen daraus signierten JWT (`ES256`, `iss`=Team-ID, `sub`=Services-ID, `kid`=Key-ID, `aud`=`https://appleid.apple.com`). Claude hat diesen JWT lokal per kleinem Node-Skript generiert (nur der `.p8`-Dateipfad wurde genannt, nie der Rohinhalt im Chat) — läuft am **2027-01-22 ab** (Apples Maximum von 6 Monaten), siehe Claude-Memory `apple-signin-jwt-expiry` zur Regenerierung.

### Debugging-Saga (wichtig für zukünftiges Verständnis der Architektur):
1. Erster Xcode-Build zeigte einen Provisioning-Fehler ("no devices") — **Fehlalarm**, betraf nur Device-Builds, nicht Simulator-Builds, löste sich durch Wechsel des Build-Ziels auf Simulator.
2. App blieb nach dem Start dauerhaft auf dem großen Icon (Splash) hängen. **Root Cause, wichtige Architektur-Erkenntnis:** Da `server.url` auf die Live-Produktion zeigt, läuft der native Wrapper IMMER den zuletzt deployten Code — und zu diesem Zeitpunkt war noch NICHTS von Track A committed/gepusht/deployed. Der Splash-Hide-Call existierte nur lokal, nicht auf Vercel. Gelöst durch `git commit` + `push` (Commit `62144e2`) — **jede zukünftige Session muss verstehen: native Feature-Tests sind erst nach einem echten Deploy aussagekräftig, nicht direkt nach lokalen Code-Änderungen.**
3. Nach dem Deploy: natives Google-Login öffnete zwar den In-App-Browser, landete danach aber auf der normalen Website statt zurück in die App, und die App selbst blieb weiterhin auf dem Icon hängen. Direkte Verifikation per `curl` bestätigte: neuer Code war live (bestätigt `dailystudent://auth/callback`-String im ausgelieferten JS-Bundle), Supabases Redirect-URL-Allowlist hatte den Custom-Scheme-Eintrag bereits korrekt (Screenshot von Simon bestätigt). **Tatsächliche Ursache:** `curl -sIL https://dailystudent.de/` zeigte einen 308-Redirect auf `https://www.dailystudent.de/` — `capacitor.config.ts`s `server.url` zeigte auf die Apex-Domain ohne `www`. Gefixt: `server.url` direkt auf `https://www.dailystudent.de` gesetzt (Commit `f15963d`, gleichzeitig temporäre `console.log`-Diagnose-Zeilen in `AuthScreen.tsx`/`useDeepLinkAuth.ts` ergänzt, **noch nicht wieder entfernt, siehe To-Do**). Nach diesem Fix von Simon als „denke gefixt" bestätigt.

### Große Strategie-Diskussion (27.07.2026) — Wrapper vs. natives Rewrite:
Simon stellte zwei Dinge in Frage: (1) ob `DemoScreen.tsx`s „Eigene Notiz erstellen"-Button vor dem Login echte KI aufruft (**Klärung: nein** — reiner Template-Fallback, `buildFallback()`, kein Netzwerk-Call, siehe Code-Kommentar in `DemoScreen.tsx:203-205` aus einer Vorsession; Simon entschied sich trotzdem den Button zu entfernen, **noch nicht umgesetzt**); (2) grundsätzlicher, ob ein gewrappter Web-App überhaupt für den App Store taugt, angesichts eines beobachteten Missverständnisses ("die App ist doch nur meine Website mit Icon, das braucht doch eh ein 'zum Homescreen hinzufügen', das kennt keiner").

**Wichtige Korrektur, die geklärt wurde:** Der Capacitor-Wrapper ist KEIN PWA-„Zum-Homescreen-hinzufügen"-Bookmark — es ist ein echtes, über Xcode/App-Store-Connect eingereichtes App-Bundle, landet nach Installation aus dem App Store wie jede andere App auf dem Homescreen, kein Tutorial nötig. Das kurze Aufblitzen eines System-Browsers beim Login ist normal und bei JEDER App (auch komplett nativen) so, da Apple aus Sicherheitsgründen einen echten System-Browser-Kontext für OAuth verlangt — ein nativer Rewrite würde diesen Moment NICHT eliminieren.

Zu Guideline 4.2 (Minimum Functionality, der eigentliche App-Store-Ablehnungsgrund für "nur eine Website"): wird durch fehlende native Funktionalität ausgelöst, nicht durch die Verwendung eines WebViews an sich (Capacitor ist Ionics offiziell App-Store-sanktioniertes Framework). DailyStudent nutzt bereits echte native Fähigkeiten (Kamera, natives Sign-In, native IAP, native Preferences/IndexedDB-Storage) — das mindert das Risiko, garantiert aber nichts.

Simon schlug vor, stattdessen (notfalls über Nacht) alles komplett nativ in SwiftUI neu zu bauen, mit der Begründung Supabase könne das Backend ja unverändert bedienen und die bestehende App sei bereits die volle Spezifikation. **Ehrliche Einschätzung dazu (siehe volle Details in der neuen Sektion „Zukunftsvision" weiter unten):** Supabase-Wiederverwendbarkeit stimmt (offizielles `supabase-swift`-SDK), die bestehende App als Spezifikation ist ein echter Vorteil — aber ein vollständiger Rewrite auf denselben Funktionsumfang ist realistisch Wochen bis Monate Arbeit, nicht ein Grind-Wochenende, unabhängig von Xcode-Tooling-Zugriff. Ergebnis: **Simon entschied sich, den aktuellen Wrapper für die 02.08.-Deadline einzureichen; ein echter nativer Rewrite wird ein separates Projekt OHNE Deadline für danach.**

---

## Letzte Session (25.07.2026, Fortsetzung) — kritischer Bugfix + AI-Modell-Migration

**Auslöser:** Simon merkte an, dass die AI-Modelle vor ~einem Monat gewählt wurden und sich das Feld schnell ändert — Auftrag: recherchieren welche Groq/Gemini-Modelle aktuell die beste kostenlose Kombination aus Qualität und Geschwindigkeit sind, plus andere Open-Source-Anbieter, plus neue Fähigkeiten, plus tatsächlich migrieren, noch in dieser Session. Recherche (mehrere parallele Agents) ergab echte Dringlichkeit: Groqs Vision-Modell (`meta-llama/llama-4-scout-17b-16e-instruct`) war zu diesem Zeitpunkt bereits seit 17.07.2026 tot, das Text-Modell (`llama-3.3-70b-versatile`) läuft am 16.08.2026 aus — eine Woche vor Simons App-Store-Deadline. Die gesamte Gemini-2.5-Familie läuft im Oktober 2026 aus.

**Während der Recherche meldete Simon einen zweiten, akuten Bug:** Lernzettel-Generierung lieferte **sofort** (nicht nach Timeout) den Fallback-Fehler. Zwei parallele Read-only-Untersuchungen (Git-Historie + Vercel-Plattform-Source-Recherche) fanden die Ursache eindeutig: Commit `6ee3336` (Vorsession) hatte `runtime: 'edge'` aus `api/gemini.ts` entfernt (um verlässlicheres `maxDuration` für große Lernplan/Lernzettel-Generierungen zu bekommen), aber den Handler als bare `export default async function handler(request: Request)` belassen. Vercels Node.js-Builder (`@vercel/node`) erkennt ein Modul nur dann als "Web Handler" (echtes Fetch `Request`/`Response`) wenn es benannte HTTP-Methoden-Exports (`GET`/`POST`) oder ein `fetch`-Property am Default-Export hat — ein bare-default-Function erfüllt keins von beidem, Vercel fällt auf die alte Node `(req, res)`-Konvention zurück, und die erste `request.headers.get(...)`-Zeile crasht sofort, noch bevor Gemini überhaupt kontaktiert wird. Das war unsichtbar solange `runtime: 'edge'` aktiv war (Edge Functions bekommen immer ein echtes Request-Objekt, unabhängig vom Export-Shape). **Fix:** Handler umbenannt zu einer normalen Funktion + `export default { fetch: handler }` — macht Vercels `isWebHandler`-Check wieder wahr, behält aber die Node-Runtime (und damit das eigentlich gewünschte längere `maxDuration`) bei. Committed + gepusht als `903d268`, noch vor der eigentlichen Modell-Migration, da es ein kompletter Produktions-Ausfall von Lernzettel UND Lernplan war.

**Modell-Migration (gleicher Commit):**
- Groq: `VISION_MODEL` → `qwen/qwen3.6-27b` (einziges verbliebenes Vision-Modell im Groq-Freikontingent, Preview-Status), `TEXT_MODEL` → `openai/gpt-oss-120b` (Freikontingent, garantierter strict-JSON-Modus)
- Gemini: `flash` → `gemini-3.5-flash`, `flash-lite` → `gemini-3.1-flash-lite`, `flash-image` → `gemini-3.1-flash-image-preview` — bewusst die etablierten Modelle statt der jeweils allerneuesten Version gewählt (Simons expliziter Wunsch: "prefer stability"), `GEMINI_URLS`-Map in `src/lib/gemini.ts` UND `api/gemini.ts` synchron gehalten (bestehende Konvention)
- Keine neuen API-Keys nötig — gleiche Provider (Groq, Google), gleiche 4 bestehenden Env-Vars, nur andere Modell-ID-Strings

**Wichtiger Fund beim direkten Live-Testen gegen die echten APIs (curl, nicht nur `tsc`):** Beide neuen Modelle sind standardmäßig Reasoning-Modelle — anders als die bisherigen Modelle verbrauchen sie unsichtbare "Denk"-Tokens bevor der eigentliche Output kommt, was die bestehenden `max_tokens`-Budgets (für Nicht-Reasoning-Modelle kalibriert) bei kleinen Calls leer oder abgeschnitten zurückgab. `openai/gpt-oss-120b` nutzt `reasoning_effort: 'low'|'medium'|'high'`; `qwen/qwen3.6-27b` nutzt stattdessen `'none'|'default'` UND schreibt sein `<think>`-Reasoning ohne `'none'` direkt in den `content`-String statt in ein separates Feld — hätte OCR-Text und JSON-Parsing in allen Vision-Callern unbemerkt korrumpiert. Zentral in `groqFetch()` gefixt (`reasoning_effort` je nach Modell automatisch gesetzt). Gemini `gemini-3.5-flash` zeigte dasselbe Muster (`thoughtsTokenCount` bis zu ~600 bei einem einfachen Test) — `thinkingConfig: { thinkingLevel: 'low' }` in `examFetch()` und in Lernplans Haupt-Call ergänzt (nicht im flash-lite-503-Fallback, der zeigte kein solches Overhead). Das sollte nebenbei auch Simons Beschwerde über langsame Lernplan-Generierung direkt adressieren, nicht nur die Migration selbst.

**Separater Fund, kein eigener Bug:** `gemini-3.1-flash-image-preview` (Lernzettel-Erklärbilder, Beta) lieferte beim Live-Test `RESOURCE_EXHAUSTED`/`limit: 0` — identisch reproduziert mit dem alten `gemini-2.5-flash-image`, also ein Google-seitiges Freikontingent-Problem, keine Regression durch die Migration. Betrifft nur den optionalen Beta-Toggle. Siehe Known Issues.

**Recherchiert, aber bewusst NICHT in dieser Session umgesetzt** (Scope-Entscheidung: Notfall-Fix + Migration sollten klein und risikoarm bleiben, keine neuen Baustellen in derselben Session):
- **Andere Provider:** Cerebras wäre ein guter kostenloser Ergänzungs-Kandidat (identische `gpt-oss-120b`-Gewichte, schneller, mehr Freikontingent, nicht-Preview Vision-Alternative `gemma-4-31b`); OpenRouter als Abstraktionsschicht für späteren Provider-Wechsel. Beides zurückgestellt, bis die aktuelle Migration ein paar Tage stabil gelaufen ist.
- **Neue Fähigkeiten:** kombinierter Tool-Use + strukturierter JSON-Output in einem Gemini-Call (könnte Mathe-Antworten in Probeklausur/Blurting per Code-Execution tatsächlich nachrechnen statt nur "abschätzen"), einstellbarer Reasoning-Aufwand pro Use-Case (mehr für AFB-III-Korrektur/Lernplan, weniger für einfache Lookups), Multi-Bild-OCR für mehrseitige Arbeitsblätter in einem Call, Nano Banana Pro für saubere Beschriftungen in generierten Lernzettel-Bildern. Alles als Roadmap-Kandidaten vorgemerkt, nicht als Teil dieser Migration.

**Nachtrag (25.07.2026) — Simons Live-Verifikation nach dem Fix/der Migration:** Simon hat den `903d268`-Fix live getestet. Ergebnis: Lernzettel-Textgenerierung (alle 4 Erklärungs-Modi, Prompts aus dem Groq→Gemini-Port) läuft jetzt durch und liefert brauchbare Ergebnisse — Simons Einschätzung: „fast gut", also im Kern erledigt, potenziell noch kleinere Prompt-Feinschliffe später, aber kein Blocker mehr. **Weiterhin kaputt, live bestätigt:** Die optionalen KI-Erklärbilder (Beta-Toggle „Mit Erklärbildern") erzeugen trotz eingeschaltetem Toggle kein Bild — deckt sich exakt mit dem bereits oben dokumentierten `RESOURCE_EXHAUSTED`/`limit: 0`-Befund (Google-seitiges Freikontingent-Problem für Bildgenerierung, kein Code-Bug in diesem Repo). Dieser Punkt wird bewusst **nicht** in dieser Session weiterverfolgt, sondern in einer separaten, parallel laufenden Claude-Code-Session behandelt — hier nur zur Status-Dokumentation festgehalten, siehe auch Known Issues #7.

---

## Session davor (25.07.2026, erster Teil)

**Fortsetzung der Track-B-Politur — Lernzettel-Überarbeitung als erstes von drei vorgemerkten Punkten**

Direkte Fortsetzung der 23.–24.07.-Session (siehe unten). Drei Punkte vorgemerkt, nacheinander abgearbeitet, nach jedem Punkt Push + Simons Review bevor es weitergeht: (1) Lernzettel Groq→Gemini-Port, (2) Abi-Notenrechner-Scoping, (3) finaler QA-Pass.

**Punkt 1 — Lernzettel — fertig, siehe Phase-3-Liste oben für Details.** Ausgangspunkt war ein Screenshot von Simon, der zeigte, dass KI-generierter Content (Smart-Note-Zusammenfassungen) als rohe `##`/`**`/`$...$`-Zeichen statt formatiertem Text/Formeln angezeigt wurde — das wurde als Root-Cause-Fix zuerst angegangen (neue `RichText`-Komponente), dann erst der eigentliche Prompt-Port. Zusätzlich zum ursprünglich in der Vorsession vorgemerkten Groq→Gemini-Port kamen auf Simons Wunsch dazu: 4 wählbare Erklärungs-Modi (Faktisch/Bildlich/Von Grund auf/Stichpunkte), optionale KI-generierte Erklärbilder über `gemini-2.5-flash-image` (Simon: "nur mit Gemini's Freikontingent, später auf bezahlt upgraden"), und ein Redesign des Preview-Karussells (weniger App-Chrome über dem eigentlichen Lernzettel-Inhalt). Neue Migration `013_lernzettel_modus_images.sql` — ✅ von Simon angewendet.

**Zwischendurch — Design-Kurswechsel (25.07.2026):** Nach dem Push von Punkt 1 hat Simon direkt Feedback zur Modus-Auswahl-UI gegeben (4 gestapelte Karten = "AI slop") und einen neuen, für die ganze App geltenden Standing-Workflow verlangt: `ui-ux-pro-max`-Skill für neue Screens, `emil-design-eng`-Skill für Animationen, Landing Page als App-weite Design-Messlatte (nicht mehr nur "in Planung", siehe Design-Sprache-Sektion). Als erste konkrete Umsetzung wurde die Modus-Auswahl durch den neuen `ModusRegler` ersetzt (Details in der Phase-3-Liste) — Details/Begründung auch in `feedback_design_skill_workflow`-Memory festgehalten.

**Punkt 2 — Abi-Notenrechner Block II — fertig, siehe Phase-3-Liste oben für Details.** Scoping-Ergebnis mit Simon: kein Bezug zu Niedersachsen-Einbringungsspezifika nötig, sondern die fehlende Grundstruktur ergänzen — Block II (5 Abiturprüfungen, je 0–15 NP ×4, max. 300 Punkte) zusätzlich zu Block I (600 Punkte aus den 4 Halbjahren, unverändert), kombiniert max. 900. Neue Migration `014_abi_pruefungen.sql` — ✅ von Simon angewendet.

**Zwischendurch (2) — Migrationen 013+014 angewendet, Lernplan-Kalenderexport-Sichtbarkeit (25.07.2026):** Simon hat parallel (in einer anderen Session) beide Migrationen im Supabase SQL Editor ausgeführt — bestätigt und in diesem Dokument nachgezogen. Direkt danach zwei kleine, klar spezifizierte UI-Bitten zum Lernplan: der Kalender-Export war nur ein unbeschriftetes Icon im Header (`LernplanDetailScreen.tsx`) und dadurch kaum auffindbar. Umgesetzt: (1) Print- und Kalender-Icon-Buttons expandieren jetzt auf Desktop-Hover zu einem beschrifteten Pill (neue `.icon-expand-btn`/`.icon-expand-label`-Klassen in `index.css`, hinter `@media (hover: hover) and (pointer: fine)` gated — gleiche Touch-Sicherheits-Konvention wie `.hover-lift`); (2) neuer primärer, voller-Breite Button „Zum Kalender hinzufügen" direkt über „Lernplan löschen", mit dem exakten Landing-Page-Gradient (`#7C3AED → #5B21B6`) statt der App-üblichen `grad-accent`-Klasse, weil Simon explizit „genau wie die Landing-Page-Buttons" wollte. Ruft dieselbe bestehende `addToCalendar()`-Funktion auf wie das Header-Icon, keine Logik dupliziert.

Gleichzeitig nachgefragt: KI-Erklärbilder fürs Lernzettel weiterhin unsichtbar. Re-bestätigt als reines Google-Freikontingent-Problem (siehe Known Issues #6) — nicht per Code fixbar, App-seitige Anzeige-Logik ist bereits korrekt gebaut. Simon stufte das zusammen mit dem Kalender-Button explizit als letzten Blocker vor dem Start der Apple-App-Store-Migration (Track A) ein.

**Diese Session (25.07.2026) ist damit abgeschlossen** — Simon geht mit einem neuen Chat weiter. Siehe „Nächste Session — Handoff" unten für den vollständigen Übergabe-Stand.

---

## Session davor (23.–24.07.2026)

**Große Track-B-Session vor dem App-Store-Launch (Ziel 02.08.2026) — viel gebaut, ein kritischer Bug am Ende entdeckt**

Ausgangspunkt war ein Planungsgespräch über alle offenen To-Dos vor der App-Store-Einreichung; dabei kam heraus, dass die App noch gar kein natives Wrapper-Projekt hat (reine Web-App) — das wurde als eigener Track A (Simon selbst) abgetrennt, siehe Claude-Memory `project-app-store-launch-plan`. Diese Session war Track B (Politur/Bugfixes am bestehenden Repo). Gebaut, in dieser Reihenfolge:

1. Google OAuth Account-Picker-Fix (`prompt: 'select_account'`)
2. Coins-Rabatt via Stripe komplett fertiggestellt (Migration 011, RPC, UI) — Simon muss noch die 2 Coupons in Stripe anlegen
3. DemoScreen Groq-Key-Exposure gefixt (Key war im Production-Bundle scrapebar, Live-Call entfernt)
4. AI Rate-Limiting gebaut (Migration 012, 8 Buckets, `ai_blocked`-Sperre) + Lernplan-Einzel-Free-Limit auf 3/Tag
5. Onboarding-Reset von den allgemeinen Einstellungen in die Dev-Tools verschoben (war destruktiv + für alle User sichtbar)
6. Übersicht (Dashboard) mehrfach neu gestaltet nach Mockup-Vorgaben — Erste-Schritte-Checkliste, Hero-Karte mit echtem Lernplan-Fortschritt, „To-Do"-Karte (Klausur+Hausaufgaben gesplittet), gefächerte Notizen-Karten, dunkle Karten mit Ambient-Glow
7. ProfilScreen von 13 Abschnitten auf einer Seite in einen schlanken Hub + 5 Unterseiten aufgeteilt
8. Coins-Screen komplett neu (2 große Karten, violett/mint, Framer-Motion-Animation) — **Simon sagt: gefällt ihm noch nicht, konkretes Feedback steht aus**
9. Streak-Erklärungs-Sheet gebaut (echte Mechanik-Regeln aus dem Code abgeleitet, nicht geraten)
10. `ui-ux-pro-max` + Emil-Kowalski-Animations-Skills installiert (via `uipro-cli` bzw. `skills` CLI von Vercel Labs)

**Am Ende der Session kurzzeitig kaputt, noch in derselben Session gefixt:** Groq/Gemini-APIs gaben nur noch Fehler zurück, komplett unbenutzbar — Ursache war genau wie vermutet: Migrationen 011/012 waren noch nicht in der echten Supabase-DB angewendet (Simon hatte es vergessen), UND der neue Rate-Limiter in `api/groq.ts`/`api/gemini.ts` war fail-closed statt fail-open gebaut. Simon hat die Migrationen nachträglich angewendet; zusätzlich wurde `checkRateLimit()` in beiden Dateien auf fail-open umgestellt (bei jedem Fehler/Unreachable wird der Request jetzt durchgelassen statt blockiert) — sollte sowas nie wieder die ganze App lahmlegen können.

**Nicht mehr geschafft in dieser Session (explizit für die nächste vorgemerkt):**
- Lernzettel-Prompt Groq → Gemini Port
- Abi-Notenrechner Scoping-Gespräch + Fix (Block II fehlt komplett)
- Finaler QA-Pass über alle Änderungen dieser Session

---

## Session davor (20.06.2026)

**Referral-System Bug-Fix — Trigger von Signup auf Onboarding-Abschluss verschoben**

Das Referral-System (Migration 009, Edge Function `handle-referral`, UI in ProfilScreen) war bereits vollständig gebaut, hat aber nicht zuverlässig funktioniert: Der `callHandleReferral()`-Call feuerte direkt nach `signUp()` in `AuthScreen` — zu diesem Zeitpunkt ist bei aktivierter Email-Confirmation `getSession()` oft `null` → silent fail. Zusätzlich wurde der Code in `sessionStorage` gespeichert, der stirbt wenn der Browser zwischen Signup und Onboarding geschlossen wird.

**Fixes:**
1. `src/lib/referral.ts` (neu) — `callHandleReferral()` als shared Helper extrahiert
2. `App.tsx` — `sessionStorage` → `localStorage` für `referral_code` (überlebt Email-Confirmation-Flow)
3. `AuthScreen.tsx` — Referral-Call bei Signup komplett entfernt
4. `OnboardingScreen.tsx` — Referral-Call beim Abschluss des Onboardings: User ist jetzt authentifiziert ✅, Session aktiv ✅, Onboarding abgeschlossen ✅
