-- Optional description shown on the curated playlist detail screen.
alter table public.curated_playlists
  add column if not exists description text;
