import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { getValidSpotifyToken } from "../lib/spotify";
import { getUserBasics, type UserBasics } from "../services/profile";

/** Resolves the signed-in viewer's id, display basics, and Spotify token. */
export function useViewer() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserBasics | null>(null);
  const [spotifyToken, setSpotifyToken] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);
      const [tok, basics] = await Promise.all([getValidSpotifyToken(user.id), getUserBasics(user.id)]);
      setSpotifyToken(tok);
      if (basics) setCurrentUser(basics);
    })();
  }, []);

  return { currentUserId, currentUser, spotifyToken };
}
