import React from "react";
import { Text } from "react-native";
import { styles } from "../../app/signup.styles";

/** The mode-specific title/subtitle shown at the top of the auth screen. */
export function SignupHeroTitle({ mode, step }: any) {
  return (
    <>
      {mode === "idle" && (
        <>
          <Text style={styles.title}>{"Ready to\nJoin the Meet?"}</Text>
          <Text style={styles.titleSub}>Share your taste with the world.</Text>
        </>
      )}
      {mode === "signup" && step === 1 && (
        <>
          <Text style={styles.title}>{"Create Your\nAccount"}</Text>
          <Text style={styles.titleSub}>Let's start with your email.</Text>
        </>
      )}
    </>
  );
}
