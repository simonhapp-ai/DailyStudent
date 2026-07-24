-- Lernzettel Groq→Gemini port: explaining-type modes + optional AI-generated explanatory visuals.
-- modus: which of the 4 explaining-type prompts generated this Lernzettel (faktisch/bildlich/grundlagen/stichpunkte).
-- images: [{ ref, afterHeading?, alt }] — ref points into the client's local IndexedDB (see
-- src/lib/noteStorage.ts), NOT Supabase Storage — images are local-first like note attachments,
-- this column only carries the small ref metadata, never image bytes.
ALTER TABLE lernzettel
  ADD COLUMN IF NOT EXISTS modus TEXT NOT NULL DEFAULT 'faktisch',
  ADD COLUMN IF NOT EXISTS images JSONB DEFAULT NULL;
