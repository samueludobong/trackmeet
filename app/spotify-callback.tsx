import { useEffect } from 'react'
import { View } from 'react-native'
import { useRouter } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'

// This screen exists purely as a deep-link landing target for the
// trackmeet://spotify-callback OAuth redirect on Android.
//
// On iOS, openAuthSessionAsync (ASWebAuthenticationSession) intercepts the
// redirect internally and never navigates here.
// On Android, Chrome Custom Tabs fires a deep-link intent that Expo Router
// picks up; without this file the router shows "unknown route".
//
// When this screen mounts it calls maybeCompleteAuthSession() so
// expo-web-browser's openAuthSessionAsync promise resolves with the URL,
// then navigates back so the user never actually sees this blank screen.

WebBrowser.maybeCompleteAuthSession()

export default function SpotifyCallbackScreen() {
  const router = useRouter()

  useEffect(() => {
    // Give openAuthSessionAsync one tick to capture the URL, then go back.
    const t = setTimeout(() => {
      if (router.canGoBack()) router.back()
      else router.replace('/(tabs)')
    }, 0)
    return () => clearTimeout(t)
  }, [])

  return <View style={{ flex: 1, backgroundColor: '#0D0D0D' }} />
}
