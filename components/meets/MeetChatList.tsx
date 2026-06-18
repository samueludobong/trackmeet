import React, { useRef, useEffect } from "react";
import { View, Text, ScrollView } from "react-native";
import { CachedImage } from "../ui/CachedImage";
import { type MeetMessage } from "../../services/meets";
import { mcStyles } from "../../assets/styles/feed/localStyles";

export function MeetChatList({ messages, scrollLocked = false }: { messages: MeetMessage[]; scrollLocked?: boolean }) {
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(t);
  }, [messages.length]);

  // Only show the most recent handful so the overlay never fills the screen.
  const recent = messages.slice(-6);

  return (
    <ScrollView
      ref={scrollRef}
      style={{ maxHeight: 220 }}
      contentContainerStyle={{ gap: 9, justifyContent: "flex-end", flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      scrollEnabled={!scrollLocked}
    >
      {recent.map((m) => {
        const name = m.author?.display_name || m.author?.username || "Listener";
        return (
          <View key={m.id} style={mcStyles.row}>
            {m.author?.avatar_url ? (
              <CachedImage source={{ uri: m.author.avatar_url }} style={mcStyles.avatar} />
            ) : (
              <View style={[mcStyles.avatar, mcStyles.avatarFallback]}>
                <Text style={mcStyles.avatarLetter}>{name.slice(0, 1).toUpperCase()}</Text>
              </View>
            )}
            <View style={mcStyles.bubble}>
              <Text style={mcStyles.name}>{name}</Text>
              <Text style={mcStyles.text}>{m.body}</Text>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}


// ─── End-of-meet summary ──────────────────────────────────────────────────────
