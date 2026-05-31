import { View, Animated } from "react-native";
import { useRef, useEffect } from "react";

// Resting bar heights for the animated equalizer; each bar pulses to 2x.
const WAVE_H = [5, 10, 15, 10, 18, 8, 14, 6];

/** A small looping equalizer animation used in now-playing UI. */
export function AnimatedWaveform({ color }: { color: string }) {
  const waveAnims = useRef(WAVE_H.map(() => new Animated.Value(0))).current;

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
    <View style={{ flexDirection: "row", alignItems: "center", gap: 3, height: 20 }}>
      {waveAnims.map((v, i) => (
        // Bars use a fixed full height and animate `scaleY` (a transform), so the
        // animation can run on the native driver. `height` is a layout prop and
        // is NOT supported by the native animated module.
        <Animated.View
          key={i}
          style={{
            width: 3,
            height: WAVE_H[i] * 2,
            borderRadius: 2,
            backgroundColor: color,
            transform: [{ scaleY: v.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
          }}
        />
      ))}
    </View>
  );
}
