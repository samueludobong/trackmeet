import React from "react";
import { Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { mvStyles as s } from "./mediaViewer.styles";

export const fmtN = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`.replace(".0M", "M");
  if (n >= 1_000) return `${(n / 1_000).toFixed(n < 10_000 ? 1 : 0)}K`.replace(".0K", "K");
  return String(n);
};

/** Engagement action — pill (with count) when collapsed, flat icon when expanded. */
export function Action({ icon, n, flat }: { icon: keyof typeof Ionicons.glyphMap; n: number; flat: boolean }) {
  return (
    <TouchableOpacity style={[s.action, !flat && s.actionPill, !flat && n <= 0 && s.actionCircle]} activeOpacity={0.7}>
      <Ionicons name={icon} size={flat ? 19 : 17} color="rgba(255,255,255,0.85)" />
      {n > 0 && <Text style={s.actionText}>{fmtN(n)}</Text>}
    </TouchableOpacity>
  );
}
