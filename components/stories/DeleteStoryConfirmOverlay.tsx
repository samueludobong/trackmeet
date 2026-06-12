import React, { useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Modal, Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSheetDragClose } from "../../hooks/useSheetDragClose";
import { DragGrabber } from "../common/DragGrabber";

const DANGER = "#ff4d6d";

/**
 * Bottom-sheet confirmation for deleting a story — deleting is permanent, so it
 * shouldn't be a single tap. Same drag-to-close pattern as every other sheet.
 */
export function DeleteStoryConfirmOverlay({
  onClose, onConfirm,
}: {
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
          <Ionicons name="trash" size={24} color={DANGER} />
        </View>

        <Text style={styles.title}>Delete story?</Text>
        <Text style={styles.subtitle} numberOfLines={2}>
          This story will be permanently removed. This can&apos;t be undone.
        </Text>

        <TouchableOpacity style={styles.confirmBtn} activeOpacity={0.85} onPress={handleConfirm}>
          <Text style={styles.confirmText}>Delete</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} activeOpacity={0.8} onPress={close}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    left: 0, right: 0, bottom: 0,
    backgroundColor: "#1a1a1f",
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 22,
  },
  iconWrap: {
    alignSelf: "center",
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: "rgba(255,77,109,0.14)",
    alignItems: "center", justifyContent: "center",
    marginTop: 4, marginBottom: 14,
  },
  title: { fontSize: 18, fontWeight: "800", color: "#fff", textAlign: "center", marginBottom: 6 },
  subtitle: {
    fontSize: 13, color: "rgba(255,255,255,0.55)",
    textAlign: "center", lineHeight: 18, marginBottom: 18,
  },
  confirmBtn: {
    backgroundColor: DANGER,
    borderRadius: 16, paddingVertical: 14, alignItems: "center",
  },
  confirmText: { fontSize: 15, fontWeight: "800", color: "#fff" },
  cancelBtn: {
    borderRadius: 16, paddingVertical: 12, alignItems: "center", marginTop: 8,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
  },
  cancelText: { fontSize: 14, fontWeight: "700", color: "rgba(255,255,255,0.6)" },
});
