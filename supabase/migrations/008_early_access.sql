-- 008_early_access.sql
-- Public email list for early access sign-ups.
-- Anyone (anon or authenticated) can insert their email once.
-- Only service-role can read (Simon manages via Supabase Table Editor).

CREATE TABLE IF NOT EXISTS early_access_emails (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  email      TEXT        NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT early_access_emails_email_key UNIQUE (email)
);

ALTER TABLE early_access_emails ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (email sign-up form is public)
CREATE POLICY "allow_insert" ON early_access_emails
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- No SELECT / UPDATE / DELETE for non-service-role
