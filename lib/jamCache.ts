import * as SecureStore from "expo-secure-store";
import { type MeetTrackState } from "../services/meets";

// Local (NOT db) cache of the jam driver's last-known track + seek position +
// album art. Kept fresh continuously while a device is active, so the instant
// Spotify drops to a "no device" state (e.g. after a pause) we still have the
// last frame to keep the jam alive and to resume playback from.
const KEY = "jam-last-track";

export async function cacheJamTrack(t: MeetTrackState): Promise<void> {
  try {
    if (!t.id) return; // never cache an empty/idle state
    await SecureStore.setItemAsync(KEY, JSON.stringify(t));
  } catch {}
}

export async function getCachedJamTrack(): Promise<MeetTrackState | null> {
  try {
    const v = await SecureStore.getItemAsync(KEY);
    return v ? (JSON.parse(v) as MeetTrackState) : null;
  } catch {
    return null;
  }
}

export async function clearJamTrack(): Promise<void> {
  try { await SecureStore.deleteItemAsync(KEY); } catch {}
}
