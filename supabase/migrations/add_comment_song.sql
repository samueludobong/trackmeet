-- Song attachment columns for post_comments
-- Mirrors the song columns already on the posts table.
ALTER TABLE post_comments
  ADD COLUMN IF NOT EXISTS song_id        text,
  ADD COLUMN IF NOT EXISTS song_name      text,
  ADD COLUMN IF NOT EXISTS song_artist    text,
  ADD COLUMN IF NOT EXISTS song_album_art text;
