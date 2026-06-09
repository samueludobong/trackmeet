import { useEffect, useRef, useState } from "react";
import { type VideoPlayer } from "expo-video";

const RATES = [1, 1.5, 2, 0.5];

/** Subscribes to an expo-video player and exposes playback state + actions. */
export function useVideoControls(player: VideoPlayer) {
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const scrubbingRef = useRef(false);
  const durRef = useRef(0);

  useEffect(() => {
    const subs = [
      player.addListener("playingChange", (e: any) => setPlaying(e.isPlaying)),
      player.addListener("timeUpdate", (e: any) => {
        if (!scrubbingRef.current) setCurrent(e.currentTime ?? 0);
        if (player.duration) { setDuration(player.duration); durRef.current = player.duration; }
      }),
      player.addListener("statusChange", () => {
        if (player.duration) { setDuration(player.duration); durRef.current = player.duration; }
      }),
    ];
    return () => subs.forEach((s) => s.remove());
  }, [player]);

  const togglePlay = () => { player.playing ? player.pause() : player.play(); };
  const cycleRate = () => {
    const next = RATES[(RATES.indexOf(rate) + 1) % RATES.length];
    player.playbackRate = next; setRate(next);
  };
  const toggleMute = () => { const m = !muted; player.muted = m; setMuted(m); };
  const beginScrub = () => { scrubbingRef.current = true; };
  const endScrub = () => { scrubbingRef.current = false; };
  const seekFrac = (f: number) => {
    const d = durRef.current; if (!d) return;
    const t = Math.min(d, Math.max(0, f * d));
    player.currentTime = t; setCurrent(t);
  };

  return { playing, current, duration, muted, rate, togglePlay, cycleRate, toggleMute, beginScrub, endScrub, seekFrac };
}

export type VideoControls = ReturnType<typeof useVideoControls>;
