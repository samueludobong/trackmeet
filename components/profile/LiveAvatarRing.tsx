import React, { useEffect, useRef } from "react";
import { Animated, View, Text, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { profileStyles } from "../../assets/styles/feed/localStyles";

/**
 * Wraps the profile avatar in a pulsing gradient "LIVE" ring while the user is
 * in a live meet. Tapping it jumps straight back into the meet room. The avatar
 * node is passed as children so this works for both the image and initials
 * variants without duplicating that logic.
 */
export function LiveAvatarRing({ onPress, children }: { onPress: () => void; children: React.ReactNode }) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1100, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1100, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // Halo that breathes outward behind the ring.
  const glowScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={{ alignSelf: "flex-start" }}>
      <Animated.View
        style={[profileStyles.liveRingGlow, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]}
        pointerEvents="none"
      />
      <LinearGradient
        colors={["#FF2D55", "#AB00FF", "#FF6C1A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={profileStyles.liveRing}
      >
        {children}
      </LinearGradient>
      <View style={profileStyles.liveBadge} pointerEvents="none">
        <View style={profileStyles.liveBadgePill}>
          <View style={profileStyles.liveDot} />
          <Text style={profileStyles.liveBadgeText}>LIVE</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
