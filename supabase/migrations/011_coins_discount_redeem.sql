-- 011_coins_discount_redeem.sql
-- Atomic coin-spend RPC for the Coins-Rabatt-via-Stripe feature (CLAUDE.md roadmap item #0).
-- Same row-locked pattern as grant_coins/buy_streak_freeze (005/006_atomic_coins.sql) to avoid
-- a client-side read-modify-write race across multiple tabs/devices. Cooldown key is permanent
-- (no date suffix, e.g. 'DISCOUNT_15:USED') since each discount tier can only ever be redeemed once.

CREATE OR REPLACE FUNCTION redeem_discount(
  p_user_id UUID,
  p_cost INTEGER,
  p_cooldown_key TEXT
) RETURNS TABLE(success BOOLEAN, new_coins INTEGER, new_cooldowns TEXT[]) AS $$
DECLARE
  v_already BOOLEAN;
  v_coins INTEGER;
  v_cooldowns TEXT[];
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT (p_cooldown_key = ANY(cooldowns)), coins, cooldowns
    INTO v_already, v_coins, v_cooldowns
    FROM app_stats WHERE user_id = p_user_id FOR UPDATE;

  IF v_already THEN
    RETURN QUERY SELECT false, v_coins, v_cooldowns;
    RETURN;
  END IF;

  IF v_coins < p_cost THEN
    RETURN QUERY SELECT false, v_coins, v_cooldowns;
    RETURN;
  END IF;

  UPDATE app_stats
    SET coins = coins - p_cost,
        cooldowns = array_append(cooldowns, p_cooldown_key)
    WHERE user_id = p_user_id
    RETURNING coins, cooldowns INTO v_coins, v_cooldowns;

  RETURN QUERY SELECT true, v_coins, v_cooldowns;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION redeem_discount(UUID, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION redeem_discount(UUID, INTEGER, TEXT) TO authenticated;
