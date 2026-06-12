-- ─── Notes table ─────────────────────────────────────────────────────────────
-- Ephemeral IG-style "notes" shown in the Messages now-listening strip. A note
-- is either a short text or a pinned song, and expires 24h after creation.
-- One live note per user: the user_id unique constraint lets the app upsert
-- (re-posting a note replaces the previous one and resets the 24h clock).
--
-- RLS mirrors stories: anyone authenticated may read *live* notes (expires_at in
-- the future); the client filters down to the viewer + people they follow. Only
-- the author may insert/update/delete their own note.

create table if not exists public.notes (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  type            text not null check (type in ('text','song')),

  -- ── Text payload (type='text') ─────────────────────────────────────────────
  text            text,

  -- ── Song payload (type='song') ─────────────────────────────────────────────
  song_id         text,
  song_name       text,
  song_artist     text,
  song_album_art  text,

  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null default (now() + interval '24 hours')
);

-- One live note per user (upsert target).
create unique index if not exists notes_user_id_key on public.notes (user_id);
-- Fast "live notes" scans.
create index if not exists notes_expires_at_idx on public.notes (expires_at desc);

alter table public.notes enable row level security;

drop policy if exists "Anyone can read live notes" on public.notes;
create policy "Anyone can read live notes"
  on public.notes for select
  to authenticated
  using (expires_at > now());

drop policy if exists "Users can insert own note" on public.notes;
create policy "Users can insert own note"
  on public.notes for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own note" on public.notes;
create policy "Users can update own note"
  on public.notes for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own note" on public.notes;
create policy "Users can delete own note"
  on public.notes for delete
  to authenticated
  using (auth.uid() = user_id);

-- Optional housekeeping (the SELECT policy already hides expired notes).
create or replace function public.purge_expired_notes()
returns void
language sql
security definer
as $$
  delete from public.notes where expires_at <= now();
$$;
