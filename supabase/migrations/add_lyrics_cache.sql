-- Shared, app-wide lyrics cache. Keyed by Spotify track id so the first person
-- to view a song's lyrics populates it for everyone after them (instant load).
-- `not_found` caches the negative result too, so tracks lrclib doesn't have
-- don't trigger a network lookup on every open.
CREATE TABLE IF NOT EXISTS lyrics_cache (
  spotify_track_id text        PRIMARY KEY,
  track_name       text        NOT NULL,
  track_artist     text,
  synced_lyrics    text,        -- raw LRC (timestamped); null when only plain exists
  plain_lyrics     text,        -- plain, untimed lyrics; null when none
  not_found        boolean     NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ── RLS ────────────────────────────────────────────────────────────────────────
ALTER TABLE lyrics_cache ENABLE ROW LEVEL SECURITY;

-- Lyrics are public reference data — anyone may read the cache.
CREATE POLICY "Public read lyrics_cache"
  ON lyrics_cache FOR SELECT
  USING (true);

-- Any signed-in user may populate or refresh a cache entry (shared cache, no
-- per-user ownership).
CREATE POLICY "Authenticated insert lyrics_cache"
  ON lyrics_cache FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated update lyrics_cache"
  ON lyrics_cache FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
