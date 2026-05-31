import React from "react";
import { type Comment } from "../../lib/feed/helpers";
import { TextCard } from "../../components/post/TextCard";
import { ImageCard } from "../../components/post/ImageCard";
import { VideoCard } from "../../components/post/VideoCard";
import { MusicCard } from "../../components/post/MusicCard";
import { PollCard } from "../../components/post/PollCard";
import { type Post } from "../../app/data/mock";

export function PostCard({ item }: { item: Post }) {
  if (item.type === "text") return <TextCard post={item} />;
  if (item.type === "image") return <ImageCard post={item} />;
  if (item.type === "video") return <VideoCard post={item} />;
  if (item.type === "music") return <MusicCard post={item} />;
  if (item.type === "poll") return <PollCard post={item} />;
  return null;
}

// ─── Comment row (swipeable, double-tap to like) ───────────────────────────────
