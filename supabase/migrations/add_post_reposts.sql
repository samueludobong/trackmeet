-- ─── Post reposts table ─────────────────────────────────────────────────────
-- Mirrors post_likes: one row per (post, user) who reposted it.

create table if not exists public.post_reposts (
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (post_id, user_id)
);

alter table public.post_reposts enable row level security;

drop policy if exists "Users can read post reposts"  on public.post_reposts;
drop policy if exists "Users can manage own reposts" on public.post_reposts;

create policy "Users can read post reposts"
  on public.post_reposts for select to authenticated using (true);

create policy "Users can manage own reposts"
  on public.post_reposts for all to authenticated
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Denormalised counter on the post itself so the feed query doesn't have to
-- aggregate. Kept in sync by the toggle RPC below.
alter table public.posts
  add column if not exists reposts_count int not null default 0;

-- ─── toggle_post_repost RPC ─────────────────────────────────────────────────
-- security definer → runs as owner, bypasses RLS on posts so it can update
-- reposts_count on any post regardless of who calls it.

create or replace function public.toggle_post_repost(p_post_id uuid, p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  already_reposted boolean;
  new_count        int;
begin
  select exists(
    select 1 from post_reposts
    where post_id = p_post_id and user_id = p_user_id
  ) into already_reposted;

  if already_reposted then
    delete from post_reposts
    where post_id = p_post_id and user_id = p_user_id;

    update posts
      set reposts_count = greatest(0, reposts_count - 1)
      where id = p_post_id
      returning reposts_count into new_count;

    return jsonb_build_object('reposted', false, 'reposts_count', new_count);
  else
    insert into post_reposts (post_id, user_id)
      values (p_post_id, p_user_id)
      on conflict do nothing;

    update posts
      set reposts_count = reposts_count + 1
      where id = p_post_id
      returning reposts_count into new_count;

    return jsonb_build_object('reposted', true, 'reposts_count', new_count);
  end if;
end;
$$;
