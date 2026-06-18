import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { profileStyles } from "../../assets/styles/feed/localStyles";
import { EqualizerBars } from "../meets/EqualizerBars";
import { type ActiveMeetForUser } from "../../services/meets";

/**
 * The "meet version" of the now-playing card, shown on your own profile when
 * you're in a live meet but nothing is playing yet (so the real now-playing
 * card — which needs a playing track — wouldn't render). Gives a live badge and
 * a one-tap way back into the meet room.
 */
export function ProfileMeetCard({
  activeMeet,
  onReturn,
}: {
  activeMeet: ActiveMeetForUser;
  onReturn: () => void;
}) {
  const isHosting = activeMeet.isHost;
  const hostName = activeMeet.host.display_name || activeMeet.host.username;

  return (
    <LinearGradient
      colors={["#2A0C3D", "#1A0820", "#0E070F"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[profileStyles.nowPlayingCard, profileStyles.nowPlayingCardMeet]}
    >
      <View style={profileStyles.npMeetBadge}>
        <FontAwesome5 name="broadcast-tower" size={11} color="#D9A8FF" />
        {isHosting ? (
          <Text style={profileStyles.npMeetBadgeText} numberOfLines={1}>
            Hosting <Text style={profileStyles.npMeetBadgeHost}>your Meet</Text>
          </Text>
        ) : (
          <Text style={profileStyles.npMeetBadgeText} numberOfLines={1}>
            Listening in <Text style={profileStyles.npMeetBadgeHost}>{hostName}</Text>&apos;s Meet
          </Text>
        )}
      </View>

      <View style={profileStyles.npTopRow}>
        <View style={[profileStyles.npArt, profileStyles.npArtFallback]}>
          <EqualizerBars color="#D9A8FF" count={4} height={24} width={3} gap={4} />
        </View>
        <View style={[profileStyles.npInfo, { justifyContent: "center" }]}>
          <Text style={profileStyles.npTitle} numberOfLines={1}>Nothing playing yet</Text>
          <Text style={profileStyles.npArtist} numberOfLines={1}>
            {isHosting ? "Pick a song to start the session" : `Waiting for ${hostName}`}
          </Text>
        </View>
      </View>

      <TouchableOpacity style={profileStyles.startMeetBtn} activeOpacity={0.85} onPress={onReturn}>
        <Ionicons name="headset" size={15} color="#fff" />
        <Text style={profileStyles.startMeetBtnText}>{isHosting ? "Return to your Meet" : "Return to Meet"}</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}
