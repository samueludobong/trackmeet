import React, { useRef, useState, useEffect, useCallback } from "react";
import { feedCache } from "../../lib/feed/caches";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Pressable, RefreshControl } from "react-native";
import { CachedImage } from "../ui/CachedImage";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { getConversations, type ConversationInfo } from "../../services/messages";
import { getFollowingNowListening, type NowListeningUser } from "../../services/follows";
import { getFollowingNotes, type Note } from "../../services/notes";
import { CreateNoteOverlay } from "../../components/messages/CreateNoteOverlay";
import { NoteViewOverlay } from "../../components/messages/NoteViewOverlay";
import { CreateGroupChatOverlay } from "../../components/messages/CreateGroupChatOverlay";
import { NewDirectMessageOverlay } from "../../components/messages/NewDirectMessageOverlay";
import { useNowPlayingCtx } from "../../lib/feed/contexts";
import { ds, msgStyles } from "../../assets/styles/feed/localStyles";
import { MESSAGES_TABS } from "../../constants/messages";
import { MSG_HEADER_H } from "../../constants/feedLayout";
import { NAVBAR_H, BOTTOM_INSET } from "../../lib/feed/dimensions";
import { type MessagesTab } from "../../types/messages";
import { DirectMessagesList } from "../../components/messages/DirectMessagesList";
import { GroupChatsList } from "../../components/messages/GroupChatsList";
import { getMyGroupChats, type GroupChat } from "../../services/groupChats";
import { SongPreviewSheet } from "../../components/SongPreviewSheet";
import { useViewer } from "../../hooks/useViewer";

export function MessagesView({ onOpenChat, onOpenGroup }: { onOpenChat: (conv: ConversationInfo) => void; onOpenGroup?: (g: GroupChat) => void }) {
  const [activeTab, setActiveTab] = useState<MessagesTab>("Messages");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownAnim = useRef(new Animated.Value(0)).current;
  const chevronAnim  = useRef(new Animated.Value(0)).current;

  // Conversations — loaded once and cached; pull-to-refresh clears the cache
  const [conversations, setConversations] = useState<ConversationInfo[]>(feedCache.conversations ?? []);
  const [convsLoading,  setConvsLoading]  = useState(!feedCache.conversations);
  const [convsRefreshing, setConvsRefreshing] = useState(false);

  // Real group-chat count for the switcher badge (no dummy numbers).
  const [groupCount, setGroupCount] = useState(0);
  // Bumped after a successful create so GroupChatsList re-fetches.
  const [groupsRefreshKey, setGroupsRefreshKey] = useState(0);
  useEffect(() => { getMyGroupChats().then((g) => setGroupCount(g.length)).catch(() => {}); }, [groupsRefreshKey]);

  // Header "+ new" overlays — which one opens depends on the active tab.
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [createDmOpen, setCreateDmOpen] = useState(false);
  const onHeaderCreatePress = () => {
    if (activeTab === "Group Chats") setCreateGroupOpen(true);
    else setCreateDmOpen(true);
  };

  // Now-listening strip: viewer + followed users' live broadcasts AND notes.
  const [listening, setListening] = useState<NowListeningUser[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteOverlayOpen, setNoteOverlayOpen] = useState(false);
  const [viewNote, setViewNote] = useState<Note | null>(null);
  const [previewSong, setPreviewSong] = useState<{ id: string; name: string; artist: string; albumArt: string | null } | null>(null);
  const { currentUserId, currentUser, spotifyToken } = useViewer();
  // My own now-playing comes from the LIVE player context — never cached into
  // the notes DB. While it's playing it replaces my note card; when it stops my
  // stored note (text or pinned song) shows again.
  const { track: liveTrack } = useNowPlayingCtx();

  const refreshListening = useCallback(async () => {
    try {
      const [live, ns] = await Promise.all([getFollowingNowListening(), getFollowingNotes()]);
      setListening(live);
      setNotes(ns);
    } catch {
      setListening([]);
      setNotes([]);
    }
  }, []);

  const myNote = notes.find((n) => n.isMe) ?? null;

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
    setPreviewSong({ id: u.song_id, name: u.song_name, artist: u.song_artist ?? "", albumArt: u.song_album_art });
  };

  // Merge notes + live broadcasts into one strip. Now-playing REPLACES a note
  // while someone is listening, and their note returns when they stop. My slot
  // comes first (my live song, else my note, else a "+"), then everyone else's
  // live songs, then the notes of people who aren't currently listening.
  //
  // My live song is read straight from the player context (not the DB cache),
  // so the card reflects what I'm actually playing right now.
  const myLive: NowListeningUser | null = liveTrack?.isPlaying
    ? {
        id: currentUserId ?? "me",
        username: null,
        display_name: "You",
        avatar_url: currentUser?.avatarUrl ?? null,
        song_id: liveTrack.id,
        song_name: liveTrack.name,
        song_artist: liveTrack.artist,
        song_album_art: liveTrack.albumArt,
        isMe: true,
      }
    : null;
  const liveOthers = listening.filter((u) => !u.isMe);
  const liveOtherIds = new Set(liveOthers.map((u) => u.id));
  const noteOthers = notes.filter((n) => !n.isMe && !liveOtherIds.has(n.user_id));

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
          <View style={msgStyles.headerRedDot} />
        </TouchableOpacity>
        <TouchableOpacity style={ds.iconBtn} activeOpacity={0.7} onPress={onHeaderCreatePress}>
          <Ionicons name="create-outline" size={18} color="#fff" />
        </TouchableOpacity>
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
            const count  = tab === "Messages" ? conversations.length : tab === "Group Chats" ? groupCount : 0;
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
        {/* Search pill */}
        <TouchableOpacity style={msgStyles.searchBar} activeOpacity={0.7}>
          <Ionicons name="search" size={18} color="rgba(255,255,255,0.4)" />
          <Text style={msgStyles.searchPlaceholder}>Search</Text>
        </TouchableOpacity>

        {/* ── Notes + now-listening strip ── */}
        <View style={msgStyles.nowPlayingSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={msgStyles.nowPlayingRow}
          >
            {/* My slot: my live song (if listening) → my note → "+" to create. */}
            <MySlot
              live={myLive}
              note={myNote}
              avatarUrl={currentUser?.avatarUrl ?? null}
              initials={currentUser?.initials ?? "?"}
              onPress={() => setNoteOverlayOpen(true)}
            />
            {/* Live listeners first (now-playing replaces their note). */}
            {liveOthers.map((u) => (
              <LiveBubble key={`live-${u.id}`} user={u} onPress={() => openPreview(u)} />
            ))}
            {/* Then notes of people who aren't currently listening. */}
            {noteOthers.map((n) => (
              <NoteBubble key={`note-${n.id}`} note={n} onPress={() => setViewNote(n)} />
            ))}
          </ScrollView>
        </View>

        {/* "Messages | Requests" sub-header */}
        {activeTab === "Messages" && (
          <View style={msgStyles.listHeaderRow}>
            <Text style={msgStyles.listHeaderActive}>Messages</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={msgStyles.listHeaderMuted}>Requests</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === "Messages"    && <DirectMessagesList conversations={conversations} loading={convsLoading} onSelect={onOpenChat} />}
        {activeTab === "Group Chats" && <GroupChatsList onOpenGroup={onOpenGroup} refreshKey={groupsRefreshKey} />}
      </ScrollView>

      <SongPreviewSheet
        visible={!!previewSong}
        onClose={() => setPreviewSong(null)}
        song={previewSong}
        accessToken={spotifyToken}
        userId={currentUserId}
      />

      {noteOverlayOpen && currentUserId && (
        <CreateNoteOverlay
          userId={currentUserId}
          existing={myNote}
          onClose={() => setNoteOverlayOpen(false)}
          onSaved={refreshListening}
        />
      )}

      {viewNote && (
        <NoteViewOverlay note={viewNote} onClose={() => setViewNote(null)} />
      )}

      {createGroupOpen && (
        <CreateGroupChatOverlay
          onClose={() => setCreateGroupOpen(false)}
          onCreated={(g) => {
            setCreateGroupOpen(false);
            setGroupsRefreshKey((k) => k + 1);
            onOpenGroup?.(g);
          }}
        />
      )}

      {createDmOpen && (
        <NewDirectMessageOverlay
          onClose={() => setCreateDmOpen(false)}
          onPicked={(otherUser, conversationId) => {
            setCreateDmOpen(false);
            const conv: ConversationInfo = {
              conversationId,
              otherUser,
              last_message_at: null,
              last_message_preview: null,
            };
            onOpenChat(conv);
          }}
        />
      )}
    </View>
  );
}

// ─── Strip note bubble — shared speech-bubble shell ───────────────────────────
// `bubble` is the floating speech bubble (text or song); the avatar + badge +
// name sit beneath. `color` tints the bubble + tail. Live now-playing uses a
// different shell (LiveVisual) so it never looks like a note.
function NoteShell({
  bubble, avatar, badge, name, color, onPress,
}: {
  bubble: React.ReactNode;
  avatar: React.ReactNode;
  badge?: React.ReactNode;
  name: string;
  color?: string | null;
  onPress?: () => void;
}) {
  const tint = color ? { backgroundColor: color } : null;
  return (
    <TouchableOpacity style={msgStyles.noteItem} activeOpacity={0.8} onPress={onPress}>
      <View style={msgStyles.noteBubbleSlot}>
        <View style={[msgStyles.noteBubble, tint]}>
          {bubble}
          <View style={[msgStyles.noteTailBig, tint]} />
          <View style={[msgStyles.noteTailSmall, tint]} />
        </View>
      </View>
      <View style={msgStyles.noteAvatarWrap}>
        {avatar}
        {badge}
      </View>
      <Text style={msgStyles.noteName} numberOfLines={1}>{name}</Text>
    </TouchableOpacity>
  );
}

function Avatar({ uri, initials }: { uri: string | null; initials: string }) {
  return uri ? (
    <CachedImage source={{ uri }} style={msgStyles.noteAvatar} />
  ) : (
    <View style={[msgStyles.noteAvatar, msgStyles.noteAvatarFallback]}>
      <Text style={msgStyles.noteAvatarInitials}>{initials}</Text>
    </View>
  );
}

// A note's bubble content — song (art thumb + name) vs plain text.
function NoteBubbleContent({ note }: { note: Note }) {
  if (note.type === "song") {
    return (
      <>
        {note.song_album_art ? (
          <CachedImage source={{ uri: note.song_album_art }} style={msgStyles.noteBubbleArt} />
        ) : (
          <FontAwesome5 name="music" size={9} color={note.color ? "#fff" : "#AB00FF"} style={{ marginRight: 5 }} />
        )}
        <Text style={msgStyles.noteBubbleText} numberOfLines={2}>{note.song_name}</Text>
      </>
    );
  }
  return <Text style={msgStyles.noteBubbleText} numberOfLines={2}>{note.text}</Text>;
}

// My slot: my live song (now-playing) → my note → a "+" prompt. Always tappable
// to open the note editor (the purple badge signals it's mine to manage).
function MySlot({
  live, note, avatarUrl, initials, onPress,
}: {
  live: NowListeningUser | null;
  note: Note | null;
  avatarUrl: string | null;
  initials: string;
  onPress: () => void;
}) {
  const editBadge = (
    <View style={[msgStyles.noteCornerBadge, msgStyles.noteAddBadge]}>
      <Ionicons name={note ? "pencil" : "add"} size={note ? 10 : 13} color="#fff" />
    </View>
  );
  // Listening now → show my now-playing, but keep the editable badge + label.
  if (live) {
    return <LiveVisual user={live} name="Your note" badge={editBadge} onPress={onPress} />;
  }
  return (
    <NoteShell
      onPress={onPress}
      name="Your note"
      color={note?.color}
      avatar={<Avatar uri={avatarUrl} initials={initials} />}
      badge={editBadge}
      bubble={
        note ? <NoteBubbleContent note={note} />
             : <Text style={[msgStyles.noteBubbleText, { color: "rgba(255,255,255,0.55)" }]}>Note</Text>
      }
    />
  );
}

// Someone else's note (only shown when they're not currently listening).
function NoteBubble({ note, onPress }: { note: Note; onPress: () => void }) {
  const initial = (note.display_name || note.username || "?").trim().slice(0, 1).toUpperCase();
  return (
    <NoteShell
      onPress={onPress}
      name={note.display_name || note.username || "anon"}
      color={note.color}
      avatar={<Avatar uri={note.avatar_url} initials={initial} />}
      bubble={<NoteBubbleContent note={note} />}
    />
  );
}

// Live now-playing visual — deliberately distinct from notes: the *album art*
// fills the ringed avatar (green ring), a green "now-playing" pill replaces the
// speech bubble, and a green music badge sits on the avatar.
function LiveVisual({
  user, name, badge, onPress,
}: {
  user: NowListeningUser;
  name: string;
  badge?: React.ReactNode;
  onPress: () => void;
}) {
  const initial = (user.display_name || user.username || "?").trim().slice(0, 1).toUpperCase();
  return (
    <TouchableOpacity style={msgStyles.noteItem} activeOpacity={0.8} onPress={onPress}>
      <View style={msgStyles.noteBubbleSlot}>
        <View style={msgStyles.liveSongPill}>
          <FontAwesome5 name="music" size={9} color="#2ED158" />
          <Text style={msgStyles.liveSongPillText} numberOfLines={2}>{user.song_name}</Text>
        </View>
      </View>
      <View style={msgStyles.noteAvatarWrap}>
        {user.song_album_art ? (
          <CachedImage source={{ uri: user.song_album_art }} style={[msgStyles.noteAvatar, msgStyles.noteAvatarLiveRing]} />
        ) : user.avatar_url ? (
          <CachedImage source={{ uri: user.avatar_url }} style={[msgStyles.noteAvatar, msgStyles.noteAvatarLiveRing]} />
        ) : (
          <View style={[msgStyles.noteAvatar, msgStyles.noteAvatarFallback, msgStyles.noteAvatarLiveRing]}>
            <Text style={msgStyles.noteAvatarInitials}>{initial}</Text>
          </View>
        )}
        {badge ?? (
          <View style={[msgStyles.noteCornerBadge, msgStyles.noteLiveBadge]}>
            <FontAwesome5 name="music" size={9} color="#0D0D0D" />
          </View>
        )}
      </View>
      <Text style={msgStyles.noteName} numberOfLines={1}>{name}</Text>
    </TouchableOpacity>
  );
}

// A live broadcaster in the strip.
function LiveBubble({ user, onPress }: { user: NowListeningUser; onPress: () => void }) {
  return <LiveVisual user={user} name={user.display_name || user.username || "anon"} onPress={onPress} />;
}


// ─── Swipe-to-reply wrapper ───────────────────────────────────────────────────
// Uses existing PanResponder (no new package). Only intercepts leftward swipes
// so it doesn't conflict with the outer swipe-right-to-dismiss handler.
