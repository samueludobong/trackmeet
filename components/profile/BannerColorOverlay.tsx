import React, { useState } from "react";
import { useSheetAnimation } from "../../hooks/useSheetAnimation";
import { uploadImageToStorage } from "../../services/storage";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Modal, Pressable, ActivityIndicator, Alert } from "react-native";
import { CachedImage } from "../ui/CachedImage";
import * as ImagePicker from "expo-image-picker";
import { FontAwesome5 } from "@expo/vector-icons";
import { bcOverlayStyles, bsOverlayStyles } from "../../assets/styles/feed/localStyles";
import { PALETTE_ROWS, SHAPE_ROWS } from "../../constants/profile";
import { SWATCH_SIZE } from "../../constants/feedLayout";
import { isLightColor } from "../../lib/feed/helpers";
import { BannerShape } from "../../components/profile/BannerShape";
import { useSheetDragClose } from "../../hooks/useSheetDragClose";
import { DragGrabber } from "../common/DragGrabber";

export function BannerColorOverlay({ visible, onClose, selectedColor, bannerImageUrl, onSelectColor, onSelectImage, userId, selectedShape, selectedShapeColor, onSelectShape, onSelectShapeColor }: {
  visible: boolean;
  onClose: () => void;
  selectedColor: string | null;
  bannerImageUrl: string | null;
  onSelectColor: (color: string) => void;
  onSelectImage: (uri: string) => void;
  userId: string | null;
  selectedShape: string | null;
  selectedShapeColor: string | null;
  onSelectShape: (shape: string) => void;
  onSelectShapeColor: (color: string) => void;
}) {
  const { slideAnim, backdropAnim } = useSheetAnimation(visible);
  const [imageUploading, setImageUploading] = useState(false);
  const { panHandlers: dragHandlers, stretch } = useSheetDragClose({ slideAnim, onClose, closedValue: 500 });
  const dragBackdrop = slideAnim.interpolate({ inputRange: [0, 500], outputRange: [1, 0], extrapolate: "clamp" });


  const pickBannerImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert("Permission needed", "Allow photo access to set a banner image."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"] as any,
      allowsEditing: true,
      aspect: [16, 9] as [number, number],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0] || !userId) return;
    setImageUploading(true);
    try {
      const url = await uploadImageToStorage(
        "banners",
        `${userId}/banner`,
        result.assets[0].uri,
        result.assets[0].mimeType ?? "image/jpeg",
      );
      onSelectImage(url);
      onClose();
    } catch (e: any) {
      Alert.alert("Upload failed", e.message ?? "Could not upload image.");
    } finally {
      setImageUploading(false);
    }
  };

  // Rendered inside the edit sheet's Animated.View — no nested Modal needed
  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { zIndex: 50, opacity: Animated.multiply(backdropAnim, dragBackdrop) }]}
      pointerEvents={visible ? "auto" : "none"}
    >
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.55)" }]} onPress={onClose} />
      <Animated.View style={[bcOverlayStyles.sheet, { transform: [{ translateY: slideAnim }, { scaleY: stretch }] }]}>
        <DragGrabber panHandlers={dragHandlers} />
        <View style={bcOverlayStyles.header}>
          <Text style={bcOverlayStyles.title}>Banner</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Text style={bcOverlayStyles.closeBtn}>✕</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={bcOverlayStyles.content} showsVerticalScrollIndicator={false}>
          {/* Add Image */}
          <TouchableOpacity
            style={bcOverlayStyles.imageBox}
            onPress={pickBannerImage}
            activeOpacity={0.75}
            disabled={imageUploading}
          >
            {imageUploading ? (
              <ActivityIndicator color="#FF6C1A" />
            ) : bannerImageUrl ? (
              <>
                <CachedImage source={{ uri: bannerImageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                <View style={bcOverlayStyles.imageOverlay}>
                  <FontAwesome5 name="camera" size={18} color="#fff" />
                  <Text style={bcOverlayStyles.imageBoxText}>Change Image</Text>
                </View>
              </>
            ) : (
              <>
                <FontAwesome5 name="image" size={24} color="rgba(255,255,255,0.28)" />
                <Text style={bcOverlayStyles.imageBoxText}>Add Banner Image</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={bcOverlayStyles.dividerRow}>
            <View style={bcOverlayStyles.dividerLine} />
            <Text style={bcOverlayStyles.dividerText}>or choose a color</Text>
            <View style={bcOverlayStyles.dividerLine} />
          </View>

          {/* Color grid */}
          {PALETTE_ROWS.map((row, rowIdx) => (
            <View key={rowIdx} style={bcOverlayStyles.colorRow}>
              {row.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    bcOverlayStyles.colorSwatch,
                    { backgroundColor: color, width: SWATCH_SIZE, height: SWATCH_SIZE },
                    selectedColor === color && !bannerImageUrl && bcOverlayStyles.colorSwatchSelected,
                  ]}
                  onPress={() => { onSelectColor(color); onClose(); }}
                  activeOpacity={0.8}
                >
                  {selectedColor === color && !bannerImageUrl && (
                    <FontAwesome5 name="check" size={14} color={isLightColor(color) ? "#000" : "#fff"} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ))}

          {/* Shape section */}
          <View style={[bcOverlayStyles.dividerRow, { marginTop: 8 }]}>
            <View style={bcOverlayStyles.dividerLine} />
            <Text style={bcOverlayStyles.dividerText}>shape</Text>
            <View style={bcOverlayStyles.dividerLine} />
          </View>
          <View style={{ opacity: bannerImageUrl ? 0.3 : 1 }} pointerEvents={bannerImageUrl ? "none" : "auto"}>
            {bannerImageUrl ? (
              <Text style={bsOverlayStyles.disabledHint}>Remove the image to use a shape</Text>
            ) : null}
            {SHAPE_ROWS.map((row, rowIdx) => (
              <View key={rowIdx} style={bcOverlayStyles.colorRow}>
                {row.map(({ key, label }) => {
                  const isNone = key === "none";
                  const isSelected = isNone ? !selectedShape : selectedShape === key;
                  const previewColor = isSelected ? (selectedShapeColor ?? "#fff") : "rgba(255,255,255,0.55)";
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[bsOverlayStyles.shapeCell, { width: SWATCH_SIZE }, isSelected && bsOverlayStyles.shapeCellSelected]}
                      onPress={() => onSelectShape(key)}
                      activeOpacity={0.75}
                    >
                      <View style={bsOverlayStyles.shapeIconWrap}>
                        {isNone ? (
                          <FontAwesome5 name="ban" size={22} color={isSelected ? "#FF6C1A" : "rgba(255,255,255,0.4)"} />
                        ) : (
                          <BannerShape shape={key} color={previewColor} size={30} />
                        )}
                      </View>
                      <Text style={[bsOverlayStyles.shapeLabel, isSelected && bsOverlayStyles.shapeLabelSelected]}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}

            <View style={[bcOverlayStyles.dividerRow, { marginTop: 8 }]}>
              <View style={bcOverlayStyles.dividerLine} />
              <Text style={bcOverlayStyles.dividerText}>shape color</Text>
              <View style={bcOverlayStyles.dividerLine} />
            </View>
            {PALETTE_ROWS.map((row, rowIdx) => (
              <View key={rowIdx} style={bcOverlayStyles.colorRow}>
                {row.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      bcOverlayStyles.colorSwatch,
                      { backgroundColor: color, width: SWATCH_SIZE, height: SWATCH_SIZE },
                      selectedShapeColor === color && bcOverlayStyles.colorSwatchSelected,
                    ]}
                    onPress={() => onSelectShapeColor(color)}
                    activeOpacity={0.8}
                  >
                    {selectedShapeColor === color && (
                      <FontAwesome5 name="check" size={14} color={isLightColor(color) ? "#000" : "#fff"} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </Animated.View>
    </Animated.View>
  );
}
