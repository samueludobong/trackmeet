import React, { useEffect, useRef } from "react";
import { Animated, View, Text, StyleSheet, Easing } from "react-native";
import { CachedImage } from "../ui/CachedImage";
import { Ionicons } from "@expo/vector-icons";
import { EqualizerBars } from "./EqualizerBars";

type Info = { id: string; name: string; artist: string | null; albumArt: string | null } | null;

/**
 * Brief "switching song…" transition shown to a listener the moment the host
 * picks a new track — covering the ~2-3s gap before the listener's own Spotify
 * catches up to the new song. Fades itself in/out and pulses, so the screen
 * feels alive during the change instead of sitting on the stale card.
 */
export function SongChangingOverlay({ visible, info }: { visible: boolean; info: Info }) {
  const fade = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = React.useState(visible);

  useEffect(() => {
    if (visible) setMounted(true);
    Animated.timing(fade, {
      toValue: visible ? 1 : 0,
      duration: 280,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start(({ finished }) => { if (finished && !visible) setMounted(false); });
  }, [visible]);

  useEffect(() => {
    if (!mounted) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 850, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 850, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [mounted]);

  if (!mounted) return null;

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const glow = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.7] });

  return (
    <Animated.View style={[styles.wrap, { opacity: fade }]} pointerEvents="none">
      <View style={styles.scrim} />
      <View style={styles.art}>
        <Animated.View style={[styles.artGlow, { opacity: glow, transform: [{ scale }] }]} />
        {info?.albumArt ? (
          <Animated.View style={{ transform: [{ scale }] }}>
            <CachedImage source={{ uri: info.albumArt }} style={styles.artImg} />
          </Animated.View>
        ) : (
          <Animated.View style={[styles.artImg, styles.artFallback, { transform: [{ scale }] }]}>
            <Ionicons name="musical-notes" size={34} color="#fff" />
          </Animated.View>
        )}
      </View>

      <EqualizerBars color="rgba(255,255,255,0.95)" count={5} height={22} width={3} gap={5} />

      <Text style={styles.title}>Switching song…</Text>
      {info?.name ? (
        <Text style={styles.sub} numberOfLines={1}>
          {info.name}{info.artist ? ` — ${info.artist}` : ""}
        </Text>
      ) : (
        <Text style={styles.sub}>Hang tight, lining it up</Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Covers the now-playing area (between the top bar and the chat bar) so the
  // transition reads as a takeover, not a badge floating over the old card.
  wrap: {
    position: "absolute",
    top: 88, bottom: 116, left: 0, right: 0,
    alignItems: "center", justifyContent: "center", gap: 16,
  },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(8,0,6,0.6)" },
  art: { alignItems: "center", justifyContent: "center", marginBottom: 4 },
  artImg: { width: 132, height: 132, borderRadius: 18, backgroundColor: "#2a1a10" },
  artFallback: { alignItems: "center", justifyContent: "center" },
  artGlow: {
    position: "absolute", width: 150, height: 150, borderRadius: 24,
    backgroundColor: "#AB00FF",
  },
  title: { fontSize: 17, fontWeight: "800", color: "#fff", textAlign: "center", letterSpacing: 0.2 },
  sub: {
    fontSize: 13.5, fontWeight: "600", color: "rgba(255,255,255,0.8)",
    textAlign: "center", paddingHorizontal: 28,
  },
});
