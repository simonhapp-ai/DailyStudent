-- 005_atomic_coins.sql
-- Coin grants and streak-freeze purchases were done as client-side read-modify-write,
-- which races when two tabs/devices are open at once: both read "no cooldown yet",
-- both show a toast, but only the last write survives in the DB (no addition on the server).
-- These RPCs make the check-and-increment atomic via a row lock, so concurrent calls
-- for the same user serialize instead of clobbering each other.

CREATE OR REPLACE FUNCTION grant_coins(
  p_user_id UUID,
  p_amount INTEGER,
  p_cooldown_key TEXT
) RETURNS TABLE(granted INTEGER, new_coins INTEGER, new_cooldowns TEXT[]) AS $$
DECLARE
  v_already BOOLEAN;
  v_coins INTEGER;
  v_cooldowns TEXT[];
BEGIN
  IF auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT (p_cooldown_key = ANY(cooldowns)), coins, cooldowns
    INTO v_already, v_coins, v_cooldowns
    FROM app_stats WHERE user_id = p_user_id FOR UPDATE;

  IF v_already THEN
    RETURN QUERY SELECT 0, v_coins, v_cooldowns;
    RETURN;
  END IF;

  UPDATE app_stats
    SET coins = coins + p_amount,
        cooldowns = array_append(cooldowns, p_cooldown_key)
    WHERE user_id = p_user_id
    RETURNING coins, cooldowns INTO v_coins, v_cooldowns;

  RETURN QUERY SELECT p_amount, v_coins, v_cooldowns;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION buy_streak_freeze(
  p_user_id UUID,
  p_cost INTEGER
) RETURNS TABLE(success BOOLEAN, new_coins INTEGER, new_streak_freezes INTEGER) AS $$
DECLARE
  v_coins INTEGER;
  v_freezes INTEGER;
BEGIN
  IF auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT coins, streak_freezes INTO v_coins, v_freezes
    FROM app_stats WHERE user_id = p_user_id FOR UPDATE;

  IF v_coins < p_cost THEN
    RETURN QUERY SELECT false, v_coins, v_freezes;
    RETURN;
  END IF;

  UPDATE app_stats
    SET coins = coins - p_cost,
        streak_freezes = streak_freezes + 1
    WHERE user_id = p_user_id
    RETURNING coins, streak_freezes INTO v_coins, v_freezes;

  RETURN QUERY SELECT true, v_coins, v_freezes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION grant_coins(UUID, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION buy_streak_freeze(UUID, INTEGER) TO authenticated;
