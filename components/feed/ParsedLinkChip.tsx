import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { CachedImage } from "../ui/CachedImage";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { styles } from "../../assets/styles/feed/styles";
import { PROVIDER_DISPLAY, type ParsedMusicLink } from "../../lib/musicLink";

/**
 * The composer chip shown while a pasted streaming link is being resolved, and
 * once it resolves into a song. Shared across the feed, comment and chat
 * composers so the "paste a link → song card" affordance looks identical
 * everywhere. Renders nothing when there's neither a parse in flight nor an
 * attachment.
 */
export function ParsedLinkChip({
  parsingLink,
  attachedLink,
  onRemove,
}: {
  parsingLink: boolean;
  attachedLink: ParsedMusicLink | null;
  onRemove: () => void;
}) {
  if (!parsingLink && !attachedLink) return null;
  const meta = attachedLink ? PROVIDER_DISPLAY[attachedLink.provider] : undefined;

  if (parsingLink) {
    return (
      <View style={styles.attachedTrackChip}>
        <View style={[styles.attachedTrackArt, { backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" }]}>
          <ActivityIndicator size="small" color="#AB00FF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.attachedTrackName} numberOfLines={1}>Parsing link…</Text>
          <Text style={styles.attachedTrackArtist} numberOfLines={1}>Fetching song details</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.attachedTrackChip, { borderColor: (meta?.color ?? "#AB00FF") + "44" }]}>
      {attachedLink!.albumArt ? (
        <CachedImage source={{ uri: attachedLink!.albumArt }} style={styles.attachedTrackArt} />
      ) : (
        <View style={[styles.attachedTrackArt, { backgroundColor: (meta?.color ?? "#AB00FF") + "22", alignItems: "center", justifyContent: "center" }]}>
          <FontAwesome5 name={(meta?.icon ?? "music") as any} size={14} color={meta?.color ?? "#AB00FF"} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.attachedTrackName} numberOfLines={1}>{attachedLink!.name}</Text>
        <Text style={styles.attachedTrackArtist} numberOfLines={1}>{attachedLink!.artist}</Text>
      </View>
      <View style={{ width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: (meta?.color ?? "#AB00FF") + "22" }}>
        <FontAwesome5 name={(meta?.icon ?? "music") as any} size={12} color={meta?.color ?? "#AB00FF"} />
      </View>
      <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.35)" />
      </TouchableOpacity>
    </View>
  );
}
