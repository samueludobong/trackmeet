import { useCallback, useEffect, useRef, useState } from "react";
import { Audio } from "expo-av";

/**
 * Pooled audio player for the feed.
 *
 * - One Sound per postId, loaded lazily and kept in a `pool` for instant resume.
 * - `setActive({ postId, previewUrl })` plays exactly one; the rest stay paused.
 * - `preloadIds` warms upcoming sounds in the background (no play). Anything
 *   not in `preloadIds` and not active is evicted from the pool.
 * - All loads happen with `shouldPlay: false`, then we play only if the sound
 *   is still the target — eliminates the "every fast-scrolled card starts
 *   audible for a frame" spam from the previous version.
 */
type Target = { postId: string; previewUrl: string | null } | null;
type PreloadEntry = { postId: string; previewUrl: string };

export function useFeedPreviewPlayer({
  muted,
  paused,
  preloadIds,
}: {
  muted: boolean;
  /** When true the active sound is paused in place (no rewind). Flip back to
   *  false to resume from the same position — used to suspend audio while the
   *  feed screen is not focused. */
  paused: boolean;
  preloadIds: PreloadEntry[];
}) {
  const poolRef = useRef<Map<string, Audio.Sound>>(new Map());
  // Source of truth for "what's supposed to be playing right now". Reads/writes
  // are synchronous so async load handlers can tell if they've been superseded.
  const activeIdRef = useRef<string | null>(null);
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  // Configure audio session once.
  useEffect(() => {
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true, shouldDuckAndroid: true }).catch(() => {});
  }, []);

  // Apply mute to every pool sound when the toggle flips.
  useEffect(() => {
    for (const s of poolRef.current.values()) {
      s.setIsMutedAsync(muted).catch(() => {});
    }
  }, [muted]);

  // Pause / resume the active sound when the feed screen blurs / refocuses.
  // No setPositionAsync — we want it to pick back up where it was.
  useEffect(() => {
    const id = activeIdRef.current;
    if (!id) return;
    const s = poolRef.current.get(id);
    if (!s) return;
    if (paused) s.pauseAsync().catch(() => {});
    else        s.playAsync().catch(() => {});
  }, [paused]);

  const loadInto = useCallback(async (postId: string, url: string): Promise<Audio.Sound | null> => {
    if (poolRef.current.has(postId)) return poolRef.current.get(postId)!;
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: false, isMuted: mutedRef.current, isLooping: true, volume: 1 },
      );
      // Lost the race — a later setActive/preload evicted us. Discard.
      if (!poolRef.current.has(postId) && activeIdRef.current !== postId && !preloadIds.find((p) => p.postId === postId)) {
        await sound.unloadAsync().catch(() => {});
        return null;
      }
      poolRef.current.set(postId, sound);
      return sound;
    } catch (e) {
      console.log("[FeedPreview] load failed:", e);
      return null;
    }
  }, [preloadIds]);

  // Set the playing card — also rewinds the previous to 0 so a re-visit starts fresh.
  const setActive = useCallback(async (next: Target) => {
    const nextId = next?.postId ?? null;
    if (activeIdRef.current === nextId) return;

    const prevId = activeIdRef.current;
    activeIdRef.current = nextId;
    setActivePostId(nextId);

    // Pause + rewind whatever was playing.
    if (prevId) {
      const s = poolRef.current.get(prevId);
      if (s) {
        await s.pauseAsync().catch(() => {});
        await s.setPositionAsync(0).catch(() => {});
      }
    }

    if (!next?.previewUrl) return;

    const sound = await loadInto(next.postId, next.previewUrl);
    // Bail if the active changed while we were loading.
    if (!sound || activeIdRef.current !== next.postId) return;
    await sound.setIsMutedAsync(mutedRef.current).catch(() => {});
    // Only auto-play if the feed is currently focused — otherwise we'll resume
    // it when the paused effect flips back to false.
    if (!pausedRef.current) await sound.playAsync().catch(() => {});
  }, [loadInto]);

  // Reconcile pool against preloadIds + active. Loads new neighbors, evicts gone ones.
  useEffect(() => {
    const wanted = new Set(preloadIds.map((p) => p.postId));
    if (activeIdRef.current) wanted.add(activeIdRef.current);

    // Evict anything we don't want anymore.
    for (const [id, sound] of [...poolRef.current.entries()]) {
      if (!wanted.has(id)) {
        poolRef.current.delete(id);
        sound.stopAsync().catch(() => {});
        sound.unloadAsync().catch(() => {});
      }
    }

    // Preload new neighbors. Active is loaded by setActive — skip it here.
    let cancelled = false;
    (async () => {
      for (const { postId, previewUrl } of preloadIds) {
        if (cancelled) return;
        if (postId === activeIdRef.current) continue;
        if (poolRef.current.has(postId)) continue;
        await loadInto(postId, previewUrl);
      }
    })();
    return () => { cancelled = true; };
  }, [preloadIds, loadInto]);

  // Tear down the whole pool when the feed unmounts.
  useEffect(() => {
    return () => {
      for (const s of poolRef.current.values()) {
        s.stopAsync().catch(() => {});
        s.unloadAsync().catch(() => {});
      }
      poolRef.current.clear();
      activeIdRef.current = null;
    };
  }, []);

  return { activePostId, setActive };
}
