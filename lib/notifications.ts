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

export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'web') return null

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
