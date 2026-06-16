import * as AuthSession from 'expo-auth-session'
import * as WebBrowser from 'expo-web-browser'
import * as Crypto from 'expo-crypto'
import * as Linking from 'expo-linking'
import { supabase } from '../supabase'

export type SpotifyWriteResult =
  | { ok: true }
  | { ok: false; status: number; needsReconnect: boolean; message?: string }

// Pull a useful message out of a Spotify error response without crashing if
// the body isn't JSON. (Spotify *usually* returns { error: { message, status } }
// but a 503 / network blip might be plain text or empty.)

export async function _readSpotifyErr(res: Response): Promise<string | undefined> {
  try {
    const t = await res.text()
    // Log the raw body so we can see exactly what Spotify says â€” "Insufficient
    // client scope" means missing playlist-modify scope, "Forbidden" with no
    // body usually means the request never reached the Spotify API (bad/empty
    // token), and "You cannot modify this playlist" means we hit a playlist we
    // don't own.
    if (t) console.log('[Spotify] error body:', t.slice(0, 400))
    if (!t) return undefined
    try {
      const j = JSON.parse(t)
      return j?.error?.message ?? j?.message ?? t.slice(0, 200)
    } catch {
      return t.slice(0, 200)
    }
  } catch { return undefined }
}

// Short token prefix for logging â€” never log the full token.

export const _tokPfx = (t: string | null | undefined) =>
  !t ? '<null>' : t.length < 12 ? t : t.slice(0, 8) + 'â€¦'

export function _writeResultFrom(res: Response, message?: string): SpotifyWriteResult {
  if (res.ok) return { ok: true }
  // 401 = revoked / expired, 403 = wrong scope. Both need reconnect.
  return { ok: false, status: res.status, needsReconnect: res.status === 401 || res.status === 403, message }
}

// Add a track URI to a Spotify playlist.

