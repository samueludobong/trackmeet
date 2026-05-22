import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import { getCurrentlyPlaying, refreshSpotifyToken, reconnectSpotify } from './spotify'

export type NowPlayingTrack = {
  id: string
  name: string
  artist: string
  artistId: string
  album: string
  albumArt: string | null
  previewUrl: string | null
  progressMs: number
  durationMs: number
  isPlaying: boolean
}

export const DEFAULT_GRADIENT: [string, string, string] = ['#3D1A0C', '#1E0D08', '#0E0907']

export function useNowPlaying() {
  const [track,          setTrack]          = useState<NowPlayingTrack | null>(null)
  const [liveProgressMs, setLiveProgressMs] = useState(0)
  const [loading,        setLoading]        = useState(true)
  const [needsReconnect, setNeedsReconnect] = useState(false)

  const tokenCache   = useRef<{ token: string; expiresAt: string } | null>(null)
  const fetchedAt    = useRef<number>(Date.now())
  const baseProgress = useRef<number>(0)

  const getValidToken = async (userId: string): Promise<string | null> => {
    if (tokenCache.current) {
      const expiresAt = new Date(tokenCache.current.expiresAt).getTime()
      if (expiresAt - Date.now() > 60_000) return tokenCache.current.token
    }

    const { data: profile } = await supabase
      .from('users')
      .select('spotify_access_token, spotify_refresh_token, spotify_token_expires_at')
      .eq('id', userId)
      .single()

    if (!profile?.spotify_access_token) {
      console.log('[NowPlaying] no access token in DB')
      return null
    }

    const msLeft = profile.spotify_token_expires_at
      ? new Date(profile.spotify_token_expires_at).getTime() - Date.now()
      : -1
    const expired = msLeft < 60_000
    console.log(`[NowPlaying] token from DB — expired:${expired} msLeft:${Math.round(msLeft / 1000)}s`)

    let token = profile.spotify_access_token

    if (expired && profile.spotify_refresh_token) {
      const refreshed = await refreshSpotifyToken(userId, profile.spotify_refresh_token)
      if (refreshed) {
        token = refreshed
        // Cache with a fresh 55-minute window so we don't re-check until near expiry
        tokenCache.current = { token, expiresAt: new Date(Date.now() + 55 * 60 * 1000).toISOString() }
        setNeedsReconnect(false)
        return token
      } else {
        // Refresh token is dead — clear cache, stop polling, ask user to reconnect
        tokenCache.current = null
        setNeedsReconnect(true)
        return null
      }
    }

    tokenCache.current = { token, expiresAt: profile.spotify_token_expires_at }
    return token
  }

  const poll = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const token = await getValidToken(user.id)
    if (!token) { setLoading(false); return }

    const raw = await getCurrentlyPlaying(token)

    // 401 — token revoked/expired even though DB says it's valid
    if (raw && 'unauthorized' in raw) {
      tokenCache.current = null
      setNeedsReconnect(true)
      setLoading(false)
      return
    }

    const result = raw as NowPlayingTrack | null

    fetchedAt.current    = Date.now()
    baseProgress.current = result?.progressMs ?? 0

    setTrack(result)
    setLiveProgressMs(result?.progressMs ?? 0)
    setLoading(false)
  }

  useEffect(() => {
    if (needsReconnect) return   // don't poll with a dead token
    poll()
    const id = setInterval(poll, 3_000)
    return () => clearInterval(id)
  }, [needsReconnect])

  // 1-second local ticker for smooth progress
  useEffect(() => {
    if (!track?.isPlaying) return
    const id = setInterval(() => {
      const elapsed = Date.now() - fetchedAt.current
      const live = Math.min(baseProgress.current + elapsed, track.durationMs)
      setLiveProgressMs(live)
    }, 1_000)
    return () => clearInterval(id)
  }, [track?.id, track?.isPlaying, track?.durationMs])

  // Call this when the user taps "Reconnect Spotify".
  // Uses the lightweight reconnectSpotify (no top-artists fetch) so there
  // are fewer failure points. Pre-seeds the token cache with the fresh
  // access token so the very first post-reconnect poll doesn't need a DB
  // round-trip (and can't accidentally re-read a stale row).
  const reconnect = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const result = await reconnectSpotify(user.id)

    if ('error' in result) {
      console.log('[NowPlaying] reconnect failed:', result.error)
      return
    }

    // Pre-seed cache with the fresh token so the first poll uses it directly
    tokenCache.current = { token: result.accessToken, expiresAt: result.expiresAt }

    // Flip the flag — the useEffect([needsReconnect]) will re-run, call poll(),
    // and restart the 3-second interval automatically.
    setNeedsReconnect(false)
  }

  return { track, liveProgressMs, gradient: DEFAULT_GRADIENT, loading, needsReconnect, refresh: poll, reconnect }
}
