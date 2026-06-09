import { supabase } from '../lib/supabase';

export const followUser = async (
  targetUserId: string,
): Promise<{ success?: boolean; error?: string }> => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  if (user.id === targetUserId) return { error: 'Cannot follow yourself' }

  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: user.id, following_id: targetUserId })

  if (error) return { error: error.message }
  return { success: true }
}

export const unfollowUser = async (
  targetUserId: string,
): Promise<{ success?: boolean; error?: string }> => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('following_id', targetUserId)

  if (error) return { error: error.message }
  return { success: true }
}

export type NowListeningUser = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  song_id: string | null;
  song_name: string;
  song_artist: string | null;
  song_album_art: string | null;
  isMe: boolean;
};

/**
 * Live now-listening list for the Messages "Now Listening" strip.
 * Returns the viewer first (when they're broadcasting), then every user
 * they follow who's currently broadcasting a song. Users without a track
 * name are filtered out.
 */
export const getFollowingNowListening = async (): Promise<NowListeningUser[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // 1. Who do I follow?
  const { data: followsRows } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id);
  const followedIds = (followsRows ?? []).map((r: any) => r.following_id as string);

  // 2. Fetch broadcasting users among me + follows in a single query.
  const ids = [user.id, ...followedIds];
  const { data: rows } = await supabase
    .from("users")
    .select("id, username, display_name, avatar_url, current_song_id, current_song_name, current_song_artist, current_song_album_art, is_broadcasting, current_song_updated_at")
    .in("id", ids)
    .eq("is_broadcasting", true)
    .not("current_song_name", "is", null);

  if (!rows) return [];

  const mapped: NowListeningUser[] = rows.map((r: any) => ({
    id: r.id,
    username: r.username,
    display_name: r.display_name,
    avatar_url: r.avatar_url,
    song_id: r.current_song_id,
    song_name: r.current_song_name,
    song_artist: r.current_song_artist,
    song_album_art: r.current_song_album_art,
    isMe: r.id === user.id,
  }));

  // Viewer first, then others sorted by most recently updated broadcast.
  mapped.sort((a, b) => {
    if (a.isMe !== b.isMe) return a.isMe ? -1 : 1;
    return 0;
  });
  return mapped;
};

export const checkIsFollowing = async (targetUserId: string): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', user.id)
    .eq('following_id', targetUserId)
    .maybeSingle()

  return !!data
}
