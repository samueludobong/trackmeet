import React from "react";
import { Text, TouchableOpacity } from "react-native";
import { styles } from "../../assets/styles/app/signup";

/** Landing-screen primary actions: Get Started / I already have an account. */
export function SignupIdleActions({ switchMode }: any) {
  return (
    <>
      <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.88} onPress={() => switchMode("signup")}>
        <Text style={styles.primaryBtnText}>Get Started</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.88} onPress={() => switchMode("login")}>
        <Text style={styles.secondaryBtnText}>I already have an account</Text>
      </TouchableOpacity>
    </>
  );
}
