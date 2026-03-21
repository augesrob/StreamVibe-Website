-- ============================================================
-- StreamVibe Forum Schema Fixes - Run AFTER 006_forum_schema.sql
-- https://supabase.com/dashboard/project/ugodapqlmajfhvrodlyf/sql
-- ============================================================

-- Fix moderation_logs columns (components use action_type + reason)
ALTER TABLE moderation_logs ADD COLUMN IF NOT EXISTS action_type text;
ALTER TABLE moderation_logs ADD COLUMN IF NOT EXISTS reason text;
UPDATE moderation_logs SET action_type = action WHERE action_type IS NULL;

-- Fix spam_reports columns (components use target_type + description + status)
ALTER TABLE spam_reports ADD COLUMN IF NOT EXISTS target_type text DEFAULT 'post';
ALTER TABLE spam_reports ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE spam_reports ADD COLUMN IF NOT EXISTS status text DEFAULT 'open';
UPDATE spam_reports SET status = CASE WHEN resolved = true THEN 'resolved' ELSE 'open' END;

-- Fix profiles columns used by forum (avatar, role, plan_tier)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan_tier text DEFAULT 'free';

-- Allow admins to insert moderation logs
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'moderation_logs' AND policyname = 'admin_insert_modlogs'
  ) THEN
    CREATE POLICY "admin_insert_modlogs" ON moderation_logs FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- Allow everyone to read spam reports (admin uses adminSupabase which bypasses RLS anyway)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'spam_reports' AND policyname = 'admin_read_spam'
  ) THEN
    CREATE POLICY "admin_read_spam" ON spam_reports FOR SELECT USING (true);
  END IF;
END $$;
