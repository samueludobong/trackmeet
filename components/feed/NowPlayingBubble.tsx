import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { CachedImage } from "../ui/CachedImage";
import { Ionicons } from "@expo/vector-icons";
import { AVATAR_MAP, type NowPlayingStory } from "../../app/data/mock";
import { styles } from "../../assets/styles/feed/styles";

/** A story-style avatar bubble showing what a user is currently playing. */
export function NowPlayingBubble({ item }: { item: NowPlayingStory }) {
  const photo = AVATAR_MAP[item.user];
  return (
    <TouchableOpacity style={styles.nowPlayingItem} activeOpacity={0.8}>
      <View style={[styles.storyRing, { borderColor: item.color }]}>
        {photo ? (
          <CachedImage source={photo} style={styles.storyAvatar} />
        ) : (
          <View style={[styles.storyAvatar, { backgroundColor: item.color + "25" }]}>
            <Text style={[styles.storyInitials, { color: item.color }]}>{item.initials}</Text>
          </View>
        )}
        {/* Music badge */}
        <View style={[styles.nowPlayingBadge, { backgroundColor: item.color }]}>
          <Ionicons name="musical-note" size={9} color="#0D0D0D" />
        </View>
      </View>
      <Text style={styles.storyName} numberOfLines={1}>{item.song}</Text>
      <Text style={styles.storyArtistSub} numberOfLines={1}>{item.artist}</Text>
    </TouchableOpacity>
  );
}
