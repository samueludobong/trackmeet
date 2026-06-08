-- Admin control: owners + moderators can manage the community, its members, and its posts.
-- Replaces the creator-only policies from add_communities.sql / add_community_posts.sql.

-- Helper: is the caller an admin (owner or moderator) of a community?
CREATE OR REPLACE FUNCTION is_community_admin(c uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM community_members m
    WHERE m.community_id = c
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'moderator')
  )
  OR EXISTS (
    SELECT 1 FROM communities cc
    WHERE cc.id = c AND cc.creator_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION is_community_owner(c uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM community_members m
    WHERE m.community_id = c
      AND m.user_id = auth.uid()
      AND m.role = 'owner'
  )
  OR EXISTS (
    SELECT 1 FROM communities cc
    WHERE cc.id = c AND cc.creator_id = auth.uid()
  );
$$;

-- ── communities ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Creator updates community"  ON communities;
DROP POLICY IF EXISTS "Creator deletes community"  ON communities;

CREATE POLICY "Admins update community"
  ON communities FOR UPDATE
  USING (is_community_admin(id))
  WITH CHECK (is_community_admin(id));

CREATE POLICY "Owners delete community"
  ON communities FOR DELETE
  USING (is_community_owner(id));

-- ── community_members ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins update members" ON community_members;
DROP POLICY IF EXISTS "Admins remove members" ON community_members;

CREATE POLICY "Admins update members"
  ON community_members FOR UPDATE
  USING (is_community_admin(community_id))
  WITH CHECK (is_community_admin(community_id));

-- Members can still leave themselves (existing "User leaves" policy); admins can also remove others.
CREATE POLICY "Admins remove members"
  ON community_members FOR DELETE
  USING (is_community_admin(community_id) AND user_id <> auth.uid());

-- ── community_posts ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins delete community_post" ON community_posts;
DROP POLICY IF EXISTS "Admins update community_post" ON community_posts;

CREATE POLICY "Admins delete community_post"
  ON community_posts FOR DELETE
  USING (is_community_admin(community_id));

CREATE POLICY "Admins update community_post"
  ON community_posts FOR UPDATE
  USING (is_community_admin(community_id))
  WITH CHECK (is_community_admin(community_id));
