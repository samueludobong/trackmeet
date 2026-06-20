import React, { useRef } from "react";
import { View, Animated, PanResponder } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

// Swipe to reply — the bubble/row tracks the finger 1:1 and a reply icon trails
// behind it. Single-direction (right for chat bubbles, left for comments) so it
// never fights the list's vertical scroll. Forgiving recognition so a quick
// flick engages immediately, a soft cap past the threshold, and a light haptic
// the moment the gesture arms.
//
// `onActiveChange` lets the parent freeze the list's vertical scroll for the
// duration of the swipe — fired the instant the swipe is recognised.
export function SwipeToReply({
  onReply, onActiveChange, direction = "right", children,
}: {
  onReply: () => void;
  onActiveChange?: (active: boolean) => void;
  /** Swipe direction that triggers a reply. Defaults to "right" (chat bubbles). */
  direction?: "left" | "right";
  fromMe?: boolean; // accepted for call-site compatibility; gesture is uniform
  children: React.ReactNode;
}) {
  const x = useRef(new Animated.Value(0)).current;
  const armed = useRef(false);
  // dx accumulated before recognition — subtracted so the row starts from the
  // grab point (no jump on the first frame).
  const grantDx = useRef(0);
  const THRESHOLD = 38;
  // +1 for rightward swipes, -1 for leftward — lets one body serve both.
  const sign = direction === "left" ? -1 : 1;

  const settle = () => {
    armed.current = false;
    onActiveChange?.(false);
    Animated.spring(x, { toValue: 0, useNativeDriver: true, tension: 280, friction: 18 }).start();
  };

  // A horizontal-dominant drag in the reply direction. Forgiving thresholds so a
  // quick flick engages immediately.
  const wantsReply = (g: { dx: number; dy: number }) =>
    sign * g.dx > 3 && Math.abs(g.dx) > Math.abs(g.dy) * 1.1;

  // Detect + claim. The instant we recognise the swipe (first horizontal pixel)
  // freeze the list so nothing scrolls vertically for the rest of the gesture.
  const claim = (g: { dx: number; dy: number }) => {
    if (!wantsReply(g)) return false;
    onActiveChange?.(true);
    return true;
  };

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponderCapture: (_, g) => claim(g),
    onMoveShouldSetPanResponder: (_, g) => claim(g),
    onShouldBlockNativeResponder: () => true,
    onPanResponderGrant: (_, g) => { grantDx.current = g.dx; onActiveChange?.(true); },
    onPanResponderMove: (_, g) => {
      // Directional travel since the grab, tracked 1:1 with a soft cap past max.
      const travel = Math.max(sign * (g.dx - grantDx.current), 0);
      const MAX = THRESHOLD + 22;
      const eased = travel <= MAX ? travel : MAX + (travel - MAX) * 0.25;
      x.setValue(sign * eased);
      const past = travel > THRESHOLD;
      if (past && !armed.current) {
        armed.current = true;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      } else if (!past) {
        armed.current = false;
      }
    },
    onPanResponderRelease: (_, g) => {
      if (sign * (g.dx - grantDx.current) > THRESHOLD) onReply();
      settle();
    },
    onPanResponderTerminate: settle,
  })).current;

  // Icon fades/scales in as the row travels; input ranges flip with direction.
  const opIn  = direction === "left" ? [-THRESHOLD, -14, 0] : [0, 14, THRESHOLD];
  const iconOpacity = x.interpolate({ inputRange: opIn, outputRange: direction === "left" ? [1, 0.3, 0] : [0, 0.3, 1], extrapolate: "clamp" });
  const iconScale   = x.interpolate({ inputRange: opIn, outputRange: direction === "left" ? [1, 0.7, 0.5] : [0.5, 0.7, 1], extrapolate: "clamp" });

  return (
    <View {...pan.panHandlers}>
      <Animated.View style={{ transform: [{ translateX: x }] }}>
        {children}
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute", top: 0, bottom: 0,
          ...(direction === "left" ? { right: 6 } : { left: 6 }),
          justifyContent: "center",
          opacity: iconOpacity,
          transform: [{ scale: iconScale }],
        }}
      >
        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="arrow-undo-outline" size={15} color="rgba(255,255,255,0.75)" />
        </View>
      </Animated.View>
    </View>
  );
}

// ─── Animated typing bubble ───────────────────────────────────────────────────
