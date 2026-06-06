import React, { useState, useEffect, useContext, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  UIManager,
  findNodeHandle,
  Dimensions,
} from "react-native";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { styles, profileSStyles } from "../../lib/feed/styles";
import { OpenDetailCtx, FeedUserCtx } from "../../lib/feed/contexts";
import { type Post } from "../../app/data/mock";
import { getPostComments } from "../../services/posts";

export function ActionRow({ post }: { post: Post }) {
  const { currentUserId, likedPostIds, onToggleLike } = useContext(FeedUserCtx);
  const liked = likedPostIds.has(post.id);
  const [fabMenuOpen, setFabMenuOpen] = useState(false);
  const [artistDropdownOpen, setArtistDropdownOpen] = useState(false);

  const [menuPosition, setMenuPosition] = useState<{
    top?: number;
    bottom?: number;
    right: number;
  }>({ top: 0, right: 16 });
  const moreButtonRef = useRef(null);
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [commentsCount, setCommentsCount] = useState(post.comments);

  const openDetail = useContext(OpenDetailCtx);

  useEffect(() => {
    setLikeCount(post.likes);
  }, [post.likes]);
  const closeMenu = () => {
    setFabMenuOpen(false);
    setMoreOptionsOpen(false);
  };
  const handleLike = () => {
    if (!currentUserId) return;
    setLikeCount((c) => (liked ? Math.max(0, c - 1) : c + 1));
    onToggleLike(post.id);
  };

  const openMenu = () => {
    if (!moreButtonRef.current) {
      setFabMenuOpen(true);

      return;
    }

    const handle = findNodeHandle(moreButtonRef.current);
    if (!handle) {
      setFabMenuOpen(true);
      return;
    }

    UIManager.measure(handle, (x, y, width, height, pageX, pageY) => {
      const screenHeight = Dimensions.get("window").height;
      const menuEstimatedHeight = 320; // approximate menu height
      const spaceBelow = screenHeight - (pageY + height);
      const spaceAbove = pageY;

      if (spaceBelow < menuEstimatedHeight && spaceAbove > spaceBelow) {
        // Not enough space below — render above the button
        setMenuPosition({
          bottom: screenHeight - pageY + 4,
          top: undefined,
          right: 16,
        });
      } else {
        // Enough space below — render below button
        setMenuPosition({
          top: pageY + height + 4,
          bottom: undefined,
          right: 16,
        });
      }
      setFabMenuOpen(true);
    });
  };

  useEffect(() => {
    getPostComments(post.id).then((comments) => {
      setCommentsCount(comments.length);
    });
  }, []);

  return (
    <View style={styles.actionRow}>
      <TouchableOpacity
        style={styles.actionBtn}
        activeOpacity={0.7}
        onPress={handleLike}
      >
        <Ionicons
          name={liked ? "heart" : "heart-outline"}
          size={25}
          color={liked ? "#E8000F" : "rgba(255,255,255,0.7)"}
        />
        {likeCount > 0 && (
          <Text style={[styles.actionCount, liked && styles.actionCountLiked]}>
            {likeCount}
          </Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
        <Ionicons
          name="chatbubble-outline"
          size={22}
          color="rgba(255,255,255,0.7)"
        />
        {commentsCount > 0 && (
          <Text style={styles.actionCount}>{commentsCount}</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.actionBtn}
        activeOpacity={0.7}
        onPress={() => {}}
      >
        <Ionicons name="repeat" size={25} color="rgba(255,255,255,0.7)" />
        {post.shares > 0 && (
          <Text style={styles.actionCount}>{post.shares}</Text>
        )}
      </TouchableOpacity>

      <Modal
        transparent
        visible={fabMenuOpen}
        animationType="fade"
        onRequestClose={() => setFabMenuOpen(false)}
      >
        <Pressable style={{ flex: 1 }} onPress={closeMenu}>
          <View
            style={[
              profileSStyles.fabMenu,
              {
                position: "absolute",
                top: menuPosition.top,
                bottom: menuPosition.bottom,
                right: menuPosition.right,
                overflow: "visible",
              },
            ]}
          >
            {/* ─── Type specific — always visible ─── */}
            {post.type === "music" && (
              <>
                <TouchableOpacity
                  style={profileSStyles.fabMenuItem}
                  activeOpacity={0.8}
                  onPress={() => setFabMenuOpen(false)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={profileSStyles.fabMenuTitle}>
                      Add to Playlist
                    </Text>
                  </View>
                  <Ionicons name="musical-notes" size={18} color="#1DB954" />
                </TouchableOpacity>
                <View style={profileSStyles.fabMenuDivider} />

                <TouchableOpacity
                  style={profileSStyles.fabMenuItem}
                  activeOpacity={0.8}
                  onPress={() => setFabMenuOpen(false)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={profileSStyles.fabMenuTitle}>
                      Open in Spotify
                    </Text>
                  </View>
                  <Ionicons name="open-outline" size={18} color="#1DB954" />
                </TouchableOpacity>
                <View style={profileSStyles.fabMenuDivider} />

                <TouchableOpacity
              style={profileSStyles.fabMenuItem}
              activeOpacity={0.8}
              onPress={() => setFabMenuOpen(false)}
            >
              <View style={{ flex: 1 }}>
                <Text style={profileSStyles.fabMenuTitle}>View Artist Profile</Text>
              </View>
              <Ionicons name="eye-outline" size={18} color="#1DB954" />
            </TouchableOpacity>

                <TouchableOpacity
                  style={profileSStyles.fabMenuItem}
                  activeOpacity={0.8}
                  onPress={() => setFabMenuOpen(false)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={profileSStyles.fabMenuTitle}>
                      Start a Meet with this
                    </Text>
                  </View>
                  <FontAwesome5
                    name="broadcast-tower"
                    size={15}
                    color="#AB00FF"
                  />
                </TouchableOpacity>
                <View style={profileSStyles.fabMenuDivider} />
              </>
            )}

            {post.type === "video" && (
              <>
                <TouchableOpacity
                  style={profileSStyles.fabMenuItem}
                  activeOpacity={0.8}
                  onPress={() => setFabMenuOpen(false)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={profileSStyles.fabMenuTitle}>Save Video</Text>
                  </View>
                  <Ionicons name="download-outline" size={18} color="#AB00FF" />
                </TouchableOpacity>
                <View style={profileSStyles.fabMenuDivider} />
              </>
            )}

            {post.type === "image" && (
              <>
                <TouchableOpacity
                  style={profileSStyles.fabMenuItem}
                  activeOpacity={0.8}
                  onPress={() => setFabMenuOpen(false)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={profileSStyles.fabMenuTitle}>Save Image</Text>
                  </View>
                  <Ionicons name="image-outline" size={18} color="#AB00FF" />
                </TouchableOpacity>
                <View style={profileSStyles.fabMenuDivider} />
              </>
            )}

            {post.type === "poll" && (
              <>
                <TouchableOpacity
                  style={profileSStyles.fabMenuItem}
                  activeOpacity={0.8}
                  onPress={() => setFabMenuOpen(false)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={profileSStyles.fabMenuTitle}>
                      View Poll Results
                    </Text>
                  </View>
                  <Ionicons
                    name="bar-chart-outline"
                    size={18}
                    color="#AB00FF"
                  />
                </TouchableOpacity>
                <View style={profileSStyles.fabMenuDivider} />
              </>
            )}

            {/* ─── Universal always visible ─── */}
            <TouchableOpacity
              style={profileSStyles.fabMenuItem}
              activeOpacity={0.8}
              onPress={() => setFabMenuOpen(false)}
            >
              <View style={{ flex: 1 }}>
                <Text style={profileSStyles.fabMenuTitle}>
                  Save to Collection
                </Text>
              </View>
              <Ionicons name="bookmark-outline" size={18} color="#AB00FF" />
            </TouchableOpacity>
            <View style={profileSStyles.fabMenuDivider} />

            
            <View style={profileSStyles.fabMenuDivider} />

            {/* ─── More Options toggle ─── */}
            <TouchableOpacity
              style={profileSStyles.fabMenuItem}
              activeOpacity={0.8}
              onPress={() => setMoreOptionsOpen((prev) => !prev)}
            >
              <View style={{ flex: 1 }}>
                <Text style={profileSStyles.fabMenuTitle}>More Options</Text>
              </View>
              <Ionicons
                name={moreOptionsOpen ? "chevron-up" : "chevron-down"}
                size={16}
                color="rgba(255,255,255,0.4)"
                style={{ marginLeft: 8 }}
              />
            </TouchableOpacity>

            {/* ─── Overlay dropdown — sits on top of menu ─── */}
            {moreOptionsOpen && (
              <View
                style={{
                  position: "absolute",
                  bottom: "0%", // sits directly above the menu
                  right: 0,
                  width: "100%",
                  backgroundColor: "#1A1A1A",
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.08)",
                  overflow: "hidden",
                  zIndex: 99,
                  // subtle shadow to lift it visually
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: -4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 10,
                }}
              >
                {post.type === "music" && (
                  <>
                    <TouchableOpacity
                      style={profileSStyles.fabMenuItem}
                      activeOpacity={0.8}
                      onPress={closeMenu}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={profileSStyles.fabMenuTitle}>
                          Follow Artist
                        </Text>
                      </View>
                      <Ionicons name="person-add" size={18} color="#AB00FF" />
                    </TouchableOpacity>
                    <View style={profileSStyles.fabMenuDivider} />
                  </>
                )}
                {post.authorId !== currentUserId && (
                  <>
                <TouchableOpacity
                  style={profileSStyles.fabMenuItem}
                  activeOpacity={0.8}
                  onPress={closeMenu}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={profileSStyles.fabMenuTitle}>
                      Follow {post.user}
                    </Text>
                  </View>
                  <Ionicons
                    name="person-add-outline"
                    size={18}
                    color="#AB00FF"
                  />
                </TouchableOpacity>
                </>
                )}
                <View style={profileSStyles.fabMenuDivider} />

                <TouchableOpacity
                  style={profileSStyles.fabMenuItem}
                  activeOpacity={0.8}
                  onPress={closeMenu}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={profileSStyles.fabMenuTitle}>
                      Not Interested
                    </Text>
                  </View>
                  <Ionicons
                    name="eye-off-outline"
                    size={18}
                    color="rgba(255,255,255,0.4)"
                  />
                </TouchableOpacity>
                <View style={profileSStyles.fabMenuDivider} />

                {post.authorId !== currentUserId && (
                  <>

                <TouchableOpacity
                  style={profileSStyles.fabMenuItem}
                  activeOpacity={0.8}
                  onPress={closeMenu}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={profileSStyles.fabMenuTitle}>Report Post</Text>
                  </View>
                  <Ionicons
                    name="flag-outline"
                    size={18}
                    color="rgba(255,255,255,0.4)"
                  />
                </TouchableOpacity>
                </>
                )}

                {post.authorId === currentUserId && (
                  <>
                    <View style={profileSStyles.fabMenuDivider} />
                    <TouchableOpacity
                      style={profileSStyles.fabMenuItem}
                      activeOpacity={0.8}
                      onPress={closeMenu}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={profileSStyles.fabMenuTitle}>
                          Edit Post
                        </Text>
                      </View>
                      <Ionicons
                        name="create-outline"
                        size={18}
                        color="rgba(255,255,255,0.5)"
                      />
                    </TouchableOpacity>
                    <View style={profileSStyles.fabMenuDivider} />
                    <TouchableOpacity
                      style={profileSStyles.fabMenuItem}
                      activeOpacity={0.8}
                      onPress={closeMenu}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            profileSStyles.fabMenuTitle,
                            { color: "#ff3b30" },
                          ]}
                        >
                          Delete Post
                        </Text>
                      </View>
                      <FontAwesome5
                        name="trash-alt"
                        size={15}
                        color="#ff3b30"
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
              style={profileSStyles.fabMenuItem}
              activeOpacity={0.8}
              onPress={() => setMoreOptionsOpen((prev) => !prev)}
            >
              <View style={{ flex: 1 }}>
                <Text style={profileSStyles.fabMenuTitle}>Less Options</Text>
              </View>
              <Ionicons
                name={moreOptionsOpen ? "chevron-up" : "chevron-down"}
                size={16}
                color="rgba(255,255,255,0.4)"
                style={{ marginLeft: 8 }}
              />
            </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </View>
        </Pressable>
      </Modal>
      <TouchableOpacity
        style={styles.actionBtn}
        activeOpacity={0.7}
        onPress={() => {}}
      >
        <Ionicons
          name="share-outline"
          size={22}
          color="rgba(255,255,255,0.7)"
        />
        {post.shares > 0 && (
          <Text style={styles.actionCount}>{post.shares}</Text>
        )}
      </TouchableOpacity>
      <View style={{ flex: 1 }} />
      <TouchableOpacity
        ref={moreButtonRef}
        activeOpacity={0.7}
        onPress={openMenu}
      >
        <Text style={styles.moreIcon}>···</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Lightbox styles ─────────────────────────────────────────────────────────

// ─── Fullscreen image lightbox ─────────────────────────────────────────────────
