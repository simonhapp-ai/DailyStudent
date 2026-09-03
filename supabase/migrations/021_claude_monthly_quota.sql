-- 021_claude_monthly_quota.sql
-- Claude-Kontingent von TAG auf MONAT umgestellt (Simon-Entscheidung):
--   claude_lernzettel     50 / Kalendermonat   (vorher 5/Tag)
--   claude_probeklausur   25 / Kalendermonat   (nur Material-Generierung; Korrektur läuft jetzt über Gemini)
-- "so viele macht eh keiner" — realistische Nutzung bleibt weit darunter, Marge
-- bleibt klar positiv, und beim Erreichen greift lautlos der Gemini-Fallback.
--
-- SELBSTSTÄNDIG: enthält check_claude_limit (jetzt Monats-Summe) UND bump_claude_usage.
-- Ersetzt Migration 020 vollständig — 020 muss NICHT separat gelaufen sein.
-- Voraussetzung: 019 (ai_usage-Nutzung, ai_spend, claude_trial_used).
--
-- Plus: profiles.claude_enabled — der Pro-Nutzer-Schalter „Premium-KI verwenden".
-- Default true (an). Reiner Client-Vorentscheid (der Nutzer gibt sein eigenes
-- Kontingent aus) — die harte Durchsetzung (Pro-Status, Kontingent, 20-€-Deckel)
-- bleibt serverseitig in api/claude.ts.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS claude_enabled BOOLEAN NOT NULL DEFAULT true;

-- bump_claude_usage schreibt weiter EINE Zeile pro Tag (unverändert ggü. 020).
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

-- check_claude_limit: reiner READ, SUMMIERT jetzt über den laufenden Kalendermonat.
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

  SELECT COALESCE(SUM(count), 0) INTO v_count
    FROM ai_usage
    WHERE user_id = p_user_id
      AND bucket = p_bucket
      AND day >= date_trunc('month', CURRENT_DATE)::date;

  SELECT COALESCE(total_eur, 0) INTO v_spend FROM ai_spend WHERE month = p_month;

  -- < p_limit : v_count sind die bisherigen Calls, dieser noch nicht mitgezählt
  RETURN QUERY SELECT (v_count < p_limit), COALESCE(v_spend, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION check_claude_limit(UUID, TEXT, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION check_claude_limit(UUID, TEXT, INTEGER, TEXT) TO authenticated;
