import React, { useRef, useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Modal, Pressable, Switch } from "react-native";
import { styles } from "../../assets/styles/feed/styles";
import { BOTTOM_INSET } from "../../lib/feed/dimensions";
import { FAKE_PHOTO_COLORS, type Post } from "../../app/data/mock";

export function ComposerActionMenu({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [locationOn, setLocationOn] = useState(false);
  const [commentsOn, setCommentsOn] = useState(true);
  const slideAnim = useRef(new Animated.Value(500)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const open = () => {
    slideAnim.setValue(500);
    backdropAnim.setValue(0);
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 24, stiffness: 220 }),
      Animated.timing(backdropAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const close = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 500, duration: 200, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  useEffect(() => {
    if (visible) open();
  }, [visible]);

  const LIST_ROWS = [
    { icon: "↑", label: "Add files", right: null },
    { icon: "🎵", label: "Add track", right: "Search" },
    { icon: "🎧", label: "From playlist", right: "My Library" },
    { icon: "🔒", label: "Privacy", right: "Public" },
  ];

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={close}>
      <Animated.View style={[styles.menuBackdrop, { opacity: backdropAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
      </Animated.View>

      <Animated.View style={[styles.menuSheet, { transform: [{ translateY: slideAnim }] }]}>
        {/* Handle */}
        <View style={styles.menuHandle} />

        {/* Header row: X | Title | All photos */}
        <View style={styles.menuHeader}>
          <TouchableOpacity style={styles.menuXBtn} onPress={close} activeOpacity={0.8}>
            <Text style={styles.menuXBtnIcon}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.menuHeaderTitle}>Add to post</Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.menuHeaderRight}>All photos</Text>
          </TouchableOpacity>
        </View>

        {/* Photo strip: camera box + fake thumbnails */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.menuPhotoStrip}
          style={{ marginBottom: 4 }}
        >
          <TouchableOpacity style={styles.menuCameraBox} activeOpacity={0.8} onPress={close}>
            <Text style={styles.menuCameraIcon}>📷</Text>
            <Text style={styles.menuCameraLabel}>Camera</Text>
          </TouchableOpacity>
          {FAKE_PHOTO_COLORS.map((color, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.menuPhotoThumb, { backgroundColor: color }]}
              activeOpacity={0.8}
              onPress={close}
            />
          ))}
        </ScrollView>

        {/* Divider */}
        <View style={styles.menuSectionDivider} />

        {/* List rows */}
        <View style={styles.menuSection}>
          {LIST_ROWS.map((row, i) => (
            <TouchableOpacity
              key={row.label}
              style={[styles.menuRow, i < LIST_ROWS.length - 1 && styles.menuRowBorder]}
              activeOpacity={0.65}
              onPress={close}
            >
              <View style={styles.menuRowIconBox}>
                <Text style={styles.menuRowIconText}>{row.icon}</Text>
              </View>
              <Text style={styles.menuRowLabel}>{row.label}</Text>
              {row.right && (
                <View style={styles.menuRowRight}>
                  <Text style={styles.menuRowRightText}>{row.right}</Text>
                  <Text style={styles.menuRowChevron}>›</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Divider */}
        <View style={styles.menuSectionDivider} />

        {/* Toggle rows */}
        <View style={styles.menuSection}>
          {[
            { icon: "📍", label: "Location", value: locationOn, set: setLocationOn },
            { icon: "💬", label: "Allow comments", value: commentsOn, set: setCommentsOn },
          ].map((row, i, arr) => (
            <View
              key={row.label}
              style={[styles.menuRow, i < arr.length - 1 && styles.menuRowBorder]}
            >
              <View style={styles.menuRowIconBox}>
                <Text style={styles.menuRowIconText}>{row.icon}</Text>
              </View>
              <Text style={styles.menuRowLabel}>{row.label}</Text>
              <Switch
                value={row.value}
                onValueChange={row.set}
                trackColor={{ false: "rgba(255,255,255,0.15)", true: "#AB00FF" }}
                thumbColor="#ffffff"
                style={styles.menuToggle}
              />
            </View>
          ))}
        </View>

        {/* Divider */}
        <View style={styles.menuSectionDivider} />

        {/* Settings row */}
        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuRow} activeOpacity={0.65} onPress={close}>
            <View style={styles.menuRowIconBox}>
              <Text style={styles.menuRowIconText}>⚙️</Text>
            </View>
            <Text style={styles.menuRowLabel}>Post settings</Text>
            <Text style={[styles.menuRowChevron, { marginLeft: "auto" }]}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: BOTTOM_INSET + 8 }} />
      </Animated.View>
    </Modal>
  );
}

// ─── Trending carousel ────────────────────────────────────────────────────────
