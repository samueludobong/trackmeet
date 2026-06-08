import React from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { styles } from "../../lib/feed/styles";
import { AVATAR_MAP, type Post } from "../../app/data/mock";

export function PostHeader({ post }: { post: Post }) {
  const photo = AVATAR_MAP[post.user];
  const router = useRouter();

  const handleAuthorPress = () => {
    if (post.authorId) {
      router.push({ pathname: "/user-profile", params: { userId: post.authorId } });
    }
  };

  const avatarEl = post.avatarUrl ? (
    <Image source={{ uri: post.avatarUrl }} style={styles.postAvatar} />
  ) : photo ? (
    <Image source={photo} style={styles.postAvatar} />
  ) : (
    <View style={[styles.postAvatar, { backgroundColor: post.avatarColor + "22" }]}>
      <Text style={[styles.postAvatarText, { color: post.avatarColor }]}>{post.initials}</Text>
    </View>
  );

  const openCommunity = () => {
    if (!post.communityId) return;
    router.push({ pathname: "/community", params: { id: post.communityId } });
  };

  return (
    <View>
      {post.communityId && (post.communitySlug || post.communityName) && (
        <TouchableOpacity style={ph.communityTag} activeOpacity={0.7} onPress={openCommunity}>
          <Ionicons name="people" size={12} color="rgba(255,255,255,0.5)" />
          <Text style={ph.communityTagText}>From /{post.communitySlug ?? post.communityName}</Text>
        </TouchableOpacity>
      )}
    <View style={styles.postHeader}>
      {/* Avatar → opens author profile */}
      <TouchableOpacity activeOpacity={0.72} onPress={handleAuthorPress} disabled={!post.authorId}>
        {avatarEl}
      </TouchableOpacity>

      <View style={{ flex: 1 }}>
        {/* Display name → opens author profile */}
        <TouchableOpacity activeOpacity={0.72} onPress={handleAuthorPress} disabled={!post.authorId}>
          <Text style={styles.postUser}>{post.bio}</Text>
        </TouchableOpacity>
        {/* Handle → also opens author profile */}
        <TouchableOpacity activeOpacity={0.6} onPress={handleAuthorPress} disabled={!post.authorId}>
          <Text style={styles.postBio} numberOfLines={1}>{post.handle} · {post.time}</Text>
        </TouchableOpacity>
      </View>
    </View>
    </View>
  );
}

const ph = StyleSheet.create({
  communityTag: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginBottom: 6,
  },
  communityTagText: { fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.55)" },
});

// ─── Tappable post text — opens detail view ────────────────────────────────────
