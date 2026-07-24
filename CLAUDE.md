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
**Wachstumshebel:** TikTok-Marketing (funktioniert bereits) + Email-Liste mit ~100 warmen Leads vom Landing Page. Discord hat 4.200 User, aber ~3.500 waren Abi-Jahrgänge die jetzt den Server verlassen → nur noch ~1.500 echter Niche. Discord ist NICHT mehr primärer Kanal.  
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

## Aktueller Stand — Phase 2 komplett, Phase 3 zu ~99% (Stand: 24.07.2026)

**App-Store-Kontext:** Ziel ist Einreichung im Apple App Store bis **02.08.2026** (danach ist Simon in Kanada, nicht erreichbar). Arbeit läuft in 2 Tracks: **Track A** (Capacitor-Wrapper, Apple IAP via RevenueCat, Sign in with Apple, Apple Developer Portal) — macht Simon selbst, Claude hat keinen Portal-Zugriff. **Track B** (App-Politur/Bugfixes im bestehenden Repo) — läuft in Claude-Code-Sessions, siehe To-Do unten. Volle Sequenzierung + Architekturentscheidungen für Track A liegen in Claudes Memory unter `project-app-store-launch-plan`.

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

### Known Issues (Stand: 24.07.2026):

**🔴 CRITICAL — Groq/Gemini APIs geben aktuell nur Fehler zurück, App ist für KI-Features nutzlos (gemeldet 24.07.2026):**
Vermuteter Grund: Die AI-Rate-Limiting-RPC `check_ai_rate_limit()` (aus `supabase/migrations/012_ai_rate_limits.sql`) existiert wahrscheinlich noch nicht in der echten Supabase-DB — Migrationsdateien wenden sich nicht selbst an, Simon muss sie manuell im SQL Editor ausführen, das ist vermutlich noch nicht passiert (evtl. auch `011_coins_discount_redeem.sql` betroffen). `api/groq.ts`/`api/gemini.ts` rufen diese RPC jetzt vor JEDEM Request auf — wenn der Call fehlschlägt (z.B. weil die Funktion serverseitig nicht existiert), gibt `checkRateLimit()` aktuell `{ allowed: false, blocked: false }` zurück → die Edge Function lehnt den Request mit 403 ab. Das ist ein **fail-closed Design-Fehler**: jeder Fehler beim Rate-Limit-Check blockiert komplett alle KI-Calls, statt sie einfach unlimitiert durchzulassen.
**Sofortmaßnahme nächste Session:**
1. Prüfen ob `011_coins_discount_redeem.sql` + `012_ai_rate_limits.sql` tatsächlich in der echten Supabase-DB angewendet wurden (SQL Editor → History, oder direkt `SELECT * FROM pg_proc WHERE proname = 'check_ai_rate_limit'` probieren) — falls nicht: anwenden lassen (Simon, benannt als `011_coins_discount_redeem` / `012_ai_rate_limits`).
2. **Unabhängig davon**: `checkRateLimit()` in `api/groq.ts` + `api/gemini.ts` von fail-closed auf fail-open umstellen — bei Fehler/Unreachable `{ allowed: true, blocked: false }` zurückgeben, nicht `false`. Ein kaputter Rate-Limiter darf niemals die ganze App lahmlegen; im schlimmsten Fall ist die Decke für einen Moment nicht durchgesetzt, das ist ein deutlich kleineres Problem als ein kompletter Totalausfall.

**MINOR:**
1. **Apple OAuth** — Button in AuthScreen vorhanden, aber NICHT GETESTET (wird im Zuge von Track A/App-Store-Vorbereitung fertiggestellt — braucht Capacitor-Deep-Link-Handling + Supabase Apple-Provider-Konfiguration)
2. **Email Confirmation Flow** — kein UI-Hinweis nach Signup
3. **Impressum Steuernummer** — Platzhalter, nach Eingang vom Finanzamt Harburg nachtragen
4. **Coins Shop Redesign gefällt Simon noch nicht** — `ProfilCoinsScreen.tsx` wurde in 2 große Karten umgebaut (violett Checkliste / mint Shop, Framer-Motion-Entrance-Animation), aber Simon hat explizit gesagt das Design trifft es noch nicht. Konkretes Feedback steht noch aus — vor weiterer Iteration erst nachfragen was genau nicht passt, nicht einfach nochmal neu raten.
5. **Kein natives Wrapper-Projekt für den App Store** — die App ist aktuell eine reine Vite/React Web-App ohne Capacitor/React-Native-Wrapper. Für die Einreichung im Apple App Store fehlt noch: Capacitor-Setup, Apple IAP via RevenueCat (Stripe-only verstößt gegen Guideline 3.1.1), Sign in with Apple fertigstellen. Das ist Track A — Simon macht das selbst (Apple Developer Account, Zertifikate, App Store Connect), volle Sequenzierung liegt in Claudes Memory (`project-app-store-launch-plan`).

### To-Do — Priorisiert (Stand: 24.07.2026):

#### Direkt als nächstes (Track B, noch offen aus der 23.–24.07. Session):
0. **🔴 KRITISCH — Groq/Gemini APIs reparieren** (siehe Known Issues oben) — App ist aktuell für alle KI-Features unbenutzbar. Zuerst: Migrationen 011+012 wirklich in Supabase angewendet? Dann: `checkRateLimit()` in `api/groq.ts`/`api/gemini.ts` fail-open statt fail-closed machen. Das hier zuerst, vor allem anderen.
1. **Lernzettel-Prompt: Groq → Gemini portieren, Komplexität erhöhen** — `generateLernzettel()` in `groq.ts` (aktuell Llama 3.3 70B, JSON-Mode, 2048 Tokens) auf Gemini umstellen. Pattern wie `examFetch` in `gemini.ts` (`candidates[].content.parts[].text`, nicht Groqs `choices[].message.content`). `maxOutputTokens` deutlich über 2048 anheben, System-Prompt in Richtung `GENERATION_SYSTEM`-Tiefe (Probeklausur-Vorbild) ausbauen. **Muss weiterhin exakt das Markdown-Subset ausgeben**, das `LernzettelScreen.tsx`s Renderer erwartet: `##`, `###`, `**bold**`, `> `, `"Merke: "`.
2. **Abi-Notenrechner (`AbiRechnerScreen.tsx`) — erst Scoping-Gespräch mit Simon, dann Fix** — aktuelle Berechnung ist strukturell unvollständig, nicht nur eine UI-Frage: berechnet nur einen Block-I-artigen Halbjahresnoten-Schnitt (`totalPunkteAllHalbjahre()`). Es fehlt komplett: Abiturprüfung (Block II), „beste N von M Halbjahre"-Einbringungspflicht-Auswahl; Fächer werden nach Fach-Mittelwert statt pro einzelner Halbjahresleistung gewichtet. `pktToNoteAbi()`s `(17-p)/3`-Formel selbst ist korrekt (offizielle KMK-Formel) — der Fehler liegt upstream, in dem was `p` repräsentiert. **Vor dem Bauen mit Simon klären:** volle Korrektheit anstreben (Niedersachsen-spezifische Einbringungsregeln, nicht trivial) oder als klar gekennzeichnete Schätzung labeln?
3. **Final QA-Pass auf alle Track-B-Änderungen dieser Session** — durchklicken: Google-Login (Account-Picker), Stripe-Checkout + Rabatt-Einlösung (sobald Simon die Coupons angelegt hat), alle 5 neuen Profil-Unterseiten, Übersicht (To-Do-Karte beide Hälften, Streak-Widget, Lernplan-Hero „Fortsetzen", Erste-Schritte-Checkliste, gefächerte Notizen-Karten), Streak-Erklärungs-Sheet.

#### Danach:
4. **Coins Shop Redesign — konkretes Feedback von Simon einholen** bevor weiter iteriert wird (siehe Known Issues).
5. **Onboarding Soft-Start** — Nutzer bekommt sofort App-Zugang (kein Gate), sieht aber auf jedem Screen eine Bubble/Banner: "Personalisierung in 1 Min abschließen → bessere KI-Ergebnisse".
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

## Supabase DB-Schema — 15 Tabellen (Stand 24.07.2026)

| Tabelle | Inhalt |
|---------|--------|
| `profiles` | Name, Klasse, Schulform, Bundesland, Fächer, `custom_faecher` (JSONB), Klausurtermine, Stundenplan (JSONB), Abi-Gesamtnote, Theme, isPro, isDevMode, `ai_blocked` (neu, Migration 012) |
| `grade_data` | `abi_halbjahre` (JSONB) — **dedizierte, isolierte Notentabelle**, verhindert Überschreiben durch Profile-Sync |
| `app_stats` | Streak, scanCount, examCount, lastStudyDate, studiedDays[], examScores[], coins, cooldowns[], streakFreezes, freezeUsedDates[] |
| `user_folders` | Fach-Ordner-Baum mit Eltern-Kind-Beziehung |
| `user_notes` | Alle Notizen (Text/Foto/PDF), attachments (lokal-first Refs), homework_items, qa |
| `generated_smart_notes` | KI-Analyse-Ergebnis pro Notiz (summary, keywords, examTopics, solution) |
| `flashcards` | Alle Karteikarten mit front/back/subjectId |
| `lernzettel` | Generierte Lernzettel mit Inhalt und Metadaten |
| `saved_probeklausuren` | Abgeschlossene Klausurversuche mit KI-Korrektur |
| `lernplaene` | Generierte Lernpläne (days JSONB, config JSONB, `completedDays` neu) |
| `personal_entries` | Kalendereinträge (lerneinheit/termin/erinnerung) |
| `standalone_homework` | Hausaufgaben ohne Notiz-Kontext |
| `subscriptions` | Stripe-Abonnements (nur server-seitig schreibbar via Webhook) |
| `ai_usage` (neu, Migration 012) | Pro user_id/bucket/day ein Zähler — Grundlage der Rate-Limit-Decke |
| `ai_rate_limit_strikes` (neu, Migration 012) | Ein Eintrag pro user_id/bucket/day an dem die Decke überschritten wurde — 2 Einträge insgesamt → `profiles.ai_blocked = true` |

**RLS:** Jede Tabelle hat RLS — User kann nur eigene Rows lesen/schreiben (`auth.uid() = user_id`). `ai_usage`/`ai_rate_limit_strikes` haben RLS aktiviert aber keine Policies — nur über die `SECURITY DEFINER`-RPC `check_ai_rate_limit()` erreichbar, kein direkter Client-Zugriff vorgesehen.

**Migrationen 001–012**, alle in `supabase/migrations/`:
001 initial schema · 002 grade_data · 003 custom_faecher · 004 coins_system · 005 atomic_coins (RPC) · 006 harden_coin_rpcs · 007 note_attachments_storage · 008 early_access · 009 referral_system · 010 personal_entries_extra_fields · 011 coins_discount_redeem (RPC) · 012 ai_rate_limits (RPC) — **011 und 012 vermutlich noch NICHT auf der echten DB angewendet, siehe kritisches Known Issue oben.**

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
- **Supabase SQL Editor — Queries immer benennen:** Wenn Simon eine neue Migration manuell im Supabase SQL Editor ausführen muss, IMMER explizit dazuschreiben: „Speichere die Query als `<migrations-dateiname ohne .sql>`" (z.B. `007_note_attachments_storage`), statt sie als „Untitled query" im Verlauf stehen zu lassen — sonst sind alte Änderungen im SQL-Editor-Verlauf nicht mehr unterscheidbar.
- **Custom Fächer:** `profile.customFaecher` Array in `UserProfile`. `resolveSubjectInfo(id, customFaecher)` in `subjectInfo.ts` liefert Fallback-Icon 📚 + Farbe für custom IDs. `syncProfile` schreibt `custom_faecher` nach Supabase, `mapProfile` liest es zurück.
- **Note-Attachments sind lokal-first (IndexedDB), nicht Base64:** `UserNote.attachments`/`drawingAttachments` enthalten nach dem Speichern `idb:<uuid>` (lokal) oder `cloud:<uuid>:<pfad>` (explizit übertragen) statt Base64 — Auflösung immer über `getAttachment()`/`useResolvedAttachments()` aus `src/lib/noteStorage.ts`, nie `note.attachments` direkt als `<img src>` rendern. Lokalisierung passiert zentral in `UserContext.tsx` (`saveNote`/`updateUserNote`/etc.) — neue Save-Pfade für Notizen müssen über diese Funktionen laufen, sonst bleibt Base64 ungefiltert in Postgres. Kein Auto-Upload in die Cloud — nur über den expliziten „Übertragen"-Button.
- **AI Rate-Limiting: Buckets sind tier-blind, feste serverseitige Ceilings** — `src/lib/aiRateLimit.ts` definiert das `AiBucket`-Union (`smart_notes`, `flashcards`, `blurting`, `keyword_qa`, `lernzettel`, `probeklausur_full`, `probeklausur_other`, `lernplan`). Jede der 21 Groq/Gemini-Funktionen taggt sich beim Aufruf mit ihrem Bucket; die tatsächliche Zahl (Ceiling) lebt NUR serverseitig in `api/groq.ts`/`api/gemini.ts` (hardcoded `BUCKET_LIMITS`), niemals clientseitig — sonst könnte ein manipulierter Client sein eigenes Limit vortäuschen. Bewusst KEIN Pro/Free-Unterscheidung im Limiter selbst (Simons Entscheidung) — das ist reiner Abuse-Schutz, keine Monetarisierung; Produkt-Limits (z.B. Lernzettel 1/Tag Free) bleiben separat client-seitig geprüft wie bisher. **Fail-open, nicht fail-closed** — falls sich das noch nicht in `checkRateLimit()` widerspiegelt, ist das ein offener Bug (siehe Known Issues).
- **Karten die IMMER dunkel sind (unabhängig vom App-Theme) brauchen hardcodierte Farben, nicht die theme-CSS-Variablen** — z.B. die Übersicht-Hero-Karten (`DashboardScreen.tsx`, `Card` mit `dark` Prop). `rgb(var(--color-accent))` etc. sind theme-abhängig (unterschiedliche Werte in `:root` vs `.dark` in `index.css`) und wirken auf einer erzwungenermaßen dunklen Kartenfläche im Light-Mode zu blass. Für solche "immer dunkles Chrome"-Elemente feste, dark-taugliche Hex-Werte direkt im Code verwenden (Beispiel: `urgencyColor` in `ToDoCard`).
- **`Lernplan.completedDays?: string[]`** — Liste von `LernplanDay.date`-Strings, die als erledigt markiert wurden. Bisher nur von der Dashboard-Hero-Karte geschrieben (markiert die nächste Session bei Klick auf „Fortsetzen"), noch kein granulares Toggle direkt in `LernplanDetailScreen` (das ist ein offener Folge-Punkt, siehe To-Do). Persistiert ganz normal über das bestehende `saveLernplan()`.

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

## Screens (39 total — alle geroutet, alle funktionsfähig)

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
│                                 # SyncErrorBanner, KcFallbackBanner, MathRenderer,
│                                 # StreakBadge, StreakInfoSheet, ...
├── context/
│   └── UserContext.tsx            # Zentraler State + localStorage + Supabase Auth + Sync Queue
├── data/
│   ├── mockData.ts                # halfYears[], topics[], subjects[] (Legacy-Stubs, kein Mock mehr)
│   ├── subjectInfo.ts             # SUBJECT_INFO + SUBJECT_GROUPS (Name, Icon, Farbe pro Fach)
│   └── kcLoader.ts                # loadKcForSubject/User(), buildKcPromptContext()
├── lib/
│   ├── groq.ts                    # Alle Groq API Calls (OCR, SmartNote, Flashcards, Blurting, Lernzettel, ...)
│   ├── gemini.ts                  # Gemini API Calls (Probeklausur, Lernplan, File-Import)
│   ├── stripe.ts                  # createCheckoutSession(plan, couponId?) — ruft create-checkout-session Edge Fn auf
│   ├── supabase.ts                # Supabase Client
│   ├── supabaseSync.ts            # Sync-Layer: syncProfile, syncGradeData, syncNote, etc. + Queue
│   ├── streak.ts                  # getActiveStreak(streak, lastStudyDate) — single source of truth
│   ├── aiRateLimit.ts             # AiBucket-Union (8 Buckets) — client-seitige Typ-Sicherheit für Rate-Limiting
│   └── pdf.ts                     # PDF → Bilder Konvertierung (pdfjs)
├── screens/                       # Ein Screen pro Route (39 Screens — alle aktiv, inkl. 5 neue Profil*.tsx Unterseiten)
└── types/
    └── index.ts                   # Alle TypeScript-Typen
public/
├── kc/                            # KC-JSONs: 16 Bundesländer × ~12 Fächer = ~196 Dateien
└── lernzettel-previews/           # 4 Original-Lernzettel-HTMLs für Pro Preview Karussell
supabase/
├── migrations/                    # 001–012, siehe DB-Schema-Sektion oben für Details
└── functions/
    ├── groq-proxy/                # (vermutlich toter Code — src/ ruft stattdessen /api/groq auf, prüfen ob löschbar)
    ├── gemini-proxy/              # (vermutlich toter Code — src/ ruft stattdessen /api/gemini auf, prüfen ob löschbar)
    ├── create-checkout-session/   # Stripe Checkout (deployed ✅, Live-Mode, akzeptiert jetzt couponId)
    ├── stripe-webhook/            # Stripe Webhook Handler (deployed ✅, Live-Mode)
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

**Status:** In Planung. Die Landing Page (`/landing`) mit ihrem dunklen Hintergrund, purple/mint Akzenten und Premium-Atmosphäre ist die Referenz für den App-Redesign. Neue Features und Screens sollen bereits in diese Richtung gehen.

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

## Developer-Kontext

- **Entwickler:** Simon (kein Coding-Background, arbeitet mit Claude Code in VS Code) + Jan (Simons Helfer)
- **Workflow:** Claude Code baut, Simon reviewed im Browser (localhost:5174), dann git commit + push
- **Git:** `git add . && git commit -m "..." && git push`
- **Wichtig:** Immer erklären was gebaut wurde und warum — keine stillen Änderungen

---

## Letzte Session (23.–24.07.2026)

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

**🔴 Am Ende der Session gemeldet, NICHT mehr gefixt:** Groq/Gemini-APIs geben nur noch Fehler zurück, komplett unbenutzbar. Sehr wahrscheinliche Ursache: Migrationen 011/012 wurden vermutlich noch nicht in der echten Supabase-DB angewendet (nur die SQL-Dateien existieren im Repo), und der neue Rate-Limiter in `api/groq.ts`/`api/gemini.ts` ist fail-closed statt fail-open gebaut — jeder Fehler beim Rate-Limit-Check (inkl. „RPC existiert noch nicht") blockiert dadurch ALLE KI-Calls statt nur die, die wirklich über dem Limit sind. **Das ist die #1-Priorität der nächsten Session** — siehe Known Issues + To-Do oben für die genaue Fix-Anleitung.

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
