import React, { useRef } from "react";
import { View, Animated, PanResponder } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

// Swipe a bubble RIGHT to reply — same gesture for every message, yours or
// theirs. The bubble tracks the finger 1:1 and the reply icon trails on the
// left. Rightward-only, so it never fights the list's vertical scroll; the
// chat-close gesture is confined to a tight left-edge band so it doesn't
// collide with a reply swipe further into the screen.
//
// `onActiveChange` lets the parent freeze the list's vertical scroll for the
// duration of the swipe — fired the instant the swipe is recognised.
export function SwipeToReply({
  onReply, onActiveChange, children,
}: {
  onReply: () => void;
  onActiveChange?: (active: boolean) => void;
  fromMe?: boolean; // accepted for call-site compatibility; gesture is uniform
  children: React.ReactNode;
}) {
  const x = useRef(new Animated.Value(0)).current;
  const armed = useRef(false);
  // dx accumulated before recognition — subtracted so the bubble starts from
  // the grab point (no jump on the first frame).
  const grantDx = useRef(0);
  const THRESHOLD = 38;

  const settle = () => {
    armed.current = false;
    onActiveChange?.(false);
    Animated.spring(x, { toValue: 0, useNativeDriver: true, tension: 280, friction: 18 }).start();
  };

  // A rightward, horizontal-dominant drag = a reply swipe. Forgiving thresholds
  // so a quick flick engages immediately.
  const wantsReply = (g: { dx: number; dy: number }) =>
    g.dx > 3 && Math.abs(g.dx) > Math.abs(g.dy) * 1.1;

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
      // Rightward travel since the grab, tracked 1:1 with a soft cap past max.
      const travel = Math.max(g.dx - grantDx.current, 0);
      const MAX = THRESHOLD + 22;
      const eased = travel <= MAX ? travel : MAX + (travel - MAX) * 0.25;
      x.setValue(eased);
      const past = travel > THRESHOLD;
      if (past && !armed.current) {
        armed.current = true;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      } else if (!past) {
        armed.current = false;
      }
    },
    onPanResponderRelease: (_, g) => {
      if (g.dx - grantDx.current > THRESHOLD) onReply();
      settle();
    },
    onPanResponderTerminate: settle,
  })).current;

  const iconOpacity = x.interpolate({ inputRange: [0, 14, THRESHOLD], outputRange: [0, 0.3, 1], extrapolate: "clamp" });
  const iconScale   = x.interpolate({ inputRange: [0, 14, THRESHOLD], outputRange: [0.5, 0.7, 1], extrapolate: "clamp" });

  return (
    <View {...pan.panHandlers}>
      <Animated.View style={{ transform: [{ translateX: x }] }}>
        {children}
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute", left: 6, top: 0, bottom: 0,
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
