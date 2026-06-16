import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { styles } from "../../assets/styles/post/VoicePlayer";

// Default resting bar heights (px), mirrors AnimatedWaveform's vibe.
const DEFAULT_BARS = [4, 8, 12, 18, 14, 22, 10, 16, 8, 20, 12, 18, 6, 14, 10, 16, 8, 20, 12, 6];

const fmtMs = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/** Voice-note player: play/pause + waveform that animates while playing. */
export function VoicePlayer({
  uri, durationMs, waveform, color = "#AB00FF",
}: {
  uri: string;
  durationMs: number | null;
  waveform?: number[] | null;
  color?: string;
}) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [posMs, setPosMs] = useState(0);
  const totalMs = durationMs ?? 0;

  // Per-bar animated values for the "pulsing" effect while playing.
  const bars = (waveform && waveform.length >= 10
    ? waveform.map((v) => 4 + Math.round(Math.min(1, Math.max(0.05, v)) * 22))
    : DEFAULT_BARS);
  const anims = useRef(bars.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (!playing) { anims.forEach((v) => v.stopAnimation()); return; }
    const loops = anims.map((v, i) =>
      Animated.loop(Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 320 + i * 40, useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 320 + i * 40, useNativeDriver: true }),
      ])),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [playing, anims]);

  useEffect(() => () => { soundRef.current?.unloadAsync().catch(() => {}); }, []);

  const toggle = async () => {
    try {
      if (!soundRef.current) {
        setLoading(true);
        const { sound, status } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
        soundRef.current = sound;
        if ("durationMillis" in status && status.durationMillis) {
          // (no setter for duration — we trust durationMs from DB)
        }
        sound.setOnPlaybackStatusUpdate((s: any) => {
          if (!s.isLoaded) return;
          setPosMs(s.positionMillis ?? 0);
          setPlaying(s.isPlaying ?? false);
          if (s.didJustFinish) { setPlaying(false); setPosMs(0); sound.setPositionAsync(0); }
        });
        setLoading(false);
        setPlaying(true);
        return;
      }
      const status = await soundRef.current.getStatusAsync();
      if (!status.isLoaded) return;
      if (status.isPlaying) { await soundRef.current.pauseAsync(); setPlaying(false); }
      else { await soundRef.current.playAsync(); setPlaying(true); }
    } catch { setLoading(false); }
  };

  const progress = totalMs > 0 ? Math.min(1, posMs / totalMs) : 0;
  const filledCount = Math.round(progress * bars.length);

  return (
    <View style={styles.wrap}>
      <TouchableOpacity style={[styles.playBtn, { backgroundColor: color }]} activeOpacity={0.85} onPress={toggle}>
        {loading ? <ActivityIndicator color="#fff" size="small" />
          : <Ionicons name={playing ? "pause" : "play"} size={18} color="#fff" />}
      </TouchableOpacity>

      <View style={styles.barsWrap}>
        {anims.map((v, i) => {
          const filled = i < filledCount;
          return (
            <Animated.View
              key={i}
              style={{
                width: 3,
                height: bars[i],
                borderRadius: 2,
                backgroundColor: filled ? color : "rgba(255,255,255,0.25)",
                transform: [{ scaleY: playing ? v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) : 1 }],
              }}
            />
          );
        })}
      </View>

      <Text style={styles.time}>{fmtMs(posMs)} / {fmtMs(totalMs)}</Text>
    </View>
  );
}
