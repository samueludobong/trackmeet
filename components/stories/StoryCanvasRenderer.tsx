import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  MusicStoryCard,
  fontStyleFor,
  type MusicStoryCardSong,
  type MusicStoryCardAuthor,
} from "./MusicStoryCard";
import type { StoryCanvas } from "../../services/stories";
import { SW, SH } from "../../lib/feed/dimensions";
import { t } from "../../assets/styles/stories/StoryCanvasRenderer";

// Base (scale = 1) size of the song card on the canvas. Matches the legacy
// composer preview size so old and new stories feel consistent.
export const CARD_BASE = Math.min(SW - 80, 320);

// Base font size of a canvas text element at scale = 1.
export const TEXT_BASE_FONT = 28;

export function isDarkHex(hex: string): boolean {
  const m = /^#?([0-9a-f]{6})/i.exec(hex.trim());
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b < 140;
}

/**
 * A single text element as it appears on the story canvas — shared between the
 * interactive editor and the read-only viewer so WYSIWYG holds.
 */
export function CanvasTextView({
  text, font, color, bg,
}: { text: string; font: string; color: string; bg: boolean }) {
  const onPill = bg ? (isDarkHex(color) ? "#fff" : "#0D0D0D") : color;
  return (
    <View
      style={[
        t.wrap,
        bg && { backgroundColor: color, paddingHorizontal: 14, paddingVertical: 8 },
      ]}
    >
      <Text style={[t.text, fontStyleFor(font), { color: onPill }, !bg && t.shadow]}>
        {text}
      </Text>
    </View>
  );
}

type RendererProps = {
  canvas: StoryCanvas;
  design: number;
  song: MusicStoryCardSong;
  author: MusicStoryCardAuthor;
  showActions?: boolean;
  liked?: boolean;
  onAddToPlaylist?: () => void;
  onShare?: () => void;
  onLike?: () => void;
};

/**
 * Replays a saved free-form story canvas: gradient background plus the song
 * card and text elements at their stored translate/rotate/scale transforms.
 * Fills its parent (mount inside a full-screen container so the normalised
 * coordinates land where the author put them).
 */
export function StoryCanvasRenderer({
  canvas, design, song, author, showActions = false, liked = false,
  onAddToPlaylist, onShare, onLike,
}: RendererProps) {
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      <LinearGradient
        colors={(canvas.bg?.colors?.length >= 2 ? canvas.bg.colors : ["#15151A", "#0D0D0D"]) as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
      {canvas.elements.map((el, i) => {
        const transform = [
          { translateX: el.x * SW },
          { translateY: el.y * SH },
          { rotateZ: `${el.rotation}rad` },
          { scale: el.scale },
        ];
        return (
          <View
            key={i}
            style={t.elementLayer}
            pointerEvents={el.type === "card" ? "box-none" : "none"}
          >
            <View style={{ transform }} pointerEvents="box-none">
              {el.type === "card" ? (
                <MusicStoryCard
                  design={design}
                  song={song}
                  author={author}
                  size={CARD_BASE}
                  showActions={showActions}
                  liked={liked}
                  onAddToPlaylist={onAddToPlaylist}
                  onShare={onShare}
                  onLike={onLike}
                />
              ) : (
                <CanvasTextView text={el.text} font={el.font} color={el.color} bg={el.bg} />
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}
