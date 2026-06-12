import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { uploadImageToStorage } from "../../services/storage";
import { searchArtistsByName, type CommunityArtist, type Community } from "../../services/communities";
import { adminStyles as a } from "./adminPanel.styles";

type Props = {
  community: Community;
  userId: string;
  name: string; setName: (v: string) => void;
  description: string; setDescription: (v: string) => void;
  rules: string; setRules: (v: string) => void;
  welcomeMessage: string; setWelcomeMessage: (v: string) => void;
  tagsText: string; setTagsText: (v: string) => void;
  imageUri: string | null; setImageUri: (v: string | null) => void;
  setImageUrl: (v: string | null) => void;
  bannerUri: string | null; setBannerUri: (v: string | null) => void;
  setBannerUrl: (v: string | null) => void;
  bannerColor: string | null; setBannerColor: (v: string | null) => void;
  artist: CommunityArtist | null; setArtist: (v: CommunityArtist | null) => void;
};

export function AdminPanelDetails(p: Props) {
  const [uploading, setUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [artistQuery, setArtistQuery] = useState("");
  const [artistResults, setArtistResults] = useState<CommunityArtist[]>([]);

  useEffect(() => {
    if (p.artist || !artistQuery.trim()) { setArtistResults([]); return; }
    const id = setTimeout(() => {
      searchArtistsByName(artistQuery).then(setArtistResults).catch(() => setArtistResults([]));
    }, 250);
    return () => clearTimeout(id);
  }, [artistQuery, p.artist]);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert("Permission required", "Allow photo access.");
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.85 });
    if (r.canceled || !r.assets[0]) return;
    p.setImageUri(r.assets[0].uri); setUploading(true);
    try {
      const ext = r.assets[0].uri.split(".").pop()?.toLowerCase() ?? "jpg";
      const url = await uploadImageToStorage("post-media", `${p.userId}/community-${p.community.id}-${Date.now()}.${ext}`, r.assets[0].uri, `image/${ext}`);
      p.setImageUrl(url);
    } catch (e: any) { Alert.alert("Upload failed", e?.message ?? "Try again."); }
    setUploading(false);
  };

  const pickBanner = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert("Permission required", "Allow photo access.");
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [16, 9], quality: 0.85 });
    if (r.canceled || !r.assets[0]) return;
    p.setBannerUri(r.assets[0].uri); setBannerUploading(true);
    try {
      const ext = r.assets[0].uri.split(".").pop()?.toLowerCase() ?? "jpg";
      const url = await uploadImageToStorage("post-media", `${p.userId}/community-${p.community.id}-banner-${Date.now()}.${ext}`, r.assets[0].uri, `image/${ext}`);
      p.setBannerUrl(url);
    } catch (e: any) { Alert.alert("Upload failed", e?.message ?? "Try again."); }
    setBannerUploading(false);
  };

  return (
    <>
      <TouchableOpacity style={a.avatarPick} onPress={pickImage} activeOpacity={0.8}>
        {p.imageUri ? <Image source={{ uri: p.imageUri }} style={{ width: 100, height: 100, borderRadius: 22 }} />
          : <Ionicons name="image-outline" size={30} color="rgba(255,255,255,0.4)" />}
        {uploading && <View style={[StyleSheet.absoluteFill, a.uploadOverlay]}><ActivityIndicator color="#fff" /></View>}
        <View style={a.editBadge}><Ionicons name="camera" size={12} color="#fff" /></View>
      </TouchableOpacity>

      <Text style={a.label}>NAME</Text>
      <TextInput style={a.input} value={p.name} onChangeText={p.setName} maxLength={60} placeholder="Community name" placeholderTextColor="rgba(255,255,255,0.3)" />

      <Text style={a.label}>BANNER</Text>
      <TouchableOpacity style={a.bannerPick} onPress={pickBanner} activeOpacity={0.85}>
        {p.bannerUri ? <Image source={{ uri: p.bannerUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          : <View style={[StyleSheet.absoluteFill, { backgroundColor: p.bannerColor ?? "#AB00FF" }]} />}
        {bannerUploading && <View style={[StyleSheet.absoluteFill, a.uploadOverlay]}><ActivityIndicator color="#fff" /></View>}
        <View style={a.bannerPickHint}><Ionicons name="image-outline" size={14} color="#fff" /><Text style={a.bannerPickHintText}>{p.bannerUri ? "Change banner" : "Upload banner"}</Text></View>
      </TouchableOpacity>
      <View style={a.colorRow}>
        {["#AB00FF", "#FF3CAC", "#FF6C1A", "#1DB954", "#1B6CF5", "#FFD23F"].map((c) => (
          <TouchableOpacity key={c} onPress={() => { p.setBannerColor(c); p.setBannerUri(null); p.setBannerUrl(null); }}
            style={[a.colorSwatch, { backgroundColor: c }, p.bannerColor === c && !p.bannerUri && a.colorSwatchActive]} />
        ))}
      </View>

      <Text style={a.label}>DESCRIPTION</Text>
      <TextInput style={[a.input, { height: 90, textAlignVertical: "top" }]} value={p.description} onChangeText={p.setDescription} multiline maxLength={300} placeholder="What's this community about?" placeholderTextColor="rgba(255,255,255,0.3)" />

      <Text style={a.label}>RULES</Text>
      <TextInput style={[a.input, { height: 120, textAlignVertical: "top" }]} value={p.rules} onChangeText={p.setRules} multiline placeholder="House rules for this community…" placeholderTextColor="rgba(255,255,255,0.3)" />

      <Text style={a.label}>WELCOME MESSAGE</Text>
      <TextInput style={[a.input, { height: 80, textAlignVertical: "top" }]} value={p.welcomeMessage} onChangeText={p.setWelcomeMessage} multiline maxLength={200} placeholder="Greets new members when they join…" placeholderTextColor="rgba(255,255,255,0.3)" />

      <Text style={a.label}>TAGS</Text>
      <TextInput style={a.input} value={p.tagsText} onChangeText={p.setTagsText} placeholder="comma, separated, tags" placeholderTextColor="rgba(255,255,255,0.3)" autoCapitalize="none" />

      <Text style={a.label}>LINKED ARTIST</Text>
      {p.artist ? (
        <View style={a.chip}>
          {p.artist.avatar_url ? <Image source={{ uri: p.artist.avatar_url }} style={a.chipImg} />
            : <View style={[a.chipImg, a.chipFallback]}><Ionicons name="musical-note" size={14} color="#AB00FF" /></View>}
          <Text style={a.chipName} numberOfLines={1}>{p.artist.name}</Text>
          <TouchableOpacity onPress={() => p.setArtist(null)} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <TextInput style={a.input} value={artistQuery} onChangeText={setArtistQuery} placeholder={p.community.artist_id ? "Search to change linked artist…" : "Search an artist…"} placeholderTextColor="rgba(255,255,255,0.3)" autoCorrect={false} />
          {artistResults.length > 0 && (
            <View style={a.suggestBox}>
              {artistResults.map((ar) => (
                <TouchableOpacity key={ar.id} style={a.suggestRow} activeOpacity={0.75} onPress={() => { p.setArtist(ar); setArtistQuery(""); setArtistResults([]); }}>
                  {ar.avatar_url ? <Image source={{ uri: ar.avatar_url }} style={a.suggestImg} />
                    : <View style={[a.suggestImg, a.chipFallback]}><Ionicons name="musical-note" size={13} color="#AB00FF" /></View>}
                  <Text style={a.suggestName} numberOfLines={1}>{ar.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </>
      )}
    </>
  );
}
