import { supabase } from '../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ConversationInfo = {
  conversationId: string
  otherUser: {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
  }
  last_message_at: string | null
  last_message_preview: string | null
}

export type DbMessage = {
  id: string
  conversation_id: string
  sender_id: string
  body: string | null
  type: 'text' | 'spotify_track'
  spotify_track_id: string | null
  spotify_track_name: string | null
  spotify_track_artist: string | null
  spotify_album_art: string | null
  reply_to_id: string | null
  reply_to_preview: string | null   // short quoted text shown in bubble
  created_at: string
}

// ─── Conversations ────────────────────────────────────────────────────────────

// Get or create a DM conversation between the current user and another user.
// Canonically orders user_a < user_b so there can only ever be one row per pair.
export const getOrCreateConversation = async (
  otherUserId: string,
): Promise<string | null> => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [a, b] = [user.id, otherUserId].sort()

  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('user_a', a)
    .eq('user_b', b)
    .maybeSingle()

  if (existing) return existing.id

  const { data: created, error } = await supabase
    .from('conversations')
    .insert({ user_a: a, user_b: b })
    .select('id')
    .single()

  if (error) { console.error('[messages] create conv:', error.message); return null }
  return created.id
}

// Load all conversations for the current user, newest first.
export const getConversations = async (): Promise<ConversationInfo[]> => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('conversations')
    .select('id, user_a, user_b, last_message_at, last_message_preview')
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
    .order('last_message_at', { ascending: false, nullsFirst: false })

  if (error || !data) return []

  // Batch-fetch all other users in one query
  const otherIds = data.map(c => (c.user_a === user.id ? c.user_b : c.user_a))
  const { data: others } = await supabase
    .from('users')
    .select('id, username, display_name, avatar_url')
    .in('id', otherIds)

  const byId = Object.fromEntries((others ?? []).map(u => [u.id, u]))

  return data.map(c => {
    const otherId = c.user_a === user.id ? c.user_b : c.user_a
    const other = byId[otherId] ?? { id: otherId, username: 'unknown', display_name: null, avatar_url: null }
    return {
      conversationId: c.id,
      otherUser: other,
      last_message_at: c.last_message_at,
      last_message_preview: c.last_message_preview,
    }
  })
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export const getMessages = async (conversationId: string): Promise<DbMessage[]> => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error || !data) return []
  return data as DbMessage[]
}

export const sendTextMessage = async (
  conversationId: string,
  body: string,
  replyTo?: { id: string; preview: string } | null,
): Promise<DbMessage | null> => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !body.trim()) return null

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      body: body.trim(),
      type: 'text',
      reply_to_id:      replyTo?.id      ?? null,
      reply_to_preview: replyTo?.preview ?? null,
    })
    .select()
    .single()

  if (error) { console.error('[messages] sendText:', error.message); return null }
  return data as DbMessage
}

export const sendSpotifyTrackMessage = async (
  conversationId: string,
  track: { id: string; name: string; artist: string; albumArt: string | null },
): Promise<DbMessage | null> => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      body: null,
      type: 'spotify_track',
      spotify_track_id: track.id,
      spotify_track_name: track.name,
      spotify_track_artist: track.artist,
      spotify_album_art: track.albumArt,
    })
    .select()
    .single()

  if (error) { console.error('[messages] sendTrack:', error.message); return null }
  return data as DbMessage
}
