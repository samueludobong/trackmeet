import React, { useRef, useState, useEffect, useCallback } from "react";
import { feedCache } from "../../lib/feed/caches";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Pressable, PanResponder, RefreshControl, Image } from "react-native";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { getConversations, type ConversationInfo } from "../../services/messages";
import { getFollowingNowListening, type NowListeningUser } from "../../services/follows";
import { ds, msgStyles } from "../../lib/feed/localStyles";
import { styles as feedStyles } from "../../lib/feed/styles";
import { MESSAGES_TABS } from "../../constants/messages";
import { MSG_HEADER_H } from "../../constants/feedLayout";
import { NAVBAR_H, BOTTOM_INSET } from "../../lib/feed/dimensions";
import { type MessagesTab } from "../../types/messages";
import { DirectMessagesList } from "../../components/messages/DirectMessagesList";
import { GroupChatsList } from "../../components/messages/GroupChatsList";
import { CommunityList } from "../../components/messages/CommunityList";
import { SongPreviewSheet } from "../../components/SongPreviewSheet";
import { useViewer } from "../../hooks/useViewer";
import { MESSAGES_UNREAD } from "../../app/data/mock";

export function MessagesView({ onOpenChat }: { onOpenChat: (conv: ConversationInfo) => void }) {
  const [activeTab, setActiveTab] = useState<MessagesTab>("Messages");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownAnim = useRef(new Animated.Value(0)).current;
  const chevronAnim  = useRef(new Animated.Value(0)).current;

  // Conversations — loaded once and cached; pull-to-refresh clears the cache
  const [conversations, setConversations] = useState<ConversationInfo[]>(feedCache.conversations ?? []);
  const [convsLoading,  setConvsLoading]  = useState(!feedCache.conversations);
  const [convsRefreshing, setConvsRefreshing] = useState(false);

  // Now-listening: viewer + followed users currently broadcasting
  const [listening, setListening] = useState<NowListeningUser[]>([]);
  const [previewSong, setPreviewSong] = useState<{ id: string; name: string; artist: string; albumArt: string | null } | null>(null);
  const { currentUserId, spotifyToken } = useViewer();

  const refreshListening = useCallback(async () => {
    try {
      setListening(await getFollowingNowListening());
    } catch {
      setListening([]);
    }
  }, []);

  useEffect(() => {
    if (feedCache.conversations) return;
    getConversations().then(c => {
      feedCache.conversations = c;
      setConversations(c);
      setConvsLoading(false);
    });
  }, []);

  useEffect(() => { refreshListening(); }, [refreshListening]);

  // Refresh broadcasts every 20s so the strip stays roughly live without
  // hammering the DB. A pull-to-refresh on Messages also refreshes it.
  useEffect(() => {
    const id = setInterval(refreshListening, 20_000);
    return () => clearInterval(id);
  }, [refreshListening]);

  const refreshConversations = async () => {
    setConvsRefreshing(true);
    feedCache.conversations = null;
    const [c] = await Promise.all([getConversations(), refreshListening()]);
    feedCache.conversations = c;
    setConversations(c);
    setConvsRefreshing(false);
  };

  const openPreview = (u: NowListeningUser) => {
    if (!u.song_id || !u.song_name) return;
    setPreviewSong({
      id: u.song_id,
      name: u.song_name,
      artist: u.song_artist ?? "",
      albumArt: u.song_album_art,
    });
  };

  const openDropdown = () => {
    setDropdownOpen(true);
    Animated.parallel([
      Animated.spring(dropdownAnim, { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 280 }),
      Animated.spring(chevronAnim,  { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 280 }),
    ]).start();
  };

  const closeDropdown = () => {
    Animated.parallel([
      Animated.timing(dropdownAnim, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(chevronAnim,  { toValue: 0, duration: 160, useNativeDriver: true }),
    ]).start(() => setDropdownOpen(false));
  };

  const selectTab = (tab: MessagesTab) => {
    setActiveTab(tab);
    closeDropdown();
  };

  const chevronRotate   = chevronAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });
  const dropdownTranslY = dropdownAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] });
  const dropdownScale   = dropdownAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] });

  return (
    <View style={{ flex: 1 }}>
      {/* Header */}
      <View style={msgStyles.header}>
        <TouchableOpacity
          style={msgStyles.dropdownTrigger}
          onPress={dropdownOpen ? closeDropdown : openDropdown}
          activeOpacity={0.8}
        >
          <Text style={msgStyles.headerTitle}>{activeTab}</Text>
          <Animated.View style={{ transform: [{ rotate: chevronRotate }], marginTop: 4 }}>
            <Ionicons name="chevron-down" size={18} color="rgba(255,255,255,0.55)" />
          </Animated.View>
        </TouchableOpacity>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity style={ds.iconBtn} activeOpacity={0.7}>
            <Ionicons name="search-outline" size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={ds.iconBtn} activeOpacity={0.7}>
            <Ionicons name="create-outline" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Now Playing stories strip ── */}
      <View style={msgStyles.nowPlayingSection}>
        <Text style={msgStyles.nowPlayingLabel}>Now Listening</Text>
        {listening.length === 0 ? (
          <Text style={{ paddingHorizontal: 16, paddingBottom: 12, color: "rgba(255,255,255,0.35)", fontSize: 12 }}>
            Nobody you follow is broadcasting right now.
          </Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={msgStyles.nowPlayingRow}
          >
            {listening.map((u) => (
              <NowListeningBubble key={u.id} user={u} onPress={() => openPreview(u)} />
            ))}
          </ScrollView>
        )}
      </View>

      {/* Backdrop to close dropdown */}
      {dropdownOpen && (
        <Pressable
          style={[StyleSheet.absoluteFill, { top: MSG_HEADER_H, zIndex: 8 }]}
          onPress={closeDropdown}
        />
      )}

      {/* Dropdown menu */}
      {dropdownOpen && (
        <Animated.View
          style={[msgStyles.dropdown, {
            opacity: dropdownAnim,
            transform: [{ translateY: dropdownTranslY }, { scale: dropdownScale }],
            zIndex: 10,
            elevation: 10,
          }]}
        >
          {MESSAGES_TABS.map((tab, i) => {
            const active = tab === activeTab;
            const count  = MESSAGES_UNREAD[tab] ?? 0;
            return (
              <TouchableOpacity
                key={tab}
                style={[
                  msgStyles.dropdownRow,
                  i < MESSAGES_TABS.length - 1 && msgStyles.dropdownRowBorder,
                  active && msgStyles.dropdownRowActive,
                ]}
                onPress={() => selectTab(tab)}
                activeOpacity={0.75}
              >
                <Text style={[msgStyles.dropdownRowText, active && msgStyles.dropdownRowTextActive]}>{tab}</Text>
                <View style={{ flex: 1 }} />
                {count > 0 && (
                  <View style={[msgStyles.dropdownBadge, active && msgStyles.dropdownBadgeActive]}>
                    <Text style={msgStyles.dropdownBadgeText}>{count}</Text>
                  </View>
                )}
                {active && <Ionicons name="checkmark" size={15} color="#AB00FF" style={{ marginLeft: 8 }} />}
              </TouchableOpacity>
            );
          })}
        </Animated.View>
      )}

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: NAVBAR_H + BOTTOM_INSET + 40 }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!dropdownOpen}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          activeTab === "Messages" ? (
            <RefreshControl
              refreshing={convsRefreshing}
              onRefresh={refreshConversations}
              tintColor="#AB00FF"
            />
          ) : undefined
        }
      >
        {activeTab === "Messages"    && <DirectMessagesList conversations={conversations} loading={convsLoading} onSelect={onOpenChat} />}
        {activeTab === "Group Chats" && <GroupChatsList />}
        {activeTab === "Community"   && <CommunityList />}
      </ScrollView>

      <SongPreviewSheet
        visible={!!previewSong}
        onClose={() => setPreviewSong(null)}
        song={previewSong}
        accessToken={spotifyToken}
        userId={currentUserId}
      />
    </View>
  );
}

// ─── Now-listening bubble ────────────────────────────────────────────────────
function NowListeningBubble({ user, onPress }: { user: NowListeningUser; onPress: () => void }) {
  const initial = (user.display_name || user.username || "?").trim().slice(0, 1).toUpperCase();
  return (
    <TouchableOpacity style={feedStyles.nowPlayingItem} activeOpacity={0.8} onPress={onPress}>
      <View style={[feedStyles.storyRing, { borderColor: user.isMe ? "#CAFF00" : "#AB00FF" }]}>
        {user.song_album_art ? (
          <Image source={{ uri: user.song_album_art }} style={feedStyles.storyAvatar} />
        ) : user.avatar_url ? (
          <Image source={{ uri: user.avatar_url }} style={feedStyles.storyAvatar} />
        ) : (
          <View style={[feedStyles.storyAvatar, { backgroundColor: "rgba(171,0,255,0.18)", alignItems: "center", justifyContent: "center" }]}>
            <Text style={[feedStyles.storyInitials, { color: "#AB00FF" }]}>{initial}</Text>
          </View>
        )}
        <View style={[feedStyles.nowPlayingBadge, { backgroundColor: user.isMe ? "#CAFF00" : "#AB00FF" }]}>
          <FontAwesome5 name="music" size={8} color="#0D0D0D" />
        </View>
      </View>
      <Text style={feedStyles.storyName} numberOfLines={1}>
        {user.isMe ? "You" : (user.display_name || user.username || "anon")}
      </Text>
      <Text style={feedStyles.storyArtistSub} numberOfLines={1}>{user.song_name}</Text>
    </TouchableOpacity>
  );
}


// ─── Swipe-to-reply wrapper ───────────────────────────────────────────────────
// Uses existing PanResponder (no new package). Only intercepts leftward swipes
// so it doesn't conflict with the outer swipe-right-to-dismiss handler.
