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

  // Compact relative age, IG-style: 5m · 2h · 1d · 3w.
  const fmtTime = (iso: string | null) => {
    if (!iso) return "";
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d`;
    const wks = Math.floor(days / 7);
    if (wks < 5) return `${wks}w`;
    return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
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
      {conversations.map(conv => {
        const time = fmtTime(conv.last_message_at);
        const preview = conv.last_message_preview || "Say hello!";
        return (
          <TouchableOpacity
            key={conv.conversationId}
            style={msgStyles.dmRow}
            activeOpacity={0.75}
            onPress={() => onSelect(conv)}
          >
            <View style={msgStyles.dmAvatarWrap}>
              {conv.otherUser.avatar_url ? (
                <Image source={{ uri: conv.otherUser.avatar_url }} style={{ width: 56, height: 56, borderRadius: 28 }} />
              ) : (
                <View style={[msgStyles.dmAvatar, { backgroundColor: "#AB00FF33" }]}>
                  <Text style={msgStyles.dmAvatarText}>{initials(conv.otherUser)}</Text>
                </View>
              )}
            </View>
            <View style={msgStyles.dmContent}>
              <Text style={msgStyles.dmName} numberOfLines={1}>
                {conv.otherUser.display_name || conv.otherUser.username}
              </Text>
              <Text style={msgStyles.dmPreview} numberOfLines={1}>
                {preview}{time ? `  ·  ${time}` : ""}
              </Text>
            </View>
            <View style={msgStyles.dmUnreadDot} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
