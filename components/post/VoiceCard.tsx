import React from "react";
import { View } from "react-native";
import { styles } from "../../assets/styles/feed/styles";
import { ActionRow } from "./ActionRow";
import { PostHeader } from "./PostHeader";
import { PostText } from "./TextCard";
import { VoicePlayer } from "./VoicePlayer";
import { type Post } from "../../app/data/mock";

/** Voice-note post — player with animated waveform. */
export function VoiceCard({ post }: { post: Post }) {
  return (
    <View style={styles.card}>
      <PostHeader post={post} />
      {post.text && <PostText text={post.text} />}
      {post.voiceUrl && (
        <VoicePlayer
          uri={post.voiceUrl}
          durationMs={post.voiceDurationMs ?? null}
          waveform={post.voiceWaveform ?? null}
        />
      )}
      <ActionRow post={post} />
    </View>
  );
}
