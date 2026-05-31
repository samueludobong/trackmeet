// Types for the profile editing / settings overlays and pinned-song picker.

import { type PinnedSong } from "./music";

export type EditFormData = {
  display_name: string;
  username: string;
  bio: string;
  avatar_url: string | null;
  banner_color: string | null;
  banner_image_url: string | null;
  banner_shape: string | null;
  banner_shape_color: string | null;
  username_changed_at: string | null;
  display_name_change_count: number;
  display_name_window_start: string | null;
  pinned_song_id: string | null;
  pinned_song_name: string | null;
  pinned_song_artist: string | null;
  pinned_song_album_art: string | null;
  profile_links: string[];
  social_links: Record<string, string>;
};

export type SavedAccount = {
  email: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
};

export type BaseStep = "home" | "search" | "playlists" | { type: "playlistTracks"; id: string; name: string };
export type PinStep = BaseStep | { type: "preview"; song: PinnedSong; from: BaseStep };

export type OtherUserProfile = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  is_verified: boolean;
  followers_count: number;
  following_count: number;
  avatar_url: string | null;
  banner_color: string | null;
  banner_image_url: string | null;
  banner_shape: string | null;
  banner_shape_color: string | null;
  current_song_name: string | null;
  current_song_artist: string | null;
  current_song_id: string | null;
  current_song_album_art: string | null;
  current_song_duration_ms: number | null;
  current_song_progress_ms: number | null;
  current_song_updated_at: string | null;
  top_genres: string[] | null;
  account_type: string | null;
  pinned_song_id: string | null;
  pinned_song_name: string | null;
  pinned_song_artist: string | null;
  pinned_song_album_art: string | null;
  social_links: Record<string, string> | null;
  profile_links: string[] | null;
};
