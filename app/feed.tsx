import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Animated,
  Modal,
  Pressable,
  TextInput,
  Platform,
  PanResponder,
  Switch,
  Keyboard,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRef, useState, useEffect, createContext, useContext } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import {
  AVATAR_MAP,
  STORIES, POSTS, DUMMY_COMMENTS, NAV_ITEMS,
  FAKE_PHOTO_COLORS,
  DISCOVER_FILTERS, CAROUSEL_CARD_W, CAROUSEL_GAP, CAROUSEL_ITEMS,
  TRENDING_ARTISTS, FOR_YOU_RECS, UPCOMING_MEETS,
  MEETS_STREAMS,
  DIRECT_MESSAGES, GROUP_CHATS, COMMUNITY_ITEMS, MESSAGES_UNREAD, CHAT_MESSAGES,
  PROFILE_TABS, PROFILE_POSTS, PROFILE_REPOSTS,
  DUMMY_PLAYLISTS, DUMMY_COMMUNITIES, ALL_SONGS, PLAYLIST_SONGS,
  fmtCount,
  type Post, type DummyComment, type DummyPlaylist, type DummySong,
  type DummyCommunity, type CarouselItem, type ProfileTab, type MeetStream,
  type DirectMessage, type GroupChat, type CommunityItem, type ChatMessage,
} from "./data/mock";

const { width: SW, height: SH } = Dimensions.get("window");

const NAVBAR_H = 70;
const BOTTOM_INSET = 34;
const COMPOSER_ABOVE_NAV = NAVBAR_H + BOTTOM_INSET + 8;

// Lets any component inside a post card open the detail view without prop-drilling through card types
const OpenDetailCtx = createContext<(() => void) | undefined>(undefined);


// ─── Story bubble ─────────────────────────────────────────────────────────────

function StoryBubble({ item }: { item: (typeof STORIES)[0] }) {
  const photo = AVATAR_MAP[item.name];
  return (
    <TouchableOpacity style={styles.storyItem} activeOpacity={0.8}>
      <View style={[styles.storyRing, { borderColor: item.color }]}>
        {photo ? (
          <Image source={photo} style={styles.storyAvatar} />
        ) : (
          <View style={[styles.storyAvatar, { backgroundColor: item.color + "25" }]}>
            <Text style={[styles.storyInitials, { color: item.color }]}>{item.initials}</Text>
          </View>
        )}
      </View>
      <Text style={styles.storyName} numberOfLines={1}>{item.name}</Text>
    </TouchableOpacity>
  );
}

// ─── Action row ───────────────────────────────────────────────────────────────

function ActionRow({ post }: { post: Post }) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes);
  const openDetail = useContext(OpenDetailCtx);

  const handleLike = () => {
    setLiked((prev) => {
      setLikeCount((c) => (prev ? c - 1 : c + 1));
      return !prev;
    });
  };

  return (
    <View style={styles.actionRow}>
      <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={handleLike}>
        <Text style={[styles.actionIcon, liked && styles.actionIconLiked]}>{liked ? "♥" : "♡"}</Text>
        {likeCount > 0 && <Text style={[styles.actionCount, liked && styles.actionCountLiked]}>{likeCount}</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={openDetail}>
        <Text style={styles.actionIcon}>💬</Text>
        {post.comments > 0 && <Text style={styles.actionCount}>{post.comments}</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={() => {}}>
        <Text style={styles.actionIcon}>↗</Text>
        {post.shares > 0 && <Text style={styles.actionCount}>{post.shares}</Text>}
      </TouchableOpacity>
      <View style={{ flex: 1 }} />
      <TouchableOpacity activeOpacity={0.7} onPress={() => {}}>
        <Text style={styles.moreIcon}>···</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Post header ──────────────────────────────────────────────────────────────

function PostHeader({ post }: { post: Post }) {
  const photo = AVATAR_MAP[post.user];
  return (
    <View style={styles.postHeader}>
      {photo ? (
        <Image source={photo} style={styles.postAvatar} />
      ) : (
        <View style={[styles.postAvatar, { backgroundColor: post.avatarColor + "22" }]}>
          <Text style={[styles.postAvatarText, { color: post.avatarColor }]}>{post.initials}</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.postUser}>{post.handle}</Text>
        <Text style={styles.postBio} numberOfLines={1}>{post.bio} · {post.time}</Text>
      </View>
    </View>
  );
}

// ─── Text card ────────────────────────────────────────────────────────────────

function TextCard({ post }: { post: Post }) {
  return (
    <View style={styles.card}>
      <PostHeader post={post} />
      <Text style={styles.postText}>{post.text}</Text>
      <ActionRow post={post} />
    </View>
  );
}

// ─── Image card ───────────────────────────────────────────────────────────────

function ImageCard({ post }: { post: Post }) {
  return (
    <View style={styles.card}>
      <PostHeader post={post} />
      {post.text && <Text style={styles.postText}>{post.text}</Text>}
      <View style={[styles.mediaBlock, { backgroundColor: post.mediaColor ?? "#1a1a1a" }]}>
        <Text style={styles.mediaPlaceholder}>🖼</Text>
      </View>
      <ActionRow post={post} />
    </View>
  );
}

// ─── Video card ───────────────────────────────────────────────────────────────

function VideoCard({ post }: { post: Post }) {
  return (
    <View style={styles.card}>
      <PostHeader post={post} />
      {post.text && <Text style={styles.postText}>{post.text}</Text>}
      <View style={[styles.mediaBlock, { backgroundColor: post.mediaColor ?? "#1a1a1a" }]}>
        <View style={styles.videoPlayCircle}>
          <Text style={styles.videoPlayIcon}>▶</Text>
        </View>
        {post.duration && (
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{post.duration}</Text>
          </View>
        )}
      </View>
      <ActionRow post={post} />
    </View>
  );
}

// ─── Music card (visual only, no playback) ────────────────────────────────────

function MusicCard({ post }: { post: Post }) {
  const accent = post.albumAccent ?? "#AB00FF";
  const bg = post.albumColor ?? "#111";

  return (
    <View style={styles.card}>
      <PostHeader post={post} />
      {post.text && <Text style={styles.postText}>{post.text}</Text>}

      <View style={[styles.musicPlayerCard, { backgroundColor: bg }]}>
        {/* Art area */}
        <View style={styles.musicArtArea}>
          <View style={[styles.musicArtFill, { backgroundColor: accent + "28" }]}>
            <Text style={styles.musicArtEmoji}>🎵</Text>
          </View>
          {/* Gradient fade from art to bottom info */}
          <View style={[styles.musicGradientOverlay, { backgroundColor: bg }]} />
          {/* Glass action buttons */}
          <View style={styles.musicTopRight}>
            <TouchableOpacity style={styles.musicGlassBtn} activeOpacity={0.8}>
              <Text style={styles.musicGlassBtnIcon}>↗</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.musicGlassBtn} activeOpacity={0.8}>
              <Text style={styles.musicGlassBtnIcon}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Song info + progress bar (no controls) */}
        <View style={styles.musicBottom}>
          <Text style={styles.musicSongTitle} numberOfLines={1}>{post.song}</Text>
          <Text style={styles.musicArtistName} numberOfLines={1}>{post.artist}</Text>

          <View style={styles.musicProgressRow}>
            <View style={styles.musicProgressTrack}>
              <View style={[styles.musicProgressFill, { backgroundColor: accent, width: "35%" }]}>
                <View style={styles.musicProgressThumb} />
              </View>
            </View>
          </View>
          <View style={styles.musicTimestamps}>
            <Text style={styles.musicTime}>0:55</Text>
            <Text style={styles.musicTime}>2:58</Text>
          </View>
        </View>
      </View>

      <ActionRow post={post} />
    </View>
  );
}

// ─── Poll card ────────────────────────────────────────────────────────────────

function PollCard({ post }: { post: Post }) {
  const [voted, setVoted] = useState<string | null>(null);
  const total = post.totalVotes ?? 1;

  return (
    <View style={styles.card}>
      <PostHeader post={post} />
      {post.text && <Text style={styles.postText}>{post.text}</Text>}

      <View style={styles.pollContainer}>
        <Text style={styles.pollQuestion}>{post.pollQuestion}</Text>
        <View style={styles.pollOptions}>
          {(post.pollOptions ?? []).map((opt) => {
            const pct = Math.round((opt.votes / total) * 100);
            const isWinner = opt.votes === Math.max(...(post.pollOptions ?? []).map((o) => o.votes));
            return (
              <TouchableOpacity
                key={opt.id}
                style={styles.pollOption}
                activeOpacity={0.8}
                onPress={() => { if (!voted) setVoted(opt.id); }}
              >
                {voted && (
                  <View
                    style={[
                      styles.pollFillBar,
                      { width: `${pct}%` as any, backgroundColor: isWinner ? "#AB00FF22" : "rgba(255,255,255,0.06)" },
                    ]}
                  />
                )}
                <View style={styles.pollOptionInner}>
                  <Text style={[styles.pollOptionLabel, voted === opt.id && { color: "#AB00FF" }]}>
                    {opt.label}
                  </Text>
                  {voted && (
                    <Text style={[styles.pollPct, isWinner && { color: "#AB00FF" }]}>{pct}%</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.pollMeta}>
          {total.toLocaleString()} votes · {voted ? "results" : "tap to vote"}
        </Text>
      </View>

      <ActionRow post={post} />
    </View>
  );
}

// ─── Post card router ─────────────────────────────────────────────────────────

function PostCard({ item }: { item: Post }) {
  if (item.type === "text") return <TextCard post={item} />;
  if (item.type === "image") return <ImageCard post={item} />;
  if (item.type === "video") return <VideoCard post={item} />;
  if (item.type === "music") return <MusicCard post={item} />;
  if (item.type === "poll") return <PollCard post={item} />;
  return null;
}

// ─── Comment row (swipeable, likeable) ────────────────────────────────────────

function CommentRow({
  comment,
  onQuickReply,
}: {
  comment: DummyComment;
  onQuickReply: (c: DummyComment) => void;
}) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(comment.likes);
  const translateX = useRef(new Animated.Value(0)).current;
  const isLocked = useRef(false);
  const onQuickReplyRef = useRef(onQuickReply);
  useEffect(() => { onQuickReplyRef.current = onQuickReply; }, [onQuickReply]);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, { dx, dy }) => {
        if (dx < -2 && Math.abs(dx) >= Math.abs(dy)) {
          isLocked.current = true;
          return true;
        }
        return false;
      },
      onShouldBlockNativeResponder: () => true,
      onPanResponderMove: (_, { dx }) => {
        if (dx < 0) translateX.setValue(Math.max(dx, -90));
      },
      onPanResponderRelease: (_, { dx }) => {
        isLocked.current = false;
        if (dx < -50) onQuickReplyRef.current(comment);
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 240 }).start();
      },
      onPanResponderTerminate: () => {
        isLocked.current = false;
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  const photo = AVATAR_MAP[comment.user];
  const indicatorOpacity = translateX.interpolate({ inputRange: [-70, -15, 0], outputRange: [1, 0, 0], extrapolate: "clamp" });

  const handleLike = () => {
    setLiked((prev) => {
      setLikeCount((c) => prev ? c - 1 : c + 1);
      return !prev;
    });
  };

  return (
    <View style={styles.commentWrap} {...pan.panHandlers}>
      {/* Reply indicator behind */}
      <Animated.View style={[styles.commentReplyHint, { opacity: indicatorOpacity }]}>
        <Text style={styles.replyIndicatorArrow}>←</Text>
        <Text style={styles.replyIndicatorLabel}>Reply</Text>
      </Animated.View>

      <Animated.View style={[styles.commentRow, { transform: [{ translateX }] }]}>
        {/* Avatar */}
        {photo ? (
          <Image source={photo} style={[styles.commentAvatar, { borderColor: comment.color + "55" }]} />
        ) : (
          <View style={[styles.commentAvatar, { backgroundColor: comment.color + "22", borderColor: comment.color + "55" }]}>
            <Text style={[styles.commentAvatarText, { color: comment.color }]}>{comment.initials}</Text>
          </View>
        )}

        {/* Bubble */}
        <View style={styles.commentBody}>
          <View style={styles.commentMeta}>
            <Text style={styles.commentHandle}>@{comment.user}</Text>
            <Text style={styles.commentTime}>{comment.time}</Text>
          </View>
          <Text style={styles.commentText}>{comment.text}</Text>
        </View>

        {/* Like */}
        <TouchableOpacity style={styles.commentLikeBtn} onPress={handleLike} activeOpacity={0.7}>
          <Text style={[styles.commentLikeIcon, liked && { color: "#FF3CAC" }]}>{liked ? "♥" : "♡"}</Text>
          <Text style={styles.commentLikeCount}>{likeCount}</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ─── Swipeable post wrapper ───────────────────────────────────────────────────

function SwipeablePost({
  item,
  onQuickReply,
  onScrollLock,
  onPress,
}: {
  item: Post;
  onQuickReply: (post: Post) => void;
  onScrollLock: (enabled: boolean) => void;
  onPress: () => void;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  // Ref so the PanResponder closure always sees the latest value without stale captures
  const onQuickReplyRef = useRef(onQuickReply);
  const onScrollLockRef = useRef(onScrollLock);
  const isLocked = useRef(false);
  // Blocks the tap overlay's onPress if a swipe gesture just happened
  const swipeActivated = useRef(false);
  useEffect(() => { onQuickReplyRef.current = onQuickReply; }, [onQuickReply]);
  useEffect(() => { onScrollLockRef.current = onScrollLock; }, [onScrollLock]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, { dx, dy }) => {
        if (dx < -2 && Math.abs(dx) >= Math.abs(dy)) {
          if (!isLocked.current) {
            isLocked.current = true;
            swipeActivated.current = true;
            onScrollLockRef.current(false);
          }
          return true;
        }
        return false;
      },
      onShouldBlockNativeResponder: () => true,
      onPanResponderMove: (_, { dx }) => {
        if (dx < 0) translateX.setValue(Math.max(dx, -100));
      },
      onPanResponderRelease: (_, { dx }) => {
        isLocked.current = false;
        onScrollLockRef.current(true);
        if (dx < -55) onQuickReplyRef.current(item);
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 220,
        }).start();
        // Clear the flag after Pressable's onPress window has passed
        setTimeout(() => { swipeActivated.current = false; }, 300);
      },
      onPanResponderTerminate: () => {
        isLocked.current = false;
        swipeActivated.current = false;
        onScrollLockRef.current(true);
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  const indicatorOpacity = translateX.interpolate({
    inputRange: [-80, -20, 0],
    outputRange: [1, 0, 0],
    extrapolate: "clamp",
  });
  const indicatorSlide = translateX.interpolate({
    inputRange: [-80, -20, 0],
    outputRange: [0, 10, 16],
    extrapolate: "clamp",
  });

  return (
    <View style={styles.swipeContainer} {...panResponder.panHandlers}>
      {/* Reply label — sits at right edge behind the card, revealed as it slides */}
      <Animated.View
        style={[
          styles.replyIndicator,
          { opacity: indicatorOpacity, transform: [{ translateX: indicatorSlide }] },
        ]}
      >
        <Text style={styles.replyIndicatorArrow}>←</Text>
        <Text style={styles.replyIndicatorLabel}>Reply</Text>
      </Animated.View>

      {/* Card slides left on top of the indicator */}
      <OpenDetailCtx.Provider value={onPress}>
        <Animated.View style={{ transform: [{ translateX }] }}>
          <PostCard item={item} />
          {/* Invisible tap area — covers the card body but stops above the action row
              so action buttons (like, comment, share) receive their own touches */}
          <Pressable
            style={[StyleSheet.absoluteFill, { bottom: 58 }]}
            onPress={() => { if (!swipeActivated.current) onPress(); }}
          />
        </Animated.View>
      </OpenDetailCtx.Provider>
    </View>
  );
}

// ─── Quick reply overlay ──────────────────────────────────────────────────────

function QuickReplyOverlay({
  post,
  onClose,
  onOpenDetail,
}: {
  post: Post;
  onClose: () => void;
  onOpenDetail: () => void;
}) {
  const [text, setText] = useState("");
  const [menuVisible, setMenuVisible] = useState(false);
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
        <Pressable style={styles.qrInputGlass} onPress={() => {}}>
          {/* + button — opens the same "Add to post" sheet */}
          <TouchableOpacity
            style={styles.qrPlusBtn}
            activeOpacity={0.8}
            onPress={() => setMenuVisible(true)}
          >
            <Text style={styles.qrPlusBtnIcon}>+</Text>
          </TouchableOpacity>

          <View style={[styles.qrAvatar, { backgroundColor: "#AB00FF22" }]}>
            <Text style={[styles.qrAvatarText, { color: "#AB00FF" }]}>Y</Text>
          </View>
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
            />
          </View>
          <TouchableOpacity
            style={[styles.qrSend, !text && { opacity: 0.35 }]}
            disabled={!text}
            activeOpacity={0.8}
          >
            <Text style={styles.qrSendIcon}>↑</Text>
          </TouchableOpacity>
        </Pressable>
      </Animated.View>

      {/* Action sheet — opens on top of this overlay */}
      <ComposerActionMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />
    </Modal>
  );
}

// ─── Composer action menu (styled like Claude "Add to Chat" sheet) ────────────

function ComposerActionMenu({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [locationOn, setLocationOn] = useState(false);
  const [commentsOn, setCommentsOn] = useState(true);
  const slideAnim = useRef(new Animated.Value(500)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const open = () => {
    slideAnim.setValue(500);
    backdropAnim.setValue(0);
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 24, stiffness: 220 }),
      Animated.timing(backdropAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const close = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 500, duration: 200, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  useEffect(() => {
    if (visible) open();
  }, [visible]);

  const LIST_ROWS = [
    { icon: "↑", label: "Add files", right: null },
    { icon: "🎵", label: "Add track", right: "Search" },
    { icon: "🎧", label: "From playlist", right: "My Library" },
    { icon: "🔒", label: "Privacy", right: "Public" },
  ];

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={close}>
      <Animated.View style={[styles.menuBackdrop, { opacity: backdropAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
      </Animated.View>

      <Animated.View style={[styles.menuSheet, { transform: [{ translateY: slideAnim }] }]}>
        {/* Handle */}
        <View style={styles.menuHandle} />

        {/* Header row: X | Title | All photos */}
        <View style={styles.menuHeader}>
          <TouchableOpacity style={styles.menuXBtn} onPress={close} activeOpacity={0.8}>
            <Text style={styles.menuXBtnIcon}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.menuHeaderTitle}>Add to post</Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.menuHeaderRight}>All photos</Text>
          </TouchableOpacity>
        </View>

        {/* Photo strip: camera box + fake thumbnails */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.menuPhotoStrip}
          style={{ marginBottom: 4 }}
        >
          <TouchableOpacity style={styles.menuCameraBox} activeOpacity={0.8} onPress={close}>
            <Text style={styles.menuCameraIcon}>📷</Text>
            <Text style={styles.menuCameraLabel}>Camera</Text>
          </TouchableOpacity>
          {FAKE_PHOTO_COLORS.map((color, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.menuPhotoThumb, { backgroundColor: color }]}
              activeOpacity={0.8}
              onPress={close}
            />
          ))}
        </ScrollView>

        {/* Divider */}
        <View style={styles.menuSectionDivider} />

        {/* List rows */}
        <View style={styles.menuSection}>
          {LIST_ROWS.map((row, i) => (
            <TouchableOpacity
              key={row.label}
              style={[styles.menuRow, i < LIST_ROWS.length - 1 && styles.menuRowBorder]}
              activeOpacity={0.65}
              onPress={close}
            >
              <View style={styles.menuRowIconBox}>
                <Text style={styles.menuRowIconText}>{row.icon}</Text>
              </View>
              <Text style={styles.menuRowLabel}>{row.label}</Text>
              {row.right && (
                <View style={styles.menuRowRight}>
                  <Text style={styles.menuRowRightText}>{row.right}</Text>
                  <Text style={styles.menuRowChevron}>›</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Divider */}
        <View style={styles.menuSectionDivider} />

        {/* Toggle rows */}
        <View style={styles.menuSection}>
          {[
            { icon: "📍", label: "Location", value: locationOn, set: setLocationOn },
            { icon: "💬", label: "Allow comments", value: commentsOn, set: setCommentsOn },
          ].map((row, i, arr) => (
            <View
              key={row.label}
              style={[styles.menuRow, i < arr.length - 1 && styles.menuRowBorder]}
            >
              <View style={styles.menuRowIconBox}>
                <Text style={styles.menuRowIconText}>{row.icon}</Text>
              </View>
              <Text style={styles.menuRowLabel}>{row.label}</Text>
              <Switch
                value={row.value}
                onValueChange={row.set}
                trackColor={{ false: "rgba(255,255,255,0.15)", true: "#AB00FF" }}
                thumbColor="#ffffff"
                style={styles.menuToggle}
              />
            </View>
          ))}
        </View>

        {/* Divider */}
        <View style={styles.menuSectionDivider} />

        {/* Settings row */}
        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuRow} activeOpacity={0.65} onPress={close}>
            <View style={styles.menuRowIconBox}>
              <Text style={styles.menuRowIconText}>⚙️</Text>
            </View>
            <Text style={styles.menuRowLabel}>Post settings</Text>
            <Text style={[styles.menuRowChevron, { marginLeft: "auto" }]}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: BOTTOM_INSET + 8 }} />
      </Animated.View>
    </Modal>
  );
}

// ─── Trending carousel ────────────────────────────────────────────────────────

function TrendingCarousel({
  joinedMeets,
  followedArtists,
  onJoinMeet,
  onFollowArtist,
}: {
  joinedMeets: Set<string>;
  followedArtists: Set<string>;
  onJoinMeet: (id: string) => void;
  onFollowArtist: (id: string) => void;
}) {
  const flatRef = useRef<FlatList<CarouselItem>>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const activeIdxRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceRef = useRef<() => void>(() => {});

  advanceRef.current = () => {
    const next = (activeIdxRef.current + 1) % CAROUSEL_ITEMS.length;
    activeIdxRef.current = next;
    setActiveIdx(next);
    flatRef.current?.scrollToIndex({ index: next, animated: true });
    timerRef.current = setTimeout(() => advanceRef.current(), 3500);
  };

  useEffect(() => {
    timerRef.current = setTimeout(() => advanceRef.current(), 3500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const resetTimer = (idx: number) => {
    activeIdxRef.current = idx;
    setActiveIdx(idx);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => advanceRef.current(), 3500);
  };

  const onScrollEnd = (e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.max(0, Math.min(Math.round(x / (CAROUSEL_CARD_W + CAROUSEL_GAP)), CAROUSEL_ITEMS.length - 1));
    resetTimer(idx);
  };

  return (
    <View style={{ marginBottom: 28 }}>
      <FlatList
        ref={flatRef}
        data={CAROUSEL_ITEMS}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CAROUSEL_CARD_W + CAROUSEL_GAP}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: 16, gap: CAROUSEL_GAP }}
        onMomentumScrollEnd={onScrollEnd}
        scrollEventThrottle={16}
        renderItem={({ item }) => {
          const isEvent = item.type === "event";
          const isArtist = item.type === "artist";
          const isJoined = isEvent && joinedMeets.has(item.ctaId);
          const isFollowing = isArtist && followedArtists.has(item.ctaId);
          const ctaActive = isJoined || isFollowing;
          return (
            <View style={[ds.carouselCard, { width: CAROUSEL_CARD_W }]}>
              <LinearGradient colors={item.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={ds.featuredGradient}>
                <View style={[ds.decoCircle, { width: 200, height: 200, top: -60, right: -60, backgroundColor: item.deco1 }]} />
                <View style={[ds.decoCircle, { width: 130, height: 130, bottom: -40, left: -30, backgroundColor: item.deco2 }]} />
                <View style={ds.featuredBadge}>
                  <Text style={ds.featuredBadgeText}>{item.badge}</Text>
                </View>
                <View style={{ flex: 1 }} />
                <View style={ds.featuredBottom}>
                  <Text style={ds.featuredTitle}>{item.title}</Text>
                  <Text style={ds.featuredSub}>{item.sub}</Text>
                  <View style={ds.featuredRow}>
                    <View style={{ flexDirection: "row", gap: 6 }}>
                      {item.tags.map((t) => (
                        <View key={t} style={ds.featuredTag}><Text style={ds.featuredTagText}>{t}</Text></View>
                      ))}
                    </View>
                    <TouchableOpacity
                      style={[ds.featuredCta, ctaActive && ds.featuredCtaActive]}
                      activeOpacity={0.85}
                      onPress={() => {
                        if (isEvent) onJoinMeet(item.ctaId);
                        else if (isArtist) onFollowArtist(item.ctaId);
                      }}
                    >
                      <Text style={[ds.featuredCtaText, ctaActive && ds.featuredCtaTextActive]}>
                        {isJoined ? "✓ Going" : isFollowing ? "✓ Following" : item.cta}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </LinearGradient>
            </View>
          );
        }}
      />
      <View style={ds.dotRow}>
        {CAROUSEL_ITEMS.map((_, i) => (
          <TouchableOpacity
            key={i}
            activeOpacity={0.8}
            onPress={() => {
              flatRef.current?.scrollToIndex({ index: i, animated: true });
              resetTimer(i);
            }}
          >
            <View style={[ds.dot, i === activeIdx && ds.dotActive]} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ─── Discover view ────────────────────────────────────────────────────────────

function DiscoverView() {
  const [activeFilter, setActiveFilter]       = useState("All");
  const [searchText, setSearchText]           = useState("");
  const [joinedMeets, setJoinedMeets]         = useState<Set<string>>(new Set());
  const [followedArtists, setFollowedArtists] = useState<Set<string>>(new Set());
  const [likedRecs, setLikedRecs]             = useState<Set<string>>(new Set());

  const toggleSet = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) =>
    setter((p) => { const s = new Set(p); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const showCarousel = activeFilter === "All" || activeFilter === "Events";
  const showArtists  = activeFilter === "All" || activeFilter === "Artists";
  const showForYou   = activeFilter === "All" || activeFilter === "Artists";
  const showMeets    = activeFilter === "All" || activeFilter === "Events";
  const showStories  = activeFilter === "Stories";

  const q = searchText.toLowerCase();
  const filteredArtists = TRENDING_ARTISTS.filter((a) => !q || a.name.toLowerCase().includes(q) || a.genre.toLowerCase().includes(q));
  const filteredMeets   = UPCOMING_MEETS.filter((m)   => !q || m.title.toLowerCase().includes(q) || m.tags.some((t) => t.toLowerCase().includes(q)));
  const filteredRecs    = FOR_YOU_RECS.filter((r)     => !q || r.title.toLowerCase().includes(q) || r.artist.toLowerCase().includes(q));
  const noResults       = q && filteredArtists.length === 0 && filteredMeets.length === 0 && filteredRecs.length === 0;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={ds.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {/* Header */}
      <View style={ds.header}>
        <Text style={ds.headerTitle}>Discover</Text>
        <TouchableOpacity style={ds.iconBtn} activeOpacity={0.7}>
          <Ionicons name="options-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={ds.searchWrap}>
        <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.35)" style={{ marginRight: 8 }} />
        <TextInput
          style={ds.searchInput}
          placeholder="Search artists, events, music…"
          placeholderTextColor="rgba(255,255,255,0.3)"
          value={searchText}
          onChangeText={setSearchText}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText("")} activeOpacity={0.7}>
            <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.35)" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ds.filtersRow} style={{ marginBottom: 24 }}>
        {DISCOVER_FILTERS.map((f) => {
          const active = f === activeFilter;
          return (
            <TouchableOpacity key={f} style={[ds.filterPill, active && ds.filterPillActive]} activeOpacity={0.7} onPress={() => setActiveFilter(f)}>
              <Text style={[ds.filterPillText, active && ds.filterPillTextActive]}>{f}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Carousel */}
      {showCarousel && !q && (
        <TrendingCarousel
          joinedMeets={joinedMeets}
          followedArtists={followedArtists}
          onJoinMeet={(id) => toggleSet(setJoinedMeets, id)}
          onFollowArtist={(id) => toggleSet(setFollowedArtists, id)}
        />
      )}

      {/* Stories */}
      {showStories && (
        <>
          <View style={[ds.sectionHeader, { marginTop: 4 }]}>
            <Text style={ds.sectionTitle}>Stories</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ds.storiesRow} style={{ marginBottom: 32 }}>
            {STORIES.map((s) => {
              const photo = AVATAR_MAP[s.name];
              return (
                <TouchableOpacity key={s.id} style={ds.storyItem2} activeOpacity={0.8}>
                  <View style={[ds.storyRing2, { borderColor: s.color }]}>
                    {photo ? (
                      <Image source={photo} style={ds.storyAvatar2} />
                    ) : (
                      <View style={[ds.storyAvatar2, { backgroundColor: s.color + "25", alignItems: "center", justifyContent: "center" }]}>
                        <Text style={{ fontSize: 20, fontWeight: "800", color: s.color }}>{s.initials}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={ds.storyName2} numberOfLines={1}>{s.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </>
      )}

      {/* Trending Artists */}
      {showArtists && filteredArtists.length > 0 && (
        <>
          <View style={ds.sectionHeader}>
            <Text style={ds.sectionTitle}>Trending Artists</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ds.artistsRow} style={{ marginBottom: 32 }}>
            {filteredArtists.map((a) => {
              const photo = AVATAR_MAP[a.user];
              const following = followedArtists.has(a.id);
              return (
                <View key={a.id} style={ds.artistCard}>
                  <View style={[ds.artistAvatarRing, { borderColor: a.color }]}>
                    {photo ? (
                      <Image source={photo} style={ds.artistAvatar} />
                    ) : (
                      <View style={[ds.artistAvatar, { backgroundColor: a.color + "25", alignItems: "center", justifyContent: "center" }]}>
                        <Text style={[ds.artistInitials, { color: a.color }]}>{a.initials}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={ds.artistName} numberOfLines={1}>{a.name}</Text>
                  <Text style={ds.artistGenre}>{a.genre}</Text>
                  <TouchableOpacity
                    style={[ds.followBtn, following && { backgroundColor: a.color, borderColor: a.color }]}
                    activeOpacity={0.8}
                    onPress={() => toggleSet(setFollowedArtists, a.id)}
                  >
                    <Text style={[ds.followBtnText, following && ds.followBtnTextActive]}>
                      {following ? "Following" : "Follow"}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
        </>
      )}

      {/* For You */}
      {showForYou && filteredRecs.length > 0 && (
        <>
          <View style={ds.sectionHeader}>
            <Text style={ds.sectionTitle}>For You</Text>
            <Text style={ds.sectionSub}>Based on who you follow</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ds.recsRow} style={{ marginBottom: 32 }}>
            {filteredRecs.map((rec) => {
              const photo = AVATAR_MAP[rec.user];
              const liked = likedRecs.has(rec.id);
              const accentColor = rec.color === "#CAFF00" ? "#A8D400" : rec.color;
              const likeBtn = (
                <TouchableOpacity onPress={() => toggleSet(setLikedRecs, rec.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name={liked ? "heart" : "heart-outline"} size={15} color={liked ? "#FF3CAC" : "rgba(255,255,255,0.3)"} />
                </TouchableOpacity>
              );

              if (rec.type === "song") {
                return (
                  <TouchableOpacity key={rec.id} style={[ds.recCard, { borderColor: rec.color + "30" }]} activeOpacity={0.85}>
                    {/* Album art — vinyl aesthetic */}
                    <View style={ds.songThumb}>
                      <LinearGradient
                        colors={[rec.color + "18", rec.color + "55"]}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      {/* Vinyl rings */}
                      <View style={[ds.vinylRing, { width: 118, height: 118, borderColor: rec.color + "18" }]} />
                      <View style={[ds.vinylRing, { width: 80,  height: 80,  borderColor: rec.color + "28" }]} />
                      <View style={[ds.vinylRing, { width: 48,  height: 48,  borderColor: rec.color + "40" }]} />
                      {/* Center disc */}
                      <View style={[ds.vinylCenter, { backgroundColor: rec.color + "22", borderColor: rec.color + "50" }]}>
                        {photo
                          ? <Image source={photo} style={ds.vinylPhoto} />
                          : <Ionicons name="musical-note" size={16} color={rec.color} />
                        }
                      </View>
                      {/* Duration */}
                      <View style={ds.songDurationBadge}>
                        <Ionicons name="musical-note" size={8} color="rgba(255,255,255,0.5)" />
                        <Text style={ds.songDurationText}>{rec.duration}</Text>
                      </View>
                    </View>
                    <View style={ds.recInfo}>
                      <Text style={ds.recTitle} numberOfLines={1}>{rec.title}</Text>
                      <Text style={ds.recArtist} numberOfLines={1}>{rec.artist}</Text>
                      <View style={ds.recBottom}>
                        <Text style={[ds.recGenre, { color: accentColor }]}>{rec.genre}</Text>
                        {likeBtn}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }

              // Video card
              return (
                <TouchableOpacity key={rec.id} style={ds.recCard} activeOpacity={0.85}>
                  <View style={[ds.recThumb, { backgroundColor: rec.color + "30" }]}>
                    {photo && <Image source={photo} style={ds.recThumbImg} />}
                    <LinearGradient colors={["rgba(0,0,0,0.1)", "rgba(0,0,0,0.75)"]} style={StyleSheet.absoluteFill} />
                    {/* Play button */}
                    <View style={ds.recPlayBtn}>
                      <Ionicons name="play" size={16} color="#fff" />
                    </View>
                    {/* VIDEO badge */}
                    <View style={[ds.videoBadge, { backgroundColor: rec.color }]}>
                      <Text style={[ds.videoBadgeText, { color: rec.color === "#CAFF00" ? "#0D0D0D" : "#fff" }]}>VIDEO</Text>
                    </View>
                    {/* Duration */}
                    <View style={ds.recDurationBadge}>
                      <Text style={ds.recDurationText}>{rec.duration}</Text>
                    </View>
                  </View>
                  <View style={ds.recInfo}>
                    <Text style={ds.recTitle} numberOfLines={1}>{rec.title}</Text>
                    <Text style={ds.recArtist} numberOfLines={1}>{rec.artist}</Text>
                    <View style={ds.recBottom}>
                      <Text style={[ds.recGenre, { color: accentColor }]}>{rec.genre}</Text>
                      {likeBtn}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </>
      )}

      {/* Upcoming Meets */}
      {showMeets && filteredMeets.length > 0 && (
        <>
          <View style={ds.sectionHeader}>
            <Text style={ds.sectionTitle}>Upcoming Meets</Text>
          </View>
          <View style={ds.meetsCol}>
            {filteredMeets.map((meet) => {
              const joined = joinedMeets.has(meet.id);
              return (
                <View key={meet.id} style={ds.meetCard}>
                  <View style={[ds.meetStrip, { backgroundColor: meet.color }]} />
                  <View style={ds.meetBody}>
                    <View style={ds.meetTopRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={ds.meetTitle}>{meet.title}</Text>
                        <Text style={ds.meetSubtitle}>{meet.subtitle}</Text>
                      </View>
                      <View style={[ds.meetDateBadge, { backgroundColor: meet.color + "22", borderColor: meet.color + "44" }]}>
                        <Text style={[ds.meetDateText, { color: meet.color }]}>{meet.date}</Text>
                      </View>
                    </View>
                    <View style={ds.meetMeta}>
                      <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.4)" />
                      <Text style={ds.meetLocation}>{meet.location}</Text>
                    </View>
                    <View style={ds.meetBottomRow}>
                      <View style={{ flexDirection: "row", gap: 6 }}>
                        {meet.tags.map((t) => (
                          <View key={t} style={ds.meetTag}><Text style={ds.meetTagText}>{t}</Text></View>
                        ))}
                      </View>
                      <TouchableOpacity
                        style={[ds.rsvpBtn, { borderColor: meet.color }, joined && { backgroundColor: meet.color }]}
                        activeOpacity={0.8}
                        onPress={() => toggleSet(setJoinedMeets, meet.id)}
                      >
                        <Ionicons name={joined ? "checkmark" : "add"} size={12} color={joined ? "#0D0D0D" : meet.color} />
                        <Text style={[ds.rsvpText, { color: joined ? "#0D0D0D" : meet.color }]}>
                          {joined ? "Going" : "RSVP"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}

      {/* Empty state */}
      {noResults && (
        <View style={ds.emptyState}>
          <Ionicons name="search-outline" size={40} color="rgba(255,255,255,0.15)" />
          <Text style={ds.emptyText}>No results for "{searchText}"</Text>
        </View>
      )}
    </ScrollView>
  );
}

const ds = StyleSheet.create({
  scrollContent: { paddingBottom: NAVBAR_H + BOTTOM_INSET + 40 },

  header: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  headerTitle: { fontSize: 48, fontWeight: "900", color: "#ffffff", letterSpacing: -1, lineHeight: 44 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center", marginBottom: 4 },

  searchWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", marginHorizontal: 16, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 16 },
  searchInput: { flex: 1, fontSize: 14, color: "#fff" },

  filtersRow: { paddingHorizontal: 16, gap: 8 },
  filterPill: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  filterPillActive: { backgroundColor: "#AB00FF", borderColor: "#AB00FF" },
  filterPillText: { fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: "600" },
  filterPillTextActive: { color: "#fff" },

  carouselCard: { borderRadius: 24, overflow: "hidden", height: 220 },
  featuredGradient: { flex: 1, padding: 20 },
  decoCircle: { position: "absolute", borderRadius: 999 },
  featuredBadge: { alignSelf: "flex-start", backgroundColor: "rgba(0,0,0,0.35)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  featuredBadgeText: { fontSize: 12, color: "#CAFF00", fontWeight: "700" },
  featuredBottom: { gap: 6 },
  featuredTitle: { fontSize: 26, fontWeight: "900", color: "#fff", letterSpacing: -0.5 },
  featuredSub: { fontSize: 13, color: "rgba(255,255,255,0.65)" },
  featuredRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  featuredTag: { backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  featuredTagText: { fontSize: 11, color: "#fff", fontWeight: "600" },
  featuredCta: { backgroundColor: "#CAFF00", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  featuredCtaActive: { backgroundColor: "rgba(255,255,255,0.2)", borderWidth: 1, borderColor: "rgba(255,255,255,0.4)" },
  featuredCtaText: { fontSize: 13, color: "#0D0D0D", fontWeight: "800" },
  featuredCtaTextActive: { color: "#fff" },

  dotRow: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.2)" },
  dotActive: { width: 18, backgroundColor: "#AB00FF" },

  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 14 },
  sectionTitle: { fontSize: 20, fontWeight: "800", color: "#fff", letterSpacing: -0.3 },
  sectionSub: { fontSize: 12, color: "rgba(255,255,255,0.35)", fontWeight: "500" },
  seeAll: { fontSize: 13, color: "#AB00FF", fontWeight: "600" },

  storiesRow: { paddingHorizontal: 16, gap: 20 },
  storyItem2: { alignItems: "center", width: 72 },
  storyRing2: { width: 68, height: 68, borderRadius: 34, borderWidth: 3, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  storyAvatar2: { width: 60, height: 60, borderRadius: 30 },
  storyName2: { fontSize: 11, color: "rgba(255,255,255,0.5)", textAlign: "center" },

  artistsRow: { paddingHorizontal: 16, gap: 16 },
  artistCard: { alignItems: "center", width: 84 },
  artistAvatarRing: { width: 74, height: 74, borderRadius: 37, borderWidth: 3, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  artistAvatar: { width: 66, height: 66, borderRadius: 33 },
  artistInitials: { fontSize: 22, fontWeight: "800" },
  artistName: { fontSize: 12, color: "#fff", fontWeight: "700", textAlign: "center", marginBottom: 2 },
  artistGenre: { fontSize: 10, color: "rgba(255,255,255,0.4)", textAlign: "center", marginBottom: 8 },
  followBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" },
  followBtnText: { fontSize: 10, color: "rgba(255,255,255,0.6)", fontWeight: "700" },
  followBtnTextActive: { color: "#0D0D0D" },

  recsRow: { paddingHorizontal: 16, gap: 12 },
  recCard: { width: 158, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },

  // Song card — vinyl aesthetic
  songThumb: { width: 158, height: 108, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  vinylRing: { position: "absolute", borderRadius: 999, borderWidth: 1 },
  vinylCenter: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  vinylPhoto: { width: 42, height: 42, borderRadius: 21, resizeMode: "cover" },
  songDurationBadge: { position: "absolute", bottom: 8, right: 8, flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(0,0,0,0.45)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  songDurationText: { fontSize: 10, color: "rgba(255,255,255,0.6)", fontWeight: "600" },

  // Video card — thumbnail + play
  recThumb: { width: 158, height: 108, position: "relative" },
  recThumbImg: { width: "100%", height: "100%", resizeMode: "cover" },
  recPlayBtn: { position: "absolute", top: "50%", left: "50%", marginTop: -20, marginLeft: -20, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.35)" },
  videoBadge: { position: "absolute", top: 8, right: 8, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 3 },
  videoBadgeText: { fontSize: 8, fontWeight: "900", letterSpacing: 0.5 },
  recDurationBadge: { position: "absolute", bottom: 8, left: 8, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  recDurationText: { fontSize: 10, color: "#fff", fontWeight: "600" },

  recInfo: { padding: 10, gap: 2 },
  recTitle: { fontSize: 13, color: "#fff", fontWeight: "700" },
  recArtist: { fontSize: 11, color: "rgba(255,255,255,0.45)" },
  recBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 },
  recGenre: { fontSize: 10, fontWeight: "700" },

  meetsCol: { paddingHorizontal: 16, gap: 12 },
  meetCard: { backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 20, flexDirection: "row", overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  meetStrip: { width: 4 },
  meetBody: { flex: 1, padding: 14, gap: 8 },
  meetTopRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  meetTitle: { fontSize: 15, fontWeight: "800", color: "#fff", marginBottom: 2 },
  meetSubtitle: { fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 16 },
  meetDateBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, alignItems: "center", minWidth: 58 },
  meetDateText: { fontSize: 10, fontWeight: "800", textAlign: "center", lineHeight: 14 },
  meetMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  meetLocation: { fontSize: 12, color: "rgba(255,255,255,0.4)" },
  meetBottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  meetTag: { backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4 },
  meetTagText: { fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: "600" },
  rsvpBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  rsvpText: { fontSize: 11, fontWeight: "800" },

  emptyState: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: "rgba(255,255,255,0.3)", fontWeight: "500" },
});

// ─── Meets page ───────────────────────────────────────────────────────────────

const STREAM_CARD_GAP = 8;
const STREAM_CARD_W   = (SW - 32 - STREAM_CARD_GAP) / 2;
const WAVE_HEIGHTS    = [12, 22, 32, 18, 28, 10, 24, 16];

function StreamCard({ stream }: { stream: MeetStream }) {
  const photo = AVATAR_MAP[stream.user];
  const cardH = stream.tall ? 216 : 152;
  const iconColor = stream.accentColor === "#CAFF00" ? "#0D0D0D" : "#fff";

  return (
    <TouchableOpacity style={[ms.card, { height: cardH }]} activeOpacity={0.88}>
      {/* Background */}
      {stream.type === "video" && photo && (
        <Image source={photo} style={StyleSheet.absoluteFill} resizeMode="cover" />
      )}
      <LinearGradient
        colors={
          stream.type === "audio"
            ? [stream.color + "66", stream.color + "EE"]
            : ["rgba(0,0,0,0.05)", "rgba(0,0,0,0.72)"]
        }
        style={StyleSheet.absoluteFill}
      />

      {/* Audio waveform */}
      {stream.type === "audio" && (
        <View style={ms.waveWrap}>
          {WAVE_HEIGHTS.map((h, i) => (
            <View key={i} style={[ms.waveBar, { height: h, backgroundColor: stream.accentColor + "BB" }]} />
          ))}
        </View>
      )}

      {/* Top row: LIVE/Meet badge + viewer count */}
      <View style={ms.cardTop}>
        {stream.isLive ? (
          <View style={ms.liveBadge}>
            <View style={ms.liveDot} />
            <Text style={ms.liveBadgeText}>Live</Text>
          </View>
        ) : (
          <View style={ms.meetBadge}>
            <Text style={ms.meetBadgeText}>Meet</Text>
          </View>
        )}
        <View style={ms.viewerBadge}>
          <Ionicons name="eye-outline" size={9} color="rgba(255,255,255,0.85)" />
          <Text style={ms.viewerText}>{fmtCount(stream.viewers)}</Text>
        </View>
      </View>

      {/* Bottom: type dot + title + host */}
      <View style={ms.cardBottom}>
        <View style={[ms.typeTag, { backgroundColor: stream.accentColor }]}>
          <Ionicons
            name={stream.type === "video" ? "videocam" : "radio"}
            size={8}
            color={iconColor}
          />
        </View>
        <Text style={ms.cardTitle} numberOfLines={2}>{stream.title}</Text>
        <Text style={ms.cardHost}>@{stream.host}</Text>
      </View>
    </TouchableOpacity>
  );
}

type MeetsTab = "For You" | "Meets" | "Live";
const MEETS_TABS: MeetsTab[] = ["For You", "Meets", "Live"];

function MeetsView() {
  const [activeTab, setActiveTab] = useState<MeetsTab>("For You");
  const [searchText, setSearchText] = useState("");

  const q = searchText.toLowerCase();
  const filtered = MEETS_STREAMS.filter((s) => {
    const matchSearch = !q || s.title.toLowerCase().includes(q) || s.host.toLowerCase().includes(q) || s.tags.some((t) => t.toLowerCase().includes(q));
    const matchTab = activeTab === "For You" ? true : activeTab === "Live" ? s.isLive : s.isMeet;
    return matchSearch && matchTab;
  });

  const leftCol  = filtered.filter((_, i) => i % 2 === 0);
  const rightCol = filtered.filter((_, i) => i % 2 === 1);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={ms.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {/* Header */}
      <View style={ms.header}>
        <Text style={ms.headerTitle}>Meets</Text>
      </View>

      {/* Search — reuse ds styles */}
      <View style={ds.searchWrap}>
        <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.35)" style={{ marginRight: 8 }} />
        <TextInput
          style={ds.searchInput}
          placeholder="Search streams, meets, hosts…"
          placeholderTextColor="rgba(255,255,255,0.3)"
          value={searchText}
          onChangeText={setSearchText}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText("")} activeOpacity={0.7}>
            <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.35)" />
          </TouchableOpacity>
        )}
      </View>

      {/* Tab toggles */}
      <View style={ms.tabRow}>
        {MEETS_TABS.map((tab) => {
          const active = tab === activeTab;
          return (
            <TouchableOpacity
              key={tab}
              style={[ms.tabPill, active && ms.tabPillActive]}
              activeOpacity={0.75}
              onPress={() => setActiveTab(tab)}
            >
              {tab === "Live" && (
                <View style={[ms.liveTabDot, active && ms.liveTabDotActive]} />
              )}
              <Text style={[ms.tabText, active && ms.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Masonry grid */}
      {filtered.length > 0 ? (
        <View style={ms.grid}>
          <View style={ms.col}>
            {leftCol.map((s) => <StreamCard key={s.id} stream={s} />)}
          </View>
          <View style={ms.col}>
            {rightCol.map((s) => <StreamCard key={s.id} stream={s} />)}
          </View>
        </View>
      ) : (
        <View style={ds.emptyState}>
          <Ionicons name="search-outline" size={40} color="rgba(255,255,255,0.15)" />
          <Text style={ds.emptyText}>No streams found</Text>
        </View>
      )}
    </ScrollView>
  );
}

const ms = StyleSheet.create({
  scrollContent: { paddingBottom: NAVBAR_H + BOTTOM_INSET + 40 },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  headerTitle: { fontSize: 48, fontWeight: "900", color: "#fff", letterSpacing: -1, lineHeight: 44 },

  tabRow: { flexDirection: "row", paddingHorizontal: 16, gap: 8, marginBottom: 20 },
  tabPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  tabPillActive: { backgroundColor: "#AB00FF", borderColor: "#AB00FF" },
  tabText: { fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: "600" },
  tabTextActive: { color: "#fff" },
  liveTabDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,80,80,0.45)" },
  liveTabDotActive: { backgroundColor: "#FF3333" },

  grid: { flexDirection: "row", paddingHorizontal: 16, gap: STREAM_CARD_GAP },
  col: { flex: 1, gap: STREAM_CARD_GAP },

  card: { width: STREAM_CARD_W, borderRadius: 16, overflow: "hidden", backgroundColor: "#111", justifyContent: "space-between" },

  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", padding: 8 },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#E8000F", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#fff" },
  liveBadgeText: { fontSize: 10, color: "#fff", fontWeight: "800" },
  meetBadge: { backgroundColor: "#AB00FF", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  meetBadgeText: { fontSize: 10, color: "#fff", fontWeight: "800" },
  viewerBadge: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  viewerText: { fontSize: 10, color: "#fff", fontWeight: "700" },

  waveWrap: { position: "absolute", bottom: 44, left: 0, right: 0, flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: 3, paddingHorizontal: 10 },
  waveBar: { width: 4, borderRadius: 2, opacity: 0.75 },

  cardBottom: { padding: 9, gap: 2 },
  typeTag: { alignSelf: "flex-start", width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", marginBottom: 3 },
  cardTitle: { fontSize: 12, color: "#fff", fontWeight: "700", lineHeight: 16 },
  cardHost: { fontSize: 10, color: "rgba(255,255,255,0.45)", marginTop: 1 },
});

// ─── Messages page ────────────────────────────────────────────────────────────

type MessagesTab = "Messages" | "Group Chats" | "Community";
const MESSAGES_TABS: MessagesTab[] = ["Messages", "Group Chats", "Community"];
const MSG_HEADER_H = 72;

function AvatarCircle({ user, size }: { user: string; size: number }) {
  const photo = AVATAR_MAP[user];
  const br = size / 2;
  if (photo) return <Image source={photo} style={{ width: size, height: size, borderRadius: br }} resizeMode="cover" />;
  return (
    <View style={{ width: size, height: size, borderRadius: br, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: size * 0.38, fontWeight: "700", color: "#fff" }}>{user[0].toUpperCase()}</Text>
    </View>
  );
}

function DirectMessagesList({ onSelect }: { onSelect: (dm: DirectMessage) => void }) {
  return (
    <View>
      {DIRECT_MESSAGES.map((dm: DirectMessage) => (
        <TouchableOpacity key={dm.id} style={msgStyles.dmRow} activeOpacity={0.75} onPress={() => onSelect(dm)}>
          <View style={msgStyles.dmAvatarWrap}>
            <AvatarCircle user={dm.user} size={52} />
            {dm.online && <View style={msgStyles.onlineDot} />}
          </View>
          <View style={msgStyles.dmContent}>
            <View style={msgStyles.dmTopRow}>
              <Text style={[msgStyles.dmName, dm.unread > 0 && msgStyles.dmNameUnread]}>{dm.name}</Text>
              <Text style={msgStyles.dmTime}>{dm.time}</Text>
            </View>
            <View style={msgStyles.dmBottomRow}>
              <Text style={[msgStyles.dmPreview, dm.unread > 0 && msgStyles.dmPreviewUnread]} numberOfLines={1}>{dm.preview}</Text>
              {dm.unread > 0 && (
                <View style={msgStyles.dmUnreadBadge}>
                  <Text style={msgStyles.dmUnreadBadgeText}>{dm.unread}</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function GroupChatsList() {
  return (
    <View>
      {GROUP_CHATS.map((gc: GroupChat) => {
        const [m1, m2] = gc.members;
        return (
          <TouchableOpacity key={gc.id} style={msgStyles.gcRow} activeOpacity={0.75}>
            {/* Overlapping group avatars */}
            <View style={msgStyles.gcAvatarStack}>
              <View style={msgStyles.gcAvatarBack}>
                <AvatarCircle user={m2} size={30} />
              </View>
              <View style={msgStyles.gcAvatarFront}>
                <AvatarCircle user={m1} size={38} />
              </View>
            </View>
            <View style={msgStyles.gcContent}>
              <View style={msgStyles.gcTopRow}>
                <Text style={[msgStyles.gcName, gc.unread > 0 && msgStyles.gcNameUnread]} numberOfLines={1}>{gc.name}</Text>
                <Text style={msgStyles.gcTime}>{gc.time}</Text>
              </View>
              <View style={msgStyles.gcBottomRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[msgStyles.gcPreview, gc.unread > 0 && msgStyles.gcPreviewUnread]} numberOfLines={1}>
                    <Text style={msgStyles.gcSender}>{gc.sender}: </Text>{gc.preview}
                  </Text>
                  <Text style={msgStyles.gcMemberCount}>{gc.memberCount} members</Text>
                </View>
                {gc.unread > 0 && (
                  <View style={msgStyles.gcUnreadBadge}>
                    <Text style={msgStyles.gcUnreadBadgeText}>{gc.unread}</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function CommunityList() {
  const [followed, setFollowed] = useState<Set<string>>(new Set());
  const toggleFollow = (id: string) =>
    setFollowed((p) => { const s = new Set(p); s.has(id) ? s.delete(id) : s.add(id); return s; });

  return (
    <View style={{ paddingTop: 8, paddingHorizontal: 16, gap: 14 }}>
      {COMMUNITY_ITEMS.map((item: CommunityItem) => {
        const isFollowing = followed.has(item.id);
        return (
          <TouchableOpacity key={item.id} style={msgStyles.communityCard} activeOpacity={0.85}>
            {/* Top row */}
            <View style={msgStyles.communityTopRow}>
              <View style={msgStyles.communityLeftMeta}>
                {item.active && (
                  <>
                    <View style={msgStyles.activeDot} />
                    <Text style={msgStyles.activeText}>Active</Text>
                  </>
                )}
                <View style={[msgStyles.viewerStack, item.active && { marginLeft: 8 }]}>
                  {item.viewerUsers.map((u, i) => (
                    <View key={u} style={[msgStyles.viewerAvatarWrap, i === 0 && { marginLeft: 0 }, { zIndex: item.viewerUsers.length - i }]}>
                      <AvatarCircle user={u} size={18} />
                    </View>
                  ))}
                </View>
                <Text style={msgStyles.followerCount}>{item.followers} Followers</Text>
              </View>
              <TouchableOpacity
                style={[msgStyles.followCommunityBtn, isFollowing && msgStyles.followCommunityBtnActive]}
                onPress={() => toggleFollow(item.id)}
                activeOpacity={0.8}
              >
                {isFollowing ? (
                  <Text style={[msgStyles.followCommunityText, { color: "#AB00FF" }]}>✓ Following</Text>
                ) : (
                  <>
                    <Text style={msgStyles.followCommunityText}>Follow</Text>
                    <Text style={msgStyles.followCommunityText}> +</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Title */}
            <Text style={msgStyles.communityTitle}>{item.title}</Text>

            {/* Tags */}
            <View style={msgStyles.communityTagsRow}>
              {item.tags.map((tag) => (
                <View key={tag} style={msgStyles.communityTag}>
                  <Text style={msgStyles.communityTagText}>{tag}</Text>
                </View>
              ))}
            </View>

            {/* Divider */}
            <View style={msgStyles.communityDivider} />

            {/* Author row */}
            <View style={msgStyles.authorRow}>
              <AvatarCircle user={item.authorUser} size={26} />
              <View style={{ flex: 1 }}>
                <Text style={msgStyles.authorName}>{item.author}</Text>
                <Text style={msgStyles.authorFollowers}>{item.followers} Followers</Text>
              </View>
              <Text style={msgStyles.authorDate}>{item.date}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function MessagesView({ onOpenChat }: { onOpenChat: (dm: DirectMessage) => void }) {
  const [activeTab, setActiveTab] = useState<MessagesTab>("Messages");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownAnim = useRef(new Animated.Value(0)).current;
  const chevronAnim  = useRef(new Animated.Value(0)).current;

  const openDropdown = () => {
    setDropdownOpen(true);
    Animated.parallel([
      Animated.spring(dropdownAnim, { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 280 }),
      Animated.spring(chevronAnim,  { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 280 }),
    ]).start();
  };

  const closeDropdown = () => {
    Animated.parallel([
      Animated.timing(dropdownAnim, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(chevronAnim,  { toValue: 0, duration: 160, useNativeDriver: true }),
    ]).start(() => setDropdownOpen(false));
  };

  const selectTab = (tab: MessagesTab) => {
    setActiveTab(tab);
    closeDropdown();
  };

  const chevronRotate   = chevronAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });
  const dropdownTranslY = dropdownAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] });
  const dropdownScale   = dropdownAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] });

  return (
    <View style={{ flex: 1 }}>
      {/* Header */}
      <View style={msgStyles.header}>
        <TouchableOpacity
          style={msgStyles.dropdownTrigger}
          onPress={dropdownOpen ? closeDropdown : openDropdown}
          activeOpacity={0.8}
        >
          <Text style={msgStyles.headerTitle}>{activeTab}</Text>
          <Animated.View style={{ transform: [{ rotate: chevronRotate }], marginTop: 4 }}>
            <Ionicons name="chevron-down" size={18} color="rgba(255,255,255,0.55)" />
          </Animated.View>
        </TouchableOpacity>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity style={ds.iconBtn} activeOpacity={0.7}>
            <Ionicons name="search-outline" size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={ds.iconBtn} activeOpacity={0.7}>
            <Ionicons name="create-outline" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Backdrop to close dropdown */}
      {dropdownOpen && (
        <Pressable
          style={[StyleSheet.absoluteFill, { top: MSG_HEADER_H, zIndex: 8 }]}
          onPress={closeDropdown}
        />
      )}

      {/* Dropdown menu */}
      {dropdownOpen && (
        <Animated.View
          style={[msgStyles.dropdown, {
            opacity: dropdownAnim,
            transform: [{ translateY: dropdownTranslY }, { scale: dropdownScale }],
            zIndex: 10,
            elevation: 10,
          }]}
        >
          {MESSAGES_TABS.map((tab, i) => {
            const active = tab === activeTab;
            const count  = MESSAGES_UNREAD[tab] ?? 0;
            return (
              <TouchableOpacity
                key={tab}
                style={[
                  msgStyles.dropdownRow,
                  i < MESSAGES_TABS.length - 1 && msgStyles.dropdownRowBorder,
                  active && msgStyles.dropdownRowActive,
                ]}
                onPress={() => selectTab(tab)}
                activeOpacity={0.75}
              >
                <Text style={[msgStyles.dropdownRowText, active && msgStyles.dropdownRowTextActive]}>{tab}</Text>
                <View style={{ flex: 1 }} />
                {count > 0 && (
                  <View style={[msgStyles.dropdownBadge, active && msgStyles.dropdownBadgeActive]}>
                    <Text style={msgStyles.dropdownBadgeText}>{count}</Text>
                  </View>
                )}
                {active && <Ionicons name="checkmark" size={15} color="#AB00FF" style={{ marginLeft: 8 }} />}
              </TouchableOpacity>
            );
          })}
        </Animated.View>
      )}

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: NAVBAR_H + BOTTOM_INSET + 40 }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!dropdownOpen}
        keyboardShouldPersistTaps="handled"
      >
        {activeTab === "Messages"    && <DirectMessagesList onSelect={onOpenChat} />}
        {activeTab === "Group Chats" && <GroupChatsList />}
        {activeTab === "Community"   && <CommunityList />}
      </ScrollView>
    </View>
  );
}

const msgStyles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    height: MSG_HEADER_H,
  },
  dropdownTrigger: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerTitle: { fontSize: 32, fontWeight: "900", color: "#fff", letterSpacing: -0.5 },

  dropdown: {
    position: "absolute",
    top: MSG_HEADER_H,
    left: 16,
    right: 16,
    backgroundColor: "#1C1C1E",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  dropdownRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 15 },
  dropdownRowBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  dropdownRowActive: { backgroundColor: "rgba(171,0,255,0.1)" },
  dropdownRowText: { fontSize: 16, fontWeight: "600", color: "rgba(255,255,255,0.4)" },
  dropdownRowTextActive: { color: "#fff" },
  dropdownBadge: { backgroundColor: "#E8000F", borderRadius: 10, minWidth: 22, height: 22, alignItems: "center", justifyContent: "center", paddingHorizontal: 7 },
  dropdownBadgeActive: { backgroundColor: "#AB00FF" },
  dropdownBadgeText: { fontSize: 11, color: "#fff", fontWeight: "800" },

  // ── Direct messages ──
  dmRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  dmAvatarWrap: { position: "relative" },
  onlineDot: {
    position: "absolute",
    bottom: 1, right: 1,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: "#00E5A0",
    borderWidth: 2, borderColor: "#0D0D0D",
  },
  dmContent: { flex: 1 },
  dmTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  dmName: { fontSize: 15, fontWeight: "600", color: "rgba(255,255,255,0.5)" },
  dmNameUnread: { color: "#fff", fontWeight: "800" },
  dmTime: { fontSize: 12, color: "rgba(255,255,255,0.28)" },
  dmBottomRow: { flexDirection: "row", alignItems: "center" },
  dmPreview: { fontSize: 13, color: "rgba(255,255,255,0.28)", flex: 1 },
  dmPreviewUnread: { color: "rgba(255,255,255,0.55)" },
  dmUnreadBadge: {
    backgroundColor: "#AB00FF",
    borderRadius: 10, minWidth: 20, height: 20,
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: 6, marginLeft: 10,
  },
  dmUnreadBadgeText: { fontSize: 11, color: "#fff", fontWeight: "800" },

  // ── Group chats ──
  gcRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  gcAvatarStack: { width: 52, height: 52, position: "relative" },
  gcAvatarBack: {
    position: "absolute",
    bottom: 0, right: 0,
    width: 30, height: 30, borderRadius: 15,
    borderWidth: 2, borderColor: "#0D0D0D",
    overflow: "hidden",
  },
  gcAvatarFront: {
    position: "absolute",
    top: 0, left: 0,
    width: 38, height: 38, borderRadius: 19,
    borderWidth: 2, borderColor: "#0D0D0D",
    overflow: "hidden",
  },
  gcContent: { flex: 1 },
  gcTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 3 },
  gcName: { fontSize: 15, fontWeight: "600", color: "rgba(255,255,255,0.5)", flex: 1, marginRight: 8 },
  gcNameUnread: { color: "#fff", fontWeight: "800" },
  gcTime: { fontSize: 12, color: "rgba(255,255,255,0.28)" },
  gcBottomRow: { flexDirection: "row", alignItems: "flex-start" },
  gcPreview: { fontSize: 13, color: "rgba(255,255,255,0.28)" },
  gcPreviewUnread: { color: "rgba(255,255,255,0.55)" },
  gcSender: { fontWeight: "700", color: "rgba(255,255,255,0.45)" },
  gcMemberCount: { fontSize: 11, color: "rgba(255,255,255,0.22)", marginTop: 2 },
  gcUnreadBadge: {
    backgroundColor: "#FF6B35",
    borderRadius: 10, minWidth: 20, height: 20,
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: 6, marginLeft: 10, marginTop: 1,
  },
  gcUnreadBadgeText: { fontSize: 11, color: "#fff", fontWeight: "800" },

  // ── Community ──
  communityCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    padding: 16,
    gap: 12,
  },
  communityTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  communityLeftMeta: { flexDirection: "row", alignItems: "center", flex: 1 },
  activeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#00E5A0" },
  activeText: { fontSize: 12, color: "#00E5A0", fontWeight: "700", marginLeft: 5 },
  viewerStack: { flexDirection: "row" },
  viewerAvatarWrap: {
    marginLeft: -5,
    borderRadius: 9,
    borderWidth: 1.5, borderColor: "#0D0D0D",
    overflow: "hidden",
    width: 18, height: 18,
  },
  followerCount: { fontSize: 12, color: "rgba(255,255,255,0.35)", marginLeft: 8 },
  followCommunityBtn: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#AB00FF",
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
  },
  followCommunityBtnActive: { backgroundColor: "rgba(171,0,255,0.15)", borderWidth: 1, borderColor: "#AB00FF" },
  followCommunityText: { fontSize: 13, color: "#fff", fontWeight: "700" },
  communityTitle: { fontSize: 20, fontWeight: "900", color: "#fff", letterSpacing: -0.3, lineHeight: 26 },
  communityTagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  communityTag: { backgroundColor: "rgba(202,255,0,0.08)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  communityTagText: { fontSize: 12, color: "#CAFF00", fontWeight: "700" },
  communityDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.06)" },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  authorName: { fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: "700" },
  authorFollowers: { fontSize: 11, color: "rgba(255,255,255,0.25)" },
  authorDate: { fontSize: 12, color: "rgba(255,255,255,0.25)" },
});

// ─── Chat detail view ─────────────────────────────────────────────────────────

function ChatDetailView({ dm, onClose }: { dm: DirectMessage; onClose: () => void }) {
  const slideX      = useRef(new Animated.Value(SW)).current;
  const inputBottom = useRef(new Animated.Value(BOTTOM_INSET)).current;
  const [msgText, setMsgText] = useState("");
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>(CHAT_MESSAGES[dm.id] ?? []);
  const flatRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    // Slide in
    Animated.spring(slideX, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 200 }).start();

    // Keyboard tracking
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvt, (e) => {
      Animated.timing(inputBottom, {
        toValue: e.endCoordinates.height,
        duration: Platform.OS === "ios" ? (e.duration ?? 260) : 260,
        useNativeDriver: false,
      }).start();
    });
    const hideSub = Keyboard.addListener(hideEvt, (e) => {
      Animated.timing(inputBottom, {
        toValue: BOTTOM_INSET,
        duration: Platform.OS === "ios" ? (e.duration ?? 260) : 260,
        useNativeDriver: false,
      }).start();
    });
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const handleClose = () => {
    Keyboard.dismiss();
    Animated.timing(slideX, { toValue: SW, duration: 260, useNativeDriver: true }).start(onClose);
  };

  // Swipe right to go back
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, { dx, dy }) => dx > 10 && dx > Math.abs(dy) * 2,
      onShouldBlockNativeResponder: () => false,
      onPanResponderMove: (_, { dx }) => { if (dx > 0) slideX.setValue(dx); },
      onPanResponderRelease: (_, { dx, vx }) => {
        if (dx > SW * 0.35 || vx > 0.8) {
          handleClose();
        } else {
          Animated.spring(slideX, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 220 }).start();
        }
      },
    })
  ).current;

  const sendMessage = () => {
    const text = msgText.trim();
    if (!text) return;
    const newMsg: ChatMessage = {
      id: `new-${Date.now()}`,
      text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      fromMe: true,
    };
    setLocalMessages((prev) => [...prev, newMsg]);
    setMsgText("");
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 80);
  };

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, {
        transform: [{ translateX: slideX }],
        backgroundColor: "#0D0D0D",
        zIndex: 200,
        elevation: 200,
      }]}
      {...pan.panHandlers}
    >
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {/* ── Header ── */}
        <View style={chatStyles.header}>
          <TouchableOpacity onPress={handleClose} style={chatStyles.backBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>

          <View style={chatStyles.headerCenter}>
            <View style={{ position: "relative" }}>
              <AvatarCircle user={dm.user} size={38} />
              {dm.online && <View style={chatStyles.headerOnlineDot} />}
            </View>
            <View style={{ gap: 1 }}>
              <Text style={chatStyles.headerName}>{dm.name}</Text>
              <Text style={[chatStyles.headerStatus, !dm.online && { color: "rgba(255,255,255,0.3)" }]}>
                {dm.online ? "● Online" : "Offline"}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={ds.iconBtn} activeOpacity={0.7}>
            <Ionicons name="videocam-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* ── Messages ── */}
        <FlatList
          ref={flatRef}
          data={localMessages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={chatStyles.messagesContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item: msg, index }) => {
            const prev = localMessages[index - 1];
            const next = localMessages[index + 1];
            const firstInGroup = !prev || prev.fromMe !== msg.fromMe;
            const lastInGroup  = !next || next.fromMe !== msg.fromMe;

            // Shape the bubble tail based on position in group
            const bubbleRadius = msg.fromMe
              ? { borderTopRightRadius:    firstInGroup ? 6 : 18,
                  borderBottomRightRadius: lastInGroup  ? 18 : 6 }
              : { borderTopLeftRadius:     firstInGroup ? 6 : 18,
                  borderBottomLeftRadius:  lastInGroup  ? 18 : 6 };

            return (
              <View style={[chatStyles.msgWrap, msg.fromMe && chatStyles.msgWrapMe,
                { marginTop: firstInGroup ? 12 : 3 }]}>
                <View style={[
                  chatStyles.bubble,
                  msg.fromMe ? chatStyles.bubbleMe : chatStyles.bubbleThem,
                  bubbleRadius,
                ]}>
                  <Text style={[chatStyles.bubbleText, msg.fromMe && chatStyles.bubbleTextMe]}>
                    {msg.text}
                  </Text>
                  <Text style={[chatStyles.bubbleTime, msg.fromMe && chatStyles.bubbleTimeMe]}>
                    {msg.time}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      </SafeAreaView>

      {/* ── Input bar (floats above keyboard) ── */}
      <Animated.View style={[chatStyles.inputBar, { bottom: inputBottom }]}>
        <TouchableOpacity style={chatStyles.inputPlusBtn} activeOpacity={0.7}>
          <Ionicons name="add-circle-outline" size={30} color="rgba(255,255,255,0.4)" />
        </TouchableOpacity>

        <View style={chatStyles.inputWrap}>
          <TextInput
            style={chatStyles.input}
            placeholder="Message..."
            placeholderTextColor="rgba(255,255,255,0.28)"
            value={msgText}
            onChangeText={setMsgText}
            multiline
            maxLength={500}
            returnKeyType="default"
          />
          {msgText.length === 0 ? (
            <TouchableOpacity style={chatStyles.inputAction} activeOpacity={0.7}>
              <Ionicons name="mic-outline" size={19} color="rgba(255,255,255,0.38)" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[chatStyles.inputAction, chatStyles.sendBtn]} activeOpacity={0.8} onPress={sendMessage}>
              <Ionicons name="send" size={14} color="#0D0D0D" />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const chatStyles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  headerOnlineDot: {
    position: "absolute",
    bottom: 0, right: 0,
    width: 11, height: 11, borderRadius: 6,
    backgroundColor: "#00E5A0",
    borderWidth: 2, borderColor: "#0D0D0D",
  },
  headerName: { fontSize: 16, fontWeight: "800", color: "#fff" },
  headerStatus: { fontSize: 12, color: "#00E5A0", fontWeight: "600" },

  messagesContent: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 90,
  },

  msgWrap: { alignSelf: "flex-start", maxWidth: SW * 0.74 },
  msgWrapMe: { alignSelf: "flex-end" },

  bubble: {
    paddingHorizontal: 14,
    paddingTop: 9,
    paddingBottom: 7,
    borderRadius: 18,
  },
  bubbleThem: { backgroundColor: "#1C1C1E" },
  bubbleMe:   { backgroundColor: "#AB00FF" },

  bubbleText: { fontSize: 15, color: "rgba(255,255,255,0.82)", lineHeight: 21 },
  bubbleTextMe: { color: "#fff" },
  bubbleTime: { fontSize: 10, color: "rgba(255,255,255,0.3)", textAlign: "right", marginTop: 3 },
  bubbleTimeMe: { color: "rgba(255,255,255,0.55)" },

  inputBar: {
    position: "absolute",
    left: 0, right: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: "#0D0D0D",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.07)",
  },
  inputPlusBtn: { paddingBottom: 6 },
  inputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  input: { flex: 1, fontSize: 15, color: "#fff", maxHeight: 100, paddingVertical: 0 },
  inputAction: { width: 30, height: 30, alignItems: "center", justifyContent: "center" },
  sendBtn: { backgroundColor: "#AB00FF", borderRadius: 15 },
});

// ─── Bottom glass navbar ──────────────────────────────────────────────────────

function BottomNav({
  active,
  onPress,
}: {
  active: string;
  onPress: (label: string) => void;
}) {
  return (
    <View style={styles.navBarWrap} pointerEvents="box-none">
      <View style={styles.navBarGlass}>
        {NAV_ITEMS.map((item) => {
          const isActive = item.label === active;
          return (
            <TouchableOpacity
              key={item.label}
              style={styles.navItem}
              activeOpacity={0.7}
              onPress={() => onPress(item.label)}
            >
              <Ionicons
                name={(isActive ? item.iconActive : item.icon) as keyof typeof Ionicons.glyphMap}
                size={24}
                color={isActive ? "#AB00FF" : "rgba(255,255,255,0.3)"}
              />
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Post detail overlay ──────────────────────────────────────────────────────

function PostDetailOverlay({ post, onClose }: { post: Post; onClose: () => void }) {
  const slideX = useRef(new Animated.Value(SW)).current;
  const [replyText, setReplyText] = useState("");
  const [replyingTo, setReplyingTo] = useState<DummyComment | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const replyBarBottom = useRef(new Animated.Value(BOTTOM_INSET + 8)).current;

  // Slide in on mount
  useEffect(() => {
    Animated.spring(slideX, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 200 }).start();
  }, []);

  // Keyboard tracking for reply bar
  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvt, (e) => {
      Animated.timing(replyBarBottom, { toValue: e.endCoordinates.height + 8, duration: Platform.OS === "ios" ? (e.duration ?? 260) : 260, useNativeDriver: false }).start();
    });
    const hideSub = Keyboard.addListener(hideEvt, (e) => {
      Animated.timing(replyBarBottom, { toValue: BOTTOM_INSET + 8, duration: Platform.OS === "ios" ? (e.duration ?? 260) : 260, useNativeDriver: false }).start();
    });
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const handleClose = () => {
    Keyboard.dismiss();
    Animated.timing(slideX, { toValue: SW, duration: 260, useNativeDriver: true }).start(onClose);
  };

  // Swipe-right-to-go-back PanResponder
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, { dx, dy }) => dx > 8 && dx > Math.abs(dy) * 2,
      onShouldBlockNativeResponder: () => false,
      onPanResponderMove: (_, { dx }) => {
        if (dx > 0) slideX.setValue(dx);
      },
      onPanResponderRelease: (_, { dx, vx }) => {
        if (dx > SW * 0.3 || vx > 0.8) {
          handleClose();
        } else {
          Animated.spring(slideX, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 220 }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(slideX, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.detailOverlay, { transform: [{ translateX: slideX }] }]} {...pan.panHandlers}>
      {/* Header */}
      <View style={styles.detailHeader}>
        <TouchableOpacity onPress={handleClose} style={styles.detailBackBtn} activeOpacity={0.7}>
          <Text style={styles.detailBackIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.detailHeaderTitle}>Post</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Comments list with post as header */}
      <FlatList
        data={DUMMY_COMMENTS}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.detailListContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <>
            <PostCard item={post} />
            <View style={styles.detailDivider}>
              <Text style={styles.detailDividerLabel}>Comments</Text>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <CommentRow
            comment={item}
            onQuickReply={(c) => setReplyingTo(c)}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.commentSeparator} />}
      />

      {/* Sticky reply bar */}
      <Animated.View style={[styles.detailReplyBarWrap, { bottom: replyBarBottom }]}>
        {replyingTo && (
          <View style={styles.detailReplyContext}>
            <Text style={styles.detailReplyContextText}>Replying to @{replyingTo.user}</Text>
            <TouchableOpacity onPress={() => setReplyingTo(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.detailReplyContextX}>×</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.composerGlass}>
          <TouchableOpacity style={styles.composerPlus} activeOpacity={0.8} onPress={() => setMenuVisible(true)}>
            <Text style={styles.composerPlusIcon}>+</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.composerInput}
            placeholder={replyingTo ? `Reply to @${replyingTo.user}…` : "Add a comment…"}
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={replyText}
            onChangeText={setReplyText}
            returnKeyType="send"
          />
          <TouchableOpacity style={styles.composerSend} activeOpacity={0.8}>
            <Text style={styles.composerSendIcon}>↑</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ComposerActionMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />
    </Animated.View>
  );
}

// ─── Gradient toggle ──────────────────────────────────────────────────────────

const TOGGLE_W = 48;
const TOGGLE_H = 28;
const THUMB_SIZE = 22;
const THUMB_TRAVEL = TOGGLE_W - THUMB_SIZE - 6; // 3px padding each side

function GradientToggle({ value, onValueChange }: { value: boolean; onValueChange: (v: boolean) => void }) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  const handlePress = () => {
    const next = !value;
    onValueChange(next);
    Animated.spring(anim, {
      toValue: next ? 1 : 0,
      useNativeDriver: true,
      damping: 18,
      stiffness: 260,
    }).start();
  };

  const thumbX = anim.interpolate({ inputRange: [0, 1], outputRange: [0, THUMB_TRAVEL] });

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.85}>
      <View style={profileStyles.toggleTrack}>
        {value ? (
          <LinearGradient
            colors={["#FF6C1A", "#CC4200", "#3D1A0C"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,255,255,0.13)" }]} />
        )}
        <Animated.View style={[profileStyles.toggleThumb, { transform: [{ translateX: thumbX }] }]} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Broadcast row ────────────────────────────────────────────────────────────

function BroadcastRow() {
  const [broadcasting, setBroadcasting] = useState(false);
  return (
    <View style={profileStyles.broadcastRow}>
      <Text style={profileStyles.broadcastLabel}>Broadcast session</Text>
      <GradientToggle value={broadcasting} onValueChange={setBroadcasting} />
    </View>
  );
}

// ─── Profile section tabs ─────────────────────────────────────────────────────

// ─── Song row ─────────────────────────────────────────────────────────────────

function SongRow({ song, accent }: { song: DummySong; accent: string }) {
  return (
    <TouchableOpacity style={pdStyles.songRow} activeOpacity={0.75}>
      <View style={pdStyles.songInfo}>
        <Text style={pdStyles.songTitle} numberOfLines={1}>{song.title}</Text>
        <Text style={pdStyles.songArtist} numberOfLines={1}>{song.artist}</Text>
      </View>
      <View style={[pdStyles.songArt, { backgroundColor: song.color + "30" }]}>
        <Text style={{ fontSize: 13 }}>🎵</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Playlist detail overlay ──────────────────────────────────────────────────

function PlaylistDetailOverlay({ playlist, onClose }: { playlist: DummyPlaylist; onClose: () => void }) {
  const slideX = useRef(new Animated.Value(SW)).current;
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(2347);
  const [showOnProfile, setShowOnProfile] = useState(false);
  const songs = PLAYLIST_SONGS[playlist.id] ?? [];

  useEffect(() => {
    Animated.spring(slideX, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 200 }).start();
  }, []);

  const handleClose = () => {
    Animated.timing(slideX, { toValue: SW, duration: 260, useNativeDriver: true }).start(onClose);
  };

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, { dx, dy }) => dx > 8 && dx > Math.abs(dy) * 2,
    onShouldBlockNativeResponder: () => false,
    onPanResponderMove: (_, { dx }) => { if (dx > 0) slideX.setValue(dx); },
    onPanResponderRelease: (_, { dx, vx }) => {
      if (dx > SW * 0.3 || vx > 0.8) handleClose();
      else Animated.spring(slideX, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 220 }).start();
    },
    onPanResponderTerminate: () => {
      Animated.spring(slideX, { toValue: 0, useNativeDriver: true }).start();
    },
  })).current;

  const handleLike = () => {
    setLiked(prev => { setLikeCount(c => prev ? c - 1 : c + 1); return !prev; });
  };

  return (
    <Modal transparent animationType="none" statusBarTranslucent onRequestClose={handleClose}>
      <Animated.View style={[StyleSheet.absoluteFill, pdStyles.screen, { transform: [{ translateX: slideX }] }]} {...pan.panHandlers}>
        <FlatList
          data={songs}
          keyExtractor={s => s.id}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <>
              {/* ── Hero ── */}
              <View style={pdStyles.hero}>
                <LinearGradient
                  colors={[playlist.accent + "55", playlist.color, "#0D0D0D"]}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                {/* Back button */}
                <SafeAreaView edges={["top"]}>
                  <TouchableOpacity style={pdStyles.backBtn} onPress={handleClose} activeOpacity={0.7}>
                    <Text style={pdStyles.backIcon}>‹</Text>
                  </TouchableOpacity>
                </SafeAreaView>

                {/* Art mosaic */}
                <View style={pdStyles.artMosaic}>
                  {songs.slice(0, 4).map(s => (
                    <View key={s.id} style={[pdStyles.mosaicCell, { backgroundColor: s.color + "55" }]} />
                  ))}
                </View>

                {/* Title block */}
                <View style={pdStyles.heroInfo}>
                  <Text style={pdStyles.heroTitle} numberOfLines={2}>{playlist.name}</Text>

                  {/* Source · songs · duration */}
                  <View style={pdStyles.heroMetaRow}>
                    <View style={[pdStyles.sourceIconBadge, { backgroundColor: playlist.sourceColor }]}>
                      <Text style={pdStyles.sourceIconText}>
                        {playlist.source === "Spotify" ? "S" : playlist.source === "Apple Music" ? "♪" : "T"}
                      </Text>
                    </View>
                    <Text style={pdStyles.heroMetaText}>{playlist.source}</Text>
                    <Text style={pdStyles.heroMetaDot}>·</Text>
                    <Text style={pdStyles.heroMetaText}>{playlist.tracks} Songs</Text>
                    <Text style={pdStyles.heroMetaDot}>·</Text>
                    <Text style={pdStyles.heroMetaText}>{playlist.duration}</Text>
                  </View>

                  {/* Show on profile toggle */}
                  <TouchableOpacity
                    style={[
                      pdStyles.showOnProfileBtn,
                      showOnProfile && { borderColor: playlist.accent, backgroundColor: playlist.accent + "18" },
                    ]}
                    onPress={() => setShowOnProfile(v => !v)}
                    activeOpacity={0.8}
                  >
                    {showOnProfile && <Text style={[pdStyles.showOnProfileText, { color: playlist.accent }]}>✓ </Text>}
                    <Text style={[pdStyles.showOnProfileText, showOnProfile && { color: playlist.accent }]}>
                      {showOnProfile ? "Showing on profile" : "Show on profile"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Play button */}
                <TouchableOpacity style={[pdStyles.playBtn, { backgroundColor: playlist.accent }]} activeOpacity={0.85}>
                  <Text style={pdStyles.playIcon}>▶</Text>
                </TouchableOpacity>
              </View>

              {/* ── Action bar ── */}
              <View style={pdStyles.actionBar}>
                <TouchableOpacity style={pdStyles.actionBtn} activeOpacity={0.7}>
                  <Text style={pdStyles.actionIcon}>↺</Text>
                </TouchableOpacity>
                <TouchableOpacity style={pdStyles.actionBtn} onPress={handleLike} activeOpacity={0.7}>
                  <Text style={[pdStyles.actionIcon, liked && { color: "#FF3CAC" }]}>{liked ? "♥" : "♡"}</Text>
                  <Text style={[pdStyles.actionCount, liked && { color: "#FF3CAC" }]}>{fmtCount(likeCount)}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={pdStyles.actionBtn} activeOpacity={0.7}>
                  <Text style={pdStyles.actionIcon}>↓</Text>
                </TouchableOpacity>
                <TouchableOpacity style={pdStyles.actionBtn} activeOpacity={0.7}>
                  <Text style={[pdStyles.actionIcon, { fontSize: 22, letterSpacing: 2 }]}>···</Text>
                </TouchableOpacity>
              </View>

              <View style={pdStyles.songListDivider} />
            </>
          }
          renderItem={({ item }) => <SongRow song={item} accent={playlist.accent} />}
          ItemSeparatorComponent={() => <View style={pdStyles.songDivider} />}
        />
      </Animated.View>
    </Modal>
  );
}

const pdStyles = StyleSheet.create({
  screen: { backgroundColor: "#0D0D0D" },
  hero: { height: 340, justifyContent: "flex-end", overflow: "hidden" },
  backBtn: { paddingHorizontal: 18, paddingTop: 6, paddingBottom: 0, alignSelf: "flex-start" },
  backIcon: { fontSize: 32, color: "#fff", fontWeight: "300", lineHeight: 36 },
  artMosaic: { flexDirection: "row", flexWrap: "wrap", width: 130, height: 130, borderRadius: 16, overflow: "hidden", alignSelf: "center", marginBottom: 20 },
  mosaicCell: { width: 65, height: 65 },
  heroInfo: { paddingHorizontal: 20, paddingBottom: 24 },
  heroTitle: { fontSize: 28, fontWeight: "900", color: "#fff", lineHeight: 34, marginBottom: 10 },
  heroMetaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14, flexWrap: "wrap" },
  sourceIconBadge: { width: 18, height: 18, borderRadius: 4, alignItems: "center", justifyContent: "center" },
  sourceIconText: { fontSize: 10, fontWeight: "900", color: "#fff" },
  heroMetaText: { fontSize: 13, color: "rgba(255,255,255,0.55)", fontWeight: "500" },
  heroMetaDot: { fontSize: 13, color: "rgba(255,255,255,0.25)" },
  showOnProfileBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  showOnProfileText: { fontSize: 13, color: "#fff", fontWeight: "600" },
  playBtn: { position: "absolute", bottom: 20, right: 20, width: 54, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },
  playIcon: { fontSize: 20, color: "#fff", marginLeft: 3 },
  actionBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.07)" },
  actionBtn: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4 },
  actionIcon: { fontSize: 24, color: "rgba(255,255,255,0.7)" },
  actionCount: { fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: "600" },
  songListDivider: { height: 8 },
  songRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 14 },
  songInfo: { flex: 1 },
  songTitle: { fontSize: 15, fontWeight: "600", color: "#fff", marginBottom: 3 },
  songArtist: { fontSize: 13, color: "rgba(255,255,255,0.4)" },
  songArt: { width: 46, height: 46, borderRadius: 8, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  songDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.05)", marginHorizontal: 16 },
});

// ─── Playlist list card ───────────────────────────────────────────────────────

function PlaylistCard({ pl, onPress }: { pl: DummyPlaylist; onPress: () => void }) {
  return (
    <TouchableOpacity style={profileStyles.playlistListItem} onPress={onPress} activeOpacity={0.82}>
      <View style={[profileStyles.playlistListArt, { backgroundColor: pl.color }]}>
        <View style={profileStyles.playlistListArtInner}>
          {[pl.accent + "55", pl.accent + "33"].map((bg, i) => (
            <View key={i} style={[profileStyles.playlistListMiniCell, { backgroundColor: bg }]} />
          ))}
        </View>
        <Text style={{ fontSize: 16, position: "absolute" }}>🎵</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={profileStyles.playlistListName} numberOfLines={1}>{pl.name}</Text>
        <Text style={profileStyles.playlistListMeta}>{pl.tracks} songs</Text>
      </View>
      <Text style={profileStyles.playlistChevron}>›</Text>
    </TouchableOpacity>
  );
}

function CommunityCard({ co }: { co: DummyCommunity }) {
  return (
    <TouchableOpacity style={profileStyles.communityCard} activeOpacity={0.82}>
      <View style={[profileStyles.communityIcon, { backgroundColor: co.color + "18" }]}>
        <Text style={{ fontSize: 22 }}>👥</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={profileStyles.communityName}>{co.name}</Text>
        <Text style={profileStyles.communityDesc} numberOfLines={1}>{co.desc}</Text>
      </View>
      <Text style={[profileStyles.communityMembers, { color: co.color }]}>{co.members}</Text>
    </TouchableOpacity>
  );
}

function ProfileTabs() {
  const [active, setActive] = useState<ProfileTab>("Posts");
  const [openPlaylist, setOpenPlaylist] = useState<DummyPlaylist | null>(null);
  const indicatorAnim = useRef(new Animated.Value(0)).current;
  const contentAnim   = useRef(new Animated.Value(1)).current;
  const activeRef     = useRef<ProfileTab>("Posts");
  const tabWidth = (SW - 32) / PROFILE_TABS.length;

  // Stable switcher — safe to call from both tap handlers and the PanResponder closure
  const switchTo = (tab: ProfileTab, index: number) => {
    activeRef.current = tab;
    setActive(tab);
    contentAnim.setValue(0.5);
    Animated.timing(contentAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    Animated.spring(indicatorAnim, { toValue: index * tabWidth, useNativeDriver: true, damping: 22, stiffness: 280 }).start();
  };

  // Swipe left/right to change tabs — uses activeRef so the closure never goes stale
  const swipePan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, { dx, dy }) =>
      Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 2,
    onShouldBlockNativeResponder: () => false,
    onPanResponderRelease: (_, { dx, vx }) => {
      const idx = PROFILE_TABS.indexOf(activeRef.current);
      if ((dx < -50 || vx < -0.5) && idx < PROFILE_TABS.length - 1) {
        const next = idx + 1;
        activeRef.current = PROFILE_TABS[next];
        setActive(PROFILE_TABS[next]);
        contentAnim.setValue(0.5);
        Animated.timing(contentAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
        Animated.spring(indicatorAnim, { toValue: next * tabWidth, useNativeDriver: true, damping: 22, stiffness: 280 }).start();
      } else if ((dx > 50 || vx > 0.5) && idx > 0) {
        const prev = idx - 1;
        activeRef.current = PROFILE_TABS[prev];
        setActive(PROFILE_TABS[prev]);
        contentAnim.setValue(0.5);
        Animated.timing(contentAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
        Animated.spring(indicatorAnim, { toValue: prev * tabWidth, useNativeDriver: true, damping: 22, stiffness: 280 }).start();
      }
    },
  })).current;

  const renderContent = () => {
    if (active === "Posts") {
      return (
        <View style={{ gap: 12, paddingTop: 12 }}>
          {PROFILE_POSTS.map((post) => <PostCard key={post.id} item={post} />)}
        </View>
      );
    }
    if (active === "Reposts") {
      return (
        <View style={{ gap: 12, paddingTop: 12 }}>
          {PROFILE_REPOSTS.map((post) => (
            <View key={post.id}>
              <View style={profileStyles.repostLabel}>
                <Text style={profileStyles.repostLabelText}>↺  Reposted</Text>
              </View>
              <PostCard item={post} />
            </View>
          ))}
        </View>
      );
    }
    if (active === "Playlists") {
      return (
        <View style={{ gap: 8, paddingTop: 12 }}>
          {DUMMY_PLAYLISTS.map((pl) => (
            <PlaylistCard key={pl.id} pl={pl} onPress={() => setOpenPlaylist(pl)} />
          ))}
        </View>
      );
    }
    return (
      <View style={{ gap: 10, paddingTop: 12 }}>
        {DUMMY_COMMUNITIES.map((co) => <CommunityCard key={co.id} co={co} />)}
      </View>
    );
  };

  return (
    <View style={profileStyles.tabsWrap} {...swipePan.panHandlers}>
      {/* Tab row */}
      <View style={profileStyles.tabRow}>
        <Animated.View
          style={[profileStyles.tabIndicator, { width: tabWidth, transform: [{ translateX: indicatorAnim }] }]}
        >
          <LinearGradient
            colors={["#FF6C1A", "#CC4200"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        {PROFILE_TABS.map((tab, i) => (
          <TouchableOpacity
            key={tab}
            style={[profileStyles.tabBtn, { width: tabWidth }]}
            onPress={() => switchTo(tab, i)}
            activeOpacity={0.7}
          >
            <Text style={[profileStyles.tabLabel, active === tab && profileStyles.tabLabelActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content fades in on every tab switch */}
      <Animated.View style={{ opacity: contentAnim }}>
        {renderContent()}
      </Animated.View>

      {openPlaylist && (
        <PlaylistDetailOverlay playlist={openPlaylist} onClose={() => setOpenPlaylist(null)} />
      )}
    </View>
  );
}

// ─── Profile view ─────────────────────────────────────────────────────────────

const PROFILE_BANNER_H = 172;
const PROFILE_AVATAR_SIZE = 86;
const PROFILE_AVATAR_OVERLAP = Math.round(PROFILE_AVATAR_SIZE * 0.44);

function ProfileView() {
  return (
    <View style={{ flex: 1 }}>
      {/* ─── Top bar ─────────────────────────────────────────────── */}
      <View style={profileStyles.topBar}>
        <Text style={profileStyles.topBarTitle}>Profile</Text>
        <View style={profileStyles.topBarRight}>
          <TouchableOpacity style={profileStyles.topBarIconBtn} activeOpacity={0.7}>
            <Text style={profileStyles.topBarIcon}>🔔</Text>
          </TouchableOpacity>
          <TouchableOpacity style={profileStyles.topBarIconBtn} activeOpacity={0.7}>
            <Text style={profileStyles.topBarIcon}>⚙</Text>
          </TouchableOpacity>
          <TouchableOpacity style={profileStyles.proBadge} activeOpacity={0.85}>
            <Text style={profileStyles.proBadgeText}>PRO</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={profileStyles.scrollContent}>
      <View style={profileStyles.card}>
        {/* Banner */}
        <View style={profileStyles.bannerWrap}>
          <LinearGradient
            colors={["#3D0C00", "#CC4200", "#FF6C1A", "#CC4200", "#3D0C00"]}
            locations={[0, 0.25, 0.5, 0.75, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={["transparent", "rgba(22,22,24,0.55)"]}
            style={StyleSheet.absoluteFill}
          />
          <View style={profileStyles.bannerGlow} />

          <View style={profileStyles.bannerActions}>
            <TouchableOpacity style={profileStyles.socialBtn} activeOpacity={0.7}>
              <Text style={profileStyles.socialIcon}>𝕏</Text>
            </TouchableOpacity>
            <TouchableOpacity style={profileStyles.socialBtn} activeOpacity={0.7}>
              <Text style={profileStyles.socialIcon}>◎</Text>
            </TouchableOpacity>
            <TouchableOpacity style={profileStyles.socialBtn} activeOpacity={0.7}>
              <Text style={profileStyles.socialIcon}>🎙</Text>
            </TouchableOpacity>
            <TouchableOpacity style={profileStyles.followBtn} activeOpacity={0.85}>
              <Text style={profileStyles.followBtnText}>Follow</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Avatar row — negative margin overlaps banner bottom */}
        <View style={[profileStyles.avatarRow, { marginTop: -PROFILE_AVATAR_OVERLAP }]}>
          <View style={profileStyles.avatar}>
            <Text style={profileStyles.avatarInitials}>JD</Text>
          </View>
        </View>

        {/* Info */}
        <View style={profileStyles.infoSection}>
          <View style={profileStyles.nameRow}>
            <Text style={profileStyles.name}>Jane Doe</Text>
            <View style={profileStyles.verifiedBadge}>
              <Text style={profileStyles.verifiedText}>✓</Text>
            </View>
          </View>
          <Text style={profileStyles.handle}>@thejanedoe</Text>

          <Text style={profileStyles.bio}>
            {"Creative Designer w/ Marketing Expertise\nEx Art Director → "}
            <Text style={profileStyles.mention}>@apple</Text>
          </Text>

          <View style={profileStyles.statsRow}>
            <Text style={profileStyles.statNum}>100</Text>
            <Text style={profileStyles.statLabel}> Following</Text>
            <View style={{ width: 22 }} />
            <Text style={profileStyles.statNum}>23.6K</Text>
            <Text style={profileStyles.statLabel}> Followers</Text>
          </View>

          <View style={profileStyles.metaRow}>
            <View style={profileStyles.metaItem}>
              <Text style={profileStyles.metaIcon}>⊙</Text>
              <Text style={profileStyles.metaText}>To Be Determined</Text>
            </View>
            <View style={profileStyles.metaItem}>
              <Text style={profileStyles.metaIcon}>⊘</Text>
              <Text style={profileStyles.metaText}>To Be Determined</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ─── Now Playing card ────────────────────────────────────── */}
      <LinearGradient
        colors={["#3D1A0C", "#1E0D08", "#0E0907"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={profileStyles.nowPlayingCard}
      >
        {/* Album art + song info row */}
        <View style={profileStyles.npTopRow}>
          <View style={profileStyles.npArt}>
            <Text style={profileStyles.npArtEmoji}>🎵</Text>
          </View>

          <View style={profileStyles.npInfo}>
            <Text style={profileStyles.npTitle} numberOfLines={1}>Kini Mereka Tahu</Text>
            <Text style={profileStyles.npArtist} numberOfLines={1}>Bernadya</Text>

            {/* Progress bar */}
            <View style={profileStyles.npProgressTrack}>
              <View style={profileStyles.npProgressFill}>
                <View style={profileStyles.npProgressThumb} />
              </View>
            </View>

            {/* Timestamps */}
            <View style={profileStyles.npTimestamps}>
              <Text style={profileStyles.npTime}>0:55</Text>
              <Text style={profileStyles.npTime}>2:58</Text>
            </View>
          </View>
        </View>

        {/* Broadcast row */}
        <BroadcastRow />
      </LinearGradient>

      {/* ─── Section tabs ────────────────────────────────────────── */}
      <ProfileTabs />
    </ScrollView>
    </View>
  );
}

const profileStyles = StyleSheet.create({
  scrollContent: { padding: 16, paddingBottom: NAVBAR_H + BOTTOM_INSET + 32 },

  // Top bar — flat, no border radius
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  topBarTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -0.3,
  },
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  topBarIconBtn: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  topBarIcon: { fontSize: 18, color: "rgba(255,255,255,0.6)" },
  proBadge: {
    paddingHorizontal: 12,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#AB00FF",
    alignItems: "center",
    justifyContent: "center",
  },
  proBadgeText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 1.2,
  },
  card: { backgroundColor: "#161618", borderRadius: 24, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  bannerWrap: { height: PROFILE_BANNER_H, overflow: "hidden" },
  bannerGlow: { position: "absolute", width: 280, height: 280, borderRadius: 140, backgroundColor: "#FF7030", opacity: 0.38, alignSelf: "center", top: -100 },
  bannerActions: { position: "absolute", bottom: 14, right: 16, flexDirection: "row", alignItems: "center", gap: 8 },
  socialBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(0,0,0,0.35)", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  socialIcon: { fontSize: 15, color: "#fff" },
  followBtn: { paddingHorizontal: 18, height: 34, borderRadius: 17, backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center" },
  followBtnText: { fontSize: 14, fontWeight: "700", color: "#111" },
  avatarRow: { paddingHorizontal: 18, paddingBottom: 12 },
  avatar: { width: PROFILE_AVATAR_SIZE, height: PROFILE_AVATAR_SIZE, borderRadius: 18, backgroundColor: "#FF6B35", borderWidth: 3, borderColor: "#161618", alignItems: "center", justifyContent: "center" },
  avatarInitials: { fontSize: 28, fontWeight: "800", color: "#fff" },
  infoSection: { paddingHorizontal: 20, paddingBottom: 26 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 3 },
  name: { fontSize: 21, fontWeight: "800", color: "#ffffff" },
  verifiedBadge: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#1D9BF0", alignItems: "center", justifyContent: "center" },
  verifiedText: { fontSize: 10, fontWeight: "900", color: "#fff" },
  handle: { fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 14 },
  bio: { fontSize: 14, color: "rgba(255,255,255,0.8)", lineHeight: 22, marginBottom: 16 },
  mention: { color: "#1D9BF0" },
  statsRow: { flexDirection: "row", alignItems: "baseline", marginBottom: 16 },
  statNum: { fontSize: 15, fontWeight: "800", color: "#ffffff" },
  statLabel: { fontSize: 14, color: "rgba(255,255,255,0.38)" },
  metaRow: { flexDirection: "row", gap: 20 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaIcon: { fontSize: 13, color: "rgba(255,255,255,0.28)" },
  metaText: { fontSize: 13, color: "rgba(255,255,255,0.32)" },

  // Now Playing card
  nowPlayingCard: {
    marginTop: 12,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    padding: 16,
    gap: 14,
  },
  npTopRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  npArt: {
    width: 68,
    height: 68,
    borderRadius: 10,
    backgroundColor: "#2a1a10",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  npArtEmoji: { fontSize: 26, opacity: 0.5 },
  npInfo: { flex: 1, gap: 3 },
  npTitle: { fontSize: 15, fontWeight: "700", color: "#ffffff" },
  npArtist: { fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 10 },
  npProgressTrack: { height: 3, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 2, marginBottom: 5 },
  npProgressFill: { width: "35%", height: 3, backgroundColor: "#ffffff", borderRadius: 2, position: "relative" },
  npProgressThumb: { position: "absolute", right: -5, top: -4, width: 11, height: 11, borderRadius: 6, backgroundColor: "#fff" },
  npTimestamps: { flexDirection: "row", justifyContent: "space-between" },
  npTime: { fontSize: 11, color: "rgba(255,255,255,0.35)" },

  // Section tabs
  tabsWrap: { marginTop: 12 },
  tabRow: {
    flexDirection: "row",
    position: "relative",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
  },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    height: 2,
    borderRadius: 1,
    overflow: "hidden",
  },
  tabBtn: {
    paddingVertical: 12,
    alignItems: "center",
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.32)",
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    color: "#ffffff",
  },
  // Repost label
  repostLabel: { paddingHorizontal: 16, paddingBottom: 6, paddingTop: 2 },
  repostLabelText: { fontSize: 12, color: "rgba(255,255,255,0.35)", fontWeight: "600" },

  // Playlist list items
  playlistListItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 14,
  },
  playlistListArt: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    overflow: "hidden",
  },
  playlistListArtInner: { ...StyleSheet.absoluteFillObject, flexDirection: "row", flexWrap: "wrap" },
  playlistListMiniCell: { width: "50%", height: "100%" },
  playlistListName: { fontSize: 15, fontWeight: "700", color: "#fff", marginBottom: 3 },
  playlistListMeta: { fontSize: 13, color: "rgba(255,255,255,0.38)" },
  playlistChevron: { fontSize: 20, color: "rgba(255,255,255,0.25)", paddingRight: 4 },

  // Community cards
  communityCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  communityIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  communityName: { fontSize: 14, fontWeight: "700", color: "#fff", marginBottom: 3 },
  communityDesc: { fontSize: 12, color: "rgba(255,255,255,0.4)" },
  communityMembers: { fontSize: 13, fontWeight: "700", flexShrink: 0 },

  // Gradient toggle
  toggleTrack: {
    width: TOGGLE_W,
    height: TOGGLE_H,
    borderRadius: TOGGLE_H / 2,
    overflow: "hidden",
    justifyContent: "center",
    paddingLeft: 3,
  },
  toggleThumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 3,
  },

  // Broadcast row
  broadcastRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  broadcastLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    fontWeight: "500",
  },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function FeedScreen() {
  const [menuVisible, setMenuVisible] = useState(false);
  const [activeNav, setActiveNav] = useState("Feed");
  const [quickReplyPost, setQuickReplyPost] = useState<Post | null>(null);
  const [detailPost, setDetailPost] = useState<Post | null>(null);
  const [openDm, setOpenDm]         = useState<DirectMessage | null>(null);
  const [keyboardUp, setKeyboardUp] = useState(false);
  const [feedScrollEnabled, setFeedScrollEnabled] = useState(true);

  // Composer bottom animates between resting position (above nav) and above keyboard
  const composerBottom = useRef(new Animated.Value(COMPOSER_ABOVE_NAV)).current;

  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvt, (e) => {
      setKeyboardUp(true);
      Animated.timing(composerBottom, {
        toValue: e.endCoordinates.height + 8,
        duration: Platform.OS === "ios" ? (e.duration ?? 260) : 260,
        useNativeDriver: false,
      }).start();
    });

    const hideSub = Keyboard.addListener(hideEvt, (e) => {
      setKeyboardUp(false);
      Animated.timing(composerBottom, {
        toValue: COMPOSER_ABOVE_NAV,
        duration: Platform.OS === "ios" ? (e.duration ?? 260) : 260,
        useNativeDriver: false,
      }).start();
    });

    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {activeNav === "Profile" ? (
          <ProfileView />
        ) : activeNav === "Discover" ? (
          <DiscoverView />
        ) : activeNav === "Meets" ? (
          <MeetsView />
        ) : activeNav === "Messages" ? (
          <MessagesView onOpenChat={setOpenDm} />
        ) : (
          <FlatList
            data={POSTS}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.feedContent}
            showsVerticalScrollIndicator={false}
            scrollEnabled={feedScrollEnabled}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              <>
                <View style={styles.navbar}>
                  <Text style={styles.navTitle}>Feed</Text>
                  <Text style={styles.navBrand}>trackmeet</Text>
                  <TouchableOpacity style={styles.notifBtn} activeOpacity={0.7}>
                    <Ionicons name="notifications-outline" size={22} color="#fff" />
                  </TouchableOpacity>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.storiesContent}
                  style={styles.storiesStrip}
                >
                  {STORIES.map((s) => <StoryBubble key={s.id} item={s} />)}
                </ScrollView>
                <View style={styles.stripDivider} />
              </>
            }
            renderItem={({ item }) => (
              <SwipeablePost
                item={item}
                onQuickReply={setQuickReplyPost}
                onScrollLock={setFeedScrollEnabled}
                onPress={() => setDetailPost(item)}
              />
            )}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          />
        )}
      </SafeAreaView>

      {/* Floating composer — only on Feed tab */}
      {activeNav !== "Profile" && activeNav !== "Discover" && activeNav !== "Messages" && (
        <Animated.View style={[styles.composerWrap, { bottom: composerBottom }]}>
          <View style={styles.composerGlass}>
            <TouchableOpacity
              style={styles.composerPlus}
              activeOpacity={0.8}
              onPress={() => setMenuVisible(true)}
            >
              <Text style={styles.composerPlusIcon}>+</Text>
            </TouchableOpacity>

            <TextInput
              style={styles.composerInput}
              placeholder="What's on your mind?"
              placeholderTextColor="rgba(255,255,255,0.3)"
              returnKeyType="done"
            />

            <TouchableOpacity style={styles.composerSend} activeOpacity={0.8}>
              <Text style={styles.composerSendIcon}>↑</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* Bottom nav — hidden when keyboard is up */}
      {!keyboardUp && <BottomNav active={activeNav} onPress={setActiveNav} />}

      {/* Modals */}
      <ComposerActionMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />
      {quickReplyPost && (
        <QuickReplyOverlay
          post={quickReplyPost}
          onClose={() => setQuickReplyPost(null)}
          onOpenDetail={() => {
            const p = quickReplyPost;
            setQuickReplyPost(null);
            setDetailPost(p);
          }}
        />
      )}

      {/* Post detail — slides in from right over the whole feed */}
      {detailPost && (
        <PostDetailOverlay post={detailPost} onClose={() => setDetailPost(null)} />
      )}

      {/* Chat detail — slides in from right over everything */}
      {openDm && (
        <ChatDetailView dm={openDm} onClose={() => setOpenDm(null)} />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D0D" },

  feedContent: { paddingBottom: NAVBAR_H + 64 + BOTTOM_INSET + 32 },

  // Top navbar
  navbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 12,
  },
  navTitle: { fontSize: 48, fontWeight: "900", color: "#ffffff", letterSpacing: -1, lineHeight: 52 },
  navBrand: {
    position: "absolute",
    left: 0, right: 0,
    textAlign: "center",
    fontSize: 25,
    fontFamily: "Pacifico_400Regular",
    color: "#AB00FF",
    pointerEvents: "none",
  },
  notifBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center", justifyContent: "center",
  },

  // Stories
  storiesStrip: { paddingBottom: 16 },
  storiesContent: { paddingHorizontal: 16, gap: 28 },
  storyItem: { alignItems: "center", width: 60 },
  storyRing: { width: 82, height: 82, borderRadius: 78, borderWidth: 5, alignItems: "center", justifyContent: "center", marginBottom: 5 },
  storyAvatar: { width: 76, height: 76, borderRadius: 78, alignItems: "center", justifyContent: "center" },
  storyInitials: { fontSize: 17, fontWeight: "800" },
  storyName: { fontSize: 10, color: "rgba(255,255,255,0.4)", textAlign: "center" },
  stripDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.07)", marginBottom: 12 },

  // Card shell
  card: { backgroundColor: "#ffffff0e", borderRadius: 20, marginHorizontal: 13, paddingTop: 16, overflow: "hidden" },

  // Post header
  postHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10, paddingHorizontal: 16 },
  postAvatar: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  postAvatarText: { fontSize: 17, fontWeight: "800" },
  postUser: { fontSize: 14, fontWeight: "700", color: "#fff", marginBottom: 2 },
  postBio: { fontSize: 12, color: "#888", lineHeight: 16 },
  postText: { fontSize: 18, color: "#fff", lineHeight: 24, paddingHorizontal: 16, marginBottom: 12, fontWeight: "300" },

  // Media
  mediaBlock: { width: "100%", height: 220, alignItems: "center", justifyContent: "center" },
  mediaPlaceholder: { fontSize: 44, opacity: 0.25 },
  videoPlayCircle: { width: 54, height: 54, borderRadius: 27, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  videoPlayIcon: { fontSize: 20, color: "#fff", marginLeft: 3 },
  durationBadge: { position: "absolute", bottom: 10, right: 12, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  durationText: { fontSize: 12, color: "#fff", fontWeight: "600" },

  // Music player (visual only)
  musicPlayerCard: { width: "100%", overflow: "hidden" },
  musicArtArea: { width: "100%", height: 280, position: "relative" },
  musicArtFill: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  musicArtEmoji: { fontSize: 72, opacity: 0.25 },
  musicGradientOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, height: 110, opacity: 0.9 },
  musicTopRight: { position: "absolute", top: 14, right: 14, flexDirection: "row", gap: 8 },
  musicGlassBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.18)", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center" },
  musicGlassBtnIcon: { fontSize: 16, color: "#fff" },
  musicBottom: { paddingHorizontal: 18, paddingTop: 6, paddingBottom: 16 },
  musicSongTitle: { fontSize: 20, fontWeight: "700", color: "#ffffff", marginBottom: 2 },
  musicArtistName: { fontSize: 14, color: "rgba(255,255,255,0.55)", marginBottom: 14 },
  musicProgressRow: { marginBottom: 4 },
  musicProgressTrack: { height: 3, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 2 },
  musicProgressFill: { height: 3, borderRadius: 2, position: "relative" },
  musicProgressThumb: { position: "absolute", right: -5, top: -4, width: 11, height: 11, borderRadius: 6, backgroundColor: "#fff" },
  musicTimestamps: { flexDirection: "row", justifyContent: "space-between" },
  musicTime: { fontSize: 11, color: "rgba(255,255,255,0.45)" },

  // Poll
  pollContainer: { paddingHorizontal: 16, paddingBottom: 4 },
  pollQuestion: { fontSize: 17, fontWeight: "700", color: "#ffffff", marginBottom: 14 },
  pollOptions: { gap: 9, marginBottom: 10 },
  pollOption: { borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", overflow: "hidden", position: "relative", backgroundColor: "rgba(255,255,255,0.05)", minHeight: 46, justifyContent: "center" },
  pollFillBar: { position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: 13 },
  pollOptionInner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12 },
  pollOptionLabel: { fontSize: 14, color: "#ffffff", fontWeight: "500", flex: 1 },
  pollPct: { fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: "700", marginLeft: 8 },
  pollMeta: { fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 2 },

  // Action row
  actionRow: { flexDirection: "row", alignItems: "center", gap: 18, paddingHorizontal: 16, paddingVertical: 12 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  actionIcon: { fontSize: 30, color: "#555" },
  actionIconLiked: { color: "#FF3CAC" },
  actionCount: { fontSize: 13, color: "#888", fontWeight: "600" },
  actionCountLiked: { color: "#FF3CAC" },
  moreIcon: { fontSize: 18, color: "#bbb", letterSpacing: 2 },

  // Floating composer
  composerWrap: { position: "absolute", left: 16, right: 16 },
  composerGlass: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(22, 22, 28, 0.9)",
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.13)",
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 16,
  },
  composerPlus: { width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },
  composerPlusIcon: { fontSize: 24, color: "#fff", lineHeight: 28 },
  composerInput: { flex: 1, fontSize: 15, color: "#ffffff", paddingVertical: 6, paddingHorizontal: 4 },
  composerSend: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#AB00FF", alignItems: "center", justifyContent: "center" },
  composerSendIcon: { fontSize: 18, color: "#fff", fontWeight: "700" },

  // Bottom glass navbar
  navBarWrap: { position: "absolute", bottom: 0, left: 0, right: 0, paddingBottom: BOTTOM_INSET, paddingHorizontal: 12, paddingTop: 8, backgroundColor: "rgba(13,13,13,0.85)", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)" },
  navBarGlass: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 96, borderWidth: 1, borderColor: "rgba(255,255,255,0.09)", paddingVertical: 6, height: NAVBAR_H - 8 },
  navItem: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3, paddingVertical: 4 },
  navIcon: { fontSize: 30, color: "rgba(255,255,255,0.3)" },
  navIconActive: { color: "#AB00FF" },
  navLabel: { fontSize: 10, color: "rgba(255,255,255,0.3)", fontWeight: "500" },
  navLabelActive: { color: "#AB00FF", fontWeight: "700" },

  // Swipe container + reply indicator
  swipeContainer: { position: "relative" },
  replyIndicator: {
    position: "absolute",
    right: 22,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    gap: 3,
  },
  replyIndicatorArrow: { fontSize: 20, color: "#AB00FF" },
  replyIndicatorLabel: {
    fontSize: 11,
    color: "#AB00FF",
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },

  // Quick reply overlay
  qrBackdrop: { backgroundColor: "rgb(10, 10, 14)" },
  qrCardWrap: { position: "absolute", top: 60, left: 12, right: 12 },
  qrCloseBtn: { position: "absolute", top: -13, right: -13, zIndex: 20 },
  qrCloseBtnCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(35,35,40,0.98)", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  qrCloseBtnIcon: { fontSize: 12, color: "#fff", fontWeight: "700" },
  qrInputRow: { position: "absolute", left: 16, right: 16 },
  qrInputGlass: { flexDirection: "row", alignItems: "center", backgroundColor: "#1c1c22", borderRadius: 28, paddingHorizontal: 8, paddingVertical: 6, gap: 10 },
  qrAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  qrAvatarText: { fontSize: 14, fontWeight: "800" },
  qrInputInner: { flex: 1 },
  qrReplyingTo: { fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 2 },
  qrInput: { fontSize: 15, color: "#ffffff", paddingVertical: 0 },
  qrSend: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#AB00FF", alignItems: "center", justifyContent: "center" },
  qrSendIcon: { fontSize: 17, color: "#fff", fontWeight: "700" },
  qrPlusBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },
  qrPlusBtnIcon: { fontSize: 22, color: "#fff", lineHeight: 26 },

  // Action menu sheet
  menuBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)" },
  menuSheet: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#111113", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  menuHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.18)", alignSelf: "center", marginTop: 10, marginBottom: 12 },

  menuHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14 },
  menuXBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  menuXBtnIcon: { fontSize: 12, color: "#fff", fontWeight: "700" },
  menuHeaderTitle: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: "700", color: "#ffffff" },
  menuHeaderRight: { fontSize: 14, color: "#AB00FF", fontWeight: "600" },

  menuPhotoStrip: { paddingHorizontal: 16, paddingBottom: 16, gap: 8 },
  menuCameraBox: { width: 96, height: 96, borderRadius: 14, backgroundColor: "#1a1a1e", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  menuCameraIcon: { fontSize: 28 },
  menuCameraLabel: { fontSize: 12, color: "#fff", fontWeight: "600" },
  menuPhotoThumb: { width: 96, height: 96, borderRadius: 14, overflow: "hidden" },

  menuSectionDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.07)", marginHorizontal: 0, marginVertical: 2 },
  menuSection: { paddingHorizontal: 16 },
  menuRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, gap: 14 },
  menuRowBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.07)" },
  menuRowIconBox: { width: 30, alignItems: "center" },
  menuRowIconText: { fontSize: 18 },
  menuRowLabel: { flex: 1, fontSize: 15, color: "#ffffff", fontWeight: "400" },
  menuRowRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  menuRowRightText: { fontSize: 14, color: "rgba(255,255,255,0.4)" },
  menuRowChevron: { fontSize: 18, color: "rgba(255,255,255,0.25)", fontWeight: "300" },
  menuToggle: { marginLeft: "auto" as any },

  // Post detail overlay
  detailOverlay: { backgroundColor: "#0D0D0D", zIndex: 100 },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
  },
  detailBackBtn: { width: 40, height: 40, alignItems: "flex-start", justifyContent: "center" },
  detailBackIcon: { fontSize: 32, color: "#fff", fontWeight: "300", lineHeight: 36 },
  detailHeaderTitle: { fontSize: 16, fontWeight: "700", color: "#fff" },
  detailListContent: { paddingBottom: 120 },
  detailDivider: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
    marginBottom: 4,
  },
  detailDividerLabel: { fontSize: 13, color: "rgba(255,255,255,0.35)", fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.8 },

  // Comment rows
  commentWrap: { position: "relative" },
  commentReplyHint: { position: "absolute", right: 18, top: 0, bottom: 0, justifyContent: "center", alignItems: "center", gap: 2 },
  commentRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#0D0D0D" },
  commentAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  commentAvatarText: { fontSize: 13, fontWeight: "800" },
  commentBody: { flex: 1, gap: 3 },
  commentMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  commentHandle: { fontSize: 13, fontWeight: "700", color: "#fff" },
  commentTime: { fontSize: 11, color: "rgba(255,255,255,0.3)" },
  commentText: { fontSize: 14, color: "rgba(255,255,255,0.82)", lineHeight: 20 },
  commentLikeBtn: { alignItems: "center", gap: 2, paddingLeft: 4, flexShrink: 0 },
  commentLikeIcon: { fontSize: 18, color: "rgba(255,255,255,0.3)" },
  commentLikeCount: { fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: "600" },
  commentSeparator: { height: 1, backgroundColor: "rgba(255,255,255,0.04)", marginHorizontal: 16 },

  // Detail reply bar
  detailReplyBarWrap: { position: "absolute", left: 16, right: 16 },
  detailReplyContext: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4, paddingBottom: 6 },
  detailReplyContextText: { fontSize: 12, color: "#AB00FF", fontWeight: "600" },
  detailReplyContextX: { fontSize: 18, color: "rgba(255,255,255,0.4)", lineHeight: 20 },
});
