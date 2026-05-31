import React from "react";
import { ProfilePlaylistsTab } from "../../components/profile/ProfilePlaylistsTab";
import { useProfileTabsData } from "../../hooks/useProfileTabsData";
import { View, Text, StyleSheet, TouchableOpacity, Animated, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { profileStyles } from "../../lib/feed/localStyles";
import { PostCard } from "../../components/post/PostCard";
import { CreatePlaylistDialog } from "../../components/playlists/CreatePlaylistDialog";
import { CuratedPlaylistDetailOverlay } from "../../components/playlists/CuratedPlaylistDetailOverlay";
import { SpotifyPlaylistDetailOverlay } from "../../components/playlists/SpotifyPlaylistDetailOverlay";
import { CommunityCard } from "../../components/profile/CommunityCard";
import { PROFILE_TABS, PROFILE_REPOSTS, DUMMY_COMMUNITIES } from "../../app/data/mock";

export function ProfileTabs({ userId, readOnly = false }: { userId: string | null; readOnly?: boolean }) {
  const {
    active, setActive, myPosts, setMyPosts, postsLoading, setPostsLoading, indicatorAnim, contentAnim, activeRef, tabWidth, playlistFilter, setPlaylistFilter, curatedPlaylists, setCuratedPlaylists, curatedLoading, setCuratedLoading, curatedLoaded, setCuratedLoaded, spotifyPlaylists, setSpotifyPlaylists, spLoading, setSpLoading, spLoaded, setSpLoaded, showCreatePlaylist, setShowCreatePlaylist, openCurated, setOpenCurated, openSpotify, setOpenSpotify, switchTo, swipePan
  } = useProfileTabsData(userId, readOnly);

  const renderContent = () => {
    if (active === "Posts") {
      if (postsLoading) return <ActivityIndicator color="#FF6C1A" style={{ marginTop: 48 }} />;
      if (myPosts.length === 0) {
        return (
          <View style={{ alignItems: "center", paddingTop: 52 }}>
            <Text style={{ color: "rgba(255,255,255,0.25)", fontSize: 15 }}>No posts yet</Text>
          </View>
        );
      }
      return (
        <View style={{ gap: 12, paddingTop: 12 }}>
          {myPosts.map((post) => <PostCard key={post.id} item={post} />)}
        </View>
      );
    }

    if (active === "Reposts") {
      return (
        <View style={{ gap: 12, paddingTop: 12 }}>
          {PROFILE_REPOSTS.map((post) => (
            <View key={post.id}>
              <View style={profileStyles.repostLabel}>
                <Text style={profileStyles.repostLabelText}>↺  Reposted</Text>
              </View>
              <PostCard item={post} />
            </View>
          ))}
        </View>
      );
    }

    if (active === "Playlists") return <ProfilePlaylistsTab readOnly={readOnly} playlistFilter={playlistFilter} setPlaylistFilter={setPlaylistFilter} curatedLoading={curatedLoading} curatedPlaylists={curatedPlaylists} setShowCreatePlaylist={setShowCreatePlaylist} setOpenCurated={setOpenCurated} spLoading={spLoading} spLoaded={spLoaded} spotifyPlaylists={spotifyPlaylists} setOpenSpotify={setOpenSpotify} />;

    return (
      <View style={{ gap: 10, paddingTop: 12 }}>
        {DUMMY_COMMUNITIES.map((co) => <CommunityCard key={co.id} co={co} />)}
      </View>
    );
  };

  return (
    <View style={profileStyles.tabsWrap} {...swipePan.panHandlers}>      <View style={profileStyles.tabRow}>
        <Animated.View
          style={[profileStyles.tabIndicator, { width: tabWidth, transform: [{ translateX: indicatorAnim }] }]}
        >
          <LinearGradient
            colors={["#FF6C1A", "#CC4200"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        {PROFILE_TABS.map((tab, i) => (
          <TouchableOpacity
            key={tab}
            style={[profileStyles.tabBtn, { width: tabWidth }]}
            onPress={() => switchTo(tab, i)}
            activeOpacity={0.7}
          >
            <Text style={[profileStyles.tabLabel, active === tab && profileStyles.tabLabelActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>      <Animated.View style={{ opacity: contentAnim }}>
        {renderContent()}
      </Animated.View>      {showCreatePlaylist && userId && (
        <CreatePlaylistDialog
          userId={userId}
          onClose={() => setShowCreatePlaylist(false)}
          onCreate={(pl) => {
            setCuratedPlaylists(prev => [pl, ...prev]);
            setShowCreatePlaylist(false);
          }}
        />
      )}

      {openCurated && userId && (
        <CuratedPlaylistDetailOverlay
          playlist={openCurated}
          userId={userId}
          onClose={() => setOpenCurated(null)}
          onUpdated={(updated) => {
            setCuratedPlaylists(prev => prev.map(p => p.id === updated.id ? updated : p));
            setOpenCurated(updated);
          }}
        />
      )}

      {openSpotify && userId && (
        <SpotifyPlaylistDetailOverlay
          playlist={openSpotify}
          userId={userId}
          onClose={() => setOpenSpotify(null)}
        />
      )}
    </View>
  );
}

// ─── Profile view ─────────────────────────────────────────────────────────────

// Cached once per login session — cleared on pull-to-refresh

// 4 swatches per row, 10px gap between them, 20px padding on each side
