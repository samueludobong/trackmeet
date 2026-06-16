import React, { useRef, useState, useEffect } from "react";
import { toggleCommentLike } from "../../services/posts";
import { View, Text, TouchableOpacity, Animated, PanResponder } from "react-native";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { openSpotifyLink } from "../../lib/spotify";
import { styles } from "../../assets/styles/feed/styles";
import { CachedImage } from "../ui/CachedImage";
import { type Comment } from "../../lib/feed/helpers";

export function CommentRow({
  comment,
  currentUserId,
  onReply,
}: {
  comment: Comment;
  currentUserId: string | null;
  onReply: (c: Comment) => void;
}) {
  const [liked,     setLiked]     = useState(false);
  const [likeCount, setLikeCount] = useState(comment.likesCount);
  const translateX  = useRef(new Animated.Value(0)).current;
  const heartScale  = useRef(new Animated.Value(1)).current;
  const isLocked    = useRef(false);
  const lastTapRef  = useRef(0);
  const onReplyRef  = useRef(onReply);
  useEffect(() => { onReplyRef.current = onReply; }, [onReply]);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, { dx, dy }) => {
        if (dx < -2 && Math.abs(dx) >= Math.abs(dy)) { isLocked.current = true; return true; }
        return false;
      },
      onShouldBlockNativeResponder: () => true,
      onPanResponderMove:   (_, { dx }) => { if (dx < 0) translateX.setValue(Math.max(dx, -90)); },
      onPanResponderRelease:(_, { dx }) => {
        isLocked.current = false;
        if (dx < -50) onReplyRef.current(comment);
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 240 }).start();
      },
      onPanResponderTerminate: () => {
        isLocked.current = false;
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  const indicatorOpacity = translateX.interpolate({ inputRange: [-70, -15, 0], outputRange: [1, 0, 0], extrapolate: "clamp" });

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
    <View style={styles.commentWrap} {...pan.panHandlers}>
      <Animated.View style={[styles.commentReplyHint, { opacity: indicatorOpacity }]}>
        <Text style={styles.replyIndicatorArrow}>←</Text>
        <Text style={styles.replyIndicatorLabel}>Reply</Text>
      </Animated.View>

      <Animated.View style={[styles.commentRow, { transform: [{ translateX }] }]}>
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
              onPress={() => comment.songId
                ? openSpotifyLink(`spotify:track:${comment.songId}`, `https://open.spotify.com/track/${comment.songId}`)
                : undefined
              }
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
              <FontAwesome5 name="spotify" size={19} color="#1DB954" />
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
      </Animated.View>
    </View>
  );
}

// ─── Threaded comment (parent + its replies) ─────────────────────────────────

const REPLIES_COLLAPSED_MAX = 3;

export function ThreadedCommentRow({
  comment,
  replies,
  currentUserId,
  onReply,
}: {
  comment: Comment;
  replies: Comment[];
  currentUserId: string | null;
  onReply: (c: Comment) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const visible   = showAll ? replies : replies.slice(0, REPLIES_COLLAPSED_MAX);
  const hiddenCnt = replies.length - REPLIES_COLLAPSED_MAX;

  return (
    <View>
      <CommentRow comment={comment} currentUserId={currentUserId} onReply={onReply} />
      {visible.length > 0 && (
        <View style={styles.repliesBlock}>
          {/* Vertical connector line */}
          <View style={styles.threadLine} />
          <View style={{ flex: 1 }}>
            {visible.map((reply, idx) => (
              <View key={reply.id} style={[styles.replyRow, idx > 0 && { marginTop: 6 }]}>
                <CommentRow comment={reply} currentUserId={currentUserId} onReply={onReply} />
              </View>
            ))}
            {!showAll && hiddenCnt > 0 && (
              <TouchableOpacity style={styles.showMoreReplies} onPress={() => setShowAll(true)} activeOpacity={0.7}>
                <View style={styles.showMoreDots}>
                  <View style={styles.showMoreDot} />
                  <View style={styles.showMoreDot} />
                  <View style={styles.showMoreDot} />
                </View>
                <Text style={styles.showMoreRepliesText}>
                  Show {hiddenCnt} more {hiddenCnt === 1 ? "reply" : "replies"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Swipeable post wrapper ───────────────────────────────────────────────────
