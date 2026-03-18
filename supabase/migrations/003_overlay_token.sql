-- Add overlay_token to profiles for secure per-user overlay URLs
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS overlay_token uuid DEFAULT gen_random_uuid() UNIQUE;

-- Auto-generate token for existing users who don't have one
UPDATE profiles SET overlay_token = gen_random_uuid() WHERE overlay_token IS NULL;

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_profiles_overlay_token ON profiles(overlay_token);
