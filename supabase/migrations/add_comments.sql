-- ─── Post comments ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS post_comments (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id           uuid        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id           uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_comment_id uuid        REFERENCES post_comments(id) ON DELETE SET NULL,
  text              text        NOT NULL,
  likes_count       int         NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS comments_post_id_idx ON post_comments(post_id, created_at ASC);

ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read comments"
  ON post_comments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert own comments"
  ON post_comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON post_comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ─── Comment likes ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS comment_likes (
  comment_id uuid NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES users(id)         ON DELETE CASCADE,
  PRIMARY KEY (comment_id, user_id)
);

ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read comment likes"
  ON comment_likes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert own comment likes"
  ON comment_likes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comment likes"
  ON comment_likes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ─── Toggle-like RPC ───────────────────────────────────────────────────────────
-- SECURITY DEFINER so the update to likes_count is not blocked by RLS.

CREATE OR REPLACE FUNCTION toggle_comment_like(
  p_comment_id uuid,
  p_user_id    uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exists boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM comment_likes
    WHERE comment_id = p_comment_id AND user_id = p_user_id
  ) INTO v_exists;

  IF v_exists THEN
    DELETE FROM comment_likes
    WHERE comment_id = p_comment_id AND user_id = p_user_id;
    UPDATE post_comments
    SET likes_count = GREATEST(likes_count - 1, 0)
    WHERE id = p_comment_id;
    RETURN jsonb_build_object('liked', false);
  ELSE
    INSERT INTO comment_likes (comment_id, user_id)
    VALUES (p_comment_id, p_user_id)
    ON CONFLICT DO NOTHING;
    UPDATE post_comments
    SET likes_count = likes_count + 1
    WHERE id = p_comment_id;
    RETURN jsonb_build_object('liked', true);
  END IF;
END;
$$;
