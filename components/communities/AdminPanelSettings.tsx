import React from "react";
import { Switch, Text, View } from "react-native";
import { adminStyles as a } from "./adminPanel.styles";

type Props = {
  isPrivate: boolean; setIsPrivate: (v: boolean) => void;
  allowPosts: boolean; setAllowPosts: (v: boolean) => void;
  allowAnyoneToPost: boolean; setAllowAnyoneToPost: (v: boolean) => void;
  allowComments: boolean; setAllowComments: (v: boolean) => void;
  allowOfftopic: boolean; setAllowOfftopic: (v: boolean) => void;
};

export function AdminPanelSettings(p: Props) {
  return (
    <>
      <Text style={a.sectionTitle}>ACCESS</Text>
      <ToggleRow label="Private community" sub="Only approved members can join & see content" value={p.isPrivate} onChange={p.setIsPrivate} />

      <Text style={a.sectionTitle}>CONTENT</Text>
      <ToggleRow label="Allow member posts" sub="Members can create posts in here" value={p.allowPosts} onChange={p.setAllowPosts} />
      <ToggleRow label="Allow anyone to post" sub="Otherwise only admins can post" value={p.allowAnyoneToPost} onChange={p.setAllowAnyoneToPost} />
      <ToggleRow label="Allow comments" sub="Members can comment on posts" value={p.allowComments} onChange={p.setAllowComments} />
      <ToggleRow label="Allow off-topic content" sub="Posts beyond the community's focus" value={p.allowOfftopic} onChange={p.setAllowOfftopic} />
    </>
  );
}

function ToggleRow({ label, sub, value, onChange }: { label: string; sub: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={a.toggleRow}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={a.toggleLabel}>{label}</Text>
        <Text style={a.toggleSub}>{sub}</Text>
      </View>
      <Switch value={value} onValueChange={onChange}
        trackColor={{ false: "rgba(255,255,255,0.15)", true: "#AB00FF" }}
        thumbColor="#fff" ios_backgroundColor="rgba(255,255,255,0.15)" />
    </View>
  );
}
