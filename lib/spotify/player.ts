import * as AuthSession from 'expo-auth-session'
import * as WebBrowser from 'expo-web-browser'
import * as Crypto from 'expo-crypto'
import * as Linking from 'expo-linking'
import { supabase } from '../supabase'

export const getCurrentlyPlaying = async (accessToken: string) => {
  try {
    const response = await fetch(
      'https://api.spotify.com/v1/me/player/currently-playing',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    if (response.status === 401) return { unauthorized: true }
    if (response.status === 204) return null

    const data = await response.json()

    if (!data.item) return null

    return {
      id: data.item.id,
      name: data.item.name,
      artist: data.item.artists[0].name,
      artistId: data.item.artists[0].id,
      album: data.item.album.name,
      albumArt: data.item.album.images[0]?.url,
      previewUrl: data.item.preview_url,
      progressMs: data.progress_ms,
      durationMs: data.item.duration_ms,
      isPlaying: data.is_playing,
      // Active device name (e.g. "oraimo SpaceBuds Hybrid") for the now-playing
      // strip's "playing on …" line. Spotify returns the device block when the
      // user-read-playback-state scope is granted; null when scope is missing
      // or no device info is in the response.
      deviceName: (data.device?.name as string | undefined) ?? null,
      deviceType: (data.device?.type as string | undefined) ?? null,
    }

  } catch (error) {
    // console.log('Currently playing error:', error)
    return null
  }
}

// Save a track to the user's Liked Songs library.
// Requires the user-library-modify scope (added in SPOTIFY_SCOPES above).
// Returns true on success, false on failure (including missing scope).


export const skipPrevious = async (accessToken: string): Promise<void> => {
  try {
    await fetch('https://api.spotify.com/v1/me/player/previous', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  } catch (e) {
    console.log('[Spotify] skipPrevious error:', e)
  }
}

export const skipNext = async (accessToken: string): Promise<void> => {
  try {
    await fetch('https://api.spotify.com/v1/me/player/next', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  } catch (e) {
    console.log('[Spotify] skipNext error:', e)
  }
}

// play=true → resume/play, play=false → pause

export const setPlayback = async (accessToken: string, play: boolean): Promise<void> => {
  try {
    await fetch(`https://api.spotify.com/v1/me/player/${play ? 'play' : 'pause'}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  } catch (e) {
    console.log('[Spotify] setPlayback error:', e)
  }
}

// Seek to a position (ms) in the user's currently-playing track.
// Requires the user-modify-playback-state scope and an active device.

export const seekPlayback = async (accessToken: string, positionMs: number): Promise<void> => {
  try {
    await fetch(`https://api.spotify.com/v1/me/player/seek?position_ms=${Math.max(0, Math.round(positionMs))}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  } catch (e) {
    console.log('[Spotify] seekPlayback error:', e)
  }
}

// Read the current playback volume (0–100) of the active device, or null when
// there's no active device / volume isn't reported.

export const getPlaybackVolume = async (accessToken: string): Promise<number | null> => {
  try {
    const res = await fetch('https://api.spotify.com/v1/me/player', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok || res.status === 204) return null
    const data = await res.json()
    const v = data?.device?.volume_percent
    return typeof v === 'number' ? v : null
  } catch (e) {
    console.log('[Spotify] getPlaybackVolume error:', e)
    return null
  }
}

// Set the active device's playback volume (0–100). Used by talk mode to "duck"
// the listener's music instead of pausing it — pausing can let the Spotify
// device go idle, leaving playback in an unrecoverable state. Keeping the stream
// alive at volume 0 means it resumes instantly when talk mode ends.

export const setVolume = async (accessToken: string, percent: number): Promise<void> => {
  const vol = Math.max(0, Math.min(100, Math.round(percent)))
  try {
    await fetch(`https://api.spotify.com/v1/me/player/volume?volume_percent=${vol}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  } catch (e) {
    console.log('[Spotify] setVolume error:', e)
  }
}

// List the user's available Spotify Connect devices (open apps, speakers, etc.).

export const getSpotifyDevices = async (
  accessToken: string,
): Promise<{ id: string; is_active: boolean; name: string }[]> => {
  try {
    const res = await fetch('https://api.spotify.com/v1/me/player/devices', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.devices ?? []) as { id: string; is_active: boolean; name: string }[]
  } catch (e) {
    console.log('[Spotify] getSpotifyDevices error:', e)
    return []
  }
}

// Pick the best device to target: the active one, else the first available.
// Returns null when the user has no open Spotify app anywhere.

const pickTargetDevice = async (accessToken: string): Promise<string | null> => {
  const devices = await getSpotifyDevices(accessToken)
  if (devices.length === 0) return null
  return (devices.find((d) => d.is_active) ?? devices[0]).id
}

// Play a specific track at a given start position (ms) in one call.
// The Web API returns 404 NO_ACTIVE_DEVICE when the user has no *active* device
// (common for a listener who just opened the app and hasn't pressed play in
// Spotify yet). In that case we discover an available device and retry against
// it explicitly, which also wakes the device up.

// Returns true when a play command was issued, false when there's no device to
// play on (caller should wake one by opening the Spotify app to the track).
export const playTrackAt = async (accessToken: string, trackUri: string, positionMs: number): Promise<boolean> => {
  const body = JSON.stringify({ uris: [trackUri], position_ms: Math.max(0, Math.round(positionMs)) })
  const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
  try {
    const res = await fetch('https://api.spotify.com/v1/me/player/play', { method: 'PUT', headers, body })
    if (res.status === 404) {
      const deviceId = await pickTargetDevice(accessToken)
      if (!deviceId) {
        console.log('[Spotify] playTrackAt: no available device — listener must open Spotify')
        return false
      }
      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, { method: 'PUT', headers, body })
    }
    return true
  } catch (e) {
    console.log('[Spotify] playTrackAt error:', e)
    return false
  }
}

/**
 * Play a list of Spotify track URIs as a queue. Picks the user's active device
 * (or the first available one), then PUTs the URIs to /me/player/play so the
 * Spotify app starts playing immediately.
 *
 * Returns:
 *   - { ok: true }                      — playback started
 *   - { ok: false, reason: 'no-device' } — user must open Spotify on a device
 *   - { ok: false, reason: 'error', message } — anything else (premium req, etc.)
 *
 * Spotify caps a single play request at 100 URIs; we slice to that.
 */

export const playTracks = async (
  accessToken: string,
  trackUris: string[],
): Promise<{ ok: true } | { ok: false; reason: 'no-device' | 'error'; message?: string }> => {
  if (trackUris.length === 0) return { ok: false, reason: 'error', message: 'No tracks to play.' };
  const uris = trackUris.slice(0, 100);
  const body = JSON.stringify({ uris });
  const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

  const attempt = async (deviceId?: string) => {
    const url = deviceId
      ? `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`
      : 'https://api.spotify.com/v1/me/player/play';
    return fetch(url, { method: 'PUT', headers, body });
  };

  try {
    let res = await attempt();
    if (res.status === 404) {
      // No active device — pick one and retry.
      const deviceId = await pickTargetDevice(accessToken);
      if (!deviceId) return { ok: false, reason: 'no-device' };
      res = await attempt(deviceId);
    }
    if (res.status === 204 || res.status === 202 || res.ok) return { ok: true };
    if (res.status === 403) return { ok: false, reason: 'error', message: 'Spotify Premium required.' };
    const text = await res.text().catch(() => '');
    return { ok: false, reason: 'error', message: text || `Spotify returned ${res.status}` };
  } catch (e: any) {
    return { ok: false, reason: 'error', message: e?.message ?? 'Network error' };
  }
};

// Play a specific track immediately by its Spotify URI (e.g. "spotify:track:<id>").
// Requires an active Spotify device. Returns true on success, false otherwise
// (no active device → 404, no premium → 403, network error, etc.). Callers
// like openSpotifyLink use the false to decide whether to fall back to opening
// the Spotify app instead.

export const playTrack = async (accessToken: string, trackUri: string): Promise<boolean> => {
  try {
    const res = await fetch('https://api.spotify.com/v1/me/player/play', {
      method: 'PUT',
      headers: {
        Authorization:  `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uris: [trackUri] }),
    })
    return res.ok || res.status === 202 || res.status === 204
  } catch (e) {
    console.log('[Spotify] playTrack error:', e)
    return false
  }
}

// ─── Spotify Canvas (unofficial spclient API) ─────────────────────────────────
// Returns a looping MP4/WebM URL for the given track, or null when unavailable.
// Uses a hand-rolled minimal protobuf encoder/decoder — no extra dependencies.
