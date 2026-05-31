import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { mbStyles } from "../../lib/feed/localStyles";

export function MeetMiniBar({
  albumArt, title, subtitle, onExpand,
}: {
  albumArt: string | null;
  title: string;
  subtitle: string;
  onExpand: () => void;
}) {
  const insets = useSafeAreaInsets();
  // Rendered inside its own transparent Modal so it sits above every other
  // layer (quick-reply, post detail, chat) and never clips through them. The
  // container is box-none so only the bar itself catches touches; everything
  // behind it stays interactive.
  return (
    <Modal transparent statusBarTranslucent animationType="none" visible>
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <TouchableOpacity
          style={[mbStyles.bar, { bottom: 78 + Math.max(insets.bottom - 6, 0) }]}
          activeOpacity={0.9}
          onPress={onExpand}
        >
          {albumArt ? (
            <Image source={{ uri: albumArt }} style={mbStyles.art} />
          ) : (
            <View style={[mbStyles.art, mbStyles.artFallback]}>
              <Ionicons name="musical-note" size={16} color="#fff" />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <View style={mbStyles.titleRow}>
              <View style={mbStyles.liveDot} />
              <Text style={mbStyles.title} numberOfLines={1}>{title}</Text>
            </View>
            <Text style={mbStyles.subtitle} numberOfLines={1}>{subtitle}</Text>
          </View>
          <View style={mbStyles.expandBtn}>
            <Ionicons name="chevron-up" size={18} color="#fff" />
          </View>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}



// ─── Meet chat list (shared by host + listener rooms) ─────────────────────────
