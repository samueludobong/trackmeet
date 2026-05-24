import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
  TextInput,
  Keyboard,
  Platform,
  KeyboardAvoidingView,
  Modal,
  Image,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { SafeAreaView } from "react-native-safe-area-context";
import { Video, ResizeMode } from "expo-av";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { connectSpotify } from "../lib/spotify";
import ReAnimated, {
  LinearTransition,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
  Easing as REasing,
} from "react-native-reanimated";

const { width: SW, height: SH } = Dimensions.get("window");

type Mode = "idle" | "signup" | "login" | "accounts";

type SavedAccount = {
  email: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
};

const SAVED_ACCOUNTS_KEY = "trackmeet_saved_accounts";

const TOTAL_STEPS = 6;
const DRUM_H = 58;
const SAFE_BOTTOM = Platform.OS === "ios" ? 34 : 16;
// Expanded card starts this many px from the top of the screen
const EXPANDED_TOP = SH * 0.13;

// ─── Static data ─────────────────────────────────────────────────────────────

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const DAYS = Array.from({ length: 31 }, (_, i) =>
  String(i + 1).padStart(2, "0"),
);
const YEARS = Array.from({ length: 80 }, (_, i) => String(2007 - i));

// fa5: FontAwesome5 brand icon name  |  text: fallback letter
const STREAMING_SERVICES = [
  {
    id: "spotify",
    name: "Spotify",
    color: "#1DB954",
    iconType: "fa5",
    icon: "spotify",
  },
  {
    id: "apple",
    name: "Apple Music",
    color: "#FA233B",
    iconType: "fa5",
    icon: "apple",
  },
  // { id: "youtube",    name: "YouTube Music", color: "#FF0000", iconType: "fa5",  icon: "youtube"    },
  // { id: "tidal",      name: "Tidal",         color: "#000000", iconType: "text", icon: "T"          },
  // { id: "amazon",     name: "Amazon Music",  color: "#00A8E1", iconType: "fa5",  icon: "amazon"     },
  // { id: "soundcloud", name: "SoundCloud",    color: "#FF5500", iconType: "fa5",  icon: "soundcloud" },
];

const DUMMY_ARTISTS = [
  {
    id: "a1",
    name: "Wizkid",
    genre: "Afrobeats",
    color: "#FF6B35",
    initials: "WK",
  },
  { id: "a2", name: "ROSÉ", genre: "K-Pop", color: "#AB00FF", initials: "RO" },
  {
    id: "a3",
    name: "Rema",
    genre: "Afrobeats",
    color: "#CAFF00",
    initials: "RE",
  },
  {
    id: "a4",
    name: "Bernadya",
    genre: "Indie Pop",
    color: "#FF3CAC",
    initials: "BD",
  },
  {
    id: "a5",
    name: "Ayra Starr",
    genre: "Afropop",
    color: "#00C2FF",
    initials: "AS",
  },
  { id: "a6", name: "SZA", genre: "R&B", color: "#7B61FF", initials: "SZ" },
  {
    id: "a7",
    name: "Burna Boy",
    genre: "Afrofusion",
    color: "#CAFF00",
    initials: "BB",
  },
  {
    id: "a8",
    name: "Olivia R.",
    genre: "Pop",
    color: "#FF6B35",
    initials: "OR",
  },
];

const STEP_TITLES = [
  "Email",
  "Strong Password",
  "Your Username",
  "Birthday",
  "Link Streaming",
  "Artists for You",
];
const STEP_SUBS = [
  "",
  "Make it something you won't forget.",
  "This is how the world finds you.",
  "You must be 16 or older to join.",
  "Sync your music taste automatically.",
  "Picked based on your streaming history.",
];

// ─── Shared field ─────────────────────────────────────────────────────────────

function Field({
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  value,
  onChangeText,
}: {
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address";
  autoCapitalize?: "none" | "words";
  value?: string;
  onChangeText?: (t: string) => void;
}) {
  return (
    <TextInput
      style={styles.field}
      placeholder={placeholder}
      placeholderTextColor="rgba(255,255,255,0.38)"
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType ?? "default"}
      autoCapitalize={autoCapitalize ?? "none"}
      autoCorrect={false}
      value={value}
      onChangeText={onChangeText}
    />
  );
}

// ─── Password field + strength bar ───────────────────────────────────────────

function PasswordStrengthBar({ password }: { password: string }) {
  if (!password) return null;
  let s = 1;
  if (password.length >= 8) s++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) s++;
  if (/[0-9]/.test(password) || /[^a-zA-Z0-9]/.test(password)) s++;
  s = Math.min(4, s);
  const COLORS = ["#E8000F", "#FF6B35", "#00CB53", "#AB00FF"];
  const LABELS = ["Too weak", "Weak", "Good", "Strong"];
  return (
    <View style={{ gap: 5 }}>
      <View style={{ flexDirection: "row", gap: 4 }}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              backgroundColor: i < s ? COLORS[s - 1] : "rgba(255,255,255,0.1)",
            }}
          />
        ))}
      </View>
      <Text
        style={{
          fontSize: 11,
          color: COLORS[s - 1],
          textAlign: "right",
          fontWeight: "700",
        }}
      >
        {LABELS[s - 1]}
      </Text>
    </View>
  );
}

function PasswordField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <View style={{ gap: 10 }}>
      <View
        style={[
          styles.field,
          { flexDirection: "row", alignItems: "center", paddingVertical: 0 },
        ]}
      >
        <TextInput
          style={{
            flex: 1,
            paddingVertical: 15,
            color: "#fff",
            fontSize: 15,
            fontWeight: "600",
          }}
          placeholder="Create a password"
          placeholderTextColor="rgba(255,255,255,0.38)"
          secureTextEntry={!show}
          autoCapitalize="none"
          autoCorrect={false}
          value={value}
          onChangeText={onChange}
        />
        <TouchableOpacity
          onPress={() => setShow((p) => !p)}
          activeOpacity={0.7}
          style={{ padding: 12 }}
        >
          <Ionicons
            name={show ? "eye-off-outline" : "eye-outline"}
            size={20}
            color="rgba(255,255,255,0.38)"
          />
        </TouchableOpacity>
      </View>
      <PasswordStrengthBar password={value} />
    </View>
  );
}

// ─── Username field ───────────────────────────────────────────────────────────

function UsernameField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View
      style={[
        styles.field,
        { flexDirection: "row", alignItems: "center", paddingVertical: 0 },
      ]}
    >
      <Text
        style={{
          fontSize: 16,
          fontWeight: "900",
          color: "#AB00FF",
          paddingVertical: 15,
          paddingRight: 2,
        }}
      >
        @
      </Text>
      <TextInput
        style={{
          flex: 1,
          paddingVertical: 15,
          paddingLeft: 4,
          color: "#fff",
          fontSize: 15,
          fontWeight: "600",
        }}
        placeholder="your_handle"
        placeholderTextColor="rgba(255,255,255,0.38)"
        autoCapitalize="none"
        autoCorrect={false}
        value={value}
        onChangeText={onChange}
      />
      {value.length > 2 && (
        <Ionicons
          name="checkmark-circle"
          size={20}
          color="#00E5A0"
          style={{ padding: 12 }}
        />
      )}
    </View>
  );
}

// ─── Drum picker ─────────────────────────────────────────────────────────────

function DrumPicker({
  values,
  initialIndex = 0,
  onSelect,
  flex,
}: {
  values: string[];
  initialIndex?: number;
  onSelect: (v: string) => void;
  flex?: number;
}) {
  const [selIdx, setSelIdx] = useState(initialIndex);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: initialIndex * DRUM_H,
        animated: false,
      });
    }, 80);
  }, []);

  const snap = (y: number) => {
    const idx = Math.max(
      0,
      Math.min(values.length - 1, Math.round(y / DRUM_H)),
    );
    setSelIdx(idx);
    onSelect(values[idx]);
  };

  return (
    <View style={{ flex: flex ?? 1, height: DRUM_H * 3, overflow: "hidden" }}>
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { justifyContent: "center" }]}
      >
        <View
          style={{
            height: DRUM_H,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderColor: "rgba(171,0,255,0.65)",
          }}
        />
      </View>
      <ScrollView
        ref={scrollRef}
        snapToInterval={DRUM_H}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: DRUM_H }}
        onMomentumScrollEnd={(e) => snap(e.nativeEvent.contentOffset.y)}
        onScrollEndDrag={(e) => snap(e.nativeEvent.contentOffset.y)}
      >
        {values.map((v, i) => (
          <View
            key={v + i}
            style={{
              height: DRUM_H,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                fontSize: i === selIdx ? 24 : 16,
                fontWeight: i === selIdx ? "800" : "400",
                color:
                  i === selIdx
                    ? "#fff"
                    : Math.abs(i - selIdx) === 1
                      ? "rgba(255,255,255,0.28)"
                      : "rgba(255,255,255,0.1)",
                letterSpacing: i === selIdx ? -0.3 : 0,
              }}
            >
              {v}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function BirthdayDrumPicker({
  onChange,
}: {
  onChange: (date: string) => void;
}) {
  // Refs avoid stale-closure issues when multiple pickers fire rapidly
  const monthRef = useRef(MONTHS[0]);
  const dayRef = useRef(DAYS[0]);
  const yearRef = useRef(YEARS[0]);

  const notify = (m: string, d: string, y: string) => {
    const mm = String(MONTHS.indexOf(m) + 1).padStart(2, "0");
    onChange(`${y}-${mm}-${d}`);
  };

  // Emit initial value so parent has a valid date from the start
  useEffect(() => {
    notify(monthRef.current, dayRef.current, yearRef.current);
  }, []);

  return (
    <View style={styles.drumWrap}>
      <DrumPicker
        values={MONTHS}
        initialIndex={0}
        flex={1.3}
        onSelect={(v) => {
          monthRef.current = v;
          notify(v, dayRef.current, yearRef.current);
        }}
      />
      <View style={styles.drumDivider} />
      <DrumPicker
        values={DAYS}
        initialIndex={0}
        flex={0.9}
        onSelect={(v) => {
          dayRef.current = v;
          notify(monthRef.current, v, yearRef.current);
        }}
      />
      <View style={styles.drumDivider} />
      <DrumPicker
        values={YEARS}
        initialIndex={0}
        flex={1.2}
        onSelect={(v) => {
          yearRef.current = v;
          notify(monthRef.current, dayRef.current, v);
        }}
      />
    </View>
  );
}

// ─── Streaming list ───────────────────────────────────────────────────────────

function StreamingGrid({
  connected,
  onToggle,
  onSpotifyConnect,
  spotifyConnecting,
}: {
  connected: Set<string>;
  onToggle: (id: string) => void;
  onSpotifyConnect?: () => void;
  spotifyConnecting?: boolean;
}) {
  return (
    <View style={{ gap: 10 }}>
      {STREAMING_SERVICES.map((s) => {
        const ok = connected.has(s.id);
        const isSpotify = s.id === "spotify";
        const isConnecting = isSpotify && spotifyConnecting;

        return (
          <TouchableOpacity
            key={s.id}
            style={[
              styles.streamRow,
              { backgroundColor: s.color, opacity: isConnecting ? 0.7 : 1 },
            ]}
            onPress={() =>
              isSpotify && onSpotifyConnect
                ? onSpotifyConnect()
                : onToggle(s.id)
            }
            activeOpacity={0.82}
            disabled={!!isConnecting}
          >
            {/* Brand logo */}
            <View style={styles.streamIconWrap}>
              {s.iconType === "fa5" ? (
                <FontAwesome5 name={s.icon} size={18} color="#fff" />
              ) : (
                <Text style={styles.streamSymbol}>{s.icon}</Text>
              )}
            </View>

            {/* Name */}
            <Text style={styles.streamRowName}>{s.name}</Text>

            {/* Right indicator */}
            {isConnecting ? (
              <Text
                style={{
                  color: "rgba(255,255,255,0.75)",
                  fontSize: 12,
                  fontWeight: "600",
                }}
              >
                Connecting…
              </Text>
            ) : ok ? (
              <View style={styles.streamConnectedPill}>
                <Ionicons name="checkmark" size={12} color={s.color} />
                <Text style={[styles.streamConnectedText, { color: s.color }]}>
                  Connected
                </Text>
              </View>
            ) : (
              <Ionicons
                name="chevron-forward"
                size={16}
                color="rgba(255,255,255,0.6)"
              />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Artists grid ─────────────────────────────────────────────────────────────

function ArtistsGrid({
  followed,
  onToggle,
}: {
  followed: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <View style={{ gap: 10 }}>
      {Array.from({ length: Math.ceil(DUMMY_ARTISTS.length / 2) }, (_, ri) => (
        <View key={ri} style={{ flexDirection: "row", gap: 10 }}>
          {DUMMY_ARTISTS.slice(ri * 2, ri * 2 + 2).map((a) => {
            const isF = followed.has(a.id);
            return (
              <View key={a.id} style={styles.artistCard}>
                <View
                  style={[
                    styles.artistAvatar,
                    {
                      backgroundColor: a.color + "20",
                      borderColor: a.color + "55",
                    },
                  ]}
                >
                  <Text style={[styles.artistInitials, { color: a.color }]}>
                    {a.initials}
                  </Text>
                </View>
                <Text style={styles.artistName} numberOfLines={1}>
                  {a.name}
                </Text>
                <Text style={styles.artistGenre}>{a.genre}</Text>
                <TouchableOpacity
                  style={[
                    styles.artistFollowBtn,
                    isF && styles.artistFollowBtnActive,
                  ]}
                  onPress={() => onToggle(a.id)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.artistFollowText,
                      isF && styles.artistFollowTextActive,
                    ]}
                  >
                    {isF ? "Following" : "Follow"}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ─── Step dots ────────────────────────────────────────────────────────────────

function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <View style={styles.stepDots}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            styles.stepDot,
            i + 1 < step
              ? styles.stepDotDone
              : i + 1 === step
                ? styles.stepDotActive
                : styles.stepDotPending,
            { width: i + 1 === step ? 28 : 14 },
          ]}
        />
      ))}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SignupScreen() {
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
      console.log("Login error:", err.message);
      setError(err.message);
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Video
        source={require("./loop.mp4")}
        style={StyleSheet.absoluteFill}
        resizeMode={ResizeMode.COVER}
        isLooping
        isMuted
        shouldPlay
      />
      <View style={styles.vignette} />

      {/* ── Normal bottom-sheet layout (idle / login / step 1) ── */}
      <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
        <Animated.View
          style={[
            styles.titleArea,
            { opacity: Animated.multiply(contentFade, switchFade) },
          ]}
        >
          {mode === "idle" && (
            <>
              <Text style={styles.title}>{"Ready to\nJoin the Meet?"}</Text>
              <Text style={styles.titleSub}>
                Share your taste with the world.
              </Text>
            </>
          )}
          {mode === "login" && (
            <>
              <Text style={styles.title}>{"Welcome\nBack"}</Text>
              <Text style={styles.titleSub}>Good to see you again!</Text>
            </>
          )}
          {mode === "signup" && step === 1 && (
            <>
              <Text style={styles.title}>{"Create Your\nAccount"}</Text>
              <Text style={styles.titleSub}>Let's start with your email.</Text>
            </>
          )}
        </Animated.View>

        {/* Always mounted — hidden via opacity when expanded card is active */}
        <Animated.View
          pointerEvents={expanded ? "none" : "box-none"}
          style={[
            { transform: [{ translateY: slideAnim }] },
            expanded && styles.bottomCardHidden,
          ]}
        >
            <ReAnimated.View
              layout={LinearTransition.duration(360).easing(
                REasing.out(REasing.cubic),
              )}
              style={[styles.bottomCard, cardAnimStyle]}
            >
              <Animated.View
                style={[styles.modeBlock, { opacity: switchFade }]}
              >
                {mode === "signup" && step === 1 && (
                  <StepDots step={1} total={TOTAL_STEPS} />
                )}

                {/* IDLE */}
                {mode === "idle" && (
                  <>
                    <TouchableOpacity
                      style={styles.primaryBtn}
                      activeOpacity={0.88}
                      onPress={() => switchMode("signup")}
                    >
                      <Text style={styles.primaryBtnText}>Get Started</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.secondaryBtn}
                      activeOpacity={0.88}
                      onPress={() => switchMode("login")}
                    >
                      <Text style={styles.secondaryBtnText}>
                        I already have an account
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                {/* STEP 1: Email */}
                {mode === "signup" && step === 1 && (
                  <>
                    <Field
                      placeholder="Email address"
                      keyboardType="email-address"
                      value={email}
                      onChangeText={setEmail}
                    />
                    <TouchableOpacity
                      style={styles.primaryBtn}
                      activeOpacity={0.88}
                      onPress={() => goToStep(2)}
                    >
                      <Text style={styles.primaryBtnText}>Next →</Text>
                    </TouchableOpacity>
                    <View style={styles.dividerRow}>
                      <View style={styles.dividerLine} />
                      <Text style={styles.dividerText}>or continue with</Text>
                      <View style={styles.dividerLine} />
                    </View>
                    <TouchableOpacity
                      style={styles.socialBtn}
                      activeOpacity={0.88}
                    >
                      <Text style={styles.socialIcon}>G</Text>
                      <Text style={styles.socialBtnText}>
                        Continue with Google
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => switchMode("login")}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.switchText}>
                        Already have an account?{"  "}
                        <Text style={styles.switchLink}>Log in</Text>
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                {/* LOGIN */}
                {mode === "login" && (
                  <>
                    <Field
                      placeholder="Username or Email"
                      keyboardType="email-address"
                      value={email}
                      onChangeText={setEmail}
                    />
                    <Field
                      placeholder="Password"
                      secureTextEntry
                      value={password}
                      onChangeText={setPassword}
                    />
                    {!!error && (
                      <View style={styles.errorBox}>
                        <Ionicons
                          name="alert-circle-outline"
                          size={15}
                          color="#E8000F"
                        />
                        <Text style={styles.errorText}>{error}</Text>
                      </View>
                    )}
                    <View ref={loginBtnRef}>
                      <TouchableOpacity
                        style={styles.primaryBtn}
                        activeOpacity={0.88}
                        onPress={handleLogin}
                        disabled={loading}
                      >
                        <Text style={styles.primaryBtnText}>
                          {loading ? "Logging in…" : "Log In"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.dividerRow}>
                      <View style={styles.dividerLine} />
                      <Text style={styles.dividerText}>or continue with</Text>
                      <View style={styles.dividerLine} />
                    </View>
                    <TouchableOpacity
                      style={styles.socialBtn}
                      activeOpacity={0.88}
                    >
                      <Text style={styles.socialIcon}>G</Text>
                      <Text style={styles.socialBtnText}>
                        Continue with Google
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => switchMode("signup")}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.switchText}>
                        Don't have an account?{"  "}
                        <Text style={styles.switchLink}>Sign up</Text>
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </Animated.View>
            </ReAnimated.View>
          </Animated.View>
      </SafeAreaView>

      {/* ── Expanded full-height card (steps 2–6) ── */}
      {/* Sits in its own absolute container starting EXPANDED_TOP from the top */}
      <Animated.View
        pointerEvents={expanded ? "box-none" : "none"}
        style={[
          styles.expandedContainer,
          {
            opacity: expandO,
            transform: [{ translateY: expandY }],
          },
        ]}
      >
        <ReAnimated.View style={[styles.expandedCard, cardAnimStyle]}>
          {/* Single scrollable area — content is vertically centered inside */}
          <Animated.View style={{ flex: 1, opacity: switchFade }}>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.expandedScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* ── Saved accounts screen ───────────────────────────────── */}
              {mode === "accounts" && (
                <>
                  <Text style={styles.expandedTitle}>Welcome back</Text>
                  <Text style={[styles.expandedSub, { marginBottom: 8 }]}>
                    Sign in to continue
                  </Text>

                  {savedAccounts.map((account) => (
                    <TouchableOpacity
                      key={account.email}
                      style={styles.savedAccountCard}
                      activeOpacity={0.82}
                      onPress={() => handleSelectSavedAccount(account)}
                    >
                      {account.avatarUrl ? (
                        <Image
                          source={{ uri: account.avatarUrl }}
                          style={styles.savedAccountAvatar}
                        />
                      ) : (
                        <View style={[styles.savedAccountAvatar, styles.savedAccountAvatarFallback]}>
                          <Text style={styles.savedAccountInitials}>
                            {(account.displayName || account.username || "?").slice(0, 1).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.savedAccountName} numberOfLines={1}>
                          {account.displayName || account.username}
                        </Text>
                        <Text style={styles.savedAccountHandle} numberOfLines={1}>
                          @{account.username}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
                    </TouchableOpacity>
                  ))}

                  <TouchableOpacity
                    style={styles.anotherAccountBtn}
                    activeOpacity={0.75}
                    onPress={handleUseAnotherAccount}
                  >
                    <Ionicons name="person-add-outline" size={16} color="rgba(255,255,255,0.55)" />
                    <Text style={styles.anotherAccountText}>Use another account</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* Step dots */}
              {mode === "signup" && <StepDots step={step} total={TOTAL_STEPS} />}

              {/* Back + step title */}
              {mode === "signup" && (
              <View style={styles.expandedTitleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.expandedTitle}>
                    {STEP_TITLES[step - 1]}
                  </Text>
                  <Text style={styles.expandedSub}>{STEP_SUBS[step - 1]}</Text>
                </View>
              </View>
              )}

              {/* Step-specific content */}
              {mode === "signup" && step === 2 && (
                <PasswordField value={password} onChange={setPassword} />
              )}
              {mode === "signup" && step === 3 && (
                <>
                  <UsernameField value={username} onChange={setUsername} />
                  <Text style={styles.usernameHint}>
                    Letters, numbers and underscores only.
                  </Text>
                </>
              )}
              {mode === "signup" && step === 4 && <BirthdayDrumPicker onChange={setBirthday} />}
              {mode === "signup" && step === 5 && (
                <StreamingGrid
                  connected={streaming}
                  onToggle={toggleStreaming}
                  onSpotifyConnect={handleConnectSpotify}
                  spotifyConnecting={loading}
                />
              )}
              {mode === "signup" && step === 6 && (
                <ArtistsGrid followed={followed} onToggle={toggleFollowed} />
              )}

              {/* Error message (signup steps only) */}
              {mode === "signup" && !!error && (
                <View style={styles.errorBox}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={15}
                    color="#E8000F"
                  />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Next / finish button (signup steps only) */}
              {mode === "signup" && (
                <>
                  <TouchableOpacity
                    style={[styles.primaryBtn, loading && { opacity: 0.6 }]}
                    activeOpacity={0.88}
                    onPress={onNext}
                    disabled={loading}
                  >
                    <Text style={styles.primaryBtnText}>
                      {loading
                        ? "Creating account…"
                        : step === TOTAL_STEPS
                          ? "Let's Go 🎵"
                          : "Next  →"}
                    </Text>
                  </TouchableOpacity>
                  {step === 5 && (
                    <TouchableOpacity
                      onPress={() => goToStep(6)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.switchText}>Skip for now</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => goToStep(step - 1)}
                    style={styles.socialBtn}
                    activeOpacity={0.88}
                  >
                    <Ionicons name="arrow-back" size={18} color="#fff" />
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </Animated.View>
        </ReAnimated.View>
      </Animated.View>

      {/* Login zoom-to-fill overlay */}
      <Modal visible={showLoginExpand} transparent animationType="none">
        <Animated.View
          style={{
            position: "absolute",
            left: loginExpandLayout.x,
            top: loginExpandLayout.y,
            width: loginExpandLayout.w,
            height: loginExpandLayout.h,
            borderRadius: loginExpandLayout.h / 2,
            backgroundColor: "#ffffff",
            transform: [{ scale: loginExpandScale }],
          }}
        />
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1a0030" },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10,0,25,0.35)",
  },
  safeArea: { flex: 1, justifyContent: "flex-end" },

  // Title (above normal card)
  titleArea: { paddingHorizontal: 32, paddingBottom: 28 },
  title: {
    fontSize: 42,
    fontFamily: "Inter_900Black",
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: -1,
    lineHeight: 50,
  },
  titleSub: { fontSize: 15, color: "rgba(255,255,255,0.55)", marginTop: 10 },

  // Normal bottom card
  bottomCard: {
    borderRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 28,
    marginHorizontal: 8,
    marginBottom: -19,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  modeBlock: { gap: 12 },
  bottomCardHidden: { opacity: 0 },

  // ── Expanded card container ──
  // Floats with 40px margin on every side — completely detached from bottom sheet
  expandedContainer: {
    position: "absolute",
    right: 10,
    left: 10,
    top: EXPANDED_TOP,
    bottom: 40,
  },
  expandedCard: {
    flex: 1,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    overflow: "hidden",
  },
  expandedTitleRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 3,
  },
  expandedTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.4,
    textAlign: "center",
  },
  expandedSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.38)",
    marginTop: 3,
    textAlign: "center",
  },
  // flexGrow:1 + justifyContent:"center" means short content is vertically centered;
  // tall content (steps 5-6) simply overflows and scrolls naturally.
  expandedScroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    gap: 20,
  },

  // Saved accounts
  savedAccountCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  savedAccountAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: "rgba(171,0,255,0.5)",
  },
  savedAccountAvatarFallback: {
    backgroundColor: "rgba(171,0,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  savedAccountInitials: {
    fontSize: 20,
    fontWeight: "800",
    color: "#AB00FF",
  },
  savedAccountName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: -0.2,
  },
  savedAccountHandle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.45)",
    marginTop: 2,
  },
  anotherAccountBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  anotherAccountText: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.55)",
  },

  // Step dots
  stepDots: { flexDirection: "row", justifyContent: "center", gap: 5 },
  stepDot: { height: 4, borderRadius: 2 },
  stepDotDone: { backgroundColor: "#AB00FF" },
  stepDotActive: { backgroundColor: "#ffffff" },
  stepDotPending: { backgroundColor: "rgba(255,255,255,0.15)" },

  // Field
  field: {
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  usernameHint: {
    fontSize: 12,
    color: "rgba(255,255,255,0.28)",
    textAlign: "center",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(2, 2, 2, 0.51)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(232,0,15,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: { flex: 1, fontSize: 13, color: "#E8000F", fontWeight: "600" },

  // Drum picker
  drumWrap: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    overflow: "hidden",
  },
  drumDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginVertical: 18,
  },

  // Streaming list rows
  streamRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 16,
    borderWidth: 2.5,
    borderColor: "rgb(0, 0, 0)",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  streamIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  streamSymbol: { fontSize: 16, color: "#fff", fontWeight: "900" },
  streamRowName: { flex: 1, fontSize: 15, fontWeight: "700", color: "#000" },
  streamConnectedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#000",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  streamConnectedText: { fontSize: 12, fontWeight: "700" },

  // Artists
  artistCard: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 14,
    alignItems: "center",
    gap: 5,
  },
  artistAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    marginBottom: 3,
  },
  artistInitials: { fontSize: 17, fontWeight: "900" },
  artistName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },
  artistGenre: { fontSize: 11, color: "rgba(255,255,255,0.35)" },
  artistFollowBtn: {
    marginTop: 4,
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#AB00FF",
  },
  artistFollowBtnActive: {
    backgroundColor: "rgba(171,0,255,0.15)",
    borderWidth: 1,
    borderColor: "#AB00FF",
  },
  artistFollowText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  artistFollowTextActive: { color: "#AB00FF" },

  // Buttons
  primaryBtn: {
    backgroundColor: "#ffffff",
    borderRadius: 50,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 4,
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: "700",
    fontFamily: "Inter_900Black",
    color: "#1a0030",
    letterSpacing: 0.3,
  },
  secondaryBtn: {
    backgroundColor: "rgba(171,0,255,0.25)",
    borderRadius: 50,
    paddingVertical: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(171,0,255,0.4)",
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Inter_900Black",
    color: "#ffffff",
    letterSpacing: 0.2,
  },

  // Social / divider
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  dividerText: { color: "rgba(255,255,255,0.4)", fontSize: 13 },
  socialBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    paddingVertical: 15,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  socialIcon: { fontSize: 16, color: "#ffffff", fontWeight: "700" },
  socialBtnText: { color: "#ffffff", fontWeight: "600", fontSize: 15 },
  switchText: {
    textAlign: "center",
    color: "rgba(255,255,255,0.45)",
    fontSize: 13,
    paddingBottom: 4,
  },
  switchLink: { color: "#AB00FF", fontWeight: "700" },
});
