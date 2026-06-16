import React from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { styles } from "../../assets/styles/app/signup";
import { Field } from "./SignupFields";
import { useSignup } from "@/hooks/useSignup";

/** Step 1 of signup: email entry + social options + switch-to-login. */
export function SignupEmailStep({ email, setEmail, goToStep, switchMode, alertTitle = "Invalid Email" }: any) {

  const error = useSignup();
  return (
    <>
      <Field placeholder="Email address" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <TouchableOpacity
        style={styles.primaryBtn}
        activeOpacity={0.88}
        onPress={() => {
          const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (validEmail.test(email)) {
            goToStep(2);
          } else {
            Alert.alert(alertTitle, "Please enter a valid email address.");
          }
        }}
      >
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
