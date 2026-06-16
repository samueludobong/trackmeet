import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { MusicStoryCard } from "../components/stories/MusicStoryCard";
import { useStoryAudioPool } from "../hooks/useStoryAudioPool";
import { SW } from "../lib/feed/dimensions";
import { s } from "../assets/styles/app/story-card-picker";

const CARD_SIZE = Math.min(SW - 80, 320);
// Stable empty preload window so the audio pool effect doesn't churn each render.
const NO_PRELOAD: string[] = [];

export default function StoryCardPickerScreen() {
  const router = useRouter();
  const { songId, songName, songArtist, songAlbumArt } = useLocalSearchParams<{
    songId: string; songName: string; songArtist: string; songAlbumArt?: string;
  }>();

  const [design, setDesign] = useState<number>(0);
  const [durationSec, setDurationSec] = useState<number>(5);
  const [muted, setMuted] = useState(false);
  const [me, setMe] = useState<{ id: string; username: string; display_name: string | null; avatar_url: string | null } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("users")
        .select("id, username, display_name, avatar_url")
        .eq("id", user.id)
        .single();
      if (data) setMe(data as any);
    })();
  }, []);

  const song = useMemo(
    () => ({ id: String(songId), name: String(songName), artist: String(songArtist), albumArt: songAlbumArt ? String(songAlbumArt) : null }),
    [songId, songName, songArtist, songAlbumArt],
  );

  // Preview the song while picking a style, so you hear what you're posting.
  // Pause when this screen is backgrounded (e.g. the canvas is pushed on top)
  // so its audio doesn't double with the next screen's.
  const [focused, setFocused] = useState(true);
  useFocusEffect(useCallback(() => { setFocused(true); return () => setFocused(false); }, []));
  useStoryAudioPool({ activeSongId: songId ? song.id : null, preloadSongIds: NO_PRELOAD, paused: !focused, muted });

  const goNext = () => {
    router.push({
      pathname: "/story-canvas",
      params: {
        songId: song.id,
        songName: song.name,
        songArtist: song.artist,
        songAlbumArt: song.albumArt ?? "",
        cardDesign: String(design),
        durationMs: String(durationSec * 1000),
      },
    });
  };

  return (
    <View style={s.root}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={s.title}>Pick a card</Text>
        <TouchableOpacity onPress={() => setMuted((m) => !m)} style={s.iconBtn} activeOpacity={0.7}>
          <Ionicons name={muted ? "volume-mute" : "volume-high"} size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={{ alignItems: "center", marginTop: 14 }}>
        <MusicStoryCard
          design={design}
          song={song}
          author={{
            username: me?.username ?? "you",
            display_name: me?.display_name ?? null,
            avatar_url: me?.avatar_url ?? null,
          }}
          size={CARD_SIZE}
          showActions={false}
        />
      </View>

      <Text style={s.helper}>Pick a card. You&apos;ll arrange and customize it on the canvas next.</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 6 }}
        style={{ marginTop: 22 }}
      >
        {[0, 1, 2].map((d) => {
          const active = design === d;
          return (
            <TouchableOpacity key={d} activeOpacity={0.85} onPress={() => setDesign(d)} style={[s.thumbWrap, active && s.thumbWrapActive]}>
              <MusicStoryCard
                design={d}
                song={song}
                author={{
                  username: me?.username ?? "you",
                  display_name: me?.display_name ?? null,
                  avatar_url: me?.avatar_url ?? null,
                }}
                size={110}
                showActions={false}
              />
              <Text style={[s.thumbLabel, active && { color: "#fff" }]}>
                {d === 0 ? "Minimal" : d === 1 ? "Hero" : "Profile"}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={{ flex: 1 }} />

      {/* Duration selector — how long the story shows. */}
      <Text style={s.durationLabel}>Duration</Text>
      <View style={s.durationRow}>
        {[5, 15, 30].map((sec) => {
          const active = durationSec === sec;
          return (
            <TouchableOpacity
              key={sec}
              activeOpacity={0.85}
              onPress={() => setDurationSec(sec)}
              style={[s.durationChip, active && s.durationChipActive]}
            >
              <Text style={[s.durationChipTxt, active && { color: "#fff" }]}>{sec}s</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity activeOpacity={0.9} onPress={goNext} disabled={!me} style={[s.postBtn, !me && { opacity: 0.6 }]}>
        <Text style={s.postBtnTxt}>Next</Text>
        <Ionicons name="arrow-forward" size={16} color="#0D0D0D" />
      </TouchableOpacity>
    </View>
  );
}
