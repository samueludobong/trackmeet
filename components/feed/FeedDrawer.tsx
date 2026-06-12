import React, { useRef, useState, type ReactNode } from "react";
import {
  Animated, View, Text, StyleSheet, PanResponder, Pressable, TouchableOpacity, Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DiscoverView } from "../discover/DiscoverView";
import { CommunityFeed } from "../communities/CommunityFeed";

const { width: SW } = Dimensions.get("window");
const W = Math.min(300, Math.round(SW * 0.8)); // sidebar width
const EDGE = 40;       // left-edge zone that starts an opening swipe
const THRESHOLD = 14;  // min horizontal travel to claim the gesture

type Section = "feed" | "explore" | "communities" | "stories";

const ITEMS: { key: Section; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "feed", label: "Feed", icon: "home-outline" },
  { key: "explore", label: "Explore", icon: "compass-outline" },
  { key: "communities", label: "Communities", icon: "people-outline" },
  { key: "stories", label: "Stories", icon: "aperture-outline" },
];

/**
 * Push-style sidebar drawer for the Feed tab. Edge-swipe right opens it (sliding
 * the content over to reveal the sidebar); swipe left — or tapping the pushed
 * content / a sidebar item — closes it. Sidebar tabs switch the content area.
 *
 * `focused`: must be `true` for any swipe gesture to be claimed. The FeedDrawer
 * lives inside a hidden TabScreen when the user is on another tab, but in some
 * RN edge cases (Modal overlays, native-modal touch propagation) the
 * PanResponder can still receive move events from gestures that *should* be
 * handled by another screen. Gating on `focused` makes it impossible to open
 * the drawer accidentally from outside the Feed tab.
 */
export function FeedDrawer({
  feedContent, userId, focused = true,
}: {
  feedContent: ReactNode;
  userId: string | null;
  focused?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [section, setSection] = useState<Section>("feed");
  const [open, setOpen] = useState(false);

  const tx = useRef(new Animated.Value(0)).current;
  const openRef = useRef(false);
  const startX = useRef(0);
  // Mirrored into a ref so the PanResponder (created once via useRef) reads
  // the latest value without recreating itself on every focus change.
  const focusedRef = useRef(focused);
  focusedRef.current = focused;

  const animateTo = (toValue: number) => {
    openRef.current = toValue > 0;
    setOpen(toValue > 0);
    Animated.spring(tx, { toValue, useNativeDriver: true, damping: 22, stiffness: 210 }).start();
  };

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => {
        // Hard block: refuse every gesture when the Feed tab isn't focused.
        // This catches the "right-swipe on Profile/playlist detail accidentally
        // opens the sidebar when I switch back to Feed" bug.
        if (!focusedRef.current) return false;
        const horizontal = Math.abs(g.dx) > THRESHOLD && Math.abs(g.dx) > Math.abs(g.dy) * 1.4;
        if (!horizontal) return false;
        // Closing: a left swipe anywhere while open. Opening: a right swipe that
        // starts from the left edge (so it never hijacks horizontal carousels).
        if (openRef.current) return g.dx < 0;
        return g.x0 < EDGE && g.dx > 0;
      },
      onPanResponderGrant: () => { tx.stopAnimation((v) => { startX.current = v; }); },
      onPanResponderMove: (_e, g) => {
        if (!focusedRef.current) return;
        tx.setValue(Math.max(0, Math.min(W, startX.current + g.dx)));
      },
      onPanResponderRelease: (_e, g) => {
        if (!focusedRef.current) { animateTo(0); return; }
        const next = startX.current + g.dx;
        if (g.vx > 0.3 || (g.vx > -0.3 && next > W * 0.45)) animateTo(W);
        else animateTo(0);
      },
      onPanResponderTerminate: () => { animateTo(0); },
    }),
  ).current;

  const select = (key: Section) => { setSection(key); animateTo(0); };

  const content = () => {
    switch (section) {
      case "explore": return <DiscoverView />;
      case "communities": return <CommunityFeed userId={userId} />;
      case "stories": return <Placeholder icon="aperture-outline" title="Stories" sub="Stories are coming soon." />;
      default: return feedContent;
    }
  };

  return (
    <View style={styles.root}>
      {/* Sidebar sits behind the content and is revealed as content slides over. */}
      <View style={[styles.sidebar, { width: W, paddingTop: insets.top + 16 }]}>
        <Text style={styles.brand}>trackmeet</Text>
        {ITEMS.map((it) => {
          const active = section === it.key;
          return (
            <TouchableOpacity key={it.key} style={[styles.item, active && styles.itemActive]} activeOpacity={0.8} onPress={() => select(it.key)}>
              <Ionicons name={it.icon} size={21} color={active ? "#fff" : "rgba(255,255,255,0.6)"} />
              <Text style={[styles.itemText, active && styles.itemTextActive]}>{it.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Animated.View
        style={[styles.content, { transform: [{ translateX: tx }] }]}
        {...pan.panHandlers}
      >
        {content()}
        {/* When open, tapping the pushed content closes the drawer. */}
        {open && <Pressable style={StyleSheet.absoluteFill} onPress={() => animateTo(0)} />}
      </Animated.View>
    </View>
  );
}

function Placeholder({ icon, title, sub }: { icon: keyof typeof Ionicons.glyphMap; title: string; sub: string }) {
  return (
    <View style={styles.placeholder}>
      <Ionicons name={icon} size={48} color="rgba(255,255,255,0.25)" />
      <Text style={styles.placeholderTitle}>{title}</Text>
      <Text style={styles.placeholderSub}>{sub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0D0D0D" },
  sidebar: {
    position: "absolute", left: 0, top: 0, bottom: 0,
    backgroundColor: "#141416",
    paddingHorizontal: 14,
  },
  brand: { fontSize: 22, fontWeight: "900", color: "#fff", letterSpacing: -0.5, marginBottom: 22, paddingHorizontal: 6 },
  item: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingHorizontal: 12, paddingVertical: 14, borderRadius: 14, marginBottom: 4,
  },
  itemActive: { backgroundColor: "rgba(171,0,255,0.16)" },
  itemText: { fontSize: 16, fontWeight: "600", color: "rgba(255,255,255,0.6)" },
  itemTextActive: { color: "#fff", fontWeight: "800" },

  content: { ...StyleSheet.absoluteFillObject, backgroundColor: "#0D0D0D" },

  placeholder: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 24 },
  placeholderTitle: { fontSize: 22, fontWeight: "800", color: "#fff" },
  placeholderSub: { fontSize: 14, color: "rgba(255,255,255,0.45)", textAlign: "center" },
});
