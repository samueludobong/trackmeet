import { supabase } from './supabase'
import { notifyFollowersOfMeet } from './notifications'

// ─── Types ────────────────────────────────────────────────────────────────────

export type MeetRow = {
  id: string
  host_id: string
  name: string
  description: string | null
  tags: string[]
  allow_comments: boolean
  allow_reactions: boolean
  is_live: boolean
  created_at: string
  ended_at: string | null
  current_track_id: string | null
  current_track_name: string | null
  current_track_artist: string | null
  current_track_album_art: string | null
  current_track_duration_ms: number | null
  current_track_position_ms: number | null
  current_track_is_playing: boolean
  position_updated_at: string | null
  talk_mode: boolean
  show_on_profile: boolean
}

export type LiveMeet = MeetRow & {
  host: { id: string; username: string; display_name: string | null; avatar_url: string | null }
  listenerCount: number
}

export type MeetMessage = {
  id: string
  meet_id: string
  user_id: string
  body: string
  created_at: string
  author?: { username: string; display_name: string | null; avatar_url: string | null }
}

export type MeetTrack = {
  id: string
  meet_id: string
  track_id: string
  name: string
  artist: string | null
  album_art: string | null
  played_at: string
}

export type MeetTrackState = {
  id: string | null
  name: string | null
  artist: string | null
  albumArt: string | null
  durationMs: number | null
  positionMs: number | null
  isPlaying: boolean
  positionUpdatedAt: string | null
  talkMode: boolean
}

// ─── Create / end ───────────────────────────────────────────────────────────

// Create a live meet, mark the host as the first participant, and fan out a
// push notification to all of the host's followers. Returns the new meet id.
export const startMeet = async (opts: {
  name: string
  description?: string | null
  tags?: string[]
  allowComments?: boolean
  allowReactions?: boolean
}): Promise<{ meetId?: string; error?: string }> => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('meets')
    .insert({
      host_id:         user.id,
      name:            opts.name.trim(),
      description:     opts.description?.trim() || null,
      tags:            opts.tags ?? [],
      allow_comments:  opts.allowComments ?? true,
      allow_reactions: opts.allowReactions ?? true,
      is_live:         true,
    })
    .select('id')
    .single()

  if (error || !data) return { error: error?.message ?? 'Could not start meet' }

  // Host joins their own meet so the listener count starts at 1.
  await supabase.from('meet_participants').upsert(
    { meet_id: data.id, user_id: user.id, is_active: true, left_at: null },
    { onConflict: 'meet_id,user_id' },
  )

  // Fire-and-forget — never block starting the meet on notification delivery.
  notifyFollowersOfMeet(data.id, opts.name.trim()).catch(() => {})

  return { meetId: data.id }
}

// End a meet: mark not-live, stamp ended_at, deactivate all participants.
export const endMeet = async (meetId: string): Promise<void> => {
  await supabase
    .from('meets')
    .update({ is_live: false, ended_at: new Date().toISOString(), talk_mode: false })
    .eq('id', meetId)
  await supabase
    .from('meet_participants')
    .update({ is_active: false, left_at: new Date().toISOString() })
    .eq('meet_id', meetId)
}

// ─── Join / leave ─────────────────────────────────────────────────────────────

// Join a meet either privately (default) or publicly. Public participation is
// surfaced on the joiner's profile now-playing for other users to discover and
// join; private participation is invisible (their profile shows a normal
// now-playing, so nobody can tell they're in a meet).
export const joinMeet = async (
  meetId: string,
  isPublic = false,
): Promise<{ error?: string }> => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { error } = await supabase.from('meet_participants').upsert(
    { meet_id: meetId, user_id: user.id, is_active: true, left_at: null, is_public: isPublic },
    { onConflict: 'meet_id,user_id' },
  )
  return { error: error?.message }
}

// A user's active meet participation, paired with the live meet + its host.
export type ActiveMeetForUser = {
  meet: MeetRow
  host: { id: string; username: string; display_name: string | null; avatar_url: string | null }
  isPublic: boolean
  isHost: boolean
}

// Find the meet a user is currently in. Used to render the "in [host]" variant
// of their now-playing. Pass publicOnly=true when the viewer isn't the user
// themselves, so private participation stays hidden.
export const getActiveMeetForUser = async (
  userId: string,
  publicOnly = false,
): Promise<ActiveMeetForUser | null> => {
  // Don't filter is_public in the query: a meet the user *hosts* is inherently
  // public (it's a broadcast) even though their own participant row is private,
  // so we decide visibility per-row below once we know the host.
  const { data: parts } = await supabase
    .from('meet_participants')
    .select('meet_id, is_public')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('joined_at', { ascending: false })
    .limit(5)
  if (!parts || parts.length === 0) return null

  // Resolve the first participation that points at a still-live meet.
  for (const p of parts) {
    const { data: meet } = await supabase
      .from('meets').select('*').eq('id', p.meet_id).eq('is_live', true).maybeSingle()
    if (!meet) continue
    const isHost = meet.host_id === userId
    // External viewers only see public participation — or any meet this user hosts.
    if (publicOnly && !p.is_public && !isHost) continue
    const { data: host } = await supabase
      .from('users').select('id, username, display_name, avatar_url').eq('id', meet.host_id).single()
    return {
      meet: meet as MeetRow,
      host: host ?? { id: meet.host_id, username: 'unknown', display_name: null, avatar_url: null },
      isPublic: p.is_public || isHost,
      isHost,
    }
  }
  return null
}

export const leaveMeet = async (meetId: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase
    .from('meet_participants')
    .update({ is_active: false, left_at: new Date().toISOString() })
    .eq('meet_id', meetId)
    .eq('user_id', user.id)
}

export const getActiveListenerCount = async (meetId: string): Promise<number> => {
  const { count } = await supabase
    .from('meet_participants')
    .select('id', { count: 'exact', head: true })
    .eq('meet_id', meetId)
    .eq('is_active', true)
  return count ?? 0
}

// ─── Discovery ────────────────────────────────────────────────────────────────

// All live meets hosted by users the current user follows, plus their own,
// sorted by active listener count (descending).
export const getLiveMeetsFromFollowing = async (): Promise<LiveMeet[]> => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: follows } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id)

  const hostIds = [...new Set([...(follows?.map(f => f.following_id) ?? []), user.id])]
  if (hostIds.length === 0) return []

  const { data: meets } = await supabase
    .from('meets')
    .select('*')
    .eq('is_live', true)
    .in('host_id', hostIds)
    .order('created_at', { ascending: false })

  if (!meets || meets.length === 0) return []

  // Batch-fetch hosts.
  const { data: hosts } = await supabase
    .from('users')
    .select('id, username, display_name, avatar_url')
    .in('id', [...new Set(meets.map(m => m.host_id))])
  const hostById = Object.fromEntries((hosts ?? []).map(h => [h.id, h]))

  // Listener counts per meet.
  const withCounts = await Promise.all(
    meets.map(async (m: MeetRow) => ({
      ...m,
      host: hostById[m.host_id] ?? { id: m.host_id, username: 'unknown', display_name: null, avatar_url: null },
      listenerCount: await getActiveListenerCount(m.id),
    })),
  )

  return withCounts.sort((a, b) => b.listenerCount - a.listenerCount)
}

export const getMeet = async (meetId: string): Promise<MeetRow | null> => {
  const { data } = await supabase.from('meets').select('*').eq('id', meetId).single()
  return (data as MeetRow) ?? null
}

// ─── Live playback state (host writes, listener reads) ──────────────────────────

export const updateMeetTrack = async (
  meetId: string,
  t: {
    id: string | null
    name: string | null
    artist: string | null
    albumArt: string | null
    durationMs: number | null
    positionMs: number | null
    isPlaying: boolean
  },
): Promise<void> => {
  await supabase
    .from('meets')
    .update({
      current_track_id:          t.id,
      current_track_name:        t.name,
      current_track_artist:      t.artist,
      current_track_album_art:   t.albumArt,
      current_track_duration_ms: t.durationMs,
      current_track_position_ms: t.positionMs,
      current_track_is_playing:  t.isPlaying,
      position_updated_at:       new Date().toISOString(),
    })
    .eq('id', meetId)
}

export const meetRowToTrackState = (m: MeetRow): MeetTrackState => ({
  id:                m.current_track_id,
  name:              m.current_track_name,
  artist:            m.current_track_artist,
  albumArt:          m.current_track_album_art,
  durationMs:        m.current_track_duration_ms,
  positionMs:        m.current_track_position_ms,
  isPlaying:         m.current_track_is_playing,
  positionUpdatedAt: m.position_updated_at,
  talkMode:          m.talk_mode,
})

export const setTalkMode = async (meetId: string, on: boolean): Promise<void> => {
  await supabase.from('meets').update({ talk_mode: on }).eq('id', meetId)
}

// Host opts to surface this meet's tracklist on their profile (or hides it).
export const setMeetOnProfile = async (meetId: string, on: boolean): Promise<void> => {
  await supabase.from('meets').update({ show_on_profile: on }).eq('id', meetId)
}

// ─── Tracklist ──────────────────────────────────────────────────────────────

// Append a track to the meet's tracklist, skipping consecutive duplicates.
export const recordMeetTrack = async (
  meetId: string,
  t: { id: string; name: string; artist: string | null; albumArt: string | null },
): Promise<void> => {
  const { data: last } = await supabase
    .from('meet_tracks')
    .select('track_id')
    .eq('meet_id', meetId)
    .order('played_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (last?.track_id === t.id) return

  await supabase.from('meet_tracks').insert({
    meet_id:   meetId,
    track_id:  t.id,
    name:      t.name,
    artist:    t.artist,
    album_art: t.albumArt,
  })
}

export const getMeetTracks = async (meetId: string): Promise<MeetTrack[]> => {
  const { data } = await supabase
    .from('meet_tracks')
    .select('*')
    .eq('meet_id', meetId)
    .order('played_at', { ascending: true })
  return (data as MeetTrack[]) ?? []
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export const getMeetMessages = async (meetId: string): Promise<MeetMessage[]> => {
  const { data } = await supabase
    .from('meet_messages')
    .select('*, author:users!user_id(username, display_name, avatar_url)')
    .eq('meet_id', meetId)
    .order('created_at', { ascending: true })
    .limit(200)
  return (data as MeetMessage[]) ?? []
}

export const sendMeetMessage = async (
  meetId: string,
  body: string,
): Promise<MeetMessage | null> => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !body.trim()) return null
  const { data, error } = await supabase
    .from('meet_messages')
    .insert({ meet_id: meetId, user_id: user.id, body: body.trim() })
    .select('*, author:users!user_id(username, display_name, avatar_url)')
    .single()
  if (error) { console.log('[meets] sendMessage:', error.message); return null }
  return data as MeetMessage
}
