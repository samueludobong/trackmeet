import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getCurrentlyPlaying, refreshSpotifyToken, reconnectSpotify, setActiveSpotifyToken } from '../lib/spotify';
import { registerBackgroundSync, unregisterBackgroundSync } from '../lib/backgroundSync';
import { gradientFromArt, accentFromArt, DEFAULT_ACCENT } from './albumColors';

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
  /** Name of the active Spotify device (e.g. "oraimo SpaceBuds Hybrid"). */
  deviceName: string | null
  /** Active device category — "Smartphone", "Computer", "Speaker", etc. */
  deviceType: string | null
}

export const DEFAULT_GRADIENT: [string, string, string] = ['#3D1A0C', '#1E0D08', '#0E0907']

// How far actual playback position may diverge from the expected (continuous)
// position before we treat it as a seek and re-broadcast. Comfortably above
// normal poll jitter so steady playback never triggers an extra write.
const SEEK_DRIFT_MS = 3500

export function useNowPlaying() {
  const [track,               setTrack]               = useState<NowPlayingTrack | null>(null)
  // `liveProgressMs` updates ONLY at poll time (every 3s) — not every second.
  // Previously a 1Hz ticker called setLiveProgressMs every second, which
  // changed the context value's identity and forced all ~16 NowPlayingCtx
  // consumers to re-render every second — making tab swaps feel laggy because
  // the JS thread was constantly busy. Components that visibly need smooth
  // sub-second progress now opt-in via `useSmoothProgressMs()` and tick locally.
  const [liveProgressMs,      setLiveProgressMs]      = useState(0)
  const [polledAt,            setPolledAt]            = useState(0)
  const [loading,             setLoading]             = useState(true)
  const [needsReconnect,      setNeedsReconnect]      = useState(false)
  const [broadcastingEnabled, setBroadcastingEnabled] = useState(false)
  const [broadcastLoading,    setBroadcastLoading]    = useState(true)
  const [gradient,            setGradient]            = useState<[string, string, string]>(DEFAULT_GRADIENT)
  const [accent,              setAccent]              = useState<[string, string, string]>(DEFAULT_ACCENT)

  const tokenCache      = useRef<{ token: string; expiresAt: string } | null>(null)
  const fetchedAt       = useRef<number>(Date.now())
  const baseProgress    = useRef<number>(0)
  const lastBroadcastId = useRef<string | null>(null)  // track id last written to DB
  const broadcastingRef = useRef(false)                // sync ref so poll() closure reads current value
  // Bumped on resetSpotify so any in-flight poll that completes AFTER a
  // disconnect/reconnect knows to throw away its result. Without this, a poll
  // that grabbed a valid token a moment before disconnectSpotify() ran would
  // race back and call setTrack(result), reviving the old now-playing card
  // until the next render cycle.
  const resetGen        = useRef(0)
  // Baseline of the last position we broadcast, so we can detect seeks (actual
  // position diverging from where continuous playback would have reached).
  const lastBroadcastProgress = useRef(0)
  const lastBroadcastAt       = useRef(0)
  const lastBroadcastPlaying  = useRef(false)

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
  // Reads the ref (not the state) so rapid taps don't read a stale closure.
  const toggleBroadcasting = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const newVal = !broadcastingRef.current
    broadcastingRef.current = newVal
    setBroadcastingEnabled(newVal)

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
      if (refreshed.ok) {
        token = refreshed.accessToken
        tokenCache.current = { token, expiresAt: new Date(Date.now() + 55 * 60 * 1000).toISOString() }
        setNeedsReconnect(false)
        return token
      }
      // Refresh token is actually dead — force a reconnect prompt.
      if (refreshed.dead) {
        tokenCache.current = null
        setNeedsReconnect(true)
        return null
      }
      // Transient Spotify failure (5xx, rate-limited, network, "Failed to
      // remove token"). Don't kill the session — skip this poll and try again
      // on the next tick. If the stale token still has a tiny grace window
      // (Spotify accepts up to ~60s past expiry), return it so playback UI
      // doesn't blank out for a single failed refresh.
      if (msLeft > -60_000) return token
      return null
    }

    tokenCache.current = { token, expiresAt: profile.spotify_token_expires_at }
    return token
  }

  const poll = async () => {
    // Snapshot the reset generation so we can abort if a disconnect happens
    // during any of the awaits below.
    const startGen = resetGen.current

    const { data: { user } } = await supabase.auth.getUser()
    if (!user || resetGen.current !== startGen) { setLoading(false); return }

    const token = await getValidToken(user.id)
    if (!token || resetGen.current !== startGen) { setLoading(false); return }
    // Register this token so openSpotifyLink can do an in-place track swap
    // (instead of opening the Spotify app) when a device is already playing.
    setActiveSpotifyToken(token)

    const raw = await getCurrentlyPlaying(token)

    // Disconnect happened mid-flight — discard whatever we fetched and let the
    // already-applied resetSpotify state stand.
    if (resetGen.current !== startGen) { setLoading(false); return }

    // 401 — token revoked/expired even though DB says it's valid
    if (raw && 'unauthorized' in raw) {
      tokenCache.current = null
      setActiveSpotifyToken(null)
      setNeedsReconnect(true)
      setLoading(false)
      return
    }

    const result = raw as NowPlayingTrack | null

    fetchedAt.current    = Date.now()
    baseProgress.current = result?.progressMs ?? 0

    // Only broadcast to other profiles when broadcasting is enabled.
    // Write on track change, play/pause change, OR a seek — but not on every
    // routine 3s poll (normal playback advances predictably, so we skip those).
    if (broadcastingRef.current) {
      const playing     = !!result?.isPlaying
      const broadcastId = playing ? result!.id : null
      const actualMs    = playing ? (result!.progressMs ?? 0) : 0

      const trackChanged = broadcastId !== lastBroadcastId.current
      // Where continuous playback would be by now from the last broadcast point.
      const expectedMs = lastBroadcastProgress.current +
        (lastBroadcastPlaying.current ? Date.now() - lastBroadcastAt.current : 0)
      const seeked = playing && Math.abs(actualMs - expectedMs) > SEEK_DRIFT_MS

      if (trackChanged || seeked) {
        lastBroadcastId.current       = broadcastId
        lastBroadcastProgress.current = actualMs
        lastBroadcastAt.current       = Date.now()
        lastBroadcastPlaying.current  = playing
        supabase.from('users').update({
          current_song_name:        playing ? result!.name       : null,
          current_song_artist:      playing ? result!.artist     : null,
          current_song_id:          playing ? result!.id         : null,
          current_song_album_art:   playing ? result!.albumArt   : null,
          current_song_duration_ms: playing ? result!.durationMs : null,
          current_song_progress_ms: playing ? result!.progressMs : null,
          current_song_updated_at:  playing ? new Date().toISOString() : null,
        }).eq('id', user.id).then(() => {})  // fire-and-forget
      }
    }

    setTrack(result)
    setLiveProgressMs(result?.progressMs ?? 0)
    setPolledAt(Date.now())
    setLoading(false)
  }

  useEffect(() => {
    if (needsReconnect) return   // don't poll with a dead token
    poll()
    const id = setInterval(poll, 3_000)
    return () => clearInterval(id)
  }, [needsReconnect])

  // Derive the now-playing gradient from the album art (Expo Go-safe, pure JS).
  // Falls back to DEFAULT_GRADIENT while computing or if extraction fails.
  useEffect(() => {
    const art = track?.albumArt
    if (!art) { setGradient(DEFAULT_GRADIENT); setAccent(DEFAULT_ACCENT); return }
    let active = true
    gradientFromArt(art).then((g) => { if (active) setGradient(g) })
    accentFromArt(art).then((a) => { if (active) setAccent(a) })
    return () => { active = false }
  }, [track?.albumArt])

  // (Removed) 1-second local ticker. Components that need smooth visual
  // progress use `useSmoothProgressMs()` which ticks locally — this keeps the
  // shared context value stable between polls.

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

  // Call after a Spotify connect/disconnect to wipe stale cache and reset all
  // track state so every screen that reads the context reflects the change instantly.
  // Also bumps the generation counter so any in-flight poll discards its result
  // instead of writing it back over the cleared state.
  const resetSpotify = () => {
    resetGen.current       += 1
    tokenCache.current      = null
    setActiveSpotifyToken(null)
    lastBroadcastId.current = null
    fetchedAt.current       = Date.now()
    baseProgress.current    = 0
    setTrack(null)
    setLiveProgressMs(0)
    setGradient(DEFAULT_GRADIENT)
    setAccent(DEFAULT_ACCENT)
    setNeedsReconnect(false)
    setBroadcastingEnabled(false)
  }

  // Expose the currently cached Spotify access token so feed cards (e.g.
  // MusicCard's actions sheet, which spawns LyricsOverlay in owner mode) can
  // use the same token without re-fetching from Supabase. Returns null when
  // we don't have a valid token in cache (caller should treat as "no Spotify
  // session yet" and skip Spotify-owner features).
  const accessToken = tokenCache.current?.token ?? null

  return {
    track, liveProgressMs, polledAt, gradient, accent, loading,
    needsReconnect, refresh: poll, reconnect, resetSpotify,
    broadcastingEnabled, broadcastLoading, toggleBroadcasting,
    accessToken,
  }
}

/**
 * Smooth progress in milliseconds, ticked locally at 1Hz from the last poll
 * snapshot. Use this in components that visibly render a moving seek bar —
 * the shared NowPlayingCtx value no longer changes every second, so global
 * consumers don't pay for the tick anymore.
 */
export function useSmoothProgressMs(): number {
  // Local import to keep this hook colocated with its data source.
  const ctx = useNowPlayingCtxLazy();
  const { track, liveProgressMs, polledAt } = ctx;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!track?.isPlaying) return;
    const id = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(id);
  }, [track?.id, track?.isPlaying]);
  if (!track) return 0;
  if (!track.isPlaying) return liveProgressMs;
  const elapsed = polledAt ? now - polledAt : 0;
  return Math.min(liveProgressMs + Math.max(0, elapsed), track.durationMs);
}

// Avoid a circular import by accessing the context lazily.
import { useContext } from "react";
import { NowPlayingCtx } from "../lib/feed/contexts";
function useNowPlayingCtxLazy() {
  const ctx = useContext(NowPlayingCtx);
  if (!ctx) throw new Error("useSmoothProgressMs must be used inside NowPlayingCtx.Provider");
  return ctx;
}
