import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Linking } from "react-native";
import { CachedImage } from "../ui/CachedImage";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { s } from "../../app/userProfile.styles";
import { BannerShape } from "./BannerShape";
import { OtherNowListening } from "./OtherNowListening";
import { OtherProfileSocialRow } from "./OtherProfileSocialRow";
import { ProfileTabs } from "./ProfileTabs";
import { SOCIAL_PLATFORMS, BANNER_PLATFORM_PRIORITY } from "../../lib/feed/social";
import { FeedUserCtx } from "../../lib/feed/contexts";

export function OtherProfileBody({ profile, isFollowing, followLoading, followersCount, currentUserId, viewerToken, setPinnedPreviewOpen, setSocialLinksSheetOpen, publicMeet, likedPostIds, onToggleLike, handleJoinMeet, handleFollow, handleDM, getInitials, isOwnProfile, visibleSocial, socialOverflow, AVATAR_OVERLAP, userId }: {
  profile: any;
  isFollowing: any;
  followLoading: any;
  followersCount: any;
  currentUserId: any;
  viewerToken: any;
  setPinnedPreviewOpen: any;
  setSocialLinksSheetOpen: any;
  publicMeet: any;
  likedPostIds: any;
  onToggleLike: any;
  handleJoinMeet: any;
  handleFollow: any;
  handleDM: any;
  getInitials: any;
  isOwnProfile: any;
  visibleSocial: any;
  socialOverflow: any;
  AVATAR_OVERLAP: any;
  userId: any;
}) {
  const linkedPlatforms = BANNER_PLATFORM_PRIORITY.map((k: string) => SOCIAL_PLATFORMS.find((pp) => pp.key === k)!).filter((pp) => !!(profile.social_links?.[pp.key]));
  return (
    <>
          <View style={s.card}>            <View style={s.bannerWrap}>
              {profile.banner_image_url ? (
                <CachedImage source={{ uri: profile.banner_image_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              ) : profile.banner_color ? (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: profile.banner_color }]} />
              ) : (
                <LinearGradient
                  colors={["#3D0C00", "#CC4200", "#FF6C1A", "#CC4200", "#3D0C00"]}
                  locations={[0, 0.25, 0.5, 0.75, 1]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={StyleSheet.absoluteFill}
                />
              )}

              {profile.banner_shape && !profile.banner_image_url && (
                <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]} pointerEvents="none">
                  <BannerShape shape={profile.banner_shape} color={profile.banner_shape_color ?? "#ffffff"} size={72} />
                </View>
              )}

              <LinearGradient
                colors={["transparent", "rgba(22,22,24,0.55)"]}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />              <OtherProfileSocialRow visibleSocial={visibleSocial} socialOverflow={socialOverflow} linkedPlatforms={linkedPlatforms} profile={profile} setSocialLinksSheetOpen={setSocialLinksSheetOpen} />
            </View>            <View style={[s.avatarRow, { marginTop: -AVATAR_OVERLAP }]}>
              {publicMeet && !isOwnProfile ? (
                <View style={s.avatarLiveWrap}>
                  <LinearGradient
                    colors={["#FF3B5C", "#AB00FF"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={s.avatarLiveRing}
                  >
                    {profile.avatar_url ? (
                      <CachedImage source={{ uri: profile.avatar_url }} style={s.avatarRingImg} />
                    ) : (
                      <View style={[s.avatarRingImg, s.avatarRingFallback]}>
                        <Text style={s.avatarInitials}>{getInitials(profile.display_name)}</Text>
                      </View>
                    )}
                  </LinearGradient>
                  <View style={s.liveBadge}>
                    <Text style={s.liveBadgeText}>LIVE</Text>
                  </View>
                </View>
              ) : profile.avatar_url ? (
                <CachedImage source={{ uri: profile.avatar_url }} style={s.avatarImg} />
              ) : (
                <View style={s.avatar}>
                  <Text style={s.avatarInitials}>{getInitials(profile.display_name)}</Text>
                </View>
              )}              {!isOwnProfile && (
                <View style={s.avatarActions}>
                  <TouchableOpacity style={s.dmBtn} activeOpacity={0.85} onPress={handleDM}>
                    <Ionicons name="chatbubble-outline" size={13} color="#fff" />
                    <Text style={s.dmBtnText}>Message</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.followBtn, isFollowing && s.followingBtn]}
                    activeOpacity={0.85}
                    onPress={handleFollow}
                    disabled={followLoading}
                  >
                    <Text style={[s.followBtnText, isFollowing && s.followingBtnText]}>
                      {followLoading ? "…" : isFollowing ? "Following" : "Follow"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>            <View style={s.infoSection}>
              <View style={s.nameRow}>
                <Text style={s.name}>{profile.display_name || profile.username}</Text>
                {profile.is_verified && (
                  <View style={s.verifiedBadge}>
                    <Text style={s.verifiedText}>✓</Text>
                  </View>
                )}
                {profile.account_type === "artist" && (
                  <View style={s.artistBadge}>
                    <Text style={s.artistBadgeText}>Artist</Text>
                  </View>
                )}
              </View>

              <Text style={s.handle}>@{profile.username}</Text>

              {!!profile.bio && <Text style={s.bio}>{profile.bio}</Text>}

              <View style={s.statsRow}>
                <TouchableOpacity style={s.statBtn}>
                  <Text style={s.statNum}>{profile.following_count?.toLocaleString() ?? "0"}</Text>
                  <Text style={s.statLabel}> Following</Text>
                </TouchableOpacity>
                <View style={{ width: 22 }} />
                <TouchableOpacity style={s.statBtn}>
                  <Text style={s.statNum}>{followersCount.toLocaleString()}</Text>
                  <Text style={s.statLabel}> Followers</Text>
                </TouchableOpacity>
              </View>              {(!!profile.pinned_song_name || !!profile.profile_links?.length) && (
                <View style={s.metaRow}>
                  {!!profile.pinned_song_name && (
                    <TouchableOpacity
                      style={s.metaItem}
                      activeOpacity={0.7}
                      onPress={() => profile.pinned_song_id && setPinnedPreviewOpen(true)}
                    >
                      <FontAwesome5 name="music" size={11} color="#FF6C1A" />
                      <Text style={[s.metaText, { color: "rgba(255,255,255,0.7)" }]} numberOfLines={1}>
                        {profile.pinned_song_artist
                          ? `${profile.pinned_song_name} — ${profile.pinned_song_artist}`
                          : profile.pinned_song_name}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {!!profile.profile_links?.length && (
                    <TouchableOpacity
                      style={s.metaItem}
                      activeOpacity={0.7}
                      onPress={() => {
                        const url = profile.profile_links?.[0];
                        if (url) Linking.openURL(url).catch(() => {});
                      }}
                    >
                      <FontAwesome5 name="link" size={11} color="#FF6C1A" />
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, flex: 1 }}>
                        <Text style={[s.metaText, { color: "rgba(255,255,255,0.7)" }]} numberOfLines={1}>
                          {profile.profile_links[0].replace(/^https?:\/\//, "").slice(0, 13)}
                        </Text>
                        {profile.profile_links.length > 1 && (
                          <View style={s.linkBadge}>
                            <Text style={s.linkBadgeText}>+{profile.profile_links.length}</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </View>          <OtherNowListening publicMeet={publicMeet} isOwnProfile={isOwnProfile} profile={profile} viewerToken={viewerToken} currentUserId={currentUserId} handleJoinMeet={handleJoinMeet} />          {userId && (
            <FeedUserCtx.Provider value={{ currentUserId, likedPostIds, onToggleLike }}>
              <ProfileTabs userId={userId} readOnly />
            </FeedUserCtx.Provider>
          )}

    </>
  );
}
