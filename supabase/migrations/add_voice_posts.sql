-- Voice-note posts: short audio (<= 30s) with a waveform played in-feed.
ALTER TABLE posts ADD COLUMN IF NOT EXISTS voice_url         text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS voice_duration_ms integer;
-- Optional pre-computed amplitude samples (0..1) for static waveform rendering.
ALTER TABLE posts ADD COLUMN IF NOT EXISTS voice_waveform    jsonb;
