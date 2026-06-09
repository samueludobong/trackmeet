import { useEffect, useRef } from "react";
import { Animated, PanResponder } from "react-native";

/**
 * Drag-to-close behaviour for bottom-sheet overlays.
 *
 * Returns:
 *   - `panHandlers`: spread onto a `<DragGrabber>` at the top of the sheet —
 *     NOT the sheet's outer Animated.View. Putting them on the whole sheet
 *     conflicts with internal ScrollViews that need to receive vertical drags.
 *   - `stretch`: an Animated.Value (default 1). Apply as `scaleY` in the sheet's
 *     transform to get a visual stretch when the user drags upward against the
 *     open position, instead of the sheet moving off-anchor.
 *
 * Behaviour:
 *   - Touch grabber: gesture is claimed immediately (no scroll/tap conflict
 *     possible because the grabber sits above any ScrollView).
 *   - Drag down: translateY follows finger 1:1
 *   - Drag up : translateY stays at 0, `stretch` grows above 1
 *   - Release down past threshold (or fling): animate closed + onClose()
 *   - Release otherwise: spring back open
 */
export function useSheetDragClose({
  slideAnim,
  onClose,
  closedValue,
  threshold = 90,
  velocityThreshold = 0.5,
  maxStretch = 0.08,
}: {
  slideAnim: Animated.Value;
  onClose: () => void;
  closedValue: number;
  threshold?: number;
  velocityThreshold?: number;
  maxStretch?: number;
}) {
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  // Live mirror of slideAnim so we read the correct start value at grant time,
  // even when the consumer drove slideAnim with the native driver.
  const valueRef = useRef(0);
  useEffect(() => {
    const id = slideAnim.addListener(({ value }) => { valueRef.current = value; });
    return () => slideAnim.removeListener(id);
  }, [slideAnim]);

  const stretchAnim = useRef(new Animated.Value(1)).current;
  const startValueRef = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      // Claim immediately on touch — the grabber sits above any scroll content
      // so there's no gesture to compete with.
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: () => {
        startValueRef.current = valueRef.current;
        slideAnim.stopAnimation();
        stretchAnim.stopAnimation();
      },

      onPanResponderMove: (_e, g) => {
        const next = startValueRef.current + g.dy;
        if (next < 0) {
          slideAnim.setValue(0);
          const overshoot = -next;
          const ratio = overshoot / (overshoot + 400);
          stretchAnim.setValue(1 + ratio * maxStretch);
        } else {
          slideAnim.setValue(next);
          stretchAnim.setValue(1);
        }
      },

      onPanResponderRelease: (_e, g) => {
        const draggedDown = g.dy > 0;
        const shouldClose =
          draggedDown && (g.dy > threshold || g.vy > velocityThreshold);

        Animated.spring(stretchAnim, {
          toValue: 1,
          useNativeDriver: true,
          damping: 16,
          stiffness: 220,
        }).start();

        if (shouldClose) {
          Animated.timing(slideAnim, {
            toValue: closedValue,
            duration: 220,
            useNativeDriver: true,
          }).start(() => onCloseRef.current());
        } else {
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            damping: 22,
            stiffness: 200,
          }).start();
        }
      },

      onPanResponderTerminate: () => {
        Animated.spring(slideAnim, {
          toValue: 0, useNativeDriver: true, damping: 22, stiffness: 200,
        }).start();
        Animated.spring(stretchAnim, {
          toValue: 1, useNativeDriver: true, damping: 16, stiffness: 220,
        }).start();
      },

      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  return { panHandlers: panResponder.panHandlers, stretch: stretchAnim };
}
