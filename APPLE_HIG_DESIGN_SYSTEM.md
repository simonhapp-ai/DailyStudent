# DailyStudent — Apple HIG × Design-System-Referenz

> **Zweck:** Kanonische Referenz für den App-weiten Redesign-Pass über alle 47 Screens: Farben, Formen, Schatten, Spacing, Typografie sauber an Apples Human Interface Guidelines ausrichten — OHNE die bestehende Markenidentität (Purple/Mint/Black/White, siehe CLAUDE.md „Design-Sprache") zu ersetzen und OHNE App-Struktur/Navigation/Screens neu zu denken. Diese Datei wird **Thema für Thema** befüllt, sobald Simon die jeweiligen HIG-PDFs liefert — kein Vorgriff, keine Annahmen aus Trainingsdaten über Apples exakte Werte. Ersetzt für diesen Zweck bewusst den `ui-ux-pro-max`-Skill (liefert generische Stil-Referenzdaten aus vielen Quellen — hier brauchen wir Apples eigene, exakte Vorgaben, nicht "guter Stil allgemein").
>
> **Extraktions-Prinzip:** Apples Original-Text bleibt in den Themen-Abschnitten **wörtlich auf Englisch** stehen (Begriffstreue — exakte pt/px-Werte, Kontrastverhältnisse, Terminologie wie „systemRed" oder „Liquid Glass" dürfen bei einer Übersetzung nicht verwässert werden). Eigene Beobachtungen/Diskussionspunkte sind klar als „Erste Beobachtungen (unbestätigt)" markiert und NICHT Teil der Extraktion — die werden erst nach Simons Bestätigung zu einem echten „Mapping"-Abschnitt.

**Arbeitsprinzip pro Thema:**
1. Simon schickt HIG-PDF(s) zu einem Thema
2. Claude extrahiert den Inhalt **verbatim/vollständig** in den passenden Abschnitt unten — keine Zusammenfassung, keine Auslassung
3. **Mapping-Abstimmung — immer genau EIN Thema auf einmal, nie mehrere parallel** (Simons ausdrückliche Vorgabe, 31.08.2026). Läuft in exakt zwei Teilen, in dieser Reihenfolge:
   - **(a) Was Apple vorschlägt** — kompakte Zusammenfassung der bereits extrahierten Guidelines für dieses eine Thema (keine neue Extraktion, nur eine fokussierte Wiedergabe dessen, was oben im Themen-Abschnitt schon steht)
   - **(b) Wie wir das bei uns finalisieren** — konkreter Vorschlag, wie das Prinzip auf unser bestehendes 4-Farb-System (Purple `#7C3AED`/Mint `#34D399`/Black/White) + Komponenten-Set übertragen wird, inkl. offener Entscheidungspunkte (z.B. Dark-Mode-Toggle-Frage) — Simon bestätigt/korrigiert, bevor es als „Mapping bestätigt" gilt
4. Nach Bestätigung: Subagent-Audit über alle 47 Screens für genau dieses Thema → Fund-Liste (Muster wie `NAV_LAYOUT_AUDIT.md`: Datei | Fund | Fix-Vorschlag)
5. Subagent-Umsetzung in verifizierten Batches — `tsc --noEmit` + `npm run build` + `npm run lint` nach jedem Cluster, Lint-Problemzahl darf sich nicht erhöhen
6. Status-Tabelle unten aktualisieren, Änderungsprotokoll ergänzen

---

## Status — Themen-Fortschritt

**🎉 Extraktionsphase der ursprünglichen 12 Themen abgeschlossen (31.08.2026)** — plus ein **13. Thema, „Charting Data", nachträglich von Simon ergänzt** (31.08.2026, gleicher Tag). Mapping-Phase (Schritt 3) läuft **ein Thema nach dem anderen** bzw. in Bündeln, wenn Simon das so vorgibt (Branding+App Icons+Color+Icons×2 liefen z.B. gebündelt). Format pro Thema: „Was Apple vorschlägt" → „Was ist unser Status" → „Was schlagen wir vor" (siehe Arbeitsprinzip oben). Audit (Schritt 4) und Umsetzung (Schritt 5) folgen erst, nachdem ein Thema als „Mapping bestätigt" markiert ist.

| Thema | HIG-Quelle geliefert | Extrahiert | Mapping bestätigt | Audit über 47 Screens | Umgesetzt |
|---|:---:|:---:|:---:|:---:|:---:|
| Accessibility | ✅ | ✅ | ✅ | ❌ | ❌ |
| App Icons (Home-Screen-/App-Store-Icon) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Images | ✅ | ✅ | ✅ | ❌ | ❌ |
| Color | ✅ | ✅ | ✅ | ❌ | ❌ |
| Dark Mode | ✅ | ✅ | ✅ | ❌ | ❌ |
| Materials (Blur/Translucency/Elevation/Liquid Glass) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Layout & Spacing | ✅ | ✅ | ✅ | ❌ | ❌ |
| Typography | ✅ | ✅ | ✅ | ❌ | ❌ |
| Icons — Interface-Icons/Glyphs (allgemeine Regeln + Standard-Symbol-Tabelle) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Icons — SF Symbols (Bibliothek/Rendering/Animation) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Motion | ✅ | ✅ | ✅ | ❌ | ❌ |
| Branding | ✅ | ✅ | ✅ | ❌ | ❌ |
| Charting Data (neu, 13. Thema) | ✅ | ✅ | ✅ | ❌ | ❌ |

**🎉 Alle 13 Themen vollständig gemappt (Stand 31.08.2026).** Simon hat explizit auf einen separaten Screen-für-Screen-Audit-Schritt verzichtet („i dont want to go screen for screen - we discussed all the principles - apply them on every screen") — Schritt 4 (Fund-Liste) und Schritt 5 (Umsetzung) laufen ab jetzt direkt zusammen, in verifizierten Batches (`tsc`/`build`/`lint` je Cluster), ohne separates Freigabe-Dokument pro Screen. *Kein Häkchen wird gesetzt, ohne dass der Schritt tatsächlich passiert ist. „App Icons" und „Icons" sind bei Apple drei getrennte HIG-Seiten (App-Icon-Design / allgemeine Interface-Icon-Regeln / SF-Symbols-Bibliothek) — bewusst als drei Zeilen geführt, nicht vermischt.*

### Bekannte, noch offene Lücken innerhalb der 12 extrahierten Themen (kein „13. Thema", sondern unvollständige Tab-Erfassung innerhalb bereits gelieferter PDFs)
Diese Lücken entstehen dadurch, dass ein PDF-Export („Seite durchscrollen + Cmd+P") auf Apples Seiten mit Tab-Umschaltern nur den gerade aktiven Tab erfasst — kein Fehler von Simon, nur eine Werkzeug-Grenze. Bei Bedarf gezielt einzelne Tabs nachfordern, sobald die Mapping-Phase diese Werte tatsächlich braucht:
- **Typography:** „Large"-Default-Dynamic-Type-Werte fehlen (nur „xSmall" erfasst), AX2–AX5-Accessibility-Stufen fehlen (nur AX1), Tracking-Werte für SF Pro Rounded/New York fehlen (nur SF Pro).
- **Layout & Spacing:** tvOS-Grid-Spaltenwerte für Three- bis Nine-column fehlen (nur Two-column erfasst).
- **Color:** System-Farben-/Graustufen-Tabellen haben bewusst keine Hex-/RGB-Werte (Apples eigene Design-Entscheidung, kein Tab-Problem — siehe Color-Abschnitt).

---

## Marken-Leitplanken (gelten über alle Themen hinweg, unverändert)

Aus CLAUDE.md, Sektion „Design-Sprache" / „Farbsystem" — Apples **Struktur/Systematik** wird übernommen, diese konkreten Werte NICHT:

- **4-Farb-Palette bleibt bestehen:** Black `#0a0a0f`, White `#FFFFFF`, Purple `#7C3AED` (Unterrichtsmodus/Notizen), Mint `#34D399` (Klausurenmodus/Lernmethoden). Apples semantische Rollen-Systematik wird strukturell übernommen, aber mit unseren Markenwerten befüllt.
- Signalfarben bleiben wie in CLAUDE.md definiert: Grün `#30D158`, Orange `#FF9F0A`, Rot `#FF453A`, Teal `#5AC8FA`.
- **Kein Strukturumbau.** Nur Farben/Formen/Schatten/Spacing/Typografie an bestehenden Screens und Komponenten anpassen.
- **Wichtige technische Leitplanke, die bei jedem Thema mitgedacht werden muss:** DailyStudent ist ein Capacitor-WebView-Wrapper, keine native SwiftUI-App (siehe CLAUDE.md „Zukunftsvision" + Claude-Memory `track_a_liquid_glass_scope`). Simon hat bereits bestätigt: Wrapper bleibt, kein natives Liquid Glass in der In-App-UI möglich (das ist ein rein natives Rendering-Feature). Wo eine HIG-Guideline explizit natives Liquid-Glass-System-Rendering voraussetzt (z.B. Materials/Blur-Effekte, die vom System automatisch berechnet werden), muss die Umsetzung eine **CSS-Annäherung** sein, kein Anspruch auf pixelgenaue Parität. Das gilt NICHT für alles — z.B. das App-Icon selbst (siehe unten) ist ein natives Asset, unabhängig vom WebView-Inhalt, und kann/sollte Apples aktuelle Icon-Vorgaben tatsächlich vollständig einhalten.

---

## Themen-Abschnitte

### Accessibility

**Quelle:** `developer.apple.com/design/human-interface-guidelines/accessibility` · PDF geliefert 30.08.2026 · Zuletzt von Apple aktualisiert 9. Juni 2025

#### Überblick
> When you design for accessibility, you reach a larger audience and create a more inclusive experience. An accessible interface allows people to experience your app or game regardless of their capabilities or how they use their devices. Accessibility makes information and interactions available to everyone. An accessible interface is:
> - **Intuitive.** Your interface uses familiar and consistent interactions that make tasks straightforward to perform.
> - **Perceivable.** Your interface doesn't rely on any single method to convey information. People can access and interact with your content, whether they use sight, hearing, speech, or touch.
> - **Adaptable.** Your interface adapts to how people want to use their device, whether by supporting system accessibility features or letting people personalize settings.
>
> As you design your app, audit the accessibility of your interface. Use Accessibility Inspector to highlight accessibility issues with your interface and to understand how your app represents itself to people using system accessibility features. You can also communicate how accessible your app is on the App Store using Accessibility Nutrition Labels.

#### Vision
> The people who use your interface may be blind, color blind, or have low vision or light sensitivity. They may also be in situations where lighting conditions and screen brightness affect their ability to interact with your interface.

- **Support larger text sizes.** People should be able to enlarge text by at least 200% (140% in watchOS apps) — via custom UI or Dynamic Type (systemwide setting).
- **Use recommended defaults for custom type sizes.**

| Platform | Default size | Minimum size |
|---|---|---|
| iOS, iPadOS | 17 pt | 11 pt |
| macOS | 13 pt | 10 pt |
| tvOS | 29 pt | 23 pt |
| visionOS | 17 pt | 12 pt |
| watchOS | 16 pt | 12 pt |

  - Font weight impacts legibility: thin custom fonts should use larger-than-recommended sizes. *(Bildbeispiel: "Hello" fett/dunkel bei kleiner Größe gut lesbar vs. "Hello" dünn/outline bei gleicher Größe schwer lesbar.)*
- **Strive to meet color contrast minimum standards.** Zwei Standards: WCAG und APCA. Accessibility Inspector nutzt WCAG Level AA:

| Text size | Text weight | Minimum contrast ratio |
|---|---|---|
| Up to 17 pts | All | 4.5:1 |
| 18 pts | All | 3:1 |
| All | Bold | 3:1 |

  - Wenn der Default-Kontrast das Minimum nicht erreicht: mindestens ein High-Contrast-Farbschema bereitstellen, wenn Systemeinstellung „Increase Contrast" aktiv ist. Bei Dark-Mode-Support: Minimum-Kontrast in BEIDEN Appearances prüfen. *(Bildbeispiel: heller/blasser blauer Button = unzureichender Kontrast ❌ vs. kräftiger blauer Button = ausreichender Kontrast ✅.)*
- **Prefer system-defined colors.** Haben eigene barrierefreie Varianten, die sich automatisch an „Increase Contrast" oder Light/Dark anpassen. *(Bildbeispiel: `systemRed` Default-Farbe vs. `systemRed` Accessible-Farbe in iOS, je in Light/Dark gezeigt.)*
- **Convey information with more than color alone.** Farbenblinde Menschen haben besonders bei Rot-Grün- und Blau-Orange-Paarungen Schwierigkeiten. Zusätzlich zur Farbe: distinkte Formen/Icons einsetzen. Erwägen: anpassbare Farbschemata (z.B. Chart-Farben, Spielfiguren). *(Bildbeispiel: zwei Kreise rot/grün — für Rot-Grün-Farbenblinde ununterscheidbar ❌ vs. Häkchen-Kreis (grün) + X-Kreis (rot) — Form UND Farbe unterscheiden ✅.)*
- **Describe your app's interface and content for VoiceOver.** VoiceOver = Screen Reader für Nutzung ohne Bildschirm.

#### Hearing
> The people who use your interface may be deaf or hard of hearing. They may also be in noisy or public environments.

- **Support text-based ways to enjoy audio and video.**
  - **Captions** — textuelles Äquivalent zu Audio in Video/Audio-only-Content, synchron (z.B. Spiel-Cutscenes, Videoclips).
  - **Subtitles** — Live-Onscreen-Dialog in bevorzugter Sprache (z.B. TV-Shows, Filme).
  - **Audio descriptions** — gesprochene Narration zwischen natürlichen Pausen für rein visuell dargestellte Infos.
  - **Transcripts** — vollständige Textbeschreibung von Video (Audio + Visuell), gut für Langform-Medien (Podcasts, Hörbücher).
- **Use haptics in addition to audio cues.** Erfolgs-Chime/Fehler-Sound/Game-Feedback mit passenden Haptics pairen, für Nutzer ohne Audio-Wahrnehmung oder mit Audio aus. iOS/iPadOS: Music Haptics, Audio graphs.
- **Augment audio cues with visual cues.** Besonders wichtig bei Games/räumlichen Apps, wenn wichtiger Content off-screen passiert.

#### Mobility
> Ensure your interface offers a comfortable experience for people with limited dexterity or mobility.

- **Offer sufficiently sized controls.**

| Platform | Default control size | Minimum control size |
|---|---|---|
| iOS, iPadOS | 44×44 pt | 28×28 pt |
| macOS | 28×28 pt | 20×20 pt |
| tvOS | 66×66 pt | 56×56 pt |
| visionOS | 60×60 pt | 28×28 pt |
| watchOS | 44×44 pt | 28×28 pt |

- **Consider spacing between controls as important as size.** Faustregel: ~12pt Padding um Elemente mit Bezel; ~24pt Padding um sichtbare Kanten bei Elementen ohne Bezel. *(Bildbeispiel: Media-Player-Buttons mit zu wenig Abstand ❌ vs. ausreichendem Abstand ✅.)*
- **Support simple gestures for common interactions.** Einfachste mögliche Geste für häufige Interaktionen — keine custom Multi-Finger/Multi-Hand-Gesten.
- **Offer alternatives to gestures.** Kern-Funktionalität muss über mehr als eine physische Interaktionsart erreichbar sein. Beispiel: Swipe-to-dismiss braucht zusätzlich einen Button. *(Bildbeispiel, direkt relevant für unser `LernzettelRow`-Pattern: "Edit and tap to delete" (roter Minus-Button + Zeile, klassisches iOS-Editiermodus-Pattern) neben "Swipe to delete" (Wisch-Geste zeigt roten "Delete"-Button) — beide als gültige, gleichwertige Interaktionswege gezeigt, nicht als Gegensatz.)*
- **Let people use Voice Control to give guidance and enter information verbally.** Interface-Elemente müssen korrekt gelabelt sein.
- **Integrate with Siri and Shortcuts to let people perform tasks using voice alone.**
- **Support mobility-related assistive technologies.** VoiceOver, AssistiveTouch, Full Keyboard Access, Pointer Control, Switch Control — testen + Elemente korrekt labeln.

#### Speech
> Apple's accessibility features help people with speech disabilities and people who prefer text-based interactions to communicate effectively using their devices.

- **Let people use the keyboard alone to navigate and interact with your app.** Full Keyboard Access; system-definierte Shortcuts nicht überschreiben.
- **Support Switch Control.** Steuerung über separate Hardware/Game-Controller/Sounds (z.B. Klick/Pop).

#### Cognitive
> When you minimize complexity in your app or game, all people benefit.

- **Keep actions simple and intuitive.** System-Gesten/-Verhalten bevorzugen statt custom Gesten, die erst gelernt werden müssen.
- **Minimize use of time-boxed interface elements.** Views/Controls, die per Timer auto-dismissen, sind problematisch für Menschen, die länger zum Verarbeiten brauchen oder Assistive-Tech nutzen. **Explizite Dismiss-Aktion bevorzugen.**
- **Consider offering difficulty accommodations in games.** (Für Spiele — geringe Relevanz für DailyStudent, aber vollständig extrahiert.)
- **Let people control audio and video playback.** Kein Autoplay ohne Start/Stop-Kontrollen; Discoverable + einfach bedienbar; ggf. globale Opt-out-Einstellung.
- **Allow people to opt out of flashing lights in video playback.** „Dim Flashing Lights"-Systemeinstellung.
- **Be cautious with fast-moving and blinking animations.** Übermäßiger Einsatz kann ablenken, Schwindel verursachen, in seltenen Fällen epileptische Anfälle auslösen. Bei aktivem „Reduce Motion": automatische/repetitive Animationen reduzieren (Zoom, Scale, periphere Bewegung). Weitere Best Practices:
  - Tightening animation springs to reduce bounce effects
  - Tracking animations directly with people's gestures
  - Avoiding animating depth changes in z-axis layers
  - Replacing transitions in x-, y-, and z-axes with fades to avoid motion
  - Avoiding animating into and out of blurs
- **Optimize your app's UI for Assistive Access.** Streamlined-Layout-Modus für kognitive Behinderungen (z.B. vereinfachtes Camera-App-Layout als Referenzbeispiel). Guidelines dafür:
  - Core-Funktionalität identifizieren, nicht-kritische Workflows/UI-Elemente entfernen erwägen
  - Mehrstufige Workflows aufbrechen — eine Interaktion pro Screen
  - **Bei schwer rückgängig machbaren Aktionen (z.B. Datei löschen) immer ZWEIMAL um Bestätigung fragen**

#### Platform considerations
- iOS, iPadOS, macOS, tvOS, watchOS: *No additional considerations.*
- **visionOS** — „Prioritize comfort":
  - Interface-Elemente im Sichtfeld halten; horizontale Layouts statt vertikaler (Nackenbelastung); Aufmerksamkeit nicht schnell zwischen verschiedenen Orten wechseln lassen
  - Geschwindigkeit/Intensität animierter Objekte reduzieren, besonders im peripheren Sichtfeld
  - Sanfte Kamera-/Video-Bewegung; Gefühl von unkontrollierter Weltbewegung vermeiden
  - Content nicht am Kopf des Trägers verankern (Gefühl des Eingesperrtseins, verhindert Pointer Control)
  - Große/repetitive Gesten minimieren
  - *(Nicht relevant für DailyStudent — kein visionOS-Target — der Vollständigkeit halber extrahiert.)*

#### Change log (Apple)
| Datum | Änderung |
|---|---|
| June 9, 2025 | Added guidance and links for Assistive Access, Switch Control, and Accessibility Nutrition Labels. |
| March 7, 2025 | Expanded and refined all guidance. Moved Dynamic Type guidance to Typography page, moved VoiceOver guidance to new VoiceOver page. |
| June 10, 2024 | Added a link to Apple's Unity plug-ins for supporting Dynamic Type. |
| December 5, 2023 | Updated visionOS Zoom lens artwork. |
| June 21, 2023 | Updated to include guidance for visionOS. |

#### Erste Beobachtungen (unbestätigt, zur späteren Diskussion — noch kein Mapping)
- **Kontrast-Werte (4.5:1 / 3:1) sollten gegen unser Farbsystem gerechnet werden**, besonders: Mint `#34D399` als Textfarbe/Icon auf hellem Hintergrund (Light Mode) — Mint ist tendenziell kontrastschwach auf Weiß; Purple `#7C3AED` auf den "immer dunklen" Hero-Karten; Text auf Gradient-Hintergründen generell.
- **Tap-Target-Minimum 44×44pt (iOS)** — Kandidat für den Audit-Schritt: kleine Icon-Buttons (z.B. `.icon-expand-btn`, Swipe-Aktionen in `LernzettelRow`) dagegenhalten.
- **Reduce-Motion-Liste ist sehr konkret und deckungsgleich mit unserem `emil-design-eng`/Framer-Motion-Einsatz** — `ModusRegler`s Spring-Bounce (0.2–0.22), `RouteFade`, `LernzettelRow`-Drag, `StreakInfoSheet`, Dashboard-Entrance-Animationen, `CoinToast` sollten alle explizit gegen `useReducedMotion()` geprüft werden, nicht nur die bereits dokumentierten Fälle (`ModusRegler`, `RouteFade`).
- **"Minimize time-boxed elements, prefer explicit dismiss"** steht in Spannung zu unseren auto-dismiss Toasts (`CoinToast`, `AttachmentToast`) — kein Blocker, aber ein Diskussionspunkt (ggf. längere Anzeigedauer oder manuell schließbar machen).
- **"Offer alternatives to gestures" / Assistive-Access "confirm destructive actions twice"** steht in einer gewissen Spannung zu `LernzettelRow`s Swipe-to-Delete, das laut CLAUDE.md bewusst OHNE Bestätigungsdialog läuft ("die Wisch-Geste selbst ist bereits der bewusste zweite Schritt"). Apples eigenes Beispielbild zeigt Swipe-to-delete aber ausdrücklich als gültiges, gleichwertiges Pattern (nicht per se falsch) — die Doppel-Bestätigungs-Regel ist explizit an den Assistive-Access-Modus gebunden, nicht generelle Pflicht. Wert, später zu besprechen, kein akuter Fund.
- **Farbcodierung (Grün/Orange/Rot für Status)** — "convey information with more than color alone" prüfen: haben unsere Status-Farben (Klausur-Dringlichkeit, Notenfarben Grün/Orange/Rot im Notenrechner) zusätzlich Form/Icon, oder ist es reine Farbcodierung?

#### Mapping (bestätigt 31.08.2026)

**Kontrast — mit Simons „nie farbiger Text"-Grundsatz aufgelöst, nicht mehr über Size/Weight-Ausnahmen gelöst.** Simon hat beim Review von Dashboard- + Landing-Page-Screenshots eine strengere, einfachere Regel gesetzt, die die ursprüngliche Kontrast-Frage weitgehend erledigt: **Mint `#34D399` und Purple `#7C3AED` sind nie Text-/Vordergrundfarbe** — nur Hintergrund/Fill/Gradient/Glow. Sichtbarer Text ist immer Weiß oder ein nahezu-schwarzer Farbton, gewählt nach Kontrast zum unmittelbaren Hintergrund (Referenz-Umsetzung: `Navbar` in `LandingScreen.tsx:343-382` — helle Glass-Pille mit `#160E28`/`#483C5F`-Text, eingebetteter Solid-Purple-Button mit reinem Weiß). **Mint und Purple dürfen zudem nie innerhalb einer/angrenzend an eine Komponente mischen.** Bestätigte Verstöße dagegen im bestehenden Code (Audit-Kandidaten, jetzt nicht fixen):
  - `DashboardScreen.tsx`s `ToDoCard` (`glow="mint"`) färbt die Tage-Zahl bei niedriger Dringlichkeit `#A78BFA` (Purple) — Farbmischung innerhalb einer Karte.
  - Die beiden Dashboard-Hero-Karten (`HeroLernplanCard` glow=purple, `ToDoCard` glow=mint) ankern ihren `DARK_GLOW`-Radial-Gradient (`DashboardScreen.tsx:62-65`) je an der eigenen oberen linken Ecke — da die Mint-Karte direkt neben der Purple-Karte sitzt, liegt ihr Glow-Ankerpunkt exakt an der gemeinsamen Kante → wirkt wie ein Farbübergang, obwohl es zwei getrennte Divs sind.
  - **Bestätigte Ausnahme (vorläufig, keine Bestätigung des aktuellen Musters):** kleine monochrome Badges/Labels dürfen weiterhin akzentfarbigen Text auf akzentgetöntem Hintergrund nutzen (z.B. „Beliebt"-Badge `LandingScreen.tsx:1566`, Erste-Schritte-Prozent-Label `DashboardScreen.tsx:129`) — Simon: so kleine Pills kennt er aus echtem iOS-Design ohnehin nicht, eine saubere Lösung bräuchte einen vollständigen Pill-Redesign-Pass, der bewusst auf später verschoben wird.
- **Tap-Targets:** 44×44pt wird Ziel-Standard für primäre Buttons, 28×28pt bleibt Ausnahme-Untergrenze nur für dichte Sekundär-UI (Icon-Reihen, Swipe-Aktionen). `.icon-expand-btn` (36px, `index.css:137`) ist kein Verstoß, nur ein späterer Politur-Kandidat.
- **Textgrößen-Untergrenze:** wird von „≥10px" auf **„≥11px" angehoben, um exakt auf Apples absolutes Minimum zu matchen** (Simon: „match apple exactly"). Betrifft nur die seltene Randgröße 10–10,9px, falls sie überhaupt irgendwo genutzt wird — Haupttext (bereits „≥13px") ist ohnehin unberührt.
- **Time-boxed Toasts:** `CoinToast`/`AttachmentToast` behalten ihr reines Auto-Dismiss (1900ms/2600ms, kein manueller Schließen-Button) — bewusste Entscheidung, keine Änderung am Dismiss-Mechanismus. **Separat davon, nicht Teil dieser Accessibility-Entscheidung:** Simon hat die gesamte Coins-UI (Icon-Qualität, Pill-Form von `CoinToast`) als „hässlich"/"pixel-art-artig" bezeichnet und einen echten visuellen Redesign-Pass dafür angekündigt — **ausdrücklich erst in der späteren Icons-/Materials-Audit-Phase**, nicht jetzt.
- **Swipe-to-Delete (`LernzettelRow`):** keine Änderung nötig — Apples eigenes Beispielbild zeigt das Pattern als gleichwertig gültig, die Doppelbestätigungspflicht gilt nur im Assistive-Access-Modus.
- **Farbcodierung ohne Formindikator:** Stichprobe an `DashboardScreen.tsx`s Klausur-Countdown zeigt keinen Verstoß (die Zahl selbst ist immer als Text lesbar, Farbe ist nur Verstärkung) — vollständiger Audit über alle Statusfarben bleibt Teil der späteren Audit-Phase.

**Offen/nicht Teil dieser Runde:** VoiceOver-Alt-Texte auf Custom-Icons, vollständiger Reduce-Motion-Check über alle Framer-Motion-Komponenten — beides Audit-Phase-Arbeit (Schritt 4), keine Mapping-Entscheidung.

---

### App Icons

**Quelle:** `developer.apple.com/design/human-interface-guidelines/app-icons` · PDF geliefert 30.08.2026 · Zuletzt von Apple aktualisiert **8. Juni 2026** ("Refined guidance for Liquid Glass" — aktuellste Änderung überhaupt in den bisher gelieferten PDFs)

#### Überblick
> Your app icon is a crucial aspect of your app's or game's branding and user experience. It appears on the Home Screen and in key locations throughout the system, including search results, notifications, system settings, and share sheets. A well-designed app icon conveys your app's or game's identity clearly and consistently across all Apple platforms.

#### Layer design
> Although you can provide a flattened image for your icon, layers give you the most control over how your icon design is represented. A layered app icon comes together to produce a sense of depth and vitality. On each platform, the system applies visual effects that respond to the environment and people's interactions.

- **iOS, iPadOS, macOS, watchOS:** Background-Layer + ein oder mehr Foreground-Layer, verschmelzen zu Dimensionalität. Nehmen **Liquid-Glass-Attribute** an: specular highlights, refraction, translucency — passen sich automatisch an Icon-Größe an, gelten konsistent plattformübergreifend, können zwischen Systemversionen unterschiedlich aussehen.
- **tvOS:** 2–5 Layer für Dynamik beim Fokussieren. Bei Fokus: Icon hebt sich in den Vordergrund (reagiert auf Fingerbewegung auf der Remote), schwingt sanft, Oberfläche leuchtet auf. Layer-Trennung + Transparenz erzeugen Tiefe im Parallax-Effekt.
- **visionOS:** Background-Layer + 1–2 Layer darüber → dreidimensionales Objekt, das sich beim Betrachten leicht ausdehnt. System fügt Schatten für Tiefenwirkung zwischen Layern hinzu und nutzt den Alpha-Kanal der oberen Layer für einen geprägten ("embossed") Look.
- **Workflow (iOS/iPadOS/macOS/watchOS):** Foreground-Layer im eigenen Design-Tool erstellen → in **Icon Composer** importieren (in Xcode enthalten, auch separat vom Apple-Developer-Portal) → dort: Background-Layer definieren, Foreground-Platzierung anpassen, Effekte (specular highlights, refraction) anwenden, Default-/Dark-/Mono-Varianten annotieren, über Systemversionen hinweg testen/previewen, für Xcode exportieren.
- **Workflow (tvOS/visionOS):** Layer direkt in einen Image Stack in Xcode. Parallax Previewer/Exporter-Plugins (Apple Design Resources) zum Testen.

**Guidelines:**
- **Prefer clearly defined edges in foreground layers.** Keine weichen/gefederten Kanten — sonst leiden system-gezeichnete Highlights/Schatten.
- **Vary opacity in foreground layers to increase the sense of depth and liveliness.** Beispiel: Photos-Icon trennt sein Blüten-Motiv in mehrere teiltransparente Layer. Empfehlung: volldeckende Layer importieren, Transparenz erst in Icon Composer einstellen (damit man sieht, wie sie mit System-Effekten interagiert).
- **Design a background that both stands out and emphasizes foreground content.** Gradients müssen gut auf System-Lichteffekte reagieren. Icon Composer unterstützt Solid Colors + Gradients direkt (meist kein Custom-Background-Bild nötig). Falls doch importiert: muss full-bleed und opak sein.
- **Prefer vector graphics when bringing layers into Icon Composer.** SVG/PDF skalieren verlustfrei; Text in Outlines konvertieren. Für Mesh-Gradients/Raster-Art: PNG (verlustfrei).

#### Icon shape
> An app icon's shape varies based on a platform's visual language.

- **iOS, iPadOS, macOS:** quadratisch, System maskiert zu abgerundeten Ecken, die exakt der Rundung anderer System-UI-Elemente UND der physischen Gerätekante entsprechen.
- **tvOS:** rechteckig, ebenfalls mit konzentrischen Kanten.
- **visionOS, watchOS:** quadratisch, System wendet kreisrunde Maskierung an.

**Guidelines:**
- **Produce appropriately shaped, unmasked layers.** System maskiert alle Layer-Kanten selbst. iOS/iPadOS/macOS + tvOS: eckige/rechteckige Layer liefern (System rundet). visionOS/watchOS: quadratische Layer liefern (System macht den Kreis). **Bereits vor-maskierte Layer verschlechtern Specular-Highlight-Effekte und lassen Kanten gezackt wirken.**
- **Keep primary content centered to avoid truncation when the system adjusts corners or applies masking.** Besonders wichtig bei visionOS/watchOS. Grids aus den App-Icon-Produktionsvorlagen (Apple Design Resources) nutzen.

#### Design
- **Embrace simplicity in your icon design.** Einfache Icons sind am leichtesten erkennbar. Feindetaillierte Icons wirken mit System-Schatten/-Highlights schnell "busy", Details gehen bei kleinen Größen verloren. Einen Kern-Gedanken finden, mit minimaler Formanzahl ausdrücken. Einfacher Hintergrund (Solid/Gradient) bevorzugt — Canvas muss nicht komplett gefüllt sein. *(Beispiele: Podcasts-Icon, Home-Icon — beide reduziert auf ein zentrales Symbol + einfarbigen/Gradient-Hintergrund.)*
- **Provide a visually consistent icon design across all the platforms your app supports.** Hilft schneller Wiedererkennung, verhindert Verwechslung mit anderen Apps.
- **Consider basing your icon design around filled, overlapping shapes.** Überlappende Solid-Shapes + Transparenz/Blur = Tiefenwirkung.
- **Include text only when it's essential to your experience or brand.** Text unterstützt weder Accessibility noch Lokalisierung, oft zu klein, wirkt schnell unruhig. App-Name steht oft ohnehin schon daneben. Mnemonic (z.B. erster Buchstabe) OK, aber KEINE instruktiven Wörter ("Watch", "Play") oder kontextspezifischen Begriffe ("New", "For visionOS"). Bei tvOS: Text muss über anderen Layern liegen, damit der Parallax-Effekt ihn nicht croppt.
- **Prefer illustrations to photos and avoid replicating UI components.** Fotos haben zu viele Details für verschiedene Appearances/kleine Größen/Layer-Splitting. Grafische Repräsentation statt Foto. Sehr dünne Linienstärken + scharfe Ecken vermeiden (verlieren Schärfe bei kleinen Größen). Keine Nachbildung von Standard-UI-Komponenten oder App-Screenshots im Icon.
- **Don't use replicas of Apple hardware products.** Urheberrechtlich geschützt.

#### Visual effects
- **Let the system handle blurring and other visual effects.** System wendet dynamisch Effekte auf Icon-Layer an — kein Bedarf für eigene specular highlights, Drop-Shadows zwischen Layern, abgeschrägte Kanten, Blurs, Glows etc. Eigene Effekte sind statisch, System-Effekte dynamisch — sie kollidieren. Falls doch eigene Effekte: sorgfältig in Icon Composer / Device Hub / echtem Gerät testen.
- **Create layer groupings to apply effects to multiple layers at once.** System-Effekte greifen normalerweise pro Layer. Gruppierung in Icon Composer/Design-Tool möglich → Icon Composer bietet für Gruppen zusätzliche Liquid-Glass-Anpassungsoptionen (specular highlights, refraction, translucency).

#### Appearances
> In iOS, iPadOS, and macOS, people can choose whether their Home Screen app icons are default, dark, clear, or tinted in appearance.

- Icon-Varianten für jede Appearance designbar; System generiert automatisch fehlende Varianten.
- **Keep your icon's features consistent across appearances.** Kern-visuelle Merkmale über Default/Dark/Clear/Tinted gleich halten — kein Element-Swapping pro Variante (erschwert Wiedererkennung beim Appearance-Wechsel).
- **Design dark and tinted icons that feel at home beside system app icons and widgets.** Farbpalette des Default-Icons beibehalten, aber: Dark-Icons wirken gedämpfter, Clear/Tinted noch mehr. Muss in JEDER Variante sichtbar/lesbar/erkennbar bleiben.
- **Use your light app icon as the basis for your dark icon.** Komplementärfarben passend zum Default-Design, keine übermäßig hellen Bilder. Farbhintergründe bieten meist den besten Kontrast in Dark-Icons.
- **Consider offering alternate app icons.** iOS/iPadOS/tvOS/kompatible visionOS-Apps: Nutzer können in App-Settings ein alternatives Icon wählen (z.B. Sport-App mit Team-Icons). Jedes Icon muss inhaltlich klar zur App gehören, keine Verwechslungsgefahr mit anderen Apps.
- **Note (Apple):** Alternate App Icons in iOS/iPadOS brauchen eigene Dark-/Clear-/Tinted-Varianten. Wie das Default-Icon unterliegen alle Varianten dem App Review.

#### Platform considerations
- iOS, iPadOS, macOS: *No additional considerations.*
- **tvOS:** **Include a safe zone to ensure the system doesn't crop your content.** Bei Fokus kann das System Randbereiche croppen, während das Icon skaliert/sich bewegt. Safe Zone variiert je nach Bildgröße/Layer-Tiefe/Bewegung; Foreground-Layer werden stärker gecroppt als Background-Layer.
- **visionOS:** **Avoid adding a shape that's intended to look like a hole or concave area to the background layer.** System-Schatten/Specular-Highlights lassen so eine Form eher hervorstechen als zurückweichen.
- **watchOS:** **Avoid using black for your icon's background.** Schwarzer Hintergrund verschmilzt sonst mit dem Display-Hintergrund — aufhellen.

#### Specifications

| Platform | Layout shape | Icon shape nach System-Masking | Layout size | Style | Appearances |
|---|---|---|---|---|---|
| iOS, iPadOS, macOS | Square | Rounded rectangle (square) | **1024×1024 px** | Layered | Default, dark, clear light, clear dark, tinted light, tinted dark |
| tvOS | Rectangle (landscape) | Rounded rectangle (rectangular) | 800×480 px | Layered (Parallax) | N/A |
| visionOS | Square | Circular | 1024×1024 px | Layered (3D) | N/A |
| watchOS | Square | Circular | 1088×1088 px | Layered | N/A |

- System skaliert das Icon automatisch für kleinere Varianten (Settings, Notifications).
- Unterstützte Farbräume: sRGB (Farbe), Gray Gamma 2.2 (Graustufen), Display P3 (Wide-Gamut, nur iOS/iPadOS/macOS/tvOS/watchOS).

#### Change log (Apple)
| Datum | Änderung |
|---|---|
| June 8, 2026 | Refined guidance for Liquid Glass. |
| June 9, 2025 | Updated guidance to reflect layered icons, consistency across platforms, and best practices for Liquid Glass. |
| June 10, 2024 | Added guidance for creating dark and tinted app icon variants for iOS and iPadOS. |
| January 31, 2024 | Clarified platform availability for alternate app icons. |
| June 21, 2023 | Updated to include guidance for visionOS. |
| September 14, 2022 | Added specifications for Apple Watch Ultra. |

#### Erste Beobachtungen (unbestätigt, zur späteren Diskussion — noch kein Mapping)
- **Größter struktureller Punkt:** Unser aktuelles App-Icon (`public/icon.svg` → `scripts/generate-app-icons.mjs`, Sharp-basiert, laut CLAUDE.md "transparenter Hintergrund, Motiv 1.22× gezoomt") ist ein **flaches Einzelbild**, kein Icon-Composer-Layered-Icon. Apples aktuellste Guidance (Stand 8. Juni 2026, die jüngste Änderung überhaupt) ist explizit auf **Layered Icons mit automatischem Liquid-Glass-System-Rendering** ausgelegt (specular highlights, refraction, translucency, automatisch generierte Dark-/Clear-/Tinted-Varianten). Ein flaches Bild funktioniert weiterhin ("Although you can provide a flattened image...") — verzichtet aber auf System-generierte Tiefe/Glanz und die vier Appearance-Varianten. **Das ist ein natives Icon-Composer/Xcode-Thema, unabhängig vom WebView-Wrapper** — betrifft nicht die In-App-UI, sondern nur den App-Store/Homescreen-Icon-Build. Konkrete Entscheidung für später: Icon in Icon Composer als echtes Layered Icon neu aufbauen, oder beim flachen Bild bleiben (funktioniert, ist aber nicht mehr "State of the Art" nach Apples eigener aktuellster Doku).
- **1024×1024 px** — mit dem aktuellen Sharp-Skript-Output abgleichen.
- **"Include text only when essential"** — unser Icon-Motiv laut CLAUDE.md ist ein Bild-Motiv, kein Wortmark/Text — vermutlich schon konform, aber visuell verifizieren.
- **"Avoid using black for watchOS background"** / generell dunkle Hintergründe — unser Markenschwarz `#0a0a0f` als möglicher Icon-Hintergrund würde ggf. mit dieser Watch-spezifischen Regel kollidieren, falls je eine watchOS-Version relevant wird (aktuell nicht geplant, nur zur Vollständigkeit notiert).
- **Dark/Clear/Tinted-Icon-Varianten** — aktuell vermutlich nicht vorhanden (nur ein Icon-Set laut CLAUDE.md). System kann fehlende Varianten automatisch generieren, aber nur wenn das Icon als Layered Icon in Icon Composer vorliegt — bei einem rein flachen PNG generiert das System vermutlich einfache automatische Abdunklung, keine echte Liquid-Glass-Tiefenwirkung.

#### Mapping (bestätigt 31.08.2026)

**Status:** `public/icon.svg` ist ein flaches Einzelbild, Farben `#07050F`/`#2B1257` (Purple-Dunkel-Hintergrund) + `#C8860A`/`#F5C842`/`#FFD700` (Gold-Motiv) + `#FFFFFF` — bereits exakt in der Purple/Gold-Markenfamilie, kein Farbproblem hier.

**Entschieden:** Icon in Icon Composer als echtes Layered Icon neu aufbauen (Purple-Hintergrund-Layer + Gold-Foreground-Layer getrennt), um Liquid-Glass-System-Rendering + automatische Dark/Clear/Tinted-Varianten zu bekommen. **Reine native Xcode-Arbeit, unabhängig von jedem anderen Thema hier — kann jederzeit separat laufen, kein Blocker für Branding/Color/Icons.**

---

### Images

**Quelle:** `developer.apple.com/design/human-interface-guidelines/images` · PDF geliefert 30.08.2026 · Zuletzt von Apple aktualisiert 16. Dezember 2025 ("Added guidance for spatial photos and spatial scenes in visionOS") — neues Thema, ursprünglich nicht in der Platzhalter-Liste, ergänzt.

#### Überblick
> To make sure your artwork looks great on all devices you support, learn how the system displays content and how to deliver art at the appropriate scale factors.

#### Resolution
> Different devices can display images at different resolutions. For example, a 2D device displays images according to the resolution of its screen.
>
> A **point** is an abstract unit of measurement that helps visual content remain consistent regardless of how it's displayed. In 2D platforms, a point maps to a number of pixels that can vary according to the resolution of the display; in visionOS, a point is an angular value that allows visual content to scale according to its distance from the viewer.
>
> When creating bitmap images, you specify a **scale factor** which determines the resolution of an image. You can visualize scale factor by considering the density of pixels per point in 2D displays of various resolutions. For example, a scale factor of 1 (also called @1x) describes a 1:1 pixel density, where one pixel is equal to one point. High-resolution 2D displays have higher pixel densities, such as 2:1 or 3:1. A 2:1 density (called @2x) has a scale factor of 2, and a 3:1 density (called @3x) has a scale factor of 3. Because of higher pixel densities, high-resolution displays demand images with more pixels.

*(Bildbeispiel: dieselbe Grafik als 10×10px-Raster @1x, 20×20px @2x, 30×30px @3x — je feiner das Raster, desto mehr Pixel für dieselbe Punktgröße.)*

- **Provide high-resolution assets for all bitmap images in your app, for every device you support.** Scale-Faktor per Dateinamens-Suffix `@1x`/`@2x`/`@3x` im Asset-Katalog identifizieren.

| Platform | Scale factors |
|---|---|
| iPadOS, watchOS | @2x |
| iOS | @2x and @3x |
| visionOS | @2x or higher |
| macOS, tvOS | @1x and @2x |

- **In general, design images at the lowest resolution and scale them up to create high-resolution assets.** Bei resizable Vektorformen: Control-Points auf ganzzahligen Werten platzieren, damit sie bei 1x sauber ausgerichtet sind — bleiben dadurch auch bei 2x/3x sauber am Raster (da 2x/3x Vielfache von 1x sind).

#### Formats

| Image type | Format |
|---|---|
| Bitmap or raster work | De-interlaced PNG files |
| PNG graphics that don't require full 24-bit color | An 8-bit color palette |
| Photos | JPEG files, optimized as necessary, or HEIC files |
| Stereo or spatial photos | Stereo HEIC |
| Flat icons, interface icons, and other flat artwork that requires high-resolution scaling | PDF or SVG files |

#### Best practices
- **Include a color profile with each image.** Hilft sicherzustellen, dass App-Farben auf unterschiedlichen Displays wie beabsichtigt erscheinen.
- **Always test images on a range of actual devices.** Ein Bild, das beim Design gut aussieht, kann auf verschiedenen Geräten pixelig, gestreckt oder gestaucht wirken.

#### Platform considerations
*No additional considerations for iOS, iPadOS, or macOS.*

**tvOS** — Layered Images stehen im Zentrum der Apple-TV-Erfahrung *(vollständigkeitshalber extrahiert, geringe Relevanz für DailyStudent — kein tvOS-Target):*
- **Parallax effect** — System hebt fokussierte Elemente in den Vordergrund, schwenkt sie sanft, Beleuchtung lässt die Oberfläche schimmern. Nach Inaktivität dimmt unfokussierter Content, das fokussierte Element expandiert. Layered Images sind zur Unterstützung des Parallax-Effekts erforderlich.
- **Layered images** — 2 bis 5 Layer bilden zusammen ein Bild; Trennung + Transparenz erzeugen Tiefe. **Important:** Das tvOS-App-Icon MUSS ein Layered Image sein; für andere fokussierbare Bilder (inkl. Top-Shelf-Images) ist es dringend empfohlen, aber optional.
- **Use standard interface elements to display layered images.** Bei Standard-Views + System-Focus-APIs (z.B. `FocusState`) bekommen Layered Images den Parallax-Effekt automatisch.
- **Identify logical foreground, middle, and background elements.** Foreground = prominente Elemente (Charakter, Text auf Cover); Middle = Sekundärinhalt/Effekte wie Schatten; Background = opaker Backdrop.
- **Generally, keep text in the foreground.**
- **Keep the background layer opaque.** Pflicht — sonst Build-Fehler.
- **Keep layering simple and subtle.** Parallax soll fast unmerklich sein, übermäßige 3D-Effekte wirken unrealistisch/jarring.
- **Leave a safe zone around the foreground layers of your image.** Content kann bei Fokus-Skalierung gecroppt werden (siehe App Icons oben).
- **Always preview layered images.** Xcode, Parallax Previewer (macOS) oder Parallax Exporter (Photoshop-Plug-in) — abschließend auf echtem TV prüfen.

**visionOS** — Bilder in deutlich größerem Größenspektrum als auf jeder anderen Plattform, System skaliert Auflösung dynamisch zur aktuellen Größe. *(vollständigkeitshalber extrahiert — kein visionOS-Target):*
- **Create a layered app icon.** 2–3 Layer für Tiefe durch leicht unterschiedliche Bewegungsraten bei Fokus.
- **Prefer vector-based art for 2D images.** Bitmap kann beim Hochskalieren schlecht aussehen.
- **If you need to use rasterized images, balance quality with performance as you choose a resolution.** Ein @2x-Bild sieht bei üblichem Betrachtungsabstand gut aus, wird aber bei Nahsicht nicht scharf, da das System es nicht dynamisch nachskaliert. Höhere Auflösung = größere Datei + potenzieller Performance-Impact, besonders über @6x. Bei Auflösungen >@2x zusätzlich hochwertige Bildfilterung anwenden.
- **Spatial photos and spatial scenes** (RealityKit): ein *spatial photo* ist ein stereoskopisches Foto mit Spatial-Metadaten (iPhone 15 Pro+, Apple Vision Pro oder kompatible Kamera); eine *spatial scene* ist ein aus einem 2D-Bild generiertes 3D-Bild mit kopfbewegungsreaktivem Parallax-Effekt.
  - **Make sure spatial photos render correctly in your app.** Stereo-HEIC-Format nutzen.
  - **Prefer the feathered glass background effect to display text over spatial photos.** Fügt Kontrast für Lesbarkeit hinzu und blurt Details, um visuelles Unbehagen beim Stereo-Sehen zu reduzieren.
  - **Take visual comfort into consideration when you make spatial photos from existing 2D content.** Disparity-Adjustment kann Unbehagen aus bestimmten Blickpositionen verursachen.
  - **Display spatial photos and spatial scenes in standalone views.** Nicht inline mit anderem Content zeigen (visuelles Unbehagen) — separate View wie Sheet/Fenster nutzen.
  - **Use spatial scenes in your app for specific moments.** Generierung kann mehrere Sekunden dauern; nicht zu viele gleichzeitig zeigen.
  - **When displaying immersively, prefer minimal UI.**
  - **Prefer displaying larger spatial scenes that you center in someone's field of view.** Kleinere Scenes bieten weniger Parallax-Effekt.
  - **In general, avoid transparency to keep image files small** — außer bei Complication-Images/Menü-Icons/Template-Icons, wo das System Transparenz zur Farbanwendung braucht.

**watchOS**
- **Use autoscaling PDFs to let you provide a single asset for all screen sizes.** Design für 40mm/42mm-Screens @2x; WatchKit skaliert automatisch:

| Screen size | Image scale |
|---|---|
| 38mm | 90% |
| 40mm | 100% |
| 41mm | 106% |
| 42mm | 100% |
| 44mm | 110% |
| 45mm | 119% |
| 49mm | 119% |

#### Change log (Apple)
| Datum | Änderung |
|---|---|
| December 16, 2025 | Added guidance for spatial photos and spatial scenes in visionOS. |
| December 5, 2023 | Clarified guidance on choosing a resolution for a rasterized image in a visionOS app. |
| June 21, 2023 | Updated to include guidance for visionOS. |
| September 14, 2022 | Added specifications for Apple Watch Ultra. |

#### Erste Beobachtungen (unbestätigt, zur späteren Diskussion — noch kein Mapping)
- **Direkt anwendbar, unabhängig vom WebView-Kontext:** unsere App liefert vermutlich bereits `@2x`/`@3x`-taugliche Bilder (typische Web-Praxis via `srcset`/`2x`-Suffixe), aber der PDF/SVG-für-flache-Icons-Grundsatz ist ein guter Check gegen unser aktuelles Icon-System (handgeschriebene Inline-SVGs, siehe SF-Symbols-Abschnitt) — hier bereits konform.
- **tvOS/visionOS-Layered-Images und Parallax** sind rein native, System-gerenderte Effekte (wie Liquid Glass) — nicht in der WebView nachbaubar, kein Ziel für DailyStudent (kein tvOS/visionOS-Target).
- **Spatial Photos/Scenes** — nicht relevant (kein visionOS-Target, keine Kamera-Hardware, die Spatial Capture unterstützt, ohnehin fokussiert unser Foto-Scan auf flache Dokument-/Tafel-Fotos für OCR).
- **watchOS-Autoscaling-Tabelle** — nicht relevant, kein watchOS-Companion geplant, der Vollständigkeit halber erfasst.
- **Größter praktischer Bezug zu unserem echten Code:** Der Formats-Tabelle-Eintrag „Photos → JPEG (optimiert) oder HEIC" ist ein Kandidat gegen unseren Smart-Notes-Foto-Scan-Upload-Pfad zu prüfen (welches Format erzeugt die Kamera-Capture aktuell, wird komprimiert?) — reine Performance-/Bandbreiten-Frage, kein HIG-Compliance-Thema per se.

### Color

**Quelle:** `developer.apple.com/design/human-interface-guidelines/color` · PDF geliefert 30.08.2026 · Zuletzt von Apple aktualisiert 16. Dezember 2025 ("Updated guidance for Liquid Glass")

#### Überblick
> Judicious use of color can enhance communication, evoke your brand, provide visual continuity, communicate status and feedback, and help people understand information.
>
> The system defines colors that look good on various backgrounds and appearance modes, and can automatically adapt to vibrancy and accessibility settings. Using system colors is a convenient way to make your experience feel at home on the device.
>
> You may also want to use custom colors to enhance the visual experience of your app or game and express its unique personality. The following guidelines can help you use color in ways that people appreciate, regardless of whether you use system-defined or custom colors.

#### Best practices
- **Avoid using the same color to mean different things.** Use color consistently, especially when it communicates information like status or interactivity. Example: using your brand color both for an interactive borderless button AND to stylize noninteractive text is confusing.
- **Make sure all your app's colors work well in light, dark, and increased contrast contexts.** iOS/iPadOS/macOS/tvOS bieten Light- und Dark-Appearance; System-Farben passen sich subtil an, um Differenzierung/Kontrast zu sichern. Bei „Increase Contrast" werden die Unterschiede deutlich stärker. Wenn möglich System-Farben nutzen (haben bereits alle Varianten). Bei eigener Custom-Farbe: Light- UND Dark-Variante liefern, plus je eine Increased-Contrast-Option mit deutlich höherer visueller Differenzierung. **Auch wenn die App nur einen Appearance-Modus ausliefert: trotzdem Light- UND Dark-Farben liefern, um Liquid-Glass-Adaptivität in diesen Kontexten zu unterstützen.**
- **Test your app's color scheme under a variety of lighting conditions.** In hellen Umgebungen wirken Farben dunkler/gedämpfter, in dunklen heller/gesättigter. In visionOS können Farben je nach Farbe von Wänden/Objekten der physischen Umgebung anders wirken (Lichtreflexion).
- **Test your app on different devices.** True-Tone-Displays (bestimmte iPhone/iPad/Mac-Modelle) passen den Weißpunkt automatisch an Umgebungslicht an — für Reading/Photos/Video/Gaming-Apps per `UIWhitePointAdaptivityStyle` verstärk-/abschwächbar. tvOS-Apps auf mehreren HD-/4K-TV-Marken + unterschiedlichen Display-Einstellungen testen. Mac: P3 vs. sRGB in Systemeinstellungen > Displays testbar.
- **Consider how artwork and translucency affect nearby colors.** Beispiel: Maps zeigt ein helles Farbschema im Kartenmodus, wechselt aber zu dunklem Farbschema im Satellitenmodus. Farben können hinter/auf einem transluzenten Element (z.B. Toolbar) anders wirken.
- **If your app lets people choose colors, prefer system-provided color controls where available.** Konsistente UX + Nutzer können eine gespeicherte Farbpalette app-übergreifend wiederverwenden. *(Developer: `ColorPicker`.)*

#### Inclusive color
- **Avoid relying solely on color to differentiate between objects, indicate interactivity, or communicate essential information.** Zusätzliche Kennzeichnung (Text-Labels, Glyph-Formen) für Menschen mit Farbenblindheit/Sehbehinderungen.
- **Avoid using colors that make it hard to perceive content in your app.** Unzureichender Kontrast lässt Icons/Text mit dem Hintergrund verschmelzen; manche Farbkombinationen sind für Farbenblinde nicht unterscheidbar.
- **Consider how the colors you use might be perceived in other countries and cultures.** Beispiel Stocks-App: **Grün zeigt einen positiven Trend auf Englisch**, **Rot zeigt einen positiven Trend auf Chinesisch** — in manchen Kulturen bedeutet Rot Gefahr, in anderen hat es positive Konnotationen.

#### System colors
- **Avoid hard-coding system color values in your app.** Dokumentierte Farbwerte sind nur Referenz beim Design — **die tatsächlichen Farbwerte können sich von Release zu Release ändern**, abhängig von diversen Umgebungsvariablen. APIs wie `Color` nutzen, um System-Farben anzuwenden.
- iOS, iPadOS, macOS und visionOS definieren zusätzlich **dynamische System-Farben**, die zu Standard-UI-Komponenten passen und sich automatisch an Light/Dark anpassen. Jede dynamische Farbe ist semantisch nach ihrem Zweck definiert, nicht nach Erscheinung/Farbwert (z.B. manche Farben repräsentieren View-Hintergründe auf verschiedenen Hierarchie-Ebenen, andere Vordergrund-Content wie Labels/Links/Separators).
- **Avoid redefining the semantic meanings of dynamic system colors.** Für konsistente Erfahrung + korrektes Aussehen bei Appearance-Wechsel dynamische System-Farben wie vorgesehen nutzen — z.B. nicht die Separator-Farbe als Textfarbe oder die Secondary-Text-Label-Farbe als Hintergrundfarbe verwenden.

#### Liquid Glass color
> By default, Liquid Glass has no inherent color, and instead takes on colors from the content directly behind it. You can apply color to some Liquid Glass elements, giving them the appearance of colored or stained glass. This is useful for drawing emphasis to a specific control, like a primary call to action, and is the approach the system uses for prominent button styling. Symbols or text labels on Liquid Glass controls can also have color.

*(Bildbeispiele: Controls können Farbe im Liquid-Glass-Hintergrund nutzen, z.B. bei einem primären Action-Button · Symbole/Text auf Liquid Glass können Farbe haben, z.B. bei einem ausgewählten Tab-Bar-Item · standardmäßig übernimmt Liquid Glass die Farbe der dahinterliegenden Content-Ebene.)*

Bei kleineren Elementen (Toolbars, Tab-Bars) passt das System Liquid Glass zwischen Light/Dark je nach zugrundeliegendem Content an — standardmäßig folgen Symbole/Text darauf einem monochromatischen Farbschema (dunkler bei hellem Content, heller bei dunklem). Liquid Glass wirkt bei größeren Elementen (Sidebars) opaker, um Lesbarkeit über komplexen Hintergründen zu erhalten und reichhaltigeren Content auf der Materialoberfläche zu ermöglichen.

- **Apply color sparingly to the Liquid Glass material, and to symbols or text on the material.** Nur für Elemente reservieren, die wirklich von Hervorhebung profitieren (Status-Indikatoren, primäre Aktionen). Für primäre Aktionen: Farbe auf den Hintergrund anwenden statt auf Symbole/Text — Beispiel: das System wendet die App-Akzentfarbe auf den Hintergrund prominenter Buttons an (z.B. „Fertig"-Button), um Aufmerksamkeit zu erzeugen. **Farbe im Hintergrund mehrerer Controls gleichzeitig vermeiden.**
- **Avoid using similar colors in control labels if your app has a colorful background.** Zu viel Farbe kann überwältigend wirken und Control-Labels schwerer lesbar machen. Bei farbigem/visuell reichem App-Hintergrund: monochromatisches Erscheinungsbild für Toolbars/Tab-Bars bevorzugen, oder eine Akzentfarbe mit ausreichender visueller Differenzierung wählen. Umgekehrt: bei überwiegend monochromatischem Content/Hintergrund kann die eigene Markenfarbe als App-Akzentfarbe die Firmenidentität effektiv widerspiegeln.
- **Be aware of the placement of color in the content layer.** Ausreichenden Kontrast sicherstellen, indem Überlappung ähnlicher Farben zwischen Content-Ebene und Controls vermieden wird. Auch wenn farbiger Content zeitweise unter Controls durchscrollen kann: der Default-/Ruhezustand (z.B. oberer Bildschirmrand von scrollbarem Content) muss klare Lesbarkeit behalten.

#### Color management
> A color space represents the colors in a color model like RGB or CMYK. Common color spaces — sometimes called gamuts — are sRGB and Display P3.
>
> A color profile describes the colors in a color space using, for example, mathematical formulas or tables of data that map colors to numerical representations. An image embeds its color profile so that a device can interpret the image's colors correctly and reproduce them on a display.

- **Apply color profiles to your images.** Stellt sicher, dass App-Farben auf unterschiedlichen Displays wie beabsichtigt erscheinen. sRGB produziert auf den meisten Displays akkurate Farben.
- **Use wide color to enhance the visual experience on compatible displays.** Wide-Color-Displays unterstützen P3 (reichhaltigere, gesättigtere Farben als sRGB) — Fotos/Videos wirken lebensechter, visuelle Daten/Statusindikatoren bedeutungsvoller. Bei Bedarf Display-P3-Farbprofil bei 16 Bit/Pixel (pro Kanal) nutzen, Export als PNG. Für Design + P3-Farbauswahl wird selbst ein Wide-Color-Display benötigt.
- **Provide color space–specific image and color variations if necessary.** P3-Farben/Bilder wirken generell auch auf sRGB-Displays gut, gelegentlich sind zwei sehr ähnliche P3-Farben auf sRGB schwer unterscheidbar, P3-Gradients können auf sRGB geclippt wirken. Xcode-Asset-Katalog kann unterschiedliche Bild-/Farbversionen pro Color-Space liefern.

#### Platform considerations

**iOS, iPadOS** — zwei Sets dynamischer Hintergrundfarben, **system** und **grouped**, je mit Primary/Secondary/Tertiary-Varianten. `systemGroupedBackground`/`secondarySystemGroupedBackground`/`tertiarySystemGroupedBackground` bei einer gruppierten Table View, sonst `systemBackground`/`secondarySystemBackground`/`tertiarySystemBackground`. Hierarchie-Konvention beider Sets: **Primary** für die Gesamt-View, **Secondary** für Content-Gruppierung innerhalb der Gesamt-View, **Tertiary** für Gruppierung innerhalb sekundärer Elemente.

Dynamische Vordergrund-Farben:

| Color | Use for… | UIKit API |
|---|---|---|
| Label | A text label that contains primary content. | `label` |
| Secondary label | A text label that contains secondary content. | `secondaryLabel` |
| Tertiary label | A text label that contains tertiary content. | `tertiaryLabel` |
| Quaternary label | A text label that contains quaternary content. | `quaternaryLabel` |
| Placeholder text | Placeholder text in controls or text views. | `placeholderText` |
| Separator | A separator that allows some underlying content to be visible. | `separator` |
| Opaque separator | A separator that doesn't allow any underlying content to be visible. | `opaqueSeparator` |
| Link | Text that functions as a link. | `link` |

**macOS** — dynamische System-Farben (auch im Developer-Palette des Standard-Color-Panels sichtbar):

| Color | Use for… | AppKit API |
|---|---|---|
| Alternate selected control text color | The text on a selected surface in a list or table. | `alternateSelectedControlTextColor` |
| Alternating content background colors | The backgrounds of alternating rows or columns in a list, table, or collection view. | `alternatingContentBackgroundColors` |
| Control accent | The accent color people select in System Settings. | `controlAccentColor` |
| Control background color | The background of a large interface element, such as a browser or table. | `controlBackgroundColor` |
| Control color | The surface of a control. | `controlColor` |
| Control text color | The text of a control that is available. | `controlTextColor` |
| Current control tint | The system-defined control tint. | `currentControlTint` |
| Unavailable control text color | The text of a control that's unavailable. | `disabledControlTextColor` |
| Find highlight color | The color of a find indicator. | `findHighlightColor` |
| Grid color | The gridlines of an interface element, such as a table. | `gridColor` |
| Header text color | The text of a header cell in a table. | `headerTextColor` |
| Highlight color | The virtual light source onscreen. | `highlightColor` |
| Keyboard focus indicator color | The ring around the currently focused control during keyboard navigation. | `keyboardFocusIndicatorColor` |
| Label color | The text of a label containing primary content. | `labelColor` |
| Link color | A link to other content. | `linkColor` |
| Placeholder text color | A placeholder string in a control or text view. | `placeholderTextColor` |
| Quaternary label color | Text of lesser importance than a tertiary label, such as watermark text. | `quaternaryLabelColor` |
| Secondary label color | Text of lesser importance than a primary label, e.g. a subheading. | `secondaryLabelColor` |
| Selected content background color | The background for selected content in a key window or view. | `selectedContentBackgroundColor` |
| Selected control color | The surface of a selected control. | `selectedControlColor` |
| Selected control text color | The text of a selected control. | `selectedControlTextColor` |
| Selected menu item text color | The text of a selected menu. | `selectedMenuItemTextColor` |
| Selected text background color | The background of selected text. | `selectedTextBackgroundColor` |
| Selected text color | The color for selected text. | `selectedTextColor` |
| Separator color | A separator between different sections of content. | `separatorColor` |
| Shadow color | The virtual shadow cast by a raised object onscreen. | `shadowColor` |
| Tertiary label color | Text of lesser importance than a secondary label. | `tertiaryLabelColor` |
| Text background color | The background color behind text. | `textBackgroundColor` |
| Text color | The text in a document. | `textColor` |
| Under page background color | The background behind a document's content. | `underPageBackgroundColor` |
| Unemphasized selected content background color | Selected content in a non-key window or view. | `unemphasizedSelectedContentBackgroundColor` |
| Unemphasized selected text background color | Background for selected text in a non-key window or view. | `unemphasizedSelectedTextBackgroundColor` |
| Unemphasized selected text color | Selected text in a non-key window or view. | `unemphasizedSelectedTextColor` |
| Window background color | The background of a window. | `windowBackgroundColor` |
| Window frame text color | The text in the window's title bar area. | `windowFrameTextColor` |

*App accent colors (macOS 11+):* Custom Akzentfarbe für Buttons/Selection-Highlighting/Sidebar-Icons — greift nur, wenn Systemeinstellung Allgemein > Akzentfarbe auf **Multicolor** steht. Wählt der Nutzer eine andere feste Akzentfarbe, überschreibt das System die App-Akzentfarbe app-weit — **Ausnahme: ein Sidebar-Icon mit fest zugewiesener Farbe** (dient der Bedeutung, wird nicht überschrieben). **Consider choosing a limited color palette that coordinates with your app logo** (tvOS-Kontext, gleiche Empfehlung).

**tvOS**
- **Consider choosing a limited color palette that coordinates with your app logo.** Subtile Farbnutzung kommuniziert Marke, ohne vom Content abzulenken.
- **Avoid using only color to indicate focus.** Subtiles Scaling + responsive Animation sind die primären Mittel, um Interaktivität bei Fokus zu zeigen.

**visionOS**
- **Use color sparingly, especially on glass.** Standard-Fenster nutzen das System-`glass`-Material, durch das Licht/Objekte der physischen Umgebung sichtbar sind — das kann Lesbarkeit farbigen App-Contents beeinträchtigen. Farbe bevorzugt dort einsetzen, wo sie wichtige Information hervorhebt oder Beziehungen zwischen Interface-Teilen zeigt.
- **Prefer using color in bold text and large areas.** Farbe in leichtgewichtigem Text oder kleinen Flächen ist schwerer zu sehen/verstehen.
- **In a fully immersive experience, help people maintain visual comfort by keeping brightness levels balanced.** Hoher Kontrast lenkt Aufmerksamkeit, kann aber Unbehagen verursachen, wenn Augen an Dunkelheit gewöhnt sind — Content nur voll hell machen, wenn auch der restliche visuelle Kontext hell ist (z.B. kein helles, blinkendes/bewegtes Objekt auf sehr dunklem/schwarzem Hintergrund).

**watchOS**
- **Use background color to support existing content or supply additional information.** Schafft Ortsgefühl, hilft Schlüssel-Content zu erkennen (Beispiel: Activity-App, Hintergrund je Ring-Infografik passend zur Move/Exercise/Stand-Ringfarbe). Nur einsetzen, wenn es etwas zu kommunizieren gibt, nicht als reine Verzierung — **Vollbild-Hintergrundfarbe vermeiden bei Views, die lange sichtbar bleiben** (z.B. Workout- oder Audio-Wiedergabe-App).
- **Recognize that people might prefer graphic complications to use tinted mode instead of full color.** System kann bei einer Graphic Complication eine einzelne, vom Nutzer gewählte Farbe für Bilder/Gauges/Text nutzen statt Vollfarbe.

#### Specifications

**System colors** — 12 Farben mit SwiftUI-API-Namen. Das ursprüngliche PDF zeigte nur visuelle Swatches ohne Zahlen (siehe Apples eigene Warnung: "the actual color values may fluctuate from release to release") — Simon hat am 31.08.2026 zusätzlich einen Screenshot mit sichtbaren RGB-Werten geliefert, daraus abgeleitet (Hex berechnet aus den gezeigten RGB-Triplets):

| Name | API | Default (light) | Default (dark) | Increased Contrast (light) | Increased Contrast (dark) |
|---|---|---|---|---|---|
| Red | `red` | R255 G56 B60 → `#FF383C` | R255 G66 B69 → `#FF4245` | R235 G21 B45 → `#EB152D` | R255 G97 B101 → `#FF6165` |
| Orange | `orange` | R255 G141 B40 → `#FF8D28` | R255 G146 B48 → `#FF9230` | R197 G83 B0 → `#C55300` | R255 G160 B86 → `#FFA056` |
| Yellow | `yellow` | R255 G204 B0 → `#FFCC00` | R255 G214 B0 → `#FFD600` | R161 G106 B0 → `#A16A00` | R254 G223 B67 → `#FEDF43` |
| Green | `green` | R52 G199 B89 → `#34C759` | R48 G209 B88 → `#30D158` | R0 G137 B50 → `#008932` | R74 G217 B104 → `#4AD968` |
| Mint | `mint` | R0 G200 B179 → `#00C8B3` | R0 G218 B195 → `#00DAC3` | R0 G133 B117 → `#008575` | R84 G223 B203 → `#54DFCB` |
| Teal | `teal` | R0 G195 B208 → `#00C3D0` | R0 G210 B224 → `#00D2E0` | R0 G129 B152 → `#008198` | R59 G221 B236 → `#3BDDEC` |
| Cyan | `cyan` | R0 G192 B232 → `#00C0E8` | R60 G211 B254 → `#3CD3FE` | R0 G126 B174 → `#007EAE` | R109 G217 B255 → `#6DD9FF` |
| Blue | `blue` | R0 G136 B255 → `#0088FF` | R0 G145 B255 → `#0091FF` | R30 G110 B244 → `#1E6EF4` | R92 G184 B255 → `#5CB8FF` |
| Indigo | `indigo` | R97 G85 B245 → `#6155F5` | R109 G124 B255 → `#6D7CFF` | R86 G74 B222 → `#564ADE` | R167 G170 B255 → `#A7AAFF` |
| Purple | `purple` | R203 G48 B224 → `#CB30E0` | R219 G52 B242 → `#DB34F2` | R176 G47 B194 → `#B02FC2` | R234 G141 B255 → `#EA8DFF` |
| Pink | `pink` | R255 G45 B85 → `#FF2D55` | R255 G55 B95 → `#FF375F` | R231 G18 B77 → `#E7124D` | R255 G138 B196 → `#FF8AC4` |
| Brown | `brown` | R172 G127 B94 → `#AC7F5E` | R183 G138 B102 → `#B78A66` | R149 G109 B81 → `#956D51` | R219 G166 B121 → `#DBA679` |

*visionOS-System-Farben nutzen durchgehend die Default-Dark-Farbwerte.*

**iOS, iPadOS system gray colors** — 6 Grautöne mit UIKit-API (`systemGray`–`systemGray6`), im Screenshot ohne vollständig lesbare Zahlenwerte gezeigt — bei Bedarf separat nachfordern.

> ⚠️ **Präzisions-Hinweis:** Diese Werte sind aus einem Screenshot abgelesen (Simon, 31.08.2026), nicht aus maschinenlesbarem Text — bei winzigen On-Screen-Zahlen besteht ein Restrisiko einzelner Ziffernfehler. **Bereits als starkes Vertrauenssignal verifiziert:** unser eigenes bestehendes Signal-Grün `#30D158` (siehe Architektur-Entscheidungen) trifft Apples „Green – Default (dark)" hier exakt — spricht für korrekte Übertragung. Vor einer harten Code-Umstellung auf diese Werte im Zweifel einzelne Zahlen gegen die Live-Seite gegenprüfen.

#### Resources — Related
Dark Mode, Accessibility, Materials, Apple Design Resources · Developer-Doku: `Color` (SwiftUI), `UIColor` (UIKit), `Color` (AppKit) · Video: „Meet Liquid Glass" (WWDC25)

#### Change log (Apple)
| Datum | Änderung |
|---|---|
| December 16, 2025 | Updated guidance for Liquid Glass. |
| June 9, 2025 | Updated system color values, and added guidance for Liquid Glass. |
| February 2, 2024 | Distinguished UIKit and SwiftUI gray colors in iOS and iPadOS, and added guidance for balancing brightness levels in visionOS apps. |
| September 12, 2023 | Enhanced guidance for using background color in watchOS views, and added color swatches for tvOS. |
| June 21, 2023 | Updated to include guidance for visionOS. |
| June 5, 2023 | Updated guidance for using background color in watchOS. |
| December 19, 2022 | Corrected RGB values for system mint color (Dark Mode) in iOS and iPadOS. |

#### Erste Beobachtungen (unbestätigt, zur späteren Diskussion — noch kein Mapping)
- **Größte direkte Kollision mit unserem 4-Farb-System:** unsere Purple `#7C3AED`/Mint `#34D399` sind **hardcodierte Hex-Werte**, die app-weit direkt verwendet werden (CSS-Variablen, Tailwind-Config) — exakt das, wovor Apple explizit warnt ("Avoid hard-coding system color values"). Das ist kein 1:1 übertragbares Prinzip für uns: Apples Warnung bezieht sich auf **System**-Farben, die sich zwischen OS-Versionen ändern können — unsere Marken-Akzentfarben sind bewusst eigene, stabile Werte, kein Äquivalent zu Apples systemwide-Farben. Trotzdem interessant für die spätere Mapping-Diskussion: unsere Signalfarben (Grün/Orange/Rot/Teal, siehe Marken-Leitplanken) könnten stärker an SF-System-Farben-Rollen ausgerichtet werden, statt komplett eigene Werte zu pflegen.
- **"Even if your app ships in a single appearance mode, provide both light and dark colors"** — direkt relevant für die offene Dark-Mode-Spannung (siehe eigener Dark-Mode-Abschnitt unten): selbst WENN wir uns für einen einzigen erzwungenen Modus entscheiden würden, rät Apple trotzdem zu beiden Farbvarianten im Code.
- **App-Accent-Color-Mechanik (macOS, Multicolor-Bedingung + Sidebar-Icon-Ausnahme)** — nicht direkt relevant (kein natives macOS-Target), aber das **Ausnahme-Prinzip** ("ein Icon mit fester, bedeutungstragender Farbe wird nicht überschrieben") ist ein interessanter Gedanke für unsere eigene Farbnutzung: z.B. sollten Fach-Icons mit fester `SUBJECT_INFO`-Farbe möglicherweise ähnlich wie ein "fixed-color sidebar icon" behandelt werden — bewusste Ausnahme von einer sonst konsistenten Akzentfarben-Regel, nicht einfach überall gleich einfärben.
- **Stocks-App Grün/Rot-Kultur-Beispiel** — direkt anschlussfähig an den bereits im Accessibility-Abschnitt notierten Punkt "convey information with more than color alone" (Notenfarben, Klausur-Dringlichkeit) — hier zusätzlich die kulturelle Dimension: für eine rein deutsche Zielgruppe vermutlich unkritisch, aber gute Erinnerung, Farbcodierung nie als einzigen Informationsträger zu nutzen.
- **iOS/macOS-Dynamic-Colors-Tabellen (Label-Hierarchie, Separator-Konzept)** — direkt interessant als Vorbild für unsere eigene Text-Hierarchie-Benennung (Primary/Secondary/Tertiary/Quaternary-Label-Konzept), auch wenn wir keine UIKit/AppKit-APIs nutzen — das semantische Namensschema selbst ist plattformunabhängig übertragbar auf CSS-Variablennamen.

#### Mapping (bestätigt 31.08.2026)

**Grundregel — „PMG bleibt, alles andere wird Apple-exakt":** Simon hat nach Review der Screenshots eine klare Ausnahmeliste bestätigt (Kürzel „PMG"):
- **Purple** `#7C3AED` + Gradient-Partner `#5B21B6` — bleibt unverändert.
- **Mint** `#34D399` — bleibt unverändert.
- **Gold**-Gradient `#C8860A → #F5C842 → #FFD700 → #D4AF37 → #C07700` (identisch im App-Icon-Motiv) — bleibt unverändert.

**Alle anderen Farben werden auf Apples exakte Werte umgestellt** (Tabelle siehe Specifications oben, aus Simons Screenshot). Konkrete Ist-Stand-Funde, die das betrifft:

| Aktuell | Wert | Wird zu (Apple exakt) |
|---|---|---|
| Signal-Orange | `#FF9F0A` | `#FF8D28` (light) / `#FF9230` (dark) |
| Signal-Rot | `#FF453A` | `#FF383C` (light) / `#FF4245` (dark) |
| "Teal" (Kalender) | `#5AC8FA` | `#00C3D0` (light) / `#00D2E0` (dark) — war fälschlich ein Blau-Ton |
| "Blau" (Lernzettel-Widget-Icon) | `#5AC8FA` (identisch mit obigem "Teal"!) | `#0088FF` (light) / `#0091FF` (dark) — eigener, echter Blau-Wert |
| `grad-danger` (Tailwind) | `#F87171`/`#EF4444`/`#B91C1C` | Apple Red-Familie, damit Button = Text-Label |
| `grad-success` (Tailwind) | `#4ADE80`/`#22C55E`/`#15803D` | Apple Green-Familie (`#34C759`/`#30D158`), damit Button = Text-Label |
| Amber (10 Dateien: AFB-Tier-II, Lock-Indikatoren, Insight-Callout, `SubjectIcon`-Slot 7) | Tailwind `amber-500`/`amber-400` | **Apple Orange** (AFB I/II/III ist Blue/Amber/Purple — rein kategorial, kein Schweregrad, Orange funktioniert als dritte distinkte Farbe genauso) |
| Braun (`CoinIcon.tsx`, Münzbeutel-Fläche) | `#92400E`/`#78350F` | entfällt — Teil des ohnehin geplanten Coin-UI-Redesigns (siehe `project_coin_ui_redesign_queued`-Memory) |
| Zweiter „dunkler Purple" (`probeklausur`-Widget-Icon in `KlausurphasenScreen.tsx`) | `#4C1D95` | konsolidiert auf `#5B21B6` (den einen etablierten Purple-Partner) |

**Struktur-Entscheidung:** alle Signalfarben werden als echte CSS-Variablen zentralisiert (je ein Light- und ein Dark-Wert aus Apples Tabelle), statt als Roh-Hex über ~30 Dateien verstreut zu bleiben. Betrifft ausdrücklich nicht nur den ursprünglich genannten Kalender-Teal, sondern **jede** Icon-/Status-/Gradient-Farbe im Repo (Simon: „das meint auch alle anderen besprochenen details"). Genannte Problem-Screens mit besonders sichtbarer Farb-Inkonsistenz: Stundenplan-Großansicht und ihr Konfigurator.

**Icon-Glyph-Struktur bereits korrekt, kein Änderungsbedarf:** `GradientIcon` (`KlausurphasenScreen.tsx`) und `SubjectIcon.tsx` rendern ihre SVG-Glyphen bereits durchgängig `fill="white"`/`stroke="white"` auf dem Farbverlauf-Hintergrund — genau das von Simon bestätigte Prinzip (Akzentfarbe = Hintergrund, Icon = Weiß) ist hier strukturell schon vorhanden, nur die Farbpalette dahinter ändert sich.

**Offen, nicht Teil dieser Entscheidung:** exakte Wahl zwischen Apples „Default"- und „Increased Contrast"-Variante pro Kontext (Default ist der Standardfall, Increased Contrast nur bei aktiver Systemeinstellung) — Umsetzungsdetail für die Audit-/Code-Phase, keine offene Grundsatzfrage mehr.

---

### Dark Mode

**Quelle:** `developer.apple.com/design/human-interface-guidelines/dark-mode` · PDF geliefert 30.08.2026 · Zuletzt von Apple aktualisiert 6. August 2024 ("Added art contrasting the light and dark appearances")

#### Überblick
> Dark Mode is a systemwide appearance setting that uses a dark color palette to provide a comfortable viewing experience tailored for low-light environments.
>
> In iOS, iPadOS, macOS, and tvOS, people often choose Dark Mode as their default interface style, and they generally expect all apps and games to respect their preference. In Dark Mode, the system uses a dark color palette for all screens, views, menus, and controls, and may also use greater perceptual contrast to make foreground content stand out against the darker backgrounds.

#### Best practices
- **Avoid offering an app-specific appearance setting.** An app-specific appearance mode option creates more work for people because they have to adjust more than one setting to get the appearance they want. **Worse, they may think your app is broken because it doesn't respond to their systemwide appearance choice.**
- **Ensure that your app looks good in both appearance modes.** Menschen können zusätzlich „Auto" wählen, das je nach Tageszeit zwischen Light/Dark wechselt — potenziell während die App bereits läuft.
- **Test your content to make sure that it remains comfortably legible in both appearance modes.** Beispiel: bei Dark Mode mit „Increase Contrast" UND „Reduce Transparency" (einzeln und kombiniert) kann dunkler Text auf dunklem Hintergrund weniger lesbar werden. „Increase Contrast" in Dark Mode kann sogar zu REDUZIERTEM visuellem Kontrast zwischen dunklem Text und dunklem Hintergrund führen — Menschen mit starkem Sehvermögen können solchen Text ggf. noch lesen, für viele andere könnte er unleserlich sein.
- **In rare cases, consider using only a dark appearance in the interface.** Beispiel: eine App für immersives Media-Viewing kann sinnvoll eine dauerhaft dunkle Optik nutzen, die die UI zurücktreten lässt und Fokus auf die Medien lenkt. *(Bildbeispiel: Stocks-App nutzt eine reine Dark-Only-Optik.)*

#### Dark Mode colors
> The color palette in Dark Mode includes dimmer background colors and brighter foreground colors. It's important to realize that these colors aren't necessarily inversions of their light counterparts: while many colors are inverted, some are not.

- **Embrace colors that adapt to the current appearance.** Semantische Farben (z.B. `labelColor`/`controlColor` in macOS, `separator` in iOS/iPadOS) passen sich automatisch an. Bei eigener Custom-Farbe: Color-Set-Asset in Xcodes Asset-Katalog anlegen, Bright- UND Dim-Variante angeben. **Hardcodierte oder nicht-adaptive Farbwerte vermeiden.**
- **Aim for sufficient color contrast in all appearances.** System-definierte Farben helfen, ein gutes Kontrastverhältnis zu erreichen. **Minimum: Kontrastverhältnis nicht unter 4,5:1.** Für eigene Vordergrund-/Hintergrundfarben: **7:1 anstreben, besonders bei kleinem Text** — stellt sicher, dass Vordergrund-Content sich vom Hintergrund abhebt und empfohlene Accessibility-Richtlinien erfüllt.
- **Soften the color of white backgrounds.** Bei einem Content-Bild mit weißem Hintergrund: Bild leicht abdunkeln, damit der Hintergrund im umgebenden Dark-Mode-Kontext nicht "glüht".

**Icons and images** — System nutzt SF Symbols (adaptieren automatisch an Dark Mode) + für beide Appearances optimierte Vollfarbbilder.
- **Use SF Symbols wherever possible.** Funktionieren in beiden Appearance-Modi gut, wenn man dynamische Farben zum Tinten nutzt oder Vibrancy hinzufügt.
- **Design separate interface icons for the light and dark appearances if necessary.** Beispiel: ein Vollmond-Icon braucht ggf. eine dezente dunkle Kontur für Kontrast auf hellem Hintergrund, aber keine Kontur auf dunklem Hintergrund; ein Öltropfen-Icon braucht ggf. eine leichte Umrandung, um die Kante gegen einen dunklen Hintergrund sichtbar zu machen.
- **Make sure full-color images and icons look good in both appearances.** Gleiches Asset nutzen, wenn es in beiden Modi gut aussieht; sonst Asset anpassen oder getrennte Light-/Dark-Assets erstellen, über Asset-Kataloge zu einem benannten Bild kombiniert. *(Bildbeispiel: eine Illustration, die auf dunklem Hintergrund unangepasst schlechten Kontrast + Detailverlust zeigt, vs. für Dark-Kontrast angepasste Version.)*

**Text** — System nutzt Vibrancy + erhöhten Kontrast, um Textlesbarkeit auf dunkleren Hintergründen zu erhalten.
- **Use the system-provided label colors for labels.** Primary/Secondary/Tertiary/Quaternary-Label-Farben passen sich automatisch an.
- **Use system views to draw text fields and text views.** System-Views/-Controls lassen App-Text auf jedem Hintergrund gut aussehen, passen sich automatisch an (Vibrancy vorhanden/nicht vorhanden) — wenn möglich System-View statt eigenem Text-Rendering nutzen.

#### Platform considerations
*No additional considerations for tvOS.* **Dark Mode isn't supported in visionOS or watchOS.**

**iOS, iPadOS** — zwei Hintergrundfarben-Sets in Dark Mode: **base** und **elevated**, zur Tiefenwahrnehmung wenn ein dunkles Interface über einem anderen liegt. Base = dimmer (Hintergrund-Interfaces treten zurück), Elevated = heller (Vordergrund-Interfaces treten hervor, z.B. Popover/Modal-Sheet). System nutzt Elevated-Hintergrund auch zur visuellen Trennung zwischen Apps im Multitasking und zwischen Fenstern im Multi-Window-Kontext.
- **Prefer the system background colors.** Custom-Hintergrundfarbe erschwert es, diese System-bereitgestellten visuellen Unterscheidungen wahrzunehmen.

**macOS** — bei gewählter **Graphit**-Akzentfarbe (Allgemein-Einstellungen) übernehmen Fenster-Hintergründe Farbe vom aktuellen Desktop-Hintergrundbild (**Desktop Tinting**) — subtiler Effekt für harmonischeres Zusammenspiel mit umgebendem Content.
- **Include some transparency in custom component backgrounds when appropriate.** Lässt eigene Komponenten Farbe vom Fensterhintergrund übernehmen, wenn Desktop-Tinting aktiv ist — Harmonie bleibt auch bei wechselndem Hintergrundbild erhalten. Nur bei Komponenten mit sichtbarem Hintergrund/Bezel UND nur im neutralen Zustand (der keine Farbe nutzt) anwenden — sonst würde die Komponentenfarbe bei wechselnder Fensterposition/Hintergrundbild unerwünscht fluktuieren.

#### Resources — Related
Color, Materials, Typography · Videos: „Meet Liquid Glass" (WWDC25), „Implementing Dark Mode on iOS"

#### Change log (Apple)
| Datum | Änderung |
|---|---|
| August 6, 2024 | Added art contrasting the light and dark appearances. |

#### Erste Beobachtungen (unbestätigt, zur späteren Diskussion — noch kein Mapping)
- **Bestätigt und präzisiert jetzt vollständig die bereits am 30.08.2026 (erste Session) als „ungelöste Spannung" notierte Beobachtung** (siehe CLAUDE.md-Session-Log): Apple sagt wortwörtlich: *"Avoid offering an app-specific appearance setting... Worse, they may think your app is broken because it doesn't respond to their systemwide appearance choice."* DailyStudent hat einen expliziten Hell/Dunkel/System-Dreifach-Schalter im Profil (siehe CLAUDE.md Phase-2-Liste). Das ist eine **direkte, konkrete Abweichung von einer expliziten Apple-Regel**, keine Interpretationsfrage mehr. Muss vor jeder Dark-Mode-Umsetzungsphase bewusst mit Simon entschieden werden: (a) Toggle als bewusste, begründete Abweichung beibehalten (z.B. weil Schüler-Zielgruppe/eigene Markenidentität wichtiger ist als HIG-Konformität an dieser Stelle), oder (b) Richtung „System als alleiniger Standard" verschieben (Toggle entfernen oder auf einen reinen "folgt System"-Hinweis reduzieren). Keine stillschweigende Änderung — das ist eine Produktentscheidung, keine reine Politur.
- **"Dark Mode isn't supported in visionOS or watchOS"** — reine Fakteninfo, nicht relevant für unsere Plattformen (iOS/Web), der Vollständigkeit halber erfasst.
- **4.5:1 Minimum- / 7:1 Ziel-Kontrastverhältnis** — deckt sich mit/präzisiert die bereits im Accessibility-Abschnitt notierte WCAG-AA-4.5:1-Regel; die zusätzliche 7:1-Empfehlung „besonders bei kleinem Text" ist neu und strenger — guter Prüfpunkt für unsere Dark-Theme-Textfarben, besonders auf den „immer dunklen" Hero-Karten (siehe Architektur-Entscheidungen, `urgencyColor` in `ToDoCard`).
- **Base/Elevated-Hintergrundfarben-Konzept (iOS)** — direkt interessantes Strukturprinzip für unsere eigene Dark-Theme-Ebenen-Logik (z.B. Bottom-Sheets/Modals über normalem Screen-Hintergrund) — aktuell vermutlich nicht explizit als zwei unterschiedene Stufen umgesetzt, Kandidat für den späteren Audit.
- **macOS Desktop-Tinting** — nicht relevant (kein natives macOS-Target), der Vollständigkeit halber erfasst.
- **"Design separate interface icons for light/dark if necessary"** — relevant für unser eigenes Icon-System (handgeschriebene SVGs, siehe SF-Symbols-/Icons-Abschnitte): sollte im Icons-Audit mitgeprüft werden, ob es Icons gibt, die im jeweils anderen Theme schlecht/kontrastarm aussehen.

#### Mapping (bestätigt 31.08.2026)

**Entschieden: Toggle wird entfernt, App folgt nur noch dem System.** Simon: „lets just remove our dark mode toggle and just stick with system as this already works - one less setting pill that might confuse the user." Der Hell/Dunkel/System-Dreifach-Schalter (`ProfilErscheinungsbildScreen.tsx`) fällt komplett weg — löst die seit der ersten Extraktions-Session offene Spannung mit Apples „Avoid offering an app-specific appearance setting" endgültig auf, zugunsten von Apples Empfehlung. **Nebenfund dabei:** die Toggle-Optionen nutzten Emoji-Icons (☀️🌙⚙️) — entfällt ohnehin mit der Entfernung, kein separater Fix nötig.

**Bestehen bleibt unverändert:** Base/Elevated-Konzept, 4.5:1/7:1-Kontrastregeln fließen ins Color-Mapping ein (bereits bestätigt).

---

### Materials

**Quelle:** `developer.apple.com/design/human-interface-guidelines/materials` · PDF geliefert 30.08.2026 · Zuletzt von Apple aktualisiert 9. September 2025 ("Updated guidance for Liquid Glass")

#### Überblick
> A material is a visual effect that creates a sense of depth, layering, and hierarchy between foreground and background elements.
>
> Materials help visually separate foreground elements, such as text and controls, from background elements, such as content and solid colors. By allowing color to pass through from background to foreground, a material establishes visual hierarchy to help people more easily retain a sense of place.
>
> Apple platforms feature two types of materials: **Liquid Glass**, and **standard materials**. Liquid Glass is a dynamic material that unifies the design language across Apple platforms, allowing you to present controls and navigation without obscuring underlying content. In contrast to Liquid Glass, the standard materials help with visual differentiation within the content layer.

#### Liquid Glass
> Liquid Glass forms a distinct functional layer for controls and navigation elements — like tab bars and sidebars — that floats above the content layer, establishing a clear visual hierarchy between functional elements and content. Liquid Glass allows content to scroll and peek through from beneath these elements to give the interface a sense of dynamism and depth, all while maintaining legibility for controls and navigation.

- **Don't use Liquid Glass in the content layer.** Funktioniert am besten als klare Trennung zwischen interaktiven Elementen und Content — im Content-Layer selbst sorgt es für unnötige Komplexität/verwirrende Hierarchie. Stattdessen Standard-Materialien für Content-Layer-Elemente (z.B. App-Hintergründe) nutzen. **Ausnahme:** transiente interaktive Elemente im Content-Layer wie Slider/Toggles nehmen bei Aktivierung kurzzeitig eine Liquid-Glass-Optik an, um ihre Interaktivität zu betonen.
- **Use Liquid Glass effects sparingly.** Standard-Systemkomponenten übernehmen Look/Verhalten automatisch. Bei eigenen Custom Controls: sparsam einsetzen, nur auf die wichtigsten funktionalen Elemente beschränken — Liquid Glass soll Aufmerksamkeit auf den darunterliegenden Content lenken, Übernutzung in mehreren Custom Controls lenkt davon ab.
- **Only use clear Liquid Glass for components that appear over visually rich backgrounds.** Zwei Varianten:
  - **Regular** — blurt + passt die Luminosität des Hintergrunds an, um Lesbarkeit von Text/Vordergrund zu erhalten. Scroll-Edge-Effects verstärken das zusätzlich. Von den meisten Systemkomponenten genutzt. Einsetzen wenn Hintergrund Lesbarkeitsprobleme verursachen könnte oder Komponenten viel Text enthalten (Alerts, Sidebars, Popovers).
  - **Clear** — stark transluzent, priorisiert Sichtbarkeit des Hintergrunds — für Komponenten über Medien-Hintergründen (Fotos/Videos) für ein immersiveres Erlebnis.
  - **Dimming-Layer-Entscheidung bei Clear:** heller Hintergrund → dunkler Dimming-Layer mit 35% Opacity erwägen; ausreichend dunkler Hintergrund ODER Standard-Media-Playback-Controls von AVKit (haben eigenen Dimming-Layer) → kein zusätzlicher Dimming-Layer nötig.
  - Beide Varianten reagieren auf System-Settings (bevorzugtes Liquid-Glass-Aussehen in Geräteeinstellungen, „Reduce Transparency"/„Increase Contrast").

#### Standard materials
> Use standard materials and effects — such as blur, vibrancy, and blending modes — to convey a sense of structure in the content beneath Liquid Glass.

- **Choose materials and effects based on semantic meaning and recommended usage.** Nicht nach der scheinbaren Farbe wählen, die ein Material dem Interface verleiht — System-Settings können Aussehen/Verhalten ändern. Stattdessen Material/Vibrancy-Style zum konkreten Use-Case passen.
- **Help ensure legibility by using vibrant colors on top of materials.** System-definierte Vibrant Colors sind automatisch nie zu dunkel/hell/gesättigt/kontrastarm, unabhängig vom Material. *(Bildbeispiel: `systemGray3`-Label auf Material = schlechter Kontrast ❌ vs. Vibrant-Color-Label = guter Kontrast ✅.)*
- **Consider contrast and visual separation when choosing a material to combine with blur and vibrancy effects.** Dickere Materialien (opaker) → besserer Kontrast für Text/feine Details; dünnere Materialien (transluzenter) → helfen Kontext zu behalten durch sichtbaren Hinweis auf den Hintergrund-Content.

#### Platform considerations

**iOS, iPadOS** — Zusätzlich zu Liquid Glass weiterhin **vier Standard-Materialien**: `ultraThin`, `thin`, `regular` (Default), `thick` — nutzbar im Content-Layer für visuelle Distinktion.
- Vibrant Colors für Labels, Fills, Separators, speziell auf jedes Material abgestimmt. Labels + Fills haben mehrere Vibrancy-Stufen, Separators eine. Stufenname = relativer Kontrast zum Hintergrund: Default-Stufe = höchster Kontrast, Quaternary (wo vorhanden) = niedrigster.
- Label-Vibrancy-Werte (auf jedem Material nutzbar, außer Quaternary — generell nicht auf `thin`/`ultraThin` wegen zu niedrigem Kontrast): `label` (Default), `secondaryLabel`, `tertiaryLabel`, `quaternaryLabel`.
- Fill-Vibrancy-Werte (auf allen Materialien nutzbar): `fill` (Default), `secondaryFill`, `tertiaryFill`.
- Separator: ein einziger Default-Vibrancy-Wert, funktioniert auf allen Materialien.

**macOS** — mehrere Standard-Materialien mit festgelegten Zwecken + Vibrant-Versionen aller Systemfarben.
- **Choose when to allow vibrancy in custom views and controls.** Je nach Konfiguration/System-Settings nutzen System-Views/-Controls Vibrancy, um Vordergrund gegen jeden Hintergrund abzuheben — in verschiedenen Kontexten testen.
- **Choose a background blending mode that complements your interface design.** Zwei Modi: *behind window* und *within window*.

**tvOS** — Liquid Glass erscheint durchgehend in Navigationselementen und System-Erfahrungen wie Top Shelf und Control Center; bestimmte Elemente (Image Views, Buttons) nehmen bei Fokus Liquid Glass an. Zusätzlich weiterhin Standard-Materialien für Struktur im Content-Layer — Dicke beeinflusst, wie stark der Hintergrund durchscheint:

| Material | Recommended for |
|---|---|
| ultraThin | Full-screen views that require a light color scheme |
| thin | Overlay views that partially obscure onscreen content and require a light color scheme |
| regular | Overlay views that partially obscure onscreen content |
| thick | Overlay views that partially obscure onscreen content and require a dark color scheme |

**visionOS** — Fenster nutzen generell ein unveränderliches, systemdefiniertes Material namens **glass**, das Licht, das aktuelle Environment, virtuellen Content und Objekte in der Umgebung durchscheinen lässt. Glass ist adaptiv und limitiert die Hintergrundfarb-Information, damit ein Fenster weiterhin Kontrast für App-Content bietet, während es je nach physischer Umgebung/virtuellem Content heller/dunkler wird.
> Note: visionOS doesn't have a distinct Dark Mode setting. Instead, glass automatically adapts to the luminance of the objects and colors behind it.

- **Prefer translucency to opaque colors in windows.** Opake Flächen blockieren die Sicht, wirken einengend, reduzieren Wahrnehmung von virtuellen/physischen Objekten in der Umgebung.
- **If necessary, choose materials that help you create visual separations or indicate interactivity in your app:** `thin` lenkt Aufmerksamkeit auf interaktive Elemente (Buttons, ausgewählte Items); `regular` trennt App-Bereiche visuell (z.B. Sidebar, gruppierte Tabellen-View); `thick` erzeugt ein dunkles, visuell distinktes Element über einem `regular`-Hintergrund.
- Drei Vibrancy-Werte für Hierarchie von Text/Symbolen/Fills: `label` (Standardtext), `secondaryLabel` (beschreibender Text wie Fußnoten/Untertitel), `tertiaryLabel` (inaktive Elemente, nur wenn Text keine hohe Lesbarkeit braucht).

**watchOS**
- **Use materials to provide context in a full-screen modal view.** Full-Screen-Modals sind in watchOS üblich — Material-Layer-Kontrast hilft bei Orientierung und unterscheidet Controls/System-Elemente vom übrigen Content. **Avoid removing or replacing material backgrounds for modal sheets when they're provided by default.**

#### Change log (Apple)
| Datum | Änderung |
|---|---|
| September 9, 2025 | Updated guidance for Liquid Glass. |
| June 9, 2025 | Added guidance for Liquid Glass. |
| August 6, 2024 | Added platform-specific art. |
| December 5, 2023 | Updated descriptions of the various material types, and clarified terms related to vibrancy and material thickness. |
| June 21, 2023 | Updated to include guidance for visionOS. |
| June 5, 2023 | Added guidance on using materials to provide context and orientation in watchOS apps. |

#### Erste Beobachtungen (unbestätigt, zur späteren Diskussion — noch kein Mapping)
- **Bestätigt und präzisiert die bereits in den Marken-Leitplanken oben festgehaltene Einschränkung:** Liquid Glass ist explizit ein **dynamisches, system-berechnetes Material**, das auf Geräte-Einstellungen (bevorzugtes Aussehen, Reduce Transparency, Increase Contrast) reagiert und sich je nach Systemversion visuell ändern kann (siehe App-Icons-Abschnitt) — das ist grundsätzlich nicht in einer WebView nachbaubar, nur eine statische CSS-Annäherung möglich (Blur + leichte Transluzenz + evtl. ein dezenter Gradient als "Specular-Highlight"-Anmutung), keine echte adaptive Systemreaktion.
- **Wichtige Differenzierung für unsere Umsetzungsphase, die die Marken-Leitplanken bisher noch nicht so klar hatten:** Die **Standard-Materialien** (`ultraThin`/`thin`/`regular`/`thick`, reiner Blur + Vibrancy + Opacity, KEIN Liquid-Glass-System-Rendering) sind deutlich besser mit reinem CSS annäherbar — `backdrop-filter: blur(Npx)` + halbtransparente `background-color` + angepasste Textfarbe/-opacity kommt dem sehr nahe. Für unsere „immer dunklen" Hero-Karten (Dashboard) oder z.B. eine künftige Bottom-Sheet-/Modal-Überarbeitung (`ProModal`, `BottomSheet`, `StreakInfoSheet`) ist das der **direkt umsetzbare** Teil dieses Themas, während echtes Liquid Glass (Tab-Bar/Sidebar-Ebene mit Content-Durchscroll-Effekt) der eher symbolisch/näherungsweise umsetzbare Teil bleibt.
- **"Don't use Liquid Glass in the content layer" / "sparingly" für Custom Controls** — falls wir eine CSS-Glas-Annäherung einsetzen, sollte sie analog eingeschränkt bleiben: nur für Navigations-/Control-Ebenen (BottomNav, DesktopSidebar, Sheets), nicht für normale Content-Karten im Scroll-Bereich.
- **Vibrant-Colors-Prinzip ("Farbe auf Material immer vibrant/System-definiert wählen, nie eine feste Rohfarbe")** ist ein direkt übertragbares CSS-Prinzip: Text-/Icon-Farbe auf einer transluzenten/geblurrten Fläche sollte bewusst kontrastgeprüft sein (nicht einfach dieselbe feste Textfarbe wie auf solidem Hintergrund weiterverwenden) — Kandidat für den späteren Audit unserer Blur-/Sheet-Komponenten.
- **tvOS/visionOS-Spezifika (Top Shelf, Control Center, `glass`-Fenstermaterial)** — nicht relevant, kein Target, vollständigkeitshalber erfasst.

#### Mapping (bestätigt 31.08.2026)

**Entschieden: kein Versuch, Liquid Glass anzunähern.** Simon: „lets try to not get close to the liquid glass but find solid solutions around it - im sorry but you just dont get there at all." Kein Specular-Highlight/Adaptive-System-Rendering-Nachbau — stattdessen solide, einfache Blur-Lösungen nach Apples Standard-Materialien-Tiers.

**Status:** `backdrop-filter: blur()` bereits in 13 Dateien im Einsatz (`BottomNav`, `DesktopSidebar`, `StreakBadge`, `AttachmentToast`, `ReferralPill`, `LandingScreen`, `NoteCreateScreen`, `LernzettelScreen`, `DrawingCanvasScreen`, `DocumentCropTool` u.a.) — die CSS-Approximation läuft also schon, nur mit 8 verschiedenen, unkoordinierten Blur-Werten (4/10/12/14/20/24/28/44px).

**Entschieden:** auf 4 feste Tokens konsolidieren, angelehnt an Apples ultraThin/thin/regular/thick — grobe Zuordnung: ultraThin≈8px, thin≈14px, regular≈24px, thick≈40px. Jede der 13 Stellen wird dem nächstliegenden Tier zugeordnet, keine krummen Einzelwerte mehr.

---

### Layout & Spacing

**Quelle:** `developer.apple.com/design/human-interface-guidelines/layout` · PDF geliefert 30.08.2026 · Zuletzt von Apple aktualisiert 9. September 2025 ("Added specifications for iPhone 17, iPhone Air, iPhone 17 Pro, iPhone 17 Pro Max, Apple Watch SE 3, Apple Watch Series 11, and Apple Watch Ultra 3") · **Hinweis:** Apples HIG hat keine separate „Spacing"-Seite — Spacing-Guidance ist in diese „Layout"-Seite eingebettet (Grid-Werte, Element-Abstände, Safe-Area-Insets), es gibt keine eigene abstrakte Punkte-Spacing-Skala wie ein generisches 4/8/12/16px-System. Diese eine Seite deckt die komplette „Layout & Spacing"-Zeile ab.

#### Überblick
> A consistent layout that adapts to various contexts makes your experience more approachable and helps people enjoy their favorite apps and games on all their devices.
>
> Your app's layout helps ground people in your content from the moment they open it. People expect familiar relationships between controls and content to help them use and discover your app's features, and designing the layout to take advantage of this makes your app feel at home on the platform.

#### Best practices
- **Group related items to help people find the information they want.** Negative Space, Hintergrundformen, Farben, Materialien oder Trennlinien nutzen, um Zusammengehörigkeit zu zeigen — dabei Content und Controls klar unterscheidbar halten.
- **Make essential information easy to find by giving it sufficient space.** Wichtigste Information sofort sichtbar, nicht durch nicht-essenzielle Details überfrachten. Sekundäre Info in andere Teile des Fensters oder eine zusätzliche View auslagern.
- **Extend content to fill the screen or window.** Hintergründe/Vollbild-Artwork bis zum Displayrand ziehen; scrollbare Layouts bis ganz nach unten/zu den Seiten. Controls/Navigation (Sidebars, Tab-Bars) liegen auf einer eigenen Ebene ÜBER dem Content, nicht auf derselben Ebene — im Layout mitdenken.
- **When your content doesn't span the full window, use a background extension view** — für den Eindruck von Content hinter der Control-Ebene beidseitig des Screens (z.B. unter Sidebar/Inspector). *(Developer: `backgroundExtensionEffect()`, `UIBackgroundExtensionView`.)*
- **Differentiate controls from content.** Liquid-Glass-Material für eine konsistente Control-Optik über iOS/iPadOS/macOS hinweg nutzen (siehe eigener „Materials"-Abschnitt). Statt eines Hintergrunds einen Scroll-Edge-Effect für den Übergang zwischen Content und Control-Bereich nutzen.

#### Visual hierarchy
- **Place items to convey their relative importance.** Menschen betrachten Items zuerst in Lesereihenfolge (oben→unten, leading→trailing) — wichtigste Items nahe oben/leading platzieren. Lesereihenfolge variiert je Sprache — rechts-nach-links-Sprachen mitdenken.
- **Align components with one another to make them easier to scan and to communicate organization and hierarchy.** Alignment lässt eine App aufgeräumt wirken, hilft beim Scannen/Tracking während des Scrollens. Zusammen mit Einrückung hilft Alignment auch, Informationshierarchie zu verstehen.
- **Take advantage of progressive disclosure to help people discover content that's currently hidden.** Disclosure-Control oder teilweise sichtbare Items als Hinweis auf weiteren, durch Interaktion (z.B. Scrollen) erreichbaren Content.
- **Make controls easier to use by providing enough space around them and grouping them in logical sections.** Zu eng beieinanderliegende unrelated Controls (oder von Content überfüllte Controls) sind schwer auseinanderzuhalten/verständlich.

#### Adaptability
Jede App muss auf Geräte-/Systemkontext-Änderungen reagieren. Häufigste zu behandelnde Variationen:
- Different device screen sizes, resolutions, and color spaces
- Different device orientations (portrait/landscape)
- System features like Dynamic Island and camera controls
- External display support, Display Zoom, and resizable windows on iPad
- Dynamic Type text-size changes
- Locale-based internationalization features like left-to-right/right-to-left layout direction, date/time/number formatting, font variation, and text length

- **Design a layout that adapts gracefully to context changes while remaining recognizably consistent.** System-definierte Safe Areas/Margins/Guides respektieren + Layout-Modifiers zur Feinjustierung nutzen.
- **Be prepared for text-size changes.** Dynamic Type unterstützen (iOS/iPadOS/tvOS/visionOS/watchOS) — siehe eigener Typography-Abschnitt. Für Unity-basierte Games: Apples Accessibility-Plug-in nutzen.
- **Preview your app on multiple devices, using different orientations, localizations, and text sizes.** Zuerst größtes+kleinstes Layout testen; wide-gamut Farbe am besten auf echten Geräten prüfen, Clipping/Layout-Probleme auch im Simulator (Device Hub) testbar.
- **When necessary, scale artwork in response to display changes.** Bei anderem Aspect Ratio (z.B. anderer Bildschirm): Artwork NICHT im Seitenverhältnis verzerren, stattdessen skalieren, damit wichtiger visueller Content sichtbar bleibt.

#### Guides and safe areas
- Ein **Layout Guide** definiert einen rechteckigen Bereich zur Positionierung/Ausrichtung/Abstandsbestimmung von Content. System liefert vordefinierte Guides für Standard-Margins + optimale Textbreite; eigene Custom Guides sind möglich.
- Ein **Safe Area** definiert den Bereich einer View, der nicht von Toolbar/Tab-Bar/anderen Fenster-Views verdeckt wird — essenziell zur Vermeidung interaktiver/Display-Features (Dynamic Island, Kamera-Aussparung bei manchen Macs).
- **Respect key display and system features in each platform.** Ohne das fühlt sich eine App/ein Game nicht "zuhause" auf der Plattform an und ist schwerer nutzbar.

#### Platform considerations

**iOS**
- **Aim to support both portrait and landscape orientations.** Falls nur eine Orientierung unterstützt wird: kein Hinweis nötig, Menschen probieren beide Orientierungen selbst aus. Landscape-only: muss bei Rotation nach links UND rechts gleich gut funktionieren.
- **Prefer a full-bleed interface for your game.** Randradius/Sensor-Housing/Dynamic Island dabei berücksichtigen; ggf. Letterbox-/Pillarbox-Option anbieten.
- **Avoid full-width buttons.** Buttons fühlen sich in iOS "zuhause" an, wenn sie System-Margins respektieren und vom Bildschirmrand eingerückt sind. Falls doch full-width nötig: mit der Hardware-Randkurve harmonisieren + an angrenzenden Safe Areas ausrichten.
- **Hide the status bar only when it adds value or enhances your experience.** Ausnahme: immersive Erfahrungen wie Spiele/Media-Wiedergabe.

**iPadOS**
- Fenster frei bis zu Mindestbreite/-höhe skalierbar (wie macOS) — volle Bandbreite möglicher Fenstergrößen im Layout berücksichtigen.
- **As someone resizes a window, defer switching to a compact view for as long as possible.** Zuerst für Full-Screen-View designen, erst auf Compact wechseln, wenn die volle Layout-Version nicht mehr passt — wirkt stabiler/vertrauter. Bei komplexeren Layouts (Split Views): tertiäre Spalten wie Inspectors bevorzugt ausblenden, wenn die View schmaler wird.
- **Test your layout at common system-provided sizes, and provide smooth transitions.** Fenster-Controls erlauben Anordnung in Hälften/Dritteln/Quadranten des Screens — bei jeder dieser Größen testen, unerwartete UI-Sprünge bei Min-/Max-Anpassung minimieren.
- **Consider a convertible tab bar for adaptive navigation.** Statt zwischen Tab-Bar ODER Sidebar zu wählen: ein Tab-Bar-Stil, der beides bietet — App startet mit gewählter Präsentation, Menschen können umschalten; bei Größenänderung passt sich der Präsentationsstil automatisch der View-Breite an. *(Developer: `sidebarAdaptable`.)*

**macOS**
- **Avoid placing controls or critical information at the bottom of a window.** Fenster werden oft so verschoben, dass die untere Kante unterhalb des Bildschirms liegt.
- **Avoid displaying content within the camera housing at the top edge of the window.** *(Developer: `NSPrefersDisplaySafeAreaCompatibilityMode`.)*

**tvOS**
- **Be prepared for a wide range of TV sizes.** Layouts passen sich auf Apple TV NICHT automatisch der Bildschirmgröße an wie bei iPhone/iPad — Apps/Games zeigen dieselbe Oberfläche auf jedem Display, entsprechend sorgfältig für verschiedene Bildschirmgrößen designen.
- **Adhere to the screen's safe area.** Primären Content **60 Punkte** von oben/unten und **80 Punkte** von den Seiten einrücken — Content zu nah am Rand ist schwer sichtbar, ungewolltes Cropping durch Overscanning bei älteren TVs möglich. Nur bewusst teilweise angezeigter Offscreen-Content darf außerhalb dieser Zone erscheinen.
- **Include appropriate padding between focusable elements.** Bei UIKit + Focus-APIs werden Elemente bei Fokus größer — genug Abstand einplanen, damit sie sich nicht mit wichtiger Information überlappen.
- **Grids** — mehrere Spalten-Layouts vordefiniert (Two- bis Nine-column), im PDF-Export nur die Werte für **Two-column grid** aktiv gerendert (restliche Spaltenzahlen nur als Tab-Label ohne eigene Wert-Tabelle erfasst):

| Attribute | Value |
|---|---|
| Unfocused content width | 860 pt |
| Horizontal spacing | 40 pt |
| Minimum vertical spacing | 100 pt |

  - **Include additional vertical spacing for titled rows.** Genug Abstand zwischen unterer Kante der vorherigen unfokussierten Reihe und der Mitte des Titels; ebenso zwischen Titel-Unterkante und den unfokussierten Items der Reihe.
  - **Use consistent spacing.** Inkonsistenter Abstand lässt es nicht mehr wie ein Grid aussehen, erschwert das Scannen.
  - **Make partially hidden content look symmetrical.** Teilweise sichtbarer Offscreen-Content auf beiden Seiten gleich breit halten.

**visionOS**
- **Consider centering the most important content and controls in your app or game.** Content nahe der Fenstermitte ist oft leichter entdeckbar/interagierbar, besonders bei großen Fenstern.
- **Keep a window's content within its bounds.** System zeigt Fenster-Controls knapp außerhalb der Fenstergrenzen in der XY-Ebene (z.B. Share-Menü oberhalb, Resize/Move/Close-Controls unterhalb) — 2D/3D-Content darf diese Zonen nicht stören.
- **If you need to display additional controls that don't belong within a window, use an ornament.** Bleibt visuell mit dem Fenster assoziiert, ohne System-Controls zu stören (z.B. Toolbar/Tab-Bar erscheinen als Ornaments).
- **Make a window's interactive components easy for people to look at.** Genug Raum um interaktive Komponenten für leichte/komfortable visuelle Identifikation UND um zu verhindern, dass der System-Hover-Effekt anderen Content verdeckt — Buttons z.B. mit mind. **60 Punkten** Abstand zwischen den Mittelpunkten platzieren.
- *Note:* Content mit Tiefe in einem Standard-Fenster, das über die Fenstergrenzen entlang der z-Achse hinausragt, wird vom System geclippt, wenn es zu weit reicht.

**watchOS**
- **Design your content to extend from one edge of the screen to the other.** Die Apple-Watch-Blende liefert natürliches visuelles Padding — Padding zwischen Elementen eher minimieren, um wertvollen Platz nicht zu verschwenden.
- **Avoid placing more than two or three controls side by side in your interface.** Faustregel: max. 3 Glyph-Buttons oder 2 Text-Buttons in einer Reihe. Text-Buttons bevorzugt über volle Breite; zwei nebeneinanderliegende Buttons mit kurzem Text funktionieren auch, solange der Screen nicht scrollt.
- **Support autorotation in views people might want to show others.** Bei Handgelenk-Abwendung schläft das Display normalerweise ein — Ausnahme, wenn Content anderen gezeigt werden könnte (z.B. ein Bild oder QR-Code).

#### Specifications

**iOS, iPadOS device screen dimensions** *(Modell → Punkte × Punkte, native Pixel @Scale-Faktor):*

| Model | Dimensions (portrait) |
|---|---|
| iPad Pro 13-inch | 1032×1376 pt (2064×2752 px @2x) |
| iPad Pro 12.9-inch | 1024×1366 pt (2048×2732 px @2x) |
| iPad Pro 11-inch 5th/6th gen | 834×1210 pt (1668×2420 px @2x) |
| iPad Pro 11-inch 1st–4th gen | 834×1194 pt (1668×2388 px @2x) |
| iPad Pro 10.5-inch | 834×1112 pt (1668×2224 px @2x) |
| iPad Pro 9.7-inch | 768×1024 pt (1536×2048 px @2x) |
| iPad Air 13-inch | 1024×1366 pt (2048×2732 px @2x) |
| iPad Air 11-inch | 820×1180 pt (1640×2360 px @2x) |
| iPad Air 10.9-inch | 820×1180 pt (1640×2360 px @2x) |
| iPad Air 10.5-inch | 834×1112 pt (1668×2224 px @2x) |
| iPad Air 9.7-inch | 768×1024 pt (1536×2048 px @2x) |
| iPad 11-inch | 820×1180 pt (1640×2360 px @2x) |
| iPad 10.2-inch | 810×1080 pt (1620×2160 px @2x) |
| iPad 9.7-inch | 768×1024 pt (1536×2048 px @2x) |
| iPad mini 8.3-inch | 744×1133 pt (1488×2266 px @2x) |
| iPad mini 7.9-inch | 768×1024 pt (1536×2048 px @2x) |
| iPhone 17 Pro Max | 440×956 pt (1320×2868 px @3x) |
| iPhone 17 Pro | 402×874 pt (1206×2622 px @3x) |
| iPhone Air | 420×912 pt (1260×2736 px @3x) |
| iPhone 17 | 402×874 pt (1206×2622 px @3x) |
| iPhone 16 Pro Max | 440×956 pt (1320×2868 px @3x) |
| iPhone 16 Pro | 402×874 pt (1206×2622 px @3x) |
| iPhone 16 Plus | 430×932 pt (1290×2796 px @3x) |
| iPhone 16 | 393×852 pt (1179×2556 px @3x) |
| iPhone 16e | 390×844 pt (1170×2532 px @3x) |
| iPhone 15 Pro Max | 430×932 pt (1290×2796 px @3x) |
| iPhone 15 Pro | 393×852 pt (1179×2556 px @3x) |
| iPhone 15 Plus | 430×932 pt (1290×2796 px @3x) |
| iPhone 15 | 393×852 pt (1179×2556 px @3x) |
| iPhone 14 Pro Max | 430×932 pt (1290×2796 px @3x) |
| iPhone 14 Pro | 393×852 pt (1179×2556 px @3x) |
| iPhone 14 Plus | 428×926 pt (1284×2778 px @3x) |
| iPhone 14 | 390×844 pt (1170×2532 px @3x) |
| iPhone 13 Pro Max | 428×926 pt (1284×2778 px @3x) |
| iPhone 13 Pro | 390×844 pt (1170×2532 px @3x) |
| iPhone 13 | 390×844 pt (1170×2532 px @3x) |
| iPhone 13 mini | 360×780 pt (1080×2340 px @3x) |
| iPhone 12 Pro Max | 428×926 pt (1284×2778 px @3x) |
| iPhone 12 Pro | 390×844 pt (1170×2532 px @3x) |
| iPhone 12 | 390×844 pt (1170×2532 px @3x) |
| iPhone 12 mini | 360×780 pt (1080×2340 px @3x) |
| iPhone 11 Pro Max | 414×896 pt (1242×2688 px @3x) |
| iPhone 11 Pro | 375×812 pt (1125×2436 px @3x) |
| iPhone 11 | 414×896 pt (828×1792 px @2x) |
| iPhone XS Max | 414×896 pt (1242×2688 px @3x) |
| iPhone XS | 375×812 pt (1125×2436 px @3x) |
| iPhone XR | 414×896 pt (828×1792 px @2x) |
| iPhone X | 375×812 pt (1125×2436 px @3x) |
| iPhone 8 Plus | 414×736 pt (1080×1920 px @3x) |
| iPhone 8 | 375×667 pt (750×1334 px @2x) |
| iPhone 7 Plus | 414×736 pt (1080×1920 px @3x) |
| iPhone 7 | 375×667 pt (750×1334 px @2x) |
| iPhone 6s Plus | 414×736 pt (1080×1920 px @3x) |
| iPhone 6s | 375×667 pt (750×1334 px @2x) |
| iPhone 6 Plus | 414×736 pt (1080×1920 px @3x) |
| iPhone 6 | 375×667 pt (750×1334 px @2x) |
| iPhone SE 4.7-inch | 375×667 pt (750×1334 px @2x) |
| iPhone SE 4-inch | 320×568 pt (640×1136 px @2x) |
| iPod touch 5th gen+ | 320×568 pt (640×1136 px @2x) |

*Hinweis (Apple): Alle Skalierungsfaktoren in dieser Tabelle sind UIKit-Skalierungsfaktoren, die von den nativen Skalierungsfaktoren abweichen können.*

**iOS, iPadOS device size classes** — *regular* = größerer Screen/Landscape, *compact* = kleinerer Screen/Portrait:
- **Alle gelisteten iPad-Modelle** (Pro 12.9″, Pro 11″, Pro 10.5″, Air 13″, Air 11″, 11″, 9.7″, mini 7.9″) sind in **beiden** Orientierungen durchgehend „Regular width, regular height".
- **iPhone-Modelle variieren:** alle Portrait = „Compact width, regular height". Landscape unterscheidet sich nach Gerätegröße — größere „Plus/Max/Air/Pro Max"-Modelle werden Landscape zu „Regular width, compact height" (z.B. iPhone 17 Pro Max, 16 Pro Max, 16 Plus, 15 Pro Max, 15 Plus, 14 Pro Max, 14 Plus, 13 Pro Max, 12 Pro Max, 11 Pro Max, XS Max, XR, 8 Plus, 7 Plus, 6s Plus), alle anderen (Standard/Pro/mini/e-Modelle, z.B. 17 Pro, 17, Air, 16 Pro, 16, 16e, 15 Pro, 15, 14 Pro, 14, 13 Pro, 13, 13 mini, 12 Pro, 12, 12 mini, 11 Pro, XS, X, 8, 7, 6s, SE) bleiben Landscape „Compact width, compact height".

**watchOS device screen dimensions:**

| Series | Size | Width (px) | Height (px) |
|---|---|---|---|
| Ultra (3rd gen) | 49mm | 422 | 514 |
| 10, 11 | 42mm | 374 | 446 |
| 10, 11 | 46mm | 416 | 496 |
| Ultra (1st/2nd gen) | 49mm | 410 | 502 |
| 7, 8, 9 | 41mm | 352 | 430 |
| 7, 8, 9 | 45mm | 396 | 484 |
| 4, 5, 6, SE (alle Gen.) | 40mm | 324 | 394 |
| 4, 5, 6, SE (alle Gen.) | 44mm | 368 | 448 |
| 1, 2, 3 | 38mm | 272 | 340 |
| 1, 2, 3 | 42mm | 312 | 390 |

#### Change log (Apple)
| Datum | Änderung |
|---|---|
| September 9, 2025 | Added specifications for iPhone 17, iPhone Air, iPhone 17 Pro, iPhone 17 Pro Max, Apple Watch SE 3, Apple Watch Series 11, and Apple Watch Ultra 3. |
| June 9, 2025 | Added guidance for Liquid Glass. |
| March 7, 2025 | Added specifications for iPhone 16e, iPad 11-inch, iPad Air 11-inch, and iPad Air 13-inch. |
| September 9, 2024 | Added specifications for iPhone 16, iPhone 16 Plus, iPhone 16 Pro, iPhone 16 Pro Max, and Apple Watch Series 10. |
| June 10, 2024 | Made minor corrections and organizational updates. |
| February 2, 2024 | Enhanced guidance for avoiding system controls in iPadOS app layouts, and added specifications for 10.9-inch iPad Air and 8.3-inch iPad mini. |
| December 5, 2023 | Clarified guidance on centering content in a visionOS window. |
| September 15, 2023 | Added specifications for iPhone 15 Pro Max, iPhone 15 Pro, iPhone 15 Plus, iPhone 15, Apple Watch Ultra 2, and Apple Watch SE. |
| June 21, 2023 | Updated to include guidance for visionOS. |
| September 14, 2022 | Added specifications for iPhone 14 Pro Max, iPhone 14 Pro, iPhone 14 Plus, iPhone 14, and Apple Watch Ultra. |

#### Erste Beobachtungen (unbestätigt, zur späteren Diskussion — noch kein Mapping)
- **Größter direkter Praxisnutzen dieses gesamten Abschnitts:** die iOS/iPadOS-Device-Dimensions-Tabelle ist eine unmittelbar verwendbare Referenz für unsere responsive Test-Matrix (Safe-Area-Arbeit aus dem `NAV_LAYOUT_AUDIT.md` der 28.08.-Session, `min-h-dvh`-Umstellung) — z.B. kleinster aktueller Screen (iPhone SE 4.7″/16e-Familie, 375–390pt Breite) vs. größter (iPad Pro 13″, 1032pt Breite) als bewusste Test-Eckpunkte, statt beliebiger Breakpoints.
- **"Avoid full-width buttons" (iOS)** steht in möglicher Spannung zu eigenen Full-Width-CTA-Buttons im Repo (z.B. Lernplan-Kalender-Export-Button, ProModal-Checkout-Button, laut CLAUDE.md-Session-Log bewusst "volle Breite") — Apples Regel ist aber nicht absolut ("wenn nötig, mit Hardware-Randkurve harmonisieren"), eher ein Hinweis für den Audit als ein Hard-Stop.
- **tvOS-Safe-Area (60pt/80pt) und Grid-Werte** — nicht relevant (kein tvOS-Target), der Vollständigkeit halber erfasst; die restlichen Spaltenzahl-Tabs (Three- bis Nine-column) waren im PDF nicht mit eigenen Werten gerendert (gleiches Tab-Capture-Limit wie bei Typography/SF Symbols).
- **visionOS 60pt-Button-Mittelpunkt-Abstand** — nicht relevant (kein visionOS-Target), erfasst.
- **"Convertible tab bar" (iPadOS, Sidebar⇄Tab-Bar je nach Fensterbreite)** — interessantes Zukunftsmuster, falls DailyStudent je eine echte iPad-optimierte Breitbild-Navigation bekommt (aktuell: `DesktopSidebar`/`BottomNav` als zwei getrennte, media-query-gesteuerte Komponenten, kein automatisches Umschalten zur Laufzeit bei Fenster-Resize) — kein akuter Bedarf, nur als Muster vorgemerkt.
- **Size-Classes-Konzept (regular/compact) selbst** ist 1:1 auf CSS-Breakpoints übertragbar (unsere bestehenden Mobile/Desktop-Zweige in `App.tsx`/Tailwind-`md:`-Präfixe sind im Kern dieselbe Idee, nur ohne Apples exakte Begriffe) — eher Bestätigung des bisherigen Ansatzes als Änderungsbedarf.
- **Device-Tabelle veraltet planmäßig weiter** — Apple ergänzt sie jährlich um neue iPhone-/Apple-Watch-Modelle (siehe Change-Log-Frequenz); für exakte Aktualität bei neuen Geräte-Generationen ggf. gezielt nachfragen statt sich allein auf diesen Stand (September 2025) zu verlassen.

#### Mapping (bestätigt 31.08.2026)

**Bestätigt ohne Änderung:** Safe-Area-Handling ist bereits in 50 Dateien vorhanden, `NAV_LAYOUT_AUDIT.md` (28.08.2026-Session) hat bereits einen dedizierten Audit-Pass dazu gemacht. Simon: „layout is good if you say so - just make sure everything is consistent." Kein neuer Grundsatz-Audit — Verifikation, dass `NAV_LAYOUT_AUDIT.md`s Befunde noch aktuell sind, reicht.

---

### Typography

**Quelle:** `developer.apple.com/design/human-interface-guidelines/typography` · PDF geliefert 30.08.2026 · Zuletzt von Apple aktualisiert 16. Dezember 2025 ("Added emphasized weights to the Dynamic Type style specifications for each platform")

#### Überblick
> Your typographic choices can help you display legible text, convey an information hierarchy, communicate important content, and express your brand or style.

#### Ensuring legibility
- **Use font sizes that most people can read easily.** People need to be able to read your content at various viewing distances and under a variety of conditions. Follow the recommended default and minimum text sizes for each platform — for both custom and system fonts. Font weight impacts legibility too — a custom font with a thin weight should aim larger than the recommended sizes.

| Platform | Default size | Minimum size |
|---|---|---|
| iOS, iPadOS | 17 pt | 11 pt |
| macOS | 13 pt | 10 pt |
| tvOS | 29 pt | 23 pt |
| visionOS | 17 pt | 12 pt |
| watchOS | 16 pt | 12 pt |

- **Test legibility in different contexts.** E.g. test game text on each platform it runs on. If text is difficult to read: use a larger type size, increase contrast (text/background color), or use typefaces designed for optimized legibility like the system fonts.
- **In general, avoid light font weights.** For system-provided fonts: prefer Regular, Medium, Semibold, or Bold; avoid Ultralight, Thin, and Light — difficult to see, especially at small sizes.

#### Conveying hierarchy
- **Adjust font weight, size, and color as needed to emphasize important information and help people visualize hierarchy.** Maintain the relative hierarchy and visual distinction of text elements when people adjust text sizes.
- **Minimize the number of typefaces you use, even in a highly customized interface.** Mixing too many typefaces can obscure your information hierarchy, hinder readability, and make an interface feel internally inconsistent or poorly designed.
- **Prioritize important content when responding to text-size changes.** Not all content is equally important — when someone picks a larger text size, they typically want the content they care about easier to read, not every word on screen bigger. Example: tab titles in a tabbed window don't need to grow with body text; a game's transient hit-damage values matter less than character dialog.

#### Using system fonts
Apple provides two typeface families with an extensive range of weights, sizes, styles, and languages:
- **San Francisco (SF)** — sans serif family: SF Pro, SF Compact, SF Arabic, SF Armenian, SF Georgian, SF Hebrew, SF Mono variants. SF Pro/Compact/Arabic/Armenian/Georgian/Hebrew also available in **rounded variants** (soft/rounded UI elements or an alternative typographic voice).
- **New York (NY)** — serif family, designed to work well alone or alongside SF fonts.

Both are provided in the **variable font format** (combines styles in one file, supports interpolation between styles). Variable fonts support **optical sizing** — system fonts support *dynamic optical sizes*, merging discrete sizes (Text/Display) and weights into one continuous design, letting the system interpolate each glyph precisely to the point size (no need to manually pick a discrete optical size unless your design tool lacks variable-font support).

System fonts span **Ultralight to Black** weights, and SF additionally offers **Condensed and Expanded** widths. Because SF Symbols use equivalent weights, precise weight matching between symbols and adjacent text is achievable regardless of size/style.

**Text styles** — the system defines typographic attributes combining font weight, point size, and leading per text size (e.g. the *body* style supports comfortable multi-line reading; the *headline* style distinguishes a heading from surrounding content). Together they form a typographic hierarchy, and they **scale proportionately** when people change system text size or turn on accessibility adjustments like Larger Text.

- **Consider using the built-in text styles.** Convenient, consistent way to convey information hierarchy through font size/weight; ensures Dynamic Type + larger accessibility type size support.
- **Modify the built-in text styles if necessary.** *Symbolic traits* let you adjust some aspects — e.g. the **bold** trait adds weight for another hierarchy level. Traits can also adjust **leading**: looser leading in wide columns/long passages helps people keep their place line to line; **tighter leading** helps text fit in height-constrained areas (e.g. a list row) — but avoid tight leading once you need 3+ lines, even under height constraints.
- *Developer note:* use `Font.Design` constants (`.default`, `.serif`, etc.) to access system fonts — don't embed system fonts in your app.
- **If necessary, adjust tracking in interface mockups.** In a running app the system font dynamically adjusts tracking at every point size — for an accurate mockup you generally don't need a discrete optical size, but you might need to adjust tracking manually (see Tracking values below).

#### Using custom fonts
- **Make sure custom fonts are legible.** Be guided by the recommended minimum font sizes for various styles/weights (see Specifications).
- **Implement accessibility features for custom fonts.** System fonts auto-support Dynamic Type and features like Bold Text — a custom font must implement the same behaviors. In Unity-based games, use Apple's Unity plug-ins for Dynamic Type, or otherwise let players adjust text size some other way.

#### Supporting Dynamic Type
> Dynamic Type is a system-level feature in iOS, iPadOS, tvOS, visionOS, and watchOS that lets people adjust the size of visible text on their device to ensure readability and comfort.

- **Make sure your app's layout adapts to all font sizes.** Turn on Larger Accessibility Text Sizes (Settings → Accessibility → Display & Text Size → Larger Text) and confirm the app stays comfortably readable.
- **Increase the size of meaningful interface icons as font size increases.** SF Symbols scale automatically with Dynamic Type changes.
- **Keep text truncation to a minimum as font size increases.** Aim to show as much useful text at the largest accessibility size as at the largest standard size. Avoid truncating text in scrollable regions unless a separate view lets people read the rest.
- **Consider adjusting your layout at large font sizes.** In horizontally constrained contexts, inline items (glyphs, timestamps) and container boundaries can crowd/truncate/overlap text — consider a stacked layout (text above secondary items). Multicolumn text gets less readable at large sizes too — reduce column count as font size increases.
- **Maintain a consistent information hierarchy regardless of the current font size.** E.g. keep primary elements toward the top of a view even at very large font sizes.

#### Platform considerations

**iOS, iPadOS** — SF Pro is the system font; apps can also use NY.

**macOS** — SF Pro is the system font; NY is available for Mac apps built with Mac Catalyst. **macOS doesn't support Dynamic Type.**
- **When necessary, use dynamic system font variants to match the text in standard controls** — gives text the same look/feel as system-provided controls:

| Dynamic font variant | API |
|---|---|
| Control content | `controlContentFont(ofSize:)` |
| Label | `labelFont(ofSize:)` |
| Menu | `menuFont(ofSize:)` |
| Menu bar | `menuBarFont(ofSize:)` |
| Message | `messageFont(ofSize:)` |
| Palette | `paletteFont(ofSize:)` |
| Title | `titleBarFont(ofSize:)` |
| Tool tips | `toolTipsFont(ofSize:)` |
| Document text (user) | `userFont(ofSize:)` |
| Monospaced document text (user fixed pitch) | `userFixedPitchFont(ofSize:)` |
| Bold system font | `boldSystemFont(ofSize:)` |
| System font | `systemFont(ofSize:)` |

**tvOS** — SF Pro is the system font; apps can also use NY.

**visionOS** — SF Pro is the system font; if you use NY, you need to specify the type styles you want. visionOS uses **bolder versions of the Dynamic Type body and title styles**, and introduces **Extra Large Title 1** and **Extra Large Title 2** for wide, editorial-style layouts.
- **In general, prefer 2D text.** The more visual depth text characters have, the harder they are to read — a small amount of 3D text can be fun, but content people need to read/understand should have little or no visual depth.
- **Make sure text looks good and remains legible when people scale it.** Pick a text style that looks good at full scale, then test legibility at different scales.
- **Maximize the contrast between text and the background of its container.** System defaults to white text because it contrasts strongly with the default background material — test any custom color in a variety of contexts.
- **If you need to display text that's not on a background, consider making it bold to improve legibility** — generally avoid shadows for contrast here: there may be no visual surface to cast an accurate shadow on, and shadow size/density can't be predicted for a person's current Environment.
- **Keep text facing people as much as possible.** Text tied to a point in space (e.g. a label on a 3D object) generally needs *billboarding* — rotating to keep facing the wearer regardless of movement, or it becomes unreadable from oblique angles.

**watchOS** — SF Compact is the system font; apps can also use NY. **In complications, watchOS uses SF Compact Rounded.**

#### Specifications

**Emphasized weights** — symbolic traits let you display an emphasized variant of a text style (SwiftUI `bold()`, UIKit `traitBold`). Emphasized weight can be Medium, Semibold, Bold, or Heavy depending on the style — see the "Emphasized weight" column in every table below.

**iOS, iPadOS Dynamic Type sizes** — Apples Seite zeigt die Größenstufen als Tab-Umschalter (`xSmall · Small · Medium · Large (Default) · xLarge · xxLarge · xxxLarge`); im gelieferten PDF-Export war nur der Tab **xSmall** aktiv gerendert — **Large ist die eigentliche Default-Stufe, ihre Werte liegen uns aus diesem Export nicht vor** (bei Bedarf von Simon separat als eigener Tab exportierbar).

*xSmall:*

| Style | Weight | Size (pt) | Leading (pt) | Emphasized weight |
|---|---|---|---|---|
| Large Title | Regular | 31 | 38 | Bold |
| Title 1 | Regular | 25 | 31 | Bold |
| Title 2 | Regular | 19 | 24 | Bold |
| Title 3 | Regular | 17 | 22 | Semibold |
| Headline | Semibold | 14 | 19 | Semibold |
| Body | Regular | 14 | 19 | Semibold |
| Callout | Regular | 13 | 18 | Semibold |
| Subhead | Regular | 12 | 16 | Semibold |
| Footnote | Regular | 12 | 16 | Semibold |
| Caption 1 | Regular | 11 | 13 | Semibold |
| Caption 2 | Regular | 11 | 13 | Semibold |

*Point size based on image resolution of 144 ppi for @2x and 216 ppi for @3x designs.*

**iOS, iPadOS larger accessibility type sizes** — Tabs `AX1–AX5`, im PDF nur **AX1** gerendert:

| Style | Weight | Size (pt) | Leading (pt) | Emphasized weight |
|---|---|---|---|---|
| Large Title | Regular | 44 | 52 | Bold |
| Title 1 | Regular | 38 | 46 | Bold |
| Title 2 | Regular | 34 | 41 | Bold |
| Title 3 | Regular | 31 | 38 | Semibold |
| Headline | Semibold | 28 | 34 | Semibold |
| Body | Regular | 28 | 34 | Semibold |
| Callout | Regular | 26 | 32 | Semibold |
| Subhead | Regular | 25 | 31 | Semibold |
| Footnote | Regular | 23 | 29 | Semibold |
| Caption 1 | Regular | 22 | 28 | Semibold |
| Caption 2 | Regular | 20 | 25 | Semibold |

**macOS built-in text styles** (kein Tab-Umschalter — macOS unterstützt kein Dynamic Type, eine feste Tabelle):

| Text style | Weight | Size (pt) | Line height (pt) | Emphasized weight |
|---|---|---|---|---|
| Large Title | Regular | 26 | 32 | Bold |
| Title 1 | Regular | 22 | 26 | Bold |
| Title 2 | Regular | 17 | 22 | Bold |
| Title 3 | Regular | 15 | 20 | Semibold |
| Headline | Bold | 13 | 16 | Heavy |
| Body | Regular | 13 | 16 | Semibold |
| Callout | Regular | 12 | 15 | Semibold |
| Subheadline | Regular | 11 | 14 | Semibold |
| Footnote | Regular | 10 | 13 | Semibold |
| Caption 1 | Regular | 10 | 13 | Medium |
| Caption 2 | Medium | 10 | 13 | Semibold |

*Point size based on image resolution of 144 ppi for @2x designs.*

**tvOS built-in text styles** *(im PDF nur bis „Callout" sichtbar erfasst — Tabelle ggf. unvollständig gegenüber Apples Live-Seite, bei Bedarf erneut exportieren):*

| Text style | Weight | Size (pt) | Leading (pt) | Emphasized weight |
|---|---|---|---|---|
| Title 1 | Medium | 76 | 96 | Bold |
| Title 2 | Medium | 57 | 66 | Bold |
| Title 3 | Medium | 48 | 56 | Bold |
| Headline | Medium | 38 | 46 | Bold |
| Subtitle 1 | Regular | 38 | 46 | Medium |
| Callout | Medium | 31 | 38 | Bold |

**watchOS Dynamic Type sizes** — Tabs `xSmall · Small · Large · xLarge · xxLarge · xxxLarge`, im PDF nur **xSmall** gerendert:

| Style | Weight | Size (pt) | Leading (pt) | Emphasized weight |
|---|---|---|---|---|
| Large Title | Regular | 30 | 32.5 | Bold |
| Title 1 | Regular | 28 | 30.5 | Semibold |
| Title 2 | Regular | 24 | 26.5 | Semibold |
| Title 3 | Regular | 17 | 19.5 | Semibold |
| Headline | Semibold | 14 | 16.5 | Semibold |
| Body | Regular | 14 | 16.5 | Semibold |
| Caption 1 | Regular | 13 | 15.5 | Semibold |
| Caption 2 | Regular | 12 | 14.5 | Semibold |
| Footnote 1 | Regular | 11 | 13.5 | Semibold |
| Footnote 2 | Regular | 10 | 12.5 | Semibold |

**watchOS larger accessibility type sizes** — Tabs `AX1–AX3`, im PDF nur **AX1** gerendert:

| Style | Weight | Size (pt) | Leading (pt) | Emphasized weight |
|---|---|---|---|---|
| Large Title | Regular | 44 | 46.5 | Bold |
| Title 1 | Regular | 42 | 44.5 | Semibold |
| Title 2 | Regular | 34 | 41 | Semibold |
| Title 3 | Regular | 24 | 26.5 | Semibold |
| Headline | Semibold | 21 | 23.5 | Semibold |
| Body | Regular | 21 | 23.5 | Semibold |
| Caption 1 | Regular | 18 | 20.5 | Semibold |
| Caption 2 | Regular | 17 | 19.5 | Semibold |
| Footnote 1 | Regular | 16 | 18.5 | Semibold |
| Footnote 2 | Regular | 15 | 17.5 | Semibold |

#### Tracking values

Apple definiert für seine variablen Systemfonts pro Punktgröße einen exakten Tracking-Wert (in 1/1000 em UND in Punkten) — kein manuelles Kerning-Judgment, sondern eine feste Kurve. **Tab-Hinweis wie oben:** die Quellseite bietet je Plattform die Tabs `SF Pro · SF Pro Rounded · New York` (iOS/iPadOS/visionOS) bzw. `SF Compact · SF Compact Rounded` (watchOS); im PDF-Export war jeweils nur der erste Tab aktiv — **SF Pro Rounded und New York liegen uns nicht vor.**

**SF Pro** — Werte sind laut Cross-Check über die iOS-, macOS- und tvOS-Kopien der Tabelle **identisch** (gilt für iOS, iPadOS, visionOS, macOS, tvOS):

| Größe (pt) | Tracking (1/1000 em) | Tracking (pt) |
|---|---|---|
| 6 | +41 | +0.24 |
| 7 | +34 | +0.23 |
| 8 | +26 | +0.21 |
| 9 | +19 | +0.17 |
| 10 | +12 | +0.12 |
| 11 | +6 | +0.06 |
| 12 | 0 | 0.0 |
| 13 | −6 | −0.08 |
| 14 | −11 | −0.15 |
| 15 | −16 | −0.23 |
| 16 | −20 | −0.31 |
| 17 | −26 | −0.43 |
| 18 | −25 | −0.44 |
| 19 | −24 | −0.45 |
| 20 | −23 | −0.45 |
| 21 | −18 | −0.36 |
| 22 | −12 | −0.26 |
| 23 | −4 | −0.10 |
| 24 | +3 | +0.07 |
| 25 | +6 | +0.15 |
| 26 | +8 | +0.22 |
| 27 | +11 | +0.29 |
| 28 | +14 | +0.38 |
| 29 | +14 | +0.40 |
| 30 | +14 | +0.40 |
| 31 | +13 | +0.39 |
| 32 | +13 | +0.41 |
| 33 | +12 | +0.40 |
| 34 | +12 | +0.40 |
| 35 | +11 | +0.38 |
| 36 | +10 | +0.37 |
| 38 | +10 | +0.37 |
| 40 | +10 | +0.37 |
| 44 | +8 | +0.37 |
| 48 | +8 | +0.35 |
| 52 | +6 | +0.31–0.33* |
| 56 | +6 | +0.30 |
| 60 | +4 | +0.26 |
| 64 | +4 | +0.22 |
| 68 | +2 | +0.17 |
| 72 | +2 | +0.14 |
| 76 | +1 | +0.07 |
| 80–96 | 0 | 0 |

*\*Kleine Inkonsistenz zwischen den Quell-Kopien bei genau 52pt/53pt (0.31 vs. 0.33 je nach Plattform-Tabelle, vermutlich ein Export-Artefakt in einer der Kopien) — für exakte Werte in diesem Bereich Apples Live-Seite gegenprüfen, nicht kritisch für unsere CSS-Anwendung. Zwischenwerte (37, 39, 41–43, 45–47, 49–51, 53–55, 57–59, 61–63, 65–67, 69–71, 73–75, 77–79, 81–95) folgen im Original einer 1er-Schrittweite und liegen zwischen den hier gezeigten Ankerwerten — volle Tabelle bei Bedarf im Quell-PDF nachschlagen, hier auf die für CSS-Entscheidungen relevanten Wendepunkte verdichtet.*

**SF Compact / SF Compact Rounded (watchOS)** — deutlich aggressivere negative Tracking-Kurve bei großen Größen als SF Pro:

| Größe (pt) | Tracking (1/1000 em) | Tracking (pt) |
|---|---|---|
| 6 | +50 | +0.29 |
| 8 | +30 | +0.23 |
| 10 | +30 | +0.29 |
| 12 | +20 | +0.23 |
| 14 | +14 | +0.19 |
| 16 | 0 | 0.00 |
| 18 | −8 | −0.14 |
| 20 | 0 | 0.00 |
| 22 | −4 | −0.09 |
| 24 | −8 | −0.19 |
| 26 | −11 | −0.28 |
| 28 | −12 | −0.34 |
| 30 | −14 | −0.42 |
| 32 | −16 | −0.50 |
| 34 | −18 | −0.60 |
| 36 | −20 | −0.69 |
| 40 | −20 | −0.78 |
| 44 | −20 | −0.86 |
| 48 | −20 | −0.96 |
| 52 | −21 | −1.07 |
| 56 | −22 | −1.20 |
| 60 | −22 | −1.32 |
| 64 | −23 | −1.44 |
| 68 | −24 | −1.56 |
| 72 | −24 | −1.69 |
| 76 | −25 | −1.86 |
| 80 | −26 | −1.99 |
| 88 | −26 | −2.28 |
| 96 | −28 | −2.62 |

*Auffällig: bei 19pt (−12/−0.22) → 20pt (0/0.00) → 21pt (−2/−0.04) macht die Kurve einen Sprung zurück auf 0 — im Original so vorgefunden, vermutlich eine bewusste optische Übergangsgrenze zwischen zwei Optical-Size-Bereichen im Variable-Font, keine Auslassung unsererseits.*

#### Change log (Apple)
| Datum | Änderung |
|---|---|
| December 16, 2025 | Added emphasized weights to the Dynamic Type style specifications for each platform. |
| March 7, 2025 | Expanded guidance for Dynamic Type. |
| June 10, 2024 | Added guidance for using Apple's Unity plug-ins to support Dynamic Type in a Unity-based game and enhanced guidance on billboarding in a visionOS app or game. |
| September 12, 2023 | Added artwork illustrating system font weights, and clarified tvOS specification table descriptions. |
| June 21, 2023 | Updated to include guidance for visionOS. |

#### Erste Beobachtungen (unbestätigt, zur späteren Diskussion — noch kein Mapping)
- **Größte direkte Kollision mit unserem bestehenden System:** CLAUDE.md „Design-Prinzipien" definiert bereits eine eigene Typografie-Hierarchie (Screen-Titel 28px/700, Section-Label 12px/600, Card-Titel 15–16px/700, Card-Subtitle 12–13px/400–500, Metric groß 28–34px/900) UND eine Minimum-Textgröße-Regel („Text ≥ 10px, Haupttext ≥ 13px"). Apples eigene Minimum/Default-Werte für iOS/iPadOS sind **17pt Default / 11pt Minimum** — unsere „≥10px"-Untergrenze liegt tatsächlich LOCKERER als Apples absolutes 11pt-Minimum (10 < 11 — unsere Regel erlaubt kleinere Schrift, als Apple als absolute Untergrenze empfiehlt). **Korrektur gegenüber einer früheren Notiz in dieser Datei (dort stand die Richtung versehentlich umgekehrt):** Apples 11pt ist die strengere/höhere Untergrenze, unsere 10px die laxere. **Entschieden (31.08.2026, im Rahmen des Accessibility-Mappings):** Untergrenze wird von 10px auf 11px angehoben, um exakt auf Apples Minimum zu matchen — siehe Accessibility-Abschnitt „Mapping" oben.
- **Unsere App nutzt vermutlich KEINE echten San-Francisco-Variable-Fonts** (Web-App, WebView-Wrapper) — sondern entweder System-UI-Font-Stacks (`-apple-system` in CSS lädt auf iOS tatsächlich SF Pro, aber OHNE Apples eigene dynamische Tracking-Interpolation, da Browser eigenes Kerning/Letter-Spacing anwenden) oder eine Web-Font. **Zu verifizieren:** welche Font(s) aktuell tatsächlich in `index.css`/Tailwind-Config eingestellt sind, bevor die Tracking-Tabellen oben in konkrete `letter-spacing`-CSS-Werte übersetzt werden.
- **Tracking-Kurve als übertragbares CSS-Prinzip (unabhängig von exakten Werten):** Apples Kurve ist bei kleinen Größen (Captions, ~6–11pt) deutlich **positiv/gelockert** (bis zu +0.29pt) und bei großen Headlines (~17–23pt) am **negativsten/engsten** (bis −0.45pt), danach bei sehr großen Display-Größen (44pt+) wieder Richtung 0 gehend. Direkt übertragbares CSS-Prinzip unabhängig von Apples exakten Werten: kleine UI-Labels/Captions bekommen ein leicht positives `letter-spacing` (lockerer, lesbarer bei kleiner Größe), große Headlines ein leicht negatives (kompakter, weniger "ausgefranst") — aktuell in unserem CSS vermutlich nirgends bewusst gesetzt, guter Audit-Kandidat.
- **"Avoid light font weights" (Ultralight/Thin/Light)** — Kandidat für Grep-Audit: `font-light`/`font-thin` Tailwind-Klassen im Repo suchen und gegen Textgröße prüfen (laut Apple v.a. bei kleinem Text problematisch).
- **macOS "no Dynamic Type" + Dynamic-Font-Variant-API-Tabelle** — nicht direkt relevant für uns (kein natives macOS-Target), nur der Vollständigkeit halber miterfasst.
- **visionOS-Spezifika (Billboarding, 2D-Text-Präferenz, kein Schatten für Kontrast)** — nicht relevant, kein visionOS-Target, vollständigkeitshalber extrahiert.
- **Emphasized-Weight-Konzept (z.B. Body: Regular→Semibold als "emphasized" statt gleich auf Bold zu springen)** — direkt interessant für unsere bestehende Typografie-Tabelle, die aktuell nur einen festen Weight pro Rolle kennt (z.B. Card-Titel immer 700). Ein Zwischenschritt (Semibold als „emphasized Body" statt direkt Bold) könnte feinere Hierarchie-Abstufungen ermöglichen, ohne gleich auf die nächste Größenstufe zu springen.

#### Mapping (bestätigt 31.08.2026)

**Font-Family bereits korrekt, keine Änderung nötig:** `index.css` setzt bereits `-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', system-ui, sans-serif` — auf Apple-Geräten rendert das bereits echtes San Francisco. `.section-label` nutzt bereits `font-size: 11px`, trifft also schon die neue Untergrenze.

**Bestätigt:** Text-Untergrenze auf 11px angehoben (siehe Accessibility-Mapping), sonst keine Änderung — Simon: „typography stick to your suggestion."

### Icons (Interface-Icons / Glyphs)

**Quelle:** `developer.apple.com/design/human-interface-guidelines/icons` · PDF geliefert 30.08.2026 · Zuletzt von Apple aktualisiert 9. Juni 2025 ("Added a table of SF Symbols that represent common actions") · **Wichtige Präzisions-Klarstellung:** Das ist eine DRITTE, eigenständige Apple-HIG-Seite — verschieden von „App Icons" (Home-Screen-/App-Store-Icon-Design, eigener Abschnitt oben) UND von „SF Symbols" (Apples Icon-Bibliothek/Rendering-System, eigener Abschnitt direkt im Anschluss unten). Diese Seite behandelt **allgemeine Gestaltungsregeln für Interface-Icons/Glyphs** (die kleinen Symbole in Toolbars/Buttons/Menüs) plus eine konkrete Standard-Aktion↔SF-Symbol-Zuordnungstabelle.

#### Überblick
> An effective icon is a graphic asset that expresses a single concept in ways people instantly understand.
>
> Apps and games use a variety of simple icons to help people understand the items, actions, and modes they can choose. Unlike app icons, which can use rich visual details like shading, texturing, and highlighting to evoke the app's personality, an interface icon typically uses streamlined shapes and touches of color to communicate a straightforward idea.
>
> You can design interface icons — also called *glyphs* — or you can choose symbols from the SF Symbols app, using them as-is or customizing them to suit your needs. Both interface icons and symbols use black and clear colors to define their shapes; the system can apply other colors to the black areas in each image.

#### Best practices
- **Create a recognizable, highly simplified design.** Zu viele Details machen ein Interface-Icon verwirrend/unlesbar. Einfaches, universelles Design anstreben, das die meisten Menschen sofort erkennen — am besten funktionieren Icons mit vertrauten visuellen Metaphern, die direkt mit der ausgelösten Aktion/dem repräsentierten Content zusammenhängen.
- **Maintain visual consistency across all interface icons in your app.** Egal ob nur Custom-Icons oder eine Mischung aus Custom + System: alle Interface-Icons brauchen konsistente Größe, Detailgrad, Strichstärke (Weight) und Perspektive. Je nach visuellem Gewicht eines Icons ggf. dessen Dimensionen anpassen, um visuelle Konsistenz mit anderen Icons zu erreichen.
- **In general, match the weights of interface icons and adjacent text.** Außer man will bewusst Icons ODER Text hervorheben — gleiches Gewicht für beide gibt dem Content ein konsistentes Erscheinungsbild/Betonungsniveau.
- **If necessary, add padding to a custom interface icon to achieve optical alignment.** Manche (besonders asymmetrische) Icons wirken bei geometrischer Zentrierung unausgewogen. Beispiel: ein Download-Icon mit mehr visuellem Gewicht unten als oben wirkt bei geometrischer Zentrierung zu niedrig platziert — Position leicht anpassen bis optisch zentriert, Anpassung als Padding ins Asset selbst einbacken, damit geometrisches Zentrieren des Assets automatisch optisch zentriert wirkt. Anpassungen sind typischerweise sehr klein, können aber großen visuellen Effekt haben.
- **Provide a selected-state version of an interface icon only if necessary.** Bei Standard-System-Komponenten (Toolbars, Tab-Bars, Buttons) nicht nötig — das System aktualisiert die Selected-State-Optik automatisch (Beispiel: ausgewähltes Icon in einer Toolbar bekommt automatisch die App-Akzentfarbe).
- **Use inclusive images.** Geschlechtsneutrale menschliche Figuren bevorzugen, Bilder vermeiden, die kulturell/sprachlich schwer erkennbar sind.
- **Include text in your design only when it's essential for conveying meaning.** Beispiel: ein Zeichen für Textformatierung kann der direkteste Weg sein, ein Konzept zu kommunizieren. Einzelne Zeichen im Icon müssen lokalisiert werden (Beispiel-Bild: dasselbe „character"-Icon in Latin/Arabic/Bengali/Gujarati/Hebrew/Hindi/Japanese/Kannada). Für angedeutete Textpassagen: abstrakte Repräsentation designen + eine gespiegelte Version für RTL-Kontexte (Beispiel: „text.page"-Icon in Left-to-Right- und Right-to-Left-Version).
- **If you create a custom interface icon, use a vector format like PDF or SVG.** System skaliert vektorbasierte Interface-Icons automatisch für High-Resolution-Displays — keine separaten High-Res-Versionen nötig. PNG (genutzt für App-Icons/Bilder mit Shading/Texturen/Highlights) unterstützt kein Scaling, braucht also mehrere Versionen pro Icon. Alternative: ein Custom SF Symbol mit passender Scale erstellen, damit die Symbol-Emphase zum benachbarten Text passt.
- **Provide alternative text labels for custom interface icons.** Nicht sichtbare Accessibility-Beschreibungen lassen VoiceOver den Screen-Inhalt audibel beschreiben.
- **Avoid using replicas of Apple hardware products.** Hardware-Designs ändern sich häufig und lassen Interface-Icons/Content schnell veraltet wirken. Falls Apple-Hardware nötig: nur Bilder aus Apple Design Resources oder repräsentierende SF Symbols nutzen.

#### Standard icons
> For icons to represent common actions in menus, toolbars, buttons, and other places in interfaces across Apple platforms, you can use these SF Symbols.

Vollständige Aktion↔Symbol-Zuordnungstabelle, nach Kategorie:

**Editing**

| Action | Symbol name |
|---|---|
| Cut | `scissors` |
| Copy | `document.on.document` |
| Paste | `document.on.clipboard` |
| Done / Save | `checkmark` |
| Cancel / Close | `xmark` |
| Delete | `trash` |
| Undo | `arrow.uturn.backward` |
| Redo | `arrow.uturn.forward` |
| Compose | `square.and.pencil` |
| Duplicate | `plus.square.on.square` |
| Rename | `pencil` |
| Move to / Folder | `folder` |
| Attach | `paperclip` |
| Add | `plus` |
| More | `ellipsis` |

**Selection**

| Action | Symbol name |
|---|---|
| Select | `checkmark.circle` |
| Deselect / Close | `xmark` |
| Delete | `trash` |

**Text formatting**

| Action | Symbol name |
|---|---|
| Superscript | `textformat.superscript` |
| Subscript | `textformat.subscript` |
| Bold | `bold` |
| Italic | `italic` |
| Underline | `underline` |
| Align Left | `text.alignleft` |
| Center | `text.aligncenter` |
| Justified | `text.justify` |
| Align Right | `text.alignright` |

**Search**

| Action | Symbol name |
|---|---|
| Search | `magnifyingglass` |
| Find / Find and Replace / Find Next / Find Previous / Use Selection for Find | `text.page.badge.magnifyingglass` |
| Filter | `line.3.horizontal.decrease` |

**Sharing and exporting**

| Action | Symbol name |
|---|---|
| Share / Export | `square.and.arrow.up` |
| Print | `printer` |

**Users and accounts**

| Action | Symbol name |
|---|---|
| Account / User / Profile | `person.crop.circle` |

**Ratings**

| Action | Symbol name |
|---|---|
| Dislike | `hand.thumbsdown` |
| Like | `hand.thumbsup` |

**Layer ordering**

| Action | Symbol name |
|---|---|
| Bring to Front | `square.3.layers.3d.top.filled` |
| Send to Back | `square.3.layers.3d.bottom.filled` |
| Bring Forward | `square.2.layers.3d.top.filled` |
| Send Backward | `square.2.layers.3d.bottom.filled` |

**Other**

| Action | Symbol name |
|---|---|
| Alarm | `alarm` |
| Archive | `archivebox` |
| Calendar | `calendar` |

#### Platform considerations
*No additional considerations for iOS, iPadOS, tvOS, visionOS, or watchOS.*

**macOS — Document icons** *(vollständigkeitshalber extrahiert, geringe Relevanz für DailyStudent — keine natives macOS-Dokument-Handling geplant):*
- Traditionelle Form: Papier-Blatt mit umgeknickter oberer rechter Ecke — hilft, Dokumente von Apps/anderem Content zu unterscheiden, auch bei kleinen Icon-Größen.
- Ohne eigenes Dokument-Icon generiert macOS automatisch eins durch Kompositierung von App-Icon + Datei-Erweiterung auf die Canvas.
- Custom Document Icon = Kombination aus **Background Fill**, **Center Image** und **Text** — System layert/positioniert/maskiert automatisch auf die bekannte Blatt-Form. Apple Design Resources liefert eine Vorlage.
  - **Design simple images that clearly communicate the document type.** Unkomplizierte Formen + reduzierte, distinkte Farbpalette — Dokument-Icon kann so klein wie 16×16px angezeigt werden.
  - **Designing a single, expressive image for the background fill can be a great way to help people understand and recognize a document type.** Beispiel: Xcode/TextEdit nutzen reichhaltige Background-Images ohne Center-Image.
  - **Consider reducing complexity in the small versions of your document icon.** Details, die in großen Versionen klar sind, wirken in kleinen Versionen unscharf — bei sehr kleinen Größen (16×16px) ggf. Details/Linien komplett weglassen.
  - **Avoid placing important content in the top-right corner of your background fill.** System maskiert dort automatisch die umgeknickte weiße Ecke. Background-Image-Größen: 512×512px @1x/1024×1024px @2x, 256×256px @1x/512×512px @2x, 128×128px @1x/256×256px @2x, 32×32px @1x/64×64px @2x, 16×16px @1x/32×32px @2x.
  - **Center Image** (optional, für ein erkennbares Objekt, das den Dokumenttyp/die App-Verbindung zeigt): misst die Hälfte der Gesamt-Icon-Canvas. Größen: 256×256px @1x/512×512px @2x, 128×128px @1x/256×256px @2x, 32×32px @1x/64×64px @2x, 16×16px @1x/32×32px @2x.
  - **Define a margin that measures about 10% of the image canvas and keep most of the image within it.** Bild sollte ca. 80% der Canvas einnehmen (Beispiel: bei 256×256px-Canvas passt das Bild größtenteils in einen ca. 205×205px-Bereich).
  - **Specify a succinct term if it helps people understand your document type.** Standardmäßig zeigt das System die Datei-Erweiterung am unteren Rand — bei unbekannter Erweiterung einen beschreibenderen Begriff liefern (Beispiel: „scene" statt „scn" für SceneKit-Dateien). System skaliert den Text automatisch, komplett großgeschrieben per Default — kurzen, bei kleinen Größen lesbaren Begriff wählen.

#### Resources — Related
App icons, SF Symbols · Video: „Designing Glyphs"

#### Change log (Apple)
| Datum | Änderung |
|---|---|
| June 9, 2025 | Added a table of SF Symbols that represent common actions. |
| June 21, 2023 | Updated to include guidance for visionOS. |

#### Erste Beobachtungen (unbestätigt, zur späteren Diskussion — noch kein Mapping)
- **Direkt der praktischste Abschnitt für unser Icon-System bisher:** Die Standard-Aktion↔Symbol-Tabelle oben ist eine unmittelbar nutzbare Referenz für Namenskonventionen/Bedeutungszuordnung, auch OHNE echte SF Symbols einzubetten (siehe SF-Symbols-Abschnitt unten zur Lizenz-Einschränkung) — z.B. könnten unsere eigenen handgeschriebenen SVG-Icon-Dateinamen (`CoinIcon.tsx`, `SubjectIcon.tsx`, etc.) sich an Apples semantischen Namen orientieren (`trash` für Löschen, `checkmark.circle` für Auswählen, `square.and.arrow.up` für Teilen) statt an Ad-hoc-Namen — reine Konsistenz-/Wiedererkennbarkeits-Frage, kein Lizenzproblem, da nur der NAME/das KONZEPT übernommen wird, nicht Apples Glyphen-Zeichnung selbst.
- **"Optical vs. geometric centering" (Padding-Prinzip)** — direkt übertragbar auf unsere eigenen SVGs: bei asymmetrischen Icons (z.B. ein Pfeil- oder Badge-Icon) lohnt sich eine Prüfung, ob geometrisches Zentrieren tatsächlich optisch ausgewogen wirkt.
- **"Match icon weight to adjacent text weight"** — deckt sich exakt mit der bereits im SF-Symbols-Abschnitt notierten „Weight-Matching"-Beobachtung — jetzt doppelt bestätigt als wiederkehrendes Apple-Prinzip, kein Einzelfall.
- **PDF/SVG statt PNG für Interface-Icons** — wir nutzen laut vorheriger Session bereits ausschließlich handgeschriebene Inline-SVGs, also schon konform mit dieser Regel.
- **macOS-Dokument-Icon-Sektion** — nicht relevant (kein natives Dokument-Handling in DailyStudent), der Vollständigkeit halber transkribiert.
- **"Selected-state only if necessary" + automatische Akzentfarbe in Toolbars** — Kandidat für den späteren Icons-Audit: prüfen, ob wir aktuell manuell doppelte Icon-Varianten (selected/unselected) pflegen, wo eine reine Farb-/Opacity-Änderung ausgereicht hätte.

#### Mapping (bestätigt 31.08.2026)

**Struktur bereits korrekt:** beide bestehenden Icon-Systeme (`GradientIcon` in `KlausurphasenScreen.tsx`, `SubjectIcon.tsx`) rendern Glyphen bereits weiß auf Farbverlauf — deckt sich mit „Icon = weiß, Farbe = Hintergrund" ohne Änderungsbedarf. Was sich ändert, ist ausschließlich die Farbpalette selbst — siehe Color-Mapping oben (Apple-exakte Werte außer PMG, kein Braun/Amber mehr).

**Namenskonvention als lose Inspiration, nicht bindend:** Apples Standard-Aktion↔Symbol-Tabelle (`trash`, `checkmark.circle`, `square.and.arrow.up` etc.) bleibt ein guter Referenzpunkt für zukünftige eigene SVG-Dateinamen, aber kein aktiver Umbenennungs-Auftrag in dieser Runde.

**Kein Änderungsbedarf sonst:** PDF/SVG-Vektorformat bereits Standard (Inline-SVGs), keine Apple-Hardware-Repliken im Einsatz, macOS-Dokument-Icons nicht relevant.

### Icons (SF Symbols / In-App-Iconografie)

**Quelle:** `developer.apple.com/design/human-interface-guidelines/sf-symbols` · PDF geliefert 30.08.2026 · Zuletzt von Apple aktualisiert 28. Juli 2025 ("Draw animations and gradient rendering in SF Symbols 7") — dritte, eigenständige Apple-Seite, weder „App Icons" (Home-Screen-Icon-Design) noch „Icons — Interface-Icons/Glyphs" (allgemeine Icon-Regeln, direkt oben) — diese Seite behandelt spezifisch Apples Symbol-Bibliothek: Rendering-Modes, Weights/Scales, Animationen, Custom-Symbol-Erstellung.

#### Überblick
> SF Symbols provides thousands of consistent, highly configurable symbols that integrate seamlessly with the San Francisco system font, automatically aligning with text in all weights and sizes.
>
> You can use a symbol to convey an object or concept wherever interface icons can appear, such as in toolbars, tab bars, context menus, and within text.
>
> Availability of individual symbols and features varies based on the version of the system you're targeting. Symbols and symbol features introduced in a given year aren't available in earlier operating systems.
>
> Visit SF Symbols to download the app and browse the full set of symbols. Be sure to understand the terms and conditions for using SF Symbols, including **the prohibition against using symbols — or images that are confusingly similar — in app icons, logos, or any other trademarked use.**

#### Rendering modes
> SF Symbols provides four rendering modes — monochrome, hierarchical, palette, and multicolor — that give you multiple options when applying color to symbols.

Ein Symbol besteht aus Layern (Beispiel `cloud.sun.rain.fill`: Primary = Wolke, Secondary = Sonne+Strahlen, Tertiary = Regentropfen).

- **Monochrome** — Applies one color to all layers in a symbol. Within a symbol, paths render in the color you specify or as a transparent shape within a color-filled path.
- **Hierarchical** — Applies one color to all layers in a symbol, varying the color's opacity according to each layer's hierarchical level.
- **Palette** — Applies two or more colors to a symbol, using one color per layer. Specifying only two colors for a symbol that defines three levels of hierarchy means the secondary and tertiary layers use the same color.
- **Multicolor** — Applies intrinsic colors to some symbols to enhance meaning. For example, the `leaf` symbol uses green to reflect the appearance of leaves in the physical world, whereas `trash.slash` uses red to signal data loss. Some multicolor symbols include layers that can receive other colors.

Regardless of rendering mode, **using system-provided colors ensures that symbols automatically adapt to accessibility accommodations and appearance modes like vibrancy and Dark Mode.**

- **Confirm that a symbol's rendering mode works well in every context.** Symbol size and background contrast affect how well different rendering modes read. The automatic setting gives a symbol's preferred rendering mode, but check whether a different mode improves legibility in a specific place.

#### Gradients
> In SF Symbols 7 and later, gradient rendering generates a smooth linear gradient from a single source color. You can use gradients across all rendering modes for both system and custom colors and for custom symbols. Gradients render for symbols of any size, but look best at larger sizes.

#### Variable color
> With variable color, you can represent a characteristic that can change over time — like capacity or strength — regardless of rendering mode. To visually communicate such a change, variable color applies color to different layers of a symbol as a value reaches different thresholds between zero and 100 percent.

Beispiel `speaker.wave.3`: mappt die drei Wellen-Layer auf Dezibel-Schwellenwerte — bei keinem Ton bekommt keine Welle Farbe, bei steigender Lautstärke füllt sich eine weitere Welle. Einzelne Layer können bewusst von Variable Color ausgenommen werden (der Lautsprecher-Pfad selbst ändert sich nicht mit der Lautstärke).

- **Use variable color to communicate change — don't use it to communicate depth.** To convey depth and visual hierarchy, use Hierarchical rendering mode to elevate certain layers and distinguish foreground and background elements in a symbol.

#### Weights and scales
> SF Symbols provides symbols in a wide range of weights and scales to help you create adaptable designs.

- **Neun Symbol-Weights** — von Ultralight bis Black, entsprechen je einem San-Francisco-Systemfont-Gewicht → präzises Weight-Matching zwischen Symbolen und benachbartem Text.
- **Drei Scales** — Small, Medium (Default), Large, relativ zur Cap-Height des Systemfonts definiert. Eine Scale zu wählen erlaubt, ein Symbols Emphasis gegenüber benachbartem Text anzupassen, **ohne das Weight-Matching bei gleicher Punktgröße zu stören.**

#### Design variants
> SF Symbols defines several design variants — such as fill, slash, and enclosed — that can help you communicate precise states and actions while maintaining visual consistency and simplicity in your UI. For example, you could use the slash variant of a symbol to show that an item or action is unavailable, or use the fill variant to indicate selection.

- **Outline** — häufigste Variante, keine Solid-Flächen, ähnelt Text-Erscheinung.
- **Fill** — Flächen innerhalb mancher Formen solid gefüllt.
- **Slash** und **Enclosed** (Kreis/Quadrat/Rechteck als Umschließung) — kombinierbar mit Outline oder Fill.
- SF Symbols bietet zusätzlich viele **sprach-/schriftsystemspezifische Varianten** (Latin, Arabic, Hebrew, Hindi, Thai, Chinese, Japanese, Korean, Cyrillic, Devanagari, mehrere indische Zahlensysteme) — passen sich automatisch an die Gerätesprache an.

**Einsatzempfehlungen:**
- **The outline variant works well in toolbars, lists, and other places where you display a symbol alongside text.**
- **Symbols that use an enclosing shape — like a square or circle — can improve legibility at small sizes.**
- **The solid areas in a fill variant tend to give a symbol more visual emphasis**, making it a good choice for iOS tab bars and swipe actions and places where you use an accent color to communicate selection.
- In vielen Fällen bestimmt die anzeigende View selbst Outline vs. Fill (z.B. iOS-Tab-Bar bevorzugt Fill, eine Toolbar nimmt Outline) — keine explizite Wahl nötig.

#### Animations
> SF Symbols provides a collection of expressive, configurable animations that enhance your interface and add vitality to your app. Symbol animations help communicate ideas, provide feedback in response to people's actions, and signal changes in status or ongoing activities.

Funktionieren auf allen SF Symbols, in allen Rendering-Modes/Weights/Scales, und auf Custom Symbols. Playback steuerbar (einmal durchlaufen oder wiederholen bis eine Bedingung erfüllt ist), Geschwindigkeit/Reverse-vor-Wiederholung anpassbar.

- **Appear** — Causes a symbol to gradually emerge into view.
- **Disappear** — Causes a symbol to gradually recede out of view.
- **Bounce** — Briefly scales a symbol with an elastic-like movement that goes either up or down and then returns to the symbol's initial state. Plays once by default; can help communicate that an action occurred or needs to take place.
- **Scale** — Changes the size of a symbol, increasing or decreasing its scale. Unlike bounce, the scale animation **persists** until you set a new scale or remove the effect. Useful to draw attention to a selected item or as feedback when people choose a symbol.
- **Pulse** — Varies the opacity of a symbol over time. Automatically pulses only layers annotated to pulse (optionally all layers). Useful to communicate ongoing activity, played continuously until a condition is met.
- **Variable color (Animation)** — Incrementally varies the opacity of layers within a symbol. Kann *cumulative* sein (Farbänderungen bleiben pro Layer bestehen bis der Zyklus komplett ist) oder *iterative* (Farbänderungen passieren einen Layer nach dem anderen). Für Progress/laufende Aktivität (Playback, Connecting, Broadcasting). Autoreverse möglich; inaktive Layer können statt reduzierter Opacity komplett ausgeblendet werden. Layer-Anordnung bestimmt das Verhalten: **open loop** (linear, Start-/Endpunkt treffen sich nicht) vs. **closed loop** (geschlossene Form wie ein kreisförmiger Progress-Indikator — nahtlose, kontinuierliche Wiedergabe).
- **Replace** — Replaces one symbol with another, funktioniert zwischen beliebigen Symbolen, über alle Weights/Rendering-Modes hinweg. Drei Konfigurationen:
  - *Down-up* — outgoing symbol scales down, incoming symbol scales up → kommuniziert einen Statuswechsel.
  - *Up-up* — beide Symbole scalen hoch → kommuniziert einen Statuswechsel mit Vorwärts-Fortschritts-Gefühl.
  - *Off-up* — outgoing symbol verschwindet sofort, incoming symbol scaled hoch → betont den nächsten verfügbaren Status/Aktion.
- **Magic Replace** — Performs a smart transition between two symbols with related shapes (z.B. Slashes zeichnen sich ein/aus, Badges erscheinen/verschwinden unabhängig vom Basis-Symbol). **Ist der neue Default** für Replace, greift aber nur zwischen verwandten Symbolen — bei unverwandten Symbolen fällt es auf Down-up zurück (custom Fallback-Richtung wählbar).
- **Wiggle** — Moves the symbol back and forth along a directional axis. Für Call-to-Actions, die leicht übersehen werden, oder um eine Richtung zu verstärken (z.B. ein Pfeil).
- **Breathe** — Smoothly increases and decreases the presence of a symbol, giving it a living quality. Ähnlich Pulse, aber Breathe ändert **Opacity UND Größe** (Pulse nur Opacity) — für Statuswechsel oder laufende Aktivität wie eine Aufnahme.
- **Rotate** — Rotates the symbol as visual indicator oder um reales Objektverhalten nachzuahmen (z.B. laufender Task). Manche Symbole rotieren komplett, andere nur bestimmte Teile (Desk-Fan-Symbol: nur die Flügel rotieren, „By Layer"-Option).
- **Draw On / Draw Off** *(SF Symbols 7+)* — Draws the symbol along a path through a set of guide points, entweder von offscreen nach onscreen (Draw On) oder umgekehrt (Draw Off). Alle Layer gleichzeitig, gestaffelt, oder Layer für Layer. Für Progress (z.B. Download) oder um die Bedeutung eines Symbols zu verstärken (z.B. Richtungspfeil).

**Best practices für Animationen:**
- **Apply symbol animations judiciously.** No limit on how many animations you can add to a view, but too many can overwhelm an interface and distract people.
- **Make sure that animations serve a clear purpose in communicating a symbol's intent.** Consider how people might interpret an animated symbol and whether the animation (or combination) might be confusing.
- **Use symbol animations to communicate information more efficiently.** Provide visual feedback reinforcing that something happened, present complex information simply without taking up visual space.
- **Consider your app's tone when adding animations.** Think about what the animation conveys and how it aligns with your brand identity and app's overall style and tone.

#### Custom symbols
> If you need a symbol that SF Symbols doesn't provide, you can create your own. To create a custom symbol, first export the template for a symbol that's similar to the design you want, then use a vector-editing tool to modify it.

> **Important:** SF Symbols includes copyrighted symbols that depict Apple products and features. You can display these symbols in your app, but you can't customize them. To help you identify a noncustomizable symbol, the SF Symbols app badges it with an Info icon; to help you use the symbol correctly, the inspector pane describes its usage restrictions.

Über *annotating* lässt sich jedem Layer eines Custom Symbols eine Farbe oder ein Hierarchie-Level (primary/secondary/tertiary) zuweisen — je nach unterstützten Rendering-Modes kann pro Instanz ein anderer Mode genutzt werden.

- **Use the template as a guide.** Create a custom symbol that's consistent with system-provided ones in level of detail, optical weight, alignment, position, and perspective. Strive to design a symbol that is: **Simple · Recognizable · Inclusive · Directly related to the action or content it represents.**
- **Assign negative side margins to your custom symbol if necessary.** Hilft bei optischer horizontaler Ausrichtung, wenn ein Symbol durch ein Badge o.ä. breiter wird (z.B. eine Reihe Ordner-Symbole, manche mit Badge). Naming-Pattern für Margin-Konfigurationen: z.B. "left-margin-Regular-M".
- **Optimize layers to use animations with custom symbols.** Layer im SF-Symbols-App annotieren, wenn Layer-basierte Animation gewünscht ist. Z-Order bestimmt Farb-Anwendungsreihenfolge bei Variable-Color-Symbolen (front-to-back oder back-to-front animierbar); Layer-Gruppen können sich gemeinsam bewegen.
- **Test animations for custom symbols.** Formen/Pfade können sich in Bewegung anders verhalten als erwartet — mit ganzen Formen zeichnen statt Cutouts (Beispiel `person.2.fill`: volle Form der linken Person zeichnen + versetzten Pfad der rechten Person als *erase layer* annotieren, um den Zwischenraum darzustellen und Layer-Infos für Animationen zu erhalten).
- **Avoid making custom symbols that include common variants, such as enclosures or badges.** Die Component Library der SF-Symbols-App bietet dafür bereits fertige, konsistente Varianten.
- **Provide alternative text labels for custom symbols.** Accessibility-Beschreibungen lassen VoiceOver sichtbare UI/Content beschreiben.
- **Don't design replicas of Apple products.** Urheberrechtlich geschützt — auch Symbole, die SF Symbols als Apple-Feature/Produkt-Repräsentation identifiziert, dürfen nicht angepasst werden.

#### Platform considerations
*No additional considerations for iOS, iPadOS, macOS, tvOS, visionOS, or watchOS.*

#### Change log (Apple)
| Datum | Änderung |
|---|---|
| July 28, 2025 | Updated with guidance for Draw animations and gradient rendering in SF Symbols 7. |
| June 10, 2024 | Updated with guidance for new animations and features of SF Symbols 6. |
| June 5, 2023 | Added a new section on animations. Included animation guidance for custom symbols. |
| September 14, 2022 | Added a new section on variable color. Removed instructions on creating custom symbol paths, exporting templates, and layering paths, deferring to developer articles that cover these topics. |

#### Erste Beobachtungen (unbestätigt, zur späteren Diskussion — noch kein Mapping)
- **Größter struktureller Punkt, direkt aus der 30.08.2026-Session bereits vorab notiert:** DailyStudent hat **kein Icon-Library-Dependency** (kein lucide-react/heroicons/etc., verifiziert per `package.json`+Grep) — alle Icons sind handgeschriebene Inline-SVGs (`CoinIcon.tsx`, `SubjectIcon.tsx`, etc.). SF Symbols selbst (die echten Glyphen/die Font) sind laut den Nutzungsbedingungen auf native Apple-Plattform-Software beschränkt und lassen sich vermutlich **nicht legal in eine WebView-gerenderte Web-App einbetten**. Der richtige Übernahme-Weg ist, SF Symbols' **Gestaltungsprinzipien** auf unsere eigenen SVGs anzuwenden, nicht SF Symbols selbst einzubetten — siehe unten für konkrete übertragbare Prinzipien.
- **Was OHNE echte SF-Symbols-Engine trotzdem 1:1 auf unsere SVGs übertragbar ist:** (1) **Weight-Matching** — unsere Icon-Strichstärke sollte zum Gewicht des begleitenden Texts passen (z.B. dünnere Strokes neben `font-light`-Text, kräftigere neben `font-bold`); (2) **Hierarchical-Opacity-Prinzip** — mehrschichtige Icons (z.B. ein Icon mit Badge) könnten die Badge-Schicht bei geringerer Opacity zeichnen statt gleicher Deckkraft wie das Basis-Icon, für Tiefe ohne neue Farbe; (3) **Outline in Listen/Toolbars, Fill für Selektion/Tab-Bar/Swipe-Actions** — deckt sich bereits mit gängiger Praxis, aber jetzt als explizite Apple-Regel bestätigbar, z.B. für `LernzettelRow`s Swipe-Actions (Stern/Papierkorb) oder eine künftige Bottom-Nav-Politur (siehe To-Do „Bottom Nav Colour anpassen").
- **Animationsvokabular (Bounce/Pulse/Breathe/Wiggle/Rotate/Replace) ist eine direkt nutzbare Namens-Referenz** für `framer-motion`-Arbeit, unabhängig vom fehlenden SF-Symbols-Rendering — z.B. könnte der `CoinIcon` beim Coin-Erhalt einen "Bounce" statt eines generischen Scale-Tweens bekommen, oder das Streak-🔥-Pill bei einem neuen Meilenstein ein "Pulse". Direkt anschlussfähig an den bereits installierten `emil-design-eng`/`animation-vocabulary`-Skill.
- **Simon hat eine stehende Anweisung gegeben: keine Emojis mehr irgendwo in der App** (siehe CLAUDE.md, 30.08.2026-Session) — dieser SF-Symbols-Abschnitt liefert die eigentliche Zielästhetik dafür: konsistente, monochrome/hierarchische Linien-Icons statt bunter Emojis. Erster grober Grep-Fund aus der Vorsession: Emoji-artige UI-Elemente in 22 Dateien unter `src/screens/` + 5 unter `src/components/` (noch keine vollständige Liste). Kandidat für den Icons-Audit-Schritt, sobald Mapping bestätigt ist.
- **Gradient-Rendering (SF Symbols 7)** — unser bestehendes „Gradient-Icons"-Pattern aus CLAUDE.md („`w-11 h-11 rounded-[14px]`, Weiß auf Gradient") ist konzeptionell bereits nah an diesem Apple-Prinzip (Farbverlauf statt Flat-Color für mehr Tiefe) — eher Bestätigung als Änderungsbedarf.
- **Tap-Target-Frage aus dem Accessibility-Abschnitt bleibt verknüpft:** kleine Icon-Buttons (z.B. `.icon-expand-btn`) sollten gegen die dortige 44×44pt-Regel geprüft werden, nicht nur gegen SF-Symbols-Scale-Empfehlungen.

#### Mapping (bestätigt 31.08.2026)

**Bestätigt, keine Umsetzungsänderung nötig:** echte SF-Symbols-Glyphen bleiben lizenzbedingt außen vor — nur die Gestaltungsprinzipien (Weight-Matching, Hierarchical-Opacity, Outline-vs-Fill-Kontext, Animationsvokabular) fließen in unsere eigenen SVGs ein, wie bereits in der Erste-Beobachtungen-Liste festgehalten. Emoji-Elimination und Reduce-Motion-Vollcheck bleiben Audit-Phase-Arbeit (Schritt 4), keine offene Mapping-Frage mehr.

### Motion

**Quelle:** `developer.apple.com/design/human-interface-guidelines/motion` · PDF geliefert 30.08.2026 · Zuletzt von Apple aktualisiert 9. September 2025 ("Added guidance for Liquid Glass")

#### Überblick
> Beautiful, fluid motions bring the interface to life, conveying status, providing feedback and instruction, and enriching the visual experience of your app or game.
>
> Many system components automatically include motion, letting you offer familiar and consistent experiences throughout your app or game. System components might also adjust their motion in response to factors like accessibility settings or different input methods. For example, the movement of Liquid Glass responds to direct touch interaction with greater emphasis to reinforce the feeling of a tactile experience, but produces a more subdued effect when a person interacts using a trackpad.
>
> If you design custom motion, follow the guidelines below.

#### Best practices
- **Add motion purposefully, supporting the experience without overshadowing it.** Don't add motion for the sake of adding motion. Gratuitous or excessive animation can distract people and may make them feel disconnected or physically uncomfortable.
- **Make motion optional.** Not everyone can or wants to experience the motion in your app or game, so it's essential to avoid using it as the only way to communicate important information. To help everyone enjoy your app or game, supplement visual feedback by also using alternatives like haptics and audio to communicate.

#### Providing feedback
- **Strive for realistic feedback motion that follows people's gestures and expectations.** In nongame apps, accurate, realistic motion can help people understand how something works, but feedback motion that doesn't make sense can make them feel disoriented. For example, if someone reveals a view by sliding it down from the top, they don't expect to dismiss the view by sliding it to the side.
- **Aim for brevity and precision in feedback animations.** When animated feedback is brief and precise, it tends to feel lightweight and unobtrusive, and it can often convey information more effectively than prominent animation. For example, when a game displays a succinct animation that's precisely tied to a successful action, players can instantly get the message without being distracted from their gameplay. Another example is in visionOS: when people tap a panorama in Photos, it quickly and smoothly expands to fill the space in front of them, helping them track the transition without making them wait to enjoy the content.
- **In apps, generally avoid adding motion to UI interactions that occur frequently.** The system already provides subtle animations for interactions with standard interface elements. For a custom element, you generally want to avoid making people spend extra time paying attention to unnecessary motion every time they interact with it.
- **Let people cancel motion.** As much as possible, don't make people wait for an animation to complete before they can do anything, especially if they have to experience the animation more than once.
- **Consider using animated symbols where it makes sense.** When you use SF Symbols 5 or later, you can apply animations to SF Symbols or custom symbols. *(Details siehe eigener „SF Symbols"-Abschnitt unten → Animations.)*
- **Make sure your game's motion looks great by default on each platform you support.** In most games, maintaining a consistent frame rate of 30 to 60 fps typically results in a smooth, visually appealing experience. For each platform you support, use the device's graphics capabilities to enable default settings that let people enjoy your game without first having to change those settings. *(Game-spezifisch, geringe Relevanz für DailyStudent.)*
- **Let people customize the visual experience of your game to optimize performance or battery life.** For example, consider letting people switch between power modes when the system detects the presence of an external power source. *(Game-spezifisch, geringe Relevanz für DailyStudent.)*

#### Platform considerations
*No additional considerations for iOS, iPadOS, macOS, or tvOS.*

**visionOS** — Motion ist hier potenziell ein großer Teil der Erfahrung, deshalb entscheidend, Ablenkung/Verwirrung/Unwohlsein zu vermeiden *(vollständigkeitshalber extrahiert — kein visionOS-Target für DailyStudent):*
- **As much as possible, avoid displaying motion at the edges of a person's field of view.** People can be particularly sensitive to motion in their peripheral vision — it can be distracting and cause discomfort by making people feel like they or their surroundings are moving. If needed, keep the moving object's brightness similar to the rest of the visible content.
- **Help people remain comfortable when showing the movement of large virtual objects.** Increasing translucency or lowering contrast makes movement less disorienting when an object fills a lot of the field of view. *Note: People can experience discomfort even when they're the ones moving a large virtual object, such as a window — consider also keeping a window's size fairly small.*
- **Consider using fades when you need to relocate an object.** Fade an object out before moving it and fade it back in after it's in the new location, if the movement itself doesn't communicate anything useful.
- **In general, avoid letting people rotate a virtual world.** Upsets people's sense of stability even when subtle and user-controlled. Prefer instantaneous directional changes during a quick fade-out.
- **Consider giving people a stationary frame of reference.** Movement contained within a non-moving area is easier to handle than movement of the entire surrounding area (which can make people feel unwell — e.g. a game that automatically moves a player through space).
- **Avoid showing objects that oscillate in a sustained way.** Particularly avoid an oscillation frequency of around 0.2 Hz — people can be very sensitive to it. If unavoidable, keep amplitude low and consider translucency.

**watchOS**
> SwiftUI provides a powerful and streamlined way to add motion to your app. If you need to use WatchKit to animate layout and appearance changes — or create animated image sequences — see WKInterfaceImage.
>
> Note: All layout- and appearance-based animations automatically include built-in easing that plays at the start and end of the animation. You can't turn off or customize easing.

#### Change log (Apple)
| Datum | Änderung |
|---|---|
| September 9, 2025 | Added guidance for Liquid Glass. |
| June 10, 2024 | Added game-specific examples and enhanced guidance for using motion in games. |
| February 2, 2024 | Enhanced guidance for minimizing peripheral motion in visionOS apps. |
| June 21, 2023 | Updated to include guidance for visionOS. |

#### Erste Beobachtungen (unbestätigt, zur späteren Diskussion — noch kein Mapping)
- **Deckt sich fast wörtlich mit dem bereits installierten `emil-design-eng`-Skill/Simons bestehender Praxis** — "brief and precise feedback", "let people cancel motion", "avoid motion on frequent interactions" sind exakt die Prinzipien hinter `RouteFade` (180ms, kein Bounce), `ModusRegler`s Spring (0.2–0.22 bounce, dezent) und dem generellen `active:scale-[0.98]`-Pattern aus CLAUDE.md „Design-Prinzipien". Kein Widerspruch gefunden — eher eine Bestätigung des bisherigen Kurses.
- **"Let people cancel motion" / nicht auf Animationsende warten müssen, besonders bei wiederholter Erfahrung** — Kandidat für den späteren Audit: alle mehrstufigen Flows mit Übergangsanimation (Onboarding, Lernplan-Konfigurator-Schritte, `ModusRegler`) gegenprüfen, ob eine Animation blockierend ist (Button erst nach Animationsende klickbar) oder man durchtappen kann.
- **Liquid-Glass-Touch-vs-Trackpad-Differenzierung** ist ein rein natives System-Verhalten (WebView kann das nicht replizieren) — nur relevant, falls/wenn der native SwiftUI-Rewrite (siehe CLAUDE.md „Zukunftsvision") stattfindet, aktuell nicht umsetzbar im Wrapper.
- **0.2 Hz Oszillations-Warnung (visionOS)** — nicht direkt relevant (kein visionOS-Target), aber als generelles Prinzip interessant für jede "atmende"/pulsierende UI-Animation (z.B. falls ein Pulse-Effekt auf den Streak-Pill oder das Coin-Icon erwogen wird) — sehr langsame, sustained Oszillation lieber vermeiden/dezent halten.

#### Mapping (bestätigt 31.08.2026)

**Bestätigt:** `useReducedMotion()` wird von aktuell 4 auf alle 15 Dateien mit `framer-motion`-Nutzung ausgeweitet. Bereits korrekt: `App.tsx` (`RouteFade`), `ModusRegler.tsx`, `ProfilCoinsScreen.tsx`, `OnboardingScreen.tsx`. Fehlend, u.a.: `LernzettelRow` (in `LernzettelScreen.tsx`), `StreakInfoSheet`, `CoinToast`.

---

### Branding

**Quelle:** `developer.apple.com/design/human-interface-guidelines/branding` · PDF geliefert 31.08.2026 · **12. und letztes Thema — von Simon bestätigt** ("no there is actually only 12, heres the last"). Kein Change-Log-Abschnitt auf dieser Apple-Seite vorhanden (Stand dieses PDF-Exports, kürzeste der 12 gelieferten Seiten, 2 Seiten).

#### Überblick
> Apps and games express their unique brand identity in ways that make them instantly recognizable while feeling at home on the platform and giving people a consistent experience.
>
> In addition to expressing your brand in your app icon and throughout your experience, you have several opportunities to highlight it within the App Store. For guidance, see App Store Marketing Guidelines.

#### Best practices
- **Use your brand's unique voice and tone in all the written communication you display.** Beispiel: eine Marke kann Ermutigung/Optimismus vermitteln durch einfache Worte, gelegentliche Ausrufezeichen und Emoji, sowie simple Satzstrukturen.
- **Consider choosing an accent color.** Auf den meisten Plattformen lässt sich eine Farbe festlegen, die das System auf App-Elemente wie Interface-Icons, Buttons und Text anwendet. In macOS können Menschen ihre eigene Akzentfarbe wählen, die das System anstelle der von der App festgelegten Farbe nutzen kann. → siehe eigener Color-Abschnitt oben.
- **Consider using a custom font.** Wenn die Marke stark mit einer bestimmten Schriftart verbunden ist: sicherstellen, dass sie bei allen Größen lesbar ist und Accessibility-Features wie Bold Text und größere Schriftgrößen unterstützt. Guter Ansatz: Custom Font für Headlines/Subheadings, System-Font für Fließtext/Captions — Systemfonts sind für optimale Lesbarkeit bei kleinen Größen designt. → siehe eigener Typography-Abschnitt oben.
- **Ensure branding always defers to content.** Bildschirmfläche für ein Element, das nur ein Marken-Asset zeigt, bedeutet weniger Platz für den Content, den Menschen tatsächlich wollen. Branding auf raffinierte, unaufdringliche Weise einbauen, die nicht vom eigentlichen Erlebnis ablenkt.
- **Help people feel comfortable by using standard patterns consistently.** Selbst ein stark stilisiertes Interface kann zugänglich wirken, wenn es vertraute Verhaltensweisen beibehält — z.B. UI-Komponenten an erwarteten Stellen platzieren, Standard-Symbole für gängige Aktionen nutzen.
- **Resist the temptation to display your logo throughout your app or game unless it's essential for providing context.** Menschen müssen selten daran erinnert werden, welche App sie gerade nutzen — meist ist es besser, den Platz für wertvolle Informationen/Controls zu nutzen.
- **Avoid using a launch screen as a branding opportunity.** Ein Launch-Screen minimiert die Startup-Erfahrung und gibt der App gleichzeitig etwas Zeit zum Laden von Ressourcen — er verschwindet zu schnell, um irgendeine Information zu vermitteln. Stattdessen ggf. einen Willkommens-/Onboarding-Screen mit Branding-Content zu Beginn der Erfahrung erwägen. → siehe Apples eigene Launch-Screens- und Onboarding-Guidelines (nicht Teil unserer bisherigen 12 PDFs).
- **Follow Apple's trademark guidelines.** Apple-Markenzeichen dürfen nicht im App-Namen oder in Bildern erscheinen. → siehe Apple Trademark List und Guidelines for Using Apple Trademarks (externe Apple-Ressourcen, nicht Teil unserer PDFs).

#### Platform considerations
*No additional considerations for iOS, iPadOS, macOS, tvOS, visionOS, or watchOS.*

#### Resources — Related
Marketing resources and identity guidelines, Show more with app previews, Color · Video: „Communicate your brand identity on iOS" (WWDC26)

#### Erste Beobachtungen (unbestätigt, zur späteren Diskussion — noch kein Mapping)
- **"Use your brand's unique voice and tone... occasional exclamation marks and emoji"** — steht in einer gewissen Spannung zu Simons eigener, stehender Anweisung „keine Emojis mehr irgendwo in der App" (siehe Icons-Abschnitte oben, 30.08.2026-Session). Wichtig, das sauber auseinanderzuhalten: Apple spricht hier von Emoji **in geschriebener Markenkommunikation** (Copy/Tonalität, z.B. Marketing-Texte, Onboarding-Sprache) als optionalem Stilmittel — nicht von Emoji **als UI-Icon-Ersatz** (das eigentliche Ziel von Simons Anweisung, siehe die dortige Grep-Liste betroffener Screens). Kein Widerspruch, aber beim Formulieren einer eigenen „keine Emojis"-Leitplanke in den Marken-Leitplanken unten präzise sein, WELCHEN Emoji-Einsatz die Regel meint.
- **Akzentfarben-Prinzip deckt sich mit dem bereits im Color-Abschnitt notierten macOS-App-Accent-Color-Mechanismus** — keine neue Erkenntnis, eher eine zweite Bestätigung aus einer anderen Apple-Seite.
- **"Custom font for headlines, system font for body copy"** — direkt interessant für unsere eigene Typografie-Entscheidung: aktuell nutzt DailyStudent vermutlich durchgehend denselben Font-Stack für alles (zu verifizieren) — dieses Prinzip liefert eine mögliche Begründung, warum ein Marken-Font (falls je gewünscht) nur für Screen-Titel/Card-Titel sinnvoll wäre, nie für Fließtext/Probeklausur-Inhalte.
- **"Resist displaying your logo throughout the app" + "avoid launch screen as branding opportunity"** — direkt relevant für die in der 27.07.2026-Session dokumentierte offene Baustelle „Landing Page als nativer App-Startbildschirm fühlt sich nicht wie Teil der App an" (siehe CLAUDE.md, „Zusätzlich notiert während TestFlight-Testing"): Apples Empfehlung deutet eher in Richtung eines kurzen, funktionalen Onboarding-/Welcome-Moments statt eines Marketing-lastigen ersten Eindrucks — passt zum dort bereits vermerkten Folgeschritt (Early-Access-Button aus der Top-Nav entfernen, "Jetzt starten" statt Marketing-Fokus).
- **Trademark-Hinweis** — rein rechtlich, keine Relevanz für unser eigenes Branding (betrifft nur die Verwendung VON Apple-Marken in unserer App, die wir nicht nutzen).
- **Kürzeste und am wenigsten technische der 12 Seiten** — kaum konkrete pt-Werte/APIs, eher grundsätzliche Produkt-/Tonalitäts-Prinzipien. Für die spätere Mapping-Phase vermutlich der Abschnitt mit dem geringsten direkten Code-Bezug, aber protokollarisch trotzdem vollständig, wie bei den anderen 11 Themen.

#### Mapping (bestätigt 31.08.2026)

**Status bereits weitgehend konform, kein Änderungsbedarf:** Logo-Einsatz ist sparsam (4 Dateien: `AuthScreen`, `TwoFactorVerifyScreen`, `DesktopSidebar` ×2) — keine Übersättigung. Launch-Screen zeigt nur das App-Icon (`launchAutoHide: false` + manueller Hide-Call), keine zusätzliche Branding-Fläche. Kein Custom-Font im Einsatz, daher auch keine Konflikt mit der „Custom Font nur für Headlines"-Regel.

**Einzige Nuance, festgehalten für später:** die Emoji-in-Markenstimme-vs-Emoji-als-UI-Icon-Unterscheidung (siehe Erste Beobachtungen oben) — wird bei Formulierung der finalen Marken-Leitplanken-Regel präzise gehalten, keine Code-Konsequenz jetzt.

---

### Charting Data

**Quelle:** `developer.apple.com/design/human-interface-guidelines/charting-data` · PDF geliefert 31.08.2026 · **13. Thema — nachträglich von Simon ergänzt** (war nicht Teil der ursprünglich angekündigten 12). Zuletzt von Apple aktualisiert 23. September 2022 ("New page") — seitdem unverändert, keine weitere Change-Log-Historie.

#### Überblick
> Presenting data in a chart can help you communicate information with clarity and appeal.
>
> Charts provide efficient ways to communicate complex information without requiring people to read and interpret a lot of text. The graphical nature of charts also gives you additional opportunities to express the personality of your experience and add visual interest to your interface.
>
> A chart can range from a simple graphic that provides glanceable information to a rich, interactive experience that can form the centerpiece of your app and encourage people to explore the data from various perspectives. Whether simple or complex, you can use charts to help people perform data-driven tasks that are important to them, such as:
> - Analyzing trends based on historical or predicted values
> - Visualizing the current state of a process, system, or quantity that changes over time
> - Evaluating different items — or the same item at different times — by comparing data across multiple categories
>
> Not every collection of data needs to be displayed in a chart. If you simply need to provide data — and you don't need to convey information about it or help people analyze it — consider offering the data in other ways, such as in a list or table that people can scroll, search, and sort.

#### Best practices
- **Use a chart when you want to highlight important information about a dataset.** Charts are visually prominent, so they tend to draw people's attention — nutze diese Prominenz, um klar zu kommunizieren, was Menschen aus den Daten lernen können, die ihnen wichtig sind.
- **Keep a chart simple, letting people choose when they want additional details.** Zu viele Daten machen ein Chart visuell überwältigend, verschleiern Beziehungen. Bei viel Content/Funktionalität: graduelles Enthüllen ermöglichen (z.B. Detailgrad/Teilmengen wählbar machen). Für interaktive Charts ggf. mehrere Versionen mit steigender Funktionalität anbieten, um das Erlernen zu erleichtern.
- **Make every chart in your app accessible.** Neben visuellen Beschreibungen sind Accessibility-Labels (beschreiben Werte/Komponenten) UND Accessibility-Elemente (ermöglichen Interaktion) entscheidend.
- **In general, prefer using common chart types.** Bar-/Line-Charts sind vertraut — erhöht die Wahrscheinlichkeit, dass Menschen das Chart direkt lesen können.
- **If you need to create a chart that presents data in a novel way, help people learn how to interpret the chart.** Beispiel: beim ersten Pairing von Watch+iPhone animiert Activity die Ringe einzeln, um zu zeigen, wie jeder Ring auf Move/Exercise/Stand-Metriken mappt.
- **Examine the data from multiple levels or perspectives to find details you can display to enhance the chart.** Makro-Ebene → High-Level-Summaries (Totals/Averages); Mid-Level → nützliche Teilmengen; individuelle Datenpunkte → Aufmerksamkeit auf spezifische Werte lenken.

#### Designing effective charts
- **Aid comprehension by adding descriptive text to the chart.** Titel/Untertitel/Annotationen betonen wichtigste Information, können Handlungsanweisungen hervorheben. Beispiel: Weather zeigt „Chance of light rain in the next hour" über der stündlichen 24h-Vorhersage-Liste. **Eine deskriptive Headline/Summary ersetzt NICHT Accessibility-Labels.**
- **Match the size of a chart to its functionality, topic, and level of detail.** Chart muss groß genug für Details + Interaktivität sein; für glanceable Info zu einem Einzelitem oder als Snapshot/Preview einer größeren Version reicht ein kleines Chart.
- **Prefer consistency across multiple charts, deviating only when you need to highlight differences.** Charts mit ähnlichem Zweck sollten nicht durch unterschiedlichen Typ/Stil als unzusammenhängend wirken — konsistenter visueller Ansatz lässt Gelerntes von einem Chart auf ein anderes übertragen. Unterschiedliche Typen/Stile nur einsetzen, um bedeutsame Unterschiede hervorzuheben.
- **Maintain continuity among multiple charts that use the same data.** Bei mehreren Charts, die denselben Datensatz aus verschiedenen Perspektiven zeigen: EIN Chart-Typ + konsistente Farben/Annotationen/Layouts/Beschreibungstext, um zu signalisieren, dass der Datensatz derselbe bleibt. Beispiel: Health Trends zeigt kleine Trend-Charts, die beim Aufklappen zur vollen Ansicht denselben Stil/Farben/Marks/Annotationen behalten, um die Beziehung zwischen den Versionen zu stärken.

#### Platform considerations
*No additional considerations for iOS, iPadOS, macOS, tvOS, visionOS, or watchOS.*

#### Resources — Related
Charts (Komponenten-Guidance) · Developer-Doku: Swift Charts · Videos: „Bring Swift Charts to the third dimension" (WWDC25), „Design app experiences with charts", „Design an effective chart"

#### Change log (Apple)
| Datum | Änderung |
|---|---|
| September 23, 2022 | New page. |

#### Erste Beobachtungen (unbestätigt, zur späteren Diskussion — noch kein Mapping)
- **Simons eigene Priorisierung beim Hinzufügen dieses Themas:** „ich interessiere mich nicht fürs Sammeln, sondern fürs korrekte Anzeigen der Daten" — das grenzt den Scope bewusst ein: es geht um die Chart-Darstellungsschicht (`InsightsScreen`, `KlausurphasenScreen`-Statistik-Widget), nicht um Daten-Aggregation/-Berechnung selbst.
- **"Prefer consistency across multiple charts" / "Maintain continuity"** — direkt prüfbar gegen unsere bestehenden Charts: `InsightsScreen`s Notenverlauf-Chart (Q1–Q4) + Fachvergleich-Balken + Wochenaktivität, UND `KlausurphasenScreen`s Mini-Balkendiagramm + Mini-Linienchart (laut CLAUDE.md: „gleiche Daten wie InsightsScreen, verlinkt dorthin") — genau der Use-Case, den Apple mit „Health Trends"-Beispiel meint (kleine Vorschau-Charts + große Detailansicht müssen visuell zusammengehören). Guter Audit-Kandidat: nutzen beide Stellen wirklich denselben Chart-Stil/dieselben Farben?
- **Accessibility-Labels für Charts** — direkt verknüpft mit dem bereits bestätigten Accessibility-Mapping (VoiceOver-Alt-Texte als Audit-Punkt) — Charts brauchen zusätzlich noch WERTE-beschreibende Labels, nicht nur ein generisches Alt-Text.
- **"Not every collection of data needs a chart — consider a list/table instead"** — guter Prüfpunkt für Stellen, die aktuell vielleicht Rohzahlen/Listen zeigen, wo ein Chart tatsächlich mehr Klarheit bringen würde, oder umgekehrt.

#### Mapping (bestätigt 31.08.2026)

**Scope bewusst eng gehalten:** Simon interessiert sich explizit nur für konsistente Darstellung, nicht für Daten-Sammlung/-Aggregation. Kein Chart-Library-Wechsel (bereits Hand-SVG, konsistent mit dem Rest des Repos). Fokus: `InsightsScreen`s volle Charts und `KlausurphasenScreen`s Mini-Charts zeigen laut CLAUDE.md dieselben Daten — müssen Farben/Stil teilen (Apples „Health Trends"-Preview↔Detail-Kontinuitätsprinzip). Konkrete Prüfung, ob das aktuell schon der Fall ist, ist Audit-Arbeit.

---

## Änderungsprotokoll

### 31.08.2026 — Erste Umsetzungsrunde (Dark Mode, Materials, Color, Icons-Farben)

Simon verzichtete explizit auf einen separaten Screen-für-Screen-Audit-Schritt und bat darum, die bereits gemappten Prinzipien direkt anzuwenden. Noch nicht committed — Verifikation (`tsc`/`build`/`lint`, 92 Probleme unverändert) erfolgt, git-Commit steht noch aus.

**Fertig umgesetzt:**
- **Dark Mode:** Hell/Dunkel/System-Toggle vollständig entfernt (`ProfilErscheinungsbildScreen.tsx` gelöscht, Route + Nav-Eintrag entfernt, `setTheme` aus Context entfernt). `ThemeApplier` (`App.tsx`) folgt jetzt unconditional dem System via `matchMedia`, ignoriert jeden gespeicherten `theme`-Wert. `theme`-Feld selbst bleibt in Profil-Typ/Sync/DB unverändert (bewusst nicht angefasst — Schema-Änderung wäre ein separater, größerer Schritt).
- **Color:** `--color-success` (Grün, bereits exakt), `--color-warning` (Orange), `--color-danger` (Rot) in `index.css` auf Apples neueste exakte Werte (aus Simons Screenshot) aktualisiert, je Light+Dark. Neue Tokens `--color-teal`/`--color-blue` ergänzt. `grad-success`/`grad-danger`-Gradienten neu von den Apple-Basiswerten abgeleitet (HSL-Auf-/Abhellung), ersetzen die vorherigen Tailwind-Werte.
- **Materials:** 4 neue Tokens `--material-blur-{ultrathin,thin,regular,thick}` (8/14/24/40px), alle 13 bestehenden `backdrop-filter`-Stellen darauf umgestellt. Kein Versuch, Liquid Glass nachzubilden.
- **Amber/Brown:** Amber (Tailwind `amber-500`/`-400`) in 10 Dateien auf die schon vorhandene `warning`-Tailwind-Farbe umgestellt (automatisch Apple-Orange, da `warning` in `tailwind.config.js` bereits auf `--color-warning` zeigt). `SubjectIcon.tsx`s Amber-Gradient-Slot #7 durch Apple-Blau ersetzt. Braun in `CoinIcon.tsx` bewusst nicht angefasst — Teil des separat geplanten Coin-UI-Redesigns.
- **Teal/Blau:** `#5AC8FA` (~30 Fundstellen über 14 Dateien) aufgeteilt — Kalender-Kontext → Apple-Teal-Ableitung, alle anderen (Lernzettel, generische Akzente) → Apple-Blau-Ableitung. **Judgment Call, nicht 100% sicher:** Die Zuordnung basiert auf CLAUDE.md-Dokumentation („Teal = Kalender") vs. einer widersprüchlichen `.glow-teal`-CSS-Klasse, die tatsächlich auf dem Lernzettel-Icon sitzt — beide Quellen bestätigen nicht dieselbe Zuordnung. Visuell gegenprüfen.

**Bewusst nicht geändert, braucht Simons Entscheidung:**
- **Dark-Purple-Duplikat:** `#5B21B6` (14+ Stellen, Buttons/CTAs, `135deg`) vs. `#4C1D95` (12 Stellen, Feature-Icons, `145deg`) — könnte ein bewusstes zweistufiges System sein, kein eindeutiger Fehler. Nicht angefasst.
- **Landing Page „Karteikarten"-Badge** (`LandingScreen.tsx:1485`) nutzt weiterhin `#5AC8FA`, obwohl Karteikarten app-weit sonst Mint ist (`G.karteikarten`) — echte Inkonsistenz, aber auf der öffentlichen Marketing-Seite, bewusst nicht ohne Rückfrage geändert.

**Zu groß für einen blinden Sweep, eigener Termin nötig:**
- **Motion:** `useReducedMotion()` fehlt weiterhin in 11 von 15 Framer-Motion-Dateien (`LernzettelScreen`, `LandingScreen`, `CoinToast`, `AttachmentToast`, `BottomNav`, `CoinIcon`, `DemoConsentScreen`, `EarlyAccessScreen`, `DemoScreen`, `FaecherEditScreen`, `CookieBanner`).
- **Typography 11px-Untergrenze:** Grep fand **~200+ Stellen** mit `text-[7px]` bis `text-[10px]` über praktisch jeden Screen — u.a. sehr dichte UI wie `StundenplanPill`/`KalenderScreen`-Grids. Eine blinde Ersetzung riskiert Layout-Brüche in dichten Bereichen. Braucht einen eigenen, visuell verifizierten Durchgang, kein Mapping-Nachtrag.
- **Charting Data:** `InsightsScreen.tsx` nutzt bestätigt **17 unkoordinierte Farben** für seine Charts (Mix aus Tailwind- und alten Apple-Werten) — Abgleich mit `KlausurphasenScreen`s Mini-Charts nicht abgeschlossen.

**Verifiziert:** `tsc --noEmit` clean, `npm run build` erfolgreich, `npm run lint` unverändert bei 92 Problemen (0 neu). Kein Commit in dieser Runde — steht noch aus.
