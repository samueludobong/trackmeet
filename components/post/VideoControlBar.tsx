import React, { useRef, useState } from "react";
import { PanResponder, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { type VideoControls } from "./useVideoControls";

const fmt = (sec: number) => {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/** Bottom playback bar — scrub line + play · -time · rate · mute · fullscreen · pip. */
export function VideoControlBar({
  controls, bottomInset = 0, onFullscreen, onPip,
}: {
  controls: VideoControls;
  bottomInset?: number;
  onFullscreen: () => void;
  onPip: () => void;
}) {
  const { playing, current, duration, muted, rate, togglePlay, cycleRate, toggleMute, beginScrub, endScrub, seekFrac } = controls;
  const [trackW, setTrackW] = useState(0);
  const trackWRef = useRef(0);

  const remaining = Math.max(0, duration - current);
  const progress = duration > 0 ? Math.min(1, current / duration) : 0;

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => { beginScrub(); if (trackWRef.current) seekFrac(e.nativeEvent.locationX / trackWRef.current); },
    onPanResponderMove: (e) => { if (trackWRef.current) seekFrac(Math.min(1, Math.max(0, e.nativeEvent.locationX / trackWRef.current))); },
    onPanResponderRelease: endScrub,
    onPanResponderTerminate: endScrub,
  })).current;

  return (
    <View style={[styles.bar, { paddingBottom: bottomInset + 8 }]}>
      <View
        style={styles.track}
        onLayout={(e) => { setTrackW(e.nativeEvent.layout.width); trackWRef.current = e.nativeEvent.layout.width; }}
        {...pan.panHandlers}
      >
        <View style={styles.trackBg} />
        <View style={[styles.trackFill, { width: progress * trackW }]} />
        <View style={[styles.knob, { left: Math.max(0, progress * trackW - 6) }]} />
      </View>

      <View style={styles.row}>
        <TouchableOpacity onPress={togglePlay} hitSlop={10}>
          <Ionicons name={playing ? "pause" : "play"} size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.time}>-{fmt(remaining)}</Text>

        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={cycleRate} hitSlop={10}>
          <Text style={styles.rate}>{rate}x</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />

        <TouchableOpacity onPress={toggleMute} hitSlop={10} style={styles.icon}>
          <Ionicons name={muted ? "volume-mute" : "volume-high"} size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={onFullscreen} hitSlop={10} style={styles.icon}>
          <Ionicons name="expand" size={19} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={onPip} hitSlop={10} style={styles.icon}>
          <Ionicons name="albums-outline" size={19} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { paddingHorizontal: 16, paddingTop: 6 },
  track: { height: 20, justifyContent: "center", marginBottom: 4 },
  trackBg: { height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.28)" },
  trackFill: { position: "absolute", height: 3, borderRadius: 2, backgroundColor: "#fff" },
  knob: { position: "absolute", width: 12, height: 12, borderRadius: 6, backgroundColor: "#fff" },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  time: { color: "#fff", fontSize: 14, fontWeight: "700", fontVariant: ["tabular-nums"], marginLeft: 8 },
  rate: { color: "#fff", fontSize: 15, fontWeight: "800" },
  icon: { paddingHorizontal: 2 },
});
