import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { styles } from "../../assets/styles/communities/LivePulseDot";

/** Pulsing AB00FF dot — used on discovery cards with active meets. */
export function LivePulseDot({ size = 8 }: { size?: number }) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] });
  return (
    <View style={[styles.wrap, { width: size * 2, height: size * 2 }]}>
      <Animated.View
        style={[
          styles.ring,
          {
            width: size, height: size, borderRadius: size / 2,
            transform: [{ scale: ringScale }], opacity: ringOpacity,
          },
        ]}
      />
      <View style={[styles.dot, { width: size, height: size, borderRadius: size / 2 }]} />
    </View>
  );
}
