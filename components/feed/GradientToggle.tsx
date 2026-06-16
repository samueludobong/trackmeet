import React, { useRef, useEffect } from "react";
import { View, StyleSheet, TouchableOpacity, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { profileStyles } from "../../assets/styles/feed/localStyles";
import { THUMB_TRAVEL } from "../../constants/feedLayout";

export function GradientToggle({ value, onValueChange, colors }: { value: boolean; onValueChange: (v: boolean) => void; colors?: [string, string, string] }) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  // Sync animation when value changes externally (e.g. initial DB load)
  useEffect(() => {
    Animated.spring(anim, {
      toValue: value ? 1 : 0,
      useNativeDriver: true,
      damping: 18,
      stiffness: 260,
    }).start();
  }, [value]);

  const handlePress = () => {
    onValueChange(!value);
  };

  const thumbX = anim.interpolate({ inputRange: [0, 1], outputRange: [0, THUMB_TRAVEL] });

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.85}>
      <View style={profileStyles.toggleTrack}>
        {value ? (
          <LinearGradient
            colors={colors ?? ["#FF6C1A", "#CC4200", "#3D1A0C"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,255,255,0.13)" }]} />
        )}
        <Animated.View style={[profileStyles.toggleThumb, { transform: [{ translateX: thumbX }] }]} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Broadcast row ────────────────────────────────────────────────────────────
