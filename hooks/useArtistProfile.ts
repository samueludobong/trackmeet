import { useState, useEffect } from "react";
import { fetchSpotifyArtistById } from "../lib/spotify";
import { Share } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { type ArtistProfile, type Tab } from "../types/artist";
import { supabase } from "../lib/supabase";
import { getValidSpotifyToken, searchSpotifyArtist, getArtistAlbums, getAlbumTracks, type SpotifyArtistInfo, type SpotifyAlbum, type SpotifyAlbumTrack } from "../lib/spotify";

export function useArtistProfile() {
  const router = useRouter();
  // Navigate here with: router.push({ pathname: "/artist-profile", params: { artistId: "..." } })
  const { artistId } = useLocalSearchParams<{ artistId: string }>();

  const [artist,      setArtist]      = useState<ArtistProfile | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [activeTab,   setActiveTab]   = useState<Tab>("DISCOGRAPHY");

  // Spotify discography state
  const [spotifyInfo,    setSpotifyInfo]    = useState<SpotifyArtistInfo | null>(null);
  const [albums,         setAlbums]         = useState<SpotifyAlbum[]>([]);
  const [featuredTracks, setFeaturedTracks] = useState<SpotifyAlbumTrack[]>([]);
  const [discLoading,    setDiscLoading]    = useState(false);

  useEffect(() => { loadArtist(); }, [artistId]);

  const loadArtist = async () => {
    if (!artistId) return;
    try {
      // ── One query, one table — no joins ───────────────────────────────────
      const { data, error } = await supabase
        .from("artists")
        .select("*")
        .eq("id", artistId)
        .single<ArtistProfile>();

      if (error) throw error;
      setArtist(data);

      // Load discography using viewer's Spotify token
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const token = await getValidSpotifyToken(user.id);
        if (token) loadDiscography(token, data.spotify_artist_id, data.name);
      }
    } catch (err) {
      console.error("loadArtist:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadDiscography = async (
    token: string,
    storedArtistId: string | null,
    artistName: string,
  ) => {
    setDiscLoading(true);
    try {
      // Resolve the Spotify artist ID
      let resolvedId: string | null = storedArtistId;
      if (!resolvedId) {
        const info = await searchSpotifyArtist(token, artistName);
        if (!info) return;
        resolvedId = info.id;
        setSpotifyInfo(info);
      }

      // Fetch artist info + albums in parallel
      const [artistRes, albumList] = await Promise.all([
        fetchSpotifyArtistById(token, resolvedId),
        getArtistAlbums(token, resolvedId),
      ]);

      if (artistRes) {
        const a = artistRes;
        setSpotifyInfo({
          id:             a.id,
          name:           a.name,
          imageUrl:       a.images?.[0]?.url ?? null,
          genres:         a.genres ?? [],
          followersCount: a.followers?.total ?? 0,
        });
      }

      setAlbums(albumList);

      if (albumList.length > 0) {
        const tracks = await getAlbumTracks(token, albumList[0].id);
        setFeaturedTracks(tracks);
      }
    } catch (err) {
      console.error("loadDiscography:", err);
    } finally {
      setDiscLoading(false);
    }
  };

  const handleShare = async () => {
    if (!artist) return;
    try {
      await Share.share({ message: `Check out ${artist.name} on Track Meet!` });
    } catch {}
  };


  return { router, artist, setArtist, loading, setLoading, activeTab, setActiveTab, spotifyInfo, setSpotifyInfo, albums, setAlbums, featuredTracks, setFeaturedTracks, discLoading, setDiscLoading, loadArtist, loadDiscography, handleShare };
}
