import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { msgStyles } from "../../lib/feed/localStyles";
import { AvatarCircle } from "../../components/messages/AvatarCircle";
import { GROUP_CHATS, type GroupChat } from "../../app/data/mock";

export function GroupChatsList() {
  return (
    <View>
      {GROUP_CHATS.map((gc: GroupChat) => {
        const [m1, m2] = gc.members;
        return (
          <TouchableOpacity key={gc.id} style={msgStyles.gcRow} activeOpacity={0.75}>
            {/* Overlapping group avatars */}
            <View style={msgStyles.gcAvatarStack}>
              <View style={msgStyles.gcAvatarBack}>
                <AvatarCircle user={m2} size={30} />
              </View>
              <View style={msgStyles.gcAvatarFront}>
                <AvatarCircle user={m1} size={38} />
              </View>
            </View>
            <View style={msgStyles.gcContent}>
              <View style={msgStyles.gcTopRow}>
                <Text style={[msgStyles.gcName, gc.unread > 0 && msgStyles.gcNameUnread]} numberOfLines={1}>{gc.name}</Text>
                <Text style={msgStyles.gcTime}>{gc.time}</Text>
              </View>
              <View style={msgStyles.gcBottomRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[msgStyles.gcPreview, gc.unread > 0 && msgStyles.gcPreviewUnread]} numberOfLines={1}>
                    <Text style={msgStyles.gcSender}>{gc.sender}: </Text>{gc.preview}
                  </Text>
                  <Text style={msgStyles.gcMemberCount}>{gc.memberCount} members</Text>
                </View>
                {gc.unread > 0 && (
                  <View style={msgStyles.gcUnreadBadge}>
                    <Text style={msgStyles.gcUnreadBadgeText}>{gc.unread}</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
