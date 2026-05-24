import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { FontAwesome5 } from "@expo/vector-icons";
import { useNowPlaying, type NowPlayingTrack } from "../lib/useNowPlaying";
import { openSpotifyLink, searchSpotifyTracks, type SpotifyTrackResult } from "../lib/spotify";
import { supabase } from "../lib/supabase";
import * as ImagePicker from "expo-image-picker";

const BANNER_H = 172;
const AVATAR_SIZE = 86;
const AVATAR_OVERLAP = Math.round(AVATAR_SIZE * 0.44);

// ─── Now Playing card ────────────────────────────────────────────────────────

type NowPlayingCardProps = {
  track: NowPlayingTrack | null;
  liveProgressMs: number;
  gradient: [string, string, string];
  loading: boolean;
  needsReconnect: boolean;
  reconnect: () => void;
};

function NowPlayingCard({
  track,
  liveProgressMs,
  gradient,
  loading,
  needsReconnect,
  reconnect,
}: NowPlayingCardProps) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!track?.isPlaying) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.3, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [track?.isPlaying]);

  if (loading) return null;

  if (needsReconnect) {
    return (
      <View style={npStyles.card}>
        <View style={npStyles.header}>
          <FontAwesome5 name="spotify" size={13} color="#1DB954" />
          <Text style={[npStyles.label, { flex: 1 }]}>SPOTIFY</Text>
        </View>
        <TouchableOpacity style={npStyles.reconnectBtn} activeOpacity={0.8} onPress={reconnect}>
          <FontAwesome5 name="spotify" size={14} color="#fff" />
          <Text style={npStyles.reconnectText}>Reconnect Spotify</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!track?.isPlaying) return null;

  const progress = track.durationMs > 0 ? liveProgressMs / track.durationMs : 0;
  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={() => openSpotifyLink(`spotify:track:${track.id}`, `https://open.spotify.com/track/${track.id}`)}
    >
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={npStyles.card}>
        <View style={npStyles.header}>
          <Animated.View style={[npStyles.dot, { opacity: pulse }]} />
          <Text style={npStyles.label}>LISTENING NOW</Text>
          <FontAwesome5 name="spotify" size={13} color="#1DB954" />
        </View>
        <View style={npStyles.body}>
          {track.albumArt ? (
            <Image source={{ uri: track.albumArt }} style={npStyles.albumArt} />
          ) : (
            <View style={[npStyles.albumArt, npStyles.albumArtFallback]}>
              <FontAwesome5 name="music" size={18} color="rgba(255,255,255,0.3)" />
            </View>
          )}
          <View style={npStyles.info}>
            <Text style={npStyles.trackName} numberOfLines={1}>{track.name}</Text>
            <Text style={npStyles.artistName} numberOfLines={1}>{track.artist}</Text>
            <View style={npStyles.progressTrack}>
              <View style={[npStyles.progressFill, { width: `${progress * 100}%` as any }]} />
            </View>
            <View style={npStyles.progressTimes}>
              <Text style={npStyles.timeText}>{fmt(liveProgressMs)}</Text>
              <Text style={npStyles.timeText}>{fmt(track.durationMs)}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ─── Song Search Overlay ──────────────────────────────────────────────────────

type PinnedSong = {
  id: string;
  name: string;
  artist: string;
  albumArt: string | null;
};

type SongSearchOverlayProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (song: PinnedSong) => void;
  accessToken: string | null;
};

function SongSearchOverlay({ visible, onClose, onSelect, accessToken }: SongSearchOverlayProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotifyTrackResult[]>([]);
  const [searching, setSearching] = useState(false);
  const slideAnim = useRef(new Animated.Value(500)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 200 }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 500, duration: 200, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
      setQuery("");
      setResults([]);
    }
  }, [visible]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!query.trim() || !accessToken) { setResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      const res = await searchSpotifyTracks(accessToken, query.trim());
      setResults(res);
      setSearching(false);
    }, 450);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [query, accessToken]);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, ssStyles.backdrop, { opacity: backdropAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[ssStyles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={ssStyles.handle} />
        <View style={ssStyles.header}>
          <Text style={ssStyles.title}>Pin a Song</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Text style={ssStyles.closeBtn}>✕</Text>
          </TouchableOpacity>
        </View>
        <View style={ssStyles.searchRow}>
          <FontAwesome5 name="search" size={14} color="rgba(255,255,255,0.3)" style={{ marginRight: 8 }} />
          <TextInput
            style={ssStyles.searchInput}
            placeholder="Search Spotify…"
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          {searching && <ActivityIndicator size="small" color="#1DB954" />}
        </View>
        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {results.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={ssStyles.resultRow}
              activeOpacity={0.75}
              onPress={() => {
                onSelect({ id: item.id, name: item.name, artist: item.artist, albumArt: item.albumArt });
                onClose();
              }}
            >
              {item.albumArt ? (
                <Image source={{ uri: item.albumArt }} style={ssStyles.resultArt} />
              ) : (
                <View style={[ssStyles.resultArt, ssStyles.resultArtFallback]}>
                  <FontAwesome5 name="music" size={12} color="rgba(255,255,255,0.3)" />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={ssStyles.resultTrack} numberOfLines={1}>{item.name}</Text>
                <Text style={ssStyles.resultArtist} numberOfLines={1}>{item.artist}</Text>
              </View>
              <FontAwesome5 name="chevron-right" size={11} color="rgba(255,255,255,0.2)" />
            </TouchableOpacity>
          ))}
          {!searching && query.trim() && results.length === 0 && (
            <Text style={ssStyles.emptyText}>No results for "{query}"</Text>
          )}
          {!query.trim() && (
            <Text style={ssStyles.emptyText}>Start typing to search tracks</Text>
          )}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

// ─── Edit Profile Overlay ─────────────────────────────────────────────────────

type ProfileData = {
  display_name: string;
  username: string;
  bio: string;
  avatar_url: string | null;
  pinned_song_id: string | null;
  pinned_song_name: string | null;
  pinned_song_artist: string | null;
  pinned_song_album_art: string | null;
  profile_links: string[];
};

type EditProfileOverlayProps = {
  visible: boolean;
  onClose: () => void;
  initialData: ProfileData;
  onSaved: (data: ProfileData) => void;
  accessToken: string | null;
  userId: string | null;
};

function EditProfileOverlay({ visible, onClose, initialData, onSaved, accessToken, userId }: EditProfileOverlayProps) {
  const [form, setForm] = useState<ProfileData>(initialData);
  const [saving, setSaving] = useState(false);
  const [songSearchOpen, setSongSearchOpen] = useState(false);
  const [newLink, setNewLink] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const slideAnim = useRef(new Animated.Value(800)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setForm(initialData);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 24, stiffness: 190 }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 800, duration: 250, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert("Permission needed", "Allow photo access to set a profile picture."); return; }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    if (!userId) return;
    setAvatarUploading(true);
    try {
      const uri = result.assets[0].uri;
      const ext = uri.split(".").pop() ?? "jpg";
      const fileName = `${userId}/avatar.${ext}`;

      const response = await fetch(uri);
      const blob = await response.blob();
      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
      });

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, arrayBuffer, { contentType: `image/${ext}`, upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(fileName);
      setForm((f) => ({ ...f, avatar_url: publicUrl }));
    } catch (e: any) {
      Alert.alert("Upload failed", e.message ?? "Could not upload image.");
    } finally {
      setAvatarUploading(false);
    }
  };

  const addLink = () => {
    const trimmed = newLink.trim();
    if (!trimmed) return;
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    setForm((f) => ({ ...f, profile_links: [...f.profile_links, withProtocol] }));
    setNewLink("");
  };

  const removeLink = (idx: number) => {
    setForm((f) => ({ ...f, profile_links: f.profile_links.filter((_, i) => i !== idx) }));
  };

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("users").update({
        display_name: form.display_name.trim() || null,
        username: form.username.trim() || null,
        bio: form.bio.trim() || null,
        avatar_url: form.avatar_url,
        pinned_song_id: form.pinned_song_id,
        pinned_song_name: form.pinned_song_name,
        pinned_song_artist: form.pinned_song_artist,
        pinned_song_album_art: form.pinned_song_album_art,
        profile_links: form.profile_links,
      }).eq("id", userId);

      if (error) throw error;
      onSaved(form);
      onClose();
    } catch (e: any) {
      Alert.alert("Save failed", e.message ?? "Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  const initials = form.display_name
    ? form.display_name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  return (
    <>
      <Modal transparent visible={visible} animationType="none" onRequestClose={onClose} statusBarTranslucent>
        <Animated.View style={[StyleSheet.absoluteFill, epStyles.backdrop, { opacity: backdropAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View style={[epStyles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
            {/* Header */}
            <View style={epStyles.sheetHeader}>
              <TouchableOpacity onPress={onClose} hitSlop={12}>
                <Text style={epStyles.cancelBtn}>Cancel</Text>
              </TouchableOpacity>
              <Text style={epStyles.sheetTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={save} disabled={saving} hitSlop={8}>
                {saving
                  ? <ActivityIndicator size="small" color="#FF6C1A" />
                  : <Text style={epStyles.saveBtn}>Save</Text>
                }
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              {/* ── Avatar ── */}
              <View style={epStyles.avatarSection}>
                <TouchableOpacity style={epStyles.avatarWrap} onPress={pickAvatar} activeOpacity={0.8}>
                  {avatarUploading ? (
                    <View style={[epStyles.avatarCircle, epStyles.avatarLoading]}>
                      <ActivityIndicator color="#fff" />
                    </View>
                  ) : form.avatar_url ? (
                    <Image source={{ uri: form.avatar_url }} style={epStyles.avatarCircle} />
                  ) : (
                    <View style={epStyles.avatarCircle}>
                      <Text style={epStyles.avatarInitials}>{initials}</Text>
                    </View>
                  )}
                  <View style={epStyles.avatarEditBadge}>
                    <FontAwesome5 name="camera" size={11} color="#fff" />
                  </View>
                </TouchableOpacity>
                <Text style={epStyles.avatarHint}>Tap to change photo</Text>
              </View>

              {/* ── Basic info ── */}
              <View style={epStyles.section}>
                <Text style={epStyles.sectionLabel}>DISPLAY NAME</Text>
                <TextInput
                  style={epStyles.input}
                  value={form.display_name}
                  onChangeText={(t) => setForm((f) => ({ ...f, display_name: t }))}
                  placeholder="Your name"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                />
              </View>

              <View style={epStyles.section}>
                <Text style={epStyles.sectionLabel}>USERNAME</Text>
                <TextInput
                  style={epStyles.input}
                  value={form.username}
                  onChangeText={(t) => setForm((f) => ({ ...f, username: t.replace(/\s/g, "").toLowerCase() }))}
                  placeholder="@handle"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  autoCapitalize="none"
                />
              </View>

              <View style={epStyles.section}>
                <Text style={epStyles.sectionLabel}>BIO</Text>
                <TextInput
                  style={[epStyles.input, epStyles.inputMulti]}
                  value={form.bio}
                  onChangeText={(t) => setForm((f) => ({ ...f, bio: t }))}
                  placeholder="Tell people about yourself…"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* ── Pinned song ── */}
              <View style={epStyles.section}>
                <Text style={epStyles.sectionLabel}>PINNED SONG</Text>
                <TouchableOpacity
                  style={epStyles.songRow}
                  activeOpacity={0.75}
                  onPress={() => setSongSearchOpen(true)}
                >
                  {form.pinned_song_album_art ? (
                    <Image source={{ uri: form.pinned_song_album_art }} style={epStyles.songArt} />
                  ) : (
                    <View style={[epStyles.songArt, epStyles.songArtFallback]}>
                      <FontAwesome5 name="music" size={14} color="rgba(255,255,255,0.25)" />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    {form.pinned_song_name ? (
                      <>
                        <Text style={epStyles.songName} numberOfLines={1}>{form.pinned_song_name}</Text>
                        <Text style={epStyles.songArtist} numberOfLines={1}>{form.pinned_song_artist}</Text>
                      </>
                    ) : (
                      <Text style={epStyles.songPlaceholder}>Choose a song to pin…</Text>
                    )}
                  </View>
                  <View style={epStyles.songChevronWrap}>
                    <FontAwesome5 name="search" size={12} color="rgba(255,255,255,0.35)" />
                  </View>
                </TouchableOpacity>
                {form.pinned_song_id && (
                  <TouchableOpacity
                    style={epStyles.clearBtn}
                    onPress={() => setForm((f) => ({
                      ...f,
                      pinned_song_id: null, pinned_song_name: null,
                      pinned_song_artist: null, pinned_song_album_art: null,
                    }))}
                  >
                    <Text style={epStyles.clearBtnText}>Remove pinned song</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* ── Links ── */}
              <View style={epStyles.section}>
                <Text style={epStyles.sectionLabel}>LINKS</Text>

                {form.profile_links.map((link, idx) => (
                  <View key={idx} style={epStyles.linkRow}>
                    <FontAwesome5 name="link" size={12} color="rgba(255,255,255,0.3)" style={{ marginRight: 8 }} />
                    <Text style={epStyles.linkText} numberOfLines={1}>{link}</Text>
                    <TouchableOpacity onPress={() => removeLink(idx)} hitSlop={10}>
                      <FontAwesome5 name="times" size={13} color="rgba(255,100,100,0.7)" />
                    </TouchableOpacity>
                  </View>
                ))}

                <View style={epStyles.linkInputRow}>
                  <TextInput
                    style={epStyles.linkInput}
                    value={newLink}
                    onChangeText={setNewLink}
                    placeholder="Add a link…"
                    placeholderTextColor="rgba(255,255,255,0.25)"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    onSubmitEditing={addLink}
                    returnKeyType="done"
                  />
                  <TouchableOpacity
                    style={[epStyles.addLinkBtn, !newLink.trim() && { opacity: 0.4 }]}
                    onPress={addLink}
                    disabled={!newLink.trim()}
                  >
                    <FontAwesome5 name="plus" size={12} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Animated.View>
      </Modal>

      <SongSearchOverlay
        visible={songSearchOpen}
        onClose={() => setSongSearchOpen(false)}
        accessToken={accessToken}
        onSelect={(song) => setForm((f) => ({
          ...f,
          pinned_song_id: song.id,
          pinned_song_name: song.name,
          pinned_song_artist: song.artist,
          pinned_song_album_art: song.albumArt,
        }))}
      />
    </>
  );
}

// ─── Profile screen ───────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const router = useRouter();
  const { track, liveProgressMs, gradient, loading, needsReconnect, reconnect } = useNowPlaying();

  const [editOpen, setEditOpen] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    display_name: "",
    username: "",
    bio: "",
    avatar_url: null,
    pinned_song_id: null,
    pinned_song_name: null,
    pinned_song_artist: null,
    pinned_song_album_art: null,
    profile_links: [],
  });
  const [userId, setUserId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data } = await supabase
        .from("users")
        .select(
          "display_name, username, bio, avatar_url, pinned_song_id, pinned_song_name, pinned_song_artist, pinned_song_album_art, profile_links, spotify_access_token"
        )
        .eq("id", user.id)
        .single();

      if (data) {
        setProfile({
          display_name: data.display_name ?? "",
          username: data.username ?? "",
          bio: data.bio ?? "",
          avatar_url: data.avatar_url ?? null,
          pinned_song_id: data.pinned_song_id ?? null,
          pinned_song_name: data.pinned_song_name ?? null,
          pinned_song_artist: data.pinned_song_artist ?? null,
          pinned_song_album_art: data.pinned_song_album_art ?? null,
          profile_links: data.profile_links ?? [],
        });
        setAccessToken(data.spotify_access_token ?? null);
      }
    })();
  }, []);

  const displayName = profile.display_name || "Your Name";
  const handle = profile.username ? `@${profile.username}` : "@handle";
  const initials = profile.display_name
    ? profile.display_name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* ─── Profile card ──────────────────────────────────────────── */}
          <View style={styles.card}>
            {/* Banner */}
            <View style={styles.bannerWrap}>
              <LinearGradient
                colors={["#3D0C00", "#CC4200", "#FF6C1A", "#CC4200", "#3D0C00"]}
                locations={[0, 0.25, 0.5, 0.75, 1]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
              />
              <LinearGradient colors={["transparent", "rgba(22,22,24,0.55)"]} style={StyleSheet.absoluteFill} />
              <View style={styles.bannerGlow} />

              <View style={styles.bannerActions}>
                <TouchableOpacity style={styles.socialBtn} activeOpacity={0.7}>
                  <Text style={styles.socialIcon}>𝕏</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialBtn} activeOpacity={0.7}>
                  <Text style={styles.socialIcon}>◎</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.editBtn} activeOpacity={0.85} onPress={() => setEditOpen(true)}>
                  <Text style={styles.editBtnText}>Edit Profile</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Avatar row */}
            <View style={[styles.avatarRow, { marginTop: -AVATAR_OVERLAP }]}>
              {profile.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarInitials}>{initials}</Text>
                </View>
              )}
            </View>

            {/* Info */}
            <View style={styles.infoSection}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{displayName}</Text>
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedText}>✓</Text>
                </View>
              </View>
              <Text style={styles.handle}>{handle}</Text>

              {profile.bio ? (
                <Text style={styles.bio}>{profile.bio}</Text>
              ) : (
                <Text style={[styles.bio, { color: "rgba(255,255,255,0.25)" }]}>No bio yet</Text>
              )}

              <View style={styles.statsRow}>
                <Text style={styles.statNum}>100</Text>
                <Text style={styles.statLabel}> Following</Text>
                <View style={{ width: 22 }} />
                <Text style={styles.statNum}>23.6K</Text>
                <Text style={styles.statLabel}> Followers</Text>
              </View>

              <View style={styles.metaRow}>
                {/* Pinned song meta item */}
                <TouchableOpacity
                  style={styles.metaItem}
                  activeOpacity={0.7}
                  onPress={() => setEditOpen(true)}
                >
                  <FontAwesome5 name="music" size={11} color={profile.pinned_song_id ? "#FF6C1A" : "rgba(255,255,255,0.28)"} />
                  <Text style={[styles.metaText, profile.pinned_song_id && { color: "rgba(255,255,255,0.7)" }]} numberOfLines={1}>
                    {profile.pinned_song_name ? `${profile.pinned_song_name} — ${profile.pinned_song_artist}` : "Pin a song"}
                  </Text>
                </TouchableOpacity>

                {/* Links meta item */}
                <TouchableOpacity
                  style={styles.metaItem}
                  activeOpacity={0.7}
                  onPress={() => setEditOpen(true)}
                >
                  <FontAwesome5 name="link" size={11} color={profile.profile_links.length > 0 ? "#FF6C1A" : "rgba(255,255,255,0.28)"} />
                  <Text style={[styles.metaText, profile.profile_links.length > 0 && { color: "rgba(255,255,255,0.7)" }]} numberOfLines={1}>
                    {profile.profile_links.length > 0 ? profile.profile_links[0].replace(/^https?:\/\//, "") : "Add links"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* ─── Now Playing ───────────────────────────────────────────── */}
          <NowPlayingCard
            track={track}
            liveProgressMs={liveProgressMs}
            gradient={gradient}
            loading={loading}
            needsReconnect={needsReconnect}
            reconnect={reconnect}
          />
        </ScrollView>
      </SafeAreaView>

      <EditProfileOverlay
        visible={editOpen}
        onClose={() => setEditOpen(false)}
        initialData={profile}
        userId={userId}
        accessToken={accessToken}
        onSaved={(data) => setProfile(data)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0D0D0D" },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },
  backBtn: { paddingHorizontal: 18, paddingVertical: 10 },
  backIcon: { fontSize: 32, color: "#fff", fontWeight: "300", lineHeight: 36 },
  card: {
    backgroundColor: "#161618",
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  bannerWrap: { height: BANNER_H, overflow: "hidden", position: "relative" },
  bannerGlow: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "#FF7030",
    opacity: 0.38,
    alignSelf: "center",
    top: -100,
  },
  bannerActions: {
    position: "absolute",
    bottom: 14,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  socialBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  socialIcon: { fontSize: 15, color: "#fff" },
  editBtn: {
    paddingHorizontal: 18,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  editBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  avatarRow: { paddingHorizontal: 18, paddingBottom: 12 },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: 18,
    backgroundColor: "#FF6B35",
    borderWidth: 3,
    borderColor: "#161618",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: { fontSize: 28, fontWeight: "800", color: "#fff" },
  infoSection: { paddingHorizontal: 20, paddingBottom: 26 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 3 },
  name: { fontSize: 21, fontWeight: "800", color: "#ffffff" },
  verifiedBadge: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: "#1D9BF0",
    alignItems: "center", justifyContent: "center",
  },
  verifiedText: { fontSize: 10, fontWeight: "900", color: "#fff" },
  handle: { fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 14 },
  bio: { fontSize: 14, color: "rgba(255,255,255,0.8)", lineHeight: 22, marginBottom: 16 },
  statsRow: { flexDirection: "row", alignItems: "baseline", marginBottom: 16 },
  statNum: { fontSize: 15, fontWeight: "800", color: "#ffffff" },
  statLabel: { fontSize: 14, color: "rgba(255,255,255,0.38)" },
  metaRow: { flexDirection: "row", gap: 20, flexWrap: "wrap" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5, maxWidth: "60%" },
  metaText: { fontSize: 13, color: "rgba(255,255,255,0.32)" },
});

const epStyles = StyleSheet.create({
  backdrop: { backgroundColor: "rgba(0,0,0,0.72)" },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "92%",
    backgroundColor: "#111113",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
  },
  sheetTitle: { fontSize: 16, fontWeight: "700", color: "#fff" },
  cancelBtn: { fontSize: 15, color: "rgba(255,255,255,0.5)" },
  saveBtn: { fontSize: 15, fontWeight: "700", color: "#FF6C1A" },

  avatarSection: { alignItems: "center", paddingVertical: 24 },
  avatarWrap: { position: "relative" },
  avatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 20,
    backgroundColor: "#FF6B35",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarLoading: { backgroundColor: "rgba(255,255,255,0.1)" },
  avatarInitials: { fontSize: 30, fontWeight: "800", color: "#fff" },
  avatarEditBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FF6C1A",
    borderWidth: 2,
    borderColor: "#111113",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarHint: { marginTop: 10, fontSize: 12, color: "rgba(255,255,255,0.3)" },

  section: { paddingHorizontal: 20, marginBottom: 22 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    color: "rgba(255,255,255,0.3)",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#1A1A1C",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    color: "#fff",
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  inputMulti: { minHeight: 80, paddingTop: 13, textAlignVertical: "top" },

  songRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A1C",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    padding: 12,
    gap: 12,
  },
  songArt: { width: 44, height: 44, borderRadius: 8 },
  songArtFallback: { backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" },
  songName: { fontSize: 14, fontWeight: "600", color: "#fff" },
  songArtist: { fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 2 },
  songPlaceholder: { fontSize: 14, color: "rgba(255,255,255,0.3)" },
  songChevronWrap: { paddingLeft: 4 },
  clearBtn: { marginTop: 8, alignSelf: "flex-start" },
  clearBtnText: { fontSize: 13, color: "rgba(255,100,80,0.7)" },

  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A1C",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 8,
    gap: 8,
  },
  linkText: { flex: 1, fontSize: 13, color: "rgba(255,255,255,0.65)" },
  linkInputRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  linkInput: {
    flex: 1,
    backgroundColor: "#1A1A1C",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    color: "#fff",
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  addLinkBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#FF6C1A",
    alignItems: "center",
    justifyContent: "center",
  },
});

const ssStyles = StyleSheet.create({
  backdrop: { backgroundColor: "rgba(0,0,0,0.6)" },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "75%",
    backgroundColor: "#111113",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingBottom: 20,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
  },
  title: { fontSize: 16, fontWeight: "700", color: "#fff" },
  closeBtn: { fontSize: 16, color: "rgba(255,255,255,0.45)", fontWeight: "600" },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    backgroundColor: "#1A1A1C",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  searchInput: { flex: 1, color: "#fff", fontSize: 15 },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.04)",
  },
  resultArt: { width: 46, height: 46, borderRadius: 8 },
  resultArtFallback: { backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" },
  resultTrack: { fontSize: 14, fontWeight: "600", color: "#fff" },
  resultArtist: { fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 2 },
  emptyText: { textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 14, marginTop: 32 },
});

const npStyles = StyleSheet.create({
  card: {
    marginTop: 12,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(29,185,84,0.2)",
    padding: 16,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#1DB954" },
  label: { flex: 1, fontSize: 10, fontWeight: "800", letterSpacing: 1.1, color: "rgba(255,255,255,0.35)" },
  body: { flexDirection: "row", gap: 14, alignItems: "center" },
  albumArt: { width: 58, height: 58, borderRadius: 10 },
  albumArtFallback: { backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" },
  info: { flex: 1, gap: 2 },
  trackName: { fontSize: 15, fontWeight: "700", color: "#ffffff", letterSpacing: -0.2 },
  artistName: { fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 8 },
  progressTrack: { height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.1)", overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#1DB954", borderRadius: 2 },
  progressTimes: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  timeText: { fontSize: 10, color: "rgba(255,255,255,0.25)", fontWeight: "600" },
  reconnectBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: "#1DB954", borderRadius: 12, paddingVertical: 12,
  },
  reconnectText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
