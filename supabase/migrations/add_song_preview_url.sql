-- ─── Cached 30s song previews ────────────────────────────────────────────────
-- Spotify removed `preview_url` from the Web API in late 2024. We scrape the
-- embed page's `audioPreview.url` and cache the audio in our `post-media`
-- bucket under `song-previews/{songId}.mp3`. Posts persist a direct public URL
-- in `song_preview_url` so the feed can stream without re-scraping.

alter table public.posts
  add column if not exists song_preview_url text;

-- Allow any authenticated user to upload into the shared `song-previews/` folder
-- in the existing `post-media` bucket. Previews are deduped by song id and
-- reusable across posts/users, so they sit outside the per-user upload policy.
drop policy if exists "Authenticated can upload song previews" on storage.objects;
create policy "Authenticated can upload song previews"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'post-media' and (storage.foldername(name))[1] = 'song-previews');

drop policy if exists "Authenticated can update song previews" on storage.objects;
create policy "Authenticated can update song previews"
  on storage.objects for update to authenticated
  using (bucket_id = 'post-media' and (storage.foldername(name))[1] = 'song-previews');
