import React, { useRef, useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Animated, TextInput, ActivityIndicator, Alert } from "react-native";
import { CachedImage } from "../ui/CachedImage";
import { FontAwesome5 } from "@expo/vector-icons";
import { styles } from "../../assets/styles/feed/styles";
import { type PinnedSong } from "../../types/music";
import { type Comment } from "../../lib/feed/helpers";
import { usePostComments } from "../../hooks/usePostComments";
import { useSlideInPanel } from "../../hooks/useSlideInPanel";
import { useMusicLinkAttach } from "../../hooks/useMusicLinkAttach";
import { addPostComment } from "../../services/posts";
import { PostCard } from "../../components/post/PostCard";
import { ThreadedCommentRow } from "../../components/post/CommentRow";
import { CommentSongPicker } from "../../components/post/CommentSongPicker";
import { ParsedLinkChip } from "../../components/feed/ParsedLinkChip";
import { type Post } from "../../app/data/mock";

export function PostDetailOverlay({ post, onClose }: { post: Post; onClose: () => void }) {
  const { setComments, currentUserId, spotifyToken, grouped } = usePostComments(post.id);
  const { slideX, barBottom, panHandlers, close } = useSlideInPanel(onClose);
  const [replyText, setReplyText]   = useState("");
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [sending, setSending]       = useState(false);
  const [selectedSong, setSelectedSong] = useState<PinnedSong | null>(null);
  const [songPickerVisible, setSongPickerVisible] = useState(false);
  const listRef = useRef<FlatList>(null);
  // Freeze the comment list's vertical scroll while a reply-swipe is in flight,
  // imperatively (no setState) so the swipe's first frame doesn't hitch.
  const setListFrozen = useCallback((active: boolean) => {
    listRef.current?.setNativeProps({ scrollEnabled: !active });
  }, []);
  // Paste-a-link song attachment (shared parser). Mutually exclusive with the
  // Spotify-picked selectedSong.
  const link = useMusicLinkAttach();
  useEffect(() => { if (link.attachedLink) setSelectedSong(null); }, [link.attachedLink]);

  const handleSend = async () => {
    if (!currentUserId || (!replyText.trim() && !selectedSong && !link.attachedLink) || sending) return;
    const text = replyText.trim();
    const parentId = replyingTo?.id ?? null;
    const al = link.attachedLink;
    const song = al
      ? { id: al.spotifyId, name: al.name, artist: al.artist, albumArt: al.albumArt, url: al.url, provider: al.provider, links: al.links }
      : selectedSong;
    setReplyText(""); setReplyingTo(null); setSelectedSong(null); link.reset(); setSending(true);
    try {
      const comment = await addPostComment({ postId: post.id, userId: currentUserId, text, parentCommentId: parentId, song });
      setComments((prev) => [...prev, comment]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    } catch (e: any) {
      Alert.alert("Comment failed", e.message ?? "Could not post comment.");
      setReplyText(text);
      if (al) link.setAttachedLink(al); else setSelectedSong(selectedSong);
    } finally {
      setSending(false);
    }
  };

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.detailOverlay, { transform: [{ translateX: slideX }] }]} {...panHandlers}>
      <View style={styles.detailHeader}>
        <TouchableOpacity onPress={close} style={styles.detailBackBtn} activeOpacity={0.7}>
          <Text style={styles.detailBackIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.detailHeaderTitle}>Post</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        ref={listRef}
        data={grouped.topLevel}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.detailListContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListHeaderComponent={
          <>
            <PostCard item={post} />
            <View style={styles.detailDivider}>
              <Text style={styles.detailDividerLabel}>
                {grouped.topLevel.length === 0 ? "No comments yet" : `${grouped.topLevel.length} Comment${grouped.topLevel.length === 1 ? "" : "s"}`}
              </Text>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <ThreadedCommentRow
            comment={item}
            replies={grouped.repliesMap.get(item.id) ?? []}
            currentUserId={currentUserId}
            onReply={(c) => setReplyingTo(c)}
            onSwipeActive={setListFrozen}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.commentSeparator} />}
      />

      <Animated.View style={[styles.detailReplyBarWrap, { bottom: barBottom }]}>
        {replyingTo && (
          <View style={styles.detailReplyContext}>
            <Text style={styles.detailReplyContextText}>
              Replying to {replyingTo.displayName ?? `@${replyingTo.username}`}
            </Text>
            <TouchableOpacity onPress={() => setReplyingTo(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.detailReplyContextX}>×</Text>
            </TouchableOpacity>
          </View>
        )}
        {selectedSong && (
          <View style={styles.detailSongCard}>
            {selectedSong.albumArt ? (
              <CachedImage source={{ uri: selectedSong.albumArt }} style={styles.detailSongArt} />
            ) : (
              <View style={[styles.detailSongArt, styles.detailSongArtFallback]}>
                <FontAwesome5 name="music" size={9} color="rgba(255,255,255,0.3)" />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.detailSongName} numberOfLines={1}>{selectedSong.name}</Text>
              {selectedSong.artist ? <Text style={styles.detailSongArtist} numberOfLines={1}>{selectedSong.artist}</Text> : null}
            </View>
            <FontAwesome5 name="spotify" size={11} color="#1DB954" style={{ marginRight: 6 }} />
            <TouchableOpacity onPress={() => setSelectedSong(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <FontAwesome5 name="times" size={12} color="rgba(255,255,255,0.45)" />
            </TouchableOpacity>
          </View>
        )}
        <ParsedLinkChip parsingLink={link.parsingLink} attachedLink={link.attachedLink} onRemove={link.removeAttachedLink} />
        <View style={[styles.composerGlass, link.parsingLink && { opacity: 0.5 }]}>
          <TouchableOpacity style={styles.composerPlus} activeOpacity={0.8} onPress={() => setSongPickerVisible(true)} disabled={link.parsingLink}>
            <Text style={styles.composerPlusIcon}>+</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.composerInput}
            placeholder={link.parsingLink ? "Parsing link…" : link.attachedLink ? "Add a caption…" : replyingTo ? `Reply to ${replyingTo.displayName ?? `@${replyingTo.username}`}…` : "Add a comment…"}
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={replyText}
            onChangeText={(t) => { setReplyText(t); link.detect(t, setReplyText); }}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            editable={!link.parsingLink}
          />
          <TouchableOpacity
            style={[styles.composerSend, ((!replyText.trim() && !selectedSong && !link.attachedLink) || sending || link.parsingLink) && { opacity: 0.4 }]}
            activeOpacity={0.8}
            onPress={handleSend}
            disabled={(!replyText.trim() && !selectedSong && !link.attachedLink) || sending || link.parsingLink}
          >
            {sending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.composerSendIcon}>↑</Text>}
          </TouchableOpacity>
        </View>
      </Animated.View>

      <CommentSongPicker
        visible={songPickerVisible}
        onClose={() => setSongPickerVisible(false)}
        onSelect={(song) => { setSelectedSong(song); link.removeAttachedLink(); setSongPickerVisible(false); }}
        accessToken={spotifyToken}
      />
    </Animated.View>
  );
}
