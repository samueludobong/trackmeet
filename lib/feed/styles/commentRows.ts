import { StyleSheet } from "react-native";
import { BOTTOM_INSET, NAVBAR_H, SW } from "../dimensions";

// Comment rows
export const commentRows = StyleSheet.create({
  commentWrap: { position: "relative" },
  commentReplyHint: {
    position: "absolute",
    right: 18,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    gap: 2,
  },
  commentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#0D0D0D",
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  commentAvatarText: { fontSize: 13, fontWeight: "800" },
  commentBody: { flex: 1, gap: 3 },
  commentMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  commentHandle: { fontSize: 13, fontWeight: "700", color: "#fff" },
  commentTime: { fontSize: 11, color: "rgba(255,255,255,0.3)" },
  commentText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.82)",
    lineHeight: 20,
  },
  commentLikeBtn: {
    alignItems: "center",
    gap: 2,
    paddingLeft: 4,
    flexShrink: 0,
  },
  commentLikeIcon: { fontSize: 18, color: "rgba(255,255,255,0.3)" },
  commentLikeCount: {
    fontSize: 11,
    color: "rgba(255,255,255,0.35)",
    fontWeight: "600",
  },
  commentSeparator: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
    marginHorizontal: 16,
  },

});
