-- =============================================================================
-- DailyStudent — Referral System
-- Run in: Supabase Dashboard → SQL Editor → New query
-- Save as: 009_referral_system
-- =============================================================================

-- Add referral fields to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS referral_code  TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS trial_ends_at  TIMESTAMPTZ;

-- Referrals tracking table
CREATE TABLE IF NOT EXISTS referrals (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referee_id  UUID        NOT NULL UNIQUE,  -- one row per new signup
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Referrer can see their own referrals (for counting in UI)
CREATE POLICY "referrals_select_own" ON referrals
  FOR SELECT USING (referrer_id = auth.uid());

-- Only service role (edge function) may insert
CREATE INDEX IF NOT EXISTS referrals_referrer_id_idx ON referrals(referrer_id);
