import React, { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Easing, StyleSheet, View } from "react-native";

const { width: SW, height: SH } = Dimensions.get("window");
const COLORS = ["#FF5C8A", "#FFD23F", "#1DB954", "#1A5CFF", "#AB47FF", "#FF8A3D", "#27E0C3", "#FF3D6E"];
const BURST = 64;
const RAIN = 46;

const pick = () => COLORS[(Math.random() * COLORS.length) | 0];

// Dependency-free celebratory confetti: a center cannon burst that arcs outward
// and falls under "gravity", plus a curtain of rain from the top. Streamers and
// spin add life. Increment `trigger` to fire.
export function Confetti({ trigger }: { trigger: number }) {
  const t = useRef(new Animated.Value(0)).current;
  const [active, setActive] = useState(false);

  const burst = useRef(
    Array.from({ length: BURST }).map(() => {
      const angle = Math.random() * Math.PI * 2;
      const dist = 110 + Math.random() * 260;
      const streamer = Math.random() > 0.72;
      const size = 7 + Math.random() * 9;
      return {
        tx: Math.cos(angle) * dist,
        ty: Math.sin(angle) * dist,
        grav: 260 + Math.random() * 520,
        size,
        w: streamer ? size * 0.42 : size,
        h: streamer ? size * 2.6 : size,
        radius: streamer ? 2 : Math.random() > 0.5 ? size / 2 : 2,
        rot: (Math.random() * 8 - 4) * 180,
        color: pick(),
      };
    }),
  ).current;

  const rain = useRef(
    Array.from({ length: RAIN }).map(() => {
      const streamer = Math.random() > 0.7;
      const size = 6 + Math.random() * 8;
      return {
        left: Math.random() * SW,
        startY: -50 - Math.random() * 240,
        drift: (Math.random() - 0.5) * 170,
        fall: SH * (0.75 + Math.random() * 0.5),
        w: streamer ? size * 0.4 : size,
        h: streamer ? size * 2.4 : size,
        radius: streamer ? 2 : Math.random() > 0.5 ? size / 2 : 2,
        rot: (Math.random() * 8 - 4) * 180,
        color: pick(),
      };
    }),
  ).current;

  useEffect(() => {
    if (!trigger) return;
    setActive(true);
    t.setValue(0);
    Animated.timing(t, {
      toValue: 1,
      duration: 2700,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start(({ finished }) => { if (finished) setActive(false); });
  }, [trigger]);

  if (!active) return null;

  const cx = SW / 2;
  const cy = SH * 0.4;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* Center cannon burst — arcs out, then gravity pulls it down. */}
      {burst.map((b, i) => (
        <Animated.View
          key={`b${i}`}
          style={{
            position: "absolute",
            left: cx,
            top: cy,
            width: b.w,
            height: b.h,
            backgroundColor: b.color,
            borderRadius: b.radius,
            opacity: t.interpolate({ inputRange: [0, 0.72, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, b.tx] }) },
              { translateY: t.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0, b.ty * 0.65 - 30, b.ty + b.grav] }) },
              { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${b.rot}deg`] }) },
              { scale: t.interpolate({ inputRange: [0, 0.08, 1], outputRange: [0.2, 1, 0.9] }) },
            ],
          }}
        />
      ))}

      {/* Top rain — fills the rest of the screen with falling color. */}
      {rain.map((p, i) => (
        <Animated.View
          key={`r${i}`}
          style={{
            position: "absolute",
            left: p.left,
            top: 0,
            width: p.w,
            height: p.h,
            backgroundColor: p.color,
            borderRadius: p.radius,
            opacity: t.interpolate({ inputRange: [0, 0.82, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [p.startY, p.fall] }) },
              { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, p.drift] }) },
              { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${p.rot}deg`] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}
