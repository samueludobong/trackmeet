import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getLyricsForTrack, type LyricsResult } from "../../services/lyrics";
import { styles } from "../../assets/styles/meets/MeetLyricsView";

const { height: SH } = Dimensions.get("window");

type Track = { id: string | null; name: string | null; artist: string | null; durationMs: number | null } | null;

/**
 * Synced lyrics panel for the Meet screen. Renders over the meet's album-art
 * background (transparent) and scrolls in step with `positionMs` — which the meet
 * already keeps in sync with the host's playback. Pure read-only view; the meet's
 * chat bar sits below it untouched.
 */
export function MeetLyricsView({ track, positionMs, onClose, scrollLocked = false }: {
  track: Track;
  positionMs: number;
  onClose: () => void;
  // Driven by the screen's page-swipe pager — freezes lyric scrolling while a
  // horizontal page swipe is in progress so the swipe always wins.
  scrollLocked?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [lyrics, setLyrics] = useState<LyricsResult | null>(null);
  const [failed, setFailed] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const lineY = useRef<number[]>([]);
  const panelH = useRef(0);

  // Fetch (and cache) lyrics when the track changes.
  useEffect(() => {
    if (!track?.id || !track?.name) { setLyrics(null); setFailed(!!track && !track.name); return; }
    let active = true;
    setLoading(true); setFailed(false); setLyrics(null); lineY.current = [];
    getLyricsForTrack({ trackId: track.id, trackName: track.name, artistName: track.artist, durationMs: track.durationMs })
      .then((r) => { if (!active) return; if (r) setLyrics(r); else setFailed(true); })
      .catch(() => active && setFailed(true))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [track?.id, track?.name]);

  const synced = lyrics?.synced ?? null;

  // Active line derived from the live meet position.
  const activeIdx = useMemo(() => {
    if (!synced) return -1;
    let idx = -1;
    for (let i = 0; i < synced.length; i++) { if (positionMs >= synced[i].timeMs) idx = i; else break; }
    return idx;
  }, [synced, positionMs]);

  // Keep the active line centered.
  useEffect(() => {
    if (activeIdx < 0 || !synced) return;
    const y = lineY.current[activeIdx];
    if (y == null || !panelH.current) return;
    scrollRef.current?.scrollTo({ y: Math.max(y - panelH.current / 2 + 18, 0), animated: true });
  }, [activeIdx, synced]);

  return (
    <View style={styles.fill}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onClose} hitSlop={10} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerText} numberOfLines={1}>Lyrics</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.body} onLayout={(e) => { panelH.current = e.nativeEvent.layout.height; }}>
        {loading ? (
          <View style={styles.center}><ActivityIndicator color="rgba(255,255,255,0.9)" /></View>
        ) : failed || !lyrics ? (
          <View style={styles.center}>
            <Text style={styles.empty}>Huhh we dont know the lyrics to this one</Text>
          </View>
        ) : synced ? (
          <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} scrollEnabled={!scrollLocked} contentContainerStyle={{ paddingTop: 20, paddingBottom: SH * 0.45 }}>
            {synced.map((line, i) => (
              <Text
                key={`${i}-${line.timeMs}`}
                onLayout={(e) => { lineY.current[i] = e.nativeEvent.layout.y; }}
                style={[styles.line, i === activeIdx ? styles.active : styles.idle]}
              >
                {line.text || "♪"}
              </Text>
            ))}
          </ScrollView>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} scrollEnabled={!scrollLocked} contentContainerStyle={{ paddingVertical: 20 }}>
            {lyrics.plain!.split("\n").map((l, i) => (
              <Text key={i} style={[styles.line, styles.plain]}>{l || " "}</Text>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const SHADOW = { textShadowColor: "rgba(0,0,0,0.6)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 };
