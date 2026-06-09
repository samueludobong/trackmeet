import React from "react";
import { View, StyleSheet, type ViewStyle } from "react-native";

/**
 * Drag hitbox + visible grabber bar for a bottom sheet.
 *
 * Renders a tall (≈48px) full-width zone with the 36×4 pill bar centred. The
 * pan responder lives on this zone, well above any internal ScrollView, so
 * drag-to-close never competes with body scrolling.
 *
 * Put this as the FIRST child of any sheet's Animated.View and pass it the
 * `panHandlers` returned by `useSheetDragClose`. Do NOT spread the handlers
 * onto the sheet itself.
 */
export function DragGrabber({
  panHandlers, style,
}: {
  panHandlers: any;
  style?: ViewStyle;
}) {
  return (
    <View {...panHandlers} style={[styles.zone, style]} collapsable={false}>
      <View style={styles.bar} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  zone: {
    height: 48,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  bar: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
});
