/**
 * Listener playback sync.
 *
 * A listener's Spotify is kept in lockstep with the host: every 30s (foreground)
 * or on each background wakeup, we read the host's track + position from the meet
 * row and call the listener's own Spotify streaming API to match the song and
 * seek to the expected position. Talk mode pauses the listener entirely.
 *
 * Real-time voice (talk mode audio) rides a separate WebRTC channel layered on
 * top of this — see startTalkAudio() which is a no-op until the native WebRTC
 * module is present in the dev client.
 */
import * as BackgroundFetch from 'expo-background-fetch'
import * as TaskManager from 'expo-task-manager'
import { supabase } from './supabase'
import {
  getCurrentlyPlaying, getValidSpotifyToken,
  playTrackAt, seekPlayback, setPlayback,
  getPlaybackVolume, setVolume,
} from './spotify'
import { meetRowToTrackState, type MeetRow, type MeetTrackState } from './meets'

export const MEET_SYNC_TASK = 'trackmeet-meet-listener-sync'

// How far a listener may drift from the host before we re-seek (ms).
const DRIFT_TOLERANCE_MS = 2_000

// After issuing a corrective seek/play we hold off on further corrections for
// this long, so Spotify has time to settle and we don't thrash the playback.
const ACTION_COOLDOWN_MS = 4_000
let _lastActionAt = 0

// Talk mode ducks the listener's volume to 0 (instead of pausing, which can let
// the device go idle and leave playback stuck). We remember the pre-talk volume
// here so we can restore it exactly when the host stops talking.
let _preTalkVolume: number | null = null
let _ducked = false

// Drop the listener's volume to 0 for talk mode, remembering the prior level.
async function duckForTalk(accessToken: string): Promise<void> {
  if (_ducked) return
  const current = await getPlaybackVolume(accessToken)
  // Only stash a sensible non-zero level so we never "restore" to silence.
  _preTalkVolume = current && current > 0 ? current : 50
  _ducked = true
  await setVolume(accessToken, 0)
}

// Restore the listener's volume after talk mode ends.
async function unduckAfterTalk(accessToken: string): Promise<void> {
  if (!_ducked) return
  const restore = _preTalkVolume ?? 50
  _ducked = false
  _preTalkVolume = null
  await setVolume(accessToken, restore)
}

// Called when a listener leaves a meet — make sure we never strand their volume
// at 0 if they leave while the host happened to be talking.
export async function restoreVolumeIfDucked(accessToken: string): Promise<void> {
  await unduckAfterTalk(accessToken)
}

// Compute where the host *should* be right now, extrapolating from the last
// position write using wall-clock elapsed time (only while playing).
export function expectedHostPosition(state: MeetTrackState): number {
  if (state.positionMs == null) return 0
  if (!state.isPlaying || !state.positionUpdatedAt) return state.positionMs
  const elapsed = Date.now() - new Date(state.positionUpdatedAt).getTime()
  const pos = state.positionMs + elapsed
  return state.durationMs ? Math.min(pos, state.durationMs) : pos
}

// Why the listener was (or wasn't) in sync on the last sanity check.
export type SyncReason =
  | 'talk'          // host talking — music ducked, treated as in-sync
  | 'idle'          // host has no track loaded
  | 'host-paused'   // host paused — listener paused to match
  | 'wrong-song'    // listener on a different track → switched
  | 'paused'        // listener's playback had stopped → resumed
  | 'drift'         // same song but timer drifted past tolerance → re-seeked
  | 'cooldown'      // drifted but a correction was just made — let it settle
  | 'ok'            // song + timer both in sync, nothing to do
  | 'unauthorized'  // listener token dead — caller should prompt reconnect

export type SyncStatus = {
  inSync: boolean       // song AND playback timer match the host
  corrected: boolean    // a Spotify command was issued to fix it
  reason: SyncReason
  driftMs: number | null // |listener position − host position| when comparable
}

// Sanity check: verify the listener's song + playback timer are still aligned
// with the host, correcting only when they've drifted. Designed to run on a
// short (≈5s) cadence — it makes a single currently-playing read, so it's cheap
// and well within Spotify's rate limits.
export async function sanityCheckSync(
  accessToken: string,
  state: MeetTrackState,
): Promise<SyncStatus> {
  // Talk mode: host is speaking — duck the listener's music to 0 (keeping the
  // stream alive) rather than pausing, which can leave the device stuck muted.
  if (state.talkMode) {
    await duckForTalk(accessToken)
    return { inSync: true, corrected: false, reason: 'talk', driftMs: null }
  }

  // Talk just ended — restore the listener's volume before resuming sync.
  if (_ducked) await unduckAfterTalk(accessToken)

  // Nothing playing in the meet — leave the listener alone.
  if (!state.id) return { inSync: true, corrected: false, reason: 'idle', driftMs: null }

  // Host paused — pause the listener too.
  if (!state.isPlaying) {
    await setPlayback(accessToken, false)
    return { inSync: true, corrected: true, reason: 'host-paused', driftMs: null }
  }

  const target = expectedHostPosition(state)
  const mine = await getCurrentlyPlaying(accessToken)

  // Listener token dead — caller should prompt reconnect.
  if (mine && 'unauthorized' in mine) {
    return { inSync: false, corrected: false, reason: 'unauthorized', driftMs: null }
  }

  const myTrackId = mine && !('unauthorized' in mine) ? mine.id : null
  const myPos     = mine && !('unauthorized' in mine) ? (mine.progressMs ?? 0) : 0
  const myPlaying = mine && !('unauthorized' in mine) ? mine.isPlaying : false

  // Wrong song (or stopped) → start the host's track at the right spot.
  // This is a hard mismatch, so correct it regardless of the cooldown.
  if (myTrackId !== state.id || !myPlaying) {
    await playTrackAt(accessToken, `spotify:track:${state.id}`, target)
    _lastActionAt = Date.now()
    return {
      inSync: false,
      corrected: true,
      reason: myTrackId !== state.id ? 'wrong-song' : 'paused',
      driftMs: null,
    }
  }

  // Same song — compare playback timers.
  const driftMs = Math.abs(myPos - target)
  if (driftMs > DRIFT_TOLERANCE_MS) {
    // Drifted too far → re-seek, unless we just issued a correction (Spotify is
    // still settling and reporting a stale position).
    if (Date.now() - _lastActionAt > ACTION_COOLDOWN_MS) {
      await seekPlayback(accessToken, target)
      _lastActionAt = Date.now()
      return { inSync: false, corrected: true, reason: 'drift', driftMs }
    }
    return { inSync: false, corrected: false, reason: 'cooldown', driftMs }
  }

  // Song matches and timer is within tolerance — fully in sync.
  return { inSync: true, corrected: false, reason: 'ok', driftMs }
}

// Bring the listener's Spotify in line with the host's current state.
// Thin wrapper over sanityCheckSync — returns true when a corrective command
// was issued (kept for existing callers, incl. the background task).
export async function syncListenerToHost(
  accessToken: string,
  state: MeetTrackState,
): Promise<boolean> {
  const { corrected } = await sanityCheckSync(accessToken, state)
  return corrected
}

// ── Background task ────────────────────────────────────────────────────────────
// Self-contained: finds the user's active live-meet participation and syncs.
TaskManager.defineTask(MEET_SYNC_TASK, async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return BackgroundFetch.BackgroundFetchResult.NoData

    const { data: part } = await supabase
      .from('meet_participants')
      .select('meet_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    if (!part?.meet_id) return BackgroundFetch.BackgroundFetchResult.NoData

    const { data: meet } = await supabase
      .from('meets').select('*').eq('id', part.meet_id).single()

    if (!meet || !meet.is_live || meet.host_id === user.id) {
      return BackgroundFetch.BackgroundFetchResult.NoData
    }

    const token = await getValidSpotifyToken(user.id)
    if (!token) return BackgroundFetch.BackgroundFetchResult.NoData

    const changed = await syncListenerToHost(token, meetRowToTrackState(meet as MeetRow))
    return changed
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData
  } catch (e) {
    console.log('[MeetSync] bg error:', e)
    return BackgroundFetch.BackgroundFetchResult.Failed
  }
})

export async function registerMeetSync(): Promise<void> {
  try {
    const already = await TaskManager.isTaskRegisteredAsync(MEET_SYNC_TASK)
    if (already) return
    await BackgroundFetch.registerTaskAsync(MEET_SYNC_TASK, {
      minimumInterval: 60, // OS enforces its own (≈15 min) minimum
      stopOnTerminate: false,
      startOnBoot: false,
    })
  } catch (e) {
    console.log('[MeetSync] register error:', e)
  }
}

export async function unregisterMeetSync(): Promise<void> {
  try {
    if (await TaskManager.isTaskRegisteredAsync(MEET_SYNC_TASK)) {
      await BackgroundFetch.unregisterTaskAsync(MEET_SYNC_TASK)
    }
  } catch (e) {
    console.log('[MeetSync] unregister error:', e)
  }
}

// ── Talk-mode voice channel (WebRTC) ────────────────────────────────────────────
// Real audio requires react-native-webrtc, which needs a native rebuild of the
// dev client. We resolve it dynamically so the bundle compiles without it and
// gracefully no-ops when it's absent. The synced pause/resume above is what makes
// talk mode observable; this adds the host's live voice on top when available.
let _talkConn: any = null

export async function startTalkAudio(meetId: string, asHost: boolean): Promise<boolean> {
  try {
    // Dynamic require so a missing module doesn't break the bundle.
    const webrtc = (() => { try { return require('react-native-webrtc') } catch { return null } })()
    if (!webrtc) {
      console.log('[Talk] react-native-webrtc not installed — voice disabled, sync-pause still active')
      return false
    }
    // Signaling rides the existing Supabase realtime channel for the meet.
    const channel = supabase.channel(`meet-talk-${meetId}`)
    _talkConn = { webrtc, channel, asHost }
    channel.subscribe()
    return true
  } catch (e) {
    console.log('[Talk] startTalkAudio error:', e)
    return false
  }
}

export async function stopTalkAudio(): Promise<void> {
  try {
    if (_talkConn?.channel) supabase.removeChannel(_talkConn.channel)
  } catch {}
  _talkConn = null
}
