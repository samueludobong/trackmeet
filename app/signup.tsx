import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Pressable,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Video, ResizeMode } from "expo-av";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import ReAnimated, {
  LinearTransition,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
  Easing as REasing,
} from "react-native-reanimated";

const { height: SH } = Dimensions.get("window");

type Mode = "idle" | "signup" | "login";

// ─── Sub-components ──────────────────────────────────────────────────────────

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

function OtpInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const ref = useRef<TextInput>(null);
  return (
    <Pressable onPress={() => ref.current?.focus()} style={styles.otpRow}>
      {Array.from({ length: 6 }).map((_, i) => (
        <View
          key={i}
          style={[styles.otpBox, value.length === i && styles.otpBoxActive]}
        >
          <Text style={styles.otpDigit}>{value[i] ?? ""}</Text>
        </View>
      ))}
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(t) => onChange(t.replace(/\D/g, "").slice(0, 6))}
        keyboardType="number-pad"
        autoFocus
        style={styles.otpHidden}
      />
    </Pressable>
  );
}

function BirthdayInput() {
  const [mm, setMm] = useState("");
  const [dd, setDd] = useState("");
  const [yyyy, setYyyy] = useState("");
  const ddRef = useRef<TextInput>(null);
  const yyyyRef = useRef<TextInput>(null);

  return (
    
    <View style={styles.bdRow}>
      
      <TextInput
        style={[styles.field, styles.bdCell]}
        placeholder="MM"
        placeholderTextColor="rgba(255,255,255,0.35)"
        keyboardType="number-pad"
        maxLength={2}
        value={mm}
        onChangeText={(t) => {
          setMm(t);
          if (t.length === 2) ddRef.current?.focus();
        }}
        textAlign="center"
      />
      <Text style={styles.bdSep}>/</Text>
      <TextInput
        ref={ddRef}
        style={[styles.field, styles.bdCell]}
        placeholder="DD"
        placeholderTextColor="rgba(255,255,255,0.35)"
        keyboardType="number-pad"
        maxLength={2}
        value={dd}
        onChangeText={(t) => {
          setDd(t);
          if (t.length === 2) yyyyRef.current?.focus();
        }}
        textAlign="center"
      />
      <Text style={styles.bdSep}>/</Text>
      <TextInput
        ref={yyyyRef}
        style={[styles.field, styles.bdCellWide]}
        placeholder="YYYY"
        placeholderTextColor="rgba(255,255,255,0.35)"
        keyboardType="number-pad"
        maxLength={4}
        value={yyyy}
        onChangeText={setYyyy}
        textAlign="center"
      />
    </View>
  );
}

// ─── Titles ───────────────────────────────────────────────────────────────────

function getTitle(mode: Mode, step: number, email: string) {
  if (mode === "idle")
    return {
      line1: "Ready to",
      line2: "Join the Meet?",
      sub: "Share your taste with the world.",
    };
  if (mode === "login") return { line1: "Welcome", line2: "Back", sub: "Good to see you again!" };
  const steps = [
    { line1: "Create Your", line2: "Account", sub: "Let's start with your email" },
    {
      line1: "Check Your",
      line2: "Email",
      sub: email ? `Sent a code to ${email}` : undefined,
    },
    { line1: "When's Your", line2: "Birthday?", sub: "We'll be sure to remember!" },
    { line1: "Almost", line2: "There", sub: "You're all set to go!" },
  ];
  return steps[step - 1] ?? steps[0];
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SignupScreen() {
  const [mode, setMode] = useState<Mode>("idle");
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");

  const router = useRouter();

  const slideAnim = useRef(new Animated.Value(SH * 0.5)).current;
  const contentFade = useRef(new Animated.Value(0)).current;
  const switchFade = useRef(new Animated.Value(1)).current;

  // Login button zoom-to-fill
  const loginBtnRef = useRef<View>(null);
  const loginExpandScale = useRef(new Animated.Value(1)).current;
  const [showLoginExpand, setShowLoginExpand] = useState(false);
  const [loginExpandLayout, setLoginExpandLayout] = useState({ x: 0, y: 0, w: 0, h: 0 });

  const cardBgProgress = useSharedValue(0);
  const cardAnimStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(cardBgProgress.value, [0, 1], [
      "rgba(255,255,255,0.12)",
      "rgba(255,255,255,0.20)",
    ]),
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

  // Shared fade-out → change state → fade-in helper
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

  const switchMode = (next: Mode) =>
    fade(() => {
      setMode(next);
      setStep(1);
      cardBgProgress.value = withTiming(next === "idle" ? 0 : 1, {
        duration: 360,
      });
    });

  const goToStep = (s: number) => fade(() => setStep(s));

  const handleLogin = () => {
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
  };

  const title = getTitle(mode, step, email);
  const TOTAL_STEPS = 4;

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

      <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
        {/* Title */}
        <Animated.View
          style={[
            styles.titleArea,
            { opacity: Animated.multiply(contentFade, switchFade) },
          ]}
        >
          <Text style={styles.title}>
            {title.line1}
            {"\n"}
            {title.line2}
          </Text>
          {title.sub && <Text style={styles.titleSub}>{title.sub}</Text>}
        </Animated.View>

        {/* Card */}
        <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>
          <ReAnimated.View
            layout={LinearTransition.duration(360).easing(
              REasing.out(REasing.cubic)
            )}
            style={[styles.bottomCard, cardAnimStyle]}
          >
            
            {/* All content fades together */}
            <Animated.View style={[styles.modeBlock, { opacity: switchFade }]}>

              {/* ── IDLE ── */}
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

              {/* ── SIGNUP STEP 1 — Email ── */}
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
                    <Text style={styles.primaryBtnText}>Next  →</Text>
                  </TouchableOpacity>
                  <View style={styles.dividerRow}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>or continue with</Text>
                    <View style={styles.dividerLine} />
                  </View>
                  {/* <TouchableOpacity style={styles.socialBtn} activeOpacity={0.88}>
                    <Text style={styles.socialIcon}>🍎</Text>
                    <Text style={styles.socialBtnText}>Continue with Apple</Text>
                  </TouchableOpacity> */}
                  <TouchableOpacity style={styles.socialBtn} activeOpacity={0.88}>
                    <Text style={styles.socialIcon}>G</Text>
                    <Text style={styles.socialBtnText}>Continue with Google</Text>
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

              {/* ── SIGNUP STEP 2 — Verification code ── */}
              {mode === "signup" && step === 2 && (
                <>
                  <OtpInput value={code} onChange={setCode} />
                  <TouchableOpacity
                    style={styles.primaryBtn}
                    activeOpacity={0.88}
                    onPress={() => goToStep(3)}
                  >
                    <Text style={styles.primaryBtnText}>Verify  →</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => goToStep(1)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.switchText}>← Back</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* ── SIGNUP STEP 3 — Birthday ── */}
              {mode === "signup" && step === 3 && (
                <>
                  <BirthdayInput />
                  <TouchableOpacity
                    style={styles.primaryBtn}
                    activeOpacity={0.88}
                    onPress={() => goToStep(4)}
                  >
                    <Text style={styles.primaryBtnText}>Next  →</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => goToStep(2)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.switchText}>← Back</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* ── SIGNUP STEP 4 — Autofill or manual ── */}
              {mode === "signup" && step === 4 && (
                <>
                  <Text style={styles.stepHint}>
                    How would you like to set up your music profile?
                  </Text>
                  <TouchableOpacity
                    style={styles.primaryBtn}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.primaryBtnText}>
                      🎵  Autofill with streaming
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.secondaryBtn}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.secondaryBtnText}>Fill manually</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => goToStep(3)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.switchText}>← Back</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* ── LOGIN ── */}
              {mode === "login" && (
                <>
                  <Field
                    placeholder="Username or Email"
                    keyboardType="email-address"
                  />
                  <Field placeholder="Password" secureTextEntry />
                  <View ref={loginBtnRef}>
                    <TouchableOpacity
                      style={styles.primaryBtn}
                      activeOpacity={0.88}
                      onPress={handleLogin}
                    >
                      <Text style={styles.primaryBtnText}>Log In  →</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.dividerRow}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>or continue with</Text>
                    <View style={styles.dividerLine} />
                  </View>
                  {/* <TouchableOpacity style={styles.socialBtn} activeOpacity={0.88}>
                    <Text style={styles.socialIcon}>🍎</Text>
                    <Text style={styles.socialBtnText}>Continue with Apple</Text>
                  </TouchableOpacity> */}
                  <TouchableOpacity style={styles.socialBtn} activeOpacity={0.88}>
                    <Text style={styles.socialIcon}>G</Text>
                    <Text style={styles.socialBtnText}>Continue with Google</Text>
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

      {/* Login button zoom-to-fill overlay */}
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

  titleArea: { paddingHorizontal: 32, paddingBottom: 28 },
  title: {
    fontSize: 42,
    fontFamily: "Inter_900Black",
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: -1,
    lineHeight: 50,
  },
  titleSub: {
    fontSize: 15,
    color: "rgba(255,255,255,0.55)",
    marginTop: 10,
  },

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

  // Step dots
  stepDots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginBottom: 18,
  },
  stepDot: { height: 4, borderRadius: 2, width: 28 },
  stepDotDone: { backgroundColor: "#AB00FF" },
  stepDotPending: { backgroundColor: "rgba(255,255,255,0.18)" },

  // Fields
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

  // OTP
  otpRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  otpBox: {
    width: 44,
    height: 52,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  otpBoxActive: {
    borderColor: "#AB00FF",
    backgroundColor: "rgba(171,0,255,0.12)",
  },
  otpDigit: { color: "#ffffff", fontSize: 20, fontWeight: "700" },
  otpHidden: { position: "absolute", opacity: 0, width: 1, height: 1 },

  // Birthday
  bdRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  bdCell: { flex: 1, textAlign: "center" },
  bdCellWide: {
    flex: 1.6,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    textAlign: "center",
  },
  bdSep: { color: "rgba(255,255,255,0.35)", fontSize: 18 },

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

  // Social
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

  // Footer links
  switchText: {
    textAlign: "center",
    color: "rgba(255,255,255,0.45)",
    fontSize: 13,
    paddingBottom: 4,
  },
  switchLink: { color: "#AB00FF", fontWeight: "700" },
  stepHint: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
