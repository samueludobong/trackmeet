import { supabase } from "../lib/supabase";
import { rowToComment, COMMENT_SELECT, type Comment } from "../lib/feed/helpers";
import { type PinnedSong } from "../types/music";

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
  song: PinnedSong | null;
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
  "id, type, text, media_urls, song_id, song_name, song_artist, song_album_art, poll_question, poll_options, voice_url, voice_duration_ms, voice_waveform, created_at, likes_count, comments_count, community_id, users!user_id(id, username, display_name, avatar_url), communities!community_id(id, name, slug)";

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

/** Cast / change a poll vote via the SECURITY DEFINER RPC. */
export async function voteOnPoll(postId: string, optId: string, prevOptId: string | null) {
  return supabase.rpc("vote_on_poll", { p_post_id: postId, p_opt_id: optId, p_prev_opt_id: prevOptId });
}
