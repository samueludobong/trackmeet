import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Modal, Pressable,
  ActivityIndicator, Alert, Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSheetDragClose } from "../../hooks/useSheetDragClose";
import { DragGrabber } from "../common/DragGrabber";
import { type CuratedPlaylist } from "../../lib/feed/types";
import { deleteCuratedPlaylist } from "../../services/playlists";

const ACCENT = "#1DB954";
const DANGER = "#ff4d6d";

/**
 * Bottom-sheet options menu for a curated playlist. Matches the other app
 * sheets: backdrop fade, slide-up sheet, drag-to-close via DragGrabber, sine
 * spring backdrop tied to drag offset.
 *
 * Menu items adapt to ownership:
 *   - Owner: Edit, Share, Delete
 *   - Viewer: Share
 */
export function PlaylistOptionsOverlay({
  playlist, isOwner, onClose, onEdit, onDeleted,
}: {
  playlist: CuratedPlaylist;
  isOwner: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(500)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 200 }),
      Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, []);

  const close = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 500, duration: 220, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(onClose);
  };

  const { panHandlers, stretch } = useSheetDragClose({ slideAnim, onClose: close, closedValue: 500 });
  const dragBackdrop = slideAnim.interpolate({
    inputRange: [0, 500], outputRange: [1, 0], extrapolate: "clamp",
  });

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out "${playlist.name}" on TrackMeet`,
      });
      close();
    } catch {
      // user cancelled or share failed — keep sheet open
    }
  };

  const handleEdit = () => {
    onEdit();
    close();
  };

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    const ok = await deleteCuratedPlaylist(playlist.id);
    setDeleting(false);
    if (!ok) {
      Alert.alert("Couldn't delete", "Please try again.");
      return;
    }
    onDeleted();
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

        <Text style={styles.title} numberOfLines={1}>{playlist.name}</Text>
        <Text style={styles.subtitle}>Playlist options</Text>

        {!confirmDelete ? (
          <View style={{ paddingHorizontal: 12, marginTop: 6 }}>
            {isOwner && (
              <MenuRow
                icon="pencil"
                label="Edit playlist"
                onPress={handleEdit}
              />
            )}
            <MenuRow
              icon="share-outline"
              label="Share"
              onPress={handleShare}
            />
            {isOwner && (
              <MenuRow
                icon="trash-outline"
                label="Delete playlist"
                danger
                onPress={() => setConfirmDelete(true)}
              />
            )}
          </View>
        ) : (
          <View style={styles.confirmBlock}>
            <Text style={styles.confirmTitle}>Delete this playlist?</Text>
            <Text style={styles.confirmSub}>
              "{playlist.name}" and all its songs will be permanently removed.
              This can't be undone.
            </Text>
            <TouchableOpacity
              style={styles.deleteConfirmBtn}
              activeOpacity={0.85}
              onPress={handleDelete}
              disabled={deleting}
            >
              {deleting
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.deleteConfirmText}>Delete</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelBtn}
              activeOpacity={0.8}
              onPress={() => setConfirmDelete(false)}
              disabled={deleting}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
}

function MenuRow({
  icon, label, danger, onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  danger?: boolean;
  onPress: () => void;
}) {
  const color = danger ? DANGER : "#fff";
  return (
    <TouchableOpacity
      style={[styles.menuRow, danger && styles.menuRowDanger]}
      activeOpacity={0.8}
      onPress={onPress}
    >
      <View style={[styles.iconWrap, danger && styles.iconWrapDanger]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.menuLabel, { color }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={15} color="rgba(255,255,255,0.2)" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    left: 0, right: 0, bottom: 0,
    backgroundColor: "#1a1a1f",
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  title: {
    fontSize: 17, fontWeight: "800", color: "#fff",
    paddingHorizontal: 22, marginTop: 2,
  },
  subtitle: {
    fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.4)",
    paddingHorizontal: 22, paddingBottom: 8, marginTop: 2, letterSpacing: 0.4,
  },
  menuRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    marginVertical: 3,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 14,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  menuRowDanger: {
    backgroundColor: "rgba(255,77,109,0.08)",
    borderColor: "rgba(255,77,109,0.2)",
  },
  iconWrap: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center", justifyContent: "center",
  },
  iconWrapDanger: {
    backgroundColor: "rgba(255,77,109,0.14)",
  },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: "600" },

  // ── Delete confirm block ─────────────────────────────────────────────────
  confirmBlock: { paddingHorizontal: 22, paddingTop: 10, gap: 10 },
  confirmTitle: { fontSize: 18, fontWeight: "800", color: "#fff" },
  confirmSub: {
    fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 18,
    marginBottom: 4,
  },
  deleteConfirmBtn: {
    backgroundColor: DANGER,
    borderRadius: 16, paddingVertical: 14, alignItems: "center",
  },
  deleteConfirmText: { fontSize: 15, fontWeight: "800", color: "#fff" },
  cancelBtn: {
    borderRadius: 16, paddingVertical: 12, alignItems: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
  },
  cancelText: { fontSize: 14, fontWeight: "700", color: "rgba(255,255,255,0.6)" },
});
