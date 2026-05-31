import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ds } from "../../lib/feed/localStyles";
import { AVATAR_MAP } from "../../app/data/mock";

/** Horizontal "For You" recommendations row (song + video cards). */
export function ForYouRow({
  recs,
  likedRecs,
  onToggleLike,
}: {
  recs: any[];
  likedRecs: Set<string>;
  onToggleLike: (id: string) => void;
}) {
  return (
    <>
      <View style={ds.sectionHeader}>
        <Text style={ds.sectionTitle}>For You</Text>
        <Text style={ds.sectionSub}>Based on who you follow</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ds.recsRow} style={{ marginBottom: 32 }}>
        {recs.map((rec) => {
          const photo = AVATAR_MAP[rec.user];
          const liked = likedRecs.has(rec.id);
          const accentColor = rec.color === "#CAFF00" ? "#A8D400" : rec.color;
          const likeBtn = (
            <TouchableOpacity onPress={() => onToggleLike(rec.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name={liked ? "heart" : "heart-outline"} size={15} color={liked ? "#FF3CAC" : "rgba(255,255,255,0.3)"} />
            </TouchableOpacity>
          );

          if (rec.type === "song") {
            return (
              <TouchableOpacity key={rec.id} style={[ds.recCard, { borderColor: rec.color + "30" }]} activeOpacity={0.85}>
                <View style={ds.songThumb}>
                  <LinearGradient colors={[rec.color + "18", rec.color + "55"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                  <View style={[ds.vinylRing, { width: 118, height: 118, borderColor: rec.color + "18" }]} />
                  <View style={[ds.vinylRing, { width: 80, height: 80, borderColor: rec.color + "28" }]} />
                  <View style={[ds.vinylRing, { width: 48, height: 48, borderColor: rec.color + "40" }]} />
                  <View style={[ds.vinylCenter, { backgroundColor: rec.color + "22", borderColor: rec.color + "50" }]}>
                    {photo ? <Image source={photo} style={ds.vinylPhoto} /> : <Ionicons name="musical-note" size={16} color={rec.color} />}
                  </View>
                  <View style={ds.songDurationBadge}>
                    <Ionicons name="musical-note" size={8} color="rgba(255,255,255,0.5)" />
                    <Text style={ds.songDurationText}>{rec.duration}</Text>
                  </View>
                </View>
                <View style={ds.recInfo}>
                  <Text style={ds.recTitle} numberOfLines={1}>{rec.title}</Text>
                  <Text style={ds.recArtist} numberOfLines={1}>{rec.artist}</Text>
                  <View style={ds.recBottom}>
                    <Text style={[ds.recGenre, { color: accentColor }]}>{rec.genre}</Text>
                    {likeBtn}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity key={rec.id} style={ds.recCard} activeOpacity={0.85}>
              <View style={[ds.recThumb, { backgroundColor: rec.color + "30" }]}>
                {photo && <Image source={photo} style={ds.recThumbImg} />}
                <LinearGradient colors={["rgba(0,0,0,0.1)", "rgba(0,0,0,0.75)"]} style={StyleSheet.absoluteFill} />
                <View style={ds.recPlayBtn}><Ionicons name="play" size={16} color="#fff" /></View>
                <View style={[ds.videoBadge, { backgroundColor: rec.color }]}>
                  <Text style={[ds.videoBadgeText, { color: rec.color === "#CAFF00" ? "#0D0D0D" : "#fff" }]}>VIDEO</Text>
                </View>
                <View style={ds.recDurationBadge}><Text style={ds.recDurationText}>{rec.duration}</Text></View>
              </View>
              <View style={ds.recInfo}>
                <Text style={ds.recTitle} numberOfLines={1}>{rec.title}</Text>
                <Text style={ds.recArtist} numberOfLines={1}>{rec.artist}</Text>
                <View style={ds.recBottom}>
                  <Text style={[ds.recGenre, { color: accentColor }]}>{rec.genre}</Text>
                  {likeBtn}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </>
  );
}
