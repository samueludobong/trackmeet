// ─── Social platform config ───────────────────────────────────────────────────

export type SocialPlatform = {
  key: string;
  label: string;
  icon: string;            // FontAwesome5 icon name
  color: string;
  placeholder: string;
};

export const SOCIAL_PLATFORMS: SocialPlatform[] = [
  { key: "instagram",  label: "Instagram",   icon: "instagram",   color: "#ffffff", placeholder: "instagram.com/yourname" },
  { key: "x",          label: "X",           icon: "twitter",     color: "#ffffff", placeholder: "x.com/yourname" },
  { key: "tiktok",     label: "TikTok",      icon: "tiktok",      color: "#ffffff", placeholder: "tiktok.com/@yourname" },
  { key: "youtube",    label: "YouTube",     icon: "youtube",     color: "#ffffff", placeholder: "youtube.com/@channel" },
  { key: "soundcloud", label: "SoundCloud",  icon: "soundcloud",  color: "#ffffff", placeholder: "soundcloud.com/yourname" },
  { key: "snapchat",   label: "Snapchat",    icon: "snapchat",    color: "#ffffff", placeholder: "snapchat.com/yourname" },
  { key: "facebook",   label: "Facebook",    icon: "facebook",    color: "#ffffff", placeholder: "facebook.com/yourname" },
];

// Order in which platforms are shown on the profile banner (most relevant first)
export const BANNER_PLATFORM_PRIORITY = ["instagram", "x", "youtube", "tiktok", "snapchat", "soundcloud", "facebook"];
