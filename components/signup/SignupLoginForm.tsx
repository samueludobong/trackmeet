import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "../../app/signup.styles";
import { Field } from "./SignupFields";

/** The login form (username/email + password + social) inside the auth card. */
export function SignupLoginForm({
  email, setEmail, password, setPassword, error, loginBtnRef, handleLogin, loading, switchMode,
}: any) {
  return (
    <>
      <Field placeholder="Username or Email" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <Field placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
      {!!error && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={15} color="#E8000F" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      <View ref={loginBtnRef}>
        <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.88} onPress={handleLogin} disabled={loading}>
          <Text style={styles.primaryBtnText}>{loading ? "Logging in…" : "Log In"}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or continue with</Text>
        <View style={styles.dividerLine} />
      </View>
      <TouchableOpacity style={styles.socialBtn} activeOpacity={0.88}>
        <Text style={styles.socialIcon}>G</Text>
        <Text style={styles.socialBtnText}>Continue with Google</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => switchMode("signup")} activeOpacity={0.7}>
        <Text style={styles.switchText}>Don't have an account?{"  "}<Text style={styles.switchLink}>Sign up</Text></Text>
      </TouchableOpacity>
    </>
  );
}
