import React, { useRef, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Modal, Pressable, Linking } from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { linksSheetStyles } from "../../assets/styles/feed/localStyles";
import { SOCIAL_PLATFORMS, BANNER_PLATFORM_PRIORITY } from "../../lib/feed/social";
import { useSheetDragClose } from "../../hooks/useSheetDragClose";
import { DragGrabber } from "../common/DragGrabber";

export function SocialLinksSheet({
  socialLinks,
  onClose,
}: {
  socialLinks: Record<string, string>;
  onClose: () => void;
}) {
  const slideAnim    = useRef(new Animated.Value(400)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim,    { toValue: 0, useNativeDriver: true, damping: 26, stiffness: 220 }),
      Animated.timing(backdropAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim,    { toValue: 400, duration: 220, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 0,   duration: 180, useNativeDriver: true }),
    ]).start(onClose);
  };

  const linked = BANNER_PLATFORM_PRIORITY
    .map((k) => SOCIAL_PLATFORMS.find((p) => p.key === k)!)
    .filter((p) => !!socialLinks[p.key]);

  const { panHandlers: dragHandlers, stretch } = useSheetDragClose({ slideAnim, onClose, closedValue: 400 });
  const dragBackdrop = slideAnim.interpolate({ inputRange: [0, 400], outputRange: [1, 0], extrapolate: "clamp" });

  return (
    <Modal transparent visible animationType="none" onRequestClose={dismiss} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.55)", opacity: Animated.multiply(backdropAnim, dragBackdrop) }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />
      </Animated.View>
      <Animated.View style={[linksSheetStyles.sheet, { transform: [{ translateY: slideAnim }, { scaleY: stretch }] }]}>
        <DragGrabber panHandlers={dragHandlers} />
        <Text style={linksSheetStyles.heading}>Social Accounts</Text>
        {linked.map((p) => (
          <TouchableOpacity
            key={p.key}
            style={linksSheetStyles.row}
            activeOpacity={0.72}
            onPress={() => { Linking.openURL(socialLinks[p.key]).catch(() => {}); dismiss(); }}
          >
            <View style={[linksSheetStyles.iconWrap, { backgroundColor: p.color + "22" }]}>
              <FontAwesome5 name={p.icon} size={18} color={p.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={linksSheetStyles.domain}>{p.label}</Text>
              <Text style={linksSheetStyles.path} numberOfLines={1}>
                {socialLinks[p.key].replace(/^https?:\/\//, "")}
              </Text>
            </View>
            <FontAwesome5 name="external-link-alt" size={12} color="rgba(255,255,255,0.25)" />
          </TouchableOpacity>
        ))}
      </Animated.View>
    </Modal>
  );
}

// ─── Links sheet (mini overlay listing all profile links) ─────────────────────
