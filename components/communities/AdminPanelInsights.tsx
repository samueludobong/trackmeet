import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { CachedImage } from "../ui/CachedImage";
import { Ionicons } from "@expo/vector-icons";
import { getCommunityInsights, type CommunityInsights } from "../../services/communities";
import { adminStyles as a } from "../../assets/styles/communities/adminPanel";
import { st } from "../../assets/styles/communities/AdminPanelInsights";

const ACCENT = "#AB00FF";
const GREEN = "#1DB954";

/** 7-day activity snapshot: joins + posts per day, totals, top posters. */
export function AdminPanelInsights({ communityId }: { communityId: string }) {
  const [insights, setInsights] = useState<CommunityInsights | null>(null);

  useEffect(() => {
    getCommunityInsights(communityId).then(setInsights).catch(() => setInsights(null));
  }, [communityId]);

  if (!insights) return <ActivityIndicator color={ACCENT} style={{ marginTop: 24 }} />;

  const totalJoins = insights.joinsPerDay.reduce((acc, d) => acc + d.count, 0);
  const totalPosts = insights.postsPerDay.reduce((acc, d) => acc + d.count, 0);

  return (
    <View style={{ gap: 18 }}>
      {/* ── Totals ── */}
      <View style={st.totalsRow}>
        <TotalCard icon="person-add" label="New members (7d)" value={totalJoins} color={ACCENT} />
        <TotalCard icon="chatbubbles" label="Posts (7d)" value={totalPosts} color={GREEN} />
      </View>
      <View style={st.totalsRow}>
        <TotalCard icon="heart" label="Likes on 7d posts" value={insights.totalLikes} color="#FF3B6F" />
        <TotalCard icon="chatbubble-ellipses" label="Comments on 7d posts" value={insights.totalComments} color="#FFD24A" />
      </View>

      {/* ── Charts ── */}
      <BarChart title="MEMBER GROWTH" data={insights.joinsPerDay} color={ACCENT} />
      <BarChart title="POST ACTIVITY" data={insights.postsPerDay} color={GREEN} />

      {/* ── Top posters ── */}
      <View>
        <Text style={a.sectionTitle}>TOP POSTERS (7D)</Text>
        {insights.topPosters.length === 0 ? (
          <Text style={a.helper}>No posts this week.</Text>
        ) : (
          <View style={{ gap: 10, marginTop: 6 }}>
            {insights.topPosters.map(({ user, posts }, i) => (
              <View key={user.id} style={st.posterRow}>
                <Text style={st.posterRank}>#{i + 1}</Text>
                {user.avatar_url ? (
                  <CachedImage source={{ uri: user.avatar_url }} style={st.posterAvatar} />
                ) : (
                  <View style={[st.posterAvatar, { backgroundColor: "rgba(171,0,255,0.18)", alignItems: "center", justifyContent: "center" }]}>
                    <Ionicons name="person" size={13} color={ACCENT} />
                  </View>
                )}
                <Text style={st.posterName} numberOfLines={1}>
                  {user.display_name || user.username || "User"}
                </Text>
                <Text style={st.posterCount}>{posts} post{posts === 1 ? "" : "s"}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

function TotalCard({ icon, label, value, color }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; value: number; color: string;
}) {
  return (
    <View style={st.totalCard}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={st.totalValue}>{value.toLocaleString()}</Text>
      <Text style={st.totalLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function BarChart({ title, data, color }: {
  title: string; data: { day: string; count: number }[]; color: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <View>
      <Text style={a.sectionTitle}>{title}</Text>
      <View style={st.chartRow}>
        {data.map((d, i) => (
          <View key={i} style={st.chartCol}>
            <Text style={st.chartValue}>{d.count > 0 ? d.count : ""}</Text>
            <View style={st.chartTrack}>
              <View style={[st.chartBar, { height: `${Math.max(4, (d.count / max) * 100)}%`, backgroundColor: color }]} />
            </View>
            <Text style={st.chartDay}>{d.day}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
