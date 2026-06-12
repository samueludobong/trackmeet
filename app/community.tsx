import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../lib/supabase";
import { getCommunityBySlug, COMMUNITY_SELECT, type Community } from "../services/communities";
import { CommunityDetailOverlay } from "../components/communities/CommunityDetailOverlay";

/** Route /community?id=... or /community?slug=... — used by tappable community tags. */
export default function CommunityRoute() {
  const params = useLocalSearchParams<{ id?: string; slug?: string }>();
  const router = useRouter();
  const [community, setCommunity] = useState<Community | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const uid = user?.id ?? null;
      let c: Community | null = null;
      if (params.id) {
        const { data } = await supabase.from("communities").select(COMMUNITY_SELECT).eq("id", params.id).maybeSingle();
        c = (data as Community | null) ?? null;
      } else if (params.slug) {
        c = await getCommunityBySlug(params.slug);
      }
      if (!active) return;
      setUserId(uid);
      setCommunity(c);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [params.id, params.slug]);

  if (loading || !community) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0D0D0D", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#AB00FF" />
      </View>
    );
  }
  return <CommunityDetailOverlay community={community} userId={userId} onClose={() => router.back()} />;
}
