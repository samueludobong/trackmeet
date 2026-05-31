import { useEffect, useState } from "react";
import { type UserProfile } from "../app/data/mock";
import { type ActiveMeetForUser, getActiveMeetForUser } from "../services/meets";
import { getAuthUserId, getOwnProfile } from "../services/profile";
import { feedCache } from "../lib/feed/caches";

/** Loads the signed-in user's profile + their active-meet membership (polled). */
export function useOwnProfile() {
  const [profile, setProfile]       = useState<UserProfile | null>(feedCache.profile);
  const [userId, setUserId]         = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeMeet, setActiveMeet] = useState<ActiveMeetForUser | null>(null);
  const [meetChecked, setMeetChecked] = useState(false);

  const fetchProfile = async (force = false) => {
    try {
      const id = await getAuthUserId();
      setUserId(id);
      if (feedCache.profile && !force) { setProfile(feedCache.profile); return; }
      const data = await getOwnProfile(id);
      setAccessToken(data.spotify_access_token ?? null);
      feedCache.profile = data;
      setProfile(data);
    } catch (err) {
      console.error("fetchProfile:", err);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    const load = async () => {
      const m = await getActiveMeetForUser(userId, false);
      if (active) { setActiveMeet(m); setMeetChecked(true); }
    };
    load();
    const id = setInterval(load, 8_000);
    return () => { active = false; clearInterval(id); };
  }, [userId]);

  const onRefresh = async () => {
    setRefreshing(true);
    feedCache.profile = null;
    feedCache.myPosts = null;
    await fetchProfile(true);
    setRefreshing(false);
  };

  return { profile, setProfile, userId, accessToken, refreshing, activeMeet, meetChecked, onRefresh, refetch: fetchProfile };
}
