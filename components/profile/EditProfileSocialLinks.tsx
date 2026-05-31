import React from "react";
import { View, Text, TouchableOpacity, TextInput } from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { epOverlayStyles } from "../../lib/feed/localStyles";
import { SOCIAL_PLATFORMS } from "../../lib/feed/social";
import { type EditFormData } from "../../types/profile";

/** The Social Accounts + Links sections of the Edit Profile form. */
export function EditProfileSocialLinks({
  form, setSocialLink, newLink, setNewLink, addLink, removeLink,
}: {
  form: EditFormData;
  setSocialLink: (key: string, value: string) => void;
  newLink: string;
  setNewLink: (v: string) => void;
  addLink: () => void;
  removeLink: (idx: number) => void;
}) {
  return (
    <>
      <View style={epOverlayStyles.section}>
        <Text style={epOverlayStyles.sectionLabel}>SOCIAL ACCOUNTS</Text>
        {SOCIAL_PLATFORMS.map((p) => (
          <View key={p.key} style={epOverlayStyles.socialRow}>
            <View style={[epOverlayStyles.socialIconWrap, { backgroundColor: p.color + "22" }]}>
              <FontAwesome5 name={p.icon} size={16} color={p.color} />
            </View>
            <TextInput
              style={epOverlayStyles.socialInput}
              value={form.social_links[p.key]?.replace(/^https?:\/\//, "") ?? ""}
              onChangeText={(t) => setSocialLink(p.key, t)}
              placeholder={p.placeholder}
              placeholderTextColor="rgba(255,255,255,0.2)"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            {!!form.social_links[p.key] && (
              <TouchableOpacity onPress={() => setSocialLink(p.key, "")} hitSlop={10}>
                <FontAwesome5 name="times-circle" size={15} color="rgba(255,100,100,0.6)" />
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>
      <View style={epOverlayStyles.section}>
        <Text style={epOverlayStyles.sectionLabel}>LINKS</Text>
        {form.profile_links.map((link, idx) => (
          <View key={idx} style={epOverlayStyles.linkRow}>
            <FontAwesome5 name="link" size={12} color="rgba(255,255,255,0.3)" style={{ marginRight: 8 }} />
            <Text style={epOverlayStyles.linkText} numberOfLines={1}>{link}</Text>
            <TouchableOpacity onPress={() => removeLink(idx)} hitSlop={10}>
              <FontAwesome5 name="times" size={13} color="rgba(255,100,100,0.7)" />
            </TouchableOpacity>
          </View>
        ))}
        <View style={epOverlayStyles.linkInputRow}>
          <TextInput
            style={epOverlayStyles.linkInput}
            value={newLink}
            onChangeText={setNewLink}
            placeholder="Add a link…"
            placeholderTextColor="rgba(255,255,255,0.25)"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            onSubmitEditing={addLink}
            returnKeyType="done"
          />
          <TouchableOpacity style={[epOverlayStyles.addLinkBtn, !newLink.trim() && { opacity: 0.4 }]} onPress={addLink} disabled={!newLink.trim()}>
            <FontAwesome5 name="plus" size={12} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}
