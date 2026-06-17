import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ev } from "../../assets/styles/app/artistProfile";
import { MOCK_EVENTS } from "../../constants/artist";
export { DiscographyTab } from "./DiscographyTab";

// ─── EVENTS TAB ───────────────────────────────────────────────────────────────
export function EventsTab() {
  return (
    <View style={ev.container}>
      {MOCK_EVENTS.map((event, i) => (
        <TouchableOpacity
          key={event.id}
          style={[ev.row, i === MOCK_EVENTS.length - 1 && ev.rowLast]}
          activeOpacity={0.7}
        >
          <View style={ev.dateCol}>
            <Text style={ev.month}>{event.month}</Text>
            <Text style={ev.day}>{event.day}</Text>
          </View>
          <View style={ev.info}>
            <Text style={ev.venue} numberOfLines={1}>{event.venue}</Text>
            <Text style={ev.city}  numberOfLines={1}>{event.city}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.22)" />
        </TouchableOpacity>
      ))}
      <View style={ev.footer}>
        <Text style={ev.footerText}>No more upcoming events</Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
