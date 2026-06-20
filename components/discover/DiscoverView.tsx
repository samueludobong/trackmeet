import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, Platform, KeyboardAvoidingView, RefreshControl, ActivityIndicator, Keyboard, TouchableWithoutFeedback } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { followUser, unfollowUser } from "../../services/follows";
import { ds } from "../../assets/styles/feed/localStyles";
import { DISCOVER_FILTERS, TRENDING_ARTISTS, FOR_YOU_RECS, UPCOMING_MEETS } from "../../app/data/mock";
import { useDiscoverSearch } from "../../hooks/useDiscoverSearch";
import { MEETS_ENABLED } from "../../constants/featureFlags";
import { TrendingCarousel } from "../feed/TrendingCarousel";
import { ArtistResultCard } from "./ArtistResultCard";
import { PersonResultCard } from "./PersonResultCard";
import { TrendingArtistsRow } from "./TrendingArtistsRow";
import { ForYouRow } from "./ForYouRow";
import { UpcomingMeetsList } from "./UpcomingMeetsList";

export function DiscoverView() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchText, setSearchText]     = useState("");
  const [joinedMeets, setJoinedMeets]     = useState<Set<string>>(new Set());
  const [followedArtists, setFollowedArtists] = useState<Set<string>>(new Set());
  const [likedRecs, setLikedRecs]         = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing]       = useState(false);

  const { userResults, userFollowing, setUserFollowing, userLoading, artistResults, artistLoading } =
    useDiscoverSearch(searchText);

  const onRefresh = async () => {
    setRefreshing(true);
    setJoinedMeets(new Set());
    setFollowedArtists(new Set());
    setLikedRecs(new Set());
    setRefreshing(false);
  };

  const toggleSet = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) =>
    setter((p) => { const s = new Set(p); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const toggleFollow = async (id: string) => {
    if (userFollowing.has(id)) {
      setUserFollowing((prev) => { const s = new Set(prev); s.delete(id); return s; });
      await unfollowUser(id);
    } else {
      setUserFollowing((prev) => new Set([...prev, id]));
      await followUser(id);
    }
  };

  const showCarousel = MEETS_ENABLED && (activeFilter === "All" || activeFilter === "Events");
  const showArtists  = activeFilter === "All" || activeFilter === "Artists";
  const showForYou   = activeFilter === "All" || activeFilter === "Artists";
  const showMeets    = MEETS_ENABLED && (activeFilter === "All" || activeFilter === "Events");

  const q = searchText.toLowerCase();
  const filteredArtists = TRENDING_ARTISTS.filter((a) => !q || a.name.toLowerCase().includes(q) || a.genre.toLowerCase().includes(q));
  const filteredMeets   = UPCOMING_MEETS.filter((m) => !q || m.title.toLowerCase().includes(q) || m.tags.some((t) => t.toLowerCase().includes(q)));
  const filteredRecs    = FOR_YOU_RECS.filter((r) => !q || r.title.toLowerCase().includes(q) || r.artist.toLowerCase().includes(q));
  const showPeople      = q.length >= 2;
  const noResults       = q && !userLoading && userResults.length === 0 && filteredArtists.length === 0 && filteredMeets.length === 0 && filteredRecs.length === 0;

  console.log("ARTIST RESULT CARD MAPPED", artistResults);


  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={ds.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#AB00FF" />}
      >
        <View style={ds.header}>
          <Text style={ds.headerTitle}>Discover</Text>
          <TouchableOpacity style={ds.iconBtn} activeOpacity={0.7}>
            <Ionicons name="options-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={ds.searchWrap}>
          <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.35)" style={{ marginRight: 8 }} />
          <TextInput
            style={ds.searchInput}
            placeholder="Search artists, events, music…"
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

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ds.filtersRow} style={{ marginBottom: 24 }}>
          {DISCOVER_FILTERS.filter((f) => MEETS_ENABLED || f !== "Events").map((f) => {
            const active = f === activeFilter;
            return (
              <TouchableOpacity key={f} style={[ds.filterPill, active && ds.filterPillActive]} activeOpacity={0.7} onPress={() => setActiveFilter(f)}>
                <Text style={[ds.filterPillText, active && ds.filterPillTextActive]}>{f}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {showPeople && (
          <View style={{ marginBottom: 24, marginHorizontal: 16 }}>
            <View style={ds.sectionHeader}><Text style={ds.sectionTitle}>Artists</Text></View>
            {artistLoading ? (
              <ActivityIndicator color="#AB00FF" style={{ marginTop: 18 }} />
            ) : artistResults.length === 0 ? (
              <Text style={{ color: "rgba(255,255,255,0.28)", fontSize: 14, marginTop: 10, paddingHorizontal: 4 }}>No artists found for "{searchText.trim()}"</Text>
            ) : (
              artistResults.map((a) => (
                <ArtistResultCard key={a.id} artist={a} onPress={() => router.push({ pathname: "/artist-profile", params: { artistId: a.id } })} />
              ))
            )}
            
          </View>
          
        )}
        

        {showPeople && (
          <View style={{ marginBottom: 28, marginHorizontal: 16 }}>
            <View style={ds.sectionHeader}><Text style={ds.sectionTitle}>People</Text></View>
            {userLoading ? (
              <ActivityIndicator color="#AB00FF" style={{ marginTop: 18 }} />
            ) : userResults.length === 0 ? (
              <Text style={{ color: "rgba(255,255,255,0.28)", fontSize: 14, marginTop: 10, paddingHorizontal: 4 }}>No users found for "{searchText.trim()}"</Text>
            ) : (
              userResults.map((u) => (
                <PersonResultCard
                  key={u.id}
                  user={u}
                  following={userFollowing.has(u.id)}
                  onToggleFollow={() => toggleFollow(u.id)}
                  onPress={() => router.push({ pathname: "/user-profile", params: { userId: u.id } })}
                />
              ))
            )}
          </View>
        )}

        {showCarousel && !q && (
          <TrendingCarousel
            joinedMeets={joinedMeets}
            followedArtists={followedArtists}
            onJoinMeet={(id) => toggleSet(setJoinedMeets, id)}
            onFollowArtist={(id) => toggleSet(setFollowedArtists, id)}
          />
        )}

        {showArtists && filteredArtists.length > 0 && (
          <TrendingArtistsRow artists={filteredArtists} followedArtists={followedArtists} onToggleFollow={(id) => toggleSet(setFollowedArtists, id)} />
        )}

        {showForYou && filteredRecs.length > 0 && (
          <ForYouRow recs={filteredRecs} likedRecs={likedRecs} onToggleLike={(id) => toggleSet(setLikedRecs, id)} />
        )}

        {showMeets && filteredMeets.length > 0 && (
          <UpcomingMeetsList meets={filteredMeets} joinedMeets={joinedMeets} onToggleJoin={(id) => toggleSet(setJoinedMeets, id)} />
        )}

        {noResults && (
          <View style={ds.emptyState}>
            <Ionicons name="search-outline" size={40} color="rgba(255,255,255,0.15)" />
            <Text style={ds.emptyText}>No results for "{searchText}"</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
