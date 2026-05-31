import React from "react";
import { View, Text, Image } from "react-native";
import { AVATAR_MAP } from "../../app/data/mock";

export function AvatarCircle({ user, size }: { user: string; size: number }) {
  const photo = AVATAR_MAP[user];
  const br = size / 2;
  if (photo) return <Image source={photo} style={{ width: size, height: size, borderRadius: br }} resizeMode="cover" />;
  return (
    <View style={{ width: size, height: size, borderRadius: br, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: size * 0.38, fontWeight: "700", color: "#fff" }}>{user[0].toUpperCase()}</Text>
    </View>
  );
}
