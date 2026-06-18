-- ============================================================
-- add_profile_fields.sql
-- ============================================================
-- Run this in the Supabase SQL editor to add edit-profile fields to the users table.

alter table public.users
  add column if not exists pinned_song_id       text,
  add column if not exists pinned_song_name     text,
  add column if not exists pinned_song_artist   text,
  add column if not exists pinned_song_album_art text,
  add column if not exists profile_links        text[] default '{}';

-- Create the avatars storage bucket (idempotent-ish — will error if it already exists, which is fine).
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload their own avatar.
drop policy if exists "Users can upload own avatar" on storage.objects;
create policy "Users can upload own avatar"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read access to avatars.
drop policy if exists "Avatars are public" on storage.objects;
create policy "Avatars are public"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

-- Allow users to overwrite their own avatar.
drop policy if exists "Users can update own avatar" on storage.objects;
create policy "Users can update own avatar"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================
-- add_posts_table.sql
-- ============================================================
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

-- ============================================================
-- add_post_likes.sql
-- ============================================================
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

-- ============================================================
-- add_vote_on_poll.sql
-- ============================================================
-- Atomically record or change a poll vote.
-- p_post_id     — the post whose poll_options to update
-- p_opt_id      — the option being voted FOR
-- p_prev_opt_id — the option previously voted for (null on first vote)
--
-- SECURITY DEFINER so any authenticated user can write to posts
-- they don't own (RLS would otherwise block the update).

CREATE OR REPLACE FUNCTION vote_on_poll(
  p_post_id     uuid,
  p_opt_id      text,
  p_prev_opt_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_opts jsonb;
  v_new  jsonb;
BEGIN
  SELECT poll_options INTO v_opts
  FROM posts
  WHERE id = p_post_id;

  IF v_opts IS NULL THEN
    RETURN jsonb_build_object('error', 'poll not found');
  END IF;

  -- Increment the new option, decrement the previous one (if any).
  -- GREATEST(..., 0) guards against going negative.
  SELECT jsonb_agg(
    CASE
      WHEN (o->>'id') = p_opt_id THEN
        jsonb_set(o, '{votes}', to_jsonb(GREATEST(COALESCE((o->>'votes')::int, 0) + 1, 0)))
      WHEN p_prev_opt_id IS NOT NULL AND (o->>'id') = p_prev_opt_id THEN
        jsonb_set(o, '{votes}', to_jsonb(GREATEST(COALESCE((o->>'votes')::int, 0) - 1, 0)))
      ELSE o
    END
  )
  INTO v_new
  FROM jsonb_array_elements(v_opts) o;

  UPDATE posts
  SET poll_options = v_new
  WHERE id = p_post_id;

  RETURN jsonb_build_object('success', true, 'options', v_new);
END;
$$;

-- ============================================================
-- add_social_links.sql
-- ============================================================
-- Stores per-platform social account URLs for a user's profile.
-- Shape: { instagram: "https://...", x: "https://...", tiktok: "...", youtube: "...", soundcloud: "...", facebook: "..." }
-- Keys are the platform identifiers; only present keys are linked.
ALTER TABLE users ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}'::jsonb;

-- ============================================================
-- add_song_data.sql
-- ============================================================
-- Individual columns for a Spotify track attached to a music-type post.
-- Uses ADD COLUMN IF NOT EXISTS so re-running is safe.
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS song_id        text,
  ADD COLUMN IF NOT EXISTS song_name      text,
  ADD COLUMN IF NOT EXISTS song_artist    text,
  ADD COLUMN IF NOT EXISTS song_album_art text;

-- ============================================================
-- add_comments.sql
-- ============================================================
-- ─── Post comments ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS post_comments (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id           uuid        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id           uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_comment_id uuid        REFERENCES post_comments(id) ON DELETE SET NULL,
  text              text        NOT NULL,
  likes_count       int         NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS comments_post_id_idx ON post_comments(post_id, created_at ASC);

ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read comments"
  ON post_comments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert own comments"
  ON post_comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON post_comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ─── Comment likes ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS comment_likes (
  comment_id uuid NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES users(id)         ON DELETE CASCADE,
  PRIMARY KEY (comment_id, user_id)
);

ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read comment likes"
  ON comment_likes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert own comment likes"
  ON comment_likes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comment likes"
  ON comment_likes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ─── Toggle-like RPC ───────────────────────────────────────────────────────────
-- SECURITY DEFINER so the update to likes_count is not blocked by RLS.

CREATE OR REPLACE FUNCTION toggle_comment_like(
  p_comment_id uuid,
  p_user_id    uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exists boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM comment_likes
    WHERE comment_id = p_comment_id AND user_id = p_user_id
  ) INTO v_exists;

  IF v_exists THEN
    DELETE FROM comment_likes
    WHERE comment_id = p_comment_id AND user_id = p_user_id;
    UPDATE post_comments
    SET likes_count = GREATEST(likes_count - 1, 0)
    WHERE id = p_comment_id;
    RETURN jsonb_build_object('liked', false);
  ELSE
    INSERT INTO comment_likes (comment_id, user_id)
    VALUES (p_comment_id, p_user_id)
    ON CONFLICT DO NOTHING;
    UPDATE post_comments
    SET likes_count = likes_count + 1
    WHERE id = p_comment_id;
    RETURN jsonb_build_object('liked', true);
  END IF;
END;
$$;

-- ============================================================
-- add_comment_song.sql
-- ============================================================
-- Song attachment columns for post_comments
-- Mirrors the song columns already on the posts table.
ALTER TABLE post_comments
  ADD COLUMN IF NOT EXISTS song_id        text,
  ADD COLUMN IF NOT EXISTS song_name      text,
  ADD COLUMN IF NOT EXISTS song_artist    text,
  ADD COLUMN IF NOT EXISTS song_album_art text;

-- ============================================================
-- add_meets_table.sql
-- ============================================================
-- ─── Meets (live listening sessions hosted by a user) ───────────────────────

CREATE TABLE IF NOT EXISTS meets (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id          uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name             text        NOT NULL,
  description      text,
  tags             text[]      NOT NULL DEFAULT '{}',
  allow_comments   boolean     NOT NULL DEFAULT true,
  allow_reactions  boolean     NOT NULL DEFAULT true,
  is_live          boolean     NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  ended_at         timestamptz
);

CREATE INDEX IF NOT EXISTS meets_host_id_idx  ON meets(host_id);
CREATE INDEX IF NOT EXISTS meets_is_live_idx  ON meets(is_live, created_at DESC);

ALTER TABLE meets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read meets"
  ON meets FOR SELECT TO authenticated USING (true);

CREATE POLICY "Host can insert own meets"
  ON meets FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Host can update own meets"
  ON meets FOR UPDATE TO authenticated
  USING (auth.uid() = host_id);

CREATE POLICY "Host can delete own meets"
  ON meets FOR DELETE TO authenticated
  USING (auth.uid() = host_id);

-- ============================================================
-- add_curated_playlists.sql
-- ============================================================
-- Curated playlists: user-created, platform-native playlists
CREATE TABLE IF NOT EXISTS curated_playlists (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            text        NOT NULL,
  image_url       text,
  tags            text[]      NOT NULL DEFAULT '{}',
  show_on_profile boolean     NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Songs inside curated playlists (sourced from Spotify search / now-playing)
CREATE TABLE IF NOT EXISTS curated_playlist_songs (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id      uuid        NOT NULL REFERENCES curated_playlists(id) ON DELETE CASCADE,
  spotify_track_id text        NOT NULL,
  track_name       text        NOT NULL,
  track_artist     text        NOT NULL,
  album_art        text,
  duration_ms      int         NOT NULL DEFAULT 0,
  position         int         NOT NULL DEFAULT 0,
  added_at         timestamptz NOT NULL DEFAULT now()
);

-- Which Spotify playlists a user chose to show on their profile
CREATE TABLE IF NOT EXISTS spotify_playlist_profile (
  user_id     uuid  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  playlist_id text  NOT NULL,
  PRIMARY KEY (user_id, playlist_id)
);

-- ── RLS ────────────────────────────────────────────────────────────────────────

ALTER TABLE curated_playlists        ENABLE ROW LEVEL SECURITY;
ALTER TABLE curated_playlist_songs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE spotify_playlist_profile ENABLE ROW LEVEL SECURITY;

-- Owners have full access to their own curated playlists
CREATE POLICY "Owner full access on curated_playlists"
  ON curated_playlists FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Anyone can read playlists that are set to show on profile
CREATE POLICY "Public read profile playlists"
  ON curated_playlists FOR SELECT
  USING (show_on_profile = true);

-- Owners have full access to songs in their playlists
CREATE POLICY "Owner full access on curated_playlist_songs"
  ON curated_playlist_songs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM curated_playlists
      WHERE id = playlist_id AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM curated_playlists
      WHERE id = playlist_id AND user_id = auth.uid()
    )
  );

-- Anyone can read songs in public playlists
CREATE POLICY "Public read profile playlist songs"
  ON curated_playlist_songs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM curated_playlists
      WHERE id = playlist_id AND show_on_profile = true
    )
  );

-- Owners manage their own Spotify profile display settings
CREATE POLICY "Owner full access on spotify_playlist_profile"
  ON spotify_playlist_profile FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- add_meet_system.sql
-- ============================================================
-- ─── Meet system: live track state, participants, tracklist, chat ─────────────
-- Extends the base meets table (see add_meets_table.sql) with the columns and
-- side tables needed for synced listening rooms.

-- ── Live playback state on the meet itself ───────────────────────────────────
-- The host writes the currently-playing track + position here every poll so
-- listeners can read it and match their own Spotify playback.
ALTER TABLE meets ADD COLUMN IF NOT EXISTS current_track_id          text;
ALTER TABLE meets ADD COLUMN IF NOT EXISTS current_track_name        text;
ALTER TABLE meets ADD COLUMN IF NOT EXISTS current_track_artist      text;
ALTER TABLE meets ADD COLUMN IF NOT EXISTS current_track_album_art   text;
ALTER TABLE meets ADD COLUMN IF NOT EXISTS current_track_duration_ms integer;
ALTER TABLE meets ADD COLUMN IF NOT EXISTS current_track_position_ms integer;
ALTER TABLE meets ADD COLUMN IF NOT EXISTS current_track_is_playing  boolean NOT NULL DEFAULT true;
ALTER TABLE meets ADD COLUMN IF NOT EXISTS position_updated_at       timestamptz;
-- talk_mode = host is talking; listeners pause their music while true.
ALTER TABLE meets ADD COLUMN IF NOT EXISTS talk_mode                 boolean NOT NULL DEFAULT false;
-- show_on_profile = host chose to surface this (ended) meet's tracklist on their profile.
ALTER TABLE meets ADD COLUMN IF NOT EXISTS show_on_profile           boolean NOT NULL DEFAULT false;

-- ── Participants (drives live listener count) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS meet_participants (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  meet_id    uuid        NOT NULL REFERENCES meets(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_active  boolean     NOT NULL DEFAULT true,
  joined_at  timestamptz NOT NULL DEFAULT now(),
  left_at    timestamptz,
  UNIQUE (meet_id, user_id)
);

CREATE INDEX IF NOT EXISTS meet_participants_meet_idx
  ON meet_participants(meet_id, is_active);

ALTER TABLE meet_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read participants"
  ON meet_participants FOR SELECT TO authenticated USING (true);

CREATE POLICY "User manages own participation insert"
  ON meet_participants FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "User manages own participation update"
  ON meet_participants FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "User manages own participation delete"
  ON meet_participants FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ── Tracklist (what was played; powers the end-of-meet summary + save) ────────
CREATE TABLE IF NOT EXISTS meet_tracks (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  meet_id    uuid        NOT NULL REFERENCES meets(id) ON DELETE CASCADE,
  track_id   text        NOT NULL,
  name       text        NOT NULL,
  artist     text,
  album_art  text,
  played_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS meet_tracks_meet_idx ON meet_tracks(meet_id, played_at);

ALTER TABLE meet_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read meet tracks"
  ON meet_tracks FOR SELECT TO authenticated USING (true);

-- Only the meet host can append to the tracklist.
CREATE POLICY "Host appends meet tracks"
  ON meet_tracks FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM meets m WHERE m.id = meet_id AND m.host_id = auth.uid())
  );

-- ── Live chat ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meet_messages (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  meet_id    uuid        NOT NULL REFERENCES meets(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body       text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS meet_messages_meet_idx ON meet_messages(meet_id, created_at);

ALTER TABLE meet_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read meet messages"
  ON meet_messages FOR SELECT TO authenticated USING (true);

CREATE POLICY "User sends own meet messages"
  ON meet_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ── Realtime ──────────────────────────────────────────────────────────────────
-- Add tables to the realtime publication so the client receives live changes.
-- Wrapped in DO blocks so re-running the migration doesn't error on duplicates.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'meet_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE meet_messages;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'meet_participants'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE meet_participants;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'meets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE meets;
  END IF;
END $$;

-- ============================================================
-- add_meet_participant_visibility.sql
-- ============================================================
-- ─── Meet participant visibility ──────────────────────────────────────────────
-- A listener can join a meet either privately or publicly. When public, the
-- meet is surfaced on their profile's now-playing (with a "Join" affordance for
-- viewers); when private, their profile shows the ordinary solo now-playing so
-- nobody can tell they're in a meet.
ALTER TABLE meet_participants
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

-- Lets profile viewers efficiently find a user's active *public* meet.
CREATE INDEX IF NOT EXISTS meet_participants_user_public_idx
  ON meet_participants(user_id, is_active, is_public);

-- ============================================================
-- add_lyrics_cache.sql
-- ============================================================
-- Shared, app-wide lyrics cache. Keyed by Spotify track id so the first person
-- to view a song's lyrics populates it for everyone after them (instant load).
-- `not_found` caches the negative result too, so tracks lrclib doesn't have
-- don't trigger a network lookup on every open.
CREATE TABLE IF NOT EXISTS lyrics_cache (
  spotify_track_id text        PRIMARY KEY,
  track_name       text        NOT NULL,
  track_artist     text,
  synced_lyrics    text,        -- raw LRC (timestamped); null when only plain exists
  plain_lyrics     text,        -- plain, untimed lyrics; null when none
  not_found        boolean     NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ── RLS ────────────────────────────────────────────────────────────────────────
ALTER TABLE lyrics_cache ENABLE ROW LEVEL SECURITY;

-- Lyrics are public reference data — anyone may read the cache.
CREATE POLICY "Public read lyrics_cache"
  ON lyrics_cache FOR SELECT
  USING (true);

-- Any signed-in user may populate or refresh a cache entry (shared cache, no
-- per-user ownership).
CREATE POLICY "Authenticated insert lyrics_cache"
  ON lyrics_cache FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated update lyrics_cache"
  ON lyrics_cache FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- add_lyrics_discovered.sql
-- ============================================================
-- Whether a song's lyrics have ever been "discovered" (looked up) by anyone.
-- The first viewer flips this to true and gets the celebration; once true, the
-- discovery animation never fires again for anyone.
ALTER TABLE lyrics_cache
  ADD COLUMN IF NOT EXISTS is_discovered boolean NOT NULL DEFAULT false;

-- ============================================================
-- add_lyrics_discoveries.sql
-- ============================================================
-- Records the first-ever lookup ("discovery") of a song's lyrics. A dedicated
-- table (not a column on lyrics_cache) so the flag can never be reset by lyrics
-- cache writes. Claiming a discovery = inserting a row; the primary key makes it
-- atomic — exactly one inserter wins, everyone else hits a unique-violation.
CREATE TABLE IF NOT EXISTS lyrics_discoveries (
  spotify_track_id text        PRIMARY KEY,
  discovered_by    uuid        REFERENCES users(id) ON DELETE SET NULL,
  discovered_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE lyrics_discoveries ENABLE ROW LEVEL SECURITY;

-- Anyone may read (to check discovery state).
CREATE POLICY "Public read lyrics_discoveries"
  ON lyrics_discoveries FOR SELECT
  USING (true);

-- Any signed-in user may claim a discovery.
CREATE POLICY "Authenticated insert lyrics_discoveries"
  ON lyrics_discoveries FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- add_lyrics_translations.sql
-- ============================================================
-- Shared cache of translated lyrics, keyed by (track, target language). The first
-- person to translate a song into a language pays the Claude call; everyone after
-- reads from here. Timestamped lines are stored as LRC text (same as lyrics_cache)
-- so playback sync survives.
CREATE TABLE IF NOT EXISTS lyrics_translations (
  spotify_track_id text        NOT NULL,
  target_lang      text        NOT NULL,
  source_lang      text,
  synced_lyrics    text,        -- raw LRC (timestamped); null when only plain exists
  plain_lyrics     text,        -- plain translated lyrics; null when synced exists
  created_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (spotify_track_id, target_lang)
);

ALTER TABLE lyrics_translations ENABLE ROW LEVEL SECURITY;

-- Translations are public reference data — anyone may read.
CREATE POLICY "Public read lyrics_translations"
  ON lyrics_translations FOR SELECT
  USING (true);

-- Any signed-in user may populate the cache.
CREATE POLICY "Authenticated insert lyrics_translations"
  ON lyrics_translations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- add_voice_posts.sql
-- ============================================================
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

-- ============================================================
-- add_stories.sql
-- ============================================================
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

-- ============================================================
-- add_story_text_overlay.sql
-- ============================================================
-- Optional caption overlay rendered on top of a music story card.
-- font  — one of: "default" | "serif" | "script" | "mono" | "heavy"
-- color — any CSS-style color string (the picker writes hex)
alter table public.stories add column if not exists overlay_text  text;
alter table public.stories add column if not exists overlay_font  text;
alter table public.stories add column if not exists overlay_color text;

-- ============================================================
-- add_song_preview_url.sql
-- ============================================================
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

-- ============================================================
-- add_media_aspect.sql
-- ============================================================
-- ─── Cached media aspect ratio ────────────────────────────────────────────────
-- For video posts: the natural width / height of the uploaded clip, captured
-- at post-creation time from expo-image-picker's asset metadata. Lets feed
-- cards size to the correct aspect on first paint instead of starting at a
-- default 16:9 and jumping to portrait when the player reports back.
-- Stored as `real` (float4) — we only need ~3 significant figures.

alter table public.posts
  add column if not exists media_aspect real;

-- ============================================================
-- add_user_settings.sql
-- ============================================================
-- User-level app settings, one row per user.
create table if not exists public.user_settings (
  user_id              uuid        primary key references auth.users(id) on delete cascade,
  mute_audio_on_start  boolean     not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "Users can view their own settings"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "Users can insert their own settings"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own settings"
  on public.user_settings for update
  using (auth.uid() = user_id);

-- ============================================================
-- add_playlist_description.sql
-- ============================================================
-- Optional description shown on the curated playlist detail screen.
alter table public.curated_playlists
  add column if not exists description text;

-- ============================================================
-- add_post_reposts.sql
-- ============================================================
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

-- ============================================================
-- add_poll_votes.sql
-- ============================================================
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

-- ============================================================
-- add_story_canvas.sql
-- ============================================================
-- Free-form story canvas (Instagram-style editor).
-- When set, the viewer ignores the legacy fixed layout / overlay_* columns and
-- replays this layout instead.  JSON shape (v1):
--   {
--     "v": 1,
--     "bg": { "type": "gradient", "colors": ["#hex", ...] },
--     "elements": [
--       { "type": "card", "x": 0, "y": 0, "scale": 1, "rotation": 0 },
--       { "type": "text", "text": "...", "font": "heavy", "color": "#fff",
--         "bg": false, "x": 0.1, "y": -0.2, "scale": 1.4, "rotation": 0.3 }
--     ]
--   }
-- x/y are offsets from the canvas centre normalised by canvas width/height so
-- the layout reproduces proportionally on any screen size; rotation is radians.
-- Element order is z-order (first = bottom).
alter table public.stories add column if not exists canvas jsonb;

-- ============================================================
-- add_story_duration.sql
-- ============================================================
-- Per-story display duration (ms). Lets the author pick how long the story
-- shows (5 / 15 / 30s); the viewer animates progress + plays the song preview
-- for this long. Defaults to 5s so existing rows keep their behaviour.
ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS duration_ms int NOT NULL DEFAULT 5000;

-- ============================================================
-- add_group_chats.sql
-- ============================================================
-- Group chats: multi-user conversations with admin controls, events, and polls.
-- Separate from `conversations` (which is DM-only: a unique user_a/user_b pair).

-- ── group_chats ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS group_chats (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 text        NOT NULL,
  emoji                text,                                  -- header emoji (🐶 etc.)
  color                text        DEFAULT '#AB00FF',         -- accent color
  avatar_url           text,
  created_by           uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lock_messages        boolean     NOT NULL DEFAULT false,    -- admin-only posting when true
  jam_meet_id          uuid,                                  -- active listening-room meet, if jamming
  member_count         int         NOT NULL DEFAULT 0,
  last_message_at      timestamptz,
  last_message_preview text,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS group_chats_creator_idx ON group_chats(created_by);

-- ── members ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS group_chat_members (
  group_id  uuid        NOT NULL REFERENCES group_chats(id) ON DELETE CASCADE,
  user_id   uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role      text        NOT NULL DEFAULT 'member',  -- 'admin' | 'member'
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id),
  CONSTRAINT group_chat_members_role_check CHECK (role IN ('admin', 'member'))
);

CREATE INDEX IF NOT EXISTS group_chat_members_user_idx ON group_chat_members(user_id);

-- ── messages ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS group_messages (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id             uuid        NOT NULL REFERENCES group_chats(id) ON DELETE CASCADE,
  sender_id            uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body                 text,
  type                 text        NOT NULL DEFAULT 'text',  -- 'text' | 'spotify_track'
  spotify_track_id     text,
  spotify_track_name   text,
  spotify_track_artist text,
  spotify_album_art    text,
  reply_to_id          uuid,
  reply_to_preview     text,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS group_messages_group_idx ON group_messages(group_id, created_at);

-- ── events (Events tab) ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS group_events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    uuid        NOT NULL REFERENCES group_chats(id) ON DELETE CASCADE,
  title       text        NOT NULL,
  description text,
  starts_at   timestamptz NOT NULL,
  is_meet     boolean     NOT NULL DEFAULT false,  -- upcoming listening-room meet vs. plain event
  created_by  uuid        REFERENCES users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS group_events_group_idx ON group_events(group_id, starts_at);

-- ── polls (Polls tab) ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS group_polls (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   uuid        NOT NULL REFERENCES group_chats(id) ON DELETE CASCADE,
  question   text        NOT NULL,
  created_by uuid        REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS group_polls_group_idx ON group_polls(group_id, created_at DESC);

CREATE TABLE IF NOT EXISTS group_poll_options (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id  uuid NOT NULL REFERENCES group_polls(id) ON DELETE CASCADE,
  text     text NOT NULL,
  position int  NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS group_poll_options_poll_idx ON group_poll_options(poll_id, position);

CREATE TABLE IF NOT EXISTS group_poll_votes (
  poll_id    uuid        NOT NULL REFERENCES group_polls(id) ON DELETE CASCADE,
  option_id  uuid        NOT NULL REFERENCES group_poll_options(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (poll_id, user_id)   -- one vote per poll per user
);

-- ── Helper predicates (SECURITY DEFINER → safe to call from policies) ──────────
CREATE OR REPLACE FUNCTION is_group_member(g uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_chat_members m
    WHERE m.group_id = g AND m.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION is_group_admin(g uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_chat_members m
    WHERE m.group_id = g AND m.user_id = auth.uid() AND m.role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM group_chats c WHERE c.id = g AND c.created_by = auth.uid()
  );
$$;

-- ── Triggers: member count + last message denormalization ──────────────────────
CREATE OR REPLACE FUNCTION bump_group_member_count() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE group_chats SET member_count = member_count + 1 WHERE id = NEW.group_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE group_chats SET member_count = GREATEST(member_count - 1, 0) WHERE id = OLD.group_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_group_member_count ON group_chat_members;
CREATE TRIGGER trg_group_member_count
  AFTER INSERT OR DELETE ON group_chat_members
  FOR EACH ROW EXECUTE FUNCTION bump_group_member_count();

CREATE OR REPLACE FUNCTION bump_group_last_message() RETURNS trigger AS $$
BEGIN
  UPDATE group_chats
  SET last_message_at = NEW.created_at,
      last_message_preview = COALESCE(NEW.body, CASE WHEN NEW.type = 'spotify_track' THEN '🎵 ' || COALESCE(NEW.spotify_track_name, 'Track') ELSE '' END)
  WHERE id = NEW.group_id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_group_last_message ON group_messages;
CREATE TRIGGER trg_group_last_message
  AFTER INSERT ON group_messages
  FOR EACH ROW EXECUTE FUNCTION bump_group_last_message();

-- ── RLS ─────────────────────────────────────────────────────────────────────────
ALTER TABLE group_chats         ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_chat_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_polls         ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_poll_options  ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_poll_votes    ENABLE ROW LEVEL SECURITY;

-- group_chats: members read; creator inserts; admins update; creator deletes.
CREATE POLICY "Members read group" ON group_chats FOR SELECT USING (is_group_member(id) OR created_by = auth.uid());
CREATE POLICY "Creator inserts group" ON group_chats FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "Admins update group" ON group_chats FOR UPDATE USING (is_group_admin(id)) WITH CHECK (is_group_admin(id));
CREATE POLICY "Creator deletes group" ON group_chats FOR DELETE USING (created_by = auth.uid());

-- members: members read; creator/admin add others, users add self; admin updates roles;
-- self-leave or admin removal.
CREATE POLICY "Members read membership" ON group_chat_members FOR SELECT USING (is_group_member(group_id) OR user_id = auth.uid());
CREATE POLICY "Add group members" ON group_chat_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR is_group_admin(group_id)
    OR EXISTS (SELECT 1 FROM group_chats c WHERE c.id = group_id AND c.created_by = auth.uid())
  );
CREATE POLICY "Admins update roles" ON group_chat_members FOR UPDATE
  USING (is_group_admin(group_id)) WITH CHECK (is_group_admin(group_id));
CREATE POLICY "Leave or admin removes" ON group_chat_members FOR DELETE
  USING (auth.uid() = user_id OR is_group_admin(group_id));

-- messages: members read; post when member AND (not locked OR admin); author/admin delete.
CREATE POLICY "Members read messages" ON group_messages FOR SELECT USING (is_group_member(group_id));
CREATE POLICY "Members post messages" ON group_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND is_group_member(group_id)
    AND (
      is_group_admin(group_id)
      OR NOT EXISTS (SELECT 1 FROM group_chats c WHERE c.id = group_id AND c.lock_messages)
    )
  );
CREATE POLICY "Author or admin deletes message" ON group_messages FOR DELETE
  USING (auth.uid() = sender_id OR is_group_admin(group_id));

-- events: members read; admins manage.
CREATE POLICY "Members read events" ON group_events FOR SELECT USING (is_group_member(group_id));
CREATE POLICY "Admins create events" ON group_events FOR INSERT WITH CHECK (is_group_admin(group_id));
CREATE POLICY "Admins update events" ON group_events FOR UPDATE USING (is_group_admin(group_id)) WITH CHECK (is_group_admin(group_id));
CREATE POLICY "Admins delete events" ON group_events FOR DELETE USING (is_group_admin(group_id));

-- polls: members read; any member creates; creator/admin deletes.
CREATE POLICY "Members read polls" ON group_polls FOR SELECT USING (is_group_member(group_id));
CREATE POLICY "Members create polls" ON group_polls FOR INSERT WITH CHECK (is_group_member(group_id) AND auth.uid() = created_by);
CREATE POLICY "Creator or admin deletes poll" ON group_polls FOR DELETE USING (auth.uid() = created_by OR is_group_admin(group_id));

CREATE POLICY "Members read poll options" ON group_poll_options FOR SELECT
  USING (EXISTS (SELECT 1 FROM group_polls p WHERE p.id = poll_id AND is_group_member(p.group_id)));
CREATE POLICY "Poll creator adds options" ON group_poll_options FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM group_polls p WHERE p.id = poll_id AND p.created_by = auth.uid()));

CREATE POLICY "Members read poll votes" ON group_poll_votes FOR SELECT
  USING (EXISTS (SELECT 1 FROM group_polls p WHERE p.id = poll_id AND is_group_member(p.group_id)));
CREATE POLICY "Members vote" ON group_poll_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM group_polls p WHERE p.id = poll_id AND is_group_member(p.group_id)));
CREATE POLICY "Change own vote" ON group_poll_votes FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Remove own vote" ON group_poll_votes FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- add_notes.sql
-- ============================================================
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

-- ============================================================
-- add_note_color.sql
-- ============================================================
-- ─── Note colour ─────────────────────────────────────────────────────────────
-- Optional background colour for a note bubble (hex string, e.g. '#7C3AED').
-- Null = the default translucent bubble.

alter table public.notes add column if not exists color text;

-- ============================================================
-- add_dm_jams.sql
-- ============================================================
-- ─── Private DM "Jams" ────────────────────────────────────────────────────────
-- A jam is a Meet scoped to a single DM conversation: hostless (either member
-- controls playback), private (never surfaced in discovery or as "in a meet"),
-- and minimisable/rejoinable like any meet. We extend the existing `meets`
-- table rather than adding a new one so all the live-track / participant /
-- realtime infrastructure is reused.

ALTER TABLE meets ADD COLUMN IF NOT EXISTS conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE;
ALTER TABLE meets ADD COLUMN IF NOT EXISTS is_personal     boolean NOT NULL DEFAULT false;
-- Whoever last took a playback action — the current "driver". The other member
-- follows their playback until they themselves act (auto driver-switch).
ALTER TABLE meets ADD COLUMN IF NOT EXISTS driver_id       uuid REFERENCES users(id);

-- Fast lookup of a conversation's live jam.
CREATE INDEX IF NOT EXISTS meets_conversation_idx ON meets(conversation_id) WHERE is_personal;

-- Either member of the conversation may write a personal jam's playback/driver
-- state (the base "Host can update own meets" policy only covers the creator).
DROP POLICY IF EXISTS "Conversation members update personal jam" ON meets;
CREATE POLICY "Conversation members update personal jam"
  ON meets FOR UPDATE TO authenticated
  USING (
    is_personal AND conversation_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = meets.conversation_id
        AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
    )
  );

-- ============================================================
-- add_conversation_settings.sql
-- ============================================================
-- Per-user, per-conversation personalization for direct messages.
-- Lets each side set their own nickname for the other person, an accent color,
-- a background color, and a background image — without affecting how the other
-- side sees the conversation. Each (conversation_id, user_id) row is its own
-- side's view of the DM.
CREATE TABLE IF NOT EXISTS conversation_settings (
  conversation_id      uuid        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id              uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b              uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nickname             text,
  accent_color         text,
  background_color     text,
  background_image_url text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS conversation_settings_user_idx
  ON conversation_settings (user_id);

ALTER TABLE conversation_settings ENABLE ROW LEVEL SECURITY;

-- Each user is the sole reader and writer of their own settings row.
CREATE POLICY "Owner full access on conversation_settings"
  ON conversation_settings FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Keep updated_at fresh on every change.
CREATE OR REPLACE FUNCTION touch_conversation_settings_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS conversation_settings_touch_updated_at ON conversation_settings;
CREATE TRIGGER conversation_settings_touch_updated_at
  BEFORE UPDATE ON conversation_settings
  FOR EACH ROW
  EXECUTE FUNCTION touch_conversation_settings_updated_at();

-- ── DM-scoped curated playlists ───────────────────────────────────────────────
-- A curated playlist can optionally be scoped to a 1:1 conversation. When
-- conversation_id is set, both DM participants can read AND write it
-- (collaborative). When NULL the playlist is owned solely by user_id (existing
-- profile-playlist behavior — leave untouched).
ALTER TABLE curated_playlists
  ADD COLUMN IF NOT EXISTS conversation_id uuid
  REFERENCES conversations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS curated_playlists_conversation_idx
  ON curated_playlists (conversation_id)
  WHERE conversation_id IS NOT NULL;

-- Both participants in the conversation can SELECT a DM-scoped playlist.
CREATE POLICY "DM participants read conversation playlists"
  ON curated_playlists FOR SELECT
  USING (
    conversation_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
        AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
    )
  );

-- Both participants can create new DM-scoped playlists.
CREATE POLICY "DM participants insert conversation playlists"
  ON curated_playlists FOR INSERT
  WITH CHECK (
    conversation_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
        AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
    )
  );

-- Both participants can edit DM-scoped playlists (rename, change cover, etc.).
CREATE POLICY "DM participants update conversation playlists"
  ON curated_playlists FOR UPDATE
  USING (
    conversation_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
        AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
    )
  );

-- Both participants can delete a DM-scoped playlist.
CREATE POLICY "DM participants delete conversation playlists"
  ON curated_playlists FOR DELETE
  USING (
    conversation_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
        AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
    )
  );

-- Songs inside DM-scoped playlists follow the same shared-access model.
CREATE POLICY "DM participants full access on conversation playlist songs"
  ON curated_playlist_songs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM curated_playlists p
      JOIN conversations c ON c.id = p.conversation_id
      WHERE p.id = playlist_id
        AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM curated_playlists p
      JOIN conversations c ON c.id = p.conversation_id
      WHERE p.id = playlist_id
        AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
    )
  );

