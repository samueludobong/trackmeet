-- ─── Per-user poll vote tracking ─────────────────────────────────────────────
-- Records which option each user voted for, so we can prevent the
-- "re-vote forever by reopening the post" bug and show the user's selection
-- correctly across feed / detail / refresh.

create table if not exists public.poll_votes (
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.users(id) on delete cascade,
  opt_id     text not null,
  created_at timestamptz default now(),
  primary key (post_id, user_id)
);

alter table public.poll_votes enable row level security;

drop policy if exists "Users can read poll votes"  on public.poll_votes;
drop policy if exists "Users can manage own votes" on public.poll_votes;

create policy "Users can read poll votes"
  on public.poll_votes for select to authenticated using (true);

create policy "Users can manage own votes"
  on public.poll_votes for all to authenticated
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── Replace vote_on_poll RPC ────────────────────────────────────────────────
-- New behaviour (server-authoritative — client doesn't supply prev_opt_id):
--   * No existing vote → insert vote, increment new option
--   * Existing vote on same option → no-op (idempotent)
--   * Existing vote on different option → update vote, decrement old, increment new

create or replace function public.vote_on_poll(
  p_post_id     uuid,
  p_opt_id      text,
  p_prev_opt_id text default null  -- kept for backwards-compat, ignored
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id     uuid := auth.uid();
  v_prev_opt_id text;
  v_opts        jsonb;
  v_new         jsonb;
begin
  if v_user_id is null then
    return jsonb_build_object('error', 'unauthenticated');
  end if;

  select poll_options into v_opts from posts where id = p_post_id;
  if v_opts is null then
    return jsonb_build_object('error', 'poll not found');
  end if;

  -- Authoritative previous vote: from the poll_votes table, not the client.
  select opt_id into v_prev_opt_id
  from poll_votes
  where post_id = p_post_id and user_id = v_user_id;

  -- Idempotent re-vote for the same option.
  if v_prev_opt_id is not distinct from p_opt_id then
    return jsonb_build_object('success', true, 'options', v_opts, 'opt_id', p_opt_id);
  end if;

  -- Recompute counts: +1 to new opt, -1 to prev (if any).
  select jsonb_agg(
    case
      when (o->>'id') = p_opt_id then
        jsonb_set(o, '{votes}', to_jsonb(greatest(coalesce((o->>'votes')::int, 0) + 1, 0)))
      when v_prev_opt_id is not null and (o->>'id') = v_prev_opt_id then
        jsonb_set(o, '{votes}', to_jsonb(greatest(coalesce((o->>'votes')::int, 0) - 1, 0)))
      else o
    end
  )
  into v_new
  from jsonb_array_elements(v_opts) o;

  update posts set poll_options = v_new where id = p_post_id;

  -- Upsert the user's vote row.
  insert into poll_votes (post_id, user_id, opt_id)
    values (p_post_id, v_user_id, p_opt_id)
    on conflict (post_id, user_id) do update set opt_id = excluded.opt_id, created_at = now();

  return jsonb_build_object('success', true, 'options', v_new, 'opt_id', p_opt_id);
end;
$$;
