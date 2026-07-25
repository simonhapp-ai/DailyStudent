-- "Markieren" swipe action (gelber Stern, wie in Apple Notizen) für Lernzettel.
ALTER TABLE lernzettel
  ADD COLUMN IF NOT EXISTS highlighted BOOLEAN DEFAULT FALSE;
