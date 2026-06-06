-- =============================================================================
-- DailyStudent — Initial Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query → Paste → Run
-- =============================================================================


-- ─── PROFILES ─────────────────────────────────────────────────────────────────
-- One row per authenticated user. Extends auth.users.
-- klausurtermine + stundenplan + abi_halbjahre stored as JSONB (always read together)
CREATE TABLE profiles (
  id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name             TEXT        NOT NULL DEFAULT '',
  klasse           TEXT        NOT NULL DEFAULT '13',
  schulform        TEXT        NOT NULL DEFAULT 'Gymnasium G9',
  schultyp         TEXT        CHECK (schultyp IN ('g8', 'g9')),
  bundesland       TEXT        NOT NULL DEFAULT '',
  bundesland_id    TEXT        NOT NULL DEFAULT 'ni',
  faecher          TEXT[]      NOT NULL DEFAULT '{}',
  lk_faecher       TEXT[]      NOT NULL DEFAULT '{}',
  zielnote         TEXT,
  folder_sort_mode TEXT        NOT NULL DEFAULT 'halbjahr'
                               CHECK (folder_sort_mode IN ('manual', 'halbjahr', 'themen')),
  klausurtermine   JSONB       NOT NULL DEFAULT '[]',
  stundenplan      JSONB,
  abi_halbjahre    JSONB,
  abi_gesamtpunkte INTEGER,
  abi_gesamtnote   TEXT,
  is_pro           BOOLEAN     NOT NULL DEFAULT FALSE,
  is_dev_mode      BOOLEAN     NOT NULL DEFAULT FALSE,
  theme            TEXT        NOT NULL DEFAULT 'dark'
                               CHECK (theme IN ('light', 'dark', 'system')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─── APP STATS ────────────────────────────────────────────────────────────────
-- Streak, scan count, exam count, activity calendar — one row per user.
CREATE TABLE app_stats (
  user_id         UUID        PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  scan_count      INTEGER     NOT NULL DEFAULT 0,
  exam_count      INTEGER     NOT NULL DEFAULT 0,
  streak          INTEGER     NOT NULL DEFAULT 0,
  last_study_date DATE,
  studied_days    TEXT[]      NOT NULL DEFAULT '{}',
  exam_scores     JSONB       NOT NULL DEFAULT '[]',
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─── USER FOLDERS ─────────────────────────────────────────────────────────────
-- Folder tree per subject. Preserves string IDs from localStorage.
CREATE TABLE user_folders (
  id                TEXT        NOT NULL,
  user_id           UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id        TEXT        NOT NULL,
  half_year_id      TEXT,
  parent_folder_id  TEXT,
  name              TEXT        NOT NULL,
  is_auto_generated BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, user_id)
);


-- ─── USER NOTES ───────────────────────────────────────────────────────────────
-- All notes (text, photo-import, PDF-import). Attachments stored as URLs in JSONB.
CREATE TABLE user_notes (
  id              TEXT        NOT NULL,
  user_id         UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id      TEXT,
  folder_id       TEXT,
  title           TEXT        NOT NULL DEFAULT '',
  content         TEXT        NOT NULL DEFAULT '',
  attachments     TEXT[]      DEFAULT '{}',
  pdf_attachments JSONB       DEFAULT '[]',
  homework_items  JSONB       DEFAULT '[]',
  qa              JSONB       DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, user_id)
);


-- ─── GENERATED SMART NOTES ────────────────────────────────────────────────────
-- AI analysis result for a note. Keyed by the UserNote id that was analyzed.
CREATE TABLE generated_smart_notes (
  note_id      TEXT        NOT NULL,
  user_id      UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id    TEXT        NOT NULL,
  subject_name TEXT        NOT NULL DEFAULT '',
  raw_text     TEXT        NOT NULL DEFAULT '',
  content_type TEXT        CHECK (content_type IN ('info', 'aufgabe', 'beides')),
  summary      TEXT        NOT NULL DEFAULT '',
  keywords     TEXT[]      NOT NULL DEFAULT '{}',
  exam_topics  TEXT[]      NOT NULL DEFAULT '{}',
  solution     JSONB,
  tasks        JSONB,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (note_id, user_id)
);


-- ─── FLASHCARDS ───────────────────────────────────────────────────────────────
CREATE TABLE flashcards (
  id         TEXT        NOT NULL,
  user_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id TEXT        NOT NULL DEFAULT '',
  note_id    TEXT,
  front      TEXT        NOT NULL,
  back       TEXT        NOT NULL,
  keywords   TEXT[]      DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, user_id)
);


-- ─── LERNZETTEL ───────────────────────────────────────────────────────────────
CREATE TABLE lernzettel (
  id              TEXT        NOT NULL,
  user_id         UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id      TEXT        NOT NULL,
  subject_name    TEXT        NOT NULL,
  title           TEXT        NOT NULL,
  selected_topics TEXT[]      NOT NULL DEFAULT '{}',
  source_note_ids TEXT[]      NOT NULL DEFAULT '{}',
  content         TEXT        NOT NULL DEFAULT '',
  keywords        TEXT[]      NOT NULL DEFAULT '{}',
  exam_topics     TEXT[]      NOT NULL DEFAULT '{}',
  user_note_id    TEXT        NOT NULL,
  folder_id       TEXT        NOT NULL,
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, user_id)
);


-- ─── SAVED PROBEKLAUSUREN ─────────────────────────────────────────────────────
-- task_results stored as JSONB — complex nested structure, always read as unit.
CREATE TABLE saved_probeklausuren (
  id                    TEXT        NOT NULL,
  user_id               UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mode                  INTEGER     NOT NULL CHECK (mode IN (1, 2, 3, 4)),
  subject_id            TEXT        NOT NULL,
  subject_name          TEXT        NOT NULL,
  topic                 TEXT        NOT NULL,
  total_np              INTEGER     NOT NULL,
  grade_label           TEXT        NOT NULL,
  task_results          JSONB       NOT NULL DEFAULT '[]',
  overall_justification TEXT        NOT NULL DEFAULT '',
  completed_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, user_id)
);


-- ─── LERNPLAENE ───────────────────────────────────────────────────────────────
-- days/sessions/config stored as JSONB — deeply nested, always read as a unit.
CREATE TABLE lernplaene (
  id            TEXT        NOT NULL,
  user_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title         TEXT        NOT NULL,
  plan_type     TEXT        NOT NULL CHECK (plan_type IN ('einzel', 'vollstaendig', 'abitur')),
  is_active     BOOLEAN     NOT NULL DEFAULT FALSE,
  start_date    DATE        NOT NULL,
  end_date      DATE        NOT NULL,
  summary       TEXT        NOT NULL DEFAULT '',
  days          JSONB       NOT NULL DEFAULT '[]',
  exam_schedule JSONB       NOT NULL DEFAULT '[]',
  config        JSONB       NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, user_id)
);


-- ─── PERSONAL ENTRIES (Kalender) ──────────────────────────────────────────────
CREATE TABLE personal_entries (
  id       TEXT        NOT NULL,
  user_id  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title    TEXT        NOT NULL,
  type     TEXT        NOT NULL CHECK (type IN ('lerneinheit', 'termin', 'erinnerung')),
  date     DATE        NOT NULL,
  time     TEXT        NOT NULL,
  end_time TEXT,
  PRIMARY KEY (id, user_id)
);


-- ─── STANDALONE HOMEWORK ──────────────────────────────────────────────────────
CREATE TABLE standalone_homework (
  id           TEXT        NOT NULL,
  user_id      UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id   TEXT,
  description  TEXT        NOT NULL,
  due_date     DATE,
  is_completed BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, user_id)
);


-- ─── COMPLETED HOMEWORK IDS ───────────────────────────────────────────────────
CREATE TABLE completed_homework_ids (
  user_id      UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  homework_id  TEXT        NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, homework_id)
);


-- ─── SUBSCRIPTIONS (Stripe) ───────────────────────────────────────────────────
-- Populated exclusively by Stripe webhook via Edge Function — users cannot write here.
CREATE TABLE subscriptions (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_customer_id     TEXT        UNIQUE,
  stripe_subscription_id TEXT        UNIQUE,
  status                 TEXT        NOT NULL DEFAULT 'inactive'
                                     CHECK (status IN ('active','inactive','canceled','past_due','trialing')),
  plan                   TEXT        CHECK (plan IN ('monthly', 'yearly')),
  current_period_end     TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================================================
-- ROW LEVEL SECURITY
-- Every table is locked: users can only access their own rows.
-- =============================================================================

ALTER TABLE profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_stats              ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_folders           ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_smart_notes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards             ENABLE ROW LEVEL SECURITY;
ALTER TABLE lernzettel             ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_probeklausuren   ENABLE ROW LEVEL SECURITY;
ALTER TABLE lernplaene             ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_entries       ENABLE ROW LEVEL SECURITY;
ALTER TABLE standalone_homework    ENABLE ROW LEVEL SECURITY;
ALTER TABLE completed_homework_ids ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions          ENABLE ROW LEVEL SECURITY;

-- profiles: own row only (id = auth.uid())
CREATE POLICY "own profile" ON profiles
  FOR ALL USING (auth.uid() = id);

-- all user_id tables: same pattern
CREATE POLICY "own data" ON app_stats              FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own data" ON user_folders           FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own data" ON user_notes             FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own data" ON generated_smart_notes  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own data" ON flashcards             FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own data" ON lernzettel             FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own data" ON saved_probeklausuren   FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own data" ON lernplaene             FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own data" ON personal_entries       FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own data" ON standalone_homework    FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own data" ON completed_homework_ids FOR ALL USING (auth.uid() = user_id);

-- subscriptions: users can only READ (writes come from server-side webhook only)
CREATE POLICY "own subscriptions read" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);


-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Auto-create profile + app_stats rows the moment a user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', '')
  );
  INSERT INTO app_stats (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Keep updated_at current on mutation
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER user_notes_updated_at
  BEFORE UPDATE ON user_notes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER app_stats_updated_at
  BEFORE UPDATE ON app_stats
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- =============================================================================
-- INDEXES — for the queries the app actually runs
-- =============================================================================

CREATE INDEX idx_user_notes_folder     ON user_notes(user_id, folder_id);
CREATE INDEX idx_user_notes_subject    ON user_notes(user_id, subject_id);
CREATE INDEX idx_user_folders_subject  ON user_folders(user_id, subject_id);
CREATE INDEX idx_flashcards_note       ON flashcards(user_id, note_id);
CREATE INDEX idx_lernzettel_subject    ON lernzettel(user_id, subject_id);
CREATE INDEX idx_personal_entries_date ON personal_entries(user_id, date);
CREATE INDEX idx_subscriptions_stripe  ON subscriptions(stripe_customer_id);
