import React, { useRef, useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, Modal } from "react-native";
import { CachedImage } from "../ui/CachedImage";
import { useVideoPlayer, VideoView } from "expo-video";
import { Ionicons } from "@expo/vector-icons";
import { lbStyles } from "../../assets/styles/feed/localStyles";
import { SW } from "../../lib/feed/dimensions";
import { type Post } from "../../app/data/mock";

export function MediaLightbox({
  urls,
  startIndex,
  onClose,
}: {
  urls: string[];
  startIndex: number;
  onClose: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (startIndex > 0) {
      const t = setTimeout(() => {
        scrollRef.current?.scrollTo({ x: startIndex * SW, animated: false });
      }, 30);
      return () => clearTimeout(t);
    }
  }, []);

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={lbStyles.backdrop}>
        {/* Counter + close */}
        <View style={lbStyles.header}>
          <Text style={lbStyles.counter}>
            {urls.length > 1 ? `${currentIndex + 1} / ${urls.length}` : " "}
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={12} style={lbStyles.closeBtn}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Horizontally paged images */}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) =>
            setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / SW))
          }
          style={{ flex: 1 }}
        >
          {urls.map((url, i) => (
            <View key={i} style={lbStyles.page}>
              <CachedImage
                source={{ uri: url }}
                style={lbStyles.fullImage}
                resizeMode="contain"
              />
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Fullscreen video lightbox ─────────────────────────────────────────────────

export function VideoLightbox({ uri, onClose }: { uri: string; onClose: () => void }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.play();
  });

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={lbStyles.backdrop}>
        <View style={lbStyles.header}>
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={onClose} hitSlop={12} style={lbStyles.closeBtn}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, justifyContent: "center" }}>
          <VideoView
            player={player}
            style={lbStyles.videoFull}
            nativeControls
            contentFit="contain"
          />
        </View>
      </View>
    </Modal>
  );
}

// ─── Post header ──────────────────────────────────────────────────────────────
