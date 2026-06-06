import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../../lib/supabase";
import { openSpotifyLink } from "../../lib/spotify";
import { isTrackInAnyPlaylist } from "../../services/playlists";
import { styles } from "../../lib/feed/styles";
import { AddToPlaylistSheet } from "../../components/AddToPlaylistSheet";
import { ActionRow } from "../../components/post/ActionRow";
import { PostHeader } from "../../components/post/PostHeader";
import { PostText } from "../../components/post/TextCard";
import { type Post } from "../../app/data/mock";

export function MusicCard({ post }: { post: Post }) {
  const accent = post.albumAccent ?? "#AB00FF";
  const bg     = post.albumColor  ?? "#111";
  const [saved,      setSaved]      = useState(false);
  const [userId,     setUserId]     = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!post.songId) return;
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      setUserId(user?.id ?? null);
      if (user) setSaved(await isTrackInAnyPlaylist(user.id, post.songId!));
    })();
    return () => { active = false; };
  }, [post.songId]);

  const handleOpen = () => {
    if (!post.songId) return;
    openSpotifyLink(
      `spotify:track:${post.songId}`,
      `https://open.spotify.com/track/${post.songId}`,
    );
  };

  const handleSave = () => { if (post.songId && userId) setPickerOpen(true); };

  return (
    <View style={styles.card}>
      <PostHeader post={post} />
      {post.text && <PostText text={post.text} />}

      <View style={[styles.musicPlayerCard, { backgroundColor: bg }]}>
        {/* Art — song info overlaid at bottom */}
        <View style={styles.musicArtArea}>
          {post.albumArt ? (
            <Image source={{ uri: post.albumArt }} style={styles.musicArtFill} resizeMode="cover" />
          ) : (
            <View style={[styles.musicArtFill, { backgroundColor: accent + "28" }]}>
              <Text style={styles.musicArtEmoji}>🎵</Text>
            </View>
          )}

          {/* Bottom scrim + song info */}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.72)"]}
            style={styles.musicInfoOverlay}
            pointerEvents="none"
          />
          <View style={styles.musicInfoText} pointerEvents="none">
            <Text style={styles.musicSongTitle} numberOfLines={1}>{post.song}</Text>
            <Text style={styles.musicArtistName} numberOfLines={1}>{post.artist}</Text>
          </View>

          {/* Top-right: open in Spotify + save to Liked Songs */}
          <View style={styles.musicTopRight}>
            <TouchableOpacity
              style={[styles.musicGlassBtn, { backgroundColor: "rgb(0, 0, 0)", borderColor: "rgba(255, 255, 255, 0.93)" }]}
              activeOpacity={0.8}
              onPress={handleSave}
            >
              <Ionicons
                name={saved ? "checkmark-circle" : "add"}
                size={17}
                color={saved ? "#1DB954" : "#fff"}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.musicGlassBtn, { backgroundColor: "rgb(0, 0, 0)", borderColor: "rgba(255, 255, 255, 0.93)" }]}
              activeOpacity={0.8}
              onPress={handleOpen}
              disabled={!post.songId}
            >
              <FontAwesome5 name="spotify" size={17} color="#1DB954" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ActionRow post={post} />

      <AddToPlaylistSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        userId={userId}
        track={post.songId ? {
          id: post.songId, name: post.song ?? "", artist: post.artist ?? null, albumArt: post.albumArt ?? null,
        } : null}
        onSavedChange={setSaved}
      />
    </View>
  );
}

// ─── Poll card ────────────────────────────────────────────────────────────────
