import { useRef, useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { type UserProfile } from "../app/data/mock";
import { Animated } from "react-native";
import * as SecureStore from "expo-secure-store";
import { supabase } from "../lib/supabase";
import { connectSpotify, disconnectSpotify } from "../lib/spotify";
import { SAVED_ACCOUNTS_KEY } from "../constants/profile";
import { SW } from "../lib/feed/dimensions";
import { useNowPlayingCtx } from "../lib/feed/contexts";
import { type SavedAccount } from "../types/profile";
import { useUserSettings } from "./useUserSettings";

export function useSettingsOverlay({ profile, userId, onClose, onProfileRefresh }: { profile: UserProfile | null; userId: string | null; onClose: () => void; onProfileRefresh: () => void }) {
  const { resetSpotify, refresh: refreshNowPlaying } = useNowPlayingCtx();

  // Which screen is visible: 'main' | 'connected-apps' | 'preferences'
  type Screen = 'main' | 'connected-apps' | 'preferences';
  const [screen,      setScreen]      = useState<Screen>('main');
  const [showConfirm, setShowConfirm] = useState(false);
  const [signingOut,  setSigningOut]  = useState(false);

  // User settings (preferences sub-screen)
  const { settings: userSettings, updateSetting } = useUserSettings(userId);

  // Connected-apps sub-screen state
  const [spotifyConnected,    setSpotifyConnected]    = useState(!!profile?.spotify_access_token);
  const [showDisconnectAlert, setShowDisconnectAlert] = useState(false);
  const [disconnecting,       setDisconnecting]       = useState(false);
  const [connecting,          setConnecting]          = useState(false);

  const slideAnim    = useRef(new Animated.Value(400)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  // Sub-screen slides in from the right (within the sheet)
  const subSlideX    = useRef(new Animated.Value(SW)).current;
  const router = useRouter();

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim,    { toValue: 0, useNativeDriver: true, damping: 24, stiffness: 200 }),
      Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, []);

  const close = () => {
    Animated.parallel([
      Animated.timing(slideAnim,    { toValue: 400, duration: 200, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 0,   duration: 180, useNativeDriver: true }),
    ]).start(onClose);
  };

  // Push to a sub-screen
  const openScreen = (s: Screen) => {
    setScreen(s);
    subSlideX.setValue(SW);
    Animated.spring(subSlideX, { toValue: 0, useNativeDriver: true, damping: 24, stiffness: 220 }).start();
  };

  const goBack = () => {
    Animated.timing(subSlideX, { toValue: SW, duration: 220, useNativeDriver: true }).start(() => {
      setScreen('main');
      setShowDisconnectAlert(false);
    });
  };

  // ── Sign-out ──────────────────────────────────────────────────────────────
  const doSignOut = async (save: boolean) => {
    setSigningOut(true);
    try {
      if (save && profile) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          const account: SavedAccount = {
            email: user.email,
            displayName: profile.display_name ?? profile.username ?? "",
            username: profile.username ?? "",
            avatarUrl: profile.avatar_url ?? null,
          };
          const raw = await SecureStore.getItemAsync(SAVED_ACCOUNTS_KEY);
          const existing: SavedAccount[] = raw ? JSON.parse(raw) : [];
          const merged = [account, ...existing.filter(a => a.email !== account.email)];
          await SecureStore.setItemAsync(SAVED_ACCOUNTS_KEY, JSON.stringify(merged));
        }
      }
      await supabase.auth.signOut();
      router.replace("/signup");
    } catch (e) {
      console.error("signOut error", e);
      setSigningOut(false);
    }
  };

  // ── Spotify disconnect ────────────────────────────────────────────────────
  const handleDisconnect = async () => {
    if (!userId) return;
    setDisconnecting(true);
    await disconnectSpotify(userId);
    // Immediately wipe context state so all screens reflect the change
    resetSpotify();
    setSpotifyConnected(false);
    setShowDisconnectAlert(false);
    setDisconnecting(false);
    onProfileRefresh();
  };

  // ── Spotify connect ───────────────────────────────────────────────────────
  const handleConnect = async () => {
    if (!userId || connecting) return;
    setConnecting(true);
    const result = await connectSpotify(userId);
    setConnecting(false);
    if ('success' in result && result.success) {
      // Wipe stale cache then immediately poll with the new token
      resetSpotify();
      refreshNowPlaying();
      setSpotifyConnected(true);
      onProfileRefresh();
    } else if ('error' in result) {
      console.log('[Settings] Spotify connect error:', result.error);
    }
  };


  return { screen, setScreen, showConfirm, setShowConfirm, signingOut, setSigningOut, spotifyConnected, setSpotifyConnected, showDisconnectAlert, setShowDisconnectAlert, disconnecting, setDisconnecting, connecting, setConnecting, slideAnim, backdropAnim, subSlideX, router, close, openScreen, goBack, doSignOut, handleDisconnect, handleConnect, userSettings, updateSetting };
}
