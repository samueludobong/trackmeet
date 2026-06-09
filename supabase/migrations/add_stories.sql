-- ─── Stories table ───────────────────────────────────────────────────────────
-- Ephemeral story posts. Each story has a type (music / text / wrapped) and
-- expires 24h after creation.  RLS lets anyone read live stories (expires_at
-- in the future) and only the author can create / delete their own.

create table if not exists public.stories (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  type            text not null check (type in ('music','text','wrapped')),
  -- Numeric card-design index (0..N).  Each `type` defines its own designs.
  card_design     int  not null default 0,

  -- ── Music payload (type='music') ───────────────────────────────────────────
  song_id         text,
  song_name       text,
  song_artist     text,
  song_album_art  text,

  -- ── Text payload (type='text', schema TBD) ────────────────────────────────
  text            text,
  bg_color        text,
  fg_color        text,

  -- ── Wrapped payload (type='wrapped', schema TBD) ──────────────────────────
  wrapped_data    jsonb,

  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null default (now() + interval '24 hours')
);

-- Fast lookup of live stories (newest first, expiry filtered in WHERE)
create index if not exists stories_expires_at_idx on public.stories (expires_at desc);
create index if not exists stories_user_id_idx    on public.stories (user_id);

alter table public.stories enable row level security;

drop policy if exists "Anyone can read live stories" on public.stories;
create policy "Anyone can read live stories"
  on public.stories for select
  to authenticated
  using (expires_at > now());

drop policy if exists "Users can insert own stories" on public.stories;
create policy "Users can insert own stories"
  on public.stories for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own stories" on public.stories;
create policy "Users can delete own stories"
  on public.stories for delete
  to authenticated
  using (auth.uid() = user_id);

-- Optional housekeeping: callable RPC to prune expired stories.  No cron is
-- required because the SELECT policy already hides them; this is just for
-- cleanup if/when we want to reclaim rows.
create or replace function public.purge_expired_stories()
returns void
language sql
security definer
as $$
  delete from public.stories where expires_at <= now();
$$;
