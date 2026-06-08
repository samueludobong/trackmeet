-- Posts inside a community. Music fields mirror the main posts table so songs can
-- be shared here too. Counts are denormalized for cheap rendering.
CREATE TABLE IF NOT EXISTS community_posts (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id   uuid        NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id        uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text           text,
  song_id        text,
  song_name      text,
  song_artist    text,
  song_album_art text,
  likes_count    int         NOT NULL DEFAULT 0,
  comments_count int         NOT NULL DEFAULT 0,
  views_count    int         NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS community_posts_community_idx ON community_posts(community_id, created_at DESC);

ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;

-- Anyone can read a community's posts (private-community gating is a future step).
CREATE POLICY "Public read community_posts"
  ON community_posts FOR SELECT
  USING (true);

-- Posting is allowed for the creator, or for members when the community permits
-- posts — enforced server-side so the client can't bypass the toggle.
CREATE POLICY "Members post in community"
  ON community_posts FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM communities c
      WHERE c.id = community_id
        AND (
          c.creator_id = auth.uid()
          OR (c.allow_posts AND EXISTS (
            SELECT 1 FROM community_members m
            WHERE m.community_id = c.id AND m.user_id = auth.uid()
          ))
        )
    )
  );

-- Authors can delete their own community posts.
CREATE POLICY "Author deletes community_post"
  ON community_posts FOR DELETE
  USING (auth.uid() = user_id);
