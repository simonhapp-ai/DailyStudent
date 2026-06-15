-- 004_coins_system.sql
-- Adds coins, cooldowns, streak freezes to app_stats table.
-- Run via: supabase db push

ALTER TABLE app_stats
  ADD COLUMN IF NOT EXISTS coins INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cooldowns TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS streak_freezes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS freeze_used_dates TEXT[] DEFAULT '{}';
