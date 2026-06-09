import React, { useState } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import { styles } from "../../lib/feed/styles";
import { ActionRow } from "./ActionRow";
import { PostHeader } from "./PostHeader";
import { PostText } from "./TextCard";
import { AttachedSongChip } from "./AttachedSongChip";
import { MediaViewer } from "./MediaViewer";
import { type Post } from "../../app/data/mock";

export function VideoCard({ post }: { post: Post }) {
  const videoUri = post.mediaUrls?.[0];
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.card}>
      <PostHeader post={post} />
      {post.text && <PostText text={post.text} />}

      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() => videoUri && setOpen(true)}
        style={[styles.mediaBlock, { backgroundColor: post.mediaColor ?? "#1a1a1a" }]}
      >
        {videoUri
          ? <InlinePreview uri={videoUri} />
          : <Image source={{ uri: post.albumArt ?? undefined }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />}
        <View style={[styles.videoPlayCircle, { position: "absolute" }]}>
          <Text style={styles.videoPlayIcon}>▶</Text>
        </View>
        {post.duration && (
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{post.duration}</Text>
          </View>
        )}
      </TouchableOpacity>

      {post.song && (
        <AttachedSongChip
          songId={post.songId} songName={post.song} songArtist={post.artist} albumArt={post.albumArt}
        />
      )}

      <ActionRow post={post} />

      {open && videoUri && (
        <MediaViewer
          post={post}
          media={[{ type: "video", uri: videoUri }]}
          onClose={() => setOpen(false)}
        />
      )}
    </View>
  );
}

function InlinePreview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => { p.muted = true; p.pause(); });
  return (
    <VideoView
      player={player}
      style={{ width: "100%", height: "100%" }}
      contentFit="cover"
      nativeControls={false}
      pointerEvents="none"
    />
  );
}
