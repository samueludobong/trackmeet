import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { CachedImage } from "../ui/CachedImage";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { type LiveMeet } from "../../services/meets";
import { lmStyles } from "../../assets/styles/feed/localStyles";
import { fmtCount } from "../../app/data/mock";

export function LiveMeetCard({ meet, onJoin }: { meet: LiveMeet; onJoin: (id: string) => void }) {
  const hostName = meet.host.display_name || meet.host.username;
  return (
    <View style={lmStyles.card}>
      {meet.current_track_album_art ? (
        <CachedImage source={{ uri: meet.current_track_album_art }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <LinearGradient colors={["#AB00FF66", "#1c0030EE"]} style={StyleSheet.absoluteFill} />
      )}
      <LinearGradient colors={["rgba(0,0,0,0.15)", "rgba(0,0,0,0.82)"]} style={StyleSheet.absoluteFill} />

      <View style={lmStyles.cardTop}>
        <View style={lmStyles.liveBadge}>
          <View style={lmStyles.liveDot} />
          <Text style={lmStyles.liveBadgeText}>Live</Text>
        </View>
        <View style={lmStyles.viewerBadge}>
          <Ionicons name="headset-outline" size={10} color="rgba(255,255,255,0.85)" />
          <Text style={lmStyles.viewerText}>{fmtCount(meet.listenerCount)}</Text>
        </View>
      </View>

      <View style={lmStyles.cardBottom}>
        <Text style={lmStyles.cardTitle} numberOfLines={2}>{meet.name}</Text>
        {meet.current_track_name ? (
          <Text style={lmStyles.cardTrack} numberOfLines={1}>♪ {meet.current_track_name}</Text>
        ) : null}
        <Text style={lmStyles.cardHost} numberOfLines={1}>@{hostName}</Text>
        <TouchableOpacity style={lmStyles.joinBtn} activeOpacity={0.85} onPress={() => onJoin(meet.id)}>
          <Text style={lmStyles.joinBtnText}>Join</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
