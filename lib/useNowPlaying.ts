import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import { getCurrentlyPlaying, refreshSpotifyToken, reconnectSpotify } from './spotify'
import { registerBackgroundSync, unregisterBackgroundSync } from './backgroundSync'

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
  const [track,               setTrack]               = useState<NowPlayingTrack | null>(null)
  const [liveProgressMs,      setLiveProgressMs]      = useState(0)
  const [loading,             setLoading]             = useState(true)
  const [needsReconnect,      setNeedsReconnect]      = useState(false)
  const [broadcastingEnabled, setBroadcastingEnabled] = useState(false)
  const [broadcastLoading,    setBroadcastLoading]    = useState(true)

  const tokenCache      = useRef<{ token: string; expiresAt: string } | null>(null)
  const fetchedAt       = useRef<number>(Date.now())
  const baseProgress    = useRef<number>(0)
  const lastBroadcastId = useRef<string | null>(null)  // track id last written to DB
  const broadcastingRef = useRef(false)                // sync ref so poll() closure reads current value

  // Keep ref in sync with state so the poll closure always reads the latest value
  useEffect(() => { broadcastingRef.current = broadcastingEnabled }, [broadcastingEnabled])

  // Load initial broadcasting state from DB
  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setBroadcastLoading(false); return }
      const { data } = await supabase
        .from('users')
        .select('is_broadcasting')
        .eq('id', user.id)
        .single()
      const enabled = data?.is_broadcasting ?? false
      setBroadcastingEnabled(enabled)
      broadcastingRef.current = enabled
      setBroadcastLoading(false)
    })()
  }, [])

  // Toggle broadcasting on/off — writes to DB, clears song data when turning off,
  // and registers/unregisters the background sync task.
  const toggleBroadcasting = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const newVal = !broadcastingEnabled
    setBroadcastingEnabled(newVal)
    broadcastingRef.current = newVal

    if (!newVal) {
      lastBroadcastId.current = null
      await supabase.from('users').update({
        is_broadcasting:     false,
        current_song_name:        null,
        current_song_artist:      null,
        current_song_id:          null,
        current_song_album_art:   null,
        current_song_duration_ms: null,
        current_song_progress_ms: null,
        current_song_updated_at:  null,
      }).eq('id', user.id)
      await unregisterBackgroundSync()
    } else {
      await supabase.from('users').update({ is_broadcasting: true }).eq('id', user.id)
      await registerBackgroundSync()
      // Reset dedup so the next poll immediately writes the current song
      lastBroadcastId.current = null
    }
  }

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
        tokenCache.current = { token, expiresAt: new Date(Date.now() + 55 * 60 * 1000).toISOString() }
        setNeedsReconnect(false)
        return token
      } else {
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

    // Only broadcast to other profiles when broadcasting is enabled.
    // Only write when the track actually changes (not every 3s poll).
    if (broadcastingRef.current) {
      const broadcastId = result?.isPlaying ? result.id : null
      if (broadcastId !== lastBroadcastId.current) {
        lastBroadcastId.current = broadcastId
        supabase.from('users').update({
          current_song_name:        result?.isPlaying ? result.name       : null,
          current_song_artist:      result?.isPlaying ? result.artist     : null,
          current_song_id:          result?.isPlaying ? result.id         : null,
          current_song_album_art:   result?.isPlaying ? result.albumArt   : null,
          current_song_duration_ms: result?.isPlaying ? result.durationMs : null,
          current_song_progress_ms: result?.isPlaying ? result.progressMs : null,
          current_song_updated_at:  result?.isPlaying ? new Date().toISOString() : null,
        }).eq('id', user.id).then(() => {})  // fire-and-forget
      }
    }

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

  // Reconnect Spotify after token revocation
  const reconnect = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const result = await reconnectSpotify(user.id)

    if ('error' in result) {
      console.log('[NowPlaying] reconnect failed:', result.error)
      return
    }

    tokenCache.current = { token: result.accessToken, expiresAt: result.expiresAt }
    setNeedsReconnect(false)
  }

  return {
    track, liveProgressMs, gradient: DEFAULT_GRADIENT, loading,
    needsReconnect, refresh: poll, reconnect,
    broadcastingEnabled, broadcastLoading, toggleBroadcasting,
  }
}
