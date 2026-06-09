import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { MusicStoryCard } from "../components/stories/MusicStoryCard";
import { SW } from "../lib/feed/dimensions";

const CARD_SIZE = Math.min(SW - 80, 320);

export default function StoryCardPickerScreen() {
  const router = useRouter();
  const { songId, songName, songArtist, songAlbumArt } = useLocalSearchParams<{
    songId: string; songName: string; songArtist: string; songAlbumArt?: string;
  }>();

  const [design, setDesign] = useState<number>(0);
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

  const goNext = () => {
    router.push({
      pathname: "/story-text-editor",
      params: {
        songId: song.id,
        songName: song.name,
        songArtist: song.artist,
        songAlbumArt: song.albumArt ?? "",
        cardDesign: String(design),
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
        <View style={s.iconBtn} />
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

      <Text style={s.helper}>Pick a card. You'll add text on the next step.</Text>

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

      <TouchableOpacity activeOpacity={0.9} onPress={goNext} disabled={!me} style={[s.postBtn, !me && { opacity: 0.6 }]}>
        <Text style={s.postBtnTxt}>Next</Text>
        <Ionicons name="arrow-forward" size={16} color="#0D0D0D" />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0D0D0D", paddingTop: 50, paddingBottom: 32 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 10 },
  iconBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  title: { color: "#fff", fontSize: 17, fontWeight: "800" },

  helper: { color: "rgba(255,255,255,0.4)", fontSize: 11, textAlign: "center", marginTop: 14, marginHorizontal: 28 },

  thumbWrap: { padding: 6, borderRadius: 18, alignItems: "center", borderWidth: 2, borderColor: "transparent", gap: 6 },
  thumbWrapActive: { borderColor: "#AB00FF" },
  thumbLabel: { color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: "700" },

  postBtn: { backgroundColor: "#fff", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginHorizontal: 16, paddingVertical: 14, borderRadius: 999 },
  postBtnTxt: { color: "#0D0D0D", fontSize: 14, fontWeight: "800" },
});
