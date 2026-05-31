import React, { useContext } from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { styles } from "../../lib/feed/styles";
import { OpenDetailCtx } from "../../lib/feed/contexts";
import { ActionRow } from "../../components/post/ActionRow";
import { PostHeader } from "../../components/post/PostHeader";
import { type Post } from "../../app/data/mock";

export function PostText({ text }: { text: string }) {
  const openDetail = useContext(OpenDetailCtx);
  return (
    <TouchableOpacity activeOpacity={0.75} onPress={openDetail}>
      <Text style={styles.postText}>{text}</Text>
    </TouchableOpacity>
  );
}

// ─── Text card ────────────────────────────────────────────────────────────────

export function TextCard({ post }: { post: Post }) {
  return (
    <View style={styles.card}>
      <PostHeader post={post} />
      {post.text && <PostText text={post.text} />}
      <ActionRow post={post} />
    </View>
  );
}

// ─── Image collage layout ─────────────────────────────────────────────────────
