-- Per-story display duration (ms). Lets the author pick how long the story
-- shows (5 / 15 / 30s); the viewer animates progress + plays the song preview
-- for this long. Defaults to 5s so existing rows keep their behaviour.
ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS duration_ms int NOT NULL DEFAULT 5000;
