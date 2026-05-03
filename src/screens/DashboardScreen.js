import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors, Typography } from "../theme/colors";
import GlassCard from "../components/GlassCard";
import HexagonBackground from "../components/HexagonBackground";
import { Ionicons } from "@expo/vector-icons";

export default function DashboardScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <HexagonBackground />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Welcome back,</Text>
            <Text style={styles.name}>Nandhana</Text>
            <Text style={styles.subtitle}>Let's focus and get things done</Text>
          </View>
        </View>

        {/* Today's Focus */}
        <GlassCard style={styles.planCard}>
          <View style={styles.planHeader}>
            <Text style={styles.planSubtitle}>TODAY'S FOCUS</Text>
            <Text style={styles.planTime}>🕒 45 min</Text>
          </View>

          <Text style={styles.planTitle}>Data Structures</Text>
          <Text style={styles.planTopic}>Binary Search Trees</Text>

          <TouchableOpacity
            style={styles.focusButton}
            onPress={() => navigation.navigate("Focus")}
          >
            <Text style={styles.focusButtonText}>Start Focus</Text>
          </TouchableOpacity>
        </GlassCard>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Ionicons name="time" size={20} color={Colors.primary} />
            <Text style={styles.statValue}>2h 15m</Text>
            <Text style={styles.statLabel}>Study Time</Text>
          </View>

          <View style={styles.statBox}>
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={Colors.primary}
            />
            <Text style={styles.statValue}>3</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>

          <View style={styles.statBox}>
            <Ionicons name="flame" size={20} color={Colors.greenAccent} />
            <Text style={styles.statValue}>6 days</Text>
            <Text style={styles.statLabel}>Streak</Text>
          </View>
        </View>

        {/* Quick Access */}
        <Text style={styles.sectionTitle}>Quick Access</Text>

        <View style={styles.grid}>
          <TouchableOpacity style={styles.gridItem}>
            <GlassCard
              style={[
                styles.gridCard,
                { borderLeftColor: Colors.primary, borderLeftWidth: 4 },
              ]}
            >
              <Text style={styles.gridIcon}>🧠</Text>
              <Text style={styles.gridTitle}>AI Quiz</Text>
              <Text style={styles.gridSub}>Test your knowledge</Text>
            </GlassCard>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridItem}>
            <GlassCard
              style={[
                styles.gridCard,
                { borderLeftColor: Colors.purpleAccent, borderLeftWidth: 4 },
              ]}
            >
              <Text style={styles.gridIcon}>📚</Text>
              <Text style={styles.gridTitle}>Library Mode</Text>
              <Text style={styles.gridSub}>128 users studying</Text>
            </GlassCard>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridItem}>
            <GlassCard
              style={[
                styles.gridCard,
                { borderLeftColor: Colors.greenAccent, borderLeftWidth: 4 },
              ]}
            >
              <Text style={styles.gridIcon}>🏆</Text>
              <Text style={styles.gridTitle}>Leaderboard</Text>
              <Text style={styles.gridSub}>See your rank</Text>
            </GlassCard>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridItem}>
            <GlassCard
              style={[
                styles.gridCard,
                { borderLeftColor: Colors.blueAccent, borderLeftWidth: 4 },
              ]}
            >
              <Text style={styles.gridIcon}>🤝</Text>
              <Text style={styles.gridTitle}>Study Partner</Text>
              <Text style={styles.gridSub}>Connect & compete</Text>
            </GlassCard>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    padding: 20,
    flexGrow: 1,
  },

  header: {
    marginBottom: 28,
  },

  title: {
    fontSize: 22,
    color: Colors.textSecondary,
  },

  name: {
    fontSize: 32,
    fontWeight: "bold",
    color: Colors.text,
    marginTop: 4,
  },

  subtitle: {
    ...Typography.body,
    marginTop: 8,
    color: Colors.textSecondary,
  },

  planCard: {
    padding: 24,
    marginBottom: 24,
    backgroundColor: "rgba(251, 192, 45, 0.08)",
    borderColor: "rgba(251, 192, 45, 0.3)",
    borderWidth: 1,
  },

  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  planSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    letterSpacing: 1,
  },

  planTime: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: "bold",
  },

  planTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: Colors.text,
    marginTop: 10,
  },

  planTopic: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: 20,
  },

  focusButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },

  focusButtonText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 16,
  },

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },

  statBox: {
    alignItems: "center",
    flex: 1,
  },

  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 6,
    color: Colors.text,
  },

  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    color: Colors.text,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  gridItem: {
    width: "48%",
  },

  gridCard: {
    padding: 16,
    height: 120,
    justifyContent: "center",
  },

  gridIcon: {
    fontSize: 24,
    marginBottom: 8,
  },

  gridTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.text,
  },

  gridSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
});
