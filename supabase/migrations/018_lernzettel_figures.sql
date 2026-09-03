-- Client-gerenderte Abbildungen (Tabelle / Diagramm / SVG) für Lernzettel.
-- Reine Inline-JSON-Daten, kein Storage-Ref (anders als `images`).
ALTER TABLE lernzettel
  ADD COLUMN IF NOT EXISTS figures JSONB;
