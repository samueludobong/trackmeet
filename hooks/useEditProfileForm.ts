import { useState, useEffect } from "react";
import { useSheetAnimation } from "./useSheetAnimation";
import { uploadImageToStorage } from "../services/storage";
import { updateUserProfile } from "../services/profile";
import { type EditFormData } from "../types/profile";
import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { daysRemaining } from "../lib/feed/helpers";

export function useEditProfileForm({ visible, onClose, initialData, onSaved, accessToken, userId }: { visible: boolean; onClose: () => void; initialData: EditFormData; onSaved: (data: EditFormData) => void; accessToken: string | null; userId: string | null }) {
  const [form, setForm] = useState<EditFormData>(initialData);
  const [saving, setSaving] = useState(false);
  const [songSearchOpen, setSongSearchOpen] = useState(false);
  const [bannerColorOpen, setBannerColorOpen] = useState(false);
  const [newLink, setNewLink] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const { slideAnim, backdropAnim } = useSheetAnimation(visible, { from: 800, duration: 250 });

  useEffect(() => { if (visible) setForm(initialData); }, [visible]);

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert("Permission needed", "Allow photo access to set a profile picture."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"] as any,
      allowsEditing: true,
      aspect: [1, 1] as [number, number],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0] || !userId) return;
    setAvatarUploading(true);
    try {
      const uri = result.assets[0].uri;
      const ext = uri.split(".").pop() ?? "jpg";
      const publicUrl = await uploadImageToStorage("avatars", `${userId}/avatar.${ext}`, uri, `image/${ext}`);
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

  const removeLink = (idx: number) =>
    setForm((f) => ({ ...f, profile_links: f.profile_links.filter((_, i) => i !== idx) }));

  const setSocialLink = (key: string, value: string) => {
    setForm((f) => {
      const next = { ...f.social_links };
      if (value.trim()) {
        // Ensure the URL has a protocol
        next[key] = /^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`;
      } else {
        delete next[key];
      }
      return { ...f, social_links: next };
    });
  };

  // ── Cooldown state ──────────────────────────────────────────────────────────
  const usernameDaysLeft = form.username_changed_at
    ? daysRemaining(form.username_changed_at, 14)
    : 0;
  const isUsernameLocked = usernameDaysLeft > 0;

  const dnWindowExpired =
    !form.display_name_window_start ||
    daysRemaining(form.display_name_window_start, 30) === 0;
  const dnChangesUsed = dnWindowExpired ? 0 : (form.display_name_change_count ?? 0);
  const dnChangesLeft = Math.max(0, 2 - dnChangesUsed);
  const isDNLocked = dnChangesLeft === 0;
  const dnDaysLeft = isDNLocked && form.display_name_window_start
    ? daysRemaining(form.display_name_window_start, 30)
    : 0;

  const usernameLabelSuffix = isUsernameLocked
    ? ` [${usernameDaysLeft} day${usernameDaysLeft !== 1 ? "s" : ""}]`
    : "";
  const dnLabelSuffix = isDNLocked
    ? ` [${dnDaysLeft} day${dnDaysLeft !== 1 ? "s" : ""}]`
    : dnChangesLeft < 2
    ? ` [${dnChangesLeft} left]`
    : "";

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const usernameChanged = form.username.trim() !== (initialData.username ?? "");
      const displayNameChanged = form.display_name.trim() !== (initialData.display_name ?? "");

      let newUsernameChangedAt = form.username_changed_at;
      let newDNCount = form.display_name_change_count ?? 0;
      let newDNWindowStart = form.display_name_window_start;

      if (usernameChanged && !isUsernameLocked) {
        newUsernameChangedAt = new Date().toISOString();
      }

      if (displayNameChanged && !isDNLocked) {
        if (dnWindowExpired) {
          newDNWindowStart = new Date().toISOString();
          newDNCount = 1;
        } else {
          newDNCount = (form.display_name_change_count ?? 0) + 1;
        }
      }

      await updateUserProfile(userId, {
        display_name: (isDNLocked ? initialData.display_name : form.display_name.trim()) || null,
        username: (isUsernameLocked ? initialData.username : form.username.trim()) || null,
        bio: form.bio.trim() || null,
        avatar_url: form.avatar_url,
        banner_color: form.banner_color,
        banner_image_url: form.banner_image_url,
        banner_shape: form.banner_shape,
        banner_shape_color: form.banner_shape_color,
        username_changed_at: newUsernameChangedAt,
        display_name_change_count: newDNCount,
        display_name_window_start: newDNWindowStart,
        pinned_song_id: form.pinned_song_id,
        pinned_song_name: form.pinned_song_name,
        pinned_song_artist: form.pinned_song_artist,
        pinned_song_album_art: form.pinned_song_album_art,
        profile_links: form.profile_links,
        social_links: form.social_links,
      });
      onSaved({
        ...form,
        username_changed_at: newUsernameChangedAt,
        display_name_change_count: newDNCount,
        display_name_window_start: newDNWindowStart,
      });
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


  return { slideAnim, backdropAnim, form, setForm, saving, setSaving, songSearchOpen, setSongSearchOpen, bannerColorOpen, setBannerColorOpen, newLink, setNewLink, avatarUploading, setAvatarUploading, pickAvatar, addLink, removeLink, setSocialLink, usernameDaysLeft, isUsernameLocked, dnWindowExpired, dnChangesUsed, dnChangesLeft, isDNLocked, dnDaysLeft, usernameLabelSuffix, dnLabelSuffix, save, initials };
}
