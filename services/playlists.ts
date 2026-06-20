import { supabase } from '../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PlaylistTrackInput = {
  id: string | null            // Spotify track id, or null for a pasted-link song
  name: string
  artist: string | null
  albumArt: string | null
  durationMs?: number | null
  // Multi-provider fields (pasted-link songs); omitted for plain Spotify tracks.
  url?: string | null
  provider?: string | null
  links?: { platform: string; url: string }[] | null
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

// URL-keyed variants for non-Spotify (pasted-link) songs, which have no Spotify
// track id and are deduped by their source URL instead.
export const getPlaylistIdsContainingUrl = async (
  userId: string,
  songUrl: string,
): Promise<Set<string>> => {
  const { data } = await supabase
    .from('curated_playlist_songs')
    .select('playlist_id, curated_playlists!inner(user_id)')
    .eq('song_url', songUrl)
    .eq('curated_playlists.user_id', userId)
  return new Set((data ?? []).map((r: any) => r.playlist_id as string))
}

export const isUrlInAnyPlaylist = async (
  userId: string,
  songUrl: string,
): Promise<boolean> => {
  const { count } = await supabase
    .from('curated_playlist_songs')
    .select('id, curated_playlists!inner(user_id)', { count: 'exact', head: true })
    .eq('song_url', songUrl)
    .eq('curated_playlists.user_id', userId)
  return (count ?? 0) > 0
}

export const removeSongFromCuratedPlaylistByUrl = async (
  playlistId: string,
  songUrl: string,
): Promise<void> => {
  await supabase
    .from('curated_playlist_songs')
    .delete()
    .eq('playlist_id', playlistId)
    .eq('song_url', songUrl)
}

// ─── Writes ───────────────────────────────────────────────────────────────────

// Add a track to a curated playlist, skipping if it's already present. Resolves
// the next position from the current max. Throws on any DB error so callers
// can surface meaningful feedback (silent failures used to make this look
// successful when RLS denied the write).
export const addTrackToCuratedPlaylist = async (
  playlistId: string,
  track: PlaylistTrackInput,
): Promise<void> => {
  // Defer to the hardened insert path. PlaylistTrackInput and
  // SpotifyTrackResult share the relevant fields (id / name / artist /
  // albumArt / durationMs?) so the cast is safe.
  const result = await addSongToCuratedPlaylist(playlistId, {
    id: track.id,
    name: track.name,
    artist: track.artist ?? '',
    albumArt: track.albumArt ?? null,
    durationMs: track.durationMs ?? 0,
    previewUrl: null,
    url: track.url ?? null,
    provider: track.provider ?? null,
    links: track.links ?? null,
  });
  if (!result.ok) throw new Error(result.error);
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
import { type CuratedSong, type CuratedPlaylist } from '../lib/feed/types';

/**
 * The first few non-empty album arts in a curated playlist, ordered by
 * position. Used to build a mosaic cover for playlists with no uploaded image
 * (mirrors the detail view's hero fallback).
 */
export async function getCuratedPlaylistCovers(playlistId: string, limit = 4): Promise<string[]> {
  const { data } = await supabase
    .from('curated_playlist_songs')
    .select('album_art')
    .eq('playlist_id', playlistId)
    .not('album_art', 'is', null)
    .order('position', { ascending: true })
    .limit(limit)
  return (data ?? []).map((r: any) => r.album_art as string)
}

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

/**
 * Update editable fields on a curated playlist. Pass only what you want to
 * change — undefined keys are skipped. Returns the updated row or null on
 * failure (RLS denial, network error, etc.).
 */
export async function updateCuratedPlaylist(
  playlistId: string,
  patch: { name?: string; description?: string | null; image_url?: string | null },
): Promise<any | null> {
  const update: Record<string, any> = {};
  if (patch.name !== undefined) update.name = patch.name.trim();
  if (patch.description !== undefined) update.description = patch.description?.trim() || null;
  if (patch.image_url !== undefined) update.image_url = patch.image_url;
  if (Object.keys(update).length === 0) return null;
  const { data, error } = await supabase
    .from('curated_playlists')
    .update(update)
    .eq('id', playlistId)
    .select()
    .single();
  if (error) { console.error('[updateCuratedPlaylist] failed', error); return null; }
  return data;
}

/** Remove a song from a curated playlist. */
export async function deleteCuratedPlaylistSong(songId: string): Promise<void> {
  await supabase.from('curated_playlist_songs').delete().eq('id', songId)
}

/**
 * Delete a curated playlist (and cascade its songs via the ON DELETE CASCADE
 * foreign key in the schema). Returns true if the row was actually deleted.
 */
export async function deleteCuratedPlaylist(playlistId: string): Promise<boolean> {
  // .select() returns the rows that were actually deleted. Without it, an RLS
  // policy / ownership mismatch deletes 0 rows but reports no error — which made
  // the UI think the delete succeeded while the row stayed put.
  const { data, error } = await supabase
    .from('curated_playlists')
    .delete()
    .eq('id', playlistId)
    .select('id');
  if (error) { console.error('[deleteCuratedPlaylist] failed', error); return false; }
  if (!data || data.length === 0) {
    console.error('[deleteCuratedPlaylist] no row deleted — RLS/ownership mismatch?', playlistId);
    return false;
  }
  return true;
}

/**
 * Persist a new ordering of songs in a curated playlist. Pass the song ids
 * in their new order — the i-th id gets position i.
 */
export async function reorderCuratedPlaylistSongs(
  playlistId: string,
  orderedSongIds: string[],
): Promise<void> {
  // Batch updates: each row gets its new position.
  await Promise.all(orderedSongIds.map((id, idx) =>
    supabase
      .from('curated_playlist_songs')
      .update({ position: idx })
      .eq('id', id)
      .eq('playlist_id', playlistId)
  ));
}

import { type SpotifyTrackResult } from '../lib/spotify'

export type AddSongResult =
  | { ok: true; duplicate: false }
  | { ok: true; duplicate: true }
  | { ok: false; error: string };

/**
 * Wait until the Supabase client has a valid auth session loaded. Without this,
 * a write fired right after app cold-start (or right after a token refresh) can
 * go out unauthenticated, RLS silently drops the row, and the insert appears
 * to succeed because no error is returned.
 */
async function waitForAuthedSession(timeoutMs = 4000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) return true;
    await new Promise((r) => setTimeout(r, 150));
  }
  return false;
}

/**
 * Append a Spotify track to a curated playlist. Returns a tagged result so
 * the caller can show clear feedback — silent failures (RLS denial, network)
 * used to make it look like the add worked when it hadn't.
 *
 * Uses `.insert(...).select().single()` so RLS denials surface as errors
 * (the returning clause fails when the inserted row isn't visible to the
 * caller). Then re-reads the row to confirm persistence, which catches the
 * rare "insert returned no error but no row was written" case.
 */
export async function addSongToCuratedPlaylist(
  playlistId: string,
  track: Omit<SpotifyTrackResult, 'id'> & { id: string | null; url?: string | null; provider?: string | null; links?: { platform: string; url: string }[] | null }
): Promise<AddSongResult> {
  const ready = await waitForAuthedSession();
  if (!ready) {
    return { ok: false, error: "Not signed in — please reopen the app and try again." };
  }

  // Identity column: Spotify songs dedup by track id; pasted-link songs (no
  // Spotify id) dedup by their source URL.
  const dedupCol = track.id ? 'spotify_track_id' : 'song_url';
  const dedupVal = track.id ?? track.url ?? null;
  if (!dedupVal) {
    return { ok: false, error: "Song is missing an identifier." };
  }

  // Skip if the track is already in this playlist.
  const { data: existingRows, error: existingErr } = await supabase
    .from('curated_playlist_songs')
    .select('id')
    .eq('playlist_id', playlistId)
    .eq(dedupCol, dedupVal)
    .limit(1);
  if (existingErr) {
    console.error('[addSongToCuratedPlaylist] existence check failed', existingErr);
    return { ok: false, error: existingErr.message };
  }
  if (existingRows && existingRows.length > 0) return { ok: true, duplicate: true };

  // Compute the next position from the current max.
  const { data: lastRows, error: lastErr } = await supabase
    .from('curated_playlist_songs')
    .select('position')
    .eq('playlist_id', playlistId)
    .order('position', { ascending: false })
    .limit(1);
  if (lastErr) {
    console.error('[addSongToCuratedPlaylist] position lookup failed', lastErr);
    return { ok: false, error: lastErr.message };
  }
  const nextPos = (lastRows?.[0]?.position ?? -1) + 1;

  const payload = {
    playlist_id: playlistId,
    spotify_track_id: track.id ?? null,
    track_name: track.name,
    track_artist: track.artist || 'Unknown',
    album_art: track.albumArt,
    duration_ms: track.durationMs ?? 0,
    position: nextPos,
    song_url: track.url ?? null,
    song_provider: track.provider ?? null,
    song_links: track.links ?? null,
  };

  // .select().single() forces the returning clause; an RLS denial surfaces as
  // an error here rather than appearing silently successful.
  const { data: inserted, error } = await supabase
    .from('curated_playlist_songs')
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('[addSongToCuratedPlaylist] insert failed', { error, payload });
    return { ok: false, error: error.message };
  }
  if (!inserted?.id) {
    console.error('[addSongToCuratedPlaylist] insert returned no row', payload);
    return { ok: false, error: "Insert returned no row. Likely a permissions issue." };
  }

  return { ok: true, duplicate: false };
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

// ─── DM-scoped playlists ─────────────────────────────────────────────────────
// A curated playlist with `conversation_id` set is collaborative: both DM
// participants can read, add songs, and edit. RLS in
// `add_conversation_settings.sql` enforces this.

/** Curated playlists collaboratively owned by both participants of a DM. */
export async function getConversationPlaylists(conversationId: string): Promise<CuratedPlaylist[]> {
  const { data, error } = await supabase
    .from('curated_playlists')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return data as CuratedPlaylist[]
}

/** Create a new collaborative playlist scoped to a 1:1 conversation. */
export async function createConversationPlaylist(
  userId: string,
  conversationId: string,
  name: string,
  imageUrl: string | null = null,
): Promise<CuratedPlaylist | null> {
  const trimmed = name.trim()
  if (!trimmed) return null
  const { data, error } = await supabase
    .from('curated_playlists')
    .insert({
      user_id: userId,
      conversation_id: conversationId,
      name: trimmed,
      image_url: imageUrl,
      tags: [],
      show_on_profile: false,
    })
    .select()
    .single()
  if (error) { console.error('[playlists] create conversation playlist:', error.message); return null }
  return data as CuratedPlaylist
}
