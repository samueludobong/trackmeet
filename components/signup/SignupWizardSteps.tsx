import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "../../assets/styles/app/signup";
import { TOTAL_STEPS } from "../../constants/signup";
import { PasswordField, UsernameField } from "./SignupFields";
import { BirthdayDrumPicker } from "./SignupPickers";
import { StreamingGrid, ArtistsGrid } from "./SignupGrids";
import { SignupEmailVerification } from "./SignupEmailVerification";

/** Renders the active signup wizard step (2–6) plus the Next/Back navigation. */
export function SignupWizardSteps({
  step, password, setPassword, username, setUsername, setBirthday, streaming,
  toggleStreaming, handleConnectSpotify, loading, followed, toggleFollowed, error, onNext, goToStep,
}: any) {
  return (
    <>
      {step === 2 && <SignupEmailVerification goToStep={goToStep} />}
      {step === 3 && <PasswordField value={password} onChange={setPassword} />}
      {step === 4 && (
        <>
          <UsernameField value={username} onChange={setUsername} />
          <Text style={styles.usernameHint}>Letters, numbers and underscores only.</Text>
        </>
      )}
      {step === 5 && <BirthdayDrumPicker onChange={setBirthday} />}
      {step === 6 && (
        <StreamingGrid connected={streaming} onToggle={toggleStreaming} onSpotifyConnect={handleConnectSpotify} spotifyConnecting={loading} />
      )}
      {step === 7 && <ArtistsGrid followed={followed} onToggle={toggleFollowed} />}
      {!!error && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={15} color="#E8000F" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      <TouchableOpacity style={[styles.primaryBtn, loading && { opacity: 0.6 }]} activeOpacity={0.88} onPress={onNext} disabled={loading}>
        <Text style={styles.primaryBtnText}>
          {loading ? "Creating account…" : step === TOTAL_STEPS ? "Let's Go 🎵" : "Next  →"}
        </Text>
      </TouchableOpacity>
      {step === 5 && (
        <TouchableOpacity onPress={() => goToStep(6)} activeOpacity={0.7}>
          <Text style={styles.switchText}>Skip for now</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity onPress={() => goToStep(step - 1)} style={styles.socialBtn} activeOpacity={0.88}>
        <Ionicons name="arrow-back" size={18} color="#fff" />
      </TouchableOpacity>
    </>
  );
}
