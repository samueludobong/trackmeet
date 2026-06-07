-- Shared cache of translated lyrics, keyed by (track, target language). The first
-- person to translate a song into a language pays the Claude call; everyone after
-- reads from here. Timestamped lines are stored as LRC text (same as lyrics_cache)
-- so playback sync survives.
CREATE TABLE IF NOT EXISTS lyrics_translations (
  spotify_track_id text        NOT NULL,
  target_lang      text        NOT NULL,
  source_lang      text,
  synced_lyrics    text,        -- raw LRC (timestamped); null when only plain exists
  plain_lyrics     text,        -- plain translated lyrics; null when synced exists
  created_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (spotify_track_id, target_lang)
);

ALTER TABLE lyrics_translations ENABLE ROW LEVEL SECURITY;

-- Translations are public reference data — anyone may read.
CREATE POLICY "Public read lyrics_translations"
  ON lyrics_translations FOR SELECT
  USING (true);

-- Any signed-in user may populate the cache.
CREATE POLICY "Authenticated insert lyrics_translations"
  ON lyrics_translations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
