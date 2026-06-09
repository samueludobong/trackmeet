// Import at root so TaskManager.defineTask is called before any background wakeup
import '../lib/backgroundSync';
import '../lib/meetSync';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Inter_900Black } from '@expo-google-fonts/inter';
import { Pacifico_400Regular } from '@expo-google-fonts/pacifico';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { registerForPushNotifications } from '../lib/notifications';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({ Inter_900Black, Pacifico_400Regular });

  // Register for push notifications once fonts are ready and user may be logged in
  useEffect(() => {
    if (fontsLoaded) registerForPushNotifications();
  }, [fontsLoaded]);

  // When a meet "incoming call" notification is tapped (Join or the body),
  // route to the feed and open the listener room for that meet.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as any;
      if (data?.type === 'meet-incoming' && data?.meetId) {
        if (response.actionIdentifier === 'decline') return;
        router.push({ pathname: '/feed', params: { openMeetId: String(data.meetId) } });
      }
    });
    return () => sub.remove();
  }, []);

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="signup" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="feed" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="user-profile"    options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="artist-profile" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="spotify-callback" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="story-composer"    options={{ headerShown: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="story-card-picker" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="story-text-editor" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="story-viewer"      options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
