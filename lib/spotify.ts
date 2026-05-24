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
const generateCodeVerifier = async () => {
  const randomBytes = await Crypto.getRandomBytesAsync(32)
  return btoa(String.fromCharCode(...randomBytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

// Generate code challenge from verifier
const generateCodeChallenge = async (verifier: string) => {
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    verifier,
    { encoding: Crypto.CryptoEncoding.BASE64 }
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

    // Log so you can verify this matches what's in your Spotify Dashboard
    console.log('[Spotify] redirectUri:', redirectUri)

    let code: string | null = null

    const spotifyInstalled = await Linking.canOpenURL('spotify://')
    console.log('[Spotify] app installed:', spotifyInstalled)

    if (spotifyInstalled) {
      // Open the HTTPS auth URL in the system browser.
      // On iOS, Spotify registers accounts.spotify.com as a Universal Link,
      // so iOS automatically hands the URL off to the Spotify app instead of Safari.
      // After the user approves, Spotify redirects to trackmeet://spotify-callback?code=...
      // and iOS routes that back to this app.
      //
      // NOTE: this requires a dev build or standalone app — Expo Go does not
      // register the trackmeet:// URL scheme, so the callback will never arrive.
      code = await new Promise<string | null>((resolve) => {
        let settled = false

        const finish = (value: string | null) => {
          if (settled) return
          settled = true
          sub.remove()
          clearTimeout(timer)
          resolve(value)
        }

        // Only handle URLs that are our callback — ignore anything else
        const sub = Linking.addEventListener('url', ({ url }) => {
          console.log('[Spotify] incoming url:', url)
          if (!url.startsWith(redirectUri)) return
          try {
            finish(new URL(url).searchParams.get('code'))
          } catch {
            finish(null)
          }
        })

        Linking.openURL(
          `https://accounts.spotify.com/authorize?${params.toString()}`
        )

        // Safety timeout — 5 minutes
        const timer = setTimeout(() => finish(null), 5 * 60 * 1000)
      })
    } else {
      // Spotify not installed — open auth in an in-app browser (WebView)
      const result = await WebBrowser.openAuthSessionAsync(
        `https://accounts.spotify.com/authorize?${params.toString()}`,
        redirectUri,
      )
      if (result.type !== 'success') return { error: 'Auth cancelled' }
      code = new URL(result.url).searchParams.get('code')
    }

    if (!code) return { error: 'No code returned' }

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

    const tokens = await tokenResponse.json()

    if (tokens.error) return { error: tokens.error_description }

    // Get Spotify user profile
    const profileResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const spotifyProfile = await profileResponse.json()

    // Get top artists for taste profile
    const topArtistsResponse = await fetch(
      'https://api.spotify.com/v1/me/top/artists?limit=20&time_range=medium_term',
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    )
    const topArtists = await topArtistsResponse.json()

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

    let code: string | null = null
    const spotifyInstalled = await Linking.canOpenURL('spotify://')

    if (spotifyInstalled) {
      code = await new Promise<string | null>((resolve) => {
        let settled = false
        const finish = (value: string | null) => {
          if (settled) return
          settled = true
          sub.remove()
          clearTimeout(timer)
          resolve(value)
        }
        const sub = Linking.addEventListener('url', ({ url }) => {
          if (!url.startsWith(redirectUri)) return
          try { finish(new URL(url).searchParams.get('code')) }
          catch { finish(null) }
        })
        Linking.openURL(`https://accounts.spotify.com/authorize?${params.toString()}`)
        const timer = setTimeout(() => finish(null), 5 * 60 * 1000)
      })
    } else {
      const result = await WebBrowser.openAuthSessionAsync(
        `https://accounts.spotify.com/authorize?${params.toString()}`,
        redirectUri,
      )
      if (result.type !== 'success') return { error: 'Auth cancelled' }
      code = new URL(result.url).searchParams.get('code')
    }

    if (!code) return { error: 'No code returned' }

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

    const tokens = await tokenResponse.json()
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
    console.log('Currently playing error:', error)
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
    }))
  } catch {
    return []
  }
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
