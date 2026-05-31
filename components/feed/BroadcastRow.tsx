import React from "react";
import { Text, TouchableOpacity } from "react-native";
import { profileStyles } from "../../lib/feed/localStyles";
import { useNowPlayingCtx } from "../../lib/feed/contexts";
import { GradientToggle } from "../../components/feed/GradientToggle";

export function BroadcastRow() {
  const { broadcastingEnabled, broadcastLoading, toggleBroadcasting, accent } = useNowPlayingCtx();
  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={toggleBroadcasting}
      disabled={broadcastLoading}
      style={profileStyles.broadcastRow}
    >
      <Text style={profileStyles.broadcastLabel}>Broadcast session</Text>
      <GradientToggle value={broadcastingEnabled} onValueChange={toggleBroadcasting} colors={accent} />
    </TouchableOpacity>
  );
}

// ─── Profile section tabs ─────────────────────────────────────────────────────

// ─── Add Song dialog ──────────────────────────────────────────────────────────
