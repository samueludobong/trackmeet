import React, { useState, useRef } from "react";
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from "react-native";
import { styles, otpStyles } from "../../app/signup.styles";

export function SignupEmailVerification({
  email,
  setEmail,
  goToStep,
  switchMode,
}: any) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputs = useRef<(TextInput | null)[]>([]);

  const handleChange = (value: string, index: number) => {
    const numeric = value.replace(/[^0-9]/g, "");
    const newOtp = [...otp];

    if (numeric.length > 1) {
      // Handle paste — fill all boxes
      const pasted = numeric.slice(0, 6).split("");
      const filled = [...otp];
      pasted.forEach((char, i) => {
        if (i < 6) filled[i] = char;
      });
      setOtp(filled);
      inputs.current[Math.min(pasted.length, 5)]?.focus();
      return;
    }

    newOtp[index] = numeric;
    setOtp(newOtp);

    // Auto advance to next box
    if (numeric && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Go back on backspace if empty
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const otpValue = otp.join("");

  return (
    <>
      <Text style={otpStyles.label}>Enter the 6-digit code</Text>
      <Text style={otpStyles.sublabel}>Sent to {email}</Text>

      {/* OTP boxes */}
      <View style={otpStyles.row}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => (inputs.current[index] = ref)}
            style={[
              otpStyles.box,
              digit ? otpStyles.boxFilled : null,
              index === otp.findIndex((d) => !d) ? otpStyles.boxActive : null,
            ]}
            value={digit}
            onChangeText={(val) => handleChange(val, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            keyboardType="numeric"
            maxLength={2}
            selectTextOnFocus
            caretHidden
          />
        ))}
      </View>

      {/* Resend */}
      <TouchableOpacity style={otpStyles.resendRow}>
        <Text style={otpStyles.resendText}>
          Didn't receive it?{"  "}
          <Text style={otpStyles.resendLink}>Resend code</Text>
        </Text>
      </TouchableOpacity>

      {/* Continue button — only active when all 6 filled */}
      <TouchableOpacity
        style={[
          otpStyles.continueBtn,
          otpValue.length === 6 ? otpStyles.continueBtnActive : null,
        ]}
        disabled={otpValue.length < 6}
        onPress={() => goToStep(3)}
        activeOpacity={0.85}
      >
        <Text style={otpStyles.continueBtnText}>Continue →</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => switchMode("login")} activeOpacity={0.7}>
        <Text style={styles.switchText}>
          Already have an account?{"  "}
          <Text style={styles.switchLink}>Log in</Text>
        </Text>
      </TouchableOpacity>
    </>
  );
}

