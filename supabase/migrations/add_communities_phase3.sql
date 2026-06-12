-- Phase 3 Communities: working likes + comments, pinned/announcement posts,
-- private-community join requests, bans, welcome message.

-- ── Post likes ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_post_likes (
  post_id    uuid        NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE OR REPLACE FUNCTION bump_community_post_likes() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE community_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE community_posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_community_post_likes ON community_post_likes;
CREATE TRIGGER trg_community_post_likes
  AFTER INSERT OR DELETE ON community_post_likes
  FOR EACH ROW EXECUTE FUNCTION bump_community_post_likes();

ALTER TABLE community_post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read community_post_likes" ON community_post_likes FOR SELECT USING (true);
CREATE POLICY "User likes community_post"  ON community_post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User unlikes community_post" ON community_post_likes FOR DELETE USING (auth.uid() = user_id);

-- ── Post comments ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_post_comments (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid        NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text       text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS community_post_comments_post_idx
  ON community_post_comments(post_id, created_at);

CREATE OR REPLACE FUNCTION bump_community_post_comments() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE community_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE community_posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_community_post_comments ON community_post_comments;
CREATE TRIGGER trg_community_post_comments
  AFTER INSERT OR DELETE ON community_post_comments
  FOR EACH ROW EXECUTE FUNCTION bump_community_post_comments();

ALTER TABLE community_post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read community_post_comments" ON community_post_comments FOR SELECT USING (true);

-- Commenting requires membership AND the community's allow_comments toggle —
-- enforced server-side so the client can't bypass it.
CREATE POLICY "Members comment on community_posts"
  ON community_post_comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM community_posts p
      JOIN communities c ON c.id = p.community_id
      WHERE p.id = post_id
        AND c.allow_comments
        AND EXISTS (
          SELECT 1 FROM community_members m
          WHERE m.community_id = c.id AND m.user_id = auth.uid()
        )
    )
  );

-- Authors delete their own comments; community admins can delete any (moderation).
CREATE POLICY "Author deletes own community_comment"
  ON community_post_comments FOR DELETE
  USING (
    auth.uid() = user_id
    OR is_community_admin((SELECT community_id FROM community_posts WHERE id = post_id))
  );

-- ── Pinned + announcement posts ──────────────────────────────────────────────
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS pinned_at       timestamptz;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS is_announcement boolean NOT NULL DEFAULT false;

-- ── Welcome message ──────────────────────────────────────────────────────────
ALTER TABLE communities ADD COLUMN IF NOT EXISTS welcome_message text;

-- ── Bans ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_bans (
  community_id uuid        NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  banned_by    uuid        REFERENCES users(id) ON DELETE SET NULL,
  reason       text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (community_id, user_id)
);

ALTER TABLE community_bans ENABLE ROW LEVEL SECURITY;
-- Banned users can see their own ban; admins see all bans for their community.
CREATE POLICY "Read own ban or admin reads bans"
  ON community_bans FOR SELECT
  USING (auth.uid() = user_id OR is_community_admin(community_id));
CREATE POLICY "Admins ban"
  ON community_bans FOR INSERT
  WITH CHECK (is_community_admin(community_id) AND user_id <> auth.uid());
CREATE POLICY "Admins unban"
  ON community_bans FOR DELETE
  USING (is_community_admin(community_id));

-- ── Join requests (private communities) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_join_requests (
  community_id uuid        NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message      text,
  status       text        NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'denied'
  created_at   timestamptz NOT NULL DEFAULT now(),
  resolved_by  uuid        REFERENCES users(id) ON DELETE SET NULL,
  resolved_at  timestamptz,
  PRIMARY KEY (community_id, user_id),
  CONSTRAINT community_join_requests_status_check CHECK (status IN ('pending', 'approved', 'denied'))
);

ALTER TABLE community_join_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own request or admin reads requests"
  ON community_join_requests FOR SELECT
  USING (auth.uid() = user_id OR is_community_admin(community_id));
-- Banned users can't request to join.
CREATE POLICY "User requests to join"
  ON community_join_requests FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND NOT EXISTS (
      SELECT 1 FROM community_bans b
      WHERE b.community_id = community_join_requests.community_id AND b.user_id = auth.uid()
    )
  );
-- Requester can cancel a pending request; admins resolve via the function below.
CREATE POLICY "User cancels own request"
  ON community_join_requests FOR DELETE
  USING (auth.uid() = user_id);
CREATE POLICY "Admins update requests"
  ON community_join_requests FOR UPDATE
  USING (is_community_admin(community_id))
  WITH CHECK (is_community_admin(community_id));

-- Approve = mark approved + insert membership atomically. SECURITY DEFINER so
-- the membership insert doesn't depend on the requester being the caller.
CREATE OR REPLACE FUNCTION approve_community_join_request(cid uuid, uid uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT is_community_admin(cid) THEN
    RAISE EXCEPTION 'not an admin of this community';
  END IF;
  UPDATE community_join_requests
    SET status = 'approved', resolved_by = auth.uid(), resolved_at = now()
    WHERE community_id = cid AND user_id = uid AND status = 'pending';
  INSERT INTO community_members (community_id, user_id, role)
    VALUES (cid, uid, 'member')
    ON CONFLICT (community_id, user_id) DO NOTHING;
END;
$$;

-- ── Join gating ──────────────────────────────────────────────────────────────
-- Replace the open "User joins" policy: direct joins only for public
-- communities, never when banned. Private joins go through the request flow.
DROP POLICY IF EXISTS "User joins" ON community_members;
CREATE POLICY "User joins"
  ON community_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND NOT EXISTS (
      SELECT 1 FROM community_bans b
      WHERE b.community_id = community_members.community_id AND b.user_id = auth.uid()
    )
    AND (
      NOT EXISTS (
        SELECT 1 FROM communities c
        WHERE c.id = community_members.community_id AND c.is_private
      )
      OR EXISTS (
        SELECT 1 FROM communities c
        WHERE c.id = community_members.community_id AND c.creator_id = auth.uid()
      )
    )
  );

-- Banned users also can't post (belt and braces on top of losing membership).
DROP POLICY IF EXISTS "Members post in community" ON community_posts;
CREATE POLICY "Members post in community"
  ON community_posts FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND NOT EXISTS (
      SELECT 1 FROM community_bans b
      WHERE b.community_id = community_posts.community_id AND b.user_id = auth.uid()
    )
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
