import { useRef, useEffect } from "react";
import { Animated, PanResponder, Platform, Keyboard } from "react-native";
import { SW, BOTTOM_INSET } from "../lib/feed/dimensions";

/**
 * Right-edge slide-in panel animation with swipe-to-dismiss plus a keyboard-
 * tracked bottom offset for a sticky bar. Returns animated values, pan handlers
 * and a `close` helper that animates out then calls `onClose`.
 */
export function useSlideInPanel(onClose: () => void) {
  const slideX = useRef(new Animated.Value(SW)).current;
  const barBottom = useRef(new Animated.Value(BOTTOM_INSET + 8)).current;

  useEffect(() => {
    Animated.spring(slideX, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 200 }).start();
  }, []);

  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvt, (e: any) => {
      Animated.timing(barBottom, { toValue: e.endCoordinates.height + 8, duration: Platform.OS === "ios" ? (e.duration ?? 260) : 260, useNativeDriver: false }).start();
    });
    const hideSub = Keyboard.addListener(hideEvt, (e: any) => {
      Animated.timing(barBottom, { toValue: BOTTOM_INSET + 8, duration: Platform.OS === "ios" ? (e.duration ?? 260) : 260, useNativeDriver: false }).start();
    });
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const close = () => {
    Keyboard.dismiss();
    Animated.timing(slideX, { toValue: SW, duration: 260, useNativeDriver: true }).start(onClose);
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, { dx, dy }) => dx > 8 && dx > Math.abs(dy) * 2,
      onShouldBlockNativeResponder: () => false,
      onPanResponderMove: (_, { dx }) => { if (dx > 0) slideX.setValue(dx); },
      onPanResponderRelease: (_, { dx, vx }) => {
        if (dx > SW * 0.3 || vx > 0.8) close();
        else Animated.spring(slideX, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 220 }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(slideX, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  return { slideX, barBottom, panHandlers: pan.panHandlers, close };
}
