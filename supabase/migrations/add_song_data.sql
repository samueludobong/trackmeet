-- Individual columns for a Spotify track attached to a music-type post.
-- Uses ADD COLUMN IF NOT EXISTS so re-running is safe.
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS song_id        text,
  ADD COLUMN IF NOT EXISTS song_name      text,
  ADD COLUMN IF NOT EXISTS song_artist    text,
  ADD COLUMN IF NOT EXISTS song_album_art text;
