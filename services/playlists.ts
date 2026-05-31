import { supabase } from '../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PlaylistTrackInput = {
  id: string
  name: string
  artist: string | null
  albumArt: string | null
  durationMs?: number | null
}

export type CuratedPlaylistLite = {
  id: string
  name: string
  image_url: string | null
}

// ─── Reads ──────────────────────────────────────────────────────────────────

// The current user's curated playlists (id/name/cover only — lightweight, for
// the add-to-playlist picker).
export const getMyCuratedPlaylists = async (
  userId: string,
): Promise<CuratedPlaylistLite[]> => {
  const { data } = await supabase
    .from('curated_playlists')
    .select('id, name, image_url')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return (data ?? []) as CuratedPlaylistLite[]
}

// Which of the user's curated playlists already contain this track. Returns the
// set of playlist ids — empty set means "not saved anywhere".
export const getPlaylistIdsContainingTrack = async (
  userId: string,
  trackId: string,
): Promise<Set<string>> => {
  // Join through the user's own playlists so we never see other users' rows.
  const { data } = await supabase
    .from('curated_playlist_songs')
    .select('playlist_id, curated_playlists!inner(user_id)')
    .eq('spotify_track_id', trackId)
    .eq('curated_playlists.user_id', userId)
  return new Set((data ?? []).map((r: any) => r.playlist_id as string))
}

// Cheap boolean: is this track in ANY of the user's curated playlists? Used to
// render save buttons as "Saved" without loading the full picker.
export const isTrackInAnyPlaylist = async (
  userId: string,
  trackId: string,
): Promise<boolean> => {
  const { count } = await supabase
    .from('curated_playlist_songs')
    .select('id, curated_playlists!inner(user_id)', { count: 'exact', head: true })
    .eq('spotify_track_id', trackId)
    .eq('curated_playlists.user_id', userId)
  return (count ?? 0) > 0
}

// ─── Writes ───────────────────────────────────────────────────────────────────

// Add a track to a curated playlist, skipping if it's already present. Resolves
// the next position from the current max.
export const addTrackToCuratedPlaylist = async (
  playlistId: string,
  track: PlaylistTrackInput,
): Promise<void> => {
  const { data: existing } = await supabase
    .from('curated_playlist_songs')
    .select('id')
    .eq('playlist_id', playlistId)
    .eq('spotify_track_id', track.id)
    .limit(1)
    .maybeSingle()
  if (existing) return // already in this playlist

  const { data: last } = await supabase
    .from('curated_playlist_songs')
    .select('position')
    .eq('playlist_id', playlistId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextPos = (last?.position ?? -1) + 1

  await supabase.from('curated_playlist_songs').insert({
    playlist_id:      playlistId,
    spotify_track_id: track.id,
    track_name:       track.name,
    track_artist:     track.artist,
    album_art:        track.albumArt,
    duration_ms:      track.durationMs ?? null,
    position:         nextPos,
  })
}

export const removeTrackFromCuratedPlaylist = async (
  playlistId: string,
  trackId: string,
): Promise<void> => {
  await supabase
    .from('curated_playlist_songs')
    .delete()
    .eq('playlist_id', playlistId)
    .eq('spotify_track_id', trackId)
}

// Create a new curated playlist (no cover/tags) and return its lite row.
export const createCuratedPlaylist = async (
  userId: string,
  name: string,
): Promise<CuratedPlaylistLite | null> => {
  const { data } = await supabase
    .from('curated_playlists')
    .insert({ user_id: userId, name: name.trim(), tags: [], show_on_profile: false })
    .select('id, name, image_url')
    .single()
  return (data as CuratedPlaylistLite) ?? null
}

// ─── Curated playlist detail operations ──────────────────────────────────────
import { type CuratedSong } from '../lib/feed/types';

/** Load the songs in a curated playlist, ordered by position. */
export async function getCuratedPlaylistSongs(playlistId: string): Promise<CuratedSong[]> {
  const { data } = await supabase
    .from('curated_playlist_songs')
    .select('*')
    .eq('playlist_id', playlistId)
    .order('position', { ascending: true })
  return (data ?? []) as CuratedSong[]
}

/** Toggle whether a curated playlist is shown on the owner's profile. */
export async function setPlaylistShowOnProfile(playlistId: string, show: boolean): Promise<void> {
  await supabase.from('curated_playlists').update({ show_on_profile: show }).eq('id', playlistId)
}

/** Remove a song from a curated playlist. */
export async function deleteCuratedPlaylistSong(songId: string): Promise<void> {
  await supabase.from('curated_playlist_songs').delete().eq('id', songId)
}

import { type SpotifyTrackResult } from '../lib/spotify'

/** Append a Spotify track to a curated playlist (computes next position). */
export async function addSongToCuratedPlaylist(playlistId: string, track: SpotifyTrackResult): Promise<void> {
  const { data: existing } = await supabase
    .from('curated_playlist_songs')
    .select('position')
    .eq('playlist_id', playlistId)
    .order('position', { ascending: false })
    .limit(1)
  const nextPos = ((existing?.[0] as any)?.position ?? -1) + 1
  await supabase.from('curated_playlist_songs').insert({
    playlist_id: playlistId,
    spotify_track_id: track.id,
    track_name: track.name,
    track_artist: track.artist,
    album_art: track.albumArt,
    duration_ms: track.durationMs,
    position: nextPos,
  })
}

/** Whether a Spotify playlist is pinned to the user's profile. */
export async function isSpotifyPlaylistShown(userId: string, playlistId: string): Promise<boolean> {
  const { data } = await supabase
    .from('spotify_playlist_profile')
    .select('playlist_id')
    .eq('user_id', userId)
    .eq('playlist_id', playlistId)
    .maybeSingle()
  return !!data
}

/** Pin or unpin a Spotify playlist on the user's profile. */
export async function setSpotifyPlaylistShown(userId: string, playlistId: string, shown: boolean): Promise<void> {
  if (shown) {
    await supabase.from('spotify_playlist_profile').upsert({ user_id: userId, playlist_id: playlistId })
  } else {
    await supabase.from('spotify_playlist_profile').delete().eq('user_id', userId).eq('playlist_id', playlistId)
  }
}

/** Create a curated playlist with cover image + tags; returns the full row. */
export async function createCuratedPlaylistFull(
  userId: string,
  name: string,
  imageUrl: string | null,
  tags: string[],
): Promise<any | null> {
  const { data, error } = await supabase
    .from('curated_playlists')
    .insert({ user_id: userId, name: name.trim(), image_url: imageUrl, tags, show_on_profile: false })
    .select()
    .single()
  return !error && data ? data : null
}
