-- StreamVibe Tool Bans System
-- Run this in: https://supabase.com/dashboard/project/ugodapqlmajfhvrodlyf/sql/new

CREATE TABLE IF NOT EXISTS tool_bans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool text NOT NULL DEFAULT 'auction',
  reason text NOT NULL,
  proof text,
  proof_type text CHECK (proof_type IN ('text', 'image', 'video', 'url')),
  banned_by uuid REFERENCES auth.users(id),
  banned_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  unbanned_at timestamptz,
  unbanned_by uuid REFERENCES auth.users(id),
  notes text
);

CREATE INDEX IF NOT EXISTS idx_tool_bans_user_id ON tool_bans(user_id);
CREATE INDEX IF NOT EXISTS idx_tool_bans_active ON tool_bans(user_id, tool, is_active);

ALTER TABLE tool_bans ENABLE ROW LEVEL SECURITY;

-- Only service role (admin API) can access
CREATE POLICY "service_role_all" ON tool_bans FOR ALL TO service_role USING (true);

-- Also run the overlay_token migration if not yet done:
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS overlay_token uuid DEFAULT gen_random_uuid() UNIQUE;
UPDATE profiles SET overlay_token = gen_random_uuid() WHERE overlay_token IS NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_overlay_token ON profiles(overlay_token);
