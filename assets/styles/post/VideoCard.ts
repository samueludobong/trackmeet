import { StyleSheet } from "react-native";

export const inline = StyleSheet.create({
  muteBtn: {
    position: "absolute", top: 10, right: 10,
    width: 30, height: 30, borderRadius: 15,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
});

export const scrub = StyleSheet.create({
  // Tall hit area for easy thumbing. Negative marginBottom pulls the action row
  // back up so the *visible* gap between the video and the action row stays the
  // same — the extra hit area overlaps the action row invisibly. The icons up
  // there still catch their own taps (TouchableOpacity is on top in z-order;
  // our PanResponder only claims horizontal drags, not taps), so dragging
  // anywhere in this band scrubs and tapping an icon still triggers the icon.
  row: { height: 28, marginBottom: -14 },
  fill: { position: "absolute", top: 0, left: 0, height: 2, backgroundColor: "#fff" },
});
