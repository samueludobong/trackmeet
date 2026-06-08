import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, Image, ScrollView,
  ActivityIndicator, Dimensions, Pressable,
} from "react-native";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { getLyricsForTrack, peekLyrics, claimFirstDiscovery, hasCelebrated, markCelebrated, type LyricsResult } from "../../services/lyrics";
import { useArtAccent } from "../../hooks/albumColors";
import { Confetti } from "./Confetti";
import { CelebrationBanner, DiscoveryLoader } from "./LyricsCelebration";
import { translateLyrics, languageName, LANGUAGES } from "../../services/translate";
import {
  getCurrentlyPlaying, setPlayback, skipNext, skipPrevious, seekPlayback, openSpotifyLink,
} from "../../lib/spotify";
import { AddToPlaylistSheet } from "../AddToPlaylistSheet";

const { height: SH } = Dimensions.get("window");

type Song = {
  id: string | null;
  name: string;
  artist: string | null;
  albumArt: string | null;
  durationMs: number | null;
  progressMs: number | null;
  updatedAt: string | null;
};

// What the header/lyrics render from. For the owner this is kept live by polling
// Spotify; for other users it's derived from the passed-in now-playing snapshot.
type Track = {
  id: string | null;
  name: string;
  artist: string | null;
  albumArt: string | null;
  durationMs: number | null;
};

// Playback anchor: at wall-clock `atMs` the track was at `progressMs`.
type Pos = { progressMs: number; atMs: number; isPlaying: boolean };

/**
 * Full-screen lyrics view (black screen, album-tinted panel) backed by lrclib.
 *
 * Owner (`isOwner`): polls the live now-playing so a song change / seek updates
 * the lyrics + timing, exposes transport controls, and tapping a line seeks
 * playback to that timestamp. Other users get Add-to-Playlist + Open-in-Spotify
 * buttons instead of transport controls.
 */
export function LyricsOverlay({
  visible, onClose, song, isOwner = false, accessToken = null, viewerId = null,
}: {
  visible: boolean;
  onClose: () => void;
  song: Song;
  isOwner?: boolean;
  accessToken?: string | null;
  viewerId?: string | null;
}) {
  const insets = useSafeAreaInsets();
  const [track, setTrack] = useState<Track>(() => ({
    id: song.id, name: song.name, artist: song.artist, albumArt: song.albumArt, durationMs: song.durationMs,
  }));
  const accent = useArtAccent(track.albumArt, FALLBACK_ACCENT);
  const [loading, setLoading] = useState(false);
  const [lyrics, setLyrics] = useState<LyricsResult | null>(null);
  const [failed, setFailed] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [introProgress, setIntroProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  // First-discovery celebration: a banner ("first" → "saved") + a confetti burst.
  const [banner, setBanner] = useState<null | "first" | "saved">(null);
  const [confetti, setConfetti] = useState(0);
  const celebrateTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  // Translation: detected source language, chosen target (null = original),
  // the translated copy, and a per-language cache for this track.
  const [detectedLang, setDetectedLang] = useState<string | null>(null);
  const [targetLang, setTargetLang] = useState<string | null>(null);
  const [translated, setTranslated] = useState<LyricsResult | null>(null);
  const [translating, setTranslating] = useState(false);
  const [transError, setTransError] = useState(false);
  const [langPickerOpen, setLangPickerOpen] = useState(false);
  const transCache = useRef<Map<string, LyricsResult>>(new Map());

  const scrollRef = useRef<ScrollView>(null);
  const lineY = useRef<number[]>([]);
  const panelH = useRef(0);
  // Live playback anchor, read each tick (mutating a ref avoids re-running the
  // sync effect on every position update).
  const posRef = useRef<Pos>({
    progressMs: song.progressMs ?? 0,
    atMs: song.updatedAt ? new Date(song.updatedAt).getTime() : Date.now(),
    isPlaying: true,
  });
  // Lets playback handlers trigger an immediate re-poll after an action.
  const pollRef = useRef<() => void>(() => {});

  const currentMs = () => {
    const { progressMs, atMs, isPlaying: playing } = posRef.current;
    return progressMs + (playing ? Date.now() - atMs : 0);
  };

  const clearCelebrateTimers = () => {
    celebrateTimers.current.forEach(clearTimeout);
    celebrateTimers.current = [];
  };

  // Full reset whenever the overlay closes — the Modal stays mounted, so without
  // this, lyrics/scroll/translation/celebration state would persist into the
  // next open.
  useEffect(() => {
    if (visible) return;
    clearCelebrateTimers();
    setConfetti(0);
    setLoading(false);
    setLyrics(null);
    setFailed(false);
    setActiveIdx(-1);
    setIntroProgress(0);
    setBanner(null);
    setPickerOpen(false);
    setLangPickerOpen(false);
    setTranslated(null);
    setTargetLang(null);
    setDetectedLang(null);
    setTranslating(false);
    setTransError(false);
    lineY.current = [];
    panelH.current = 0;
    transCache.current.clear();
    scrollRef.current?.scrollTo?.({ y: 0, animated: false });
  }, [visible]);

  // ── Non-owner: mirror the passed-in now-playing snapshot ────────────────────
  useEffect(() => {
    if (isOwner) return;
    setTrack({ id: song.id, name: song.name, artist: song.artist, albumArt: song.albumArt, durationMs: song.durationMs });
    posRef.current = {
      progressMs: song.progressMs ?? 0,
      atMs: song.updatedAt ? new Date(song.updatedAt).getTime() : Date.now(),
      isPlaying: true,
    };
  }, [isOwner, song.id, song.name, song.artist, song.albumArt, song.durationMs, song.progressMs, song.updatedAt]);

  // ── Owner: poll the live now-playing so song changes + seeks track through ──
  useEffect(() => {
    if (!visible || !isOwner || !accessToken) return;
    let active = true;
    const poll = async () => {
      const cp = await getCurrentlyPlaying(accessToken);
      if (!active || !cp || "unauthorized" in cp) return;
      posRef.current = { progressMs: cp.progressMs ?? 0, atMs: Date.now(), isPlaying: cp.isPlaying };
      setIsPlaying(cp.isPlaying);
      // Only swap the track object when the id actually changes, so we don't
      // refetch lyrics on every poll.
      setTrack((prev) =>
        prev.id === cp.id
          ? prev
          : { id: cp.id, name: cp.name, artist: cp.artist, albumArt: cp.albumArt ?? null, durationMs: cp.durationMs },
      );
    };
    pollRef.current = poll;
    poll();
    const id = setInterval(poll, 3000);
    return () => { active = false; clearInterval(id); };
  }, [visible, isOwner, accessToken]);

  // ── Resolve lyrics + run the discovery celebration ──────────────────────────
  // Re-runs on every track change (not just first open), so skipping to a new
  // song while the overlay is live celebrates that song too.
  useEffect(() => {
    if (!visible || !track.name) return;
    setActiveIdx(-1);
    lineY.current = [];
    clearCelebrateTimers();
    setBanner(null);

    const tid = track.id;
    let active = true;

    // Show the lyrics state synchronously up front so we never flash the empty
    // ("Huhh…") state during an in-flight DB read.
    const peeked = tid ? peekLyrics(tid) : null;
    if (peeked) {
      setLyrics(peeked === "none" ? null : peeked);
      setFailed(peeked === "none");
      setLoading(false);
    } else {
      setLyrics(null);
      setFailed(false);
      setLoading(true);
    }

    // "Fresh" = this device has never played the animation for this track (sync,
    // race-free local guard) AND we won the global DB discovery claim. The local
    // guard alone guarantees the confetti can never replay here.
    const alreadyCelebrated = !!tid && hasCelebrated(tid);
    const freshP: Promise<boolean> = tid && !alreadyCelebrated
      ? claimFirstDiscovery(tid).catch(() => false)
      : Promise.resolve(false);
    // As soon as we know it's a fresh discovery, show the anticipation banner.
    freshP.then((fresh) => {
      if (active && fresh) {
        setBanner("first");
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
    });

    (async () => {
      const res = await getLyricsForTrack({
        trackId: tid, trackName: track.name, artistName: track.artist, durationMs: track.durationMs,
      }).catch(() => null);
      if (!active) return;
      setLyrics(res);
      setFailed(!res);
      setLoading(false);

      // Celebrate only for a fresh discovery with lyrics — then mark this device
      // so it never plays again.
      const fresh = await freshP;
      if (!active) return;
      if (fresh && res && tid) {
        markCelebrated(tid);
        celebrateTimers.current.push(setTimeout(() => {
          if (!active) return;
          setConfetti((c) => c + 1);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          setBanner("saved");
          celebrateTimers.current.push(setTimeout(() => active && setBanner(null), 4600));
        }, peeked ? 700 : 600));
      } else {
        setBanner(null);
      }
    })();

    return () => { active = false; clearCelebrateTimers(); };
  }, [visible, track.id, track.name, track.artist]);

  // Lines to render. When the synced lyrics don't start until a few seconds in,
  // prepend a synthetic intro line (timeMs 0) so the lead-in shows an animated
  // "…" instead of dead space at the top.
  // Lyrics actually shown = the translated copy when a target language is active,
  // otherwise the original. Timestamps are identical either way.
  const shown = translated ?? lyrics;
  const displayLines = useMemo(() => {
    const s = shown?.synced;
    if (!s?.length) return null;
    const withIntro = s[0].timeMs > INTRO_MIN_GAP_MS;
    const lines = s.map((l) => ({ ...l, intro: false }));
    return withIntro ? [{ timeMs: 0, text: "", intro: true }, ...lines] : lines;
  }, [shown]);
  const firstLyricMs = displayLines?.[0]?.intro ? displayLines[1]?.timeMs ?? 0 : 0;

  // ── Translation: reset when new lyrics arrive (the source language is learned
  //     lazily from the first translation, so there's no upfront detect call). ──
  useEffect(() => {
    setTargetLang(null);
    setTranslated(null);
    setDetectedLang(null);
    transCache.current.clear();
  }, [lyrics]);

  // ── Translation: (re)translate when the target language changes ─────────────
  useEffect(() => {
    const tgt = targetLang;
    // null / known-to-be-the-source ⇒ show the original.
    if (!lyrics || !tgt || tgt === detectedLang) { setTranslated(null); return; }
    const cached = transCache.current.get(tgt);
    if (cached) { setTranslated(cached); return; }
    let active = true;
    setTranslating(true);
    setTransError(false);
    translateLyrics(track.id, lyrics, tgt)
      .then((t) => {
        if (!active) return;
        if (!t) { setTranslated(null); setTargetLang(null); setTransError(true); return; } // failed → revert + notify
        // Learn the song's own language from the result.
        if (t.source) setDetectedLang(t.source);
        // If the chosen language IS the song's language, just show the original.
        if (t.source && t.source === tgt) { setTargetLang(null); setTranslated(null); return; }
        transCache.current.set(tgt, t.result);
        setTranslated(t.result);
      })
      .finally(() => { if (active) setTranslating(false); });
    return () => { active = false; };
  }, [targetLang, lyrics, detectedLang]);

  // Auto-clear the translation error toast.
  useEffect(() => {
    if (!transError) return;
    const id = setTimeout(() => setTransError(false), 3200);
    return () => clearTimeout(id);
  }, [transError]);

  // ── Drive the synced highlight from the live playback anchor ────────────────
  useEffect(() => {
    if (!visible || !displayLines) return;
    const lines = displayLines;
    const hasIntro = lines[0].intro;

    const tick = () => {
      const raw = currentMs();
      const now = track.durationMs ? Math.min(raw, track.durationMs) : raw;
      let idx = -1;
      for (let i = 0; i < lines.length; i++) {
        if (now >= lines[i].timeMs) idx = i;
        else break;
      }
      setActiveIdx((prev) => (prev !== idx ? idx : prev));
      if (hasIntro && firstLyricMs > 0) {
        setIntroProgress(Math.min(Math.max(now / firstLyricMs, 0), 1));
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [visible, displayLines, firstLyricMs, track.durationMs]);

  // ── Auto-scroll the active synced line into the vertical center ─────────────
  useEffect(() => {
    if (activeIdx < 0 || !displayLines) return;
    const y = lineY.current[activeIdx];
    if (y == null || !panelH.current) return;
    scrollRef.current?.scrollTo({ y: Math.max(y - panelH.current / 2 + 24, 0), animated: true });
  }, [activeIdx, displayLines]);

  // ── Playback handlers (owner only) ──────────────────────────────────────────
  const handlePlayPause = async () => {
    if (!accessToken) return;
    const next = !isPlaying;
    setIsPlaying(next);
    posRef.current = { progressMs: currentMs(), atMs: Date.now(), isPlaying: next };
    await setPlayback(accessToken, next);
    setTimeout(() => pollRef.current(), 400);
  };
  const handleNext = async () => {
    if (!accessToken) return;
    await skipNext(accessToken);
    setTimeout(() => pollRef.current(), 600);
  };
  const handlePrev = async () => {
    if (!accessToken) return;
    await skipPrevious(accessToken);
    setTimeout(() => pollRef.current(), 600);
  };
  const handleSeek = async (ms: number) => {
    if (!isOwner || !accessToken) return;
    posRef.current = { progressMs: ms, atMs: Date.now(), isPlaying };
    await seekPlayback(accessToken, ms);
    setTimeout(() => pollRef.current(), 400);
  };

  const openInSpotify = () => {
    if (!track.id) return;
    openSpotifyLink(`spotify:track:${track.id}`, `https://open.spotify.com/track/${track.id}`);
  };

  const renderLyrics = () => {
    if (loading) {
      // Fresh discovery → build anticipation with the sparkle loader.
      return banner === "first" ? (
        <DiscoveryLoader accent={accent} />
      ) : (
        <View style={styles.centerFill}>
          <ActivityIndicator color="rgba(255,255,255,0.9)" />
        </View>
      );
    }
    if (failed || !lyrics) {
      return (
        <View style={styles.centerFill}>
          <Text style={styles.emptyText}>Huhh we dont know the lyrics to this one</Text>
        </View>
      );
    }

    // Synced — big active line, faded neighbors, auto-scroll, tap-to-seek (owner).
    if (displayLines) {
      return (
        <ScrollView
          ref={scrollRef}
          onLayout={(e) => { panelH.current = e.nativeEvent.layout.height; }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 28, paddingBottom: SH * 0.6 }}
        >
          {displayLines.map((line, i) =>
            line.intro ? (
              <View
                key="intro"
                onLayout={(e) => { lineY.current[i] = e.nativeEvent.layout.y; }}
                style={styles.introRow}
              >
                {[0, 1, 2].map((k) => (
                  <View
                    key={k}
                    style={[
                      styles.introDot,
                      { opacity: i === activeIdx ? Math.min(Math.max(introProgress * 3 - k, 0.28), 1) : 0.32 },
                    ]}
                  />
                ))}
              </View>
            ) : (
              <Text
                key={`${i}-${line.timeMs}`}
                onLayout={(e) => { lineY.current[i] = e.nativeEvent.layout.y; }}
                onPress={isOwner ? () => handleSeek(line.timeMs) : undefined}
                suppressHighlighting
                style={[styles.lyricLine, i === activeIdx ? styles.lyricActive : styles.lyricIdle]}
              >
                {line.text || "♪"}
              </Text>
            )
          )}
        </ScrollView>
      );
    }

    // Plain — manual scroll, no highlight.
    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 36 }}>
        {(shown?.plain ?? lyrics.plain!).split("\n").map((line, i) => (
          <Text key={i} style={[styles.lyricLine, styles.lyricPlain]}>{line || " "}</Text>
        ))}
      </ScrollView>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.screen}>
        {/* ── Track chip + menu (black area, top) ── */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View style={styles.chip}>
            {track.albumArt ? (
              <Image source={{ uri: track.albumArt }} style={styles.chipArt} />
            ) : (
              <View style={[styles.chipArt, styles.chipArtFallback]}>
                <FontAwesome5 name="music" size={14} color="rgba(255,255,255,0.7)" />
              </View>
            )}
            <View style={{ flexShrink: 1 }}>
              <Text style={styles.chipTitle} numberOfLines={1}>{track.name}</Text>
              <Text style={styles.chipArtist} numberOfLines={1}>{track.artist ?? ""}</Text>
            </View>
          </View>
          {lyrics && (
            <TouchableOpacity style={styles.langPill} onPress={() => setLangPickerOpen(true)} hitSlop={6} activeOpacity={0.8}>
              <Ionicons name="language" size={15} color="#fff" />
              {translating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.langPillText} numberOfLines={1}>
                  {translated ? languageName(targetLang) : "Original"}
                </Text>
              )}
              <Ionicons name="chevron-down" size={12} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.menuBtn} onPress={onClose} hitSlop={10}>
            <Ionicons name="chevron-down" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* ── First-discovery banner ── */}
        {banner && (
          <View style={styles.bannerWrap} pointerEvents="none">
            <CelebrationBanner
              kind={banner}
              accent={accent}
              text={banner === "saved" ? SAVED_TEXT : isOwner ? HOST_FIRST_TEXT : PLAYER_FIRST_TEXT}
            />
          </View>
        )}

        {/* ── Translation-failed toast ── */}
        {transError && (
          <View style={styles.bannerWrap} pointerEvents="none">
            <View style={styles.transErr}>
              <Ionicons name="alert-circle" size={16} color="#fff" />
              <Text style={styles.transErrText}>Translation unavailable right now</Text>
            </View>
          </View>
        )}

        {/* ── Lyrics panel (center) — tinted from the album-art accent ── */}
        <LinearGradient colors={accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.panel}>
          {renderLyrics()}
        </LinearGradient>

        {/* ── Controls (black area, bottom) ── */}
        {isOwner ? (
          <View style={[styles.controls, { paddingBottom: insets.bottom + 18 }]}>
            <Pressable style={styles.ctrlSquare} onPress={() => setPickerOpen(true)}>
              <Ionicons name="bookmark-outline" size={20} color="#F5C518" />
            </Pressable>
            <View style={styles.ctrlGroup}>
              <Pressable style={styles.ctrlSquare} onPress={handlePrev}>
                <Ionicons name="play-skip-back" size={20} color="#fff" />
              </Pressable>
              <Pressable style={[styles.ctrlSquare, { backgroundColor: accent[0], borderColor: accent[0] }]} onPress={handlePlayPause}>
                <Ionicons name={isPlaying ? "pause" : "play"} size={22} color="#fff" />
              </Pressable>
              <Pressable style={styles.ctrlSquare} onPress={handleNext}>
                <Ionicons name="play-skip-forward" size={20} color="#fff" />
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={[styles.controlsAlt, { paddingBottom: insets.bottom + 18 }]}>
            <Pressable style={styles.pillBtn} onPress={() => setPickerOpen(true)}>
              <Ionicons name="add-circle-outline" size={18} color="#fff" />
              <Text style={styles.pillText}>Add to Playlist</Text>
            </Pressable>
            <Pressable style={[styles.pillBtn, styles.spotifyPill]} onPress={openInSpotify}>
              <FontAwesome5 name="spotify" size={16} color="#fff" />
              <Text style={styles.pillText}>Open in Spotify</Text>
            </Pressable>
          </View>
        )}

        <AddToPlaylistSheet
          visible={pickerOpen}
          onClose={() => setPickerOpen(false)}
          userId={viewerId}
          track={track.id ? {
            id: track.id, name: track.name, artist: track.artist,
            albumArt: track.albumArt, durationMs: track.durationMs,
          } : null}
        />

        <Confetti trigger={confetti} />

        {/* ── Language picker (translation dropdown) ── */}
        <Modal visible={langPickerOpen} transparent animationType="slide" onRequestClose={() => setLangPickerOpen(false)}>
          <Pressable style={styles.langOverlay} onPress={() => setLangPickerOpen(false)}>
            <Pressable style={[styles.langSheet, { paddingBottom: insets.bottom + 12 }]} onPress={(e) => e.stopPropagation()}>
              <View style={styles.langHandle} />
              <Text style={styles.langTitle}>Translate lyrics</Text>
              <ScrollView style={{ maxHeight: 380 }}>
                {(() => {
                  const originalSelected = !targetLang || targetLang === detectedLang;
                  const rows: { code: string | null; label: string; selected: boolean }[] = [
                    {
                      code: null,
                      label: detectedLang ? `Original · ${languageName(detectedLang)}` : "Original",
                      selected: originalSelected,
                    },
                    ...LANGUAGES.filter((l) => l.code !== detectedLang).map((l) => ({
                      code: l.code,
                      label: l.name,
                      selected: !originalSelected && targetLang === l.code,
                    })),
                  ];
                  return rows.map((r) => (
                    <TouchableOpacity
                      key={r.code ?? "original"}
                      style={styles.langRow}
                      activeOpacity={0.7}
                      onPress={() => { setTargetLang(r.code); setLangPickerOpen(false); }}
                    >
                      <Text style={[styles.langRowText, r.selected && styles.langRowTextSel]}>{r.label}</Text>
                      {r.selected && <Ionicons name="checkmark" size={18} color={accent[0]} />}
                    </TouchableOpacity>
                  ));
                })()}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </Modal>
  );
}

// Brand-blue accent used while the album-art color resolves (or when a track
// has no artwork). Matches the vibrant 3-stop shape of useArtAccent.
const FALLBACK_ACCENT: [string, string, string] = ["#1A5CFF", "#1247E6", "#0E37C2"];

// Only show the intro "…" indicator when the first line is at least this far in
// — short gaps aren't worth a placeholder.
const INTRO_MIN_GAP_MS = 1500;

// Blur radius applied to non-active (past/future) lyric lines so the current
// line stands out crisply. 0 = no blur; higher = blurrier. Tweak to taste.
const IDLE_BLUR_RADIUS = 4;

// Discovery banner copy.
const PLAYER_FIRST_TEXT = "Hey you're the first person to play this song on here, congratulations 😄";
const HOST_FIRST_TEXT = "First time viewer I see — no one's looked this song up yet, congratulations 😄";
const SAVED_TEXT = "Lyrics saved — next time you open this song we'll have it ready for you 😄";

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#000" },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 18, paddingBottom: 16, gap: 12,
  },
  chip: { flexDirection: "row", alignItems: "center", gap: 10, flexShrink: 1 },
  chipArt: { width: 42, height: 42, borderRadius: 9, backgroundColor: "#222" },
  chipArtFallback: { alignItems: "center", justifyContent: "center" },
  chipTitle: { fontSize: 15, fontWeight: "800", color: "#fff" },
  chipArtist: { fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 1 },
  menuBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center",
  },

  // Translation dropdown trigger + picker sheet.
  langPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    maxWidth: 130,
    paddingHorizontal: 11, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  langPillText: { fontSize: 13, fontWeight: "700", color: "#fff", flexShrink: 1 },
  langOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  langSheet: {
    backgroundColor: "#161618",
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 12, paddingTop: 10,
    borderTopWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  langHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.18)", alignSelf: "center", marginBottom: 14 },
  langTitle: { fontSize: 16, fontWeight: "800", color: "#fff", paddingHorizontal: 8, marginBottom: 8 },
  langRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 12, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(255,255,255,0.06)",
  },
  langRowText: { fontSize: 15, color: "rgba(255,255,255,0.7)", fontWeight: "600" },
  langRowTextSel: { color: "#fff", fontWeight: "800" },
  transErr: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(200,40,60,0.92)",
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11,
  },
  transErrText: { fontSize: 13, fontWeight: "700", color: "#fff" },

  panel: {
    flex: 1,
    marginHorizontal: 14,
    borderRadius: 34,
    overflow: "hidden",
    paddingHorizontal: 28,
  },

  // First-discovery banner (sits between the header and the panel).
  bannerWrap: { paddingHorizontal: 16, paddingBottom: 12 },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyText: {
    fontSize: 26, fontWeight: "800", color: "#fff", textAlign: "center", lineHeight: 34,
  },

  // Lyric lines — left-aligned, heavy, tight.
  lyricLine: {
    fontSize: 30, fontWeight: "800", letterSpacing: -0.6, lineHeight: 36,
    marginVertical: 11, textAlign: "left",
  },
  lyricActive: { color: "#fff" },
  lyricIdle: { color: "rgba(255,255,255,0.32)" },
  lyricPlain: { fontSize: 22, lineHeight: 30, color: "rgba(255,255,255,0.9)", marginVertical: 4 },

  // Intro "…" indicator — three dots that fill in as the lead-in plays out.
  introRow: { flexDirection: "row", alignItems: "center", gap: 11, height: 36, marginVertical: 11 },
  introDot: { width: 13, height: 13, borderRadius: 7, backgroundColor: "#fff" },

  controls: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 18,
  },
  ctrlGroup: { flexDirection: "row", alignItems: "center", gap: 12 },
  ctrlSquare: {
    width: 54, height: 54, borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center", justifyContent: "center",
  },

  // Non-owner action row.
  controlsAlt: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12,
    paddingHorizontal: 20, paddingTop: 18,
  },
  pillBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 18, paddingVertical: 14, borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.14)",
  },
  spotifyPill: { backgroundColor: "#1DB954", borderColor: "#1DB954" },
  pillText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});
