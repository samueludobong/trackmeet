// ─── Curated playlist types ───────────────────────────────────────────────────

export type CuratedPlaylist = {
  id: string;
  user_id: string;
  name: string;
  image_url: string | null;
  tags: string[];
  show_on_profile: boolean;
  created_at: string;
};

export type CuratedSong = {
  id: string;
  playlist_id: string;
  spotify_track_id: string;
  track_name: string;
  track_artist: string;
  album_art: string | null;
  duration_ms: number;
  position: number;
};
