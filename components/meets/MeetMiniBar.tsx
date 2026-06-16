import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated } from "react-native";
import { CachedImage } from "../ui/CachedImage";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { mbStyles } from "../../lib/feed/localStyles";

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function MeetMiniBar({
  albumArt, title, subtitle, onExpand, bottom,
}: {
  albumArt: string | null;
  title: string;
  subtitle: string;
  onExpand: () => void;
  // Optional override for the bar's vertical position. On the Feed tab this is
  // driven off the composer so the bar stacks directly above the quick-post
  // field (and rides up above the now-playing banner when the keyboard opens).
  // Falls back to a fixed resting spot above the bottom nav on other tabs.
  bottom?: number | Animated.Value | Animated.AnimatedInterpolation<number> | Animated.AnimatedAddition<number>;
}) {
  const insets = useSafeAreaInsets();
  const resolvedBottom = bottom ?? 78 + Math.max(insets.bottom - 6, 0);
  // Rendered as an absolutely-positioned overlay directly in the view tree —
  // NOT inside a Modal. A transparent Modal eats all touches that don't land
  // on its interactive children, making the entire app unpressable when
  // minimized. The plain View with pointerEvents="box-none" passes every touch
  // that misses the bar straight through to the content below.
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <AnimatedTouchable
        style={[mbStyles.bar, { bottom: resolvedBottom as any }]}
        activeOpacity={0.9}
        onPress={onExpand}
      >
        {albumArt ? (
          <CachedImage source={{ uri: albumArt }} style={mbStyles.art} />
        ) : (
          <View style={[mbStyles.art, mbStyles.artFallback]}>
            <Ionicons name="musical-note" size={16} color="#fff" />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <View style={mbStyles.titleRow}>
            <View style={mbStyles.liveDot} />
            <Text style={mbStyles.title} numberOfLines={1}>{title}</Text>
          </View>
          <Text style={mbStyles.subtitle} numberOfLines={1}>{subtitle}</Text>
        </View>
        <View style={mbStyles.expandBtn}>
          <Ionicons name="chevron-up" size={18} color="#fff" />
        </View>
      </AnimatedTouchable>
    </View>
  );
}



// ─── Meet chat list (shared by host + listener rooms) ─────────────────────────
