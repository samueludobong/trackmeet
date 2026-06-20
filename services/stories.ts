import { supabase } from "../lib/supabase";

export type StoryType = "music" | "text" | "wrapped";

export type StoryAuthor = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

// ─── Free-form canvas layout (Instagram-style editor) ────────────────────────
// x/y are offsets from the canvas centre normalised by canvas width/height;
// rotation is radians. Element order is z-order (first = bottom).
export type StoryCanvasBg = { type: "gradient"; colors: string[] };

export type StoryCanvasCardEl = {
  type: "card";
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

export type StoryCanvasTextEl = {
  type: "text";
  text: string;
  font: string;
  color: string;
  /** Render the text on a solid pill of `color` (text flips to a readable contrast color). */
  bg: boolean;
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

export type StoryCanvasElement = StoryCanvasCardEl | StoryCanvasTextEl;

export type StoryCanvas = {
  v: 1;
  bg: StoryCanvasBg;
  elements: StoryCanvasElement[];
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
  // Caption overlay (any type) — legacy, pre-canvas stories only
  overlayText: string | null;
  overlayFont: string | null;
  overlayColor: string | null;
  // Free-form canvas layout; when set the viewer replays it instead of the
  // legacy fixed layout.
  canvas: StoryCanvas | null;
  /** How long the story shows (ms). Author-chosen 5 / 15 / 30s; default 5s. */
  durationMs: number;
  createdAt: string;
  expiresAt: string;
  author: StoryAuthor;
};

const STORY_SELECT =
  "id, user_id, type, card_design, song_id, song_name, song_artist, song_album_art, text, bg_color, fg_color, wrapped_data, overlay_text, overlay_font, overlay_color, canvas, duration_ms, created_at, expires_at, users!user_id(id, username, display_name, avatar_url)";

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
    canvas: row.canvas ?? null,
    durationMs: row.duration_ms ?? 5000,
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

/** Fetch all live (un-expired) stories, oldest first so they play in the order
 *  they were posted. RLS already filters expiry. */
export async function getActiveStories(): Promise<Story[]> {
  const { data, error } = await supabase
    .from("stories")
    .select(STORY_SELECT)
    .order("created_at", { ascending: true });
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
  canvas?: StoryCanvas | null;
  durationMs?: number;
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
      canvas: input.canvas ?? null,
      duration_ms: input.durationMs ?? 5000,
    })
    .select(STORY_SELECT)
    .single();
  if (error) throw error;
  return rowToStory(data);
}

export type CreateTextStoryInput = {
  userId: string;
  text: string;
  bgColor: string;
  fgColor: string;
  durationMs?: number;
};

export async function createTextStory(input: CreateTextStoryInput): Promise<Story> {
  const { data, error } = await supabase
    .from("stories")
    .insert({
      user_id: input.userId,
      type: "text",
      card_design: 0,
      text: input.text,
      bg_color: input.bgColor,
      fg_color: input.fgColor,
      duration_ms: input.durationMs ?? 5000,
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
