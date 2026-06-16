import { View, Animated } from "react-native";
import { useRef, useEffect } from "react";

// Resting bar heights for the animated equalizer; each bar pulses to 2x.
const WAVE_H_DEFAULT = [5, 10, 15, 10, 18, 8, 14, 6];
const WAVE_H_COMPACT = [4, 7, 5, 8];

/**
 * Small looping equalizer animation used in now-playing UI. `compact` swaps to
 * a tighter 4-bar layout that fits inside a ~28-38px circular button (e.g. the
 * music post card's open button when that song is the one currently playing).
 */
export function AnimatedWaveform({ color, compact = false }: { color: string; compact?: boolean }) {
  const heights = compact ? WAVE_H_COMPACT : WAVE_H_DEFAULT;
  const barWidth = compact ? 2 : 3;
  const gap = compact ? 2 : 3;
  const waveAnims = useRef(heights.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const loops = waveAnims.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: 400 + i * 60, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: 400 + i * 60, useNativeDriver: true }),
        ])
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [waveAnims]);

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap }}>
      {waveAnims.map((v, i) => (
        // Bars use a fixed full height and animate `scaleY` (a transform), so the
        // animation can run on the native driver. `height` is a layout prop and
        // is NOT supported by the native animated module.
        <Animated.View
          key={i}
          style={{
            width: barWidth,
            height: heights[i] * 2,
            borderRadius: 2,
            backgroundColor: color,
            transform: [{ scaleY: v.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
          }}
        />
      ))}
    </View>
  );
}
