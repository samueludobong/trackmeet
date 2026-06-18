import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator } from "react-native";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";

/**
 * Launch-time prompt: if the user still has a live meet they were hosting (the
 * app was closed without ending it), ask whether to jump back in or end it.
 */
export function ResumeMeetPrompt({
  meet,
  onRejoin,
  onEnd,
}: {
  meet: { id: string; name: string } | null;
  onRejoin: () => void;
  onEnd: () => Promise<void> | void;
}) {
  const [ending, setEnding] = useState(false);
  if (!meet) return null;

  const handleEnd = async () => {
    if (ending) return;
    setEnding(true);
    try { await onEnd(); } finally { setEnding(false); }
  };

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
      <View style={styles.scrim}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <FontAwesome5 name="broadcast-tower" size={24} color="#D9A8FF" />
          </View>
          <Text style={styles.title}>Your Meet is still live</Text>
          <Text style={styles.body}>
            <Text style={styles.bodyName}>{meet.name || "Your Meet"}</Text> is still
            broadcasting from when you last closed the app. Hop back in, or end it?
          </Text>

          <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85} onPress={onRejoin} disabled={ending}>
            <Ionicons name="headset" size={17} color="#fff" />
            <Text style={styles.primaryText}>Pop back in</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.endBtn} activeOpacity={0.8} onPress={handleEnd} disabled={ending}>
            {ending ? (
              <ActivityIndicator size="small" color="#FF6B6B" />
            ) : (
              <Text style={styles.endText}>End the Meet</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.78)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#171018",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(171,0,255,0.35)",
  },
  iconWrap: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: "rgba(171,0,255,0.18)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 14,
  },
  title: { fontSize: 20, fontWeight: "800", color: "#fff", marginBottom: 8, textAlign: "center" },
  body: { fontSize: 14, lineHeight: 20, color: "rgba(255,255,255,0.7)", textAlign: "center", marginBottom: 20 },
  bodyName: { fontWeight: "800", color: "#fff" },
  primaryBtn: {
    alignSelf: "stretch",
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9,
    backgroundColor: "#AB00FF", borderRadius: 26, paddingVertical: 15,
  },
  primaryText: { fontSize: 16, fontWeight: "800", color: "#fff" },
  endBtn: { alignSelf: "stretch", paddingVertical: 14, alignItems: "center", marginTop: 4 },
  endText: { fontSize: 15, fontWeight: "700", color: "#FF6B6B" },
});
