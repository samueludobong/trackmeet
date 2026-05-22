import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  PanResponder,
  Modal,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase'

// Inside any useEffect
useEffect(() => {
  const test = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('count')
    
    console.log('Supabase connected:', data)
    console.log('Error:', error)
  }
  test()
}, [])

const { width: SW, height: SH } = Dimensions.get('window');

const BLOB_SHAPES = [
  {
    borderTopLeftRadius: 130,
    borderTopRightRadius: 70,
    borderBottomLeftRadius: 90,
    borderBottomRightRadius: 160,
  },
  {
    borderTopLeftRadius: 80,
    borderTopRightRadius: 150,
    borderBottomLeftRadius: 160,
    borderBottomRightRadius: 55,
  },
  {
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
    borderBottomLeftRadius: 999,
    borderBottomRightRadius: 999,
  },
];

const SLIDES = [
  {
    title: 'Share Your Taste',
    script: 'With The World',
    scriptColor: '#CAFF00',
    subtitle: 'Post what you\'re playing and let the world hear your vibe.',
    blobs: [
      { color: '#AB00FF', w: 280, h: 260, top: 125, left: 15, shape: 0 },
      { color: '#6B00AA', w: 220, h: 240, top: 85, left: 140, shape: 1 },
      { color: '#CAFF00', w: 88, h: 88, top: 280, left: 260, shape: 2 },
    ],
  },
  {
    title: 'Listen Together',
    script: 'In Real Time',
    scriptColor: '#FF6B35',
    subtitle: 'Join a Meet and vibe to the same songs simultaneously.',
    blobs: [
      { color: '#FF6B35', w: 260, h: 275, top: 120, left: 95, shape: 1 },
      { color: '#AB00FF', w: 205, h: 200, top: 125, left: -25, shape: 0 },
      { color: '#fff', w: 95, h: 95, top: 265, left: 255, shape: 2 },
    ],
  },
  {
    title: 'Discover Music',
    script: 'Through People',
    scriptColor: '#AB00FF',
    subtitle: 'Find new songs through people whose taste you actually trust.',
    blobs: [
      { color: '#CAFF00', w: 250, h: 260, top: 130, left: 60, shape: 2 },
      { color: '#6B00AA', w: 210, h: 220, top: 100, left: -20, shape: 0 },
      { color: '#FF6B35', w: 90, h: 90, top: 270, left: 250, shape: 1 },
    ],
  },
];

type Slide = typeof SLIDES[0];

function SlideContent({ slide }: { slide: Slide }) {
  return (
    <View style={styles.slideContent}>
      <View style={styles.blobArea}>
        {slide.blobs.map((b, i) => (
          <View
            key={i}
            style={[
              styles.blob,
              BLOB_SHAPES[b.shape],
              { backgroundColor: b.color, width: b.w, height: b.h, top: b.top, left: b.left },
            ]}
          />
        ))}
      </View>
      <View style={styles.textArea}>
        <Text style={styles.titleBold}>{slide.title}</Text>
        <Text style={[styles.titleScript, { color: slide.scriptColor }]}>{slide.script}</Text>
        <Text style={styles.subtitle}>{slide.subtitle}</Text>
      </View>
    </View>
  );
}

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  dissolveContainer: {
    flex: 1,
  },
  slideContent: {
    flex: 1,
  },
  blobArea: {
    height: SH * 0.5,
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
  },
  star: {
    position: 'absolute',
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
  },
  textArea: {
    paddingHorizontal: 30,
    paddingTop: 26,
    flex: 1,
  },
  titleBold: {
    fontSize: 38,
    fontWeight: '900',
    fontFamily: 'Inter_900Black',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  titleScript: {
    fontSize: 28,
    fontFamily: 'Pacifico_400Regular',
    lineHeight: 62,
    marginTop: -2,
  },
  subtitle: {
    fontSize: 15,
    color: '#c9c9c9',
    marginTop: 14,
    lineHeight: 23,
    maxWidth: SW * 0.78,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 18,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotInactive: {
    width: 8,
    backgroundColor: '#2a2a2a',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 28,
    marginBottom: 18,
  },
  backButton: {
    flex: 1,
    height: '100%',
    backgroundColor: '#1e1e1e',
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 20,
    color: '#ffffff',
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'Inter_900Black',
    color: '#0D0D0D',
    letterSpacing: 0.4,
  },
});
