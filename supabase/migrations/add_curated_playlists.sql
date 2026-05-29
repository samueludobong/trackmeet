-- Curated playlists: user-created, platform-native playlists
CREATE TABLE IF NOT EXISTS curated_playlists (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            text        NOT NULL,
  image_url       text,
  tags            text[]      NOT NULL DEFAULT '{}',
  show_on_profile boolean     NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Songs inside curated playlists (sourced from Spotify search / now-playing)
CREATE TABLE IF NOT EXISTS curated_playlist_songs (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id      uuid        NOT NULL REFERENCES curated_playlists(id) ON DELETE CASCADE,
  spotify_track_id text        NOT NULL,
  track_name       text        NOT NULL,
  track_artist     text        NOT NULL,
  album_art        text,
  duration_ms      int         NOT NULL DEFAULT 0,
  position         int         NOT NULL DEFAULT 0,
  added_at         timestamptz NOT NULL DEFAULT now()
);

-- Which Spotify playlists a user chose to show on their profile
CREATE TABLE IF NOT EXISTS spotify_playlist_profile (
  user_id     uuid  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  playlist_id text  NOT NULL,
  PRIMARY KEY (user_id, playlist_id)
);

-- ── RLS ────────────────────────────────────────────────────────────────────────

ALTER TABLE curated_playlists        ENABLE ROW LEVEL SECURITY;
ALTER TABLE curated_playlist_songs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE spotify_playlist_profile ENABLE ROW LEVEL SECURITY;

-- Owners have full access to their own curated playlists
CREATE POLICY "Owner full access on curated_playlists"
  ON curated_playlists FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Anyone can read playlists that are set to show on profile
CREATE POLICY "Public read profile playlists"
  ON curated_playlists FOR SELECT
  USING (show_on_profile = true);

-- Owners have full access to songs in their playlists
CREATE POLICY "Owner full access on curated_playlist_songs"
  ON curated_playlist_songs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM curated_playlists
      WHERE id = playlist_id AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM curated_playlists
      WHERE id = playlist_id AND user_id = auth.uid()
    )
  );

-- Anyone can read songs in public playlists
CREATE POLICY "Public read profile playlist songs"
  ON curated_playlist_songs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM curated_playlists
      WHERE id = playlist_id AND show_on_profile = true
    )
  );

-- Owners manage their own Spotify profile display settings
CREATE POLICY "Owner full access on spotify_playlist_profile"
  ON spotify_playlist_profile FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
