import React from "react";
import { View, Text, ScrollView, TouchableOpacity, Image } from "react-native";
import { ds } from "../../lib/feed/localStyles";
import { AVATAR_MAP, STORIES } from "../../app/data/mock";

/** Horizontal stories strip on the Discover screen. */
export function StoriesRow() {
  return (
    <>
      <View style={[ds.sectionHeader, { marginTop: 4 }]}>
        <Text style={ds.sectionTitle}>Stories</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ds.storiesRow} style={{ marginBottom: 32 }}>
        {STORIES.map((s) => {
          const photo = AVATAR_MAP[s.name];
          return (
            <TouchableOpacity key={s.id} style={ds.storyItem2} activeOpacity={0.8}>
              <View style={[ds.storyRing2, { borderColor: s.color }]}>
                {photo ? (
                  <Image source={photo} style={ds.storyAvatar2} />
                ) : (
                  <View style={[ds.storyAvatar2, { backgroundColor: s.color + "25", alignItems: "center", justifyContent: "center" }]}>
                    <Text style={{ fontSize: 20, fontWeight: "800", color: s.color }}>{s.initials}</Text>
                  </View>
                )}
              </View>
              <Text style={ds.storyName2} numberOfLines={1}>{s.name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </>
  );
}
