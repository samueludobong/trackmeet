import { useEffect, useRef, useState } from "react";
import { type DiscoverUser, type ArtistResult } from "../types/discover";
import { searchDiscover, getFollowingSubset } from "../services/discover";

/** Debounced people + artist search for the Discover screen. */
export function useDiscoverSearch(searchText: string) {
  const [userResults, setUserResults]     = useState<DiscoverUser[]>([]);
  const [userFollowing, setUserFollowing] = useState<Set<string>>(new Set());
  const [userLoading, setUserLoading]     = useState(false);
  const [artistResults, setArtistResults] = useState<ArtistResult[]>([]);
  const [artistLoading, setArtistLoading] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    const q = searchText.trim();
    if (q.length < 2) {
      setUserResults([]); setUserLoading(false);
      setArtistResults([]); setArtistLoading(false);
      return;
    }
    setUserLoading(true);
    setArtistLoading(true);
    debounce.current = setTimeout(async () => {
      const { users, artists, meId } = await searchDiscover(q);
      setUserResults(users);
      setArtistResults(artists);
      if (users.length > 0 && meId) {
        setUserFollowing(await getFollowingSubset(meId, users.map((u) => u.id)));
      }
      setUserLoading(false);
      setArtistLoading(false);
    }, 350);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [searchText]);

  return { userResults, userFollowing, setUserFollowing, userLoading, artistResults, artistLoading };
}
