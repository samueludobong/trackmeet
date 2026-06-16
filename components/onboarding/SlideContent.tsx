import React from "react";
import { View, Text } from "react-native";
import { styles } from "../../assets/styles/app/onboarding";
import { BLOB_SHAPES, type Slide } from "../../constants/onboarding";

export function SlideContent({ slide }: { slide: Slide }) {
  return (
    <View style={styles.slideContent}>
      <View style={styles.blobArea}>
        {slide.blobs.map((b, i) => (
          <View
            key={i}
            style={[
              styles.blob,
              BLOB_SHAPES[b.shape],
              { backgroundColor: b.color, width: b.w, height: b.h, top: b.top, left: b.left },
            ]}
          />
        ))}
      </View>
      <View style={styles.textArea}>
        <Text style={styles.titleBold}>{slide.title}</Text>
        <Text style={[styles.titleScript, { color: slide.scriptColor }]}>{slide.script}</Text>
        <Text style={styles.subtitle}>{slide.subtitle}</Text>
      </View>
    </View>
  );
}
