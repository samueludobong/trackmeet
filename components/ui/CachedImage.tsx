import { Image, type ImageContentFit, type ImageProps } from "expo-image";
import { IMAGE_CACHE_POLICY } from "../../lib/config";

type ResizeMode = "cover" | "contain" | "stretch" | "center" | "repeat";

const RESIZE_TO_FIT: Record<ResizeMode, ImageContentFit> = {
  cover: "cover",
  contain: "contain",
  stretch: "fill",
  center: "none",
  repeat: "cover",
};

export type CachedImageProps = ImageProps & {
  /** react-native Image compatibility — mapped to `contentFit` when set. */
  resizeMode?: ResizeMode;
};

/**
 * Drop-in replacement for remote `<Image>` that routes through expo-image's
 * native disk cache. Each remote URL is downloaded once and served from disk
 * thereafter (in Production), cutting repeated Supabase egress. The cache
 * policy is driven by EXPO_PUBLIC_DEVELOPMENT_STATUS via `lib/config`.
 *
 * Accepts react-native's `resizeMode` for easy migration (it's mapped to
 * `contentFit`; an explicit `contentFit` wins). Pass `recyclingKey={uri}` for
 * images inside recycled lists (feed, avatar rows) so a stale frame isn't shown
 * while the next source loads. Keep bundled `require(...)` images on
 * react-native's Image.
 */
export function CachedImage({ resizeMode, contentFit, ...props }: CachedImageProps) {
  return (
    <Image
      cachePolicy={IMAGE_CACHE_POLICY}
      contentFit={contentFit ?? (resizeMode ? RESIZE_TO_FIT[resizeMode] : undefined)}
      {...props}
    />
  );
}
