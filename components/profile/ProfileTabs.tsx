import React, { useState, useEffect } from "react";
import { ProfilePlaylistsTab } from "../../components/profile/ProfilePlaylistsTab";
import { useProfileTabsData } from "../../hooks/useProfileTabsData";
import { View, Text, StyleSheet, TouchableOpacity, Animated, ActivityIndicator } from "react-native";
import { CachedImage } from "../ui/CachedImage";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { profileStyles } from "../../assets/styles/feed/localStyles";
import { PostCard } from "../../components/post/PostCard";
import { CreatePlaylistDialog } from "../../components/playlists/CreatePlaylistDialog";
import { CuratedPlaylistDetailOverlay } from "../../components/playlists/CuratedPlaylistDetailOverlay";
import { SpotifyPlaylistDetailOverlay } from "../../components/playlists/SpotifyPlaylistDetailOverlay";
import { CreateCommunityDialog } from "../../components/communities/CreateCommunityDialog";
import { CommunityDetailOverlay } from "../../components/communities/CommunityDetailOverlay";
import { getMyCommunities, type Community } from "../../services/communities";
import { PROFILE_TABS } from "../../app/data/mock";
import { type Post } from "../../app/data/mock";
import { getUserReposts } from "../../services/posts";
import { cStyles } from "../../assets/styles/profile/ProfileTabs";

export function ProfileTabs({ userId, readOnly = false }: { userId: string | null; readOnly?: boolean }) {
  const {
    active, setActive, myPosts, setMyPosts, postsLoading, setPostsLoading, indicatorAnim, contentAnim, activeRef, tabWidth, playlistFilter, setPlaylistFilter, curatedPlaylists, setCuratedPlaylists, curatedLoading, setCuratedLoading, curatedLoaded, setCuratedLoaded, spotifyPlaylists, setSpotifyPlaylists, spLoading, setSpLoading, spLoaded, setSpLoaded, showCreatePlaylist, setShowCreatePlaylist, openCurated, setOpenCurated, openSpotify, setOpenSpotify, switchTo, swipePan
  } = useProfileTabsData(userId, readOnly);

  // Communities tab — real data + create flow (own profile only).
  const [communities, setCommunities] = useState<Community[]>([]);
  const [communitiesLoading, setCommunitiesLoading] = useState(false);
  const [communitiesLoaded, setCommunitiesLoaded] = useState(false);
  const [showCreateCommunity, setShowCreateCommunity] = useState(false);
  const [openCommunity, setOpenCommunity] = useState<Community | null>(null);

  // Reposts tab — fetched from public.post_reposts joined to posts on demand.
  const [reposts, setReposts] = useState<Post[]>([]);
  const [repostsLoading, setRepostsLoading] = useState(false);
  const [repostsLoaded, setRepostsLoaded] = useState(false);

  useEffect(() => {
    if (active !== "Reposts" || repostsLoaded || !userId) return;
    setRepostsLoading(true);
    getUserReposts(userId)
      .then(setReposts)
      .catch((e) => console.error("getUserReposts:", e))
      .finally(() => { setRepostsLoading(false); setRepostsLoaded(true); });
  }, [active, userId]);

  useEffect(() => {
    if (active !== "Communities" || communitiesLoaded || !userId) return;
    setCommunitiesLoading(true);
    getMyCommunities(userId)
      .then(setCommunities)
      .finally(() => { setCommunitiesLoading(false); setCommunitiesLoaded(true); });
  }, [active, userId]);

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
        <View style={{ gap: 7, paddingTop: 12, padding: 0 }}>
          {myPosts.map((post) => <PostCard key={post.id} item={post} />)}
        </View>
      );
    }

    if (active === "Reposts") {
      if (repostsLoading) return <ActivityIndicator color="#FF6C1A" style={{ marginTop: 48 }} />;
      if (reposts.length === 0) {
        return (
          <View style={{ alignItems: "center", paddingTop: 52 }}>
            <Text style={{ color: "rgba(255,255,255,0.25)", fontSize: 15 }}>
              {readOnly ? "No reposts yet" : "You haven't reposted anything yet"}
            </Text>
          </View>
        );
      }
      return (
        <View style={{ gap: 12, paddingTop: 12 }}>
          {reposts.map((post) => (
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

    // Communities
    return (
      <View style={{ gap: 10, paddingTop: 12 }}>
        {!readOnly && (
          <TouchableOpacity style={cStyles.createBtn} activeOpacity={0.85} onPress={() => setShowCreateCommunity(true)}>
            <Ionicons name="add-circle" size={20} color="#AB00FF" />
            <Text style={cStyles.createBtnText}>Create Community</Text>
          </TouchableOpacity>
        )}
        {communitiesLoading ? (
          <ActivityIndicator color="#FF6C1A" style={{ marginTop: 32 }} />
        ) : communities.length === 0 ? (
          <View style={{ alignItems: "center", paddingTop: 36 }}>
            <Text style={{ color: "rgba(255,255,255,0.25)", fontSize: 15 }}>
              {readOnly ? "No communities yet" : "No communities yet — create one!"}
            </Text>
          </View>
        ) : (
          communities.map((co) => (
            <TouchableOpacity key={co.id} style={profileStyles.communityCard} activeOpacity={0.82} onPress={() => setOpenCommunity(co)}>
              {co.avatar_url ? (
                <CachedImage source={{ uri: co.avatar_url }} style={cStyles.avatar} />
              ) : (
                <View style={[cStyles.avatar, cStyles.avatarFallback]}>
                  <Ionicons name="people" size={20} color="rgba(255,255,255,0.5)" />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <View style={cStyles.nameRow}>
                  <Text style={profileStyles.communityName} numberOfLines={1}>{co.name}</Text>
                  {co.is_private && <Ionicons name="lock-closed" size={12} color="rgba(255,255,255,0.4)" />}
                </View>
                <Text style={profileStyles.communityDesc} numberOfLines={1}>
                  {co.description || "No description"}
                </Text>
              </View>
              <Text style={[profileStyles.communityMembers, { color: "#AB00FF" }]}>
                {co.member_count} {co.member_count === 1 ? "member" : "members"}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </View>
    );
  };

  return (
    <View style={profileStyles.tabsWrap} {...swipePan.panHandlers}>
      <View style={profileStyles.tabRow}>
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
      </View>
      <Animated.View style={{ opacity: contentAnim }}>
        {renderContent()}
      </Animated.View>
      {showCreatePlaylist && userId && (
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
          onDeleted={() => {
            setCuratedPlaylists(prev => prev.filter(p => p.id !== openCurated.id));
            setOpenCurated(null);
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

      {showCreateCommunity && userId && (
        <CreateCommunityDialog
          userId={userId}
          onClose={() => setShowCreateCommunity(false)}
          onCreated={(co) => {
            setCommunities((prev) => [co, ...prev]);
            setShowCreateCommunity(false);
          }}
        />
      )}

      {openCommunity && (
        <CommunityDetailOverlay
          community={openCommunity}
          userId={userId}
          onClose={() => setOpenCommunity(null)}
        />
      )}
    </View>
  );
}

// ─── Profile view ─────────────────────────────────────────────────────────────

// Cached once per login session — cleared on pull-to-refresh

// 4 swatches per row, 10px gap between them, 20px padding on each side
