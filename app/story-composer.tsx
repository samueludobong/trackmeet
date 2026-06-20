import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { useMusicLinkAttach } from "../hooks/useMusicLinkAttach";
import { createTextStory } from "../services/stories";
import { isLightColor } from "../lib/feed/helpers";
import { ParsedLinkChip } from "../components/feed/ParsedLinkChip";
import { KeyboardDismissView } from "../components/shared/KeyboardDismissView";
import { s } from "../assets/styles/app/story-composer";

type StoryType = "music" | "text";

export default function StoryComposerScreen() {
  const router = useRouter();
  const [type, setType] = useState<StoryType>("music");

  return (
    <KeyboardDismissView style={s.root}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn} activeOpacity={0.7}>
          <Ionicons name="close" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={s.title}>New Story</Text>
        <View style={s.iconBtn} />
      </View>

      <View style={s.tabsRow}>
        {(["music","text"] as StoryType[]).map((t) => {
          const active = type === t;
          return (
            <TouchableOpacity
              key={t}
              activeOpacity={0.8}
              onPress={() => setType(t)}
              style={[s.tab, active && s.tabActive]}
            >
              <Ionicons
                name={t === "music" ? "musical-notes" : "text"}
                size={14}
                color={active ? "#0D0D0D" : "rgba(255,255,255,0.6)"}
              />
              <Text style={[s.tabTxt, active && s.tabTxtActive]}>
                {t === "music" ? "Music" : "Text"}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {type === "music" && <MusicComposer />}
      {type === "text"  && <TextComposer />}
    </KeyboardDismissView>
  );
}

// ─── Music tab ────────────────────────────────────────────────────────────────
// Paste a streaming link (Spotify / Apple Music / YouTube / SoundCloud) and we
// resolve it via Odesli — no Spotify account required.
function MusicComposer() {
  const router = useRouter();
  const [text, setText] = useState("");
  const link = useMusicLinkAttach();

  const onContinue = () => {
    const a = link.attachedLink;
    if (!a) return;
    router.push({
      pathname: "/story-card-picker",
      params: {
        // Spotify id when Odesli matched one (enables the 30s preview); empty
        // otherwise — the story still shows the card from the metadata.
        songId: a.spotifyId ?? "",
        songName: a.name,
        songArtist: a.artist,
        songAlbumArt: a.albumArt ?? "",
      },
    });
  };

  return (
    <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 6 }}>
      <View style={s.searchWrap}>
        <Ionicons name="link-outline" size={16} color="rgba(255,255,255,0.4)" style={{ marginRight: 8 }} />
        <TextInput
          style={s.searchInput}
          placeholder="Paste a song link"
          placeholderTextColor="rgba(255,255,255,0.3)"
          value={text}
          onChangeText={(t) => { setText(t); link.detect(t, setText); }}
          editable={!link.parsingLink}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
        />
        {text.length > 0 && !link.parsingLink && (
          <TouchableOpacity onPress={() => { setText(""); link.removeAttachedLink(); }} activeOpacity={0.7}>
            <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.4)" />
          </TouchableOpacity>
        )}
      </View>

      {link.parsingLink || link.attachedLink ? (
        <View style={{ marginTop: 16 }}>
          <ParsedLinkChip
            parsingLink={link.parsingLink}
            attachedLink={link.attachedLink}
            onRemove={() => { link.removeAttachedLink(); setText(""); }}
          />
          {link.attachedLink && (
            <TouchableOpacity style={cta.btn} activeOpacity={0.85} onPress={onContinue}>
              <Text style={cta.txt}>Continue</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={{ alignItems: "center", marginTop: 44, paddingHorizontal: 24 }}>
          <Ionicons name="musical-notes" size={30} color="rgba(255,255,255,0.25)" />
          <Text style={s.connectTitle}>Share any song</Text>
          <Text style={s.connectSub}>Paste a link from Spotify, Apple Music, YouTube or SoundCloud to add it to your story.</Text>
        </View>
      )}
    </View>
  );
}

const cta = StyleSheet.create({
  btn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#AB00FF", borderRadius: 14, paddingVertical: 14, marginTop: 16,
  },
  txt: { color: "#fff", fontSize: 15, fontWeight: "700" },
});

// ─── Text tab ─────────────────────────────────────────────────────────────────
const BG_COLORS = ["#AB00FF", "#1DB954", "#FF3CAC", "#FF6C1A", "#2D6CDF", "#E11D48", "#0D0D0D", "#F5F5F5"];

function TextComposer() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [bg, setBg]     = useState(BG_COLORS[0]);
  const [posting, setPosting] = useState(false);
  const fg = isLightColor(bg) ? "#0D0D0D" : "#FFFFFF";

  const post = async () => {
    const t = text.trim();
    if (!t || posting) return;
    setPosting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setPosting(false); return; }
      await createTextStory({ userId: user.id, text: t, bgColor: bg, fgColor: fg });
      router.back();
    } catch {
      setPosting(false);
    }
  };

  return (
    <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 6 }}>
      {/* Live preview — type directly on the chosen background */}
      <View style={{ flex: 1, borderRadius: 20, backgroundColor: bg, alignItems: "center", justifyContent: "center", padding: 24, marginBottom: 16 }}>
        <TextInput
          style={{ color: fg, fontSize: 24, fontWeight: "700", textAlign: "center", width: "100%" }}
          placeholder="Type something…"
          placeholderTextColor={fg === "#FFFFFF" ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)"}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={250}
          autoFocus
        />
      </View>

      {/* Background swatches */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center", marginBottom: 16 }}>
        {BG_COLORS.map((c) => (
          <TouchableOpacity
            key={c}
            activeOpacity={0.8}
            onPress={() => setBg(c)}
            style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c, borderWidth: bg === c ? 2 : StyleSheet.hairlineWidth, borderColor: bg === c ? "#fff" : "rgba(255,255,255,0.2)" }}
          />
        ))}
      </View>

      <TouchableOpacity
        style={[cta.btn, (!text.trim() || posting) && { opacity: 0.5 }]}
        activeOpacity={0.85}
        onPress={post}
        disabled={!text.trim() || posting}
      >
        {posting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Text style={cta.txt}>Share to story</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}
