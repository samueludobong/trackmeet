import React from "react";
import { Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { adminStyles as a } from "./adminPanel.styles";

export function TabPill({
  label, icon, active, onPress, danger,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
  danger?: boolean;
}) {
  const accent = danger ? "#FF4757" : "#AB00FF";
  return (
    <TouchableOpacity
      style={[a.tabPill, active && (danger ? a.tabPillDanger : a.tabPillActive)]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Ionicons name={icon} size={14} color={active ? accent : "rgba(255,255,255,0.65)"} />
      <Text style={[a.tabPillText, active && { color: accent }]}>{label}</Text>
    </TouchableOpacity>
  );
}
