import React from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { CachedImage } from "../ui/CachedImage";
import { Ionicons } from "@expo/vector-icons";
import { MUSIC_GENRES } from "../../services/communities";

export const COLOR_CHOICES = ["#AB00FF", "#FF3CAC", "#FF6C1A", "#1DB954", "#1B6CF5", "#FFD23F"];

/** Slug input with live availability indicator (✓/✗). */
export function SlugField({
  slug, onChange, status,
}: {
  slug: string;
  onChange: (next: string) => void;
  status: "idle" | "checking" | "available" | "taken" | "invalid";
}) {
  return (
    <View>
      <View style={styles.slugRow}>
        <Text style={styles.slugPrefix}>/</Text>
        <TextInput
          style={styles.slugInput}
          value={slug}
          onChangeText={onChange}
          placeholder="community-slug"
          placeholderTextColor="rgba(255,255,255,0.25)"
          autoCorrect={false}
          autoCapitalize="none"
          maxLength={32}
        />
        {status === "available" && <Ionicons name="checkmark-circle" size={18} color="#1DB954" />}
        {status === "taken" && <Ionicons name="close-circle" size={18} color="#FF4757" />}
        {status === "invalid" && <Ionicons name="alert-circle" size={18} color="#FF6C1A" />}
      </View>
      {status === "taken" && <Text style={styles.errText}>That handle is taken.</Text>}
      {status === "invalid" && <Text style={styles.errText}>Use letters, numbers, and hyphens.</Text>}
    </View>
  );
}

/** Multi-select genre chips, max 5. */
export function GenreSelector({
  selected, onChange,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (g: string) => {
    if (selected.includes(g)) onChange(selected.filter((x) => x !== g));
    else if (selected.length < 5) onChange([...selected, g]);
  };
  return (
    <View>
      <View style={styles.genreWrap}>
        {MUSIC_GENRES.map((g) => {
          const active = selected.includes(g);
          return (
            <TouchableOpacity
              key={g}
              style={[styles.genreChip, active && styles.genreChipActive]}
              activeOpacity={0.85}
              onPress={() => toggle(g)}
            >
              <Text style={[styles.genreChipText, active && styles.genreChipTextActive]}>{g}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={styles.helper}>{selected.length}/5 selected</Text>
    </View>
  );
}

/** Banner picker — image upload OR preset color swatch. */
export function BannerPicker({
  bannerUri, bannerColor, onPickImage, onColor, uploading,
}: {
  bannerUri: string | null;
  bannerColor: string | null;
  onPickImage: () => void;
  onColor: (c: string) => void;
  uploading: boolean;
}) {
  return (
    <View>
      <TouchableOpacity style={styles.bannerWrap} onPress={onPickImage} activeOpacity={0.85}>
        {bannerUri ? (
          <CachedImage source={{ uri: bannerUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: bannerColor ?? COLOR_CHOICES[0] }]} />
        )}
        <View style={styles.bannerHint}>
          <Ionicons name="image-outline" size={14} color="#fff" />
          <Text style={styles.bannerHintText}>{bannerUri ? "Change banner" : "Upload banner"}</Text>
        </View>
        {uploading && <View style={[StyleSheet.absoluteFill, styles.uploadOverlay]} />}
      </TouchableOpacity>
      <View style={styles.colorRow}>
        {COLOR_CHOICES.map((c) => (
          <TouchableOpacity
            key={c}
            onPress={() => onColor(c)}
            style={[styles.swatch, { backgroundColor: c }, bannerColor === c && !bannerUri && styles.swatchActive]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  slugRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 14, paddingHorizontal: 12,
  },
  slugPrefix: { color: "rgba(255,255,255,0.45)", fontWeight: "800", fontSize: 15 },
  slugInput: { flex: 1, paddingVertical: 12, color: "#fff", fontSize: 14, fontWeight: "600" },
  errText: { fontSize: 12, color: "#FF4757", marginTop: 4, fontWeight: "600" },

  genreWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  genreChip: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  genreChipActive: { backgroundColor: "rgba(171,0,255,0.18)", borderColor: "rgba(171,0,255,0.5)" },
  genreChipText: { fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.7)" },
  genreChipTextActive: { color: "#fff" },
  helper: { fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 6, fontWeight: "600" },

  bannerWrap: {
    width: "100%", height: 110, borderRadius: 14, overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.05)", marginBottom: 8,
  },
  bannerHint: {
    position: "absolute", left: 10, bottom: 10,
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5,
  },
  bannerHintText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  uploadOverlay: { backgroundColor: "rgba(0,0,0,0.5)" },
  colorRow: { flexDirection: "row", gap: 8 },
  swatch: {
    width: 30, height: 30, borderRadius: 15,
    borderWidth: 2, borderColor: "transparent",
  },
  swatchActive: { borderColor: "#fff" },
});
