import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

// Brand-palette gradient frames the backdrop slowly cross-fades through, giving
// a "breathing" live-session loop that reads as visually distinct from the
// album-art background shown while a track is actually playing. Each frame uses
// a different diagonal so the motion never feels static.
const FRAMES: { colors: [string, string, string]; start: { x: number; y: number }; end: { x: number; y: number } }[] = [
  { colors: ["#3A0CA3", "#7209B7", "#F72585"], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
  { colors: ["#AB00FF", "#6A00F4", "#FF6C1A"], start: { x: 1, y: 0 }, end: { x: 0, y: 1 } },
  { colors: ["#240046", "#5A189A", "#FF4D6D"], start: { x: 0, y: 1 }, end: { x: 1, y: 0 } },
  { colors: ["#10002B", "#7B2CBF", "#E0144C"], start: { x: 1, y: 1 }, end: { x: 0, y: 0 } },
];

const FRAME_MS = 4200; // dwell + crossfade time per frame

/**
 * Looping animated gradient for the "nothing playing yet" state of a live meet
 * or jam. One continuous native-driver animation drives a triangular cross-fade
 * across the frames, plus a slow vertical drift for a subtle sense of life.
 * Mounted only while the room is visible, so it costs nothing when closed.
 */
export function LiveSessionBackdrop({ style }: { style?: any }) {
  const N = FRAMES.length;
  // Single looping driver, 0 → N. Each frame's opacity peaks (triangularly) as
  // the driver passes its index; frame 0 also peaks at N so the loop wraps with
  // no visible seam when the value resets.
  const progress = useRef(new Animated.Value(0)).current;
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fade = Animated.loop(
      Animated.timing(progress, {
        toValue: N,
        duration: N * FRAME_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    const move = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 9000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 9000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    fade.start();
    move.start();
    return () => { fade.stop(); move.stop(); };
  }, [N]);

  const translateY = drift.interpolate({ inputRange: [0, 1], outputRange: [-18, 18] });

  return (
    <Animated.View style={[style, { transform: [{ translateY }, { scale: 1.08 }] }]} pointerEvents="none">
      {FRAMES.map((f, i) => {
        const opacity =
          i === 0
            ? progress.interpolate({ inputRange: [0, 1, N - 1, N], outputRange: [1, 0, 0, 1] })
            : progress.interpolate({
                inputRange: [i - 1, i, i + 1],
                outputRange: [0, 1, 0],
                extrapolate: "clamp",
              });
        return (
          <Animated.View key={i} style={[StyleSheet.absoluteFill, { opacity }]}>
            <LinearGradient colors={f.colors} start={f.start} end={f.end} style={StyleSheet.absoluteFill} />
          </Animated.View>
        );
      })}
    </Animated.View>
  );
}
