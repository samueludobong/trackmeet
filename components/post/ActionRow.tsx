import React, { useState, useEffect, useContext } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "../../lib/feed/styles";
import { OpenDetailCtx, FeedUserCtx } from "../../lib/feed/contexts";
import { type Post } from "../../app/data/mock";

export function ActionRow({ post }: { post: Post }) {
  const { currentUserId, likedPostIds, onToggleLike } = useContext(FeedUserCtx);
  const liked = likedPostIds.has(post.id);
  const [likeCount, setLikeCount] = useState(post.likes);
  const openDetail = useContext(OpenDetailCtx);

  // Keep local count in sync when the post prop changes (e.g. after DB sync)
  useEffect(() => { setLikeCount(post.likes); }, [post.likes]);

  const handleLike = () => {
    if (!currentUserId) return;
    setLikeCount((c) => (liked ? Math.max(0, c - 1) : c + 1));
    onToggleLike(post.id);
  };

  return (
    <View style={styles.actionRow}>
      <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={handleLike}>
        <Text style={[styles.actionIcon, liked && styles.actionIconLiked]}>{liked ? "♥" : "♡"}</Text>
        {likeCount > 0 && <Text style={[styles.actionCount, liked && styles.actionCountLiked]}>{likeCount}</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={openDetail}>
        <Ionicons name="chatbubble-outline" size={17} color="rgba(255,255,255,0.7)" />
        {post.comments > 0 && <Text style={styles.actionCount}>{post.comments}</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={() => {}}>
        <Text style={styles.actionIcon}>↗</Text>
        {post.shares > 0 && <Text style={styles.actionCount}>{post.shares}</Text>}
      </TouchableOpacity>
      <View style={{ flex: 1 }} />
      <TouchableOpacity activeOpacity={0.7} onPress={() => {}}>
        <Text style={styles.moreIcon}>···</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Lightbox styles ─────────────────────────────────────────────────────────


// ─── Fullscreen image lightbox ─────────────────────────────────────────────────
