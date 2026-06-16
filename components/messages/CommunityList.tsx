import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { msgStyles } from "../../assets/styles/feed/localStyles";
import { AvatarCircle } from "../../components/messages/AvatarCircle";
import { COMMUNITY_ITEMS, type CommunityItem } from "../../app/data/mock";

export function CommunityList() {
  const [followed, setFollowed] = useState<Set<string>>(new Set());
  const toggleFollow = (id: string) =>
    setFollowed((p) => { const s = new Set(p); s.has(id) ? s.delete(id) : s.add(id); return s; });

  return (
    <View style={{ paddingTop: 8, paddingHorizontal: 16, gap: 14 }}>
      {COMMUNITY_ITEMS.map((item: CommunityItem) => {
        const isFollowing = followed.has(item.id);
        return (
          <TouchableOpacity key={item.id} style={msgStyles.communityCard} activeOpacity={0.85}>
            {/* Top row */}
            <View style={msgStyles.communityTopRow}>
              <View style={msgStyles.communityLeftMeta}>
                {item.active && (
                  <>
                    <View style={msgStyles.activeDot} />
                    <Text style={msgStyles.activeText}>Active</Text>
                  </>
                )}
                <View style={[msgStyles.viewerStack, item.active && { marginLeft: 8 }]}>
                  {item.viewerUsers.map((u, i) => (
                    <View key={u} style={[msgStyles.viewerAvatarWrap, i === 0 && { marginLeft: 0 }, { zIndex: item.viewerUsers.length - i }]}>
                      <AvatarCircle user={u} size={18} />
                    </View>
                  ))}
                </View>
                <Text style={msgStyles.followerCount}>{item.followers} Followers</Text>
              </View>
              <TouchableOpacity
                style={[msgStyles.followCommunityBtn, isFollowing && msgStyles.followCommunityBtnActive]}
                onPress={() => toggleFollow(item.id)}
                activeOpacity={0.8}
              >
                {isFollowing ? (
                  <Text style={[msgStyles.followCommunityText, { color: "#AB00FF" }]}>✓ Following</Text>
                ) : (
                  <>
                    <Text style={msgStyles.followCommunityText}>Follow</Text>
                    <Text style={msgStyles.followCommunityText}> +</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Title */}
            <Text style={msgStyles.communityTitle}>{item.title}</Text>

            {/* Tags */}
            <View style={msgStyles.communityTagsRow}>
              {item.tags.map((tag) => (
                <View key={tag} style={msgStyles.communityTag}>
                  <Text style={msgStyles.communityTagText}>{tag}</Text>
                </View>
              ))}
            </View>

            {/* Divider */}
            <View style={msgStyles.communityDivider} />

            {/* Author row */}
            <View style={msgStyles.authorRow}>
              <AvatarCircle user={item.authorUser} size={26} />
              <View style={{ flex: 1 }}>
                <Text style={msgStyles.authorName}>{item.author}</Text>
                <Text style={msgStyles.authorFollowers}>{item.followers} Followers</Text>
              </View>
              <Text style={msgStyles.authorDate}>{item.date}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
