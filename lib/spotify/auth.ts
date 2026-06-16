import * as AuthSession from 'expo-auth-session'
import * as WebBrowser from 'expo-web-browser'
import * as Crypto from 'expo-crypto'
import * as Linking from 'expo-linking'
import { supabase } from '../supabase'

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
  'playlist-modify-public',  // needed to add tracks to / create public playlists
  'playlist-modify-private', // needed to add tracks to / create private playlists
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

/**
 * Result of a refresh attempt.
 * - `dead: true`  → the refresh token is truly invalid (revoked, expired, app
 *   uninstalled in Spotify settings, etc.). Caller should prompt reconnect.
 * - `dead: false` → transient failure (Spotify 5xx, "Failed to remove token",
 *   network error, rate-limit). Caller should keep using the existing access
 *   token if it's still valid and retry on the next poll — DO NOT prompt
 *   reconnect, that's terrible UX for a Spotify backend blip.
 */

export type RefreshResult =
  | { ok: true;  accessToken: string }
  | { ok: false; dead: boolean }

// Refresh expired token. Distinguishes transient failures (server_error,
// network, rate-limit) from permanent ones (invalid_grant, invalid_client) so
// the caller can avoid forcing a full reconnect for a temporary Spotify blip.

export const refreshSpotifyToken = async (userId: string, refreshToken: string): Promise<RefreshResult> => {
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

    // 5xx → Spotify is having issues. Don't kill the session.
    if (response.status >= 500) {
      console.log('[Spotify] refresh transient HTTP', response.status)
      return { ok: false, dead: false }
    }
    // 429 → rate-limited. Transient by definition; retry next poll.
    if (response.status === 429) {
      console.log('[Spotify] refresh rate-limited (429)')
      return { ok: false, dead: false }
    }

    const tokens = await response.json().catch(() => null) as any
    if (!tokens) return { ok: false, dead: false }

    // Spotify returns { error, error_description } when the refresh token is
    // invalid or revoked — guard before touching expires_in to avoid RangeError.
    // `invalid_grant` / `invalid_client` = the token is dead, force reconnect.
    // Anything else (notably `server_error` "Failed to remove token") is a
    // backend hiccup on Spotify's side — keep the session, retry next poll.
    if (tokens.error) {
      const dead = tokens.error === 'invalid_grant' || tokens.error === 'invalid_client'
      console.log('[Spotify] refresh failed', tokens.error, tokens.error_description, dead ? '(dead)' : '(transient)')
      return { ok: false, dead }
    }

    if (typeof tokens.expires_in !== 'number' || !tokens.access_token) {
      // Malformed success response — treat as transient.
      return { ok: false, dead: false }
    }

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    // Spotify sometimes rotates the refresh token — save it if we get a new one
    const update: Record<string, string> = {
      spotify_access_token: tokens.access_token,
      spotify_token_expires_at: expiresAt,
    }
    if (tokens.refresh_token) update.spotify_refresh_token = tokens.refresh_token

    await supabase.from('users').update(update).eq('id', userId)

    return { ok: true, accessToken: tokens.access_token }

  } catch (error) {
    // Network/JSON exception — assume transient (offline, DNS hiccup, etc.).
    console.log('[Spotify] refresh network error:', error)
    return { ok: false, dead: false }
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
      // Force the Spotify consent dialog so re-granting picks up any scopes
      // added to SPOTIFY_SCOPES since the user last authorized. Without this
      // Spotify silently reissues a token using the user's previously approved
      // (smaller) scope set, and our write endpoints all fail with 403.
      show_dialog: 'true',
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

    // Verify the granted scope set actually includes what we asked for. If the
    // user hits Cancel on a permission they should have re-granted, Spotify
    // can return success with a *narrower* scope set — and our writes will keep
    // failing silently. Logging it makes that diagnosable.
    if (tokens.scope) {
      console.log('[reconnectSpotify] granted scopes:', tokens.scope)
    }

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

// Module-level access token used by openSpotifyLink to decide whether it can
// swap a track in place instead of yanking the user out to the Spotify app.
// `useNowPlaying` sets/clears this as its token cache lifecycle changes.

let _activeViewerToken: string | null = null

export const setActiveSpotifyToken = (token: string | null): void => { _activeViewerToken = token }

export const getActiveSpotifyToken = (): string | null => _activeViewerToken

// Open a Spotify URI. For a track URI, if the viewer has a Spotify session AND a
// device is currently playing, swap the song in place (no app switch). For any
// other URI (playlist/album/artist), or when no device is playing, open the
// Spotify app (falling back to the web player when the app isn't installed).
//
// Uses try/catch rather than canOpenURL — canOpenURL('spotify://') requires
// LSApplicationQueriesSchemes on iOS and returns false even when the app is installed
// if the scheme isn't declared there, causing it to always fall into the WebView branch.

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
    if (refreshed.ok) return refreshed.accessToken
    // Transient failure: the stale access token may still have a few seconds left
    // (Spotify accepts tokens up to a minute past expiry), so it's worth returning.
    if (!refreshed.dead && msLeft > -60_000) return profile.spotify_access_token
    return null
  } catch {
    return null
  }
}

// ─── Artist discovery ─────────────────────────────────────────────────────────
