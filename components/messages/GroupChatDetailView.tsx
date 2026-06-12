import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Animated, TextInput, Platform,
  Image, KeyboardAvoidingView, ActivityIndicator, ScrollView, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { chatStyles } from "../../lib/feed/localStyles";
import { openSpotifyLink } from "../../lib/spotify";
import { NowPlayingBanner } from "../feed/NowPlayingBanner";
import { SpotifyTrackCard } from "./SpotifyTrackCard";
import { SwipeToReply } from "./SwipeToReply";
import { GroupSettingsScreen } from "./GroupSettingsScreen";
import { CreateGroupPollOverlay } from "./CreateGroupPollOverlay";
import { CreateGroupEventOverlay } from "./CreateGroupEventOverlay";
import { useGroupChat } from "../../hooks/useGroupChat";
import {
  getGroupMembers, getGroupEvents, getGroupPolls, deleteGroupMessage,
  sendGroupSpotifyMessage, voteGroupPoll, deleteGroupEvent, deleteGroupPoll,
  type GroupChat, type GroupMember, type GroupEvent, type GroupPoll, type GroupMessage, type GroupUser,
} from "../../services/groupChats";

type Tab = "Chat" | "Events" | "Polls" | "Media";
const TABS: Tab[] = ["Chat", "Events", "Polls", "Media"];

export function GroupChatDetailView({
  group: initialGroup, userId, onClose,
}: {
  group: GroupChat;
  userId: string | null;
  onClose: () => void;
}) {
  const [group, setGroup] = useState(initialGroup);
  const accent = group.color || "#AB00FF";
  const {
    slideX, msgText, setMsgText, msgs, setMsgs, loading, myRole,
    replyTo, setReplyTo, flatRef, onScroll, scrollToBottom, onContentSizeChange,
    handleClose, pan, sendMessage, fmtTime,
  } = useGroupChat(group.id, userId, onClose);

  const isAdmin = myRole === "admin" || group.created_by === userId;
  const canPost = !group.lock_messages || isAdmin;

  // Freeze list scroll while a reply-swipe is in flight — imperative (no
  // setState) so it doesn't re-render the list and hitch the swipe's first frame.
  const setSwiping = useCallback((active: boolean) => {
    flatRef.current?.setNativeProps({ scrollEnabled: !active });
  }, [flatRef]);
  const [tab, setTab] = useState<Tab>("Chat");
  const [membersById, setMembersById] = useState<Record<string, GroupUser>>({});
  const [events, setEvents] = useState<GroupEvent[] | null>(null);
  const [polls, setPolls] = useState<GroupPoll[] | null>(null);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pollOpen, setPollOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);

  // Roster for resolving sender name/avatar on realtime messages (which lack the join).
  useEffect(() => {
    getGroupMembers(group.id).then((ms: GroupMember[]) => {
      setMembersById(Object.fromEntries(ms.map((m) => [m.user_id, m.user])));
    });
  }, [group.id]);

  // Lazy-load Events / Polls on first visit.
  useEffect(() => {
    if (tab === "Events" && events === null) getGroupEvents(group.id).then(setEvents);
    if (tab === "Polls" && polls === null) getGroupPolls(group.id, userId).then(setPolls);
  }, [tab, group.id, userId, events, polls]);

  const senderOf = (m: GroupMessage): GroupUser | undefined => m.sender ?? membersById[m.sender_id];

  const media = useMemo(
    () => msgs.filter((m) => m.type === "spotify_track" && m.spotify_album_art),
    [msgs],
  );

  // ── + menu ──────────────────────────────────────────────────────────────────
  const openPlus = () => {
    const opts: any[] = [
      { text: "📊  Create poll", onPress: () => setPollOpen(true) },
    ];
    if (isAdmin) opts.push({ text: "📅  Create event", onPress: () => setEventOpen(true) });
    opts.push({ text: "Cancel", style: "cancel" });
    Alert.alert("Add to chat", undefined, opts);
  };

  const confirmDeleteMessage = (m: GroupMessage) => {
    const mine = m.sender_id === userId;
    if (!mine && !isAdmin) return;
    Alert.alert("Delete message?", isAdmin && !mine ? "Remove this member's message." : undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          setMsgs((prev) => prev.filter((x) => x.id !== m.id));
          try { await deleteGroupMessage(m.id); } catch (e: any) { Alert.alert("Couldn't delete", e?.message ?? "Try again."); }
        },
      },
    ]);
  };

  const shareSong = async (t: { id: string; name: string; artist: string; albumArt: string | null }) => {
    const tempId = `pending-sp-${Date.now()}`;
    const optimistic: GroupMessage = {
      id: tempId, group_id: group.id, sender_id: userId ?? "", body: null, type: "spotify_track",
      spotify_track_id: t.id, spotify_track_name: t.name, spotify_track_artist: t.artist, spotify_album_art: t.albumArt,
      reply_to_id: null, reply_to_preview: null, created_at: new Date().toISOString(),
    };
    setMsgs((prev) => [...prev, optimistic]);
    scrollToBottom();
    const result = await sendGroupSpotifyMessage(group.id, t);
    if (result) setMsgs((prev) => [...prev.filter((m) => m.id !== tempId), result]);
  };

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { transform: [{ translateX: slideX }], backgroundColor: "#0D0D0D", zIndex: 200, elevation: 200 }]}
      {...pan.panHandlers}
    >
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {/* Header — tap the identity to open settings */}
        <View style={chatStyles.header}>
          <TouchableOpacity onPress={handleClose} style={chatStyles.backBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={chatStyles.headerCenter} activeOpacity={0.7} onPress={() => setSettingsOpen(true)}>
            <View style={[g.headerAvatar, { backgroundColor: accent + "33" }]}>
              <Text style={{ fontSize: 18 }}>{group.emoji || "👥"}</Text>
            </View>
            <View style={{ gap: 1, flex: 1 }}>
              <Text style={chatStyles.headerName} numberOfLines={1}>{group.name}</Text>
              <Text style={[chatStyles.headerStatus, { color: "rgba(255,255,255,0.35)" }]}>
                {group.member_count} member{group.member_count === 1 ? "" : "s"}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={[chatStyles.jamBtn, { backgroundColor: "#CAFF00" }]} activeOpacity={0.85}>
            <Ionicons name="musical-notes" size={12} color="#0D0D0D" />
            <Text style={chatStyles.jamBtnText}>Jam</Text>
          </TouchableOpacity>
          <TouchableOpacity style={chatStyles.headerIconBtn} activeOpacity={0.7} onPress={() => setSettingsOpen(true)}>
            <Ionicons name="ellipsis-vertical" size={17} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={g.tabBar}>
          {TABS.map((t) => (
            <TouchableOpacity key={t} style={g.tab} onPress={() => setTab(t)} activeOpacity={0.7}>
              <Text style={[g.tabText, tab === t && { color: accent }]}>{t}</Text>
              {tab === t && <View style={[g.tabUnderline, { backgroundColor: accent }]} />}
            </TouchableOpacity>
          ))}
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          {/* ── CHAT ── */}
          {tab === "Chat" && (
            <>
              {loading ? (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={accent} /></View>
              ) : (
                <FlatList
                  ref={flatRef}
                  data={msgs}
                  keyExtractor={(m) => m.id}
                  contentContainerStyle={chatStyles.messagesContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  onScroll={onScroll}
                  scrollEventThrottle={16}
                  onContentSizeChange={onContentSizeChange}
                  ListEmptyComponent={
                    <View style={{ alignItems: "center", paddingTop: 60, gap: 8 }}>
                      <Ionicons name="chatbubbles-outline" size={40} color="rgba(255,255,255,0.2)" />
                      <Text style={{ color: "rgba(255,255,255,0.35)", fontSize: 14 }}>Say hi to the group 👋</Text>
                    </View>
                  }
                  renderItem={({ item: msg, index }) => {
                    const fromMe = msg.sender_id === userId;
                    const prev = msgs[index - 1];
                    const next = msgs[index + 1];
                    const firstInGroup = !prev || prev.sender_id !== msg.sender_id;
                    const lastInGroup = !next || next.sender_id !== msg.sender_id;
                    const sender = senderOf(msg);
                    const senderName = fromMe ? "You" : (sender?.display_name || sender?.username || "Member");
                    // One consistent vertical rhythm across all content types.
                    const topGap = firstInGroup ? 14 : 6;

                    // Spotify track card
                    if (msg.type === "spotify_track" && msg.spotify_track_id) {
                      return (
                        <SwipeToReply fromMe={fromMe} onActiveChange={setSwiping} onReply={() => setReplyTo({ id: msg.id, preview: `🎵 ${msg.spotify_track_name ?? "Track"}`, senderName })}>
                          <TouchableOpacity activeOpacity={1} onLongPress={() => confirmDeleteMessage(msg)} delayLongPress={350}>
                            <View style={[g.row, fromMe && g.rowMe, { marginTop: topGap }]}>
                              {!fromMe && <Avatar user={sender} accent={accent} show={lastInGroup} />}
                              <View style={[chatStyles.msgWrap, fromMe && chatStyles.msgWrapMe]}>
                                {!fromMe && firstInGroup && <Text style={[g.senderName, { color: accent }]}>{senderName}</Text>}
                                <SpotifyTrackCard
                                  track={{ id: msg.spotify_track_id, name: msg.spotify_track_name ?? "Unknown", artist: msg.spotify_track_artist ?? "Unknown", albumArt: msg.spotify_album_art }}
                                  fromMe={fromMe}
                                />
                                <Text style={[chatStyles.bubbleTime, fromMe && chatStyles.bubbleTimeMe, { paddingHorizontal: 4, marginTop: 4 }]}>{fmtTime(msg.created_at)}</Text>
                              </View>
                            </View>
                          </TouchableOpacity>
                        </SwipeToReply>
                      );
                    }

                    const repliedMsg = msg.reply_to_id ? msgs.find((m) => m.id === msg.reply_to_id) : null;
                    const repliedName = repliedMsg
                      ? (repliedMsg.sender_id === userId ? "You" : (senderOf(repliedMsg)?.display_name || senderOf(repliedMsg)?.username || "Member"))
                      : null;

                    return (
                      <SwipeToReply fromMe={fromMe} onActiveChange={setSwiping} onReply={() => setReplyTo({ id: msg.id, preview: msg.body ?? "", senderName })}>
                        <TouchableOpacity activeOpacity={1} onLongPress={() => confirmDeleteMessage(msg)} delayLongPress={350}>
                          <View style={[g.row, fromMe && g.rowMe, { marginTop: topGap }]}>
                            {!fromMe && <Avatar user={sender} accent={accent} show={lastInGroup} />}
                            <View style={[chatStyles.msgWrap, fromMe && chatStyles.msgWrapMe]}>
                              {!fromMe && firstInGroup && <Text style={[g.senderName, { color: accent }]}>{senderName}</Text>}
                              <View style={[chatStyles.bubble, fromMe ? { backgroundColor: accent } : chatStyles.bubbleThem, !!msg.reply_to_preview && chatStyles.bubbleWithReply]}>
                                {!!msg.reply_to_preview && (
                                  <View style={[chatStyles.replyQuote, fromMe && chatStyles.replyQuoteMe]}>
                                    <View style={[chatStyles.replyQuoteAccent, fromMe && chatStyles.replyQuoteAccentMe]} />
                                    <View style={chatStyles.replyQuoteBody}>
                                      {!!repliedName && <Text style={[chatStyles.replyQuoteName, fromMe && chatStyles.replyQuoteNameMe]} numberOfLines={1}>{repliedName}</Text>}
                                      <Text style={[chatStyles.replyQuoteText, fromMe && chatStyles.replyQuoteTextMe]} numberOfLines={2}>{msg.reply_to_preview}</Text>
                                    </View>
                                  </View>
                                )}
                                <Text style={[chatStyles.bubbleText, fromMe && chatStyles.bubbleTextMe]}>{msg.body}</Text>
                                <Text style={[chatStyles.bubbleTime, fromMe && chatStyles.bubbleTimeMe]}>{fmtTime(msg.created_at)}</Text>
                              </View>
                            </View>
                          </View>
                        </TouchableOpacity>
                      </SwipeToReply>
                    );
                  }}
                />
              )}

              <View style={{ paddingHorizontal: 12 }}>
                <NowPlayingBanner onShare={(t) => shareSong({ id: t.id, name: t.name, artist: t.artist, albumArt: t.albumArt })} />
              </View>

              {!!replyTo && (
                <View style={chatStyles.replyBar}>
                  <View style={chatStyles.replyBarAccent} />
                  <View style={{ flex: 1 }}>
                    <Text style={chatStyles.replyBarName}>{replyTo.senderName}</Text>
                    <Text style={chatStyles.replyBarPreview} numberOfLines={1}>{replyTo.preview}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setReplyTo(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close" size={16} color="rgba(255,255,255,0.4)" />
                  </TouchableOpacity>
                </View>
              )}

              {canPost ? (
                <View style={chatStyles.inputBar}>
                  <TouchableOpacity style={chatStyles.inputPlusBtn} activeOpacity={0.7} onPress={openPlus}>
                    <Ionicons name="add-circle-outline" size={35} color="rgba(255,255,255,0.38)" />
                  </TouchableOpacity>
                  <View style={chatStyles.inputWrap}>
                    <TextInput
                      style={chatStyles.input}
                      placeholder="Message..."
                      placeholderTextColor="rgba(255,255,255,0.28)"
                      value={msgText}
                      onChangeText={setMsgText}
                      multiline maxLength={500}
                    />
                    {msgText.length === 0 ? (
                      <View style={chatStyles.inputAction}><Ionicons name="mic-outline" size={18} color="rgba(255,255,255,0.38)" /></View>
                    ) : (
                      <TouchableOpacity style={[chatStyles.inputAction, { backgroundColor: accent, borderRadius: 15 }]} activeOpacity={0.8} onPress={sendMessage}>
                        <Ionicons name="send" size={14} color="#0D0D0D" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ) : (
                <View style={g.locked}>
                  <Ionicons name="lock-closed" size={14} color="rgba(255,255,255,0.4)" />
                  <Text style={g.lockedText}>Only admins can post in this group</Text>
                </View>
              )}
            </>
          )}

          {/* ── EVENTS ── */}
          {tab === "Events" && (
            <EventsTab
              events={events} accent={accent} isAdmin={isAdmin}
              onCreate={() => setEventOpen(true)}
              onDelete={async (e) => {
                setEvents((prev) => (prev ?? []).filter((x) => x.id !== e.id));
                try { await deleteGroupEvent(e.id); } catch {}
              }}
            />
          )}

          {/* ── POLLS ── */}
          {tab === "Polls" && (
            <PollsTab
              polls={polls} accent={accent} userId={userId} isAdmin={isAdmin}
              onCreate={() => setPollOpen(true)}
              onVote={async (poll, optionId) => {
                if (!userId) return;
                setPolls((prev) => (prev ?? []).map((p) => p.id === poll.id ? optimisticVote(p, optionId, p.my_vote) : p));
                try { await voteGroupPoll(poll.id, optionId, userId); }
                catch { setPolls(await getGroupPolls(group.id, userId)); }
              }}
              onDelete={async (poll) => {
                setPolls((prev) => (prev ?? []).filter((x) => x.id !== poll.id));
                try { await deleteGroupPoll(poll.id); } catch {}
              }}
            />
          )}

          {/* ── MEDIA ── */}
          {tab === "Media" && (
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {media.length === 0 ? (
                <Text style={g.emptyText}>No shared songs yet.</Text>
              ) : (
                <View style={g.mediaGrid}>
                  {media.map((m) => (
                    <TouchableOpacity key={m.id} style={g.mediaCell} activeOpacity={0.85}
                      onPress={() => m.spotify_track_id && openSpotifyLink(`spotify:track:${m.spotify_track_id}`, `https://open.spotify.com/track/${m.spotify_track_id}`)}>
                      <Image source={{ uri: m.spotify_album_art! }} style={{ width: "100%", height: "100%" }} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>

      {settingsOpen && (
        <GroupSettingsScreen
          group={group} userId={userId} myRole={myRole}
          onClose={() => setSettingsOpen(false)}
          onUpdated={(gr) => setGroup(gr)}
          onLeft={() => { setSettingsOpen(false); handleClose(); }}
        />
      )}
      {pollOpen && (
        <CreateGroupPollOverlay groupId={group.id} onClose={() => setPollOpen(false)}
          onCreated={(p) => { setPolls((prev) => [p, ...(prev ?? [])]); setPollOpen(false); setTab("Polls"); }} />
      )}
      {eventOpen && (
        <CreateGroupEventOverlay groupId={group.id} onClose={() => setEventOpen(false)}
          onCreated={(e) => { setEvents((prev) => [...(prev ?? []), e].sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at))); setEventOpen(false); setTab("Events"); }} />
      )}
    </Animated.View>
  );
}

// Apply a vote locally: move my vote from the old option to the new one.
function optimisticVote(poll: GroupPoll, optionId: string, prevVote: string | null): GroupPoll {
  if (prevVote === optionId) return poll;
  const options = poll.options.map((o) => {
    let votes = o.votes;
    if (o.id === optionId) votes += 1;
    if (o.id === prevVote) votes = Math.max(0, votes - 1);
    return { ...o, votes };
  });
  return { ...poll, options, my_vote: optionId, total_votes: prevVote ? poll.total_votes : poll.total_votes + 1 };
}

function Avatar({ user, accent, show }: { user?: GroupUser; accent: string; show: boolean }) {
  if (!show) return <View style={{ width: 30 }} />;
  if (user?.avatar_url) return <Image source={{ uri: user.avatar_url }} style={g.avatar} />;
  const initial = (user?.display_name || user?.username || "?").trim().slice(0, 1).toUpperCase();
  return <View style={[g.avatar, { backgroundColor: accent + "33", alignItems: "center", justifyContent: "center" }]}><Text style={{ color: accent, fontWeight: "800", fontSize: 12 }}>{initial}</Text></View>;
}

// ── Events tab ──────────────────────────────────────────────────────────────────
function EventsTab({ events, accent, isAdmin, onCreate, onDelete }: {
  events: GroupEvent[] | null; accent: string; isAdmin: boolean;
  onCreate: () => void; onDelete: (e: GroupEvent) => void;
}) {
  if (events === null) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={accent} /></View>;
  const now = Date.now();
  const upcoming = events.filter((e) => +new Date(e.starts_at) >= now);
  const past = events.filter((e) => +new Date(e.starts_at) < now);
  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 10 }}>
        {events.length === 0 && <Text style={g.emptyText}>No events yet.{isAdmin ? " Tap + to schedule one." : ""}</Text>}
        {upcoming.length > 0 && <Text style={g.sectionLabel}>UPCOMING</Text>}
        {upcoming.map((e) => <EventCard key={e.id} event={e} accent={accent} canDelete={isAdmin} onDelete={() => onDelete(e)} />)}
        {past.length > 0 && <Text style={[g.sectionLabel, { marginTop: 10 }]}>PAST</Text>}
        {past.map((e) => <EventCard key={e.id} event={e} accent={accent} canDelete={isAdmin} onDelete={() => onDelete(e)} dimmed />)}
      </ScrollView>
      {isAdmin && <Fab accent={accent} onPress={onCreate} icon="calendar" />}
    </View>
  );
}

function EventCard({ event, accent, canDelete, onDelete, dimmed }: {
  event: GroupEvent; accent: string; canDelete: boolean; onDelete: () => void; dimmed?: boolean;
}) {
  const d = new Date(event.starts_at);
  return (
    <View style={[g.eventCard, dimmed && { opacity: 0.55 }]}>
      <View style={[g.eventDate, { backgroundColor: accent + "22" }]}>
        <Text style={[g.eventMonth, { color: accent }]}>{d.toLocaleDateString([], { month: "short" }).toUpperCase()}</Text>
        <Text style={g.eventDay}>{d.getDate()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {event.is_meet && <Ionicons name="headset" size={13} color={accent} />}
          <Text style={g.eventTitle} numberOfLines={1}>{event.title}</Text>
        </View>
        <Text style={g.eventTime}>{d.toLocaleDateString([], { weekday: "short" })} · {d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</Text>
        {!!event.description && <Text style={g.eventDesc} numberOfLines={2}>{event.description}</Text>}
      </View>
      {canDelete && (
        <TouchableOpacity onPress={onDelete} hitSlop={8} style={{ padding: 2 }}>
          <Ionicons name="trash-outline" size={16} color="rgba(255,71,87,0.8)" />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Polls tab ──────────────────────────────────────────────────────────────────
function PollsTab({ polls, accent, userId, isAdmin, onCreate, onVote, onDelete }: {
  polls: GroupPoll[] | null; accent: string; userId: string | null; isAdmin: boolean;
  onCreate: () => void; onVote: (p: GroupPoll, optionId: string) => void; onDelete: (p: GroupPoll) => void;
}) {
  if (polls === null) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={accent} /></View>;
  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 12 }}>
        {polls.length === 0 && <Text style={g.emptyText}>No polls yet. Tap + to ask the group something.</Text>}
        {polls.map((poll) => (
          <PollCard key={poll.id} poll={poll} accent={accent}
            canDelete={isAdmin || poll.created_by === userId}
            onVote={(opt) => onVote(poll, opt)} onDelete={() => onDelete(poll)} />
        ))}
      </ScrollView>
      <Fab accent={accent} onPress={onCreate} icon="stats-chart" />
    </View>
  );
}

function PollCard({ poll, accent, canDelete, onVote, onDelete }: {
  poll: GroupPoll; accent: string; canDelete: boolean; onVote: (optionId: string) => void; onDelete: () => void;
}) {
  const voted = !!poll.my_vote;
  return (
    <View style={g.pollCard}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
        <Text style={g.pollQ}>{poll.question}</Text>
        {canDelete && (
          <TouchableOpacity onPress={onDelete} hitSlop={8}><Ionicons name="trash-outline" size={15} color="rgba(255,71,87,0.8)" /></TouchableOpacity>
        )}
      </View>
      <View style={{ gap: 8, marginTop: 10 }}>
        {poll.options.map((o) => {
          const pct = poll.total_votes > 0 ? Math.round((o.votes / poll.total_votes) * 100) : 0;
          const mine = poll.my_vote === o.id;
          return (
            <TouchableOpacity key={o.id} activeOpacity={0.85} onPress={() => onVote(o.id)} style={g.pollOption}>
              {voted && <View style={[g.pollFill, { width: `${pct}%`, backgroundColor: accent + (mine ? "44" : "22") }]} />}
              <View style={g.pollOptionRow}>
                <Ionicons name={mine ? "checkmark-circle" : "ellipse-outline"} size={16} color={mine ? accent : "rgba(255,255,255,0.4)"} />
                <Text style={[g.pollOptText, mine && { color: "#fff", fontWeight: "800" }]} numberOfLines={2}>{o.text}</Text>
                {voted && <Text style={[g.pollPct, mine && { color: accent }]}>{pct}%</Text>}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={g.pollMeta}>{poll.total_votes} vote{poll.total_votes === 1 ? "" : "s"}{voted ? "" : " · tap to vote"}</Text>
    </View>
  );
}

function Fab({ accent, onPress, icon }: { accent: string; onPress: () => void; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <TouchableOpacity style={[g.fab, { backgroundColor: accent }]} activeOpacity={0.85} onPress={onPress}>
      <Ionicons name="add" size={26} color="#fff" />
    </TouchableOpacity>
  );
}

const g = StyleSheet.create({
  headerAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },

  tabBar: { flexDirection: "row", paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.07)" },
  tab: { paddingHorizontal: 14, paddingVertical: 12, alignItems: "center" },
  tabText: { fontSize: 14, fontWeight: "800", color: "rgba(255,255,255,0.45)" },
  tabUnderline: { height: 2.5, borderRadius: 2, marginTop: 7, width: "100%", position: "absolute", bottom: 0 },

  row: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 2 },
  rowMe: { justifyContent: "flex-end" },
  avatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#222" },
  senderName: { fontSize: 12, fontWeight: "800", marginBottom: 3, marginLeft: 2 },

  locked: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.07)" },
  lockedText: { fontSize: 13, color: "rgba(255,255,255,0.4)", fontWeight: "600" },

  emptyText: { fontSize: 14, color: "rgba(255,255,255,0.35)", textAlign: "center", marginTop: 40, paddingHorizontal: 30, lineHeight: 20 },
  sectionLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 0.9, color: "rgba(255,255,255,0.4)" },

  // Events
  eventCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(255,255,255,0.045)", borderRadius: 16, padding: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)" },
  eventDate: { width: 50, height: 54, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  eventMonth: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  eventDay: { fontSize: 20, fontWeight: "800", color: "#fff" },
  eventTitle: { fontSize: 15, fontWeight: "700", color: "#fff", flexShrink: 1 },
  eventTime: { fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 2 },
  eventDesc: { fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 4, lineHeight: 16 },

  // Polls
  pollCard: { backgroundColor: "rgba(255,255,255,0.045)", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)" },
  pollQ: { flex: 1, fontSize: 15, fontWeight: "800", color: "#fff", lineHeight: 20 },
  pollOption: { borderRadius: 12, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  pollFill: { position: "absolute", top: 0, bottom: 0, left: 0 },
  pollOptionRow: { flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 12, paddingVertical: 11 },
  pollOptText: { flex: 1, fontSize: 14, fontWeight: "600", color: "rgba(255,255,255,0.85)" },
  pollPct: { fontSize: 13, fontWeight: "800", color: "rgba(255,255,255,0.5)" },
  pollMeta: { fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 10, fontWeight: "600" },

  // Media
  mediaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  mediaCell: { width: "31.5%", aspectRatio: 1, borderRadius: 12, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.06)" },

  fab: { position: "absolute", right: 18, bottom: 24, width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },
});
