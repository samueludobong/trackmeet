import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "../../assets/styles/communities/CommunityToast";

/** Auto-dismissing push-notification toast (3s) — slides down, fades out, dismissable.
 *  Pass `message` to override the default notifications copy (e.g. a welcome message). */
export function CommunityToast({
  visible, slug, onDismiss, message, icon = "notifications",
}: {
  visible: boolean;
  slug: string;
  onDismiss: () => void;
  message?: string;
  icon?: keyof typeof Ionicons.glyphMap;
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
      <Ionicons name={icon} size={14} color="#AB00FF" />
      {message ? (
        <Text style={styles.text} numberOfLines={3}>{message}</Text>
      ) : (
        <Text style={styles.text}>
          Push notifications for <Text style={styles.slug}>/{slug}</Text> are on.
        </Text>
      )}
      <TouchableOpacity onPress={onDismiss} hitSlop={10} style={styles.close}>
        <Ionicons name="close" size={14} color="rgba(255,255,255,0.6)" />
      </TouchableOpacity>
    </Animated.View>
  );
}
