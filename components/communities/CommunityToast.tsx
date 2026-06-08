import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

/** Auto-dismissing push-notification toast (3s) — slides down, fades out, dismissable. */
export function CommunityToast({
  visible, slug, onDismiss,
}: {
  visible: boolean;
  slug: string;
  onDismiss: () => void;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(-12)).current;

  useEffect(() => {
    if (!visible) return;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(ty, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start();
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(ty, { toValue: -12, duration: 220, useNativeDriver: true }),
      ]).start(() => onDismiss());
    }, 3000);
    return () => clearTimeout(t);
  }, [visible, opacity, ty, onDismiss]);

  if (!visible) return null;
  return (
    <Animated.View style={[styles.toast, { opacity, transform: [{ translateY: ty }] }]}>
      <Ionicons name="notifications" size={14} color="#AB00FF" />
      <Text style={styles.text}>
        Push notifications for <Text style={styles.slug}>/{slug}</Text> are on.
      </Text>
      <TouchableOpacity onPress={onDismiss} hitSlop={10} style={styles.close}>
        <Ionicons name="close" size={14} color="rgba(255,255,255,0.6)" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: "rgba(171,0,255,0.1)",
    borderWidth: 1, borderColor: "rgba(171,0,255,0.28)",
    borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9,
  },
  text: { flex: 1, fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.78)" },
  slug: { color: "#AB00FF", fontWeight: "800" },
  close: { padding: 2 },
});
