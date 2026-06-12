import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Pressable, TextInput,
  Platform, Image, KeyboardAvoidingView, ActivityIndicator, Alert, Switch, Keyboard,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { cpStyles } from "../../lib/feed/localStyles";
import { uploadImageToStorage } from "../../services/storage";
import {
  createCommunity, isSlugAvailable, slugify,
  type Community,
} from "../../services/communities";
import { SlugField, GenreSelector, BannerPicker, COLOR_CHOICES } from "./CreateCommunityFields";

type SlugStatus = "idle" | "checking" | "available" | "taken" | "invalid";

export function CreateCommunityDialog({
  userId, onClose, onCreated,
}: {
  userId: string;
  onClose: () => void;
  onCreated: (community: Community) => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugDirty, setSlugDirty] = useState(false);
  const [slugStatus, setSlugStatus] = useState<SlugStatus>("idle");
  const [description, setDescription] = useState("");
  const [genres, setGenres] = useState<string[]>([]);

  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [bannerUri, setBannerUri] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [bannerColor, setBannerColor] = useState<string>(COLOR_CHOICES[0]);
  const [bannerUploading, setBannerUploading] = useState(false);

  const [isPrivate, setIsPrivate] = useState(false);
  const [allowAnyoneToPost, setAllowAnyoneToPost] = useState(true);
  const [allowComments, setAllowComments] = useState(true);
  const [rules, setRules] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Auto-derive slug from name until the user edits it manually.
  useEffect(() => {
    if (!slugDirty) setSlug(slugify(name));
  }, [name, slugDirty]);

  // Live availability check.
  useEffect(() => {
    const s = slug.trim();
    if (!s) { setSlugStatus("idle"); return; }
    if (!/^[a-z0-9-]+$/.test(s)) { setSlugStatus("invalid"); return; }
    setSlugStatus("checking");
    const t = setTimeout(async () => {
      try {
        const ok = await isSlugAvailable(s);
        setSlugStatus(ok ? "available" : "taken");
      } catch { setSlugStatus("idle"); }
    }, 300);
    return () => clearTimeout(t);
  }, [slug]);

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert("Permission required", "Allow photo access.");
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.85 });
    if (r.canceled || !r.assets[0]) return;
    setAvatarUri(r.assets[0].uri); setAvatarUploading(true);
    try {
      const ext = r.assets[0].uri.split(".").pop()?.toLowerCase() ?? "jpg";
      const url = await uploadImageToStorage("post-media", `${userId}/community-${Date.now()}.${ext}`, r.assets[0].uri, `image/${ext}`);
      setAvatarUrl(url);
    } catch { /* ignore */ }
    setAvatarUploading(false);
  };

  const pickBanner = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert("Permission required", "Allow photo access.");
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [16, 9], quality: 0.85 });
    if (r.canceled || !r.assets[0]) return;
    setBannerUri(r.assets[0].uri); setBannerUploading(true);
    try {
      const ext = r.assets[0].uri.split(".").pop()?.toLowerCase() ?? "jpg";
      const url = await uploadImageToStorage("post-media", `${userId}/community-banner-${Date.now()}.${ext}`, r.assets[0].uri, `image/${ext}`);
      setBannerUrl(url);
    } catch { /* ignore */ }
    setBannerUploading(false);
  };

  const canCreate = !!name.trim() && (slugStatus === "available" || slugStatus === "idle") && !creating;

  const create = async () => {
    if (!canCreate) return;
    setCreating(true);
    try {
      const community = await createCommunity(userId, {
        name, slug: slug.trim() || slugify(name), description,
        avatarUrl, bannerUrl, bannerColor: bannerUri ? null : bannerColor,
        genres, isPrivate, allowAnyoneToPost, allowComments,
        rules, welcomeMessage,
      });
      onCreated(community);
    } catch (e: any) {
      Alert.alert("Couldn't create community", e?.message ?? "Try again.");
    } finally { setCreating(false); }
  };

  return (
    <Modal transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Pressable style={cpStyles.dialogOverlay} onPress={onClose}>
          <Pressable onPress={(e) => { e.stopPropagation(); Keyboard.dismiss(); }}>
            <ScrollView style={cpStyles.dialogSheet} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={cpStyles.dialogHandle} />
              <Text style={cpStyles.dialogTitle}>Create Community</Text>

              <TouchableOpacity style={cpStyles.imagePicker} onPress={pickAvatar} activeOpacity={0.85}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={{ width: 90, height: 90, borderRadius: 18 }} resizeMode="cover" />
                ) : (
                  <>
                    <Ionicons name="people-outline" size={26} color="rgba(255,255,255,0.35)" />
                    <Text style={cpStyles.imagePickerText}>Avatar</Text>
                  </>
                )}
                {avatarUploading && <ActivityIndicator color="#fff" style={StyleSheet.absoluteFill as any} />}
              </TouchableOpacity>

              <Text style={cpStyles.label}>NAME</Text>
              <TextInput
                style={cpStyles.input} placeholder="Community name…"
                placeholderTextColor="rgba(255,255,255,0.25)"
                value={name} onChangeText={setName} maxLength={60}
              />

              <Text style={cpStyles.label}>HANDLE</Text>
              <SlugField slug={slug} onChange={(s) => { setSlugDirty(true); setSlug(s.toLowerCase()); }} status={slugStatus} />

              <Text style={cpStyles.label}>DESCRIPTION</Text>
              <TextInput
                style={[cpStyles.input, { height: 84, textAlignVertical: "top" }]}
                placeholder="What's this community about?"
                placeholderTextColor="rgba(255,255,255,0.25)"
                value={description} onChangeText={setDescription}
                multiline maxLength={300}
              />

              <Text style={cpStyles.label}>BANNER</Text>
              <BannerPicker
                bannerUri={bannerUri}
                bannerColor={bannerColor}
                onPickImage={pickBanner}
                onColor={(c) => { setBannerColor(c); setBannerUri(null); setBannerUrl(null); }}
                uploading={bannerUploading}
              />

              <Text style={cpStyles.label}>GENRES</Text>
              <GenreSelector selected={genres} onChange={setGenres} />

              <Text style={[cpStyles.label, { marginTop: 18 }]}>SETTINGS</Text>
              <ToggleRow label="Private community" sub="People must request to join; admins approve" value={isPrivate} onChange={setIsPrivate} />
              <ToggleRow label="Allow anyone to post" sub="Otherwise only admins can post" value={allowAnyoneToPost} onChange={setAllowAnyoneToPost} />
              <ToggleRow label="Allow comments" sub="Members can comment on posts" value={allowComments} onChange={setAllowComments} />

              <TouchableOpacity style={tr.moreToggle} onPress={() => setMoreOpen((v) => !v)} activeOpacity={0.7}>
                <Text style={tr.moreToggleText}>{moreOpen ? "Hide" : "More"} options</Text>
                <Ionicons name={moreOpen ? "chevron-up" : "chevron-down"} size={14} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>

              {moreOpen && (
                <>
                  <Text style={cpStyles.label}>RULES</Text>
                  <TextInput
                    style={[cpStyles.input, { height: 100, textAlignVertical: "top" }]}
                    placeholder="House rules for this community…"
                    placeholderTextColor="rgba(255,255,255,0.25)"
                    value={rules} onChangeText={setRules}
                    multiline maxLength={1000}
                  />
                  <Text style={cpStyles.label}>WELCOME MESSAGE</Text>
                  <TextInput
                    style={[cpStyles.input, { height: 72, textAlignVertical: "top" }]}
                    placeholder="Greets new members when they join…"
                    placeholderTextColor="rgba(255,255,255,0.25)"
                    value={welcomeMessage} onChangeText={setWelcomeMessage}
                    multiline maxLength={200}
                  />
                </>
              )}

              <TouchableOpacity
                style={[cpStyles.createSubmitBtn, { marginTop: 18 }, !canCreate && { opacity: 0.45 }]}
                onPress={create} activeOpacity={0.8} disabled={!canCreate}
              >
                {creating ? <ActivityIndicator color="#fff" /> : <Text style={cpStyles.createSubmitText}>Create Community</Text>}
              </TouchableOpacity>
              <View style={{ height: 24 }} />
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ToggleRow({ label, sub, value, onChange }: { label: string; sub: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={tr.row}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={tr.label}>{label}</Text><Text style={tr.sub}>{sub}</Text>
      </View>
      <Switch value={value} onValueChange={onChange}
        trackColor={{ false: "rgba(255,255,255,0.15)", true: "#AB00FF" }}
        thumbColor="#fff" ios_backgroundColor="rgba(255,255,255,0.15)" />
    </View>
  );
}

const tr = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(255,255,255,0.07)" },
  label: { fontSize: 15, fontWeight: "700", color: "#fff" },
  sub: { fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 },
  moreToggle: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5,
    paddingVertical: 12, marginTop: 4,
  },
  moreToggleText: { fontSize: 13, fontWeight: "700", color: "rgba(255,255,255,0.5)" },
});
