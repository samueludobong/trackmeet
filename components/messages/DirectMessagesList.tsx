import React from "react";
import { View, Text, TouchableOpacity, Image, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { type ConversationInfo } from "../../services/messages";
import { msgStyles } from "../../lib/feed/localStyles";

export function DirectMessagesList({ conversations, loading, onSelect }: {
  conversations: ConversationInfo[];
  loading: boolean;
  onSelect: (conv: ConversationInfo) => void;
}) {

  const fmtTime = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
    if (diffDays === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const initials = (u: ConversationInfo["otherUser"]) => {
    const name = u.display_name || u.username;
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
  };

  if (loading) {
    return (
      <View style={{ paddingTop: 40, alignItems: "center" }}>
        <ActivityIndicator color="#AB00FF" />
      </View>
    );
  }

  if (conversations.length === 0) {
    return (
      <View style={{ paddingTop: 60, alignItems: "center", gap: 10 }}>
        <Ionicons name="chatbubble-outline" size={40} color="rgba(255,255,255,0.12)" />
        <Text style={{ color: "rgba(255,255,255,0.3)", fontSize: 15 }}>No messages yet</Text>
        <Text style={{ color: "rgba(255,255,255,0.18)", fontSize: 13 }}>Follow people and start a conversation</Text>
      </View>
    );
  }

  return (
    <View>
      {conversations.map(conv => (
        <TouchableOpacity
          key={conv.conversationId}
          style={msgStyles.dmRow}
          activeOpacity={0.75}
          onPress={() => onSelect(conv)}
        >
          <View style={msgStyles.dmAvatarWrap}>
            {conv.otherUser.avatar_url ? (
              <Image source={{ uri: conv.otherUser.avatar_url }} style={{ width: 52, height: 52, borderRadius: 26 }} />
            ) : (
              <View style={[msgStyles.dmAvatar, { backgroundColor: "#AB00FF33" }]}>
                <Text style={msgStyles.dmAvatarText}>{initials(conv.otherUser)}</Text>
              </View>
            )}
          </View>
          <View style={msgStyles.dmContent}>
            <View style={msgStyles.dmTopRow}>
              <Text style={msgStyles.dmName} numberOfLines={1}>
                {conv.otherUser.display_name || conv.otherUser.username}
              </Text>
              <Text style={msgStyles.dmTime}>{fmtTime(conv.last_message_at)}</Text>
            </View>
            <Text style={msgStyles.dmPreview} numberOfLines={1}>
              {conv.last_message_preview || "Say hello!"}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}
