import { supabase } from "../lib/supabase";

export type StoryType = "music" | "text" | "wrapped";

export type StoryAuthor = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

export type Story = {
  id: string;
  userId: string;
  type: StoryType;
  cardDesign: number;
  // Music
  songId: string | null;
  songName: string | null;
  songArtist: string | null;
  songAlbumArt: string | null;
  // Text
  text: string | null;
  bgColor: string | null;
  fgColor: string | null;
  // Wrapped
  wrappedData: any | null;
  // Caption overlay (any type)
  overlayText: string | null;
  overlayFont: string | null;
  overlayColor: string | null;
  createdAt: string;
  expiresAt: string;
  author: StoryAuthor;
};

const STORY_SELECT =
  "id, user_id, type, card_design, song_id, song_name, song_artist, song_album_art, text, bg_color, fg_color, wrapped_data, overlay_text, overlay_font, overlay_color, created_at, expires_at, users!user_id(id, username, display_name, avatar_url)";

function rowToStory(row: any): Story {
  const u = row.users ?? {};
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    cardDesign: row.card_design ?? 0,
    songId: row.song_id ?? null,
    songName: row.song_name ?? null,
    songArtist: row.song_artist ?? null,
    songAlbumArt: row.song_album_art ?? null,
    text: row.text ?? null,
    bgColor: row.bg_color ?? null,
    fgColor: row.fg_color ?? null,
    wrappedData: row.wrapped_data ?? null,
    overlayText:  row.overlay_text  ?? null,
    overlayFont:  row.overlay_font  ?? null,
    overlayColor: row.overlay_color ?? null,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    author: {
      id: u.id ?? row.user_id,
      username: u.username ?? "",
      display_name: u.display_name ?? null,
      avatar_url: u.avatar_url ?? null,
    },
  };
}

/** Fetch all live (un-expired) stories, newest first. RLS already filters expiry. */
export async function getActiveStories(): Promise<Story[]> {
  const { data, error } = await supabase
    .from("stories")
    .select(STORY_SELECT)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToStory);
}

export type CreateMusicStoryInput = {
  userId: string;
  cardDesign: number;
  songId: string;
  songName: string;
  songArtist: string;
  songAlbumArt: string | null;
  overlayText?: string | null;
  overlayFont?: string | null;
  overlayColor?: string | null;
};

export async function createMusicStory(input: CreateMusicStoryInput): Promise<Story> {
  const { data, error } = await supabase
    .from("stories")
    .insert({
      user_id: input.userId,
      type: "music",
      card_design: input.cardDesign,
      song_id: input.songId,
      song_name: input.songName,
      song_artist: input.songArtist,
      song_album_art: input.songAlbumArt,
      overlay_text:  input.overlayText  ?? null,
      overlay_font:  input.overlayFont  ?? null,
      overlay_color: input.overlayColor ?? null,
    })
    .select(STORY_SELECT)
    .single();
  if (error) throw error;
  return rowToStory(data);
}

export async function deleteStory(storyId: string): Promise<void> {
  const { error } = await supabase.from("stories").delete().eq("id", storyId);
  if (error) throw error;
}
