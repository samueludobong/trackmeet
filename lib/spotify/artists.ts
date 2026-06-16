import * as AuthSession from 'expo-auth-session'
import * as WebBrowser from 'expo-web-browser'
import * as Crypto from 'expo-crypto'
import * as Linking from 'expo-linking'
import { supabase } from '../supabase'


export type SpotifyArtistInfo = {
  id: string
  name: string
  imageUrl: string | null
  genres: string[]
  followersCount: number
}

export type SpotifyAlbum = {
  id: string
  name: string
  albumType: string   // "album" | "single" | "compilation"
  releaseDate: string
  totalTracks: number
  imageUrl: string | null
  artist?: string | null   // primary artist (album-search results only)
}

export type SpotifyAlbumTrack = {
  id: string
  name: string
  trackNumber: number
  durationMs: number
  previewUrl: string | null
}

// Search Spotify for an artist by name and return the best match.

export const searchSpotifyArtist = async (
  accessToken: string,
  name: string,
): Promise<SpotifyArtistInfo | null> => {
  try {
    const res = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(name)}&type=artist&limit=1`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    if (!res.ok) return null
    const data = await res.json()
    const a = data.artists?.items?.[0]
    if (!a) return null
    return {
      id: a.id,
      name: a.name,
      imageUrl: a.images?.[0]?.url ?? null,
      genres: a.genres ?? [],
      followersCount: a.followers?.total ?? 0,
    }
  } catch { return null }
}

// Fetch an artist's albums/singles from Spotify.

export const getArtistAlbums = async (
  accessToken: string,
  artistId: string,
): Promise<SpotifyAlbum[]> => {
  try {
    const cleanId = artistId.trim()
    const res = await fetch(
      `https://api.spotify.com/v1/artists/${cleanId}/albums`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    if (!res.ok) return []
    const data = await res.json()
    return (data.items ?? []).map((a: any) => ({
      id: a.id,
      name: a.name,
      albumType: a.album_type,
      releaseDate: a.release_date,
      totalTracks: a.total_tracks,
      imageUrl: a.images?.[0]?.url ?? null,
    }))
  } catch { return [] }
}

// Fetch tracks for a specific album.

export const getAlbumTracks = async (
  accessToken: string,
  albumId: string,
): Promise<SpotifyAlbumTrack[]> => {
  try {
    const res = await fetch(
      `https://api.spotify.com/v1/albums/${albumId}/tracks?limit=50`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    if (!res.ok) return []
    const data = await res.json()
    return (data.items ?? []).map((t: any) => ({
      id: t.id,
      name: t.name,
      trackNumber: t.track_number,
      durationMs: t.duration_ms,
      previewUrl: t.preview_url ?? null,
    }))
  } catch { return [] }
}

// Search Spotify for multiple artists (Artists tab).

export const searchSpotifyArtists = async (
  accessToken: string,
  query: string,
  limit = 20,
): Promise<SpotifyArtistInfo[]> => {
  try {
    const res = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=artist&limit=${limit}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    if (!res.ok) return []
    const data = await res.json()
    return (data.artists?.items ?? []).map((a: any) => ({
      id: a.id,
      name: a.name,
      imageUrl: a.images?.[0]?.url ?? null,
      genres: a.genres ?? [],
      followersCount: a.followers?.total ?? 0,
    }))
  } catch { return [] }
}

// Search Spotify for albums (Albums tab). Album search results carry the album
// art + name; the artist name is the primary artist.

export const searchSpotifyAlbums = async (
  accessToken: string,
  query: string,
  limit = 20,
): Promise<SpotifyAlbum[]> => {
  try {
    const res = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=album&limit=${limit}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    if (!res.ok) return []
    const data = await res.json()
    return (data.albums?.items ?? []).map((a: any) => ({
      id: a.id,
      name: a.name,
      albumType: a.album_type,
      releaseDate: a.release_date,
      totalTracks: a.total_tracks,
      imageUrl: a.images?.[0]?.url ?? null,
      artist: a.artists?.[0]?.name ?? null,
    }))
  } catch { return [] }
}

// â”€â”€â”€ Spotify playlist writes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Require playlist-modify-public + playlist-modify-private scopes (added above).
// Older user tokens issued before the scopes were added will return 403 / 401
// here; callers detect that via the `needsReconnect` discriminator and prompt.

// Structured result for write operations so the UI can distinguish "succeeded",
// "missing scope (must reconnect)", and other failures.

export async function fetchSpotifyArtistById(token: string, artistId: string): Promise<any | null> {
  const res = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.ok ? res.json() : null;
}

/** Fetch a Spotify track object by id (parsed JSON, or null on error). */
