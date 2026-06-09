import React from "react";
import { View, Text, StyleSheet, Switch, TouchableOpacity, Animated, Modal, Pressable, ActivityIndicator } from "react-native";
import * as SecureStore from "expo-secure-store";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { settingsOverlayStyles } from "../../lib/feed/localStyles";
import { type UserProfile } from "../../app/data/mock";

import { useSettingsOverlay } from "../../hooks/useSettingsOverlay";
import { useSheetDragClose } from "../../hooks/useSheetDragClose";
import { DragGrabber } from "../common/DragGrabber";

export function SettingsOverlay({
  profile,
  userId,
  onClose,
  onProfileRefresh,
}: {
  profile: UserProfile | null;
  userId: string | null;
  onClose: () => void;
  onProfileRefresh: () => void;
}) {
  const {
    screen, setScreen, showConfirm, setShowConfirm, signingOut, setSigningOut, spotifyConnected, setSpotifyConnected, showDisconnectAlert, setShowDisconnectAlert, disconnecting, setDisconnecting, connecting, setConnecting, slideAnim, backdropAnim, subSlideX, router, close, openScreen, goBack, doSignOut, handleDisconnect, handleConnect, userSettings, updateSetting
  } = useSettingsOverlay({ profile, userId, onClose, onProfileRefresh });

  // Drag the sheet down to close. Fade the backdrop with the drag so it
  // doesn't feel detached. Closed translateY is 400 (matches useSettingsOverlay).
  const { panHandlers, stretch } = useSheetDragClose({ slideAnim, onClose: close, closedValue: 400 });
  const draggedBackdropOpacity = slideAnim.interpolate({
    inputRange: [0, 400], outputRange: [1, 0], extrapolate: "clamp",
  });

  return (
    <Modal transparent animationType="none" statusBarTranslucent onRequestClose={screen === 'main' ? close : goBack}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: "rgba(0,0,0,0.55)" },
          { opacity: Animated.multiply(backdropAnim, draggedBackdropOpacity) },
        ]}
        pointerEvents="none"
      />
      <Pressable style={StyleSheet.absoluteFill} onPress={screen === 'main' ? close : goBack} />

      <Animated.View
        style={[
          settingsOverlayStyles.sheet,
          { transform: [{ translateY: slideAnim }, { scaleY: stretch }] },
        ]}
      >
        <DragGrabber panHandlers={panHandlers} />
        <Pressable onPress={() => {}}>
          {screen === 'main' && (
            <>
              <Text style={settingsOverlayStyles.title}>Settings</Text>

              {!showConfirm ? (
                <>
                  <TouchableOpacity
                    style={settingsOverlayStyles.menuRow}
                    activeOpacity={0.8}
                    onPress={() => openScreen('connected-apps')}
                  >
                    <View style={settingsOverlayStyles.menuIconWrap}>
                      <Ionicons name="apps-outline" size={20} color="rgba(255,255,255,0.85)" />
                    </View>
                    <Text style={settingsOverlayStyles.menuLabel}>Connected Apps</Text>
                    <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.25)" />
                  </TouchableOpacity>
                  <View style={{ height: 4 }} />
                  <TouchableOpacity
                    style={settingsOverlayStyles.menuRow}
                    activeOpacity={0.8}
                    onPress={() => openScreen('preferences')}
                  >
                    <View style={settingsOverlayStyles.prefIconWrap}>
                      <Ionicons name="options-outline" size={20} color="#AB00FF" />
                    </View>
                    <Text style={settingsOverlayStyles.menuLabel}>Preferences</Text>
                    <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.25)" />
                  </TouchableOpacity>
                  <View style={{ height: 8 }} />
                  <TouchableOpacity
                    style={settingsOverlayStyles.logoutRow}
                    activeOpacity={0.8}
                    onPress={() => setShowConfirm(true)}
                  >
                    <View style={settingsOverlayStyles.logoutIconWrap}>
                      <Ionicons name="log-out-outline" size={20} color="#ff4d6d" />
                    </View>
                    <Text style={settingsOverlayStyles.logoutLabel}>Log Out</Text>
                    <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.25)" />
                  </TouchableOpacity>
                </>
              ) : (
                <View style={settingsOverlayStyles.confirmBlock}>
                  <Text style={settingsOverlayStyles.confirmTitle}>Save account?</Text>
                  <Text style={settingsOverlayStyles.confirmSub}>
                    Keep your account saved for quick sign-in next time.
                  </Text>
                  <TouchableOpacity
                    style={settingsOverlayStyles.saveBtn}
                    activeOpacity={0.85}
                    onPress={() => doSignOut(true)}
                    disabled={signingOut}
                  >
                    {signingOut
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={settingsOverlayStyles.saveBtnText}>Save & Sign Out</Text>
                    }
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={settingsOverlayStyles.skipBtn}
                    activeOpacity={0.8}
                    onPress={() => doSignOut(false)}
                    disabled={signingOut}
                  >
                    <Text style={settingsOverlayStyles.skipBtnText}>Just Sign Out</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          {screen === 'connected-apps' && (
            <Animated.View style={{ transform: [{ translateX: subSlideX }] }}>
              <View style={settingsOverlayStyles.subHeader}>
                <TouchableOpacity style={settingsOverlayStyles.backBtn} activeOpacity={0.7} onPress={goBack}>
                  <Ionicons name="chevron-back" size={20} color="#fff" />
                </TouchableOpacity>
                <Text style={settingsOverlayStyles.subTitle}>Connected Apps</Text>
                <View style={{ width: 36 }} />
              </View>
              <View style={settingsOverlayStyles.appRow}>
                <View style={settingsOverlayStyles.spotifyLogoWrap}>
                  <FontAwesome5 name="spotify" size={22} color="#1DB954" />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={settingsOverlayStyles.appName}>Spotify</Text>
                  <Text style={settingsOverlayStyles.appStatus}>
                    {spotifyConnected ? "Connected" : "Not connected"}
                  </Text>
                </View>

                {spotifyConnected ? (
                  <View style={settingsOverlayStyles.connectedRight}>
                    <View style={settingsOverlayStyles.connectedDot} />
                    <TouchableOpacity
                      style={settingsOverlayStyles.disconnectBtn}
                      activeOpacity={0.75}
                      onPress={() => setShowDisconnectAlert(true)}
                    >
                      <Ionicons name="close" size={15} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={settingsOverlayStyles.connectBtn}
                    activeOpacity={0.85}
                    onPress={handleConnect}
                    disabled={connecting}
                  >
                    {connecting
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={settingsOverlayStyles.connectBtnText}>Connect</Text>
                    }
                  </TouchableOpacity>
                )}
              </View>
              {showDisconnectAlert && (
                <View style={settingsOverlayStyles.disconnectConfirm}>
                  <Text style={settingsOverlayStyles.disconnectConfirmTitle}>Disconnect Spotify?</Text>
                  <Text style={settingsOverlayStyles.disconnectConfirmSub}>
                    Your now-playing and broadcasting data will be cleared.
                  </Text>
                  <View style={settingsOverlayStyles.disconnectBtnRow}>
                    <TouchableOpacity
                      style={settingsOverlayStyles.disconnectCancelBtn}
                      activeOpacity={0.8}
                      onPress={() => setShowDisconnectAlert(false)}
                    >
                      <Text style={settingsOverlayStyles.disconnectCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={settingsOverlayStyles.disconnectConfirmBtn}
                      activeOpacity={0.85}
                      onPress={handleDisconnect}
                      disabled={disconnecting}
                    >
                      {disconnecting
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Text style={settingsOverlayStyles.disconnectConfirmText}>Disconnect</Text>
                      }
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </Animated.View>
          )}

          {screen === 'preferences' && (
            <Animated.View style={{ transform: [{ translateX: subSlideX }] }}>
              <View style={settingsOverlayStyles.subHeader}>
                <TouchableOpacity style={settingsOverlayStyles.backBtn} activeOpacity={0.7} onPress={goBack}>
                  <Ionicons name="chevron-back" size={20} color="#fff" />
                </TouchableOpacity>
                <Text style={settingsOverlayStyles.subTitle}>Preferences</Text>
                <View style={{ width: 36 }} />
              </View>
              <View style={settingsOverlayStyles.prefRow}>
                <View style={settingsOverlayStyles.prefIconWrap}>
                  <Ionicons name="volume-mute-outline" size={20} color="#AB00FF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={settingsOverlayStyles.prefLabel}>Mute All Audio on Start</Text>
                  <Text style={settingsOverlayStyles.prefSub}>Song previews and videos start muted</Text>
                </View>
                <Switch
                  value={userSettings.muteAudioOnStart}
                  onValueChange={(v) => updateSetting("muteAudioOnStart", v)}
                  trackColor={{ false: "rgba(255,255,255,0.12)", true: "#AB00FF" }}
                  thumbColor="#fff"
                />
              </View>
            </Animated.View>
          )}

        </Pressable>
      </Animated.View>
    </Modal>
  );
}

// ─── Social links sheet (mini overlay listing all linked social accounts) ──────
