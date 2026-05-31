import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, Linking } from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { profileStyles } from "../../lib/feed/localStyles";
import { PROFILE_AVATAR_OVERLAP } from "../../constants/feedLayout";
import { SOCIAL_PLATFORMS, BANNER_PLATFORM_PRIORITY } from "../../lib/feed/social";
import { BannerShape } from "../../components/profile/BannerShape";
import { type UserProfile } from "../../app/data/mock";

/** The banner + avatar + bio + stats + meta card at the top of the user's own profile. */
export function ProfileHeaderCard({ profile, getInitials, setEditOpen, setSocialLinksSheetOpen, setLinksSheetOpen, setPinnedPreviewOpen }: {
  profile: UserProfile | null;
  getInitials: (name?: string | null) => string;
  setEditOpen: (v: boolean) => void;
  setSocialLinksSheetOpen: (v: boolean) => void;
  setLinksSheetOpen: (v: boolean) => void;
  setPinnedPreviewOpen: (v: boolean) => void;
}) {
  return (
      <View style={profileStyles.card}>
        {/* Banner */}
        <View style={profileStyles.bannerWrap}>
          {profile?.banner_image_url ? (
            <Image source={{ uri: profile.banner_image_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : profile?.banner_color ? (
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
          {profile?.banner_shape && !profile.banner_image_url ? (
            <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]} pointerEvents="none">
              <BannerShape shape={profile.banner_shape} color={profile.banner_shape_color ?? "#ffffff"} size={72} />
            </View>
          ) : null}
          <LinearGradient
            colors={["transparent", "rgba(22,22,24,0.55)"]}
            style={StyleSheet.absoluteFill}
          />
          {/* <View style={profileStyles.bannerGlow} /> */}

          <View style={profileStyles.bannerActions}>
            {/* Social icons — only linked platforms, up to 3 (2 + overflow badge) */}
            {(() => {
              const linked = BANNER_PLATFORM_PRIORITY
                .map((k) => SOCIAL_PLATFORMS.find((p) => p.key === k)!)
                .filter((p) => !!(profile?.social_links?.[p.key]));
              const visible  = linked.slice(0, linked.length > 3 ? 2 : 3);
              const overflow = linked.length - visible.length;
              return (
                <>
                  {visible.map((p) => (
                    <TouchableOpacity
                      key={p.key}
                      style={profileStyles.socialBtn}
                      activeOpacity={0.7}
                      onPress={() => {
                        // More than one social link → show the full list in a popup;
                        // a single link opens directly.
                        if (linked.length > 1) setSocialLinksSheetOpen(true);
                        else Linking.openURL(profile!.social_links![p.key]).catch(() => {});
                      }}
                    >
                      <FontAwesome5 name={p.icon} size={15} color={p.color} />
                    </TouchableOpacity>
                  ))}
                  {overflow > 0 && (
                    <TouchableOpacity
                      style={[profileStyles.socialBtn, { backgroundColor: "rgba(255,255,255,0.18)" }]}
                      activeOpacity={0.7}
                      onPress={() => setSocialLinksSheetOpen(true)}
                    >
                      <Text style={{ fontSize: 11, fontWeight: "800", color: "#fff" }}>+{overflow}</Text>
                    </TouchableOpacity>
                  )}
                </>
              );
            })()}
            <TouchableOpacity style={profileStyles.editProfileBtn} activeOpacity={0.85} onPress={() => setEditOpen(true)}>
              <Text style={profileStyles.editProfileBtnText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Avatar row — negative margin overlaps banner bottom */}
        <View style={[profileStyles.avatarRow, { marginTop: -PROFILE_AVATAR_OVERLAP }]}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={profileStyles.avatar} />
          ) : (
            <View style={profileStyles.avatar}>
              <Text style={profileStyles.avatarInitials}>{getInitials(profile?.display_name)}</Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={profileStyles.infoSection}>
          <View style={profileStyles.nameRow}>
            <Text style={profileStyles.name}>{profile?.display_name}</Text>
            {profile?.is_verified && (
              <View style={profileStyles.verifiedBadge}>
                <Text style={profileStyles.verifiedText}>✓</Text>
              </View>
            )}
          </View>
          <Text style={profileStyles.handle}>@{profile?.username}</Text>

          <Text style={profileStyles.bio}>
            {profile?.bio || "No bio available"}
          </Text>

          <View style={profileStyles.statsRow}>
            <Text style={profileStyles.statNum}>{profile?.following_count?.toLocaleString() || "0"}</Text>
            <Text style={profileStyles.statLabel}> Following</Text>
            <View style={{ width: 22 }} />
            <Text style={profileStyles.statNum}>{profile?.followers_count?.toLocaleString() || "0"}</Text>
            <Text style={profileStyles.statLabel}> Followers</Text>
          </View>

          <View style={profileStyles.metaRow}>
            <TouchableOpacity
              style={profileStyles.metaItem}
              activeOpacity={0.7}
              onPress={() => {
                if (profile?.pinned_song_id) setPinnedPreviewOpen(true);
                else setEditOpen(true);
              }}
            >
              <FontAwesome5 name="music" size={11} color={profile?.pinned_song_id ? "#FF6C1A" : "rgba(255,255,255,0.28)"} />
              <Text
                style={[profileStyles.metaText, profile?.pinned_song_id && { color: "rgba(255,255,255,0.7)" }]}
                numberOfLines={1}
              >
                {profile?.pinned_song_name
                  ? `${profile.pinned_song_name} — ${profile.pinned_song_artist}`
                  : "Pin a song"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={profileStyles.metaItem}
              activeOpacity={0.7}
              onPress={() => {
                const links = profile?.profile_links;
                if (links?.length) {
                  if (links.length === 1) {
                    Linking.openURL(links[0]).catch(() => {});
                  } else {
                    setLinksSheetOpen(true);
                  }
                } else {
                  setEditOpen(true);
                }
              }}
            >
              <FontAwesome5 name="link" size={11} color={profile?.profile_links?.length ? "#FF6C1A" : "rgba(255,255,255,0.28)"} />
              {profile?.profile_links?.length ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, flex: 1 }}>
                  <Text
                    style={[profileStyles.metaText, { color: "rgba(255,255,255,0.7)" }]}
                    numberOfLines={1}
                  >
                    {profile.profile_links[0].replace(/^https?:\/\//, "").slice(0, 13)}
                  </Text>
                  {profile.profile_links.length > 1 && (
                    <View style={profileStyles.linkBadge}>
                      <Text style={profileStyles.linkBadgeText}>+{profile.profile_links.length}</Text>
                    </View>
                  )}
                </View>
              ) : (
                <Text style={profileStyles.metaText}>Add link</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
  );
}
