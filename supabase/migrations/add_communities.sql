-- Communities: user-created groups, optionally centered on an artist.
CREATE TABLE IF NOT EXISTS communities (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id     uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name           text        NOT NULL,
  description    text,
  avatar_url     text,                                 -- defaults to the artist's avatar when left empty
  artist_id      uuid        REFERENCES artists(id) ON DELETE SET NULL,
  is_private     boolean     NOT NULL DEFAULT false,   -- privacy: invite/approve only
  allow_posts    boolean     NOT NULL DEFAULT true,    -- members may post
  allow_comments boolean     NOT NULL DEFAULT true,    -- comments enabled
  allow_offtopic boolean     NOT NULL DEFAULT true,    -- content outside the artist allowed
  tags           text[]      NOT NULL DEFAULT '{}',    -- topic/genre tags
  rules          text,                                 -- community guidelines
  member_count   int         NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS communities_creator_idx ON communities(creator_id);
CREATE INDEX IF NOT EXISTS communities_artist_idx  ON communities(artist_id);

-- Membership (the creator is added as 'owner'). Roles enable future moderation.
CREATE TABLE IF NOT EXISTS community_members (
  community_id uuid        NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role         text        NOT NULL DEFAULT 'member',  -- 'owner' | 'moderator' | 'member'
  joined_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (community_id, user_id)
);

-- Keep communities.member_count in sync with the members table.
CREATE OR REPLACE FUNCTION bump_community_member_count() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE communities SET member_count = member_count + 1 WHERE id = NEW.community_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE communities SET member_count = GREATEST(member_count - 1, 0) WHERE id = OLD.community_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_community_member_count ON community_members;
CREATE TRIGGER trg_community_member_count
  AFTER INSERT OR DELETE ON community_members
  FOR EACH ROW EXECUTE FUNCTION bump_community_member_count();

-- ── RLS ────────────────────────────────────────────────────────────────────────
ALTER TABLE communities       ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_members  ENABLE ROW LEVEL SECURITY;

-- Community rows are discoverable; private gating applies to their content (future).
CREATE POLICY "Public read communities"   ON communities FOR SELECT USING (true);
CREATE POLICY "Creator inserts community"  ON communities FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creator updates community"  ON communities FOR UPDATE USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creator deletes community"  ON communities FOR DELETE USING (auth.uid() = creator_id);

CREATE POLICY "Public read members" ON community_members FOR SELECT USING (true);
CREATE POLICY "User joins"          ON community_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User leaves"         ON community_members FOR DELETE USING (auth.uid() = user_id);
