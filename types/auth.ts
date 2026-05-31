export type Mode = "idle" | "signup" | "login" | "accounts";

export type SavedAccount = {
  email: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
};
