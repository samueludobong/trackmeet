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
