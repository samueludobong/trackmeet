import React, { useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Modal, Pressable,
  ScrollView,
} from "react-native";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSheetDragClose } from "../../hooks/useSheetDragClose";
import { DragGrabber } from "../common/DragGrabber";
import { type Post } from "../../app/data/mock";
import { styles } from "../../assets/styles/post/PostActionsOverlay";

const DANGER = "#ff3b30";
const ACCENT = "#1DB954";
const PURPLE = "#AB00FF";

export type PostActionsHandlers = {
  /** Music posts only: open the Add-to-Playlist sheet. */
  onAddToPlaylist?: () => void;
  /** Music posts only: open the track in Spotify. */
  onOpenInSpotify?: () => void;
  /** Music posts only: search the artist in Spotify. */
  onViewArtist?: () => void;
  /** Music posts only: stub for starting a Meet. */
  onStartMeet?: () => void;
  /** Music posts only: follow the artist (placeholder). */
  onFollowArtist?: () => void;
  /** Video/Image posts: stub for saving media. */
  onSaveMedia?: () => void;
  /** Poll posts only: open the detail to view results. */
  onViewPollResults?: () => void;
  /** Universal — save to a collection. */
  onSaveToCollection?: () => void;
  /** Non-owner: follow / unfollow the post's author. */
  onToggleFollowUser?: () => void;
  /** Non-owner: report the post. */
  onReportPost?: () => void;
  /** Hide the post from the feed (universal). */
  onNotInterested?: () => void;
  /** Owner: edit the post. */
  onEditPost?: () => void;
  /** Owner: delete the post. */
  onDeletePost?: () => void;
};

/**
 * Bottom-sheet post actions menu — replaces the floating dropdown that used
 * to anchor under the "···" button. Matches the rest of the app's sheets:
 * slide up from bottom, drag-to-close via DragGrabber, backdrop fade tied to
 * drag distance.
 *
 * Menu rows adapt to:
 *   - Post type (music / video / image / poll)
 *   - Ownership (currentUserId === post.authorId)
 *   - isFollowing for the follow/unfollow row label
 */
export function PostActionsOverlay({
  post, isOwnPost, isFollowing, onClose, handlers,
}: {
  post: Post;
  isOwnPost: boolean;
  isFollowing: boolean;
  onClose: () => void;
  handlers: PostActionsHandlers;
}) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(600)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 200 }),
      Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, []);

  const close = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 600, duration: 220, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(onClose);
  };

  const { panHandlers, stretch } = useSheetDragClose({ slideAnim, onClose: close, closedValue: 600 });
  const dragBackdrop = slideAnim.interpolate({
    inputRange: [0, 600], outputRange: [1, 0], extrapolate: "clamp",
  });

  // Helper: run a handler then close the sheet.
  const wrap = (fn?: () => void) => () => { close(); fn?.(); };

  return (
    <Modal transparent animationType="none" statusBarTranslucent onRequestClose={close}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: "rgba(0,0,0,0.55)" },
          { opacity: Animated.multiply(backdropAnim, dragBackdrop) },
        ]}
        pointerEvents="none"
      />
      <Pressable style={StyleSheet.absoluteFill} onPress={close} />

      <Animated.View
        style={[
          styles.sheet,
          { paddingBottom: insets.bottom + 16 },
          { transform: [{ translateY: slideAnim }, { scaleY: stretch }] },
        ]}
      >
        <DragGrabber panHandlers={panHandlers} />
        <Text style={styles.title}>Post options</Text>

        <ScrollView
          style={{ maxHeight: 520 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 8 }}
        >
          {/* ── Music-specific ── */}
          {post.type === "music" && (
            <>
              <MenuRow
                icon="musical-notes"
                color={ACCENT}
                label="Add to Playlist"
                onPress={wrap(handlers.onAddToPlaylist)}
              />
              <MenuRow
                icon="open-outline"
                color={ACCENT}
                label="Open in Spotify"
                onPress={wrap(handlers.onOpenInSpotify)}
              />
              <MenuRow
                icon="eye-outline"
                color={ACCENT}
                label="View Artist Profile"
                onPress={wrap(handlers.onViewArtist)}
              />
              <MenuRow
                ionicon={false}
                icon="broadcast-tower"
                color={PURPLE}
                label="Start a Meet with this"
                onPress={wrap(handlers.onStartMeet)}
              />
              {!isOwnPost && (
                <MenuRow
                  icon="person-add"
                  color={PURPLE}
                  label="Follow Artist"
                  onPress={wrap(handlers.onFollowArtist)}
                />
              )}
            </>
          )}

          {/* ── Video / Image / Poll specifics ── */}
          {post.type === "video" && (
            <MenuRow
              icon="download-outline"
              color={PURPLE}
              label="Save Video"
              onPress={wrap(handlers.onSaveMedia)}
            />
          )}
          {post.type === "image" && (
            <MenuRow
              icon="image-outline"
              color={PURPLE}
              label="Save Image"
              onPress={wrap(handlers.onSaveMedia)}
            />
          )}
          {post.type === "poll" && (
            <MenuRow
              icon="bar-chart-outline"
              color={PURPLE}
              label="View Poll Results"
              onPress={wrap(handlers.onViewPollResults)}
            />
          )}

          {/* ── Universal ── */}
          <MenuRow
            icon="bookmark-outline"
            color={PURPLE}
            label="Save to Collection"
            onPress={wrap(handlers.onSaveToCollection)}
          />

          {/* ── Non-owner actions ── */}
          {!isOwnPost && (
            <>
              <View style={styles.divider} />
              <MenuRow
                icon={isFollowing ? "checkmark" : "person-add-outline"}
                color={PURPLE}
                label={`${isFollowing ? "Following" : "Follow"} ${post.user}`}
                onPress={wrap(handlers.onToggleFollowUser)}
              />
              <MenuRow
                icon="eye-off-outline"
                color="rgba(255,255,255,0.55)"
                label="Not Interested"
                onPress={wrap(handlers.onNotInterested)}
              />
              <MenuRow
                icon="flag-outline"
                color="rgba(255,255,255,0.55)"
                label="Report Post"
                onPress={wrap(handlers.onReportPost)}
              />
            </>
          )}

          {/* ── Owner actions ── */}
          {isOwnPost && (
            <>
              <View style={styles.divider} />
              <MenuRow
                icon="create-outline"
                color="rgba(255,255,255,0.7)"
                label="Edit Post"
                onPress={wrap(handlers.onEditPost)}
              />
              <MenuRow
                ionicon={false}
                icon="trash-alt"
                color={DANGER}
                label="Delete Post"
                danger
                onPress={wrap(handlers.onDeletePost)}
              />
            </>
          )}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

function MenuRow({
  icon, ionicon = true, color, label, danger, onPress,
}: {
  icon: string;
  /** True (default) → Ionicons. False → FontAwesome5. */
  ionicon?: boolean;
  color: string;
  label: string;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.row, danger && styles.rowDanger]}
      activeOpacity={0.8}
      onPress={onPress}
    >
      <View style={[styles.iconWrap, { backgroundColor: hexToBg(color) }]}>
        {ionicon ? (
          <Ionicons name={icon as any} size={17} color={color} />
        ) : (
          <FontAwesome5 name={icon as any} size={14} color={color} />
        )}
      </View>
      <Text style={[styles.label, danger && { color: DANGER }]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/** Build a subtle tinted background from a foreground colour. */
function hexToBg(color: string) {
  // Spotify / accent palette uses well-known hexes — map them by hand to a
  // semi-transparent tint. Falls back to a generic translucent white.
  if (color === ACCENT) return "rgba(29,185,84,0.12)";
  if (color === PURPLE) return "rgba(171,0,255,0.14)";
  if (color === DANGER) return "rgba(255,59,48,0.13)";
  return "rgba(255,255,255,0.06)";
}
