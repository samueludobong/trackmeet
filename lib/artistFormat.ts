import { type SpotifyAlbum } from "./spotify";

export function fmtListeners(n: number | null): string {
  if (!n) return "";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M monthly listeners`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K monthly listeners`;
  return `${n} monthly listeners`;
}

export function fmtDuration(ms: number): string {
  const sec = Math.floor(ms / 1000);
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

export function fmtAlbumMeta(album: SpotifyAlbum): string {
  const year   = album.releaseDate?.split("-")[0] ?? "";
  const type   = album.albumType === "single" ? "Single"
               : album.albumType === "album"  ? "Album"
               : "EP";
  const tracks = `${album.totalTracks} ${album.totalTracks === 1 ? "track" : "tracks"}`;
  return [year, type, tracks].filter(Boolean).join(" · ");
}

export function isNewRelease(releaseDate: string): boolean {
  try {
    const normalized =
      releaseDate.length === 4 ? `${releaseDate}-01-01`
      : releaseDate.length === 7 ? `${releaseDate}-01`
      : releaseDate;
    const diffDays = (Date.now() - new Date(normalized).getTime()) / 86_400_000;
    return diffDays >= 0 && diffDays <= 90;
  } catch { return false; }
}
