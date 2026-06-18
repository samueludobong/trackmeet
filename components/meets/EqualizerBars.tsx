import React, { useEffect, useRef } from "react";
import { Animated, View } from "react-native";

/**
 * A small looping "equalizer" — a row of bars that pulse at staggered rates to
 * give an empty/waiting meet state a sense of live audio. Pure native-driver
 * scaleY, so it's cheap and keeps running off the JS thread.
 */
export function EqualizerBars({
  color = "#fff",
  count = 4,
  height = 26,
  width = 4,
  gap = 6,
}: {
  color?: string;
  count?: number;
  height?: number;
  width?: number;
  gap?: number;
}) {
  const vals = useRef(Array.from({ length: count }, () => new Animated.Value(0.35))).current;

  useEffect(() => {
    const loops = vals.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: 340 + i * 80, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0.3, duration: 300 + i * 70, useNativeDriver: true }),
        ]),
      ),
    );
    // Stagger the starts so the bars never move in lockstep.
    const timers = loops.map((l, i) => setTimeout(() => l.start(), i * 110));
    return () => {
      timers.forEach(clearTimeout);
      loops.forEach((l) => l.stop());
    };
  }, []);

  return (
    <View style={{ flexDirection: "row", alignItems: "center", height, gap }}>
      {vals.map((v, i) => (
        <Animated.View
          key={i}
          style={{ width, height, borderRadius: width / 2, backgroundColor: color, transform: [{ scaleY: v }] }}
        />
      ))}
    </View>
  );
}
