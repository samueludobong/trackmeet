// Barrel: lib/spotify.ts re-exports the per-domain modules so existing
// call sites (`import { foo } from "../lib/spotify"`) keep working.
export * from './spotify/_shared';
export * from './spotify/auth';
export * from './spotify/player';
export * from './spotify/tracks';
export * from './spotify/playlists';
export * from './spotify/artists';
export * from './spotify/preview';
export * from './spotify/links';
