import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

const BANNER_H = 172;
const AVATAR_SIZE = 86;
const AVATAR_OVERLAP = Math.round(AVATAR_SIZE * 0.44);

export default function ProfileScreen() {
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        {/* Back arrow */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* ─── Profile card ──────────────────────────────────────────── */}
          <View style={styles.card}>
            {/* Banner */}
            <View style={styles.bannerWrap}>
              <LinearGradient
                colors={["#3D0C00", "#CC4200", "#FF6C1A", "#CC4200", "#3D0C00"]}
                locations={[0, 0.25, 0.5, 0.75, 1]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
              />
              {/* Top-to-bottom darkening so banner fades to card bg */}
              <LinearGradient
                colors={["transparent", "rgba(22,22,24,0.55)"]}
                style={StyleSheet.absoluteFill}
              />
              {/* Spotlight glow */}
              <View style={styles.bannerGlow} />

              {/* Social icons + Follow — inside banner, bottom-right */}
              <View style={styles.bannerActions}>
                <TouchableOpacity style={styles.socialBtn} activeOpacity={0.7}>
                  <Text style={styles.socialIcon}>𝕏</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialBtn} activeOpacity={0.7}>
                  <Text style={styles.socialIcon}>◎</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialBtn} activeOpacity={0.7}>
                  <Text style={styles.socialIcon}>🎙</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.followBtn} activeOpacity={0.85}>
                  <Text style={styles.followBtnText}>Follow</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Avatar row — negative margin overlaps the banner */}
            <View style={[styles.avatarRow, { marginTop: -AVATAR_OVERLAP }]}>
              <View style={styles.avatar}>
                <Text style={styles.avatarInitials}>JD</Text>
              </View>
            </View>

            {/* ─── Info ──────────────────────────────────────────────── */}
            <View style={styles.infoSection}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>Jane Doe</Text>
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedText}>✓</Text>
                </View>
              </View>
              <Text style={styles.handle}>@thejanedoe</Text>

              <Text style={styles.bio}>
                {"Creative Designer w/ Marketing Expertise\nEx Art Director → "}
                <Text style={styles.mention}>@apple</Text>
              </Text>

              <View style={styles.statsRow}>
                <Text style={styles.statNum}>100</Text>
                <Text style={styles.statLabel}> Following</Text>
                <View style={{ width: 22 }} />
                <Text style={styles.statNum}>23.6K</Text>
                <Text style={styles.statLabel}> Followers</Text>
              </View>

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaIcon}>⊙</Text>
                  <Text style={styles.metaText}>To Be Determined</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaIcon}>⊘</Text>
                  <Text style={styles.metaText}>To Be Determined</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0D0D0D" },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },

  backBtn: { paddingHorizontal: 18, paddingVertical: 10 },
  backIcon: { fontSize: 32, color: "#fff", fontWeight: "300", lineHeight: 36 },

  // Card shell — overflow hidden gives rounded corners on all children
  card: {
    backgroundColor: "#161618",
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  // Banner
  bannerWrap: {
    height: BANNER_H,
    overflow: "hidden",
    position: "relative",
  },
  bannerGlow: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "#FF7030",
    opacity: 0.38,
    alignSelf: "center",
    top: -100,
  },
  bannerActions: {
    position: "absolute",
    bottom: 14,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  socialBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  socialIcon: { fontSize: 15, color: "#fff" },
  followBtn: {
    paddingHorizontal: 18,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  followBtnText: { fontSize: 14, fontWeight: "700", color: "#111" },

  // Avatar row
  avatarRow: {
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: 18,
    backgroundColor: "#FF6B35",
    borderWidth: 3,
    borderColor: "#161618",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: { fontSize: 28, fontWeight: "800", color: "#fff" },

  // Info section
  infoSection: {
    paddingHorizontal: 20,
    paddingBottom: 26,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 3,
  },
  name: { fontSize: 21, fontWeight: "800", color: "#ffffff" },
  verifiedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#1D9BF0",
    alignItems: "center",
    justifyContent: "center",
  },
  verifiedText: { fontSize: 10, fontWeight: "900", color: "#fff" },
  handle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.4)",
    marginBottom: 14,
  },
  bio: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    lineHeight: 22,
    marginBottom: 16,
  },
  mention: { color: "#1D9BF0" },
  statsRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 16,
  },
  statNum: { fontSize: 15, fontWeight: "800", color: "#ffffff" },
  statLabel: { fontSize: 14, color: "rgba(255,255,255,0.38)" },
  metaRow: {
    flexDirection: "row",
    gap: 20,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaIcon: { fontSize: 13, color: "rgba(255,255,255,0.28)" },
  metaText: { fontSize: 13, color: "rgba(255,255,255,0.32)" },
});
