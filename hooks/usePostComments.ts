import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { getValidSpotifyToken } from "../lib/spotify";
import { type Comment } from "../lib/feed/helpers";
import { getPostComments } from "../services/posts";

/** Loads the viewer, their Spotify token, and a post's comments (grouped into threads). */
export function usePostComments(postId: string) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [spotifyToken, setSpotifyToken] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        setSpotifyToken(await getValidSpotifyToken(user.id));
      }
      setComments(await getPostComments(postId));
    })();
  }, [postId]);

  const grouped = useMemo(() => {
    const topLevel: Comment[] = [];
    const repliesMap = new Map<string, Comment[]>();
    for (const c of comments) {
      if (!c.parentCommentId) topLevel.push(c);
      else {
        const arr = repliesMap.get(c.parentCommentId) ?? [];
        arr.push(c);
        repliesMap.set(c.parentCommentId, arr);
      }
    }
    return { topLevel, repliesMap };
  }, [comments]);

  return { comments, setComments, currentUserId, spotifyToken, grouped };
}
