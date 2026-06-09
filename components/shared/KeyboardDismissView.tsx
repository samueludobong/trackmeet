import React from "react";
import {
  Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView, Platform,
  View, type ViewStyle, type StyleProp, type KeyboardAvoidingViewProps,
} from "react-native";

/**
 * Wraps a screen / overlay so:
 *   1. Tapping any non-input area dismisses the keyboard ("tap outside to close").
 *   2. Content is pushed up out of the way of the keyboard via KeyboardAvoidingView.
 *
 * Use it as the outermost layout for any screen or modal that contains a TextInput.
 *
 * `disableAvoidance` lets callers that already manually animate (e.g. chat input
 * bars on `keyboardWillShow`) opt out of the avoidance behavior while still
 * getting tap-to-dismiss for free.
 */
export function KeyboardDismissView({
  children,
  style,
  contentContainerStyle,
  behavior,
  keyboardVerticalOffset,
  disableAvoidance = false,
  accessible = false,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  behavior?: KeyboardAvoidingViewProps["behavior"];
  keyboardVerticalOffset?: number;
  disableAvoidance?: boolean;
  accessible?: boolean;
}) {
  const inner = (
    // `accessible={false}` keeps the wrapper invisible to VoiceOver/TalkBack so it
    // doesn't intercept focus when there's nothing interactive on screen.
    <TouchableWithoutFeedback accessible={accessible} onPress={Keyboard.dismiss}>
      <View style={[{ flex: 1 }, contentContainerStyle]}>
        {children}
      </View>
    </TouchableWithoutFeedback>
  );

  if (disableAvoidance) {
    return <View style={[{ flex: 1 }, style]}>{inner}</View>;
  }

  return (
    <KeyboardAvoidingView
      style={[{ flex: 1 }, style]}
      behavior={behavior ?? (Platform.OS === "ios" ? "padding" : "height")}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      {inner}
    </KeyboardAvoidingView>
  );
}
