import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { CachedImage } from "../ui/CachedImage";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "react-native";

const { width: SW } = Dimensions.get("window");
const COVER_H = Math.round(SW * 0.52);

/** Dedicated banner — bannerUrl overrides; otherwise a gradient using the primary color. */
export function CommunityBanner({
  bannerUrl, bannerColor, isPrivate,
}: {
  bannerUrl: string | null;
  bannerColor: string | null;
  isPrivate: boolean;
}) {
  const base = bannerColor || "#AB00FF";
  return (
    <View style={styles.cover}>
      {bannerUrl ? (
        <CachedImage source={{ uri: bannerUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <LinearGradient
          colors={[shade(base, 0.35), base, shade(base, -0.35)]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.55)"]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {isPrivate && (
        <View style={styles.privateBadge}>
          <Ionicons name="lock-closed" size={11} color="#fff" />
          <Text style={styles.privateBadgeText}>Private</Text>
        </View>
      )}
    </View>
  );
}

// Lighten/darken a hex color by `amount` (-1..1).
function shade(hex: string, amount: number): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return hex;
  const num = parseInt(h, 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp(((num >> 16) & 0xff) + Math.round(255 * amount));
  const g = clamp(((num >> 8) & 0xff) + Math.round(255 * amount));
  const b = clamp((num & 0xff) + Math.round(255 * amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

const styles = StyleSheet.create({
  cover: {
    width: SW - 32, height: COVER_H,
    marginHorizontal: 16, borderRadius: 22, overflow: "hidden",
    backgroundColor: "#1A1A1C",
  },
  privateBadge: {
    position: "absolute", top: 12, right: 12,
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4,
  },
  privateBadgeText: { fontSize: 11, fontWeight: "800", color: "#fff", letterSpacing: 0.2 },
});
