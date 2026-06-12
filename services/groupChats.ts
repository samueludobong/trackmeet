import { supabase } from "../lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export type GroupRole = "admin" | "member";

export type GroupChat = {
  id: string;
  name: string;
  emoji: string | null;
  color: string | null;
  avatar_url: string | null;
  created_by: string;
  lock_messages: boolean;
  jam_meet_id: string | null;
  member_count: number;
  last_message_at: string | null;
  last_message_preview: string | null;
  created_at: string;
};

export type GroupUser = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_verified?: boolean | null;
};

export type GroupMember = { user_id: string; role: GroupRole; joined_at: string; user: GroupUser };

export type GroupMessage = {
  id: string;
  group_id: string;
  sender_id: string;
  body: string | null;
  type: "text" | "spotify_track";
  spotify_track_id: string | null;
  spotify_track_name: string | null;
  spotify_track_artist: string | null;
  spotify_album_art: string | null;
  reply_to_id: string | null;
  reply_to_preview: string | null;
  created_at: string;
  /** Joined sender profile (for the group roster — DMs don't need this). */
  sender?: GroupUser;
};

export type GroupEvent = {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  starts_at: string;
  is_meet: boolean;
  created_by: string | null;
  created_at: string;
};

export type GroupPollOption = { id: string; text: string; position: number; votes: number };
export type GroupPoll = {
  id: string;
  group_id: string;
  question: string;
  created_by: string | null;
  created_at: string;
  options: GroupPollOption[];
  total_votes: number;
  my_vote: string | null; // option_id the viewer chose, or null
};

const GROUP_SELECT =
  "id, name, emoji, color, avatar_url, created_by, lock_messages, jam_meet_id, member_count, last_message_at, last_message_preview, created_at";
const USER_SELECT = "id, username, display_name, avatar_url, is_verified";

// ─── User search (for adding members) ──────────────────────────────────────────

/** Search users by username/display name, excluding the viewer. */
export async function searchUsersForGroup(query: string, excludeIds: string[] = []): Promise<GroupUser[]> {
  const q = query.trim();
  if (!q) return [];
  const { data: { user: me } } = await supabase.auth.getUser();
  const exclude = [...new Set([me?.id, ...excludeIds].filter(Boolean))] as string[];
  let req = supabase
    .from("users")
    .select(USER_SELECT)
    .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
    .order("followers_count", { ascending: false })
    .limit(20);
  if (exclude.length) req = req.not("id", "in", `(${exclude.join(",")})`);
  const { data } = await req;
  return (data ?? []) as GroupUser[];
}

// ─── Group CRUD ────────────────────────────────────────────────────────────────

/** Create a group, add the creator as admin + the chosen members. */
export async function createGroupChat(
  name: string,
  memberIds: string[],
  opts?: { emoji?: string | null; color?: string | null; avatarUrl?: string | null },
): Promise<GroupChat | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !name.trim()) return null;

  const { data: group, error } = await supabase
    .from("group_chats")
    .insert({
      name: name.trim(),
      created_by: user.id,
      emoji: opts?.emoji ?? null,
      color: opts?.color ?? "#AB00FF",
      avatar_url: opts?.avatarUrl ?? null,
    })
    .select(GROUP_SELECT)
    .single();
  if (error || !group) { console.error("[groupChats] create:", error?.message); return null; }

  const rows = [
    { group_id: group.id, user_id: user.id, role: "admin" as const },
    ...[...new Set(memberIds)].filter((id) => id !== user.id).map((id) => ({ group_id: group.id, user_id: id, role: "member" as const })),
  ];
  await supabase.from("group_chat_members").insert(rows);

  return { ...(group as GroupChat), member_count: rows.length };
}

/** Groups the viewer belongs to, most-recently-active first. */
export async function getMyGroupChats(): Promise<GroupChat[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: mem } = await supabase.from("group_chat_members").select("group_id").eq("user_id", user.id);
  const ids = (mem ?? []).map((m: any) => m.group_id);
  if (!ids.length) return [];
  const { data } = await supabase
    .from("group_chats")
    .select(GROUP_SELECT)
    .in("id", ids)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  return (data ?? []) as GroupChat[];
}

export async function getGroupChat(groupId: string): Promise<GroupChat | null> {
  const { data } = await supabase.from("group_chats").select(GROUP_SELECT).eq("id", groupId).maybeSingle();
  return (data as GroupChat | null) ?? null;
}

export type GroupUpdate = {
  name?: string; emoji?: string | null; color?: string | null;
  avatarUrl?: string | null; lockMessages?: boolean; jamMeetId?: string | null;
};

export async function updateGroupChat(groupId: string, patch: GroupUpdate): Promise<GroupChat | null> {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name.trim();
  if (patch.emoji !== undefined) row.emoji = patch.emoji;
  if (patch.color !== undefined) row.color = patch.color;
  if (patch.avatarUrl !== undefined) row.avatar_url = patch.avatarUrl;
  if (patch.lockMessages !== undefined) row.lock_messages = patch.lockMessages;
  if (patch.jamMeetId !== undefined) row.jam_meet_id = patch.jamMeetId;
  const { data, error } = await supabase.from("group_chats").update(row).eq("id", groupId).select(GROUP_SELECT).single();
  if (error) { console.error("[groupChats] update:", error.message); return null; }
  return data as GroupChat;
}

export async function leaveGroupChat(groupId: string, userId: string): Promise<void> {
  await supabase.from("group_chat_members").delete().eq("group_id", groupId).eq("user_id", userId);
}

export async function deleteGroupChat(groupId: string): Promise<void> {
  const { error } = await supabase.from("group_chats").delete().eq("id", groupId);
  if (error) throw error;
}

// ─── Members ────────────────────────────────────────────────────────────────────

export async function getGroupMembers(groupId: string): Promise<GroupMember[]> {
  const { data } = await supabase
    .from("group_chat_members")
    .select(`user_id, role, joined_at, users!user_id(${USER_SELECT})`)
    .eq("group_id", groupId)
    .order("role", { ascending: true })
    .order("joined_at", { ascending: true });
  return (data ?? []).map((r: any) => ({ user_id: r.user_id, role: r.role, joined_at: r.joined_at, user: r.users }));
}

export async function getMyGroupRole(groupId: string, userId: string): Promise<GroupRole | null> {
  const { data } = await supabase
    .from("group_chat_members").select("role")
    .eq("group_id", groupId).eq("user_id", userId).maybeSingle();
  return (data?.role as GroupRole | undefined) ?? null;
}

export async function addGroupMembers(groupId: string, userIds: string[]): Promise<void> {
  if (!userIds.length) return;
  await supabase.from("group_chat_members").insert(
    userIds.map((id) => ({ group_id: groupId, user_id: id, role: "member" as const })),
  );
}

export async function setGroupMemberRole(groupId: string, userId: string, role: GroupRole): Promise<void> {
  const { error } = await supabase.from("group_chat_members").update({ role }).eq("group_id", groupId).eq("user_id", userId);
  if (error) throw error;
}

export async function removeGroupMember(groupId: string, userId: string): Promise<void> {
  const { error } = await supabase.from("group_chat_members").delete().eq("group_id", groupId).eq("user_id", userId);
  if (error) throw error;
}

// ─── Messages ────────────────────────────────────────────────────────────────────

const MESSAGE_SELECT =
  `id, group_id, sender_id, body, type, spotify_track_id, spotify_track_name, spotify_track_artist, spotify_album_art, reply_to_id, reply_to_preview, created_at, users!sender_id(${USER_SELECT})`;

function normalizeMessage(r: any): GroupMessage {
  return {
    id: r.id, group_id: r.group_id, sender_id: r.sender_id, body: r.body ?? null,
    type: r.type, spotify_track_id: r.spotify_track_id ?? null, spotify_track_name: r.spotify_track_name ?? null,
    spotify_track_artist: r.spotify_track_artist ?? null, spotify_album_art: r.spotify_album_art ?? null,
    reply_to_id: r.reply_to_id ?? null, reply_to_preview: r.reply_to_preview ?? null,
    created_at: r.created_at, sender: r.users ?? undefined,
  };
}

export async function getGroupMessages(groupId: string): Promise<GroupMessage[]> {
  const { data, error } = await supabase
    .from("group_messages")
    .select(MESSAGE_SELECT)
    .eq("group_id", groupId)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data.map(normalizeMessage);
}

export async function sendGroupTextMessage(
  groupId: string, body: string, replyTo?: { id: string; preview: string } | null,
): Promise<GroupMessage | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !body.trim()) return null;
  const { data, error } = await supabase
    .from("group_messages")
    .insert({
      group_id: groupId, sender_id: user.id, body: body.trim(), type: "text",
      reply_to_id: replyTo?.id ?? null, reply_to_preview: replyTo?.preview ?? null,
    })
    .select(MESSAGE_SELECT).single();
  if (error) { console.error("[groupChats] sendText:", error.message); return null; }
  return normalizeMessage(data);
}

export async function sendGroupSpotifyMessage(
  groupId: string, track: { id: string; name: string; artist: string; albumArt: string | null },
): Promise<GroupMessage | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("group_messages")
    .insert({
      group_id: groupId, sender_id: user.id, body: null, type: "spotify_track",
      spotify_track_id: track.id, spotify_track_name: track.name,
      spotify_track_artist: track.artist, spotify_album_art: track.albumArt,
    })
    .select(MESSAGE_SELECT).single();
  if (error) { console.error("[groupChats] sendTrack:", error.message); return null; }
  return normalizeMessage(data);
}

/** Admin (or author) message deletion. */
export async function deleteGroupMessage(messageId: string): Promise<void> {
  const { error } = await supabase.from("group_messages").delete().eq("id", messageId);
  if (error) throw error;
}

// ─── Events ────────────────────────────────────────────────────────────────────

export async function getGroupEvents(groupId: string): Promise<GroupEvent[]> {
  const { data } = await supabase
    .from("group_events").select("*")
    .eq("group_id", groupId)
    .order("starts_at", { ascending: true });
  return (data ?? []) as GroupEvent[];
}

export async function createGroupEvent(
  groupId: string,
  input: { title: string; description?: string | null; startsAt: string; isMeet?: boolean },
): Promise<GroupEvent | null> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("group_events")
    .insert({
      group_id: groupId, title: input.title.trim(),
      description: input.description?.trim() || null,
      starts_at: input.startsAt, is_meet: input.isMeet ?? false,
      created_by: user?.id ?? null,
    })
    .select("*").single();
  if (error) { console.error("[groupChats] createEvent:", error.message); return null; }
  return data as GroupEvent;
}

export async function deleteGroupEvent(eventId: string): Promise<void> {
  const { error } = await supabase.from("group_events").delete().eq("id", eventId);
  if (error) throw error;
}

// ─── Polls ────────────────────────────────────────────────────────────────────

export async function getGroupPolls(groupId: string, userId: string | null): Promise<GroupPoll[]> {
  const { data: polls } = await supabase
    .from("group_polls").select("id, group_id, question, created_by, created_at")
    .eq("group_id", groupId).order("created_at", { ascending: false });
  if (!polls?.length) return [];
  const pollIds = polls.map((p: any) => p.id);

  const [{ data: options }, { data: votes }] = await Promise.all([
    supabase.from("group_poll_options").select("id, poll_id, text, position").in("poll_id", pollIds).order("position", { ascending: true }),
    supabase.from("group_poll_votes").select("poll_id, option_id, user_id").in("poll_id", pollIds),
  ]);

  const voteCounts = new Map<string, number>();   // option_id → count
  const myVotes = new Map<string, string>();       // poll_id → option_id (mine)
  const pollTotals = new Map<string, number>();    // poll_id → total
  for (const v of (votes ?? []) as any[]) {
    voteCounts.set(v.option_id, (voteCounts.get(v.option_id) ?? 0) + 1);
    pollTotals.set(v.poll_id, (pollTotals.get(v.poll_id) ?? 0) + 1);
    if (userId && v.user_id === userId) myVotes.set(v.poll_id, v.option_id);
  }

  const optionsByPoll = new Map<string, GroupPollOption[]>();
  for (const o of (options ?? []) as any[]) {
    const list = optionsByPoll.get(o.poll_id) ?? [];
    list.push({ id: o.id, text: o.text, position: o.position, votes: voteCounts.get(o.id) ?? 0 });
    optionsByPoll.set(o.poll_id, list);
  }

  return (polls as any[]).map((p) => ({
    id: p.id, group_id: p.group_id, question: p.question, created_by: p.created_by, created_at: p.created_at,
    options: optionsByPoll.get(p.id) ?? [],
    total_votes: pollTotals.get(p.id) ?? 0,
    my_vote: myVotes.get(p.id) ?? null,
  }));
}

export async function createGroupPoll(
  groupId: string, question: string, options: string[],
): Promise<GroupPoll | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const clean = options.map((o) => o.trim()).filter(Boolean);
  if (!question.trim() || clean.length < 2) return null;

  const { data: poll, error } = await supabase
    .from("group_polls")
    .insert({ group_id: groupId, question: question.trim(), created_by: user.id })
    .select("id, group_id, question, created_by, created_at").single();
  if (error || !poll) { console.error("[groupChats] createPoll:", error?.message); return null; }

  const { data: opts } = await supabase
    .from("group_poll_options")
    .insert(clean.map((text, i) => ({ poll_id: poll.id, text, position: i })))
    .select("id, text, position");

  return {
    id: poll.id, group_id: poll.group_id, question: poll.question,
    created_by: poll.created_by, created_at: poll.created_at,
    options: (opts ?? []).map((o: any) => ({ id: o.id, text: o.text, position: o.position, votes: 0 })),
    total_votes: 0, my_vote: null,
  };
}

/** Cast / change a vote (one per poll). Pass the option_id. */
export async function voteGroupPoll(pollId: string, optionId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("group_poll_votes")
    .upsert({ poll_id: pollId, option_id: optionId, user_id: userId }, { onConflict: "poll_id,user_id" });
  if (error) throw error;
}

export async function deleteGroupPoll(pollId: string): Promise<void> {
  const { error } = await supabase.from("group_polls").delete().eq("id", pollId);
  if (error) throw error;
}
