import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { CachedImage } from "../ui/CachedImage";
import { Ionicons } from "@expo/vector-icons";
import type { LiveCommunityMeet } from "../../services/communities";

/** Prominent pulsing live-meet card at the top of community home. */
export function LiveMeetCard({
  meet, onJoin,
}: {
  meet: LiveCommunityMeet;
  onJoin: () => void;
}) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] });
  const cardOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.92] });

  return (
    <Animated.View style={[styles.card, { opacity: cardOpacity }]}>
      <View style={styles.left}>
        <View style={styles.ringWrap}>
          <Animated.View style={[styles.ringPulse, { transform: [{ scale: ringScale }], opacity: ringOpacity }]} />
          {meet.host_avatar ? (
            <CachedImage source={{ uri: meet.host_avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Ionicons name="person" size={22} color="#fff" />
            </View>
          )}
        </View>
      </View>

      <View style={styles.center}>
        <View style={styles.titleRow}>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
          <Text style={styles.listeners}>{meet.listener_count} listening</Text>
        </View>
        <Text style={styles.meetName} numberOfLines={1}>{meet.name}</Text>
        {meet.current_track_name && (
          <Text style={styles.song} numberOfLines={1}>
            {meet.current_track_name}{meet.current_track_artist ? ` · ${meet.current_track_artist}` : ""}
          </Text>
        )}
      </View>

      <TouchableOpacity style={styles.joinBtn} activeOpacity={0.85} onPress={onJoin}>
        <Text style={styles.joinText}>Join</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row", alignItems: "center", gap: 12,
    marginHorizontal: 16, marginTop: 12, padding: 12,
    borderRadius: 18,
    backgroundColor: "#1A1A1A",
    borderWidth: 1, borderColor: "rgba(171,0,255,0.45)",
    shadowColor: "#AB00FF", shadowOpacity: 0.3, shadowRadius: 18, shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  left: { width: 54, alignItems: "center", justifyContent: "center" },
  ringWrap: { width: 54, height: 54, alignItems: "center", justifyContent: "center" },
  ringPulse: {
    position: "absolute", width: 54, height: 54, borderRadius: 27,
    borderWidth: 2, borderColor: "#AB00FF",
  },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#222", borderWidth: 2, borderColor: "#AB00FF" },
  avatarFallback: { backgroundColor: "rgba(171,0,255,0.4)", alignItems: "center", justifyContent: "center" },

  center: { flex: 1, gap: 2 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  liveBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#AB00FF",
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#fff" },
  liveText: { color: "#fff", fontWeight: "900", fontSize: 9, letterSpacing: 0.8 },
  listeners: { fontSize: 11, color: "rgba(255,255,255,0.55)", fontWeight: "600" },
  meetName: { fontSize: 14, fontWeight: "800", color: "#fff", marginTop: 2 },
  song: { fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: "600" },

  joinBtn: {
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14,
    backgroundColor: "#AB00FF",
  },
  joinText: { color: "#fff", fontWeight: "800", fontSize: 13 },
});
