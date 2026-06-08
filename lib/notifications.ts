/**
 * Push notification helpers.
 *
 * Call registerForPushNotifications() once on app start (in _layout.tsx).
 * The Expo push token is saved to users.push_token so the server-side
 * Edge Function can look it up and deliver notifications when the app is closed.
 *
 * iOS requires a physical device — simulators won't receive push tokens.
 */
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { supabase } from './supabase'

// How notifications are displayed when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

// Register the "incoming call" notification category so meet-start pushes show
// Join / Decline action buttons (the closest Expo-managed approximation of a
// call-style alert without CallKit). Safe to call repeatedly.
export async function setupMeetNotificationCategory(): Promise<void> {
  if (Platform.OS === 'web') return
  try {
    await Notifications.setNotificationCategoryAsync('meet-incoming', [
      { identifier: 'join',    buttonTitle: 'Join',    options: { opensAppToForeground: true } },
      { identifier: 'decline', buttonTitle: 'Decline', options: { opensAppToForeground: false, isDestructive: true } },
    ])
  } catch (e) {
    console.log('[Push] setupMeetNotificationCategory error:', e)
  }
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'web') return null

  await setupMeetNotificationCategory()

  // Request permission
  const { status: existing } = await Notifications.getPermissionsAsync()
  const { status } = existing !== 'granted'
    ? await Notifications.requestPermissionsAsync()
    : { status: existing }

  if (status !== 'granted') {
    console.log('[Push] permission denied')
    return null
  }

  try {
    // Prefer the EAS projectId if configured, fall back to no-arg (works in dev builds)
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as any).easConfig?.projectId

    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : {},
    )

    console.log('[Push] token:', token)

    // Save to DB so the Edge Function can look it up
    const { data: { user } } = await supabase.auth.getUser()
    if (user && token) {
      await supabase.from('users').update({ push_token: token }).eq('id', user.id)
    }

    return token
  } catch (e) {
    // Simulator or missing projectId — not fatal
    console.log('[Push] could not get token:', e)
    return null
  }
}

// Notify all of the current user's followers that they started a Meet.
// Styled as an incoming call (high-priority, ringtone-like) so it grabs
// attention. Sends directly via the Expo push API — the followers' tokens are
// readable under the "Anyone can read users" RLS policy. The `meet-incoming`
// category + interruptionLevel let the client render a call-style UI.
export async function notifyFollowersOfMeet(meetId: string, meetName: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: host }, { data: followers }] = await Promise.all([
      supabase.from('users').select('username, display_name').eq('id', user.id).single(),
      supabase.from('follows').select('follower_id').eq('following_id', user.id),
    ])

    const followerIds = (followers ?? []).map(f => f.follower_id)
    if (followerIds.length === 0) return

    const { data: tokenRows } = await supabase
      .from('users')
      .select('push_token')
      .in('id', followerIds)
      .not('push_token', 'is', null)

    const tokens = (tokenRows ?? []).map(r => r.push_token).filter(Boolean)
    if (tokens.length === 0) return

    const hostName = host?.display_name || host?.username || 'Someone'

    // Expo accepts an array of up to 100 messages per request.
    const messages = tokens.map(to => ({
      to,
      title: `${hostName} is live`,
      body: `Tap to join "${meetName}"`,
      sound: 'default',
      priority: 'high',
      categoryId: 'meet-incoming',
      interruptionLevel: 'time-sensitive',
      data: { type: 'meet-incoming', meetId, hostName, meetName },
    }))

    for (let i = 0; i < messages.length; i += 100) {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messages.slice(i, i + 100)),
      })
    }
  } catch (e) {
    console.log('[Push] notifyFollowersOfMeet error:', e)
  }
}

// Send `messages` to Expo's push API in batches of 100. Best-effort; errors swallowed.
async function pushBatch(messages: any[]): Promise<void> {
  for (let i = 0; i < messages.length; i += 100) {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages.slice(i, i + 100)),
    });
  }
}

async function tokensFor(userIds: string[]): Promise<string[]> {
  if (userIds.length === 0) return [];
  const { data } = await supabase
    .from('users')
    .select('push_token')
    .in('id', userIds)
    .not('push_token', 'is', null);
  return (data ?? []).map((r: any) => r.push_token).filter(Boolean);
}

/** Goal #9: notify community members who follow the author when they post inside a community. */
export async function notifyFollowersOfCommunityPost(
  authorId: string, communityId: string, postPreview: string,
): Promise<void> {
  try {
    const [{ data: author }, { data: community }, { data: followers }, { data: members }] = await Promise.all([
      supabase.from('users').select('display_name, username').eq('id', authorId).single(),
      supabase.from('communities').select('name, slug').eq('id', communityId).single(),
      supabase.from('follows').select('follower_id').eq('following_id', authorId),
      supabase
        .from('community_members')
        .select('user_id, notification_preference')
        .eq('community_id', communityId)
        .neq('user_id', authorId),
    ]);
    const followerIds = new Set((followers ?? []).map((r: any) => r.follower_id));
    const recipients = (members ?? [])
      .filter((m: any) => m.notification_preference === 'all' && followerIds.has(m.user_id))
      .map((m: any) => m.user_id);
    const tokens = await tokensFor(recipients);
    if (tokens.length === 0) return;
    const authorName = author?.display_name || author?.username || 'Someone';
    const communityName = community?.name ?? 'a community';
    await pushBatch(tokens.map((to) => ({
      to,
      title: `${authorName} posted in ${communityName}`,
      body: postPreview || 'New post',
      sound: 'default', priority: 'high',
      data: { type: 'community-post', communityId, authorId },
    })));
  } catch (e) { console.log('[Push] notifyFollowersOfCommunityPost error:', e); }
}

/** Goal #9: notify the community owner whenever someone joins. */
export async function notifyOwnerOfNewMember(
  communityId: string, joinerId: string,
): Promise<void> {
  try {
    const [{ data: community }, { data: joiner }] = await Promise.all([
      supabase.from('communities').select('name, created_by, creator_id').eq('id', communityId).single(),
      supabase.from('users').select('display_name, username').eq('id', joinerId).single(),
    ]);
    const ownerId = community?.created_by ?? community?.creator_id;
    if (!ownerId || ownerId === joinerId) return;
    const tokens = await tokensFor([ownerId]);
    if (tokens.length === 0) return;
    const joinerName = joiner?.display_name || joiner?.username || 'Someone';
    await pushBatch(tokens.map((to) => ({
      to,
      title: `${joinerName} joined ${community?.name ?? 'your community'}`,
      body: 'Welcome them with a post 🎉',
      sound: 'default', priority: 'high',
      data: { type: 'community-new-member', communityId, joinerId },
    })));
  } catch (e) { console.log('[Push] notifyOwnerOfNewMember error:', e); }
}

/** Goal #9: notify all community members when a post becomes "hot" (>50 likes or >20 comments). */
export async function notifyHotPost(
  communityId: string, postId: string, postPreview: string,
): Promise<void> {
  try {
    const [{ data: community }, { data: members }] = await Promise.all([
      supabase.from('communities').select('name').eq('id', communityId).single(),
      supabase
        .from('community_members')
        .select('user_id, notification_preference')
        .eq('community_id', communityId),
    ]);
    const recipients = (members ?? [])
      .filter((m: any) => m.notification_preference === 'all')
      .map((m: any) => m.user_id);
    const tokens = await tokensFor(recipients);
    if (tokens.length === 0) return;
    await pushBatch(tokens.map((to) => ({
      to,
      title: `🔥 Hot post in ${community?.name ?? 'a community'}`,
      body: postPreview || 'Check what people are talking about.',
      sound: 'default', priority: 'high',
      data: { type: 'community-hot-post', communityId, postId },
    })));
  } catch (e) { console.log('[Push] notifyHotPost error:', e); }
}

// Fan out a community-meet notification to every member of the community
// (excluding the host). Notification body shows community name, host name, and
// current song. Members can mute per-community via notification_preference.
export async function notifyCommunityOfMeet(
  meetId: string,
  meetName: string,
  communityId: string,
  currentSong: string | null,
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: host }, { data: community }, { data: members }] = await Promise.all([
      supabase.from('users').select('username, display_name').eq('id', user.id).single(),
      supabase.from('communities').select('name, slug').eq('id', communityId).single(),
      supabase
        .from('community_members')
        .select('user_id, notification_preference')
        .eq('community_id', communityId)
        .neq('user_id', user.id),
    ])

    // 'meets' and 'all' opt-in; 'muted' skipped.
    const recipientIds = (members ?? [])
      .filter((m: any) => m.notification_preference !== 'muted')
      .map((m: any) => m.user_id)
    if (recipientIds.length === 0) return

    const { data: tokenRows } = await supabase
      .from('users')
      .select('push_token')
      .in('id', recipientIds)
      .not('push_token', 'is', null)

    const tokens = (tokenRows ?? []).map((r: any) => r.push_token).filter(Boolean)
    if (tokens.length === 0) return

    const hostName = host?.display_name || host?.username || 'Someone'
    const communityName = community?.name ?? 'a community'
    const body = currentSong
      ? `${hostName} is live in ${communityName} — now playing ${currentSong}`
      : `${hostName} is live in ${communityName} — "${meetName}"`

    const messages = tokens.map((to: string) => ({
      to,
      title: `${communityName} · live`,
      body,
      sound: 'default',
      priority: 'high',
      categoryId: 'meet-incoming',
      interruptionLevel: 'time-sensitive',
      data: { type: 'community-meet-incoming', meetId, communityId, hostName, meetName, song: currentSong },
    }))

    for (let i = 0; i < messages.length; i += 100) {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messages.slice(i, i + 100)),
      })
    }
  } catch (e) {
    console.log('[Push] notifyCommunityOfMeet error:', e)
  }
}
