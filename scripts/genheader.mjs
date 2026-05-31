#!/usr/bin/env node
// Generate an import header for a block extracted from app/feed.tsx.
// Usage: node scripts/genheader.mjs <startMarker> <endMarker> <relPrefix> <headerOut>
//   relPrefix: relative path prefix from the new file to repo root dirs,
//              e.g. "../../" for components/<sub>/X.tsx
// Scans the block for known symbols and emits import statements for the
// modules they live in. Local symbols (siblings, in-file styles) are NOT
// emitted; rely on tsc to surface those.
import fs from "node:fs";

const [, , startMarker, endMarker, relPrefix, headerOut] = process.argv;
const lines = fs.readFileSync("app/feed.tsx", "utf8").split("\n");
const s = lines.findIndex((l) => l.includes(startMarker));
let e = endMarker === "__EOF__" ? lines.length
  : lines.findIndex((l, i) => i > s && l.includes(endMarker));
if (s === -1 || e === -1) { console.error("marker not found"); process.exit(2); }
const block = lines.slice(s, e).join("\n");

// type-only symbols (imported with `type` modifier)
const TYPES = new Set([
  "Post","DummyComment","DummyCommunity","CarouselItem","ProfileTab","NowPlayingStory",
  "GroupChat","CommunityItem","UserProfile","PostType","PollOption","NavItem","MeetStream",
  "SpotifyTrackResult","SpotifyPlaylist","PlaylistTracksResult","SpotifyArtistInfo","SpotifyAlbum","SpotifyAlbumTrack",
  "ConversationInfo","DbMessage","NowPlayingTrack","Gradient",
  "MeetRow","LiveMeet","MeetMessage","MeetTrack","MeetTrackState","ActiveMeetForUser",
  "SyncReason","SyncStatus","PlaylistTrackInput","CuratedPlaylistLite",
  "CuratedPlaylist","CuratedSong","SocialPlatform","Comment","SpotifyLinkInfo",
  "NowPlayingCtxValue","FeedUserCtxValue",
]);

// module -> exported symbols
const MAP = {
  "@expo/vector-icons": ["Ionicons","FontAwesome5","FontAwesome","MaterialCommunityIcons","Feather"],
  "expo-linear-gradient": ["LinearGradient"],
  "react-native-safe-area-context": ["SafeAreaView","useSafeAreaInsets"],
  "expo-image-picker": [], // namespace, handled separately
  "REL/lib/supabase": ["supabase"],
  "REL/lib/spotify": ["openSpotifyLink","searchSpotifyTracks","getCurrentlyPlaying","getUserPlaylists","getPlaylistTracks","getValidSpotifyToken","skipPrevious","skipNext","setPlayback","playTrack","fetchSpotifyCanvas","connectSpotify","disconnectSpotify","getPublicSpotifyToken","isTrackSaved","saveTrackToLiked","searchSpotifyArtist","getArtistAlbums","getAlbumTracks","seekPlayback","getPlaybackVolume","setVolume","getSpotifyDevices","playTrackAt","reconnectSpotify","refreshSpotifyToken","SpotifyTrackResult","SpotifyPlaylist","PlaylistTracksResult","SpotifyArtistInfo","SpotifyAlbum","SpotifyAlbumTrack"],
  "REL/lib/messages": ["getConversations","getMessages","sendTextMessage","sendSpotifyTrackMessage","getOrCreateConversation","ConversationInfo","DbMessage"],
  "REL/lib/follows": ["followUser","unfollowUser","checkIsFollowing"],
  "REL/lib/meets": ["startMeet","endMeet","joinMeet","leaveMeet","getLiveMeetsFromFollowing","getMeet","getActiveListenerCount","getMeetMessages","sendMeetMessage","updateMeetTrack","meetRowToTrackState","setTalkMode","setMeetOnProfile","recordMeetTrack","getMeetTracks","getActiveMeetForUser","LiveMeet","MeetMessage","MeetTrack","MeetTrackState","MeetRow","ActiveMeetForUser"],
  "REL/lib/meetSync": ["syncListenerToHost","sanityCheckSync","expectedHostPosition","registerMeetSync","unregisterMeetSync","startTalkAudio","stopTalkAudio","restoreVolumeIfDucked"],
  "REL/lib/playlists": ["isTrackInAnyPlaylist","getMyCuratedPlaylists","getPlaylistIdsContainingTrack","addTrackToCuratedPlaylist","removeTrackFromCuratedPlaylist","createCuratedPlaylist","PlaylistTrackInput","CuratedPlaylistLite"],
  "REL/lib/useNowPlaying": ["useNowPlaying","NowPlayingTrack","DEFAULT_GRADIENT"],
  "REL/lib/albumColors": ["useArtGradient","useArtAccent","Gradient"],
  "REL/lib/feed/styles": ["styles"],
  "REL/lib/feed/dimensions": ["SW","SH","NAVBAR_H","BOTTOM_INSET","COMPOSER_ABOVE_NAV","COLLAGE_W","COLLAGE_GAP"],
  "REL/lib/feed/social": ["SOCIAL_PLATFORMS","BANNER_PLATFORM_PRIORITY","SocialPlatform"],
  "REL/lib/feed/contexts": ["OpenDetailCtx","OpenMeetCtx","useOpenMeet","HostMeetCtx","useOpenHostMeet","NowPlayingCtx","useNowPlayingCtx","FeedUserCtx","NowPlayingCtxValue","FeedUserCtxValue"],
  "REL/lib/feed/types": ["CuratedPlaylist","CuratedSong"],
  "REL/lib/feed/helpers": ["dbRowToPost","rowToComment","COMMENT_SELECT","Comment","isLightColor","daysRemaining","parseSpotifyUrl","fetchSpotifyLinkInfo","SpotifyLinkInfo"],
  "REL/components/AddToPlaylistSheet": ["AddToPlaylistSheet"],
  "REL/components/SongPreviewSheet": ["SongPreviewSheet"],
  "REL/components/feed/AnimatedWaveform": ["AnimatedWaveform"],
  "REL/app/data/mock": ["AVATAR_MAP","STORIES","DUMMY_COMMENTS","NAV_ITEMS","FAKE_PHOTO_COLORS","DISCOVER_FILTERS","CAROUSEL_CARD_W","CAROUSEL_GAP","CAROUSEL_ITEMS","TRENDING_ARTISTS","FOR_YOU_RECS","UPCOMING_MEETS","NOW_PLAYING_STORIES","GROUP_CHATS","COMMUNITY_ITEMS","MESSAGES_UNREAD","PROFILE_TABS","PROFILE_POSTS","PROFILE_REPOSTS","DUMMY_COMMUNITIES","fmtCount","Post","DummyComment","DummyCommunity","CarouselItem","ProfileTab","NowPlayingStory","GroupChat","CommunityItem","UserProfile"],
};

const RN = ["View","Text","StyleSheet","ScrollView","FlatList","TouchableOpacity","Dimensions","Animated","Modal","Pressable","TextInput","Platform","PanResponder","Switch","Keyboard","Image","KeyboardAvoidingView","RefreshControl","ActivityIndicator","Alert","Linking","AppState","ImageBackground"];
const REACT = ["useRef","useState","useEffect","createContext","useContext","useMemo","useCallback","useReducer","Fragment"];

const has = (sym) => new RegExp(`\\b${sym.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\b`).test(block);
const out = [];

// react-native primitives
const rn = RN.filter(has);
if (rn.length) out.push(`import { ${rn.join(", ")} } from "react-native";`);
// react hooks
const rh = REACT.filter(has);
if (rh.length) out.push(`import { ${rh.join(", ")} } from "react";`);
// react default for JSX always
out.unshift(`import React from "react";`);
// expo-image-picker namespace
if (/ImagePicker\./.test(block)) out.push(`import * as ImagePicker from "expo-image-picker";`);
if (/SecureStore\./.test(block)) out.push(`import * as SecureStore from "expo-secure-store";`);
if (/\bAudio\b/.test(block)) out.push(`import { Audio } from "expo-av";`);
if (/useVideoPlayer|VideoView/.test(block)) out.push(`import { useVideoPlayer, VideoView } from "expo-video";`);
if (/useRouter|useLocalSearchParams/.test(block)) {
  const r = ["useRouter","useLocalSearchParams"].filter(has);
  out.push(`import { ${r.join(", ")} } from "expo-router";`);
}

for (const [mod, syms] of Object.entries(MAP)) {
  if (!syms.length) continue;
  const found = syms.filter(has);
  if (!found.length) continue;
  const value = found.filter((x) => !TYPES.has(x));
  const types = found.filter((x) => TYPES.has(x));
  const parts = [...value, ...types.map((t) => `type ${t}`)];
  const path = mod.startsWith("REL/") ? relPrefix + mod.slice(4) : mod;
  out.push(`import { ${parts.join(", ")} } from "${path}";`);
}

fs.writeFileSync(headerOut, out.join("\n") + "\n");
console.log(out.join("\n"));
