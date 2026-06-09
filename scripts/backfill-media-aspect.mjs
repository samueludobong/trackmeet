#!/usr/bin/env node
/**
 * Backfill `posts.media_aspect` for existing video posts.
 *
 *   For every post whose first media URL looks like a video and whose
 *   `media_aspect` is null, run ffprobe against the public URL, compute
 *   width / height, and update the row.
 *
 * Uses the prebuilt binary from `ffprobe-static` so no system FFmpeg install
 * is required. Install once:
 *   npm install --save-dev ffprobe-static
 *
 * Usage (PowerShell):
 *   $env:SUPABASE_URL = 'https://your-project.supabase.co'
 *   $env:SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'
 *   node scripts/backfill-media-aspect.mjs
 *
 * Service-role key is required because it updates rows it doesn't own.
 */
import { createClient } from '@supabase/supabase-js'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import ffprobeStatic from 'ffprobe-static'
import ws from 'ws'

const execFileP = promisify(execFile)
const FFPROBE = ffprobeStatic.path

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
  realtime: { transport: ws },
})

const VIDEO_EXTS = ['mp4', 'mov', 'm4v', 'avi', 'webm']

const isVideoUrl = (url) => {
  if (!url) return false
  const path = url.split('?')[0].toLowerCase()
  const ext = path.split('.').pop()
  return VIDEO_EXTS.includes(ext)
}

/** ffprobe returns width/height as JSON; pull from the first video stream. */
async function probeAspect(url) {
  try {
    const { stdout } = await execFileP(FFPROBE, [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height',
      '-of', 'json',
      url,
    ])
    const j = JSON.parse(stdout)
    const s = j?.streams?.[0]
    if (!s?.width || !s?.height) return null
    return s.width / s.height
  } catch (e) {
    console.log(`  probe failed: ${e.message?.split('\n')[0]}`)
    return null
  }
}

async function main() {
  console.log('Scanning video posts with missing media_aspect…')
  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, media_urls')
    .is('media_aspect', null)
    .not('media_urls', 'is', null)
    .order('created_at', { ascending: false })
  if (error) throw error

  const videoPosts = (posts ?? []).filter((p) => isVideoUrl(p.media_urls?.[0]))
  console.log(`Found ${videoPosts.length} candidate video posts.`)

  let ok = 0, failed = 0
  for (const p of videoPosts) {
    const url = p.media_urls[0]
    const aspect = await probeAspect(url)
    if (!aspect) { failed++; console.log(`  ✗ ${p.id}`); continue }
    const { error: updErr } = await supabase
      .from('posts')
      .update({ media_aspect: aspect })
      .eq('id', p.id)
    if (updErr) { failed++; console.log(`  ✗ ${p.id} update: ${updErr.message}`); continue }
    ok++
    if (ok % 25 === 0) console.log(`  …${ok} done`)
  }
  console.log(`Done. ok=${ok} failed=${failed}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
