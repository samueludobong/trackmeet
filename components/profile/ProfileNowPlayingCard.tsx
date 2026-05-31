import React from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { openSpotifyLink } from "../../lib/spotify";
import { profileStyles } from "../../lib/feed/localStyles";
import { type NowPlayingTrack } from "../../hooks/useNowPlaying";
import { type Gradient } from "../../hooks/albumColors";
import { type ActiveMeetForUser } from "../../services/meets";
import { BroadcastRow } from "../../components/feed/BroadcastRow";

const fmt = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/** The signed-in user's now-playing card on their profile, with meet-aware variants. */
export function ProfileNowPlayingCard({
  track, liveProgressMs, gradient, activeMeet, userId, openHostMeet, openMeet, onStartMeet,
}: {
  track: NowPlayingTrack;
  liveProgressMs: number;
  gradient: Gradient;
  activeMeet: ActiveMeetForUser | null;
  userId: string | null;
  openHostMeet?: ((id: string, name: string) => void) | null;
  openMeet?: ((id: string, isPublic?: boolean) => void) | null;
  onStartMeet: () => void;
}) {
  const progress = track.durationMs > 0 ? liveProgressMs / track.durationMs : 0;
  const isHosting = !!activeMeet && activeMeet.meet.host_id === userId;
  const meetHost = activeMeet && !isHosting ? (activeMeet.host.display_name || activeMeet.host.username) : null;
  const inMeet = isHosting || !!meetHost;

  return (
    <LinearGradient
      colors={inMeet ? ["#2A0C3D", "#1A0820", "#0E070F"] : gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[profileStyles.nowPlayingCard, inMeet && profileStyles.nowPlayingCardMeet]}
    >
      {inMeet && (
        <View style={profileStyles.npMeetBadge}>
          <FontAwesome5 name="broadcast-tower" size={11} color="#D9A8FF" />
          {isHosting ? (
            <Text style={profileStyles.npMeetBadgeText} numberOfLines={1}>
              Hosting <Text style={profileStyles.npMeetBadgeHost}>your Meet</Text>
            </Text>
          ) : (
            <Text style={profileStyles.npMeetBadgeText} numberOfLines={1}>
              Listening in <Text style={profileStyles.npMeetBadgeHost}>{meetHost}</Text>&apos;s Meet
            </Text>
          )}
        </View>
      )}
      <View style={profileStyles.npTopRow}>
        {track.albumArt ? (
          <Image source={{ uri: track.albumArt }} style={profileStyles.npArt} />
        ) : (
          <View style={[profileStyles.npArt, profileStyles.npArtFallback]}>
            <Text style={profileStyles.npArtEmoji}>🎵</Text>
          </View>
        )}
        <View style={profileStyles.npInfo}>
          <Text style={profileStyles.npTitle} numberOfLines={1}>{track.name}</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => openSpotifyLink(`spotify:artist:${track.artistId}`, `https://open.spotify.com/artist/${track.artistId}`)}
          >
            <Text style={[profileStyles.npArtist]} numberOfLines={1}>{track.artist}</Text>
          </TouchableOpacity>
          <View style={profileStyles.npProgressTrack}>
            <View style={[profileStyles.npProgressFill, { width: `${progress * 100}%` as any }]}>
              <View style={profileStyles.npProgressThumb} />
            </View>
          </View>
          <View style={profileStyles.npTimestamps}>
            <Text style={profileStyles.npTime}>{fmt(liveProgressMs)}</Text>
            <Text style={profileStyles.npTime}>{fmt(track.durationMs)}</Text>
          </View>
        </View>
      </View>

      {!inMeet && <BroadcastRow />}

      {isHosting ? (
        <TouchableOpacity style={profileStyles.startMeetBtn} activeOpacity={0.85} onPress={() => activeMeet && openHostMeet?.(activeMeet.meet.id, activeMeet.meet.name)}>
          <Ionicons name="headset" size={15} color="#fff" />
          <Text style={profileStyles.startMeetBtnText}>Return to your Meet</Text>
        </TouchableOpacity>
      ) : meetHost ? (
        <TouchableOpacity style={profileStyles.startMeetBtn} activeOpacity={0.85} onPress={() => activeMeet && openMeet?.(activeMeet.meet.id, activeMeet.isPublic)}>
          <Ionicons name="headset" size={15} color="#fff" />
          <Text style={profileStyles.startMeetBtnText}>Return to Meet</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={profileStyles.startMeetBtn} activeOpacity={0.85} onPress={onStartMeet}>
          <FontAwesome5 name="broadcast-tower" size={14} color="#fff" />
          <Text style={profileStyles.startMeetBtnText}>Start Meet</Text>
        </TouchableOpacity>
      )}
    </LinearGradient>
  );
}
