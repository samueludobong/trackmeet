import React, { useRef, useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { styles } from "../../app/signup.styles";
import { DRUM_H, MONTHS, DAYS, YEARS } from "../../constants/signup";

export function DrumPicker({
  values,
  initialIndex = 0,
  onSelect,
  flex,
}: {
  values: string[];
  initialIndex?: number;
  onSelect: (v: string) => void;
  flex?: number;
}) {
  const [selIdx, setSelIdx] = useState(initialIndex);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: initialIndex * DRUM_H,
        animated: false,
      });
    }, 80);
  }, []);

  const snap = (y: number) => {
    const idx = Math.max(
      0,
      Math.min(values.length - 1, Math.round(y / DRUM_H)),
    );
    setSelIdx(idx);
    onSelect(values[idx]);
  };

  return (
    <View style={{ flex: flex ?? 1, height: DRUM_H * 3, overflow: "hidden" }}>
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { justifyContent: "center" }]}
      >
        <View
          style={{
            height: DRUM_H,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderColor: "rgba(171,0,255,0.65)",
          }}
        />
      </View>
      <ScrollView
        ref={scrollRef}
        snapToInterval={DRUM_H}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: DRUM_H }}
        onMomentumScrollEnd={(e) => snap(e.nativeEvent.contentOffset.y)}
        onScrollEndDrag={(e) => snap(e.nativeEvent.contentOffset.y)}
      >
        {values.map((v, i) => (
          <View
            key={v + i}
            style={{
              height: DRUM_H,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                fontSize: i === selIdx ? 24 : 16,
                fontWeight: i === selIdx ? "800" : "400",
                color:
                  i === selIdx
                    ? "#fff"
                    : Math.abs(i - selIdx) === 1
                      ? "rgba(255,255,255,0.28)"
                      : "rgba(255,255,255,0.1)",
                letterSpacing: i === selIdx ? -0.3 : 0,
              }}
            >
              {v}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

export function BirthdayDrumPicker({
  onChange,
}: {
  onChange: (date: string) => void;
}) {
  // Refs avoid stale-closure issues when multiple pickers fire rapidly
  const monthRef = useRef(MONTHS[0]);
  const dayRef = useRef(DAYS[0]);
  const yearRef = useRef(YEARS[0]);

  const notify = (m: string, d: string, y: string) => {
    const mm = String(MONTHS.indexOf(m) + 1).padStart(2, "0");
    onChange(`${y}-${mm}-${d}`);
  };

  // Emit initial value so parent has a valid date from the start
  useEffect(() => {
    notify(monthRef.current, dayRef.current, yearRef.current);
  }, []);

  return (
    <View style={styles.drumWrap}>
      <DrumPicker
        values={MONTHS}
        initialIndex={0}
        flex={1.3}
        onSelect={(v) => {
          monthRef.current = v;
          notify(v, dayRef.current, yearRef.current);
        }}
      />
      <View style={styles.drumDivider} />
      <DrumPicker
        values={DAYS}
        initialIndex={0}
        flex={0.9}
        onSelect={(v) => {
          dayRef.current = v;
          notify(monthRef.current, v, yearRef.current);
        }}
      />
      <View style={styles.drumDivider} />
      <DrumPicker
        values={YEARS}
        initialIndex={0}
        flex={1.2}
        onSelect={(v) => {
          yearRef.current = v;
          notify(monthRef.current, dayRef.current, v);
        }}
      />
    </View>
  );
}

// ─── Streaming list ───────────────────────────────────────────────────────────
