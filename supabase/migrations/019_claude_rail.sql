-- 019_claude_rail.sql
-- Claude Sonnet 5 als Pro-Engine für Lernzettel + Probeklausur-Material (nicht Lernplan).
-- Drei serverseitige Schranken, alle in api/claude.ts erzwungen — der Client hält nie den
-- ANTHROPIC_API_KEY und kann keine davon umgehen:
--   1. Pro-Status  (Query auf subscriptions/profiles)          — Nicht-Pro -> Gemini
--   2. Per-User-Tageslimit je Bucket (check_claude_limit)      — fail-CLOSED (-> Gemini)
--   3. Monatlicher Ausgabendeckel 20 € (ai_spend)             — fail-CLOSED (-> Gemini)
-- Plus: 1x lebenslange Gratis-Kostprobe je Free-Nutzer (profiles.claude_trial_used),
-- eigenes Sub-Budget von 5 € (gestoppt sobald ai_spend >= 15 €).

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS claude_trial_used BOOLEAN NOT NULL DEFAULT false;

-- Laufende Claude-Ausgaben je Kalendermonat (EUR-Näherung aus response.usage).
CREATE TABLE IF NOT EXISTS ai_spend (
  month TEXT PRIMARY KEY,          -- 'YYYY-MM'
  total_eur NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE ai_spend ENABLE ROW LEVEL SECURITY;   -- kein direkter Client-Zugriff, nur via RPC

-- Tageslimit je Bucket. Nutzt die bestehende ai_usage-Tabelle (Migration 012), aber OHNE
-- Strike-/Sperrlogik: das hier sind Produktlimits, kein Missbrauchsschutz. Row-locked über
-- das INSERT ... ON CONFLICT, gleiche Serialisierungs-Garantie wie check_ai_rate_limit.
-- Gibt zusätzlich den aktuellen Monats-Spend zurück, damit api/claude.ts nur einen
-- Roundtrip braucht.
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

  INSERT INTO ai_usage (user_id, bucket, day, count)
    VALUES (p_user_id, p_bucket, CURRENT_DATE, 1)
    ON CONFLICT (user_id, bucket, day) DO UPDATE SET count = ai_usage.count + 1
    RETURNING count INTO v_count;

  SELECT COALESCE(total_eur, 0) INTO v_spend FROM ai_spend WHERE month = p_month;

  RETURN QUERY SELECT (v_count <= p_limit), COALESCE(v_spend, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION check_claude_limit(UUID, TEXT, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION check_claude_limit(UUID, TEXT, INTEGER, TEXT) TO authenticated;

-- Monats-Ausgaben atomar hochzählen. Aufruf nur aus api/claude.ts NACH einem
-- erfolgreichen Anthropic-Call.
CREATE OR REPLACE FUNCTION add_claude_spend(p_month TEXT, p_eur NUMERIC)
RETURNS NUMERIC AS $$
DECLARE
  v_total NUMERIC;
BEGIN
  INSERT INTO ai_spend (month, total_eur, updated_at)
    VALUES (p_month, GREATEST(p_eur, 0), now())
    ON CONFLICT (month) DO UPDATE
      SET total_eur = ai_spend.total_eur + GREATEST(p_eur, 0), updated_at = now()
    RETURNING total_eur INTO v_total;
  RETURN v_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION add_claude_spend(TEXT, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION add_claude_spend(TEXT, NUMERIC) TO authenticated;

-- Gratis-Kostprobe als verbraucht markieren (einmalig, idempotent).
CREATE OR REPLACE FUNCTION mark_claude_trial_used(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  UPDATE profiles SET claude_trial_used = true WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION mark_claude_trial_used(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mark_claude_trial_used(UUID) TO authenticated;
