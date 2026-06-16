import * as AuthSession from 'expo-auth-session'
import * as WebBrowser from 'expo-web-browser'
import * as Crypto from 'expo-crypto'
import * as Linking from 'expo-linking'
import { supabase } from '../supabase'
import { _tokPfx, _readSpotifyErr, _writeResultFrom, type SpotifyWriteResult } from './_shared'
import { type SpotifyTrackResult } from './tracks'
import { getPublicSpotifyToken } from './auth'

export type SpotifyPlaylist = {
  id: string
  name: string
  imageUrl: string | null
  trackCount: number
  isLiked?: boolean
}

export const getUserPlaylists = async (accessToken: string): Promise<SpotifyPlaylist[]> => {
  try {
    const results: SpotifyPlaylist[] = []

    // Liked Songs first â€” fetch just 1 item to get the total count
    const savedRes = await fetch('https://api.spotify.com/v1/me/tracks?limit=1', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (savedRes.ok) {
      const d = await savedRes.json()
      results.push({ id: 'liked', name: 'Liked Songs', imageUrl: null, trackCount: d.total ?? 0, isLiked: true })
    }

    // User playlists (paginated)
    let url: string = 'https://api.spotify.com/v1/me/playlists?limit=50'
    while (url) {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
      if (!res.ok) break
      const data = await res.json()
      for (const item of data.items ?? []) {
        // Skip Spotify-owned algorithmic playlists (Daily Mix, Discover Weekly,
        // Release Radar, etc.) â€” Spotify restricted Web API track access to these
        // in 2024 and they always return 403 "Forbidden" on /playlists/{id}/tracks.
        if (!item?.id || item.owner?.id === 'spotify') continue
        results.push({
          id: item.id,
          name: item.name,
          imageUrl: item.images?.[0]?.url ?? null,
          trackCount: item.tracks?.total ?? 0,
        })
      }
      url = data.next ?? ''
    }

    return results
  } catch {
    return []
  }
}

export type PlaylistTracksResult = {
  tracks: SpotifyTrackResult[]
  httpError?: number   // set when the API returned a non-2xx status
}

export const getPlaylistTracks = async (
  userToken: string,
  playlistId: string,
): Promise<PlaylistTracksResult> => {
  try {
    const results: SpotifyTrackResult[] = []

    // Liked Songs must use the user token (user-library-read scope, /me/tracks).
    // All other playlists use the public client-credentials token â€” Spotify's
    // 2024 API policy change blocks user-token requests to /playlists/{id}/tracks
    // in development-mode apps with "Forbidden", but the public token works fine
    // for any public playlist without touching user scopes at all.
    let token = userToken
    const baseUrl = playlistId === 'liked'
      ? 'https://api.spotify.com/v1/me/tracks?limit=50'
      : `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50`

    if (playlistId !== 'liked') {
      const pubToken = await getPublicSpotifyToken()
      if (pubToken) token = pubToken
    }

    let url: string = baseUrl
    while (url) {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) {
        console.log(`[Spotify] getPlaylistTracks "${playlistId}" â†’ HTTP ${res.status}`)
        return { tracks: [], httpError: res.status }
      }
      const data = await res.json()
      for (const item of data.items ?? []) {
        if (!item) continue
        const track = item.track
        if (!track?.id) continue
        results.push({
          id: track.id,
          name: track.name,
          artist: track.artists?.[0]?.name ?? '',
          albumArt: track.album?.images?.[0]?.url ?? null,
          durationMs: track.duration_ms,
          previewUrl: track.preview_url ?? null,
        })
      }
      url = data.next ?? ''
      if (results.length >= 200) break
    }
    console.log(`[Spotify] getPlaylistTracks "${playlistId}" â†’ ${results.length} tracks`)
    return { tracks: results }
  } catch (e) {
    console.log('[Spotify] getPlaylistTracks error:', e)
    return { tracks: [] }
  }
}

// â”€â”€â”€ Public (app-level) token â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Uses the spotify-public-token Edge Function which runs Client Credentials flow
// server-side (client_secret never exposed in the app bundle).
// The result is cached in module memory so we only call the function once per hour.

export const addTrackToSpotifyPlaylist = async (
  accessToken: string,
  playlistId: string,
  trackId: string,
): Promise<SpotifyWriteResult> => {
  console.log('[Spotify] addTrackToSpotifyPlaylist tok=', _tokPfx(accessToken), 'pl=', playlistId, 'track=', trackId)
  try {
    const res = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uris: [`spotify:track:${trackId}`] }),
    })
    if (res.ok) return { ok: true }
    const message = await _readSpotifyErr(res)
    console.log('[Spotify] addTrackToSpotifyPlaylist failed', res.status, message)
    return _writeResultFrom(res, message)
  } catch (e: any) {
    console.log('[Spotify] addTrackToSpotifyPlaylist exception', e?.message)
    return { ok: false, status: 0, needsReconnect: false, message: e?.message ?? 'Network error' }
  }
}

// Remove every occurrence of a track URI from a Spotify playlist.

export const removeTrackFromSpotifyPlaylist = async (
  accessToken: string,
  playlistId: string,
  trackId: string,
): Promise<SpotifyWriteResult> => {
  try {
    const res = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tracks: [{ uri: `spotify:track:${trackId}` }] }),
    })
    if (res.ok) return { ok: true }
    const message = await _readSpotifyErr(res)
    console.log('[Spotify] removeTrackFromSpotifyPlaylist failed', res.status, message)
    return _writeResultFrom(res, message)
  } catch (e: any) {
    console.log('[Spotify] removeTrackFromSpotifyPlaylist exception', e?.message)
    return { ok: false, status: 0, needsReconnect: false, message: e?.message ?? 'Network error' }
  }
}

// Remove a track from the user's Liked Songs.

export type CreateSpotifyPlaylistResult =
  | { ok: true; playlist: SpotifyPlaylist }
  | { ok: false; status: number; needsReconnect: boolean; message?: string }

export const createSpotifyPlaylist = async (
  accessToken: string,
  name: string,
  options: { isPublic?: boolean; description?: string } = {},
): Promise<CreateSpotifyPlaylistResult> => {
  console.log('[Spotify] createSpotifyPlaylist tok=', _tokPfx(accessToken), 'name=', name)
  try {
    // Need the user's id for the create endpoint
    const meRes = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!meRes.ok) {
      const message = await _readSpotifyErr(meRes)
      console.log('[Spotify] createSpotifyPlaylist /me failed', meRes.status, message)
      return { ok: false, status: meRes.status, needsReconnect: meRes.status === 401 || meRes.status === 403, message }
    }
    const me = await meRes.json()
    const userId = me?.id
    console.log('[Spotify] createSpotifyPlaylist /me ok, userId=', userId)
    if (!userId) return { ok: false, status: 0, needsReconnect: false, message: 'Could not read Spotify user id' }

    const res = await fetch(`https://api.spotify.com/v1/users/${encodeURIComponent(userId)}/playlists`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: name.trim(),
        public: options.isPublic ?? false,
        description: options.description ?? '',
      }),
    })
    if (!res.ok) {
      const message = await _readSpotifyErr(res)
      console.log('[Spotify] createSpotifyPlaylist create failed', res.status, message)
      return { ok: false, status: res.status, needsReconnect: res.status === 401 || res.status === 403, message }
    }
    const data = await res.json()
    return {
      ok: true,
      playlist: {
        id: data.id,
        name: data.name,
        imageUrl: data.images?.[0]?.url ?? null,
        trackCount: data.tracks?.total ?? 0,
      },
    }
  } catch (e: any) {
    console.log('[Spotify] createSpotifyPlaylist exception', e?.message)
    return { ok: false, status: 0, needsReconnect: false, message: e?.message ?? 'Network error' }
  }
}

// Bulk membership check for one track across many Spotify playlists. Each playlist
// requires a separate API call (Spotify has no batch endpoint for this), so we
// cap concurrency to keep the request burst friendly to rate limits.

export const playlistsContainingTrack = async (
  accessToken: string,
  playlistIds: string[],
  trackId: string,
): Promise<Set<string>> => {
  const out = new Set<string>()
  const limit = 6
  let i = 0
  const worker = async () => {
    while (i < playlistIds.length) {
      const idx = i++
      const id = playlistIds[idx]
      try {
        // Smallest possible response â€” just the items we care about.
        const res = await fetch(
          `https://api.spotify.com/v1/playlists/${id}/tracks?fields=items(track(id)),next&limit=100`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        )
        if (!res.ok) continue
        let data = await res.json()
        let found = false
        while (data) {
          if ((data.items ?? []).some((it: any) => it?.track?.id === trackId)) { found = true; break }
          if (!data.next) break
          const nextRes = await fetch(data.next, { headers: { Authorization: `Bearer ${accessToken}` } })
          if (!nextRes.ok) break
          data = await nextRes.json()
        }
        if (found) out.add(id)
      } catch { /* ignore single-playlist failure */ }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, playlistIds.length) }, worker))
  return out
}

// Check if a track is already in the user's Liked Songs.
