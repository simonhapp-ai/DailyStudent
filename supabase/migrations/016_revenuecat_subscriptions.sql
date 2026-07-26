-- Extends `subscriptions` to support Apple IAP via RevenueCat alongside Stripe.
-- One row per user (whichever billing system is currently authoritative for
-- them) — required because supabaseSync.ts reads this table with
-- .maybeSingle(), which throws on >1 row per user_id. No UNIQUE(user_id)
-- existed before this migration; a Stripe user who cancels+resubscribes
-- mints a new stripe_subscription_id, so duplicate rows are latently
-- possible today even before RevenueCat is added — dedupe defensively first.
DELETE FROM subscriptions a USING subscriptions b
  WHERE a.user_id = b.user_id
    AND a.id <> b.id
    AND (a.updated_at, a.id) < (b.updated_at, b.id);

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'stripe' CHECK (source IN ('stripe', 'apple')),
  ADD COLUMN IF NOT EXISTS rc_app_user_id TEXT;

ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_user_id_unique UNIQUE (user_id);
