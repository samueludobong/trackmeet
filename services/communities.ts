import { supabase } from "../lib/supabase";
import { notifyFollowersOfCommunityPost, notifyOwnerOfNewMember } from "../lib/notifications";

export type CommunityArtist = { id: string; name: string; avatar_url: string | null };

export type Community = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  banner_color: string | null;
  genres: string[];
  artist_id: string | null;
  created_by: string | null;
  is_private: boolean;
  allow_posts: boolean;
  allow_anyone_to_post: boolean;
  allow_comments: boolean;
  allow_offtopic: boolean;
  member_count: number;
  post_count: number;
  welcome_message: string | null;
  created_at: string;
};

export type CommunityNotificationPref = "all" | "meets" | "muted";

export type CreateCommunityInput = {
  name: string;
  slug?: string | null;
  description?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  bannerColor?: string | null;
  genres?: string[];
  artistId?: string | null;
  isPrivate?: boolean;
  allowPosts?: boolean;
  allowAnyoneToPost?: boolean;
  allowComments?: boolean;
  allowOfftopic?: boolean;
  tags?: string[];
  rules?: string | null;
  welcomeMessage?: string | null;
};

export const COMMUNITY_SELECT =
  "id, name, slug, description, avatar_url, banner_url, banner_color, genres, artist_id, created_by, is_private, allow_posts, allow_anyone_to_post, allow_comments, allow_offtopic, member_count, post_count, welcome_message, created_at";
const SELECT = COMMUNITY_SELECT;

/** Slug from a community name: lowercase, alphanumerics + hyphens, no leading/trailing dashes. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32) || "community";
}

/** Real-time slug availability check. Returns true if available. */
export async function isSlugAvailable(slug: string, excludeId?: string): Promise<boolean> {
  const s = slug.trim().toLowerCase();
  if (!s) return false;
  let q = supabase.from("communities").select("id").eq("slug", s).limit(1);
  if (excludeId) q = q.neq("id", excludeId);
  const { data } = await q;
  return !data || data.length === 0;
}

export async function getCommunityBySlug(slug: string): Promise<Community | null> {
  const { data } = await supabase.from("communities").select(SELECT).eq("slug", slug).maybeSingle();
  return (data as Community | null) ?? null;
}

/** Type-ahead artist suggestions from the artists table. */
export async function searchArtistsByName(query: string, limit = 6): Promise<CommunityArtist[]> {
  const q = query.trim();
  if (!q) return [];
  const { data } = await supabase
    .from("artists")
    .select("id, name, avatar_url")
    .ilike("name", `%${q}%`)
    .order("monthly_listeners", { ascending: false })
    .limit(limit);
  return (data ?? []) as CommunityArtist[];
}

/** Create a community + add the creator as its owner. */
export async function createCommunity(userId: string, input: CreateCommunityInput): Promise<Community> {
  let avatar = input.avatarUrl ?? null;
  // Default the picture to the chosen artist's avatar when none was uploaded.
  if (!avatar && input.artistId) {
    const { data: art } = await supabase.from("artists").select("avatar_url").eq("id", input.artistId).maybeSingle();
    avatar = (art?.avatar_url as string | undefined) ?? null;
  }

  const slug = (input.slug?.trim() || slugify(input.name)).toLowerCase();

  const { data, error } = await supabase
    .from("communities")
    .insert({
      creator_id: userId,
      name: input.name.trim(),
      slug,
      description: input.description?.trim() || null,
      avatar_url: avatar,
      banner_url: input.bannerUrl ?? null,
      banner_color: input.bannerColor ?? null,
      genres: input.genres ?? [],
      artist_id: input.artistId ?? null,
      is_private: input.isPrivate ?? false,
      allow_posts: input.allowPosts ?? true,
      allow_anyone_to_post: input.allowAnyoneToPost ?? true,
      allow_comments: input.allowComments ?? true,
      allow_offtopic: input.allowOfftopic ?? true,
      tags: input.tags ?? [],
      rules: input.rules?.trim() || null,
      welcome_message: input.welcomeMessage?.trim() || null,
    })
    .select(SELECT)
    .single();
  if (error) throw error;

  // Owner membership (trigger bumps member_count to 1).
  await supabase.from("community_members").insert({ community_id: data.id, user_id: userId, role: "owner" });

  return { ...(data as Community), member_count: 1 };
}

// ── Membership ─────────────────────────────────────────────────────────────────

export async function isMember(communityId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("community_members")
    .select("user_id")
    .eq("community_id", communityId)
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

export async function joinCommunity(communityId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("community_members")
    .insert({ community_id: communityId, user_id: userId, role: "member" });
  // 23505 = unique violation (already a member) — treat as success
  if (error && (error as any).code !== "23505") throw error;
  // Goal #9: ping the owner. Fire-and-forget.
  notifyOwnerOfNewMember(communityId, userId).catch(() => {});
}

export async function leaveCommunity(communityId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("community_members")
    .delete()
    .eq("community_id", communityId)
    .eq("user_id", userId);
  if (error) throw error;
}

/** Bump current user's last_active_at on the community (best-effort, fire-and-forget). */
export async function touchMembership(communityId: string, userId: string): Promise<void> {
  await supabase
    .from("community_members")
    .update({ last_active_at: new Date().toISOString() })
    .eq("community_id", communityId)
    .eq("user_id", userId);
}

/** Get notification preference for the caller in this community (defaults to 'all'). */
export async function getNotificationPref(
  communityId: string,
  userId: string,
): Promise<CommunityNotificationPref> {
  const { data } = await supabase
    .from("community_members")
    .select("notification_preference")
    .eq("community_id", communityId)
    .eq("user_id", userId)
    .maybeSingle();
  return ((data?.notification_preference as CommunityNotificationPref | undefined) ?? "all");
}

export async function setNotificationPref(
  communityId: string,
  userId: string,
  pref: CommunityNotificationPref,
): Promise<void> {
  const { error } = await supabase
    .from("community_members")
    .update({ notification_preference: pref })
    .eq("community_id", communityId)
    .eq("user_id", userId);
  if (error) throw error;
}

/** Members who posted or joined a Meet in the last 24h. */
export async function getActiveTodayCount(communityId: string): Promise<number> {
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { count } = await supabase
    .from("community_members")
    .select("user_id", { count: "exact", head: true })
    .eq("community_id", communityId)
    .gte("last_active_at", since);
  return count ?? 0;
}

export type BroadcastingMember = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  current_song_name: string | null;
  current_song_artist: string | null;
  current_song_album_art: string | null;
};

/** Community members who are currently broadcasting a song. */
export async function getBroadcastingMembers(communityId: string, limit = 30): Promise<BroadcastingMember[]> {
  const { data: mem } = await supabase
    .from("community_members")
    .select("user_id")
    .eq("community_id", communityId);
  const ids = (mem ?? []).map((m: any) => m.user_id);
  if (!ids.length) return [];
  const { data } = await supabase
    .from("users")
    .select("id, username, display_name, avatar_url, current_song_name, current_song_artist, current_song_album_art, is_broadcasting")
    .in("id", ids)
    .eq("is_broadcasting", true)
    .not("current_song_name", "is", null)
    .limit(limit);
  return (data ?? []) as BroadcastingMember[];
}

export type LiveCommunityMeet = {
  id: string;
  name: string;
  host_id: string;
  host_name: string | null;
  host_avatar: string | null;
  current_track_name: string | null;
  current_track_artist: string | null;
  current_track_album_art: string | null;
  listener_count: number;
};

/** First live meet attached to this community (host + current song + listener count). */
export async function getLiveCommunityMeet(communityId: string): Promise<LiveCommunityMeet | null> {
  const { data: meets } = await supabase
    .from("meets")
    .select("id, name, host_id, current_track_name, current_track_artist, current_track_album_art, users!host_id(display_name, username, avatar_url)")
    .eq("community_id", communityId)
    .eq("is_live", true)
    .order("created_at", { ascending: false })
    .limit(1);
  const m: any = (meets ?? [])[0];
  if (!m) return null;
  const { count } = await supabase
    .from("meet_participants")
    .select("user_id", { count: "exact", head: true })
    .eq("meet_id", m.id)
    .eq("is_active", true);
  return {
    id: m.id,
    name: m.name,
    host_id: m.host_id,
    host_name: m.users?.display_name ?? m.users?.username ?? null,
    host_avatar: m.users?.avatar_url ?? null,
    current_track_name: m.current_track_name ?? null,
    current_track_artist: m.current_track_artist ?? null,
    current_track_album_art: m.current_track_album_art ?? null,
    listener_count: count ?? 0,
  };
}

// ── Community posts ───────────────────────────────────────────────────────────

export type CommunityPostAuthor = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_verified?: boolean | null;
};

export type CommunityPost = {
  id: string;
  community_id?: string;
  text: string | null;
  song_id: string | null;
  song_name: string | null;
  song_artist: string | null;
  song_album_art: string | null;
  likes_count: number;
  comments_count: number;
  reposts_count: number;
  views_count: number;
  pinned_at: string | null;
  is_announcement: boolean;
  created_at: string;
  author: CommunityPostAuthor;
  /** Computed: posts with >50 likes or >20 comments in last 24h. */
  is_hot?: boolean;
};

const HOUR = 3600_000;

/** Engagement ranking score: likes*2 + comments*3 + reposts + 50 recency boost (<2h). */
function rankScore(p: { likes_count: number; comments_count: number; reposts_count?: number; created_at: string }): number {
  const ageMs = Date.now() - new Date(p.created_at).getTime();
  const recencyBoost = ageMs < 2 * HOUR ? 50 : 0;
  return p.likes_count * 2 + p.comments_count * 3 + (p.reposts_count ?? 0) + recencyBoost;
}

function withHotFlag(p: CommunityPost): CommunityPost {
  const ageMs = Date.now() - new Date(p.created_at).getTime();
  const fresh = ageMs < 24 * HOUR;
  return { ...p, is_hot: fresh && (p.likes_count > 50 || p.comments_count > 20) };
}

const POST_SELECT =
  "id, community_id, text, song_id, song_name, song_artist, song_album_art, likes_count, comments_count, views_count, pinned_at, is_announcement, created_at, users!user_id(id, username, display_name, avatar_url, is_verified)";

function normalizePost(r: any): CommunityPost {
  return withHotFlag({
    id: r.id,
    community_id: r.community_id,
    text: r.text ?? null,
    song_id: r.song_id ?? null,
    song_name: r.song_name ?? null,
    song_artist: r.song_artist ?? null,
    song_album_art: r.song_album_art ?? null,
    likes_count: r.likes_count ?? 0,
    comments_count: r.comments_count ?? 0,
    reposts_count: r.reposts_count ?? 0,
    views_count: r.views_count ?? 0,
    pinned_at: r.pinned_at ?? null,
    is_announcement: r.is_announcement ?? false,
    created_at: r.created_at,
    author: r.users,
  });
}

/** Engagement-ranked feed for a community (2h recency boost); pinned posts first. */
export async function getCommunityPosts(communityId: string, limit = 50): Promise<CommunityPost[]> {
  const { data, error } = await supabase
    .from("community_posts")
    .select(POST_SELECT)
    .eq("community_id", communityId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  const posts = (data ?? []).map(normalizePost);
  const pinned = posts.filter((p) => p.pinned_at)
    .sort((a, b) => new Date(b.pinned_at!).getTime() - new Date(a.pinned_at!).getTime());
  const rest = posts.filter((p) => !p.pinned_at).sort((a, b) => rankScore(b) - rankScore(a));
  return [...pinned, ...rest];
}

export async function createCommunityPost(
  communityId: string,
  userId: string,
  input: {
    text?: string | null;
    song?: { id: string; name: string; artist: string | null; albumArt: string | null } | null;
    isAnnouncement?: boolean;
  },
): Promise<CommunityPost> {
  const { data, error } = await supabase
    .from("community_posts")
    .insert({
      community_id: communityId,
      user_id: userId,
      text: input.text?.trim() || null,
      song_id: input.song?.id ?? null,
      song_name: input.song?.name ?? null,
      song_artist: input.song?.artist ?? null,
      song_album_art: input.song?.albumArt ?? null,
      is_announcement: input.isAnnouncement ?? false,
    })
    .select(POST_SELECT)
    .single();
  if (error) throw error;

  // Goal #14/#17: mirror into the main posts table tagged with community_id so
  // the post is also discoverable from the personal/main feed. Best-effort.
  supabase.from("posts").insert({
    user_id: userId,
    type: input.song ? "song" : "text",
    text: input.text?.trim() || null,
    community_id: communityId,
  }).then(() => {}, () => {});

  // Bump caller's last_active_at so they count toward "Active Today".
  touchMembership(communityId, userId).catch(() => {});

  // Goal #9: tell members who follow the author that they just posted.
  const preview = (input.text?.trim() || (input.song ? `🎵 ${input.song.name}` : "")).slice(0, 80);
  notifyFollowersOfCommunityPost(userId, communityId, preview).catch(() => {});

  return normalizePost(data);
}

export type CommunityStory = {
  id: string;
  name: string;
  avatarUrl: string | null;
  albumArt: string | null;
  song: string | null;
};

/** People across the user's communities who are currently listening to something. */
export async function getCommunityStories(userId: string): Promise<CommunityStory[]> {
  const { data: mem } = await supabase.from("community_members").select("community_id").eq("user_id", userId);
  const cids = (mem ?? []).map((m: any) => m.community_id);
  if (!cids.length) return [];

  const { data: members } = await supabase
    .from("community_members")
    .select("user_id")
    .in("community_id", cids)
    .neq("user_id", userId);
  const uids = [...new Set((members ?? []).map((m: any) => m.user_id))];
  if (!uids.length) return [];

  const { data: users } = await supabase
    .from("users")
    .select("id, username, display_name, avatar_url, current_song_name, current_song_album_art")
    .in("id", uids);

  return (users ?? [])
    .filter((u: any) => u.current_song_name)
    .map((u: any) => ({
      id: u.id,
      name: u.display_name || u.username || "User",
      avatarUrl: u.avatar_url,
      albumArt: u.current_song_album_art,
      song: u.current_song_name,
    }));
}

export type CommunityFeedItem = { post: CommunityPost; community: Community };

/** Posts from every community the user belongs to, newest first (sidebar feed). */
export async function getCommunityFeed(userId: string, limit = 60): Promise<CommunityFeedItem[]> {
  const { data: mem } = await supabase.from("community_members").select("community_id").eq("user_id", userId);
  const ids = (mem ?? []).map((m: any) => m.community_id);
  if (!ids.length) return [];

  const { data, error } = await supabase
    .from("community_posts")
    .select(`${POST_SELECT}, communities!inner(${SELECT})`)
    .in("community_id", ids)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map((r: any) => ({
    post: normalizePost(r),
    community: r.communities as Community,
  }));
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export type CommunityRole = "owner" | "moderator" | "member";

export type CommunityMember = {
  user_id: string;
  role: CommunityRole;
  joined_at: string;
  user: CommunityPostAuthor;
};

export type CommunityUpdate = {
  name?: string;
  slug?: string;
  description?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  bannerColor?: string | null;
  genres?: string[];
  artistId?: string | null;
  isPrivate?: boolean;
  allowPosts?: boolean;
  allowAnyoneToPost?: boolean;
  allowComments?: boolean;
  allowOfftopic?: boolean;
  tags?: string[];
  rules?: string | null;
  welcomeMessage?: string | null;
};

/** Caller's role in a community, or null if not a member. */
export async function getMyRole(communityId: string, userId: string): Promise<CommunityRole | null> {
  const { data } = await supabase
    .from("community_members")
    .select("role")
    .eq("community_id", communityId)
    .eq("user_id", userId)
    .maybeSingle();
  return (data?.role as CommunityRole | undefined) ?? null;
}

export async function updateCommunity(communityId: string, patch: CommunityUpdate): Promise<Community> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) row.name = patch.name.trim();
  if (patch.slug !== undefined) row.slug = patch.slug.trim().toLowerCase();
  if (patch.description !== undefined) row.description = patch.description?.trim() || null;
  if (patch.avatarUrl !== undefined) row.avatar_url = patch.avatarUrl;
  if (patch.bannerUrl !== undefined) row.banner_url = patch.bannerUrl;
  if (patch.bannerColor !== undefined) row.banner_color = patch.bannerColor;
  if (patch.genres !== undefined) row.genres = patch.genres;
  if (patch.artistId !== undefined) row.artist_id = patch.artistId;
  if (patch.isPrivate !== undefined) row.is_private = patch.isPrivate;
  if (patch.allowPosts !== undefined) row.allow_posts = patch.allowPosts;
  if (patch.allowAnyoneToPost !== undefined) row.allow_anyone_to_post = patch.allowAnyoneToPost;
  if (patch.allowComments !== undefined) row.allow_comments = patch.allowComments;
  if (patch.allowOfftopic !== undefined) row.allow_offtopic = patch.allowOfftopic;
  if (patch.tags !== undefined) row.tags = patch.tags;
  if (patch.rules !== undefined) row.rules = patch.rules?.trim() || null;
  if (patch.welcomeMessage !== undefined) row.welcome_message = patch.welcomeMessage?.trim() || null;

  const { data, error } = await supabase
    .from("communities")
    .update(row)
    .eq("id", communityId)
    .select(SELECT)
    .single();
  if (error) throw error;
  return data as Community;
}

export async function deleteCommunity(communityId: string): Promise<void> {
  const { error } = await supabase.from("communities").delete().eq("id", communityId);
  if (error) throw error;
}

export async function getCommunityRules(communityId: string): Promise<string | null> {
  const { data } = await supabase.from("communities").select("rules").eq("id", communityId).maybeSingle();
  return (data?.rules as string | null | undefined) ?? null;
}

export async function getCommunityTags(communityId: string): Promise<string[]> {
  const { data } = await supabase.from("communities").select("tags").eq("id", communityId).maybeSingle();
  return ((data?.tags as string[] | undefined) ?? []) as string[];
}

export async function listMembers(communityId: string, limit = 200): Promise<CommunityMember[]> {
  const { data, error } = await supabase
    .from("community_members")
    .select("user_id, role, joined_at, users!user_id(id, username, display_name, avatar_url, is_verified)")
    .eq("community_id", communityId)
    .order("joined_at", { ascending: true })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map((r: any) => ({
    user_id: r.user_id,
    role: r.role,
    joined_at: r.joined_at,
    user: r.users,
  })) as CommunityMember[];
}

export async function setMemberRole(communityId: string, userId: string, role: CommunityRole): Promise<void> {
  const { error } = await supabase
    .from("community_members")
    .update({ role })
    .eq("community_id", communityId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function removeMember(communityId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("community_members")
    .delete()
    .eq("community_id", communityId)
    .eq("user_id", userId);
  if (error) throw error;
}

/** Promote target to owner, demote caller to moderator, and update communities.creator_id. */
export async function transferOwnership(communityId: string, fromUserId: string, toUserId: string): Promise<void> {
  await setMemberRole(communityId, toUserId, "owner");
  await setMemberRole(communityId, fromUserId, "moderator");
  const { error } = await supabase.from("communities").update({ creator_id: toUserId }).eq("id", communityId);
  if (error) throw error;
}

export async function deleteCommunityPost(postId: string): Promise<void> {
  const { error } = await supabase.from("community_posts").delete().eq("id", postId);
  if (error) throw error;
}

// ── Post likes ────────────────────────────────────────────────────────────────

/** Which of `postIds` the viewer has liked. Pass the visible feed's ids. */
export async function getMyLikedCommunityPostIds(userId: string, postIds: string[]): Promise<Set<string>> {
  if (!postIds.length) return new Set();
  const { data } = await supabase
    .from("community_post_likes")
    .select("post_id")
    .eq("user_id", userId)
    .in("post_id", postIds);
  return new Set((data ?? []).map((r: any) => r.post_id as string));
}

/** Like/unlike. Returns the liked state actually persisted. */
export async function toggleCommunityPostLike(postId: string, userId: string, like: boolean): Promise<boolean> {
  if (like) {
    const { error } = await supabase.from("community_post_likes").insert({ post_id: postId, user_id: userId });
    if (error && (error as any).code !== "23505") throw error;
    return true;
  }
  const { error } = await supabase
    .from("community_post_likes")
    .delete()
    .eq("post_id", postId)
    .eq("user_id", userId);
  if (error) throw error;
  return false;
}

// ── Post comments ─────────────────────────────────────────────────────────────

export type CommunityPostComment = {
  id: string;
  post_id: string;
  text: string;
  created_at: string;
  author: CommunityPostAuthor;
};

const COMMENT_SELECT =
  "id, post_id, text, created_at, users!user_id(id, username, display_name, avatar_url, is_verified)";

export async function getCommunityPostComments(postId: string, limit = 100): Promise<CommunityPostComment[]> {
  const { data, error } = await supabase
    .from("community_post_comments")
    .select(COMMENT_SELECT)
    .eq("post_id", postId)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map((r: any) => ({
    id: r.id, post_id: r.post_id, text: r.text, created_at: r.created_at, author: r.users,
  }));
}

export async function addCommunityPostComment(postId: string, userId: string, text: string): Promise<CommunityPostComment> {
  const { data, error } = await supabase
    .from("community_post_comments")
    .insert({ post_id: postId, user_id: userId, text: text.trim() })
    .select(COMMENT_SELECT)
    .single();
  if (error) throw error;
  const r: any = data;
  return { id: r.id, post_id: r.post_id, text: r.text, created_at: r.created_at, author: r.users };
}

export async function deleteCommunityPostComment(commentId: string): Promise<void> {
  const { error } = await supabase.from("community_post_comments").delete().eq("id", commentId);
  if (error) throw error;
}

// ── Pins + announcements (admin) ──────────────────────────────────────────────

export async function setCommunityPostPinned(postId: string, pinned: boolean): Promise<void> {
  const { error } = await supabase
    .from("community_posts")
    .update({ pinned_at: pinned ? new Date().toISOString() : null })
    .eq("id", postId);
  if (error) throw error;
}

export async function setCommunityPostAnnouncement(postId: string, isAnnouncement: boolean): Promise<void> {
  const { error } = await supabase
    .from("community_posts")
    .update({ is_announcement: isAnnouncement })
    .eq("id", postId);
  if (error) throw error;
}

// ── Join requests (private communities) ───────────────────────────────────────

export type JoinRequestStatus = "pending" | "approved" | "denied";

export type CommunityJoinRequest = {
  community_id: string;
  user_id: string;
  message: string | null;
  status: JoinRequestStatus;
  created_at: string;
  user: CommunityPostAuthor;
};

export async function requestToJoin(communityId: string, userId: string, message?: string | null): Promise<void> {
  const { error } = await supabase
    .from("community_join_requests")
    .insert({ community_id: communityId, user_id: userId, message: message?.trim() || null });
  // 23505 — request already exists; treat as success (status unchanged).
  if (error && (error as any).code !== "23505") throw error;
}

export async function cancelJoinRequest(communityId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("community_join_requests")
    .delete()
    .eq("community_id", communityId)
    .eq("user_id", userId);
  if (error) throw error;
}

/** Viewer's request status for this community, or null if none. */
export async function getMyJoinRequestStatus(communityId: string, userId: string): Promise<JoinRequestStatus | null> {
  const { data } = await supabase
    .from("community_join_requests")
    .select("status")
    .eq("community_id", communityId)
    .eq("user_id", userId)
    .maybeSingle();
  return (data?.status as JoinRequestStatus | undefined) ?? null;
}

export async function listJoinRequests(communityId: string): Promise<CommunityJoinRequest[]> {
  const { data, error } = await supabase
    .from("community_join_requests")
    .select("community_id, user_id, message, status, created_at, users!user_id(id, username, display_name, avatar_url, is_verified)")
    .eq("community_id", communityId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (error) return [];
  return (data ?? []).map((r: any) => ({
    community_id: r.community_id, user_id: r.user_id, message: r.message,
    status: r.status, created_at: r.created_at, user: r.users,
  }));
}

/** Approve atomically (marks approved + inserts membership) via SECURITY DEFINER RPC. */
export async function approveJoinRequest(communityId: string, userId: string): Promise<void> {
  const { error } = await supabase.rpc("approve_community_join_request", { cid: communityId, uid: userId });
  if (error) throw error;
}

export async function denyJoinRequest(communityId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("community_join_requests")
    .update({ status: "denied", resolved_at: new Date().toISOString() })
    .eq("community_id", communityId)
    .eq("user_id", userId)
    .eq("status", "pending");
  if (error) throw error;
}

// ── Bans ──────────────────────────────────────────────────────────────────────

export type CommunityBan = {
  community_id: string;
  user_id: string;
  reason: string | null;
  created_at: string;
  user: CommunityPostAuthor;
};

/** Ban = insert ban row + remove membership. Banned users can't rejoin or post (RLS). */
export async function banMember(communityId: string, userId: string, reason?: string | null): Promise<void> {
  const { error } = await supabase
    .from("community_bans")
    .insert({ community_id: communityId, user_id: userId, banned_by: (await supabase.auth.getUser()).data.user?.id ?? null, reason: reason?.trim() || null });
  if (error && (error as any).code !== "23505") throw error;
  await removeMember(communityId, userId).catch(() => {});
  // Clear any stale join request so a future unban lets them request again.
  await supabase.from("community_join_requests").delete()
    .eq("community_id", communityId).eq("user_id", userId);
}

export async function unbanMember(communityId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("community_bans")
    .delete()
    .eq("community_id", communityId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function listBans(communityId: string): Promise<CommunityBan[]> {
  const { data, error } = await supabase
    .from("community_bans")
    .select("community_id, user_id, reason, created_at, users!user_id(id, username, display_name, avatar_url, is_verified)")
    .eq("community_id", communityId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []).map((r: any) => ({
    community_id: r.community_id, user_id: r.user_id, reason: r.reason,
    created_at: r.created_at, user: r.users,
  }));
}

// ── Insights (admin analytics, computed from existing tables) ─────────────────

export type CommunityInsights = {
  /** New members per day, oldest→newest, 7 entries. */
  joinsPerDay: { day: string; count: number }[];
  /** Posts per day, oldest→newest, 7 entries. */
  postsPerDay: { day: string; count: number }[];
  totalLikes: number;
  totalComments: number;
  topPosters: { user: CommunityPostAuthor; posts: number }[];
};

export async function getCommunityInsights(communityId: string): Promise<CommunityInsights> {
  const since = new Date(Date.now() - 7 * 24 * 3600_000);
  since.setHours(0, 0, 0, 0);

  const [{ data: joins }, { data: posts }] = await Promise.all([
    supabase.from("community_members").select("joined_at").eq("community_id", communityId).gte("joined_at", since.toISOString()),
    supabase.from("community_posts")
      .select("created_at, likes_count, comments_count, users!user_id(id, username, display_name, avatar_url, is_verified)")
      .eq("community_id", communityId).gte("created_at", since.toISOString()),
  ]);

  const dayKey = (d: Date) => d.toLocaleDateString([], { weekday: "short" });
  const days: { day: string; start: number; end: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - i);
    const end = new Date(start); end.setDate(end.getDate() + 1);
    days.push({ day: dayKey(start), start: start.getTime(), end: end.getTime() });
  }
  const bucket = (rows: { t: number }[]) =>
    days.map(({ day, start, end }) => ({ day, count: rows.filter((r) => r.t >= start && r.t < end).length }));

  const joinTimes = (joins ?? []).map((r: any) => ({ t: new Date(r.joined_at).getTime() }));
  const postRows = (posts ?? []) as any[];
  const postTimes = postRows.map((r) => ({ t: new Date(r.created_at).getTime() }));

  let totalLikes = 0, totalComments = 0;
  const byPoster = new Map<string, { user: CommunityPostAuthor; posts: number }>();
  for (const r of postRows) {
    totalLikes += r.likes_count ?? 0;
    totalComments += r.comments_count ?? 0;
    const u = r.users as CommunityPostAuthor | null;
    if (u?.id) {
      const cur = byPoster.get(u.id) ?? { user: u, posts: 0 };
      cur.posts += 1;
      byPoster.set(u.id, cur);
    }
  }
  const topPosters = [...byPoster.values()].sort((a, b) => b.posts - a.posts).slice(0, 5);

  return {
    joinsPerDay: bucket(joinTimes),
    postsPerDay: bucket(postTimes),
    totalLikes,
    totalComments,
    topPosters,
  };
}

// ── Discovery / Phase 2 ───────────────────────────────────────────────────────

export const MUSIC_GENRES = [
  "Pop", "Hip-Hop", "R&B", "Rock", "Indie", "Alternative", "Electronic",
  "House", "Techno", "Drum & Bass", "Jazz", "Soul", "Funk", "Classical",
  "Country", "Folk", "Metal", "Punk", "K-Pop", "Latin", "Reggae",
  "Afrobeats", "Lo-fi", "Ambient", "Experimental",
] as const;

export type CommunityCard = Community & {
  is_live: boolean;
  is_trending: boolean;
  unread: boolean;
};

/** Joined communities + per-community unread flag (new posts since lastVisitMs). */
export async function getJoinedCommunitiesWithUnread(
  userId: string,
  lastVisitByCommunity: Record<string, number>,
): Promise<CommunityCard[]> {
  const mine = await getMyCommunities(userId);
  if (!mine.length) return [];
  const ids = mine.map((c) => c.id);

  // Latest post per community.
  const { data: latest } = await supabase
    .from("community_posts")
    .select("community_id, created_at")
    .in("community_id", ids)
    .order("created_at", { ascending: false });
  const newestByCommunity = new Map<string, number>();
  for (const r of (latest ?? []) as any[]) {
    if (!newestByCommunity.has(r.community_id)) {
      newestByCommunity.set(r.community_id, new Date(r.created_at).getTime());
    }
  }

  // Active live meets per community.
  const { data: liveMeets } = await supabase
    .from("meets")
    .select("community_id")
    .in("community_id", ids)
    .eq("is_live", true);
  const live = new Set((liveMeets ?? []).map((m: any) => m.community_id));

  return mine.map((c) => {
    const newest = newestByCommunity.get(c.id) ?? 0;
    const lastSeen = lastVisitByCommunity[c.id] ?? 0;
    return { ...c, is_live: live.has(c.id), is_trending: false, unread: newest > lastSeen };
  });
}

/** Recommended communities based on viewer's top Spotify genres + trending fallback. */
export async function getDiscoverCommunities(userId: string, limit = 20): Promise<CommunityCard[]> {
  const { data: me } = await supabase.from("users").select("top_genres").eq("id", userId).maybeSingle();
  const genres = (me?.top_genres as string[] | null) ?? [];

  const { data: mine } = await supabase.from("community_members").select("community_id").eq("user_id", userId);
  const excludeIds = (mine ?? []).map((m: any) => m.community_id);

  let q = supabase
    .from("communities")
    .select(SELECT)
    .eq("is_private", false)
    .order("member_count", { ascending: false })
    .limit(limit);
  if (excludeIds.length) q = q.not("id", "in", `(${excludeIds.join(",")})`);
  if (genres.length) q = q.overlaps("genres", genres);

  let { data } = await q;
  // Fallback: if no genre matches, drop the genre filter.
  if (!data || data.length === 0) {
    let q2 = supabase
      .from("communities")
      .select(SELECT)
      .eq("is_private", false)
      .order("member_count", { ascending: false })
      .limit(limit);
    if (excludeIds.length) q2 = q2.not("id", "in", `(${excludeIds.join(",")})`);
    ({ data } = await q2);
  }

  const ids = (data ?? []).map((c: any) => c.id);
  if (!ids.length) return [];

  // Live + trending lookups in parallel.
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const [{ data: liveMeets }, { data: newMembers }, { data: newPosts }] = await Promise.all([
    supabase.from("meets").select("community_id").in("community_id", ids).eq("is_live", true),
    supabase.from("community_members").select("community_id").in("community_id", ids).gte("joined_at", since),
    supabase.from("community_posts").select("community_id").in("community_id", ids).gte("created_at", since),
  ]);

  const live = new Set((liveMeets ?? []).map((m: any) => m.community_id));
  const counts: Record<string, number> = {};
  for (const r of (newMembers ?? []) as any[]) counts[r.community_id] = (counts[r.community_id] ?? 0) + 1;
  for (const r of (newPosts ?? []) as any[]) counts[r.community_id] = (counts[r.community_id] ?? 0) + 1;
  // Trending: top 25% by 24h activity, minimum 3 events.
  const sorted = Object.entries(counts).filter(([, n]) => n >= 3).sort(([, a], [, b]) => b - a);
  const trendingCutoff = Math.max(1, Math.ceil(sorted.length * 0.25));
  const trending = new Set(sorted.slice(0, trendingCutoff).map(([id]) => id));

  return (data as Community[]).map((c) => ({
    ...c,
    is_live: live.has(c.id),
    is_trending: trending.has(c.id),
    unread: false,
  }));
}

/** Communities the user belongs to (includes ones they created), newest first. */
export async function getMyCommunities(userId: string): Promise<Community[]> {
  const { data, error } = await supabase
    .from("community_members")
    .select(`joined_at, communities!inner(${SELECT})`)
    .eq("user_id", userId)
    .order("joined_at", { ascending: false });
  if (error) return [];
  return (data ?? []).map((r: any) => r.communities as Community);
}
