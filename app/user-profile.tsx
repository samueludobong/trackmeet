import { OtherProfileBody } from "../components/profile/OtherProfileBody";
import { BannerShape } from "../components/profile/BannerShape";
import { SOCIAL_PLATFORMS, BANNER_PLATFORM_PRIORITY } from "../lib/feed/social";
import { s } from "./userProfile.styles";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SongPreviewSheet } from "../components/SongPreviewSheet";
import { SocialLinksSheet } from "../components/profile/SocialLinksSheet";

// ─── Social platforms (matches feed.tsx) ──────────────────────────────────────

// ─── BannerShape ──────────────────────────────────────────────────────────────

// ─── Profile type ─────────────────────────────────────────────────────────────

// ─── Now Listening card ───────────────────────────────────────────────────────
import { useUserProfile } from "../hooks/useUserProfile";

const BANNER_H = 172;
const AVATAR_SIZE = 86;
const AVATAR_OVERLAP = Math.round(AVATAR_SIZE * 0.44);

export default function UserProfileScreen() {
  const {
    userId,
    router, profile, setProfile, loading, setLoading, isFollowing, setIsFollowing, followLoading, setFollowLoading, followersCount, setFollowersCount, currentUserId, setCurrentUserId, viewerToken, setViewerToken, pinnedPreviewOpen, setPinnedPreviewOpen, socialLinksSheetOpen, setSocialLinksSheetOpen, publicMeet, setPublicMeet, likedPostIds, setLikedPostIds, onToggleLike, handleJoinMeet, loadProfile, handleFollow, handleDM, getInitials, isOwnProfile
  } = useUserProfile();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0D0D0D", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#AB00FF" size="large" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0D0D0D", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 16 }}>User not found</Text>
      </View>
    );
  }

  // Social links visible in banner (priority order, up to 3 or 2+overflow)
  const linkedPlatforms = BANNER_PLATFORM_PRIORITY
    .map(k => SOCIAL_PLATFORMS.find(p => p.key === k)!)
    .filter(p => !!(profile.social_links?.[p.key]));
  const visibleSocial  = linkedPlatforms.slice(0, linkedPlatforms.length > 3 ? 2 : 3);
  const socialOverflow = linkedPlatforms.length - visibleSocial.length;

  return (
    <View style={s.screen}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>

        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={s.backIcon}>‹</Text>
        </TouchableOpacity>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
          <OtherProfileBody profile={profile} isFollowing={isFollowing} followLoading={followLoading} followersCount={followersCount} currentUserId={currentUserId} viewerToken={viewerToken} setPinnedPreviewOpen={setPinnedPreviewOpen} setSocialLinksSheetOpen={setSocialLinksSheetOpen} publicMeet={publicMeet} likedPostIds={likedPostIds} onToggleLike={onToggleLike} handleJoinMeet={handleJoinMeet} handleFollow={handleFollow} handleDM={handleDM} getInitials={getInitials} isOwnProfile={isOwnProfile} visibleSocial={visibleSocial} socialOverflow={socialOverflow} AVATAR_OVERLAP={AVATAR_OVERLAP} userId={userId} />
        </ScrollView>
      </SafeAreaView>      <SongPreviewSheet
        visible={pinnedPreviewOpen}
        onClose={() => setPinnedPreviewOpen(false)}
        song={
          profile.pinned_song_id
            ? {
                id:       profile.pinned_song_id,
                name:     profile.pinned_song_name ?? "",
                artist:   profile.pinned_song_artist ?? "",
                albumArt: profile.pinned_song_album_art ?? null,
              }
            : null
        }
        accessToken={viewerToken}
        userId={currentUserId}
      />      {socialLinksSheetOpen && (
        <SocialLinksSheet
          socialLinks={profile.social_links ?? {}}
          onClose={() => setSocialLinksSheetOpen(false)}
        />
      )}

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
