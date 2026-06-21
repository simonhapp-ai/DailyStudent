-- Migration 010: Add color and lernplan_id to personal_entries
-- These fields exist in the TypeScript PersonalEntry type but were missing
-- from the DB schema, so calendar entries created by LernplanDetailScreen
-- lost their color and lernplan association after any Supabase reload.

ALTER TABLE personal_entries
  ADD COLUMN IF NOT EXISTS color       TEXT,
  ADD COLUMN IF NOT EXISTS lernplan_id TEXT;
