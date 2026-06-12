import { useCallback, useEffect, useRef } from "react";
import { Audio } from "expo-av";
import { resolveSongPreviewUrl } from "../lib/songPreview";

/**
 * Pooled audio for the story viewer — the story-screen counterpart to
 * useFeedPreviewPlayer.
 *
 * - One Sound per songId, loaded lazily (URL resolved via resolveSongPreviewUrl)
 *   and kept in a `pool` for instant playback on advance.
 * - `activeSongId` plays exactly one; the rest stay loaded-but-paused.
 * - `preloadSongIds` warms upcoming/previous songs in the background (no play).
 *   Anything not in `preloadSongIds` and not active is evicted + unloaded — so
 *   we never keep more than the neighbour window decoded ("expire it too").
 * - `paused` pauses/resumes the active sound in place; `muted` toggles mute
 *   across the whole pool.
 *
 * Pass a *stable* (memoised) `preloadSongIds` array so the reconcile effect
 * doesn't churn every render.
 */
export function useStoryAudioPool({
  activeSongId, preloadSongIds, paused, muted,
}: {
  activeSongId: string | null;
  preloadSongIds: string[];
  paused: boolean;
  muted: boolean;
}) {
  const poolRef = useRef<Map<string, Audio.Sound>>(new Map());
  const loadingRef = useRef<Map<string, Promise<Audio.Sound | null>>>(new Map());
  const unmountedRef = useRef(false);
  const activeIdRef = useRef<string | null>(null);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  // Live mirror so an in-flight load can tell if its song is still wanted.
  const preloadRef = useRef(preloadSongIds);
  preloadRef.current = preloadSongIds;

  useEffect(() => {
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true, shouldDuckAndroid: true }).catch(() => {});
  }, []);

  // Apply mute to every pooled sound when the toggle flips.
  useEffect(() => {
    for (const s of poolRef.current.values()) s.setIsMutedAsync(muted).catch(() => {});
  }, [muted]);

  // Pause / resume the active sound (long-press, sheets, drag-to-close).
  useEffect(() => {
    const id = activeIdRef.current;
    if (!id) return;
    const s = poolRef.current.get(id);
    if (!s) return;
    if (paused) s.pauseAsync().catch(() => {});
    else        s.playAsync().catch(() => {});
  }, [paused]);

  const isWanted = (songId: string) =>
    songId === activeIdRef.current || preloadRef.current.includes(songId);

  const loadInto = useCallback((songId: string): Promise<Audio.Sound | null> => {
    const existing = poolRef.current.get(songId);
    if (existing) return Promise.resolve(existing);
    const inFlight = loadingRef.current.get(songId);
    if (inFlight) return inFlight;

    const promise: Promise<Audio.Sound | null> = (async () => {
      try {
        const url = await resolveSongPreviewUrl(songId).catch(() => null);
        if (!url || unmountedRef.current) return null;
        // Lost the race — no longer active or preloaded. Skip the decode.
        if (!isWanted(songId)) return null;
        const { sound } = await Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: false, isMuted: mutedRef.current, isLooping: true, volume: 1 },
        );
        if (unmountedRef.current || !isWanted(songId)) {
          await sound.unloadAsync().catch(() => {});
          return null;
        }
        const beatUs = poolRef.current.get(songId);
        if (beatUs && beatUs !== sound) { await sound.unloadAsync().catch(() => {}); return beatUs; }
        poolRef.current.set(songId, sound);
        return sound;
      } catch {
        return null;
      } finally {
        loadingRef.current.delete(songId);
      }
    })();
    loadingRef.current.set(songId, promise);
    return promise;
  }, []);

  // Switch the active song — pause + rewind the previous, load + play the next.
  useEffect(() => {
    const nextId = activeSongId;
    if (activeIdRef.current === nextId) return;
    const prevId = activeIdRef.current;
    activeIdRef.current = nextId;

    (async () => {
      if (prevId) {
        const s = poolRef.current.get(prevId);
        if (s) { await s.pauseAsync().catch(() => {}); await s.setPositionAsync(0).catch(() => {}); }
      }
      if (!nextId) return;
      const sound = await loadInto(nextId);
      if (!sound || activeIdRef.current !== nextId) return;
      await sound.setIsMutedAsync(mutedRef.current).catch(() => {});
      if (activeIdRef.current !== nextId) return;
      if (!pausedRef.current) await sound.playAsync().catch(() => {});
      // Superseded during playAsync — undo so it doesn't play behind the new active.
      if (activeIdRef.current !== nextId) {
        await sound.pauseAsync().catch(() => {});
        await sound.setPositionAsync(0).catch(() => {});
      }
    })();
  }, [activeSongId, loadInto]);

  // Reconcile pool against preload window + active: evict gone ones, warm new.
  useEffect(() => {
    const wanted = new Set(preloadSongIds);
    if (activeIdRef.current) wanted.add(activeIdRef.current);

    for (const [id, sound] of [...poolRef.current.entries()]) {
      if (!wanted.has(id)) {
        poolRef.current.delete(id);
        sound.stopAsync().catch(() => {});
        sound.unloadAsync().catch(() => {});
      }
    }

    let cancelled = false;
    (async () => {
      for (const id of preloadSongIds) {
        if (cancelled) return;
        if (id === activeIdRef.current) continue;
        if (poolRef.current.has(id)) continue;
        await loadInto(id);
      }
    })();
    return () => { cancelled = true; };
  }, [preloadSongIds, loadInto]);

  // Tear down the whole pool on unmount.
  useEffect(() => () => {
    unmountedRef.current = true;
    for (const s of poolRef.current.values()) { s.stopAsync().catch(() => {}); s.unloadAsync().catch(() => {}); }
    poolRef.current.clear();
    loadingRef.current.clear();
    activeIdRef.current = null;
  }, []);
}
