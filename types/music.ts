// Shared music-related types used across feed, profile, and composer features.

export type PinnedSong = {
  id: string;
  name: string;
  artist: string;
  albumArt: string | null;
  previewUrl: string | null;
};

export type NowPlayingSnap = {
  id: string;
  name: string;
  artist: string;
  albumArt: string | null;
  previewUrl: string | null;
} | null;
