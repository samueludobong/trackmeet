import React, { useEffect, useRef, useState } from "react";
import {
  Alert, Animated, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { AnimatedWaveform } from "./AnimatedWaveform";

const MAX_MS = 30_000; // 30-second cap per spec.

const fmt = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/** Modal sheet: tap to record (max 30s), shows live waveform, returns uri + duration. */
export function VoiceRecorder({
  visible, onClose, onCapture,
}: {
  visible: boolean;
  onClose: () => void;
  onCapture: (rec: { uri: string; durationMs: number }) => void;
}) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [reviewing, setReviewing] = useState<{ uri: string; durationMs: number } | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAt = useRef<number>(0);

  // Subtle pulsing ring around mic.
  const ringPulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!recording) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(ringPulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(ringPulse, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [recording, ringPulse]);

  useEffect(() => () => {
    if (tickRef.current) clearInterval(tickRef.current);
    recording?.stopAndUnloadAsync().catch(() => {});
  }, [recording]);

  const start = async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) { Alert.alert("Microphone access needed", "Allow microphone access to record."); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      setRecording(rec);
      setElapsedMs(0);
      startedAt.current = Date.now();
      tickRef.current = setInterval(() => {
        const el = Date.now() - startedAt.current;
        setElapsedMs(el);
        if (el >= MAX_MS) stop();
      }, 100);
    } catch (e: any) {
      Alert.alert("Couldn't start recording", e?.message ?? "Try again.");
    }
  };

  const stop = async () => {
    try {
      if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
      const rec = recording;
      if (!rec) return;
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      const dur = Math.min(MAX_MS, Date.now() - startedAt.current);
      setRecording(null);
      if (uri) setReviewing({ uri, durationMs: dur });
    } catch (e) { console.log("[voice] stop error", e); }
  };

  const cancel = () => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    recording?.stopAndUnloadAsync().catch(() => {});
    setRecording(null);
    setReviewing(null);
    setElapsedMs(0);
    onClose();
  };

  const send = () => {
    if (!reviewing) return;
    onCapture(reviewing);
    setReviewing(null);
    onClose();
  };

  const ringScale = ringPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });
  const ringOpacity = ringPulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });
  const progress = Math.min(1, elapsedMs / MAX_MS);

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={cancel} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={cancel}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{reviewing ? "Review voice note" : recording ? "Recording…" : "Voice note"}</Text>
          <Text style={styles.subtitle}>Up to 30 seconds</Text>

          <View style={styles.center}>
            <View style={styles.micWrap}>
              {recording && (
                <Animated.View style={[styles.ring, { transform: [{ scale: ringScale }], opacity: ringOpacity }]} />
              )}
              <TouchableOpacity
                style={[styles.mic, recording && styles.micRecording, reviewing && styles.micDone]}
                activeOpacity={0.85}
                onPress={recording ? stop : reviewing ? () => setReviewing(null) : start}
              >
                <Ionicons
                  name={recording ? "stop" : reviewing ? "refresh" : "mic"}
                  size={28} color="#fff"
                />
              </TouchableOpacity>
            </View>
            {(recording || reviewing) && <AnimatedWaveform color="#AB00FF" />}
            <Text style={styles.timer}>{fmt(reviewing ? reviewing.durationMs : elapsedMs)} / 0:30</Text>
            {recording && (
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
              </View>
            )}
          </View>

          <View style={styles.btnRow}>
            <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={cancel} activeOpacity={0.85}>
              <Text style={styles.actionText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.sendBtn, !reviewing && { opacity: 0.4 }]}
              disabled={!reviewing}
              onPress={send} activeOpacity={0.85}
            >
              <Text style={[styles.actionText, { color: "#fff" }]}>Send</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#0D0D0D", paddingTop: 18, paddingHorizontal: 18, paddingBottom: 28,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderTopWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  title: { fontSize: 16, fontWeight: "800", color: "#fff", textAlign: "center" },
  subtitle: { fontSize: 12, color: "rgba(255,255,255,0.5)", textAlign: "center", marginTop: 4, fontWeight: "600" },
  center: { alignItems: "center", gap: 14, marginTop: 22, marginBottom: 22 },
  micWrap: { width: 100, height: 100, alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(171,0,255,0.5)" },
  mic: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#AB00FF", alignItems: "center", justifyContent: "center" },
  micRecording: { backgroundColor: "#FF4757" },
  micDone: { backgroundColor: "#1DB954" },
  timer: { color: "#fff", fontVariant: ["tabular-nums"], fontSize: 14, fontWeight: "800" },
  progressTrack: { width: 200, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.1)", overflow: "hidden" },
  progressFill: { height: 4, backgroundColor: "#AB00FF" },
  btnRow: { flexDirection: "row", gap: 10 },
  actionBtn: { flex: 1, paddingVertical: 14, borderRadius: 16, alignItems: "center" },
  cancelBtn: { backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  sendBtn: { backgroundColor: "#AB00FF" },
  actionText: { color: "#fff", fontWeight: "800", fontSize: 14 },
});
