# DailyStudent

Personalisiertes, KI-gestütztes Lernökosystem für deutsche Schüler (Klasse 10–13).

## Was ist DailyStudent?

DailyStudent kombiniert mehrere Lernstrategien, die sich an die individuelle Situation des Schülers anpassen — verfügbare Zeit bis zur Klausur, behandelter Unterrichtsstoff (Smart Notes), Kerncurriculum des Bundeslandes und individuelle Schwächen.

**Zielgruppe:** Gymnasiasten Klasse 10–13 (Mittelstufe + Oberstufe/Abi)  
**Monetarisierung:** Freemium — Free Tier mit Lock-Paywall, Pro für €7,99/Mo oder €59,99/Jahr

## Features

- **Smart Notes** — Foto/PDF/Text → Groq Vision OCR → KI-Analyse (Summary, Keywords, Klausurthemen)
- **Karteikarten** — KI-generiert aus Smart Notes, 3-Schritt-Generator, manuell erstellbar
- **Blurting** — Freie Wiedergabe mit KI-Bewertung gegen Smart Note Inhalt
- **Probeklausuren** — 4 Modi (AFB-Trainer, Vollständige Klausur, Materialklausur, Ohne Material) via Gemini
- **Lernzettel** — KI-generiert via Groq, Pro Lernzettel Preview mit 4 echten HTML-Beispielen
- **Lernplan** — 6-Schritt-Konfigurator, 3 Plantypen (Einzel/Vollständig/Abitur), Kalender-Export
- **KC-Daten** — 196 JSON-Dateien für 16 Bundesländer, automatisch in KI-Prompts injiziert
- **Insights** — Notenverlauf, Fachvergleich, Wochenaktivität, KI-Lerntipps
- **Abi-Rechner** — Notenpunkte Q1–Q4, LK-Gewichtung, Zielnote-Vergleich

## Tech Stack

| Was | Womit |
|-----|-------|
| Framework | React + TypeScript |
| Styling | Tailwind CSS |
| Build Tool | Vite |
| Routing | React Router |
| KI Text + Vision | Groq API — Llama 3.3 70B + Llama 4 Scout Vision |
| KI Probeklausuren + Lernplan | Google Gemini — `gemini-2.5-flash` |
| Auth | Supabase Auth — Email/Passwort + Google OAuth |
| DB | Supabase PostgreSQL — 13 Tabellen + RLS |
| Payments | Stripe — Live-Mode aktiv |
| Dev Server | localhost:5174 |

## Setup

```bash
npm install
npm run dev
```

## Umgebungsvariablen

`.env` im Root-Verzeichnis anlegen:

```
VITE_GROQ_API_KEY=gsk_...
VITE_GEMINI_API_KEY=AIzaSy...
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_EMAILJS_SERVICE_ID=...
VITE_EMAILJS_TEMPLATE_ID=...
VITE_EMAILJS_PUBLIC_KEY=...
```

Alle `VITE_` Keys müssen auch in Vercel unter Environment Variables gesetzt sein.

## Supabase

13 Tabellen mit Row Level Security. Migrationen in `supabase/migrations/`:

- `001_initial_schema.sql` — Basis-Schema (angewendet)
- `002_grade_data.sql` — dedizierte Notentabelle (angewendet 09.06.2026)
- `003_custom_faecher.sql` — `custom_faecher JSONB` in `profiles` (angewendet 14.06.2026)

Edge Functions in `supabase/functions/`: `groq-proxy`, `gemini-proxy`, `create-checkout-session`, `stripe-webhook`, `delete-account` — alle deployed.

## Paywall

Kein Blur. Free-User sehen Lock-Cards mit konkreten Feature-Bullets. Klick öffnet `ProModal` als Bottom Sheet mit direktem Stripe-Checkout.

| Feature | Free | Pro |
|---------|------|-----|
| Smart Notes | ✅ unbegrenzt | ✅ |
| Karteikarten | ✅ unbegrenzt | ✅ |
| Blurting | ✅ unbegrenzt | ✅ |
| Lernzettel | 1/Tag | ✅ |
| Probeklausur Vollständig | 1/Tag | ✅ |
| Probeklausur AFB/Material/Ohne Material | ❌ | ✅ |
| KI-Korrektur | ❌ | ✅ |
| Lernplan Vollständig/Abitur | ❌ | ✅ |

## Struktur

```
src/
├── app/App.tsx              # Router, Auth-Gate, Layout
├── components/ui/           # Button, Card, ProModal, BottomSheet, ...
├── context/UserContext.tsx  # Zentraler State + Auth + Sync Queue
├── data/
│   ├── subjectInfo.ts       # Fach-Namen, Icons, Farben
│   └── kcLoader.ts          # KC-JSON Loader + Prompt-Builder
├── lib/
│   ├── groq.ts              # Groq API Calls
│   ├── gemini.ts            # Gemini API Calls
│   ├── supabase.ts          # Supabase Client
│   └── supabaseSync.ts      # Sync-Layer + Queue
├── screens/                 # 34 Screens
└── types/index.ts           # TypeScript-Typen
public/
├── kc/                      # KC-JSONs: 16 Bundesländer × ~12 Fächer
└── lernzettel-previews/     # Pro Lernzettel HTML-Vorschauen
supabase/
├── migrations/
└── functions/
```
