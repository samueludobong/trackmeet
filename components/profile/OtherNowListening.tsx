import React from "react";
import { NowListeningCard } from "./NowListeningCard";

/** Resolves the now-playing song (live meet or last-played) for another user's profile. */
export function OtherNowListening({
  publicMeet, isOwnProfile, profile, viewerToken, currentUserId, handleJoinMeet,
}: {
  publicMeet: any;
  isOwnProfile: boolean;
  profile: any;
  viewerToken: string | null;
  currentUserId: string | null;
  handleJoinMeet: () => void;
}) {
  const inMeet = publicMeet && !isOwnProfile;
  const m = inMeet ? publicMeet!.meet : null;
  const song = m
    ? {
        name: m.current_track_name ?? "Waiting for host…",
        artist: m.current_track_artist,
        id: m.current_track_id,
        albumArt: m.current_track_album_art,
        durationMs: m.current_track_duration_ms,
        progressMs: m.current_track_position_ms,
        updatedAt: m.position_updated_at,
      }
    : profile.current_song_name
    ? {
        name: profile.current_song_name,
        artist: profile.current_song_artist,
        id: profile.current_song_id,
        albumArt: profile.current_song_album_art,
        durationMs: profile.current_song_duration_ms,
        progressMs: profile.current_song_progress_ms,
        updatedAt: profile.current_song_updated_at,
      }
    : null;
  if (!song) return null;
  const hostName = inMeet ? (publicMeet!.host.display_name || publicMeet!.host.username) : null;
  return (
    <NowListeningCard
      song={song}
      viewerToken={viewerToken}
      viewerId={currentUserId}
      meet={hostName ? { hostName, isHost: publicMeet!.isHost } : null}
      onJoinMeet={handleJoinMeet}
    />
  );
}
