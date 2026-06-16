import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Modal, Pressable,
  TextInput, Platform, KeyboardAvoidingView, ActivityIndicator, Alert, ScrollView, Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSheetDragClose } from "../../hooks/useSheetDragClose";
import { DragGrabber } from "../common/DragGrabber";
import { createGroupEvent, type GroupEvent } from "../../services/groupChats";
import { useKeyboardHeight } from "../../hooks/useKeyboardHeight";
import { SH } from "../../lib/feed/dimensions";
import { s } from "../../assets/styles/messages/CreateGroupEventOverlay";

const ACCENT = "#AB00FF";
const TOP_GAP = 60;

// Next 14 days as selectable chips (dependency-free, no native date picker).
function nextDays(n: number) {
  const out: { label: string; date: Date }[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + i);
    const label = i === 0 ? "Today" : i === 1 ? "Tomorrow"
      : d.toLocaleDateString([], { weekday: "short", day: "numeric" });
    out.push({ label, date: d });
  }
  return out;
}
const HOURS = Array.from({ length: 24 }, (_, h) => h);
const fmtHour = (h: number) => {
  const ampm = h < 12 ? "AM" : "PM";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr} ${ampm}`;
};

export function CreateGroupEventOverlay({
  groupId, onClose, onCreated,
}: {
  groupId: string;
  onClose: () => void;
  onCreated: (event: GroupEvent) => void;
}) {
  const slideAnim = useRef(new Animated.Value(SH)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const kb = useKeyboardHeight();
  const days = useMemo(() => nextDays(14), []);

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [dayIdx, setDayIdx] = useState(0);
  const [hour, setHour] = useState(() => Math.min(23, new Date().getHours() + 1));
  const [isMeet, setIsMeet] = useState(false);
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

  const startsAt = useMemo(() => {
    const d = new Date(days[dayIdx].date);
    d.setHours(hour, 0, 0, 0);
    return d;
  }, [days, dayIdx, hour]);

  const canSave = !!title.trim() && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const event = await createGroupEvent(groupId, {
        title, description: desc, startsAt: startsAt.toISOString(), isMeet,
      });
      if (!event) { Alert.alert("Couldn't create event", "Admins only â€” please try again."); return; }
      onCreated(event);
    } catch (e: any) {
      Alert.alert("Couldn't create event", e?.message ?? "Try again.");
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
        <Animated.View style={[s.sheet, kb > 0 && { bottom: kb + 12, maxHeight: SH - kb - TOP_GAP }, { transform: [{ translateY: slideAnim }, { scaleY: stretch }] }]}>
          <DragGrabber panHandlers={panHandlers} />
          <View style={s.headerRow}>
            <TouchableOpacity onPress={close} hitSlop={12}><Text style={s.cancel}>Cancel</Text></TouchableOpacity>
            <Text style={s.title}>New Event</Text>
            <TouchableOpacity onPress={save} disabled={!canSave} hitSlop={12}>
              {saving ? <ActivityIndicator size="small" color={ACCENT} />
                : <Text style={[s.save, !canSave && { opacity: 0.4 }]}>Create</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
            <Text style={s.label}>TITLE</Text>
            <TextInput style={s.input} placeholder="Listening party, book chatâ€¦" placeholderTextColor="rgba(255,255,255,0.28)" value={title} onChangeText={setTitle} maxLength={80} />

            <Text style={s.label}>DESCRIPTION</Text>
            <TextInput style={[s.input, { height: 70, textAlignVertical: "top" }]} placeholder="What's happening?" placeholderTextColor="rgba(255,255,255,0.28)" value={desc} onChangeText={setDesc} multiline maxLength={300} />

            <Text style={s.label}>DAY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
              {days.map((d, i) => (
                <TouchableOpacity key={i} style={[s.chip, dayIdx === i && s.chipActive]} onPress={() => setDayIdx(i)} activeOpacity={0.8}>
                  <Text style={[s.chipText, dayIdx === i && s.chipTextActive]}>{d.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={s.label}>TIME</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
              {HOURS.map((h) => (
                <TouchableOpacity key={h} style={[s.chip, hour === h && s.chipActive]} onPress={() => setHour(h)} activeOpacity={0.8}>
                  <Text style={[s.chipText, hour === h && s.chipTextActive]}>{fmtHour(h)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={s.meetRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={s.meetLabel}>Upcoming Meet</Text>
                <Text style={s.meetSub}>Mark this as a live listening room</Text>
              </View>
              <Switch value={isMeet} onValueChange={setIsMeet}
                trackColor={{ false: "rgba(255,255,255,0.15)", true: ACCENT }} thumbColor="#fff" ios_backgroundColor="rgba(255,255,255,0.15)" />
            </View>

            <Text style={s.preview}>
              {isMeet ? "ðŸŽ§ " : "ðŸ“… "}{startsAt.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })} Â· {fmtHour(hour)}
            </Text>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
