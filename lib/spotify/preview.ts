import { supabase } from '../supabase'

export async function fetchSpotifyEmbedPreview(trackId: string): Promise<string | null> {
  try {
    const res = await fetch(`https://open.spotify.com/embed/track/${trackId}`);
    if (!res.ok) return null;
    const html = await res.text();
    const m = html.match(/"audioPreview"\s*:\s*\{\s*"url"\s*:\s*"([^"]+)"/);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

/**
 * Returns a public URL for the 30s preview of `songId`, mirrored into our
 * `post-media` bucket so we don't depend on Spotify's transient CDN.
 *
 * Lookup order:
 *   1. Reuse an existing `posts.song_preview_url` row for the same song id.
 *   2. Scrape Spotify's embed page (`fetchSpotifyEmbedPreview`).
 *   3. Fetch the audio bytes and upload to `post-media/song-previews/{songId}.mp3`.
 *
 * Returns `null` on any failure — callers should treat the preview as optional.
 */
export async function getOrCacheSongPreviewUrl(songId: string): Promise<string | null> {
  // Lazy-import supabase to avoid a circular module load with lib/spotify <-> hooks.
  const { supabase } = await import('../supabase')

  // 1. Already cached for this song? Reuse it — same preview is fine for everyone.
  const { data: existing } = await supabase
    .from('posts')
    .select('song_preview_url')
    .eq('song_id', songId)
    .not('song_preview_url', 'is', null)
    .limit(1)
    .maybeSingle()
  if (existing?.song_preview_url) return existing.song_preview_url as string

  // 2. Scrape the embed page.
  const sourceUrl = await fetchSpotifyEmbedPreview(songId)
  if (!sourceUrl) return null

  // 3. Fetch the audio bytes and upload.
  try {
    const audioRes = await fetch(sourceUrl)
    if (!audioRes.ok) return null
    const blob = await audioRes.blob()
    const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as ArrayBuffer)
      reader.onerror = reject
      reader.readAsArrayBuffer(blob)
    })

    const path = `song-previews/${songId}.mp3`
    const { error } = await supabase.storage.from('post-media').upload(path, arrayBuffer, {
      contentType: 'audio/mpeg',
      upsert: true,
    })
    if (error) {
      console.log('[spotify] preview upload failed:', error.message)
      return null
    }
    const { data: { publicUrl } } = supabase.storage.from('post-media').getPublicUrl(path)
    return publicUrl
  } catch (e) {
    console.log('[spotify] preview cache error:', e)
    return null
  }
}
