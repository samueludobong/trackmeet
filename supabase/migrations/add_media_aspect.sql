-- ─── Cached media aspect ratio ────────────────────────────────────────────────
-- For video posts: the natural width / height of the uploaded clip, captured
-- at post-creation time from expo-image-picker's asset metadata. Lets feed
-- cards size to the correct aspect on first paint instead of starting at a
-- default 16:9 and jumping to portrait when the player reports back.
-- Stored as `real` (float4) — we only need ~3 significant figures.

alter table public.posts
  add column if not exists media_aspect real;
