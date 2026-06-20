import { supabase } from "../lib/supabase";
import { rowToComment, COMMENT_SELECT, type Comment } from "../lib/feed/helpers";

/** Song attached to a comment — a Spotify pick or a pasted multi-provider link. */
export type CommentSong = {
  id: string | null;        // Spotify track id when known (null for non-Spotify-only)
  name: string;
  artist: string | null;
  albumArt: string | null;
  url?: string | null;      // source streaming link (pasted-link attachments)
  provider?: string | null;
  links?: { platform: string; url: string }[] | null;
};

/** Fetch all comments for a post, oldest first. */
export async function getPostComments(postId: string): Promise<Comment[]> {
  const { data } = await supabase
    .from("post_comments")
    .select(COMMENT_SELECT)
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  return (data ?? []).map(rowToComment);
}

/** Insert a comment (optionally with an attached song) and return it. */
export async function addPostComment(input: {
  postId: string;
  userId: string;
  text: string;
  parentCommentId: string | null;
  song: CommentSong | null;
}): Promise<Comment> {
  const { postId, userId, text, parentCommentId, song } = input;
  const { data, error } = await supabase
    .from("post_comments")
    .insert({
      post_id: postId,
      user_id: userId,
      text,
      parent_comment_id: parentCommentId,
      ...(song && {
        song_id: song.id,
        song_name: song.name,
        song_artist: song.artist,
        song_album_art: song.albumArt,
        song_url: song.url ?? null,
        song_provider: song.provider ?? null,
        song_links: song.links ?? null,
      }),
    })
    .select(COMMENT_SELECT)
    .single();
  if (error) throw error;
  return rowToComment(data);
}

import { dbRowToPost } from "../lib/feed/helpers";
import { type Post } from "../app/data/mock";

const FEED_POST_SELECT =
  "id, type, text, media_urls, media_aspect, song_id, song_name, song_artist, song_album_art, song_preview_url, song_url, song_provider, song_links, poll_question, poll_options, voice_url, voice_duration_ms, voice_waveform, created_at, likes_count, comments_count, reposts_count, users!user_id(id, username, display_name, avatar_url, is_verified)";

/** Fetch the latest feed posts (newest first). */
export async function getFeedPosts(limit = 50): Promise<Post[]> {
  const { data, error } = await supabase
    .from("posts")
    .select(FEED_POST_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(dbRowToPost);
}

/** Return the set of post ids the user has liked. */
export async function getLikedPostIds(userId: string): Promise<Set<string>> {
  const { data } = await supabase.from("post_likes").select("post_id").eq("user_id", userId);
  return new Set((data ?? []).map((r: any) => r.post_id));
}

/** Toggle a like via the toggle_post_like RPC; returns the new count + liked state. */
export async function togglePostLike(postId: string, userId: string): Promise<{ likes_count: number; liked: boolean }> {
  const { data, error } = await supabase.rpc("toggle_post_like", { p_post_id: postId, p_user_id: userId });
  if (error) throw error;
  return data as { likes_count: number; liked: boolean };
}

/** Return the set of post ids the user has reposted. */
export async function getRepostedPostIds(userId: string): Promise<Set<string>> {
  const { data } = await supabase.from("post_reposts").select("post_id").eq("user_id", userId);
  return new Set((data ?? []).map((r: any) => r.post_id));
}

/** Toggle a repost via the toggle_post_repost RPC; returns count + reposted state. */
export async function togglePostRepost(postId: string, userId: string): Promise<{ reposts_count: number; reposted: boolean }> {
  const { data, error } = await supabase.rpc("toggle_post_repost", { p_post_id: postId, p_user_id: userId });
  if (error) throw error;
  return data as { reposts_count: number; reposted: boolean };
}

/**
 * Fetch the posts a user has reposted (most-recently reposted first). Used by
 * the profile "Reposts" tab. Joins through post_reposts → posts so we get the
 * full post data plus the repost timestamp for ordering.
 */
export async function getUserReposts(userId: string): Promise<Post[]> {
  const { data, error } = await supabase
    .from("post_reposts")
    .select(`created_at, posts!post_id(${FEED_POST_SELECT})`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? [])
    .map((r: any) => (Array.isArray(r.posts) ? r.posts[0] : r.posts))
    .filter(Boolean)
    .map(dbRowToPost);
}

/** Delete a post (RLS restricts this to the owner). */
export async function deletePost(postId: string): Promise<void> {
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) throw error;
}

/** Insert a post and return the hydrated Post. */
export async function createPost(payload: Record<string, any>): Promise<Post> {
  const { data, error } = await supabase.from("posts").insert(payload).select(FEED_POST_SELECT).single();
  if (error) throw error;
  return dbRowToPost(data);
}

/** Toggle a like on a comment (fire-and-forget RPC). */
export function toggleCommentLike(commentId: string, userId: string) {
  return supabase.rpc("toggle_comment_like", { p_comment_id: commentId, p_user_id: userId });
}

/** Cast / change a poll vote. The RPC is server-authoritative — it looks up
 *  the user's existing vote in `poll_votes` and decides insert/change/no-op,
 *  so the same user can't double-vote by remounting the card. */
export async function voteOnPoll(postId: string, optId: string) {
  return supabase.rpc("vote_on_poll", { p_post_id: postId, p_opt_id: optId });
}

/** Returns a Map of postId → optId for every poll the user has voted on. */
export async function getMyPollVotes(userId: string): Promise<Map<string, string>> {
  const { data } = await supabase
    .from("poll_votes")
    .select("post_id, opt_id")
    .eq("user_id", userId);
  const map = new Map<string, string>();
  (data ?? []).forEach((r: any) => map.set(r.post_id, r.opt_id));
  return map;
}
