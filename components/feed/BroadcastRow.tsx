import React from "react";
import { Pressable, Text, View } from "react-native";
import { profileStyles } from "../../lib/feed/localStyles";
import { useNowPlayingCtx } from "../../lib/feed/contexts";
import { GradientToggle } from "../../components/feed/GradientToggle";

export function BroadcastRow() {
  const { broadcastingEnabled, broadcastLoading, toggleBroadcasting, accent } = useNowPlayingCtx();
  // The whole row is the hit target; the inner GradientToggle is visual only
  // (`pointerEvents="none"`) so we don't get a double-fire from its inner TouchableOpacity.
  return (
    <Pressable
      onPress={toggleBroadcasting}
      disabled={broadcastLoading}
      style={profileStyles.broadcastRow}
    >
      <Text style={profileStyles.broadcastLabel}>Broadcast session</Text>
      <View pointerEvents="none">
        <GradientToggle value={broadcastingEnabled} onValueChange={toggleBroadcasting} colors={accent} />
      </View>
    </Pressable>
  );
}
