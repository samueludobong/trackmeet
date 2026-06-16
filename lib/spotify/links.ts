import * as AuthSession from 'expo-auth-session'
import * as WebBrowser from 'expo-web-browser'
import * as Crypto from 'expo-crypto'
import * as Linking from 'expo-linking'
import { supabase } from '../supabase'
import { getActiveSpotifyToken } from './auth'
import { getCurrentlyPlaying, playTrack } from './player'

export const openSpotifyLink = async (uri: string, webUrl: string) => {
  const trackMatch = uri.match(/^spotify:track:([A-Za-z0-9]+)$/)
  const _tok = getActiveSpotifyToken();
  if (trackMatch && _tok) {
    try {
      const cp = await getCurrentlyPlaying(_tok)
      if (cp && !('unauthorized' in cp) && cp.isPlaying) {
        const ok = await playTrack(_tok, uri)
        if (ok) return
        // playTrack failed (no premium / no active device race / API error) â€”
        // fall through to opening the app so the user still gets the track.
      }
    } catch {
      // network/API error â€” fall through to open behavior
    }
  }
  try {
    await Linking.openURL(uri)
  } catch {
    // Spotify not installed â€” open in the in-app browser instead.
    await WebBrowser.openBrowserAsync(webUrl)
  }
}

// Get currently playing track.
// Returns null when nothing is playing (204), or { unauthorized: true } when
// the token is expired/revoked so the caller can prompt reconnect.

export function parseSpotifyUrl(url: string): { type: string; id: string } | null {
  const m = url.match(/open\.spotify\.com\/(track|artist|album|playlist)\/([A-Za-z0-9]+)/);
  return m ? { type: m[1], id: m[2] } : null;
}

export type SpotifyLinkInfo = {
  resourceType: string;
  name: string;
  subtitle: string | null;
  imageUrl: string | null;
};

export async function fetchSpotifyLinkInfo(
  token: string,
  type: string,
  id: string,
): Promise<SpotifyLinkInfo | null> {
  try {
    const ep = type === "playlist"
      ? `https://api.spotify.com/v1/playlists/${id}?fields=name,images,owner`
      : `https://api.spotify.com/v1/${type}s/${id}`;
    const res = await fetch(ep, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    const d = await res.json();
    switch (type) {
      case "track":    return { resourceType: "track",    name: d.name, subtitle: d.artists?.[0]?.name ?? null, imageUrl: d.album?.images?.[0]?.url ?? null };
      case "artist":   return { resourceType: "artist",   name: d.name, subtitle: null,                         imageUrl: d.images?.[0]?.url ?? null };
      case "album":    return { resourceType: "album",    name: d.name, subtitle: d.artists?.[0]?.name ?? null, imageUrl: d.images?.[0]?.url ?? null };
      case "playlist": return { resourceType: "playlist", name: d.name, subtitle: `by ${d.owner?.display_name ?? "Spotify"}`, imageUrl: d.images?.[0]?.url ?? null };
      default:         return null;
    }
  } catch { return null; }
}

