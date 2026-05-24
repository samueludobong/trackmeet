-- ─── Posts table (idempotent) ─────────────────────────────────────────────────
-- Safe to re-run. Uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS throughout
-- so it works whether the table is brand-new or already existed.

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid()
);

alter table public.posts
  add column if not exists user_id        uuid        references public.users(id) on delete cascade,
  add column if not exists type           text,
  add column if not exists text           text,
  add column if not exists media_urls     text[]      default '{}',
  add column if not exists poll_question  text,
  add column if not exists poll_options   jsonb       default '[]',
  add column if not exists allow_comments boolean     default true,
  add column if not exists likes_count    int         default 0,
  add column if not exists comments_count int         default 0,
  add column if not exists created_at     timestamptz default now();

-- Index for feed query (newest first)
create index if not exists posts_created_at_idx on public.posts (created_at desc);

-- Row-level security
alter table public.posts enable row level security;

drop policy if exists "Anyone can read posts"      on public.posts;
drop policy if exists "Users can insert own posts" on public.posts;
drop policy if exists "Users can update own posts" on public.posts;
drop policy if exists "Users can delete own posts" on public.posts;

create policy "Anyone can read posts"
  on public.posts for select to authenticated using (true);

create policy "Users can insert own posts"
  on public.posts for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own posts"
  on public.posts for update to authenticated
  using (auth.uid() = user_id);

create policy "Users can delete own posts"
  on public.posts for delete to authenticated
  using (auth.uid() = user_id);

-- ─── Post-media storage bucket ────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('post-media', 'post-media', true)
on conflict (id) do nothing;

drop policy if exists "Users can upload post media" on storage.objects;
create policy "Users can upload post media"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'post-media' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Post media is public" on storage.objects;
create policy "Post media is public"
  on storage.objects for select to public
  using (bucket_id = 'post-media');
