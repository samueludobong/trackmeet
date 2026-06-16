import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, Platform, KeyboardAvoidingView, RefreshControl, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getLiveMeetsFromFollowing, type LiveMeet } from "../../services/meets";
import { styles } from "../../assets/styles/feed/styles";
import { ds, ms } from "../../assets/styles/feed/localStyles";
import { useOpenMeet } from "../../lib/feed/contexts";
import { LiveMeetCard } from "../../components/meets/LiveMeetCard";

export function MeetsView() {
  const [searchText, setSearchText] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [meets,      setMeets]      = useState<LiveMeet[]>([]);
  const [loading,    setLoading]    = useState(true);
  const openMeet = useOpenMeet();

  const load = async () => {
    const live = await getLiveMeetsFromFollowing();
    setMeets(live);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    setSearchText("");
    await load();
    setRefreshing(false);
  };

  const q = searchText.toLowerCase();
  const filtered = meets.filter((m) =>
    !q ||
    m.name.toLowerCase().includes(q) ||
    m.host.username.toLowerCase().includes(q) ||
    (m.host.display_name ?? "").toLowerCase().includes(q) ||
    m.tags.some((t) => t.toLowerCase().includes(q))
  );

  const leftCol  = filtered.filter((_, i) => i % 2 === 0);
  const rightCol = filtered.filter((_, i) => i % 2 === 1);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={ms.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#AB00FF" />}
    >
      {/* Header */}
      <View style={ms.header}>
        <Text style={ms.headerTitle}>Meets</Text>
      </View>

      {/* Search — reuse ds styles */}
      <View style={ds.searchWrap}>
        <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.35)" style={{ marginRight: 8 }} />
        <TextInput
          style={ds.searchInput}
          placeholder="Search live meets, hosts…"
          placeholderTextColor="rgba(255,255,255,0.3)"
          value={searchText}
          onChangeText={setSearchText}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText("")} activeOpacity={0.7}>
            <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.35)" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color="#AB00FF" style={{ marginTop: 48 }} />
      ) : filtered.length > 0 ? (
        <View style={ms.grid}>
          <View style={ms.col}>
            {leftCol.map((m) => <LiveMeetCard key={m.id} meet={m} onJoin={(id) => openMeet?.(id)} />)}
          </View>
          <View style={ms.col}>
            {rightCol.map((m) => <LiveMeetCard key={m.id} meet={m} onJoin={(id) => openMeet?.(id)} />)}
          </View>
        </View>
      ) : (
        <View style={ds.emptyState}>
          <Ionicons name="radio-outline" size={40} color="rgba(255,255,255,0.15)" />
          <Text style={ds.emptyText}>No live meets right now</Text>
          <Text style={[ds.emptyText, { fontSize: 12, marginTop: 4, opacity: 0.6 }]}>
            Meets from people you follow show up here
          </Text>
        </View>
      )}
    </ScrollView>
    </KeyboardAvoidingView>
  );
}


// ─── People search styles (Discover) ─────────────────────────────────────────


// ─── Messages page ────────────────────────────────────────────────────────────
