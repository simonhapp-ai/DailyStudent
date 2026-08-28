# DailyStudent — Master-Prompt: Pro-Launch + Navigation/Layout-Politur

> **Zweck:** Diese Datei ist die Master-Checkliste für die nächste Arbeitsphase (Ziel: fertig vor Studienstart ~01.10.2026).
> In VS Code Block für Block abarbeiten. Erst die **offenen Fragen** unten mit Simon klären und die Antworten hier eintragen, dann Block 1 → 6.
> Erstellt aus der Roadmap-Session am **2026-08-28**. Ergänzt/präzisiert CLAUDE.md — bei Widerspruch gilt diese Datei für diese Phase.

---

## 0. Kontext — Entscheidungen aus der Roadmap-Session (noch nicht in CLAUDE.md)

- **SwiftUI-Rewrite bleibt aufgeschoben.** Kein natives UI, kein Stack-Wechsel. Der aktuelle React/Vite/Capacitor-Wrapper bleibt. Rewrite ist ein separates Projekt für „in ein paar Monaten", ohne Deadline.
- **Weg A gewählt:** Wrapper jetzt polieren → Pro noch in dieser Klausurenphase live → SwiftUI später.
- **Design/Ästhetik macht Simon selbst.** Claude fasst **kein** Farb-/Spacing-/Visual-Redesign an, entwirft kein Designsystem. Claudes Design-Scope in dieser Phase ist **ausschließlich**: nahtlose Navigation, kein Layout-Sprung/-Shift beim Laden, alle Screens korrekt zentriert + orientiert, keine Safe-Area-Überlappung. Keine inhaltlichen Screen-Umbauten.
- **Pro-Launch 1 läuft OHNE Claude-Tokens.** Bei Launch bleibt die komplette KI-Pipeline auf Gemini/Groq. „Claude Pro Lernzettel/Materialien" sind bereits als „coming soon"-Teaser in der App — das reicht.
- **Claude-Tokens (Launch 2)** kommen für **genau 3 Premium-Produkte**: Lernzettel, Probeklausur-Material (inkl. Korrektur), Lernpläne. Alles andere bleibt dauerhaft auf Gemini (reicht qualitativ). Modell: **Sonnet 5**. **Trigger: Umbau starten bei ~5 zahlenden Abonnenten** (dann tragen sie die Kosten, Cashflow-Puffer da).
- **Preis bleibt** €7,99/Monat, €59,99/Jahr. Später ggf. anpassen.
- **Paywall-Tabelle in CLAUDE.md bleibt unverändert** (Ausnahme evtl. AFB-Trainer, siehe Q5.2).
- **Gratis-Testphase:** 1 Woche kostenlos auf dem **Monats**-Produkt → wandelt automatisch in bezahltes Monatsabo um. Kein Trial am Jahresabo.
- **Budget-Leitplanke:** max. ~€20/Monat aus eigener Tasche. Pro-User finanzieren sich selbst. Ideal = frühes Profit-Modell.
- **App ist bereits live im App Store** (offene Beta, ~130 Downloads, tägliche Nutzer). Pro ist über die globale `app_config`-Tabelle in Supabase weggeschaltet. → Beim Testen darf das globale Flag **nicht** umgelegt werden (Block 2 löst das).

**Arbeitsregeln für die VS-Code-Session:**
- Nach jedem Merge nach `main`: `tsc --noEmit` + `npm run build` + `npm run lint`. Lint-Problemzahl darf sich **nicht erhöhen** (Referenz laut CLAUDE.md ~92).
- Alle Blöcke außer evtl. dem Intro-Offer brauchen **kein** App-Store-Resubmit — alles ist Web/Supabase, deployt über Vercel in den bereits genehmigten Wrapper (`server.url` → Produktion).
- Feature-Arbeit auf Branch `polish/navigation-stability`, fertige verifizierte Cluster einzeln nach `main`.
- Sensible Keys (`.p8`, private Keys) nie in den Chat — nur Dateipfad, lokal verarbeiten.

---

## OFFENE FRAGEN — vor Block 1 beantworten, Antworten hier eintragen

| # | Frage | Block | Antwort |
|---|-------|-------|---------|
| 1 | **Apple Small Business Program** — schon eingeschrieben? (15 % statt 30 % Provision — alle Rechnungen unten gehen von 15 % aus) | 1 | _____ |
| 2 | **AGB-URL `https://www.dailystudent.de/agb`** — im „License Agreement / EULA"-Feld in App Store Connect schon eingetragen? (offener Punkt aus der 04.08.-Ablehnung) | 1 | _____ |
| 3 | **Test-Allowlist-E-Mail(s)** — welche E-Mail(s) sollen den Pro-Flow trotz aktiver Beta sehen? (vermutlich `simon.happ@gmx.de` bzw. die App-Login-E-Mail) | 2 | _____ |
| 4 | **Routen-Übergang** — dezente Übergangsanimation (Fade/Slide, kein Bounce) gewünscht, oder reicht „hart schneiden, aber kein Sprung"? | 4 | _____ |
| 5 | **Screens für inhaltlichen Umbau** — gibt es welche, die du DOCH neu angeordnet haben willst? (Standard: nein, nur Stabilität) | 4 | _____ |
| 6 | **Sandbox-Tester-Account + Test-iPhone** — bereit? (Account: App Store Connect → Users and Access → Sandbox → E-Mail, die noch keine Apple-ID ist) | 5 | _____ |
| 7 | **AFB-Trainer (Probeklausur Mode 1)** — nach Launch wieder Pro-only (CLAUDE.md-Tabelle), oder dauerhaft kostenlos lassen (war in der Beta frei, kam gut an)? | 5 | _____ |
| 8 | **Stripe-Coupons** `coins-discount-15` / `coins-discount-30` — jetzt anlegen (Coins-Rabatt funktioniert dann sofort nach Launch) oder später? | 5 | _____ |
| 9 | **Trial-Copy-Wortlaut** — „1 Woche kostenlos, danach €7,99/Monat" ok, oder anders? | 3 | _____ |
| 10 | **Modell für Launch 2** — Sonnet 5 für alle 3 Produkte, oder Opus 5 nur für die Probeklausur-Korrektur (Hybrid, +~€0,50/Nutzer/Monat)? | 6 | _____ |
| 11 | **Token-Logging jetzt** in die 3 Gemini-Calls einbauen (leichtgewichtig, nur Zählung) — ok? | 6 | _____ |
| 12 | **CLAUDE.md** — Entscheidungen + Kostenmodell jetzt schon eintragen, oder erst nach deinem OK zum Gesamtablauf? | 0/6 | _____ |

---

## BLOCK 1 — AGB & Store-Compliance für Pro

**Ziel:** Rechtstext + Store-Metadaten sind vollständig für einen bezahlten Abo-Launch **mit Gratis-Testphase**.

**Befund aus dem zweiten Blick auf `src/screens/AGBScreen.tsx` (2026-08-28):**
- §5 (Purchases) + §6 (Subscriptions) decken Stripe + Apple IAP inkl. Apples Pflicht-Wortlaut zur Auto-Verlängerung bereits ab. ✅ Ausreichend für einen bezahlten Launch **ohne** Trial.
- **Lücke:** §6 → „Free Trials & Promotional Access" beschreibt **nur das Referral-Programm**, keinen StoreKit-Trial. Bei Einführung der 1-Woche-Testphase verlangt Apple im Text: Dauer, automatische Umwandlung in €7,99/Monat, Kündigung ≥24h vor Trial-Ende sonst Abbuchung, ein Trial pro Apple-ID / Abo-Gruppe, Verwaltung über iOS-Einstellungen → Abonnements bzw. in-App Profil → Account → „Abo verwalten".
- §12 (Apple-Standard-EULA-Klauseln) ist Termly-generiert, unvollständig, aber **status quo genehmigt** → nur anfassen, wenn Apple es explizit rügt.

**Claude-Aufgaben:**
- [ ] `src/screens/AGBScreen.tsx` — §6 „Free Trials & Promotional Access": neuen Absatz für den StoreKit-Trial ergänzen (Inhalte s. o.). Referral-Absatz bleibt daneben.
- [ ] `src/screens/AGBScreen.tsx` — „Letzte Aktualisierung" (Zeile ~16) auf das Änderungsdatum setzen.
- [ ] `src/components/ui/ProModal.tsx` — prüfen, dass **direkt am Kauf-Button** sichtbar ist: Abo-Titel, Laufzeit, Preis pro Zeitraum, antippbare Links zu `/agb` + `/datenschutz` (Apple-Richtlinie 3.1.2). Falls unvollständig: ergänzen.
- [ ] `tsc --noEmit` + `npm run build` + `npm run lint` grün.

**Simon-Aufgaben:**
- [ ] App Store Connect → „App Information" → **License Agreement / EULA**-Feld: `https://www.dailystudent.de/agb` eintragen (falls noch nicht). → **Frage 2**
- [ ] App-Store-Beschreibung/Werbetext prüfen: Abo-Name + Laufzeit + Preis müssen in den Metadaten stehen (Apple-Pflicht für Abo-Apps).
- [ ] Apple Small Business Program: Status prüfen / einschreiben (App Store Connect → Agreements, Tax, and Banking → „Apple Small Business Program"). → **Frage 1**

**Abnahme:**
- [ ] `curl -sI https://www.dailystudent.de/agb` → `200`, Trial-Absatz live
- [ ] ProModal zeigt alle 3.1.2-Pflichtangaben am Kauf-Button
- [ ] Simon hat License-Agreement-URL + SBP-Status bestätigt

---

## BLOCK 2 — Test-Infrastruktur (ohne Live-User zu stören)

**Ziel:** Simon kann den echten Pro-Kauf-Flow gegen die genehmigten Apple-Produkte testen, während alle anderen Nutzer im Beta-Modus bleiben. Das globale `app_config`-Flag bleibt unangetastet.

**Ansatz: E-Mail-Allowlist-Bypass (nur `pro_purchases_enabled`).**

**Claude-Aufgaben:**
- [ ] Prüfen, ob es bereits eine zentrale Dev-/Allowlist-E-Mail-Konstante gibt (`ProfilDevToolsScreen.tsx` bzw. `App.tsx` — Dev-Tools sind „auf Simons Email allowlisted"). Wenn ja: wiederverwenden/erweitern. Wenn nein: `PRO_TEST_ALLOWLIST` als Konstante anlegen.
- [ ] `src/context/UserContext.tsx` — an der Stelle, wo `appConfig` / `proPurchasesEnabled` bereitgestellt wird: wenn `authUser?.email` in der Allowlist → `proPurchasesEnabled = true` **unabhängig** vom `app_config`-Wert. Zentral im Context-Wert lösen, damit alle Konsumstellen (`ProModal`, `ProfilScreen.handleUpgrade`, `LernplanKonfiguratorScreen`, `ProfilCoinsScreen`, `LernplanDetailScreen`, `LernzettelScreen`, `LernzettelGeneratorScreen`) automatisch mitziehen.
- [ ] **Nur** `pro_purchases_enabled` betroffen. `probeklausur_mode2/3/4_enabled` + `probeklausur_afb_trainer_free` bleiben unberührt (Feature-Pausierung ≠ Kauf).
- [ ] Code-Kommentar: „Test-Allowlist — nach Pro-Launch drin lassen; erlaubt späteres Testen bei aktiver Beta, für Nicht-Allowlist-User folgenlos."
- [ ] Branch `polish/navigation-stability` anlegen (Vercel erzeugt automatisch Preview-Deploys pro Branch/PR).
- [ ] `tsc` / `build` / `lint` grün.

**Simon-Aufgaben:**
- [ ] Allowlist-E-Mail(s) nennen. → **Frage 3**
- [ ] Nach Deploy: mit Allowlist-Account → Pro-Kauf-Flow erscheint. Mit normalem Account → weiterhin Beta-Ansicht („Pro startet nach der Beta").

**Abnahme:**
- [ ] Allowlist-Account sieht den echten Pro-Kauf, normaler Account nicht
- [ ] Preview-URL für `polish/navigation-stability` existiert

---

## BLOCK 3 — Gratis-Testphase (1 Woche → Monatsabo)

**Ziel:** Neue Nutzer starten 1 Woche kostenlos, danach automatische Umwandlung in das bezahlte Monatsabo. Ein Trial pro Apple-ID (von Apple erzwungen). Kein Trial am Jahresprodukt.

**Claude-Aufgaben:**
- [ ] `src/lib/revenuecat.ts` + `src/components/ui/ProModal.tsx` — Intro-Offer-Felder des Monats-Packages auslesen (RevenueCat `StoreProduct` / `PurchasesPackage` → introductory price / offer). Copy rendern:
  - berechtigt → „1 Woche kostenlos, danach €7,99/Monat" (Wortlaut → **Frage 9**)
  - nicht berechtigt (Trial verbraucht) → „€7,99/Monat"
- [ ] `supabase/functions/revenuecat-webhook/index.ts` — verifizieren:
  - `INITIAL_PURCHASE` mit `period_type: "TRIAL"` → Entitlement `pro` → `subscriptions.status = active` (nicht als „kein Abo" behandeln)
  - Konversion TRIAL → NORMAL → bleibt aktiv
  - Trial-Kündigung / `EXPIRATION` → Status korrekt auf inaktiv
  - Upsert weiterhin `onConflict: 'user_id'`, `source = 'revenuecat'`
- [ ] Optional: `src/screens/ProfilAccountScreen.tsx` „Abo verwalten"-Zeile zeigt „Testphase — endet am {Datum}" bei Trial-Periode.
- [ ] `tsc` / `build` / `lint` grün.

**Simon-Aufgaben:**
- [ ] App Store Connect → `com.dailystudent.app.pro.monthly` → Subscription Prices → **Introductory Offers** → Set Up: Territorien **Alle**, Typ **Free**, Dauer **1 Woche**, Start jetzt, kein Enddatum.
- [ ] **Kein** Intro-Offer am Jahresprodukt.
- [ ] Prüfen, ob App Store Connect für das Offer ein Review verlangt; falls ja, mit einreichen (Abo selbst ist bereits genehmigt → sollte schnell gehen).
- [ ] RevenueCat Dashboard: prüfen, dass das Offer im Monats-Package auftaucht (RevenueCat zieht es automatisch aus ASC).

**Abnahme (Sandbox):**
- [ ] Neuer Sandbox-Account startet Monatsabo → **0 € belastet**, Status „Testphase"
- [ ] Nach (beschleunigtem Sandbox-)Ablauf → automatische Umwandlung in bezahltes Monatsabo, Entitlement bleibt durchgehend aktiv
- [ ] ProModal zeigt korrekte Trial-Copy für berechtigte vs. nicht-berechtigte Accounts
- [ ] Webhook setzt `pro` bereits bei Trial-Start

---

## BLOCK 4 — Navigation & Layout-Stabilität  *(Claudes Haupt-Coding-Workstream)*

**Ziel:** Die App fühlt sich nicht mehr wie ein Wrapper an — nahtlose Navigation, **kein** Screen springt/verschiebt sich beim Laden, alle Screens korrekt zentriert + orientiert, keine Safe-Area-/Notch-Überlappung, konsistente Zurück-Navigation.
**Nicht in diesem Block:** Farben, Spacing-Feinschliff, Button-Animationen, „Liquid-Glass"-Anmutung, inhaltliche Screen-Umbauten. Das macht Simon separat.

**Claude-Aufgaben:**
- [ ] **Audit zuerst** — alle 39 Screens systematisch (Browser-Tools / localhost / Preview). Pro Screen dokumentieren:
  - (a) Layout-Shift beim Mount (CLS)
  - (b) Content nicht zentriert / falsche Ausrichtung
  - (c) ruckelnder oder fehlender Routen-Übergang
  - (d) Scroll-Position bleibt nach Navigation hängen
  - (e) Safe-Area-/Statusbar-/Keyboard-Überlappung
  - (f) Zurück-Button-Inkonsistenz (Fortsetzung des 29.07-Pass)
  - → Ergebnis als Tabelle in `NAV_LAYOUT_AUDIT.md` (oder PR-Beschreibung).
- [ ] **Gemeinsame Ursachen zuerst** (statt 39× einzeln):
  - Zentraler Scroll-Reset in `src/app/App.tsx` — der `useEffect` auf `location.pathname` (seit 29.07) prüfen: deckt er Mobile `window.scrollTo` **und** Desktop `desktopMainRef` **und** native WebView ab?
  - Safe-Area-Insets (`env(safe-area-inset-*)`) app-weit konsistent — wahrscheinlichste Ursache für „Screen verrückt" oben/unten
  - `100vh` vs `100dvh` vs `min-h-screen`-Inkonsistenzen (Sprung bei ein-/ausblendender iOS-URL-Leiste / Tastatur)
  - Routen-Übergangs-Wrapper: konsistent machen bzw. minimalen Fade/Slide, `prefers-reduced-motion` respektieren, **keine** Bounce (→ **Frage 4**)
- [ ] Danach Screen-für-Screen die Einzelfälle aus dem Audit.
- [ ] Fertige, am Gerät verifizierte Cluster einzeln von `polish/navigation-stability` → `main`.
- [ ] Nach jedem Cluster: `tsc` / `build` / `lint` grün, Lint-Zahl nicht erhöht.

**Simon-Aufgaben:**
- [ ] Nach dem Audit: Liste priorisieren („diese Screens nerven am meisten").
- [ ] Preview-URL am Handy durchklicken, verbleibende Sprünge/Verzerrungen markieren (Screenshot + Screen-Name).
- [ ] → **Frage 5** (Screens für inhaltlichen Umbau?)

**Abnahme:**
- [ ] Kein Screen zeigt sichtbaren Layout-Shift beim Öffnen
- [ ] Alle Screens vertikal/horizontal korrekt, keine Safe-Area-Überlappung
- [ ] Routenwechsel startet immer oben, Übergang konsistent
- [ ] Zurück-Navigation überall identisch
- [ ] Simon hat am echten Gerät abgenommen

---

## BLOCK 5 — Pro-Unlock: Sandbox-Kauftest, Apple-Login, Flag-Flip

**Ziel:** Der komplette Kauf- und Login-Flow ist am echten Gerät verifiziert, dann wird Pro global freigeschaltet.

**Claude-Aufgaben:**
- [ ] Verifizieren, dass auf iOS **beide** Kauf-Einstiegspunkte (`ProModal.tsx`, `ProfilScreen.handleUpgrade`) zu `purchasePlan()` in `src/lib/revenuecat.ts` gehen, **nicht** zu Stripe (`createCheckoutSession`). (Fix `7769f19` für ProfilScreen — prüfen, dass er noch steht.)
- [ ] „Käufe wiederherstellen"-Aktion vorhanden + funktionsfähig (Apple-Pflicht für Abo-Apps).
- [ ] `api/gemini.ts` `isProbeklausurMode2Paused()` — bestätigen, dass es dasselbe `app_config`-Flag liest und beim Flip automatisch freigibt.
- [ ] Pro-Unlock-Checkliste (exakte Zielwerte + Reihenfolge) — siehe „Flag-Flip" unten.
- [ ] Nach Simons Tests: gemeldete Bugs fixen.

**Simon-Aufgaben (echtes iPhone, Sandbox-Account, Allowlist-Account eingeloggt):**
- [ ] Monatsabo **mit Trial** kaufen → 0 €, Entitlement aktiv, Pro schaltet frei
- [ ] Jahresabo kaufen → Preis korrekt, Pro frei
- [ ] App killen + neu starten → Pro-Status bleibt (Webhook + `subscriptions`-Tabelle)
- [ ] „Käufe wiederherstellen" nach Reinstall / zweitem Gerät
- [ ] Abo in iOS-Einstellungen kündigen → Pro bis Periodenende, danach weg
- [ ] Supabase `subscriptions`: genau **eine** Zeile pro Nutzer, `source = 'revenuecat'`, `status` korrekt
- [ ] RevenueCat Dashboard → Customer History: Events kommen an
- [ ] **Natives Apple-Login** end-to-end (nie verifiziert): Login → Deep-Link zurück → Session aktiv. Google gegenchecken (27.07 ok, aber nach den Änderungen erneut).
- [ ] Exakte Fehlermeldungen / Screenshots bei Problemen zurückmelden
- [ ] → **Fragen 6, 7, 8**

**Flag-Flip** — erst wenn alle Testfälle grün **und** Simons Geräte-Durchklick (Block 4 + 5) bestanden:
- [ ] Supabase → Table Editor → `app_config` (1 Zeile, `id=1`) setzen:
  - `pro_purchases_enabled` → `true`
  - `probeklausur_mode2_enabled` → `true`
  - `probeklausur_mode3_enabled` → `true`
  - `probeklausur_mode4_enabled` → `true`
  - `probeklausur_afb_trainer_free` → `false` (Normal) **ODER** `true` lassen → **Frage 7**
- [ ] Wirkt beim nächsten App-Start jedes Nutzers. Kein Deploy, kein Resubmit.

**Abnahme:**
- [ ] Alle Sandbox-Testfälle grün
- [ ] Apple- + Google-Login verifiziert
- [ ] Simon-Go erteilt
- [ ] Nach Flip: frischer Nicht-Allowlist-Account sieht Pro-Kauf + alle Probeklausur-Modi

---

## BLOCK 6 — Claude-Kostenmodell: Token-Logging + Doku  *(Launch 2 vorbereiten — NICHT jetzt bauen)*

**Ziel:** Reale Token-Zahlen sammeln, Entscheidung + Trigger dokumentieren, damit der Claude-Umbau bei ~5 Zahlern sauber startet.

**Claude-Aufgaben:**
- [ ] Leichtgewichtiges Token-Logging in die 3 relevanten Gemini-Calls: `generateLernzettel`, `generateMode3Exam` (+ zugehörige `correctExam`), `generateLernplan` — alle in `src/lib/gemini.ts`; Server `api/gemini.ts`. Gemini liefert `usageMetadata` (`promptTokenCount` / `candidatesTokenCount` / `thoughtsTokenCount`) → pro Call in eine Logging-Senke schreiben (Konsole oder kleine Tabelle). Kein UI, fail-silent, nicht blockierend. → **Frage 11**
- [ ] Nach ~1 Woche Live-Daten: echte Ø-Tokens gegen die Schätzung unten halten, Modell in CLAUDE.md aktualisieren.
- [ ] CLAUDE.md ergänzen (neuer Abschnitt „Pro Launch 2 — Claude-Premium-Produkte"), siehe **Frage 12**:
  - 3 Produkte: Lernzettel, Probeklausur-Material (inkl. Korrektur), Lernplan
  - Modell: **Sonnet 5** (`claude-sonnet-5`) — Begründung: Marge bleibt bei Jahresabo + Vielnutzern positiv; Opus überall wäre bei Jahresabos negativ
  - Trigger: Umbau starten bei **~5 zahlenden Abonnenten**
  - Per-Bucket-Tagesdeckel für Pro: Lernzettel **5/Tag**, Probeklausur-Material **3/Tag**, Lernplan **2/Tag** — neue Buckets im bestehenden `ai_rate_limit`-System (Muster wie Migration 012, tier-blind, Ceiling nur serverseitig)
  - Budget-Leitplanke: max. ~€20/Monat eigene Tasche; ab ~8–10 Zahlern selbsttragend
  - Architektur: neuer `api/claude.ts`-Proxy analog `api/gemini.ts` (Supabase-Token verifizieren → Rate-Limit prüfen → zu `api.anthropic.com` proxen); `src/lib/claude.ts` für die 3 Funktionen; Prompts aus `gemini.ts` portieren (reine Strings, kein UI-Impact); `ANTHROPIC_API_KEY` als Vercel-Env-Var
- [ ] `tsc` / `build` / `lint` grün.

**Simon-Aufgaben (erst wenn Launch 2 startet):**
- [ ] Anthropic Console Account (console.anthropic.com), Billing hinterlegen, API-Key erzeugen, **monatliches Spend-Limit ~€25** setzen. Separat vom Claude-Code-Abo.
- [ ] Key als `ANTHROPIC_API_KEY` in Vercel Env Vars.
- [ ] Nach Qualitäts-Vergleichstest: Sonnet 5 überall ok, oder Opus 5 nur für die Probeklausur-Korrektur? → **Frage 10**

### Kostenmodell (Referenz — Schätzung, wird durch Logging ersetzt)

Annahme: Provision 15 % (Small Business Program), MwSt ~19 % (Apple führt ab), USD ≈ EUR als Sicherheitspuffer.

**Claude-API-Preise** (USD / 1M Tokens):

| Modell | Input | Output |
|---|---|---|
| Sonnet 5 | $2 | $10 |
| Opus 5 | $5 | $25 |

**Kosten pro Generierung (geschätzt):**

| Produkt | ~Input / Output | Sonnet 5 | Opus 5 |
|---|---|---|---|
| Lernzettel | 5k / 4k | ~€0,05 | ~€0,13 |
| Probeklausur-Material (erstellen + korrigieren) | 13k / 8k | ~€0,11 | ~€0,27 |
| Lernplan | 7k / 6k | ~€0,07 | ~€0,19 |

**Pro aktivem Pro-Nutzer / Monat** (angenommene reale Klausurzeit-Nutzung: ~15 Lernzettel, ~8 Probeklausuren, ~4 Lernpläne):

- **Sonnet 5: ~€1,85 / aktiver Nutzer / Monat**
- Opus 5 überall: ~€5 / Nutzer / Monat

**Netto-Einnahme pro Monatsabo** (nach ~19 % MwSt + 15 % Apple): **~€5,60**. Jahresabo: **~€3,60/Monat-Äquivalent** (sofort als Cash).

**Marge pro Monatsabo, Sonnet 5: ~€3,75/Monat.** Opus überall: bei Jahresabos negativ → **Sonnet 5 empfohlen**.

**Wann den Claude-Schalter umlegen** (Apple zahlt ~33 Tage nach Monatsende aus, Claude bucht sofort → 1–2 Monate vorgestreckt):

| Zahler | Claude/Monat (Sonnet) | vorgestreckt über Auszahlungslücke |
|---|---|---|
| 5 | ~€9 | **~€10–19** → an der €20-Grenze |
| 10 | ~€18 | selbsttragend (~€56/Monat Einnahmen) |

RevenueCat: kostenlos bis $2.500/Monat getrackte Einnahmen, danach 1 %. Lange irrelevant.

---

## 3-WOCHEN-ZEITPLAN (Überlagerung über die Blöcke)

**Woche 1**
- Claude: Block 1 (AGB + ProModal) · Block 2 (Branch + Allowlist-Bypass) · Block 4 Audit + gemeinsame Ursachen · Block 6 Token-Logging
- Simon: License-Agreement-URL · Small Business Program · Intro-Offer einrichten · Sandbox-Tester-Account · TikTok-Ramp

**Woche 2**
- Claude: Block 3 (Trial-Code + Webhook-Verifikation) · Block 4 Screen-für-Screen · Block 5 Kauf-/Login-Pfad-Verifikation im Code
- Simon: Sandbox-Kauftests (Monat/Trial, Jahr, Restore, Kündigen) · natives Apple-Login · Navigation-Preview am Handy durchklicken

**Woche 3**
- Claude: Block 4 Rest + letzte Konsistenzrunde · Block 5 Bugfixes + Flag-Flip-Checkliste · Block 6 CLAUDE.md-Doku
- Simon: voller Geräte-Durchklick (Qualitäts-Gate) · **Go/No-Go Flag-Flip**

**Danach bis ~01.10.**
- Review-Nachwirkungen abfangen, erste echte Käufe beobachten, ~5-Zahler-Marke abwarten → Block 6 Launch-2-Umbau planen (~2–4 Wochen, überwiegend Backend, teils während Studienstart machbar).

---

## Betroffene Dateien (Schnellreferenz)

| Bereich | Dateien |
|---|---|
| AGB / Compliance | `src/screens/AGBScreen.tsx`, `src/components/ui/ProModal.tsx` |
| Test-Bypass | `src/context/UserContext.tsx`, `src/screens/ProfilDevToolsScreen.tsx` (Allowlist-Muster), `src/app/App.tsx` |
| Gratis-Testphase | `src/lib/revenuecat.ts`, `src/components/ui/ProModal.tsx`, `supabase/functions/revenuecat-webhook/index.ts`, `src/screens/ProfilAccountScreen.tsx` |
| Navigation/Layout | `src/app/App.tsx`, `src/components/ui/BottomNav.tsx`, `src/components/ui/DesktopSidebar.tsx`, `src/index.css`, alle `src/screens/*` |
| Pro-Unlock | `src/lib/revenuecat.ts`, `src/components/ui/ProModal.tsx`, `src/screens/ProfilScreen.tsx`, `api/gemini.ts`, Supabase `app_config` |
| Kostenmodell | `src/lib/gemini.ts`, `api/gemini.ts`, `CLAUDE.md` |

---

## Definition of Done (Phase gesamt)

- [ ] AGB + ProModal Store-compliant inkl. Trial-Disclosure
- [ ] Allowlist-Bypass live, Simon kann testen ohne Beta-User zu stören
- [ ] Gratis-Testphase eingerichtet + Sandbox-verifiziert (Trial → Monat Konversion)
- [ ] Navigation/Layout: kein Screen springt, alles zentriert, Zurück konsistent, am Gerät abgenommen
- [ ] Sandbox-Kauf (Monat/Jahr/Restore/Kündigen) + Apple-Login end-to-end grün
- [ ] `app_config` geflippt → Pro live für alle, alle Probeklausur-Modi frei
- [ ] Token-Logging läuft, Kostenmodell + Launch-2-Trigger in CLAUDE.md dokumentiert
- [ ] `tsc` / `build` / `lint` grün, Lint-Zahl nicht erhöht
