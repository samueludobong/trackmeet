import { supabase } from "../lib/supabase";
import { type UserProfile } from "../app/data/mock";

const OWN_PROFILE_FIELDS =
  "username, display_name, bio, is_verified, followers_count, following_count, avatar_url, banner_color, banner_image_url, banner_shape, banner_shape_color, username_changed_at, display_name_change_count, display_name_window_start, pinned_song_id, pinned_song_name, pinned_song_artist, pinned_song_album_art, profile_links, social_links, spotify_access_token";

/** Resolve the currently-authenticated user id (or throw). */
export async function getAuthUserId(): Promise<string> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Not authenticated");
  return user.id;
}

/** Fetch the signed-in user's own profile row. */
export async function getOwnProfile(userId: string): Promise<UserProfile> {
  const { data, error } = await supabase
    .from("users")
    .select(OWN_PROFILE_FIELDS)
    .eq("id", userId)
    .single<UserProfile>();
  if (error) throw new Error(error.message);
  return data;
}

export type UserBasics = { initials: string; avatarUrl: string | null };

/** Fetch lightweight display info (initials + avatar) for a user. */
export async function getUserBasics(userId: string): Promise<UserBasics | null> {
  const { data } = await supabase
    .from("users")
    .select("username, display_name, avatar_url")
    .eq("id", userId)
    .single();
  if (!data) return null;
  const name: string = data.display_name ?? data.username ?? "?";
  return { initials: name.slice(0, 1).toUpperCase(), avatarUrl: data.avatar_url ?? null };
}

/** Persist an arbitrary set of column updates to the signed-in user's row. */
export async function updateUserProfile(userId: string, patch: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from("users").update(patch).eq("id", userId);
  if (error) throw error;
}
