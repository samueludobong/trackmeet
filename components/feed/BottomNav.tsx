import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "../../assets/styles/feed/styles";
import { NAV_ITEMS } from "../../constants/messages";

export function BottomNav({
  active,
  onPress,
}: {
  active: string;
  onPress: (label: string) => void;
}) {
  return (
    <View style={styles.navBarWrap} pointerEvents="box-none">
      <View style={styles.navBarGlass}>
        {NAV_ITEMS.map((item) => {
          const isActive = item.label === active;
          return (
            <TouchableOpacity
              key={item.label}
              style={styles.navItem}
              activeOpacity={0.7}
              onPress={() => onPress(item.label)}
            >
              <Ionicons
                name={(isActive ? item.iconActive : item.icon) as keyof typeof Ionicons.glyphMap}
                size={24}
                color={isActive ? "#AB00FF" : "rgba(255,255,255,0.3)"}
              />
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Post detail overlay ──────────────────────────────────────────────────────
