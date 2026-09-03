-- 020_claude_usage_post_count.sql
-- Fix: check_claude_limit (Migration 019) hat den Tageszähler bei JEDEM Aufruf
-- hochgezählt — auch wenn der Claude-Call danach fehlschlug (Timeout, JSON-Fehler,
-- Refusal) oder auf Gemini zurückfiel. Ein paar Fehlversuche beim Testen haben so
-- das 5/Tag- (Lernzettel) bzw. 2/Tag-Kontingent (Probeklausur) aufgebraucht.
--
-- Jetzt: check_claude_limit ist ein reiner READ. api/claude.ts ruft bump_claude_usage
-- separat NACH einem erfolgreichen, abgerechneten Anthropic-Call. Das kleine
-- Race-Fenster (zwei parallele Requests lesen denselben count) ist harmlos —
-- Worst Case ein einzelner Extra-Call/Tag; der 20-€-Monatsdeckel bleibt atomar.

CREATE OR REPLACE FUNCTION check_claude_limit(
  p_user_id UUID,
  p_bucket TEXT,
  p_limit INTEGER,
  p_month TEXT
) RETURNS TABLE(allowed BOOLEAN, month_spend NUMERIC) AS $$
DECLARE
  v_count INTEGER;
  v_spend NUMERIC;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT count INTO v_count
    FROM ai_usage
    WHERE user_id = p_user_id AND bucket = p_bucket AND day = CURRENT_DATE;

  SELECT COALESCE(total_eur, 0) INTO v_spend FROM ai_spend WHERE month = p_month;

  -- < statt <= : v_count sind die bisherigen ERFOLGREICHEN Calls heute (noch nicht
  -- inklusive dieses). Erlaubt exakt p_limit Calls/Tag.
  RETURN QUERY SELECT (COALESCE(v_count, 0) < p_limit), COALESCE(v_spend, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION check_claude_limit(UUID, TEXT, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION check_claude_limit(UUID, TEXT, INTEGER, TEXT) TO authenticated;

-- Tageszähler hochzählen — nur aus api/claude.ts, nur nach einem erfolgreichen Call.
CREATE OR REPLACE FUNCTION bump_claude_usage(p_user_id UUID, p_bucket TEXT)
RETURNS VOID AS $$
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  INSERT INTO ai_usage (user_id, bucket, day, count)
    VALUES (p_user_id, p_bucket, CURRENT_DATE, 1)
    ON CONFLICT (user_id, bucket, day) DO UPDATE SET count = ai_usage.count + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION bump_claude_usage(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION bump_claude_usage(UUID, TEXT) TO authenticated;

-- Heutige Claude-Zählerstände zurücksetzen, damit die Fehlversuche aus der
-- Testphase nicht bis Mitternacht nachwirken (nur die zwei Claude-Buckets,
-- die Gemini-Abuse-Buckets aus Migration 012 bleiben unberührt).
DELETE FROM ai_usage
  WHERE day = CURRENT_DATE
    AND bucket IN ('claude_lernzettel', 'claude_probeklausur');
