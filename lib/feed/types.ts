// ─── Curated playlist types ───────────────────────────────────────────────────

export type CuratedPlaylist = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  tags: string[];
  show_on_profile: boolean;
  created_at: string;
};

export type CuratedSong = {
  id: string;
  playlist_id: string;
  spotify_track_id: string | null;        // null for non-Spotify (pasted-link) songs
  track_name: string;
  track_artist: string;
  album_art: string | null;
  duration_ms: number;
  position: number;
  // Multi-provider fields (pasted-link songs). Spotify songs leave these null.
  song_url: string | null;
  song_provider: string | null;
  song_links: { platform: string; url: string }[] | null;
};
