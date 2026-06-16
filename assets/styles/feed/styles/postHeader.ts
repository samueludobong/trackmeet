import { StyleSheet } from "react-native";
import { BOTTOM_INSET, NAVBAR_H, SW } from "../../../../lib/feed/dimensions";

// Post header
export const postHeader = StyleSheet.create({
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  postAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  postAvatarText: { fontSize: 17, fontWeight: "800" },
  postUser: { fontSize: 14, fontWeight: "700", color: "#fff", marginBottom: 2 },
  postBio: { fontSize: 12, color: "#888", lineHeight: 16 },
  postText: {
    fontSize: 18,
    color: "#fff",
    lineHeight: 24,
    paddingHorizontal: 16,
    marginBottom: 12,
    fontWeight: "300",
  },

});
