import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform, type TextStyle } from "react-native";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";

// ─── Font picker presets ─────────────────────────────────────────────────────
// Resolves the named overlay font into a real React Native TextStyle. The
// fonts marked with explicit fontFamily are loaded in app/_layout.tsx; the
// rest fall back to platform defaults so they always render.
export const OVERLAY_FONTS = ["default", "heavy", "serif", "script", "mono"] as const;
export type OverlayFont = (typeof OVERLAY_FONTS)[number];

export function fontStyleFor(name: string | null | undefined): TextStyle {
  switch (name) {
    case "heavy":
      return { fontFamily: "Inter_900Black" };
    case "serif":
      return { fontFamily: Platform.OS === "ios" ? "Georgia" : "serif", fontStyle: "italic" };
    case "script":
      return { fontFamily: "Pacifico_400Regular" };
    case "mono":
      return { fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" };
    default:
      return { fontWeight: "800" };
  }
}

export const OVERLAY_COLORS = ["#FFFFFF", "#0D0D0D", "#AB00FF", "#FF6B35", "#CAFF00", "#FF3050", "#00C2FF"] as const;

export type MusicStoryCardSong = {
  id: string;
  name: string;
  artist: string;
  albumArt: string | null;
};

export type MusicStoryCardAuthor = {
  username: string;
  display_name?: string | null;
  avatar_url?: string | null;
};

type Props = {
  design: number;                // 0 | 1 | 2
  song: MusicStoryCardSong;
  author: MusicStoryCardAuthor;
  size: number;                  // outer width (height = width for 1:1)
  /** Show viewer-only buttons (Add to playlist / Share). Composer hides these. */
  showActions?: boolean;
  liked?: boolean;
  onAddToPlaylist?: () => void;
  onShare?: () => void;
  onLike?: () => void;
  // Optional caption overlay drawn centered on top of the card artwork
  overlayText?: string | null;
  overlayFont?: string | null;
  overlayColor?: string | null;
};

/**
 * Three card designs for music stories — minimal/light, dark hero, and
 * profile-header w/ liked + actions, modelled on the reference image.
 * The same component renders both in the composer (showActions=false) and the
 * viewer (showActions=true).
 */
export function MusicStoryCard({
  design,
  song,
  author,
  size,
  showActions = false,
  liked = false,
  onAddToPlaylist,
  onShare,
  onLike,
  overlayText,
  overlayFont,
  overlayColor,
}: Props) {
  const overlay = overlayText && overlayText.trim().length > 0 ? (
    <OverlayCaption text={overlayText} font={overlayFont} color={overlayColor} size={size} />
  ) : null;

  if (design === 0) return <DesignMinimal song={song} size={size} showActions={showActions} onAddToPlaylist={onAddToPlaylist} onShare={onShare} overlay={overlay} />;
  if (design === 1) return <DesignDarkHero song={song} size={size} showActions={showActions} onAddToPlaylist={onAddToPlaylist} onShare={onShare} overlay={overlay} />;
  return <DesignProfileHeader song={song} author={author} size={size} showActions={showActions} liked={liked} onAddToPlaylist={onAddToPlaylist} onShare={onShare} onLike={onLike} overlay={overlay} />;
}

function OverlayCaption({ text, font, color, size }: { text: string; font?: string | null; color?: string | null; size: number }) {
  const fontStyle = fontStyleFor(font);
  // Scale font size with the card so the same caption looks right in both
  // the small thumbnail picker and the large viewer.
  const fs = Math.max(14, Math.round(size * 0.075));
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { alignItems: "center", justifyContent: "center", padding: 24 }]}>
      <Text
        style={[
          { color: color || "#fff", fontSize: fs, textAlign: "center", lineHeight: fs * 1.15, textShadowColor: "rgba(0,0,0,0.55)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 },
          fontStyle,
        ]}
        numberOfLines={4}
      >
        {text}
      </Text>
    </View>
  );
}

// ─── 1. Minimal white card ────────────────────────────────────────────────────
function DesignMinimal({
  song, size, showActions, onAddToPlaylist, onShare, overlay,
}: { song: MusicStoryCardSong; size: number; showActions: boolean; onAddToPlaylist?: () => void; onShare?: () => void; overlay?: React.ReactNode }) {
  return (
    <View style={[s.card, { width: size, height: size, backgroundColor: "#fff" }]}>
      <View style={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: 12 }}>
        <Text style={[s.minName, { color: "#0D0D0D" }]} numberOfLines={1}>{song.name}</Text>
        <Text style={[s.minSubtitle, { color: "rgba(0,0,0,0.45)" }]} numberOfLines={1}>{song.artist}</Text>
      </View>
      <View style={{ paddingHorizontal: 18, flex: 1 }}>
        <View style={{ flex: 1, borderRadius: 18, overflow: "hidden", backgroundColor: "#f1f1f1", justifyContent: "flex-end" }}>
          {song.albumArt
            ? <Image source={{ uri: song.albumArt }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
            : <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "#e5e5e5", alignItems: "center", justifyContent: "center" }]}>
                <FontAwesome5 name="music" size={28} color="rgba(0,0,0,0.2)" />
              </View>}
          <View style={{ padding: 12, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
            <View style={{ flex: 1 }} />
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="arrow-up" size={18} color="#0D0D0D" style={{ transform: [{ rotate: "45deg" }] }} />
            </View>
          </View>
          {overlay}
        </View>
      </View>
      <View style={{ height: 18 }} />
      {showActions && (
        <View style={{ position: "absolute", left: 18, right: 18, bottom: 18, flexDirection: "row", gap: 10 }}>
          <TouchableOpacity activeOpacity={0.85} style={[s.actionBtn, { backgroundColor: "rgba(0,0,0,0.06)" }]} onPress={onAddToPlaylist}>
            <Ionicons name="add-circle-outline" size={16} color="#0D0D0D" />
            <Text style={[s.actionBtnTxt, { color: "#0D0D0D" }]}>Add to playlist</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.85} style={[s.actionBtn, { backgroundColor: "#0D0D0D" }]} onPress={onShare}>
            <Ionicons name="share-outline" size={16} color="#fff" />
            <Text style={[s.actionBtnTxt, { color: "#fff" }]}>Share</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── 2. Dark hero card (image dominates, CTA at bottom) ──────────────────────
function DesignDarkHero({
  song, size, showActions, onAddToPlaylist, onShare, overlay,
}: { song: MusicStoryCardSong; size: number; showActions: boolean; onAddToPlaylist?: () => void; onShare?: () => void; overlay?: React.ReactNode }) {
  return (
    <View style={[s.card, { width: size, height: size, backgroundColor: "#0D0D0D" }]}>
      <View style={{ flex: 1, margin: 14, borderRadius: 22, overflow: "hidden", backgroundColor: "#1a1a1a" }}>
        {song.albumArt
          ? <Image source={{ uri: song.albumArt }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
          : <View style={[StyleSheet.absoluteFillObject, { alignItems: "center", justifyContent: "center" }]}>
              <FontAwesome5 name="music" size={36} color="rgba(255,255,255,0.2)" />
            </View>}
        {overlay}
      </View>
      <View style={{ paddingHorizontal: 20, paddingBottom: 18, alignItems: "center" }}>
        <Text style={[s.heroTitle]} numberOfLines={1}>{song.name}</Text>
        <Text style={[s.heroSub]} numberOfLines={2}>{song.artist}</Text>
        {showActions ? (
          <View style={{ flexDirection: "row", gap: 10, marginTop: 14, alignSelf: "stretch" }}>
            <TouchableOpacity style={[s.heroPill, { backgroundColor: "rgba(255,255,255,0.12)" }]} activeOpacity={0.85} onPress={onAddToPlaylist}>
              <Ionicons name="add" size={14} color="#fff" />
              <Text style={s.heroPillTxt}>Add to playlist</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.heroPill, { backgroundColor: "#fff" }]} activeOpacity={0.85} onPress={onShare}>
              <Ionicons name="share-outline" size={14} color="#0D0D0D" />
              <Text style={[s.heroPillTxt, { color: "#0D0D0D" }]}>Share</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[s.heroPill, { backgroundColor: "rgba(255,255,255,0.12)", marginTop: 14, alignSelf: "center" }]}>
            <Text style={s.heroPillTxt}>Now playing</Text>
            <Ionicons name="arrow-up" size={12} color="#fff" style={{ transform: [{ rotate: "45deg" }] }} />
          </View>
        )}
      </View>
    </View>
  );
}

// ─── 3. Profile-header card (avatar + handle + liked icon, actions below) ────
function DesignProfileHeader({
  song, author, size, showActions, liked, onAddToPlaylist, onShare, onLike, overlay,
}: {
  song: MusicStoryCardSong;
  author: MusicStoryCardAuthor;
  size: number;
  showActions: boolean;
  liked: boolean;
  onAddToPlaylist?: () => void;
  onShare?: () => void;
  onLike?: () => void;
  overlay?: React.ReactNode;
}) {
  const initials = (author.display_name || author.username || "?").trim().slice(0, 1).toUpperCase();
  return (
    <View style={[s.card, { width: size, height: size, backgroundColor: "#fff" }]}>
      {/* Top: dark header band with avatar/handle/like */}
      <View style={{ backgroundColor: "#1a1a1a", padding: 14, flexDirection: "row", alignItems: "center", gap: 10 }}>
        {author.avatar_url
          ? <Image source={{ uri: author.avatar_url }} style={{ width: 38, height: 38, borderRadius: 19 }} />
          : <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: "#AB00FF", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "#fff", fontWeight: "800" }}>{initials}</Text>
            </View>}
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 14 }} numberOfLines={1}>
            {author.display_name || author.username || "anon"}
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }} numberOfLines={1}>
            @{author.username || "anon"}
          </Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={showActions ? onLike : undefined}
          style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: liked ? "#FF3050" : "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name={liked ? "heart" : "heart-outline"} size={16} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Middle: artwork */}
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        {song.albumArt
          ? <Image source={{ uri: song.albumArt }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
          : <View style={[StyleSheet.absoluteFillObject, { alignItems: "center", justifyContent: "center" }]}>
              <FontAwesome5 name="music" size={36} color="rgba(255,255,255,0.18)" />
            </View>}
        {overlay}
      </View>

      {/* Bottom: action buttons (viewer only) or song meta (composer) */}
      {showActions ? (
        <View style={{ padding: 12, gap: 8 }}>
          <TouchableOpacity activeOpacity={0.85} onPress={onAddToPlaylist} style={[s.profileBtn, { backgroundColor: "#f1f1f1" }]}>
            <Ionicons name="add-circle-outline" size={16} color="#0D0D0D" />
            <Text style={[s.profileBtnTxt, { color: "#0D0D0D" }]}>Add to playlist</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.85} onPress={onShare} style={[s.profileBtn, { backgroundColor: "#0D0D0D" }]}>
            <Text style={[s.profileBtnTxt, { color: "#fff" }]}>Share Track</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ padding: 14 }}>
          <Text style={{ color: "#0D0D0D", fontWeight: "800", fontSize: 14 }} numberOfLines={1}>{song.name}</Text>
          <Text style={{ color: "rgba(0,0,0,0.5)", fontSize: 12, marginTop: 2 }} numberOfLines={1}>{song.artist}</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 28, overflow: "hidden" },

  minName:     { fontSize: 18, fontWeight: "800", letterSpacing: -0.4 },
  minSubtitle: { fontSize: 12, marginTop: 2 },

  heroTitle: { color: "#fff", fontWeight: "800", fontSize: 16, marginTop: 6, letterSpacing: -0.3 },
  heroSub:   { color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 4, textAlign: "center", lineHeight: 16 },
  heroPill:  { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center", flex: 1 },
  heroPillTxt: { color: "#fff", fontSize: 12, fontWeight: "700" },

  actionBtn:    { flex: 1, paddingVertical: 10, borderRadius: 999, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  actionBtnTxt: { fontSize: 12, fontWeight: "700" },

  profileBtn:    { borderRadius: 14, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  profileBtnTxt: { fontSize: 13, fontWeight: "700" },
});
