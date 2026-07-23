-- 012_ai_rate_limits.sql
-- Server-side abuse ceiling for AI calls. api/groq.ts and api/gemini.ts previously only
-- checked "is this a valid logged-in user" before proxying to Groq/Gemini with the real
-- (server-side) key — no cap on volume, so a free account (30s to create) could hammer
-- either endpoint in a loop with no cost limit. This adds a per-user, per-bucket, per-day
-- ceiling (same flat limit for every account, no free/pro distinction) plus a repeat-offender
-- lock: the first day a user goes over any single bucket's ceiling is one "strike" (retrying
-- the same day doesn't add more strikes); 2 strikes total, ever, across any bucket, blocks
-- the account from all further AI calls.

CREATE TABLE ai_usage (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bucket TEXT NOT NULL,
  day DATE NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, bucket, day)
);
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

CREATE TABLE ai_rate_limit_strikes (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bucket TEXT NOT NULL,
  day DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, bucket, day)
);
ALTER TABLE ai_rate_limit_strikes ENABLE ROW LEVEL SECURITY;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ai_blocked BOOLEAN NOT NULL DEFAULT false;

-- Row-locked (same guarantee as grant_coins/buy_streak_freeze in 005/006_atomic_coins.sql)
-- so concurrent calls for the same user serialize instead of racing past the ceiling.
CREATE OR REPLACE FUNCTION check_ai_rate_limit(
  p_user_id UUID,
  p_bucket TEXT,
  p_limit INTEGER
) RETURNS TABLE(allowed BOOLEAN, blocked BOOLEAN) AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_count INTEGER;
  v_blocked BOOLEAN;
  v_new_strike INTEGER;
  v_total_strikes INTEGER;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT ai_blocked INTO v_blocked FROM profiles WHERE id = p_user_id FOR UPDATE;

  IF v_blocked THEN
    RETURN QUERY SELECT false, true;
    RETURN;
  END IF;

  INSERT INTO ai_usage (user_id, bucket, day, count)
    VALUES (p_user_id, p_bucket, v_today, 1)
    ON CONFLICT (user_id, bucket, day) DO UPDATE SET count = ai_usage.count + 1
    RETURNING count INTO v_count;

  IF v_count <= p_limit THEN
    RETURN QUERY SELECT true, false;
    RETURN;
  END IF;

  INSERT INTO ai_rate_limit_strikes (user_id, bucket, day)
    VALUES (p_user_id, p_bucket, v_today)
    ON CONFLICT (user_id, bucket, day) DO NOTHING;
  GET DIAGNOSTICS v_new_strike = ROW_COUNT;

  IF v_new_strike > 0 THEN
    SELECT COUNT(*) INTO v_total_strikes FROM ai_rate_limit_strikes WHERE user_id = p_user_id;
    IF v_total_strikes >= 2 THEN
      UPDATE profiles SET ai_blocked = true WHERE id = p_user_id;
      v_blocked := true;
    END IF;
  END IF;

  RETURN QUERY SELECT false, v_blocked;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION check_ai_rate_limit(UUID, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION check_ai_rate_limit(UUID, TEXT, INTEGER) TO authenticated;
