import { useRef } from "react";
import { Animated, PanResponder } from "react-native";

/**
 * Swipe-down-to-dismiss for full-screen overlays (e.g. the story viewer).
 *
 * Unlike useSheetDragClose (which claims the gesture on touch via a grabber),
 * this only claims a clearly *vertical-downward* drag, so taps, horizontal
 * swipes, and long-presses underneath still work. `dragY` follows the finger
 * 1:1 while dragging; release past the threshold (or a fast fling) animates the
 * content off-screen and calls `onClose`, otherwise it springs back.
 */
export function useDragDownToClose({
  onClose,
  distance,
  threshold = 120,
  velocity = 0.8,
}: {
  onClose: () => void;
  /** How far down to animate before calling onClose (usually screen height). */
  distance: number;
  threshold?: number;
  velocity?: number;
}) {
  const dragY = useRef(new Animated.Value(0)).current;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      // Only a decisive downward drag — leaves taps (prev/next) and long-press
      // (pause) to the children beneath.
      onMoveShouldSetPanResponder: (_e, g) => g.dy > 10 && g.dy > Math.abs(g.dx) * 1.8,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_e, g) => { dragY.setValue(Math.max(0, g.dy)); },
      onPanResponderRelease: (_e, g) => {
        if (g.dy > threshold || g.vy > velocity) {
          Animated.timing(dragY, {
            toValue: distance, duration: 220, useNativeDriver: true,
          }).start(() => onCloseRef.current());
        } else {
          Animated.spring(dragY, {
            toValue: 0, useNativeDriver: true, damping: 22, stiffness: 220,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(dragY, {
          toValue: 0, useNativeDriver: true, damping: 22, stiffness: 220,
        }).start();
      },
    })
  ).current;

  return { dragY, panHandlers: pan.panHandlers };
}
