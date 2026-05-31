// Types for the Discover search results.

export type DiscoverUser = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  followers_count: number;
  following_count: number | null;
  is_verified: boolean | null;
  bio: string | null;
  banner_color: string | null;
  banner_image_url: string | null;
  banner_shape: string | null;
  banner_shape_color: string | null;
  pinned_song_name: string | null;
  pinned_song_artist: string | null;
  pinned_song_album_art: string | null;
  top_genres: string[] | null;
  account_type: string | null;
};

export type ArtistResult = {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  is_verified: boolean;
  avatar_url: string | null;
  banner_image_url: string | null;
  banner_color: string | null;
  genres: string[];
  monthly_listeners: number | null;
  label: string | null;
};
