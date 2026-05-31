/**
 * Album-art → gradient, the Expo Go way.
 *
 * `react-native-image-colors` is a native module and does NOT run in Expo Go,
 * so we extract colors in pure JS instead: shrink the artwork to a tiny bitmap
 * with expo-image-manipulator (an Expo SDK module, Expo Go safe), decode the
 * JPEG bytes with jpeg-js, then quantize the pixels into a dominant hue and
 * build a tasteful dark 3-stop gradient from it.
 *
 * Results are cached by URI and in-flight requests are de-duped, so a given
 * album art is only ever decoded once per session.
 */
import { useEffect, useState } from 'react'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import * as FileSystem from 'expo-file-system/legacy'
import jpeg from 'jpeg-js'

export type Gradient = [string, string, string]

// Warm dark default — matches the app's resting now-playing look. Used while a
// real gradient is still being computed, or if extraction fails.
export const DEFAULT_GRADIENT: Gradient = ['#3D1A0C', '#1E0D08', '#0E0907']

// Vibrant warm default for accent UI (e.g. the broadcast toggle) before/if a
// real album-art accent can't be derived. Matches the legacy toggle gradient.
export const DEFAULT_ACCENT: Gradient = ['#FF6C1A', '#CC4200', '#3D1A0C']

const _cache = new Map<string, Gradient>()
const _accentCache = new Map<string, Gradient>()
const _inflight = new Map<string, Promise<Gradient>>()

// Stable short id for a URI, used to name its temporary cache file.
function hashUri(uri: string): string {
  let h = 0
  for (let i = 0; i < uri.length; i++) {
    h = (Math.imul(31, h) + uri.charCodeAt(i)) | 0
  }
  return (h >>> 0).toString(36)
}

// ── base64 → bytes (no reliance on a global atob) ───────────────────────────────
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '')
  const len = clean.length
  const pad = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0
  const byteLen = Math.floor((len * 3) / 4) - pad
  const out = new Uint8Array(byteLen)
  let p = 0
  for (let i = 0; i < len; i += 4) {
    const c0 = B64.indexOf(clean[i])
    const c1 = B64.indexOf(clean[i + 1])
    const c2 = B64.indexOf(clean[i + 2])
    const c3 = B64.indexOf(clean[i + 3])
    const n = (c0 << 18) | (c1 << 12) | ((c2 & 63) << 6) | (c3 & 63)
    if (p < byteLen) out[p++] = (n >> 16) & 255
    if (p < byteLen) out[p++] = (n >> 8) & 255
    if (p < byteLen) out[p++] = n & 255
  }
  return out
}

// ── color math ──────────────────────────────────────────────────────────────────
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0, s = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      default: h = (r - g) / d + 4
    }
    h /= 6
  }
  return [h, s, l]
}

function hslToHex(h: number, s: number, l: number): string {
  const hue = (p: number, q: number, t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  let r: number, g: number, b: number
  if (s === 0) { r = g = b = l } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue(p, q, h + 1 / 3); g = hue(p, q, h); b = hue(p, q, h - 1 / 3)
  }
  const to = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}

// Build a dark, readable 3-stop gradient that keeps the artwork's dominant hue.
function gradientFromHsl(h: number, s: number): Gradient {
  const sat = Math.min(Math.max(s, 0.35), 0.85)
  return [
    hslToHex(h, sat, 0.19),
    hslToHex(h, sat * 0.9, 0.10),
    hslToHex(h, sat * 0.8, 0.05),
  ]
}

// Build a vibrant, saturated 3-stop gradient for accent UI (toggles, buttons)
// that keeps the artwork's dominant hue but stays bright enough to read against
// the dark now-playing card.
function accentFromHsl(h: number, s: number): Gradient {
  const sat = Math.min(Math.max(s, 0.55), 0.95)
  return [
    hslToHex(h, sat, 0.55),
    hslToHex(h, sat, 0.42),
    hslToHex(h, sat * 0.95, 0.28),
  ]
}

// Single pass over the pixels at a given minimum-saturation floor. Returns the
// dominant vibrant color, or null if no pixel clears the floor.
//
// The saturation floor is the key to ignoring JPEG chroma fringing: downscaling
// a sharp vivid-on-black edge (e.g. a red logo) introduces cyan/green halo
// pixels, but those are only moderately saturated. A high floor keeps the true
// vivid color and discards the fringe entirely; callers fall back to lower
// floors so genuinely muted artwork still resolves.
function dominantColorAt(
  data: Uint8Array | number[],
  minSat: number,
): [number, number] | null {
  // 4 bits/channel → 4096 buckets. Each bucket accumulates a vibrancy-weighted
  // (s²) sum so the most saturated cluster wins decisively.
  const sumR = new Float64Array(4096)
  const sumG = new Float64Array(4096)
  const sumB = new Float64Array(4096)
  const score = new Float64Array(4096)
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3]
    if (a < 128) continue
    const r = data[i], g = data[i + 1], b = data[i + 2]
    const [, s, l] = rgbToHsl(r, g, b)
    if (l < 0.08 || l > 0.95) continue // skip near-black / near-white
    if (s < minSat) continue           // skip fringe / muddy / near-gray pixels
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)
    const w = 0.04 + s * s
    sumR[key] += r * w; sumG[key] += g * w; sumB[key] += b * w
    score[key] += w
  }
  let best = -1, bestScore = 0
  for (let k = 0; k < 4096; k++) {
    if (score[k] > bestScore) { bestScore = score[k]; best = k }
  }
  if (best < 0) return null
  const r = sumR[best] / score[best]
  const g = sumG[best] / score[best]
  const b = sumB[best] / score[best]
  const [h, s] = rgbToHsl(r, g, b)
  return [h, s]
}

// Pick the dominant color, preferring genuinely vivid clusters and only relaxing
// the saturation floor when nothing vivid exists (muted / monochrome artwork).
function dominantHue(data: Uint8Array | number[]): [number, number] {
  return (
    dominantColorAt(data, 0.55) ??
    dominantColorAt(data, 0.30) ??
    dominantColorAt(data, 0) ??
    [0.07, 0.6] // warm fallback hue
  )
}

/**
 * Derive a gradient from an album-art image URL. Cached + de-duped by URI.
 * Always resolves (returns DEFAULT_GRADIENT on any failure) so callers can use
 * it without try/catch.
 */
export async function gradientFromArt(uri: string | null | undefined): Promise<Gradient> {
  if (!uri) return DEFAULT_GRADIENT
  const cached = _cache.get(uri)
  if (cached) return cached
  const pending = _inflight.get(uri)
  if (pending) return pending

  const job = (async (): Promise<Gradient> => {
    let localUri: string | null = null
    try {
      // ImageManipulator can't read remote http(s) URLs directly ("not
      // readable"), so download the art to a cache file first, then manipulate
      // the local copy.
      let source = uri
      if (/^https?:\/\//.test(uri)) {
        const dest = `${FileSystem.cacheDirectory}art-${hashUri(uri)}.img`
        const dl = await FileSystem.downloadAsync(uri, dest)
        localUri = dl.uri
        source = dl.uri
      }
      const ctx = ImageManipulator.manipulate(source)
      // Larger sample + max quality: a 24px JPEG smears small vivid regions
      // (a logo/heart on black) into off-hue pixels via chroma subsampling.
      ctx.resize({ width: 48, height: 48 })
      const ref = await ctx.renderAsync()
      const { base64 } = await ref.saveAsync({ base64: true, compress: 1, format: SaveFormat.JPEG })
      if (!base64) return DEFAULT_GRADIENT
      const { data } = jpeg.decode(base64ToBytes(base64), { useTArray: true })
      const [h, s] = dominantHue(data)
      const grad = gradientFromHsl(h, s)
      _cache.set(uri, grad)
      _accentCache.set(uri, accentFromHsl(h, s))
      return grad
    } catch (e) {
      console.log('[albumColors] extraction failed:', e)
      return DEFAULT_GRADIENT
    } finally {
      _inflight.delete(uri)
      if (localUri) {
        FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => {})
      }
    }
  })()

  _inflight.set(uri, job)
  return job
}

// Convenience hook: returns a gradient derived from `uri`, defaulting to
// DEFAULT_GRADIENT (or a caller-supplied fallback) while it resolves.
export function useArtGradient(
  uri: string | null | undefined,
  fallback: Gradient = DEFAULT_GRADIENT,
): Gradient {
  const [grad, setGrad] = useState<Gradient>(_cache.get(uri ?? '') ?? fallback)
  useEffect(() => {
    if (!uri) { setGrad(fallback); return }
    let active = true
    gradientFromArt(uri).then((g) => { if (active) setGrad(g) })
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uri])
  return grad
}

/**
 * Vibrant accent gradient derived from the same dominant hue as the background
 * gradient — bright enough to read on the dark now-playing card (toggles,
 * buttons). Shares the extraction work with gradientFromArt via the URI cache.
 */
export async function accentFromArt(uri: string | null | undefined): Promise<Gradient> {
  if (!uri) return DEFAULT_ACCENT
  const cached = _accentCache.get(uri)
  if (cached) return cached
  await gradientFromArt(uri) // populates _accentCache as a side effect
  return _accentCache.get(uri) ?? DEFAULT_ACCENT
}

// Convenience hook: returns a vibrant accent gradient derived from `uri`,
// defaulting to DEFAULT_ACCENT (or a caller-supplied fallback) while it resolves.
export function useArtAccent(
  uri: string | null | undefined,
  fallback: Gradient = DEFAULT_ACCENT,
): Gradient {
  const [grad, setGrad] = useState<Gradient>(_accentCache.get(uri ?? '') ?? fallback)
  useEffect(() => {
    if (!uri) { setGrad(fallback); return }
    let active = true
    accentFromArt(uri).then((g) => { if (active) setGrad(g) })
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uri])
  return grad
}
