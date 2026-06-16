import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { CachedImage } from "../ui/CachedImage";
import { Ionicons } from "@expo/vector-icons";
import { type CommunityPost } from "../../services/communities";
import { SongPreviewSheet } from "../SongPreviewSheet";

export const relTime = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Today at ${new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  const d = Math.floor(h / 24);
  return d < 7 ? `${d}d ago` : new Date(iso).toLocaleDateString();
};

const initials = (a: CommunityPost["author"]) => {
  const n = (a.display_name || a.username || "?").trim();
  return n.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";
};

export function CommunityPostCard({
  post, accessToken, userId,
  liked = false, onToggleLike, onOpenComments,
  canModerate = false, onTogglePin, onToggleAnnouncement, onDelete,
}: {
  post: CommunityPost;
  accessToken?: string | null;
  userId?: string | null;
  /** Viewer has liked this post (wired by the parent via getMyLikedCommunityPostIds). */
  liked?: boolean;
  onToggleLike?: () => void;
  onOpenComments?: () => void;
  /** Viewer is an owner/moderator — unlocks pin/announce/delete in the ··· menu. */
  canModerate?: boolean;
  onTogglePin?: () => void;
  onToggleAnnouncement?: () => void;
  onDelete?: () => void;
}) {
  const a = post.author;
  const [previewOpen, setPreviewOpen] = useState(false);

  const isAuthor = !!userId && a?.id === userId;
  const hasMenu = canModerate || (isAuthor && !!onDelete);
  const openMenu = () => {
    const options: any[] = [];
    if (canModerate && onTogglePin) {
      options.push({ text: post.pinned_at ? "Unpin post" : "Pin post", onPress: onTogglePin });
    }
    if (canModerate && onToggleAnnouncement) {
      options.push({
        text: post.is_announcement ? "Remove announcement" : "Mark as announcement",
        onPress: onToggleAnnouncement,
      });
    }
    if ((canModerate || isAuthor) && onDelete) {
      options.push({ text: "Delete post", style: "destructive", onPress: onDelete });
    }
    options.push({ text: "Cancel", style: "cancel" });
    Alert.alert("Post options", undefined, options);
  };

  return (
    <View style={[styles.card, post.is_announcement && styles.cardAnnouncement]}>
      {(post.pinned_at || post.is_announcement) && (
        <View style={styles.badgeRow}>
          {!!post.pinned_at && (
            <View style={styles.badge}>
              <Ionicons name="pin" size={11} color="#AB00FF" />
              <Text style={styles.badgeText}>Pinned</Text>
            </View>
          )}
          {post.is_announcement && (
            <View style={[styles.badge, styles.badgeAnnouncement]}>
              <Ionicons name="megaphone" size={11} color="#FFD24A" />
              <Text style={[styles.badgeText, { color: "#FFD24A" }]}>Announcement</Text>
            </View>
          )}
        </View>
      )}
      <View style={styles.cardHead}>
        {a.avatar_url ? (
          <CachedImage source={{ uri: a.avatar_url }} style={styles.cardAvatar} />
        ) : (
          <View style={[styles.cardAvatar, styles.cardAvatarFallback]}>
            <Text style={styles.cardAvatarText}>{initials(a)}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <View style={styles.cardNameRow}>
            <Text style={styles.cardName} numberOfLines={1}>{a.display_name || a.username || "Someone"}</Text>
            {a.is_verified && <Ionicons name="checkmark-circle" size={14} color="#1DB954" />}
          </View>
          <Text style={styles.cardTime}>{relTime(post.created_at)}</Text>
        </View>
        {post.is_hot && <Text style={styles.hotFlame}>🔥</Text>}
        {hasMenu ? (
          <TouchableOpacity onPress={openMenu} hitSlop={8}>
            <Ionicons name="ellipsis-horizontal" size={18} color="rgba(255,255,255,0.4)" />
          </TouchableOpacity>
        ) : (
          <Ionicons name="ellipsis-horizontal" size={18} color="rgba(255,255,255,0.4)" />
        )}
      </View>

      {!!post.text && <Text style={styles.cardText}>{post.text}</Text>}

      {!!post.song_name && (
        <TouchableOpacity
          style={styles.songChip}
          activeOpacity={0.85}
          onPress={() => post.song_id && setPreviewOpen(true)}
        >
          {post.song_album_art ? (
            <CachedImage source={{ uri: post.song_album_art }} style={styles.songArt} />
          ) : (
            <View style={[styles.songArt, { backgroundColor: "rgba(29,185,84,0.18)", alignItems: "center", justifyContent: "center" }]}>
              <Ionicons name="musical-note" size={14} color="#1DB954" />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.songName} numberOfLines={1}>{post.song_name}</Text>
            <Text style={styles.songArtist} numberOfLines={1}>{post.song_artist}</Text>
          </View>
          {post.song_id && (
            <View style={styles.playBtn}>
              <Ionicons name="play" size={14} color="#fff" />
            </View>
          )}
        </TouchableOpacity>
      )}

      {post.song_id && post.song_name && (
        <SongPreviewSheet
          visible={previewOpen}
          onClose={() => setPreviewOpen(false)}
          song={{
            id: post.song_id,
            name: post.song_name,
            artist: post.song_artist || "",
            albumArt: post.song_album_art,
          }}
          accessToken={accessToken ?? null}
          userId={userId ?? null}
        />
      )}

      <View style={styles.reactRow}>
        <Chip
          icon={liked ? "heart" : "heart-outline"}
          count={post.likes_count}
          color={liked ? "#FF3B6F" : undefined}
          onPress={onToggleLike}
        />
        <Chip icon="chatbubble-outline" count={post.comments_count} onPress={onOpenComments} />
        <Chip icon="repeat-outline" count={post.reposts_count ?? 0} />
        <View style={{ flex: 1 }} />
        {post.views_count >= 10 && (
          <View style={styles.viewsChip}>
            <Ionicons name="eye-outline" size={15} color="rgba(255,255,255,0.5)" />
            <Text style={styles.chipText}>{post.views_count}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function Chip({ icon, count, color, onPress }: {
  icon: keyof typeof Ionicons.glyphMap;
  count: number;
  color?: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={styles.chip} activeOpacity={0.7} onPress={onPress} disabled={!onPress}>
      <Ionicons name={icon} size={15} color={color ?? "rgba(255,255,255,0.6)"} />
      <Text style={[styles.chipText, color ? { color } : null]}>{count}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.045)", borderRadius: 20,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", padding: 14,
  },
  cardAnnouncement: {
    borderColor: "rgba(255,210,74,0.35)",
    backgroundColor: "rgba(255,210,74,0.05)",
  },
  badgeRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  badge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(171,0,255,0.12)", borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  badgeAnnouncement: { backgroundColor: "rgba(255,210,74,0.12)" },
  badgeText: { fontSize: 11, fontWeight: "800", color: "#AB00FF" },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 11 },
  cardAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#222" },
  cardAvatarFallback: { backgroundColor: "rgba(171,0,255,0.3)", alignItems: "center", justifyContent: "center" },
  cardAvatarText: { fontSize: 15, fontWeight: "800", color: "#fff" },
  cardNameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  cardName: { fontSize: 15, fontWeight: "700", color: "#fff" },
  cardTime: { fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 },
  cardText: { fontSize: 15, color: "rgba(255,255,255,0.9)", lineHeight: 21, marginTop: 12, fontWeight: "600" },

  songChip: {
    flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12,
    backgroundColor: "rgba(29,185,84,0.08)", borderRadius: 12, padding: 8,
    borderWidth: 1, borderColor: "rgba(29,185,84,0.2)",
  },
  songArt: { width: 40, height: 40, borderRadius: 8 },
  playBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "#1DB954",
    alignItems: "center", justifyContent: "center",
  },
  songName: { fontSize: 13, fontWeight: "700", color: "#fff" },
  songArtist: { fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 1 },

  reactRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 14, paddingHorizontal: 11, paddingVertical: 7,
  },
  viewsChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 4 },
  hotFlame: { fontSize: 16, marginRight: 4 },
  chipText: { fontSize: 13, fontWeight: "700", color: "rgba(255,255,255,0.6)" },
});
