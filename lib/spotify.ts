import * as AuthSession from 'expo-auth-session'
import * as WebBrowser from 'expo-web-browser'
import * as Crypto from 'expo-crypto'
import * as Linking from 'expo-linking'
import { supabase } from './supabase'

WebBrowser.maybeCompleteAuthSession()

// Your Spotify app credentials
const SPOTIFY_CLIENT_ID = '80054cf467bf4cb6bf9396f73a405e07'
const SPOTIFY_SCOPES = [
  'user-read-email',
  'user-read-private',
  'user-top-read',
  'user-read-recently-played',
  'user-read-currently-playing',
  'user-read-playback-state',
  'user-modify-playback-state',
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-library-modify',    // needed for Save to Liked Songs
  'user-library-read',      // needed to check if track is already liked
].join(' ')

// Generate redirect URI
export const redirectUri = AuthSession.makeRedirectUri({
  scheme: 'trackmeet',
  path: 'spotify-callback',
})

// Generate code verifier for PKCE
// Avoid btoa(String.fromCharCode(...typedArray)) — spreading Uint8Array into
// String.fromCharCode is unreliable in Hermes for byte values > 127.
// Use Crypto.getRandomBytesAsync then encode via base64url with Expo's built-in encoder.
const generateCodeVerifier = async (): Promise<string> => {
  const randomBytes = await Crypto.getRandomBytesAsync(32)
  // Encode each byte individually — safe in all JS engines
  let binary = ''
  for (let i = 0; i < randomBytes.length; i++) binary += String.fromCharCode(randomBytes[i])
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

// Generate code challenge from verifier (PKCE: BASE64URL(SHA256(ASCII(verifier))))
// expo-crypto digestStringAsync is correct here because the code verifier only
// contains base64url characters (A-Z, a-z, 0-9, -, _) — all ASCII — so its
// UTF-8 encoding is identical to its ASCII encoding, producing the right hash.
const generateCodeChallenge = async (verifier: string): Promise<string> => {
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    verifier,
    { encoding: Crypto.CryptoEncoding.BASE64 },
  )
  return hash
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

// Main Spotify auth function.
// userId is optional — pass it when the user row already exists (e.g. Settings page)
// and the function will UPDATE the row. During onboarding the row doesn't exist yet,
// so omit userId and use the returned token fields to include in the INSERT instead.
export const connectSpotify = async (userId?: string) => {
  try {
    console.log('[Spotify] connectSpotify v4 start')
    const codeVerifier = await generateCodeVerifier()
    const codeChallenge = await generateCodeChallenge(codeVerifier)

    const params = new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: SPOTIFY_SCOPES,
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
    })

    // When reconnecting from Settings (userId already exists), force the Spotify
    // permissions dialog to appear every time so the user explicitly grants ALL
    // current scopes — Spotify otherwise caches the previous grant and skips the
    // dialog, issuing a token with the old (smaller) scope set.
    if (userId) params.set('show_dialog', 'true')

    // Log so you can verify this matches what's in your Spotify Dashboard
    console.log('[Spotify] redirectUri:', redirectUri)

    // Always use openAuthSessionAsync regardless of whether the Spotify app is
    // installed.  On iOS this uses ASWebAuthenticationSession (in-app browser
    // overlay); on Android it uses Chrome Custom Tabs.  Both handle the
    // trackmeet://spotify-callback redirect internally so Expo Router never
    // sees it as a navigation event — avoiding the "unknown route" crash on
    // Android that the old Linking.openURL + addEventListener path caused.
    const result = await WebBrowser.openAuthSessionAsync(
      `https://accounts.spotify.com/authorize?${params.toString()}`,
      redirectUri,
    )
    console.log('[Spotify] openAuthSession result:', result.type)
    if (result.type !== 'success') return { error: 'Auth cancelled' }

    // Parse the callback URL safely — new URL() can behave unexpectedly with
    // non-standard schemes (exp://) in some Hermes builds, so fall back to regex.
    let code: string | null = null
    try {
      code = new URL(result.url).searchParams.get('code')
    } catch {
      const m = result.url.match(/[?&]code=([^&]+)/)
      code = m ? decodeURIComponent(m[1]) : null
    }
    if (!code) {
      const errParam = result.url.match(/[?&]error=([^&]+)/)?.[1]
      return { error: errParam ? decodeURIComponent(errParam) : 'No code returned' }
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: SPOTIFY_CLIENT_ID,
        code_verifier: codeVerifier,
      }).toString(),
    })

    // Read raw text first — Spotify occasionally returns plain-text errors (e.g. when
    // the code_verifier doesn't match the challenge) instead of JSON.
    const tokenRaw = await tokenResponse.text()
    console.log('[Spotify] token response status:', tokenResponse.status)
    let tokens: any
    try {
      tokens = JSON.parse(tokenRaw)
    } catch {
      console.log('[Spotify] token response body (non-JSON):', tokenRaw.slice(0, 300))
      return { error: `Token exchange failed: ${tokenRaw.slice(0, 120)}` }
    }

    if (tokens.error) return { error: tokens.error_description ?? tokens.error }
    if (!tokens.access_token) {
      console.log('[Spotify] token response missing access_token:', JSON.stringify(tokens))
      return { error: 'No access token in response' }
    }
    console.log('[Spotify] got access_token OK')

    // Get Spotify user profile
    const profileResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const profileRaw = await profileResponse.text()
    console.log('[Spotify] profile status:', profileResponse.status)
    let spotifyProfile: any
    try {
      spotifyProfile = JSON.parse(profileRaw)
    } catch {
      console.log('[Spotify] profile body (non-JSON):', profileRaw.slice(0, 200))
      return { error: 'Could not fetch Spotify profile' }
    }
    if (spotifyProfile.error) return { error: spotifyProfile.error?.message ?? 'Profile error' }

    // Get top artists for taste profile
    const topArtistsResponse = await fetch(
      'https://api.spotify.com/v1/me/top/artists?limit=20&time_range=medium_term',
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    )
    const topArtistsRaw = await topArtistsResponse.text()
    console.log('[Spotify] top-artists status:', topArtistsResponse.status)
    let topArtists: any
    try {
      topArtists = JSON.parse(topArtistsRaw)
    } catch {
      console.log('[Spotify] top-artists body (non-JSON):', topArtistsRaw.slice(0, 200))
      // Non-fatal — continue with empty artist list
      topArtists = { items: [] }
    }

    // Extract genres from top artists
    const genres = [...new Set(
      topArtists.items?.flatMap((artist: any) => artist.genres) ?? []
    )]

    const artistIds = topArtists.items?.map((a: any) => a.id) ?? []

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    // Only UPDATE the DB row when the user already exists (e.g. Settings flow).
    // During onboarding userId is undefined — the caller stores the returned
    // token fields and includes them in the initial INSERT instead.
    if (userId) {
      const { error: updateError } = await supabase
        .from('users')
        .update({
          spotify_id: spotifyProfile.id,
          spotify_access_token: tokens.access_token,
          spotify_refresh_token: tokens.refresh_token,
          spotify_token_expires_at: expiresAt,
          top_artist_ids: artistIds,
          top_genres: genres,
        })
        .eq('id', userId)

      if (updateError) throw updateError
    }

    return {
      success: true,
      spotifyProfile,
      topArtists: topArtists.items,
      // Always returned so callers can persist them however they need
      spotifyId:        spotifyProfile.id,
      accessToken:      tokens.access_token,
      refreshToken:     tokens.refresh_token,
      expiresAt,
      topGenres:        genres as string[],
      topArtistIds:     artistIds as string[],
    }

  } catch (error: any) {
    console.log('Spotify connect error:', error)
    return { error: error.message }
  }
}

// Disconnect Spotify — clears all token fields from the user's DB row
export const disconnectSpotify = async (userId: string): Promise<void> => {
  await supabase.from('users').update({
    spotify_id:               null,
    spotify_access_token:     null,
    spotify_refresh_token:    null,
    spotify_token_expires_at: null,
    current_song_name:        null,
    current_song_artist:      null,
    current_song_id:          null,
    current_song_album_art:   null,
    current_song_duration_ms: null,
    current_song_progress_ms: null,
    current_song_updated_at:  null,
    is_broadcasting:          false,
  }).eq('id', userId)
}

// Refresh expired token
export const refreshSpotifyToken = async (userId: string, refreshToken: string) => {
  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: SPOTIFY_CLIENT_ID,
      }).toString(),
    })

    const tokens = await response.json()

    // Spotify returns { error, error_description } when the refresh token is
    // invalid or revoked — guard before touching expires_in to avoid RangeError
    if (tokens.error) {
      console.log('Spotify refresh failed:', tokens.error, tokens.error_description)
      return null
    }

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    // Spotify sometimes rotates the refresh token — save it if we get a new one
    const update: Record<string, string> = {
      spotify_access_token: tokens.access_token,
      spotify_token_expires_at: expiresAt,
    }
    if (tokens.refresh_token) update.spotify_refresh_token = tokens.refresh_token

    await supabase.from('users').update(update).eq('id', userId)

    return tokens.access_token

  } catch (error) {
    console.log('Token refresh error:', error)
    return null
  }
}

// Lightweight reconnect — only does the PKCE auth flow + token exchange + DB save.
// Does NOT fetch top artists, so it can't fail due to unrelated API errors.
// Use this when re-authenticating an existing user whose tokens have expired/been revoked.
export const reconnectSpotify = async (userId: string): Promise<
  { success: true; accessToken: string; expiresAt: string } | { error: string }
> => {
  try {
    const codeVerifier  = await generateCodeVerifier()
    const codeChallenge = await generateCodeChallenge(codeVerifier)

    const params = new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: SPOTIFY_SCOPES,
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
    })

    // Same unified approach as connectSpotify — always use openAuthSessionAsync
    // so Android doesn't get an "unknown route" error on the callback deep link.
    const result = await WebBrowser.openAuthSessionAsync(
      `https://accounts.spotify.com/authorize?${params.toString()}`,
      redirectUri,
    )
    if (result.type !== 'success') return { error: 'Auth cancelled' }

    // Safe URL parsing with regex fallback (same as connectSpotify)
    let code: string | null = null
    try {
      code = new URL(result.url).searchParams.get('code')
    } catch {
      const m = result.url.match(/[?&]code=([^&]+)/)
      code = m ? decodeURIComponent(m[1]) : null
    }
    if (!code) {
      const errParam = result.url.match(/[?&]error=([^&]+)/)?.[1]
      return { error: errParam ? decodeURIComponent(errParam) : 'No code returned' }
    }

    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: SPOTIFY_CLIENT_ID,
        code_verifier: codeVerifier,
      }).toString(),
    })

    const tokenRaw = await tokenResponse.text()
    console.log('[Spotify] reconnect token status:', tokenResponse.status)
    let tokens: any
    try {
      tokens = JSON.parse(tokenRaw)
    } catch {
      console.log('[Spotify] reconnect token body (non-JSON):', tokenRaw.slice(0, 300))
      return { error: `Token exchange failed: ${tokenRaw.slice(0, 120)}` }
    }
    if (tokens.error) return { error: tokens.error_description ?? tokens.error }

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    const { data: saved, error: dbError } = await supabase
      .from('users')
      .update({
        spotify_access_token: tokens.access_token,
        spotify_refresh_token: tokens.refresh_token,
        spotify_token_expires_at: expiresAt,
      })
      .eq('id', userId)
      .select('id')   // confirms a row was actually updated (RLS block = 0 rows, no error)

    if (dbError) {
      console.log('[reconnectSpotify] DB error:', dbError.message)
      return { error: dbError.message }
    }
    if (!saved || saved.length === 0) {
      console.log('[reconnectSpotify] DB update matched 0 rows — RLS may be blocking the write')
      return { error: 'Token save failed — no rows updated' }
    }

    console.log('[reconnectSpotify] tokens saved OK')
    return { success: true, accessToken: tokens.access_token, expiresAt }

  } catch (err: any) {
    console.log('[reconnectSpotify] error:', err)
    return { error: err.message }
  }
}

// Open a Spotify URI in the app if installed, otherwise fall back to the web player in a WebView.
// uri  — Spotify URI,  e.g. "spotify:track:4uLU6hMCjMI75M1A2tKUQC"
// webUrl — fallback web URL, e.g. "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC"
//
// Uses try/catch rather than canOpenURL — canOpenURL('spotify://') requires
// LSApplicationQueriesSchemes on iOS and returns false even when the app is installed
// if the scheme isn't declared there, causing it to always fall into the WebView branch.
export const openSpotifyLink = async (uri: string, webUrl: string) => {
  try {
    await Linking.openURL(uri)
  } catch {
    // Spotify not installed — open in the in-app browser instead.
    await WebBrowser.openBrowserAsync(webUrl)
  }
}

// Get currently playing track.
// Returns null when nothing is playing (204), or { unauthorized: true } when
// the token is expired/revoked so the caller can prompt reconnect.
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
    }

  } catch (error) {
    // console.log('Currently playing error:', error)
    return null
  }
}

// Save a track to the user's Liked Songs library.
// Requires the user-library-modify scope (added in SPOTIFY_SCOPES above).
// Returns true on success, false on failure (including missing scope).
export const saveTrackToLiked = async (accessToken: string, trackId: string): Promise<boolean> => {
  try {
    const res = await fetch('https://api.spotify.com/v1/me/tracks', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids: [trackId] }),
    })
    return res.status === 200
  } catch {
    return false
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

    // Liked Songs first — fetch just 1 item to get the total count
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
        // Release Radar, etc.) — Spotify restricted Web API track access to these
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
    // All other playlists use the public client-credentials token — Spotify's
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
        console.log(`[Spotify] getPlaylistTracks "${playlistId}" → HTTP ${res.status}`)
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
    console.log(`[Spotify] getPlaylistTracks "${playlistId}" → ${results.length} tracks`)
    return { tracks: results }
  } catch (e) {
    console.log('[Spotify] getPlaylistTracks error:', e)
    return { tracks: [] }
  }
}

// ─── Public (app-level) token ─────────────────────────────────────────────────
// Uses the spotify-public-token Edge Function which runs Client Credentials flow
// server-side (client_secret never exposed in the app bundle).
// The result is cached in module memory so we only call the function once per hour.
let _publicToken    = "";
let _publicTokenExp = 0;

export const getPublicSpotifyToken = async (): Promise<string | null> => {
  if (_publicToken && Date.now() < _publicTokenExp - 30_000) return _publicToken;
  try {
    const supabaseUrl     = process.env.EXPO_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
    const { data: { session } } = await supabase.auth.getSession();

    const res = await fetch(
      `${supabaseUrl}/functions/v1/spotify-public-token`,
      {
        headers: {
          apikey:        supabaseAnonKey,
          Authorization: `Bearer ${session?.access_token ?? supabaseAnonKey}`,
        },
      },
    );
    if (!res.ok) {
      console.error('[spotify] public token fetch failed:', res.status, await res.text());
      return null;
    }
    const { access_token } = await res.json();
    if (!access_token) return null;
    _publicToken    = access_token;
    _publicTokenExp = Date.now() + 55 * 60 * 1000;
    return _publicToken;
  } catch (e) {
    console.error('[spotify] getPublicSpotifyToken error:', e);
    return null;
  }
};

// ─── Token helper ─────────────────────────────────────────────────────────────
// Returns a valid (non-expired) Spotify access token for the given user,
// refreshing automatically if it has less than 60 seconds left.
// Returns null when no token exists or the refresh fails.
export const getValidSpotifyToken = async (userId: string): Promise<string | null> => {
  try {
    const { data: profile } = await supabase
      .from('users')
      .select('spotify_access_token, spotify_refresh_token, spotify_token_expires_at')
      .eq('id', userId)
      .single()

    if (!profile?.spotify_access_token) return null

    const msLeft = profile.spotify_token_expires_at
      ? new Date(profile.spotify_token_expires_at).getTime() - Date.now()
      : -1

    if (msLeft >= 60_000) return profile.spotify_access_token

    // Token expired (or about to) — try to refresh
    if (!profile.spotify_refresh_token) return null
    const refreshed = await refreshSpotifyToken(userId, profile.spotify_refresh_token)
    return refreshed ?? null
  } catch {
    return null
  }
}

// ─── Artist discovery ─────────────────────────────────────────────────────────

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

// Check if a track is already in the user's Liked Songs.
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

// ─── Playback controls ────────────────────────────────────────────────────────
// All three require the user-modify-playback-state scope (already in SPOTIFY_SCOPES).

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
export const playTrackAt = async (accessToken: string, trackUri: string, positionMs: number): Promise<void> => {
  const body = JSON.stringify({ uris: [trackUri], position_ms: Math.max(0, Math.round(positionMs)) })
  const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
  try {
    const res = await fetch('https://api.spotify.com/v1/me/player/play', { method: 'PUT', headers, body })
    if (res.status === 404) {
      const deviceId = await pickTargetDevice(accessToken)
      if (!deviceId) {
        console.log('[Spotify] playTrackAt: no available device — listener must open Spotify')
        return
      }
      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, { method: 'PUT', headers, body })
    }
  } catch (e) {
    console.log('[Spotify] playTrackAt error:', e)
  }
}

// Play a specific track immediately by its Spotify URI (e.g. "spotify:track:<id>").
// Requires an active Spotify device; silently no-ops if none is available.
export const playTrack = async (accessToken: string, trackUri: string): Promise<void> => {
  try {
    await fetch('https://api.spotify.com/v1/me/player/play', {
      method: 'PUT',
      headers: {
        Authorization:  `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uris: [trackUri] }),
    })
  } catch (e) {
    console.log('[Spotify] playTrack error:', e)
  }
}

// ─── Spotify Canvas (unofficial spclient API) ─────────────────────────────────
// Returns a looping MP4/WebM URL for the given track, or null when unavailable.
// Uses a hand-rolled minimal protobuf encoder/decoder — no extra dependencies.

function _varint(n: number): number[] {
  const out: number[] = []
  while (n > 0x7f) { out.push((n & 0x7f) | 0x80); n >>>= 7 }
  out.push(n & 0x7f)
  return out
}

function _readVarint(buf: Uint8Array, pos: number): [number, number] {
  let result = 0, shift = 0
  while (pos < buf.length) {
    const b = buf[pos++]
    result |= (b & 0x7f) << shift
    shift += 7
    if (!(b & 0x80)) break
  }
  return [result, pos]
}

function _readProto(buf: Uint8Array): Map<number, Uint8Array[]> {
  const fields = new Map<number, Uint8Array[]>()
  let pos = 0
  while (pos < buf.length) {
    let tag: number
    ;[tag, pos] = _readVarint(buf, pos)
    const fieldNum = tag >>> 3
    const wireType = tag & 7
    if (wireType === 0) {
      let _v: number
      ;[_v, pos] = _readVarint(buf, pos)
    } else if (wireType === 2) {
      let len: number
      ;[len, pos] = _readVarint(buf, pos)
      const data = buf.slice(pos, pos + len)
      pos += len
      if (!fields.has(fieldNum)) fields.set(fieldNum, [])
      fields.get(fieldNum)!.push(data)
    } else {
      break  // unsupported wire type — stop parsing
    }
  }
  return fields
}

export const fetchSpotifyCanvas = async (
  trackId: string,
  accessToken: string,
): Promise<string | null> => {
  try {
    // Build CanvazRequest { repeated EntityCanvasRequest canvases = 1; }
    //   EntityCanvasRequest { string entity_uri = 1; }
    const entityUri  = `spotify:track:${trackId}`
    const uriBytes   = Array.from(new TextEncoder().encode(entityUri))
    const entityMsg  = [0x0a, ..._varint(uriBytes.length), ...uriBytes]  // field 1 LEN
    const requestBuf = new Uint8Array([0x0a, ..._varint(entityMsg.length), ...entityMsg])

    const res = await fetch(
      'https://spclient.wg.spotify.com/canvaz-cache/v0/canvases',
      {
        method:  'POST',
        headers: {
          Authorization:  `Bearer ${accessToken}`,
          'Content-Type': 'application/x-protobuf',
          Accept:         'application/x-protobuf',
        },
        body: requestBuf,
      },
    )

    if (!res.ok) {
      // 403 is expected — spclient requires Spotify's internal client credentials,
      // not a user OAuth token. Fall back to album art silently.
      if (res.status !== 403) console.log('[Spotify] canvas fetch failed:', res.status)
      return null
    }

    // Parse CanvazResponse { repeated EntityCanvasResponse canvases = 1; }
    //   EntityCanvasResponse { string entity_uri = 1; string url = 2; ... }
    const buf         = new Uint8Array(await res.arrayBuffer())
    const topFields   = _readProto(buf)
    const canvases    = topFields.get(1) ?? []
    for (const canvasBytes of canvases) {
      const canvasFields = _readProto(canvasBytes)
      const urlBytes     = canvasFields.get(2)?.[0]   // field 2 = url
      if (urlBytes && urlBytes.length > 0) {
        return new TextDecoder().decode(urlBytes)
      }
    }
    return null
  } catch (e) {
    console.log('[Spotify] fetchSpotifyCanvas error:', e)
    return null
  }
}

/** Fetch a Spotify artist object by id (parsed JSON, or null on error). */
export async function fetchSpotifyArtistById(token: string, artistId: string): Promise<any | null> {
  const res = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.ok ? res.json() : null;
}

/** Fetch a Spotify track object by id (parsed JSON, or null on error). */
export async function fetchSpotifyTrackById(token: string, trackId: string): Promise<any | null> {
  const res = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.ok ? res.json() : null;
}


// ─── Spotify link parsing / metadata (moved from lib/feed/helpers) ──────────
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
