import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { styles } from "../../assets/styles/app/signup";
import { STREAMING_SERVICES, DUMMY_ARTISTS } from "../../constants/signup";

export function StreamingGrid({
  connected,
  onToggle,
  onSpotifyConnect,
  spotifyConnecting,
}: {
  connected: Set<string>;
  onToggle: (id: string) => void;
  onSpotifyConnect?: () => void;
  spotifyConnecting?: boolean;
}) {
  return (
    <View style={{ gap: 10 }}>
      {STREAMING_SERVICES.map((s) => {
        const ok = connected.has(s.id);
        const isSpotify = s.id === "spotify";
        const isConnecting = isSpotify && spotifyConnecting;

        return (
          <TouchableOpacity
            key={s.id}
            style={[
              styles.streamRow,
              { backgroundColor: s.color, opacity: isConnecting ? 0.7 : 1 },
            ]}
            onPress={() =>
              isSpotify && onSpotifyConnect
                ? onSpotifyConnect()
                : onToggle(s.id)
            }
            activeOpacity={0.82}
            disabled={!!isConnecting}
          >
            {/* Brand logo */}
            <View style={styles.streamIconWrap}>
              {s.iconType === "fa5" ? (
                <FontAwesome5 name={s.icon} size={18} color="#fff" />
              ) : (
                <Text style={styles.streamSymbol}>{s.icon}</Text>
              )}
            </View>

            {/* Name */}
            <Text style={styles.streamRowName}>{s.name}</Text>

            {/* Right indicator */}
            {isConnecting ? (
              <Text
                style={{
                  color: "rgba(255,255,255,0.75)",
                  fontSize: 12,
                  fontWeight: "600",
                }}
              >
                Connecting…
              </Text>
            ) : ok ? (
              <View style={styles.streamConnectedPill}>
                <Ionicons name="checkmark" size={12} color={s.color} />
                <Text style={[styles.streamConnectedText, { color: s.color }]}>
                  Connected
                </Text>
              </View>
            ) : (
              <Ionicons
                name="chevron-forward"
                size={16}
                color="rgba(255,255,255,0.6)"
              />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Artists grid ─────────────────────────────────────────────────────────────

export function ArtistsGrid({
  followed,
  onToggle,
}: {
  followed: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <View style={{ gap: 10 }}>
      {Array.from({ length: Math.ceil(DUMMY_ARTISTS.length / 2) }, (_, ri) => (
        <View key={ri} style={{ flexDirection: "row", gap: 10 }}>
          {DUMMY_ARTISTS.slice(ri * 2, ri * 2 + 2).map((a) => {
            const isF = followed.has(a.id);
            return (
              <View key={a.id} style={styles.artistCard}>
                <View
                  style={[
                    styles.artistAvatar,
                    {
                      backgroundColor: a.color + "20",
                      borderColor: a.color + "55",
                    },
                  ]}
                >
                  <Text style={[styles.artistInitials, { color: a.color }]}>
                    {a.initials}
                  </Text>
                </View>
                <Text style={styles.artistName} numberOfLines={1}>
                  {a.name}
                </Text>
                <Text style={styles.artistGenre}>{a.genre}</Text>
                <TouchableOpacity
                  style={[
                    styles.artistFollowBtn,
                    isF && styles.artistFollowBtnActive,
                  ]}
                  onPress={() => onToggle(a.id)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.artistFollowText,
                      isF && styles.artistFollowTextActive,
                    ]}
                  >
                    {isF ? "Following" : "Follow"}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ─── Step dots ────────────────────────────────────────────────────────────────

export function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <View style={styles.stepDots}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            styles.stepDot,
            i + 1 < step
              ? styles.stepDotDone
              : i + 1 === step
                ? styles.stepDotActive
                : styles.stepDotPending,
            { width: i + 1 === step ? 28 : 14 },
          ]}
        />
      ))}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
