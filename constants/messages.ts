import { type MessagesTab } from "../types/messages";

export const MESSAGES_TABS: MessagesTab[] = ["Messages", "Group Chats"];

export type NavItem = {
  label: string;
  icon: string;
  iconActive: string;
};

// ─── Nav ──────────────────────────────────────────────────────────────────────

export const NAV_ITEMS: NavItem[] = [
  { label: "Feed",     icon: "grid-outline",         iconActive: "grid"          },
  { label: "Messages", icon: "chatbubble-outline",    iconActive: "chatbubble"    },
  { label: "Meets",    icon: "musical-notes-outline", iconActive: "musical-notes" },
  { label: "Discover", icon: "compass-outline",       iconActive: "compass"       },
  { label: "Profile",  icon: "person-outline",        iconActive: "person"        },
];