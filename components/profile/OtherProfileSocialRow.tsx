import React from "react";
import { View, Text, TouchableOpacity, Linking } from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { s } from "../../assets/styles/app/userProfile";

/** Social-link icon row shown over another user's banner. */
export function OtherProfileSocialRow({
  visibleSocial, socialOverflow, linkedPlatforms, profile, setSocialLinksSheetOpen,
}: {
  visibleSocial: any[];
  socialOverflow: number;
  linkedPlatforms: any[];
  profile: any;
  setSocialLinksSheetOpen: (v: boolean) => void;
}) {
  return (
    <View style={s.bannerActions}>
      {visibleSocial.map((p: any) => (
        <TouchableOpacity
          key={p.key}
          style={s.socialBtn}
          activeOpacity={0.7}
          onPress={() => {
            if (linkedPlatforms.length > 1) {
              setSocialLinksSheetOpen(true);
            } else {
              const url = profile.social_links?.[p.key];
              if (url) Linking.openURL(url).catch(() => {});
            }
          }}
        >
          <FontAwesome5 name={p.icon} size={15} color={p.color} />
        </TouchableOpacity>
      ))}
      {socialOverflow > 0 && (
        <TouchableOpacity
          style={[s.socialBtn, { backgroundColor: "rgba(255,255,255,0.18)" }]}
          activeOpacity={0.7}
          onPress={() => setSocialLinksSheetOpen(true)}
        >
          <Text style={{ fontSize: 11, fontWeight: "800", color: "#fff" }}>+{socialOverflow}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
