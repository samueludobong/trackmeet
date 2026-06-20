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
    const byId = new Map<string, Comment>(comments.map((c) => [c.id, c]));

    // Walk up parent links to the top-level ancestor. The thread UI is one level
    // deep, so a reply-to-a-reply must anchor to its top comment — otherwise it's
    // bucketed under a non-top-level id nobody renders and silently disappears.
    const topAncestorId = (c: Comment): string => {
      let cur = c;
      const seen = new Set<string>();
      while (cur.parentCommentId && byId.has(cur.parentCommentId) && !seen.has(cur.id)) {
        seen.add(cur.id);
        cur = byId.get(cur.parentCommentId)!;
      }
      return cur.id;
    };

    const topLevel: Comment[] = [];
    const repliesMap = new Map<string, Comment[]>();
    for (const c of comments) {
      if (!c.parentCommentId) { topLevel.push(c); continue; }
      const key = topAncestorId(c);
      const arr = repliesMap.get(key) ?? [];
      arr.push(c);
      repliesMap.set(key, arr);
    }
    return { topLevel, repliesMap };
  }, [comments]);

  return { comments, setComments, currentUserId, spotifyToken, grouped };
}
