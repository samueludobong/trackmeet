import { SlideContent } from "../components/onboarding/SlideContent";
import { SLIDES } from "../constants/onboarding";
import { styles } from "./onboarding.styles";
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, PanResponder, Modal, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useRef, useEffect } from 'react';


const { width: SW, height: SH } = Dimensions.get('window');


export default function OnboardingScreen() {
  const router = useRouter();
  const [index, setIndex] = useState(0);

  // A/B layers for cross-dissolve: top layer fades out while bottom fades in
  const [layerA, setLayerA] = useState(0);
  const [layerB, setLayerB] = useState(0);
  const topIsA = useRef(true);
  const dissolve = useRef(new Animated.Value(1)).current;
  // dissolve = 1 → A on top (opaque), B hidden; dissolve = 0 → B on top, A hidden

  const opacityA = dissolve;
  const opacityB = dissolve.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  const backAnim = useRef(new Animated.Value(0)).current;
  const isLast = index === SLIDES.length - 1;
  const isLastRef = useRef(false);
  isLastRef.current = isLast;

  // Button zoom-to-fill state
  const buttonRef = useRef<View>(null);
  const expandScale = useRef(new Animated.Value(1)).current;
  const [showExpand, setShowExpand] = useState(false);
  const [expandLayout, setExpandLayout] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const expandColor = useRef('#AB00FF');

  useEffect(() => {
    Animated.timing(backAnim, {
      toValue: index > 0 ? 1 : 0,
      duration: 260,
      useNativeDriver: false,
    }).start();
  }, [index]);

  const backBtnWidth = backAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 60] });
  const backBtnMargin = backAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 12] });

  const crossDissolve = (newIndex: number) => {
    if (topIsA.current) {
      // A is currently visible — load new slide into B, then dissolve A out (B fades in)
      setLayerB(newIndex);
      dissolve.setValue(1);
      Animated.timing(dissolve, { toValue: 0, duration: 580, useNativeDriver: true }).start(() => {
        topIsA.current = false;
        setIndex(newIndex);
      });
    } else {
      // B is currently visible — load new slide into A, then dissolve B out (A fades in)
      setLayerA(newIndex);
      dissolve.setValue(0);
      Animated.timing(dissolve, { toValue: 1, duration: 580, useNativeDriver: true }).start(() => {
        topIsA.current = true;
        setIndex(newIndex);
      });
    }
  };

  const handleNext = () => {
    if (isLast) {
      // Zoom the button to fill the screen, then navigate to signup
      buttonRef.current?.measure((_, __, w, h, pageX, pageY) => {
        expandColor.current = SLIDES[index].scriptColor;
        setExpandLayout({ x: pageX, y: pageY, w, h });
        setShowExpand(true);
        expandScale.setValue(1);
        Animated.timing(expandScale, {
          toValue: 40,
          duration: 550,
          easing: Easing.in(Easing.exp),
          useNativeDriver: true,
        }).start(() => router.replace('/signup'));
      });
      return;
    }
    crossDissolve(index + 1);
  };

  const handlePrev = () => {
    crossDissolve(index - 1);
  };

  // Refs keep panResponder callbacks fresh without recreating it
  const nextRef = useRef(handleNext);
  const prevRef = useRef(handlePrev);
  nextRef.current = handleNext;
  prevRef.current = handlePrev;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        !isLastRef.current && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10,
      onPanResponderRelease: (_, { dx }) => {
        if (dx < -50) nextRef.current();
        else if (dx > 50) prevRef.current();
      },
    })
  ).current;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Cross-dissolve content area — swipe left/right to navigate */}
      <View style={styles.dissolveContainer} {...panResponder.panHandlers}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: opacityA }]}>
          <SlideContent slide={SLIDES[layerA]} />
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: opacityB }]}>
          <SlideContent slide={SLIDES[layerB]} />
        </Animated.View>
      </View>

      {/* Dots + buttons sit outside the dissolve so they stay crisp */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === index ? { backgroundColor: SLIDES[index].scriptColor, width: 28 } : styles.dotInactive]} />
        ))}
      </View>

      <View style={styles.buttonRow}>
        <Animated.View style={{ width: backBtnWidth, opacity: backAnim, marginRight: backBtnMargin }}>
          <TouchableOpacity style={styles.backButton} onPress={handlePrev} activeOpacity={0.85}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
        </Animated.View>
        <View ref={buttonRef} style={{ flex: 1 }}>
          <TouchableOpacity
            style={{ backgroundColor: SLIDES[index].scriptColor, borderRadius: 50, paddingVertical: 18, alignItems: 'center' }}
            onPress={handleNext}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>{isLast ? "Let's Start  →" : 'Next  →'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Button zoom-to-fill overlay — renders over everything via Modal */}
      <Modal visible={showExpand} transparent animationType="none">
        <Animated.View
          style={{
            position: 'absolute',
            left: expandLayout.x,
            top: expandLayout.y,
            width: expandLayout.w,
            height: expandLayout.h,
            borderRadius: expandLayout.h / 2,
            backgroundColor: expandColor.current,
            transform: [{ scale: expandScale }],
          }}
        />
      </Modal>
    </SafeAreaView>
  );
}
