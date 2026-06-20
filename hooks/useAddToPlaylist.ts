import { useState, useEffect } from "react";
import { type PlaylistTrackInput } from "../services/playlists";
import {
  getMyCuratedPlaylists, getPlaylistIdsContainingTrack, getPlaylistIdsContainingUrl,
  addTrackToCuratedPlaylist, removeTrackFromCuratedPlaylist, removeSongFromCuratedPlaylistByUrl,
  createCuratedPlaylist, type CuratedPlaylistLite,
} from "../services/playlists";
import {
  getValidSpotifyToken, getUserPlaylists, isTrackSaved,
  saveTrackToLikedDetailed, removeTrackFromLiked,
  addTrackToSpotifyPlaylist, removeTrackFromSpotifyPlaylist,
  createSpotifyPlaylist, reconnectSpotify,
  type SpotifyPlaylist, type SpotifyWriteResult,
} from "../lib/spotify";

export type SaveMode = "curated" | "spotify";

export type SaveError = {
  message: string;
  needsReconnect: boolean;
};

const LIKED_ID = "liked";

// Centralized error surfacer — turns a structured Spotify write result into a
// SaveError the UI can show, mapping 401/403 to a reconnect-friendly message.
function errFromWrite(r: Extract<SpotifyWriteResult, { ok: false }>): SaveError {
  if (r.needsReconnect) {
    return {
      message:
        "Spotify permission denied. Reconnect Spotify in Settings → Connected Apps to grant playlist access.",
      needsReconnect: true,
    };
  }
  return {
    message: r.message ?? `Spotify error (${r.status || "network"}).`,
    needsReconnect: false,
  };
}

export function useAddToPlaylist({ visible, onClose, track, tracks, userId, onSavedChange }: { visible: boolean; onClose: () => void; track?: PlaylistTrackInput | null; tracks?: PlaylistTrackInput[]; userId: string | null; onSavedChange?: (saved: boolean) => void }) {
  const items = (tracks && tracks.length > 0) ? tracks : (track ? [track] : []);
  const bulk = items.length > 1;
  const single = items.length === 1 ? items[0] : null;
  // Non-Spotify (pasted-link) songs can't go into Spotify playlists — only the
  // curated "TrackMeet" mode. Disable the Spotify tab when nothing here has a
  // Spotify id.
  const spotifyDisabled = !items.some((t) => !!t.id);

  // Mode selector ──────────────────────────────────────────────────────────
  const [mode, setMode] = useState<SaveMode>("curated");

  // Curated playlists ─────────────────────────────────────────────────────
  const [playlists, setPlaylists] = useState<CuratedPlaylistLite[]>([]);
  const [memberOf, setMemberOf]   = useState<Set<string>>(new Set());  // single mode
  const [addedTo, setAddedTo]     = useState<Set<string>>(new Set());  // bulk mode
  const [loading, setLoading]     = useState(true);

  // Spotify playlists ─────────────────────────────────────────────────────
  const [spotifyToken,     setSpotifyToken]     = useState<string | null>(null);
  const [spotifyPlaylists, setSpotifyPlaylists] = useState<SpotifyPlaylist[]>([]);
  // Playlists we *know* contain the track (Liked Songs membership is precomputed;
  // others flip true optimistically when the user taps a row).
  const [spotifyMemberOf,  setSpotifyMemberOf]  = useState<Set<string>>(new Set());
  const [spotifyLoading,   setSpotifyLoading]   = useState(false);

  const [busy, setBusy]           = useState<string | null>(null);
  const [creating, setCreating]   = useState(false);
  const [newName, setNewName]     = useState("");

  // Last Spotify operation's error, surfaced inline in the sheet so users
  // understand WHY their tap didn't seem to do anything.
  const [error, setError] = useState<SaveError | null>(null);
  const [reconnecting, setReconnecting] = useState(false);

  const key = single?.id ?? single?.url ?? `bulk:${items.length}`;

  // ── Load curated playlists + membership ───────────────────────────────
  useEffect(() => {
    if (!visible || items.length === 0 || !userId) return;
    let active = true;
    setLoading(true);
    setNewName("");
    setAddedTo(new Set());
    setMode("curated");
    setError(null);
    (async () => {
      const pls = await getMyCuratedPlaylists(userId);
      const mem = single
        ? (single.id
            ? await getPlaylistIdsContainingTrack(userId, single.id)
            : single.url ? await getPlaylistIdsContainingUrl(userId, single.url) : new Set<string>())
        : new Set<string>();
      if (!active) return;
      setPlaylists(pls);
      setMemberOf(mem);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [visible, key, userId]);

  // ── Load Spotify token + playlists + liked-membership ──────────────────
  // Runs alongside the curated load so swapping modes is instant.
  useEffect(() => {
    if (!visible || items.length === 0 || !userId) return;
    let active = true;
    setSpotifyLoading(true);
    setSpotifyMemberOf(new Set());
    setSpotifyPlaylists([]);
    setSpotifyToken(null);
    (async () => {
      const tok = await getValidSpotifyToken(userId);
      if (!active) return;
      setSpotifyToken(tok);
      if (!tok) { setSpotifyLoading(false); return; }
      const [pls, likedHit] = await Promise.all([
        getUserPlaylists(tok),
        single?.id ? isTrackSaved(tok, single.id) : Promise.resolve(false),
      ]);
      if (!active) return;
      // Liked Songs always appears first in getUserPlaylists; everything else
      // we surface optimistically (per-playlist membership lookup is too costly).
      setSpotifyPlaylists(pls);
      setSpotifyMemberOf(likedHit ? new Set([LIKED_ID]) : new Set());
      setSpotifyLoading(false);
    })();
    return () => { active = false; };
  }, [visible, key, userId]);

  // ── "Saved anywhere?" emission combines both modes ────────────────────
  const emit = (curatedSet: Set<string>, spotifySet: Set<string>) => {
    onSavedChange?.(curatedSet.size > 0 || spotifySet.size > 0);
  };

  // ── Curated toggle ────────────────────────────────────────────────────
  const toggleCurated = async (playlistId: string) => {
    if (busy) return;
    setBusy(playlistId);
    try {
      if (bulk) {
        for (const t of items) await addTrackToCuratedPlaylist(playlistId, t);
        const next = new Set(addedTo).add(playlistId);
        setAddedTo(next);
        onSavedChange?.(true);
      } else if (single) {
        const next = new Set(memberOf);
        if (memberOf.has(playlistId)) {
          if (single.id) await removeTrackFromCuratedPlaylist(playlistId, single.id);
          else if (single.url) await removeSongFromCuratedPlaylistByUrl(playlistId, single.url);
          next.delete(playlistId);
        } else {
          await addTrackToCuratedPlaylist(playlistId, single);
          next.add(playlistId);
        }
        setMemberOf(next);
        emit(next, spotifyMemberOf);
      }
    } catch (e: any) {
      setError({ message: e?.message ?? "Could not update the playlist.", needsReconnect: false });
    } finally {
      setBusy(null);
    }
  };

  // ── Spotify toggle (Liked Songs OR a real Spotify playlist) ───────────
  const toggleSpotify = async (playlistId: string) => {
    if (busy || !spotifyToken) return;
    setBusy(playlistId);
    setError(null);
    try {
      if (bulk) {
        for (const t of items) {
          if (!t.id) continue; // non-Spotify songs can't be added to Spotify
          const r = playlistId === LIKED_ID
            ? await saveTrackToLikedDetailed(spotifyToken, t.id)
            : await addTrackToSpotifyPlaylist(spotifyToken, playlistId, t.id);
          if (!r.ok) { setError(errFromWrite(r)); return; }
        }
        const next = new Set(spotifyMemberOf).add(playlistId);
        setSpotifyMemberOf(next);
        onSavedChange?.(true);
      } else if (single?.id) {
        const trackId = single.id;
        const next = new Set(spotifyMemberOf);
        const isMember = spotifyMemberOf.has(playlistId);
        let r: SpotifyWriteResult;
        if (playlistId === LIKED_ID) {
          r = isMember
            ? await removeTrackFromLiked(spotifyToken, trackId)
            : await saveTrackToLikedDetailed(spotifyToken, trackId);
        } else {
          r = isMember
            ? await removeTrackFromSpotifyPlaylist(spotifyToken, playlistId, trackId)
            : await addTrackToSpotifyPlaylist(spotifyToken, playlistId, trackId);
        }
        if (!r.ok) { setError(errFromWrite(r)); return; }
        isMember ? next.delete(playlistId) : next.add(playlistId);
        setSpotifyMemberOf(next);
        emit(memberOf, next);
      }
    } finally {
      setBusy(null);
    }
  };

  const toggle = (playlistId: string) =>
    mode === "curated" ? toggleCurated(playlistId) : toggleSpotify(playlistId);

  // ── Create new playlist (in whichever mode is active) ─────────────────
  const createAndAdd = async () => {
    if (!userId || items.length === 0 || !newName.trim() || creating) return;
    setCreating(true);
    setError(null);
    try {
      if (mode === "curated") {
        const pl = await createCuratedPlaylist(userId, newName.trim());
        if (pl) {
          for (const t of items) await addTrackToCuratedPlaylist(pl.id, t);
          setPlaylists(prev => [pl, ...prev]);
          if (bulk) {
            const next = new Set(addedTo).add(pl.id);
            setAddedTo(next); onSavedChange?.(true);
          } else {
            const next = new Set(memberOf).add(pl.id);
            setMemberOf(next); emit(next, spotifyMemberOf);
          }
          setNewName("");
        } else {
          setError({ message: "Could not create playlist.", needsReconnect: false });
        }
      } else if (spotifyToken) {
        const createRes = await createSpotifyPlaylist(spotifyToken, newName.trim());
        if (!createRes.ok) { setError(errFromWrite(createRes)); return; }
        const pl = createRes.playlist;
        // Add the current track(s) to the brand-new playlist.
        for (const t of items) {
          if (!t.id) continue;
          const r = await addTrackToSpotifyPlaylist(spotifyToken, pl.id, t.id);
          if (!r.ok) { setError(errFromWrite(r)); /* keep the playlist row though */ break; }
        }
        // Insert the new playlist right after Liked Songs (preserves it at the top).
        setSpotifyPlaylists(prev => {
          const liked = prev.find(p => p.id === LIKED_ID);
          const rest = prev.filter(p => p.id !== LIKED_ID && p.id !== pl.id);
          return liked ? [liked, pl, ...rest] : [pl, ...rest];
        });
        const next = new Set(spotifyMemberOf).add(pl.id);
        setSpotifyMemberOf(next);
        emit(memberOf, next);
        setNewName("");
      } else {
        setError({ message: "Connect Spotify in Settings to create a playlist.", needsReconnect: true });
      }
    } finally {
      setCreating(false);
    }
  };

  // For the active mode, compute what the UI needs.
  const activeLoading  = mode === "curated" ? loading : spotifyLoading;
  const activePlaylists: { id: string; name: string; image_url: string | null; isLiked?: boolean }[] =
    mode === "curated"
      ? playlists
      : spotifyPlaylists.map((p) => ({ id: p.id, name: p.name, image_url: p.imageUrl, isLiked: p.isLiked }));
  const activeMemberOf = mode === "curated" ? memberOf : spotifyMemberOf;
  const activeAddedTo  = mode === "curated" ? addedTo : spotifyMemberOf;
  const canCreate      = mode === "curated" || !!spotifyToken;
  const createDisabledReason =
    mode === "spotify" && !spotifyToken ? "Connect Spotify in Settings to create a playlist." : null;

  // One-tap reconnect from the error banner. Forces the Spotify consent
  // dialog so newly-added scopes get granted (the underlying reconnectSpotify
  // call now passes show_dialog=true). On success we swap in the fresh token
  // and re-load the playlists + liked-membership using it.
  const reconnect = async () => {
    if (!userId || reconnecting) return;
    setReconnecting(true);
    setError(null);
    try {
      const res = await reconnectSpotify(userId);
      if ("error" in res) {
        setError({ message: res.error || "Reconnect failed.", needsReconnect: true });
        return;
      }
      const tok = res.accessToken;
      console.log('[useAddToPlaylist] reconnect success, new token prefix=', tok ? tok.slice(0, 8) + '…' : '<empty>');
      setSpotifyToken(tok);
      const [pls, likedHit] = await Promise.all([
        getUserPlaylists(tok),
        single?.id ? isTrackSaved(tok, single.id) : Promise.resolve(false),
      ]);
      console.log('[useAddToPlaylist] post-reconnect: loaded', pls.length, 'playlists; likedHit=', likedHit);
      setSpotifyPlaylists(pls);
      setSpotifyMemberOf(likedHit ? new Set([LIKED_ID]) : new Set());
    } finally {
      setReconnecting(false);
    }
  };

  return {
    // existing surface (kept stable for the component)
    items, bulk, single, playlists, setPlaylists, memberOf, setMemberOf, addedTo, setAddedTo,
    loading, setLoading, busy, setBusy, creating, setCreating, newName, setNewName,
    key, toggle, createAndAdd,
    // mode + spotify
    mode, setMode,
    spotifyToken, spotifyPlaylists, spotifyMemberOf, spotifyLoading,
    activeLoading, activePlaylists, activeMemberOf, activeAddedTo,
    canCreate, createDisabledReason, spotifyDisabled,
    // error surface
    error, dismissError: () => setError(null),
    // inline reconnect
    reconnect, reconnecting,
  };
}
