import React, { useRef } from "react";
import { View, Animated, PanResponder } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export function SwipeToReply({ onReply, children }: { onReply: () => void; children: React.ReactNode }) {
  const x = useRef(new Animated.Value(0)).current;
  const fired = useRef(false);
  const THRESHOLD = 55;

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, g) => g.dx < -6 && Math.abs(g.dx) > Math.abs(g.dy) * 1.4,
    onShouldBlockNativeResponder: () => false,
    onPanResponderMove: (_, g) => {
      if (g.dx >= 0) return;
      x.setValue(Math.max(g.dx * 0.62, -THRESHOLD - 10));
      if (!fired.current && g.dx < -THRESHOLD) fired.current = true;
    },
    onPanResponderRelease: (_, g) => {
      if (g.dx < -THRESHOLD) onReply();
      fired.current = false;
      Animated.spring(x, { toValue: 0, useNativeDriver: true, tension: 280, friction: 18 }).start();
    },
  })).current;

  const iconOpacity = x.interpolate({ inputRange: [-THRESHOLD, -18, 0], outputRange: [1, 0.3, 0], extrapolate: 'clamp' });
  const iconScale   = x.interpolate({ inputRange: [-THRESHOLD, -18, 0], outputRange: [1, 0.7, 0.5], extrapolate: 'clamp' });

  return (
    <View {...pan.panHandlers}>
      <Animated.View style={{ transform: [{ translateX: x }] }}>
        {children}
      </Animated.View>
      <Animated.View style={{
        position: 'absolute', right: 6, top: 0, bottom: 0,
        justifyContent: 'center',
        opacity: iconOpacity,
        transform: [{ scale: iconScale }],
      }}>
        <Ionicons name="arrow-undo-outline" size={17} color="rgba(255,255,255,0.65)" />
      </Animated.View>
    </View>
  );
}

// ─── Animated typing bubble ───────────────────────────────────────────────────
