// Universal "paste a streaming link → song-card metadata" resolver.
//
// A pasted link from any supported provider is resolved through Odesli /
// song.link (https://api.song.link) — one request normalizes the link into the
// title / artist / artwork our MusicCard needs, AND hands back a Spotify match
// when one exists, so the existing 30s-preview, Add-to-Playlist and in-app
// track-swap paths keep working for cross-provider posts. No API keys required.

export type MusicProvider = "spotify" | "appleMusic" | "youtube" | "soundcloud";

/** One streaming platform Odesli matched for a song (key as Odesli reports it). */
export type PlatformLink = { platform: string; url: string };

export type ParsedMusicLink = {
  name: string;
  artist: string;
  albumArt: string | null;
  /** Source streaming URL the card's open button should launch (provider-specific). */
  url: string;
  provider: MusicProvider;
  /** Spotify track id when Odesli found a Spotify match — enables the 30s
   *  preview, Add-to-Playlist and in-app track swap. Null for songs Odesli
   *  could only find on a non-Spotify provider. */
  spotifyId: string | null;
  /** Every streaming platform Odesli matched (including the original), so the
   *  card can offer "open in <your platform>" alternatives. */
  links: PlatformLink[];
};

// Display glyph + accent + label per supported provider (shared by composer
// chips and cards). `icon` is a FontAwesome5 brand name.
export const PROVIDER_DISPLAY: Record<MusicProvider, { icon: string; color: string; label: string }> = {
  spotify:    { icon: "spotify",    color: "#1DB954", label: "Spotify" },
  appleMusic: { icon: "apple",      color: "#FC3C44", label: "Apple Music" },
  youtube:    { icon: "youtube",    color: "#FF0000", label: "YouTube" },
  soundcloud: { icon: "soundcloud", color: "#FF5500", label: "SoundCloud" },
};

// Host patterns → provider. First match wins. The `(^|[^\w])` boundary lets a
// domain match whether it follows `//` (e.g. https://music.apple.com), a `.`
// (a subdomain like open.spotify.com), or sits at the very start of the string.
const PROVIDER_PATTERNS: { provider: MusicProvider; re: RegExp }[] = [
  { provider: "spotify",    re: /(^|[^\w])spotify\.com|^spotify:|(^|[^\w])spotify\.link/i },
  { provider: "appleMusic", re: /(^|[^\w])(music|itunes)\.apple\.com/i },
  { provider: "youtube",    re: /(^|[^\w])youtube\.com|(^|[^\w])youtu\.be/i },
  { provider: "soundcloud", re: /(^|[^\w])soundcloud\.com/i },
];

const URL_RE = /\bhttps?:\/\/[^\s]+/gi;

/** The provider for a URL if it's one we support, else null. */
export function detectMusicProvider(url: string): MusicProvider | null {
  for (const { provider, re } of PROVIDER_PATTERNS) if (re.test(url)) return provider;
  return null;
}

/** First supported music URL found in arbitrary text (e.g. a pasted caption). */
export function extractFirstMusicUrl(text: string): string | null {
  const matches = text.match(URL_RE);
  if (!matches) return null;
  for (const m of matches) {
    const clean = m.replace(/[)\].,!?'"]+$/, ""); // strip trailing punctuation
    if (detectMusicProvider(clean)) return clean;
  }
  return null;
}

// Our provider → the Odesli `linksByPlatform` keys to prefer for the source URL.
const ODESLI_PLATFORM_KEYS: Record<MusicProvider, string[]> = {
  spotify:    ["spotify"],
  appleMusic: ["appleMusic", "itunes"],
  youtube:    ["youtubeMusic", "youtube"],
  soundcloud: ["soundcloud"],
};

const SPOTIFY_SONG_PREFIX = "SPOTIFY_SONG::";

// Purchase / store destinations Odesli also returns — not streaming, so we drop
// them from the "listen on" alternatives.
const NON_STREAMING_PLATFORMS = new Set(["amazonStore", "itunes"]);

/**
 * Resolve a pasted streaming link into the metadata our music post card needs.
 * Returns null when the link isn't a supported music link, or when Odesli
 * can't resolve it — callers should treat that as plain text.
 */
export async function resolveMusicLink(url: string): Promise<ParsedMusicLink | null> {
  const provider = detectMusicProvider(url);
  if (!provider) return null;

  try {
    const res = await fetch(
      `https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(url)}&userCountry=US`,
    );
    if (!res.ok) return null;
    const data = await res.json();

    const entities: Record<string, any> = data.entitiesByUniqueId ?? {};
    const links: Record<string, any>    = data.linksByPlatform ?? {};

    // Prefer Spotify's entity for clean title/artist + a usable track id;
    // otherwise fall back to whatever Odesli flagged as the primary entity.
    const spotifyUid: string | undefined = links.spotify?.entityUniqueId;
    const entity =
      (spotifyUid && entities[spotifyUid]) || entities[data.entityUniqueId];
    if (!entity) return null;

    const spotifyId = spotifyUid?.startsWith(SPOTIFY_SONG_PREFIX)
      ? spotifyUid.slice(SPOTIFY_SONG_PREFIX.length)
      : null;

    // Source URL to open: the pasted provider's link when Odesli has it, then
    // the cross-platform page, then the original paste as a last resort.
    const sourceUrl =
      ODESLI_PLATFORM_KEYS[provider].map((k) => links[k]?.url).find(Boolean) ??
      data.pageUrl ??
      url;

    // Every streaming platform Odesli matched, for the "listen on" alternatives.
    const allLinks: PlatformLink[] = Object.entries(links)
      .filter(([key, v]) => (v as any)?.url && !NON_STREAMING_PLATFORMS.has(key))
      .map(([platform, v]) => ({ platform, url: (v as any).url }));

    return {
      name:     entity.title ?? "Unknown title",
      artist:   entity.artistName ?? "",
      albumArt: entity.thumbnailUrl ?? null,
      url:      sourceUrl,
      provider,
      spotifyId,
      links:    allLinks,
    };
  } catch {
    return null;
  }
}
