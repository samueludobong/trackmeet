import { SignupHeroTitle } from "../components/signup/SignupHeroTitle";
import { SignupIdleActions } from "../components/signup/SignupIdleActions";
import { SignupEmailStep } from "../components/signup/SignupEmailStep";
import { SignupWizardSteps } from "../components/signup/SignupWizardSteps";
import { SignupLoginForm } from "../components/signup/SignupLoginForm";
import { SignupAccountsList } from "../components/signup/SignupAccountsList";
import { StepDots } from "../components/signup/SignupGrids";
import StartUpVideo  from "../assets/videos/loop.mp4";
import { Field } from "../components/signup/SignupFields";
import { TOTAL_STEPS, STEP_TITLES, STEP_SUBS } from "../constants/signup";
import { styles } from "./signup.styles";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Easing, Dimensions, Platform, KeyboardAvoidingView, Modal } from "react-native";
import * as SecureStore from "expo-secure-store";
import { SafeAreaView } from "react-native-safe-area-context";
import { Video, ResizeMode } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import ReAnimated, {
  LinearTransition,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
  Easing as REasing,
} from "react-native-reanimated";

// ─── Shared field ─────────────────────────────────────────────────────────────

import { useSignup } from "../hooks/useSignup";
import { SignupEmailVerification } from "@/components/signup/SignupEmailVerification";

const { width: SW, height: SH } = Dimensions.get("window");

export default function SignupScreen() {
  const {
    mode, setMode, step, setStep, email, setEmail, password, setPassword, username, setUsername, birthday, setBirthday, streaming, setStreaming, followed, setFollowed, error, setError, loading, setLoading, savedAccounts, setSavedAccounts, spotifyTokens, setSpotifyTokens, router, slideAnim, contentFade, switchFade, expandY, expandO, loginBtnRef, loginExpandScale, showLoginExpand, setShowLoginExpand, loginExpandLayout, setLoginExpandLayout, cardBgProgress, cardAnimStyle, fade, openExpanded, closeExpanded, resetStates, switchMode, goToStep, toggleStreaming, toggleFollowed, handleConnectSpotify, expanded, handleSelectSavedAccount, handleUseAnotherAccount, getSelectedService, handleCompleteSignup, handleLogin, onNext
  } = useSignup();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Video
        source={StartUpVideo}
        style={StyleSheet.absoluteFill}
        resizeMode={ResizeMode.COVER}
        isLooping
        isMuted
        shouldPlay
      />
      <View style={styles.vignette} />
      <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
        <Animated.View
          style={[
            styles.titleArea,
            { opacity: Animated.multiply(contentFade, switchFade) },
          ]}
        >
          <SignupHeroTitle mode={mode} step={step} />
          {/* {mode === "login" && <SignupLoginForm email={email} setEmail={setEmail} password={password} setPassword={setPassword} error={error} loginBtnRef={loginBtnRef} handleLogin={handleLogin} loading={loading} switchMode={switchMode} />} */}
        </Animated.View>
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
                {mode === "idle" && <SignupIdleActions switchMode={switchMode} />}
                {mode === "signup" && step === 1 && <SignupEmailStep email={email} setEmail={setEmail} goToStep={goToStep} switchMode={switchMode} />}
                {mode === "signup" && step === 2 && <SignupEmailVerification email={email} setEmail={setEmail} goToStep={goToStep} switchMode={switchMode} />}
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
          <Animated.View style={{ flex: 1, opacity: switchFade }}>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.expandedScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {mode === "accounts" && <SignupAccountsList savedAccounts={savedAccounts} handleSelectSavedAccount={handleSelectSavedAccount} handleUseAnotherAccount={handleUseAnotherAccount} />}
              {mode === "signup" && <StepDots step={step} total={TOTAL_STEPS} />}
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
              {mode === "signup" && <SignupWizardSteps step={step} password={password} setPassword={setPassword} username={username} setUsername={setUsername} setBirthday={setBirthday} streaming={streaming} toggleStreaming={toggleStreaming} handleConnectSpotify={handleConnectSpotify} loading={loading} followed={followed} toggleFollowed={toggleFollowed} error={error} onNext={onNext} goToStep={goToStep} />}
            </ScrollView>
          </Animated.View>
        </ReAnimated.View>
      </Animated.View>
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
