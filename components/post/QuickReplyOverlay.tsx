import React, { useRef, useState, useEffect } from "react";
import { useViewer } from "../../hooks/useViewer";
import { addPostComment } from "../../services/posts";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Modal, Pressable, TextInput, Platform, Keyboard, Image, ActivityIndicator } from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { styles } from "../../lib/feed/styles";
import { BOTTOM_INSET } from "../../lib/feed/dimensions";
import { OpenDetailCtx } from "../../lib/feed/contexts";
import { PostCard } from "../../components/post/PostCard";
import { PinnedSongOverlay } from "../../components/profile/PinnedSongOverlay";
import { type PinnedSong } from "../../types/music";
import { type Post } from "../../app/data/mock";

export function QuickReplyOverlay({
  post,
  onClose,
  onOpenDetail,
}: {
  post: Post;
  onClose: () => void;
  onOpenDetail: () => void;
}) {
  const { currentUserId, currentUser, spotifyToken } = useViewer();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedSong, setSelectedSong] = useState<PinnedSong | null>(null);
  const [songPickerVisible, setSongPickerVisible] = useState(false);
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const inputBottomAnim = useRef(new Animated.Value(BOTTOM_INSET + 16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 22, stiffness: 220 }),
    ]).start();

    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvt, (e) => {
      const dur = Platform.OS === "ios" ? (e.duration ?? 260) : 260;
      Animated.timing(inputBottomAnim, {
        toValue: e.endCoordinates.height + 8,
        duration: dur,
        useNativeDriver: false,
      }).start();
    });
    const hideSub = Keyboard.addListener(hideEvt, (e) => {
      const dur = Platform.OS === "ios" ? (e.duration ?? 260) : 260;
      Animated.timing(inputBottomAnim, {
        toValue: BOTTOM_INSET + 16,
        duration: dur,
        useNativeDriver: false,
      }).start();
    });

    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const handleClose = () => {
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(backdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 160, useNativeDriver: true }),
    ]).start(onClose);
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if ((!trimmed && !selectedSong) || !currentUserId || sending) return;
    setSending(true);
    const song = selectedSong;
    try {
      await addPostComment({ postId: post.id, userId: currentUserId, text: trimmed, parentCommentId: null, song });
      setText("");
      setSelectedSong(null);
      handleClose();
    } catch {
      // leave input intact on failure
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal transparent animationType="none" statusBarTranslucent onRequestClose={handleClose}>
      {/* Dark backdrop — tap to dismiss */}
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.qrBackdrop, { opacity: backdropAnim }]}
        pointerEvents="none"
      />
      <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

      {/* Focused post card */}
      <Pressable style={styles.qrCardWrap} onPress={() => {}}>
        <OpenDetailCtx.Provider value={onOpenDetail}>
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <PostCard item={post} />
            {/* Tap card body to open detail; stops above action row */}
            <Pressable
              style={[StyleSheet.absoluteFill, { bottom: 58 }]}
              onPress={onOpenDetail}
            />
          </Animated.View>
        </OpenDetailCtx.Provider>

        {/* X button — top-right corner of card */}
        <TouchableOpacity style={styles.qrCloseBtn} onPress={handleClose} activeOpacity={0.85}>
          <View style={styles.qrCloseBtnCircle}>
            <Text style={styles.qrCloseBtnIcon}>✕</Text>
          </View>
        </TouchableOpacity>
      </Pressable>

      {/* Reply input — floats above keyboard */}
      <Animated.View style={[styles.qrInputRow, { bottom: inputBottomAnim }]} pointerEvents="box-none">
        {/* Attached song card */}
        {selectedSong && (
          <View style={styles.qrSongCard}>
            {selectedSong.albumArt ? (
              <Image source={{ uri: selectedSong.albumArt }} style={styles.qrSongArt} />
            ) : (
              <View style={[styles.qrSongArt, styles.qrSongArtFallback]}>
                <FontAwesome5 name="music" size={9} color="rgba(255,255,255,0.3)" />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.qrSongName} numberOfLines={1}>{selectedSong.name}</Text>
              {selectedSong.artist ? <Text style={styles.qrSongArtist} numberOfLines={1}>{selectedSong.artist}</Text> : null}
            </View>
            <FontAwesome5 name="spotify" size={11} color="#1DB954" style={{ marginRight: 4 }} />
            <TouchableOpacity onPress={() => setSelectedSong(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <FontAwesome5 name="times" size={12} color="rgba(255,255,255,0.45)" />
            </TouchableOpacity>
          </View>
        )}

        <Pressable style={styles.qrInputGlass} onPress={() => {}}>
          {/* + button — opens song picker */}
          <TouchableOpacity
            style={styles.qrPlusBtn}
            activeOpacity={0.8}
            onPress={() => setSongPickerVisible(true)}
          >
            <Text style={styles.qrPlusBtnIcon}>+</Text>
          </TouchableOpacity>

          {currentUser?.avatarUrl ? (
            <Image source={{ uri: currentUser.avatarUrl }} style={styles.qrAvatar} />
          ) : (
            <View style={[styles.qrAvatar, { backgroundColor: "#AB00FF22" }]}>
              <Text style={[styles.qrAvatarText, { color: "#AB00FF" }]}>
                {currentUser?.initials ?? "?"}
              </Text>
            </View>
          )}
          <View style={styles.qrInputInner}>
            <Text style={styles.qrReplyingTo}>Replying to {post.handle}</Text>
            <TextInput
              style={styles.qrInput}
              placeholder="Add a comment..."
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={text}
              onChangeText={setText}
              autoFocus
              returnKeyType="send"
              onSubmitEditing={handleSend}
            />
          </View>
          <TouchableOpacity
            style={[styles.qrSend, ((!text.trim() && !selectedSong) || sending) && { opacity: 0.35 }]}
            disabled={(!text.trim() && !selectedSong) || sending}
            activeOpacity={0.8}
            onPress={handleSend}
          >
            {sending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.qrSendIcon}>↑</Text>
            }
          </TouchableOpacity>
        </Pressable>
      </Animated.View>

      {/* Song picker — absoluteFill overlay inside this Modal */}
      <PinnedSongOverlay
        visible={songPickerVisible}
        onClose={() => setSongPickerVisible(false)}
        onSelect={(song) => { setSelectedSong(song); setSongPickerVisible(false); }}
        accessToken={spotifyToken}
        ctaLabel="Attach to Reply"
        ctaIcon="music"
      />
    </Modal>
  );
}

// ─── Composer action menu (styled like Claude "Add to Chat" sheet) ────────────
