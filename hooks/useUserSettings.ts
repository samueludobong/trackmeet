import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

export type UserSettings = {
  muteAudioOnStart: boolean;
};

const DEFAULTS: UserSettings = { muteAudioOnStart: false };

/**
 * Wait until the Supabase client has a session token loaded from storage.
 * During cold start the client restores the session async; firing writes
 * before that lands sends them out unauthenticated, RLS drops them silently,
 * and the upsert appears to "succeed" because it's later retried internally
 * with empty results. Gating writes on a real session avoids that.
 */
async function waitForSession(timeoutMs = 4000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) return true;
    await new Promise((r) => setTimeout(r, 150));
  }
  return false;
}

export function useUserSettings(userId: string | null) {
  const [settings, setSettings] = useState<UserSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      // Same reasoning as updateSetting: wait for the auth session before
      // reading, otherwise the SELECT comes back empty under RLS.
      await waitForSession();
      const { data } = await supabase
        .from("user_settings")
        .select("mute_audio_on_start")
        .eq("user_id", userId)
        .maybeSingle();
      if (cancelled) return;
      if (data) setSettings({ muteAudioOnStart: data.mute_audio_on_start ?? false });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const updateSetting = useCallback(
    async (key: keyof UserSettings, value: boolean) => {
      if (!userId) return;
      // Optimistic update so the UI is snappy.
      setSettings((prev) => ({ ...prev, [key]: value }));
      const col = key === "muteAudioOnStart" ? "mute_audio_on_start" : key;

      const ready = await waitForSession();
      if (!ready) {
        console.error("[useUserSettings] no session; rolling back toggle");
        setSettings((prev) => ({ ...prev, [key]: !value }));
        return;
      }

      // Retry a couple of times in case the first write races with auth
      // refresh or a transient network blip during cold start.
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data, error } = await supabase
          .from("user_settings")
          .upsert(
            { user_id: userId, [col]: value, updated_at: new Date().toISOString() },
            { onConflict: "user_id" }
          )
          .select();
        if (!error && data && data.length > 0) return;
        if (error) console.warn(`[useUserSettings] attempt ${attempt + 1} failed:`, error.message);
        else      console.warn(`[useUserSettings] attempt ${attempt + 1} returned no rows`);
        await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
      }

      console.error("[useUserSettings] upsert failed after retries; rolling back");
      setSettings((prev) => ({ ...prev, [key]: !value }));
    },
    [userId]
  );

  return { settings, loading, updateSetting };
}
