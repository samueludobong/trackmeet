import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { CachedImage } from "../ui/CachedImage";
import { Ionicons } from "@expo/vector-icons";
import type { LiveCommunityMeet } from "../../services/communities";
import { styles } from "../../assets/styles/communities/LiveMeetCard";

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
