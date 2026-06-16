import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { styles } from "../../assets/styles/feed/styles";
import { CachedImage } from "../ui/CachedImage";
import { COLLAGE_W, COLLAGE_GAP } from "../../lib/feed/dimensions";
import { MediaViewer } from "../../components/post/MediaViewer";
import { ActionRow } from "../../components/post/ActionRow";
import { PostHeader } from "../../components/post/PostHeader";
import { PostText } from "../../components/post/TextCard";
import { AttachedSongChip } from "../../components/post/AttachedSongChip";
import { type Post } from "../../app/data/mock";

export function ImageCollage({
  urls,
  onPress,
}: {
  urls: string[];
  onPress: (idx: number) => void;
}) {
  // ── 1 image: full width ──────────────────────────────────────────────────────
  if (urls.length === 1) {
    return (
      <TouchableOpacity activeOpacity={0.9} onPress={() => onPress(0)}>
        <CachedImage source={{ uri: urls[0] }} style={{ width: COLLAGE_W, height: 280 }} resizeMode="cover" />
      </TouchableOpacity>
    );
  }

  // ── 2 images: side by side ───────────────────────────────────────────────────
  if (urls.length === 2) {
    const w = (COLLAGE_W - COLLAGE_GAP) / 2;
    return (
      <View style={{ flexDirection: "row", gap: COLLAGE_GAP }}>
        {urls.map((url, i) => (
          <TouchableOpacity key={i} activeOpacity={0.9} onPress={() => onPress(i)}>
            <CachedImage source={{ uri: url }} style={{ width: w, height: 220 }} resizeMode="cover" />
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  // ── 3 images: large left + two stacked right ─────────────────────────────────
  if (urls.length === 3) {
    const leftW  = Math.round(COLLAGE_W * 0.62);
    const rightW = COLLAGE_W - leftW - COLLAGE_GAP;
    const totalH = 250;
    const rightH = (totalH - COLLAGE_GAP) / 2;
    return (
      <View style={{ flexDirection: "row", gap: COLLAGE_GAP }}>
        <TouchableOpacity activeOpacity={0.9} onPress={() => onPress(0)}>
          <CachedImage source={{ uri: urls[0] }} style={{ width: leftW, height: totalH }} resizeMode="cover" />
        </TouchableOpacity>
        <View style={{ gap: COLLAGE_GAP }}>
          <TouchableOpacity activeOpacity={0.9} onPress={() => onPress(1)}>
            <CachedImage source={{ uri: urls[1] }} style={{ width: rightW, height: rightH }} resizeMode="cover" />
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.9} onPress={() => onPress(2)}>
            <CachedImage source={{ uri: urls[2] }} style={{ width: rightW, height: rightH }} resizeMode="cover" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── 4+ images: 2×2 grid, last cell shows +N badge ────────────────────────────
  const cellW  = (COLLAGE_W - COLLAGE_GAP) / 2;
  const cellH  = Math.round(cellW * 0.72);
  const shown  = urls.slice(0, 4);
  const extra  = urls.length - 4;
  return (
    <View style={{ gap: COLLAGE_GAP }}>
      {[0, 2].map((rowStart) => (
        <View key={rowStart} style={{ flexDirection: "row", gap: COLLAGE_GAP }}>
          {shown.slice(rowStart, rowStart + 2).map((url, j) => {
            const idx  = rowStart + j;
            const isLast = idx === 3 && extra > 0;
            return (
              <TouchableOpacity key={idx} activeOpacity={0.9} onPress={() => onPress(idx)} style={{ position: "relative" }}>
                <CachedImage source={{ uri: url }} style={{ width: cellW, height: cellH }} resizeMode="cover" />
                {isLast && (
                  <View style={styles.collageMoreOverlay}>
                    <Text style={styles.collageMoreText}>+{extra}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ─── Image card ───────────────────────────────────────────────────────────────

export function ImageCard({ post }: { post: Post }) {
  const urls = post.mediaUrls ?? [];
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  return (
    <View style={styles.card}>
      <PostHeader post={post} />
      {post.text && <PostText text={post.text} />}
      {urls.length > 0 ? (
        <ImageCollage urls={urls} onPress={(i) => setLightboxIdx(i)} />
      ) : (
        <View style={[styles.mediaBlock, { backgroundColor: post.mediaColor ?? "#1a1a1a" }]}>
          <Text style={styles.mediaPlaceholder}>🖼</Text>
        </View>
      )}
      {post.song && (
        <AttachedSongChip
          songId={post.songId}
          songName={post.song}
          songArtist={post.artist}
          albumArt={post.albumArt}
        />
      )}
      <ActionRow post={post} />
      {lightboxIdx !== null && (
        <MediaViewer
          post={post}
          media={urls.map((u) => ({ type: "image", uri: u }))}
          startIndex={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
        />
      )}
    </View>
  );
}

// ─── Video card ───────────────────────────────────────────────────────────────
