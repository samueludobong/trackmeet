import React, { useEffect, useState } from "react";
import {
  Modal, View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Platform, KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  updateCommunity, deleteCommunity,
  getCommunityRules, getCommunityTags,
  type Community, type CommunityArtist, type CommunityRole,
} from "../../services/communities";
import { adminStyles as a } from "./adminPanel.styles";
import { TabPill } from "./TabPill";
import { AdminPanelDetails } from "./AdminPanelDetails";
import { AdminPanelSettings } from "./AdminPanelSettings";
import { AdminPanelMembers } from "./AdminPanelMembers";
import { AdminPanelPosts } from "./AdminPanelPosts";

type Tab = "details" | "settings" | "members" | "posts" | "danger";

export function CommunityAdminPanel({
  community, userId, myRole, onClose, onUpdated, onDeleted,
}: {
  community: Community; userId: string; myRole: CommunityRole;
  onClose: () => void; onUpdated: (c: Community) => void; onDeleted: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>("details");

  const [name, setName] = useState(community.name);
  const [description, setDescription] = useState(community.description ?? "");
  const [rules, setRules] = useState<string>("");
  const [tagsText, setTagsText] = useState<string>("");
  const [imageUri, setImageUri] = useState<string | null>(community.avatar_url);
  const [imageUrl, setImageUrl] = useState<string | null>(community.avatar_url);
  const [bannerUri, setBannerUri] = useState<string | null>(community.banner_url);
  const [bannerUrl, setBannerUrl] = useState<string | null>(community.banner_url);
  const [bannerColor, setBannerColor] = useState<string | null>(community.banner_color);
  const [artist, setArtist] = useState<CommunityArtist | null>(null);

  const [isPrivate, setIsPrivate] = useState(community.is_private);
  const [allowPosts, setAllowPosts] = useState(community.allow_posts);
  const [allowAnyoneToPost, setAllowAnyoneToPost] = useState(community.allow_anyone_to_post);
  const [allowComments, setAllowComments] = useState(community.allow_comments);
  const [allowOfftopic, setAllowOfftopic] = useState(community.allow_offtopic);

  const [saving, setSaving] = useState(false);
  const canSave = !!name.trim() && !saving;

  useEffect(() => {
    getCommunityRules(community.id).then((r) => setRules(r ?? ""));
    getCommunityTags(community.id).then((t) => setTagsText(t.join(", ")));
  }, [community.id]);

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const tags = tagsText.split(",").map((t) => t.trim()).filter(Boolean);
      const updated = await updateCommunity(community.id, {
        name, description, avatarUrl: imageUrl,
        bannerUrl, bannerColor,
        artistId: artist ? artist.id : undefined,
        isPrivate, allowPosts, allowAnyoneToPost, allowComments, allowOfftopic,
        tags, rules,
      });
      onUpdated(updated);
      Alert.alert("Saved", "Community updated.");
    } catch (e: any) { Alert.alert("Couldn't save", e?.message ?? "Try again."); }
    finally { setSaving(false); }
  };

  const confirmDelete = () => {
    Alert.alert("Delete community",
      `This permanently removes "${community.name}", its posts, and its members.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete", style: "destructive",
          onPress: async () => {
            try { await deleteCommunity(community.id); onDeleted(); }
            catch (e: any) { Alert.alert("Couldn't delete", e?.message ?? "Try again."); }
          },
        },
      ]);
  };

  return (
    <Modal visible animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={a.screen}>
        <View style={[a.topBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={a.iconCircle} onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={a.topTitle}>Admin Panel</Text>
          {tab === "details" || tab === "settings" ? (
            <TouchableOpacity style={[a.saveBtn, !canSave && { opacity: 0.4 }]} onPress={save} disabled={!canSave}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={a.saveBtnText}>Save</Text>}
            </TouchableOpacity>
          ) : <View style={{ width: 60 }} />}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={a.tabsRow}>
          <TabPill label="Details" icon="create-outline" active={tab === "details"} onPress={() => setTab("details")} />
          <TabPill label="Settings" icon="options-outline" active={tab === "settings"} onPress={() => setTab("settings")} />
          <TabPill label="Members" icon="people-outline" active={tab === "members"} onPress={() => setTab("members")} />
          <TabPill label="Posts" icon="chatbubbles-outline" active={tab === "posts"} onPress={() => setTab("posts")} />
          {myRole === "owner" && (
            <TabPill label="Danger" icon="warning-outline" active={tab === "danger"} onPress={() => setTab("danger")} danger />
          )}
        </ScrollView>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
            keyboardShouldPersistTaps="handled">
            {tab === "details" && (
              <AdminPanelDetails
                community={community} userId={userId}
                name={name} setName={setName}
                description={description} setDescription={setDescription}
                rules={rules} setRules={setRules}
                tagsText={tagsText} setTagsText={setTagsText}
                imageUri={imageUri} setImageUri={setImageUri} setImageUrl={setImageUrl}
                bannerUri={bannerUri} setBannerUri={setBannerUri} setBannerUrl={setBannerUrl}
                bannerColor={bannerColor} setBannerColor={setBannerColor}
                artist={artist} setArtist={setArtist}
              />
            )}
            {tab === "settings" && (
              <AdminPanelSettings
                isPrivate={isPrivate} setIsPrivate={setIsPrivate}
                allowPosts={allowPosts} setAllowPosts={setAllowPosts}
                allowAnyoneToPost={allowAnyoneToPost} setAllowAnyoneToPost={setAllowAnyoneToPost}
                allowComments={allowComments} setAllowComments={setAllowComments}
                allowOfftopic={allowOfftopic} setAllowOfftopic={setAllowOfftopic}
              />
            )}
            {tab === "members" && <AdminPanelMembers communityId={community.id} viewerId={userId} myRole={myRole} />}
            {tab === "posts" && <AdminPanelPosts communityId={community.id} />}
            {tab === "danger" && (
              <View style={{ gap: 14 }}>
                <Text style={a.helper}>Destructive actions. Be careful.</Text>
                <TouchableOpacity style={a.dangerBtn} onPress={confirmDelete} activeOpacity={0.85}>
                  <Ionicons name="trash" size={18} color="#fff" />
                  <Text style={a.dangerBtnText}>Delete community</Text>
                </TouchableOpacity>
                <Text style={a.dangerHint}>This permanently removes the community, posts, and memberships.</Text>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
