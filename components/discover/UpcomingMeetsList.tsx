import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ds } from "../../lib/feed/localStyles";

/** "Upcoming Meets" vertical list with RSVP toggles. */
export function UpcomingMeetsList({
  meets,
  joinedMeets,
  onToggleJoin,
}: {
  meets: any[];
  joinedMeets: Set<string>;
  onToggleJoin: (id: string) => void;
}) {
  return (
    <>
      <View style={ds.sectionHeader}><Text style={ds.sectionTitle}>Upcoming Meets</Text></View>
      <View style={ds.meetsCol}>
        {meets.map((meet) => {
          const joined = joinedMeets.has(meet.id);
          return (
            <View key={meet.id} style={ds.meetCard}>
              <View style={[ds.meetStrip, { backgroundColor: meet.color }]} />
              <View style={ds.meetBody}>
                <View style={ds.meetTopRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={ds.meetTitle}>{meet.title}</Text>
                    <Text style={ds.meetSubtitle}>{meet.subtitle}</Text>
                  </View>
                  <View style={[ds.meetDateBadge, { backgroundColor: meet.color + "22", borderColor: meet.color + "44" }]}>
                    <Text style={[ds.meetDateText, { color: meet.color }]}>{meet.date}</Text>
                  </View>
                </View>
                <View style={ds.meetMeta}>
                  <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.4)" />
                  <Text style={ds.meetLocation}>{meet.location}</Text>
                </View>
                <View style={ds.meetBottomRow}>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    {meet.tags.map((t: string) => (
                      <View key={t} style={ds.meetTag}><Text style={ds.meetTagText}>{t}</Text></View>
                    ))}
                  </View>
                  <TouchableOpacity
                    style={[ds.rsvpBtn, { borderColor: meet.color }, joined && { backgroundColor: meet.color }]}
                    activeOpacity={0.8}
                    onPress={() => onToggleJoin(meet.id)}
                  >
                    <Ionicons name={joined ? "checkmark" : "add"} size={12} color={joined ? "#0D0D0D" : meet.color} />
                    <Text style={[ds.rsvpText, { color: joined ? "#0D0D0D" : meet.color }]}>{joined ? "Going" : "RSVP"}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </>
  );
}
