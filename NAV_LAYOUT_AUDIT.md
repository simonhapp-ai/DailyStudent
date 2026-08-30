# Navigations-/Layout-Audit — Block 4 (Pro-Launch-Phase)

> Erstellt 28.08.2026 per Code-Review (kein Browser-Tooling verfügbar in dieser Session — Simons Geräte-Durchklick aus dem Master-Prompt bleibt trotzdem nötig, siehe unten). Referenz-Pattern: `src/components/ui/Header.tsx` (lila Chevron, `max(52px, calc(env(safe-area-inset-top,0px)+12px))`).

## Gemeinsame Ursachen — bereits vorher gefixt (eigener Commit `18bad49`)
- Dezenter Routen-Fade (`RouteFade` in `App.tsx`, framer-motion, 180ms, respektiert `prefers-reduced-motion`)
- Alle `min-h-screen`/`h-screen`/`100vh` → `min-h-dvh`/`h-dvh`/`100dvh` (45 Dateien)
- Scroll-Reset bei Routenwechsel war schon vorhanden (29.07-Session), unverändert korrekt

## Behoben in diesem Audit (Commit `55c6e37`)

| # | Fund | Fix |
|---|---|---|
| Safe-area-top komplett gefehlt | `LernplanDetailScreen` (sticky header), `EarlyAccessScreen`, `LernplanKonfiguratorScreen`, `FaecherEditScreen`, `OnboardingScreen` (Zurück-Button), 6× `ProbeklausurMode1-4Screen`/`ProbeklausurRetroScreen`, `LandingScreen`-Navbar (auch in-app erreichbar über Profil→Support) | `env(safe-area-inset-top)` ergänzt, an bestehende Konventionen angelehnt |
| Safe-area-bottom fehlte an Bottom-Sheets/Toolbars | `NoteCreateScreen` (Editor-Toolbar + Smart-Note-Sheet), `ProModal` (beide Branches), `StreakInfoSheet`, `LernzettelGeneratorScreen`-Warn-Sheet, `DrawingCanvas`-Seitenleiste | Auf `BottomSheet.tsx`-Muster (`max(2.5rem, env(safe-area-inset-bottom))`) umgestellt |
| CLS: `DashboardScreen` ErsteSchritteCard blitzte kurz auf und verschwand | Hinter `supabaseDataLoading` gegated |
| CLS: `LernplanDetailScreen` "nicht gefunden" konnte kurz vor der echten Ansicht aufblitzen | Spinner statt Fehlerzustand solange `supabaseDataLoading` |
| Zurück-Button-Inkonsistenz: `LernplanDetailScreen` grauer Pfeil statt lila Chevron | Auf `Header.tsx`-Farbe/Icon umgestellt |

## Bewusst NICHT verändert (niedrige Priorität / Kontext-Ausnahmen)

- **~20 Screens mit der "58px/18px"-Safe-Area-Konvention** vs. Headers "52px/12px" — beide funktional korrekt (haben `env()`), nur zwei leicht unterschiedliche Werte. Reine Design-Token-Konsolidierung, kein Bug. Nicht angefasst, da Simons Design-Scope.
- **`EarlyAccessScreen`/`DemoScreen` graue statt lila Zurück-Buttons** — bewusst, Teil der eigenständigen Landing-Page-Design-Sprache (`#988CAF`/`#160E28`), nicht der App-Chrome. Nur die Safe-Area-Lücke bei `EarlyAccessScreen` wurde gefixt, Farbe/Icon blieben unangetastet.
- **`AuthScreen`/`TwoFactorVerifyScreen`** (`py-12` fest, kein `env()`) — Severity niedrig laut Audit, Inhalt ist vertikal zentriert (`min-h-dvh`), Kollision nur bei ungewöhnlich hohem Content-Overflow denkbar.
- **`DrawingCanvas`-Toolbar (icon-only, kein "Zurück"-Text)** — dokumentierte Absicht (CLAUDE.md), dichte Toolbar-Zeile, kein Fund.
- **`NoteCreateScreen`-Editor-Header (Abbrechen/Speichern statt Zurück)** — bewusstes Modal-Editor-Pattern, kein Fund.
- **`DashboardScreen`-Klausur-Badge (kleine CLS, low-medium)** — geringfügiger Shift eines kleinen Pill-Elements, nicht strukturell wie die beiden oben behobenen Fälle. Nicht gegated, um Anzeige nicht unnötig zu verzögern.

## Weiterhin offen — braucht echtes Gerät, nicht per Code lösbar
Simons Geräte-Durchklick aus dem Master-Prompt (Block 4, "Preview-URL am Handy durchklicken") bleibt der einzige Weg, echte visuelle Sprünge zu verifizieren, die sich nicht aus dem Code allein ableiten lassen (z. B. Tastatur-Ein-/Ausblenden-Timing, echtes Bounce-Verhalten). Dieser Audit deckt alles ab, was aus dem Code selbst diagnostizierbar war.
