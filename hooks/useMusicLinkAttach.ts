import { useRef, useState } from "react";
import { resolveMusicLink, extractFirstMusicUrl, type ParsedMusicLink } from "../lib/musicLink";

type TextSetter = (updater: (cur: string) => string) => void;

/**
 * Shared "paste a streaming link → attach a song card" behavior for any text
 * composer (feed quick-post, comments, chats). Detects a music URL as it's
 * typed/pasted, resolves it through Odesli after a short debounce, attaches the
 * resolved song, and strips the URL out of the field so it becomes a caption.
 *
 * Usage from a composer's onChangeText:
 *   onChangeText={(t) => { setText(t); link.detect(t, setText); }}
 * where `setText` is the field's React state setter (functional updates used).
 */
export function useMusicLinkAttach() {
  const [attachedLink, setAttachedLink] = useState<ParsedMusicLink | null>(null);
  const [parsingLink,  setParsingLink]  = useState(false);
  const timer        = useRef<ReturnType<typeof setTimeout> | null>(null);
  const parsedUrlRef = useRef<string | null>(null);

  const resolve = async (url: string, setText: TextSetter) => {
    parsedUrlRef.current = url;
    setParsingLink(true);
    try {
      const parsed = await resolveMusicLink(url);
      if (parsed) {
        setAttachedLink(parsed);
        setText((cur) => cur.replace(url, "").replace(/\s{2,}/g, " ").trim());
      }
      // Non-music / unresolved: leave the text untouched (posts as plain text).
    } finally {
      setParsingLink(false);
    }
  };

  /** Call after updating your own text state. Schedules a debounced resolve. */
  const detect = (next: string, setText: TextSetter) => {
    if (attachedLink || parsingLink) return; // already have / resolving an attachment
    const url = extractFirstMusicUrl(next);
    if (!url || url === parsedUrlRef.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => resolve(url, setText), 350);
  };

  /** Detach the current song; allow a future identical paste to re-parse. */
  const removeAttachedLink = () => { setAttachedLink(null); parsedUrlRef.current = null; };

  /** Full reset (e.g. after a successful send). */
  const reset = () => {
    setAttachedLink(null);
    setParsingLink(false);
    parsedUrlRef.current = null;
    if (timer.current) clearTimeout(timer.current);
  };

  return { attachedLink, setAttachedLink, parsingLink, detect, removeAttachedLink, reset };
}

export type { ParsedMusicLink };
