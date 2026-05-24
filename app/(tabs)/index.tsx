import { View, StyleSheet, Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import * as SecureStore from 'expo-secure-store';

// Prevents re-triggering the animation when navigating back from a screen
let hasLaunched = false;

export default function SplashScreen() {
  const router = useRouter();
  const trackOpacity = useRef(new Animated.Value(1)).current;
  const meetScale = useRef(new Animated.Value(1)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (hasLaunched) return;

    // Check for a saved session in parallel with the splash animation.
    // By the time the animation ends (~2s) the session check is always done.
    let destination: '/feed' | '/onboarding' | '/signup' = '/onboarding';
    const sessionCheck = supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        destination = '/feed';
      } else {
        // If the user has signed in before, skip onboarding and go straight to login
        const hasSignedIn = await SecureStore.getItemAsync('trackmeet_has_signed_in');
        if (hasSignedIn) destination = '/signup';
      }
    });

    const timer = setTimeout(() => {
      hasLaunched = true;

      Animated.parallel([
        Animated.timing(trackOpacity, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(meetScale, {
          toValue: 40,
          duration: 700,
          easing: Easing.in(Easing.exp),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(300),
          Animated.timing(overlayOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      ]).start(async () => {
        await sessionCheck; // ensure session check finished before navigating
        router.replace(destination);
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.Text style={[styles.title, { transform: [{ scale: meetScale }] }]}>
        Track Meet
      </Animated.Text>
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: '#0D0D0D', opacity: overlayOpacity }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#AB00FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 55,
    color: '#ffffff',
    fontFamily: 'Pacifico_400Regular',
    lineHeight: 100,
  },
});
