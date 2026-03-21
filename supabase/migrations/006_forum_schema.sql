-- ============================================================
-- StreamVibe Community Forum - Full Database Migration
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/ugodapqlmajfhvrodlyf/sql
-- ============================================================

-- ── 1. Tables ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS forum_categories (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text NOT NULL,
  description text,
  "order"     integer DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS forum_subforums (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id uuid REFERENCES forum_categories(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  "order"     integer DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS forum_threads (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  subforum_id uuid REFERENCES forum_subforums(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title       text NOT NULL,
  content     text NOT NULL,
  is_pinned   boolean DEFAULT false,
  is_locked   boolean DEFAULT false,
  view_count  integer DEFAULT 0,
  reply_count integer DEFAULT 0,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS forum_posts (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id  uuid REFERENCES forum_threads(id) ON DELETE CASCADE,
  user_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  content    text NOT NULL,
  is_deleted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS post_edit_history (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id     uuid REFERENCES forum_posts(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  old_content text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS post_reactions (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id    uuid REFERENCES forum_posts(id) ON DELETE CASCADE,
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji      text NOT NULL DEFAULT '👍',
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id, emoji)
);

CREATE TABLE IF NOT EXISTS thread_bookmarks (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id  uuid REFERENCES forum_threads(id) ON DELETE CASCADE,
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(thread_id, user_id)
);

CREATE TABLE IF NOT EXISTS thread_prefixes (
  id    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  text  text NOT NULL,
  color text DEFAULT '#00e5ff'
);

CREATE TABLE IF NOT EXISTS forum_notifications (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type       text NOT NULL,
  thread_id  uuid REFERENCES forum_threads(id) ON DELETE CASCADE,
  post_id    uuid REFERENCES forum_posts(id) ON DELETE CASCADE,
  from_user  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_read    boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_reputation (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  points     integer DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_follows (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id  uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at   timestamptz DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

CREATE TABLE IF NOT EXISTS spam_reports (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  post_id     uuid REFERENCES forum_posts(id) ON DELETE CASCADE,
  reason      text,
  resolved    boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS moderation_logs (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  moderator_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action       text NOT NULL,
  target_type  text,
  target_id    uuid,
  notes        text,
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS system_settings (
  key        text PRIMARY KEY,
  value      text,
  updated_at timestamptz DEFAULT now()
);

-- ── 2. RPC for view count ──────────────────────────────────

CREATE OR REPLACE FUNCTION increment_thread_view(t_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE forum_threads SET view_count = view_count + 1 WHERE id = t_id;
END;
$$;

-- ── 3. Auto-update reply_count trigger ────────────────────

CREATE OR REPLACE FUNCTION update_thread_reply_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE forum_threads
      SET reply_count = reply_count + 1, updated_at = now()
      WHERE id = NEW.thread_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE forum_threads
      SET reply_count = GREATEST(0, reply_count - 1)
      WHERE id = OLD.thread_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_reply_count ON forum_posts;
CREATE TRIGGER trg_reply_count
AFTER INSERT OR DELETE ON forum_posts
FOR EACH ROW EXECUTE FUNCTION update_thread_reply_count();

-- ── 4. Row Level Security ──────────────────────────────────

ALTER TABLE forum_categories    ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_subforums     ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_threads       ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_edit_history   ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_reactions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_bookmarks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_prefixes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reputation     ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows        ENABLE ROW LEVEL SECURITY;
ALTER TABLE spam_reports        ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings     ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "public_read_categories"  ON forum_categories    FOR SELECT USING (true);
CREATE POLICY "public_read_subforums"   ON forum_subforums     FOR SELECT USING (true);
CREATE POLICY "public_read_threads"     ON forum_threads       FOR SELECT USING (true);
CREATE POLICY "public_read_posts"       ON forum_posts         FOR SELECT USING (true);
CREATE POLICY "public_read_prefixes"    ON thread_prefixes     FOR SELECT USING (true);
CREATE POLICY "public_read_reactions"   ON post_reactions      FOR SELECT USING (true);
CREATE POLICY "public_read_reputation"  ON user_reputation     FOR SELECT USING (true);
CREATE POLICY "public_read_follows"     ON user_follows        FOR SELECT USING (true);
CREATE POLICY "public_read_settings"    ON system_settings     FOR SELECT USING (true);
CREATE POLICY "public_read_edit_hist"   ON post_edit_history   FOR SELECT USING (true);
CREATE POLICY "public_read_modlogs"     ON moderation_logs     FOR SELECT USING (true);

-- Auth users can write
CREATE POLICY "auth_insert_threads"       ON forum_threads       FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "auth_insert_posts"         ON forum_posts         FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "auth_update_own_thread"    ON forum_threads       FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "auth_update_own_post"      ON forum_posts         FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "auth_insert_reactions"     ON post_reactions      FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "auth_delete_reactions"     ON post_reactions      FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "auth_insert_bookmarks"     ON thread_bookmarks    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "auth_delete_bookmarks"     ON thread_bookmarks    FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "auth_read_bookmarks"       ON thread_bookmarks    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "auth_insert_spam"          ON spam_reports        FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "auth_read_spam"            ON spam_reports        FOR SELECT USING (auth.uid() = reporter_id);
CREATE POLICY "auth_insert_follows"       ON user_follows        FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "auth_delete_follows"       ON user_follows        FOR DELETE USING (auth.uid() = follower_id);
CREATE POLICY "auth_read_notifications"   ON forum_notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "auth_update_notifications" ON forum_notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "auth_all_reputation"       ON user_reputation     FOR ALL    USING (auth.uid() = user_id);
CREATE POLICY "auth_insert_edit_history"  ON post_edit_history   FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── 5. Seed default categories & subforums ─────────────────

INSERT INTO forum_categories (name, description, "order") VALUES
  ('General',        'General StreamVibe discussion',              1),
  ('Guides & Tips',  'Tutorials, how-tos, and streaming advice',   2),
  ('Tools & Games',  'Discussion about StreamVibe tools and games',3),
  ('Support',        'Get help from the community',                4)
ON CONFLICT DO NOTHING;

INSERT INTO forum_subforums (category_id, name, description, "order")
SELECT id, 'Announcements',     'Official StreamVibe announcements',         1 FROM forum_categories WHERE name='General'
ON CONFLICT DO NOTHING;
INSERT INTO forum_subforums (category_id, name, description, "order")
SELECT id, 'Introductions',     'Introduce yourself to the community',        2 FROM forum_categories WHERE name='General'
ON CONFLICT DO NOTHING;
INSERT INTO forum_subforums (category_id, name, description, "order")
SELECT id, 'Off Topic',         'Anything goes (keep it friendly)',           3 FROM forum_categories WHERE name='General'
ON CONFLICT DO NOTHING;

INSERT INTO forum_subforums (category_id, name, description, "order")
SELECT id, 'TikTok LIVE Tips',  'Grow your TikTok LIVE audience',             1 FROM forum_categories WHERE name='Guides & Tips'
ON CONFLICT DO NOTHING;
INSERT INTO forum_subforums (category_id, name, description, "order")
SELECT id, 'Overlay Setup',     'Configuring your StreamVibe overlays',       2 FROM forum_categories WHERE name='Guides & Tips'
ON CONFLICT DO NOTHING;

INSERT INTO forum_subforums (category_id, name, description, "order")
SELECT id, 'Auction Tool',      'Live Auction tool tips and strategies',       1 FROM forum_categories WHERE name='Tools & Games'
ON CONFLICT DO NOTHING;
INSERT INTO forum_subforums (category_id, name, description, "order")
SELECT id, 'Cannon Blast',      'Ball Guys Cannon Blast game discussion',      2 FROM forum_categories WHERE name='Tools & Games'
ON CONFLICT DO NOTHING;
INSERT INTO forum_subforums (category_id, name, description, "order")
SELECT id, 'Live Words',        'Live Words game strategy and discussion',     3 FROM forum_categories WHERE name='Tools & Games'
ON CONFLICT DO NOTHING;

INSERT INTO forum_subforums (category_id, name, description, "order")
SELECT id, 'Bug Reports',       'Report bugs or issues you have found',        1 FROM forum_categories WHERE name='Support'
ON CONFLICT DO NOTHING;
INSERT INTO forum_subforums (category_id, name, description, "order")
SELECT id, 'Feature Requests',  'Suggest new features for StreamVibe',         2 FROM forum_categories WHERE name='Support'
ON CONFLICT DO NOTHING;

-- ── 6. Seed thread prefixes ────────────────────────────────

INSERT INTO thread_prefixes (text, color) VALUES
  ('Guide',      '#22c55e'),
  ('Question',   '#3b82f6'),
  ('Discussion', '#a855f7'),
  ('Bug',        '#ef4444'),
  ('Suggestion', '#f59e0b')
ON CONFLICT DO NOTHING;

-- Done! ✅
