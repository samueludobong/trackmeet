import { type Post } from "../../app/data/mock";

// ─── Relative time formatting ─────────────────────────────────────────────────
// Shared by the post and comment adapters: "just now" / "5m" / "3h" / "2d".
function relativeTime(createdAt: string): string {
  const diffMin = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h`;
  return `${Math.floor(diffMin / 1440)}d`;
}

// ─── DB row → Post adapter ────────────────────────────────────────────────────

export function dbRowToPost(row: any): Post {
  const author = Array.isArray(row.users) ? row.users[0] : row.users;
  const time = relativeTime(row.created_at);
  const name = author?.display_name ?? author?.username ?? "User";
  const words = name.trim().split(/\s+/);
  const initials =
    words.length > 1
      ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  return {
    id: row.id,
    authorId: author?.id ?? undefined,
    user: author?.username ?? "user",
    handle: `@${author?.username ?? "user"}`,
    initials,
    avatarColor: "#AB00FF",
    avatarUrl: author?.avatar_url ?? null,
    isVerified: author?.is_verified ?? false,
    bio: author?.display_name ?? null,
    time,
    text: row.text ?? undefined,
    type: row.type as Post["type"],
    mediaUrls: row.media_urls ?? [],
    mediaAspect: row.media_aspect ?? null,
    song:     row.song_name      ?? undefined,
    artist:   row.song_artist    ?? undefined,
    songId:   row.song_id        ?? undefined,
    songUrl:      row.song_url      ?? null,
    songProvider: row.song_provider ?? null,
    songLinks:    row.song_links    ?? null,
    albumArt: row.song_album_art ?? undefined,
    previewUrl: row.song_preview_url ?? null,
    pollQuestion: row.poll_question ?? undefined,
    pollOptions: row.poll_options ?? undefined,
    totalVotes: row.poll_options
      ? (row.poll_options as any[]).reduce((s: number, o: any) => s + (o.votes ?? 0), 0)
      : undefined,
    likes: row.likes_count ?? 0,
    comments: row.comments_count ?? 0,
    shares: 0,
    reposts: row.reposts_count ?? 0,
    voiceUrl: row.voice_url ?? null,
    voiceDurationMs: row.voice_duration_ms ?? null,
    voiceWaveform: row.voice_waveform ?? null,
  };
}

// ─── Comment type + adapter ───────────────────────────────────────────────────

export type Comment = {
  id: string;
  postId: string;
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  text: string;
  likesCount: number;
  parentCommentId: string | null;
  time: string;
  // Optional song attachment
  songId: string | null;
  songName: string | null;
  songArtist: string | null;
  songAlbumArt: string | null;
  // Multi-provider pasted-link fields (Odesli). songId stays the Spotify id when matched.
  songUrl: string | null;
  songProvider: string | null;
  songLinks: { platform: string; url: string }[] | null;
};

export function rowToComment(row: any): Comment {
  const author = Array.isArray(row.users) ? row.users[0] : row.users;
  return {
    id:              row.id,
    postId:          row.post_id,
    userId:          row.user_id,
    username:        author?.username   ?? "user",
    displayName:     author?.display_name ?? null,
    avatarUrl:       author?.avatar_url   ?? null,
    text:            row.text ?? "",
    likesCount:      row.likes_count    ?? 0,
    parentCommentId: row.parent_comment_id ?? null,
    time:            relativeTime(row.created_at),
    songId:      row.song_id        ?? null,
    songName:    row.song_name      ?? null,
    songArtist:  row.song_artist    ?? null,
    songAlbumArt:row.song_album_art ?? null,
    songUrl:      row.song_url      ?? null,
    songProvider: row.song_provider ?? null,
    songLinks:    row.song_links    ?? null,
  };
}

export const COMMENT_SELECT =
  "id, post_id, user_id, parent_comment_id, text, likes_count, created_at, song_id, song_name, song_artist, song_album_art, song_url, song_provider, song_links, users!user_id(id, username, display_name, avatar_url)";

// ─── Color luminance ──────────────────────────────────────────────────────────

export function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

export function daysRemaining(fromIso: string, totalDays: number): number {
  const elapsed = Math.floor((Date.now() - new Date(fromIso).getTime()) / 86_400_000);
  return Math.max(0, totalDays - elapsed);
}

// ─── Spotify URL parser + metadata fetcher (used by LinksSheet) ───────────────

export { parseSpotifyUrl, fetchSpotifyLinkInfo, type SpotifyLinkInfo } from "../spotify";
