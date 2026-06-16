import React from "react";
import { View, Text, TouchableOpacity, Modal, Pressable } from "react-native";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { profileStyles } from "../../assets/styles/feed/localStyles";
import { feedCache } from "../../lib/feed/caches";
import { type UserProfile } from "../../app/data/mock";
import { type ComposerUser } from "../../types/composer";
import { SongPreviewSheet } from "../../components/SongPreviewSheet";
import { PostComposerSheet } from "../../components/feed/PostComposerSheet";
import { StartMeetOverlay } from "../../components/meets/StartMeetOverlay";
import { EditProfileOverlay } from "../../components/profile/EditProfileOverlay";
import { SettingsOverlay } from "../../components/profile/SettingsOverlay";
import { SocialLinksSheet } from "../../components/profile/SocialLinksSheet";
import { LinksSheet } from "../../components/profile/LinksSheet";

/** All modals/overlays + the compose FAB rendered above the user's own profile. */
export function ProfileOverlays({
  linksSheetOpen, setLinksSheetOpen, socialLinksSheetOpen, setSocialLinksSheetOpen, editOpen, setEditOpen, settingsOpen, setSettingsOpen, pinnedPreviewOpen, setPinnedPreviewOpen, meetOverlayVisible, setMeetOverlayVisible, fabMenuOpen, setFabMenuOpen, composerOpen, setComposerOpen, profile, setProfile, accessToken, userId, refetch, openHostMeet, composerUser, setPostsKey
}: {
  linksSheetOpen: boolean; setLinksSheetOpen: (v: boolean) => void;
  socialLinksSheetOpen: boolean; setSocialLinksSheetOpen: (v: boolean) => void;
  editOpen: boolean; setEditOpen: (v: boolean) => void;
  settingsOpen: boolean; setSettingsOpen: (v: boolean) => void;
  pinnedPreviewOpen: boolean; setPinnedPreviewOpen: (v: boolean) => void;
  meetOverlayVisible: boolean; setMeetOverlayVisible: (v: boolean) => void;
  fabMenuOpen: boolean; setFabMenuOpen: (v: boolean) => void;
  composerOpen: boolean; setComposerOpen: (v: boolean) => void;
  profile: UserProfile | null; setProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  accessToken: string | null; userId: string | null;
  refetch: (force?: boolean) => void | Promise<void>;
  openHostMeet?: ((id: string, name: string) => void) | null;
  composerUser: ComposerUser | null;
  setPostsKey: React.Dispatch<React.SetStateAction<number>>;
}) {
  return (
    <>

    {linksSheetOpen && (
      <LinksSheet
        links={profile?.profile_links ?? []}
        onClose={() => setLinksSheetOpen(false)}
        accessToken={accessToken}
      />
    )}

    {socialLinksSheetOpen && (
      <SocialLinksSheet
        socialLinks={profile?.social_links ?? {}}
        onClose={() => setSocialLinksSheetOpen(false)}
      />
    )}

    <EditProfileOverlay
      visible={editOpen}
      onClose={() => setEditOpen(false)}
      initialData={{
        display_name: profile?.display_name ?? "",
        username: profile?.username ?? "",
        bio: profile?.bio ?? "",
        avatar_url: profile?.avatar_url ?? null,
        banner_color: profile?.banner_color ?? null,
        banner_image_url: profile?.banner_image_url ?? null,
        banner_shape: profile?.banner_shape ?? null,
        banner_shape_color: profile?.banner_shape_color ?? null,
        username_changed_at: profile?.username_changed_at ?? null,
        display_name_change_count: profile?.display_name_change_count ?? 0,
        display_name_window_start: profile?.display_name_window_start ?? null,
        pinned_song_id: profile?.pinned_song_id ?? null,
        pinned_song_name: profile?.pinned_song_name ?? null,
        pinned_song_artist: profile?.pinned_song_artist ?? null,
        pinned_song_album_art: profile?.pinned_song_album_art ?? null,
        profile_links: profile?.profile_links ?? [],
        social_links: profile?.social_links ?? {},
      }}
      userId={userId}
      accessToken={accessToken}
      onSaved={(data) => {
        const updated: UserProfile = {
          ...(profile ?? {} as UserProfile),
          display_name: data.display_name || null,
          username: data.username,
          bio: data.bio || null,
          avatar_url: data.avatar_url,
          banner_color: data.banner_color,
          banner_image_url: data.banner_image_url,
          banner_shape: data.banner_shape,
          banner_shape_color: data.banner_shape_color,
          username_changed_at: data.username_changed_at,
          display_name_change_count: data.display_name_change_count,
          display_name_window_start: data.display_name_window_start,
          pinned_song_id: data.pinned_song_id,
          pinned_song_name: data.pinned_song_name,
          pinned_song_artist: data.pinned_song_artist,
          pinned_song_album_art: data.pinned_song_album_art,
          profile_links: data.profile_links,
          social_links: data.social_links,
        };
        feedCache.profile = updated;
        setProfile(updated);
      }}
    />

    {settingsOpen && (
      <SettingsOverlay
        profile={profile}
        userId={userId}
        onClose={() => setSettingsOpen(false)}
        onProfileRefresh={() => { feedCache.profile = null; refetch(true); }}
      />
    )}

    {/* Pinned song preview — opened by tapping the pinned song row */}
    <SongPreviewSheet
      visible={pinnedPreviewOpen}
      onClose={() => setPinnedPreviewOpen(false)}
      song={
        profile?.pinned_song_id
          ? {
              id:       profile.pinned_song_id,
              name:     profile.pinned_song_name ?? "",
              artist:   profile.pinned_song_artist ?? "",
              albumArt: profile.pinned_song_album_art ?? null,
            }
          : null
      }
      accessToken={accessToken}
      userId={userId}
    />

    <StartMeetOverlay
      visible={meetOverlayVisible}
      onClose={() => setMeetOverlayVisible(false)}
      onStarted={(meetId, name) => { setMeetOverlayVisible(false); openHostMeet?.(meetId, name); }}
    />

    {/* ─── Sticky compose FAB (bottom-right) ───────────────────── */}
    <TouchableOpacity
      style={profileStyles.fab}
      activeOpacity={0.85}
      onPress={() => setFabMenuOpen(true)}
    >
      <Ionicons name="add" size={30} color="#fff" />
    </TouchableOpacity>

    {/* FAB option menu */}
    <Modal transparent visible={fabMenuOpen} animationType="fade" onRequestClose={() => setFabMenuOpen(false)}>
      <Pressable style={profileStyles.fabMenuOverlay} onPress={() => setFabMenuOpen(false)}>
        <View style={profileStyles.fabMenu}>
          <TouchableOpacity
            style={profileStyles.fabMenuItem}
            activeOpacity={0.8}
            onPress={() => { setFabMenuOpen(false); setMeetOverlayVisible(true); }}
          >
            <View style={profileStyles.fabMenuIcon}>
              <FontAwesome5 name="broadcast-tower" size={15} color="#FF6C1A" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={profileStyles.fabMenuTitle}>Start a Meet</Text>
              <Text style={profileStyles.fabMenuSub}>Go live</Text>
            </View>
          </TouchableOpacity>

          <View style={profileStyles.fabMenuDivider} />

          <TouchableOpacity
            style={profileStyles.fabMenuItem}
            activeOpacity={0.8}
            onPress={() => { setFabMenuOpen(false); setComposerOpen(true); }}
          >
            <View style={profileStyles.fabMenuIcon}>
              <Ionicons name="create-outline" size={18} color="#FF6C1A" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={profileStyles.fabMenuTitle}>Add a Post</Text>
              <Text style={profileStyles.fabMenuSub}>Share something with your followers</Text>
            </View>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>

    {/* Post composer — opened from the FAB menu */}
    <PostComposerSheet
      visible={composerOpen}
      onClose={() => setComposerOpen(false)}
      currentUser={composerUser}
      onPosted={() => {
        setComposerOpen(false);
        feedCache.myPosts = null;
        setPostsKey((k) => k + 1);
      }}
    />
    </>
  );
}
