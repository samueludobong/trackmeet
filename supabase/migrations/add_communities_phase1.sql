-- Phase 1 Communities: banner, slug, genres, post_count, allow_anyone_to_post,
-- notification_preference + last_active_at on members, community_id on meets.

-- ── communities ──────────────────────────────────────────────────────────────
ALTER TABLE communities ADD COLUMN IF NOT EXISTS slug                 text;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS banner_url           text;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS banner_color         text;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS genres               text[]  NOT NULL DEFAULT '{}';
ALTER TABLE communities ADD COLUMN IF NOT EXISTS post_count           int     NOT NULL DEFAULT 0;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS allow_anyone_to_post boolean NOT NULL DEFAULT true;

-- Auto-generate slugs for existing rows that don't have one.
UPDATE communities
SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL OR slug = '';

CREATE UNIQUE INDEX IF NOT EXISTS communities_slug_uniq ON communities(slug);

-- Keep post_count in sync with community_posts.
CREATE OR REPLACE FUNCTION bump_community_post_count() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE communities SET post_count = post_count + 1 WHERE id = NEW.community_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE communities SET post_count = GREATEST(post_count - 1, 0) WHERE id = OLD.community_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_community_post_count ON community_posts;
CREATE TRIGGER trg_community_post_count
  AFTER INSERT OR DELETE ON community_posts
  FOR EACH ROW EXECUTE FUNCTION bump_community_post_count();

-- Backfill existing counts.
UPDATE communities c
SET post_count = sub.n
FROM (SELECT community_id, COUNT(*)::int AS n FROM community_posts GROUP BY community_id) sub
WHERE c.id = sub.community_id;

-- ── community_members ───────────────────────────────────────────────────────
ALTER TABLE community_members
  ADD COLUMN IF NOT EXISTS notification_preference text        NOT NULL DEFAULT 'all';
ALTER TABLE community_members
  ADD COLUMN IF NOT EXISTS last_active_at          timestamptz NOT NULL DEFAULT now();

-- 'all' | 'meets' | 'muted'
ALTER TABLE community_members
  DROP CONSTRAINT IF EXISTS community_members_notification_preference_check;
ALTER TABLE community_members
  ADD  CONSTRAINT community_members_notification_preference_check
       CHECK (notification_preference IN ('all', 'meets', 'muted'));

CREATE INDEX IF NOT EXISTS community_members_active_idx
  ON community_members(community_id, last_active_at DESC);

-- Members can update their own membership row (notification pref, last_active_at).
DROP POLICY IF EXISTS "User updates own membership" ON community_members;
CREATE POLICY "User updates own membership"
  ON community_members FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── community_posts ─────────────────────────────────────────────────────────
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS reposts_count int NOT NULL DEFAULT 0;

-- ── posts (main feed) ───────────────────────────────────────────────────────
-- Goal #17: tag main-feed posts with a community via community_id (null = personal).
ALTER TABLE posts ADD COLUMN IF NOT EXISTS community_id uuid REFERENCES communities(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS posts_community_id_idx ON posts(community_id, created_at DESC);

-- Goal #15: surface `created_by` on communities (alias of creator_id) so callers
-- that follow the spec can read it. Kept in sync with creator_id via trigger.
ALTER TABLE communities ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES users(id) ON DELETE CASCADE;
UPDATE communities SET created_by = creator_id WHERE created_by IS NULL;

CREATE OR REPLACE FUNCTION sync_community_created_by() RETURNS trigger AS $$
BEGIN
  IF NEW.created_by IS NULL THEN NEW.created_by := NEW.creator_id; END IF;
  IF NEW.creator_id IS NULL THEN NEW.creator_id := NEW.created_by; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_community_created_by ON communities;
CREATE TRIGGER trg_community_created_by
  BEFORE INSERT OR UPDATE ON communities
  FOR EACH ROW EXECUTE FUNCTION sync_community_created_by();

-- ── meets ───────────────────────────────────────────────────────────────────
ALTER TABLE meets ADD COLUMN IF NOT EXISTS community_id uuid REFERENCES communities(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS meets_community_live_idx ON meets(community_id, is_live);
