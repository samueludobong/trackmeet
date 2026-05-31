import React, { useState } from "react";
import { voteOnPoll } from "../../services/posts";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "../../lib/feed/styles";
import { ActionRow } from "../../components/post/ActionRow";
import { PostHeader } from "../../components/post/PostHeader";
import { PostText } from "../../components/post/TextCard";
import { type Post } from "../../app/data/mock";

export function PollCard({ post }: { post: Post }) {
  const [voted, setVoted] = useState<string | null>(null);
  const [localOptions, setLocalOptions] = useState(post.pollOptions ?? []);
  const [voting, setVoting] = useState(false);

  // Derive total from live localOptions (not a snapshot), handle 0-vote state
  const displayTotal = localOptions.reduce((s, o) => s + o.votes, 0);
  const total = displayTotal || 1; // avoid division-by-zero for pct calculation

  const handleVote = async (optId: string) => {
    // Tapping the already-selected option is a no-op
    if (optId === voted || voting) return;

    const prevVoted = voted;
    const prevOptions = localOptions;

    // Optimistic update: increment new, decrement old
    const optimistic = localOptions.map((o) => {
      if (o.id === optId)      return { ...o, votes: o.votes + 1 };
      if (o.id === prevVoted)  return { ...o, votes: Math.max(0, o.votes - 1) };
      return o;
    });
    setVoted(optId);
    setLocalOptions(optimistic);
    setVoting(true);

    // Persist via SECURITY DEFINER RPC — bypasses RLS so any voter can update
    const { data, error } = await voteOnPoll(post.id, optId, prevVoted);

    setVoting(false);

    if (error) {
      // Revert on failure
      console.log("[PollCard] vote error:", error.message);
      setVoted(prevVoted);
      setLocalOptions(prevOptions);
    } else if (data?.options) {
      // Sync with server-authoritative counts
      setLocalOptions(data.options);
    }
  };

  const maxVotes = Math.max(...localOptions.map((o) => o.votes));

  return (
    <View style={styles.card}>
      <PostHeader post={post} />
      {post.text && <PostText text={post.text} />}

      <View style={styles.pollContainer}>
        <Text style={styles.pollQuestion}>{post.pollQuestion}</Text>
        <View style={styles.pollOptions}>
          {localOptions.map((opt) => {
            const pct       = Math.round((opt.votes / total) * 100);
            const isVoted   = voted === opt.id;
            const isWinner  = voted !== null && opt.votes === maxVotes && opt.votes > 0;

            return (
              <TouchableOpacity
                key={opt.id}
                style={[styles.pollOption, isVoted && { borderColor: "rgba(171,0,255,0.45)" }]}
                activeOpacity={voted ? 0.65 : 0.8}
                onPress={() => handleVote(opt.id)}
                disabled={voting}
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
                  {/* Right side: checkmark for current vote, pct after voting */}
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
          {(voted === null ? displayTotal : displayTotal).toLocaleString()} votes
          {voted !== null ? " · tap another option to change" : " · tap to vote"}
        </Text>
      </View>

      <ActionRow post={post} />
    </View>
  );
}

// ─── Post card router ─────────────────────────────────────────────────────────
