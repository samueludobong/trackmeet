-- Whether a song's lyrics have ever been "discovered" (looked up) by anyone.
-- The first viewer flips this to true and gets the celebration; once true, the
-- discovery animation never fires again for anyone.
ALTER TABLE lyrics_cache
  ADD COLUMN IF NOT EXISTS is_discovered boolean NOT NULL DEFAULT false;
