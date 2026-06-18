import React, { useState } from "react";
import { ProfileOverlays } from "../../components/profile/ProfileOverlays";
import { ProfileHeaderCard } from "../../components/profile/ProfileHeaderCard";
import { ProfileNowPlayingCard } from "../../components/profile/ProfileNowPlayingCard";
import { ProfileMeetCard } from "../../components/profile/ProfileMeetCard";
import { useOwnProfile } from "../../hooks/useOwnProfile";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { styles } from "../../assets/styles/feed/styles";
import { profileStyles } from "../../assets/styles/feed/localStyles";
import { useOpenMeet, useOpenHostMeet, useNowPlayingCtx } from "../../lib/feed/contexts";
import { useSmoothProgressMs } from "../../hooks/useNowPlaying";
import { type ComposerUser } from "../../types/composer";
import { ProfileTabs } from "../../components/profile/ProfileTabs";
import { type Post } from "../../app/data/mock";

// Memoized: ProfileView takes no props, so it should never re-render from the
// parent's render cycle. Without memo, every FeedScreen re-render (e.g. the
// useNowPlaying poll every 3s, or any state change anywhere up there) walks
// through ProfileView's whole tree — ProfileTabs alone maps up to 50 posts.
export const ProfileView = React.memo(function ProfileView() {
  const { track, gradient, needsReconnect, reconnect } = useNowPlayingCtx();
  const liveProgressMs = useSmoothProgressMs();
  const router = useRouter();
  const { profile, setProfile, userId, accessToken, refreshing, activeMeet, meetChecked, onRefresh, refetch } = useOwnProfile();
  const [editOpen,            setEditOpen]            = useState(false);
  const [linksSheetOpen,      setLinksSheetOpen]      = useState(false);
  const [socialLinksSheetOpen, setSocialLinksSheetOpen] = useState(false);
  const [settingsOpen,        setSettingsOpen]        = useState(false);
  const [pinnedPreviewOpen,   setPinnedPreviewOpen]   = useState(false);
  const [meetOverlayVisible, setMeetOverlayVisible] = useState(false);
  const [fabMenuOpen, setFabMenuOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [postsKey, setPostsKey] = useState(0);
  const openHostMeet = useOpenHostMeet();
  const openMeet = useOpenMeet();

  // While in a live meet, jumping back into the room: the host re-opens their
  // host room, a listener re-opens the listener room. Null when not in a meet.
  const onReturnToMeet = activeMeet
    ? () => {
        if (activeMeet.isHost) openHostMeet?.(activeMeet.meet.id, activeMeet.meet.name);
        else openMeet?.(activeMeet.meet.id, activeMeet.isPublic);
      }
    : null;

  const composerUser: ComposerUser | null = userId
    ? {
        id: userId,
        username: profile?.username ?? "",
        display_name: profile?.display_name ?? null,
        avatar_url: profile?.avatar_url ?? null,
      }
    : null;

  const getInitials = (name?: string | null) => {
  if (!name) return "";
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const first = words[0].charAt(0).toUpperCase();
  if (words.length === 1) return first;
  const last = words[words.length - 1].charAt(0).toUpperCase();
  return `${first}${last}`;
};



  return (
    <View style={{ flex: 1 }}>
      {/* ─── Top bar ─────────────────────────────────────────────── */}
      <View style={profileStyles.topBar}>
        <Text style={profileStyles.topBarTitle}>Profile</Text>
        <View style={profileStyles.topBarRight}>
          <TouchableOpacity style={profileStyles.topBarIconBtn} activeOpacity={0.7}>
            <Text style={profileStyles.topBarIcon}>🔔</Text>
          </TouchableOpacity>
          <TouchableOpacity style={profileStyles.topBarIconBtn} activeOpacity={0.7} onPress={() => setSettingsOpen(true)}>
            <Ionicons name="settings-outline" size={20} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
          <TouchableOpacity style={profileStyles.proBadge} activeOpacity={0.85}>
            <Text style={profileStyles.proBadgeText}>PRO</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={profileStyles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#AB00FF" />}
      >
      <ProfileHeaderCard profile={profile} getInitials={getInitials} setEditOpen={setEditOpen} setSocialLinksSheetOpen={setSocialLinksSheetOpen} setLinksSheetOpen={setLinksSheetOpen} setPinnedPreviewOpen={setPinnedPreviewOpen} onReturnToMeet={meetChecked ? onReturnToMeet : null} />

      {/* ─── Spotify reconnect prompt ────────────────────────────── */}
      {needsReconnect && (
        <TouchableOpacity
          style={profileStyles.reconnectCard}
          activeOpacity={0.82}
          onPress={reconnect}
        >
          <FontAwesome5 name="spotify" size={16} color="#1DB954" />
          <View style={{ flex: 1 }}>
            <Text style={profileStyles.reconnectTitle}>Reconnect Spotify</Text>
            <Text style={profileStyles.reconnectSub}>Your session expired — tap to reconnect</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.3)" />
        </TouchableOpacity>
      )}

      {/* ─── Now Playing card — only once we've confirmed meet status so it
              never flashes the wrong variant. While a track plays we show the
              full card (with its meet-aware variants); when nothing's playing
              but you're in a live meet, we still show the compact "meet version"
              so there's always a way back into the room. ── */}
      {!needsReconnect && meetChecked && (
        track?.isPlaying ? (
          <ProfileNowPlayingCard
            track={track}
            liveProgressMs={liveProgressMs}
            gradient={gradient}
            activeMeet={activeMeet}
            userId={userId}
            accessToken={accessToken}
            openHostMeet={openHostMeet}
            openMeet={openMeet}
            onStartMeet={() => setMeetOverlayVisible(true)}
          />
        ) : activeMeet && onReturnToMeet ? (
          <ProfileMeetCard activeMeet={activeMeet} onReturn={onReturnToMeet} />
        ) : null
      )}

      {/* ─── Section tabs ────────────────────────────────────────── */}
      <ProfileTabs key={postsKey} userId={userId} />
    </ScrollView>
      <ProfileOverlays linksSheetOpen={linksSheetOpen} setLinksSheetOpen={setLinksSheetOpen} socialLinksSheetOpen={socialLinksSheetOpen} setSocialLinksSheetOpen={setSocialLinksSheetOpen} editOpen={editOpen} setEditOpen={setEditOpen} settingsOpen={settingsOpen} setSettingsOpen={setSettingsOpen} pinnedPreviewOpen={pinnedPreviewOpen} setPinnedPreviewOpen={setPinnedPreviewOpen} meetOverlayVisible={meetOverlayVisible} setMeetOverlayVisible={setMeetOverlayVisible} fabMenuOpen={fabMenuOpen} setFabMenuOpen={setFabMenuOpen} composerOpen={composerOpen} setComposerOpen={setComposerOpen} profile={profile} setProfile={setProfile} accessToken={accessToken} userId={userId} refetch={refetch} openHostMeet={openHostMeet} composerUser={composerUser} setPostsKey={setPostsKey} />
    </View>
  );
});


// ─── Start Meet Overlay styles ───────────────────────────────────────────────


// ─── Meet Live Screen styles ──────────────────────────────────────────────────


// ─── Post Composer styles ─────────────────────────────────────────────────────






// ─── Post Composer Sheet ──────────────────────────────────────────────────────
