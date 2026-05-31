import React, { useRef, useState, useEffect } from "react";
import { View, Text, FlatList, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ds } from "../../lib/feed/localStyles";
import { CAROUSEL_CARD_W, CAROUSEL_GAP, CAROUSEL_ITEMS, type CarouselItem } from "../../app/data/mock";

export function TrendingCarousel({
  joinedMeets,
  followedArtists,
  onJoinMeet,
  onFollowArtist,
}: {
  joinedMeets: Set<string>;
  followedArtists: Set<string>;
  onJoinMeet: (id: string) => void;
  onFollowArtist: (id: string) => void;
}) {
  const flatRef = useRef<FlatList<CarouselItem>>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const activeIdxRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceRef = useRef<() => void>(() => {});

  advanceRef.current = () => {
    const next = (activeIdxRef.current + 1) % CAROUSEL_ITEMS.length;
    activeIdxRef.current = next;
    setActiveIdx(next);
    flatRef.current?.scrollToIndex({ index: next, animated: true });
    timerRef.current = setTimeout(() => advanceRef.current(), 3500);
  };

  useEffect(() => {
    timerRef.current = setTimeout(() => advanceRef.current(), 3500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const resetTimer = (idx: number) => {
    activeIdxRef.current = idx;
    setActiveIdx(idx);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => advanceRef.current(), 3500);
  };

  const onScrollEnd = (e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.max(0, Math.min(Math.round(x / (CAROUSEL_CARD_W + CAROUSEL_GAP)), CAROUSEL_ITEMS.length - 1));
    resetTimer(idx);
  };

  return (
    <View style={{ marginBottom: 28 }}>
      <FlatList
        ref={flatRef}
        data={CAROUSEL_ITEMS}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CAROUSEL_CARD_W + CAROUSEL_GAP}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: 16, gap: CAROUSEL_GAP }}
        onMomentumScrollEnd={onScrollEnd}
        scrollEventThrottle={16}
        renderItem={({ item }) => {
          const isEvent = item.type === "event";
          const isArtist = item.type === "artist";
          const isJoined = isEvent && joinedMeets.has(item.ctaId);
          const isFollowing = isArtist && followedArtists.has(item.ctaId);
          const ctaActive = isJoined || isFollowing;
          return (
            <View style={[ds.carouselCard, { width: CAROUSEL_CARD_W }]}>
              <LinearGradient colors={item.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={ds.featuredGradient}>
                <View style={[ds.decoCircle, { width: 200, height: 200, top: -60, right: -60, backgroundColor: item.deco1 }]} />
                <View style={[ds.decoCircle, { width: 130, height: 130, bottom: -40, left: -30, backgroundColor: item.deco2 }]} />
                <View style={ds.featuredBadge}>
                  <Text style={ds.featuredBadgeText}>{item.badge}</Text>
                </View>
                <View style={{ flex: 1 }} />
                <View style={ds.featuredBottom}>
                  <Text style={ds.featuredTitle}>{item.title}</Text>
                  <Text style={ds.featuredSub}>{item.sub}</Text>
                  <View style={ds.featuredRow}>
                    <View style={{ flexDirection: "row", gap: 6 }}>
                      {item.tags.map((t) => (
                        <View key={t} style={ds.featuredTag}><Text style={ds.featuredTagText}>{t}</Text></View>
                      ))}
                    </View>
                    <TouchableOpacity
                      style={[ds.featuredCta, ctaActive && ds.featuredCtaActive]}
                      activeOpacity={0.85}
                      onPress={() => {
                        if (isEvent) onJoinMeet(item.ctaId);
                        else if (isArtist) onFollowArtist(item.ctaId);
                      }}
                    >
                      <Text style={[ds.featuredCtaText, ctaActive && ds.featuredCtaTextActive]}>
                        {isJoined ? "✓ Going" : isFollowing ? "✓ Following" : item.cta}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </LinearGradient>
            </View>
          );
        }}
      />
      <View style={ds.dotRow}>
        {CAROUSEL_ITEMS.map((_, i) => (
          <TouchableOpacity
            key={i}
            activeOpacity={0.8}
            onPress={() => {
              flatRef.current?.scrollToIndex({ index: i, animated: true });
              resetTimer(i);
            }}
          >
            <View style={[ds.dot, i === activeIdx && ds.dotActive]} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ─── Discover view ────────────────────────────────────────────────────────────
