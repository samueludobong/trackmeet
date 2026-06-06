import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

type Accent = [string, string, string];

// Celebratory banner that springs in with a glow + icon. Two kinds:
//  • "first" → accent-tinted, sparkles (you're the first to discover this song)
//  • "saved" → green, checkmark (lyrics cached for next time)
export function CelebrationBanner({
  kind, text, accent,
}: {
  kind: "first" | "saved";
  text: string;
  accent: Accent;
}) {
  const a = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    a.setValue(0);
    Animated.spring(a, { toValue: 1, useNativeDriver: true, friction: 6, tension: 90 }).start();
    const loop = Animated.loop(
      Animated.timing(shimmer, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [kind]);

  const colors: Accent = kind === "saved" ? ["#1FD888", "#11B06A", "#0A8A52"] : accent;
  const glow = kind === "saved" ? "#13C77B" : accent[0];

  return (
    <Animated.View
      style={[
        styles.shadowWrap,
        {
          shadowColor: glow,
          opacity: a,
          transform: [
            { translateY: a.interpolate({ inputRange: [0, 1], outputRange: [-18, 0] }) },
            { scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }) },
          ],
        },
      ]}
    >
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
        <Animated.View
          style={[
            styles.iconWrap,
            { transform: [{ scale: shimmer.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.18, 1] }) }] },
          ]}
        >
          <Ionicons name={kind === "saved" ? "checkmark-circle" : "sparkles"} size={22} color="#fff" />
        </Animated.View>
        <Text style={styles.text}>{text}</Text>
      </LinearGradient>
    </Animated.View>
  );
}

// Anticipation state shown while a freshly-discovered song's lyrics load: a
// pulsing, rotating sparkle with a soft glow ring.
export function DiscoveryLoader({ accent }: { accent: Accent }) {
  const pulse = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const p = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      ]),
    );
    const s = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 3200, easing: Easing.linear, useNativeDriver: true }),
    );
    p.start();
    s.start();
    return () => { p.stop(); s.stop(); };
  }, []);

  return (
    <View style={styles.loaderWrap}>
      <Animated.View
        style={[
          styles.glowRing,
          {
            borderColor: accent[0],
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.7] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.25] }) }],
          },
        ]}
      />
      <Animated.View
        style={{
          transform: [
            { rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) },
            { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }) },
          ],
        }}
      >
        <Ionicons name="sparkles" size={46} color="#fff" />
      </Animated.View>
      <Text style={styles.loaderText}>Uncovering a first…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowWrap: {
    shadowOpacity: 0.6,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
    borderRadius: 18,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  iconWrap: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center", justifyContent: "center",
  },
  text: { flex: 1, fontSize: 14, fontWeight: "800", color: "#fff", lineHeight: 19 },

  loaderWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 22 },
  glowRing: {
    position: "absolute",
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 2,
  },
  loaderText: { fontSize: 15, fontWeight: "700", color: "rgba(255,255,255,0.92)", letterSpacing: 0.3 },
});
