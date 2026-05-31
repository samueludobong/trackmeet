import React from "react";
import { View } from "react-native";

export function BannerShape({ shape, color, size }: { shape: string; color: string; size: number }) {
  const s = size;
  switch (shape) {
    case "circle":
      return <View style={{ width: s, height: s, borderRadius: s / 2, backgroundColor: color }} />;
    case "ring":
      return <View style={{ width: s, height: s, borderRadius: s / 2, borderWidth: Math.max(3, Math.round(s / 6)), borderColor: color, backgroundColor: "transparent" }} />;
    case "square":
      return <View style={{ width: s, height: s, borderRadius: Math.round(s / 8), backgroundColor: color }} />;
    case "diamond":
      return <View style={{ width: s * 0.72, height: s * 0.72, backgroundColor: color, transform: [{ rotate: "45deg" }] }} />;
    case "triangle":
      return <View style={{ width: 0, height: 0, borderLeftWidth: s / 2, borderRightWidth: s / 2, borderBottomWidth: Math.round(s * 0.87), borderStyle: "solid", borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: color }} />;
    case "oval":
      return <View style={{ width: s, height: Math.round(s * 0.6), borderRadius: s, backgroundColor: color }} />;
    case "plus":
      return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "center" }}>
          <View style={{ position: "absolute", width: s, height: Math.round(s / 3.2), backgroundColor: color, borderRadius: 4 }} />
          <View style={{ position: "absolute", width: Math.round(s / 3.2), height: s, backgroundColor: color, borderRadius: 4 }} />
        </View>
      );
    case "arc":
      return (
        <View style={{ width: s, height: Math.round(s / 2), overflow: "hidden" }}>
          <View style={{ width: s, height: s, borderRadius: s / 2, backgroundColor: color }} />
        </View>
      );
    default:
      return null;
  }
}

// ─── Song Search Overlay ──────────────────────────────────────────────────────
