-- Beta-launch feature flags. Lets Simon pause specific token-heavy / monetized
-- features from the Supabase dashboard (works fine from a phone browser) without
-- a code deploy or App Store resubmission — needed because Simon is traveling
-- with phone-only access and doesn't want to sell Pro or risk AI cost spikes
-- while unreachable. Single-row config, public read (client needs it even
-- signed out to render the right UI), no client write access — only editable
-- via the Supabase dashboard (table editor), which uses the service role.
--
-- Column defaults represent NORMAL (post-beta) behavior, so if this row were
-- ever reinserted from scratch it would come back in the safe/default state.
-- The actual initial row below is inserted with today's beta values directly.
CREATE TABLE app_config (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  pro_purchases_enabled BOOLEAN NOT NULL DEFAULT true,
  probeklausur_afb_trainer_free BOOLEAN NOT NULL DEFAULT false,
  probeklausur_mode2_enabled BOOLEAN NOT NULL DEFAULT true,
  probeklausur_mode3_enabled BOOLEAN NOT NULL DEFAULT true,
  probeklausur_mode4_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_config_public_read" ON app_config
  FOR SELECT USING (true);

-- Beta-launch state, live immediately: Pro purchases paused (Stripe + Apple IAP),
-- AFB-Aufgabentrainer opened for free (Simon wants to showcase it), the other
-- three Probeklausur modes paused (most token-expensive generations).
INSERT INTO app_config (id, pro_purchases_enabled, probeklausur_afb_trainer_free, probeklausur_mode2_enabled, probeklausur_mode3_enabled, probeklausur_mode4_enabled)
VALUES (1, false, true, false, false, false);

-- "Notify me for the Pro launch discount" opt-in shown while purchases are
-- paused — a single boolean on the existing profiles row/RLS, no new table.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pro_waitlist_interested BOOLEAN NOT NULL DEFAULT false;
