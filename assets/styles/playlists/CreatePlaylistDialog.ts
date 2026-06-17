import { StyleSheet, Platform, Dimensions } from "react-native";
import { SW, SH, NAVBAR_H, BOTTOM_INSET, COMPOSER_ABOVE_NAV, COLLAGE_W, COLLAGE_GAP } from "../../../lib/feed/dimensions";
import { STREAM_CARD_GAP, STREAM_CARD_W, WAVE_HEIGHTS, CARD_AVATAR_SIZE, CARD_AVATAR_OVERLAP, CARD_BANNER_H, MSG_HEADER_H, TOGGLE_W, TOGGLE_H, THUMB_SIZE, THUMB_TRAVEL, PROFILE_BANNER_H, PROFILE_AVATAR_SIZE, PROFILE_AVATAR_OVERLAP, SWATCH_SIZE } from "../../../constants/feedLayout";

// Component-scoped StyleSheets extracted from app/feed.tsx.

/** Used by components/playlists/CreatePlaylistDialog.tsx. */
export const cpStyles = StyleSheet.create({
  // Filter pills
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.04)' },
  filterBtnActive: { borderColor: '#FF6C1A', backgroundColor: 'rgba(255,108,26,0.12)' },
  filterLabel: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.38)' },
  filterLabelActive: { color: '#FF6C1A' },
  // Create playlist button
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: 'rgba(255,108,26,0.07)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,108,26,0.18)', marginBottom: 6 },
  createBtnText: { fontSize: 14, fontWeight: '700', color: '#FF6C1A' },
  // Profile badge on card
  profileBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, backgroundColor: 'rgba(171,0,255,0.15)', marginRight: 2 },
  profileBadgeText: { fontSize: 10, fontWeight: '700', color: '#AB00FF' },
  // Dialog overlay + sheet
  dialogOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end' },
  // Bottom corners are rounded too â€” invisible when the sheet sits at the
  // screen edge, but visible when the keyboard lifts it up. Border swapped from
  // borderTopWidth to a full borderWidth so the rounded edges have the same
  // hairline outline as the top.
  dialogSheet: { backgroundColor: '#161618', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, paddingHorizontal: 20, paddingTop: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', maxHeight: SH * 0.88 },
  dialogHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'center', marginBottom: 20 },
  dialogTitle: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 18 },
  // Image picker
  imagePicker: { width: 90, height: 90, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 20, overflow: 'hidden' },
  imagePickerText: { fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 },
  // Form fields
  label: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.35)', letterSpacing: 0.9, marginBottom: 8 },
  input: { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#fff', marginBottom: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  // Tags
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  tagChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: 'rgba(171,0,255,0.14)', borderWidth: 1, borderColor: 'rgba(171,0,255,0.28)' },
  tagChipText: { fontSize: 12, fontWeight: '600', color: '#AB00FF' },
  tagInputRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  tagInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#fff', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  addTagBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center' },
  addTagBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  // Create submit
  createSubmitBtn: { backgroundColor: '#FF6C1A', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  createSubmitText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  // Mode tabs (Add Song dialog)
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  modeBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  modeBtnActive: { backgroundColor: 'rgba(255,108,26,0.12)', borderColor: '#FF6C1A' },
  modeBtnText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.4)' },
  modeBtnTextActive: { color: '#FF6C1A' },
  // Search
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  searchInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#fff', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  searchBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: '#FF6C1A', alignItems: 'center', justifyContent: 'center' },
  // Track rows
  trackRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  trackArt: { width: 46, height: 46, borderRadius: 8, backgroundColor: '#1a0a2e', flexShrink: 0 },
  trackInfo: { flex: 1 },
  trackName: { fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 2 },
  trackArtist: { fontSize: 12, color: 'rgba(255,255,255,0.38)' },
  // Add buttons
  addBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(255,108,26,0.12)', borderWidth: 1, borderColor: 'rgba(255,108,26,0.25)' },
  addBtnText: { fontSize: 12, fontWeight: '700', color: '#FF6C1A' },
  addBtnDone: { backgroundColor: 'rgba(29,185,84,0.12)', borderColor: 'rgba(29,185,84,0.3)' },
  addBtnTextDone: { color: '#1DB954' },
  // Add Song button in detail hero
  addSongBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: 'rgba(255,108,26,0.1)', borderWidth: 1, borderColor: 'rgba(255,108,26,0.28)', marginTop: 10 },
  addSongBtnText: { fontSize: 13, fontWeight: '700', color: '#FF6C1A' },
});
