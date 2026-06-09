#!/usr/bin/env node
/**
 * Backfill cached 30s previews for every existing song-attached post.
 *
 *   For each post with `song_id` and null `song_preview_url`:
 *     1. Look up an already-cached preview for the same song id (reuse + skip).
 *     2. Otherwise: scrape Spotify's embed page (`audioPreview.url`),
 *        download the audio, upload to `post-media/song-previews/{songId}.mp3`,
 *        write the public URL back to `posts.song_preview_url`.
 *
 * Usage (PowerShell):
 *   $env:SUPABASE_URL = 'https://your-project.supabase.co'
 *   $env:SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'   # bypasses RLS
 *   node scripts/backfill-song-previews.mjs
 *
 * Service role key is required because the script writes to other users' posts
 * and uploads to the `song-previews/` shared folder. Never ship it to clients.
 */
import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

// Node < 22 has no native WebSocket. The supabase-js client always boots a
// RealtimeClient even when we never subscribe to anything, so we hand it `ws`.
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
  realtime: { transport: ws },
})

async function fetchEmbedPreview(trackId) {
  try {
    const res = await fetch(`https://open.spotify.com/embed/track/${trackId}`)
    if (!res.ok) return null
    const html = await res.text()
    const m = html.match(/"audioPreview"\s*:\s*\{\s*"url"\s*:\s*"([^"]+)"/)
    return m?.[1] ?? null
  } catch {
    return null
  }
}

/** Returns a cached URL (existing or newly uploaded) for `songId`, or null. */
const songCache = new Map() // songId -> url|null (within this run)
async function getOrUploadPreview(songId) {
  if (songCache.has(songId)) return songCache.get(songId)

  // Existing row for this song?
  const { data: existing } = await supabase
    .from('posts')
    .select('song_preview_url')
    .eq('song_id', songId)
    .not('song_preview_url', 'is', null)
    .limit(1)
    .maybeSingle()
  if (existing?.song_preview_url) {
    songCache.set(songId, existing.song_preview_url)
    return existing.song_preview_url
  }

  const sourceUrl = await fetchEmbedPreview(songId)
  if (!sourceUrl) { songCache.set(songId, null); return null }

  const audioRes = await fetch(sourceUrl)
  if (!audioRes.ok) { songCache.set(songId, null); return null }
  const buffer = Buffer.from(await audioRes.arrayBuffer())

  const path = `song-previews/${songId}.mp3`
  const { error } = await supabase.storage.from('post-media').upload(path, buffer, {
    contentType: 'audio/mpeg',
    upsert: true,
  })
  if (error) {
    console.log(`  upload failed for ${songId}: ${error.message}`)
    songCache.set(songId, null)
    return null
  }

  const { data: { publicUrl } } = supabase.storage.from('post-media').getPublicUrl(path)
  songCache.set(songId, publicUrl)
  return publicUrl
}

async function main() {
  console.log('Scanning posts for missing previews…')
  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, song_id')
    .not('song_id', 'is', null)
    .is('song_preview_url', null)
    .order('created_at', { ascending: false })
  if (error) throw error
  console.log(`Found ${posts?.length ?? 0} posts to backfill.`)

  let ok = 0, skipped = 0, failed = 0
  for (const p of posts ?? []) {
    const url = await getOrUploadPreview(p.song_id)
    if (!url) { failed++; console.log(`  ✗ ${p.id} (song ${p.song_id})`); continue }
    const { error: updErr } = await supabase
      .from('posts')
      .update({ song_preview_url: url })
      .eq('id', p.id)
    if (updErr) { failed++; console.log(`  ✗ ${p.id} update: ${updErr.message}`); continue }
    ok++
    if (ok % 25 === 0) console.log(`  …${ok} done`)
  }
  console.log(`Done. ok=${ok} skipped=${skipped} failed=${failed}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
