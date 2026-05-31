import React from "react";
import { View, Text } from "react-native";
import { styles } from "../../lib/feed/styles";
import { ActionRow } from "../../components/post/ActionRow";
import { PostHeader } from "../../components/post/PostHeader";
import { PostText } from "../../components/post/TextCard";
import { type Post } from "../../app/data/mock";

export function VideoCard({ post }: { post: Post }) {
  return (
    <View style={styles.card}>
      <PostHeader post={post} />
      {post.text && <PostText text={post.text} />}
      <View style={[styles.mediaBlock, { backgroundColor: post.mediaColor ?? "#1a1a1a" }]}>
        <View style={styles.videoPlayCircle}>
          <Text style={styles.videoPlayIcon}>▶</Text>
        </View>
        {post.duration && (
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{post.duration}</Text>
          </View>
        )}
      </View>
      <ActionRow post={post} />
    </View>
  );
}

// ─── Music card ───────────────────────────────────────────────────────────────
