import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Modal, Pressable,
  TextInput, Platform, KeyboardAvoidingView, ActivityIndicator, Alert, ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSheetDragClose } from "../../hooks/useSheetDragClose";
import { DragGrabber } from "../common/DragGrabber";
import { createGroupPoll, type GroupPoll } from "../../services/groupChats";
import { useKeyboardHeight } from "../../hooks/useKeyboardHeight";
import { SH } from "../../lib/feed/dimensions";

const ACCENT = "#AB00FF";
const MAX_OPTIONS = 6;
const TOP_GAP = 60;

export function CreateGroupPollOverlay({
  groupId, onClose, onCreated,
}: {
  groupId: string;
  onClose: () => void;
  onCreated: (poll: GroupPoll) => void;
}) {
  const slideAnim = useRef(new Animated.Value(SH)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const kb = useKeyboardHeight();

  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 200 }),
      Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, []);

  const close = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: SH, duration: 220, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(onClose);
  };

  const { panHandlers, stretch } = useSheetDragClose({ slideAnim, onClose: close, closedValue: SH });
  const dragBackdrop = slideAnim.interpolate({ inputRange: [0, SH], outputRange: [1, 0], extrapolate: "clamp" });

  const setOption = (i: number, v: string) => setOptions((prev) => prev.map((o, idx) => (idx === i ? v : o)));
  const addOption = () => setOptions((prev) => (prev.length >= MAX_OPTIONS ? prev : [...prev, ""]));
  const removeOption = (i: number) => setOptions((prev) => (prev.length <= 2 ? prev : prev.filter((_, idx) => idx !== i)));

  const validCount = options.filter((o) => o.trim()).length;
  const canSave = !!question.trim() && validCount >= 2 && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const poll = await createGroupPoll(groupId, question, options);
      if (!poll) { Alert.alert("Couldn't create poll", "Add a question and at least 2 options."); return; }
      onCreated(poll);
    } catch (e: any) {
      Alert.alert("Couldn't create poll", e?.message ?? "Try again.");
    } finally { setSaving(false); }
  };

  return (
    <Modal transparent animationType="none" statusBarTranslucent onRequestClose={close}>
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.6)" },
          { opacity: Animated.multiply(backdropAnim, dragBackdrop) }]}
        pointerEvents="none"
      />
      <Pressable style={StyleSheet.absoluteFill} onPress={close} />

      <KeyboardAvoidingView
        style={StyleSheet.absoluteFill}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        pointerEvents="box-none"
      >
        <Animated.View style={[s.sheet, kb > 0 && { maxHeight: SH - kb - TOP_GAP }, { transform: [{ translateY: slideAnim }, { scaleY: stretch }] }]}>
          <DragGrabber panHandlers={panHandlers} />
          <View style={s.headerRow}>
            <TouchableOpacity onPress={close} hitSlop={12}><Text style={s.cancel}>Cancel</Text></TouchableOpacity>
            <Text style={s.title}>New Poll</Text>
            <TouchableOpacity onPress={save} disabled={!canSave} hitSlop={12}>
              {saving ? <ActivityIndicator size="small" color={ACCENT} />
                : <Text style={[s.create, !canSave && { opacity: 0.4 }]}>Post</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
            <Text style={s.label}>QUESTION</Text>
            <TextInput
              style={s.input}
              placeholder="What should we listen to next?"
              placeholderTextColor="rgba(255,255,255,0.28)"
              value={question} onChangeText={setQuestion} maxLength={120} multiline
            />

            <Text style={s.label}>OPTIONS</Text>
            {options.map((o, i) => (
              <View key={i} style={s.optionRow}>
                <TextInput
                  style={[s.input, { flex: 1 }]}
                  placeholder={`Option ${i + 1}`}
                  placeholderTextColor="rgba(255,255,255,0.28)"
                  value={o} onChangeText={(v) => setOption(i, v)} maxLength={60}
                />
                {options.length > 2 && (
                  <TouchableOpacity onPress={() => removeOption(i)} hitSlop={8} style={s.removeBtn}>
                    <Ionicons name="close-circle" size={20} color="rgba(255,255,255,0.4)" />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {options.length < MAX_OPTIONS && (
              <TouchableOpacity style={s.addBtn} onPress={addOption} activeOpacity={0.8}>
                <Ionicons name="add" size={18} color={ACCENT} />
                <Text style={s.addText}>Add option</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  sheet: {
    position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "88%",
    backgroundColor: "#161618", borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderTopWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 20, paddingBottom: 24,
  },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  cancel: { color: "rgba(255,255,255,0.55)", fontSize: 15, fontWeight: "600" },
  title: { color: "#fff", fontSize: 16, fontWeight: "800" },
  create: { color: ACCENT, fontSize: 15, fontWeight: "800" },

  label: { fontSize: 11, fontWeight: "800", letterSpacing: 0.9, color: "rgba(255,255,255,0.4)", marginBottom: 8, marginTop: 14 },
  input: {
    backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: "#fff", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
  },
  optionRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  removeBtn: { padding: 2 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10, marginTop: 2 },
  addText: { fontSize: 14, fontWeight: "700", color: ACCENT },
});
