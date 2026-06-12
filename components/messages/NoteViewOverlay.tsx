import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Modal, Pressable, Image } from "react-native";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { openSpotifyLink } from "../../lib/spotify";
import { type Note } from "../../services/notes";

// Full view of a single note — opened by tapping a note in the strip so the
// reader can see the whole thing (untruncated text, or the song with art).
export function NoteViewOverlay({ note, onClose }: { note: Note; onClose: () => void }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 240 }).start();
  }, []);

  const close = () => {
    Animated.timing(anim, { toValue: 0, duration: 160, useNativeDriver: true }).start(onClose);
  };

  const name = note.isMe ? "Your note" : (note.display_name || note.username || "anon");
  const initial = (note.display_name || note.username || "?").trim().slice(0, 1).toUpperCase();

  // "Xh left" / "Xm left" until expiry.
  const minsLeft = Math.max(0, Math.floor((new Date(note.expires_at).getTime() - Date.now()) / 60_000));
  const timeLeft = minsLeft >= 60 ? `${Math.floor(minsLeft / 60)}h left` : `${minsLeft}m left`;

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });

  return (
    <Modal transparent animationType="none" statusBarTranslucent onRequestClose={close}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.7)", opacity: anim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
      </Animated.View>

      <View style={s.center} pointerEvents="box-none">
        <Animated.View style={[s.card, { opacity: anim, transform: [{ scale }] }]}>
          {/* Author */}
          <View style={s.authorRow}>
            {note.avatar_url ? (
              <Image source={{ uri: note.avatar_url }} style={s.avatar} />
            ) : (
              <View style={[s.avatar, s.avatarFallback]}>
                <Text style={s.avatarInitials}>{initial}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={s.authorName} numberOfLines={1}>{name}</Text>
              <Text style={s.timeLeft}>{timeLeft}</Text>
            </View>
            <TouchableOpacity onPress={close} hitSlop={12}>
              <Ionicons name="close" size={22} color="rgba(255,255,255,0.55)" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          {note.type === "song" ? (
            <View style={s.songWrap}>
              {note.song_album_art ? (
                <Image source={{ uri: note.song_album_art }} style={s.songArt} />
              ) : (
                <View style={[s.songArt, s.artFallback]}>
                  <FontAwesome5 name="music" size={28} color="rgba(255,255,255,0.3)" />
                </View>
              )}
              <Text style={s.songName} numberOfLines={2}>{note.song_name}</Text>
              {!!note.song_artist && <Text style={s.songArtist} numberOfLines={1}>{note.song_artist}</Text>}
              {!!note.song_id && (
                <TouchableOpacity
                  style={s.openBtn}
                  activeOpacity={0.85}
                  onPress={() => openSpotifyLink(`spotify:track:${note.song_id}`, `https://open.spotify.com/track/${note.song_id}`)}
                >
                  <FontAwesome5 name="spotify" size={14} color="#fff" />
                  <Text style={s.openBtnText}>Open in Spotify</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={[s.textBubble, note.color ? { backgroundColor: note.color } : null]}>
              <Text style={s.textBig}>{note.text}</Text>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#15121A",
    borderRadius: 24,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    padding: 18,
  },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 11, marginBottom: 16 },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  avatarFallback: { backgroundColor: "rgba(171,0,255,0.18)", alignItems: "center", justifyContent: "center" },
  avatarInitials: { fontSize: 16, fontWeight: "800", color: "#AB00FF" },
  authorName: { color: "#fff", fontSize: 15, fontWeight: "800" },
  timeLeft: { color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 2 },

  // Text note
  textBubble: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 18,
    paddingHorizontal: 18, paddingVertical: 22,
    alignItems: "center",
  },
  textBig: { color: "#fff", fontSize: 20, fontWeight: "700", textAlign: "center", lineHeight: 26 },

  // Song note
  songWrap: { alignItems: "center", paddingVertical: 4 },
  songArt: { width: 132, height: 132, borderRadius: 12, marginBottom: 14 },
  artFallback: { backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" },
  songName: { color: "#fff", fontSize: 17, fontWeight: "800", textAlign: "center" },
  songArtist: { color: "rgba(255,255,255,0.55)", fontSize: 14, marginTop: 3, textAlign: "center" },
  openBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginTop: 16,
    backgroundColor: "#1DB954",
    borderRadius: 22, paddingHorizontal: 20, paddingVertical: 11,
  },
  openBtnText: { color: "#fff", fontSize: 14, fontWeight: "800" },
});
