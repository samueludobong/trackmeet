import React, { useEffect, useMemo, useState } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet, Alert,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { createMusicStory } from "../services/stories";
import {
  MusicStoryCard,
  OVERLAY_FONTS,
  OVERLAY_COLORS,
  fontStyleFor,
} from "../components/stories/MusicStoryCard";
import { SW } from "../lib/feed/dimensions";
import { KeyboardDismissView } from "../components/shared/KeyboardDismissView";

const CARD_SIZE = Math.min(SW - 80, 320);

export default function StoryTextEditorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    songId: string; songName: string; songArtist: string; songAlbumArt?: string;
    cardDesign?: string;
  }>();

  const design = Number(params.cardDesign ?? 0) || 0;

  const [me, setMe] = useState<{ id: string; username: string; display_name: string | null; avatar_url: string | null } | null>(null);
  const [text, setText]   = useState("");
  const [font, setFont]   = useState<string>("default");
  const [color, setColor] = useState<string>("#FFFFFF");
  const [posting, setPosting] = useState(false);

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
    () => ({
      id: String(params.songId),
      name: String(params.songName),
      artist: String(params.songArtist),
      albumArt: params.songAlbumArt ? String(params.songAlbumArt) : null,
    }),
    [params.songId, params.songName, params.songArtist, params.songAlbumArt],
  );

  const handlePost = async () => {
    if (!me || posting) return;
    setPosting(true);
    try {
      await createMusicStory({
        userId: me.id,
        cardDesign: design,
        songId: song.id,
        songName: song.name,
        songArtist: song.artist,
        songAlbumArt: song.albumArt,
        overlayText:  text.trim() || null,
        overlayFont:  text.trim() ? font  : null,
        overlayColor: text.trim() ? color : null,
      });
      router.dismissAll();
    } catch (e: any) {
      Alert.alert("Couldn't post story", e?.message ?? "Try again.");
      setPosting(false);
    }
  };

  return (
    <KeyboardDismissView style={{ flex: 1, backgroundColor: "#0D0D0D" }}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={s.title}>Add text</Text>
        <View style={s.iconBtn} />
      </View>

      <View style={{ alignItems: "center", marginTop: 8 }}>
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
          overlayText={text}
          overlayFont={font}
          overlayColor={color}
        />
      </View>

      <View style={s.inputWrap}>
        <TextInput
          placeholder="Add a caption…"
          placeholderTextColor="rgba(255,255,255,0.3)"
          value={text}
          onChangeText={setText}
          style={[s.input, fontStyleFor(font), { color }]}
          multiline
          maxLength={120}
        />
      </View>

      <Text style={s.label}>Font</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.fontsRow}>
        {OVERLAY_FONTS.map((f) => {
          const active = f === font;
          return (
            <TouchableOpacity key={f} activeOpacity={0.8} onPress={() => setFont(f)} style={[s.fontChip, active && s.fontChipActive]}>
              <Text style={[s.fontChipTxt, active && s.fontChipTxtActive, fontStyleFor(f)]}>Aa</Text>
              <Text style={[s.fontChipLabel, active && { color: "#0D0D0D" }]}>
                {f === "default" ? "Sans" : f === "heavy" ? "Heavy" : f === "serif" ? "Serif" : f === "script" ? "Script" : "Mono"}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Text style={s.label}>Color</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.colorsRow}>
        {OVERLAY_COLORS.map((c) => {
          const active = c === color;
          return (
            <TouchableOpacity
              key={c}
              activeOpacity={0.85}
              onPress={() => setColor(c)}
              style={[s.swatch, { backgroundColor: c, borderColor: active ? "#fff" : "rgba(255,255,255,0.15)", borderWidth: active ? 3 : 1 }]}
            />
          );
        })}
      </ScrollView>

      <View style={{ flex: 1 }} />

      <TouchableOpacity activeOpacity={0.9} onPress={handlePost} disabled={posting || !me} style={[s.postBtn, (!me || posting) && { opacity: 0.6 }]}>
        {posting ? <ActivityIndicator color="#0D0D0D" /> : (
          <>
            <Text style={s.postBtnTxt}>Share to your story</Text>
            <Ionicons name="arrow-forward" size={16} color="#0D0D0D" />
          </>
        )}
      </TouchableOpacity>
    </KeyboardDismissView>
  );
}

const s = StyleSheet.create({
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 50, paddingBottom: 10 },
  iconBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  title:   { color: "#fff", fontSize: 17, fontWeight: "800" },

  inputWrap: { marginHorizontal: 16, marginTop: 18, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", paddingHorizontal: 14, paddingVertical: 10 },
  input:     { minHeight: 44, fontSize: 16 },

  label:     { color: "rgba(255,255,255,0.45)", fontSize: 11, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase", marginTop: 18, marginBottom: 8, marginHorizontal: 16 },

  fontsRow:  { paddingHorizontal: 16, gap: 8 },
  fontChip:  { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", alignItems: "center", minWidth: 64 },
  fontChipActive: { backgroundColor: "#fff", borderColor: "#fff" },
  fontChipTxt:    { color: "#fff", fontSize: 16 },
  fontChipTxtActive: { color: "#0D0D0D" },
  fontChipLabel:  { color: "rgba(255,255,255,0.6)", fontSize: 10, fontWeight: "700", marginTop: 2 },

  colorsRow: { paddingHorizontal: 16, gap: 12, alignItems: "center" },
  swatch:    { width: 30, height: 30, borderRadius: 15 },

  postBtn:   { backgroundColor: "#fff", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginHorizontal: 16, marginBottom: 32, paddingVertical: 14, borderRadius: 999 },
  postBtnTxt:{ color: "#0D0D0D", fontSize: 14, fontWeight: "800" },
});
