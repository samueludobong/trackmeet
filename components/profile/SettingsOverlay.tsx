import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Modal, Pressable, ActivityIndicator } from "react-native";
import * as SecureStore from "expo-secure-store";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { settingsOverlayStyles } from "../../lib/feed/localStyles";
import { type UserProfile } from "../../app/data/mock";

import { useSettingsOverlay } from "../../hooks/useSettingsOverlay";

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
    screen, setScreen, showConfirm, setShowConfirm, signingOut, setSigningOut, spotifyConnected, setSpotifyConnected, showDisconnectAlert, setShowDisconnectAlert, disconnecting, setDisconnecting, connecting, setConnecting, slideAnim, backdropAnim, subSlideX, router, close, openScreen, goBack, doSignOut, handleDisconnect, handleConnect
  } = useSettingsOverlay({ profile, userId, onClose, onProfileRefresh });

  return (
    <Modal transparent animationType="none" statusBarTranslucent onRequestClose={screen === 'main' ? close : goBack}>
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.55)", opacity: backdropAnim }]}
        pointerEvents="none"
      />
      <Pressable style={StyleSheet.absoluteFill} onPress={screen === 'main' ? close : goBack} />

      <Animated.View
        style={[settingsOverlayStyles.sheet, { transform: [{ translateY: slideAnim }] }]}
        pointerEvents="box-none"
      >
        <Pressable onPress={() => {}}>          {screen === 'main' && (
            <>
              <View style={settingsOverlayStyles.handle} />
              <Text style={settingsOverlayStyles.title}>Settings</Text>

              {!showConfirm ? (
                <>                  <TouchableOpacity
                    style={settingsOverlayStyles.menuRow}
                    activeOpacity={0.8}
                    onPress={() => openScreen('connected-apps')}
                  >
                    <View style={settingsOverlayStyles.menuIconWrap}>
                      <Ionicons name="apps-outline" size={20} color="rgba(255,255,255,0.85)" />
                    </View>
                    <Text style={settingsOverlayStyles.menuLabel}>Connected Apps</Text>
                    <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.25)" />
                  </TouchableOpacity>                  <View style={{ height: 8 }} />                  <TouchableOpacity
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
          )}          {screen === 'connected-apps' && (
            <Animated.View style={{ transform: [{ translateX: subSlideX }] }}>              <View style={settingsOverlayStyles.handle} />              <View style={settingsOverlayStyles.subHeader}>
                <TouchableOpacity style={settingsOverlayStyles.backBtn} activeOpacity={0.7} onPress={goBack}>
                  <Ionicons name="chevron-back" size={20} color="#fff" />
                </TouchableOpacity>
                <Text style={settingsOverlayStyles.subTitle}>Connected Apps</Text>
                <View style={{ width: 36 }} />
              </View>              <View style={settingsOverlayStyles.appRow}>                <View style={settingsOverlayStyles.spotifyLogoWrap}>
                  <FontAwesome5 name="spotify" size={22} color="#1DB954" />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={settingsOverlayStyles.appName}>Spotify</Text>
                  <Text style={settingsOverlayStyles.appStatus}>
                    {spotifyConnected ? "Connected" : "Not connected"}
                  </Text>
                </View>

                {spotifyConnected ? (
                  /* Connected state — green dot + X to disconnect */
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
                  /* Disconnected state — Connect button */
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
              </View>              {showDisconnectAlert && (
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

        </Pressable>
      </Animated.View>
    </Modal>
  );
}

// ─── Social links sheet (mini overlay listing all linked social accounts) ──────
