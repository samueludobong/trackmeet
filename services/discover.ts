import { supabase } from "../lib/supabase";
import { type DiscoverUser, type ArtistResult } from "../types/discover";

const USER_FIELDS =
  "id, username, display_name, avatar_url, followers_count, following_count, is_verified, bio, banner_color, banner_image_url, banner_shape, banner_shape_color, pinned_song_name, pinned_song_artist, pinned_song_album_art, top_genres, account_type";
const ARTIST_FIELDS =
  "id, name, slug, bio, is_verified, avatar_url, banner_image_url, banner_color, genres, monthly_listeners, label";

/** Search users + artists by name in parallel. Excludes the current viewer from users. */
export async function searchDiscover(query: string): Promise<{
  users: DiscoverUser[];
  artists: ArtistResult[];
  meId: string | null;
}> {
  const { data: { user: me } } = await supabase.auth.getUser();
  const [usersRes, artistsRes] = await Promise.all([
    supabase
      .from("users")
      .select(USER_FIELDS)
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .neq("id", me?.id ?? "")
      .order("followers_count", { ascending: false })
      .limit(20),
    supabase
      .from("artists")
      .select(ARTIST_FIELDS)
      .ilike("name", `%${query}%`)
      .order("monthly_listeners", { ascending: false })
      .limit(10),
  ]);
  return {
    users: (usersRes.data ?? []) as DiscoverUser[],
    artists: (artistsRes.data ?? []) as ArtistResult[],
    meId: me?.id ?? null,
  };
}

/** Return the subset of `userIds` that `meId` already follows. */
export async function getFollowingSubset(meId: string, userIds: string[]): Promise<Set<string>> {
  const { data } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", meId)
    .in("following_id", userIds);
  return new Set((data ?? []).map((f: { following_id: string }) => f.following_id));
}
