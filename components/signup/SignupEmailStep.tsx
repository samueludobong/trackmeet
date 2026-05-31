import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { styles } from "../../app/signup.styles";
import { Field } from "./SignupFields";

/** Step 1 of signup: email entry + social options + switch-to-login. */
export function SignupEmailStep({ email, setEmail, goToStep, switchMode }: any) {
  return (
    <>
      <Field placeholder="Email address" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.88} onPress={() => goToStep(2)}>
        <Text style={styles.primaryBtnText}>Next →</Text>
      </TouchableOpacity>
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or continue with</Text>
        <View style={styles.dividerLine} />
      </View>
      <TouchableOpacity style={styles.socialBtn} activeOpacity={0.88}>
        <Text style={styles.socialIcon}>G</Text>
        <Text style={styles.socialBtnText}>Continue with Google</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => switchMode("login")} activeOpacity={0.7}>
        <Text style={styles.switchText}>Already have an account?{"  "}<Text style={styles.switchLink}>Log in</Text></Text>
      </TouchableOpacity>
    </>
  );
}
