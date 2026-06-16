/**
 * Background Spotify sync task.
 *
 * This file must be imported at the app root (_layout.tsx) so that
 * TaskManager.defineTask is called before any background wakeup fires.
 *
 * On iOS the OS controls the actual interval (typically ≥15 min even if you
 * request less). On Android WorkManager enforces a ≥15 min minimum too.
 * The task is a best-effort supplement to foreground polling — it keeps the
 * "now listening" data reasonably fresh even when the app is closed.
 *
 * In Expo Go (`Constants.appOwnership === 'expo'`) expo-task-manager and
 * expo-background-fetch are unsupported, so every entry point in this file
 * becomes a no-op. Foreground polling in `useNowPlaying` continues to work
 * normally — broadcasting just doesn't update while the app is closed.
 */
import Constants from 'expo-constants'
import * as BackgroundFetch from 'expo-background-fetch'
import * as TaskManager from 'expo-task-manager'
import { supabase } from './supabase'
import { getCurrentlyPlaying, refreshSpotifyToken } from './spotify'
import type { NowPlayingTrack } from '../hooks/useNowPlaying'

export const BG_SYNC_TASK = 'trackmeet-bg-spotify-sync'

const isExpoGo = Constants.appOwnership === 'expo'

// ── Task handler ─────────────────────────────────────────────────────────────
// Must be defined at module level — called by the OS when the app is woken up.
// Skipped in Expo Go: defineTask logs a warning there because TaskManager has
// no native side, and the task would never fire anyway.

if (!isExpoGo) {
  TaskManager.defineTask(BG_SYNC_TASK, async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return BackgroundFetch.BackgroundFetchResult.NoData

      // Only run when user has broadcasting enabled
      const { data: profile } = await supabase
        .from('users')
        .select('is_broadcasting, spotify_access_token, spotify_refresh_token, spotify_token_expires_at')
        .eq('id', user.id)
        .single()

      if (!profile?.is_broadcasting) return BackgroundFetch.BackgroundFetchResult.NoData

      // Refresh token if near expiry
      let token = profile.spotify_access_token
      const msLeft = profile.spotify_token_expires_at
        ? new Date(profile.spotify_token_expires_at).getTime() - Date.now()
        : -1

      if (msLeft < 60_000 && profile.spotify_refresh_token) {
        const refreshed = await refreshSpotifyToken(user.id, profile.spotify_refresh_token)
        if (!refreshed.ok) {
          // Transient Spotify failures get retried on the next background tick;
          // a dead refresh token can't be recovered from a background task, so
          // also bail and let the next foreground poll prompt reconnect.
          return BackgroundFetch.BackgroundFetchResult.Failed
        }
        token = refreshed.accessToken
      }

      if (!token) return BackgroundFetch.BackgroundFetchResult.NoData

      const raw = await getCurrentlyPlaying(token)
      if (!raw || 'unauthorized' in raw) {
        // Clear song data if nothing playing or auth failed
        await supabase.from('users').update({
          current_song_name: null, current_song_artist: null,
          current_song_id: null, current_song_album_art: null,
          current_song_duration_ms: null, current_song_progress_ms: null,
          current_song_updated_at: null,
        }).eq('id', user.id)
        return BackgroundFetch.BackgroundFetchResult.NoData
      }

      const result = raw as NowPlayingTrack

      await supabase.from('users').update({
        current_song_name:        result.isPlaying ? result.name       : null,
        current_song_artist:      result.isPlaying ? result.artist     : null,
        current_song_id:          result.isPlaying ? result.id         : null,
        current_song_album_art:   result.isPlaying ? result.albumArt   : null,
        current_song_duration_ms: result.isPlaying ? result.durationMs : null,
        current_song_progress_ms: result.isPlaying ? result.progressMs : null,
        current_song_updated_at:  result.isPlaying ? new Date().toISOString() : null,
      }).eq('id', user.id)

      return BackgroundFetch.BackgroundFetchResult.NewData
    } catch (e) {
      console.log('[BG] sync error:', e)
      return BackgroundFetch.BackgroundFetchResult.Failed
    }
  })
}

// ── Register / unregister helpers ────────────────────────────────────────────

export async function registerBackgroundSync(): Promise<boolean> {
  if (isExpoGo) {
    console.log('[BG] skipped in Expo Go — foreground polling still broadcasts while the app is open')
    return false
  }
  try {
    const status = await BackgroundFetch.getStatusAsync()
    if (
      status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
      status === BackgroundFetch.BackgroundFetchStatus.Denied
    ) {
      console.log('[BG] background fetch not available on this device')
      return false
    }

    const already = await TaskManager.isTaskRegisteredAsync(BG_SYNC_TASK)
    if (already) return true

    await BackgroundFetch.registerTaskAsync(BG_SYNC_TASK, {
      minimumInterval: 60 * 15, // 15 min — OS enforces its own minimum
      stopOnTerminate: false,   // keep running after app is closed (Android)
      startOnBoot: true,        // re-register on device reboot (Android)
    })
    console.log('[BG] background sync registered')
    return true
  } catch (e) {
    console.log('[BG] register error:', e)
    return false
  }
}

export async function unregisterBackgroundSync(): Promise<void> {
  if (isExpoGo) return
  try {
    const registered = await TaskManager.isTaskRegisteredAsync(BG_SYNC_TASK)
    if (registered) {
      await BackgroundFetch.unregisterTaskAsync(BG_SYNC_TASK)
      console.log('[BG] background sync unregistered')
    }
  } catch (e) {
    console.log('[BG] unregister error:', e)
  }
}
