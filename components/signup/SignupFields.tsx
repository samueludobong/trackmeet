import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "../../assets/styles/app/signup";

export function Field({
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

export function PasswordStrengthBar({ password }: { password: string }) {
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

export function PasswordField({
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

export function UsernameField({
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
