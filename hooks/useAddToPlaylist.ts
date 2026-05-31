import { useState, useEffect } from "react";
import { type PlaylistTrackInput } from "../services/playlists";
import { getMyCuratedPlaylists, getPlaylistIdsContainingTrack, addTrackToCuratedPlaylist, removeTrackFromCuratedPlaylist, createCuratedPlaylist, type CuratedPlaylistLite } from "../services/playlists";

export function useAddToPlaylist({ visible, onClose, track, tracks, userId, onSavedChange }: { visible: boolean; onClose: () => void; track?: PlaylistTrackInput | null; tracks?: PlaylistTrackInput[]; userId: string | null; onSavedChange?: (saved: boolean) => void }) {
  const items = (tracks && tracks.length > 0) ? tracks : (track ? [track] : []);
  const bulk = items.length > 1;
  const single = items.length === 1 ? items[0] : null;

  const [playlists, setPlaylists] = useState<CuratedPlaylistLite[]>([]);
  const [memberOf, setMemberOf]   = useState<Set<string>>(new Set());  // single mode
  const [addedTo, setAddedTo]     = useState<Set<string>>(new Set());  // bulk mode
  const [loading, setLoading]     = useState(true);
  const [busy, setBusy]           = useState<string | null>(null);
  const [creating, setCreating]   = useState(false);
  const [newName, setNewName]     = useState("");

  const key = single?.id ?? `bulk:${items.length}`;

  // Load playlists + current membership whenever the sheet opens.
  useEffect(() => {
    if (!visible || items.length === 0 || !userId) return;
    let active = true;
    setLoading(true);
    setNewName("");
    setAddedTo(new Set());
    (async () => {
      const pls = await getMyCuratedPlaylists(userId);
      const mem = single ? await getPlaylistIdsContainingTrack(userId, single.id) : new Set<string>();
      if (!active) return;
      setPlaylists(pls);
      setMemberOf(mem);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [visible, key, userId]);

  const emit = (set: Set<string>) => onSavedChange?.(set.size > 0);

  const toggle = async (playlistId: string) => {
    if (busy) return;
    setBusy(playlistId);
    if (bulk) {
      for (const t of items) await addTrackToCuratedPlaylist(playlistId, t);
      const next = new Set(addedTo).add(playlistId);
      setAddedTo(next);
      onSavedChange?.(true);
    } else if (single) {
      const next = new Set(memberOf);
      if (memberOf.has(playlistId)) {
        await removeTrackFromCuratedPlaylist(playlistId, single.id);
        next.delete(playlistId);
      } else {
        await addTrackToCuratedPlaylist(playlistId, single);
        next.add(playlistId);
      }
      setMemberOf(next);
      emit(next);
    }
    setBusy(null);
  };

  const createAndAdd = async () => {
    if (!userId || items.length === 0 || !newName.trim() || creating) return;
    setCreating(true);
    const pl = await createCuratedPlaylist(userId, newName.trim());
    if (pl) {
      for (const t of items) await addTrackToCuratedPlaylist(pl.id, t);
      setPlaylists(prev => [pl, ...prev]);
      if (bulk) {
        setAddedTo(prev => new Set(prev).add(pl.id));
        onSavedChange?.(true);
      } else {
        const next = new Set(memberOf).add(pl.id);
        setMemberOf(next);
        emit(next);
      }
      setNewName("");
    }
    setCreating(false);
  };


  return { items, bulk, single, playlists, setPlaylists, memberOf, setMemberOf, addedTo, setAddedTo, loading, setLoading, busy, setBusy, creating, setCreating, newName, setNewName, key, emit, toggle, createAndAdd };
}
