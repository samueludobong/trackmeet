import React from "react";
import { Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { adminStyles as a } from "./adminPanel.styles";

export function TabPill({
  label, icon, active, onPress, danger, badge,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
  danger?: boolean;
  /** Small count bubble (e.g. pending join requests). Hidden when 0/undefined. */
  badge?: number;
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
      {!!badge && badge > 0 && (
        <View style={pillStyles.badge}>
          <Text style={pillStyles.badgeText}>{badge > 99 ? "99+" : badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const pillStyles = StyleSheet.create({
  badge: {
    minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5,
    backgroundColor: "#FF3B6F",
    alignItems: "center", justifyContent: "center",
    marginLeft: 2,
  },
  badgeText: { fontSize: 10, fontWeight: "800", color: "#fff" },
});
