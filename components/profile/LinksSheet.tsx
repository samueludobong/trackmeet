import React, { useRef, useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Modal, Pressable, ActivityIndicator, Linking } from "react-native";
import { CachedImage } from "../ui/CachedImage";
import { FontAwesome5 } from "@expo/vector-icons";
import { linksSheetStyles } from "../../assets/styles/feed/localStyles";
import { parseSpotifyUrl, fetchSpotifyLinkInfo, type SpotifyLinkInfo } from "../../lib/feed/helpers";
import { useSheetDragClose } from "../../hooks/useSheetDragClose";
import { DragGrabber } from "../common/DragGrabber";

export function LinksSheet({
  links,
  onClose,
  accessToken,
}: {
  links: string[];
  onClose: () => void;
  accessToken: string | null;
}) {
  const slideAnim    = useRef(new Animated.Value(400)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  // Per-link Spotify metadata + loading flags
  const [infos,   setInfos]   = useState<(SpotifyLinkInfo | null)[]>(links.map(() => null));
  const [loading, setLoading] = useState<boolean[]>(
    links.map((url) => !!parseSpotifyUrl(url) && !!accessToken)
  );

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim,    { toValue: 0, useNativeDriver: true, damping: 26, stiffness: 220 }),
      Animated.timing(backdropAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    // Kick off Spotify fetches for any spotify URLs
    if (!accessToken) return;
    links.forEach((url, i) => {
      const parsed = parseSpotifyUrl(url);
      if (!parsed) return;
      fetchSpotifyLinkInfo(accessToken, parsed.type, parsed.id).then((info) => {
        setInfos((prev)   => { const n = [...prev];    n[i] = info;  return n; });
        setLoading((prev) => { const n = [...prev];    n[i] = false; return n; });
      });
    });
  }, []);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim,    { toValue: 400, duration: 220, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 0,   duration: 180, useNativeDriver: true }),
    ]).start(onClose);
  };

  const openLink = (url: string) => { Linking.openURL(url).catch(() => {}); dismiss(); };

  const { panHandlers: dragHandlers, stretch } = useSheetDragClose({ slideAnim, onClose, closedValue: 400 });
  const dragBackdrop = slideAnim.interpolate({ inputRange: [0, 400], outputRange: [1, 0], extrapolate: "clamp" });

  return (
    <Modal transparent visible animationType="none" onRequestClose={dismiss} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.55)", opacity: Animated.multiply(backdropAnim, dragBackdrop) }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />
      </Animated.View>
      <Animated.View style={[linksSheetStyles.sheet, { transform: [{ translateY: slideAnim }, { scaleY: stretch }] }]}>
        <DragGrabber panHandlers={dragHandlers} />
        <Text style={linksSheetStyles.heading}>Links</Text>

        {links.map((url, i) => {
          const meta      = infos[i];
          const isLoading = loading[i];
          const isSpotify = !!parseSpotifyUrl(url);
          const clean     = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
          const domain    = clean.split("/")[0];
          const rest      = clean.slice(domain.length);

          const thumb = isSpotify
            ? isLoading
              ? <View style={linksSheetStyles.spotifyWrap}><ActivityIndicator size="small" color="#1DB954" /></View>
              : meta?.imageUrl
                ? <CachedImage source={{ uri: meta.imageUrl }} style={meta.resourceType === "artist" ? linksSheetStyles.artCircle : linksSheetStyles.art} />
                : <View style={linksSheetStyles.spotifyWrap}><FontAwesome5 name="spotify" size={20} color="#1DB954" /></View>
            : <View style={linksSheetStyles.iconWrap}><FontAwesome5 name="link" size={14} color="#FF6C1A" /></View>;

          const primaryText   = meta?.name ?? domain;
          const secondaryText = meta?.subtitle ?? (rest.length > 1 ? rest : null);

          return (
            <TouchableOpacity key={i} style={linksSheetStyles.row} activeOpacity={0.72} onPress={() => openLink(url)}>
              {thumb}
              <View style={{ flex: 1 }}>
                <Text style={linksSheetStyles.domain} numberOfLines={1}>{primaryText}</Text>
                {secondaryText ? <Text style={linksSheetStyles.path} numberOfLines={1}>{secondaryText}</Text> : null}
              </View>
              <FontAwesome5 name="external-link-alt" size={12} color="rgba(255,255,255,0.25)" />
            </TouchableOpacity>
          );
        })}
      </Animated.View>
    </Modal>
  );
}

// ─── Start Meet Overlay ──────────────────────────────────────────────────────
