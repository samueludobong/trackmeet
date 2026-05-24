-- ─── Post likes table ────────────────────────────────────────────────────────

create table if not exists public.post_likes (
  post_id    uuid not null references public.posts(id)  on delete cascade,
  user_id    uuid not null references public.users(id)  on delete cascade,
  created_at timestamptz default now(),
  primary key (post_id, user_id)
);

alter table public.post_likes enable row level security;

drop policy if exists "Users can read post likes"    on public.post_likes;
drop policy if exists "Users can manage own likes"   on public.post_likes;

create policy "Users can read post likes"
  on public.post_likes for select to authenticated using (true);

create policy "Users can manage own likes"
  on public.post_likes for all to authenticated
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── toggle_post_like RPC ─────────────────────────────────────────────────────
-- security definer → runs as owner, bypasses RLS on posts so it can update
-- likes_count on any post regardless of who calls it.

create or replace function public.toggle_post_like(p_post_id uuid, p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  already_liked boolean;
  new_count     int;
begin
  select exists(
    select 1 from post_likes
    where post_id = p_post_id and user_id = p_user_id
  ) into already_liked;

  if already_liked then
    delete from post_likes
    where post_id = p_post_id and user_id = p_user_id;

    update posts
      set likes_count = greatest(0, likes_count - 1)
      where id = p_post_id
      returning likes_count into new_count;

    return jsonb_build_object('liked', false, 'likes_count', new_count);
  else
    insert into post_likes (post_id, user_id)
      values (p_post_id, p_user_id)
      on conflict do nothing;

    update posts
      set likes_count = likes_count + 1
      where id = p_post_id
      returning likes_count into new_count;

    return jsonb_build_object('liked', true, 'likes_count', new_count);
  end if;
end;
$$;
