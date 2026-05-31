import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { profileStyles } from "../../lib/feed/localStyles";
import { type DummyCommunity } from "../../app/data/mock";

export function CommunityCard({ co }: { co: DummyCommunity }) {
  return (
    <TouchableOpacity style={profileStyles.communityCard} activeOpacity={0.82}>
      <View style={[profileStyles.communityIcon, { backgroundColor: co.color + "18" }]}>
        <Text style={{ fontSize: 22 }}>👥</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={profileStyles.communityName}>{co.name}</Text>
        <Text style={profileStyles.communityDesc} numberOfLines={1}>{co.desc}</Text>
      </View>
      <Text style={[profileStyles.communityMembers, { color: co.color }]}>{co.members}</Text>
    </TouchableOpacity>
  );
}
