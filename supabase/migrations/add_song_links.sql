-- Full cross-platform link set for a pasted-link music post (resolved via
-- Odesli). Lets the music card offer "listen on <your platform>" alternatives
-- alongside the original. Shape: [{ "platform": "spotify", "url": "https://…" }].
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS song_links jsonb;
