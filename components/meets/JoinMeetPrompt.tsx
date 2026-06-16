import React from "react";
import { View, Text, TouchableOpacity, Modal } from "react-native";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { jpStyles } from "../../assets/styles/feed/localStyles";

export function JoinMeetPrompt({
  visible, onCancel, onChoose,
}: {
  visible: boolean;
  onCancel: () => void;
  onChoose: (isPublic: boolean) => void;
}) {
  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent onRequestClose={onCancel}>
      <TouchableOpacity style={jpStyles.scrim} activeOpacity={1} onPress={onCancel}>
        <TouchableOpacity activeOpacity={1} style={jpStyles.card}>
          <View style={jpStyles.iconWrap}>
            <FontAwesome5 name="headphones" size={24} color="#AB00FF" />
          </View>
          <Text style={jpStyles.title}>Join this Meet</Text>
          <Text style={jpStyles.body}>
            Choose how you join. You can listen privately, or let others see you&apos;re
            here so they can join too.
          </Text>

          <TouchableOpacity style={jpStyles.publicBtn} activeOpacity={0.85} onPress={() => onChoose(true)}>
            <Ionicons name="people" size={18} color="#fff" />
            <View style={{ flex: 1 }}>
              <Text style={jpStyles.publicBtnText}>Join publicly</Text>
              <Text style={jpStyles.btnSub}>Shown on your profile — friends can join you</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={jpStyles.privateBtn} activeOpacity={0.85} onPress={() => onChoose(false)}>
            <Ionicons name="lock-closed" size={18} color="#fff" />
            <View style={{ flex: 1 }}>
              <Text style={jpStyles.privateBtnText}>Join privately</Text>
              <Text style={jpStyles.btnSub}>Your profile shows a normal now-playing</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={jpStyles.cancelBtn} activeOpacity={0.7} onPress={onCancel}>
            <Text style={jpStyles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}


// ─── Persistent minimized-meet bar ────────────────────────────────────────────
// Floats above the bottom nav on every screen while a meet is minimized, so the
// user can browse the app without leaving the meet. Tap to expand back.
