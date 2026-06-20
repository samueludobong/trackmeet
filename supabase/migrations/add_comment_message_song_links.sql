-- Extend the pasted-link multi-provider song attachment to comments and chats.
-- Same shape as posts: song_url (source link to open), song_provider, and the
-- full Odesli platform set (song_links) so the card can offer "listen on …"
-- alternatives. On messages we reuse the existing spotify_track_* columns for
-- name/artist/art + spotify id; these add the cross-provider fields.
ALTER TABLE post_comments
  ADD COLUMN IF NOT EXISTS song_url      text,
  ADD COLUMN IF NOT EXISTS song_provider text,
  ADD COLUMN IF NOT EXISTS song_links    jsonb;

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS song_url      text,
  ADD COLUMN IF NOT EXISTS song_provider text,
  ADD COLUMN IF NOT EXISTS song_links    jsonb;
