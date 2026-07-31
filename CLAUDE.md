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

## Aktueller Stand — Phase 2 komplett, Phase 3 zu ~99%, App von Apple genehmigt, **Beta-Modus aktiv** (Stand: 31.07.2026)

**App-Store-Kontext:** Die App wurde von Apple genehmigt — Status in App Store Connect ist **„Pending Developer Release"** (fertig geprüft, aber noch nicht öffentlich; Simon entscheidet selbst wann er auf „Release" klickt). Eingereicht wurde am 27.07.2026, vor dem ursprünglichen Ziel-Datum 02.08.2026 (danach ist Simon in Kanada, nur mit Handy erreichbar, kein Laptop). Track B (App-Politur) ist fertig, Track A (Capacitor-Wrapper + Apple IAP via RevenueCat + Sign in with Apple) ist vollständig gebaut und der eingereichte Build genehmigt. Volle Sequenzierung + Architekturentscheidungen für Track A liegen in Claudes Memory unter `project-app-store-launch-plan`. **Wichtig, nicht verwechseln:** Das ist der kurzfristige Wrapper-Ansatz — komplett getrennt von Simons langfristiger Vision eines echten nativen SwiftUI-Rewrites OHNE Deadline, siehe neue Sektion „Zukunftsvision" weiter unten.

**🔶 Beta-Modus ist seit 31.07.2026 aktiv** (Simons Urlaub, App real herunterladbar, 150+ Warteliste) — Pro-Käufe sind komplett pausiert und drei Probeklausur-Modi sind auf Eis, ferngesteuert über die `app_config`-Tabelle in Supabase, ohne Code-Deploy umschaltbar. **Vollständige Datei-für-Datei-Referenz, was genau pausiert ist und wie es zurückgesetzt wird: Abschnitt „🔶 Beta-Modus — vollständige Referenz" direkt unter der Paywall-Tabelle weiter unten.** Lies das zuerst, bevor du an Probeklausur/Lernplan/Lernzettel/Pro-Kauf-Code arbeitest — die Paywall-Tabelle unten beschreibt den NORMALZUSTAND, der Beta-Abschnitt beschreibt was gerade tatsächlich läuft.

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
- **AI Rate-Limiting (23.07.2026)** ✅ — `supabase/migrations/012_ai_rate_limits.sql`: `ai_usage`/`ai_rate_limit_strikes` Tabellen + `profiles.ai_blocked` Spalte + `check_ai_rate_limit()` RPC (row-locked, gleiches Muster wie `grant_coins`). `/api/groq` + `/api/gemini` prüften vorher nur ob überhaupt ein gültiger Login vorliegt, nie ein Volumen-Limit — ein Free-Account (30 Sek. zum Anlegen) konnte beide Endpunkte unbegrenzt in einer Schleife aufrufen. Alle Groq/Gemini-Funktionen sind jetzt einem von 9 Buckets zugeordnet (`smart_notes`, `flashcards`, `blurting`, `keyword_qa`, `lernzettel`, `lernzettel_visuals` (neu, 25.07.2026), `probeklausur_full`, `probeklausur_other`, `lernplan`) mit fester, serverseitiger Tages-Decke pro Bucket — gleiche Zahl für alle Accounts, keine Pro/Free-Unterscheidung im Limiter selbst. Wer eine Decke an 2 verschiedenen Tagen überschreitet, wird per `ai_blocked` dauerhaft von allen KI-Calls gesperrt (ein Strike pro Tag/Bucket, nicht pro Retry). Separat: Lernplan Einzel für Free-User zusätzlich auf 3/Tag begrenzt (Produkt-Limit in `LernplanKonfiguratorScreen.tsx`, unabhängig vom Rate-Limiter).
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
- **Lernzettel löschen + swipebare Markieren/Löschen-Aktionen, wie Apple Notizen (25.07.2026)** ✅ — Bibliothek (`LernzettelScreen.tsx`) hatte keine Lösch-Möglichkeit und wurde unübersichtlich. Zwei Ergänzungen: (1) Detail-Ansicht bekommt einen "Lernzettel löschen"-Button ganz unten, mit `window.confirm()`-Bestätigung (gleiches Muster wie `LernplanDetailScreen`s Löschen-Button). (2) Jede Zeile in der Bibliotheksliste ist neu nach links wischbar — eigene `LernzettelRow`-Komponente (lokal in `LernzettelScreen.tsx`), `framer-motion` `drag="x"` mit `dragConstraints`/`dragElastic`, legt beim Wischen zwei fest positionierte Aktionen dahinter frei: gelber Stern ("Markieren", `#FFD60A`) und roter Papierkorb ("Löschen", `#FF3B30`, sofort ohne Bestätigungsdialog — die Wisch-Geste selbst ist bereits der bewusste zweite Schritt). `onTap` (nicht natives `onClick`) unterscheidet zuverlässig Tap-zum-Öffnen von Swipe-Geste; ein `openRowId`-State im Screen sorgt dafür, dass Wischen einer neuen Zeile die vorherige automatisch wieder schließt (wie in Apple Notizen). Markierte Lernzettel sortieren sich an den Anfang der Liste und bekommen ein kleines gelbes Stern-Badge neben dem Titel — sonst wäre "Markieren" folgenlos. **Erste swipebare Listenzeile im gesamten Repo** — bei Bedarf an anderer Stelle (z. B. Notizen, Karteikarten-Decks) als Vorbild wiederverwendbar, siehe Architektur-Entscheidungen.
  - Neues Feld `Lernzettel.highlighted?: boolean`, neue Funktionen `deleteLernzettel()`/`toggleLernzettelHighlight()` in `UserContext.tsx` (Pattern wie `deleteSavedProbeklausur`/`deleteLernplan`: lokalen State filtern, `saveStorage({...loadStorage(), ...})` direkt statt `persist()`, dann `deleteLernzettelFromDB()` fire-and-forget). `deleteLernzettel()` räumt zusätzlich die begleitende `UserNote` (`deleteNotesFromDB`) und alle `idb:`-Refs in `Lernzettel.images` über `deleteAttachment()` auf — bewusst NICHT über `deleteAttachmentsForNotes()`, das nur `UserNote.attachments` kennt, nicht das separate `Lernzettel.images`-Feld. Neue Migration `015_lernzettel_highlighted.sql` (`lernzettel.highlighted` Spalte) — **Anwendungs-Status unklar, siehe DB-Schema-Sektion, mit Simon abklären.**

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

### 🔶 Beta-Modus — vollständige Referenz (aktiv seit 31.07.2026, siehe Sessions „31.07.2026" weiter unten für die volle Entstehungsgeschichte)

**Warum:** Simon ist im Urlaub, nur Handy erreichbar, kein Laptop. Zwei Sorgen: (1) kein Support möglich, falls ein zahlender Nutzer ein Problem hat; (2) KI-Token-Kosten bei mehreren gleichzeitigen Nutzern (App ist jetzt real herunterladbar, 150+ Warteliste). Nichts wurde entfernt — jede Änderung ist ein bedingtes Überspringen des alten Codes, gesteuert über ein einziges Set von Flags. Alter Code + alte UI bleiben vollständig erhalten und laufen automatisch wieder normal, sobald die Flags zurückgesetzt werden.

**Steuerzentrale: Supabase-Tabelle `app_config`** (Migration `017_beta_mode_config.sql`, ✅ angewendet), 1 Zeile (`id=1`), öffentlich lesbar, nur über Supabase Table Editor beschreibbar (funktioniert vom Handy-Browser, kein Deploy nötig). Client lädt sie einmalig beim App-Start in `UserContext.tsx` → `appConfig` (Context-Wert, fail-open auf „alles normal", falls Fetch fehlschlägt oder die Zeile fehlt).

**Aktueller Werte-Stand (Beta AN):**

| Spalte | Beta-Wert | Normal-Wert (Default der Spalte) |
|---|---|---|
| `pro_purchases_enabled` | `false` | `true` |
| `probeklausur_afb_trainer_free` | `true` | `false` |
| `probeklausur_mode2_enabled` | `false` | `true` |
| `probeklausur_mode3_enabled` | `false` | `true` |
| `probeklausur_mode4_enabled` | `false` | `true` |

**So zurücksetzen (kein Deploy, kein Code):** Handy-Browser → `supabase.com` einloggen → Projekt öffnen → „Table Editor" → Tabelle `app_config` → die eine Zeile antippen → alle 5 Werte auf die „Normal-Wert"-Spalte oben umstellen → speichern. Wirkt sofort beim nächsten App-Start eines Nutzers.

**Datei-für-Datei, was während Beta pausiert/geöffnet ist:**

| Datei | Funktion/Stelle | Was passiert während Beta |
|---|---|---|
| `src/context/UserContext.tsx` | `AppConfig`-Interface, `appConfig`-State + Fetch-Effect | Lädt `app_config` einmalig, stellt es app-weit über `useUser().appConfig` bereit |
| `src/components/ui/ProModal.tsx` | `handleCheckout()` / gesamte Modal-Ansicht | Zeigt statt Preis-Toggle/Stripe-Checkout eine „Pro startet nach der Beta"-Ansicht + „Für Rabatt vormerken"-Button (schreibt `profiles.pro_waitlist_interested=true`). **Zentraler Hebel — alle 9 ProModal-Trigger im Code laufen hierüber.** |
| `src/screens/ProfilScreen.tsx` | `handleUpgrade()` | Früher Return zur ProModal-Beta-Ansicht statt Stripe/RevenueCat-Aufruf |
| `src/screens/ProfilScreen.tsx` | Pro-Upgrade-Banner (oben im Profil) | Zeigt Beta-Karte („Pro startet nach der Beta" + Vormerken-Button) statt Preis-Karte |
| `src/screens/ProbeklausurMenuScreen.tsx` | `handleModeClick()` | Mode 1 navigiert frei (kein Pro-Check); Mode 2/3/4 öffnen ProModal statt zu navigieren |
| `src/screens/ProbeklausurMenuScreen.tsx` | Karten-Badges | Mode 1: „Kostenlos in der Beta" · Mode 2–4: „🕒 Bald wieder da" (statt „✦ Pro") |
| `src/screens/ProbeklausurMode1Screen.tsx` | `correctionUnlocked` | `isPro \|\| probeklausurAfbTrainerFree` — KI-Korrektur für alle offen |
| `src/screens/ProbeklausurMode2Screen.tsx` | früher Return vor Haupt-`return` | Zeigt `<BetaPausedScreen title="Vollständige Klausur">` — Screen komplett unerreichbar, auch per Direkt-URL/Resume |
| `src/screens/ProbeklausurMode3Screen.tsx` | früher Return vor Haupt-`return` | `<BetaPausedScreen title="Materialklausur">` |
| `src/screens/ProbeklausurMode4Screen.tsx` | früher Return vor Haupt-`return` | `<BetaPausedScreen title="Ohne Material">` |
| `src/components/ui/BetaPausedScreen.tsx` | (neue Datei) | Full-Screen-Fallback-Komponente, von den 3 Screens oben genutzt |
| `api/gemini.ts` | `isProbeklausurMode2Paused()` | Serverseitiger Block für Bucket `probeklausur_full` (= Mode 2 Generierung) — einziger Modus mit eigenem Bucket, daher sauber blockbar. **Mode 1/3/4 teilen sich `probeklausur_other` — dort nur clientseitige Absicherung, bewusste Lücke, siehe Session-Log 31.07.2026.** |
| `src/screens/LernzettelScreen.tsx` | „Pro Lernzettel"-Vorschau-Badges + CTA | „✦ PRO" → „Vorschau", „Pro freischalten"-Button → „Für Update vormerken" (neutrale Farbe statt Gold) |
| `src/screens/LernzettelGeneratorScreen.tsx` | `handleGenerate()`, neuer `todayLernzettelCount`-Check | **Neu gebaut** (existierte vorher gar nicht im Code): 1/Tag-Deckel für alle, wenn `!appConfig.proPurchasesEnabled` |
| `src/screens/LernplanKonfiguratorScreen.tsx` | `handleNext()`, `proActive` | Vollständig/Abitur-Gate prüft zusätzlich `appConfig.proPurchasesEnabled` — blockt auch Trial-/Dev-Mode-Pro |
| `src/screens/LernplanKonfiguratorScreen.tsx` | `StepPlanType`, Badge | „✦ Pro" → „🕒 Bald verfügbar" auf Vollständig-/Abitur-Karten |
| `src/screens/LernplanDetailScreen.tsx` | `SessionCard`-Aufruf, `isPro`-Prop | `isPro={isPro && appConfig.proPurchasesEnabled}` — Pro-Aktivitäts-Tag/Lock konsistent |
| `src/screens/ProfilCoinsScreen.tsx` | `handleRedeemDiscount()` | Verweigert früh, wenn Käufe pausiert — **schützt Coins vor sinnlosem Ausgeben** (echter Bug sonst) |
| `src/screens/ProfilCoinsScreen.tsx` | Rabatt-Widget (15%/30%) | Preistext → „Wartet auf dich — Pro startet nach der Beta", Button → „Coins sind sicher"-Hinweis |
| `supabase/migrations/017_beta_mode_config.sql` | — | Legt `app_config` + `profiles.pro_waitlist_interested` an. ✅ Angewendet. |

**Bewusst NICHT verändert / weiterhin voll aktiv:**
- Smart Notes (inkl. Foto-Scan), Karteikarten, Blurting, Keyword-Erklärung — komplett unberührt
- Lernplan Einzel — bleibt frei nutzbar (bestehender 3/Tag-Free-Deckel unverändert)
- Statistiken/Insights, Streak/Coins-System, Streak-Freeze-Kauf (Coins, kein echtes Geld) — unberührt
- Referral-Widget (UI) — bleibt sichtbar, zeigt keinen Preis; der tatsächliche Trial-Bypass für Lernplan/Lernzettel ist aber oben geschlossen
- `DesktopSidebar.tsx`/`ProfilScreen.tsx` kleine „✦ Pro"-Badges neben dem eigenen Namen — reine Status-Anzeige für Nutzer, die bereits Pro haben, kein Kauf-Pitch
- `LandingScreen.tsx` (öffentliche Marketing-Seite `/landing`) — ihr Pricing-Button führt nur zu `/dashboard`/`/unterricht`, kein echter Checkout

### Known Issues (Stand: 25.07.2026):

**MINOR:**
1. **Apple OAuth** — Native PKCE-Deep-Link-Flow gebaut, Supabase-Apple-Provider konfiguriert (Services ID, Team ID, Key ID, generierter Client-Secret-JWT — läuft am **2027-01-22 ab**, siehe Claude-Memory `apple-signin-jwt-expiry` für Regenerierung), "coming soon"-Disclaimer aus `AuthScreen.tsx` entfernt. **Natives Google-Login wurde 27.07.2026 erfolgreich getestet** (nach Fix eines Domain-Redirect-Bugs, siehe „Letzte Session"). **Natives Apple-Login selbst noch NICHT verifiziert getestet** — sollte in der nächsten Session als Erstes nachgeholt werden.
2. **Email Confirmation Flow** — kein UI-Hinweis nach Signup
3. **Impressum Steuernummer** — Platzhalter, nach Eingang vom Finanzamt Harburg nachtragen
4. **Coins Shop Redesign gefällt Simon noch nicht** — `ProfilCoinsScreen.tsx` wurde in 2 große Karten umgebaut (violett Checkliste / mint Shop, Framer-Motion-Entrance-Animation), aber Simon hat explizit gesagt das Design trifft es noch nicht. Konkretes Feedback steht noch aus — vor weiterer Iteration erst nachfragen was genau nicht passt, nicht einfach nochmal neu raten.
5. **Natives Wrapper-Projekt** — ✅ GELÖST (26.–27.07.2026), Track A komplett abgeschlossen inkl. Einreichung (27.07.2026, spät). `ios/` Capacitor-Projekt existiert, ist committed, `capacitor.config.ts` zeigt auf `https://www.dailystudent.de`. Nur noch offen: Sandbox-Kauftest end-to-end nachholen (nie durchgeführt, siehe „Nächste Session — Handoff" oben) und auf Apples Review-Entscheidung warten. Siehe „Letzte Session (27.07.2026, spät)" für den vollen Verlauf.
6. **Lernzettel-Erklärbilder (Beta) aktuell komplett funktionsunfähig — Google-seitiges Freikontingent, nicht unser Bug, NICHT per Code fixbar** — direkt gegen Googles API getestet (curl, mit UND ohne Modell-Migration, altes `gemini-2.5-flash-image` UND neues `gemini-3.1-flash-image-preview` zeigen identisch `RESOURCE_EXHAUSTED`/`limit: 0` für `generate_content_free_tier_requests`). Das Freikontingent für Bildgenerierung scheint für dieses Google-Cloud-Projekt aktuell bei 0 zu liegen. Betrifft nur den optionalen Beta-Toggle (default AUS) — der Rest von Lernzettel/Probeklausur/Lernplan/Smart Notes läuft über Text-Modelle und ist nicht betroffen. **Von Simon zweifach live bestätigt** (25.07.2026, erneut 25.07.2026 in einer späteren Session): Toggle „Mit Erklärbildern (Beta)" eingeschaltet, es wird trotzdem kein Bild generiert/angezeigt — deckt sich exakt mit dem curl-Befund, kein neues Symptom. Die Lernzettel-**Textgenerierung** selbst (alle 4 Modi) funktioniert gut („fast gut") — nur dieser Beta-Bildteil ist betroffen, und die App-seitige Anzeige-/Preview-Logik dafür (`RichText`s Bild-Platzierung, IndexedDB-Auflösung) ist bereits korrekt gebaut und einsatzbereit, sobald Google wieder Kontingent frei gibt. **Simon muss:** im Google AI Studio / Google Cloud Billing prüfen, ob für dieses Projekt Billing aktiviert werden muss — reines Model-Downgrade würde das nicht lösen, da beide Modelle betroffen sind. Dies ist der letzte offene Blocker vor dem Start der Apple-App-Store-Migration (Track A).

### To-Do — Priorisiert (Stand: 25.07.2026):

#### Direkt als nächstes (Track B, noch offen aus der 23.–24.07. + 25.07. Session):
✅ ~~Lernzettel-Prompt: Groq → Gemini portieren~~ FERTIG 25.07.2026 — siehe Phase-3-Liste oben. **Von Simon live getestet:** Textgenerierung/Prompts funktionieren gut („fast gut"). **Weiterhin offen (nicht per Code fixbar):** Erklärbilder-Beta-Toggle erzeugt kein Bild (Google-Freikontingent = 0, siehe Known Issues #6). Migration `013_lernzettel_modus_images.sql` ✅ von Simon angewendet.

✅ ~~Abi-Notenrechner Block II (Abiturprüfungen)~~ FERTIG 25.07.2026 — siehe Phase-3-Liste oben. Migration `014_abi_pruefungen.sql` ✅ von Simon angewendet.

✅ ~~Lernplan-Kalenderexport sichtbarer machen~~ FERTIG 25.07.2026 — siehe Phase-3-Liste oben.

1. **Final QA-Pass auf alle Track-B-Änderungen der 23.–25.07. Sessions — Stand: weiterhin nie durchgeführt, auch nicht nachträglich während/nach Track A.** Durchklicken: Google-Login (Account-Picker), Stripe-Checkout + Rabatt-Einlösung (sobald Simon die Coupons angelegt hat), alle 5 neuen Profil-Unterseiten, Übersicht (To-Do-Karte beide Hälften, Streak-Widget, Lernplan-Hero „Fortsetzen", Erste-Schritte-Checkliste, gefächerte Notizen-Karten), Streak-Erklärungs-Sheet, Lernzettel 4-Modi-Flow + ModusRegler, Erklärbilder-Toggle, Preview-Karussell-Redesign, Markdown/Math-Rendering in Smart Notes + Lernzettel, Abi-Notenrechner Block II, Lernplan-Kalenderexport-Buttons, **plus neu:** Lernzettel löschen + Swipe-Aktionen (Markieren/Löschen). Track A ist trotz dieser offenen Punkte weitergelaufen (Simons Entscheidung) — nachträglich sinnvoll im Rahmen des ohnehin nötigen TestFlight-/Sandbox-Testings mit abzudecken, statt als separater Schritt.

#### Nächste Session — Handoff (Stand 27.07.2026, Ende der Track-A-Bau-Session):
Simon steigt mit einem neuen Chat wieder ein. Kompakter Übergabe-Stand — **zuerst „Letzte Session (26.–27.07.2026)" weiter unten vollständig lesen**, dort steht der volle technische Kontext dieser Liste:

**Track A — Stand nach der 27.07.2026-Spätsession: eingereicht, nur noch 2 echte offene Punkte:**

✅ ~~Temporäre Debug-`console.log`-Zeilen entfernen~~ · ✅ ~~`DemoScreen.tsx`-Button entfernen~~ · ✅ ~~Migration 016 bestätigen~~ · ✅ ~~IAP-Produkte in App Store Connect angelegt~~ · ✅ ~~`VITE_REVENUECAT_API_KEY_IOS` in Vercel gesetzt (verifiziert im Live-Bundle)~~ · ✅ ~~RevenueCat Offerings/Packages/Entitlement angelegt~~ · ✅ ~~Xcode-Signing + TestFlight-Build erfolgreich hochgeladen~~ · ✅ ~~App-Store-Connect-Metadaten vollständig~~ · ✅ ~~App zur Prüfung eingereicht (27.07.2026, spät)~~ — volle Details siehe „Letzte Session (27.07.2026, spät)" weiter unten.

1. **Sandbox-Kauftest weiterhin blockiert — Ursache jetzt bestätigt, kein Code-Fix möglich:** Kauf über beide Einstiegspunkte (ProfilScreen-Banner, ProModal) schlägt mit „product is not available for purchase" fehl. Beide Pfade routen bereits korrekt zu `purchasePlan()` (RevenueCat, `src/lib/revenuecat.ts`) — das ist kein Routing-Bug. Simon hat am 29.07.2026 in App Store Connect bestätigt: die Abos stehen dort weiterhin auf „Waiting for Review", nicht genehmigt. Deckt sich exakt mit der bereits am 27.07. hergeleiteten Theorie (siehe „Letzte Session 27.07.2026, spät" → StoreKit-Propagations-Absatz): Apple liefert Sandbox-Kaufversuche offenbar erst nach abgeschlossener Abo-Prüfung aus, nicht schon nach reiner Einreichung. **Nichts weiter zu tun außer warten** — sobald Apple das Abo (oder die App als Ganzes) freigibt, sollte der Kauf ohne weitere Änderungen funktionieren. Bei erneutem Fehlschlag nach Freigabe: RevenueCat Dashboard → Customer History für den Testaccount prüfen (zeigt den exakten Ablehnungsgrund).
2. **Natives Apple-Login end-to-end testen** — Google-Login wurde 27.07.2026 erfolgreich verifiziert, Apple-Login (gleicher Code-Pfad, sollte funktionieren) wurde aber noch nie tatsächlich durchgeklickt.
3. **Auf Apples Review-Entscheidung warten** — Stand 29.07.2026: Abos noch „Waiting for Review" in App Store Connect. App-Review-Status separat bei Simon erfragen, falls nicht identisch.

**Wichtig, nicht mit Track A verwechseln:** Simon hat 27.07.2026 außerdem eine grundsätzliche Zukunftsfrage aufgeworfen (natives SwiftUI-Rewrite statt Wrapper) — Ergebnis: aktueller Wrapper bleibt für die 02.08.-Deadline, ein echter Rewrite ist ein separates Projekt OHNE Datum für danach. Siehe neue Sektion „Zukunftsvision — Natives SwiftUI-Rewrite" weiter unten, bevor in einer zukünftigen Session natives UI-Arbeit begonnen wird — erst mit Simon klären ob das jetzt ansteht.

**Track B ist inhaltlich fertig, der QA-Pass selbst wurde aber nie durchgeführt** (siehe Punkt 1 oben) — kein Blocker für Track A, aber beim nächsten echten Geräte-Test mit abdecken.

#### Zusätzlich notiert während TestFlight-Testing auf echtem Gerät (27.07.2026) — nicht blockierend für die Einreichung, aber bald angehen:

1. **iOS-Overscroll/Rubber-Band-Bounce zeigt harte schwarze Fläche statt Farbverlauf** — wenn man auf dem Handy weit über den Seitenanfang/-rand hinaus swipet (native Rubber-Band-Bounce-Geste, per Screen auch sonst erreichbar), zeigt der native WebView-Hintergrund aktuell eine unbearbeitete schwarze Fläche statt eines bewussten Übergangs — wirkt wie ein Bug oder unbeabsichtigt sichtbarer Bereich ("wie beobachtet"), nicht wie gestaltete UI. Ziel: etwas Spacing/Abstand einbauen und die Fläche mit einem sauberen Farb-Fade statt Flach-Schwarz gestalten, damit der Bounce-Bereich absichtlich wirkt.
2. **Landing Page als nativer App-Startbildschirm fühlt sich nicht wie Teil der App an** — beim ersten Öffnen der nativen App landen unauthenticated User auf `/landing` (bestehendes, bewusstes Verhalten, siehe Architektur-Entscheidungen oben) — das ist grundsätzlich okay, aber da die Landing Page 1:1 die normale Website ist, wirkt der erste Eindruck eher wie „im Browser" statt wie eine native App. Simon: fühlt sich nicht nach „Teil der App UND Teil der Website" an, sondern nur nach Website. Nebenpunkt (nicht der Hauptstörpunkt laut Simon, aber unpassend für einen App-Ersteindruck): Cookie-Consent-Banner erscheint sofort beim Öffnen. Konkrete erste Maßnahme, sobald das angegangen wird: Early-Access-Button aus der Top-Nav der Landing Page entfernen und durch den „Jetzt starten"-Button ersetzen — Ziel-Endzustand der Top-Nav: nur noch 2 Optionen, „Wie es funktioniert" und „Kostenlos starten".

#### Danach:
3. **Coins Shop Redesign — konkretes Feedback von Simon einholen** bevor weiter iteriert wird (siehe Known Issues).
4. **Onboarding Soft-Start** — Nutzer bekommt sofort App-Zugang (kein Gate), sieht aber auf jedem Screen eine Bubble/Banner: "Personalisierung in 1 Min abschließen → bessere KI-Ergebnisse".
6. **Email-Liste aktivieren** — ~100 warme Leads (TikTok/Landing Page) sind höchste Conversion-Priorität.
7. **Bottom Nav Colour anpassen** — Farbanpassung der mobilen BottomNav
8. **Foto-Scan: Auswahl/Crop-Tool** — beim Foto-Scan soll man per Drag einen Ausschnitt markieren können, statt immer das komplette Foto an die KI zu schicken
9. **Ausführlichere/bessere KI-Antworten** — Smart Note-Analyse (Groq) soll tiefer gehen; „Stilpunkte"/Darstellungsleistung mitdenken, nicht nur Inhaltspunkte

#### App Store Launch (Ziel 02.08.2026):
**Veraltet — Status ist NICHT mehr unbekannt.** Track A ist längst gebaut und die App am 27.07.2026 eingereicht, siehe „Aktueller Stand"-Zeile ganz oben + „Nächste Session — Handoff" + „Letzte Session (27.07.2026, spät)" weiter unten. Dieser Absatz stammt aus einer älteren Version dieses Dokuments und ist stehen geblieben — nur noch relevant als Hinweis darauf, wo die Architekturentscheidungen dokumentiert sind: `project-app-store-launch-plan` in Claudes Memory.

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
| `lernzettel` | Generierte Lernzettel mit Inhalt und Metadaten, `modus` (neu, Migration 013), `images` JSONB — nur lokale IndexedDB-Refs, keine Bild-Bytes (neu, Migration 013), `highlighted` BOOLEAN (neu, Migration 015) |
| `saved_probeklausuren` | Abgeschlossene Klausurversuche mit KI-Korrektur |
| `lernplaene` | Generierte Lernpläne (days JSONB, config JSONB, `completedDays` neu) |
| `personal_entries` | Kalendereinträge (lerneinheit/termin/erinnerung) |
| `standalone_homework` | Hausaufgaben ohne Notiz-Kontext |
| `subscriptions` | Abonnements, Stripe UND Apple/RevenueCat (`source` Spalte, neu Migration 016) — `UNIQUE(user_id)`, nur server-seitig schreibbar via Webhook |
| `ai_usage` (neu, Migration 012) | Pro user_id/bucket/day ein Zähler — Grundlage der Rate-Limit-Decke |
| `ai_rate_limit_strikes` (neu, Migration 012) | Ein Eintrag pro user_id/bucket/day an dem die Decke überschritten wurde — 2 Einträge insgesamt → `profiles.ai_blocked = true` |

**RLS:** Jede Tabelle hat RLS — User kann nur eigene Rows lesen/schreiben (`auth.uid() = user_id`). `ai_usage`/`ai_rate_limit_strikes` haben RLS aktiviert aber keine Policies — nur über die `SECURITY DEFINER`-RPC `check_ai_rate_limit()` erreichbar, kein direkter Client-Zugriff vorgesehen.

**Migrationen 001–016**, alle in `supabase/migrations/`. **001–014 + 016 angewendet** (013+014 von Simon am 25.07. bestätigt, 016 am 27.07.2026 bestätigt). **015 (`lernzettel_highlighted`) — Anwendungs-Status unklar:** Datei existiert seit 25.07.2026 im Repo, aber keine explizite Bestätigung von Simon, dass sie im Supabase SQL Editor gelaufen ist (sie lag schon da als die Track-A-Session 016 anlegte, wurde aber nicht separat verifiziert). **Vor der nächsten Nutzung des Markieren-Features (Lernzettel-Bibliothek, gelber Stern) kurz mit Simon abklären, ob 015 schon läuft** — bis dahin synct nur `highlighted` nicht cross-device, alles andere (Löschen, Markieren lokal) funktioniert unabhängig davon:
001 initial schema · 002 grade_data · 003 custom_faecher · 004 coins_system · 005 atomic_coins (RPC) · 006 harden_coin_rpcs · 007 note_attachments_storage · 008 early_access · 009 referral_system · 010 personal_entries_extra_fields · 011 coins_discount_redeem (RPC) · 012 ai_rate_limits (RPC) · 013 lernzettel_modus_images · 014 abi_pruefungen · 015 lernzettel_highlighted (Status unklar, siehe oben) · **016 revenuecat_subscriptions (neu 26.–27.07.2026, `source`/`rc_app_user_id`/`UNIQUE(user_id)` auf `subscriptions`, siehe Track-A-Session oben)**

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
- **Swipebare Listenzeilen (Wischen für Aktionen, wie Apple Notizen) — Referenzimplementierung ist `LernzettelRow` in `LernzettelScreen.tsx`:** `framer-motion` `motion.div drag="x"` mit `dragConstraints`/`dragElastic`, `onTap` statt natives `onClick` (unterscheidet zuverlässig Tap von Swipe, wichtig wenn beides auf demselben Element liegt), `animate={{x: isOpen ? -REVEAL : 0}}` gesteuert über ein `openRowId`-State im Eltern-Screen (nicht lokal pro Zeile), damit das Öffnen einer Zeile alle anderen automatisch schließt. Erste swipebare Liste im Repo (Stand 25.07.2026) — bei ähnlichem Bedarf anderswo (Notizen, Karteikarten-Decks) dieses Muster kopieren statt neu zu erfinden, noch keine eigene wiederverwendbare Komponente extrahiert.
- **Löschen mit Companion-Records/IndexedDB-Assets folgt dem `deleteLernzettel()`-Muster, nicht `deleteAttachmentsForNotes()` blind aufrufen:** `deleteAttachmentsForNotes()` (in `noteStorage.ts`) räumt ausschließlich `UserNote.attachments`/`drawingAttachments` auf — für andere Record-Typen mit eigenen Bild-Refs außerhalb einer `UserNote` (z. B. `Lernzettel.images`) muss `deleteAttachment(ref)` direkt pro Ref aufgerufen werden. Beim Löschen eines Records mit Companion-`UserNote` (wie bei Lernzettel: `userNoteId`) immer auch die Companion-Note + ihre eigenen Attachments aufräumen, nicht nur den Haupt-Record.

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
├── migrations/                    # 001–016, alle angewendet, siehe DB-Schema-Sektion oben für Details
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

### Shortcuts, die die Einschätzung oben entschärfen (nächtliche Debatte 27.07.2026 — wichtig, beim nächsten Mal nicht neu diskutieren)
Simon hat die ursprüngliche Einschätzung mehrfach zu Recht hinterfragt und dabei mehrere echte, validierte Vereinfachungen herausgearbeitet — festgehalten hier, damit sie beim nächsten Anlauf nicht verloren gehen oder erneut ausdiskutiert werden müssen:

- **KI/Backend-Layer ist praktisch ein Gratis-Port.** Die Groq/Gemini-System-Prompts sind reine Strings ohne UI-Kopplung — funktionieren identisch über Swifts `URLSession` statt `fetch()`, gleicher Prompt, gleiche JSON-Antwort.
- **KC-Daten sind trivial portierbar** — 196 JSON-Dateien, entweder als Bundle-Assets oder weiterhin über Supabase Storage/`public/` ausgeliefert.
- **Supabase-Backend braucht keine Änderung** — offizielles `supabase-swift`-SDK deckt alles ab (siehe oben).
- **Die bestehende Web-App eliminiert fast das komplette Produkt-Entscheidungs-Risiko** — bei Phase 1–3 ging ein Großteil der 2 Wochen für Produktentscheidungen drauf (z.B. mehrere verworfene Lernzettel-Modus-UI-Versionen), nicht fürs reine Tippen von Code. Das entfällt bei einem Rewrite komplett, da alles bereits entschieden ist.
- **Xcode-Previews (Canvas)** geben nahezu Web-Hot-Reload-Geschwindigkeit für isolierte, visuelle/Layout-Arbeit an einzelnen Views — echter Vorteil, kein Blocker mehr für diesen Teilbereich.
- **Der iOS-Simulator ist KEIN Mock** — voller Lauf der echten kompilierten App, echtes Netzwerk, echte Login-Flows (inkl. desselben browser-basierten OAuth-Ansatzes, der auch im aktuellen Wrapper läuft). Für die meisten Tests ist kein echtes Gerät nötig.
- **Kamera ist die einzige echte Geräte-Notwendigkeit**, und ihr Umfang ist eng begrenzt (Smart-Notes-Foto-Scan, Stundenplan-Scanner) — kein systemisches Risiko, ein abgegrenztes, kleines Arbeitspaket. StoreKit-Testing (Käufe) funktioniert inzwischen ebenfalls im Simulator, entgegen einer ersten Einschätzung.
- **Persistente Dev-/Test-Accounts existieren bereits** (`DEV_PROFILE`, Dev-Tools) — Notizen, Coins, Streak, Abo-Status liegen in Supabase, überleben also jeden Neustart der App. Der Aufwand, für Tests einen realistischen, befüllten Account herzustellen, ist bereits gelöst, nicht Teil der Rewrite-Arbeit.
- **KI-Agenten als Tester statt Simon selbst** eliminieren den menschlichen "Batching-aus-Ungeduld"-Effekt (mehrere Änderungen sammeln bevor getestet wird, was Bugs schwerer isolierbar macht) — ein Agent kann diszipliniert nach jeder einzelnen Änderung testen.

**Was davon unberührt bleibt, ehrlich eingeordnet:** Cross-Screen-Bugs (z.B. wie in `UserContext.tsx` Streak/Coins/Notes-Änderungen sich auf mehrere Screens gleichzeitig auswirken) lassen sich nur durch echtes Ausführen der fertigen App finden — das braucht reale Zeit, unabhängig davon wie schnell ein Agent den gefundenen Bug danach fixt. Eine autonome UI-Navigations-Automatisierung (ein Agent tippt sich selbstständig durch mehrstufige Flows wie den Lernplan-Konfigurator) existiert noch nicht für diese App und müsste als eigenes, abgegrenztes Werkzeug gebaut werden (XCUITest/Maestro-artig). Nur der Zustand *mitten in* einem noch nicht abgeschlossenen mehrstufigen Flow (z.B. Schritt 4 von 6 im Lernplan-Konfigurator, noch nicht generiert) geht bei einem Neustart verloren — nicht die gespeicherten Account-Daten. Die eigentliche Architektur-Grundlage (geteilter State-Layer, Design-System, Navigation) muss weiterhin einmal sorgfältig und richtig gebaut werden — daran ändert keiner der obigen Punkte etwas.

**Eingeordnetes Ergebnis der Debatte:** Die Einschätzung "Wochen bis Monate" tendiert nach dieser Klärung eher zum optimistischeren Ende (Richtung 3–6 Wochen sobald die Architektur-Grundlage steht) als zum pessimistischeren — vor allem weil Agenten (nicht Simon) den Test-/Iterationszyklus fahren würden. Bleibt trotzdem: "Wochen", nicht "Tage" — und die Grundlage selbst bleibt der Teil, an dem am wenigsten gespart werden sollte.

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

## Letzte Session (31.07.2026) — App von Apple genehmigt (Pending Developer Release) + Beta-Modus-System gebaut (Pro-Käufe pausiert, Probeklausur-Modi umgeschichtet)

**Ausgangspunkt:** Die App wurde von Apple genehmigt — Status in App Store Connect ist **„Pending Developer Release"** (noch nicht öffentlich, Simon entscheidet den genauen Freigabe-Zeitpunkt selbst). Gleichzeitig: Simon geht in den Urlaub, dabei nur Handy, kein Laptop/Mac erreichbar. Zwei konkrete Sorgen, die er explizit genannt hat: (1) er will während dieser Zeit keine echten Pro-Abo-Zahlungen annehmen — will nicht verantwortlich sein, wenn ein zahlender Nutzer ein Problem hat und er nicht erreichbar ist, um es zu fixen; (2) Sorge vor KI-Token-Kosten/Rate-Limit-Problemen bei mehreren gleichzeitigen Nutzern (App ist jetzt real herunterladbar, 150+ Warteliste). Auftrag: bestimmte Features **pausieren, nicht entfernen** — die App soll trotzdem "cool"/nutzbar wirken, keine der bestehenden Strukturen (RevenueCat/Stripe-Architektur etc.) soll abgebaut werden.

### Gebautes System: `app_config` — ferngesteuerte Beta-Flags
**Migration `017_beta_mode_config.sql`** (⚠️ **noch NICHT von Simon in Supabase angewendet** — siehe „Nächste Session" unten) legt eine Singleton-Tabelle `app_config` (1 Zeile, `id=1`) an, öffentlich lesbar (RLS `SELECT USING (true)`, kein Client-Schreibzugriff) — bewusst so gebaut, dass Simon die Flags **direkt im Supabase-Dashboard über den mobilen Browser** umschalten kann, ganz ohne Code-Deploy oder App-Store-Resubmission. Spalten (Column-Defaults = normales/Post-Beta-Verhalten, die tatsächlich eingefügte Zeile trägt direkt die Beta-Werte):
- `pro_purchases_enabled` (Beta: `false`) — pausiert Stripe-Checkout UND Apple-IAP-Kauf-Trigger
- `probeklausur_afb_trainer_free` (Beta: `true`) — Mode 1 (AFB-Aufgabentrainer) komplett kostenlos, inkl. KI-Korrektur — Simon wollte dieses Feature explizit weiterhin zeigen können
- `probeklausur_mode2_enabled` / `_mode3_enabled` / `_mode4_enabled` (Beta: alle `false`) — die drei token-teuersten Probeklausur-Modi pausiert

Zusätzlich `profiles.pro_waitlist_interested` (boolean) für einen "Für Rabatt vormerken"-Button.

**Client-seitig:** `UserContext.tsx` lädt `app_config` einmalig beim App-Start (unabhängig vom Login-Status) in einen neuen `appConfig`-Context-Wert; **fail-open** wie das bestehende Rate-Limit-System — schlägt der Fetch fehl oder existiert die Zeile noch nicht, verhält sich die App exakt wie vorher (alles an, `DEFAULT_APP_CONFIG`).
- **`ProModal.tsx`** ist der zentrale Hebel: JEDER der 9 Trigger-Punkte im Code läuft durch diese eine Komponente — wenn `pro_purchases_enabled=false`, zeigt sie statt Preis-Toggle/Checkout eine eigene Ansicht („Pro startet nach der Beta" + Daten-bleiben-sicher-Zusicherung + „Für Rabatt vormerken"-Button, schreibt `pro_waitlist_interested=true`). Kein Feature entfernt — der komplette Checkout-Code bleibt unverändert darunter, nur übersprungen.
- **`ProfilScreen.tsx`**: `handleUpgrade()` hatte einen eigenen, direkten Stripe/RevenueCat-Call (bypass von ProModal, siehe 27.07.-Session-Historie) — bekam einen frühen Return zur selben ProModal-Ansicht, der bestehende native/Stripe-Code darunter ist unverändert und läuft automatisch wieder, sobald das Flag zurückgesetzt wird.
- **`ProbeklausurMenuScreen.tsx`**: `handleModeClick()` navigiert Mode 1 jetzt direkt (ohne Pro-Check) wenn `probeklausurAfbTrainerFree`; Mode 2/3/4 öffnen bei deaktiviertem Flag dasselbe ProModal statt zu navigieren. Karten zeigen „Kostenlos in der Beta" (Mode 1) bzw. „🕒 Bald wieder da" (Mode 2–4) statt „✦ Pro".
- **`ProbeklausurMode1Screen.tsx`**: KI-Korrektur-Gate erweitert zu `isPro || probeklausurAfbTrainerFree`.
- **Neu: `src/components/ui/BetaPausedScreen.tsx`** — Full-Screen-Fallback in `ProbeklausurMode2/3/4Screen.tsx` (früher Return direkt nach den Hooks, vor dem Haupt-`return`). Wichtig: das ist NICHT redundant zum Menü-Gate — fängt auch direkten URL-Zugriff und den „Fortfahren"-Button auf eine VOR der Pause begonnene Klausur ab (der navigiert im Menü-Screen direkt, ohne durch `handleModeClick` zu laufen).
- **Server-seitig, `api/gemini.ts`**: Mode 2 (`generateMode2Exam`) hat als einziger der vier Modi einen eigenen dedizierten Rate-Limit-Bucket (`probeklausur_full`) — dafür ein sauberer serverseitiger Block (`isProbeklausurMode2Paused()`, fail-open wie `checkRateLimit`). **Bewusste Lücke, transparent:** Mode 1/3/4 teilen sich den Bucket `probeklausur_other` (auch `correctExam()` aller 4 Modi läuft darüber) — da Mode 1 während der Beta offen bleiben soll, lässt sich serverseitig nicht sauber nur Mode 3/4 blocken ohne neue Plumbing (ein `subFeature`-Feld durchreichen). Bewusst nicht gebaut (Zeitdruck, Simon reist ab) — die Absicherung für Mode 3/4 ist rein clientseitig (Screen zeigt gar keine Generieren-Möglichkeit); ein serverseitiger Bypass bliebe theoretisch möglich, ist aber durch die bestehende Tages-Obergrenze (15/Tag, Migration 012) sowie die Auth-Pflicht ohnehin gedeckelt.

**Verifiziert:** `tsc --noEmit` clean, `npm run lint` identisch 93 Probleme vorher/nachher (0 neu eingeführt, per `git stash`-Vergleich), `npm run build` erfolgreich.

### Nachtrag, gleicher Tag (31.07.2026) — Migration angewendet + alle verbliebenen "Buy"-Banner entfernt + Trial-Bypass-Lücke geschlossen

Simon hat Migration `017_beta_mode_config` bereits in Supabase ausgeführt. Danach Feedback: die App soll sich **überhaupt nicht** wie "BUY BUY BUY" anfühlen — nicht nur der Checkout-Klick soll umgeleitet werden, die Kauf-Banner/Badges selbst sollen aus der Ansicht verschwinden (Code bleibt erhalten, nur nicht gerendert). Vollständiger Audit über den ganzen Code (`grep` nach "Pro freischalten", "€7,99", "badge-pro-gold" etc.) fand mehrere Stellen, die die erste Runde nicht abgedeckt hatte:

- **`ProfilScreen.tsx`** — die große Pricing-Karte oben im Profil ("Pro freischalten €7,99/Mo" + 2 Kauf-Buttons) wird jetzt durch eine schlichte Beta-Karte ersetzt ("Pro startet nach der Beta" + "Für Rabatt vormerken"-Button, öffnet dieselbe ProModal-Ansicht). Alter Code unverändert daneben erhalten, nur bedingt gerendert.
- **`LernzettelScreen.tsx`** — die "Pro Lernzettel"-Vorschau-Karussell-Badges ("✦ PRO") zeigen jetzt "Vorschau", der "Pro freischalten"-Button wurde zu einem neutralen "Für Update vormerken"-Button (kein goldener Kauf-Gradient mehr).
- **`LernplanKonfiguratorScreen.tsx`** — "✦ Pro"-Badges auf Vollständig-/Abitur-Plantyp-Karten zeigen jetzt "🕒 Bald verfügbar".
- **`LernplanDetailScreen.tsx`** — kleines "✦ Pro"-Tag auf Session-Zeilen mit Pro-Aktivität: behandelt pausierte Käufe jetzt konsistent wie "kein Pro".
- **`ProfilCoinsScreen.tsx`** — Rabatt-Widget (15%/30%, zeigte "€6,80 statt €7,99/Mo" + "Einlösen"-Button) zeigt jetzt "Wartet auf dich — Pro startet nach der Beta" statt Preisen. **Dabei einen echten Bug fürs Beta-Fenster gefixt:** `redeemDiscount()` zieht Coins sofort ab, bevor der (jetzt pausierte) Checkout überhaupt geöffnet wird — ohne Gegenmaßnahme hätte ein Nutzer beim Klick seine gesparten Coins für einen Rabatt verloren, den er in der Beta gar nicht einlösen kann. `handleRedeemDiscount()` verweigert jetzt frühzeitig, wenn `pro_purchases_enabled=false`, Button zeigt eine "Coins sind sicher"-Meldung statt eines aktiven Kauf-CTAs.
- **`ProbeklausurMenuScreen.tsx`** — bereits in Runde 1 sauber (Badges hängen schon am Beta-Flag), keine Änderung nötig.
- **Bewusst NICHT verändert:** die kleinen "✦ Pro"-Badges in `DesktopSidebar.tsx`/`ProfilScreen.tsx` neben dem eigenen Namen — die zeigen nur an, dass der eingeloggte Nutzer selbst Pro *hat*, sind kein Kauf-Pitch. Die Referral-Widget-Karte ("14 Tage Pro gratis" für 5 Einladungen) bleibt ebenfalls sichtbar — zeigt keinen Preis, ist ein Gratis-Mechanismus, kein "Buy"-Banner. Die Landing Page (`/landing`, öffentliche Marketing-Seite) wurde ebenfalls nicht angefasst — ihr Pricing-Button führt nur zu `/dashboard`/`/unterricht` (Login/App-Einstieg), löst keinen echten Checkout aus.

**Wichtige, tiefere Lücke gefunden und geschlossen:** Das Referral-Programm gewährt bei 5 erfolgreichen Einladungen einen 14-Tage-Pro-Trial rein über ein DB-Feld (`trial_ends_at`), läuft NICHT über Stripe/RevenueCat — wäre also von `pro_purchases_enabled` komplett unberührt gewesen. Ein Trial-Nutzer (oder Simons eigener Dev-Mode-Pro-Toggle) hätte damit während der Beta trotzdem uneingeschränkt Lernplan Vollständig/Abitur generieren und unbegrenzt Lernzettel erstellen können — genau die teuren KI-Calls, die die Pause eigentlich vermeiden soll. Gefixt: `LernplanKonfiguratorScreen.tsx`s Vollständig/Abitur-Gate prüft jetzt zusätzlich `appConfig.proPurchasesEnabled` (nicht nur `isPro`) — nur während der Beta, kein Effekt sobald Käufe wieder aktiv sind.

**Zusätzlicher Fund, kein reiner Beta-Fix, sondern ein bestehender Gap:** Recherche ergab, dass Lernzettel entgegen der CLAUDE.md-Paywall-Tabelle ("1/Tag Free") **im Code nie eine Tages-Obergrenze hatte** — `LernzettelGeneratorScreen.tsx` enthielt keinerlei `isPro`-Check, jeder Account konnte bereits beliebig viele Lernzettel generieren (nur die generische 20/Tag-Abuse-Bucket-Grenze griff, für alle Tiers gleich). Da Simon explizit von "Lernzettel ein pro Tag (Beta)" ausging, wurde das jetzt tatsächlich gebaut — aber bewusst nur **für das Beta-Fenster** (`if (!appConfig.proPurchasesEnabled && todayLernzettelCount >= 1)`), nicht als permanente neue Paywall-Regel, da das eine separate Produktentscheidung wäre, die hier nicht getroffen wurde.

**Erneut verifiziert nach dieser Runde:** `tsc --noEmit` clean, `npm run lint` weiterhin exakt 93 Probleme (0 neu), `npm run build` erfolgreich.

### So setzt Simon die Beta-Flags später zurück (einfach erklärt, vom Handy):
1. Im Handy-Browser zu `supabase.com` → einloggen → das DailyStudent-Projekt öffnen.
2. Links im Menü auf **„Table Editor"** tippen.
3. In der Tabellen-Liste **„app_config"** auswählen — da ist genau eine Zeile.
4. Die Zeile antippen (öffnet die Bearbeitung), dort 5 Ja/Nein-Felder umschalten: `pro_purchases_enabled` → an, `probeklausur_afb_trainer_free` → aus, `probeklausur_mode2_enabled` / `_mode3_enabled` / `_mode4_enabled` → alle an.
5. Speichern. Fertig — kein Deploy, kein Code, wirkt sofort beim nächsten App-Start eines Nutzers.

### Nächste Session — konkret offen:
1. **Simon sollte einmal kurz durchklicken** (`/profil`, `/klausurmodus/probeklausur`, `/klausurmodus/lernzettel`, `/profil/coins`) — dieselbe Verifikation, die in dieser Session mangels Browser-Tooling nicht automatisiert möglich war.
2. **Kein App-Store-Resubmit nötig für irgendetwas in dieser gesamten Session (beide Runden)** — alles ist reiner Web-/Supabase-Code, deployed automatisch über Vercel, sofort live auch im bereits genehmigten Wrapper (`server.url` zeigt auf Produktion). Einzige offene native Änderung bleibt der Bounce-Gradient-Fix aus der 29.07.-Session (siehe unten) — der braucht weiterhin einen frischen Xcode-Archive+Upload, unabhängig hiervon; Simon hat den TestFlight/Xcode-Upload für den bereits genehmigten Build schon erledigt, das ist ein komplett separater, späterer Schritt.

---

## Letzte Session (29.07.2026) — Native App-Feel-Politur (Bounce-Gradient, Zurück-Buttons, Scroll-Recenter) + Kauf-Fehler diagnostiziert

**Ausgangspunkt:** TestFlight-Testing auf echtem Gerät nach dem 27.07.-Submit deckte mehrere App-Feel-Probleme auf plus einen vermeintlichen Kauf-Routing-Bug.

- **Bounce-Gradient-Richtung gefixt** — `BridgeViewController.swift` hatte die Farbreihenfolge verkehrt herum: `locations=[0,0.5,1]` mit `colors=[edge,purple,edge]` zeigte Purple erst nahe der Bildschirmmitte, die Hintergrundfarbe direkt am physischen Rand — optisch genau falsch. Simon wollte Purple AM Rand, faded in die Hintergrundfarbe Richtung Content. Gefixt: `locations=[0,0.15,0.85,1]`, `colors=[purple,edge,edge,purple]` — Purple sitzt jetzt fest an beiden physischen Rändern (fixe Pt-Distanz, da der Layer immer die volle, unveränderliche `view.bounds` abdeckt, nur `scrollView.contentOffset` bewegt sich beim Bounce). **Nativer Swift-Fix — braucht einen neuen Xcode-Archive+TestFlight-Upload, wird nicht automatisch über Vercel deployed** (anders als die anderen Änderungen dieser Session).
- **Zurück-Button-Konsistenz-Pass** — Simon bemerkte, dass viele Screens einen kleinen icon-only grauen Pfeil-Button statt des etablierten lila „‹ Zurück"-Textbuttons (z.B. `ProfilErscheinungsbildScreen.tsx`) nutzten. Vollständiger Audit über alle 39 Screens (Explore-Agent) fand 14 betroffene Screens + 4 Sub-Flow-Instanzen mit falscher Farbe/Icon (aber schon Text): `AbiRechnerScreen`, `HausaufgabenheftScreen`, `KlausurplanScreen`, `KalenderScreen` (3 Stellen), `BlurtingScreen`, alle 4 `ProbeklausurModeXScreen`, `ProbeklausurRetroScreen` (2 Stellen), `TwoFactorSetupScreen`, `LernplanKonfiguratorScreen`, `OnboardingScreen` (3 Stellen), `UnterrichtScreen` — alle auf denselben lila Chevron+Text-Look vereinheitlicht. **Bewusste Ausnahme:** `DrawingCanvas.tsx`s Fullscreen-Zurück-Button bleibt icon-only — sitzt in einer dichten, absichtlich icon-only Toolbar-Zeile (Settings/Undo/Redo/Stift/Marker, alle gleiche Button-Größe), ein Textlabel hätte die Zeile gesprengt.
- **Bottom-Nav Scroll-Recenter** — gescrollte Screens blieben nach einem Tab-Wechsel dauerhaft in der verschobenen Scroll-Position hängen ("dragged down"), auch nach Rückkehr zum selben Tab. Gefixt in `App.tsx`: neuer `useEffect` auf `location.pathname` scrollt bei jedem Routenwechsel auf 0 (Mobile: `window.scrollTo`, Desktop: `desktopMainRef.current?.scrollTo`). Zusätzlich in `BottomNav.tsx`: Tap auf den bereits aktiven Tab (Pfad ändert sich nicht, obiger Effect feuert nicht) recentert jetzt explizit per `window.scrollTo({behavior:'smooth'})` — matched natives iOS-Tabbar-Verhalten (Re-Tap auf aktiven Tab scrollt hoch).
- **Kauf-Fehler „Fehler beim Checkout" / „product is not available for purchase" diagnostiziert** — beide Meldungen kommen vom selben Aufruf (`purchasePlan()` in `src/lib/revenuecat.ts`), beide Kauf-Einstiegspunkte (ProfilScreen-Banner, ProModal) routen bereits korrekt zu RevenueCat auf iOS — **kein Routing-Bug**. `ProfilScreen.tsx` zeigte bisher aber immer denselben harten generischen Text egal welcher Fehler auftrat, während `ProModal.tsx` an derselben Stelle schon die rohe RevenueCat/StoreKit-Meldung anzeigte — sah wie zwei verschiedene Bugs aus, war derselbe. Gefixt: `ProfilScreen.tsx` zeigt jetzt ebenfalls `result.error` statt fixem Text (neuer `paymentErrorMessage`-State, Toast von `rounded-pill`+`whitespace-nowrap` auf `rounded-card`+zentriert+`max-w-[85%]` umgestellt, da die echte Meldung länger/unvorhersehbar ist). **Eigentliche Root Cause NICHT im Code lösbar:** Simon hat in App Store Connect bestätigt, dass die Abos weiterhin auf „Waiting for Review" stehen — deckt sich exakt mit der bereits am 27.07. hergeleiteten Theorie, dass Apple Sandbox-Käufe für eine Erst-App erst nach abgeschlossener Abo-Prüfung ausliefert, nicht schon nach reiner Einreichung. Löst sich von selbst sobald Apple das Abo freigibt, siehe „Nächste Session — Handoff" oben.
- **Beta-Labeling — nur Vorschläge gemacht, noch nichts umgesetzt:** Simon plant grundsätzlich mittelfristig ein natives SwiftUI-Rewrite (siehe „Zukunftsvision" unten) und möchte bis dahin die App klar als Beta kennzeichnen, ohne das Wort überall zu verstreuen (Beispiel für einen aktuell kaputten Punkt: Geometriestift im Schreibscreen funktioniert nicht). Vier besprochene, nicht gegenseitig ausschließende Optionen: (1) kleines dauerhaftes „Beta"-Pill neben Name/Version im Profil, (2) einmaliger dismissable Hinweis beim ersten Öffnen nach diesem Update, (3) gezielte „Beta"-Tags direkt auf bekannt-kaputten Einzelfeatures statt App-weit, (4) App-Store-Untertitel/Beschreibung erwähnt Beta/Early Access. Noch keine Entscheidung getroffen — vor Umsetzung mit Simon abstimmen welche Kombination.

**Alles außer dem Swift-Fix ist ein reiner Web-Change** (Vercel-deployed, sofort live auch in TestFlight, da `server.url` auf Produktion zeigt) — nur der Bounce-Gradient braucht einen neuen nativen Build.

---

## Letzte Session (27.07.2026, spät) — Track A abgeschlossen: Signing-Debugging, RevenueCat-Vollkonfiguration, App-Store-Metadaten, echter Produktionsbug gefunden+gefixt, App eingereicht

**Ausgangspunkt:** Direkte Fortsetzung der 26.–27.07.2026-Session (siehe Eintrag darunter) — Track A war größtenteils gebaut, aber TestFlight-Upload/Sandbox-Test/finale Einreichung standen noch aus. Diese Session hat alles bis zur tatsächlichen Einreichung durchgezogen.

### Cleanup zu Sessionbeginn
Temporäre Debug-`console.log`s (`AuthScreen.tsx`, `useDeepLinkAuth.ts`) und der `DemoScreen.tsx`-„Eigene Notiz erstellen"-Button waren laut CLAUDE.md-Handoff bereits als erledigt markiert (Commit `89edf1f`), zeigten sich beim Sessionstart aber nochmal im Arbeitsverzeichnis — Claude hat sie erneut entfernt, git-Diff zeigte danach aber keine Änderung mehr gegenüber `HEAD`, d.h. sie waren tatsächlich schon sauber committed; kein echter Regressions-Fund, nur eine kurze Verwirrung.

### Xcode-Signing-Debugging (mehrstufig, alles gelöst)
1. **„Communication with Apple failed" / „no devices"** — Root Cause: Simons Apple-Team hatte noch nie ein physisches Gerät registriert. Gelöst durch Anschließen + Trust seines iPhones, Developer-Mode-Aktivierung (erzwingt Neustart, seit iOS 16 Pflicht für Geräte-Debugging), Registrierung über Xcodes Devices-and-Simulators-Fenster.
2. **„unable to read input file ... 19d0167c-....mobileprovision"** — stale Profil-Referenz in DerivedData nach der Geräte-Registrierung. Claude hat `~/Library/Developer/Xcode/DerivedData/App-*` komplett gelöscht.
3. **Eigener Fehler dabei:** Das hat versehentlich auch den Swift-Package-Manager-Cache (`SourcePackages/artifacts`, u.a. Capacitor/Cordova/RevenueCat-`.xcframework`s) mit gelöscht → 71 „No XCFramework found"-Fehler. Gefixt via Xcode-Menü **File → Packages → Reset Package Caches**, dann **Resolve Package Versions**. Für zukünftige Sessions: DerivedData-Löschung ist im Prinzip sicher, aber bei SPM-Projekten explizit an den zusätzlichen Package-Cache-Reset denken.
4. **Asset-Catalog-Fehler waren ein Fehlalarm:** `actool` meldete AppIcon als 192×192 (statt 1024×1024) und die Splash-Bilder mit unmöglichen Fließkomma-Maßen (7868.16×7868.16) — direkte Prüfung der echten Dateien via `sips` zeigte, dass beide bereits korrekt waren (1024×1024 bzw. 2732×2732). Ursache: veraltete Xcode-Build-Cache-Analyse, kein echtes Problem. Echt war dagegen Xcodes „3 unassigned children"-Warnung für `Splash.imageset` — drei verwaiste `splash-2732x2732*.png`-Dateien vom 14.07. (vor der eigentlichen Regenerierung am 25.07.), nicht in `Contents.json` referenziert → gelöscht.
5. Xcode-Cloud-Popup beim ersten Archive-Versuch mit „Remind Me Later" übersprungen — bewusst kein CI/CD-Setup, nur manuelles Archive+Upload für diese einmalige Einreichung.

### RevenueCat — vollständig konfiguriert (war in der Vorsession nur teilweise)
- **Zwei getrennte App-Store-Connect-API-Key-Slots in RevenueCat**, nicht einer: „In-app purchase key configuration" (StoreKit-2-Transaktionsverifizierung) war aus der Vorsession bereits befüllt, zeigte aber „Credentials need attention"; der separate, komplett leere „App Store Connect API"-Slot (nötig fürs Produkt-Import) war der eigentliche Grund für „Connection issue" beim Produkt-Anlegen. Simon hatte bereits einen zweiten Key (`AuthKey_...NTC.p8`) von der Vorsession übrig, der genau dafür gedacht war — hochgeladen, Fehler behoben.
- **Vendor Number** ergänzt (zu finden unter App Store Connect Startseite → „Payments and Financial Reports", oben links).
- **Produkte** `com.dailystudent.app.pro.monthly` / `com.dailystudent.app.pro.yearly` in RevenueCat angelegt (Apple-Store-Produktformular, nicht Google-Play-Formular — kurze Verwechslung wegen einer „Monthly with 12 months commitment"-Checkbox, die sich als optionales, für uns irrelevantes Google-Play-Konzept herausstellte, keine Blockade).
- **Entitlement** `pro` angelegt, beide Produkte zugeordnet.
- **Offering** mit Monthly-/Annual-Package erstellt und als **„Active"** markiert (RevenueCats aktuelle Bezeichnung für das, was in älteren Docs „Current" heißt — nur eine Terminologie-Verwechslung, kein Fehler).

### Der eigentliche Blocker: „None of the products registered ... could be fetched from App Store Connect"
Trotz vollständig korrekter RevenueCat-Konfiguration und aktivem Paid-Applications-Agreement (verifiziert unter Business/Geschäftsbereich → „Aktiv", alle Territorien) blieben die Angebote leer. Ursache, gemeinsam mit Simon herausgearbeitet: **Bei einer komplett neuen App (noch nie eingereicht) propagiert Apple neue Abo-Produkte offenbar erst dann ins auslieferbare StoreKit, wenn App + Abo gemeinsam zur Prüfung eingereicht wurden** — nicht schon beim bloßen Anlegen, auch nicht nach Stunden Wartezeit. Das widerlegte Claudes ursprüngliche Einschätzung, die „Kann nicht zur Prüfung übermittelt werden"-Warnung sei für Sandbox-Tests irrelevant — war es für eine Erst-App nicht. Praktische Konsequenz: die tatsächliche Einreichung wurde dadurch **Voraussetzung fürs Testen**, nicht nur Endziel.

### Echter Produktionsbug gefunden + gefixt: `ProfilScreen.tsx` ging auf iOS fälschlich zu Stripe
Beim ersten TestFlight-Kaufversuch über den „Pro freischalten"-Button auf dem Profil-Screen landete Simon im Stripe-Checkout statt im nativen Apple-Kaufdialog — ein echter App-Store-Compliance-Risiko (Guideline 3.1.1 verlangt native IAP für In-App-Digitalabos). Root Cause: Der native/RevenueCat-Kaufzweig war beim ursprünglichen Track-A-Bau nur in `ProModal.tsx` ergänzt worden, nicht im separaten `handleUpgrade()` in `ProfilScreen.tsx`, der unconditional `createCheckoutSession()` (Stripe) aufrief. Gefixt: gleicher `Capacitor.isNativePlatform()`-Zweig wie in `ProModal.tsx` ergänzt (`src/screens/ProfilScreen.tsx`). Committed + gepusht (`7769f19`), Live-Deploy per `curl`+`grep` gegen den echten Vercel-Bundle verifiziert (RevenueCat-Key `appl_...` im ausgelieferten JS gefunden). **Wichtige Architektur-Bestätigung dabei:** Änderungen in `src/` sind sofort im TestFlight-Build wirksam, sobald Vercel deployed hat — kein neuer Xcode-Build nötig, weil `server.url` immer den Live-Stand lädt. Nur native/`Info.plist`-Änderungen brauchen einen frischen Archive+Upload-Zyklus.

### App-Store-Connect-Metadaten vollständig ausgefüllt
- **App-Record existierte anfangs gar nicht** — Klärung der Verwechslung Bundle-ID (Developer Portal) vs. echter App-Eintrag (App Store Connect „Apps"-Tab, eigener „New App"-Schritt) — angelegt.
- **Primäre Kategorie:** Bildung. **Altersfreigabe, Inhaltsrechte:** „Nein" auf Drittanbieter-Inhalte — KI-Outputs sind dynamisch pro Nutzer generiert (via Groq/Gemini-API-Vertrag), keine Weiterverbreitung fremder lizenzierter Medien.
- **Beschreibung + Keywords (DE)** von Claude entworfen, direkt aus der Feature-Liste dieser Datei abgeleitet.
- **Support-URL:** `https://www.dailystudent.de/impressum` — bewusst keine neue Seite gebaut, Impressum ist bereits öffentlich (verifiziert im Routing-Code, kein Login nötig) und enthält echte Kontakt-Email.
- **Datenschutz-URL:** `https://www.dailystudent.de/datenschutz` — **wichtig:** das ist die öffentliche Route, NICHT `/profil/datenschutz` (die ist auth-gated) — im Routing-Code verifiziert (`App.tsx`, „Public routes — always accessible without auth").
- **App-Datenschutz-Fragebogen** (Datentypen-Angaben): mit Simon durchgegangen, wichtigster ehrlicher Punkt — Notiz-Inhalte werden an Groq/Gemini zur KI-Analyse übertragen, zählt als Drittanbieter-Weitergabe.
- **Export-Compliance:** `ITSAppUsesNonExemptEncryption = false` in `Info.plist` ergänzt (Standard-HTTPS-Ausnahme, keine eigene Kryptografie) — gilt ab dem nächsten Archive; für den bereits hochgeladenen Build wurde die interaktive Apple-Nachfrage direkt beantwortet.
- **Frankreich-Sonderfall:** „Ja" zur Verfügbarkeit in Frankreich hätte eine separate, genehmigungspflichtige Kryptografie-Dokumentation bei Apple ausgelöst (echtes Risiko fürs Zeitfenster). Da Frankreich für die Zielgruppe (deutsches Schulsystem) ohnehin irrelevant ist: Frankreich aus der Territorien-Liste ausgeschlossen statt das Verfahren zu durchlaufen.
- **App-Store-Screenshots:** Dimensions-Validierung von App Store Connect prüft exakte, bekannte Geräte-Auflösungen, nicht nur „groß genug" — mehrere Runden gelöst durch (a) direktes Simulator-Screenshot (⌘S) vom passenden Geräte-Simulator, wo verfügbar, oder (b) wenn nur neuere/größere Simulatoren verfügbar waren, präzises Center-Crop + Resize via `sips` (macOS-Bordmittel) auf die exakte Zielgröße — kein Web-Konverter, der hatte vorher wiederholt zu Ablehnungen geführt. iPhone 6,5″: 1284×2778 aus iPhone-17-Pro-Max-Quelle zugeschnitten. iPad: 2752×2064 traf direkt exakt.
- **Finaler Submit-Blocker:** Auf der Abo-Gruppen-Seite mussten die einzelnen Abos (nicht nur die Gruppe) über Checkboxen explizit ausgewählt und „Zur Prüfung hinzufügen" geklickt werden, bevor der eigentliche Submit im „Übermittlungsentwürfe"-Panel klickbar wurde.

### Ergebnis
**App wurde am 27.07.2026 (spät abends) zur Prüfung eingereicht.** Noch nicht erledigt, für nächste Session:
- **Sandbox-Kauftest wurde in dieser Session nie tatsächlich durchgeführt** — durch das StoreKit-Propagations-Problem blockiert, dann direkt zur Einreichung übergegangen. Jetzt, nach der Einreichung, erneut versuchen (Sandbox-Tester-Account-Erstellung wurde Simon erklärt, aber nie explizit als „erledigt" bestätigt — vor dem Test prüfen).
- Auf Apples Review-Entscheidung warten.

### Nebenbei erledigt: Design-Vorarbeit (nicht Teil von Track A, siehe eigene To-Do-Punkte unten)
- Ein erster Versuch, 3 App-Store-Vorschaubilder zu bauen, wurde von Simon zurückgewiesen (dieselbe Screenshot-Aufnahme 3× mit nur je einem Satz Text ist „ein Nogo") — richtig: braucht echte Geräte-Rahmen-Mockups UND pro Bild einen inhaltlich unterschiedlichen Screenshot. Nicht fertiggestellt, wartet auf 2 weitere Screenshots (z.B. Smart Notes, Karteikarten) von Simon.
- Auf Simons Bitte wurde ein Design-System-Referenzdokument aus dem echten `LandingScreen.tsx`-Code extrahiert (Farben, Typografie, Bewegungs-Signatur, wiederkehrende Komponenten-Muster) als Artifact veröffentlicht, gedacht als Briefing-Grundlage für die App-weite Identitätsarbeit. **Wichtiger Fund dabei:** Die Landing Page ist entgegen der bisherigen Annahme NICHT durchgehend dunkel — heller Grund (`#FAFAFD`) mit gezielten dunklen Kontrast-Panels (`#160E28 → #2A1B5C`), nur `DemoScreen.tsx` ist komplett dunkel (`#0a0a0f`). Beide Behandlungen existieren aktuell nebeneinander, nicht als ein Guss — explizit als offene Frage für die kommende Identitäts-Arbeit festgehalten.
- Zwei konkrete UX-Polish-Punkte von Simon direkt beim TestFlight-Testen auf echtem Gerät gefunden und weiter oben unter „Zusätzlich notiert während TestFlight-Testing" festgehalten (iOS-Overscroll-Bounce-Farbverlauf, Landing-Page-Ersteindruck in der nativen App) — als nächster Workstream nach Track A geplant, noch nicht begonnen.

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
Simon stellte zwei Dinge in Frage: (1) ob `DemoScreen.tsx`s „Eigene Notiz erstellen"-Button vor dem Login echte KI aufruft (**Klärung: nein** — reiner Template-Fallback, `buildFallback()`, kein Netzwerk-Call, siehe Code-Kommentar in `DemoScreen.tsx:203-205` aus einer Vorsession; Simon entschied sich trotzdem den Button zu entfernen, ✅ umgesetzt 27.07.2026 in einer Folgesession); (2) grundsätzlicher, ob ein gewrappter Web-App überhaupt für den App Store taugt, angesichts eines beobachteten Missverständnisses ("die App ist doch nur meine Website mit Icon, das braucht doch eh ein 'zum Homescreen hinzufügen', das kennt keiner").

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

**Zwischendurch (3) — Lernzettel löschen + swipebare Markieren/Löschen-Aktionen (25.07.2026):** Simon meldete, die Lernzettel-Bibliothek werde unübersichtlich ohne Lösch-Möglichkeit, und wünschte sich explizit eine nach links wischbare Zeile "wie in Apple Notizen" (roter Papierkorb + gelber Stern) statt eines einfachen Lösch-Buttons. Umgesetzt wie in der Phase-3-Liste beschrieben — neue `LernzettelRow`-Komponente, neues `highlighted`-Feld, Migration `015_lernzettel_highlighted.sql`. Details/Architektur-Hinweise siehe Phase-3-Liste + Architektur-Entscheidungen oben.

**Diese Session (25.07.2026) ist damit abgeschlossen** — Simon geht mit einem neuen Chat weiter. Siehe „Nächste Session — Handoff" unten für den vollständigen Übergabe-Stand. **Wichtig:** direkt im Anschluss an diesen Push begann (in einer separaten, parallel laufenden Session) der komplette Track-A-Bau (nativer iOS-Wrapper, Capacitor, RevenueCat, Einreichung bei Apple) — siehe die neueren „Letzte Session"-Einträge weiter oben in diesem Dokument für den vollständigen, aktuelleren Stand. Diese Session hier ist nur noch aus historischen Gründen erhalten.

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
