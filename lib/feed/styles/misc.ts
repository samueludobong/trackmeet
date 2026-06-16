import { StyleSheet } from "react-native";
import { BOTTOM_INSET, NAVBAR_H, SW } from "../dimensions";

export const moreOptionsStyles = StyleSheet.create({
  container: {
    backgroundColor: '#111111',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    marginTop: 2,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },
})

export const profileSStyles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 18,
    bottom: NAVBAR_H + BOTTOM_INSET + 14,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#FF6C1A",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF6C1A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
  fabMenuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
    alignItems: "flex-end",
    paddingRight: 18,
    paddingBottom: NAVBAR_H + BOTTOM_INSET + 152,
  },
  fabMenu: {
    width: 200,
    backgroundColor: "#1A1A1C",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  fabMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  fabMenuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,108,26,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  fabMenuTitle: { fontSize: 12, fontWeight: "500", color: "#fff" },
  fabMenuSub: { fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 2 },
  fabMenuDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
    marginHorizontal: 16,
  },
});

// Shared StyleSheet for the feed screen, extracted from app/feed.tsx.
