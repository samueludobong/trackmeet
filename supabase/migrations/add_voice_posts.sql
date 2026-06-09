-- Voice-note posts: short audio (<= 30s) with a waveform played in-feed.
ALTER TABLE posts ADD COLUMN IF NOT EXISTS voice_url         text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS voice_duration_ms integer;
-- Optional pre-computed amplitude samples (0..1) for static waveform rendering.
ALTER TABLE posts ADD COLUMN IF NOT EXISTS voice_waveform    jsonb;

-- ── Dedicated audio bucket ───────────────────────────────────────────────────
-- Public-read so the feed can stream <Audio> directly via the public URL.
-- 10 MB cap is plenty for a 30-second m4a (~300 KB) and leaves headroom for
-- future longer voice messages or higher-quality codecs.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-audio',
  'post-audio',
  true,
  10485760,
  ARRAY['audio/m4a', 'audio/mp4', 'audio/mpeg', 'audio/aac', 'audio/wav', 'audio/x-m4a', 'audio/webm']
)
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Users may only upload under their own uid/ prefix (matches post-media's pattern).
DROP POLICY IF EXISTS "Users can upload voice notes" ON storage.objects;
CREATE POLICY "Users can upload voice notes"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'post-audio'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Authors can delete their own audio (e.g. if they retake a recording).
DROP POLICY IF EXISTS "Users can delete own voice notes" ON storage.objects;
CREATE POLICY "Users can delete own voice notes"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'post-audio'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Public read so the <Audio> player can stream without an auth header.
DROP POLICY IF EXISTS "Voice notes are public" ON storage.objects;
CREATE POLICY "Voice notes are public"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'post-audio');
