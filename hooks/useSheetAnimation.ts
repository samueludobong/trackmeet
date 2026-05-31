import { useRef, useEffect } from "react";
import { Animated } from "react-native";

/**
 * Drives a bottom-sheet's slide + backdrop fade from a `visible` flag. Returns
 * the animated values to bind to the sheet transform and backdrop opacity.
 */
export function useSheetAnimation(visible: boolean, opts: { from?: number; duration?: number } = {}) {
  const { from = 500, duration = 200 } = opts;
  const slideAnim = useRef(new Animated.Value(from)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 200 }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: from, duration, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return { slideAnim, backdropAnim };
}
