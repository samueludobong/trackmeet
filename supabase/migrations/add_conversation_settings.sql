-- Per-user, per-conversation personalization for direct messages.
-- Lets each side set their own nickname for the other person, an accent color,
-- a background color, and a background image — without affecting how the other
-- side sees the conversation. Each (conversation_id, user_id) row is its own
-- side's view of the DM.
CREATE TABLE IF NOT EXISTS conversation_settings (
  conversation_id      uuid        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id              uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b              uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nickname             text,
  accent_color         text,
  background_color     text,
  background_image_url text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS conversation_settings_user_idx
  ON conversation_settings (user_id);

ALTER TABLE conversation_settings ENABLE ROW LEVEL SECURITY;

-- Each user is the sole reader and writer of their own settings row.
CREATE POLICY "Owner full access on conversation_settings"
  ON conversation_settings FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Keep updated_at fresh on every change.
CREATE OR REPLACE FUNCTION touch_conversation_settings_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS conversation_settings_touch_updated_at ON conversation_settings;
CREATE TRIGGER conversation_settings_touch_updated_at
  BEFORE UPDATE ON conversation_settings
  FOR EACH ROW
  EXECUTE FUNCTION touch_conversation_settings_updated_at();

-- ── DM-scoped curated playlists ───────────────────────────────────────────────
-- A curated playlist can optionally be scoped to a 1:1 conversation. When
-- conversation_id is set, both DM participants can read AND write it
-- (collaborative). When NULL the playlist is owned solely by user_id (existing
-- profile-playlist behavior — leave untouched).
ALTER TABLE curated_playlists
  ADD COLUMN IF NOT EXISTS conversation_id uuid
  REFERENCES conversations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS curated_playlists_conversation_idx
  ON curated_playlists (conversation_id)
  WHERE conversation_id IS NOT NULL;

-- Both participants in the conversation can SELECT a DM-scoped playlist.
CREATE POLICY "DM participants read conversation playlists"
  ON curated_playlists FOR SELECT
  USING (
    conversation_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
        AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
    )
  );

-- Both participants can create new DM-scoped playlists.
CREATE POLICY "DM participants insert conversation playlists"
  ON curated_playlists FOR INSERT
  WITH CHECK (
    conversation_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
        AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
    )
  );

-- Both participants can edit DM-scoped playlists (rename, change cover, etc.).
CREATE POLICY "DM participants update conversation playlists"
  ON curated_playlists FOR UPDATE
  USING (
    conversation_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
        AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
    )
  );

-- Both participants can delete a DM-scoped playlist.
CREATE POLICY "DM participants delete conversation playlists"
  ON curated_playlists FOR DELETE
  USING (
    conversation_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
        AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
    )
  );

-- Songs inside DM-scoped playlists follow the same shared-access model.
CREATE POLICY "DM participants full access on conversation playlist songs"
  ON curated_playlist_songs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM curated_playlists p
      JOIN conversations c ON c.id = p.conversation_id
      WHERE p.id = playlist_id
        AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM curated_playlists p
      JOIN conversations c ON c.id = p.conversation_id
      WHERE p.id = playlist_id
        AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
    )
  );
