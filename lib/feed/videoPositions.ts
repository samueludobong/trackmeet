/**
 * Per-post video playback position cache, keyed by post id (seconds).
 *
 * Shared between the inline feed preview (VideoCard) and the full-screen
 * TikTok-style viewer (VideoFeedViewer) so playback picks up exactly where the
 * other left off — one position state per video, no matter where it's shown.
 * Survives FlatList virtualisation since it lives outside the component tree.
 */
export const videoPositionStore = new Map<string, number>();
