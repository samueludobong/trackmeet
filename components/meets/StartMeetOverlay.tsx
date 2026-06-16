import React, { useRef, useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Modal, Pressable, TextInput, Platform, Switch, Keyboard, TouchableWithoutFeedback } from "react-native";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { startMeet } from "../../services/meets";
import { mmStyles } from "../../assets/styles/feed/localStyles";
import { SH } from "../../lib/feed/dimensions";
import { useSheetDragClose } from "../../hooks/useSheetDragClose";
import { DragGrabber } from "../common/DragGrabber";

export function StartMeetOverlay({ visible, onClose, onStarted }: { visible: boolean; onClose: () => void; onStarted: (meetId: string, name: string) => void }) {
  const slideY    = useRef(new Animated.Value(SH)).current;
  const backdropO = useRef(new Animated.Value(0)).current;
  // kbPad grows to keyboard height so scroll content is never hidden behind it
  const kbPad     = useRef(new Animated.Value(0)).current;

  const [meetName,        setMeetName]        = useState("");
  const [meetDescription, setMeetDescription] = useState("");
  const [allowComments,   setAllowComments]   = useState(true);
  const [allowReactions,  setAllowReactions]  = useState(true);
  const [tagInput,        setTagInput]        = useState("");
  const [tags,            setTags]            = useState<string[]>([]);
  const [starting,        setStarting]        = useState(false);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideY,    { toValue: 0, useNativeDriver: true, tension: 70, friction: 14 }),
        Animated.timing(backdropO, { toValue: 1, useNativeDriver: true, duration: 220 }),
      ]).start();

      const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
      const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
      const showSub = Keyboard.addListener(showEvt, (e) => {
        Animated.timing(kbPad, {
          toValue: e.endCoordinates.height,
          duration: Platform.OS === "ios" ? (e.duration ?? 260) : 260,
          useNativeDriver: false,
        }).start();
      });
      const hideSub = Keyboard.addListener(hideEvt, (e) => {
        Animated.timing(kbPad, {
          toValue: 0,
          duration: Platform.OS === "ios" ? (e.duration ?? 260) : 260,
          useNativeDriver: false,
        }).start();
      });
      return () => { showSub.remove(); hideSub.remove(); };
    } else {
      Keyboard.dismiss();
      kbPad.setValue(0);
      Animated.parallel([
        Animated.timing(slideY,    { toValue: SH,  useNativeDriver: true, duration: 260 }),
        Animated.timing(backdropO, { toValue: 0,   useNativeDriver: true, duration: 220 }),
      ]).start(() => {
        setMeetName(""); setMeetDescription("");
        setAllowComments(true); setAllowReactions(true);
        setTagInput(""); setTags([]); setStarting(false);
      });
    }
  }, [visible]);

  const addTag = () => {
    const cleaned = tagInput.trim().replace(/^#+/, "");
    if (!cleaned || tags.length >= 5) return;
    if (!tags.includes(cleaned)) setTags(prev => [...prev, cleaned]);
    setTagInput("");
  };
  const removeTag = (t: string) => setTags(prev => prev.filter(x => x !== t));

  const handleStart = async () => {
    if (!meetName.trim()) return;
    setStarting(true);
    try {
      const { meetId, error } = await startMeet({
        name:           meetName.trim(),
        description:    meetDescription.trim() || null,
        tags,
        allowComments:  allowComments,
        allowReactions: allowReactions,
      });
      if (error || !meetId) throw new Error(error ?? "Could not start meet");
      onClose();
      onStarted(meetId, meetName.trim());
    } catch (err) {
      console.error("Start Meet error:", err);
    } finally {
      setStarting(false);
    }
  };

  const { panHandlers: dragHandlers, stretch } = useSheetDragClose({ slideAnim: slideY, onClose, closedValue: SH });
  const dragBackdrop = slideY.interpolate({ inputRange: [0, SH], outputRange: [1, 0], extrapolate: "clamp" });

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>      <Animated.View
        style={[StyleSheet.absoluteFill, mmStyles.backdrop, { opacity: Animated.multiply(backdropO, dragBackdrop) }]}
        pointerEvents="none"
      />
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />      <Animated.View style={[mmStyles.sheet, { transform: [{ translateY: slideY }, { scaleY: stretch }] }]}>
        <DragGrabber panHandlers={dragHandlers} />
        <TouchableWithoutFeedback accessible={false} onPress={Keyboard.dismiss}>
          <View style={{ flex: 1 }}>

        <View style={mmStyles.header}>
          <Text style={mmStyles.headerTitle}>Start a Meet</Text>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close" size={22} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={mmStyles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <Text style={mmStyles.label}>Meet Name *</Text>
          <TextInput
            style={mmStyles.input}
            placeholder="Give your meet a name…"
            placeholderTextColor="rgba(255,255,255,0.28)"
            value={meetName}
            onChangeText={setMeetName}
            maxLength={60}
          />

          <Text style={mmStyles.label}>Description</Text>
          <TextInput
            style={[mmStyles.input, mmStyles.inputMultiline]}
            placeholder="What are you listening to? What's the vibe?"
            placeholderTextColor="rgba(255,255,255,0.28)"
            value={meetDescription}
            onChangeText={setMeetDescription}
            multiline
            maxLength={280}
          />

          <View style={mmStyles.toggleRow}>
            <Text style={mmStyles.toggleLabel}>Allow Comments</Text>
            <Switch value={allowComments} onValueChange={setAllowComments}
              trackColor={{ false: "rgba(255,255,255,0.12)", true: "#AB00FF" }} thumbColor="#fff" />
          </View>
          <View style={mmStyles.toggleRow}>
            <Text style={mmStyles.toggleLabel}>Allow Reactions</Text>
            <Switch value={allowReactions} onValueChange={setAllowReactions}
              trackColor={{ false: "rgba(255,255,255,0.12)", true: "#AB00FF" }} thumbColor="#fff" />
          </View>

          <Text style={mmStyles.label}>Tags <Text style={mmStyles.labelMuted}>(up to 5)</Text></Text>
          <View style={mmStyles.tagInputRow}>
            <TextInput
              style={mmStyles.tagInput}
              placeholder="Add a tag…"
              placeholderTextColor="rgba(255,255,255,0.28)"
              value={tagInput}
              onChangeText={setTagInput}
              onSubmitEditing={addTag}
              returnKeyType="done"
              maxLength={30}
              autoCapitalize="none"
            />
            <TouchableOpacity style={mmStyles.tagAddBtn} onPress={addTag} activeOpacity={0.75}>
              <Ionicons name="add" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
          {tags.length > 0 && (
            <View style={mmStyles.tagChips}>
              {tags.map(t => (
                <TouchableOpacity key={t} style={mmStyles.tagChip} onPress={() => removeTag(t)} activeOpacity={0.7}>
                  <Text style={mmStyles.tagChipText}>#{t}</Text>
                  <Ionicons name="close" size={12} color="rgba(255,255,255,0.55)" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={[mmStyles.startBtn, (!meetName.trim() || starting) && mmStyles.startBtnDisabled]}
            activeOpacity={0.85}
            onPress={handleStart}
            disabled={!meetName.trim() || starting}
          >
            <FontAwesome5 name="broadcast-tower" size={15} color="#fff" />
            <Text style={mmStyles.startBtnText}>{starting ? "Starting…" : "Start Meet"}</Text>
          </TouchableOpacity>          <Animated.View style={{ height: kbPad }} />
        </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </Animated.View>
    </Modal>
  );
}
// ─── Meet Live Screen ─────────────────────────────────────────────────────────
// Architecture: Page 1 (now-playing) is always rendered inside the modal.
// Page 2 (music picker) is an absolutely-positioned panel that slides in
// from the right — avoids horizontal-ScrollView touch/height conflicts.

// SecureStore flag — set once the user checks "don't show again" on the
// join explainer so we skip it on future joins.

// ─── Meet reactions ───────────────────────────────────────────────────────────
// Ephemeral floating emoji reactions, broadcast over the meet's realtime channel
// (no DB writes). Heart is the primary one-tap reaction; long-press opens a quick
// menu with mic / smile / music as secondary options.

// A single emoji that floats up, drifts sideways and fades out, then removes itself.
