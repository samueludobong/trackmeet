import { type UserProfile, type Post } from "../../app/data/mock";
import { type ConversationInfo } from "../../services/messages";

// Module-scoped, mount-surviving caches shared across feed/profile/messages/meets
// components (previously top-level `let` bindings inside app/feed.tsx).
export const feedCache: {
  profile: UserProfile | null;
  myPosts: Post[] | null;
  conversations: ConversationInfo[] | null;
  reactionSeq: number;
} = {
  profile: null,
  myPosts: null,
  conversations: null,
  reactionSeq: 0,
};
