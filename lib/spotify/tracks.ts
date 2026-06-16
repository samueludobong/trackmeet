import * as AuthSession from 'expo-auth-session'
import * as WebBrowser from 'expo-web-browser'
import * as Crypto from 'expo-crypto'
import * as Linking from 'expo-linking'
import { supabase } from '../supabase'
import { _tokPfx, _readSpotifyErr, _writeResultFrom, type SpotifyWriteResult } from './_shared'

export const saveTrackToLiked = async (accessToken: string, trackId: string): Promise<boolean> => {
  const res = await saveTrackToLikedDetailed(accessToken, trackId)
  return res.ok
}

// Detailed variant of saveTrackToLiked â€” same shape as the playlist write helpers
// so the AddToPlaylistSheet can show specific errors (403 = missing scope).

export const saveTrackToLikedDetailed = async (
  accessToken: string,
  trackId: string,
): Promise<SpotifyWriteResult> => {
  console.log('[Spotify] saveTrackToLiked tok=', _tokPfx(accessToken), 'track=', trackId)
  try {
    const res = await fetch('https://api.spotify.com/v1/me/tracks', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids: [trackId] }),
    })
    if (res.ok) return { ok: true }
    const message = await _readSpotifyErr(res)
    console.log('[Spotify] saveTrackToLiked failed', res.status, message)
    return { ok: false, status: res.status, needsReconnect: res.status === 401 || res.status === 403, message }
  } catch (e: any) {
    console.log('[Spotify] saveTrackToLiked exception', e?.message)
    return { ok: false, status: 0, needsReconnect: false, message: e?.message ?? 'Network error' }
  }
}

export type SpotifyTrackResult = {
  id: string
  name: string
  artist: string
  albumArt: string | null
  durationMs: number
  previewUrl: string | null
}

/**
 * Recommended tracks seeded by IDs from an existing playlist. Spotify
 * deprecated /v1/recommendations for newly-registered apps in Nov 2024,
 * so if we get a 403/404 we silently fall back to the user's top tracks
 * (still genre-aligned because Spotify's "top" model already weights taste).
 */

export const getRecommendedTracks = async (
  accessToken: string,
  seedTrackIds: string[],
  limit = 30,
): Promise<SpotifyTrackResult[]> => {
  if (seedTrackIds.length === 0) return getUserTopTracks(accessToken, limit);
  const seeds = seedTrackIds.slice(0, 5).join(',');
  try {
    const res = await fetch(
      `https://api.spotify.com/v1/recommendations?seed_tracks=${seeds}&limit=${limit}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) return getUserTopTracks(accessToken, limit);
    const data = await res.json();
    return (data.tracks ?? []).map((item: any) => ({
      id: item.id,
      name: item.name,
      artist: item.artists?.[0]?.name ?? '',
      albumArt: item.album?.images?.[0]?.url ?? null,
      durationMs: item.duration_ms,
      previewUrl: item.preview_url ?? null,
    }));
  } catch {
    return getUserTopTracks(accessToken, limit);
  }
};

// Top tracks for the signed-in user (short_term â‰ˆ last 4 weeks).
// Used as a "popular" feed when the app has nothing more global to show.
// Requires user-top-read scope (already in SPOTIFY_SCOPES).

export const getUserTopTracks = async (
  accessToken: string,
  limit = 20,
): Promise<SpotifyTrackResult[]> => {
  try {
    const res = await fetch(
      `https://api.spotify.com/v1/me/top/tracks?time_range=short_term&limit=${limit}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    if (!res.ok) return []
    const data = await res.json()
    return (data.items ?? []).map((item: any) => ({
      id: item.id,
      name: item.name,
      artist: item.artists?.[0]?.name ?? '',
      albumArt: item.album?.images?.[0]?.url ?? null,
      durationMs: item.duration_ms,
      previewUrl: item.preview_url ?? null,
    }))
  } catch {
    return []
  }
}

export const searchSpotifyTracks = async (
  accessToken: string,
  query: string,
  limit = 10,
): Promise<SpotifyTrackResult[]> => {
  try {
    const res = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    if (!res.ok) return []
    const data = await res.json()
    return (data.tracks?.items ?? []).map((item: any) => ({
      id: item.id,
      name: item.name,
      artist: item.artists[0]?.name ?? '',
      albumArt: item.album.images[0]?.url ?? null,
      durationMs: item.duration_ms,
      previewUrl: item.preview_url ?? null,
    }))
  } catch {
    return []
  }
}

export const removeTrackFromLiked = async (
  accessToken: string,
  trackId: string,
): Promise<SpotifyWriteResult> => {
  try {
    const res = await fetch(`https://api.spotify.com/v1/me/tracks?ids=${trackId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (res.ok) return { ok: true }
    const message = await _readSpotifyErr(res)
    console.log('[Spotify] removeTrackFromLiked failed', res.status, message)
    return _writeResultFrom(res, message)
  } catch (e: any) {
    console.log('[Spotify] removeTrackFromLiked exception', e?.message)
    return { ok: false, status: 0, needsReconnect: false, message: e?.message ?? 'Network error' }
  }
}

// Create a new (private by default) Spotify playlist owned by the signed-in user.
// Returns the playlist on success, or a structured error so the UI can prompt
// for a reconnect when the token is missing playlist-modify scopes.

export const isTrackSaved = async (accessToken: string, trackId: string): Promise<boolean> => {
  try {
    const res = await fetch(
      `https://api.spotify.com/v1/me/tracks/contains?ids=${trackId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    if (!res.ok) return false
    const data = await res.json()
    return data[0] === true
  } catch {
    return false
  }
}

// â”€â”€â”€ Playback controls â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// All three require the user-modify-playback-state scope (already in SPOTIFY_SCOPES).

export async function fetchSpotifyTrackById(token: string, trackId: string): Promise<any | null> {
  const res = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.ok ? res.json() : null;
}

/**
 * Fallback 30s preview URL scraped from Spotify's public embed page.
 * Spotify removed `preview_url` from /v1/tracks in late 2024, but the embed
 * page still ships `audioPreview.url` inside its Next.js data blob.
 * Unofficial â€” Spotify can break this any time.
 */
