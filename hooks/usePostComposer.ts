import { useRef, useState, useEffect } from "react";
import { type ComposerUser } from "../types/composer";
import { Animated, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../lib/supabase";
import { SH } from "../lib/feed/dimensions";
import { dbRowToPost } from "../lib/feed/helpers";
import { type Post } from "../app/data/mock";

export function usePostComposer({ visible, onClose, currentUser, onPosted, initialText }: { visible: boolean; onClose: () => void; currentUser: ComposerUser | null; onPosted: (post: Post) => void; initialText?: string }) {
  const [text, setText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [pollMode, setPollMode] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [posting, setPosting] = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(SH)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setText(initialText ?? ""); setImages([]); setPollMode(false); setMediaPickerOpen(false);
      setPollQuestion(""); setPollOptions(["", ""]);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 24, stiffness: 200 }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: SH, duration: 260, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const pickFromCamera = async () => {
    setMediaPickerOpen(false);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert("Permission needed", "Allow camera access to take a photo."); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.85, allowsEditing: false });
    if (!result.canceled) {
      setImages((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, 4));
      setPollMode(false);
    }
  };

  const pickFromLibrary = async () => {
    setMediaPickerOpen(false);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert("Permission needed", "Allow photo access to attach images."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"] as any,
      allowsMultipleSelection: true,
      quality: 0.85,
      selectionLimit: 4,
    });
    if (!result.canceled) {
      setImages((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, 4));
      setPollMode(false);
    }
  };

  const pickVideo = async () => {
    setMediaPickerOpen(false);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert("Permission needed", "Allow photo access to attach a video."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"] as any,
      allowsMultipleSelection: false,
      quality: 0.85,
    });
    if (!result.canceled) {
      setImages((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, 4));
      setPollMode(false);
    }
  };

  const removeImage = (idx: number) => setImages((prev) => prev.filter((_, i) => i !== idx));

  const canPost =
    text.trim().length > 0 ||
    images.length > 0 ||
    (pollMode && pollQuestion.trim().length > 0 && pollOptions.filter((o) => o.trim()).length >= 2);

  const handlePost = async () => {
    if (!currentUser || !canPost || posting) return;
    setPosting(true);
    try {
      const VIDEO_EXTS = ["mp4", "mov", "m4v", "avi", "webm"];
      let type: "text" | "image" | "video" | "poll" = "text";
      let mediaUrls: string[] = [];

      if (images.length > 0) {
        const firstExt = (images[0].split(".").pop() ?? "").toLowerCase();
        type = VIDEO_EXTS.includes(firstExt) ? "video" : "image";
        for (const uri of images) {
          const ext = (uri.split(".").pop() ?? "jpg").toLowerCase();
          const isVideo = VIDEO_EXTS.includes(ext);
          const fileName = `${currentUser.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
          const resp = await fetch(uri);
          const blob = await resp.blob();
          const ab = await new Promise<ArrayBuffer>((res, rej) => {
            const reader = new FileReader();
            reader.onload = () => res(reader.result as ArrayBuffer);
            reader.onerror = rej;
            reader.readAsArrayBuffer(blob);
          });
          const contentType = isVideo
            ? `video/${ext === "mov" ? "quicktime" : ext}`
            : `image/${ext}`;
          const { error: upErr } = await supabase.storage
            .from("post-media")
            .upload(fileName, ab, { contentType, upsert: false });
          if (upErr) throw upErr;
          const { data: { publicUrl } } = supabase.storage.from("post-media").getPublicUrl(fileName);
          mediaUrls.push(publicUrl);
        }
      } else if (pollMode) {
        type = "poll";
      }

      const opts = pollMode
        ? pollOptions
            .filter((o) => o.trim())
            .map((o, i) => ({ id: `opt_${i}`, label: o.trim(), votes: 0 }))
        : null;

      const { data: newRow, error } = await supabase
        .from("posts")
        .insert({
          user_id: currentUser.id,
          type,
          text: text.trim() || null,
          media_urls: mediaUrls,
          poll_question: pollMode ? pollQuestion.trim() || null : null,
          poll_options: opts,
        })
        .select("id, type, text, media_urls, song_id, song_name, song_artist, song_album_art, poll_question, poll_options, created_at, likes_count, comments_count, users!user_id(id, username, display_name, avatar_url)")
        .single();

      if (error) throw error;
      onPosted(dbRowToPost(newRow));
      onClose();
    } catch (e: any) {
      Alert.alert("Post failed", e.message ?? "Could not create post.");
    } finally {
      setPosting(false);
    }
  };

  const initials = (() => {
    const name = (currentUser?.display_name || currentUser?.username || "").trim();
    if (!name) return "?";
    const parts = name.split(/\s+/).filter(Boolean);
    return parts.map((w: string) => w[0]).slice(0, 2).join("").toUpperCase() || "?";
  })();


  return { text, setText, images, setImages, pollMode, setPollMode, pollQuestion, setPollQuestion, pollOptions, setPollOptions, posting, setPosting, mediaPickerOpen, setMediaPickerOpen, slideAnim, backdropAnim, pickFromCamera, pickFromLibrary, pickVideo, removeImage, canPost, handlePost, initials };
}
