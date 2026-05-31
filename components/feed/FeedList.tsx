import React from "react";
import { View, Text, ScrollView, FlatList, TouchableOpacity, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "../../lib/feed/styles";
import { NOW_PLAYING_STORIES, type Post } from "../../app/data/mock";
import { NowPlayingBubble } from "./NowPlayingBubble";
import { SwipeablePost } from "../post/SwipeablePost";

/** The main feed: now-playing stories header + a virtualized list of posts. */
export function FeedList({
  feedPosts, feedScrollEnabled, feedRefreshing, onFeedRefresh,
  setQuickReplyPost, setFeedScrollEnabled, setDetailPost,
}: {
  feedPosts: Post[];
  feedScrollEnabled: boolean;
  feedRefreshing: boolean;
  onFeedRefresh: () => void;
  setQuickReplyPost: (p: Post) => void;
  setFeedScrollEnabled: (v: boolean) => void;
  setDetailPost: (p: Post) => void;
}) {
  return (
    <FlatList
      data={feedPosts}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.feedContent}
      showsVerticalScrollIndicator={false}
      scrollEnabled={feedScrollEnabled}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={feedRefreshing} onRefresh={onFeedRefresh} tintColor="#AB00FF" />}
      ListHeaderComponent={
        <>
          <View style={styles.navbar}>
            <View style={{ width: 40 }} />
            <Text style={styles.navBrand}>trackmeet</Text>
            <TouchableOpacity style={styles.notifBtn} activeOpacity={0.7}>
              <Ionicons name="notifications-outline" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storiesContent} style={styles.storiesStrip}>
            {NOW_PLAYING_STORIES.map((s) => <NowPlayingBubble key={s.id} item={s} />)}
          </ScrollView>
          <View style={styles.stripDivider} />
        </>
      }
      renderItem={({ item }) => (
        <SwipeablePost item={item} onQuickReply={setQuickReplyPost} onScrollLock={setFeedScrollEnabled} onPress={() => setDetailPost(item)} />
      )}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
    />
  );
}
