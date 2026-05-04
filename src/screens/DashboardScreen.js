import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeContext";
import { useUser } from "../context/UserContext";
import GlassCard from "../components/GlassCard";
import HexagonBackground from "../components/HexagonBackground";
import { Ionicons } from "@expo/vector-icons";
import { getTodaySessions, getStreak } from "../firebase/services/sessionService";
import { getTasksByDate } from "../firebase/services/taskService";

const formatDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function DashboardScreen({ navigation }) {
  const { colors, Typography } = useTheme();
  const { userId, userName } = useUser();
  const styles = getStyles(colors, Typography);

  const [loading, setLoading] = useState(true);
  const [studyTime, setStudyTime] = useState('0m');
  const [sessionCount, setSessionCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [nextTask, setNextTask] = useState(null);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch today's sessions
      const todaySessions = await getTodaySessions(userId);
      const totalSeconds = todaySessions.reduce((sum, s) => sum + (s.duration || 0), 0);

      // Format study time
      const hours = Math.floor(totalSeconds / 3600);
      const mins = Math.floor((totalSeconds % 3600) / 60);
      setStudyTime(hours > 0 ? `${hours}h ${mins}m` : `${mins}m`);
      setSessionCount(todaySessions.length);

      // Fetch streak
      const currentStreak = await getStreak(userId);
      setStreak(currentStreak);

      // Fetch today's upcoming task
      const todayKey = formatDateKey(new Date());
      const todayTasks = await getTasksByDate(userId, todayKey);
      const upcoming = todayTasks.find(t => t.status !== 'Completed');
      setNextTask(upcoming || null);
    } catch (error) {
      console.error('Dashboard load error:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Refresh when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadDashboardData();
    });
    return unsubscribe;
  }, [navigation, loadDashboardData]);

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
            <Text style={styles.name}>{userName}</Text>
            <Text style={styles.subtitle}>Let's focus and get things done</Text>
          </View>
        </View>

        {/* Today's Focus */}
        <GlassCard style={[styles.planCard, { backgroundColor: `${colors.primary}14`, borderColor: `${colors.primary}4D` }]}>
          <View style={styles.planHeader}>
            <Text style={[styles.planSubtitle, { color: colors.textSecondary }]}>TODAY'S FOCUS</Text>
            <Text style={[styles.planTime, { color: colors.primary }]}>
              {nextTask ? `🕒 ${nextTask.duration || '—'}` : '🕒 No plan'}
            </Text>
          </View>

          <Text style={[styles.planTitle, { color: colors.text }]}>
            {nextTask ? nextTask.subject : 'No task planned'}
          </Text>
          <Text style={[styles.planTopic, { color: colors.textSecondary }]}>
            {nextTask ? nextTask.topic : 'Tap "Planner" to add a study plan'}
          </Text>

          <TouchableOpacity
            style={[styles.focusButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate("Focus")}
          >
            <Text style={styles.focusButtonText}>Start Focus</Text>
          </TouchableOpacity>
        </GlassCard>

        {/* Stats */}
        <View style={styles.statsRow}>
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ flex: 1, paddingVertical: 10 }} />
          ) : (
            <>
              <View style={styles.statBox}>
                <Ionicons name="time" size={20} color={colors.primary} />
                <Text style={[styles.statValue, { color: colors.text }]}>{studyTime}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Study Time</Text>
              </View>

              <View style={styles.statBox}>
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                <Text style={[styles.statValue, { color: colors.text }]}>{sessionCount}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Sessions</Text>
              </View>

              <View style={styles.statBox}>
                <Ionicons name="flame" size={20} color={colors.greenAccent} />
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {streak} {streak === 1 ? 'day' : 'days'}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Streak</Text>
              </View>
            </>
          )}
        </View>

        {/* Quick Access */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Access</Text>

        <View style={styles.grid}>
          <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('Quiz')}>
            <GlassCard style={[styles.gridCard, { borderLeftColor: colors.primary, borderLeftWidth: 4 }]}>
              <Text style={styles.gridIcon}>🧠</Text>
              <Text style={[styles.gridTitle, { color: colors.text }]}>AI Quiz</Text>
              <Text style={[styles.gridSub, { color: colors.textSecondary }]}>Test your knowledge</Text>
            </GlassCard>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('Library')}>
            <GlassCard style={[styles.gridCard, { borderLeftColor: colors.purpleAccent, borderLeftWidth: 4 }]}>
              <Text style={styles.gridIcon}>📚</Text>
              <Text style={[styles.gridTitle, { color: colors.text }]}>Library Mode</Text>
              <Text style={[styles.gridSub, { color: colors.textSecondary }]}>Your resources</Text>
            </GlassCard>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('Profile')}>
            <GlassCard style={[styles.gridCard, { borderLeftColor: colors.greenAccent, borderLeftWidth: 4 }]}>
              <Text style={styles.gridIcon}>🏆</Text>
              <Text style={[styles.gridTitle, { color: colors.text }]}>Leaderboard</Text>
              <Text style={[styles.gridSub, { color: colors.textSecondary }]}>See your rank</Text>
            </GlassCard>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('Planner')}>
            <GlassCard style={[styles.gridCard, { borderLeftColor: colors.blueAccent, borderLeftWidth: 4 }]}>
              <Text style={styles.gridIcon}>📅</Text>
              <Text style={[styles.gridTitle, { color: colors.text }]}>Study Plan</Text>
              <Text style={[styles.gridSub, { color: colors.textSecondary }]}>Manage your plan</Text>
            </GlassCard>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors, Typography) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    color: colors.textSecondary,
  },
  name: {
    fontSize: 32,
    fontWeight: "bold",
    color: colors.text,
    marginTop: 4,
  },
  subtitle: {
    ...Typography.body,
    marginTop: 8,
    color: colors.textSecondary,
  },
  planCard: {
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
  },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  planSubtitle: {
    ...Typography.caption,
    letterSpacing: 1,
  },
  planTime: {
    ...Typography.caption,
    fontWeight: "bold",
  },
  planTitle: {
    fontSize: 26,
    fontWeight: "bold",
    marginTop: 10,
  },
  planTopic: {
    ...Typography.body,
    marginBottom: 20,
  },
  focusButton: {
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
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
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
  },
  gridSub: {
    fontSize: 12,
    marginTop: 4,
  },
});
