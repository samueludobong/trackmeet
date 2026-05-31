export type Tab = "DISCOGRAPHY" | "COMMUNITIES" | "EVENTS";

export type ArtistProfile = {
  id:                string;
  name:              string;
  slug:              string;
  bio:               string | null;
  is_verified:       boolean;
  spotify_artist_id: string | null;
  label:             string | null;
  booking_email:     string | null;
  avatar_url:        string | null;
  banner_image_url:  string | null;
  banner_color:      string | null;
  social_links:      Record<string, string>;
  genres:            string[];
  monthly_listeners: number | null;
  created_at:        string;
};
