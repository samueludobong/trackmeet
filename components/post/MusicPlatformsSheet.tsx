import React, { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { CachedImage } from "../ui/CachedImage";
import { DragGrabber } from "../common/DragGrabber";
import { useSheetDragClose } from "../../hooks/useSheetDragClose";
import { linksSheetStyles as s } from "../../assets/styles/feed/localStyles";
import { type PlatformLink } from "../../lib/musicLink";

// Display name + brand glyph + accent per Odesli platform key. `icon` is a
// FontAwesome5 brand name; platforms without one fall back to a generic note.
const PLATFORM_META: Record<string, { name: string; icon?: string; color: string }> = {
  spotify:      { name: "Spotify",       icon: "spotify",    color: "#1DB954" },
  appleMusic:   { name: "Apple Music",   icon: "apple",      color: "#FC3C44" },
  itunes:       { name: "iTunes",        icon: "apple",      color: "#FC3C44" },
  youtube:      { name: "YouTube",       icon: "youtube",    color: "#FF0000" },
  youtubeMusic: { name: "YouTube Music", icon: "youtube",    color: "#FF0000" },
  soundcloud:   { name: "SoundCloud",    icon: "soundcloud", color: "#FF5500" },
  tidal:        { name: "Tidal",                             color: "#27c1c9" },
  deezer:       { name: "Deezer",        icon: "deezer",     color: "#A238FF" },
  amazonMusic:  { name: "Amazon Music",  icon: "amazon",     color: "#25D1DA" },
  pandora:      { name: "Pandora",                           color: "#3668FF" },
  napster:      { name: "Napster",       icon: "napster",    color: "#ffffff" },
  anghami:      { name: "Anghami",                           color: "#A45CFF" },
  boomplay:     { name: "Boomplay",                          color: "#E94F1D" },
  audius:       { name: "Audius",                            color: "#CC0FE0" },
  yandex:       { name: "Yandex Music",                      color: "#FFCC00" },
};

const humanize = (key: string) =>
  key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());

function PlatformRow({ platform, url, onOpen }: { platform: string; url: string; onOpen: (u: string) => void }) {
  const meta = PLATFORM_META[platform] ?? { name: humanize(platform), color: "#FF6C1A" };
  return (
    <TouchableOpacity style={s.row} activeOpacity={0.72} onPress={() => onOpen(url)}>
      <View style={[s.spotifyWrap, { backgroundColor: meta.color + "1F" }]}>
        {meta.icon ? (
          <FontAwesome5 name={meta.icon as any} size={18} color={meta.color} />
        ) : (
          <Ionicons name="musical-notes" size={18} color={meta.color} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.domain} numberOfLines={1}>{meta.name}</Text>
      </View>
      <FontAwesome5 name="external-link-alt" size={12} color="rgba(255,255,255,0.25)" />
    </TouchableOpacity>
  );
}

/**
 * "Listen on" sheet for a pasted-link music post. Splits the platform the song
 * was originally shared from out from the rest, so the viewer can either follow
 * the source or jump to their own streaming service.
 */
export function MusicPlatformsSheet({
  visible,
  onClose,
  song,
  originalProvider,
  originalUrl,
  links,
  onPlay,
  showOriginal = true,
}: {
  visible: boolean;
  onClose: () => void;
  song: { name: string; artist: string; albumArt: string | null };
  originalProvider: string | null;
  originalUrl: string | null;
  links: PlatformLink[];
  /** When provided, a "Play song" action is shown at the top (player contexts). */
  onPlay?: () => void;
  /** Whether to show the "Original streaming platform" section. Player contexts
   *  (e.g. a playlist) set this false — there's no "original", just play + links. */
  showOriginal?: boolean;
}) {
  // Keep the Modal mounted across the close animation so the slide-out plays.
  const [rendered, setRendered] = useState(visible);
  const slideAnim    = useRef(new Animated.Value(400)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setRendered(true);
      slideAnim.setValue(400);
      backdropAnim.setValue(0);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 26, stiffness: 220 }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else if (rendered) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 400, duration: 220, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start(({ finished }) => { if (finished) setRendered(false); });
    }
  }, [visible, rendered, slideAnim, backdropAnim]);

  const { panHandlers: dragHandlers, stretch } = useSheetDragClose({ slideAnim, onClose, closedValue: 400 });
  const dragBackdrop = slideAnim.interpolate({ inputRange: [0, 400], outputRange: [1, 0], extrapolate: "clamp" });

  const openUrl = (url: string) => {
    Linking.openURL(url).catch(() => WebBrowser.openBrowserAsync(url).catch(() => {}));
    onClose();
  };

  const handlePlay = () => { onPlay?.(); onClose(); };

  // Everything that isn't the original source link is an alternative. When the
  // original section is hidden (player contexts) every link is just an option.
  const alternatives = showOriginal ? links.filter((l) => l.url !== originalUrl) : links;

  return (
    <Modal transparent visible={rendered} animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.55)", opacity: Animated.multiply(backdropAnim, dragBackdrop) }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }, { scaleY: stretch }] }]}>
        <DragGrabber panHandlers={dragHandlers} />

        {/* Song header */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingTop: 6, paddingBottom: 14 }}>
          {song.albumArt ? (
            <CachedImage source={{ uri: song.albumArt }} style={{ width: 48, height: 48, borderRadius: 8 }} />
          ) : (
            <View style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" }}>
              <FontAwesome5 name="music" size={18} color="rgba(255,255,255,0.4)" />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }} numberOfLines={1}>{song.name}</Text>
            <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 2 }} numberOfLines={1}>{song.artist}</Text>
          </View>
        </View>

        {/* The full platform list can be long (Odesli returns 15+), so cap the
            scrollable area to ~half the screen and let it scroll. */}
        <ScrollView
          style={{ maxHeight: Dimensions.get("window").height * 0.5 }}
          contentContainerStyle={{ paddingBottom: 4 }}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {onPlay && (
            <>
              <Text style={s.heading}>Play</Text>
              <TouchableOpacity style={s.row} activeOpacity={0.72} onPress={handlePlay}>
                <View style={[s.spotifyWrap, { backgroundColor: "rgba(29,185,84,0.18)" }]}>
                  <Ionicons name="play" size={18} color="#1DB954" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.domain} numberOfLines={1}>Play song</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.25)" />
              </TouchableOpacity>
            </>
          )}

          {showOriginal && originalProvider && originalUrl && (
            <>
              <Text style={s.heading}>Original streaming platform</Text>
              <PlatformRow platform={originalProvider} url={originalUrl} onOpen={openUrl} />
            </>
          )}

          {alternatives.length > 0 && (
            <>
              <Text style={s.heading}>{showOriginal ? "Available alternatives" : "Listen on"}</Text>
              {alternatives.map((l) => (
                <PlatformRow key={l.platform} platform={l.platform} url={l.url} onOpen={openUrl} />
              ))}
            </>
          )}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}
