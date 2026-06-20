-- Multi-provider music posts. When a song is attached by pasting a streaming
-- link (Spotify, Apple Music, YouTube, SoundCloud) we store the source URL and
-- which provider it came from so the music card's open button launches the
-- right app. `song_id` still holds the Spotify track id when Odesli found a
-- match (keeps 30s preview + Add-to-Playlist working); it's null for songs only
-- found on a non-Spotify provider.
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS song_url      text,
  ADD COLUMN IF NOT EXISTS song_provider text;
