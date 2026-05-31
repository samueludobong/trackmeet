import React, { useRef, useState, useEffect } from "react";
import { feedCache } from "../../lib/feed/caches";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Pressable, PanResponder, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getConversations, type ConversationInfo } from "../../services/messages";
import { ds, msgStyles } from "../../lib/feed/localStyles";
import { MESSAGES_TABS } from "../../constants/messages";
import { MSG_HEADER_H } from "../../constants/feedLayout";
import { NAVBAR_H, BOTTOM_INSET } from "../../lib/feed/dimensions";
import { type MessagesTab } from "../../types/messages";
import { NowPlayingBubble } from "../../components/feed/NowPlayingBubble";
import { DirectMessagesList } from "../../components/messages/DirectMessagesList";
import { GroupChatsList } from "../../components/messages/GroupChatsList";
import { CommunityList } from "../../components/messages/CommunityList";
import { NOW_PLAYING_STORIES, MESSAGES_UNREAD } from "../../app/data/mock";

export function MessagesView({ onOpenChat }: { onOpenChat: (conv: ConversationInfo) => void }) {
  const [activeTab, setActiveTab] = useState<MessagesTab>("Messages");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownAnim = useRef(new Animated.Value(0)).current;
  const chevronAnim  = useRef(new Animated.Value(0)).current;

  // Conversations — loaded once and cached; pull-to-refresh clears the cache
  const [conversations, setConversations] = useState<ConversationInfo[]>(feedCache.conversations ?? []);
  const [convsLoading,  setConvsLoading]  = useState(!feedCache.conversations);
  const [convsRefreshing, setConvsRefreshing] = useState(false);

  useEffect(() => {
    if (feedCache.conversations) return;
    getConversations().then(c => {
      feedCache.conversations = c;
      setConversations(c);
      setConvsLoading(false);
    });
  }, []);

  const refreshConversations = async () => {
    setConvsRefreshing(true);
    feedCache.conversations = null;
    const c = await getConversations();
    feedCache.conversations = c;
    setConversations(c);
    setConvsRefreshing(false);
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={msgStyles.nowPlayingRow}
        >
          {NOW_PLAYING_STORIES.map((s) => (
            <NowPlayingBubble key={s.id} item={s} />
          ))}
        </ScrollView>
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
    </View>
  );
}


// ─── Swipe-to-reply wrapper ───────────────────────────────────────────────────
// Uses existing PanResponder (no new package). Only intercepts leftward swipes
// so it doesn't conflict with the outer swipe-right-to-dismiss handler.
