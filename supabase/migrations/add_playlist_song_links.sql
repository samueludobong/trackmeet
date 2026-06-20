-- Let curated playlists hold non-Spotify songs (added from pasted-link music
-- cards). spotify_track_id is no longer required; song_url/provider/links carry
-- the multi-provider identity so the play overlay can offer "listen on …" and
-- the play-all button can still filter to Spotify-only tracks.
ALTER TABLE curated_playlist_songs
  ALTER COLUMN spotify_track_id DROP NOT NULL;

ALTER TABLE curated_playlist_songs
  ADD COLUMN IF NOT EXISTS song_url      text,
  ADD COLUMN IF NOT EXISTS song_provider text,
  ADD COLUMN IF NOT EXISTS song_links    jsonb;
