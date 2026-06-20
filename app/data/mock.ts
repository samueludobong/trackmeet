import { Dimensions } from "react-native";

const { width: SW } = Dimensions.get("window");

// ─── Avatar map ───────────────────────────────────────────────────────────────

export const AVATAR_MAP: Record<string, any> = {
  // maya_v:  require("../../assets/avatars/maya_v.jpg"),
  // jaykay:  require("../../assets/avatars/jaykay.jpg"),
  // tolu:    require("../../assets/avatars/tolu.jpg"),
  // seren:   require("../../assets/avatars/seren.jpg"),
  // nate_x:  require("../../assets/avatars/nate_x.jpg"),
  // ayo:     require("../../assets/avatars/ayo.jpg"),
  // priya:   require("../../assets/avatars/priya.jpg"),
  // "dan.b": require("../../assets/avatars/dan.jpg"),
};

export type UserProfile = {
  username: string;
  display_name: string | null;
  bio: string | null;
  is_verified: boolean;
  followers_count: number | null;
  following_count: number | null;
  avatar_url: string | null;
  banner_color: string | null;
  banner_image_url: string | null;
  banner_shape: string | null;
  banner_shape_color: string | null;
  username_changed_at: string | null;
  display_name_change_count: number | null;
  display_name_window_start: string | null;
  pinned_song_id: string | null;
  pinned_song_name: string | null;
  pinned_song_artist: string | null;
  pinned_song_album_art: string | null;
  profile_links: string[] | null;
  social_links: Record<string, string> | null;
  spotify_access_token: string | null;
};

// ─── Types ────────────────────────────────────────────────────────────────────

export type PostType = "text" | "image" | "video" | "music" | "poll" | "voice";

export type PollOption = { id: string; label: string; votes: number };

export type Post = {
  id: string;
  authorId?: string;           // DB user UUID — set for real posts, absent for mock data
  user: string;
  handle: string;
  initials: string;
  avatarColor: string;
  avatarUrl?: string | null;   // real avatar from DB
  isVerified?: boolean;
  bio: string | null;
  time: string;
  text?: string;
  type: PostType;
  mediaUrls?: string[];        // real image URLs from storage
  mediaAspect?: number | null; // natural width / height of mediaUrls[0] (video posts)
  mediaColor?: string;
  duration?: string;
  song?: string;
  artist?: string;
  songId?: string;
  songUrl?: string | null;      // source streaming link to open (multi-provider posts)
  songProvider?: string | null; // "spotify" | "appleMusic" | "youtube" | "soundcloud"
  songLinks?: { platform: string; url: string }[] | null; // all platforms Odesli matched
  albumArt?: string | null;     // real album-art URL from Spotify
  albumColor?: string;
  albumAccent?: string;
  previewUrl?: string | null;   // 30s preview audio cached in our post-media bucket
  likes: number;
  comments: number;
  shares: number;
  /** Count of users who have reposted this. Optional — older mocks may omit it. */
  reposts?: number;
  pollQuestion?: string;
  pollOptions?: PollOption[];
  totalVotes?: number;
  voiceUrl?: string | null;
  voiceDurationMs?: number | null;
  voiceWaveform?: number[] | null;
};

export type DummyComment = {
  id: string;
  user: string;
  initials: string;
  color: string;
  time: string;
  text: string;
  likes: number;
};

export type DummyPlaylist = {
  id: string;
  name: string;
  tracks: number;
  color: string;
  accent: string;
  source: string;
  sourceColor: string;
  duration: string;
};

export type DummySong = {
  id: string;
  title: string;
  artist: string;
  color: string;
};

export type CarouselItem = {
  id: string;
  type: "event" | "song" | "artist";
  badge: string;
  title: string;
  sub: string;
  tags: string[];
  cta: string;
  ctaId: string;
  gradient: [string, string, string];
  deco1: string;
  deco2: string;
};



// ─── Now Playing stories ─────────────────────────────────────────────────────

export type NowPlayingStory = {
  id: string;
  user: string;
  song: string;
  artist: string;
  color: string;
  initials: string;
};

export const NOW_PLAYING_STORIES: NowPlayingStory[] = [
  { id: "np1", user: "maya_v",  song: "Essence",           artist: "Wizkid",          color: "#FF6B35", initials: "M" },
  { id: "np2", user: "jaykay",  song: "APT.",               artist: "ROSÉ",            color: "#AB00FF", initials: "J" },
  { id: "np3", user: "tolu",    song: "Calm Down",          artist: "Rema",            color: "#CAFF00", initials: "T" },
  { id: "np4", user: "seren",   song: "Slow Burn",          artist: "K. Musgraves",    color: "#FF3CAC", initials: "S" },
  { id: "np5", user: "nate_x",  song: "Stargazing",         artist: "Migos",           color: "#00C2FF", initials: "N" },
  { id: "np6", user: "ayo",     song: "Bloody Samaritan",   artist: "Ayra Starr",      color: "#7B61FF", initials: "A" },
  { id: "np7", user: "priya",   song: "Espresso",           artist: "S. Carpenter",    color: "#FF6B35", initials: "P" },
];

// The signed-in user's currently playing track (used in the composer banner)
export const MY_NOW_PLAYING = {
  song:   "Kini Mereka Tahu",
  artist: "Bernadya",
  color:  "#AB00FF",
};

// ─── Feed data ────────────────────────────────────────────────────────────────

export const POSTS: Post[] = [
  {
    id: "1", user: "maya_v", handle: "@maya_v", initials: "M",
    avatarColor: "#AB00FF", bio: "sharing what i hear 🎧", time: "2m ago",
    type: "music", text: "this one hits different at 2am 🌙",
    song: "Kini Mereka Tahu", artist: "Bernadya",
    albumColor: "#1a0a2e", albumAccent: "#c084fc",
    likes: 84, comments: 12, shares: 3,
  },
  {
    id: "2", user: "jaykay", handle: "@jaykay", initials: "J",
    avatarColor: "#FF6B35", bio: "music photographer", time: "8m ago",
    type: "poll", text: "settling this once and for all 👇",
    pollQuestion: "Best era of Kanye?",
    pollOptions: [
      { id: "a", label: "College Dropout / Late Reg", votes: 412 },
      { id: "b", label: "808s & Heartbreak",           votes: 198 },
      { id: "c", label: "My Beautiful Dark Twisted Fantasy", votes: 531 },
      { id: "d", label: "Yeezus",                      votes: 89  },
    ],
    totalVotes: 1230, likes: 210, comments: 34, shares: 11,
  },
  {
    id: "3", user: "tolu", handle: "@tolu", initials: "T",
    avatarColor: "#CAFF00", bio: "playlist archivist", time: "15m ago",
    type: "text",
    text: "summer is not real without Espresso by Sabrina Carpenter. it should be illegal to not have it on a playlist rn.",
    likes: 56, comments: 7, shares: 2,
  },
  {
    id: "4", user: "seren", handle: "@seren", initials: "S",
    avatarColor: "#AB00FF", bio: "live music always", time: "22m ago",
    type: "video", text: "live snippet from last night 🎶",
    mediaColor: "#0a0030", duration: "0:42",
    likes: 133, comments: 21, shares: 8,
  },
  {
    id: "5", user: "nate_x", handle: "@nate_x", initials: "N",
    avatarColor: "#FF6B35", bio: "hip hop head", time: "41m ago",
    type: "music", song: "Stargazing", artist: "Migos",
    albumColor: "#1a1000", albumAccent: "#CAFF00",
    text: "classic. no debate.",
    likes: 47, comments: 5, shares: 1,
  },
  {
    id: "6", user: "ayo", handle: "@ayo", initials: "A",
    avatarColor: "#CAFF00", bio: "vinyl & vibes", time: "1h ago",
    type: "image", text: "vinyl haul 🍑", mediaColor: "#001a0f",
    likes: 298, comments: 44, shares: 19,
  },
  {
    id: "7", user: "priya", handle: "@priya", initials: "P",
    avatarColor: "#AB00FF", bio: "alt country girlie", time: "1h ago",
    type: "music", song: "Slow Burn", artist: "Kacey Musgraves",
    albumColor: "#2a1000", albumAccent: "#FF6B35",
    text: "perfect drive song. no notes.",
    likes: 91, comments: 18, shares: 6,
  },
  {
    id: "8", user: "dan.b", handle: "@dan.b", initials: "D",
    avatarColor: "#FF6B35", bio: "sunday gospel only", time: "2h ago",
    type: "poll", text: "real talk 👂",
    pollQuestion: "Do you actually read lyrics?",
    pollOptions: [
      { id: "a", label: "Always, first thing",        votes: 344 },
      { id: "b", label: "Only if I don't understand", votes: 201 },
      { id: "c", label: "Never, vibe > words",        votes: 155 },
    ],
    totalVotes: 700, likes: 402, comments: 63, shares: 44,
  },
];

export const DUMMY_COMMENTS: DummyComment[] = [
  { id: "c1", user: "maya_v", initials: "MV", color: "#AB00FF", time: "2m",  text: "This track is everything omg 🔥",                    likes: 14 },
  { id: "c2", user: "jaykay", initials: "JK", color: "#00C2FF", time: "5m",  text: "bro I've had this on repeat all week",                likes: 8  },
  { id: "c3", user: "tolu",   initials: "TL", color: "#FF6B35", time: "11m", text: "Finally someone posting actual music taste here",     likes: 22 },
  { id: "c4", user: "seren",  initials: "SR", color: "#00E5A0", time: "18m", text: "The bridge hits different at 2am ngl",                likes: 31 },
  { id: "c5", user: "nate_x", initials: "NX", color: "#FF3CAC", time: "34m", text: "W post, instant add to playlist",                    likes: 6  },
  { id: "c6", user: "ayo",    initials: "AY", color: "#FFD700", time: "1h",  text: "okay who is this artist, I need more",               likes: 19 },
  { id: "c7", user: "priya",  initials: "PR", color: "#7B61FF", time: "2h",  text: "the production on this is insane",                   likes: 45 },
];

// ─── Composer ─────────────────────────────────────────────────────────────────

export const FAKE_PHOTO_COLORS = ["#3a1800", "#1a0030", "#001a0f", "#1a1000", "#2a0050", "#001520"];

// ─── Discover ─────────────────────────────────────────────────────────────────

export const DISCOVER_FILTERS = ["All", "Artists", "Events"];

export const CAROUSEL_CARD_W = SW - 48;
export const CAROUSEL_GAP    = 12;

export const CAROUSEL_ITEMS: CarouselItem[] = [
  {
    id: "c1", type: "event", badge: "🔥 Trending Now",
    title: "Night Frequencies", sub: "The Loft, Lagos · 24 MAY",
    tags: ["Electronic", "Ambient"], cta: "Join Meet", ctaId: "m1",
    gradient: ["#2A004A", "#AB00FF", "#3D006B"],
    deco1: "rgba(202,255,0,0.12)", deco2: "rgba(171,0,255,0.2)",
  },
  {
    id: "c2", type: "song", badge: "🎵 Top Track",
    title: "Kini Mereka Tahu", sub: "Bernadya · Indie Pop",
    tags: ["Indie", "Indonesian"], cta: "Add to Queue", ctaId: "song1",
    gradient: ["#1A0800", "#FF6B35", "#4A1500"],
    deco1: "rgba(202,255,0,0.1)", deco2: "rgba(255,107,53,0.2)",
  },
  {
    id: "c3", type: "artist", badge: "⭐ Rising Artist",
    title: "Tems", sub: "Afro Soul · 2.4M listeners this week",
    tags: ["Afro Soul", "R&B"], cta: "Follow", ctaId: "tems",
    gradient: ["#001520", "#00C2FF", "#003040"],
    deco1: "rgba(0,194,255,0.12)", deco2: "rgba(202,255,0,0.15)",
  },
  {
    id: "c4", type: "event", badge: "📍 Near You",
    title: "Street Frequencies", sub: "Eko Atlantic, Lagos · 30 MAY",
    tags: ["Afrobeats", "Hip-Hop"], cta: "Join Meet", ctaId: "m2",
    gradient: ["#1A0010", "#FF3CAC", "#4A0028"],
    deco1: "rgba(255,60,172,0.12)", deco2: "rgba(202,255,0,0.1)",
  },
];

export const TRENDING_ARTISTS = [
  { id: "a1", name: "Bernadya",   genre: "Indie Pop",  color: "#AB00FF", initials: "B", user: "maya_v"  },
  { id: "a2", name: "Tems",       genre: "Afro Soul",  color: "#FF6B35", initials: "T", user: "tolu"    },
  { id: "a3", name: "Rema",       genre: "Afrobeats",  color: "#CAFF00", initials: "R", user: "nate_x"  },
  { id: "a4", name: "Sarz",       genre: "Producer",   color: "#00C2FF", initials: "S", user: "seren"   },
  { id: "a5", name: "Ayra Starr", genre: "Afropop",    color: "#FF3CAC", initials: "A", user: "ayo"     },
];

export const FOR_YOU_RECS = [
  { id: "fy1", type: "song",  title: "Essence",          artist: "Wizkid ft. Tems", genre: "Afropop",   color: "#FF6B35", duration: "3:33", user: "ayo"    },
  { id: "fy2", type: "video", title: "Better Days",      artist: "Rema",            genre: "Afrobeats", color: "#AB00FF", duration: "4:12", user: "nate_x" },
  { id: "fy3", type: "song",  title: "Bloody Samaritan", artist: "Ayra Starr",      genre: "Afropop",   color: "#FF3CAC", duration: "2:58", user: "priya"  },
  { id: "fy4", type: "video", title: "Rush",             artist: "Ayra Starr",      genre: "Afropop",   color: "#00C2FF", duration: "3:45", user: "dan.b"  },
  { id: "fy5", type: "song",  title: "Calm Down",        artist: "Rema",            genre: "Afrobeats", color: "#CAFF00", duration: "3:59", user: "jaykay" },
];

export const UPCOMING_MEETS = [
  {
    id: "m1", title: "Night Frequencies", subtitle: "An intimate listening session",
    tags: ["Electronic", "Ambient"], date: "SAT\n24 MAY",
    location: "The Loft, Lagos", attending: 142, color: "#AB00FF", accentColor: "#CAFF00",
  },
  {
    id: "m2", title: "Street Frequencies", subtitle: "Open-air music & vibes",
    tags: ["Afrobeats", "Hip-Hop"], date: "FRI\n30 MAY",
    location: "Eko Atlantic, Lagos", attending: 318, color: "#FF6B35", accentColor: "#AB00FF",
  },
  {
    id: "m3", title: "Quiet Hours", subtitle: "Lo-fi & chill sounds",
    tags: ["Lo-Fi", "Jazz"], date: "SUN\n1 JUN",
    location: "Terra Kulture, Lagos", attending: 89, color: "#00C2FF", accentColor: "#CAFF00",
  },
];

// ─── Meets / Streams ──────────────────────────────────────────────────────────

export type MeetStream = {
  id: string;
  title: string;
  host: string;
  type: "video" | "audio";
  isLive: boolean;
  isMeet: boolean;
  viewers: number;
  color: string;
  accentColor: string;
  user: string;
  tags: string[];
  tall: boolean;
};

export const MEETS_STREAMS: MeetStream[] = [
  { id: "ms1", title: "Late Night Lo-Fi Session",           host: "maya_v", type: "audio", isLive: true,  isMeet: false, viewers: 9120,  color: "#AB00FF", accentColor: "#CAFF00", user: "maya_v", tags: ["Lo-Fi", "Chill"],        tall: true  },
  { id: "ms2", title: "Afrobeats & Cooking Live",           host: "jaykay", type: "video", isLive: true,  isMeet: false, viewers: 100200,color: "#FF6B35", accentColor: "#CAFF00", user: "jaykay", tags: ["Afrobeats", "Live"],     tall: false },
  { id: "ms3", title: "Producing with Sarz – Open Session", host: "seren",  type: "video", isLive: true,  isMeet: true,  viewers: 89100, color: "#1a0a30", accentColor: "#AB00FF", user: "seren",  tags: ["Production", "Hip-Hop"], tall: false },
  { id: "ms4", title: "Vinyl Crate Dig – Jazz Edition",     host: "tolu",   type: "video", isLive: true,  isMeet: true,  viewers: 2200,  color: "#00C2FF", accentColor: "#CAFF00", user: "tolu",   tags: ["Vinyl", "Jazz"],         tall: true  },
  { id: "ms5", title: "Indie Pop Listening Party 🎧",       host: "priya",  type: "audio", isLive: true,  isMeet: true,  viewers: 3300,  color: "#FF3CAC", accentColor: "#CAFF00", user: "priya",  tags: ["Indie", "Pop"],          tall: false },
  { id: "ms6", title: "Road Trip Radio – Afrobeats Mix",    host: "nate_x", type: "audio", isLive: false, isMeet: true,  viewers: 38200, color: "#FF6B35", accentColor: "#CAFF00", user: "nate_x", tags: ["Road Trip", "Mix"],      tall: false },
  { id: "ms7", title: "Quiet Hours: Sleep Sounds",          host: "ayo",    type: "audio", isLive: true,  isMeet: false, viewers: 5100,  color: "#7B61FF", accentColor: "#CAFF00", user: "ayo",    tags: ["Ambient", "Sleep"],      tall: true  },
  { id: "ms8", title: "The Dan.B Show – Episode 12",        host: "dan.b",  type: "video", isLive: true,  isMeet: false, viewers: 12400, color: "#1a1200", accentColor: "#FF6B35", user: "dan.b",  tags: ["Talk", "Music"],         tall: false },
];

// ─── Messages / DMs ──────────────────────────────────────────────────────────

export type DirectMessage = {
  id: string;
  user: string;
  name: string;
  preview: string;
  time: string;
  unread: number;
  online: boolean;
};

export const DIRECT_MESSAGES: DirectMessage[] = [
  { id: "dm1", user: "maya_v",  name: "maya_v",  preview: "Hey! Just wanted to check if we're still on for tomorrow. Let me know what time works…", time: "10:24",     unread: 2,  online: true  },
  { id: "dm2", user: "jaykay",  name: "jaykay",  preview: "That track you dropped last night was absolute fire 🔥",                                  time: "9:58",      unread: 12, online: true  },
  { id: "dm3", user: "tolu",    name: "tolu",    preview: "I've been thinking about the project updates and I believe we should reorganize…",        time: "9:30",      unread: 4,  online: false },
  { id: "dm4", user: "seren",   name: "seren",   preview: "Yesss 🤌",                                                                                time: "8:45",      unread: 1,  online: true  },
  { id: "dm5", user: "nate_x",  name: "nate_x",  preview: "I saw the pictures from your vinyl haul. Where did you find that pressing?",             time: "8:12",      unread: 0,  online: false },
  { id: "dm6", user: "ayo",     name: "ayo",     preview: "Traffic was awful this morning, I'll probably be running a little late 😅",              time: "Yesterday", unread: 0,  online: false },
  { id: "dm7", user: "priya",   name: "priya",   preview: "Don't forget that the deadline for the collab application is coming up soon…",           time: "Yesterday", unread: 0,  online: true  },
  { id: "dm8", user: "dan.b",   name: "dan.b",   preview: "That's a vibe for sure! With moving late into the night…",                              time: "Mon",       unread: 0,  online: false },
];

// ─── Group Chats ──────────────────────────────────────────────────────────────

export type GroupChat = {
  id: string;
  name: string;
  members: string[];
  preview: string;
  sender: string;
  time: string;
  unread: number;
  color: string;
  memberCount: number;
};

export const GROUP_CHATS: GroupChat[] = [
  { id: "gc1", name: "Afrobeats Heads 🥁",   members: ["maya_v", "jaykay", "tolu"],          preview: "Did everyone listen to the new Rema album yet?",   sender: "maya_v", time: "10:30",     unread: 6, color: "#CAFF00", memberCount: 8  },
  { id: "gc2", name: "Vinyl Collectors Club", members: ["ayo", "seren", "dan.b"],             preview: "Just copped a rare pressing from the 70s 🎶",       sender: "ayo",    time: "9:45",      unread: 3, color: "#FF6B35", memberCount: 24 },
  { id: "gc3", name: "Producer Hub",          members: ["nate_x", "priya", "jaykay"],         preview: "Anyone free for a recording session this week?",    sender: "nate_x", time: "8:00",      unread: 0, color: "#AB00FF", memberCount: 31 },
  { id: "gc4", name: "Late Night Listeners",  members: ["priya", "tolu", "seren"],            preview: "This playlist hits different at 2am ngl",           sender: "tolu",   time: "Yesterday", unread: 0, color: "#00C2FF", memberCount: 5  },
  { id: "gc5", name: "Track Meet OGs 🎧",     members: ["maya_v", "ayo", "nate_x", "dan.b"], preview: "Who's coming to Night Frequencies on the 24th?",   sender: "dan.b",  time: "Mon",       unread: 0, color: "#FF3CAC", memberCount: 12 },
];

export type ChatMessage = {
  id: string;
  text: string;
  time: string;
  fromMe: boolean;
  type?: 'text' | 'spotify_track';
  spotifyTrack?: {
    id: string;
    name: string;
    artist: string;
    albumArt: string | null;
  };
};

export const CHAT_MESSAGES: Record<string, ChatMessage[]> = {
  dm1: [
    { id: "dm1-1", text: "Hey! Hope you're good 😊",                                           time: "10:15", fromMe: false },
    { id: "dm1-2", text: "Always! What's up?",                                                  time: "10:16", fromMe: true  },
    { id: "dm1-3", text: "Just wanted to check if we're still on for tomorrow.",                time: "10:19", fromMe: false },
    { id: "dm1-4", text: "Let me know what time works best for you",                            time: "10:20", fromMe: false },
    { id: "dm1-5", text: "Absolutely! Was just thinking about that 😄",                         time: "10:22", fromMe: true  },
    { id: "dm1-6", text: "I'm free from 2pm onwards — does that work?",                        time: "10:22", fromMe: true  },
    { id: "dm1-7", text: "Perfect! 2pm it is 🎉",                                               time: "10:24", fromMe: false },
    { id: "dm1-8", text: "Can't wait!",                                                          time: "10:24", fromMe: false },
  ],
  dm2: [
    { id: "dm2-1", text: "bro that set last night was unreal",                                  time: "9:35",  fromMe: false },
    { id: "dm2-2", text: "which part hit hardest for you?",                                     time: "9:36",  fromMe: false },
    { id: "dm2-3", text: "when the bass dropped at the 40 min mark 🔥",                         time: "9:42",  fromMe: true  },
    { id: "dm2-4", text: "exactly!! I had to rewind it 3 times",                                time: "9:44",  fromMe: false },
    { id: "dm2-5", text: "That track you dropped last night was absolute fire 🔥",              time: "9:58",  fromMe: false },
    { id: "dm2-6", text: "what's the name of that last track? I need it in my life",            time: "9:58",  fromMe: false },
    { id: "dm2-7", text: "", time: "10:01", fromMe: true, type: "spotify_track",
      spotifyTrack: { id: "4uLU6hMCjMI75M1A2tKUQC", name: "SICKO MODE", artist: "Travis Scott", albumArt: null } },
    { id: "dm2-8", text: "this one 🔥",                                                          time: "10:01", fromMe: true  },
  ],
  dm3: [
    { id: "dm3-1", text: "Hey, got a min to chat about the project?",                           time: "9:10",  fromMe: false },
    { id: "dm3-2", text: "Sure, what's on your mind?",                                          time: "9:15",  fromMe: true  },
    { id: "dm3-3", text: "I've been thinking about the project updates",                        time: "9:25",  fromMe: false },
    { id: "dm3-4", text: "and I believe we should reorganize the timeline a bit",               time: "9:26",  fromMe: false },
    { id: "dm3-5", text: "Makes sense — what changes are you thinking?",                        time: "9:28",  fromMe: true  },
    { id: "dm3-6", text: "Let's hop on a call later today?",                                    time: "9:30",  fromMe: false },
  ],
  dm4: [
    { id: "dm4-1", text: "Did you see the set list for Night Frequencies? 👀",                  time: "8:30",  fromMe: true  },
    { id: "dm4-2", text: "Yesss 🤌",                                                            time: "8:45",  fromMe: false },
    { id: "dm4-3", text: "So you're going right?!",                                             time: "8:46",  fromMe: true  },
    { id: "dm4-4", text: "obviously!! front row 🎶",                                            time: "8:47",  fromMe: false },
  ],
  dm5: [
    { id: "dm5-1", text: "Vinyl haul from yesterday was unreal",                                time: "7:50",  fromMe: true  },
    { id: "dm5-2", text: "I saw the pictures you posted!",                                      time: "8:05",  fromMe: false },
    { id: "dm5-3", text: "Where did you find that pressing?",                                   time: "8:12",  fromMe: false },
    { id: "dm5-4", text: "That 70s jazz section in that shop is hidden gold",                   time: "8:12",  fromMe: false },
  ],
  dm6: [
    { id: "dm6-1", text: "Still coming to the collab session today?",                           time: "8:00",  fromMe: true  },
    { id: "dm6-2", text: "Traffic was awful this morning",                                       time: "8:10",  fromMe: false },
    { id: "dm6-3", text: "I'll probably be running a little late 😅",                           time: "8:12",  fromMe: false },
    { id: "dm6-4", text: "No worries, we'll hold it down 🙌",                                   time: "8:14",  fromMe: true  },
  ],
  dm7: [
    { id: "dm7-1", text: "Hey! Working on something exciting 🎵",                               time: "14:20", fromMe: false },
    { id: "dm7-2", text: "Ooh spill 👀",                                                        time: "14:25", fromMe: true  },
    { id: "dm7-3", text: "Don't forget the deadline for the collab application is coming up", time: "14:30", fromMe: false },
    { id: "dm7-4", text: "I'd recommend submitting yours by Wednesday",                         time: "14:31", fromMe: false },
    { id: "dm7-5", text: "On it! Thanks for the heads up 🙏",                                   time: "14:35", fromMe: true  },
  ],
  dm8: [
    { id: "dm8-1", text: "The new episode just dropped!",                                       time: "11:00", fromMe: false },
    { id: "dm8-2", text: "Just listened — the interview segment was 🔥",                        time: "12:00", fromMe: true  },
    { id: "dm8-3", text: "That's a vibe for sure!",                                             time: "12:05", fromMe: false },
    { id: "dm8-4", text: "With moving late into the night things got real",                     time: "12:05", fromMe: false },
  ],
};

// ─── Profile ──────────────────────────────────────────────────────────────────

export const PROFILE_TABS = ["Posts", "Reposts", "Playlists"] as const;
export type ProfileTab = typeof PROFILE_TABS[number];

export const PROFILE_POSTS    = POSTS.slice(0, 3);
export const PROFILE_REPOSTS  = POSTS.slice(3, 5);

export const DUMMY_PLAYLISTS: DummyPlaylist[] = [
  { id: "pl1", name: "Late Night Drives", tracks: 24, color: "#1a0a2e", accent: "#AB00FF", source: "Spotify",     sourceColor: "#1DB954", duration: "1 hr 26 min" },
  { id: "pl2", name: "Morning Energy",    tracks: 18, color: "#1a1400", accent: "#CAFF00", source: "Apple Music", sourceColor: "#FC3C44", duration: "58 min"      },
  { id: "pl3", name: "Afrobeats Only",    tracks: 32, color: "#001a0a", accent: "#00E5A0", source: "Spotify",     sourceColor: "#1DB954", duration: "2 hr 4 min"  },
  { id: "pl4", name: "Chill Sundays",     tracks: 15, color: "#001520", accent: "#00C2FF", source: "trackmeet",   sourceColor: "#AB00FF", duration: "48 min"      },
  { id: "pl5", name: "Rap Rotation",      tracks: 41, color: "#1a0800", accent: "#FF6B35", source: "Spotify",     sourceColor: "#1DB954", duration: "2 hr 38 min" },
  { id: "pl6", name: "Girl Math",         tracks: 27, color: "#1a001a", accent: "#FF3CAC", source: "Apple Music", sourceColor: "#FC3C44", duration: "1 hr 42 min" },
];

export const ALL_SONGS: DummySong[] = [
  { id: "s1",  title: "Overcompensate (edit)",   artist: "Twenty One Pilots",      color: "#FF6B35" },
  { id: "s2",  title: "Like What (Freestyle)",    artist: "Cardi B",                color: "#00E5A0" },
  { id: "s3",  title: "Slow It Down",             artist: "Benson Boone",           color: "#AB00FF" },
  { id: "s4",  title: "Espresso",                 artist: "Sabrina Carpenter",      color: "#FF3CAC" },
  { id: "s5",  title: "Stargazing",               artist: "Migos",                  color: "#CAFF00" },
  { id: "s6",  title: "Slow Burn",                artist: "Kacey Musgraves",        color: "#FF6B35" },
  { id: "s7",  title: "Kini Mereka Tahu",         artist: "Bernadya",               color: "#00C2FF" },
  { id: "s8",  title: "Die With A Smile",         artist: "Lady Gaga & Bruno Mars", color: "#7B61FF" },
  { id: "s9",  title: "APT.",                     artist: "ROSÉ & Bruno Mars",      color: "#FF6C1A" },
  { id: "s10", title: "Good Luck, Babe!",         artist: "Chappell Roan",          color: "#00E5A0" },
  { id: "s11", title: "Please Please Please",     artist: "Sabrina Carpenter",      color: "#FF3CAC" },
  { id: "s12", title: "Luther",                   artist: "Kendrick Lamar",         color: "#CAFF00" },
];

export const PLAYLIST_SONGS: Record<string, DummySong[]> = {
  pl1: ALL_SONGS.slice(0, 5),
  pl2: ALL_SONGS.slice(2, 7),
  pl3: ALL_SONGS.slice(4, 9),
  pl4: ALL_SONGS.slice(1, 6),
  pl5: ALL_SONGS.slice(6, 11),
  pl6: ALL_SONGS.slice(3, 8),
};

// ─── Utilities ────────────────────────────────────────────────────────────────

export const fmtCount = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`;
