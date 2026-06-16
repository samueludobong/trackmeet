import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { styles } from "../../assets/styles/feed/styles";
import { OpenDetailCtx, FeedUserCtx, usePostActions } from "../../lib/feed/contexts";
import { type Post } from "../../app/data/mock";
import { getPostComments, deletePost } from "../../services/posts";
import { followUser, unfollowUser, checkIsFollowing } from "../../services/follows";
import { openSpotifyLink } from "../../lib/spotify";
import { AddToPlaylistSheet } from "../../components/AddToPlaylistSheet";
import { PostActionsOverlay } from "./PostActionsOverlay";
import { UnrepostConfirmOverlay } from "./UnrepostConfirmOverlay";

export function ActionRow({ post }: { post: Post }) {
  const { currentUserId, likedPostIds, onToggleLike, repostedPostIds, onToggleRepost } = useContext(FeedUserCtx);
  const liked = likedPostIds.has(post.id);
  const reposted = repostedPostIds.has(post.id);
  const [menuOpen, setMenuOpen] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [commentsCount, setCommentsCount] = useState(post.comments);
  const [repostCount, setRepostCount] = useState(post.reposts ?? 0);
  const [unrepostConfirmOpen, setUnrepostConfirmOpen] = useState(false);

  const openDetail = useContext(OpenDetailCtx);
  const { onRemovePost } = usePostActions();
  const router = useRouter();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const isOwnPost = !!post.authorId && post.authorId === currentUserId;

  // Refresh follow state when the menu opens so the row reads "Following" if
  // they already are.
  useEffect(() => {
    if (menuOpen && post.authorId && !isOwnPost) {
      checkIsFollowing(post.authorId).then(setIsFollowing).catch(() => {});
    }
  }, [menuOpen]);

  useEffect(() => {
    setLikeCount(post.likes);
  }, [post.likes]);

  useEffect(() => {
    setRepostCount(post.reposts ?? 0);
  }, [post.reposts]);

  const handleRepost = () => {
    if (!currentUserId) return;
    // Already reposted? Don't auto-undo on a single tap — show the confirm
    // sheet. The first repost is silent though (easy to undo, no warning).
    if (reposted) {
      setUnrepostConfirmOpen(true);
      return;
    }
    setRepostCount((c) => c + 1);
    onToggleRepost(post.id);
  };

  const confirmUnrepost = () => {
    setRepostCount((c) => Math.max(0, c - 1));
    onToggleRepost(post.id);
  };

  useEffect(() => {
    getPostComments(post.id).then((comments) => {
      setCommentsCount(comments.length);
    });
  }, []);

  const handleLike = () => {
    if (!currentUserId) return;
    setLikeCount((c) => (liked ? Math.max(0, c - 1) : c + 1));
    onToggleLike(post.id);
  };

  // ── Menu action handlers — invoked from the bottom-sheet ─────────────────
  // Each handler does NOT close the sheet itself; PostActionsOverlay wraps
  // every action so the sheet closes first, then the handler fires.
  const openInSpotify = () => {
    if (post.songId) openSpotifyLink(`spotify:track:${post.songId}`, `https://open.spotify.com/track/${post.songId}`);
  };
  const searchArtistOnSpotify = () => {
    const q = encodeURIComponent(post.artist ?? post.user ?? "");
    openSpotifyLink(`spotify:search:${q}`, `https://open.spotify.com/search/${encodeURIComponent(q)}`);
  };
  const addToPlaylist = () => { setPickerOpen(true); };
  const viewPollResults = () => { openDetail?.(); };
  const toggleFollowUser = async () => {
    if (!post.authorId) return;
    if (isFollowing) { setIsFollowing(false); await unfollowUser(post.authorId); }
    else { setIsFollowing(true); const r = await followUser(post.authorId); if (r.error) setIsFollowing(false); }
  };
  const notInterested = () => { onRemovePost(post.id); };
  const confirmDelete = () => {
    Alert.alert("Delete post?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try { await deletePost(post.id); onRemovePost(post.id); }
          catch (e: any) { Alert.alert("Couldn't delete", e?.message ?? "Try again."); }
        },
      },
    ]);
  };
  const reportPost = () => { Alert.alert("Reported", "Thanks — we'll review this post."); };
  const comingSoon = (what: string) => () => { Alert.alert("Coming soon", `${what} isn't available yet.`); };

  return (
    <View style={styles.actionRow}>
      <TouchableOpacity
        style={styles.actionBtn}
        activeOpacity={0.7}
        onPress={handleLike}
      >
        <Ionicons
          name={liked ? "heart" : "heart-outline"}
          size={25}
          color={liked ? "#E8000F" : "rgba(255,255,255,0.7)"}
        />
        {likeCount > 0 && (
          <Text style={[styles.actionCount, liked && styles.actionCountLiked]}>
            {likeCount}
          </Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
        <Ionicons
          name="chatbubble-outline"
          size={22}
          color="rgba(255,255,255,0.7)"
        />
        {commentsCount > 0 && (
          <Text style={styles.actionCount}>{commentsCount}</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.actionBtn}
        activeOpacity={0.7}
        onPress={handleRepost}
      >
        <Ionicons
          name="repeat"
          size={25}
          color={reposted ? "#1DB954" : "rgba(255,255,255,0.7)"}
        />
        {repostCount > 0 && (
          <Text style={[styles.actionCount, reposted && { color: "#1DB954" }]}>
            {repostCount}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionBtn}
        activeOpacity={0.7}
        onPress={() => {}}
      >
        <Ionicons
          name="share-outline"
          size={22}
          color="rgba(255,255,255,0.7)"
        />
        {post.shares > 0 && (
          <Text style={styles.actionCount}>{post.shares}</Text>
        )}
      </TouchableOpacity>
      <View style={{ flex: 1 }} />
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setMenuOpen(true)}
      >
        <Text style={styles.moreIcon}>···</Text>
      </TouchableOpacity>

      {unrepostConfirmOpen && (
        <UnrepostConfirmOverlay
          post={post}
          onClose={() => setUnrepostConfirmOpen(false)}
          onConfirm={confirmUnrepost}
        />
      )}

      {menuOpen && (
        <PostActionsOverlay
          post={post}
          isOwnPost={isOwnPost}
          isFollowing={isFollowing}
          onClose={() => setMenuOpen(false)}
          handlers={{
            onAddToPlaylist: addToPlaylist,
            onOpenInSpotify: openInSpotify,
            onViewArtist: searchArtistOnSpotify,
            onStartMeet: comingSoon("Starting a Meet from a post"),
            onFollowArtist: comingSoon("Following the artist"),
            onSaveMedia: comingSoon("Saving media"),
            onViewPollResults: viewPollResults,
            onSaveToCollection: comingSoon("Collections"),
            onToggleFollowUser: toggleFollowUser,
            onReportPost: reportPost,
            onNotInterested: notInterested,
            onEditPost: comingSoon("Editing posts"),
            onDeletePost: confirmDelete,
          }}
        />
      )}

      <AddToPlaylistSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        userId={currentUserId}
        track={post.songId ? {
          id: post.songId,
          name: post.song ?? "",
          artist: post.artist ?? null,
          albumArt: post.albumArt ?? null,
          durationMs: null,
        } : null}
      />
    </View>
  );
}

// ─── Lightbox styles ─────────────────────────────────────────────────────────

// ─── Fullscreen image lightbox ─────────────────────────────────────────────────
