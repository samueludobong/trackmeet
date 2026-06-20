import React, { useRef, useState } from "react";
import { toggleCommentLike } from "../../services/posts";
import { View, Text, TouchableOpacity, Animated, Linking } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { openSpotifyLink } from "../../lib/spotify";
import { PROVIDER_DISPLAY } from "../../lib/musicLink";
import { styles } from "../../assets/styles/feed/styles";
import { CachedImage } from "../ui/CachedImage";
import { SwipeToReply } from "../messages/SwipeToReply";
import { MusicPlatformsSheet } from "./MusicPlatformsSheet";
import { type Comment } from "../../lib/feed/helpers";

export function CommentRow({
  comment,
  currentUserId,
  onReply,
  onSwipeActive,
}: {
  comment: Comment;
  currentUserId: string | null;
  onReply: (c: Comment) => void;
  // Lets the parent freeze the comment list's vertical scroll while a
  // reply-swipe is in flight (same as the chat list does).
  onSwipeActive?: (active: boolean) => void;
}) {
  const [liked,     setLiked]     = useState(false);
  const [likeCount, setLikeCount] = useState(comment.likesCount);
  const [platformsOpen, setPlatformsOpen] = useState(false);
  // Multi-provider attachment state (pasted-link comments).
  const altCount = (comment.songLinks ?? []).filter((l) => l.url !== comment.songUrl).length;
  const providerMeta = comment.songProvider ? (PROVIDER_DISPLAY as any)[comment.songProvider] : undefined;

  const handleSongOpen = () => {
    if (altCount > 0) { setPlatformsOpen(true); return; }
    if (comment.songProvider && comment.songProvider !== "spotify" && comment.songUrl) {
      Linking.openURL(comment.songUrl).catch(() => WebBrowser.openBrowserAsync(comment.songUrl!).catch(() => {}));
      return;
    }
    if (comment.songId) openSpotifyLink(`spotify:track:${comment.songId}`, `https://open.spotify.com/track/${comment.songId}`);
  };
  const heartScale  = useRef(new Animated.Value(1)).current;
  const lastTapRef  = useRef(0);

  const handleLike = async () => {
    if (!currentUserId) return;
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => wasLiked ? Math.max(0, c - 1) : c + 1);
    // Bounce the heart
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.45, useNativeDriver: true, damping: 6, stiffness: 500 }),
      Animated.spring(heartScale, { toValue: 1,    useNativeDriver: true, damping: 12, stiffness: 300 }),
    ]).start();
    toggleCommentLike(comment.id, currentUserId);
  };

  // Double-tap on the bubble body to like
  const handleBubbleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) handleLike();
    lastTapRef.current = now;
  };

  const initials = (comment.displayName ?? comment.username).slice(0, 2).toUpperCase();

  return (
    <View style={styles.commentWrap}>
      <SwipeToReply direction="left" onReply={() => onReply(comment)} onActiveChange={onSwipeActive}>
      <View style={styles.commentRow}>
        {/* Avatar */}
        {comment.avatarUrl ? (
          <CachedImage source={{ uri: comment.avatarUrl }} style={styles.commentAvatar} recyclingKey={comment.avatarUrl} />
        ) : (
          <View style={[styles.commentAvatar, { backgroundColor: "#AB00FF22", borderColor: "#AB00FF44" }]}>
            <Text style={[styles.commentAvatarText, { color: "#AB00FF" }]}>{initials}</Text>
          </View>
        )}

        {/* Bubble — double-tap anywhere on it to like */}
        <TouchableOpacity style={styles.commentBody} activeOpacity={0.85} onPress={handleBubbleTap}>
          <View style={styles.commentMeta}>
            <Text style={styles.commentHandle}>{comment.displayName ?? `@${comment.username}`}</Text>
            <Text style={styles.commentTime}>{comment.time}</Text>
          </View>
          {!!comment.text && <Text style={styles.commentText}>{comment.text}</Text>}
          {/* Song attachment */}
          {comment.songName && (
            <TouchableOpacity
              style={styles.commentSongCard}
              activeOpacity={0.8}
              onPress={handleSongOpen}
            >
              {comment.songAlbumArt ? (
                <CachedImage source={{ uri: comment.songAlbumArt }} style={styles.commentSongArt} />
              ) : (
                <View style={[styles.commentSongArt, styles.commentSongArtFallback]}>
                  <FontAwesome5 name="music" size={9} color="rgba(255,255,255,0.3)" />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.commentSongName} numberOfLines={1}>{comment.songName}</Text>
                {comment.songArtist ? <Text style={styles.commentSongArtist} numberOfLines={1}>{comment.songArtist}</Text> : null}
              </View>
              <FontAwesome5 name={(providerMeta?.icon ?? "spotify") as any} size={19} color={providerMeta?.color ?? "#1DB954"} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {/* Like button */}
        <Animated.View style={{ transform: [{ scale: heartScale }] }}>
          <TouchableOpacity style={styles.commentLikeBtn} onPress={handleLike} activeOpacity={0.7}>
            <Ionicons
              name={liked ? "heart" : "heart-outline"}
              size={15}
              color={liked ? "#FF3CAC" : "rgba(255,255,255,0.4)"}
            />
            {likeCount > 0 && (
              <Text style={[styles.commentLikeCount, liked && { color: "#FF3CAC" }]}>{likeCount}</Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>
      </SwipeToReply>

      <MusicPlatformsSheet
        visible={platformsOpen}
        onClose={() => setPlatformsOpen(false)}
        song={{ name: comment.songName ?? "", artist: comment.songArtist ?? "", albumArt: comment.songAlbumArt }}
        originalProvider={comment.songProvider}
        originalUrl={comment.songUrl}
        links={comment.songLinks ?? []}
      />
    </View>
  );
}

// ─── Threaded comment (parent + its replies) ─────────────────────────────────

export function ThreadedCommentRow({
  comment,
  replies,
  currentUserId,
  onReply,
  onSwipeActive,
}: {
  comment: Comment;
  replies: Comment[];
  currentUserId: string | null;
  onReply: (c: Comment) => void;
  onSwipeActive?: (active: boolean) => void;
}) {
  // Replies are collapsed by default behind a single top-level toggle so long
  // threads don't flood the list; tapping expands the whole thread.
  const [expanded, setExpanded] = useState(false);

  return (
    <View>
      <CommentRow comment={comment} currentUserId={currentUserId} onReply={onReply} onSwipeActive={onSwipeActive} />
      {replies.length > 0 && (
        <View style={styles.repliesBlock}>
          {/* Vertical connector line */}
          <View style={styles.threadLine} />
          <View style={{ flex: 1 }}>
            <TouchableOpacity style={styles.showMoreReplies} onPress={() => setExpanded((e) => !e)} activeOpacity={0.7}>
              <View style={styles.showMoreDots}>
                <View style={styles.showMoreDot} />
                <View style={styles.showMoreDot} />
                <View style={styles.showMoreDot} />
              </View>
              <Text style={styles.showMoreRepliesText}>
                {expanded ? "Hide replies" : `View ${replies.length} ${replies.length === 1 ? "reply" : "replies"}`}
              </Text>
              <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={12} color="#a0a0a09d" />
            </TouchableOpacity>
            {expanded && replies.map((reply, idx) => (
              <View key={reply.id} style={[styles.replyRow, idx > 0 && { marginTop: 6 }]}>
                <CommentRow comment={reply} currentUserId={currentUserId} onReply={onReply} onSwipeActive={onSwipeActive} />
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Swipeable post wrapper ───────────────────────────────────────────────────
