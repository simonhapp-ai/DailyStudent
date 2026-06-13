-- Add custom_faecher column to profiles table
-- Custom subjects created by users (not in the standard SUBJECT_INFO list)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS custom_faecher JSONB DEFAULT NULL;
