import React, { useEffect, useState, useCallback } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "../../assets/styles/feed/styles";
import { NAV_ITEMS } from "../../constants/messages";
import { MEETS_ENABLED } from "../../constants/featureFlags";

// Hide the Meets tab when meets are disabled for this build.
const VISIBLE_NAV_ITEMS = NAV_ITEMS.filter((i) => MEETS_ENABLED || i.label !== "Meets");

export function BottomNav({
  active,
  onPress,
}: {
  active: string;
  onPress: (label: string) => void;
}) {
  // Optimistic local highlight. `active` from the parent is updated inside a
  // `startTransition` so it can take a frame or two to commit; this local
  // state flips synchronously on press so the icon/label highlight is instant
  // and the press feels snappy. Reconciles to the prop on every commit.
  const [pendingActive, setPendingActive] = useState(active);
  useEffect(() => { setPendingActive(active); }, [active]);

  const handlePress = useCallback((label: string) => {
    setPendingActive(label);
    onPress(label);
  }, [onPress]);

  return (
    <View style={styles.navBarWrap} pointerEvents="box-none">
      <View style={styles.navBarGlass}>
        {VISIBLE_NAV_ITEMS.map((item) => {
          const isActive = item.label === pendingActive;
          return (
            <Pressable
              key={item.label}
              style={styles.navItem}
              onPress={() => handlePress(item.label)}
              android_ripple={{ color: "rgba(171,0,255,0.12)", borderless: true }}
            >
              <Ionicons
                name={(isActive ? item.iconActive : item.icon) as keyof typeof Ionicons.glyphMap}
                size={24}
                color={isActive ? "#AB00FF" : "rgba(255,255,255,0.3)"}
              />
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ─── Post detail overlay ──────────────────────────────────────────────────────
