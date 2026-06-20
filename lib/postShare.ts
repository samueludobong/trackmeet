import { type Post } from "../app/data/mock";

/** Deep link to a post. Uses the app's `trackmeet://` scheme (see app.json). */
export function postShareUrl(postId: string): string {
  return `trackmeet://post/${postId}`;
}

/** Whether a post should show the song card + original-link affordances. */
export function isMusicPost(post: Post): boolean {
  return post.type === "music" || !!post.song || !!post.songId || !!post.songUrl;
}

/** The text body used when sharing a post (to a chat, social app, or clipboard). */
export function postShareText(post: Post, link: string): string {
  if (isMusicPost(post)) {
    const title = [post.song, post.artist].filter(Boolean).join(" — ");
    return title ? `🎵 ${title}\n${link}` : link;
  }
  return post.text ? `${post.text}\n${link}` : link;
}
