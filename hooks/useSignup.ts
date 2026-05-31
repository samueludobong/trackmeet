import { useRef, useState, useEffect } from "react";
import { TOTAL_STEPS, SAVED_ACCOUNTS_KEY } from "../constants/signup";
import { useRouter } from "expo-router";
import { useSharedValue, useAnimatedStyle, interpolateColor, withTiming, Easing } from "react-native-reanimated";
import { type Mode, type SavedAccount } from "../types/auth";
import { View, Animated, Keyboard } from "react-native";
import * as SecureStore from "expo-secure-store";
import { supabase } from "../lib/supabase";
import { connectSpotify } from "../lib/spotify";
import { SH } from "../lib/feed/dimensions";

export function useSignup() {
  const [mode, setMode] = useState<Mode>("idle");
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [birthday, setBirthday] = useState("2007-01-01"); // YYYY-MM-DD
  const [streaming, setStreaming] = useState<Set<string>>(new Set());
  const [followed, setFollowed] = useState<Set<string>>(new Set(["a1", "a5"]));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);

  const [spotifyTokens, setSpotifyTokens] = useState<{
    spotifyId: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
    topGenres: string[];
    topArtistIds: string[];
  } | null>(null);

  const router = useRouter();

  // Intro animations
  const slideAnim = useRef(new Animated.Value(SH * 0.5)).current;
  const contentFade = useRef(new Animated.Value(0)).current;
  const switchFade = useRef(new Animated.Value(1)).current;

  // Expanded card slide-up
  const expandY = useRef(new Animated.Value(SH * 0.3)).current;
  const expandO = useRef(new Animated.Value(0)).current;

  // Login zoom-to-fill
  const loginBtnRef = useRef<View>(null);
  const loginExpandScale = useRef(new Animated.Value(1)).current;
  const [showLoginExpand, setShowLoginExpand] = useState(false);
  const [loginExpandLayout, setLoginExpandLayout] = useState({
    x: 0,
    y: 0,
    w: 0,
    h: 0,
  });

  // Reanimated card background
  const cardBgProgress = useSharedValue(0);
  const cardAnimStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      cardBgProgress.value,
      [0, 1],
      ["rgba(255,255,255,0.12)", "rgba(255,255,255,0.20)"],
    ),
  }));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentFade, {
        toValue: 1,
        duration: 1000,
        delay: 1500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 50,
        delay: 100,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const fade = (cb: () => void) => {
    Animated.timing(switchFade, {
      toValue: 0,
      duration: 140,
      useNativeDriver: true,
    }).start(() => {
      cb();
      Animated.sequence([
        Animated.delay(200),
        Animated.timing(switchFade, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const openExpanded = (cb: () => void) => {
    cb();
    Animated.parallel([
      Animated.spring(expandY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 22,
        stiffness: 190,
      }),
      Animated.timing(expandO, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeExpanded = (cb: () => void) => {
    Animated.parallel([
      Animated.timing(expandY, {
        toValue: SH * 0.3,
        duration: 240,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(expandO, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => cb());
  };

  const resetStates = () => {
    setEmail("");
    setPassword("");
    setUsername("");
    setBirthday("2007-01-01");
    setStreaming(new Set());
    setFollowed(new Set(["a1", "a5"]));
    setError("");
    setLoading(false);
    setSpotifyTokens(null);
  };

  useEffect(() => {
    resetStates();
    // Check for saved accounts to show quick-login screen
    (async () => {
      const raw = await SecureStore.getItemAsync(SAVED_ACCOUNTS_KEY);
      if (raw) {
        try {
          const accs: SavedAccount[] = JSON.parse(raw);
          if (accs.length > 0) {
            setSavedAccounts(accs);
            setMode("accounts");
            // Animate the expanded card in after the initial mount animation
            setTimeout(() => openExpanded(() => {}), 150);
          }
        } catch {}
      }
    })();
  }, []);

  const switchMode = (next: Mode) =>
    fade(() => {
      resetStates();
      setMode(next);
      setStep(1);
      // Reset expanded state immediately
      expandY.setValue(SH * 0.3);
      expandO.setValue(0);
      cardBgProgress.value = withTiming(next === "idle" ? 0 : 1, {
        duration: 360,
      });
    });

  const goToStep = (s: number) => {
    const wasExpanded = step > 1;
    const willExpand = s > 1;

    if (!wasExpanded && willExpand) {
      // Step 1 → step 2+: open full card
      fade(() => {
        setStep(s);
        openExpanded(() => {});
      });
    } else if (wasExpanded && !willExpand) {
      // Step 2 → step 1: close full card
      closeExpanded(() => fade(() => setStep(s)));
    } else {
      // Already expanded, just cross-fade content
      fade(() => setStep(s));
    }
  };

  const toggleStreaming = (id: string) =>
    setStreaming((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const toggleFollowed = (id: string) =>
    setFollowed((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const handleConnectSpotify = async () => {
    setLoading(true);
    setError("");
    // No userId — user row doesn't exist yet during onboarding.
    // connectSpotify will return the tokens for us to store in state
    // and include in the INSERT when the account is finally created.
    const result = await connectSpotify();
    if (result.success) {
      setSpotifyTokens({
        spotifyId:    result.spotifyId!,
        accessToken:  result.accessToken!,
        refreshToken: result.refreshToken!,
        expiresAt:    result.expiresAt!,
        topGenres:    result.topGenres ?? [],
        topArtistIds: result.topArtistIds ?? [],
      });
      setStreaming((p) => new Set([...p, "spotify"]));
      goToStep(6);
    } else {
      setError(result.error ?? "Failed to connect Spotify");
    }
    setLoading(false);
  };

  const expanded = (mode === "signup" && step > 1) || mode === "accounts";

  const handleSelectSavedAccount = (account: SavedAccount) => {
    setEmail(account.email);
    setPassword("");
    setError("");
    closeExpanded(() => {
      setMode("login");
      setStep(1);
    });
  };

  const handleUseAnotherAccount = () => {
    closeExpanded(() => {
      setMode("idle");
      setStep(1);
    });
  };

  // ── Derive primary streaming service for DB ───────────────────────────────
  const getSelectedService = () => {
    if (streaming.has("spotify")) return "spotify";
    if (streaming.has("apple")) return "apple_music";
    return "none";
  };

  // ── Create auth user + profile row ───────────────────────────────────────
  const handleCompleteSignup = async () => {
    setLoading(true);
    setError("");
    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error("No user returned");

      // 2. Insert profile row (include Spotify tokens if connected during onboarding)
      const { error: profileError } = await supabase.from("users").insert({
        id: authData.user.id,
        email,
        username: username.toLowerCase().trim(),
        display_name: username,
        date_of_birth: birthday,
        streaming_service: getSelectedService(),
        account_type: "listener",
        onboarding_completed: true,
        is_pro: false,
        is_verified: false,
        ...(spotifyTokens && {
          spotify_id:                spotifyTokens.spotifyId,
          spotify_access_token:      spotifyTokens.accessToken,
          spotify_refresh_token:     spotifyTokens.refreshToken,
          spotify_token_expires_at:  spotifyTokens.expiresAt,
          top_genres:                spotifyTokens.topGenres,
          top_artist_ids:            spotifyTokens.topArtistIds,
        }),
      });
      if (profileError) throw profileError;

      // Mark that the user has signed in — future cold launches skip onboarding
      await SecureStore.setItemAsync('trackmeet_has_signed_in', '1');

      // 3. Navigate to app
      switchMode("login");
    } catch (err: any) {
      console.log("Signup error for adding:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    Keyboard.dismiss();

    setLoading(true);
    setError("");

    try {
      let loginEmail = email;

      if (!email.includes("@")) {
        const { data, error: usernameError } = await supabase
          .from("users")
          .select("email")
          .eq("username", email)
          .single();

        if (usernameError || !data) {
          throw new Error("Username not found");
        }

        loginEmail = data.email;
      }

      // Login using resolved email
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

      if (error) throw error;

      // Mark that the user has signed in — future cold launches skip onboarding
      await SecureStore.setItemAsync('trackmeet_has_signed_in', '1');

      loginBtnRef.current?.measure((_, __, w, h, pageX, pageY) => {
        setLoginExpandLayout({ x: pageX, y: pageY, w, h });
        setShowLoginExpand(true);

        loginExpandScale.setValue(1);

        Animated.timing(loginExpandScale, {
          toValue: 40,
          duration: 550,
          easing: Easing.in(Easing.exp),
          useNativeDriver: true,
        }).start(() => router.replace("/feed"));
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log("Login error:", msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Advance steps, run signup on final step ───────────────────────────────
  const onNext = () => {
    setError("");
    if (step < TOTAL_STEPS) goToStep(step + 1);
    else handleCompleteSignup();
  };

  // ── Render ────────────────────────────────────────────────────────────────


  return { mode, setMode, step, setStep, email, setEmail, password, setPassword, username, setUsername, birthday, setBirthday, streaming, setStreaming, followed, setFollowed, error, setError, loading, setLoading, savedAccounts, setSavedAccounts, spotifyTokens, setSpotifyTokens, router, slideAnim, contentFade, switchFade, expandY, expandO, loginBtnRef, loginExpandScale, showLoginExpand, setShowLoginExpand, loginExpandLayout, setLoginExpandLayout, cardBgProgress, cardAnimStyle, fade, openExpanded, closeExpanded, resetStates, switchMode, goToStep, toggleStreaming, toggleFollowed, handleConnectSpotify, expanded, handleSelectSavedAccount, handleUseAnotherAccount, getSelectedService, handleCompleteSignup, handleLogin, onNext };
}
