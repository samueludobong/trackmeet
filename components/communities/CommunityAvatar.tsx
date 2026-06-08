import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

/** Square avatar — uploaded image, else first letter of name on gradient bg. */
export function CommunityAvatar({
  uri, name, color, size = 48, radius,
}: {
  uri: string | null | undefined;
  name: string;
  color?: string | null;
  size?: number;
  radius?: number;
}) {
  const r = radius ?? Math.round(size * 0.28);
  if (uri) {
    return <Image source={{ uri }} style={[styles.base, { width: size, height: size, borderRadius: r }]} />;
  }
  const c = color || "#AB00FF";
  return (
    <LinearGradient
      colors={[shade(c, 0.35), c, shade(c, -0.3)]}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={[styles.base, { width: size, height: size, borderRadius: r, alignItems: "center", justifyContent: "center" }]}
    >
      <Text style={[styles.letter, { fontSize: Math.round(size * 0.5) }]}>
        {(name?.[0] || "C").toUpperCase()}
      </Text>
    </LinearGradient>
  );
}

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
  base: { backgroundColor: "#1A1A1A" },
  letter: { fontWeight: "900", color: "#fff", letterSpacing: -0.5 },
});
