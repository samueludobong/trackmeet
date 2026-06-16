import React, { useRef, useEffect } from "react";
import { View, Text, Animated, Pressable, PanResponder } from "react-native";
import { styles } from "../../assets/styles/feed/styles";
import { OpenDetailCtx } from "../../lib/feed/contexts";
import { PostHeader } from "../../components/post/PostHeader";
import { PostCard } from "../../components/post/PostCard";
import { type Post } from "../../app/data/mock";

export function SwipeablePost({
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
      {/* Only the PostHeader is tappable — context guards against swipe false-fires */}
      <OpenDetailCtx.Provider value={() => { if (!swipeActivated.current) onPress(); }}>
        <Animated.View style={{ transform: [{ translateX }] }}>
          <PostCard item={item} />
        </Animated.View>
      </OpenDetailCtx.Provider>
    </View>
  );
}

// ─── Quick reply overlay ──────────────────────────────────────────────────────
