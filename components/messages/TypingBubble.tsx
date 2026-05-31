import React, { useRef, useEffect } from "react";
import { View, Text, Animated } from "react-native";
import { chatStyles } from "../../lib/feed/localStyles";

export function TypingBubble({ name }: { name: string }) {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];

  useEffect(() => {
    const anims = dots.map((d, i) =>
      Animated.loop(Animated.sequence([
        Animated.delay(i * 140),
        Animated.timing(d, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.timing(d, { toValue: 0, duration: 280, useNativeDriver: true }),
        Animated.delay(560 - i * 140),
      ]))
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, []);

  return (
    <View style={chatStyles.typingRow}>
      <View style={chatStyles.typingBubble}>
        {dots.map((d, i) => (
          <Animated.View key={i} style={[chatStyles.typingDot, {
            opacity: d.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
            transform: [{ translateY: d.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }],
          }]} />
        ))}
      </View>
      <Text style={chatStyles.typingName}>{name}</Text>
    </View>
  );
}

// ─── Chat detail view ─────────────────────────────────────────────────────────
