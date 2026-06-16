import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { gdStyles } from "../../assets/styles/feed/localStyles";

/** One-time explainer shown before a listener's app jumps to Spotify to start playback. */
export function MeetGuideOverlay({
  dontShowGuide, setDontShowGuide, onGotIt,
}: {
  dontShowGuide: boolean;
  setDontShowGuide: (fn: (v: boolean) => boolean) => void;
  onGotIt: () => void;
}) {
  return (
    <View style={[StyleSheet.absoluteFill, gdStyles.scrim]}>
      <View style={gdStyles.card}>
        <View style={gdStyles.iconWrap}>
          <Ionicons name="sync-outline" size={28} color="#1DB954" />
        </View>
        <Text style={gdStyles.title}>Starting the music</Text>
        <Text style={gdStyles.body}>
          We&apos;ll briefly open your streaming service to start playback — then
          come back here and we&apos;ll handle the rest, keeping you in sync with the host.
        </Text>

        <TouchableOpacity style={gdStyles.toggleRow} activeOpacity={0.7} onPress={() => setDontShowGuide((v) => !v)}>
          <View style={[gdStyles.checkbox, dontShowGuide && gdStyles.checkboxOn]}>
            {dontShowGuide && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
          <Text style={gdStyles.toggleText}>Don&apos;t show this again</Text>
        </TouchableOpacity>

        <TouchableOpacity style={gdStyles.gotItBtn} activeOpacity={0.85} onPress={onGotIt}>
          <Text style={gdStyles.gotItText}>Got it</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
