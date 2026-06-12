import { supabase } from "../lib/supabase";

// Selectable note bubble colours. `null` = the default translucent bubble.
// Vibrant but dark enough that white text stays legible.
export const NOTE_COLORS: (string | null)[] = [null, "#7C3AED", "#2563EB", "#0E9F6E", "#DB2777", "#EA580C"];

// An ephemeral "note" (text or pinned song) shown in the now-listening strip.
// Joined with its author's profile for rendering.
export type Note = {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  type: "text" | "song";
  text: string | null;
  song_id: string | null;
  song_name: string | null;
  song_artist: string | null;
  song_album_art: string | null;
  color: string | null;
  created_at: string;
  expires_at: string;
  isMe: boolean;
};

/** What you write/attach when posting a note. */
export type NoteInput =
  | { type: "text"; text: string; color?: string | null }
  | { type: "song"; song_id: string; song_name: string; song_artist: string | null; song_album_art: string | null; color?: string | null };

/**
 * Live notes for the viewer + everyone they follow, newest first with the
 * viewer pinned first. Mirrors getFollowingNowListening: fetch follows, then
 * the live notes among me + follows, then attach author profiles.
 */
export const getFollowingNotes = async (): Promise<Note[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: followsRows } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id);
  const ids = [user.id, ...(followsRows ?? []).map((r: any) => r.following_id as string)];

  // Live notes (RLS already hides expired) for me + follows.
  const { data: noteRows } = await supabase
    .from("notes")
    .select("*")
    .in("user_id", ids)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });
  if (!noteRows || noteRows.length === 0) return [];

  // Attach author profiles in one query.
  const authorIds = Array.from(new Set(noteRows.map((n: any) => n.user_id as string)));
  const { data: userRows } = await supabase
    .from("users")
    .select("id, username, display_name, avatar_url")
    .in("id", authorIds);
  const byId = new Map((userRows ?? []).map((u: any) => [u.id, u]));

  const notes: Note[] = noteRows.map((n: any) => {
    const u = byId.get(n.user_id) ?? {};
    return {
      id: n.id,
      user_id: n.user_id,
      username: u.username ?? null,
      display_name: u.display_name ?? null,
      avatar_url: u.avatar_url ?? null,
      type: n.type,
      text: n.text,
      song_id: n.song_id,
      song_name: n.song_name,
      song_artist: n.song_artist,
      song_album_art: n.song_album_art,
      color: n.color ?? null,
      created_at: n.created_at,
      expires_at: n.expires_at,
      isMe: n.user_id === user.id,
    };
  });

  // Viewer first, then most-recent.
  notes.sort((a, b) => {
    if (a.isMe !== b.isMe) return a.isMe ? -1 : 1;
    return b.created_at.localeCompare(a.created_at);
  });
  return notes;
};

/** Create or replace the viewer's note (resets the 24h clock). */
export const setMyNote = async (input: NoteInput): Promise<{ error?: string }> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const row =
    input.type === "text"
      ? { user_id: user.id, type: "text", text: input.text.trim(), song_id: null, song_name: null, song_artist: null, song_album_art: null, color: input.color ?? null }
      : { user_id: user.id, type: "song", text: null, song_id: input.song_id, song_name: input.song_name, song_artist: input.song_artist, song_album_art: input.song_album_art, color: input.color ?? null };

  // Reset created_at/expires_at on replace so the 24h window restarts.
  const { error } = await supabase
    .from("notes")
    .upsert(
      { ...row, created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() },
      { onConflict: "user_id" },
    );
  if (error) return { error: error.message };
  return {};
};

/** Remove the viewer's note. */
export const deleteMyNote = async (): Promise<{ error?: string }> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const { error } = await supabase.from("notes").delete().eq("user_id", user.id);
  if (error) return { error: error.message };
  return {};
};
