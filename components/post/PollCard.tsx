import React, { useContext } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "../../lib/feed/styles";
import { ActionRow } from "../../components/post/ActionRow";
import { PostHeader } from "../../components/post/PostHeader";
import { PostText } from "../../components/post/TextCard";
import { FeedUserCtx } from "../../lib/feed/contexts";
import { type Post } from "../../app/data/mock";

/**
 * Poll card. Reads `voted` from FeedUserCtx.pollVotes (a Map<postId, optId>)
 * instead of holding it in local state — so the user's selection survives
 * remounts (feed → detail → feed) and the server-authoritative RPC can refuse
 * a re-vote without the UI showing a stale fresh state.
 */
export function PollCard({ post }: { post: Post }) {
  const { pollVotes, onVoteOnPoll, currentUserId } = useContext(FeedUserCtx);
  const voted = pollVotes.get(post.id) ?? null;

  const options = post.pollOptions ?? [];
  const displayTotal = options.reduce((s, o) => s + o.votes, 0);
  const total = displayTotal || 1; // avoid division-by-zero for pct calculation
  const maxVotes = Math.max(0, ...options.map((o) => o.votes));

  const handleVote = (optId: string) => {
    if (!currentUserId) return;
    if (optId === voted) return; // tapping the already-selected option is a no-op
    onVoteOnPoll(post.id, optId);
  };

  return (
    <View style={styles.card}>
      <PostHeader post={post} />
      {post.text && <PostText text={post.text} />}

      <View style={styles.pollContainer}>
        <Text style={styles.pollQuestion}>{post.pollQuestion}</Text>
        <View style={styles.pollOptions}>
          {options.map((opt) => {
            const pct      = Math.round((opt.votes / total) * 100);
            const isVoted  = voted === opt.id;
            const isWinner = voted !== null && opt.votes === maxVotes && opt.votes > 0;

            return (
              <TouchableOpacity
                key={opt.id}
                style={[styles.pollOption, isVoted && { borderColor: "rgba(171,0,255,0.45)" }]}
                activeOpacity={voted ? 0.65 : 0.8}
                onPress={() => handleVote(opt.id)}
              >
                {/* Fill bar — visible once any vote has been cast */}
                {voted !== null && (
                  <View
                    style={[
                      styles.pollFillBar,
                      { width: `${pct}%` as any, backgroundColor: isWinner ? "#AB00FF22" : "rgba(255,255,255,0.06)" },
                    ]}
                  />
                )}
                <View style={styles.pollOptionInner}>
                  <Text style={[styles.pollOptionLabel, isVoted && { color: "#AB00FF" }]}>
                    {opt.label}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    {voted !== null && (
                      <Text style={[styles.pollPct, isWinner && { color: "#AB00FF" }]}>{pct}%</Text>
                    )}
                    {isVoted && (
                      <Ionicons name="checkmark-circle" size={15} color="#AB00FF" />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.pollMeta}>
          {displayTotal.toLocaleString()} votes
          {voted !== null ? " · tap another option to change" : " · tap to vote"}
        </Text>
      </View>

      <ActionRow post={post} />
    </View>
  );
}

// ─── Post card router ─────────────────────────────────────────────────────────
