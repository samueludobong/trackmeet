import React from "react";
import { type Comment } from "../../lib/feed/helpers";
import { TextCard } from "../../components/post/TextCard";
import { ImageCard } from "../../components/post/ImageCard";
import { VideoCard } from "../../components/post/VideoCard";
import { MusicCard } from "../../components/post/MusicCard";
import { PollCard } from "../../components/post/PollCard";
import { VoiceCard } from "../../components/post/VoiceCard";
import { type Post } from "../../app/data/mock";

// React.memo so re-renders of the parent (feed/profile tab swap, ambient
// context ticks, etc.) don't re-render every card when its `item` hasn't
// changed identity. The Profile "Posts" tab renders up to 50 cards as a
// `.map()` (no FlatList windowing) — without this memo every tab swap to
// Profile re-runs all 50 cards + their typed children.
export const PostCard = React.memo(function PostCard({ item }: { item: Post }) {
  if (item.type === "text") return <TextCard post={item} />;
  if (item.type === "image") return <ImageCard post={item} />;
  if (item.type === "video") return <VideoCard post={item} />;
  if (item.type === "music") return <MusicCard post={item} />;
  if (item.type === "poll") return <PollCard post={item} />;
  if (item.type === "voice") return <VoiceCard post={item} />;
  return null;
});

// ─── Comment row (swipeable, double-tap to like) ───────────────────────────────
