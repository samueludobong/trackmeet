import React, { useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Modal, Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSheetDragClose } from "../../hooks/useSheetDragClose";
import { DragGrabber } from "../common/DragGrabber";
import { type Post } from "../../app/data/mock";
import { styles } from "../../assets/styles/post/UnrepostConfirmOverlay";

const ACCENT = "#1DB954";

/**
 * Bottom-sheet confirmation shown when a user taps the already-green repost
 * button — undoing a repost is a real action and shouldn't be a single tap.
 * Same drag-to-close pattern as every other sheet in the app.
 */
export function UnrepostConfirmOverlay({
  post, onClose, onConfirm,
}: {
  post: Post;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(400)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 200 }),
      Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, []);

  const close = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 400, duration: 220, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(onClose);
  };

  const { panHandlers, stretch } = useSheetDragClose({ slideAnim, onClose: close, closedValue: 400 });
  const dragBackdrop = slideAnim.interpolate({
    inputRange: [0, 400], outputRange: [1, 0], extrapolate: "clamp",
  });

  const handleConfirm = () => {
    onConfirm();
    close();
  };

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

        <View style={styles.iconWrap}>
          <Ionicons name="repeat" size={26} color={ACCENT} />
        </View>

        <Text style={styles.title}>Undo repost?</Text>
        <Text style={styles.subtitle} numberOfLines={2}>
          Remove {post.user ? `@${post.user}'s` : "this"} post from your reposts.
          You can repost it again any time.
        </Text>

        <TouchableOpacity style={styles.confirmBtn} activeOpacity={0.85} onPress={handleConfirm}>
          <Text style={styles.confirmText}>Undo repost</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} activeOpacity={0.8} onPress={close}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}
